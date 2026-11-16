import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { DocumentoTeste, NoTeste } from '../escritorio/numeros.dom-teste'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { apiExemplo } from '../../api/exemplo'
import type { Api } from '../../api/tipos'
import { Casa } from '../casa/Casa'
const roots: Root[] = []
afterEach(async () => { for (const r of roots.splice(0)) await act(async () => r.unmount()); vi.useRealTimers(); vi.unstubAllGlobals() })
const pendente = <T,>() => { let resolver!: (v: T) => void; let rejeitar!: (e: Error) => void; const promessa = new Promise<T>((r, j) => { resolver = r; rejeitar = j }); return { promessa, resolver, rejeitar } }
const props = (n: NoTeste) => Object.entries(n).find(([k]) => k.startsWith('__reactProps'))![1] as any
async function montar(el: ReactElement, api: Partial<Api> = {}, extra: Partial<Ctx> = {}) {
  const doc = new DocumentoTeste()
  Object.defineProperty(NoTeste.prototype, 'options', { configurable: true, get() { return this.childNodes } })
  Object.assign(NoTeste.prototype, { focus() {}, closest() { return null }, querySelectorAll() { return [] } })
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }))
  vi.stubGlobal('addEventListener', window.addEventListener.bind(window))
  vi.stubGlobal('removeEventListener', window.removeEventListener.bind(window))
  vi.stubGlobal('localStorage', { getItem() { return null }, setItem() {} })
  vi.stubGlobal('location', { hash: '#/casa?sem3d', search: '?sem3d', origin: 'https://teste.invalid', pathname: '/' })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let ctx = { api: { ...apiExemplo, membros: async () => [], config: async (_f: string, _k: string, p: unknown) => p, escritorioHoje: async () => ({ funcionarios: [], entregue: [], trabalhando: [], precisa_de_voce: [] }), ...api }, familia: { id: 'a', papel: 'casal', nome: 'Teste' }, resumo: null, sessao: null, versao: 0, toast() {}, recarregar: async () => {}, tentar: async (f: () => Promise<unknown>) => { try { await f(); return true } catch { return false } }, ...extra } as Ctx
  const box = doc.createElement('div'); doc.body.appendChild(box)
  const root = createRoot(box as unknown as HTMLElement); roots.push(root)
  const render = async (c: Partial<Ctx> = {}) => { ctx = { ...ctx, ...c }; await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, el))) }
  await render()
  const find = (tag: string, text: string) => box.buscar(n => n.tagName === tag && (n.textContent === text || n.getAttribute('aria-label') === text))[0]
  const click = async (text: string) => { const b = find('BUTTON', text); expect(b, text).toBeDefined(); await act(async () => b.click()) }
  const change = async (label: string, value: string) => { const n = box.buscar(n => n.tagName === 'INPUT' && (n.getAttribute('aria-label') === label || n.parentNode?.textContent.startsWith(label) || n.getAttribute('placeholder') === label))[0]; expect(n, label).toBeDefined(); await act(async () => props(n).onChange({ target: { value } })) }
  const submit = async (twice = false) => { const form = box.buscar(n => n.tagName === 'FORM')[0]; await act(async () => { props(form).onSubmit({ preventDefault() {} }); if (twice) props(form).onSubmit({ preventDefault() {} }) }) }
  return { box, render, click, change, submit, find, ctx }
}


import { Lancamentos, ResumoDoMes, FaixaDoMes, totaisDoMes, FechamentoRegistrado } from './Lancamentos'
import { Entrar, AvisoConvite } from '../entrar/Entrar'
import { MetaDoDesejo, ProgressoMeta, MeuOrcamento } from '../meu-orcamento/MeuOrcamento'
import { renderToStaticMarkup } from 'react-dom/server'
import { esconderValores } from '../../lib/formato'
import { frasesDesejo } from '../desejos/Desejos'

it('resumo real separa recebido, pendente certo, incerto e virada de ano', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2027-01-02T12:00:00-03:00'))
  const recebimentos = [{ valor: 100, recebido_em: '2026-12-31', valor_recebido: 90, certo: true, mes_previsto: '2026-12' }, { valor: 40, recebido_em: null, certo: true, mes_previsto: '2026-12', mes_novo: '2027-01' }, { valor: 999, recebido_em: null, certo: false, mes_previsto: '2027-01' }]
  const api = { lancamentos: vi.fn(async (_f: string, m: string) => [{ valor: 20, data: m + '-01' }, { valor: 500, data: m + '-31' }, { valor: 9, data: m + '-01', apagado_em: 'sim' }]), recebimentos: async () => recebimentos, config: async () => [{ valor: 10, data: '2027-01-01' }] } as unknown as Partial<Api>
  const a = await montar(createElement(ResumoDoMes), api)
  expect(a.box.textContent).toContain('Realizado'); expect(a.box.textContent).toContain('Previsto')
  expect(a.box.textContent).toContain('R$40'); expect(a.box.textContent).not.toContain('999')
  await a.click('Mês anterior'); expect(api.lancamentos).toHaveBeenLastCalledWith('a', '2026-12')
  expect(a.box.textContent).toContain('R$90'); expect(a.box.textContent).toContain('dez/26')
})
it.each(['equipe', 'pessoa'])('resumo da familia nao aparece para %s', async papel => {
  const ler = vi.fn(); const a = await montar(createElement(ResumoDoMes), { recebimentos: ler }, { familia: { id: 'a', papel } as any })
  expect(a.box.textContent).toBe(''); expect(ler).not.toHaveBeenCalled()
})
it('resumo com falha nao mostra zero nem vazio', async () => {
  const a = await montar(createElement(ResumoDoMes), { recebimentos: async () => { throw Error('rede') } })
  expect(a.box.textContent).toContain('Os registros continuam guardados'); expect(a.box.textContent).not.toContain('Realizado')
})
it('gas pede confirmacao, permite desfazer e so envia depois do prazo', async () => {
  const casa: any = { hoje: '2026-11-15', lista: [], comprado: [], prestadores: [], gas: { trocas: [] }, presenca: { hoje: [], meu_ponto: {} } }
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const marcar = vi.fn(async () => casa)
  const a = await montar(createElement(Casa), { casaDaEquipe: async () => casa, casaMarcar: marcar }, { familia: { id: 'a', papel: 'equipe' } as any })
  await a.click('O gás acabou'); expect(marcar).not.toHaveBeenCalled()
  await a.click('Confirmar que acabou'); await a.click('Desfazer'); await act(async () => vi.advanceTimersByTime(6500)); expect(marcar).not.toHaveBeenCalled()
  await a.click('O gás acabou'); await a.click('Confirmar que acabou'); await act(async () => vi.advanceTimersByTime(6500))
  expect(marcar).toHaveBeenCalledTimes(1); expect(marcar).toHaveBeenCalledWith('a', 'acabou', { nome: 'Gás de cozinha' })
})
it('desejo vira meta na config sem alterar saldo e conserva anotacoes', async () => {
  let cfg: any = { e: { nome: 'Antiga', valor: 50, anotacoes: [{ id: '1', valor: 10, data: '2026-10-01' }] } }
  const salvar = vi.fn(async (_f, _c, v) => { cfg = v })
  const a = await montar(createElement(MetaDoDesejo, { desejo: { id: 'd', nome: 'Tenis', valor: 600, meu: true } as any }), { config: async () => cfg, salvarConfig: salvar } as any, { familia: { id: 'a', papel: 'pessoa', envelopeId: 'e' } as any })
  await a.click('Usar como meta e manter o que anotou')
  expect(cfg.e.nome).toBe('Tenis'); expect(cfg.e.valor).toBe(600); expect(cfg.e.anotacoes[0].valor).toBe(10); expect(salvar).toHaveBeenCalledTimes(1)
})
it('meta so soma dinheiro anotado entre meses, retendo digitado quando falha', async () => {
  const salvar = vi.fn(async () => false)
  const a = await montar(createElement(ProgressoMeta, { meta: { nome: 'Tenis', valor: 600, anotacoes: [{ id: '1', valor: 30, data: '2026-10-01' }, { id: '2', valor: 20, data: '2026-11-01' }] }, editavel: true, salvar }))
  expect(a.box.textContent).toContain('R$50'); expect(a.box.textContent).toContain('R$600')
  await a.change('Quanto você guardou de verdade?', '25'); await a.submit()
  expect(a.box.textContent).toContain('Seu valor continua aqui'); expect(salvar).toHaveBeenCalledTimes(1)
})
it.each([
 ['entre com o e-mail do convite', 'Use o e-mail para o qual'],
 ['convite vencido', 'Peça um novo link'],
 ['Failed to fetch', 'Confira a internet'],
 ['user account already exists teste@example.invalid', 'Confira o e-mail e o código'],
])('convite mostra proximo passo sem existencia de conta: %s', (mensagem, esperado) => {
 const html = renderToStaticMarkup(createElement(AvisoConvite, { mensagem }))
 expect(html).toContain(esperado); expect(html).not.toContain('teste@example.invalid'); expect(html).not.toContain('already exists')
})
it('olho fechado protege totais e meta, inclusive barra de progresso', async () => {
 esconderValores(true)
 try {
 const a = await montar(createElement(ProgressoMeta, { meta: { nome: 'Sentinela', valor: 9876, anotacoes: [] }, editavel: false, salvar: async () => true }), {}, { oculto: true })
 expect(a.box.textContent).not.toContain('Sentinela'); expect(a.box.buscar(n => n.tagName === 'PROGRESS')).toHaveLength(0)
 const html=renderToStaticMarkup(createElement(FaixaDoMes, { totais: { entrou: 9876, saiu: 0, saldo: 9876, previsto: 1234 } }))
 expect(html).not.toContain('9.876'); expect(html).not.toContain('1.234')
 } finally { esconderValores(false) }
})

import { Cartoes } from '../cartoes/Cartoes'
it('cartoes informa explicitamente o mes verificado', async () => {
 vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-15T12:00:00-03:00'))
 const a=await montar(createElement(Cartoes), { cartoes: async () => [{ id: 'c', nome: 'Teste', dia_fechamento: 20, dia_vencimento: 25 }], faturas: async () => [] }, { resumo: { envelopes: [], livre_mes: 1000, colchao: 0 } as any })
 await a.click('E se eu comprar?'); await act(async () => props(a.box.buscar(n => n.tagName === 'INPUT' && n.getAttribute('inputMode') === 'decimal')[0]).onChange({ target: { value: '100' } }))
 expect(a.box.textContent).toContain('Verificado só em nov/26'); expect(a.box.textContent).toContain('sem avaliar se cabem')
})

import { EstadoEstoqueEquipe } from '../casa/Casa'
import { Desejos } from '../desejos/Desejos'
import { Lancar } from '../lancar/Lancar'
it('estoque distingue ausencia de registro sem escolher estado padrao', async () => {
 const a=await montar(createElement(EstadoEstoqueEquipe), { estoque: async () => ({ itens: [{id:'a',nome:'Arroz',ativo:true}, {id:'b',nome:'Feijao',ativo:true}], contagens: [{itens:[{item_id:'a',estado:'tem'}]}] }) } as any, { familia: { id:'a',papel:'equipe' } as any })
 expect(a.box.textContent).toContain('Sem conferência registrada: 1 item.'); expect(a.box.textContent).toContain('Isso não confirma o estoque de hoje')
})
it('desejos mostra o periodo do motor no resultado real da lista', async () => {
 const entrada = { hoje: '2026-11-18', saldo_caixa: 300_000_000, aplicacoes: [], recebimentos: [], compromissos: [], dividas: [], desvios: [], desejos: [], parametros: { mes_base:'2026-11', virada:'2029-01', gasto_2029_hoje:0, renda_certa_2029:0, margem:'0',taxa_real_trabalho:'0.04',taxa_bruta_ano:{2026:'0.1375',2027:'0.125',2028:'0.11'},ipca_ano:{2026:'0.0522',2027:'0.049',2028:'0.04',2029:'0.04'},aliq_proj:'0.225',piso_meses:0,teto_mes:0,mes_reajuste:1} }
 const d={id:'d',nome:'Tenis',valor:600,mes:'2027-01',volta_de:'nada',volta:0,volta_mes:null,antecipado:null,volta_certa:false,situacao:'pensando',meu:true,dono_membro:'m'}
 const a=await montar(createElement(Desejos), { desejos:async()=>[d],futuroEntradas:async()=>({entrada}) } as any)
 expect(a.box.textContent).toContain('Verificado de 11/2026 até 12/2028.')
})

it.each([
  ['2026-11-15', 20, 25, 'nov/26', 'jan/27'],
  ['2026-12-31', 20, 5, 'fev/27', 'abr/27'],
  ['2028-02-29', 31, 5, 'abr/28', 'jun/28'],
])('parcelas: previa, confirmacao e Cartoes usam a mesma frase em %s', async (hoje, fecha, vence, de, ate) => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(hoje + 'T12:00:00-03:00'))
  const toast = vi.fn(), lancar = vi.fn(async () => ({ lancamento: { id: 'l' }, resumo: { envelopes: [] } }))
  const cartao = { id: 'c', nome: 'Teste', dia_fechamento: Number(fecha), dia_vencimento: Number(vence) }
  const resumo = { envelopes: [{ id: 'e', nome: 'Pessoal', escreve: true, regra: 'mensal', limite_base: 1000, limite_mes: 1000, livre: 1000, gasto_mes: 0 }], dias_restantes: 15, livre_mes: 1000, colchao: 0 } as any
  const api = { cartoes: async () => [cartao], faturas: async () => [], lancar } as unknown as Partial<Api>
  const a = await montar(createElement(Lancar), api, { resumo, toast, lancarAberto: { valor: 100 }, fecharLancar() {} })
  await a.click('Teste'); await a.click('3x')
  const previa = a.box.buscar(n => n.tagName === 'P' && !!n.getAttribute('class')?.includes('parc-fatura'))[0]?.textContent
  expect(previa).toContain('Esta compra de'); expect(previa).toContain(`de ${de} a ${ate}`)
  expect(previa?.replace(/\u00a0/g, ' ')).toContain('a primeira parcela é R$ 33,34')
  expect(a.box.textContent.replace(/\u00a0/g, ' ')).toContain(de === 'nov/26' ? 'Neste mês conta R$ 33,34.' : 'Neste mês não conta nada.')
  await a.click('Salvar em Pessoal')
  expect(lancar).toHaveBeenCalledWith(expect.objectContaining({ valor: 100, parcelas: 3, data: hoje, cartao: 'c' }))
  expect(toast.mock.calls[0][0]).toBe(`${previa} Cada parcela sai do limite no dia 1 do mês da fatura. ${de === 'nov/26' ? 'Neste mês conta R$\u00a033,34.' : 'Neste mês não conta nada.'}`)
  expect(toast.mock.calls[0][0]).not.toContain('hoje não muda')
  const b = await montar(createElement(Cartoes), api, { resumo })
  await b.click('E se eu comprar?')
  await act(async () => props(b.box.buscar(n => n.tagName === 'INPUT' && n.getAttribute('inputMode') === 'decimal')[0]).onChange({ target: { value: '100' } }))
  await b.click('3x')
  expect(b.box.buscar(n => n.tagName === 'P' && !!n.getAttribute('class')?.includes('parc-fatura'))[0]?.textContent).toBe(previa)
})

async function escolherFoto(a: Awaited<ReturnType<typeof montar>>) {
  // Exercita reduzirFoto de verdade, substituindo somente APIs de imagem/canvas do navegador.
  const criar = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag !== 'canvas') return criar(tag)
    return { getContext: () => ({ fillRect() {}, drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,Zm90bw==' } as any
  }) as any)
  vi.stubGlobal('createImageBitmap', async () => ({ width: 100, height: 120, close() {} }))
  const input = a.box.buscar(n => n.tagName === 'INPUT' && n.getAttribute('type') === 'file')[0]
  await act(async () => props(input).onChange({ target: { files: [new Blob(['foto'], { type: 'image/jpeg' })], value: '' } }))
}

it.each([false, true])('foto recebida continua ate resposta do envio; falha=%s', async falha => {
  const envio = pendente<any>(), fechar = vi.fn()
  const anotar = vi.fn(() => envio.promessa)
  const a = await montar(createElement(Lancar), { anotarCompraEquipe: anotar }, { familia: { id: 'a', papel: 'equipe' } as any, fecharLancar: fechar })
  await a.change('O que você comprou?', 'Feira')
  await escolherFoto(a)
  expect(a.box.textContent).toContain('Foto recebida')
  expect(a.box.buscar(n => n.tagName === 'IMG' && n.getAttribute('src') === 'data:image/jpeg;base64,Zm90bw==')).toHaveLength(1)
  await a.click('Anotar a compra')
  expect(anotar).toHaveBeenCalledWith('a', { tipo: 'feira', nome: 'Feira', foto: 'Zm90bw==' })
  expect(a.box.textContent).toContain('Foto recebida'); expect(a.box.textContent).toContain('Aguarde a confirmação')
  expect(fechar).not.toHaveBeenCalled()
  await a.click('Fechar'); expect(fechar).not.toHaveBeenCalled()
  await act(async () => { if (falha) envio.rejeitar(Error('rede')); else envio.resolver({ aviso: 'Compra recebida.' }) })
  if (falha) {
    expect(fechar).not.toHaveBeenCalled(); expect(a.box.textContent).toContain('A foto continua aqui')
    expect(a.box.buscar(n => n.tagName === 'IMG')).toHaveLength(1)
  } else expect(fechar).toHaveBeenCalledTimes(1)
})

it('olho fechado remove a imagem da nota e volta a exibir sem perder a foto', async () => {
  const a = await montar(createElement(Lancar), {}, { familia: { id: 'a', papel: 'equipe' } as any, fecharLancar() {} })
  await escolherFoto(a)
  expect(a.box.buscar(n => n.tagName === 'IMG')).toHaveLength(1)
  await a.render({ oculto: true }); expect(a.box.buscar(n => n.tagName === 'IMG')).toHaveLength(0)
  expect(a.box.textContent).toContain('Foto recebida')
  await a.render({ oculto: false }); expect(a.box.buscar(n => n.tagName === 'IMG')).toHaveLength(1)
})

it('foto em preparo impede enviar uma compra sem a imagem escolhida', async () => {
  const imagem = pendente<any>(), anotar = vi.fn(async () => ({ aviso: 'ok' }))
  const a = await montar(createElement(Lancar), { anotarCompraEquipe: anotar }, { familia: { id: 'a', papel: 'equipe' } as any, fecharLancar() {} })
  await a.change('O que você comprou?', 'Feira')
  vi.stubGlobal('createImageBitmap', () => imagem.promessa)
  const input = a.box.buscar(n => n.tagName === 'INPUT' && n.getAttribute('type') === 'file')[0]
  await act(async () => props(input).onChange({ target: { files: [new Blob(['foto'])], value: '' } }))
  expect(a.box.textContent).toContain('Preparando foto')
  await a.click('Anotar a compra'); expect(anotar).not.toHaveBeenCalled()
  await act(async () => imagem.rejeitar(Error('foto ilegível')))
  expect(a.box.textContent).toContain('Não foi possível ler a foto')
})

it.each([
  ['entre com o e-mail do convite', 'Use o e-mail para o qual'],
  ['convite vencido', 'Peça um novo link'],
  ['Failed to fetch', 'Confira a internet'],
  ['user account already exists teste@example.invalid', 'Confira o e-mail e o código'],
])('Entrar real apresenta proximo passo e preserva digitado: %s', async (mensagem, esperado) => {
  const enviar = vi.fn(async () => { throw Error(mensagem) })
  const a = await montar(createElement(Entrar), { enviarCodigo: enviar })
  await a.change('Seu e-mail', 'teste@example.invalid'); await a.submit()
  expect(a.box.textContent).toContain(esperado)
  expect(a.box.textContent).not.toContain('already exists')
  expect(a.box.buscar(n => n.tagName === 'INPUT' && props(n).value === 'teste@example.invalid')).toHaveLength(1)
})

it('Meu orcamento explica sobra sem cofrinho nem conta em linguagem de planilha', async () => {
  const resumo = { envelopes: [{ id:'e', nome:'Pessoal', regra:'mensal', escreve:true, limite_mes:600, limite_base:600, livre:600, gasto_mes:0 }], dias_restantes:15 } as any
  const a = await montar(createElement(MeuOrcamento), { lancamentos:async()=>[] }, { resumo })
  expect(a.box.textContent).toContain('o que sobra no mês dividido pelos dias que faltam')
  expect(a.box.textContent.toLowerCase()).not.toContain('cofrinho')
  expect(a.box.buscar(n=>n.getAttribute('id')==='oCofrinho')).toHaveLength(1)
})

it('Gastos e entradas abre fechamento salvo de mes passado depois do prazo', async () => {
  vi.useFakeTimers({ toFake:['Date'] }); vi.setSystemTime(new Date('2027-03-18T12:00:00-03:00'))
  const consultar = vi.fn(async()=>({ funcionarios:[], diario:[{id:'1', funcionario:'contador', ref:'fechou_mes:2027-02', pergunta:'Sobraram R$ 123.', resposta:'Deixar na conta', quando:'2027-03-02'}, {id:'2', funcionario:'contador', ref:'fechou_mes:2027-01', pergunta:'OUTRO MES', resposta:'',quando:'2027-03-01'}] }))
  const a = await montar(createElement(Lancamentos), { lancamentos:async()=>[], recebimentos:async()=>[], escritorioRelatorio:consultar } as any)
  await a.click('Mês anterior'); await a.click('Ver fechamento registrado')
  expect(consultar).toHaveBeenCalledWith('a','2027-03-01','2027-03-18')
  expect(a.box.textContent).toContain('Fechamento de fev/27'); expect(a.box.textContent).toContain('Sobraram R$ 123.')
  expect(a.box.textContent).not.toContain('OUTRO MES')
})

it('mes sem fechamento registrado explica ausencia sem inventar saldo', async () => {
  const a=await montar(createElement(FechamentoRegistrado,{mes:'2026-10'}), { escritorioRelatorio:async()=>({funcionarios:[],diario:[]}) })
  expect(a.box.textContent).toContain('Isso não significa saldo zero'); expect(a.box.textContent).toContain('não é possível fechar esse mês por esta tela')
})

it.each(['pessoa','equipe'])('fechamento familiar nao e consultado por %s', async papel => {
  const ler=vi.fn(); const a=await montar(createElement(FechamentoRegistrado,{mes:'2026-10'}), { escritorioRelatorio:ler }, {familia:{id:'a',papel} as any})
  expect(ler).not.toHaveBeenCalled(); expect(a.box.textContent).toBe('')
})

it('fechamento salvo respeita olho fechado', async()=>{
  esconderValores(true)
  try {
    const a=await montar(createElement(FechamentoRegistrado,{mes:'2026-10'}), { escritorioRelatorio:async()=>({funcionarios:[],diario:[{id:'1',funcionario:'contador',ref:'fechou_mes:2026-10',pergunta:'Sentinela R$ 9.876',resposta:'Sentinela',quando:'2026-11-02'}]}) } as any, {oculto:true})
    expect(a.box.textContent).not.toContain('Sentinela'); expect(a.box.textContent).not.toContain('9.876')
  } finally {esconderValores(false)}
})
