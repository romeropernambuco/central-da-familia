// Dados exclusivamente sintéticos. Referência independente com 70 dígitos.
import DecimalBase from 'decimal.js'
import { describe, expect, it } from 'vitest'
import oracleSource from './paridade-fixtures/oraculo.js?raw'
import { futuro, type Aplicacao, type FuturoEntrada, type Imovel } from './index'
import { projetarLinha } from './f4_linha'
import { mesAnterior, proximoMes } from './decimal'

const D = DecimalBase.clone({ precision: 70, rounding: DecimalBase.ROUND_HALF_UP })
const round = (v: DecimalBase) => v.toDecimalPlaces(0).toNumber()
const juros = (saldo: number, taxa: string, ir: string, dias: number) =>
  saldo <= 0
    ? 0
    : round(
        new D(saldo).times(
          new D(1)
            .plus(new D(taxa).times(new D(1).minus(ir)))
            .pow(new D(dias).div(365))
            .minus(1),
        ),
      )
const ap = (x: Partial<Aplicacao> = {}): Aplicacao => ({
  id: 'sintetica',
  titular: null,
  titulares: [],
  banco: 'Exemplo',
  saldo: 100000,
  taxa_bruta_anual: '0.10',
  isenta: true,
  aplicada_em: '2026-01-01',
  resgate_previsto: '2026-11-30',
  fgc: false,
  ...x,
})
const entrada = (aplicacoes: Aplicacao[] = [ap()]): FuturoEntrada => ({
  hoje: '2026-09-30',
  saldo_caixa: 0,
  aplicacoes,
  recebimentos: [],
  compromissos: [],
  dividas: [],
  desvios: [],
  desejos: [],
  parametros: {
    mes_base: '2026-09',
    virada: '2027-02',
    gasto_2029_hoje: 0,
    renda_certa_2029: 0,
    margem: '0',
    taxa_real_trabalho: '0.04',
    taxa_bruta_ano: { 2026: '0.30', 2027: '0.40' },
    ipca_ano: { 2026: '0', 2027: '0' },
    aliq_proj: '0.225',
    piso_meses: 0,
    teto_mes: 0,
    mes_reajuste: 1,
  },
})

describe('F13 — aplicações na projeção integrada', () => {
  it('sem vencimento: parâmetro ausente/false preserva a linha; true usa taxa e IR próprios, inclusive taxa zero', () => {
    const e = entrada([
      ap({ id: 'isenta', resgate_previsto: null, taxa_bruta_anual: '0.12', destino_no_vencimento: 'caixa' }),
      ap({
        id: 'tributada',
        resgate_previsto: null,
        taxa_bruta_anual: '0.24',
        isenta: false,
        aplicada_em: '2026-10-01',
      }),
      ap({ id: 'com-vencimento', saldo: 50000, taxa_bruta_anual: '0.06', isenta: false, aplicada_em: '2024-01-01' }),
      ap({ id: 'sem-taxa', saldo: 22000, resgate_previsto: null, taxa_bruta_anual: undefined }),
      ap({ id: 'taxa-zero', saldo: 30000, resgate_previsto: null, taxa_bruta_anual: '0' }),
    ])
    e.saldo_caixa = 12345
    const padrao = futuro(e)
    e.parametros.taxa_individual_sem_vencimento = false
    expect(futuro(e)).toEqual(padrao)
    // Todos os produtos sem vencimento, mesmo os isentos e com taxa zero, seguem a referência em false.
    expect(padrao.linha[0].rendimento).toBe(juros(264345, '0.30', '0.225', 31) + juros(50000, '0.06', '0.15', 31))
    e.parametros.taxa_individual_sem_vencimento = true
    const original = JSON.stringify(e),
      individual = futuro(e)
    let referencia = 34345,
      isenta = 100000,
      tributada = 100000,
      comVencimento = 50000,
      total = 314345
    individual.linha.forEach((l, i) => {
      // Sem data de resgate, IR usa o último dia antes da virada (31/01/2027), sem transferência fictícia.
      const dias = [31, 30, 31, 31][i]
      const rRef = juros(referencia, i === 3 ? '0.40' : '0.30', '0.225', dias)
      const rIsenta = juros(isenta, '0.12', '0', dias),
        rTributada = juros(tributada, '0.24', '0.225', dias)
      const rVencimento = i < 2 ? juros(comVencimento, '0.06', '0.15', dias) : 0
      const r = rRef + rIsenta + rTributada + rVencimento
      expect(l.rendimento).toBe(r)
      expect(l.saldo_inicial).toBe(total)
      total += r
      expect(l.saldo_final).toBe(total)
      expect(l.recebimentos).toBe(0)
      referencia += rRef
      isenta += rIsenta
      tributada += rTributada
      comVencimento += rVencimento
    })
    expect(individual.linha).not.toEqual(padrao.linha)
    expect(JSON.stringify(e)).toBe(original)
  })

  it('usa taxa e IR de cada produto, preserva o saldo líquido no vencimento e não muta a entrada', () => {
    const e = entrada([
      ap({ id: 'isenta', taxa_bruta_anual: '0.12' }),
      ap({ id: 'tributada', taxa_bruta_anual: '0.24', isenta: false, aplicada_em: '2026-10-01' }),
    ])
    const original = JSON.stringify(e)
    const linha = futuro(e).linha
    const r1 = juros(100000, '0.12', '0', 31),
      r2 = juros(100000, '0.24', '0.225', 31)
    const r3 = juros(100000 + r1, '0.12', '0', 30),
      r4 = juros(100000 + r2, '0.24', '0.225', 30)
    expect(linha.map(l => l.rendimento)).toEqual([r1 + r2, r3 + r4, 0, 0])
    expect(linha[2].saldo_final).toBe(200000 + r1 + r2 + r3 + r4)
    expect(linha.every(l => l.recebimentos === 0 && l.retornos === 0 && l.marcos?.length === 0)).toBe(true)
    expect(JSON.stringify(e)).toBe(original)
    // Compatibilidade sem vencimento (inclusive taxa própria) e sem taxa própria.
    const legado = entrada([ap({ resgate_previsto: null })])
    legado.saldo_caixa = 12345
    const saldo = 112345
    expect(futuro(legado).linha[0].rendimento).toBe(juros(saldo, '0.30', '0.225', 31))
    expect(futuro(entrada([ap({ taxa_bruta_anual: undefined, resgate_previsto: null })])).linha[0].rendimento).toBe(
      juros(100000, '0.30', '0.225', 31),
    )
  })

  it('limita aos dias até o vencimento e distingue caixa parado de reaplicação explícita', () => {
    const e = entrada([ap({ resgate_previsto: '2026-10-15' })])
    const r = juros(100000, '0.10', '0', 15)
    expect(futuro(e).linha.map(l => l.rendimento)).toEqual([r, 0, 0, 0])
    e.aplicacoes[0].destino_no_vencimento = 'referencia_familia'
    const depois = juros(100000 + r, '0.30', '0.225', 16)
    const l = futuro(e).linha
    expect(l[0].rendimento).toBe(r + depois)
    expect(l[1].rendimento).toBe(juros(l[0].saldo_final, '0.30', '0.225', 30))
    e.aplicacoes[0].resgate_previsto = '2026-09-30'
    e.aplicacoes[0].destino_no_vencimento = 'caixa'
    expect(futuro(e).linha.every(l => l.rendimento === 0 && l.saldo_final === 100000)).toBe(true)
    e.aplicacoes[0] = ap({ aplicada_em: '2026-10-20', resgate_previsto: '2026-10-31' })
    expect(futuro(e).linha[0].rendimento).toBe(juros(100000, '0.10', '0', 12))
    // Sem taxa individual, a referência é usada até o vencimento, sem inventar taxa do produto.
    e.aplicacoes[0] = ap({ taxa_bruta_anual: undefined, resgate_previsto: '2026-10-31' })
    expect(futuro(e).linha.map(l => l.rendimento)).toEqual([juros(100000, '0.30', '0.225', 31), 0, 0, 0])
  })

  it('consome o dinheiro disponível sem juros sobre principal já gasto e sem ressuscitar resgates', () => {
    const e = entrada([
      ap({ taxa_bruta_anual: '0', resgate_previsto: '2026-10-31' }),
      ap({ id: 'segundo', taxa_bruta_anual: '0.12', resgate_previsto: '2026-12-31' }),
    ])
    e.compromissos = [
      { mes: '2026-10', valor: 150000, tipo: 'conta_grande' },
      { mes: '2026-12', valor: 999999, tipo: 'conta_grande' },
    ]
    const l = futuro(e).linha
    const outubro = juros(100000, '0.12', '0', 31)
    expect(l[0].saldo_final).toBe(50000 + outubro)
    expect(l[1].rendimento).toBe(juros(50000 + outubro, '0.12', '0', 30))
    expect(l[3].saldo_final).toBe(l[2].saldo_final)
    expect(l[3].rendimento).toBe(0)
  })
})

type Cenario = {
  id: string
  start: string
  initial: number
  months: number
  month_list: string[]
  rate_basis: string
  monthly_rate: number
  annual_rate: number
  ir: number
  income: number
  expense: number
  inflation?: number
  floor_months?: number
  with_extras?: boolean
  application?: { maturity: string }
  events: { id: string; month: string; kind: string; value: number }[]
  expected_final_centavos: number
}
type OracleRow = {
  mes: string
  saldo: number
  rendimento: number
  fluxo: number
  fechado_sem_arredondamento: string
  limite_arredondamento_centavos: string
}
// O oráculo entregue é CommonJS com um caminho da máquina da conferência.
// Só adaptamos require/dirname em memória; fórmula, assert independente e fixtures permanecem intactos.
// Importação dinâmica: o projeto de navegador não instala os tipos do Node.
const nodeModuleName = 'node:module'
const { createRequire } = (await import(/* @vite-ignore */ nodeModuleName)) as {
  createRequire: (url: string) => (name: string) => unknown
}
const requireNode = createRequire(import.meta.url)
const oracleModule = { exports: {} as { oracle: (s: Cenario) => OracleRow[] } }
new Function('require', 'module', '__dirname', oracleSource)(
  (name: string) => (name.endsWith('/decimal.js') ? DecimalBase : requireNode(name)),
  oracleModule,
  '.',
)
const { oracle } = oracleModule.exports
const cenarios = Object.values(
  import.meta.glob('./paridade-fixtures/*.json', { eager: true, import: 'default' }),
) as Cenario[]
const pendentes: Record<string, string> = {
  '01-juros-1-mes': 'taxa fixa mensal não é o regime anual por dias/365 do motor; não converter implicitamente',
  '02-juros-12-meses': 'taxa fixa mensal não é o regime anual por dias/365 do motor; não converter implicitamente',
  '12-extras': 'o oráculo inclui receita incerta; o plano base só inclui receitas certas, sem modo de extras no núcleo',
}

describe('F13 — paridade sintética com o oráculo entregue', () => {
  for (const [id, motivo] of Object.entries(pendentes)) it.todo(`${id}: PENDENTE — ${motivo}`)
  it('confere todos os cenários suportados, centavo a centavo e contra a fórmula fechada (inclui 08)', () => {
    expect(cenarios.map(s => s.id).sort()).toEqual([
      '01-juros-1-mes',
      '02-juros-12-meses',
      '03-renda-gasto',
      '04-ir',
      '05-parcela-13',
      '06-envelope',
      '07-reajuste',
      '08-vencimento',
      '09-zero',
      '10-negativo',
      '11-calendario',
      '12-extras',
    ])
    for (const s of cenarios.filter(s => !pendentes[s.id])) {
      // Taxa mensal ZERO é idêntica à anual zero; nenhuma conversão aproximada.
      const e = entrada(
        s.application
          ? [
              ap({
                saldo: s.initial,
                taxa_bruta_anual: String(s.annual_rate),
                resgate_previsto: s.application.maturity,
              }),
            ]
          : [],
      )
      e.hoje = `${mesAnterior(s.start)}-01`
      e.saldo_caixa = s.application ? 0 : s.initial
      e.parametros = {
        ...e.parametros,
        mes_base: mesAnterior(s.start),
        virada: proximoMes(s.month_list[s.month_list.length - 1]),
        taxa_bruta_ano: { 2026: String(s.annual_rate), 2027: String(s.annual_rate), 2028: String(s.annual_rate) },
        ipca_ano: { 2026: String(s.inflation ?? 0), 2027: String(s.inflation ?? 0), 2028: String(s.inflation ?? 0) },
        aliq_proj: String(s.ir),
        teto_mes: s.expense,
        piso_meses: s.floor_months ?? 0,
      }
      e.recebimentos = s.month_list.map(m => ({
        id: m,
        dono: 'Exemplo',
        valor: s.income,
        mes_previsto: m,
        mes_novo: null,
        certo: true,
        recebido: false,
      }))
      e.compromissos = s.events
        .filter(x => x.kind === 'parcel' || x.kind === '13')
        .map(x => ({ mes: x.month, valor: x.value, tipo: x.kind === '13' ? 'folha_13' : 'parcela' }))
      const esperado = oracle(s),
        linha = futuro(e).linha
      expect(linha.length, s.id).toBe(s.months)
      linha.forEach((l, i) => {
        const o = esperado[i]
        expect([l.mes, l.saldo_final, l.rendimento], s.id).toEqual([o.mes, o.saldo, o.rendimento])
        // Meio centavo por período, capitalizado conforme o limite explícito do oráculo.
        expect(
          new D(l.saldo_final)
            .minus(o.fechado_sem_arredondamento)
            .abs()
            .lte(new D(o.limite_arredondamento_centavos).plus('0.0000001')),
          `${s.id} ${l.mes}: arredondamento`,
        ).toBe(true)
        expect(l.saldo_final - l.saldo_inicial - l.rendimento, s.id).toBe(o.fluxo)
        if (s.floor_months) expect(l.piso).toBe(s.expense * s.floor_months)
      })
      expect(linha[linha.length - 1].saldo_final, s.id).toBe(s.expected_final_centavos)
    }
  })
})

function sorteio(seed: number) {
  let s = seed >>> 0
  return (min: number, max: number) => {
    s = (s * 1664525 + 1013904223) >>> 0
    return min + Math.floor((s / 4294967296) * (max - min + 1))
  }
}

describe('F13 — propriedades por aplicação com semente fixa', () => {
  it('conserva principal e juros líquidos de cada produto na transferência e nos fluxos (80 carteiras)', () => {
    const rand = sorteio(1301)
    for (let k = 0; k < 80; k++) {
      const saldo = rand(100000, 9000000),
        taxa = new D(rand(1, 30)).div(100).toString(),
        isenta = rand(0, 1) === 0
      const e = entrada([
        ap({ saldo, taxa_bruta_anual: taxa, isenta, aplicada_em: '2026-01-01', resgate_previsto: '2026-10-31' }),
      ])
      const r = juros(saldo, taxa, isenta ? '0' : '0.20', 31) // 303 dias até resgate
      const retirada = rand(1, saldo),
        deposito = rand(1, 9000)
      e.dividas = [{ mes: '2026-11', valor: retirada }]
      e.recebimentos = [
        {
          id: 'nova',
          dono: 'Exemplo',
          valor: deposito,
          mes_previsto: '2026-12',
          mes_novo: null,
          certo: true,
          recebido: false,
        },
      ]
      const l = futuro(e).linha
      expect(l[0].rendimento).toBe(r)
      expect(l[0].saldo_final).toBe(saldo + r)
      expect(l[1].saldo_final).toBe(saldo + r - retirada)
      expect(l[2].saldo_final).toBe(saldo + r - retirada + deposito)
      expect(l[3].rendimento).toBe(juros(deposito, '0.40', '0.225', 31))
      l.forEach((x, i) => {
        expect(x.saldo_final).toBe(x.saldo_inicial + x.rendimento + x.recebimentos - x.dividas)
        if (i) expect(x.saldo_inicial).toBe(l[i - 1].saldo_final)
      })
    }
  })

  it('mais saldo nunca reduz o patrimônio; ganhos respeitam a taxa individual e param no vencimento (80 pares)', () => {
    const rand = sorteio(1302)
    for (let k = 0; k < 80; k++) {
      const a = ap({ saldo: rand(100000, 9000000), taxa_bruta_anual: new D(rand(1, 30)).div(100).toString() })
      const e = entrada([a]),
        maior = entrada([{ ...a, saldo: a.saldo + rand(1, 900000) }])
      e.compromissos = maior.compromissos = [{ mes: '2026-10', valor: rand(0, 300000), tipo: 'conta_grande' }]
      const x = futuro(e).linha,
        y = futuro(maior).linha
      x.forEach((l, i) => expect(y[i].saldo_final).toBeGreaterThanOrEqual(l.saldo_final))
      expect(x[0].rendimento).toBe(juros(a.saldo, a.taxa_bruta_anual!, '0', 31))
      expect(y[2].rendimento).toBe(0)
    }
  })

  it('emenda dezembro e janeiro sem perda, juros extras ou reinício de IR (80 produtos)', () => {
    const rand = sorteio(1303)
    for (let k = 0; k < 80; k++) {
      const a = ap({
        saldo: rand(100000, 9000000),
        taxa_bruta_anual: new D(rand(1, 30)).div(100).toString(),
        isenta: false,
        aplicada_em: '2026-01-01',
        resgate_previsto: '2027-01-31',
      })
      const e = entrada([a])
      e.hoje = '2026-11-30'
      const l = futuro(e).linha
      const r = juros(a.saldo, a.taxa_bruta_anual!, '0.175', 31)
      expect(l[0].rendimento).toBe(r)
      expect(l[1].saldo_inicial).toBe(a.saldo + r)
      expect(l[1].rendimento).toBe(juros(a.saldo + r, a.taxa_bruta_anual!, '0.175', 31))
      // Dividir a mesma janela na virada do ano conserva o resultado.
      const janeiro = projetarLinha({
        saldo_inicial: l[0].saldo_final,
        aplicacoes: [{ ...a, saldo: l[0].saldo_final }],
        de: '2027-01',
        ate: '2027-01',
        virada: '2027-02',
        taxa_bruta_ano: { 2027: '0.40' },
        aliq_proj: '0.225',
        teto: () => 0,
        piso: () => 0,
      })
      expect(janeiro[0].saldo_final).toBe(l[1].saldo_final)
    }
  })
})

describe('F13 — métricas aditivas dos imóveis', () => {
  it('explicita percentual, prazo e perda anual potencial sem alterar o aluguel confirmado', () => {
    const im = (id: string, extra: Partial<Imovel> = {}): Imovel => ({
      id,
      dono: 'Exemplo',
      apelido: id,
      valor: 60000000,
      uso: 'aluga',
      aluguel_bruto: 300000,
      custos_mes: 50000,
      vacancia: '0.08',
      tem_contrato: true,
      contrato_ate: '2029-06',
      venda_valor: null,
      venda_mes: null,
      venda_contrato: false,
      ...extra,
    })
    const e = entrada([])
    e.hoje = '2028-11-01'
    e.parametros = {
      ...e.parametros,
      mes_base: '2028-11',
      virada: '2029-01',
      taxa_bruta_ano: { 2028: '0.1' },
      ipca_ano: { 2028: '0' },
      aliq_aluguel: '0.275',
    }
    e.imoveis = [
      im('curto'),
      im('longo', { contrato_ate: '2029-12' }),
      im('vencido', { contrato_ate: '2028-10' }),
      im('sem', { tem_contrato: false, contrato_ate: null }),
      im('vendido', { venda_contrato: true, venda_mes: '2028-12', venda_valor: 60000000 }),
      im('sem valor', { valor: 0 }),
      im('mora', { uso: 'mora' }),
      im('sem data', { contrato_ate: null }),
      im('venda no ano', { venda_contrato: true, venda_mes: '2029-09', venda_valor: 60000000 }),
    ]
    const s = futuro(e),
      [curto, longo, vencido, sem, vendido, semValor, mora, semData, vendaNoAno] = s.imoveis!
    expect(curto.rendimento_liquido_anual_percentual).toBe('3.277')
    expect(curto.rentabilidade_ano).toBe('0.03277')
    expect(curto.meses_ate_fim_contrato).toBe(7)
    expect(curto.impacto_renda_2029_sem_renovacao).toBe(163850 * 6)
    expect(longo.impacto_renda_2029_sem_renovacao).toBe(0)
    expect(vencido.meses_ate_fim_contrato).toBe(0)
    expect(vencido.impacto_renda_2029_sem_renovacao).toBe(163850 * 12)
    expect(sem.meses_ate_fim_contrato).toBeNull()
    expect(sem.impacto_renda_2029_sem_renovacao).toBe(0)
    expect(vendido.impacto_renda_2029_sem_renovacao).toBe(0)
    expect(semValor.rendimento_liquido_anual_percentual).toBe('0')
    expect(mora.impacto_renda_2029_sem_renovacao).toBe(0)
    expect(semData.meses_ate_fim_contrato).toBeNull()
    expect(vendaNoAno.impacto_renda_2029_sem_renovacao).toBe(163850 * 3)
    expect(s.aluguel_liquido_2029).toBe(163850) // só longo; mantida regra até dezembro
    expect(s.linha[0].alugueis).toBe(163850 * 5)
    const renda = futuro({ ...e, hoje: '2029-01-01' })
    expect(renda.imoveis![0].meses_ate_fim_contrato).toBe(5)
    expect(renda.aluguel_liquido_2029).toBe(163850)
  })
})
