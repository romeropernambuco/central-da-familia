// Pedidos do REVISOR 2 (fase_final/revisao/E4_E10.md, item 2, B3 e observação do cabeDesejo). Todo número é exemplo.
import { describe, expect, it } from 'vitest'
import * as motor from './index'
import { cabeDesejo, folha13, futuro, pisoDoMes } from './index'
import type { Desejo, FuturoEntrada } from './index'

describe('fronteira: fora de lib/futuro só se importa pelo index', () => {
  it('nenhum arquivo de codigo/src importa um arquivo de dentro de lib/futuro', () => {
    const fontes = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.keys(fontes).length).toBeGreaterThan(20)
    const porDentro = /(?:from\s*|import\s*\(\s*)['"]([^'"]*\bfuturo\/[^'"]+)['"]/g
    const erros: string[] = []
    for (const [arq, txt] of Object.entries(fontes)) {
      if (arq.startsWith('/src/lib/futuro/')) continue
      for (const m of txt.matchAll(porDentro)) erros.push(`${arq}: ${m[1]}`)
    }
    expect(erros, 'troque por import de lib/futuro (index)').toEqual([])
    // A regra pega o que tem que pegar (conferência da própria expressão).
    const amostra = `import { x } from '../../lib/futuro/f8_reajuste'\nconst y = await import('./lib/futuro/f7_desejo')\nimport { z } from '../lib/futuro'\nimport { w } from './futuro'`
    expect([...amostra.matchAll(porDentro)].map((m) => m[1])).toEqual(['../../lib/futuro/f8_reajuste', './lib/futuro/f7_desejo'])
  })
  it('o index entrega tudo que a tela usa hoje', () => {
    for (const nome of ['futuro', 'impacto2029', 'cabeDesejo', 'mesDoRecebimento', 'avaliarAntecipacao', 'avaliarDesejo', 'reajustarTeto', 'tetoVigente', 'avisosFGC', 'TODOS_OS_BANCOS', 'Dec', 'pisoDoMes', 'folha13'])
      expect(motor, nome).toHaveProperty(nome)
  })
})

describe('piso e 13º dentro do motor (B3)', () => {
  const e: FuturoEntrada = {
    hoje: '2026-11-18', saldo_caixa: 300_000_000, aplicacoes: [], recebimentos: [], compromissos: [], dividas: [], desvios: [], desejos: [],
    parametros: { mes_base: '2026-11', virada: '2029-01', gasto_2029_hoje: 2_000_000, renda_certa_2029: 0, margem: '0.10', taxa_real_trabalho: '0.04', taxa_bruta_ano: { 2026: '0.1375', 2027: '0.125', 2028: '0.11' }, ipca_ano: { 2026: '0.0522', 2027: '0.049', 2028: '0.04' }, aliq_proj: '0.225', piso_meses: 6, teto_mes: 3_000_000, mes_reajuste: 1 },
  }
  it('cada mês da linha traz o piso que o motor usou (6 × teto do mês)', () => {
    const l = futuro(e).linha
    expect(l[0].piso).toBe(18_000_000)
    expect(l.find((x) => x.mes === '2027-01')!.piso).toBe(6 * 3_156_600)
    for (const x of l) expect(x.piso).toBe(pisoDoMes(6, x.teto))
  })
  it('pisoDoMes recusa meses quebrados ou negativos', () => {
    expect(() => pisoDoMes(1.5, 100)).toThrow(); expect(() => pisoDoMes(-1, 100)).toThrow(); expect(pisoDoMes(0, 100)).toBe(0)
  })
  it('13º: 1 salário de cada pessoa em dezembro de cada ano até o ano antes da virada', () => {
    expect(folha13([150_000, 200_000], '2026-11', '2029-01')).toEqual([
      { mes: '2026-12', valor: 350_000, tipo: 'folha_13' }, { mes: '2027-12', valor: 350_000, tipo: 'folha_13' }, { mes: '2028-12', valor: 350_000, tipo: 'folha_13' },
    ])
    expect(folha13([], '2026-11', '2029-01')).toEqual([])
    expect(() => folha13([10.5], '2026-11', '2029-01')).toThrow()
  })
  it('13º entra na linha como compromisso de dezembro', () => {
    const com = futuro({ ...e, compromissos: folha13([150_000], '2026-11', '2029-01') }).linha
    expect(com.filter((x) => x.compromissos > 0).map((x) => x.mes)).toEqual(['2026-12', '2027-12', '2028-12'])
  })
})

describe('cabe? avisa o aperto que já existia (observação pro ECONOMISTA)', () => {
  it('base abaixo do piso em 12/2026 e desejo que derruba 01/2027: "ainda não cabe" e também o mês já apertado', () => {
    // Caixa logo abaixo do piso em 12/2026 que volta pra cima em 01/2027 com um recebimento (exemplo inventado).
    const e: FuturoEntrada = {
      hoje: '2026-11-18', saldo_caixa: 2_800_000, aplicacoes: [], compromissos: [], dividas: [], desvios: [], desejos: [],
      recebimentos: [{ id: 'r', dono: 'exemplo', valor: 10_000_000, mes_previsto: '2027-01', mes_novo: null, certo: true, recebido: false }],
      parametros: { mes_base: '2026-11', virada: '2029-01', gasto_2029_hoje: 0, renda_certa_2029: 0, margem: '0.10', taxa_real_trabalho: '0.04', taxa_bruta_ano: { 2026: '0.1375', 2027: '0.125', 2028: '0.11' }, ipca_ano: { 2026: '0.0522', 2027: '0.049', 2028: '0.04' }, aliq_proj: '0.225', piso_meses: 6, teto_mes: 500_000, mes_reajuste: 1 },
    }
    const base = futuro(e).linha
    expect(base[0].fica_devendo).toBeGreaterThan(0); expect(base[1].fica_devendo).toBe(0)
    const d: Desejo = { id: 'd', dono: 'exemplo', valor: 10_000_000, mes: '2026-12', volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false }
    const r = cabeDesejo(e, d)
    expect(r.situacao).toBe('ainda nao cabe')
    expect(r.primeiro_mes_abaixo).toBe('2027-01')
    expect(r.apertado_sem_desejo).toBe('2026-12')
  })
})
