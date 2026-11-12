// Gera demo.html: o app inteiro num arquivo só, no modo exemplo, roda sem internet.
import { readFileSync, writeFileSync } from 'node:fs'
let h = readFileSync('dist-demo/index.html', 'utf8')
const icone = 'data:image/png;base64,' + readFileSync('public/icone-192.png').toString('base64')
h = h.replace(/<link rel="manifest"[^>]*>\n?/, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>/, `<link rel="apple-touch-icon" href="${icone}">`)
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/png" href="${icone}">`)
  .replace('<title>Central da Família</title>', '<title>Central da Família (exemplo)</title>')
if (/https?:\/\/(?!wa\.me)[a-z0-9.-]+\.(com|co|io|net)\//i.test(h.replace(/https:\/\/wa\.me[^"'`]*/g, ''))) console.warn('aviso: o demo cita endereço externo (só é usado no modo real)')
writeFileSync('demo.html', h)
console.log('demo.html', (h.length / 1024).toFixed(0) + ' KB')
