import { afterEach, expect, it, vi } from 'vitest'
import {
  entradaDoBanco,
  lerControleReceitas,
  lerFontesReceita,
  mesesDaReceita,
  prepararReceitas,
  type FuturoBanco,
} from './futuro'
import { calcularCenariosReceitas } from '../app/useCenarioReceitas'
import type { FonteReceita } from './tipos'
import { futuro } from '../lib/futuro'
import { apiExemplo, exemploComo, reiniciarExemplo } from './exemplo'

const fonte: FonteReceita = { origem: 'empresa', certeza: 'garantido', recorrencia: 'mensal' }
const r = {
  id: 'r',
  dono: 'Dono fictício',
  valor: 120000,
  mes_previsto: '2027-12',
  mes_novo: null,
  certo: true,
  recebido: false,
  descricao: 'Empresa fictícia',
}
export const bancoReceitasTeste = (): FuturoBanco => ({
  hoje: '2026-11-16',
  mes_base: '2026-11',
  aplicacoes: [],
  saldo_caixa: 10000000,
  cdi_hoje: { pct_ano: '10' },
  recebimentos: [
    {
      id: 'g',
      dono_nome: 'Exemplo',
      valor_centavos: 100000,
      mes_previsto: '2027-01',
      mes_novo: null,
      certo: true,
      recebido_em: null,
    },
    {
      id: 'p',
      dono_nome: 'Exemplo',
      valor_centavos: 200000,
      mes_previsto: '2027-02',
      mes_novo: null,
      certo: false,
      recebido_em: null,
    },
    {
      id: 'i',
      dono_nome: 'Exemplo',
      valor_centavos: 300000,
      mes_previsto: '2027-03',
      mes_novo: null,
      certo: false,
      recebido_em: null,
    },
  ],
  limites_mes: [{ envelope_id: 'e', limite_centavos: 200000 }],
  config: {},
  parcelas_futuras: [],
  desejos: [],
  parametros: null,
  focus: [2026, 2027, 2028].map(ano => ({
    ano,
    selic_fim: '0.1',
    ipca: '0.04',
    divulgado_em: '2026-11-01',
    fonte: 'Exemplo de teste',
  })),
})

it('mensal cruza o ano, termina inclusive no meio do ano e limita no horizonte', () => {
  expect(mesesDaReceita('2027-12', { ...fonte, fim: '2028-02' })).toEqual(['2027-12', '2028-01', '2028-02'])
  expect(mesesDaReceita('2031-11', fonte)).toEqual(['2031-11', '2031-12'])
  expect(mesesDaReceita('2032-01', fonte)).toEqual([])
  expect(mesesDaReceita('2028-01', { ...fonte, fim: '2027-12' })).toEqual([])
})
it.each(['29', '30', '31'])('dia %s não transborda fevereiro nem muda a cadência anual', dia => {
  expect(mesesDaReceita(`2027-01-${dia}`, { ...fonte, fim: '2027-03' })).toEqual(['2027-01', '2027-02', '2027-03'])
  expect(mesesDaReceita(`2027-12-${dia}`, { ...fonte, recorrencia: 'anual', fim: '2030-06' })).toEqual([
    '2027-12',
    '2028-12',
    '2029-12',
  ])
})
it('primeira recebida não quita a série; ocorrência recebida não duplica; valor novo não altera o conferido', () => {
  const controle = { r: { valor: 250000, recebidas: { '2028-01': { valor: 119000, data: '2028-02-02' } } } }
  const copia = JSON.stringify(controle)
  const rs = prepararReceitas([{ ...r, recebido: true }], { r: { ...fonte, fim: '2028-02' } }, controle)
  expect(rs.map(x => [x.id, x.mes_previsto, x.recebido, x.valor])).toEqual([
    ['r', '2027-12', true, 250000],
    ['r@2028-01', '2028-01', true, 250000],
    ['r@2028-02', '2028-02', false, 250000],
  ])
  expect(new Set(rs.map(x => x.id)).size).toBe(3)
  expect(JSON.stringify(controle)).toBe(copia)
  expect(
    prepararReceitas([{ ...r, mes_novo: '2028-01' }], { r: { ...fonte, fim: '2028-02' } }).map(x => x.mes_novo),
  ).toEqual(['2028-01', null, null])
})
it('config ausente mantém legado; config corrompida avisa e não é aceita para sobrescrever', () => {
  expect(lerFontesReceita(undefined)).toEqual({ fontes: {}, corrompida: false })
  for (const x of [
    'json quebrado',
    [],
    { r: { ...fonte, certeza: 'certeza absoluta' } },
    { r: { ...fonte, fim: '2028-13' } },
  ])
    expect(lerFontesReceita(x).corrompida).toBe(true)
  expect(lerControleReceitas({ r: { recebidas: { '2028-01': { valor: -1, data: 'errada' } } } }).corrompida).toBe(true)
  const j = bancoReceitasTeste()
  j.config = { fontes_receita: 'quebrou' }
  expect(entradaDoBanco(j).confirmar.join()).toContain('dados inválidos')
})
it('três resultados completos: muda só inclusão de receitas, sem vazar Com tudo para o oficial', () => {
  const j = bancoReceitasTeste()
  j.config = { fontes_receita: { g: fonte, p: { ...fonte, certeza: 'provavel' }, i: { ...fonte, certeza: 'incerto' } } }
  const p = entradaDoBanco(j),
    antes = JSON.stringify(p),
    oficial = futuro(p.entrada!)
  const cs = calcularCenariosReceitas(p)!
  expect(cs.garantido).toEqual(oficial)
  expect(cs.previstos.renda_sustentavel).toBeGreaterThan(cs.garantido.renda_sustentavel)
  expect(cs.tudo.renda_sustentavel).toBeGreaterThan(cs.previstos.renda_sustentavel)
  for (const c of Object.values(cs)) {
    expect(c.patrimonio_necessario).toBe(oficial.patrimonio_necessario)
    expect(c.linha.map(x => [x.mes, x.teto, x.compromissos, x.dividas, x.desvios])).toEqual(
      oficial.linha.map(x => [x.mes, x.teto, x.compromissos, x.dividas, x.desvios]),
    )
  }
  expect(JSON.stringify(p)).toBe(antes)
  expect(futuro(entradaDoBanco(j).entrada!)).toEqual(oficial)
  const legado = entradaDoBanco(bancoReceitasTeste())
  expect(calcularCenariosReceitas(legado)!.garantido).toEqual(
    futuro({ ...legado.entrada!, recebimentos: legado.receitasBase! }),
  )
})
afterEach(() => {
  vi.useRealTimers()
  reiniciarExemplo()
})
it('modo exemplo identifica empresa e novo negócio incerto em config sem adicionar recebimentos', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-16T12:00:00Z'))
  reiniciarExemplo()
  exemploComo('ana')
  const fs = await apiExemplo.config<Record<string, FonteReceita>>('fam-silva', 'fontes_receita', {})
  expect(fs.rc1).toMatchObject({ origem: 'empresa', certeza: 'garantido' })
  expect(fs.rc2).toMatchObject({ origem: 'negocio_novo', certeza: 'incerto' })
  expect(
    (await apiExemplo.recebimentos!('fam-silva')).filter(x => fs[x.id]).every(x => x.descricao.includes('(exemplo)')),
  ).toBe(true)
  const e = await apiExemplo.futuroEntradas!('fam-silva')
  expect(e.fontesReceita).toEqual(fs)
})
