/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
// @ts-ignore: script em JS puro, usado só no build
import { gravarSw, versaoDosModelos } from './scripts/sw.mjs'

/** Depois do build, grava o sw.js com a lista dos arquivos e a versão deste build (cache velho some sozinho). */
const swDoBuild = (pasta: string, exemplo: boolean) => ({
  name: 'central-sw',
  apply: 'build' as const,
  writeBundle() {
    // o pedaço separado do escritório isométrico só existe no build de exemplo (Início clássico); em produção ele vai junto da tela Escritório
    const backend = exemplo ? ['EscritorioIsometrico', 'relogio', 'exemplo'] : ['real']
    const r = gravarSw(pasta, 'src/sw.modelo.js', ['partida', 'Inicio', ...backend])
    console.log(`sw.js versão ${r.versao}, ${r.casca.length} arquivos na casca`)
  },
})

// base './' deixa o app funcionar em qualquer pasta do GitHub Pages
export default defineConfig(({ mode, command }) => {
  const demo = mode === 'demo'
  const pasta = demo ? 'dist-demo' : mode === 'exemplo' ? 'dist-exemplo' : 'dist'
  return {
    base: './',
    plugins: demo ? [react(), viteSingleFile()] : [react(), swDoBuild(pasta, mode === 'exemplo')],
    define: { __VERSAO_GLB__: JSON.stringify(command === 'build' && !demo ? versaoDosModelos('public/modelos/escritorio') : '') },
    build: {
      manifest: !demo,
      outDir: pasta,
      assetsInlineLimit: demo ? 100000000 : 4096,
      copyPublicDir: !demo,
    },
    test: { include: ['src/**/*.test.ts'], testTimeout: 30000 },
  }
})
