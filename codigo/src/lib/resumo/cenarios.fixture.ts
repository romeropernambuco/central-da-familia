import type { Envelope, Lancamento, RecebimentoTela } from '../../api/tipos'
export const envelopes = [
  { regra: 'mensal', limite_mes: 100, gasto_mes: 20, livre: 80 },
  {
    regra: 'mensal',
    limite_mes: 100,
    limite_base: 150,
    gasto_mes: 120,
    livre: -20,
    falta_mes_anterior: 30,
    parcelas_mes: 20,
  },
  { regra: 'semanal', limite_mes: 100, teto_semana: 24.23, gasto_semana: 30.12, gasto_mes: 40, livre: 60 },
  {
    regra: 'diario',
    limite_mes: 90,
    limite_base: 100,
    valor_dia: 0,
    gasto_hoje: 12,
    valor_dia_inteiro: 10,
    gasto_mes: 110,
    livre: -20,
    falta_mes_anterior: 10,
  },
  { regra: 'diario', limite_mes: 100, valor_dia: 7.34, gasto_hoje: 2.11, gasto_mes: 20, livre: 80 },
] as Envelope[]
export const gastos = [
  { valor: 10.125, data: '2026-11-01' },
  { valor: 99, data: '2026-10-30' },
  { valor: 200, data: '2026-11-18' },
  { valor: 900, data: '2026-11-01', parcela: { n: 1, de: 2 } },
  { valor: 300, data: '2026-11-01', apagado_em: '2026-11-02' },
] as Lancamento[]
export const recebimentos = [
  { valor: 100, valor_recebido: 25, recebido_em: '2026-11-03' },
  { valor: 30, recebido_em: '2026-11-19' },
  { valor: 40, recebido_em: '2026-10-01' },
  { valor: 50, certo: true, mes_previsto: '2026-11' },
  { valor: 60, certo: false, mes_previsto: '2026-11' },
  { valor: 70, certo: true, mes_previsto: '2026-10', mes_novo: '2026-11' },
] as unknown as RecebimentoTela[]
