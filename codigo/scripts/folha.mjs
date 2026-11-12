// Monta a folha de prints (contact sheet) de uma largura: node scripts/folha.mjs 390 7 0.5 1600 folha_390.png
import { createRequire } from 'node:module'
import { readdirSync } from 'node:fs'
const require = createRequire(import.meta.url)
let sharp; try { sharp = require('sharp') } catch { sharp = require('/opt/npm-tools/node_modules/sharp') }
const [larg, colsS, escS, maxS, saida] = process.argv.slice(2)
const cols = +colsS, esc = +escS, maxH = +maxS
const pasta = 'testes/prints/'
const fs = readdirSync(pasta).filter(f => f.startsWith(larg + '_') && f.endsWith('.png')).sort()
const W = Math.round(+larg * esc), H = Math.round(maxH * esc), TOPO = 34, GAP = 16
const pecas = []
for (const [i, f] of fs.entries()) {
  const b = await sharp(pasta + f).resize({ width: W }).png().toBuffer()
  const m = await sharp(b).metadata()
  const img = await sharp(b).extract({ left: 0, top: 0, width: W, height: Math.min(H, m.height) }).png().toBuffer()
  const x = (i % cols) * (W + GAP) + GAP, y = Math.floor(i / cols) * (H + TOPO + GAP) + GAP
  const nome = f.replace(/^\d+_/, '').replace('.png', '').replace(/_/g, ' ')
  pecas.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${TOPO}"><text x="0" y="22" font-family="sans-serif" font-size="18" font-weight="700" fill="#16130F">${nome}</text></svg>`), left: x, top: y })
  pecas.push({ input: img, left: x, top: y + TOPO })
}
const linhas = Math.ceil(fs.length / cols)
await sharp({ create: { width: cols * (W + GAP) + GAP, height: linhas * (H + TOPO + GAP) + GAP, channels: 3, background: '#D9D3C9' } }).composite(pecas).png().toFile(saida)
console.log(saida, fs.length, 'prints')
