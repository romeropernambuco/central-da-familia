import { build } from 'vite'
import react from '@vitejs/plugin-react'
// Execute na pasta codigo: node scripts/verificar-f32.mjs [test [arquivos...]].
// Alternativa sem carregar vite.config.ts quando o sandbox bloqueia o esbuild.
import { gravarSw } from './sw.mjs'
if (process.argv.includes('test')) {
 const { startVitest } = await import('vitest/node')
 const ctx = await startVitest('test', process.argv.slice(3), { config: false, cache: false, watch: false, include: ['src/**/*.test.ts'], testTimeout: 30000 })
 await ctx.close()
} else {
 await build({ configFile: false, base: './', plugins: [react(), { name: 'sw', closeBundle() { gravarSw('dist', 'src/sw.modelo.js') } }], build: { outDir: 'dist', assetsInlineLimit: 4096 } })
}
