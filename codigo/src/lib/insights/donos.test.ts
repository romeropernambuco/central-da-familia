import { expect, it } from 'vitest'
// @ts-ignore: Node é o executor do Vitest; o app não depende destes tipos.
import { readFileSync } from 'node:fs'
import { DONOS_INSIGHTS, donoDoInsight, primeiraPerguntaGeral, FALA_ANALISTA } from './donos'
import { candidatosInsights } from './motor'
import { montarSnapshot } from './snapshot'
import { apresentarInsight } from './apresentacao'
import { futuro, type FuturoEntrada } from '../futuro'
import { numerosRumo2029 } from '../../app/rumo2029'
import { reais } from '../formato'
import type { FamiliaMinha, PerguntaEsc } from '../../api/tipos'

const agora = '2026-11-16T12:00:00-03:00'
const familia: FamiliaMinha = { id: 'f', nome: 'Exemplo', papel: 'casal', membroNome: 'Adulto', envelopeId: null }
const pergunta = (funcionario: string, id = 'pergunta'): PerguntaEsc => ({
  id,
  funcionario,
  pergunta: 'Conferir Segredo?',
  contexto: 'Segredo',
  trechosPrivados: ['Segredo'],
  opcoes: [],
})
const entrada = (saldo: number): FuturoEntrada => ({
  hoje: '2026-11-16',
  saldo_caixa: saldo,
  aplicacoes: [],
  recebimentos: [],
  compromissos: [],
  dividas: [],
  desvios: [],
  desejos: [],
  imoveis: [
    {
      id: 'i',
      apelido: 'Segredo',
      dono: 'a',
      valor: 10000000,
      uso: 'aluga',
      aluguel_bruto: 100000,
      custos_mes: 0,
      vacancia: '0',
      tem_contrato: true,
      contrato_ate: '2029-03',
      venda_valor: null,
      venda_mes: null,
      venda_contrato: false,
    },
  ],
  parametros: {
    mes_base: '2026-11',
    virada: '2029-01',
    gasto_2029_hoje: 100000,
    renda_certa_2029: 0,
    margem: '0.1',
    taxa_real_trabalho: '0.04',
    taxa_bruta_ano: { 2026: '0.1', 2027: '0.1', 2028: '0.1' },
    ipca_ano: { 2026: '0.04', 2027: '0.04', 2028: '0.04' },
    aliq_proj: '0.225',
    piso_meses: 6,
    teto_mes: 0,
    mes_reajuste: 0,
  },
})

it('tabela pura define os oito donos e o novo contrato; banco preserva seus oito ids', () => {
  expect(DONOS_INSIGHTS).toEqual({
    fatura_vencendo: 'cartao',
    fatura_divergente: 'cartao',
    parcelas: 'cartao',
    reserva: 'colchao',
    recebimento: 'tesoureiro',
    aplicacao: 'guardado',
    feira_nota: 'fiscal',
    objetivo: 'tesoureiro',
    contrato_imovel: 'imoveis',
  })
  for (const [tipo, dono] of Object.entries(DONOS_INSIGHTS))
    expect(donoDoInsight({ funcionario: 'errado', tipo: tipo as keyof typeof DONOS_INSIGHTS })).toBe(dono)
  for (const funcionario of ['contador', 'colchao', 'cartao', 'folha', 'comprador', 'fiscal', 'guardado', 'secretaria'])
    expect(donoDoInsight(pergunta(funcionario))).toBe(funcionario)
})

it.each([0, 1000000000])('Tesoureiro usa os mesmos números oficiais com margem, falta ou sobra: %s', saldo => {
  const e = entrada(saldo),
    f = futuro(e),
    n = numerosRumo2029(f, e)
  const s = montarSnapshot(familia, 'real', { futuro: f, entradaObjetivo: e, mesObjetivo: '2029-01' }, agora)
  const i = candidatosInsights(s, agora).find(i => i.tipo === 'objetivo')!
  expect(i.funcionario).toBe('tesoureiro')
  expect(s.objetivo?.faltaComMargem).toBe(n.falta_com_margem)
  expect(i.contexto).toContain(reais(Math.abs(n.falta_com_margem!) / 100))
  expect(i.contexto).toContain(n.falta_com_margem! > 0 ? 'faltam' : 'sobram')
  expect(i.contexto).toContain('Garantido')
  expect(i.contexto).toContain('com margem de segurança')
  expect(i.contexto).toContain('estimativa')
})

it('Imóveis só encaminha gatilho existente, sem inventar chamada de Presença/Estoque', () => {
  const e = entrada(0),
    f = futuro(e)
  const dados = { futuro: f, entradaObjetivo: e, mesObjetivo: '2029-01' }
  const s = montarSnapshot(familia, 'real', dados, agora)
  const i = candidatosInsights(s, agora).find(i => i.tipo === 'contrato_imovel')!
  expect(i).toMatchObject({ funcionario: 'imoveis', rota: 'guardado' })
  expect(apresentarInsight(i, true).contexto).not.toContain('Segredo')
  expect(
    candidatosInsights(
      montarSnapshot(familia, 'real', { ...dados, futuro: { ...f, gatilhos: [] } }, agora),
      agora,
    ).some(i => i.tipo === 'contrato_imovel'),
  ).toBe(false)
  for (const papel of ['equipe', 'pessoa'] as const)
    expect(candidatosInsights(montarSnapshot({ ...familia, papel }, 'real', dados, agora), agora)).toEqual([])
  expect(candidatosInsights(s, agora).some(i => ['presenca', 'auditor'].includes(i.funcionario))).toBe(false)
})

it('fila mantém ordem/dono, silêncio, travas, olho fechado e escopo de pessoa/equipe', () => {
  const fila = [pergunta('folha'), pergunta('contador', 'lancou:hoje')]
  expect(primeiraPerguntaGeral(fila, 'casal', agora, false)?.dono).toBe('folha')
  expect(primeiraPerguntaGeral(fila, 'pessoa', agora, true)).toMatchObject({
    dono: 'contador',
    pergunta: { pergunta: 'Conferir •••?' },
  })
  expect(primeiraPerguntaGeral(fila, 'equipe', agora, false)).toBeNull()
  expect(primeiraPerguntaGeral([], 'casal', agora, false)).toBeNull()
  expect(primeiraPerguntaGeral(fila, 'casal', '2026-11-16T23:00:00-03:00', false)).toBeNull()
  expect(primeiraPerguntaGeral(fila, 'casal', agora, false, new Map([['pergunta', true]]))?.dono).toBe('contador')
})

it('guarda estática: falas do exemplo são curtas, sem cobrança, e Analista só fala do produto', () => {
  const fonte = readFileSync(new URL('../../api/exemplo2.ts', import.meta.url), 'utf8')
  const falas = [
    ...fonte.matchAll(
      /const f = \{\s*vi: ['"]([^\n]+?)['"],\s*importa: 'Conferência dos registros',\s*sugiro: '([^']+)'/g,
    ),
  ]
  expect(falas).toHaveLength(21)
  for (const [, vi, sugiro] of falas) {
    expect((vi + ' ' + sugiro).match(/[.!?](?:\s|$)/g)?.length).toBeLessThanOrEqual(2)
    expect(vi + sugiro).not.toMatch(/paga hoje|decide hoje|guarda hoje|leva \d|sem resposta|já faz|cobrança|fiscal/i)
  }
  expect(FALA_ANALISTA).toContain('uso do app')
  expect(FALA_ANALISTA).not.toMatch(/2029|renda|patrimônio/)
})
