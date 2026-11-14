// E11 (PLANO_TECNICO item 4, portão 4): varredura final com as 8 pessoas, SÓ no modo exemplo (dist-exemplo). Não publica nada.
// uso: npm run teste:final        (faz o build de exemplo e roda esta varredura)
//      node testes/varredura3.cjs [--parte=varredura|tarefas|tudo|v9] [--rapida]   (v9: só a linha até 2028, os Desejos e 2029)
//      variáveis: PRINTS=<pasta dos prints> (padrão testes/prints/varredura3, fora do git), SAIDA=<arquivo .json com o placar>,
//                 TRABALHOS=<páginas ao mesmo tempo> (padrão 4), BASE=<endereço já servido> (sem BASE sobe um servidor em dist-exemplo)
// O que confere, pra cada pessoa, em 390 px e 1280 px, nos dias 18/11/2026, 30/11/2026 21h, 01/12/2026, 31/12/2028 e 02/01/2029,
// em cada tela e depois de tocar em cada botão de 1º nível (cada toque numa página recarregada, pra um não esconder o outro):
//   V1 0 erro de página            V2 equipe: 0 "R$" e 0 centavos no texto e no HTML     V3 filha: 0 dado dos pais e 0 conta de 2029
//   V4 casal: o do outro aparece COM o nome e SEM botão de mexer                         V5 olho fechado: 0 valor
//   V6 0 "-R$"                     V7 0 travessão                                        V8 0 palavra em inglês (lista INGLES abaixo)
//   V9 a linha até 2028 e os Desejos abrem e mostram número; no dia 02/01/2029 a tela de 2029 aparece sem quebrar
//   V10 família de 1 adulto (Autônoma): nada de "Do casal", "O casal", "vocês", "Os 2"
// Pessoas: Mãe de 3 (?como=ana), Dono (?como=bruno), Avó (a pessoa da casa, ?como=ana, com o texto a 130%: a página toda
// ampliada 1,3 vezes), Parcela (?como=ana: mesma tela da Mãe de 3, checada 1 vez só e contada pras 2), Filha (?como=filha),
// Equipe (?como=equipe), Autônoma (?como=autonoma, família de 1 adulto), Casal jovem (os 2 adultos: ?como=ana e ?como=bruno).
// A parte "tarefas" faz T1 a T14 (e as tarefas próprias da filha e da equipe) tocando na tela e conta os toques.
const { spawn } = require('node:child_process')
const { mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
let pw
try { pw = require('playwright') } catch { pw = require('/opt/node-tools/node_modules/playwright') }

const args = process.argv.slice(2)
const PARTE = (args.find(a => a.startsWith('--parte=')) || '--parte=tudo').slice(8)
const RAPIDA = args.includes('--rapida') || process.env.VARREDURA_RAPIDA === '1' // só 390 px e 2 dias (pra conferir o script, nunca pro portão)
const PRINTS = process.env.PRINTS || join(__dirname, 'prints', 'varredura3')
const SAIDA = process.env.SAIDA || ''
const TRABALHOS = Number(process.env.TRABALHOS || 4)
mkdirSync(PRINTS, { recursive: true })

const PESSOAS = [
  { nome: 'Mãe de 3', chave: 'ana', como: 'ana', zoom: 1, outro: 'Bruno', adulto: true },
  { nome: 'Dono', chave: 'bruno', como: 'bruno', zoom: 1, outro: 'Ana', adulto: true },
  { nome: 'Avó', chave: 'ana130', como: 'ana', zoom: 1.3, outro: 'Bruno', adulto: true },
  { nome: 'Parcela', usa: ['ana'] },
  { nome: 'Filha', chave: 'filha', como: 'filha', zoom: 1 },
  { nome: 'Equipe', chave: 'equipe', como: 'equipe', zoom: 1 },
  { nome: 'Autônoma', chave: 'autonoma', como: 'autonoma', zoom: 1, adulto: true },
  { nome: 'Casal jovem', usa: ['ana', 'bruno'] },
]
const VARRIDAS = PESSOAS.filter(p => p.chave)
const DIAS = RAPIDA ? [['2026-11-18', 10], ['2029-01-02', 10]] : [['2026-11-18', 10], ['2026-11-30', 21], ['2026-12-01', 9], ['2028-12-31', 10], ['2029-01-02', 10]]
const LARGURAS = RAPIDA ? [[390, 844]] : [[390, 844], [1280, 800]]
const ROTAS_BOTOES = ['inicio', 'lancamentos', 'orcamento', 'casa', 'desejos', 'guardado', 'cartoes', 'planejamento', 'escritorio', 'ajustes', 'privacidade']
const ROTAS_SO_ABRIR = ['painel', 'primeiro-uso', 'entrar', 'qualquer-coisa']

// V8: palavras em inglês proibidas na tela (TIME.md: "sem inglês"; preferência do dono: proibidos kickoff, compliance, briefing,
// milestone, checkpoint, onboarding; liberados dashboard e follow-up). Nome de marca (Apple Pay, Uber, Nubank, Pix) pode.
const INGLES = /\b(kickoff|compliance|briefing|milestone|checkpoint|onboarding|login|logout|log in|sign in|sign up|password|settings|loading|error|undefined|NaN|null|submit|cancel|save|delete|edit|home|next|back|done|click|upload|download|search|budget|wallet|goal|savings|income|expense|balance|today|week|month|account|profile|share|close|report|feedback)\b/
const NEG = /[-−–]\s?R\$|R\$[\s ]*[-−–]/
const TRAV = /[—–]/
const PAIS = /Ana|Bruno|Nubank|Itaú|Salário|salário|Casa mensal|Feira semanal|CDB|LCA|Tesouro|anuidade|fatura|Folha|Cozinheira|Gerar código|Apagar a família|Convidar|Seu Zé|Marcos|Jardineiro|Piscineiro|Guardado|Planejamento|Cartões|Escritório/
const MEXER = /Lançar|Mudar o dia|Pôr o dia|Chegou|Mudar o mês|Corrigir|Apagar|Editar|Tirar|Cobrir|Guardar|Encerrar|Não gastei|Esqueci|Quero juntar|Salvar|Trazer de volta|imprevisto|Anotar|Aprovo|Aplicar|Pensando|Combinado|Feito|Desisti/i

const placar = {} // pessoa -> { checagens, falhas: [] }
const porPortao = {} // V1..V9 -> { checagens, falhas }
const erros = []
let BASE = process.env.BASE || ''
const marca = (chave, v, ok, msg, extra = {}) => {
  const pp = (placar[chave] ||= { checagens: 0, falhas: [] }), vv = (porPortao[v] ||= { checagens: 0, falhas: 0 })
  pp.checagens++; vv.checagens++
  if (!ok) { pp.falhas.push(`${v} ${msg}`); vv.falhas++; if (extra.print) extra.print() }
}
const printsFeitos = new Set()
async function printa(p, nome) {
  if (printsFeitos.has(nome) || printsFeitos.size > 400) return
  printsFeitos.add(nome)
  await p.screenshot({ path: join(PRINTS, nome.replace(/[^\w.-]+/g, '_') + '.png') }).catch(() => {})
}

const textoEAtributos = p => p.evaluate(() => {
  const at = [...document.querySelectorAll('[aria-label],[title],[placeholder]')].map(e => [e.getAttribute('aria-label'), e.getAttribute('title'), e.getAttribute('placeholder')].filter(Boolean).join(' '))
  return (document.body.innerText + '\n' + at.join('\n')).replace(/ /g, ' ')
})
const htmlSemCodigo = p => p.evaluate(() => document.documentElement.outerHTML.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/&nbsp;/g, ' '))

async function novaPagina(ctx, pessoa, onde) {
  const p = await ctx.newPage()
  p.on('pageerror', e => { erros.push(`${pessoa.nome} ${onde()}: ${e.message}`); marca(pessoa.chave, 'V1', false, `${onde()}: erro de página: ${e.message}`) })
  p.on('dialog', d => d.dismiss().catch(() => {}))
  return p
}
const url = (pessoa, dia, hora, rota) => `${BASE}/?como=${pessoa.como}&dia=${dia}&hora=${hora}#/${rota}`
async function carregar(p, u) {
  // sempre uma carga nova (só trocar o # não recarrega e o estado da tela anterior ficaria)
  if (p.url() !== 'about:blank') await p.goto('about:blank')
  await p.goto(u, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('main, .entrar, form', { timeout: 6000 }).catch(() => {})
  // com a máquina carregada a tela pode levar mais que 250 ms pra encher: espera ter conteúdo (até 5 s)
  await p.waitForFunction(() => ((document.querySelector('main') || document.body).innerText || '').length > 80, null, { timeout: 5000 }).catch(() => {})
  await p.waitForTimeout(250)
}

/** As checagens de conteúdo que valem em qualquer estado da página (depois de abrir e depois de cada toque). */
async function checarEstado(p, pessoa, onde, dia) {
  const t = await textoEAtributos(p)
  const k = pessoa.chave, pr = () => printa(p, `falha_${pessoa.nome}_${onde}`)
  marca(k, 'V6', !NEG.test(t), `${onde}: tem "-R$": ${(t.match(/.{0,30}([-−–]\s?R\$|R\$\s*[-−–]).{0,10}/) || [''])[0]}`, { print: pr })
  marca(k, 'V7', !TRAV.test(t), `${onde}: tem travessão: ${(t.match(/.{0,30}[—–].{0,20}/) || [''])[0]}`, { print: pr })
  const ing = t.match(INGLES)
  marca(k, 'V8', !ing, `${onde}: palavra em inglês "${ing && ing[0]}": ${ing ? (t.match(new RegExp(`.{0,30}\\b${ing[0]}\\b.{0,20}`)) || [''])[0] : ''}`, { print: pr })
  if (k === 'equipe') {
    const h = await htmlSemCodigo(p)
    marca(k, 'V2', !/R\$/.test(t) && !/R\$/.test(h), `${onde}: tem "R$": ${((t + h).match(/.{0,40}R\$.{0,30}/) || [''])[0]}`, { print: pr })
    const cent = /\d,\d{2}(?!\d)/
    const tc = t.replace(/\d{1,2}\/\d{2}(\/\d{2,4})?/g, '')
    marca(k, 'V2', !cent.test(tc), `${onde}: tem centavos no texto: ${(tc.match(/.{0,30}\d,\d{2}(?!\d).{0,10}/) || [''])[0]}`, { print: pr })
    const hc = h.replace(/<[^>]+>/g, ' ').replace(/\d{1,2}\/\d{2}(\/\d{2,4})?/g, '')
    marca(k, 'V2', !cent.test(hc), `${onde}: tem centavos no HTML: ${(hc.match(/.{0,30}\d,\d{2}(?!\d).{0,10}/) || [''])[0]}`, { print: pr })
  }
  if (k === 'filha') {
    const m = t.match(PAIS)
    marca(k, 'V3', !m, `${onde}: aparece dado dos pais "${m && m[0]}": ${m ? (t.match(new RegExp(`.{0,30}${m[0]}.{0,20}`)) || [''])[0] : ''}`, { print: pr })
    const vals = [...t.matchAll(/R\$\s*([\d.]+)(,\d+)?/g)].map(x => Number(x[1].replace(/\./g, '')))
    marca(k, 'V3', vals.every(v => v <= 300), `${onde}: valor acima do combinado dela (R$ 300): ${vals.filter(v => v > 300).join(', ')}`, { print: pr })
    // conta de 2029: a filha não vê nada de 2029 (o ano pode aparecer só como data do dia de hoje, nunca como conta)
    const t29 = t.replace(/\b\d{2}\/\d{2}\/2029\b/g, '').replace(/(janeiro|jan\.?) (de )?2029/gi, '')
    marca(k, 'V3', !/2029|renda de 2029|dezembro de 2028/.test(t29), `${onde}: aparece conta de 2029: ${(t29.match(/.{0,40}2029.{0,20}/) || [''])[0]}`, { print: pr })
  }
  if (k === 'autonoma') {
    // família de 1 adulto: sem "Do casal", "O casal", "vocês", "Os 2" (conserto 8 da rodada 3)
    const m = t.match(/Do casal|O casal|[Vv]ocês|Os 2 |os 2 adultos|Juntos/)
    marca(k, 'V10', !m, `${onde}: fala com casal numa família de 1 adulto: ${m ? (t.match(new RegExp(`.{0,40}${m[0]}.{0,30}`)) || [''])[0] : ''}`, { print: pr })
  }
  if (pessoa.outro) {
    const itens = await p.$$eval('[data-do-outro]', (els, re) => els.filter(e => e.offsetParent !== null || e.getClientRects().length).map(e => ({
      dono: e.getAttribute('data-do-outro'), txt: e.innerText.slice(0, 60).replace(/\s+/g, ' '),
      botoes: [...e.querySelectorAll('button, a.btn, input:not([disabled]):not([type=hidden]), select:not([disabled])')].filter(b => !b.disabled).map(b => (b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '') + (b.tagName === 'INPUT' || b.tagName === 'SELECT' ? ' [campo que muda]' : '')).filter(x => new RegExp(re, 'i').test(x)),
    })), MEXER.source)
    for (const it of itens) marca(k, 'V4', it.botoes.length === 0, `${onde}: botão de mexer no que é de ${it.dono} ("${it.txt}"): ${it.botoes.join(' | ')}`, { print: pr })
    return itens
  }
  return []
}

/** Uma pessoa, uma largura, um dia: abre cada tela e toca em cada botão de 1º nível. */
async function varrer(browser, pessoa, [larg, alt], [dia, hora]) {
  const z = pessoa.zoom || 1
  const ctx = await browser.newContext({ viewport: { width: Math.round(larg / z), height: Math.round(alt / z) }, deviceScaleFactor: z, isMobile: larg < 500, hasTouch: larg < 500, locale: 'pt-BR', timezoneId: 'America/Recife', serviceWorkers: 'block' })
  const tag = `${larg}px ${dia} ${hora}h`
  let onde = tag
  const p = await novaPagina(ctx, pessoa, () => onde)
  const k = pessoa.chave
  let toques = 0
  for (const r of PARTE === 'v9' ? [] : [...ROTAS_BOTOES, ...ROTAS_SO_ABRIR]) {
    onde = `${tag} #/${r}`
    await carregar(p, url(pessoa, dia, hora, r))
    const itens = await checarEstado(p, pessoa, onde, dia)
    // V4: nas telas em que o do outro tem que aparecer, ele aparece com o nome
    if (pessoa.outro && ['inicio', 'cartoes', 'planejamento', 'guardado', 'desejos'].includes(r))
      marca(k, 'V4', itens.some(x => x.dono === pessoa.outro), `${onde}: o que é de ${pessoa.outro} não aparece com o nome dele`, { print: () => printa(p, `falha_${pessoa.nome}_${onde}_sem_outro`) })
    if (!ROTAS_BOTOES.includes(r)) continue
    if (larg === 390 && dia === '2026-11-18') await printa(p, `${pessoa.nome}_${r}_390`)
    // botões de 1º nível: os da tela (main) em toda rota; a barra de baixo, o menu do lado e o topo só no Início
    const sel = r === 'inicio' ? 'main button:visible, .tabbar button:visible, .tabbar a:visible, .rail button:visible, .rail a:visible, .top button:visible' : 'main button:visible'
    const n = await p.$$eval(sel.replace(/:visible/g, ''), l => l.filter(e => e.offsetParent !== null && !e.closest('.sheet')).length)
    for (let i = 0; i < n; i++) {
      if (i > 0) { await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForSelector('main', { timeout: 6000 }).catch(() => {}); await p.waitForTimeout(200) }
      const bts = await p.$$(sel.replace(/:visible/g, ''))
      const vis = []
      for (const b of bts) if (await b.evaluate(e => e.offsetParent !== null && !e.closest('.sheet')).catch(() => false)) vis.push(b)
      const bt = vis[i]
      if (!bt) continue
      const nomeBt = ((await bt.getAttribute('aria-label')) || (await bt.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 30)
      if (/olho|Esconder os valores|Mostrar os valores/.test(nomeBt + (await bt.getAttribute('class') || ''))) continue // o olho tem a checagem dele (V5)
      onde = `${tag} #/${r} botão "${nomeBt}"`
      await bt.click({ timeout: 2500 }).catch(() => {})
      toques++
      await p.waitForTimeout(300)
      await checarEstado(p, pessoa, onde, dia)
    }
  }
  // V5: olho fechado esconde todo valor (quem tem dinheiro na tela)
  if (pessoa.chave !== 'equipe' && PARTE !== 'v9') for (const r of ['inicio', 'orcamento', 'lancamentos', 'casa', 'desejos', 'guardado', 'cartoes', 'planejamento', 'escritorio']) {
    onde = `${tag} #/${r} olho fechado`
    await carregar(p, url(pessoa, dia, hora, r))
    const olho = await p.$('.top .olho')
    if (!olho) { marca(k, 'V5', false, `${onde}: sem o botão do olho`); continue }
    await olho.click(); await p.waitForTimeout(350)
    const t = await textoEAtributos(p)
    // "R$ 0" do teclado vazio do Lançar não é valor de ninguém; qualquer outro número conta
    const SEM_OLHO = /R\$\s*(?!0(?![\d.,]))\d[^\n]{0,25}/
    const m = t.match(SEM_OLHO)
    marca(k, 'V5', !m, `${onde}: ainda aparece "${m && m[0]}"`, { print: () => printa(p, `falha_${pessoa.nome}_${onde}`) })
    if (r === 'inicio') {
      await p.click('.tabbar .plus, .rail .plus').catch(() => {}); await p.waitForTimeout(300)
      const t2 = await textoEAtributos(p); const m2 = t2.match(SEM_OLHO)
      marca(k, 'V5', !m2, `${onde} folha Lançar: ainda aparece "${m2 && m2[0]}"`, { print: () => printa(p, `falha_${pessoa.nome}_${onde}_lancar`) })
      await p.keyboard.press('Escape').catch(() => {})
    }
    await p.click('.top .olho').catch(() => {}); await p.waitForTimeout(200)
    await p.evaluate(() => { try { localStorage.removeItem('esconder_valores') } catch {} })
  }
  // V9: a linha até 2028 e os Desejos abrem e mostram número; em 02/01/2029 a tela de 2029 aparece sem quebrar
  if (pessoa.adulto) {
    const depois = dia >= '2029-01-01'
    onde = `${tag} #/planejamento linha até 2028`
    await carregar(p, url(pessoa, dia, hora, 'planejamento'))
    await p.waitForSelector(depois ? 'section[aria-labelledby=pObj]' : '.linha-2028 svg polyline.linha', { timeout: 8000 }).catch(() => {})
    const obj = await p.$('section[aria-labelledby=pObj]')
    const tObj = obj ? ((await obj.innerText()) || '').replace(/ /g, ' ') : ''
    marca(k, 'V9', !!obj && tObj.length > 40, `${onde}: o card Objetivo de 2029 não aparece`, { print: () => printa(p, `falha_${pessoa.nome}_${onde}`) })
    if (!depois) {
      const linha = await p.$('.linha-2028 svg polyline.linha')
      marca(k, 'V9', !!linha && /R\$ ?[\d.]+,?\d*/.test((await p.$eval('.linha-2028', e => e.innerText).catch(() => '')).replace(/\u00a0/g, ' ')), `${onde}: a linha até dez/2028 não está desenhada com número`, { print: () => printa(p, `falha_${pessoa.nome}_${onde}`) })
      if (larg === 390) await printa(p, `${pessoa.nome}_linha2028_${dia}_${larg}`)
    } else {
      // virada: a tela não pode quebrar e tem que dizer algo de 2029 com número (renda, falta ou o que falta pra conta)
      marca(k, 'V9', /2029/.test(tObj), `${onde}: em ${dia} o card não fala de 2029`, { print: () => printa(p, `falha_${pessoa.nome}_${onde}`) })
      marca(k, 'V9', /R\$ ?[\d.]+/.test(tObj), `${onde}: em ${dia} a tela de 2029 aparece sem nenhum número (diz: "${tObj.replace(/\s+/g, ' ').slice(0, 160)}")`, { print: () => printa(p, `falha_${pessoa.nome}_${onde}_sem_numero`) })
      if (larg === 390) await printa(p, `${pessoa.nome}_tela2029_${dia}_${larg}`)
    }
    onde = `${tag} #/desejos calculadora`
    await carregar(p, url(pessoa, dia, hora, 'desejos'))
    await p.waitForSelector('.desejo-form input.inp', { timeout: 8000 }).catch(() => {})
    const form = await p.$('.desejo-form input.inp')
    marca(k, 'V9', !!form, `${onde}: a calculadora de Desejos não abre`)
    if (form) {
      await form.fill('Viagem (teste)'); await p.fill('input[aria-label="Quanto custa"]', '50000').catch(() => {})
      await p.waitForFunction(() => /R\$/.test((document.querySelector('.desejo-res') || {}).textContent || ''), null, { timeout: 6000 }).catch(() => {})
      const res = ((await p.textContent('.desejo-res').catch(() => '')) || '').replace(/ /g, ' ')
      marca(k, 'V9', /R\$ ?[\d.]+/.test(res), `${onde}: a resposta do "cabe?" não mostra número ("${res.slice(0, 120)}")`, { print: () => printa(p, `falha_${pessoa.nome}_${onde}`) })
      await checarEstado(p, pessoa, onde, dia)
      if (larg === 390 && (dia === '2026-11-18' || depois)) await printa(p, `${pessoa.nome}_desejos_${dia}_${larg}`)
    }
  }
  await ctx.close()
  return toques
}

// ---------------------------------------------------------------- TAREFAS (T1 a T14, filha e equipe) ----------------------------------------------------------------
const tarefas = {} // pessoa -> [{ t, ok, toques, resposta, confundiu }]
const anotaTarefa = (pessoa, t, ok, toques, resposta, confundiu = '') => (tarefas[pessoa] ||= []).push({ t, ok, toques, resposta: String(resposta).replace(/\s+/g, ' ').slice(0, 220), confundiu })
const brl = s => Number(String(s).replace(/R\$\s*/, '').replace(/\./g, '').replace(',', '.'))
const achaValor = (t, re) => { const m = t.match(re); return m ? brl(m[1]) : null }

async function abrirComo(browser, pessoa, dia, hora, rota, zoom = 1, larg = 390, alt = 844) {
  const ctx = await browser.newContext({ viewport: { width: Math.round(larg / zoom), height: Math.round(alt / zoom) }, deviceScaleFactor: zoom, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Recife', serviceWorkers: 'block' })
  const p = await ctx.newPage()
  p.on('pageerror', e => erros.push(`tarefa ${pessoa} ${rota} ${dia}: ${e.message}`))
  p.on('dialog', d => d.accept().catch(() => {}))
  await carregar(p, `${BASE}/?como=${pessoa}&dia=${dia}&hora=${hora}#/${rota}`)
  let toques = 0
  const toca = async (sel, opt = {}) => { await p.locator(sel).first().click({ timeout: 4000, ...opt }); toques++; await p.waitForTimeout(250) }
  const digita = async valor => { for (const c of valor) await toca(`.sheet .keys button[aria-label="${c}"]`) }
  const texto = async (sel = 'body') => ((await p.textContent(sel).catch(() => '')) || '').replace(/ /g, ' ')
  return { ctx, p, toca, digita, texto, toques: () => toques, zera: () => { toques = 0 } }
}

/** T1 a T14 com uma pessoa adulta (como = ana | bruno | autonoma), zoom 1 ou 1,3. Cada tarefa numa página nova. */
async function tarefasAdulto(browser, nome, como, zoom = 1) {
  const eu = { ana: 'Ana', bruno: 'Bruno', autonoma: 'Cláudia' }[como]
  const D = '2026-11-18'
  const roda = async (t, fn, dia = D, hora = 10, rota = 'inicio') => {
    const s = await abrirComo(browser, como, dia, hora, rota, zoom)
    try { await fn(s) } catch (e) { anotaTarefa(nome, t, false, s.toques(), `não conseguiu: ${e.message.split('\n')[0].slice(0, 120)}`); await printa(s.p, `tarefa_${nome}_${t}_travou`) }
    await s.ctx.close()
  }
  // T1 Quanto posso gastar hoje? (0 toque: o número grande do Início)
  await roda('T1', async s => {
    const t = await s.texto('main')
    const v = achaValor(t, /Hoje você pode gastar\s*(R\$\s*[\d.,]+)/), ainda = achaValor(t, /Ainda pode hoje (R\$ [\d.,]+)/)
    const ok = v !== null && (ainda === null || ainda === v)
    anotaTarefa(nome, 'T1', ok, 0, `Hoje você pode gastar R$ ${v}`)
    await printa(s.p, `tarefa_${nome}_T1`)
  })
  // T2 até domingo (ou "até o fim do mês")
  await roda('T2', async s => { const t = await s.texto('main'); const v = achaValor(t, /Até (?:domingo|o fim do mês)\s*(R\$ [\d.,]+)/); anotaTarefa(nome, 'T2', v !== null, 0, `Até domingo R$ ${v}`) })
  // T3 fecho o mês? (frase do bloco "Se continuar assim")
  await roda('T3', async s => { const t = await s.texto('main'); const m = t.match(/(Passa R\$ [\d.,]+ no fim do mês|Fecha o mês dentro[^.]*|fecha com R\$ [\d.,]+)/); anotaTarefa(nome, 'T3', !!m, 0, m ? m[0] : 'não achou a frase') })
  // T4 lançar R$ 87,50 na farmácia, no Pix
  let depoisT4 = null
  await roda('T4', async s => {
    const antes = achaValor(await s.texto('main'), /Hoje você pode gastar\s*(R\$\s*[\d.,]+)/)
    await s.toca('.tabbar .plus'); await s.p.fill('.sheet .lanc-o-que', 'Farmácia'); s.zera(); const toquesAteAqui = 1
    await s.digita('87,50')
    await s.toca(`.sheet .envbtn.meu`)
    await s.p.waitForTimeout(400)
    const t = await s.texto('main'); depoisT4 = achaValor(t, /Hoje você pode gastar\s*(R\$\s*[\d.,]+)/)
    await s.p.evaluate(() => { location.hash = '#/lancamentos' }); await s.p.waitForTimeout(500)
    const lista = await s.texto('main')
    const ok = /Farmácia/.test(lista) && /87,50/.test(lista)
    anotaTarefa(nome, 'T4', ok, s.toques() + toquesAteAqui + 1 /* digitar o nome conta 1 */, `antes R$ ${antes}, depois R$ ${depoisT4}; na lista: ${ok ? 'Farmácia R$ 87,50' : 'não achou'}`)
    await printa(s.p, `tarefa_${nome}_T4`)
  })
  // T5 corrigir 87,50 pra 78,50 (lança e corrige na mesma página)
  await roda('T5', async s => {
    await s.toca('.tabbar .plus'); await s.p.fill('.sheet .lanc-o-que', 'Farmácia'); await s.digita('87,50'); await s.toca('.sheet .envbtn.meu'); await s.p.waitForTimeout(400)
    await s.p.evaluate(() => { location.hash = '#/lancamentos' }); await s.p.waitForTimeout(500); s.zera(); s.zera()
    const lin = s.p.locator('main li', { hasText: 'Farmácia' }).filter({ hasText: '87,50' }).first()
    const lapis = lin.locator('button[aria-label*="Corrigir"], button[aria-label*="corrigir"], button.lapis, button[aria-label*="Mudar"]').first()
    if (await lapis.count()) { await lapis.click(); } else { await lin.click() }
    let toques = 2 // ir pra Lançamentos + abrir
    await s.p.waitForTimeout(400)
    for (const c of '78,50') { await s.p.click(`.sheet .keys button[aria-label="${c}"]`); toques++ }
    const salvar = s.p.locator('.sheet button.primary, .sheet button:has-text("Salvar"), .sheet .envbtn.meu').first()
    await salvar.click({ timeout: 3000 }); toques++; await s.p.waitForTimeout(500)
    const lista = await s.texto('main')
    const ok = /78,50/.test(lista) && !/87,50/.test(lista)
    anotaTarefa(nome, 'T5', ok, toques, ok ? 'Farmácia agora R$ 78,50' : `lista ainda mostra: ${(lista.match(/Farmácia.{0,40}/) || [''])[0]}`)
    await printa(s.p, `tarefa_${nome}_T5`)
  })
  // T6 quanto tenho guardado e quanto rendeu no mês
  await roda('T6', async s => {
    await s.toca('main a.guard-card')
    await s.p.waitForTimeout(500)
    const t = await s.texto('main')
    const tot = t.match(/(?:A família tem guardado|Você tem guardado|Tem guardado)\s*(R\$ ?[\d.]+,\d{2})/), rend = t.match(/Neste mês\s*(R\$ ?[\d.,]+)/)
    anotaTarefa(nome, 'T6', !!tot && !!rend, s.toques(), `guardado ${tot ? tot[1] : 'não achou'}, rendeu no mês ${rend ? rend[1] : 'não achou'}`)
    await printa(s.p, `tarefa_${nome}_T6`)
  })
  // T7 ganhei R$ 500 de presente: anotar (Lançar > Entrou dinheiro)
  await roda('T7', async s => {
    await s.toca('.tabbar .plus'); await s.toca('.sheet button:has-text("Entrou dinheiro")'); await s.digita('500')
    const salvar = s.p.locator('.sheet button.primary, .sheet button:has-text("Anotar"), .sheet button:has-text("Guardar"), .sheet .envbtn').first()
    await salvar.click({ timeout: 3000 }); await s.p.waitForTimeout(500)
    const t = await s.texto('body')
    const av = t.match(/R\$ 500 foram pro guardado[^.\n]*/)
    anotaTarefa(nome, 'T7', !!av && !(await s.p.$('.sheet .keys')), s.toques() + 1, av ? av[0] : 'não achou o aviso de guardado')
    await printa(s.p, `tarefa_${nome}_T7`)
  })
  // T8 TV R$ 1.200 em 6x no cartão: anotar e ver quanto sai deste mês
  await roda('T8', async s => {
    await s.toca('.tabbar .plus'); await s.p.fill('.sheet .lanc-o-que', 'TV')
    const cartao = s.p.locator('.sheet .atrow .pill').filter({ hasNotText: /Pix|Hoje|Ontem/ }).first()
    if (!(await cartao.count())) throw new Error('sem cartão no Lançar')
    await cartao.click(); await s.p.waitForTimeout(250)
    await s.digita('1200')
    const p6 = s.p.locator('.sheet button:has-text("6x"), .sheet .pill:has-text("6")').first()
    if (await p6.count()) await p6.click(); else throw new Error('sem a escolha de parcelas')
    await s.p.waitForTimeout(300)
    const t = await s.texto('.sheet')
    // regra do dono (13/11): a parcela conta no MÊS DA FATURA; em 18/11 a 1ª fatura é a de dezembro, então neste mês não conta nada
    const m = t.match(/6x de (R\$ [\d.,]+) nas faturas de [^.]*\.[^.]*\.\s*(Neste mês não conta nada|Neste mês conta R\$ [\d.,]+)/)
    await s.toca('.sheet .envbtn.meu'); await s.p.waitForTimeout(400)
    const salvo = !(await s.p.$('.sheet .keys'))
    anotaTarefa(nome, 'T8', !!m && brl(m[1]) === 200 && salvo, s.toques() + 3 /* o nome, o cartão e o 6x */, m ? m[0] : 'sem a frase das parcelas')
    await printa(s.p, `tarefa_${nome}_T8`)
  })
  // T9 passei do combinado: quanto passei e o que acontece amanhã (30/11 21h)
  await roda('T9', async s => {
    const t = await s.texto('main')
    const m = t.match(/passou (R\$ [\d.,]+)[^.]*/i), am = t.match(/(sai de dezembro|Sai do mês de dezembro[^.]*|Dezembro começa com R\$ [\d.,]+[^.]*|começa com R\$ [\d.,]+ em 01\/12[^.]*)/i)
    anotaTarefa(nome, 'T9', !!m && !!am, 0, `${m ? m[0] : 'sem "passou"'}; ${am ? am[0] : 'sem o que acontece amanhã'}`)
    await printa(s.p, `tarefa_${nome}_T9`)
  }, '2026-11-30', 21)
  // T10 esconder os valores
  await roda('T10', async s => {
    await s.toca('.top .olho'); const t = await s.texto('main')
    anotaTarefa(nome, 'T10', !/R\$\s*\d/.test(t), s.toques(), /R\$\s*\d/.test(t) ? 'ainda aparece valor' : 'nenhum valor na tela')
  })
  // T11 "esse gasto tira quanto de 2029?" (gasto grande no Lançar)
  await roda('T11', async s => {
    await s.toca('.tabbar .plus'); await s.digita('2000'); await s.p.waitForTimeout(400)
    const t = await s.texto('.sheet')
    const m = t.match(/tira (R\$ [\d.,]+) por mês da renda de 2029/)
    anotaTarefa(nome, 'T11', !!m, s.toques(), m ? m[0] : 'o Lançar não diz quanto tira de 2029')
    await printa(s.p, `tarefa_${nome}_T11`)
  })
  // T12 "quero viajar com R$ 50.000: cabe?"
  await roda('T12', async s => {
    await s.toca('a[href="#/desejos"], .tabbar a:has-text("Desejos"), .tabbar button:has-text("Desejos"), .rail a:has-text("Desejos")').catch(async () => { await s.p.evaluate(() => { location.hash = '#/desejos' }); })
    await s.p.waitForTimeout(400)
    await s.p.fill('.desejo-form input.inp', 'Viagem'); await s.p.fill('input[aria-label="Quanto custa"]', '50000'); await s.p.waitForTimeout(700)
    const r = await s.texto('.desejo-res')
    const ok = /^(Cabe\.|Cabe, mas tira de 2029\.|Ainda não cabe\.|O caixa já está apertado\.)/.test(r.trim()) && /R\$ [\d.,]+/.test(r)
    anotaTarefa(nome, 'T12', ok, s.toques() + 2, r.slice(0, 200))
    await printa(s.p, `tarefa_${nome}_T12`)
  })
  // T13 o casal fecha o mês?
  await roda('T13', async s => {
    const t = await s.texto('main')
    const m = t.match(/O casal, se continuar assim[\s\S]{0,260}/)
    if (como === 'autonoma') anotaTarefa(nome, 'T13', !/O casal|vocês/i.test(t), 0, /O casal|vocês/i.test(t) ? 'fala de casal pra família de 1 adulto' : 'sem placar de casal (família de 1 adulto, certo)')
    else anotaTarefa(nome, 'T13', !!m && /Ana/.test(m[0]) && /Bruno/.test(m[0]), 0, m ? m[0].replace(/\s+/g, ' ').slice(0, 200) : 'sem placar do casal')
  })
  // T14 a regra do salário foi cumprida? (Planejamento)
  await roda('T14', async s => {
    await s.p.evaluate(() => { location.hash = '#/planejamento' }); await s.p.waitForTimeout(500)
    const t = await s.texto('main')
    const m = t.match(/(Entrou a mais este mês: R\$ [\d.,]+\. Já guardado: R\$ [\d.,]+\. (Falta guardar: R\$ [\d.,]+|Regra cumprida)\.?|Este mês não entrou dinheiro a mais[^.]*\.)/)
    anotaTarefa(nome, 'T14', !!m, 2, m ? m[0] : 'sem a frase da regra do salário')
  })
}

async function tarefasFilha(browser) {
  const nome = 'Filha'
  const s1 = await abrirComo(browser, 'filha', '2026-11-18', 21, 'inicio')
  const t = await s1.texto('main')
  anotaTarefa(nome, 'F1 quanto ainda tenho da mesada', /Hoje você pode gastar/.test(t), 0, (t.match(/Do seu combinado de R\$ [\d.,]+, sobram R\$ [\d.,]+[^.]*/) || ['?'])[0])
  await s1.toca('.tabbar .plus'); await s1.digita('15'); await s1.toca('.sheet .envbtn.meu, .sheet .envbtn'); await s1.p.waitForTimeout(400)
  anotaTarefa(nome, 'F2 lanche de R$ 15', !(await s1.p.$('.sheet .keys')), s1.toques(), (await s1.texto('body')).match(/[^.\n]{0,40}15[^.\n]{0,40}/)?.[0] || '')
  await s1.ctx.close()
  const s2 = await abrirComo(browser, 'filha', '2026-11-18', 10, 'desejos')
  await s2.p.fill('.desejo-form input.inp', 'Fone'); await s2.p.fill('input[aria-label="Quanto custa"]', '150'); await s2.p.waitForTimeout(500)
  const r = await s2.texto('main')
  anotaTarefa(nome, 'F3 dá pra comprar o fone de R$ 150?', /Dá pra comprar com o seu|não dá|Ainda não/i.test(r) && !/2029/.test(r), 2, (r.match(/(Dá pra comprar com o seu|Ainda não)[^.]*\./) || ['sem resposta'])[0])
  await printa(s2.p, 'tarefa_Filha_F3')
  await s2.ctx.close()
  const s3 = await abrirComo(browser, 'filha', '2026-11-18', 10, 'planejamento')
  anotaTarefa(nome, 'F4 endereço do Planejamento volta pro Início', (await s3.texto('h1')) === 'Novembro', 0, `título: ${await s3.texto('h1')}`)
  await s3.ctx.close()
}

async function tarefasEquipe(browser) {
  const nome = 'Equipe'
  const s = await abrirComo(browser, 'equipe', '2026-11-18', 10, 'casa')
  await s.toca('button:has-text("Anotar compra")'); await s.p.fill('.sheet input.inp', 'Feira do mercadinho')
  await s.toca('.sheet .btn:has-text("Usar uma nota de exemplo")').catch(() => {})
  await s.toca('.sheet .btn.primary.full'); await s.p.waitForTimeout(400)
  const t = await s.texto('body')
  anotaTarefa(nome, 'E1 lançar a feira com a foto da nota', /Feira do mercadinho/.test(t) && !/R\$/.test(t), s.toques() + 1, (t.match(/Anotei[^.]*\.|Feira do mercadinho[^\n]{0,40}/) || [''])[0])
  await printa(s.p, 'tarefa_Equipe_E1')
  await s.ctx.close()
  const s2 = await abrirComo(browser, 'equipe', '2026-11-18', 10, 'casa')
  const anexar = s2.p.locator('button:has-text("Anexar a nota agora")').first()
  if (await anexar.count()) { await anexar.click(); await s2.p.waitForTimeout(300); await s2.toca('.sheet .btn:has-text("Usar uma nota de exemplo"), button:has-text("Tirar foto")').catch(() => {}); await s2.p.waitForTimeout(300) }
  const t2 = await s2.texto('body')
  anotaTarefa(nome, 'E2 anexar a nota da feira', !!(await anexar.count()) && !/R\$/.test(t2), s2.toques() + 1, (t2.match(/Nota[^.]*guardada[^.]*\.|precisam de você/) || ['sem confirmação'])[0])
  await s2.ctx.close()
  const s3 = await abrirComo(browser, 'equipe', '2026-11-18', 10, 'casa')
  const t3 = await s3.texto('main')
  anotaTarefa(nome, 'E3 ver a lista de compras', /Lista|lista de compras|Faltam|faltam/.test(t3), 0, (t3.match(/[^\n]{0,30}(Lista|lista)[^\n]{0,40}/) || ['sem lista'])[0])
  anotaTarefa(nome, 'E4 nenhum valor em lugar nenhum', !/R\$/.test(await htmlSemCodigo(s3.p)), 0, 'conferido pela V2 em todas as telas e botões')
  await s3.ctx.close()
}

;(async () => {
  let srv = null
  if (!BASE) {
    const porta = 8000 + Math.floor(Math.random() * 900)
    srv = spawn('python3', ['-m', 'http.server', String(porta), '--bind', '127.0.0.1', '--directory', join(__dirname, '..', 'dist-exemplo')], { stdio: 'ignore' })
    BASE = `http://127.0.0.1:${porta}`
    await new Promise(r => setTimeout(r, 900))
  }
  const browser = await pw.chromium.launch()
  const t0 = Date.now()
  let toques = 0
  if (PARTE === 'varredura' || PARTE === 'tudo' || PARTE === 'v9') {
    const fila = []
    for (const pessoa of VARRIDAS) for (const l of LARGURAS) for (const d of DIAS) fila.push([pessoa, l, d])
    let feitas = 0
    const trabalhador = async () => { while (fila.length) { const [pe, l, d] = fila.shift(); toques += await varrer(browser, pe, l, d).catch(e => { erros.push(`${pe.nome} ${l[0]} ${d[0]}: a varredura parou: ${e.message.split('\n')[0]}`); marca(pe.chave, 'V1', false, `${l[0]}px ${d[0]}: a varredura parou: ${e.message.split('\n')[0]}`); return 0 }); feitas++; if (feitas % 6 === 0) console.log(`  ${feitas} de ${VARRIDAS.length * LARGURAS.length * DIAS.length} (pessoa, largura, dia) varridos, ${Math.round((Date.now() - t0) / 1000)} s`) } }
    await Promise.all(Array.from({ length: TRABALHOS }, trabalhador))
  }
  if (PARTE === 'tarefas' || PARTE === 'tudo') {
    await Promise.all([
      tarefasAdulto(browser, 'Mãe de 3', 'ana'), tarefasAdulto(browser, 'Dono', 'bruno'),
    ])
    await Promise.all([tarefasAdulto(browser, 'Avó', 'ana', 1.3), tarefasAdulto(browser, 'Autônoma', 'autonoma')])
    await Promise.all([tarefasFilha(browser), tarefasEquipe(browser)])
  }
  await browser.close()
  if (srv) srv.kill()

  // placar por pessoa (Parcela = Mãe de 3; Casal jovem = Mãe de 3 + Dono, mesmas telas)
  const porPessoa = PESSOAS.map(pe => {
    const ch = pe.usa || [pe.chave]
    const c = ch.reduce((s, k) => s + ((placar[k] || {}).checagens || 0), 0)
    const f = ch.flatMap(k => (placar[k] || {}).falhas || [])
    return { pessoa: pe.nome, usa: pe.usa ? pe.usa.join('+') : pe.como, checagens: c, falhas: f.length, exemplos: [...new Set(f)].slice(0, 25) }
  })
  const totalC = Object.values(placar).reduce((s, x) => s + x.checagens, 0), totalF = Object.values(placar).reduce((s, x) => s + x.falhas.length, 0)
  console.log(`\nVarredura 3 (E11): ${totalC} checagens, ${totalF} falhas, ${erros.length} erros de página, ${toques} botões tocados, ${Math.round((Date.now() - t0) / 1000)} s.`)
  for (const x of porPessoa) console.log(`  ${x.pessoa.padEnd(12)} ${String(x.checagens).padStart(6)} checagens, ${x.falhas} falhas`)
  for (const [v, x] of Object.entries(porPortao).sort()) console.log(`  ${v}: ${x.checagens} checagens, ${x.falhas} falhas`)
  const todas = [...new Set(Object.values(placar).flatMap(x => x.falhas))]
  for (const f of todas.slice(0, 80)) console.log('FALHA ' + f)
  for (const e of [...new Set(erros)].slice(0, 30)) console.log('ERRO ' + e)
  for (const [pe, l] of Object.entries(tarefas)) console.log(`TAREFAS ${pe}: ${l.filter(x => x.ok).length} de ${l.length}. ${l.map(x => `${x.t}:${x.ok ? 'ok' : 'NÃO'}(${x.toques})`).join(' ')}`)
  if (SAIDA) writeFileSync(SAIDA, JSON.stringify({ porPessoa, porPortao, tarefas, erros: [...new Set(erros)], falhas: todas, toques, segundos: Math.round((Date.now() - t0) / 1000) }, null, 1))
  const tarefasFalhas = Object.values(tarefas).flat().filter(x => !x.ok).length
  process.exit(totalF || erros.length || tarefasFalhas ? 1 : 0)
})()
