import { it, expect, vi } from 'vitest'
// @ts-expect-error Node usado somente no teste
import { readFileSync } from 'node:fs'
import * as T from 'three'
import { criarCacheModelos } from './telas/escritorio/modelosEscritorio'
it('conserva bytes locais entre visitas e descarta texturas no último usuário', async () => {
  const buscar = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }))
  const originais: any[] = []
  const cache = criarCacheModelos(
    buscar,
    async () => {
      const textura = new T.Texture()
      const mat = new T.MeshBasicMaterial({ map: textura })
      const modelo = new T.Mesh(new T.BoxGeometry(), mat)
      originais.push({ modelo, td: vi.spyOn(textura, 'dispose'), gd: vi.spyOn(modelo.geometry, 'dispose') })
      return modelo
    },
    './',
  )
  const leases = Array.from({ length: 12 }, () => cache.adquirir(['desk', 'wall'], new AbortController().signal))
  const modelos = await Promise.all(leases.map(l => l.pronto))
  expect(buscar).toHaveBeenCalledTimes(2)
  const copia = modelos[1]!.desk.clone(true)
  leases[0].liberar()
  expect(originais[0].gd).not.toHaveBeenCalled()
  expect(copia.geometry.attributes.position.count).toBeGreaterThan(0)
  leases.slice(1).forEach(l => l.liberar())
  expect(cache.tamanho()).toBe(0)
  expect(originais[0].td).toHaveBeenCalledOnce()
  const volta = cache.adquirir(['desk', 'wall'], new AbortController().signal)
  await volta.pronto
  expect(buscar).toHaveBeenCalledTimes(2)
  volta.liberar()
})
it('entrega marca e status antes de baixar JavaScript e separa telas por import dinâmico', () => {
  const html = readFileSync('index.html', 'utf8')
  expect(html).toContain('role="status"')
  expect(html).toContain('Abrindo a Central da Família...')
  const app = readFileSync('src/app/App.tsx', 'utf8')
  expect(app).toContain("import('../telas/planejamento/Planejamento')")
  expect(app).toContain('<Suspense')
})
