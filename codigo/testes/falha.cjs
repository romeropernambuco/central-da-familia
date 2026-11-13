// C6 (revisão E0): no build de produção, nunca tela branca.
// Rodar: npx vite build && node testes/falha.cjs   (usa o dist/ como está; sem .env = banco sem endereço)
// Casos: (a) banco sem endereço; (b) o pedaço partida-*.js não baixa. Nos 2: mensagem em português e "Tentar de novo" que recarrega.
const { spawn } = require('node:child_process')
const path = require('node:path')
let pw; try { pw = require('playwright') } catch { pw = require('/opt/npm-tools/node_modules/playwright') }
const PORTA = 4719
const pasta = path.join(__dirname, '..', 'dist')
const srv = spawn('python3', ['-m', 'http.server', String(PORTA), '--bind', '127.0.0.1', '--directory', pasta], { stdio: 'ignore' })
const erros = []
;(async () => {
  await new Promise(r => setTimeout(r, 700))
  const nav = await pw.chromium.launch()
  try {
    for (const [nome, bloquear, espera] of [
      ['banco sem endereço', false, 'O app está sem o endereço do banco'],
      ['pedaço que não baixou', true, 'Não deu pra abrir a Central agora'],
    ]) {
      const p = await nav.newPage({ viewport: { width: 390, height: 844 } })
      p.on('pageerror', e => erros.push(`${nome}: erro de página ${e.message}`))
      if (bloquear) await p.route(/partida-.*\.js$/, r => r.abort('internetdisconnected'))
      await p.goto(`http://127.0.0.1:${PORTA}/`)
      const ok = await p.waitForSelector(`text=${espera}`, { timeout: 8000 }).then(() => true, () => false)
      if (!ok) { erros.push(`${nome}: não apareceu "${espera}" (tela: ${JSON.stringify((await p.textContent('body')).trim().slice(0, 120))})`); continue }
      const botao = await p.$('button:has-text("Tentar de novo")')
      if (!botao) { erros.push(`${nome}: sem o botão Tentar de novo`); continue }
      const alto = await botao.evaluate(b => b.getBoundingClientRect().height)
      if (alto < 44) erros.push(`${nome}: botão com ${alto}px (mínimo 44)`)
      const recarregou = p.waitForEvent('load', { timeout: 5000 }).then(() => true, () => false)
      await botao.click()
      if (!(await recarregou)) erros.push(`${nome}: Tentar de novo não recarregou`)
      console.log(`${nome}: mostra "${espera}", botão ${Math.round(alto)}px, recarrega`)
      await p.close()
    }
  } finally { await nav.close(); srv.kill() }
  if (erros.length) { console.log('FALHOU:\n  ' + erros.join('\n  ')); process.exit(1) }
  console.log('PASSOU: 2 de 2 casos sem tela branca')
})().catch(e => { srv.kill(); console.error(e); process.exit(1) })
