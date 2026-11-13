// Rodada 2: varredura automática dos itens A (trava a versão se falhar). Roda no build do modo exemplo (prototipo/depois).
// uso: NODE_PATH=/opt/node-tools/node_modules node testes/varredura2.cjs [base=http://127.0.0.1:8791/depois]
// A1 equipe: nenhum "R$" no HTML (texto, aria-label, title) em nenhuma tela nem folha que a equipe abre.
// A2 filha: nenhum dado dos pais nem da Casa (nomes, cartões, salários, valores acima do combinado dela) em tela, folha ou endereço digitado.
// A3 casal: Cartões, Planejamento e Escritório de cada um sem a fatura, o cartão e o salário do outro.
// A4 olho: com o olho fechado, nenhum "R$ 123" visível nem em aria-label/title, inclusive Escritório e fichas.
// A5: nenhum "-R$" (nem "−R$") em tela nenhuma, nem nos "?" abertos.
const { chromium } = require('playwright')
const BASE = process.argv[2] || 'http://127.0.0.1:8791/depois'
const ROTAS = ['inicio', 'lancamentos', 'orcamento', 'casa', 'guardado', 'cartoes', 'planejamento', 'escritorio', 'ajustes', 'privacidade', 'painel', 'primeiro-uso', 'entrar', 'qualquer-coisa']
const falhas = [], erros = []
// SO=A1,A3 roda só essas partes (padrão: todas)
const SO = (process.env.SO || 'A1,A2,A3,A4,A5').split(',')
let checagens = 0
const ok = (c, msg) => { checagens++; if (!c) falhas.push(msg) }

async function abrir(b, como, rota, dia = '2026-11-18', hora = 10) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } })
  p.on('pageerror', e => erros.push(`${como} ${rota} ${dia}: ${e.message}`))
  await p.goto(`${BASE}/?como=${como}&dia=${dia}&hora=${hora}#/${rota}`)
  await p.waitForTimeout(700)
  return p
}
const html = p => p.evaluate(() => document.documentElement.outerHTML.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, ''))
const textoEAtributos = p => p.evaluate(() => {
  const at = [...document.querySelectorAll('[aria-label],[title],[placeholder]')].map(e => [e.getAttribute('aria-label'), e.getAttribute('title'), e.getAttribute('placeholder')].filter(Boolean).join(' '))
  return document.body.innerText + '\n' + at.join('\n')
})
/** Toca em cada botão da área, um por vez (reabrindo a página), e devolve o que apareceu. */
async function tocarTodos(b, como, rota, seletor, dia, hora, cada) {
  const p0 = await abrir(b, como, rota, dia, hora)
  const n = await p0.$$eval(seletor, l => l.length); await p0.close()
  for (let i = 0; i < n; i++) {
    const p = await abrir(b, como, rota, dia, hora)
    const bt = (await p.$$(seletor))[i]
    if (bt && await bt.isVisible()) { await bt.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(350); await cada(p, i) }
    await p.close()
  }
}

;(async () => {
  const b = await chromium.launch()

  /* ---------- A1: equipe nunca vê R$ ---------- */
  if (SO.includes('A1')) {
  const semRS = async (p, onde) => { const h = await html(p); ok(!/R\$/.test(h), `A1 equipe ${onde}: tem "R$" no HTML: ${(h.match(/.{0,40}R\$.{0,30}/) || [''])[0]}`) }
  for (const dia of ['2026-11-12', '2026-11-16', '2026-11-18', '2026-11-21', '2026-12-01'])
    for (const hora of [9, 21]) for (const r of ROTAS) { const p = await abrir(b, 'equipe', r, dia, hora); await semRS(p, `${r} ${dia} ${hora}h`); await p.close() }
  // folhas: "+" da barra, "Anotar compra", e cada botão da Casa e do Fiscal
  for (const dia of ['2026-11-16', '2026-11-18']) {
    let p = await abrir(b, 'equipe', 'casa', dia)
    await p.click('.tabbar .plus'); await p.waitForTimeout(300); await semRS(p, `folha do + ${dia}`)
    ok(await p.$('.keys') === null, 'A1 equipe: a folha da equipe não pode ter teclado de valor')
    await p.fill('.sheet input.inp', 'Feira do mercadinho'); await p.click('.sheet .btn:has-text("Usar uma nota de exemplo")'); await semRS(p, 'folha com foto')
    await p.click('.sheet .btn.primary.full'); await p.waitForTimeout(500); await semRS(p, 'depois de anotar (aviso)')
    ok(/Feira do mercadinho/.test(await p.textContent('body')), 'A1 equipe: a compra anotada aparece em "Comprado hoje"')
    await p.close()
    p = await abrir(b, 'equipe', 'casa', dia); await p.click('button:has-text("Anotar compra")'); await p.waitForTimeout(300); await semRS(p, 'folha Anotar compra'); await p.close()
    await tocarTodos(b, 'equipe', 'casa', 'main button', dia, 10, async (q, i) => {
      await semRS(q, `botão ${i} da Casa ${dia}`)
      // o que abriu: toca em tudo dentro da folha/cartão aberto também (contagem, nota, não teve nota)
      for (const s of ['.perg-campo button', '.sheet button']) for (const bt of await q.$$(s)) { if (await bt.isVisible()) { await bt.click({ timeout: 2000 }).catch(() => {}); await q.waitForTimeout(200) } }
      await semRS(q, `dentro do botão ${i} ${dia}`)
    })
  }

  }
  /* ---------- A2: filha só vê o dela ---------- */
  if (SO.includes('A2')) {
  const PAIS = /Ana|Bruno|Nubank|Itaú|Salário|salário|Casa mensal|Feira semanal|CDB|LCA|Tesouro|anuidade|fatura|Folha|Cozinheira|Gerar código|Apagar a família|Convidar|Seu Zé|Marcos|Jardineiro|Piscineiro|Guardado|Planejamento|Cartões|Escritório/
  const daFilha = async (p, onde) => {
    const t = await textoEAtributos(p), h = await html(p)
    const m = t.match(PAIS); ok(!m, `A2 filha ${onde}: aparece "${m && m[0]}"`)
    const vals = [...t.matchAll(/R\$[\s ]*([\d.]+)(,\d+)?/g)].map(x => Number(x[1].replace(/\./g, '')))
    ok(vals.every(v => v <= 300), `A2 filha ${onde}: valor acima do combinado dela (R$ 300): ${vals.filter(v => v > 300).join(', ')}`)
    ok(!/href="#\/(cartoes|planejamento|escritorio|guardado)"/.test(h), `A2 filha ${onde}: link pra tela do casal`)
  }
  for (const dia of ['2026-11-12', '2026-11-18', '2026-11-30']) for (const hora of [10, 21]) for (const r of ROTAS) {
    const p = await abrir(b, 'filha', r, dia, hora)
    if (['cartoes', 'planejamento', 'escritorio', 'guardado'].includes(r)) ok(await p.textContent('h1') === 'Novembro', `A2 filha: endereço #/${r} não voltou pro Início`)
    await daFilha(p, `${r} ${dia} ${hora}h`); await p.close()
  }
  for (const r of ['inicio', 'orcamento', 'casa', 'lancamentos', 'ajustes', 'privacidade']) await tocarTodos(b, 'filha', r, 'main button, .tabbar button, .top button', '2026-11-18', 21, async (q, i) => daFilha(q, `${r}, botão ${i}`))

  }
  /* ---------- A3: casal vê só o seu (cartão, fatura, salário, avisos do cartão) ---------- */
  if (SO.includes('A3')) {
  // "pago por Bruno" num gasto da Casa "· Bruno" no diário e "quem fez: Ana" na feira são permitidos: a Casa e os lembretes do casal são dos 2 (nunca valor nem item pessoal do outro)
  const DO_OUTRO = { ana: /Itaú|Salário Bruno|9\.000|(?<!pago por |· |quem fez: )Bruno/, bruno: /Nubank|Salário Ana|7\.000|anuidade de R\$|(?<!pago por |· |quem fez: )Ana/ }
  for (const como of ['ana', 'bruno']) for (const dia of ['2026-11-01', '2026-11-07', '2026-11-12', '2026-11-18', '2026-11-30']) for (const r of ['cartoes', 'planejamento', 'escritorio', 'lancamentos', 'orcamento']) {
    const p = await abrir(b, como, r, dia, 21)
    let t = await textoEAtributos(p)
    if (r === 'escritorio') for (const f of await p.$$('button.li[data-func]')) { if (!(await f.isVisible())) continue; await f.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(250); t += await textoEAtributos(p); await p.keyboard.press('Escape') }
    // o Bruno aparece pra Ana só no placar e como "pago por" na Casa: aqui nenhuma dessas telas pode mostrar
    const m = t.match(DO_OUTRO[como]); ok(!m, `A3 ${como} ${r} ${dia}: aparece coisa do outro: "${m && m[0]}"`)
    await p.close()
  }
  { const p = await abrir(b, 'ana', 'privacidade'); ok(/cada um vê o seu e a Casa; juntos, o placar/i.test(await p.textContent('body')), 'A3: texto novo da Privacidade'); await p.close() }

  }
  /* ---------- A4: olho esconde todo valor ---------- */
  if (SO.includes('A4')) {
  for (const como of ['ana', 'bruno', 'autonoma']) for (const r of ['inicio', 'escritorio', 'guardado', 'cartoes', 'planejamento', 'orcamento', 'lancamentos', 'casa']) {
    const p = await abrir(b, como, r, '2026-11-18', 21)
    await p.click('.top .olho'); await p.waitForTimeout(400)
    const ver = async onde => { const t = await textoEAtributos(p); const m = t.match(/R\$[\s ]*\d[^\n]{0,25}/); ok(!m, `A4 olho ${como} ${onde}: ainda aparece "${m && m[0]}"`) }
    await ver(r)
    if (r === 'escritorio') for (const f of (await p.$$('button.li[data-func]')).slice(0, 8)) { if (!(await f.isVisible())) continue; await f.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300); await ver('ficha'); await p.keyboard.press('Escape'); await p.waitForTimeout(150) }
    if (r === 'inicio') { await p.click('.tabbar .plus'); for (const t of ['5', '0']) await p.click(`.keys button[aria-label="${t}"]`); await ver('folha Lançar'); await p.click('.envbtn.meu'); await p.waitForTimeout(400); await ver('aviso depois de salvar') }
    // abrir o olho de novo traz os valores de volta
    await p.click('.top .olho'); await p.waitForTimeout(400)
    if (r === 'inicio') ok(/R\$[\s ]*\d/.test(await p.textContent('main')), `A4 olho ${como}: ao abrir o olho os valores não voltaram`)
    await p.close()
  }

  }
  /* ---------- A5: nenhum "-R$" ---------- */
  if (SO.includes('A5')) {
  const NEG = /[-−–]\s?R\$|R\$[\s ]*[-−–]/
  for (const como of ['ana', 'bruno', 'filha', 'autonoma']) for (const dia of ['2026-11-12', '2026-11-13', '2026-11-18', '2026-11-30', '2026-12-01']) for (const r of ['inicio', 'orcamento', 'casa', 'cartoes', 'planejamento', 'lancamentos', 'guardado', 'escritorio']) {
    const p = await abrir(b, como, r, dia, 21)
    ok(!NEG.test(await textoEAtributos(p)), `A5 ${como} ${r} ${dia}: tem "-R$"`)
    // cada "?" e "De onde veio" aberto
    for (const q of await p.$$('.qm, .explica-l')) { if (!(await q.isVisible())) continue; await q.click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(150); const t = await textoEAtributos(p); ok(!NEG.test(t), `A5 ${como} ${r} ${dia}: "?" com "-R$": ${(t.match(/.{0,30}[-−]\s?R\$.{0,10}/) || [''])[0]}`); await p.keyboard.press('Escape'); await p.waitForTimeout(100) }
    if (r === 'inicio' && como !== 'filha') { await p.click('.tabbar .plus'); await p.waitForTimeout(250); ok(!NEG.test(await textoEAtributos(p)), `A5 ${como} ${dia}: folha Lançar com "-R$"`) }
    await p.close()
  }

  }
  await b.close()
  console.log(`Varredura rodada 2: ${checagens} checagens, ${falhas.length} falhas, ${erros.length} erros de página.`)
  for (const f of [...new Set(falhas)].slice(0, 60)) console.log('FALHA ' + f)
  for (const e of [...new Set(erros)].slice(0, 20)) console.log('ERRO ' + e)
  process.exit(falhas.length || erros.length ? 1 : 0)
})()
