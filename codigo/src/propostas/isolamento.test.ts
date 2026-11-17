import { expect, it, vi } from 'vitest'
import { build, loadConfigFromFile, type Plugin } from 'vite'
// @ts-ignore: os testes rodam em Node, sem @types/node no TypeScript do app.
import { realpathSync } from 'node:fs'

it('exclui o laboratório do grafo do build real e da entrada direta em produção', async () => {
  const { config } = (await loadConfigFromFile({ command: 'build', mode: 'production' }))!
  // Mantém a configuração real e suprime somente a gravação em disco do service worker.
  const plugins = (config.plugins as Plugin[]).filter(p => p.name !== 'central-sw')
  // O Rollup usa o caminho físico do index.html ao resolver o CSS inline.
  const root = realpathSync.native(config.root ?? '.')
  vi.stubEnv('NODE_ENV', 'production')
  try {
    const real = await build({ ...config, root, configFile: false, plugins, mode: 'production', logLevel: 'silent',
      build: { ...config.build, write: false, manifest: true } })
    const saidas = (Array.isArray(real) ? real : [real]).flatMap(r => 'output' in r ? r.output : [])
    expect(saidas.some(a => a.fileName === 'index.html')).toBe(true)
    for (const saida of saidas) {
      expect(saida.fileName).not.toContain('propostas')
      if (saida.type === 'chunk') {
        expect(saida.moduleIds.some(id => id.replace(/\\/g, '/').includes('/src/propostas/'))).toBe(false)
        expect(saida.code).not.toContain('Laboratório de propostas')
      } else {
        expect(String(saida.source)).not.toContain('src/propostas/')
      }
    }

    const direto = await build({ root, configFile: false, mode: 'exemplo', logLevel: 'silent',
      build: { write: false, modulePreload: { polyfill: false }, rollupOptions: { input: `${root}/src/propostas/propostas.html` } } })
    const extras = (Array.isArray(direto) ? direto : [direto]).flatMap(r => 'output' in r ? r.output : [])
    expect(extras.some(a => a.fileName.endsWith('/propostas.html'))).toBe(true)
    for (const extra of extras) {
      expect(extra.fileName).not.toMatch(/\.css$/)
      if (extra.type === 'chunk') expect(extra.code.trim()).toBe('')
    }
  } finally {
    vi.unstubAllEnvs()
  }
})
