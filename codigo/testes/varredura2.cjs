// Rodada 2: varredura automática dos itens A (trava a versão se falhar). Roda no build do modo exemplo (prototipo/depois).
// uso: NODE_PATH=/opt/node-tools/node_modules node testes/varredura2.cjs [base=http://127.0.0.1:8791/depois]
// A1 equipe: nenhum "R$" no HTML (texto, aria-label, title) em nenhuma tela nem folha que a equipe abre.
// A2 filha: nenhum dado dos pais nem da Casa (nomes, cartões, salários, valores acima do combinado dela) em tela, folha ou endereço digitado.
// A3 casal (E2, invertido em 13/11): o do outro TEM que aparecer com o nome dele e SEM botão de mexer (lançar, corrigir, guardar, editar).
// A4 olho: com o olho fechado, nenhum "R$ 123" visível nem em aria-label/title, inclusive Escritório e fichas.
// A5: nenhum "-R$" (nem "−R$") em tela nenhuma, nem nos "?" abertos.
const { chromium } = require('playwright')
const BASE = process.argv[2] || 'http://127.0.0.1:8791/depois'
const ROTAS = ['inicio', 'lancamentos', 'orcamento', 'casa', 'guardado', 'cartoes', 'planejamento', 'escritorio', 'ajustes', 'privacidade', 'painel', 'primeiro-uso', 'entrar', 'qualquer-coisa']
const falhas = [], erros = []
// SO=A1,A3 roda só essas partes (padrão: todas)
const SO = (process.env.SO || 'A1,A2,A3,A4,A5,E3').split(',')
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
  /* ---------- A3 (E2, invertido): o casal LÊ o do outro com o nome dele e SEM botão de mexer ---------- */
  // Regra nova do dono (13/11): "o orçamento é da família". Antes esta parte exigia que o outro NÃO aparecesse; agora exige
  // que apareça (com o nome) e que nenhum botão de escrever fique no que é dele. Marca na tela: [data-do-outro="<nome>"].
  if (SO.includes('A3')) {
  const OUTRO = { ana: 'Bruno', bruno: 'Ana' }
  const MEXER = /Lançar|Corrigir|Apagar|Editar|Tirar|Cobrir|Guardar|Encerrar|Não gastei|Esqueci|Quero juntar|Salvar|Trazer de volta|imprevisto|Anotar/i
  /** Nenhum botão de escrever dentro do que é do outro (o "?" que só explica pode). Devolve quantos itens do outro achou. */
  const semMexer = async (p, como, onde) => {
    const itens = await p.$$eval('[data-do-outro]', (els, re) => els.filter(e => e.offsetParent !== null || e.getClientRects().length).map(e => ({
      dono: e.getAttribute('data-do-outro'), txt: e.innerText.slice(0, 60),
      botoes: [...e.querySelectorAll('button, a.btn, input:not([disabled]):not([type=hidden])')].filter(b => !b.disabled).map(b => (b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '') + (b.tagName === 'INPUT' ? ' [campo que muda]' : '')).filter(t => new RegExp(re, 'i').test(t)),
    })), MEXER.source)
    for (const it of itens) ok(it.botoes.length === 0, `A3 ${como} ${onde}: botão de mexer no que é de ${it.dono} ("${it.txt}"): ${it.botoes.join(' | ')}`)
    return itens
  }
  for (const como of ['ana', 'bruno']) for (const dia of ['2026-11-01', '2026-11-12', '2026-11-18', '2026-11-30']) {
    const outro = OUTRO[como]
    // 1. telas em que o do outro TEM que aparecer com o nome dele
    for (const r of ['inicio', 'lancamentos', 'cartoes', 'planejamento', 'guardado']) {
      const p = await abrir(b, como, r, dia, 21)
      const itens = await semMexer(p, como, `${r} ${dia}`)
      // dia 01 de manhã o Bruno ainda não lançou nada no mês: a lista dele vazia é certa
      if (!(r === 'lancamentos' && dia.endsWith('-01') && como === 'ana')) ok(itens.some(x => x.dono === outro), `A3 ${como} ${r} ${dia}: o que é de ${outro} não aparece com o nome dele`)
      if (r === 'planejamento') ok(await p.$$eval('[data-do-outro] input', l => l.length > 0 && l.every(x => x.disabled)), `A3 ${como} planejamento ${dia}: o limite de ${outro} tem que vir travado`)
      await p.close()
    }
    // 2. Meu orçamento: abrir o do outro pela pílula com o nome dele
    { const p = await abrir(b, como, 'orcamento', dia, 21)
      const todas = await p.$$('.pills .pill'); let achou = false
      for (const x of todas) if ((await x.innerText()).startsWith(outro)) { await x.click(); await p.waitForTimeout(300); achou = true }
      ok(achou, `A3 ${como} orcamento ${dia}: sem a pílula do orçamento de ${outro}`)
      const itens = await semMexer(p, como, `orcamento de ${outro} ${dia}`)
      ok(itens.some(x => x.dono === outro), `A3 ${como} orcamento ${dia}: o orçamento de ${outro} não diz de quem é`)
      await p.close() }
    // 3. Guardado: a aplicação do outro abre só pra ler
    { const p = await abrir(b, como, 'guardado', dia, 21)
      const bt = await p.$('li[data-do-outro] button.li')
      ok(!!bt, `A3 ${como} guardado ${dia}: sem aplicação de ${outro}`)
      if (bt) { await bt.click(); await p.waitForTimeout(300); const t = await p.textContent('.sheet'); ok(!/Guardar mais|Encerrar esta/.test(t || ''), `A3 ${como} guardado ${dia}: a aplicação de ${outro} tem botão de mexer`); ok(new RegExp(`no nome de ${outro}`, 'i').test(t || ''), `A3 ${como} guardado ${dia}: a folha não diz de quem é`) }
      await p.close() }
    // 4. Lançar: o limite do outro não é botão de salvar
    { const p = await abrir(b, como, 'inicio', dia, 21)
      await p.click('.tabbar .plus'); await p.waitForTimeout(300)
      const nomes = await p.$$eval('.envbtns .envbtn b', l => l.map(x => x.textContent))
      ok(!nomes.includes(outro), `A3 ${como} Lançar ${dia}: tem botão de salvar no limite de ${outro}`)
      await p.close() }
    // 5. Escritório: o Analista de Cartão mostra o cartão do outro com o nome, sem Editar
    { const p = await abrir(b, como, 'escritorio', dia, 21)
      const f = await p.$('button.li[data-func="cartao"]')
      if (f) { await f.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(400)
        const linhas = await p.$$eval('.cad-l', (l, o) => l.filter(x => x.innerText.includes(`de ${o}`)).map(x => ({ txt: x.innerText.slice(0, 50), editar: !!x.querySelector('button[aria-label="Editar"]') })), outro)
        ok(linhas.length > 0, `A3 ${como} Analista de Cartão ${dia}: o cartão de ${outro} não aparece com o nome`)
        for (const l of linhas) ok(!l.editar, `A3 ${como} Analista de Cartão ${dia}: "${l.txt}" tem Editar`) }
      await p.close() }
  }
  // 6. varre todas as telas do casal: nada do outro com botão de mexer
  for (const como of ['ana', 'bruno']) for (const r of ROTAS) { const p = await abrir(b, como, r, '2026-11-18', 21); await semMexer(p, como, r); await p.close() }
  { const p = await abrir(b, 'ana', 'privacidade'); ok(/Vocês dois veem tudo da família, cada um com o nome do dono\. Cada um mexe só no seu\./.test(await p.textContent('body')), 'A3: texto novo da Privacidade'); await p.close() }

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
  /* ---------- E3: consertos da rodada 3 que dá pra ver na tela ---------- */
  if (SO.includes('E3')) {
  { const p = await abrir(b, 'bruno', 'inicio', '2026-11-30', 21); const t = await p.textContent('main')
    ok(/Até o fim do mês/.test(t) && !/Até domingo/.test(t), 'E3 (10): no dia 30 o domingo já é dezembro: tem que dizer "Até o fim do mês"'); await p.close() }
  { const p = await abrir(b, 'ana', 'inicio', '2026-11-30', 21); const t = await p.textContent('main')
    ok(/começa com R\$[\s ][\d.]+ em 01\/12 \(R\$[\s ]717 de novembro e R\$[\s ]200 de parcela\)/.test(t), 'E3 (2): o dia 30 avisa dezembro com a parcela')
    ok(/Ana \(você\): passou R\$/.test(t), 'E3 (3): o placar diz quem passou, com o nome')
    ok(!/Juntos, sobram/.test(t), 'E3 (3): "Juntos, sobram" com alguém passando')
    await p.close() }
  { const p = await abrir(b, 'ana', 'inicio', '2026-12-01', 9); const t = await p.textContent('main')
    ok(/Dezembro começa com R\$[\s ][\d.]+ \(R\$[\s ]717 de novembro e R\$[\s ]200 de parcela\)/.test(t), 'E3 (2): o dia 01 diz o mesmo número do dia 30'); await p.close() }
  { const p = await abrir(b, 'autonoma', 'guardado', '2026-11-18', 10); await p.click('button:has-text("Nova aplicação")').catch(() => {}); await p.waitForTimeout(300)
    const t8 = await p.textContent('body'); ok(!/Do casal|No seu nome R\$/.test(t8), 'E3 (8): família de 1 adulto sem "Do casal" nem "No seu nome R$ 0"'); ok(!/Ana|Bruno/.test(t8), 'E3 (8): a Cláudia não vê o guardado de outra família'); await p.close() }
  { const p = await abrir(b, 'ana', 'ajustes', '2026-11-18', 10); ok(await p.$('label.campo:has(span:text-is("Nome")) input') !== null, 'E3 (10): rótulo "Nome" no convite'); await p.close() }
  // nenhum travessão em tela nenhuma
  for (const como of ['ana', 'bruno', 'filha', 'autonoma', 'equipe']) for (const r of ROTAS) { const p = await abrir(b, como, r, '2026-11-18', 21); ok(!/[\u2014\u2013]/.test(await textoEAtributos(p)), `E3 ${como} ${r}: tem travessão`); await p.close() }
  }
  await b.close()
  console.log(`Varredura rodada 2: ${checagens} checagens, ${falhas.length} falhas, ${erros.length} erros de página.`)
  for (const f of [...new Set(falhas)].slice(0, 60)) console.log('FALHA ' + f)
  for (const e of [...new Set(erros)].slice(0, 20)) console.log('ERRO ' + e)
  process.exit(falhas.length || erros.length ? 1 : 0)
})()
