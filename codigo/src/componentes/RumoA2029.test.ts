import { protegerApi } from '../api/protegida'
import { definirEscopoLeitura } from '../app/invalidacao'
import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { ContextoApp, type Ctx } from '../app/contexto'
import type { Api, ImovelTela } from '../api/tipos'
import { apiExemplo } from '../api/exemplo'
import { calcularRumo, lerFontes, numerosRumo2029 } from '../app/rumo2029'
import { CenariosReceitas } from './CenariosReceitas'
import { Inicio } from '../telas/inicio/Inicio'
import { Painel } from '../telas/painel/Painel'
import { partesDinheiro } from '../lib/formato'
import { AgenteDaAba } from './AgenteDaAba'
import { acompanharConferencias, frescor, lerNumeros, marcarConferencia } from '../app/useNumerosAtualizados'
import { futuro, gastoNaVirada, type FuturoEntrada } from '../lib/futuro'
import { DocumentoTeste, NoTeste } from '../telas/escritorio/numeros.dom-teste'
import { RumoA2029, RumoHero } from './RumoA2029'

const roots: Root[] = []
afterEach(async () => { for (const root of roots.splice(0)) await act(async () => root.unmount()); vi.unstubAllGlobals(); vi.useRealTimers() })
const agora = new Date('2026-11-16T15:00:00.000Z')
function entrada(saldo = 80_000_000): FuturoEntrada {
  return { hoje: '2026-11-16', saldo_caixa: saldo, aplicacoes: [], recebimentos: [], compromissos: [], dividas: [], desvios: [], desejos: [], imoveis: [],
    parametros: { mes_base: '2026-11', virada: '2029-01', gasto_2029_hoje: 300_000, renda_certa_2029: 0, margem: '0.1', taxa_real_trabalho: '0.04',
      taxa_bruta_ano: { 2026: '0.12', 2027: '0.1', 2028: '0.09' }, ipca_ano: { 2026: '0.04', 2027: '0.04', 2028: '0.04' }, aliq_proj: '0.225', aliq_aluguel: '0.275', piso_meses: 6, teto_mes: 100_000, mes_reajuste: 1 } }
}
function receitas(e = entrada()) {
  e.recebimentos = ['empresa', 'novo', 'incerto', 'salario', 'aluguel', 'anual'].map(id => ({ id, descricao: `Fonte ${id}`, dono: 'Fictício', valor: 10_000, mes_previsto: '2028-12', mes_novo: null, certo: true, recebido: false }))
  const fontes = { empresa: { origem: 'empresa', certeza: 'garantido', recorrencia: 'mensal' }, novo: { origem: 'negocio_novo', certeza: 'provavel', recorrencia: 'mensal' }, incerto: { origem: 'empresa', certeza: 'incerto', recorrencia: 'mensal' }, salario: { origem: 'salario', certeza: 'garantido', recorrencia: 'mensal' }, aluguel: { origem: 'aluguel', certeza: 'garantido', recorrencia: 'mensal' }, anual: { origem: 'empresa', certeza: 'garantido', recorrencia: 'anual' } }
  return { e, fontes }
}
function comItens() {
  const e = entrada()
  e.aplicacoes = [{ id: 'a', banco: 'Banco fictício', titular: null, titulares: [], saldo: 100_000, taxa_bruta_anual: '0.1', isenta: false, aplicada_em: '2026-01-01', resgate_previsto: null, fgc: true }]
  e.imoveis = [{ id: 'i', dono: 'Teste', apelido: 'Imóvel fictício', valor: 40_000_000, uso: 'aluga', aluguel_bruto: 100_000, custos_mes: 10_000, vacancia: '0.08', tem_contrato: false, contrato_ate: null, venda_valor: null, venda_mes: null, venda_contrato: false }]
  e.recebimentos = [{ id: 'r', descricao: 'Contrato fictício', dono: 'Teste', valor: 100_000, mes_previsto: '2027-03', mes_novo: null, certo: true, recebido: false }]
  return e
}
async function montar(el: ReactElement, apiExtra: Partial<Api> = {}, extra: Partial<Ctx> = {}, storage = new Map<string, string>()) {
  const doc = new DocumentoTeste()
  Object.assign(NoTeste.prototype, { focus() {}, closest() { return null }, querySelectorAll() { return [] } })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }))
  vi.stubGlobal('addEventListener', window.addEventListener.bind(window))
  vi.stubGlobal('removeEventListener', window.removeEventListener.bind(window))
  vi.stubGlobal('Element', NoTeste)
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('localStorage', { getItem(k: string) { return storage.get(k) ?? null }, setItem(k: string, v: string) { storage.set(k, v) } })
  vi.stubGlobal('location', { hash: '#/planejamento', search: '', pathname: '/' })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const config: Record<string, unknown> = {}
  const api = { ...apiExemplo, modo: 'real', config: vi.fn(async (_f, k, padrao) => config[k] ?? padrao), salvarConfig: vi.fn(async (_f, k, v) => { config[k] = v }),
    futuroEntradas: vi.fn(async () => ({ entrada: entrada(), confirmar: [] })), membros: async () => [], ...apiExtra } as Api
  let ctx = { api, familia: { id: 'familia-ficticia', membroId: 'm', membroNome: 'Teste', papel: 'casal', nome: 'Teste' }, versao: 0, oculto: false, toast() {},
    recarregar: async () => {}, tentar: async (f: () => Promise<unknown>) => { try { await f(); return true } catch { return false } }, ...extra } as Ctx
  const box = doc.createElement('div'); doc.body.appendChild(box)
  const root = createRoot(box as unknown as HTMLElement); roots.push(root)
  const render = async (x: Partial<Ctx> = {}) => { ctx = { ...ctx, ...x }; await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, el))) }
  await render()
  const click = async (text: string, n = 0) => { const b = box.buscar(x => x.tagName === 'BUTTON' && x.textContent.includes(text))[n]; expect(b, text).toBeDefined(); await act(async () => b.click()) }
  return { box, api, ctx, click, render, config }
}
const hero = (e: FuturoEntrada) => createElement(RumoHero, { calculo: calcularRumo(e, {}), abrir() {} })

const dinheiroVisivel = (c: number) => { const p = partesDinheiro(Math.abs(c) / 100); return `R$${p.inteiro}${p.cents || ''}` }
const superfícies = () => createElement('div', {},
  ...[createElement(RumoA2029), createElement(CenariosReceitas, { fontes: {}, controle: {}, revisao: 0 }), createElement(Inicio), createElement(Painel)]
    .map((el, i) => createElement('div', { key: i, 'data-frente': String(i) }, el)))

it.each(['cobre', 'não cobre', 'sobra', 'sem dados'])('fonte única em cartão, seletor, Início e Painel: %s', async caso => {
  const e = entrada(caso === 'não cobre' || caso === 'sem dados' ? 0 : caso === 'cobre' ? 100_000_000 : 300_000_000)
  if (caso === 'sem dados') e.parametros.gasto_2029_hoje = 0
  const n = numerosRumo2029(futuro(e), e)
  const a = await montar(superfícies(), { futuroEntradas: async () => ({ entrada: e, confirmar: [] }), numerosSemana: async () => [], lancamentos: async () => [] },
    { resumo: await apiExemplo.resumoHoje('familia-ficticia'), sessao: { dono: true } as Ctx['sessao'] })
  for (let i = 0; i < 4; i++) {
    const texto = a.box.buscar(x => x.getAttribute('data-frente') === String(i))[0].textContent
    if (i === 2) {
      const bloco = a.box.buscar(x => x.getAttribute('data-bloco') === 'plano2029')[0]
      if (caso === 'sem dados') expect(bloco.textContent).toContain('Informe o gasto necessário')
      else {
        expect(bloco.textContent.replace(/\s/g, '')).toContain((Math.abs(n.falta_com_margem!) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\s/g, ''))
        expect(bloco.textContent).toContain(n.falta_com_margem! > 0 ? 'Faltam' : 'Sobram')
        expect(bloco.textContent).toContain('com margem de segurança')
      }
      expect(bloco.textContent).toContain('cenário oficial Garantido')
      continue
    }
    if (caso === 'sem dados') expect(texto).toContain('Informe o gasto necessário')
    else {
      expect(texto).toContain(`${dinheiroVisivel(n.falta_com_margem!)} por mês, com margem de segurança`)
      expect(texto).toContain(`Sem a margem de segurança: ${n.falta_sem_margem > 0 ? 'faltam' : 'sobram'} ${dinheiroVisivel(n.falta_sem_margem)} por mês`)
    }
  }
})

it('troca sincroniza cartão e seletor, preserva oficial, persiste e informa cenário e base do gráfico', async () => {
  const e = entrada(0)
  e.recebimentos = [{ id: 'incerta', dono: 'Teste', valor: 90_000_000, mes_previsto: '2027-01', mes_novo: null, certo: false, recebido: false }]
  const storage = new Map<string, string>([['cenario_receitas', 'inválido']])
  const a = await montar(superfícies(), { futuroEntradas: async () => ({ entrada: e, confirmar: [] }), numerosSemana: async () => [], lancamentos: async () => [] },
    { resumo: await apiExemplo.resumoHoje('familia-ficticia'), sessao: { dono: true } as Ctx['sessao'] }, storage)
  const frente = (i: number) => a.box.buscar(x => x.getAttribute('data-frente') === String(i))[0].textContent
  // As leituras fictícias do restante do Início/Painel usam timers de até 60 ms.
  // Concluí-las antes de comparar a página inteira isola a troca de cenário.
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)) })
  const oficial = [frente(2), frente(3)], antes = frente(0)
  expect(antes).not.toContain('Número oficial: Garantido')
  await a.click('Com tudo')
  expect(frente(0)).not.toBe(antes)
  expect(frente(0)).toContain('Número oficial: Garantido')
  expect([frente(2), frente(3)]).toEqual(oficial)
  expect(storage.get('cenario_receitas')).toBe('tudo')
  expect(a.box.buscar(x => x.tagName === 'SVG').some(x => (x.getAttribute('aria-label') || '').includes('Com tudo: cobertura mensal estimada com margem'))).toBe(true)
  const b = await montar(createElement(RumoA2029), { futuroEntradas: async () => ({ entrada: e, confirmar: [] }) }, {}, storage)
  expect(b.box.textContent).toContain('Número oficial: Garantido')
})

it('frescor de 61 dias aparece também no resumo usado pelo Início', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(agora)
  const a = await montar(createElement(RumoA2029, { compacto: true }), { config: async (_f, k, padrao) =>
    String(k) === 'numeros_atualizados' ? { saldo_caixa: '2026-09-16', aplicacoes: {}, imoveis: {}, recebimentos: {} } as any : padrao })
  expect(a.box.textContent).toContain('Há números com mais de 60 dias.')
  expect(a.box.textContent).toContain('Sem a margem de segurança:')
})

it('fontes por cenário preservam certeza e não duplicam recorrência já acumulada nas aplicações', async () => {
  const { e, fontes } = receitas(entrada())
  const a = await montar(createElement('div', {}, createElement(RumoA2029), createElement(CenariosReceitas, { fontes: fontes as any, controle: {}, revisao: 0 })), {
    config: async (_f, k, padrao) => String(k) === 'fontes_receita' ? fontes as any : padrao,
    futuroEntradas: async () => ({ entrada: e, receitasBase: e.recebimentos, fontesReceita: fontes as any, confirmar: [] }),
  })
  const categoria = () => a.box.buscar(x => x.tagName === 'DIV' && x.getAttribute('class') === 'rumo-fontes')[0].textContent
  const garantido = categoria()
  await a.click('Com previstos')
  expect(categoria()).not.toBe(garantido)
  const previsto = categoria()
  await a.click('Com tudo')
  expect(categoria()).not.toBe(previsto)
  expect(categoria()).toContain('Receitas recorrentes na renda mensalR$0')
  expect(a.box.textContent).toContain('Fonte novo · Previsto')
  expect(a.box.textContent).toContain('Fonte incerto · Incerto')
  expect(a.box.textContent).toContain('não somam renda permanente')
})

it('agente real fala o mesmo Garantido do cartão, Início e Painel; cenário alternativo e olho não mudam sua base', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(agora)
  const e = entrada(0)
  e.recebimentos = [{ id: 'incerta', dono: 'Teste', valor: 90_000_000, mes_previsto: '2027-01', mes_novo: null, certo: false, recebido: false }]
  const n = numerosRumo2029(futuro(e), e)
  const a = await montar(createElement('div', {}, superfícies(), createElement('div', { 'data-frente': 'agente' }, createElement(AgenteDaAba, { rota: 'planejamento' }))), {
    futuroEntradas: async () => ({ entrada: e, receitasBase: e.recebimentos, confirmar: [] }),
    escritorioHoje: async () => ({ funcionarios: [], trabalhando: [], entregue: [], precisa_de_voce: [] }) as any,
    recebimentos: async () => [], numerosSemana: async () => [], lancamentos: async () => [],
  }, { resumo: await apiExemplo.resumoHoje('familia-ficticia'), sessao: { dono: true } as Ctx['sessao'] })
  const frente = (i: string) => a.box.buscar(x => x.getAttribute('data-frente') === i)[0].textContent.replace(/\s/g, '')
  const com = `${dinheiroVisivel(n.falta_com_margem!)} por mês, com margem de segurança`.replace(/\s/g, '')
  const sem = `Sem a margem de segurança: faltam ${dinheiroVisivel(n.falta_sem_margem)} por mês`.replace(/\s/g, '')
  for (const i of ['0', '2', '3', 'agente']) {
    if (i === '2') {
      expect(frente(i)).toContain((n.renda / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\s/g, ''))
      expect(frente(i)).toContain('cenáriooficialGarantido')
      continue
    }
    expect(frente(i)).toContain(com)
    expect(frente(i)).toContain(i === 'agente' ? 'NocenárioGarantidode2029' : sem)
  }
  const oficial = frente('agente')
  await a.click('Com tudo')
  expect(frente('0')).not.toContain(com)
  expect(frente('agente')).toBe(oficial)
  await a.render({ oculto: true })
  expect(frente('agente')).not.toContain(dinheiroVisivel(n.falta_com_margem!).replace(/\s/g, ''))
  await a.render({ oculto: false })
  expect(frente('agente')).toBe(oficial)
})

it('hero cobre: frase, barra, premissas e gráfico textual vêm de cenário fabricado rico', async () => {
  const e = entrada(300_000_000), c = calcularRumo(e, {})
  const a = await montar(hero(e))
  expect(a.box.textContent).toContain('sobram')
  expect(c.cobertura).toBeGreaterThan(100)
  expect(c.cobreEm).toBe('2029-01')
  expect(a.box.textContent).toContain('Cobertura projetada em jan/2029')
  expect(a.box.textContent).toContain('acima da inflação')
  expect(a.box.textContent).toContain('dez/2031:')
  expect(a.box.buscar(n => n.getAttribute('role') === 'img').length).toBe(2)
})
it('hero não cobre: falta por mês, limite dez/2031 e renda nunca ganha garantia', async () => {
  const a = await montar(hero(entrada(0)))
  expect(a.box.textContent).toContain('faltam')
  expect(a.box.textContent).toContain('Não cobre até dez/2031')
  expect(a.box.textContent).toContain('Previsto · rendimento estimado')
  expect(a.box.textContent).toContain('não uma promessa')
})
it('hero sem dados e gasto zero orienta completar sem inventar cobertura', async () => {
  const a = await montar(createElement(RumoHero, { calculo: null, abrir() {} }))
  expect(a.box.textContent).toContain('Informe o gasto necessário')
  expect(a.box.textContent).not.toContain('100%')
  const e = entrada(); e.parametros.gasto_2029_hoje = 0
  const b = await montar(hero(e))
  expect(b.box.textContent).toContain('Gasto zero não permite avaliar')
  expect(b.box.textContent).not.toContain('Cobertura projetada em')
})
it('decomposição com origens mantém garantido, previsto e incerto separados e exclui salário/aluguel duplicado', async () => {
  const { e, fontes } = receitas(), c = calcularRumo(e, fontes)
  expect(c.recorrentes.filter(r => r.entra).map(r => r.id)).toEqual(['empresa'])
  expect(c.total).toBe(c.aplicacoes + c.alugueis + 10_000)
  expect(c.recorrentes.find(r => r.id === 'novo')?.grupo).toBe('Previsto')
  expect(c.recorrentes.find(r => r.id === 'incerto')?.grupo).toBe('Incerto')
  expect(c.recorrentes.find(r => r.id === 'anual')?.entra).toBe(false)
  const a = await montar(createElement(RumoHero, { calculo: c, abrir() {} }))
  expect(a.box.textContent).toContain('Fonte empresa')
  expect(a.box.textContent).toContain('Por ano; fora da cobertura mensal')
})
it('sem fontes e com fontes corrompidas não presume recorrência nem soma renda certa de origem desconhecida', async () => {
  const { e } = receitas(); e.parametros.renda_certa_2029 = 500_000
  for (const cfg of [undefined, null, [], 'inválido', { empresa: { origem: 'empresa' } }]) {
    const c = calcularRumo(e, cfg, false)
    expect(c.recorrentes).toHaveLength(0)
    expect(c.total).toBe(c.aplicacoes + c.alugueis)
    expect(c.premissas.join()).toContain('este painel não a soma')
  }
  const a = await montar(createElement(RumoA2029), { config: async () => null as any })
  expect(a.box.textContent).toContain('Sem origem e frequência informadas')
})
it('contrato curto, início futuro e cadastro contraditório não viram renda confirmada', () => {
  const { e, fontes } = receitas()
  const c = calcularRumo(e, { ...fontes, empresa: { ...fontes.empresa, fim: '2029-11' } }, false)
  expect(c.recorrentes.find(r => r.id === 'empresa')).toMatchObject({ entra: false, nota: 'Termina em 2029-11; fora da cobertura de 12 meses.' })
  e.recebimentos[0].certo = false
  expect(calcularRumo(e, fontes, false).recorrentes[0]).toMatchObject({ entra: false, grupo: 'Incerto' })
  e.recebimentos[0].mes_previsto = '2029-02'
  expect(calcularRumo(e, fontes, false).recorrentes.some(r => r.id === 'empresa')).toBe(false)
})
it('valida contrato de fontes por item: mantém válido e rejeita fim/origem/recorrência inválidos', () => {
  const { fontes } = receitas()
  expect(lerFontes({ boa: fontes.empresa, fim: { ...fontes.empresa, fim: '2029-13' }, origem: { ...fontes.empresa, origem: 'verba' }, repeticao: { ...fontes.empresa, recorrencia: 'semanal' } })).toEqual({ boa: fontes.empresa })
})
it('aluguel líquido e aplicações coincidem com o motor, sem transformar imóvel em saque', () => {
  const e = comItens(); e.imoveis![0].tem_contrato = true; e.imoveis![0].contrato_ate = '2029-12'
  const c = calcularRumo(e, {}, false), s = futuro(e)
  expect(c.alugueis).toBe(s.aluguel_liquido_2029)
  expect(c.aplicacoes).toBe(s.renda_sustentavel)
  expect(c.total).toBe(s.renda_total_2029)
  expect(c.gasto).toBe(gastoNaVirada(e.parametros.gasto_2029_hoje, '2026-11', '2029-01', e.parametros.ipca_ano))
})
it('aluguel sem contrato aparece separado como incerto e fora da cobertura', async () => {
  const e = comItens(), c = calcularRumo(e, {}, false)
  expect(c.alugueis).toBe(0)
  const a = await montar(createElement(RumoHero, { calculo: c, abrir() {} }))
  expect(a.box.textContent).toContain('Imóvel fictício · Incerto')
  expect(a.box.textContent).toContain('por mês fora da cobertura: sem contrato')
})
it('após 2029 usa o mês atual sem apresentar saldo atual como se fosse histórico', async () => {
  const e = entrada(0); e.hoje = '2030-02-16'
  const c = calcularRumo(e, {})
  expect(c.referencia).toBe('2030-02')
  expect(c.linha[0].mes).toBe('2030-02')
  const a = await montar(createElement(RumoHero, { calculo: c, abrir() {} }))
  expect(a.box.textContent).toContain('Em fev/2030 faltam')
  expect(a.box.textContent).not.toContain('Em jan/2029 faltam')
})
it('alavancas têm efeito reproduzível no motor, ordenam até três e não mudam entrada', () => {
  const e = comItens(), antes = JSON.stringify(e), c = calcularRumo(e, {})
  expect(c.alavancas).toHaveLength(3)
  expect(c.alavancas.every(a => a.efeito > 0)).toBe(true)
  expect(c.alavancas.map(a => a.efeito)).toEqual(c.alavancas.map(a => a.efeito).sort((a, b) => b - a))
  const contrato = c.alavancas.find(a => a.id === 'imovel:i')!
  const novo = calcularRumo({ ...e, imoveis: e.imoveis!.map(i => ({ ...i, tem_contrato: true, contrato_ate: '2029-12' })) }, {}, false)
  expect(contrato.efeito).toBe(novo.total - c.total)
  const corte = c.alavancas.find(a => a.id === 'cortar')!
  const cortado = calcularRumo({ ...e, parametros: { ...e.parametros, gasto_2029_hoje: e.parametros.gasto_2029_hoje - corte.valor } }, {}, false)
  expect(corte.efeito).toBe(c.gasto - cortado.gasto)
  expect(JSON.stringify(e)).toBe(antes)
})
it('guardar e antecipar são hipóteses independentes calculadas com fluxos reais do motor', () => {
  const e = entrada(20_000_000)
  const c = calcularRumo(e, {})
  const g = c.alavancas.find(a => a.id === 'guardar')!
  expect(g.valor).toBe(futuro(e).ajustes_falta!.guardar_por_mes)
  expect(g.efeito).toBeGreaterThan(0)
  e.recebimentos = [{ id: 'r', dono: '', descricao: 'Parcela fictícia', valor: 5_000_000, mes_previsto: '2028-12', mes_novo: null, certo: true, recebido: false }]
  const antes = calcularRumo(e, {}), ant = antes.alavancas.find(a => a.id === 'receita:r')!
  const depois = calcularRumo({ ...e, recebimentos: [{ ...e.recebimentos[0], mes_novo: '2026-12' }] }, {}, false)
  expect(ant.efeito).toBe(depois.total - antes.total)
})
it('quando cobre respeita a primeira ultrapassagem, término de contratos e taxas estendidas declaradas', () => {
  const { e, fontes } = receitas(entrada(0)); e.recebimentos[0].valor = 1_000_000; e.recebimentos[0].mes_previsto = '2029-04'
  const c = calcularRumo(e, fontes)
  expect(c.cobreEm).toBe('2029-04')
  expect(c.linha).toHaveLength(36)
  expect(c.linha[2].cobertura).toBeLessThan(100)
  expect(c.linha[3].cobertura).toBeGreaterThan(100)
  expect(c.premissas.join()).toContain('última Selic')
})
it.each([[0, 'verde'], [30, 'verde'], [31, 'ambar'], [60, 'ambar'], [61, 'vermelho']])('frescor com relógio injetado: %i dias dá %s no texto e na cor', (dias, cor) => {
  const data = new Date(agora.getTime() - Number(dias) * 86400000).toISOString()
  expect(frescor(data, agora)).toMatchObject({ dias, cor, texto: dias === 0 ? 'Conferido hoje' : `Conferido há ${dias} dias` })
})
it('JSON de frescor inválido é tolerado sem perder uma conferência válida', () => {
  expect(lerNumeros({ aplicacoes: { a: agora.toISOString(), ruim: 'ontem' }, imoveis: [], recebimentos: null, saldo_caixa: 15 })).toEqual({ aplicacoes: { a: agora.toISOString() }, imoveis: {}, recebimentos: {} })
  expect(frescor('2026-11-17T15:00:00Z', agora).texto).toBe('Sem conferência registrada')
})
it('folha real mostra cores e limites, destinos existentes e marca apenas o item escolhido', async () => {
  vi.useFakeTimers(); vi.setSystemTime(agora)
  const e = comItens()
  const cfg = { aplicacoes: { a: '2026-10-17T15:00:00Z' }, imoveis: { i: '2026-09-16T15:00:00Z' }, recebimentos: { r: '2026-09-17T15:00:00Z' } }
  const salvar = vi.fn(async () => {})
  const a = await montar(createElement(RumoA2029), { futuroEntradas: async () => ({ entrada: e, confirmar: [] }), config: async (_f, k, p) => (String(k) === 'numeros_atualizados' ? cfg : p) as any, salvarConfig: salvar })
  await a.click('Atualizar meus números')
  expect(a.box.textContent).toContain('Conferido há 30 dias')
  expect(a.box.textContent).toContain('Conferido há 60 dias')
  expect(a.box.textContent).toContain('Conferido há 61 dias')
  for (const cor of ['verde', 'ambar', 'vermelho']) expect(a.box.buscar(n => n.getAttribute('class') === `rumo-frescor ${cor}`).length).toBeGreaterThan(0)
  expect(a.box.buscar(n => n.getAttribute('href') === '#/escritorio?f=guardado')).toHaveLength(1)
  expect(a.box.buscar(n => n.getAttribute('href') === '#/planejamento?numeros=recebimentos')).toHaveLength(1)
  expect(a.box.textContent).toContain('Ainda não há formulário de edição do saldo em conta')
  await a.click('Marcar como conferido hoje', 0)
  expect(salvar).toHaveBeenCalledWith('familia-ficticia', 'numeros_atualizados', expect.objectContaining({ aplicacoes: { a: agora.toISOString() }, imoveis: cfg.imoveis }))
  expect(a.box.textContent).toContain('Conferido hoje')
})
it('folha reutiliza formulário de imóvel real, salva e atualiza conferência', async () => {
  const e = comItens(), i = { id: 'i', meu: true, apelido: 'Imóvel fictício', dono_nome: 'Teste', valor: 400_000, uso: 'parado', aluguel: 0, custos: 0, vacancia: '0', tem_contrato: false, contrato_ate: null, venda_valor: null, venda_mes: null, venda_contrato: false } as ImovelTela
  const salvar = vi.fn(async () => {}), gravar = vi.fn(async () => {})
  const api = protegerApi({ ...apiExemplo, modo: 'real', config: async (_f, _c, p) => p, futuroEntradas: async () => ({ entrada: e, confirmar: [] }), imoveis: async () => [i], imovelSalvar: salvar, salvarConfig: gravar })
  definirEscopoLeitura(api, 'teste', { id: 'familia-ficticia', papel: 'casal' } as NonNullable<Ctx['familia']>)
  const a = await montar(createElement(RumoA2029), {}, { api })
  await a.click('Atualizar meus números'); await a.click('Abrir imóvel')
  expect(a.box.textContent).toContain('Quanto vale hoje')
  await a.click('Salvar')
  expect(salvar).toHaveBeenCalledWith('familia-ficticia', 'i', expect.objectContaining({ valor: 400_000 }))
  expect(gravar).toHaveBeenCalledWith('familia-ficticia', 'numeros_atualizados', expect.objectContaining({ imoveis: { i: expect.any(String) } }))
})
it('salvamentos existentes confirmam só depois de sucesso; aporte e falha não conferem', async () => {
  const salvar = vi.fn(async () => {}), interna = { ...apiExemplo, modo: 'real', config: async () => ({}), salvarConfig: salvar, guardadoMovimentar: vi.fn(async () => {}), imovelSalvar: vi.fn(async () => {}), recebimentoMudar: vi.fn(async () => {}), imoveis: async () => [] } as unknown as Api
  const api = protegerApi(interna), familia = { id: 'f', papel: 'casal' } as NonNullable<Ctx['familia']>
  definirEscopoLeitura(api, 'teste', familia)
  acompanharConferencias(api, 'f', ['a'], () => agora)
  await api.guardadoMovimentar('a', 'aporte', 1, '2026-11-16', 'x')
  expect(salvar).not.toHaveBeenCalled()
  await api.guardadoMovimentar('a', 'saldo_conferido', 1, '2026-11-16', 'y')
  expect(salvar).toHaveBeenLastCalledWith('f', 'numeros_atualizados', expect.objectContaining({ aplicacoes: { a: agora.toISOString() } }))
  await api.recebimentoMudar!('f', 'r', { certo: true })
  expect(salvar).toHaveBeenLastCalledWith('f', 'numeros_atualizados', expect.objectContaining({ recebimentos: { r: agora.toISOString() } }))
  const gravarFalha = vi.fn()
  const falha = protegerApi({ ...interna, imovelSalvar: async () => { throw new Error('não salvo') }, salvarConfig: gravarFalha })
  definirEscopoLeitura(falha, 'teste', familia)
  acompanharConferencias(falha, 'f', [], () => agora)
  await expect(falha.imovelSalvar!('f', 'i', {} as any)).rejects.toThrow('não salvo')
  expect(gravarFalha).not.toHaveBeenCalled()
})
it('gravação de conferência relê dados e mantém datas de outros itens; falha não vira sucesso', async () => {
  const salvar = vi.fn(async () => {}), api = { ...apiExemplo, modo: 'real', config: async () => ({ imoveis: { outro: '2026-01-01' } }), salvarConfig: salvar } as unknown as Api
  expect(await marcarConferencia(api, 'f', 'imoveis', 'i', agora)).toBe(true)
  expect(salvar).toHaveBeenCalledWith('f', 'numeros_atualizados', expect.objectContaining({ imoveis: { outro: '2026-01-01', i: agora.toISOString() } }))
  api.salvarConfig = async () => { throw new Error('rede') }
  expect(await marcarConferencia(api, 'f', 'aplicacoes', 'a', agora)).toBe(false)
})
it('olho fechado mascara frase, valores, nomes, status, premissas, largura e geometria do gráfico', async () => {
  const { e, fontes } = receitas(comItens())
  const a = await montar(createElement(RumoA2029), { futuroEntradas: async () => ({ entrada: e, confirmar: [] }), config: async (_f, k, p) => (String(k) === 'fontes_receita' ? fontes : p) as any }, { oculto: true })
  expect(a.box.textContent).toContain('Gráfico e valores escondidos')
  expect(a.box.textContent).not.toContain('Fonte empresa')
  expect(a.box.textContent).not.toContain('Banco fictício')
  expect(a.box.textContent).not.toMatch(/\d[%]|0,04|2026-11-16/)
  expect(a.box.buscar(n => n.tagName === 'POLYLINE')).toHaveLength(0)
  const barra = a.box.buscar(n => n.getAttribute('class') === 'rumo-barra')[0]
  expect(barra.childNodes[0].style).toMatchObject({ width: '0%' })
  await a.click('Atualizar meus números')
  expect(a.box.textContent).not.toContain('Imóvel fictício')
  expect(a.box.buscar(n => (n.getAttribute('class') ?? '').startsWith('rumo-frescor ') && /verde|ambar|vermelho/.test(n.getAttribute('class')!))).toHaveLength(0)
})
it.each(['pessoa', 'equipe'] as const)('papel %s não monta nem busca dados financeiros', async papel => {
  const config = vi.fn(async (_f, _k, p) => p), buscar = vi.fn(async () => ({ entrada: entrada(), confirmar: [] }))
  const a = await montar(createElement(RumoA2029), { config, futuroEntradas: buscar }, { familia: { id: 'f', papel } as Ctx['familia'] })
  expect(a.box.textContent).toBe('')
  expect(config).not.toHaveBeenCalled(); expect(buscar).not.toHaveBeenCalled()
  await a.render({ familia: { id: 'f', papel: 'casal' } as Ctx['familia'] })
  expect(a.box.textContent).toContain('Rumo a 2029')
})
it('exemplo é identificado, não decide alerta de frescor e marca só na memória', async () => {
  const salvar = vi.fn(), e = comItens()
  const a = await montar(createElement(RumoA2029), { modo: 'exemplo', salvarConfig: salvar, futuroEntradas: async () => ({ entrada: e, confirmar: [] }), config: async (_f, k, p) => (String(k) === 'numeros_atualizados' ? { imoveis: { i: '2020-01-01' } } : p) as any })
  expect(a.box.textContent).toContain('Modo exemplo')
  expect(a.box.textContent).not.toContain('Há números com mais de 60 dias')
  await a.click('Atualizar meus números'); await a.click('Marcar como conferido hoje')
  expect(a.box.textContent).toContain('Conferido hoje')
  expect(salvar).not.toHaveBeenCalled()
})
it('erro de rede é diferente de vazio e oferece nova tentativa', async () => {
  const buscar = vi.fn(async () => { throw new Error('rede') })
  const a = await montar(createElement(RumoA2029), { futuroEntradas: buscar })
  expect(a.box.buscar(n => n.getAttribute('role') === 'alert')).toHaveLength(1)
  expect(a.box.textContent).toContain('Não foi possível calcular')
  await a.click('Tentar novamente')
  expect(buscar).toHaveBeenCalledTimes(2)
})
it('resumo compacto leva ao Planejamento e protege a porcentagem no olho fechado', async () => {
  const a = await montar(createElement(RumoA2029, { compacto: true }))
  expect(a.box.buscar(n => n.getAttribute('href') === '#/planejamento')).toHaveLength(1)
  expect(a.box.textContent).toContain('Rumo a 2029')
  await a.render({ oculto: true })
  expect(a.box.textContent).not.toMatch(/\d%/)
})
