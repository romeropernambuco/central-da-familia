import { act, createElement, Fragment, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { definirEscopoLeitura, invalidarDados, lerCompartilhado } from '../../app/invalidacao'
import { protegerApi } from '../../api/protegida'
import type { Api, FamiliaMinha, ResumoHoje } from '../../api/tipos'
import { ResumoFamilia, ResumoApresentacao, itensResumo } from '../../telas/inicio/ResumoFamilia'
import { useResumoFamilia } from '../../app/useResumoFamilia'
import { saldoDasContas } from './saldos'
import { totaisRecebimentos, recebimentosDoMes } from './recebimentos'
import { faturasAConferir } from './faturas'
import { totalImoveis } from './imoveis'
import { totaisGuardado } from './guardado'
import { totaisDoMes } from './movimentacao'
import { totalPendencias } from './pendencias'
import { totaisDesejos } from './desejos'
import { situacaoCasa } from './casa'
import { destaqueOrcamento } from './orcamento'
import { numerosRumo2029 } from './plano2029'
import { futuro, type FuturoEntrada } from '../futuro'
import { entradaDoCenario } from '../../app/useCenarioReceitas'
import { useNumerosAtualizados } from '../../app/useNumerosAtualizados'
import type { ResumoFamilia as Resumo } from './tipos'
import { normalizaGuardado } from '../../api/normaliza2'
import { DocumentoTeste, NoTeste } from '../../telas/escritorio/numeros.dom-teste'
import { ConferenciaCasa, ConferenciaFaturas } from '../../componentes/ConferenciasResumo'
import { SaldoConta } from '../../telas/planejamento/SaldoConta'
import { MeuOrcamento } from '../../telas/meu-orcamento/MeuOrcamento'
import { Inicio } from '../../telas/inicio/Inicio'
import { Casa } from '../../telas/casa/Casa'
import { projecao } from '../plano'
import * as orcamento from './orcamento'
import { CartaoGuardado } from '../../telas/guardado/CartaoGuardado'
import { ResumoDoMes } from '../../telas/lancamentos/Lancamentos'
import { RumoA2029 } from '../../componentes/RumoA2029'
import { Planejamento } from '../../telas/planejamento/Planejamento'
import * as plano2029 from './plano2029'
import { Recebimentos } from '../../telas/planejamento/Recebimentos'
import { Imoveis } from '../../telas/guardado/Imoveis'
import { PrecisaDeVoce } from '../../telas/escritorio/PrecisaDeVoce'
import { Desejos } from '../../telas/desejos/Desejos'
import { desfazer } from '../../app/desfazer'
import { FUSO, esconderValores, dataConferencia, plural, reais } from '../formato'
import { RitmoMes } from '../../componentes/RitmoMes'
import { enderecoDestino, lerDestino, destinoPermitido, focarDestino, type DestinoResumo } from '../../app/destinos'
import ts from 'typescript'
// @ts-ignore: Node é usado apenas neste teste, sem @types/node no app.
import { readFileSync } from 'node:fs'

const roots: Root[] = []
afterEach(async () => { for (const r of roots.splice(0)) await act(async () => r.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); esconderValores(false); desfazer.limpar() })
const hoje = '2026-11-17', mes = '2026-11'
function mundo(n = 1) {
  let gasto = 20 * n, total = 500 * n, pago = false, recebido = false, contou = false, feira = false, saldo = 100 * n
  const familia = { id: 'f', membroId: 'm', membroNome: 'Teste', nome: 'Fictícia', papel: 'casal', envelopeId: 'eu' } as FamiliaMinha
  const config: Record<string, any> = { fontes_receita: { r: { origem: 'empresa', certeza: 'garantido', recorrencia: 'mensal', fim: '2026-12' } }, receitas_controle: {}, entradas: [{ data: hoje, valor: 30 * n }] }
  const resumo = () => ({ hoje, explicacao: [], pode_gastar_hoje: 900, dias_restantes: 13, livre_mes: 100 - gasto, colchao: 0, envelopes: [{ id: 'eu', nome: 'Meu', regra: 'mensal', limite_mes: 100, gasto_mes: gasto, livre: 100 - gasto, hoje: 100 - gasto, meu: true }, { id: 'casa', nome: 'Casa', casa: true, hoje: 7, regra: 'mensal', limite_mes: 100, gasto_mes: 0, livre: 100 }] } as ResumoHoje)
  const recebimentos = () => [{ id: 'r', valor: 125 * n, certo: true, mes_previsto: '2026-10', mes_novo: null, descricao: 'Empresa', recebido_em: recebido ? hoje : null, valor_recebido: recebido ? 125 * n : null, meu: true, dono_membro: 'm', dono_nome: 'Teste', tipo: 'contrato' as const }]
  const gastos = () => [{ id: 'g', valor: gasto, data: hoje, envelope_id: 'eu', cartao_id: null, descricao: 'Gasto', criado_em: hoje, apagado_em: null }]
  const g = () => normalizaGuardado({ total, rendeu_hoje_liquido: n, rendeu_mes_liquido: 2 * n, rendeu_desde_inicio_liquido: 3 * n, aplicacoes: [{ id: 'a', saldo: total, nome: 'Aplicação', banco: 'Banco', tipo: 'cdb', titular: null }], por_dia_30: [], explicacao: [] }, hoje)
  const e = () => ({ precisa_total: 8, precisa_de_voce: feira ? [] : [{ id: 'feira_feita:2026-11-16', funcionario: 'fiscal', assunto: 'Conferir feira', opcoes: [], espera_dias: 1, vi: 'Conferir feira' }], funcionarios: [], entregue: [], trabalhando: [] })
  const fs = () => [{ cartao_id: 'c', cartao: 'Cartão', mes, vencimento: '2026-11-25', total: 40 * n, fechada: true }]
  const banco = () => [{ cartao_id: 'c', mes, valor_banco: 50 * n, paga_em: pago ? hoje : null }]
  const estoque = () => ({ itens: [{ id: 'arroz', nome: 'Arroz', categoria: 'alimento', ativo: true }], contagens: contou ? [{ id: 'ct', semana: '2026-11-16', data: hoje, contado_por: 'm', itens: [{ item_id: 'arroz', estado: 'acabou' as const }] }] : [] })
  const feiras = () => feira ? [{ id: 'feira', semana: '2026-11-16', data: hoje, tem_nota: false, sem_nota_motivo: null, loja: null, feita_por: 'm' }] : []
  const imoveis = [{ id: 'i', apelido: 'Casa', valor: 10000 * n, aluguel: 200, custos: 20, vacancia: '0.08', uso: 'aluga', tem_contrato: true, contrato_ate: '2030-12', meu: true, dono_membro: 'm', dono_nome: 'Teste' }] as any
  const desejos = [{ id: 'd', nome: 'Viagem', valor: 1, mes: '2028-12', situacao: 'pensando', volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false, meu: true, dono_membro: 'm', dono_nome: 'Teste' }] as any
  const contas = () => [{ id: 's', nome: 'Corrente', valor: saldo, conferidoEm: '2026-11-16' }]
  const entrada = (): FuturoEntrada => ({ hoje, saldo_caixa: saldo * 100, aplicacoes: [], recebimentos: [], compromissos: [], dividas: [], desvios: [], desejos: [], imoveis: [], parametros: { mes_base: mes, virada: '2029-01', gasto_2029_hoje: 300000, renda_certa_2029: 0, margem: '0.1', taxa_real_trabalho: '0.04', taxa_bruta_ano: { 2026: '0.12', 2027: '0.1', 2028: '0.09' }, ipca_ano: { 2026: '0.04', 2027: '0.04', 2028: '0.04' }, aliq_proj: '0.225', piso_meses: 6, teto_mes: 100000, mes_reajuste: 1 } })
  const interna = { modo: 'real', resumoHoje: vi.fn(async () => resumo()), lancamentos: vi.fn(async () => gastos()), guardadoHoje: vi.fn(async () => g()), futuroEntradas: vi.fn(async () => ({ entrada: entrada(), confirmar: [] })), faturas: vi.fn(async () => fs()), faturasBanco: vi.fn(async () => banco()), recebimentos: vi.fn(async () => recebimentos()), config: vi.fn(async (_f: string, k: string, padrao: unknown) => config[k] ?? padrao), salvarConfig: async (_f: string, k: string, v: unknown) => { config[k] = v }, escritorioHoje: vi.fn(async () => e()), estoque: vi.fn(async () => estoque()), feiras: vi.fn(async () => feiras()), imoveis: vi.fn(async () => imoveis), desejos: vi.fn(async () => desejos), saldosConta: vi.fn(async () => contas()), membros: async () => [],
    lancar: async () => { gasto += 10 }, faturaInformar: async () => { pago = true }, recebimentoMudar: async () => { recebido = true }, guardadoMovimentar: async () => { total += 100 }, feiraRegistrar: async () => { feira = true }, estoqueContar: async () => { contou = true }, salvarSaldoConta: async (_f: string, c: { valor: number }) => { saldo = c.valor },
    backupLer: async () => ({ gasto, total, pago, recebido, contou, feira, saldo }),
    backupRestaurar: async (_f: string, v: any) => { ({ gasto, total, pago, recebido, contou, feira, saldo } = v) },
  } as unknown as Api
  const api = protegerApi(interna)
  definirEscopoLeitura(api, 'sessao-ficticia', familia)
  return { api, interna, familia, resumo, config, recebimentos, gastos, g, e, fs, banco, estoque, feiras, imoveis, desejos, contas, entrada }
}
async function montar(m = mundo(), origem?: ReactNode, papel = 'casal', largura?: number) {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(hoje + 'T12:00:00Z'))
  const doc = new DocumentoTeste()
  Object.assign(NoTeste.prototype, { focus() {}, closest() { return null }, querySelectorAll() { return [] }, scrollIntoView() {} })
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc); vi.stubGlobal('window', Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }))
  if (largura !== undefined) window.matchMedia = consulta => Object.assign(new EventTarget(), { matches: largura >= Number(consulta.match(/\d+/)?.[0]) }) as MediaQueryList
  vi.stubGlobal('localStorage', { getItem: () => null, setItem() {} }); vi.stubGlobal('Element', NoTeste)
  vi.stubGlobal('location', { hash: '#/inicio' }); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} })
  const box = doc.createElement('div'); doc.body.appendChild(box)
  const root = createRoot(box as unknown as HTMLElement); roots.push(root)
  const familia = { ...m.familia, papel } as FamiliaMinha
  definirEscopoLeitura(m.api, 'sessao-ficticia', familia)
  let r!: Resumo
  function Captura() { r = useResumoFamilia().resumo; return null }
  let oculto = false
  const render = async () => { esconderValores(oculto); await act(async () => root.render(createElement(ContextoApp.Provider, { value: { api: m.api, familia, resumo: m.resumo(), versao: 0, oculto, tentar: async (f: () => Promise<unknown>) => { await f(); return true }, toast() {}, recarregar: async () => {}, abrirLancar() {}, sessao: { userId: 'sessao-ficticia', familias: [familia] } } as unknown as Ctx }, createElement(Fragment, null, papel === 'equipe' ? null : createElement(Captura), createElement(largura === undefined ? ResumoFamilia : Inicio), createElement('div', { 'data-origem': true }, origem))))) }
  await render()
  if (m.api.modo === 'exemplo') await act(async () => { await new Promise(r => setTimeout(r, 200)) })
  return { m, box, get r() { return r }, render, ocultar: async () => { oculto = !oculto; await render() }, bloco: (k: keyof Resumo) => box.buscar(x => x.getAttribute('data-bloco') === k)[0], origem: () => box.buscar(x => x.getAttribute('data-origem') === 'true')[0] }
}

it.each([1, 2, 3])('cada bloco usa o selector oficial, cenário %s', async n => {
  const m = mundo(n), a = await montar(m)
  expect(a.r.saldoConta.valor).toEqual({ unidade: 'reais', valor: saldoDasContas(m.contas()).valor })
  expect(a.r.podeGastarHoje.valor?.valor.valor).toBe(destaqueOrcamento(m.resumo(), 'eu', hoje, FUSO).valor)
  expect(a.r.aplicacoes.valor).toEqual({ unidade: 'reais', ...totaisGuardado(m.g()) })
  expect(a.r.imoveis.valor?.valor.valor).toBe(totalImoveis(m.imoveis))
  expect(a.r.faturas.valor).toEqual(faturasAConferir(m.fs(), m.banco(), hoje, '2026-12-17'))
  expect(a.r.recebimentos.valor).toEqual(recebimentosDoMes(m.recebimentos(), m.config.fontes_receita, {}, mes))
  expect(a.r.movimentacaoMes.valor).toEqual({ unidade: 'reais', ...totaisDoMes(mes, hoje, m.gastos(), m.recebimentos(), m.config.entradas) })
  expect(a.r.casa.valor).toEqual(situacaoCasa(m.e() as any, m.feiras(), m.estoque(), '2026-11-16'))
  expect(a.r.desejos.valor).toEqual(totaisDesejos(m.desejos))
  expect(a.r.pendencias.valor?.total).toBe(totalPendencias(m.e() as any))
  const ent = entradaDoCenario({ entrada: m.entrada(), confirmar: [] }, 'garantido')!
  expect(a.r.plano2029.valor).toEqual({ unidade: 'centavos', ...numerosRumo2029(futuro(ent), ent) })
  expect(a.r.saldoConta.conferidoEm).toBe('2026-11-16')
  expect(a.r.aplicacoes.conferidoEm).toBeNull()
  expect(a.bloco('saldoConta').textContent).toContain('Conferido em')
})

it.each([1, 2, 3])('f36: principal 2029 é a falta oficial com margem e coincide com o compacto, cenário %s', async n => {
  const a = await montar(mundo(n), createElement(RumoA2029, { compacto: true }))
  const principal = a.bloco('plano2029').buscar(x => x.getAttribute('class') === 'resumo-numero')[0].textContent
  const e = entradaDoCenario({ entrada: a.m.entrada(), confirmar: [] }, 'garantido')!
  const falta = numerosRumo2029(futuro(e), e).falta_com_margem!
  const numero = (Math.abs(falta) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  expect(principal).toContain(numero)
  const normalizar = (s: string) => s.replace(/[\s.]/g, '').replace(/,00/g, '')
  expect(normalizar(a.origem().textContent).toLowerCase()).toContain(normalizar(principal).toLowerCase().replace(/,00/g, ''))
  expect(a.bloco('plano2029').textContent).toContain('com margem de segurança')
  expect(a.bloco('plano2029').textContent).toContain('estimado')
})

it('f36: expansão local conserva o ritmo da aba, hoje já saiu, Casa e um único principal', async () => {
  const m = mundo()
  const base = m.resumo
  m.resumo = () => { const r = base(); Object.assign(r.envelopes[0], { ate_domingo: 838.12, gasto_hoje: 12.34 }); return r }
  ;(m.interna.resumoHoje as any).mockImplementation(async () => m.resumo())
  const a = await montar(m, createElement(RitmoMes, { e: m.resumo().envelopes[0] }))
  const bloco = a.bloco('podeGastarHoje')
  const principal = itensResumo(a.r, hoje, false).find(i => i.chave === 'podeGastarHoje')!.numero
  expect(bloco.textContent).not.toContain('Hoje já saiu')
  const abrir = bloco.buscar(x => x.tagName === 'BUTTON' && x.getAttribute('aria-expanded') === 'false')[0]
  expect(abrir).toBeDefined()
  await act(async () => abrir.click())
  // Aguarda o chunk do gráfico; mantém a mesma verificação após Suspense.
  for (let i = 0; i < 30 && !bloco.textContent.includes('Ainda pode gastar até domingo'); i++)
    await act(async () => { await new Promise(r => setTimeout(r, 10)) })
  expect(abrir.getAttribute('aria-expanded')).toBe('true')
  expect(bloco.textContent).toContain('Ainda pode gastar até domingo')
  expect(bloco.textContent).toContain('838,12')
  expect(bloco.textContent).toContain('Hoje já saiu')
  expect(bloco.textContent).toContain('12,34')
  expect(bloco.textContent).toContain('Ritmo do mês')
  expect(bloco.textContent).toContain(a.origem().textContent)
  expect(bloco.textContent).toContain('Casa · disponível hoje')
  expect(a.box.textContent.split(principal)).toHaveLength(2)
  await a.ocultar()
  expect(bloco.textContent).not.toMatch(/838,12|12,34|80,00/)
  expect(bloco.buscar(x => x.getAttribute('role') === 'img')).toHaveLength(0)
  await act(async () => abrir.click())
  expect(bloco.textContent).not.toContain('Hoje já saiu')
})

it('f36: Rendeu hoje líquido coincide com CartaoGuardado', async () => {
  const m = mundo(3), base = m.g
  m.g = () => ({ ...base(), rendeu_hoje_liquido: 3.27 })
  ;(m.interna.guardadoHoje as any).mockImplementation(async () => m.g())
  const a = await montar(m, createElement(CartaoGuardado))
  expect(a.bloco('aplicacoes').textContent).toContain('Rendeu hoje')
  const normalizar = (s: string) => s.replace(/[\s.]/g, '').replace(/,00/g, '')
  const esperado = normalizar(`Rendeu hoje ${totaisGuardado(a.m.g()).hoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
  const frase = a.bloco('aplicacoes').buscar(x => x.getAttribute('class') === 'resumo-frase')[0]
  expect(normalizar(frase.textContent)).toBe(`${esperado}líquido`)
  const rendimento = a.origem().buscar(x => x.getAttribute('class') === 'guard-l dest')[0]
  expect(normalizar(rendimento.textContent)).toBe(esperado)
})

function mundoComEnvelopes() {
  const m = mundo()
  const base = m.resumo
  m.resumo = () => {
    const r = base()
    Object.assign(r.envelopes[0], { regra: 'diario', hoje: 101.33, valor_dia: 101.33, limite_mes: 620.18, gasto_mes: 120.12, livre: 500.06 })
    Object.assign(r.envelopes[1], { nome: 'Feira de teste', regra: 'semanal', teto_semana: 181.51, gasto_semana: 32.37, hoje: 24.86, livre: 305.78 })
    r.envelopes.push({ id: 'outro', nome: 'Outro titular', regra: 'diario', limite_mes: 740.14, gasto_mes: 346.78, livre: 393.36, hoje: 61.02, valor_dia: 61.02 })
    r.placar_casal = r.envelopes.filter(e => !e.casa).map(e => ({ nome: e.nome, eu: e.id === 'eu', limite: e.limite_mes, gasto: e.gasto_mes, fecha: projecao(e.gasto_mes, e.limite_mes, hoje).fecha }))
    return r
  }
  vi.mocked(m.interna.resumoHoje).mockImplementation(async () => m.resumo())
  m.interna.avisosCasa = async () => []
  return m
}

const envelope = (box: NoTeste, classe: string) => box.buscar(x => x.getAttribute('class') === `card env ${classe}`)
const expandir = async (bloco: NoTeste) => {
  const botao = bloco.buscar(x => x.tagName === 'BUTTON' && x.getAttribute('aria-expanded') === 'false')[0]
  expect(botao).toBeDefined()
  await act(async () => botao.click())
}

it.each(['eu', 'outro'])('f37: envelope %s, disponível, limite, gasto e livre vêm do Meu orçamento', async id => {
  const m = mundoComEnvelopes()
  const e = m.resumo().envelopes.find(e => e.id === id)!
  const a = await montar(m, createElement(MeuOrcamento), 'casal', 1024)
  if (id === 'outro') {
    const botao = a.origem().buscar(x => x.tagName === 'BUTTON' && x.getAttribute('class') === 'pill' && x.textContent.startsWith(e.nome))[0]
    expect(botao).toBeDefined()
    await act(async () => botao.click())
  }
  const cartao = envelope(a.box, id === 'eu' ? 'env-destaque' : 'env-compacto').find(x => x.textContent.includes(e.nome))!
  expect(cartao).toBeDefined()
  const moeda = (v: number) => reais(v).replace(/\s/g, '')
  for (const n of [e.limite_mes, e.gasto_mes, e.livre]) {
    expect(cartao.textContent.replace(/\s/g, '')).toContain(moeda(n))
    expect(a.origem().textContent.replace(/\s/g, '')).toContain(moeda(n))
  }
  const valorInicio = id === 'eu' ? a.bloco('podeGastarHoje') : cartao
  expect(valorInicio.textContent.replace(/\s/g, '')).toContain(moeda(e.hoje!))
  expect(a.origem().buscar(x => x.getAttribute('aria-label') === reais(e.hoje!)).length).toBeGreaterThan(0)
  if (id === 'eu') {
    await expandir(a.bloco('podeGastarHoje'))
    const inicio = a.box.buscar(x => x.getAttribute('class') === 'view inicio-f29')[0]
    expect(inicio.textContent.match(/101,33/g)).toHaveLength(1)
    expect(inicio.textContent.match(/Hoje você pode gastar/g)).toHaveLength(1)
  }
})

it('f37: placar em Início traz as mesmas projeções dos dois orçamentos', async () => {
  const m = mundoComEnvelopes()
  const r = m.resumo()
  const a = await montar(m, createElement(MeuOrcamento), 'casal', 1024)
  const placar = a.box.buscar(x => x.tagName === 'SECTION' && x.getAttribute('class') === 'placar ok')[0]
  expect(placar.textContent).toContain('O casal, se continuar assim')
  for (const p of r.placar_casal!) {
    expect(placar.buscar(x => x.tagName === 'LI' && x.textContent.startsWith(p.nome))[0].buscar(x => x.getAttribute('aria-label') === reais(p.fecha))).toHaveLength(1)
    const botao = a.origem().buscar(x => x.tagName === 'BUTTON' && x.getAttribute('class') === 'pill' && x.textContent.startsWith(p.nome))[0]
    await act(async () => botao.click())
    expect(a.origem().textContent).toContain(`${reais(p.fecha)} de ${reais(p.limite)}`)
  }
})

it('f37: a linha diária e o livre semanal da Casa coincidem com a aba Casa', async () => {
  const a = await montar(mundoComEnvelopes(), createElement(Casa), 'casal', 1024)
  await expandir(a.bloco('podeGastarHoje'))
  const linha = (no: NoTeste) => no.buscar(x => x.getAttribute('class') === 'resumo-casa')[0].textContent
  expect(linha(a.bloco('podeGastarHoje'))).toEqual(linha(a.origem()))
  expect(linha(a.origem())).toContain('24,86')
  const semanal = reais(149.14)
  expect(a.origem().buscar(x => x.getAttribute('aria-label') === semanal)).toHaveLength(1)
  expect(envelope(a.box, 'env-compacto').find(x => x.textContent.includes('Feira de teste'))!.buscar(x => x.getAttribute('aria-label') === semanal)).toHaveLength(1)
})

it('f37: o Início renderiza os valores sentinela dos seletores de envelope e Casa', async () => {
  const selecionar = orcamento.numeroEnvelope
  vi.spyOn(orcamento, 'numeroEnvelope').mockImplementation((e, ...args) => ({ ...selecionar(e, ...args), valor: 8765.43 }))
  vi.spyOn(orcamento, 'disponivelHojeCasa').mockReturnValue(7654.32)
  const a = await montar(mundoComEnvelopes(), undefined, 'casal', 1024)
  await expandir(a.bloco('podeGastarHoje'))
  const feira = envelope(a.box, 'env-compacto').find(x => x.textContent.includes('Feira de teste'))!
  expect(feira.textContent).toContain('8.765,43')
  expect(a.bloco('podeGastarHoje').textContent).toContain('7.654,32')
})

it('f37: placar e detalhe de 2029 renderizam as projeções sentinela', async () => {
  const selecionarPlacar = orcamento.projecaoCasal
  vi.spyOn(orcamento, 'projecaoCasal').mockImplementation(placar => ({ ...selecionarPlacar(placar)!, sobra: 6543.21 }))
  const numerar = plano2029.numerosRumo2029
  vi.spyOn(plano2029, 'numerosRumo2029').mockImplementation((...args) => ({ ...numerar(...args), falta_sem_margem: 543210 }))
  const a = await montar(mundoComEnvelopes(), undefined, 'casal', 1024)
  expect(a.box.buscar(x => x.getAttribute('class') === 'placar ok')[0].textContent).toContain('6.543,21')
  const plano = a.bloco('plano2029')
  await expandir(plano)
  expect(plano.textContent).toContain('5.432,10')
})

it('f37: estouro do envelope em Início coincide com Meu orçamento', async () => {
  const m = mundoComEnvelopes()
  const base = m.resumo
  m.resumo = () => {
    const r = base()
    const e = r.envelopes.find(e => e.id === 'outro')!
    Object.assign(e, { gasto_mes: 771.30, livre: -31.16 })
    return r
  }
  const a = await montar(m, createElement(MeuOrcamento), 'casal', 1024)
  const botao = a.origem().buscar(x => x.getAttribute('class') === 'pill' && x.textContent.startsWith('Outro titular'))[0]
  await act(async () => botao.click())
  const excesso = reais(31.16)
  const cartao = envelope(a.box, 'env-compacto').find(x => x.textContent.includes('Outro titular'))!
  expect(cartao.textContent).toMatch(/fica devendo/)
  expect(cartao.buscar(x => x.getAttribute('aria-label') === excesso)).toHaveLength(1)
  expect(a.origem().buscar(x => x.getAttribute('aria-label') === excesso).length).toBeGreaterThan(0)
})

it('f37: Plano expande o valor sem margem da aba Planejamento e preserva o principal', async () => {
  const a = await montar(mundoComEnvelopes(), createElement(Planejamento), 'casal', 1024)
  const bloco = a.bloco('plano2029')
  const principal = bloco.buscar(x => x.getAttribute('class') === 'resumo-numero')[0].textContent
  expect(principal).toContain('por mês')
  expect(bloco.textContent).toContain('com margem de segurança')
  expect(bloco.textContent).not.toContain('Sem a margem de segurança')
  await expandir(bloco)
  const semMargem = (no: NoTeste) => no.buscar(x => x.tagName === 'SPAN' && x.textContent.startsWith('Sem a margem de segurança'))[0].textContent
  expect(semMargem(bloco)).toEqual(semMargem(a.origem()))
  expect(bloco.buscar(x => x.getAttribute('class') === 'resumo-numero')[0].textContent).toBe(principal)
})

it('f37: o casal vê os cartões, a pessoa só o próprio e o Assessor não consulta o Início', async () => {
  const casal = await montar(mundoComEnvelopes(), undefined, 'casal', 1024)
  expect(envelope(casal.box, 'env-compacto')).toHaveLength(2)
  expect(casal.box.textContent).toContain('O casal, se continuar assim')
  const pessoa = await montar(mundoComEnvelopes(), undefined, 'pessoa', 1024)
  expect(envelope(pessoa.box, 'env-destaque')).toHaveLength(1)
  expect(envelope(pessoa.box, 'env-compacto')).toHaveLength(0)
  await expandir(pessoa.bloco('podeGastarHoje'))
  expect(pessoa.box.textContent).not.toMatch(/Outro titular|Feira de teste|O casal, se continuar assim|Casa · disponível hoje/)
  const assessor = await montar(mundoComEnvelopes(), undefined, 'equipe', 1024)
  expect(assessor.box.textContent).toBe('')
  for (const consulta of [assessor.m.interna.resumoHoje, assessor.m.interna.config, assessor.m.interna.lancamentos, assessor.m.interna.futuroEntradas]) expect(consulta).not.toHaveBeenCalled()
})

it('f37: olho fechado remove valores e geometria dos envelopes e do placar', async () => {
  const a = await montar(mundoComEnvelopes(), undefined, 'casal', 1024)
  await expandir(a.bloco('podeGastarHoje'))
  await expandir(a.bloco('plano2029'))
  expect(a.box.textContent).toContain('O casal, se continuar assim')
  expect(a.box.buscar(x => x.getAttribute('class')?.startsWith('meter ') ?? false)).toHaveLength(3)
  await a.ocultar()
  const orcamento = a.box.buscar(x => x.getAttribute('class') === 'resumo-item resumo-orcamento')[0]
  expect(orcamento.textContent.match(/Valores escondidos/g)).toHaveLength(4)
  expect(orcamento.textContent).not.toMatch(/\d|Outro titular|Feira de teste|fecha com|vai passar/)
  expect(orcamento.buscar(no => [...no.atributos].some(([k, v]) => ['style', 'value', 'data-do-outro'].includes(k) || k.startsWith('aria-') && /%|R\$|101,33|Outro titular/.test(v)))).toHaveLength(0)
  expect(a.bloco('podeGastarHoje').textContent).not.toMatch(/101,33|24,86/)
  expect(a.bloco('plano2029').textContent).not.toContain('Sem a margem de segurança')
})

it.each([[375, false], [799, false], [800, true], [1280, true]])('f37: em %d px o estado inicial da seção é %s', async (largura, aberto) => {
  const a = await montar(mundoComEnvelopes(), undefined, 'casal', largura)
  const botao = a.box.buscar(x => x.tagName === 'BUTTON' && x.textContent.trim() === 'Seu orçamento e envelopes')[0]
  expect(botao.getAttribute('aria-expanded')).toBe(String(aberto))
  expect(envelope(a.box, 'env-destaque')).toHaveLength(aberto ? 1 : 0)
})

it('f37: lembra a escolha ao remontar a tela durante a sessão', async () => {
  const m = mundoComEnvelopes()
  m.familia.membroId = 'memoria-f37'
  const a = await montar(m, undefined, 'casal', 375)
  const botao = (box: NoTeste) => box.buscar(x => x.tagName === 'BUTTON' && x.textContent.trim() === 'Seu orçamento e envelopes')[0]
  expect(botao(a.box).getAttribute('aria-expanded')).toBe('false')
  await act(async () => botao(a.box).click())
  const b = await montar(m, undefined, 'casal', 375)
  expect(botao(b.box).getAttribute('aria-expanded')).toBe('true')
})

it('f37: reserva espaço durante a carga e mantém links e expansão em regiões irmãs', async () => {
  const m = mundoComEnvelopes()
  let resolver!: (r: ResumoHoje) => void
  vi.mocked(m.interna.resumoHoje).mockReturnValue(new Promise(r => { resolver = r }))
  const a = await montar(m, undefined, 'casal', 1024)
  const bloco = a.bloco('podeGastarHoje')
  expect(bloco.getAttribute('data-estado')).toBe('carregando')
  expect(bloco.buscar(x => x.getAttribute('class') === 'resumo-esqueleto')[0].textContent).toContain('Conferindo')
  const estilos = readFileSync('src/telas/inicio/resumo.css', 'utf8')
  expect(estilos).toMatch(/\.resumo-item\s*\{[^}]*min-block-size:\s*var\(--resumo-altura\)/)
  expect(a.box.buscar(x => x.getAttribute('class') === 'resumo-coluna')).toHaveLength(2)
  await act(async () => resolver(m.resumo()))
  await expandir(bloco)
  const controles = bloco.buscar(x => x.tagName === 'A' || x.tagName === 'BUTTON')
  expect(controles.length).toBeGreaterThanOrEqual(3)
  for (const no of controles) expect(no.buscar(x => x !== no && controles.includes(x))).toHaveLength(0)
  expect(controles[0].parentNode).toBe(controles[1].parentNode)
})

it('f36: nota única de conferência, saldo claro e ícones explícitos nos onze blocos', async () => {
  const m = mundo(); (m.interna.saldosConta as any).mockResolvedValue([])
  const a = await montar(m)
  expect(a.box.textContent.match(/Nenhum número conferido manualmente ainda/g)).toHaveLength(1)
  expect(a.box.textContent).not.toContain('Sem conferência registrada')
  expect(a.bloco('saldoConta').textContent).toContain('Ainda sem dado')
  expect(a.bloco('saldoConta').textContent.match(/Saldo em conta/g)).toHaveLength(1)
  expect(a.bloco('saldoConta').buscar(x => x.tagName === 'BUTTON')[0].getAttribute('class')).toContain('primary')
  for (const k of Object.keys(a.r) as (keyof Resumo)[]) {
    const chip = a.bloco(k).buscar(x => x.getAttribute('class') === 'resumo-icone')[0]
    const svg = chip.buscar(x => x.tagName === 'SVG')[0]
    expect(Number(svg.getAttribute('width'))).toBeGreaterThan(0)
    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(0)
    const css = readFileSync('src/telas/inicio/resumo.css', 'utf8')
    expect(css).toContain('min-width:20px;min-height:20px')
  }
})

it.each(['2026-11-17', '2025-12-31', '2026-01-01T00:30:00Z'])('f36: data de conferência única no Início e Planejamento: %s', async data => {
  const m = mundo(); (m.interna.saldosConta as any).mockResolvedValue([{ id: 's', nome: 'Conta', valor: 100, conferidoEm: data.slice(0, 10) }])
  const a = await montar(m, createElement(SaldoConta))
  const esperado = data.startsWith('2025') ? '31/12/2025' : data.includes('01-01') ? '01/01' : '17/11'
  expect(dataConferencia(data, hoje)).toBe(esperado)
  expect(a.bloco('saldoConta').textContent).toContain(`Conferido em ${esperado}`)
  expect(a.origem().textContent).toContain(`Conferido em ${esperado}`)
  expect(a.origem().textContent).not.toContain(data.slice(0, 10))
})

it.each([0, 1, 2])('f36: plural compartilhado e texto curto nos blocos, quantidade %s', async n => {
  const a = await montar()
  const r = structuredClone(a.r)
  if (r.casa.valor) Object.assign(r.casa.valor, { feira: n === 1, nota: n, estoque: true })
  if (r.recebimentos.valor) r.recebimentos.valor.atrasados = n
  if (r.desejos.valor) Object.assign(r.desejos.valor, { pensando: 2, combinados: n })
  const itens = itensResumo(r, hoje, false)
  expect(plural(n, 'nota pendente', 'notas pendentes')).toBe(`${n} ${n === 1 ? 'nota pendente' : 'notas pendentes'}`)
  expect(itens.find(i => i.chave === 'casa')!.numero).toBe(n === 1 ? 'Feira ainda sem confirmação' : 'Feira em dia')
  expect(itens.find(i => i.chave === 'casa')!.frase).toBe(`${n} ${n === 1 ? 'nota pendente' : 'notas pendentes'}\nEstoque: contagem pendente`)
  expect(itens.find(i => i.chave === 'recebimentos')!.frase).toContain(`${n} ${n === 1 ? 'atrasado.' : 'atrasados.'}`)
  expect(itens.find(i => i.chave === 'desejos')!.numero).toBe(`2 pensando · ${n} ${n === 1 ? 'combinado' : 'combinados'}`)
})

it('f36: formulário de saldo tem rótulos, exemplo, foco inicial, Esc e devolução de foco', async () => {
  const a = await montar()
  const doc = a.box.ownerDocument
  Object.defineProperty(doc, 'activeElement', { value: null, writable: true, configurable: true })
  Object.assign(doc, { contains: (n: NoTeste) => doc.buscar(x => x === n).length > 0 })
  Object.assign(NoTeste.prototype, { focus(this: NoTeste) { Object.assign(doc, { activeElement: this }) } })
  const teclado = new EventTarget()
  doc.addEventListener = teclado.addEventListener.bind(teclado) as any
  doc.removeEventListener = teclado.removeEventListener.bind(teclado) as any
  const botao = a.bloco('saldoConta').buscar(x => x.tagName === 'BUTTON')[0]
  ;(botao as any).focus()
  await act(async () => botao.click())
  const dialogo = a.box.buscar(x => x.getAttribute('role') === 'dialog')[0]
  expect(dialogo.getAttribute('aria-modal')).toBe('true')
  const conta = dialogo.buscar(x => x.tagName === 'INPUT' && x.getAttribute('placeholder') === 'Conta corrente')[0]
  expect(conta).toBeDefined()
  expect(conta.parentNode!.buscar(x => x.tagName === 'SPAN')[0].textContent).toBe('Conta')
  expect(doc.activeElement).toBe(conta)
  const valor = dialogo.buscar(x => x.tagName === 'INPUT' && x.getAttribute('aria-label') === 'Saldo em conta')[0]
  expect(dialogo.buscar(x => x.tagName === 'LABEL' && x.getAttribute('for') === valor.getAttribute('id'))[0].textContent).toBe('Saldo em conta')
  expect(valor.parentNode?.textContent).toBe('R$')
  expect(dialogo.buscar(x => x.tagName === 'LABEL' && x.textContent === 'Data da conferência')).toHaveLength(1)
  await act(async () => teclado.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Escape' })))
  expect(a.box.buscar(x => x.getAttribute('role') === 'dialog')).toHaveLength(0)
  expect(doc.activeElement).toBe(botao)
})

it('f36: tarefa tocável e fila completa têm destinos explícitos no Início', async () => {
  const a = await montar()
  const links = a.bloco('pendencias').buscar(x => x.tagName === 'A')
  expect(lerDestino(links[0].getAttribute('href')!)).toMatchObject({ rota: 'escritorio', secao: 'tarefa', entidade: a.m.e().precisa_de_voce[0].id })
  expect(links[1].textContent).toBe('Ver fila no Escritório')
  expect(links[1].getAttribute('href')).toBe('#/escritorio')
  expect(a.bloco('pendencias').textContent).toContain('8 na fila')
})

const origens = [
  ['saldoConta', () => createElement(SaldoConta)], ['podeGastarHoje', () => createElement(MeuOrcamento)], ['aplicacoes', () => createElement(CartaoGuardado)], ['faturas', () => createElement(ConferenciaFaturas)], ['casa', () => createElement(ConferenciaCasa)], ['movimentacaoMes', () => createElement(ResumoDoMes)], ['plano2029', () => createElement(RumoA2029, { compacto: true })], ['recebimentos', () => createElement(Recebimentos)], ['imoveis', () => createElement(Imoveis, { aplicado: 500 })], ['pendencias', () => createElement(PrecisaDeVoce)], ['desejos', () => createElement(Desejos)],
] as const
it.each(origens.flatMap(([chave, criar]) => [1, 2, 3].map(n => [chave, criar, n] as const)))('renderiza resumo e origem para %s, cenário %s', async (chave, criar, n) => {
  const a = await montar(mundo(n), criar())
  const item = itensResumo(a.r, hoje, false).find(i => i.chave === chave)!
  // Componentes antigos separam inteiro e centavos em spans; compara texto monetário normalizado.
  const normalizar = (s: string) => s.replace(/[\s.]/g, '')
  if (chave === 'casa') expect(a.origem().textContent).toContain('Feira ainda sem confirmação')
  else if (chave === 'pendencias') expect(a.origem().textContent).toContain('8')
  else if (chave === 'desejos') { expect(a.origem().textContent).toContain('Viagem'); expect(a.origem().textContent).toContain(item.numero) }
  else if (chave === 'plano2029') expect(a.origem().textContent).toContain('2029')
  else expect(normalizar(a.origem().textContent)).toContain(normalizar(item.numero).replace(/,00$/, ''))
  expect(a.bloco(chave).textContent).toContain(item.numero)
})

const falhas = [ ['resumoHoje', ['podeGastarHoje']], ['guardadoHoje', ['aplicacoes']], ['faturas', ['faturas']], ['faturasBanco', ['faturas']], ['recebimentos', ['recebimentos', 'movimentacaoMes']], ['futuroEntradas', ['plano2029']], ['estoque', ['casa']], ['feiras', ['casa']], ['escritorioHoje', ['casa', 'pendencias']], ['imoveis', ['imoveis']], ['lancamentos', ['movimentacaoMes']], ['desejos', ['desejos']], ['saldosConta', ['saldoConta']] ] as const
it.each(falhas)('falha isolada de %s não vira zero nem exemplo', async (metodo, afetados) => {
  const m = mundo(); (m.interna[metodo] as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fora do ar'))
  const a = await montar(m)
  for (const k of Object.keys(a.r) as (keyof Resumo)[]) {
    if ((afetados as readonly string[]).includes(k)) { expect(a.r[k].estado, k).toBe('erro'); expect(a.r[k].valor).toBeNull(); expect(a.bloco(k).textContent).toContain('Não foi possível conferir'); expect(a.bloco(k).textContent).not.toMatch(/R\$|Nenhum|Modo exemplo/) }
    else expect(a.r[k].estado, k).toBe('pronto')
  }
})

it('carregamento independente, resposta antiga descartada e repetição só do bloco', async () => {
  const m = mundo(); let resolver!: (v: any) => void
  ;(m.interna.guardadoHoje as ReturnType<typeof vi.fn>).mockImplementationOnce(() => new Promise(r => { resolver = r }))
  const a = await montar(m)
  expect(a.r.aplicacoes.estado).toBe('carregando'); expect(a.r.podeGastarHoje.estado).toBe('pronto')
  const chamadas = (m.interna.resumoHoje as ReturnType<typeof vi.fn>).mock.calls.length
  await act(async () => { invalidarDados(m.api, 'f', ['guardado']) })
  expect(a.r.aplicacoes.valor?.total).toBe(500)
  await act(async () => resolver({ ...m.g(), total: 99999 }))
  expect(a.r.aplicacoes.valor?.total).toBe(500)
  ;(m.interna.guardadoHoje as ReturnType<typeof vi.fn>).mockRejectedValueOnce(Error('Rede'))
  await act(async () => invalidarDados(m.api, 'f', ['guardado']))
  expect(a.r.aplicacoes.valor).toBeNull()
  await act(async () => a.bloco('aplicacoes').buscar(x => x.tagName === 'BUTTON')[0].click())
  expect(a.r.aplicacoes.valor?.total).toBe(500)
  expect((m.interna.resumoHoje as ReturnType<typeof vi.fn>).mock.calls.length).toBe(chamadas)
})

it.each(['equipe', 'pessoa'])('papel %s bloqueia fontes do casal antes da leitura', async papel => {
  const m = mundo(); const a = await montar(m, undefined, papel)
  for (const metodo of ['guardadoHoje', 'futuroEntradas', 'saldosConta', 'imoveis', 'faturas', 'faturasBanco', 'recebimentos'] as const) expect(m.interna[metodo]).not.toHaveBeenCalled()
  if (papel === 'equipe') { expect(a.box.textContent).toBe(''); expect(m.interna.resumoHoje).not.toHaveBeenCalled(); expect(m.interna.config).not.toHaveBeenCalled() }
  else { expect(a.r.podeGastarHoje.estado).toBe('pronto'); expect(a.r.plano2029.estado).toBe('restrito'); expect(a.box.textContent).not.toMatch(/Plano 2029|Imóveis|Aplicações/) }
})

it('pessoa sem envelope próprio não recebe o disponível geral como substituto', async () => {
  const m = mundo(); m.familia.envelopeId = null
  const a = await montar(m, undefined, 'pessoa')
  expect(a.r.podeGastarHoje.estado).toBe('erro')
  expect(a.r.podeGastarHoje.valor).toBeNull()
  expect(a.box.textContent).not.toContain('900')
})

it('olho mascara texto, atributos, proporções e não mantém valor anterior como atual', async () => {
  const a = await montar(mundo(3))
  const aberto = itensResumo(a.r, hoje, false).map(i => i.numero).filter(s => s.startsWith('R$'))
  await a.ocultar()
  const html = renderToStaticMarkup(createElement(ResumoApresentacao, { resumo: a.r, hoje, oculto: true, repetir() {} }))
  for (const numero of aberto) expect(html).not.toContain(numero)
  expect(html.replace(/href="[^"]*"/g, '')).not.toMatch(/%|width:|aria-label="R\$|title="R\$/)
  expect(html).toContain('••••')
  await a.ocultar(); expect(a.bloco('saldoConta').textContent).toContain('300')
})

it('C4: funcionário abandona soma-base e usa todas as ocorrências', async () => {
  const { numerosDaAba } = await import('../../telas/escritorio/numeros')
  const m = mundo(), r = await numerosDaAba(m.api, m.familia, 'planejamento')
  expect(r[1].valor).toBe(totaisRecebimentos(m.recebimentos(), m.config.fontes_receita, {}).previsto)
  expect(r[1].valor).toBe(375)
})

it.each(['guardadoHoje', 'resumoHoje', 'estoque', 'faturasBanco', 'saldosConta', 'imoveis', 'recebimentos', 'faturas'])('contrato incompleto de %s é erro, não zero', async metodo => {
  const m = mundo(); (m.interna[metodo as keyof Api] as ReturnType<typeof vi.fn>).mockResolvedValue({})
  const a = await montar(m)
  const chave = ({ guardadoHoje: 'aplicacoes', resumoHoje: 'podeGastarHoje', estoque: 'casa', faturasBanco: 'faturas', saldosConta: 'saldoConta', imoveis: 'imoveis', recebimentos: 'recebimentos', faturas: 'faturas' } as const)[metodo as 'guardadoHoje']
  expect(a.r[chave].estado).toBe('erro'); expect(a.r[chave].valor).toBeNull()
})

it.each(['fontes_receita', 'receitas_controle', 'entradas'])('falha de config %s fica no bloco dependente', async chave => {
  const m = mundo()
  ;(m.interna.config as ReturnType<typeof vi.fn>).mockImplementation(async (_f: string, k: string, padrao: unknown) => {
    if (k === chave) throw Error('Sem leitura')
    return m.config[k] ?? padrao
  })
  const a = await montar(m)
  expect(a.r[chave === 'entradas' ? 'movimentacaoMes' : 'recebimentos'].estado).toBe('erro')
  expect(a.r.podeGastarHoje.estado).toBe('pronto'); expect(a.r.aplicacoes.estado).toBe('pronto'); expect(a.r.plano2029.estado).toBe('pronto')
})

it.each([
  ['gasto', 'podeGastarHoje', (a: Api) => a.lancar({ familia: 'f', envelope: 'eu', valor: 10, data: hoje, descricao: '', chave: 'k' })],
  ['fatura', 'faturas', (a: Api) => a.faturaInformar('f', 'c', mes, { paga_em: hoje, valor_banco: 50 })],
  ['recebimento', 'recebimentos', (a: Api) => a.recebimentoMudar!('f', 'r', { recebido: true } as any)],
  ['aplicação', 'aplicacoes', (a: Api) => a.guardadoMovimentar('a', 'aporte', 100, hoje, 'k')],
  ['feira', 'casa', (a: Api) => a.feiraRegistrar('f', { data: hoje })],
  ['estoque', 'casa', (a: Api) => a.estoqueContar('f', [{ item_id: 'arroz', estado: 'acabou' }])],
  ['saldo', 'saldoConta', (a: Api) => a.salvarSaldoConta!('f', { id: 's', nome: 'Conta', valor: 4321, conferidoEm: hoje })],
] as const)('ação %s invalida e atualiza resumo junto da leitura da aba', async (_nome, chave, acao) => {
  const m = mundo(); m.interna.modo = 'exemplo'
  const a = await montar(m)
  const antes = structuredClone(a.r[chave].valor)
  await act(async () => { await acao(m.api) })
  expect(a.r[chave].estado).toBe('pronto')
  expect(a.r[chave].valor).not.toEqual(antes)
  if (chave === 'saldoConta') expect(a.r.plano2029.valor).toEqual({ unidade: 'centavos', ...numerosRumo2029(futuro(m.entrada()), m.entrada()) })
  // Consulta concorrente de outra superfície usa o mesmo cache da borda.
  const extra = await montar(m, origens.find(([k]) => k === chave)![1]())
  expect(extra.r[chave].valor).toEqual(a.r[chave].valor)
  expect(desfazer.atual).not.toBeNull()
  await act(async () => { await desfazer.atual!.desfazer() })
  expect(a.r[chave].valor).toEqual(antes)
  expect(extra.r[chave].valor).toEqual(antes)
})

it('destinos dos onze blocos preservam seção, entidade e período com permissões', async () => {
  const a = await montar()
  const itens = itensResumo(a.r, hoje, false)
  expect(itens.map(i => [i.chave, i.destino.rota, i.destino.secao])).toEqual([
    ['saldoConta', 'planejamento', 'saldo'], ['podeGastarHoje', 'orcamento', 'orcamento'], ['faturas', 'cartoes', 'fatura'], ['aplicacoes', 'guardado', 'aplicacoes'], ['recebimentos', 'planejamento', 'recebimentos'], ['plano2029', 'planejamento', 'plano2029'], ['casa', 'escritorio', 'tarefa'], ['imoveis', 'guardado', 'imoveis'], ['movimentacaoMes', 'lancamentos', 'mes'], ['desejos', 'desejos', 'desejo'], ['pendencias', 'escritorio', 'tarefa'],
  ])
  for (const i of itens) {
    expect(lerDestino(enderecoDestino(i.destino))).toEqual(i.destino)
    expect(a.bloco(i.chave).buscar(x => x.tagName === 'A')[0].getAttribute('href')).toBe(enderecoDestino(i.destino))
    expect(destinoPermitido(i.destino, 'casal')).toBe(true)
    expect(destinoPermitido(i.destino, 'equipe')).toBe(false)
  }
  expect(itens.find(i => i.chave === 'faturas')!.destino).toMatchObject({ entidade: 'c', periodo: mes })
  expect(itens.find(i => i.chave === 'recebimentos')!.destino.periodo).toBe(mes)
})

it('foco e rolagem aguardam entidade de uma seção carregada depois (lazy)', () => {
  let mudou!: () => void, elementos: any[] = []
  const disconnect = vi.fn()
  vi.stubGlobal('MutationObserver', class { constructor(f: () => void) { mudou = f } observe() {} disconnect = disconnect })
  const destino: DestinoResumo = { rota: 'cartoes', secao: 'fatura', entidade: 'cartao-2', periodo: mes }
  const raiz = { querySelectorAll: () => elementos } as unknown as HTMLElement
  const parar = focarDestino(destino, raiz)
  const outro = { dataset: { secao: 'fatura', entidade: 'cartao-1', periodo: mes }, focus: vi.fn(), scrollIntoView: vi.fn() }
  elementos = [outro]; mudou(); expect(outro.focus).not.toHaveBeenCalled()
  const alvo = { ...outro, dataset: { secao: 'fatura', entidade: 'cartao-2', periodo: mes }, focus: vi.fn(), scrollIntoView: vi.fn() }
  elementos.push(alvo); mudou()
  expect(alvo.focus).toHaveBeenCalledWith({ preventScroll: true }); expect(alvo.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' })
  mudou(); expect(alvo.focus).toHaveBeenCalledTimes(1)
  parar(); expect(disconnect).toHaveBeenCalledOnce()
})

it('sem capacidade real não há saldo inventado nem botão de informar', async () => {
  const m = mundo(); delete m.interna.saldosConta; delete m.interna.salvarSaldoConta
  const a = await montar(m)
  expect(a.r.saldoConta.estado).toBe('indisponivel')
  expect(a.bloco('saldoConta').textContent).toContain('Ainda sem dado')
  expect(a.bloco('saldoConta').textContent.match(/Saldo em conta/g)).toHaveLength(1)
  expect(a.bloco('saldoConta').textContent).not.toMatch(/R\$|Informar saldo/)
})

it('saldo no exemplo percorre formulário, estado, resumo e motor; desfazer restaura ambos', async () => {
  const { apiExemplo, exemploComo } = await import('../../api/exemplo')
  exemploComo('ana')
  const sessao = (await apiExemplo.sessao())!, f = sessao.familias[0]
  const api = protegerApi(apiExemplo)
  definirEscopoLeitura(api, sessao.userId, f)
  const snapshot = await apiExemplo.backupLer!(f.id)
  const m = mundo(); m.api = api; m.familia = f
  // Usa o componente real do formulário. IDs reais da família fictícia vêm da sessão do exemplo.
  const a = await montar({ ...m, resumo: () => ({ explicacao: [], envelopes: [], pode_gastar_hoje: 0, dias_restantes: 1, livre_mes: 0, colchao: 0, hoje } as ResumoHoje) }, createElement(SaldoConta))
  const antes = (await api.futuroEntradas!(f.id)).entrada!.saldo_caixa
  await act(async () => a.bloco('saldoConta').buscar(x => x.tagName === 'BUTTON')[0].click())
  const props = (no: NoTeste) => Object.entries(no).find(([k]) => k.startsWith('__reactProps'))![1] as any
  const inputs = a.box.buscar(x => x.tagName === 'INPUT')
  const nome = inputs.find(i => i.parentNode?.textContent.startsWith('Conta'))!
  const valor = inputs.find(i => i.getAttribute('aria-label') === 'Saldo em conta')!
  await act(async () => { props(nome).onChange({ target: { value: 'Conta fictícia' } }); props(valor).onChange({ target: { value: '1.234,56' } }) })
  const form = a.box.buscar(x => x.tagName === 'FORM')[0]
  try {
    await act(async () => { await props(form).onSubmit({ preventDefault() {} }) })
    expect(a.r.saldoConta.valor?.valor).toBe(antes / 100 + 1234.56)
    let depois!: number
    await act(async () => { depois = (await api.futuroEntradas!(f.id)).entrada!.saldo_caixa })
    expect(depois).toBe(antes + 123456)
    expect(a.origem().textContent).toContain('1.234,56')
    // Reabrir permite escolher a mesma conta, em vez de duplicar o saldo.
    await act(async () => a.bloco('saldoConta').buscar(x => x.tagName === 'BUTTON')[0].click())
    const contaSalva = (await api.saldosConta!(f.id)).find(c => c.nome === 'Conta fictícia')!
    const select = a.box.buscar(x => x.tagName === 'SELECT')[0]
    expect(select).toBeDefined()
    await act(async () => props(select).onChange({ target: { value: contaSalva.id } }))
    const inputValor = a.box.buscar(x => x.getAttribute('aria-label') === 'Saldo em conta')[0]
    expect(String((props(inputValor) as any).value).replace(/\D/g, '')).toBe('123456')
    expect(desfazer.atual).not.toBeNull()
    await act(async () => { await desfazer.atual!.desfazer() })
    await act(async () => { depois = (await api.futuroEntradas!(f.id)).entrada!.saldo_caixa })
    expect(depois).toBe(antes)
    expect(a.r.saldoConta.estado).toBe('indisponivel')
  } finally { await act(async () => { await apiExemplo.backupRestaurar!(f.id, snapshot) }) }
})

const fontesReais = import.meta.glob(['./leituras.ts', '../../app/useResumoFamilia.ts', '../../telas/inicio/*.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
it('AST: resumo real não importa exemplo/fixtures nem atribui números financeiros literais', () => {
  for (const [nome, codigo] of Object.entries(fontesReais)) {
    const arvore = ts.createSourceFile(nome, codigo, ts.ScriptTarget.Latest, true, nome.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const visitar = (no: ts.Node) => {
      if (ts.isImportDeclaration(no)) expect(no.moduleSpecifier.getText(arvore), nome).not.toMatch(/api\/exemplo|fixture|dadosTeste/)
      if (ts.isPropertyAssignment(no) && /^(valor|saldo|total|renda|previsto|garantido|provavel|incerto)$/.test(no.name.getText(arvore))) expect(ts.isNumericLiteral(no.initializer), `${nome}:${no.getText(arvore)}`).toBe(false)
      ts.forEachChild(no, visitar)
    }
    visitar(arvore)
  }
})
