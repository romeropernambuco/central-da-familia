// Testes de propriedade do motor (além dos 39 casos). Todo número é exemplo inventado.
// Sorteio com semente fixa: o mesmo resultado em toda rodada.
import { describe, expect, it } from 'vitest'
import { arred, comCasas, Dec, listaMeses, mesAnterior, proximoMes } from './decimal'
import { aliquotaIR, rendimentoMes } from './f1_rendimento'
import { taxaRealAnual } from './f2_taxa_real'
import { patrimonioNecessario, rendaSustentavel } from './f3_necessario'
import { mesDoRecebimento } from './f4_linha'
import { perdaRendaMensal, valorNaVirada } from './f6_impacto'
import { avaliarDesejo } from './f7_desejo'
import { guardarPorMes } from './f9_falta'
import { avisosFGC, fgcConta } from './f10_fgc'
import { tetoVigente } from './f8_reajuste'
import { cabeDesejo, futuro, impacto2029 } from './index'
import type { Aplicacao, Desejo, FuturoEntrada, Taxa } from './tipos'

const ultimoSaldo = (l: { saldo_final: number }[]) => l[l.length - 1].saldo_final

function sorteio(semente: number) {
  let s = semente >>> 0
  const prox = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  return { num: prox, int: (a: number, b: number) => a + Math.floor(prox() * (b - a + 1)) }
}
const S = sorteio(20261113)
const MESES = listaMeses('2026-12', '2028-12')
const PAR = { taxa_bruta_ano: { 2026: '0.1375', 2027: '0.125', 2028: '0.11' } as Record<number, Taxa>, aliq_proj: '0.225', virada: '2029-01', taxa_real_trabalho: '0.04' }

/** Família de exemplo (inventada). */
function base(extra: Partial<FuturoEntrada> = {}): FuturoEntrada {
  return {
    hoje: '2026-11-18', saldo_caixa: 300_000_000, aplicacoes: [], recebimentos: [], compromissos: [], dividas: [], desvios: [], desejos: [],
    parametros: {
      mes_base: '2026-11', virada: '2029-01', gasto_2029_hoje: 2_000_000, renda_certa_2029: 0, margem: '0.10', taxa_real_trabalho: '0.04',
      taxa_bruta_ano: PAR.taxa_bruta_ano, ipca_ano: { 2026: '0.0522', 2027: '0.049', 2028: '0.04', 2029: '0.04' },
      aliq_proj: '0.225', piso_meses: 6, teto_mes: 3_000_000, mes_reajuste: 1,
    },
    ...extra,
  }
}

describe('desvio e renda de 2029', () => {
  it('desvio maior nunca dá renda maior (200 sorteios)', () => {
    for (let k = 0; k < 200; k++) {
      const m = MESES[S.int(0, MESES.length - 1)]
      const a = S.int(1, 50_000_000), b = a + S.int(0, 50_000_000)
      const pa = perdaRendaMensal(valorNaVirada(a, m, PAR), '0.04')!, pb = perdaRendaMensal(valorNaVirada(b, m, PAR), '0.04')!
      expect(pb).toBeGreaterThanOrEqual(pa)
      const ra = futuro(base({ desvios: [{ mes: m, valor: a, origem: 'exemplo' }] })).renda_sustentavel
      const rb = futuro(base({ desvios: [{ mes: m, valor: b, origem: 'exemplo' }] })).renda_sustentavel
      expect(rb).toBeLessThanOrEqual(ra)
    }
  })
  it('desvio mais cedo pesa mais (ou igual) na virada', () => {
    for (let k = 0; k < 100; k++) {
      const v = S.int(1, 20_000_000); const i = S.int(0, MESES.length - 2); const j = S.int(i, MESES.length - 1)
      expect(valorNaVirada(v, MESES[i], PAR)).toBeGreaterThanOrEqual(valorNaVirada(v, MESES[j], PAR))
    }
  })
  it('conferência F6: diferença entre 2 rodadas da linha bate com o valor na virada (até R$ 0,01 por mês)', () => {
    for (let k = 0; k < 60; k++) {
      const m = MESES[S.int(0, MESES.length - 1)]; const v = S.int(100, 10_000_000)
      const sem = ultimoSaldo(futuro(base()).linha)
      const com = ultimoSaldo(futuro(base({ desvios: [{ mes: m, valor: v, origem: 'exemplo' }] })).linha)
      const n = MESES.length
      expect(Math.abs(sem - com - valorNaVirada(v, m, PAR))).toBeLessThanOrEqual(n)
    }
  })
  it('impacto2029 usa os parâmetros da família e bate com F6-HOJE', () => {
    // Mudado pra incluir o campo novo modo (QA E11); valores iguais.
    expect(impacto2029(base(), { mes: '2026-12', valor: 5_000_000 })).toEqual({ valor_na_virada: 5_953_252, perda_renda_mensal: 19_489, modo: 'projecao' })
  })
})

describe('taxa real zero ou negativa nunca divide', () => {
  for (const t of ['0', '0.0000', '-0.01', '-0.5']) {
    it(`taxa real ${t}`, () => {
      expect(patrimonioNecessario(2_000_000, '0.10', t)).toBeNull()
      expect(rendaSustentavel(500_000_000, t)).toBe(0)
      expect(perdaRendaMensal(1_000_000, t)).toBeNull()
      const s = futuro(base({ parametros: { ...base().parametros, taxa_real_trabalho: t } }))
      expect(s.patrimonio_necessario).toBeNull()
      expect(s.folga).toBe(0)
      expect(s.ajustes_falta).toBeNull()
      expect(Number.isSafeInteger(s.renda_sustentavel)).toBe(true)
    })
  }
  it('Fisher com bruta igual à inflação e IR positivo dá taxa real negativa', () => {
    expect(taxaRealAnual('0.05', '0.20', '0.05').isNeg()).toBe(true)
  })
  it('guardar por mês com taxa zero não divide por zero', () => {
    expect(guardarPorMes(2_400_000, 24, '0')).toBe(100_000)
    expect(guardarPorMes(2_400_000, 0, '0.01')).toBe(2_400_000)
  })
})

describe('linha mês a mês', () => {
  it('conserva o dinheiro em todo mês e emenda os meses (100 sorteios)', () => {
    for (let k = 0; k < 100; k++) {
      const e = base({
        saldo_caixa: S.int(-50_000_000, 500_000_000),
        compromissos: [{ mes: MESES[S.int(0, 24)], valor: S.int(0, 9_000_000), tipo: 'conta_grande' }],
        dividas: [{ mes: MESES[S.int(0, 24)], valor: S.int(0, 9_000_000) }],
        recebimentos: [{ id: 'r', dono: 'exemplo', valor: S.int(1, 9_000_000), mes_previsto: MESES[S.int(0, 24)], mes_novo: null, certo: true, recebido: false }],
      })
      const l = futuro(e).linha
      expect(l.map((x) => x.mes)).toEqual(MESES)
      l.forEach((x, i) => {
        expect(x.saldo_final).toBe(x.saldo_inicial + x.rendimento + x.recebimentos - x.teto - x.compromissos - x.dividas - x.desvios + x.retornos)
        if (i > 0) expect(x.saldo_inicial).toBe(l[i - 1].saldo_final)
        if (x.saldo_inicial <= 0) expect(x.rendimento).toBe(0)
        for (const v of [x.saldo_inicial, x.rendimento, x.saldo_final, x.fica_devendo]) expect(Number.isSafeInteger(v)).toBe(true)
        expect(x.fica_devendo).toBeGreaterThanOrEqual(0)
      })
    }
  })
  it('saldo negativo nunca rende, em qualquer mês e taxa', () => {
    for (let k = 0; k < 100; k++) expect(rendimentoMes(-S.int(1, 1e9), '0.' + S.int(1, 30), '0.225', S.int(28, 31))).toBe(0)
  })
  it('recebimento atrasado nunca some: entra no mês seguinte a hoje e vira pergunta', () => {
    const e = base({ hoje: '2027-03-10', recebimentos: [{ id: 'atrasado', dono: 'exemplo', valor: 1_000_000, mes_previsto: '2027-01', mes_novo: null, certo: true, recebido: false }] })
    const s = futuro(e)
    expect(s.linha[0].mes).toBe('2027-04')
    expect(s.linha[0].recebimentos).toBe(1_000_000)
    expect(s.perguntas).toEqual([{ recebimento_atrasado: 'atrasado' }])
    // Com data nova dada pelo dono, entra nela e não pergunta de novo.
    expect(mesDoRecebimento({ ...e.recebimentos[0], mes_novo: '2027-06' }, '2027-03', '2028-12')).toEqual({ mes: '2027-06', pergunta: false })
  })
  it('soma dos recebimentos certos da linha é a soma dos cadastrados no período (nenhum some)', () => {
    for (let k = 0; k < 50; k++) {
      const recs = Array.from({ length: 6 }, (_, i) => ({ id: `r${i}`, dono: 'exemplo', valor: S.int(1, 5_000_000), mes_previsto: listaMeses('2026-06', '2028-12')[S.int(0, 30)], mes_novo: null, certo: true, recebido: false }))
      const l = futuro(base({ recebimentos: recs })).linha
      expect(l.reduce((s, x) => s + x.recebimentos, 0)).toBe(recs.reduce((s, r) => s + r.valor, 0))
    }
  })
  it('recebido, incerto e de 2029 não entram na linha', () => {
    const r = { dono: 'exemplo', valor: 1_000_000, mes_novo: null }
    const l = futuro(base({ recebimentos: [
      { ...r, id: 'a', mes_previsto: '2027-05', certo: true, recebido: true },
      { ...r, id: 'b', mes_previsto: '2027-05', certo: false, recebido: false },
      { ...r, id: 'c', mes_previsto: '2029-02', certo: true, recebido: false },
    ] })).linha
    expect(l.reduce((s, x) => s + x.recebimentos, 0)).toBe(0)
  })
  it('retorno de desejo incerto não entra na linha; certo entra', () => {
    const d: Desejo = { id: 'd', dono: 'exemplo', valor: 5_000_000, mes: '2027-01', volta_de: 'investimento', volta: 6_000_000, volta_mes: '2028-01', antecipado: null, volta_certa: false }
    const ret = (x: Desejo) => futuro(base({ desejos: [x] })).linha.reduce((s, l) => s + l.retornos, 0)
    expect(ret(d)).toBe(0)
    expect(ret({ ...d, volta_certa: true })).toBe(6_000_000)
  })
  it('teto reajusta em janeiro e o piso acompanha', () => {
    const l = futuro(base()).linha
    expect(l.find((x) => x.mes === '2026-12')!.teto).toBe(3_000_000)
    expect(l.find((x) => x.mes === '2027-01')!.teto).toBe(3_156_600)
    expect(l.find((x) => x.mes === '2028-01')!.teto).toBe(3_311_273)
  })
})

describe('patrimônio, folga e desejos', () => {
  it('margem maior pede mais patrimônio; taxa real maior pede menos', () => {
    for (let k = 0; k < 100; k++) {
      const g = S.int(1, 10_000_000); const m1 = (S.int(0, 30) / 100).toString(); const m2 = (Number(m1) + S.int(0, 20) / 100).toString()
      expect(patrimonioNecessario(g, m2, '0.04')!).toBeGreaterThanOrEqual(patrimonioNecessario(g, m1, '0.04')!)
      expect(patrimonioNecessario(g, '0.1', '0.05')!).toBeLessThanOrEqual(patrimonioNecessario(g, '0.1', '0.04')!)
    }
  })
  it('falta gera os 3 ajustes, sem sinal nos valores; folga não gera', () => {
    const pobre = futuro(base({ saldo_caixa: 50_000_000, desejos: [
      { id: 'pequeno', dono: 'exemplo', valor: 100_000, mes: '2027-02', volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false },
      { id: 'grande', dono: 'exemplo', valor: 900_000, mes: '2027-03', volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false },
    ] }))
    expect(pobre.folga).toBeLessThan(0)
    expect(pobre.ajustes_falta!.guardar_por_mes).toBeGreaterThan(0)
    expect(pobre.ajustes_falta!.cortar_por_mes_2029).toBeGreaterThan(0)
    expect(pobre.ajustes_falta!.desejos_pra_adiar).toEqual(['grande', 'pequeno'])
    const rico = futuro(base({ saldo_caixa: 2_000_000_000 }))
    expect(rico.folga).toBeGreaterThanOrEqual(0)
    expect(rico.ajustes_falta).toBeNull()
  })
  it('desejo com volta certa maior que a saída tira menos da renda que o mesmo desejo incerto', () => {
    for (let k = 0; k < 50; k++) {
      const V = S.int(1, 10_000_000); const d = { valor: V, mes: '2027-01', volta: V + S.int(1, 5_000_000), volta_mes: '2027-06', volta_de: 'venda' as const }
      const certo = avaliarDesejo({ ...d, volta_certa: true }, PAR).impacto_renda_mensal!
      const incerto = avaliarDesejo({ ...d, volta_certa: false }, PAR).impacto_renda_mensal!
      expect(certo).toBeLessThanOrEqual(incerto)
    }
  })
  it('cabe? pequeno cabe; enorme ainda não cabe e diz o 1º mês abaixo do piso', () => {
    const d: Desejo = { id: 'viagem', dono: 'exemplo', valor: 1_000_000, mes: '2027-02', volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false }
    const rico = base({ saldo_caixa: 2_000_000_000 })
    expect(cabeDesejo(rico, d).situacao).toBe('cabe')
    const r = cabeDesejo(base({ saldo_caixa: 100_000_000 }), { ...d, valor: 80_000_000 })
    expect(r.situacao).toBe('ainda nao cabe')
    expect(r.primeiro_mes_abaixo).toBe('2027-02')
  })
})

describe('cabe? compara com a linha sem o desejo (REVISOR C3)', () => {
  const d: Desejo = { id: 'viagem', dono: 'exemplo', valor: 1, mes: '2027-02', volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false }
  it('família já abaixo do piso: desejo pequeno mostra o custo e não "ainda não cabe"', () => {
    const apertada = base({ saldo_caixa: 10_000_000 }) // piso de 6 tetos = 18 milhões de centavos: já começa abaixo
    expect(futuro(apertada).linha[0].fica_devendo).toBeGreaterThan(0)
    const r = cabeDesejo(apertada, { ...d, valor: 100_000 })
    expect(r.situacao).toBe('apertado sem o desejo')
    expect(r.primeiro_mes_abaixo).toBeNull()
    expect(r.apertado_sem_desejo).toBe('2026-12')
    expect(r.tira_por_mes_2029).toBeGreaterThan(0)
  })
  it('desejo de R$ 0,01 nunca muda o veredito da base (60 sorteios)', () => {
    for (let k = 0; k < 60; k++) {
      const e = base({ saldo_caixa: S.int(0, 2_500_000_000), dividas: [{ mes: MESES[S.int(0, 24)], valor: S.int(0, 50_000_000) }] })
      const sem = futuro(e)
      const r = cabeDesejo(e, { ...d, mes: MESES[S.int(0, 24)] })
      const esperado = sem.linha.some((l) => l.fica_devendo > 0) ? 'apertado sem o desejo' : sem.folga >= 1 ? 'cabe' : r.situacao
      expect(r.situacao).toBe(esperado)
      expect(r.situacao).not.toBe('ainda nao cabe')
    }
  })
  it('desejo que derruba um mês bom continua "ainda não cabe" e diz quando caberia', () => {
    const r = cabeDesejo(base({ saldo_caixa: 100_000_000 }), { ...d, valor: 80_000_000 })
    expect(r.situacao).toBe('ainda nao cabe'); expect(r.primeiro_mes_abaixo).toBe('2027-02'); expect(r.apertado_sem_desejo).toBeNull()
  })
})

describe('reajuste do teto (REVISOR C4)', () => {
  it('família de 1 adulto: 1 aprovação basta e vale no mês seguinte', () => {
    expect(tetoVigente(3_000_000, 3_156_600, [true], '2027-01', '2027-01')).toEqual({ teto: 3_000_000, situacao: 'aprovado, vale no mes seguinte' })
    expect(tetoVigente(3_000_000, 3_156_600, [true], '2027-01', '2027-02')).toEqual({ teto: 3_156_600, situacao: 'aprovado' })
  })
  it('casal: falta 1 aprovação, fica pendente; sem adulto nenhum, pendente', () => {
    expect(tetoVigente(3_000_000, 3_156_600, [true, false], '2027-01', '2027-03').situacao).toBe('sugestao pendente')
    expect(tetoVigente(3_000_000, 3_156_600, [], '2027-01', '2027-03').situacao).toBe('sugestao pendente')
    expect(tetoVigente(3_000_000, 3_156_600, [true, true], '2027-01', '2027-02').teto).toBe(3_156_600)
  })
})

describe('IR, FGC e arredondamento', () => {
  it('alíquota nunca sobe com mais dias', () => {
    let ant = aliquotaIR(0)
    for (let d = 1; d <= 1000; d++) { const a = aliquotaIR(d); expect(a.lte(ant)).toBe(true); ant = a }
  })
  it('FGC: fora nunca negativo nem maior que o saldo; Tesouro não avisa', () => {
    for (let k = 0; k < 100; k++) {
      const s = S.int(0, 100_000_000), t = S.int(1, 4)
      const r = fgcConta(s, t)
      expect(r.fora).toBeGreaterThanOrEqual(0); expect(r.fora).toBeLessThanOrEqual(s)
    }
    const ap = (x: Partial<Aplicacao>): Aplicacao => ({ id: 'a', titular: 'titular 1', titulares: ['titular 1'], banco: 'Banco A', saldo: 0, taxa_bruta_anual: '0.12', isenta: false, aplicada_em: '2026-01-01', resgate_previsto: null, fgc: true, ...x })
    expect(avisosFGC([ap({ saldo: 90_000_000, fgc: false })])).toEqual([])
    expect(avisosFGC([ap({ saldo: 15_000_000 }), ap({ id: 'b', saldo: 11_000_000 })])).toEqual([{ banco: 'Banco A', titular: 'titular 1', fora: 1_000_000 }])
    // Conjunta (REVISOR C5): cada titular da lista recebe a parte dele; os 2 avisos somam os 30.000 do FGC-CONJUNTA.
    expect(avisosFGC([ap({ saldo: 28_000_000, titulares: ['titular 1', 'titular 2'] })])).toEqual([{ banco: 'Banco A', titular: 'titular 1', fora: 1_500_000 }, { banco: 'Banco A', titular: 'titular 2', fora: 1_500_000 }])
    // A parte do 2º titular conta no CPF dele junto com a conta individual que ele tem no mesmo banco.
    expect(avisosFGC([ap({ saldo: 20_000_000, titulares: ['titular 1', 'titular 2'] }), ap({ id: 'b', titular: 'titular 2', titulares: ['titular 2'], saldo: 20_000_000 })])).toEqual([{ banco: 'Banco A', titular: 'titular 2', fora: 5_000_000 }]) // 100.000 da conjunta + 200.000 individual − 250.000
    const cinco = ['A', 'B', 'C', 'D', 'E'].map((b) => ap({ id: b, banco: `Banco ${b}`, saldo: 22_000_000 }))
    expect(avisosFGC(cinco)).toEqual([{ banco: 'todos os bancos', titular: 'titular 1', fora: 10_000_000 }])
  })
  it('meio pra cima, longe do zero', () => {
    expect(arred(new Dec('0.5'))).toBe(1); expect(arred(new Dec('-0.5'))).toBe(-1)
    expect(arred(new Dec('0.4999999999'))).toBe(0); expect(Object.is(arred(new Dec('-0.4')), 0)).toBe(true)
    expect(comCasas(new Dec('1.00005'), 4)).toBe('1.0001'); expect(comCasas(new Dec('-0.00005'), 4)).toBe('-0.0001'); expect(comCasas(new Dec('0.00004'), 4)).toBe('0.0000')
  })
  it('centavos quebrados são recusados', () => {
    expect(() => rendimentoMes(10.5, '0.1', '0.2', 30)).toThrow()
    expect(() => futuro(base({ saldo_caixa: 1.5 }))).toThrow()
  })
  it('meses: virada e emendas', () => {
    expect(mesAnterior('2029-01')).toBe('2028-12'); expect(proximoMes('2028-12')).toBe('2029-01')
  })
})

describe('regra da pasta', () => {
  it('nenhum arquivo do motor usa a potência nem a formatação nativas', () => {
    // Lê o texto de todo .ts da pasta pelo próprio Vite (sem tipos do Node).
    const fontes = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.keys(fontes).length).toBeGreaterThanOrEqual(14)
    const proibido = ['Math' + '\\.pow', 'to' + 'Fixed', '[\\w)\\]]\\s*\\*\\*\\s*[\\w(]']
    for (const [f, txt] of Object.entries(fontes)) {
      for (const p of proibido) expect(new RegExp(p).test(txt), `${f} usa ${p}`).toBe(false)
    }
  })
})
