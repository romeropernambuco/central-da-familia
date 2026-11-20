import { expect, it, vi } from 'vitest'
import { build, type Plugin } from 'vite'
import configurar from '../../vite.config'
// @ts-ignore: os testes rodam em Node, sem @types/node no TypeScript do app.
import { realpathSync } from 'node:fs'

it('exclui o laboratório do grafo do build real e da entrada direta em produção', async () => {
  const config = await configurar({ command: 'build', mode: 'production' })
  // Mantém a configuração real e suprime somente a gravação em disco do service worker.
  const plugins = (config.plugins as Plugin[]).filter(p => p.name !== 'central-sw')
  // O Rollup usa o caminho físico do index.html ao resolver o CSS inline.
  const root = realpathSync.native(config.root ?? '.')
  vi.stubEnv('NODE_ENV', 'production')
  try {
    const real = await build({
      ...config,
      root,
      configFile: false,
      plugins,
      mode: 'production',
      logLevel: 'silent',
      build: { ...config.build, write: false, manifest: true },
    })
    const saidas = (Array.isArray(real) ? real : [real]).flatMap(r => ('output' in r ? r.output : []))
    expect(saidas.some(a => a.fileName === 'index.html')).toBe(true)
    // Nada da pasta de protótipos entra no app: as peças do Início moram em componentes/escritorio e componentes/painel-inicio.
    for (const saida of saidas) {
      expect(saida.fileName).not.toContain('propostas')
      if (saida.type === 'chunk') {
        const modulos = saida.moduleIds.map(id => id.replace(/\\/g, '/'))
        expect(modulos.filter(id => id.includes('/src/propostas/'))).toEqual([])
        expect(modulos.some(id => id.endsWith('/InicioClassico.tsx'))).toBe(false)
        expect(saida.code).not.toContain('Laboratório de propostas')
      } else {
        expect(String(saida.source)).not.toContain('src/propostas/')
      }
    }

    const direto = await build({
      root,
      configFile: false,
      mode: 'exemplo',
      logLevel: 'silent',
      build: {
        write: false,
        modulePreload: { polyfill: false },
        rollupOptions: { input: `${root}/src/propostas/propostas.html` },
      },
    })
    const extras = (Array.isArray(direto) ? direto : [direto]).flatMap(r => ('output' in r ? r.output : []))
    expect(extras.some(a => a.fileName.endsWith('/propostas.html'))).toBe(true)
    for (const extra of extras) {
      expect(extra.fileName).not.toMatch(/\.css$/)
      if (extra.type === 'chunk') expect(extra.code.trim()).toBe('')
    }
  } finally {
    vi.unstubAllEnvs()
  }
})
