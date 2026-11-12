// Monta o central-app.zip: código + pasta dist pronta. Sem node_modules, sem os builds de teste e SEM os prints
// (eram 73 imagens e 19 MB). Rodar depois do build: node scripts/zip.mjs
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const LEVA = ['.env', '.env.demo', '.env.exemplo', '.gitignore', 'LEIA-ME.md', 'index.html', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'public', 'scripts', 'src', 'dist', 'testes']
const FORA = /(^|\/)(node_modules|prints|dist-demo|dist-exemplo)(\/|$)|\.png\.map$|\.DS_Store$/
if (!existsSync('dist/index.html')) throw new Error('rode o build antes: falta dist/index.html')
const palco = mkdtempSync(join(tmpdir(), 'central-zip-'))
const raiz = join(palco, 'central-da-familia')
for (const n of LEVA) if (existsSync(n)) cpSync(n, join(raiz, n), { recursive: true, filter: de => !FORA.test(de.split('\\').join('/')) })
rmSync('central-app.zip', { force: true })
execSync(`cd "${palco}" && zip -qr9 "${process.cwd()}/central-app.zip" central-da-familia`)
rmSync(palco, { recursive: true, force: true })
console.log('central-app.zip', (statSync('central-app.zip').size / 1024).toFixed(0) + ' KB')
