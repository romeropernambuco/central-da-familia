// Teste de ponta a ponta no build do modo exemplo (dist-exemplo), celular 390 e computador 1280.
// Confere: 0 erro no console, nada cortado ou sobreposto, nada abaixo de 11 px, tempo de lançar.
// Rodar: npm run build:exemplo && npm run e2e   (Playwright já instalado na máquina)
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch { pw = require('/opt/npm-tools/node_modules/playwright') }

const PORTA = 4799
const BASE = `http://127.0.0.1:${PORTA}/`
const PASTA = new URL('./prints/', import.meta.url).pathname
mkdirSync(PASTA, { recursive: true })
const srv = spawn('python3', ['-m', 'http.server', String(PORTA), '--bind', '127.0.0.1', '--directory', new URL('../dist-exemplo', import.meta.url).pathname], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 800))

// checagens feitas dentro da página
function checar() {
  const out = { cortado: [], pequeno: [], sobreposto: [], vazaLado: false, termos: [] }
  // CONTRATO3: nenhuma tela diz "colchão" nem termo difícil sozinho (CDI só passa se vier explicado: "CDI (a taxa...")
  const txt = document.body.innerText
  for (const [n, r] of [['colchão', /colch[ãa]o/i], ['envelope', /envelope/i], ['liquidez', /liquidez/i], ['CDI sem explicar', /^(?:(?!\bCDI \()[\s\S])*?\bCDI\b(?! \()/], ['IR', /\bIR\b/], ['IOF', /\bIOF\b/], ['FGC', /\bFGC\b/], ['DAE', /\bDAE\b/], ['eSocial sem explicar', /eSocial(?! Doméstico, o cadastro)/], ['líquido', /l[íi]quid[oa]/i], ['bruto', /\bbrut[oa]/i], ['regressivo', /regressiv/i], ['fatura fechada', /fatura fechada/i], ['saldo livre', /saldo livre/i], ['PEPS', /\bPEPS\b/], ['aporte', /aporte/i], ['resgate', /resgat/i], ['jardim', /jardim|\bflor(es)?\b/i], ['travessão', /[—–]/]]) if (r.test(txt)) out.termos.push(n)
  const vw = document.documentElement.clientWidth
  out.vazaLado = document.documentElement.scrollWidth > vw + 1
  const visivel = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); if (!(r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05)) return false; const sc = el.closest('.sheet-body'); if (sc) { const q = sc.getBoundingClientRect(); if (r.bottom <= q.top + 1 || r.top >= q.bottom - 1) return false } return true }
  const nome = el => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 50)
  const rolavel = el => el.closest('.atrow,.pills,.ancbar,.sheet-body,.cena3d')
  for (const el of document.querySelectorAll('body *')) {
    if (!visivel(el) || el.closest('svg,canvas,.sr')) continue
    const temTexto = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
    const s = getComputedStyle(el)
    if (temTexto && parseFloat(s.fontSize) < 11) out.pequeno.push(nome(el) + ' ' + s.fontSize)
    const r = el.getBoundingClientRect()
    if (temTexto && !rolavel(el) && (r.right > vw + 1 || r.left < -1)) out.cortado.push('fora da tela: ' + nome(el))
    if (temTexto && (s.overflow.includes('hidden') || s.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 2 && !el.closest('.esc1 small')) out.cortado.push('texto cortado: ' + nome(el))
  }
  // sobreposição entre controles (botões, links, campos) do mesmo plano
  const ctr = [...document.querySelectorAll('button,a,input,select,textarea,label.check')].filter(visivel)
  const plano = el => el.closest('.tabbar,.sheet,.toast,.rail,.segbar,.cena3d') || document.body
  for (let i = 0; i < ctr.length; i++) for (let j = i + 1; j < ctr.length; j++) {
    const a = ctr[i], b = ctr[j]
    if (a.contains(b) || b.contains(a) || plano(a) !== plano(b)) continue
    if (document.querySelector('.sheet') && plano(a) === document.body) continue
    const x = a.getBoundingClientRect(), y = b.getBoundingClientRect()
    const w = Math.min(x.right, y.right) - Math.max(x.left, y.left), h = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top)
    if (w > 2 && h > 2) out.sobreposto.push(nome(a) + ' x ' + nome(b))
  }
  return out
}

const relatorio = { telas: [], tempos: [], erros: [] }
const browser = await pw.chromium.launch()
for (const [larg, alt, mobile] of [[390, 844, true], [1280, 800, false]]) {
  const ctx = await browser.newContext({ viewport: { width: larg, height: alt }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, locale: 'pt-BR', timezoneId: 'America/Recife' })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error') relatorio.erros.push(`${larg}: console: ${m.text()}`) })
  page.on('pageerror', e => relatorio.erros.push(`${larg}: página: ${e.message}`))
  page.on('requestfailed', r => relatorio.erros.push(`${larg}: rede: ${r.url()}`))
  const pedidos3d = []
  page.on('request', r => { if (/assets\/(tres|cena3d)-/.test(r.url())) pedidos3d.push({ arq: r.url().split('/').pop(), rota: new URL(page.url()).hash.replace(/^#\/?/, '').split('?')[0] }) })
  await page.goto(BASE + '#/inicio')
  await page.waitForSelector('text=Hoje você pode gastar')
  await page.evaluate(() => document.fonts.ready)

  const foto = async (nome, cheio = true) => {
    await page.waitForTimeout(250)
    const c = await page.evaluate(checar)
    relatorio.telas.push({ larg, nome, ...c })
    await page.screenshot({ path: `${PASTA}${larg}_${nome}.png`, fullPage: cheio })
  }
  const vai = async (rota, espera) => { await page.goto(BASE + '#/' + rota); await page.waitForSelector(espera); }

  await foto('01_inicio')
  // rodada 3: cartão do Guardado logo abaixo do número do dia e "N coisas precisam de você" com a 1ª pergunta
  await page.waitForSelector('.guard-card .guard-l.dest'); await page.waitForSelector('[data-precisa] .perg')
  const ini = await page.evaluate(() => ({ guard: document.querySelector('.guard-card').innerText, n: Number(document.querySelector('[data-precisa]').dataset.precisa), titulo: document.querySelector('[data-precisa] h2').textContent, ordem: [...document.querySelectorAll('#main .view > *')].map(x => x.className).join('|') }))
  if (!/Guardado[\s\S]*R\$[\s\S]*Rendeu hoje[\s\S]*R\$/.test(ini.guard)) relatorio.erros.push(`${larg}: cartão do Guardado no Início sem "Guardado R$ X, rendeu hoje R$ Y": ${ini.guard}`)
  if (!/hoje-card.*guard-card.*precisa/.test(ini.ordem)) relatorio.erros.push(`${larg}: ordem do Início mudou: ${ini.ordem}`)
  if (!(ini.n >= 2) || ini.titulo !== `${ini.n} coisas precisam de você`) relatorio.erros.push(`${larg}: frase do Início errada: ${ini.titulo}`)
  await page.click('text=De onde veio esse número?'); await page.waitForSelector('.sheet'); await foto('03_explicacao', false); await page.keyboard.press('Escape')

  // tempo de lançar: do toque no botão verde até o salvo
  const plus = mobile ? '.tabbar .plus' : '.rail .lancar'
  const t0 = Date.now()
  await page.click(plus)
  await page.waitForSelector('.sheet .keys')
  if (relatorio.tempos.length === 0) await foto('04_lancar', false)
  for (const k of ['4', '5', ',', '9']) await page.click(`.keys button[aria-label="${k}"]`)
  await page.click('.envbtn >> nth=0')
  await page.waitForSelector('.toast')
  const t1 = Date.now()
  const app = await page.evaluate(() => window.__ultimoTempoLancar)
  relatorio.tempos.push({ larg, segundos_robo: (t1 - t0) / 1000, segundos_medidos_pelo_app: app })
  await foto('05_salvo_toast', false)
  if (!/Esse gasto também custou R\$ \d+,\d\d de rendimento até o fim do mês\./.test(await page.textContent('.toast'))) relatorio.erros.push(`${larg}: faltou a frase do rendimento depois de lançar: ${await page.textContent('.toast')}`)

  await vai('lancamentos', 'text=Lixeira'); await foto('06_lancamentos')
  await page.click('.li .iconbtn >> nth=0'); await page.waitForSelector('.toast')
  await page.click('.seg button:has-text("Lixeira")'); await foto('07_lixeira')
  await vai('orcamento', 'text=Cofrinho'); await foto('08_meu_orcamento')
  await vai('cartoes', 'text=E se eu comprar?'); await foto('09_cartoes')
  await page.click('button:has-text("E se eu comprar?")'); await page.fill('.sheet .inp', '1200'); await page.click('.sheet .pill:has-text("3x")'); await foto('10_e_se_eu_comprar', false); await page.keyboard.press('Escape')
  await vai('casa', '.seg'); await foto('11_casa_feira')
  await page.click('.seg button:has-text("Serviços")'); await foto('12_casa_servicos')
  await page.click('.seg button:has-text("Gás")'); await foto('13_casa_gas')
  await page.click('.seg button:has-text("Folha")'); await foto('14_casa_folha')
  // ---------- rodada 3: Guardado ----------
  await vai('guardado', '.guard-hoje .din.hero'); await foto('50_guardado')
  const gu = await page.evaluate(() => { const h = document.querySelector('.guard-hoje .din.hero'), r = h.getBoundingClientRect(); const t = document.querySelector('.guard-hoje').innerText; return { tam: parseFloat(getComputedStyle(h).fontSize), baixo: r.bottom, alt: innerHeight, texto: t, valor: h.getAttribute('aria-label'), barras: document.querySelectorAll('.barras30 i').length, folgas: document.querySelectorAll('.barras30 i.folga').length, apps: document.querySelectorAll('#gApps ~ .list > li, [aria-labelledby=gApps] .list > li').length, tot3: document.querySelector('.guard-3').getBoundingClientRect().bottom } })
  if (gu.tam < 56 || gu.baixo > gu.alt * 0.5) relatorio.erros.push(`${larg}: "Rendeu hoje" não está grande no alto da tela: ${JSON.stringify(gu)}`)
  if (!/^Rendeu hoje/.test(gu.texto) || !/Neste mês[\s\S]*Desde o início[\s\S]*Você tem guardado/.test(gu.texto)) relatorio.erros.push(`${larg}: Guardado sem os 4 números na ordem: ${gu.texto}`)
  if (gu.tot3 > gu.alt) relatorio.erros.push(`${larg}: "Você tem guardado" ficou fora da 1ª dobra (${gu.tot3} de ${gu.alt})`)
  if (!/R\$ [1-9]/.test(gu.valor) || /Hoje é/.test(gu.texto)) relatorio.erros.push(`${larg}: dia útil tinha que render mais que zero: ${gu.valor}`)
  if (gu.barras !== 30 || gu.folgas < 8 || gu.apps !== 3) relatorio.erros.push(`${larg}: barras ou aplicações erradas: ${JSON.stringify(gu)}`)
  await page.click('.guard-hoje .explica-l'); await page.waitForSelector('.sheet .exp'); await foto('51_guardado_conta', false)
  const contaG = await page.textContent('.sheet')
  if (!/torneira/.test(contaG) || !/Taxa usada: CDI \(a taxa/.test(contaG) || !/Fonte:/.test(contaG) || !/Rendeu hoje, já sem o imposto/.test(contaG)) relatorio.erros.push(`${larg}: "De onde veio esse número?" do Guardado incompleto`)
  await page.keyboard.press('Escape')
  await page.click('button:has-text("Guardar dinheiro")'); await page.fill('.sheet .inp-rs input', '500'); await foto('52_guardado_guardar', false)
  await page.click('.sheet button:has-text("Anotar o que guardei")'); await page.waitForSelector('text=R$ 500 guardados em')
  await page.click('button:has-text("Nova aplicação")'); await page.waitForSelector('.sheet input[placeholder^="Ex.: Nubank"]')
  await page.fill('.sheet input[placeholder^="Ex.: Nubank"]', 'Inter'); await page.fill('.sheet .inp-rs input', '2000'); await foto('53_guardado_nova', false)
  if ((await page.$$('.sheet .campo')).length !== 4) relatorio.erros.push(`${larg}: nova aplicação tinha que ter 4 campos, tem ${(await page.$$('.sheet .campo')).length}`)
  await page.click('.sheet button:has-text("Guardar") >> nth=-1'); await page.waitForSelector('.li:has-text("Caixinha Inter")')
  await page.click('.li:has-text("Caixinha Inter")'); await page.waitForSelector('.sheet .exp'); await foto('54_guardado_aplicacao', false); await page.keyboard.press('Escape')
  // sábado: o relógio da página vai pro dia 14/11 (o exemplo recomeça nesse dia)
  {
    // contexto separado: o relógio de mentira vale pro contexto inteiro e não pode mexer na página principal
    const ctxSab = await browser.newContext({ viewport: { width: larg, height: alt }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, locale: 'pt-BR', timezoneId: 'America/Recife' })
    const sab = await ctxSab.newPage()
    sab.on('console', m => { if (m.type() === 'error') relatorio.erros.push(`${larg}: console (sábado): ${m.text()}`) })
    await sab.clock.setFixedTime(new Date('2026-11-14T10:00:00-03:00'))
    await sab.goto(BASE + '#/guardado'); await sab.waitForSelector('.guard-hoje .din.hero'); await sab.evaluate(() => document.fonts.ready); await sab.waitForTimeout(250)
    const t = await sab.evaluate(() => ({ v: document.querySelector('.guard-hoje .din.hero').getAttribute('aria-label'), m: document.querySelector('.guard-motivo')?.textContent || '', y: document.querySelector('.guard-motivo')?.getBoundingClientRect().bottom, alt: innerHeight }))
    if (t.v !== 'R$ 0' || t.m !== 'Hoje é sábado: rende de novo na segunda, 16/11.' || t.y > t.alt * 0.6) relatorio.erros.push(`${larg}: sábado tinha que mostrar R$ 0 e o motivo no alto: ${JSON.stringify(t)}`)
    relatorio.telas.push({ larg, nome: '55_guardado_sabado', ...(await sab.evaluate(checar)) }); await sab.screenshot({ path: `${PASTA}${larg}_55_guardado_sabado.png`, fullPage: true })
    await sab.goto(BASE + '#/inicio'); await sab.waitForSelector('.guard-card small')
    if (!/Hoje é sábado/.test(await sab.textContent('.guard-card'))) relatorio.erros.push(`${larg}: cartão do Início no sábado sem o motivo`)
    await ctxSab.close()
  }
  // ---------- rodada 3: Início responde a 1ª pergunta; ela some e aparece no Relatório ----------
  await vai('inicio', '[data-precisa] .perg')
  const antesN = await page.evaluate(() => Number(document.querySelector('[data-precisa]').dataset.precisa))
  const perg1 = await page.evaluate(() => ({ id: document.querySelector('[data-precisa] .perg').dataset.pergunta, t: document.querySelector('[data-precisa] .perg-t').textContent, bot: [...document.querySelectorAll('[data-precisa] .perg-ops .btn')].map(b => b.textContent) }))
  if (!/^Ana, /.test(perg1.t) || perg1.bot.some(b => /^(sim|não)$/i.test(b.trim()))) relatorio.erros.push(`${larg}: 1ª pergunta do Início fora do padrão: ${JSON.stringify(perg1)}`)
  await foto('56_inicio_pergunta')
  await page.click('[data-precisa] .perg-ops .btn:has-text("Vou renovar")'); await page.waitForSelector('.toast:has-text("Anotado")')
  await page.waitForFunction(id => !document.querySelector(`[data-pergunta="${id}"]`), perg1.id)
  const depoisN = await page.evaluate(() => Number(document.querySelector('[data-precisa]').dataset.precisa))
  if (depoisN !== antesN - 1) relatorio.erros.push(`${larg}: respondi 1 pergunta e a conta foi de ${antesN} pra ${depoisN}`)
  // ---------- rodada 3: Escritório 3D dentro do app ----------
  await vai('escritorio', '.cena3d'); await page.waitForFunction(() => document.querySelector('.cena3d').dataset.modo !== 'abrindo', null, { timeout: 12000 })
  const modo = await page.evaluate(() => document.querySelector('.cena3d').dataset.modo)
  if (modo !== '3d') relatorio.erros.push(`${larg}: a cena 3D não abriu (modo ${modo})`)
  await page.waitForTimeout(5500)
  const c3 = await page.evaluate(() => { const c = document.querySelector('.cena3d'), r = c.getBoundingClientRect(), m = window.__escritorio ? window.__escritorio() : null; const tags = [...document.querySelectorAll('.cena3d-tags .tag')].filter(t => getComputedStyle(t).visibility !== 'hidden'); return { larg: r.width, dir: r.right, vw: document.documentElement.clientWidth, vaza: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, m, tags: tags.length, precisa: tags.filter(t => t.classList.contains('precisa')).length, alvo: Math.round(parseFloat(getComputedStyle(tags[0], '::after').height)), alvoL: Math.round(parseFloat(getComputedStyle(tags[0], '::after').width)), foraDaCena: tags.filter(t => { const q = t.getBoundingClientRect(); return q.left < r.left - 1 || q.right > r.right + 1 }).length, leve: /Modo leve ligado/.test(document.body.innerText), canvas: !!document.querySelector('.cena3d canvas') } })
  relatorio.cena = relatorio.cena || []; relatorio.cena.push({ larg, ...c3 })
  if (!c3.canvas || c3.vaza || c3.dir > c3.vw + 1) relatorio.erros.push(`${larg}: a cena não cabe na tela: ${JSON.stringify(c3)}`)
  if (c3.tags < 8 || c3.precisa < 2 || c3.foraDaCena) relatorio.erros.push(`${larg}: etiquetas dos bonecos: ${JSON.stringify(c3)}`)
  if (c3.alvo < 44 || c3.alvoL < 44) relatorio.erros.push(`${larg}: alvo de toque da etiqueta com ${c3.alvoL} x ${c3.alvo} px`)
  if (c3.m && c3.m.hist.filter(f => f < 24).length >= 3 && c3.m.degrau < 1) relatorio.erros.push(`${larg}: ${c3.m.fps} imagens por segundo e o modo leve não ligou`)
  if (c3.m && c3.m.degrau >= 1 && !c3.leve) relatorio.erros.push(`${larg}: modo leve ligou e a tela não avisou`)
  await foto('15_escritorio')
  if (!(await page.$('text=coisas precisam de você hoje'))) relatorio.erros.push(`${larg}: Escritório sem a frase do dia`)
  // tocar no boneco (pela etiqueta) abre a ficha: 4 partes fixas; celular = folha de baixo, computador = painel do lado
  const abreFicha = async id => { await page.click(`.li[data-func="${id}"]`); await page.waitForSelector(`[data-ficha="${id}"]`); await page.waitForTimeout(500) }
  // tocar na etiqueta do boneco, dentro da cena, abre a ficha dele
  await page.evaluate(() => document.querySelector('.cena3d-tags .tag.precisa').click()); await page.waitForSelector('.sheet .ficha'); await page.keyboard.press('Escape'); await page.waitForSelector('.sheet', { state: 'detached' })
  const partes = () => page.evaluate(() => [...document.querySelectorAll('.ficha > section > h3')].map(h => h.textContent).join('|'))
  await abreFicha('cartao'); await foto('57_ficha_cartao', false)
  if ((await partes()) !== 'Agora|O que eu cuido|O que você já me respondeu|O que eu faço e quando') relatorio.erros.push(`${larg}: ficha sem as 4 partes: ${await partes()}`)
  const fs = await page.evaluate(() => { const r = document.querySelector('.sheet').getBoundingClientRect(); return { esq: r.left, dir: r.right, topo: r.top, baixo: r.bottom, vw: innerWidth, vh: innerHeight } })
  if (mobile ? !(fs.esq === 0 && Math.abs(fs.baixo - fs.vh) < 2 && fs.topo > 20) : !(Math.abs(fs.dir - fs.vw) < 2 && fs.topo === 0 && fs.esq > fs.vw / 2)) relatorio.erros.push(`${larg}: ficha no lugar errado: ${JSON.stringify(fs)}`)
  // cadastro do Analista: novo cartão com mensalidade; fatura com o valor do banco
  await page.click('[data-cad="Cartões"] button:has-text("Novo cartão")'); await page.fill('.cad-form input[placeholder^="Ex.: Nubank"]', 'Inter da Ana')
  await page.click('.cad-form .campo:has-text("De quem é") .pill:has-text("Bruno")'); await page.fill('.cad-form .campo:has-text("Mensalidade ou anuidade") input', '19,90'); await page.click('.cad-form .pill:has-text("Todo mês")')
  await page.evaluate(() => [...document.querySelectorAll('.cad-form .campo')].find(c => /De quem é/.test(c.textContent)).scrollIntoView({ block: 'center' }))
  await foto('58_ficha_cartao_novo', false)
  await page.click('.cad-form button:has-text("Salvar")'); await page.waitForSelector('[data-cad="Cartões"] .cad-l:has-text("Inter da Ana")')
  if (!/de Bruno/.test(await page.textContent('[data-cad="Cartões"] .cad-l:has-text("Inter da Ana")')) || (await page.$('.cad-form .campo:has-text("De quem é") input'))) relatorio.erros.push(`${larg}: titular do cartão tinha que ser escolha entre Ana e Bruno`)
  if (!/mensalidade de R\$ 19,90/.test(await page.textContent('[data-cad="Cartões"] .cad-l:has-text("Inter da Ana")'))) relatorio.erros.push(`${larg}: cartão novo sem a mensalidade`)
  await page.click('[data-cad="Faturas"] .cad-l >> nth=0 >> button[aria-label="Editar"]'); await page.fill('[data-cad="Faturas"] .cad-form .inp-rs input', '700'); await page.click('[data-cad="Faturas"] .cad-form button:has-text("Salvar")')
  await page.waitForSelector('[data-cad="Faturas"] .cad-l:has-text("o banco cobrou R$ 700")')
  if (!/diferença de R\$/.test(await page.textContent('[data-cad="Faturas"]'))) relatorio.erros.push(`${larg}: fatura sem a diferença explicada`)
  // a pergunta nova do Analista (cartão sem dia de fechamento ou diferença) aparece no "Agora" e a resposta entra na lista na hora
  await page.waitForSelector('[data-ficha="cartao"] [data-parte="agora"] .perg')
  const botao = await page.evaluate(() => [...document.querySelectorAll('[data-ficha="cartao"] [data-parte="agora"] .perg-ops .btn')].map(b => b.textContent).find(t => /Me lembra dia|Vou pagar mesmo|É juros|Informo depois|Vejo depois/.test(t)))
  await page.click(`[data-ficha="cartao"] [data-parte="agora"] .perg-ops .btn:has-text("${botao}")`)
  await page.waitForSelector(`[data-ficha="cartao"] [data-parte="respostas"] li:first-child:has-text("${botao}")`)
  if (!/anotado às \d\d:\d\d/.test(await page.textContent('[data-ficha="cartao"] [data-parte="respostas"] li:first-child'))) relatorio.erros.push(`${larg}: resposta nova sem "anotado às"`)
  await foto('59_ficha_cartao_respondeu', false)
  // corrigir: a linha respondida agora tem o botão; reabre a pergunta e a nova resposta guarda a antiga
  await page.click('[data-ficha="cartao"] [data-parte="respostas"] li:first-child button:has-text("Corrigir")'); await page.waitForSelector('text=Corrigindo a sua resposta')
  await page.click('[data-ficha="cartao"] [data-parte="agora"] .perg-ops .btn >> nth=-1'); await page.waitForSelector('[data-ficha="cartao"] [data-parte="respostas"] li:first-child:has-text("(corrigiu")')
  await page.keyboard.press('Escape')
  // Fiscal da Feira: responde que não teve nota (pede o motivo) e a resposta fica guardada com ele
  await abreFicha('fiscal'); await foto('60_ficha_fiscal', false)
  if (!/^Ana, .*feira de \d\d\/\d\d .*sem.* nota/.test(await page.textContent('[data-ficha="fiscal"] .perg-t'))) relatorio.erros.push(`${larg}: Fiscal da Feira sem a pergunta da nota: ${await page.textContent('[data-ficha="fiscal"] .perg-t')}`)
  await page.click('[data-ficha="fiscal"] .perg-ops .btn:has-text("Não teve nota")'); await page.fill('[data-ficha="fiscal"] .perg-campo input', 'feira livre'); await page.click('[data-ficha="fiscal"] .perg-campo button:has-text("Salvar resposta")')
  await page.waitForSelector('[data-ficha="fiscal"] [data-parte="respostas"] li:first-child:has-text("Não teve nota: feira livre")')
  // depois da nota ele cobra a contagem: marca 1 item que acabou e salva
  await page.waitForSelector('[data-ficha="fiscal"] .perg-t:has-text("estoque")')
  await page.click('[data-ficha="fiscal"] .perg-ops .btn:has-text("Contar agora")'); await page.waitForSelector('[data-ficha="fiscal"] .perg-campo .cont-l')
  await page.click('[data-ficha="fiscal"] .perg-campo .cont-l >> nth=0 >> button:has-text("Acabou")'); await foto('61_ficha_fiscal_contagem', false)
  await page.click('[data-ficha="fiscal"] .perg-campo button:has-text("Salvar a contagem")')
  await page.waitForSelector('[data-ficha="fiscal"] [data-parte="respostas"] li:first-child:has-text("Contei o estoque: 8 itens, 1 acabou")')
  await page.waitForSelector('[data-ficha="fiscal"] :text("Hoje não preciso de nada seu.")'); await page.evaluate(() => document.querySelector('.sheet-body').scrollTo(0, 0)); await page.waitForSelector('.toast', { state: 'detached', timeout: 6000 }).catch(() => {}); await foto('62_ficha_fiscal_em_dia', false)
  if (!/Feira de \d\d\/\d\d feita, R\$ [\d.,]+ de R\$ [\d.,]+ da semana\. Sem nota \(feira livre\)\. Estoque contado: acabou 1 item\./.test(await page.textContent('[data-ficha="fiscal"] [data-parte="agora"]'))) relatorio.erros.push(`${larg}: entrega do Fiscal errada: ${await page.textContent('[data-ficha="fiscal"] [data-parte="agora"]')}`)
  await page.keyboard.press('Escape')
  await abreFicha('colchao'); await foto('63_ficha_reserva', false)
  if (!/Guardião da Reserva/.test(await page.textContent('.sheet-top')) || !/dinheiro que vocês combinaram nunca gastar/.test(await page.textContent('[data-ficha="colchao"]'))) relatorio.erros.push(`${larg}: ficha do Guardião da Reserva sem a explicação da reserva`)
  await page.click('[data-ficha="colchao"] button[aria-label="Editar"]'); await page.waitForSelector('[data-ficha="colchao"] .cad-form'); await foto('64_ficha_reserva_editar', false); await page.keyboard.press('Escape')
  // as outras fichas abrem com as 4 partes e com cadastro
  for (const id of ['contador', 'folha', 'comprador', 'guardado', 'secretaria']) {
    await abreFicha(id)
    if ((await partes()) !== 'Agora|O que eu cuido|O que você já me respondeu|O que eu faço e quando' || !(await page.$(`[data-ficha="${id}"] .cad`))) relatorio.erros.push(`${larg}: ficha de ${id} incompleta`)
    await foto('65_ficha_' + id, false); await page.keyboard.press('Escape')
  }
  // a resposta dada no Início está guardada com o Gestor do Guardado e no Relatório
  await abreFicha('guardado')
  if (!(await page.$('[data-ficha="guardado"] [data-parte="respostas"] li:has-text("Vou renovar")'))) relatorio.erros.push(`${larg}: a resposta do Início não ficou guardada com o Gestor do Guardado`)
  await page.keyboard.press('Escape'); await page.waitForSelector('.sheet', { state: 'detached' })
  await page.click('.segbar button:has-text("Relatório")'); await page.waitForSelector('.diario'); await foto('66_escritorio_relatorio')
  const rel = await page.evaluate(() => document.querySelector('#main').innerText)
  for (const r of ['Vou renovar', 'Não teve nota: feira livre', 'Contei o estoque']) if (!rel.includes(r)) relatorio.erros.push(`${larg}: Relatório sem a resposta "${r}"`)
  if (!/Perguntas feitas[\s\S]*Respondidas[\s\S]*Esperando você[\s\S]*Demora pra responder/.test(rel)) relatorio.erros.push(`${larg}: Relatório sem os 4 números`)
  // Lembretes: criar em 3 campos
  await page.click('.segbar button:has-text("Lembretes")'); await page.waitForSelector('.form-l')
  if ((await page.$$('.form-l > .campo')).length !== 3) relatorio.erros.push(`${larg}: lembrete tinha que ter 3 campos`)
  await page.fill('.form-l input[placeholder^="Ex.: Renovar"]', 'Ligar pro contador'); await page.click('.form-l .pill:has-text("Todo mês")'); await page.click('button:has-text("Guardar lembrete")')
  await page.waitForSelector('[data-lembrete="Ligar pro contador"]'); await foto('67_escritorio_lembretes')
  if (!/todo mês/.test(await page.textContent('[data-lembrete="Ligar pro contador"]'))) relatorio.erros.push(`${larg}: lembrete criado sem o "todo mês"`)
  // sem WebGL (ou aparelho fraco): a cena some e tudo funciona pela lista
  await page.goto(BASE + '#/escritorio?sem3d'); await page.reload(); await page.waitForSelector('text=A cena 3D não abriu neste aparelho'); await foto('68_escritorio_lista')
  if (await page.evaluate(() => getComputedStyle(document.querySelector('.cena3d')).display !== 'none')) relatorio.erros.push(`${larg}: sem 3D a cena tinha que sumir`)
  await page.click('.li[data-func="secretaria"]'); await page.waitForSelector('[data-ficha="secretaria"]'); await page.keyboard.press('Escape')
  // o Three.js só é pedido na tela do Escritório
  if (pedidos3d.some(p => p.rota !== 'escritorio')) relatorio.erros.push(`${larg}: o 3D foi baixado fora do Escritório: ${JSON.stringify(pedidos3d)}`)
  if (!pedidos3d.length) relatorio.erros.push(`${larg}: o 3D não foi baixado nem no Escritório`)
  await vai('planejamento', 'text=Limites do mês'); await foto('16_planejamento')
  await vai('ajustes', 'text=Aparência'); await foto('17_ajustes')
  await vai('privacidade', 'text=Termo de uso'); await foto('18_privacidade')
  await vai('painel', 'text=Ativação'); await foto('19_painel')
  // baixar os dados no modo exemplo: mostra o json na tela com Copiar (o visualizador não baixa arquivo)
  await vai('privacidade', 'text=Termo de uso'); await page.click('button:has-text("Baixar os dados")'); await page.waitForSelector('text=Seus dados'); await foto('31_privacidade_dados', false)
  if (!(await page.inputValue('textarea')).includes('Família Silva')) relatorio.erros.push(`${larg}: json dos dados não apareceu`)
  await page.keyboard.press('Escape')
  // revisão: digitar letra por letra dentro de uma folha (antes o foco pulava fora do campo a cada letra)
  await page.click('button:has-text("Apagar a família")'); await page.waitForSelector('input[aria-label="Nome da família"]')
  await page.click('input[aria-label="Nome da família"]'); await page.keyboard.type('Familia Silva', { delay: 15 })
  if ((await page.inputValue('input[aria-label="Nome da família"]')) !== 'Familia Silva') relatorio.erros.push(`${larg}: não dá pra digitar o nome da família na folha de apagar (foco pulou)`)
  // Tab fica preso na folha e Esc devolve o foco pro botão que abriu
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab')
  if (!(await page.evaluate(() => !!document.activeElement?.closest('.sheet')))) relatorio.erros.push(`${larg}: Tab saiu de dentro da folha`)
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  if (!(await page.evaluate(() => (document.activeElement?.textContent || '').includes('Apagar a família')))) relatorio.erros.push(`${larg}: fechar a folha não devolveu o foco pro botão`)
  // revisão: 2 toques no mesmo instante no envelope gravam 1 lançamento só
  await vai('lancamentos', 'text=Lixeira'); await page.waitForSelector('.li')
  const conta = () => page.evaluate(() => [...document.querySelectorAll('.li .m b')].filter(b => b.textContent === 'Toque duplo').length)
  await page.click(plus); await page.waitForSelector('.sheet .keys')
  for (const k of ['7', '7']) await page.click(`.keys button[aria-label="${k}"]`)
  await page.fill('input[aria-label="O que foi"]', 'Toque duplo')
  await page.evaluate(() => { const e = document.querySelector('.envbtn'); e.click(); e.click(); e.click() })
  await page.waitForSelector('.toast'); await page.waitForTimeout(400)
  if ((await conta()) !== 1) relatorio.erros.push(`${larg}: toque duplo no envelope gravou ${await conta()} lançamentos (tinha que ser 1)`)
  // revisão: alvo de toque dos botões pequenos tem 44 px de altura (área que recebe o toque)
  await page.click(plus); await page.waitForSelector('.sheet .keys')
  const alvo = await page.evaluate(() => Math.round(parseFloat(getComputedStyle(document.querySelector('.sheet .atrow .pill'), '::after').height)))
  if (alvo < 44) relatorio.erros.push(`${larg}: alvo de toque da pílula com ${alvo} px`)
  await page.keyboard.press('Escape')
  // revisão: endereço desconhecido abre o Início, não uma tela em branco
  await page.goto(BASE + '#/nao-existe'); await page.waitForSelector('text=Hoje você pode gastar')
  // ler cupom com foto pelo Lançar (exemplo: resultado fixo), conferir e só então lançar
  await vai('inicio', 'text=Hoje você pode gastar')
  await page.click(plus); await page.waitForSelector('.sheet .keys'); await page.click('.sheet button:has-text("Ler cupom com foto")')
  await page.waitForSelector('text=Tirar foto'); await foto('32_cupom_foto', false)
  await page.click('text=Ver com um cupom de exemplo'); await page.waitForSelector('text=Nada foi lançado ainda'); await foto('33_cupom_conferir', false)
  if (await page.$('text=do cupom em')) relatorio.erros.push(`${larg}: cupom lançou antes de confirmar`)
  await page.click('.sheet .check >> nth=3'); await page.click('.sheet button:has-text("Lançar R$")'); await page.waitForSelector('text=do cupom em'); await foto('34_cupom_lancado', false)
  // cupom também na Feira do casal
  await vai('casa', '.seg'); await page.click('button:has-text("Ler cupom com foto")'); await page.waitForSelector('text=Tirar foto'); await foto('35_casa_feira_cupom', false); await page.keyboard.press('Escape')
  // ---------- rodada 2 ----------
  const zap = async sel => decodeURIComponent(((await page.getAttribute(sel, 'href')) || '').split('text=')[1] || '')
  // equipe: o casal gera o código e o app mostra o LINK com o convite + o código; a mensagem não leva R$
  await vai('casa', '.seg'); await page.click('button:has-text("Gerar código")'); await page.waitForSelector('.linkbox'); await foto('37_convite_equipe', false)
  const linkEq = (await page.textContent('.linkbox')) || ''
  if (!/#\/equipe\?c=[0-9a-f-]{36}$/.test(linkEq)) relatorio.erros.push(`${larg}: link da equipe sem o convite: ${linkEq}`)
  const msgEq = await zap('.sheet a.btn.primary')
  if (!msgEq.includes(linkEq) || !msgEq.includes('2468') || /R\$/.test(msgEq)) relatorio.erros.push(`${larg}: mensagem da equipe errada: ${msgEq}`)
  await page.keyboard.press('Escape')
  // convite da 2ª pessoa: grava antes, depois abre o WhatsApp; texto do dono, sem valor em R$
  await vai('ajustes', 'text=Aparência')
  await page.fill('input[placeholder="Nome"]', 'Bruno'); await page.fill('input[placeholder="pessoa@email.com"]', 'bruno@exemplo.com')
  await page.click('button:has-text("Convidar")'); await page.waitForSelector('a:has-text("Abrir o WhatsApp com o convite")'); await foto('38_convite_casal')
  const msgCasal = await zap('a:has-text("Abrir o WhatsApp com o convite")')
  if (!msgCasal.includes('Entra aqui pra ver o nosso número do dia') || /R\$|\d,\d\d/.test(msgCasal)) relatorio.erros.push(`${larg}: convite do casal errado: ${msgCasal}`)
  if (/R\$/.test(await zap('a:has-text("Chamar família amiga")'))) relatorio.erros.push(`${larg}: convite da família amiga leva R$`)
  // lançamentos: abre só o mês; "Ver meses anteriores" traz o mês passado
  await vai('lancamentos', 'text=Lixeira'); await page.waitForSelector('.li')
  if (await page.$('text=Pneu do carro')) relatorio.erros.push(`${larg}: lançamentos abriu com o mês passado junto`)
  await page.click('button:has-text("Ver meses anteriores")'); await page.waitForSelector('text=Pneu do carro'); await foto('39_lancamentos_mes_anterior')
  // estado vazio com a classe .vazio: esvazia a lixeira trazendo tudo de volta
  await page.click('.seg button:has-text("Lixeira")')
  for (let i = 0; i < 6 && (await page.$('button[title="Trazer de volta"]')); i++) { await page.click('button[title="Trazer de volta"] >> nth=0'); await page.waitForTimeout(350) }
  await page.waitForSelector('.vazio'); await foto('40_lixeira_vazia')
  if (!(await page.$('.vazio .vazio-ico svg'))) relatorio.erros.push(`${larg}: estado vazio sem ícone`)
  // Cartões: "Analista de Cartão" 1 vez; mês zerado sem barra, numa linha só
  await vai('cartoes', 'text=E se eu comprar?'); await page.waitForSelector('.fat')
  const car = await page.evaluate(() => ({ analista: (document.body.innerText.match(/Analista de Cartão/g) || []).length, zeradasComBarra: [...document.querySelectorAll('#main .fat:not(.zeros)')].filter(f => /R\$\s?0$/.test(f.textContent.trim())).length, linhasZero: document.querySelectorAll('#main .fat.zeros').length, cartoes: document.querySelectorAll('#main section.card').length, abertas: document.querySelectorAll('#main .fat .bar i.aberta').length }))
  if (car.analista !== 1 || car.zeradasComBarra || car.linhasZero > car.cartoes * 2 || !car.abertas) relatorio.erros.push(`${larg}: Cartões fora da crítica: ${JSON.stringify(car)}`)
  // Planejamento: campo com R$ e ponto de milhar, na mesma linha do nome; salvar usa definir_limite
  await vai('planejamento', 'text=Limites do mês'); await page.waitForSelector('.inp-rs input')
  const campo = '.linha-campo >> nth=0 >> input'
  if ((await page.inputValue(campo)) !== '3.000') relatorio.erros.push(`${larg}: campo do limite sem ponto de milhar: ${await page.inputValue(campo)}`)
  const cx = await page.evaluate(() => { const l = document.querySelector('.linha-campo'); const a = l.querySelector('.n').getBoundingClientRect(), b = l.querySelector('.inp-rs').getBoundingClientRect(); return { mesmaLinha: b.left >= a.right - 1 && Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) < 12, larg: b.width, alt: l.getBoundingClientRect().height } })
  if (!cx.mesmaLinha || cx.larg > 221 || cx.alt > 64) relatorio.erros.push(`${larg}: linha do limite fora do desenho: ${JSON.stringify(cx)}`)
  await page.fill(campo, '3100'); if ((await page.inputValue(campo)) !== '3.100') relatorio.erros.push(`${larg}: digitar 3100 não virou 3.100`)
  await page.click('button:has-text("Salvar limites")'); await page.waitForSelector('text=Limites salvos'); await foto('41_planejamento_salvo')
  await page.fill(campo, '3000'); await page.click('button:has-text("Salvar limites")'); await page.waitForTimeout(500)
  // tema escuro
  await page.emulateMedia({ colorScheme: 'dark' }); await vai('inicio', 'text=Hoje você pode gastar'); await foto('20_inicio_escuro'); await vai('guardado', '.guard-hoje .din.hero'); await foto('69_guardado_escuro'); await vai('escritorio', '.cena3d[data-modo="3d"]'); await page.waitForTimeout(1500); await foto('70_escritorio_escuro'); await page.emulateMedia({ colorScheme: 'light' })
  await vai('primeiro-uso', 'text=Quem é a família?'); await foto('21_primeiro_uso')
  await page.fill('input[placeholder="Ex.: Família Silva"]', 'Família Silva'); await page.fill('input[placeholder="Ex.: Ana"]', 'Ana')
  await page.click('text=Criar a família'); await page.waitForSelector('text=Quanto cada um pode gastar no mês?'); await foto('22_primeiro_uso_limites')
  await page.click('text=Ver o número de hoje'); await page.waitForSelector('text=Chame a 2ª pessoa'); await foto('23_primeiro_uso_convite')
  await page.click('text=Continuar'); await page.waitForSelector('text=Chame uma família amiga'); await foto('24_primeiro_uso_pronto')
  await page.click('text=Abrir o Início'); await page.waitForSelector('text=Hoje você pode gastar')
  // sair e entrar
  await vai('ajustes', 'text=Sair'); await page.click('button:has-text("Sair")'); await page.waitForSelector('text=Receber o código'); await foto('25_entrar')
  await page.fill('input[type=email]', 'ana@exemplo.com'); await page.click('text=Receber o código'); await page.waitForSelector('.inp.cod'); await foto('26_entrar_codigo')
  await page.fill('.inp.cod', '123456'); await page.click('button:has-text("Entrar")'); await page.waitForSelector('text=Hoje você pode gastar')
  // equipe da casa
  await vai('ajustes', 'text=Sair'); await page.click('button:has-text("Sair")'); await page.waitForSelector('text=Sou da equipe da casa')
  // sem convite no link: explica e não mostra campo de código (o código sozinho não entra mais)
  await page.click('text=Sou da equipe da casa'); await page.waitForSelector('text=Peça o link pra quem cuida da família'); await foto('27_entrar_equipe')
  if (await page.$('.inp.cod')) relatorio.erros.push(`${larg}: equipe sem convite ainda vê o campo do código`)
  // com o link do convite: a tela lê o convite e pede só os 4 números
  await page.goto(BASE + '#/equipe?c=00000000-0000-4000-8000-000000002468'); await page.waitForSelector('.inp.cod'); await foto('27b_entrar_equipe_link')
  await page.fill('.inp.cod', '2468'); await page.click('text=Entrar na Casa'); await page.waitForSelector('text=Lista de compras'); await foto('28_equipe_casa')
  if (/equipe\?c=/.test(await page.evaluate(() => location.hash))) relatorio.erros.push(`${larg}: o convite ficou no endereço depois de entrar`)
  // decisão do dono: a equipe não vê nenhum valor em dinheiro (nem na Casa, nem nos botões do Lançar)
  const semDinheiro = async onde => { const t = await page.evaluate(() => document.body.innerText); if (/R\$\s?\d/.test(t.replace(/Quanto gastou\?\s*R\$\s*\d[\d.,]*/, ''))) relatorio.erros.push(`${larg}: equipe vê dinheiro em ${onde}`) }
  await semDinheiro('Casa')
  // rodada 3: a equipe recebe só perguntas da Casa (Fiscal da Feira, Comprador), sem valor, e não abre Guardado nem Escritório
  await page.waitForSelector('[data-precisa] .perg')
  if (!/^Carla, /.test(await page.textContent('[data-precisa] .perg-t'))) relatorio.erros.push(`${larg}: pergunta da equipe sem o nome dela`)
  await foto('71_equipe_pergunta')
  // revisão: a equipe não abre nenhuma outra tela digitando o endereço, e nenhum aviso antigo com R$ sobra na tela
  for (const rota of ['primeiro-uso', 'inicio', 'planejamento', 'cartoes', 'lancamentos', 'privacidade', 'painel', 'guardado', 'escritorio']) {
    await page.goto(BASE + '#/' + rota); await page.waitForSelector('text=Lista de compras')
    if (await page.$('text=Quem é a família?')) relatorio.erros.push(`${larg}: equipe abriu o primeiro uso`)
    await semDinheiro('endereço #/' + rota)
  }
  if (await page.$('.toast')) await semDinheiro('aviso que ficou da sessão anterior')
  await page.click('button:has-text("Cheguei")'); await page.waitForSelector('button:has-text("Chegou")')
  await page.click('button:has-text("Saí")'); await page.waitForSelector('button:has-text("Saiu")')
  await page.click('button:has-text("Troquei o gás hoje")'); await page.waitForSelector('button:has-text("Gás trocado hoje")')
  await page.click('button:has-text("Veio hoje") >> nth=0'); await page.waitForSelector('text=veio hoje')
  await page.click('.check >> nth=0'); await page.waitForTimeout(200)
  await page.fill('input[aria-label="Item que acabou"]', 'Sabão em pó'); await page.click('button[aria-label="Pôr na lista"]'); await page.waitForSelector('text=Sabão em pó')
  await semDinheiro('Casa depois de marcar'); await foto('36_equipe_marcou')
  await page.click(mobile ? '.tabbar .plus' : '.rail .lancar'); await page.waitForSelector('.sheet .keys')
  for (const k of ['1', '2']) await page.click(`.keys button[aria-label="${k}"]`)
  await semDinheiro('Lançar'); await foto('29_equipe_lancar', false)
  await page.click('.envbtn >> nth=0'); await page.waitForSelector('text=Compra anotada'); await semDinheiro('aviso de salvo'); await foto('30_equipe_casa_depois')
  await ctx.close()
}
await browser.close()
srv.kill()

const probl = relatorio.telas.filter(t => t.vazaLado || t.cortado.length || t.pequeno.length || t.sobreposto.length || t.termos.length)
writeFileSync(PASTA + 'relatorio.json', JSON.stringify(relatorio, null, 2))
console.log(`telas: ${relatorio.telas.length} | com problema: ${probl.length} | erros de console: ${relatorio.erros.length}`)
for (const t of probl) console.log(t.larg, t.nome, JSON.stringify({ vaza: t.vazaLado, cortado: t.cortado.slice(0, 4), pequeno: t.pequeno.slice(0, 4), sobreposto: t.sobreposto.slice(0, 4), termos: t.termos }))
console.log('cena 3D:', JSON.stringify(relatorio.cena))
for (const e of relatorio.erros) console.log(e)
console.log('tempo de lançar:', JSON.stringify(relatorio.tempos))
process.exit(probl.length || relatorio.erros.length ? 1 : 0)
