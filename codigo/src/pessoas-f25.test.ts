import { desfazer } from './app/desfazer'
import { BarraDesfazer } from './componentes/BarraDesfazer'
import { Fragment } from 'react'
import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { DocumentoTeste, NoTeste } from './telas/escritorio/numeros.dom-teste'
import { ContextoApp, type Ctx } from './app/contexto'
import { apiExemplo } from './api/exemplo'
import type { Api } from './api/tipos'
import { Casa } from './telas/casa/Casa'
const roots: Root[] = []
afterEach(async () => { await act(async () => desfazer.limpar()); for (const r of roots.splice(0)) await act(async () => r.unmount()); vi.useRealTimers(); vi.unstubAllGlobals() })
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
  const render = async (c: Partial<Ctx> = {}) => { ctx = { ...ctx, ...c }; await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, createElement(Fragment, null, el, createElement(BarraDesfazer))))) }
  await render()
  const find = (tag: string, text: string) => box.buscar(n => n.tagName === tag && (n.textContent === text || n.getAttribute('aria-label') === text))[0]
  const click = async (text: string) => { const b = find('BUTTON', text); expect(b, text).toBeDefined(); await act(async () => b.click()) }
  const change = async (label: string, value: string) => { const n = box.buscar(n => n.tagName === 'INPUT' && (n.getAttribute('aria-label') === label || n.parentNode?.textContent.startsWith(label) || n.getAttribute('placeholder') === label))[0]; expect(n, label).toBeDefined(); await act(async () => props(n).onChange({ target: { value } })) }
  const submit = async (twice = false) => { const form = box.buscar(n => n.tagName === 'FORM')[0]; await act(async () => { props(form).onSubmit({ preventDefault() {} }); if (twice) props(form).onSubmit({ preventDefault() {} }) }) }
  return { box, render, click, change, submit, find, ctx }
}




import { Lancar } from './telas/lancar/Lancar'
import { Privacidade } from './telas/privacidade/Privacidade'
import { AjudaDaAba } from './componentes/AgenteDaAba'
import { Acolhimento } from './componentes/Acolhimento'
import { prepararAcolhimento, encerrarAcolhimento } from './lib/acolhimento'
import { normalizaLancamento } from './api/normaliza'
import { protegerApi } from './api/protegida'
import { salvamento } from './app/salvamento'
import { NomeDaPessoa } from './componentes/NomeDaPessoa'
afterEach(async () => { await act(async () => salvamento.limpar()); encerrarAcolhimento() })
it('preserva o pagador diferente de quem anotou, e não inventa pagador ausente', () => {
 expect(normalizaLancamento({id:'l',autor:'auth-ana',pago_por:'b'})).toMatchObject({autor:'auth-ana',pago_por:'b'})
 expect(normalizaLancamento({id:'l',autor:'auth-ana'}).pago_por).toBeNull()
})
it('Quem pagou começa vazio e envia só a escolha explícita', async () => {
 const resumo:any={envelopes:[{id:'e',nome:'Pessoal',escreve:true,regra:'mensal',limite_mes:1000,livre:1000}],dias_restantes:15}
 const lancar=vi.fn(async()=>({lancamento:normalizaLancamento({id:'l'}),resumo}))
 const a=await montar(createElement(Lancar),{lancar,membros:async()=>[{id:'a',user_id:'auth-ana',nome:'Ana'},{id:'b',nome:'Bia'}]},{familia:{id:'f',papel:'casal',nome:'Família',membroId:'a',membroNome:'Ana',envelopeId:'e'},resumo,lancarAberto:{valor:10},fecharLancar(){}})
 const select=a.box.buscar(n=>n.tagName==='SELECT')[0]
 expect(select).toBeDefined();expect(props(select).value).toBe('')
 await act(async()=>props(select).onChange({target:{value:'b'}}))
 await a.click('Salvar em Pessoal');expect(lancar).toHaveBeenCalledWith(expect.objectContaining({pago_por:'b'}))
})
it('Assessor recebe resumo versionado sem baixar, apagar nem consultar finanças', async()=>{
 const baixar=vi.fn(),backup=vi.fn(),membros=vi.fn()
 const a=await montar(createElement(Privacidade),{exportarFamilia:baixar,backupLer:backup,membros},{familia:{id:'f',nome:'Família',membroNome:'Ana',papel:'equipe',envelopeId:null}})
 for(const texto of ['O que você registra','Quem pode ver','O que você pode baixar','Como pedir correção ou encerramento','2026-11-16.1'])expect(a.box.textContent).toContain(texto)
 expect(a.box.buscar(n=>n.tagName==='BUTTON').map(n=>n.textContent)).toEqual(['Sair'])
 expect(baixar).not.toHaveBeenCalled();expect(backup).not.toHaveBeenCalled();expect(membros).not.toHaveBeenCalled()
})
it('ajuda do Assessor não oferece olho, e casal não é mandado a quem convidou',async()=>{
 const a=await montar(createElement(AjudaDaAba,{rota:'casa'}),{},{familia:{id:'f',papel:'equipe',nome:'Família',membroNome:'Ana',envelopeId:null}})
 await a.click('Preciso de ajuda');expect(a.box.textContent).not.toContain('Use o olho');expect(a.box.textContent).toContain('sem valores')
 await a.render({familia:{...a.ctx.familia!,papel:'casal'}})
 expect(a.box.textContent).not.toContain('que convidou');expect(a.box.textContent).toContain('Família e ajustes')
})
it('identificação pendente não vira Sem nome ou identidade fictícia',async()=>{
 const p=pendente<{id:string;nome:string}[]>()
 const a=await montar(createElement(NomeDaPessoa,{pessoa:{tipo:'membro',id:'b'}}),{membros:()=>p.promessa})
 expect(a.box.textContent).toContain('Carregando identificação');expect(a.box.textContent).not.toContain('Sem nome')
 await act(async()=>p.resolver([{id:'b',nome:'Bia'}]));expect(a.box.textContent).toContain('Bia')
})
it('status acompanha a ação real, incluindo rejeição, e nunca a conexão',async()=>{
 const p=pendente<void>(),api=protegerApi({...apiExemplo,salvarConfig:()=>p.promessa})
 const a=await montar(createElement(BarraDesfazer));let enviada!:Promise<void>
 await act(async()=>{enviada=api.salvarConfig('f','rendas',{})})
 expect(a.box.textContent).toContain('Salvando')
 await act(async()=>{p.resolver();await enviada});expect(a.box.textContent).toContain('Salvo')
 await act(async()=>{await protegerApi({...apiExemplo,salvarConfig:async()=>{throw Error('falha')}}).salvarConfig('f','rendas',{}).catch(()=>{})})
 expect(a.box.textContent).toContain('Não foi possível salvar')
})
it('convite acolhe com nome, família, escopo e primeira ação só nesta sessão',async()=>{
 prepararAcolhimento();const abrir=vi.fn()
 const a=await montar(createElement(Acolhimento),{},{familia:{id:'f',nome:'Família Exemplo',membroNome:'Ana',membroId:'a',papel:'equipe',envelopeId:null},abrirLancar:abrir,oculto:false})
 expect(a.box.textContent).toContain('Ana');expect(a.box.textContent).toContain('Família Exemplo');expect(a.box.textContent).toContain('sem valores')
 await a.click('Anotar primeira compra');expect(abrir).toHaveBeenCalledOnce();expect(a.box.textContent).not.toContain('Bem-vindo')
})

import { PrimeiroUso } from './telas/primeiro-uso/PrimeiroUso'
import { esconderValores } from './lib/formato'
it('Casa soma pagamento explícito separado do valor apenas anotado e mascara com olho fechado',async()=>{
 const env:any={id:'c',casa:true,nome:'Casa',regra:'semanal',livre:1000,teto_semana:1000,gasto_semana:0}
 const ls=[normalizaLancamento({id:'1',envelope_id:'c',autor:'auth-ana',pago_por:'b',valor:80}),normalizaLancamento({id:'2',envelope_id:'c',autor:'auth-ana',valor:20}),normalizaLancamento({id:'3',envelope_id:'outro',autor:'auth-ana',valor:777})]
 esconderValores(false)
 const a=await montar(createElement(Casa),{lancamentos:async()=>ls,avisosCasa:async()=>[],membros:async()=>[{id:'a',user_id:'auth-ana',nome:'Ana'},{id:'b',nome:'Bia'}]},{oculto:false,familia:{id:'f',papel:'casal',nome:'Família',membroId:'a',membroNome:'Ana',envelopeId:null},resumo:{envelopes:[env]} as any})
 const faixa=()=>a.box.buscar(n=>n.tagName==='P'&&n.textContent.startsWith('Este mês na Casa:'))[0].textContent.replace(/\s/g,' ')
 expect(faixa()).toContain('Bia  pagou R$ 80');expect(faixa()).toContain('Ana  anotou R$ 20');expect(faixa()).not.toContain('pôs')
 esconderValores(true);await a.render({oculto:true});expect(faixa()).not.toMatch(/R\$\s*80/);expect(faixa()).not.toContain('Bia');esconderValores(false)
})
it('primeiro uso fala de gestão e prioriza objetivo 2029 antes de indicação',async()=>{
 const resumo:any={envelopes:[],pode_gastar_hoje:10}
 const a=await montar(createElement(PrimeiroUso),{criarFamilia:async()=> 'f',resumoHoje:async()=>resumo},{sair:async()=>{},trocarSessao:async()=>{}})
 await a.click('Não: vou criar a família');await a.change('Nome da família','Família Exemplo');await a.change('Seu nome','Ana');await a.submit();await a.submit()
 expect(a.box.textContent).toContain('Quer compartilhar a gestão?');expect(a.box.textContent).not.toContain('com meus filhos')
 await a.click('Vou cuidar da gestão por enquanto');const t=a.box.textContent
 expect(t).toContain('Próximos passos para 2029');expect(t.indexOf('aplicações e imóveis')).toBeLessThan(t.indexOf('indique a amigos'))
})
