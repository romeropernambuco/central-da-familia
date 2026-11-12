/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
// @ts-ignore: script em JS puro, usado só no build
import { gravarSw } from './scripts/sw.mjs'

/** Depois do build, grava o sw.js com a lista dos arquivos e a versão deste build (cache velho some sozinho). */
const swDoBuild = (pasta: string) => ({
  name: 'central-sw',
  apply: 'build' as const,
  closeBundle() { const r = gravarSw(pasta, 'src/sw.modelo.js'); console.log(`sw.js versão ${r.versao}, ${r.arquivos.length} arquivos`) },
})

// base './' deixa o app funcionar em qualquer pasta do GitHub Pages
export default defineConfig(({ mode }) => {
  const demo = mode === 'demo'
  const pasta = demo ? 'dist-demo' : mode === 'exemplo' ? 'dist-exemplo' : 'dist'
  return {
    base: './',
    plugins: demo ? [react(), viteSingleFile()] : [react(), swDoBuild(pasta)],
    build: {
      outDir: pasta,
      assetsInlineLimit: demo ? 100000000 : 4096,
      copyPublicDir: !demo,
    },
    test: { include: ['src/**/*.test.ts'] },
  }
})
