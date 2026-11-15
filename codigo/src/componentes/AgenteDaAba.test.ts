// @ts-ignore Node é fornecido pelo executor externo do Vitest.
import { existsSync, readFileSync } from 'node:fs'
// @ts-ignore Node é fornecido pelo executor externo do Vitest.
import { dirname, extname, resolve } from 'node:path'
import { expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { DocumentoTeste, NoTeste } from '../telas/escritorio/numeros.dom-teste'
const ciclo = vi.hoisted(() => ({ destruir: vi.fn(), montar: vi.fn() }))
vi.mock('../telas/escritorio/tres', () => ({}))
vi.mock('../telas/escritorio/cena3d', () => ({ montarCena: ciclo.montar }))
vi.mock('../telas/escritorio/cenaBase', async original => ({ ...await original<object>(), temWebGL: () => true }))
import { MiniAgente } from './AgenteDaAba'

it('carrega Three somente pelo import tardio do mini agente e libera o renderer', () => {
  const fonte = readFileSync(resolve('src/componentes/AgenteDaAba.tsx'), 'utf8')
  expect(fonte).toMatch(/import\('\.\.\/telas\/escritorio\/tres'\)/)
  expect(fonte).not.toMatch(/import\s+[^\n]+from\s+['"][^'"]*(?:three|\/tres)['"]/)
  expect(fonte).toContain('liberarRenderer?.()')
  expect(fonte).toContain('cena?.destruir()')
  const app = readFileSync(resolve('src/app/App.tsx'), 'utf8')
  expect(app).toContain('<AgenteDaAba key={r} rota={r} />')
  const vistos = new Set<string>()
  function visitar(arquivo: string) {
    if (vistos.has(arquivo)) return
    vistos.add(arquivo)
    const codigo = readFileSync(arquivo, 'utf8')
    for (const match of codigo.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^;\n]*?\sfrom\s*['"]([^'"]+)['"]/g)) {
      const origem = match[1]
      expect(origem, arquivo).not.toMatch(/^three(?:\/|$)/)
      if (!origem.startsWith('.')) continue
      const alvo = resolve(dirname(arquivo), origem)
      const dependencia = (extname(alvo) ? [alvo] : [alvo + '.ts', alvo + '.tsx', alvo + '/index.ts']).find(existsSync)
      if (dependencia && /\.[jt]sx?$/.test(dependencia)) visitar(dependencia)
    }
  }
  visitar(resolve('src/main.tsx')); visitar(resolve('src/partida.tsx'))
  expect([...vistos].some(p => /AgenteDaAba\.tsx$/.test(p))).toBe(true)
})

it('trocar de aba e desmontar libera a cena; sem3d não importa nem monta renderer', async () => {
  const doc = new DocumentoTeste()
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }))
  vi.stubGlobal('location', { hash: '', search: '' })
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  ciclo.destruir.mockClear(); ciclo.montar.mockReset()
  ciclo.montar.mockImplementation(() => ({ destruir: ciclo.destruir, irPara() {} }))
  const container = doc.createElement('div'); doc.body.appendChild(container)
  const root = createRoot(container as unknown as HTMLElement)
  try {
    await act(async () => root.render(createElement(MiniAgente, { id: 'cartao', sala: 'cartoes' })))
    expect(ciclo.montar).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ mini: true, parado: true, funcionarios: [{ id: 'cartao', sala: 'cartoes', estado: 'trabalhando' }] }))
    await act(async () => root.render(createElement(MiniAgente, { id: 'fiscal', sala: 'casa' })))
    expect(ciclo.destruir).toHaveBeenCalledTimes(1)
    await act(async () => root.unmount())
    expect(ciclo.destruir).toHaveBeenCalledTimes(2)
    location.search = '?sem3d'
    const lista = createRoot(container as unknown as HTMLElement)
    await act(async () => lista.render(createElement(MiniAgente, { id: 'fiscal', sala: 'casa' })))
    expect(container.textContent).toContain('Em lista')
    expect(ciclo.montar).toHaveBeenCalledTimes(2)
    await act(async () => lista.unmount())
  } finally { vi.unstubAllGlobals() }
})
