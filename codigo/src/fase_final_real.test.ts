// Revisão E4 a E6 (D1 e D2): a consulta que o real.ts MONTA pro Supabase, lida por um cliente de mentira que anota
// cada chamada (tabela, filtros, ordem, paginação). Nenhuma rede; nenhum dado real.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
// @ts-ignore: o projeto não tem os tipos do Node; o Vitest roda em Node
import { readFileSync } from 'node:fs'

type Chamada = { tabela: string; passos: [string, unknown[]][] }
const chamadas: Chamada[] = []
/** O que cada consulta devolve, por tabela e pelo último passo (ex.: 'objetivo:maybeSingle'). */
let respostas: Record<string, { data: unknown; error: null }> = {}

function construtor(tabela: string) {
  const c: Chamada = { tabela, passos: [] }
  chamadas.push(c)
  const p: any = new Proxy({}, {
    get(_t, nome: string) {
      if (nome === 'then') {
        const ult = c.passos.filter(x => !['eq', 'is', 'gte', 'lt', 'order', 'range'].includes(x[0])).map(x => x[0]).join('+')
        const r = respostas[`${tabela}:${ult}`] ?? { data: [], error: null }
        return (ok: (v: unknown) => void) => ok(r)
      }
      return (...args: unknown[]) => { c.passos.push([nome, args]); return p }
    },
  })
  return p
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (t: string) => construtor(t),
    rpc: async () => ({ data: null, error: null }),
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u-exemplo' } } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
  }),
}))

let api: typeof import('./api/real').apiReal
beforeAll(async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.invalid')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-publicavel-de-exemplo')
  api = (await import('./api/real')).apiReal
})
beforeEach(() => { chamadas.length = 0; respostas = {} })
const passos = (c: Chamada) => c.passos.map(x => x[0])

describe('D1: a consulta de lançamentos do mês', () => {
  it('filtra pela família e pelo mês, ordena e pagina de 1.000 em 1.000', async () => {
    await api.lancamentos('fam-exemplo', '2026-12')
    const c = chamadas.find(x => x.tabela === 'lancamentos')!
    expect(c).toBeTruthy()
    expect(c.passos).toContainEqual(['select', ['*']])
    expect(c.passos).toContainEqual(['eq', ['familia_id', 'fam-exemplo']])
    expect(c.passos).toContainEqual(['gte', ['data', '2026-12-01']])
    expect(c.passos).toContainEqual(['lt', ['data', '2027-01-01']])
    expect(passos(c).filter(x => x === 'order').length).toBeGreaterThanOrEqual(3)
    expect(c.passos).toContainEqual(['range', [0, 999]])
  })
  it('com 1.000 linhas, a 2ª página começa no 1.000 (sem repetir a 1ª)', async () => {
    respostas['lancamentos:select'] = { data: Array.from({ length: 1000 }, (_, i) => ({ id: 'l' + i, valor: 1, data: '2026-12-01', envelope_id: 'e' })), error: null }
    await api.lancamentos('fam-exemplo', '2026-12')
    const ranges = chamadas.filter(x => x.tabela === 'lancamentos').map(c => c.passos.find(p => p[0] === 'range')![1])
    expect(ranges.slice(0, 2)).toEqual([[0, 999], [1000, 1999]])
  })
  it('nenhuma linha do real.ts tem comentário // depois de uma chamada ao banco (o resto da linha some)', async () => {
    const ruins = readFileSync('src/api/real.ts', 'utf8').split('\n').map((l: string, i: number) => [i + 1, l] as const)
      .filter(([, l]: readonly [number, string]) => /(sb\(\)|rpc\(|\.from\(|\.eq\(|\.select\()/.test(l) && /\)\s*\/\/[^\n]*\.(eq|gte|lt|order|range|in|is)\(/.test(l))
    expect(ruins).toEqual([])
  })
})

describe('D2: salvar o objetivo respeita a permissão da f_07 (insert; update só de parametros)', () => {
  const p = { gasto_2029_hoje: null, renda_certa_2029: 0, margem: '0.1', taxa_real_trabalho: '0.04', aliq_proj: '0.15', taxa_bruta_ano: {}, ipca_ano: {}, piso_meses: null, mes_reajuste: 1, travado_focus: false }
  it('1º salvar (não existe): insert com a família e os parâmetros, sem upsert', async () => {
    respostas['objetivo:select+maybeSingle'] = { data: null, error: null }
    await api.objetivoSalvar!('fam-exemplo', p)
    const cs = chamadas.filter(x => x.tabela === 'objetivo')
    expect(cs.flatMap(passos)).not.toContain('upsert')
    expect(cs.some(c => c.passos.some(x => x[0] === 'insert' && (x[1][0] as any).familia_id === 'fam-exemplo'))).toBe(true)
    expect(cs.flatMap(passos)).not.toContain('update')
  })
  it('2º salvar (já existe): update só da coluna parametros, filtrado pela família', async () => {
    respostas['objetivo:select+maybeSingle'] = { data: { familia_id: 'fam-exemplo' }, error: null }
    await api.objetivoSalvar!('fam-exemplo', p)
    const cs = chamadas.filter(x => x.tabela === 'objetivo')
    const up = cs.find(c => passos(c).includes('update'))!
    expect(Object.keys(up.passos.find(x => x[0] === 'update')![1][0] as object)).toEqual(['parametros'])
    expect(up.passos).toContainEqual(['eq', ['familia_id', 'fam-exemplo']])
    expect(cs.flatMap(passos)).not.toContain('insert')
    expect(cs.flatMap(passos)).not.toContain('upsert')
  })
})

describe('f_11: o dinheiro em conta corrente entra no motor', () => {
  it('saldo_caixa do banco vira o saldo_caixa da entrada e sai do "a confirmar"; sem o campo, 0 e "a confirmar"', async () => {
    const { entradaDoBanco } = await import('./api/futuro')
    const base: any = { hoje: '2026-11-18', mes_base: '2026-11', aplicacoes: [], cdi_hoje: { pct_ano: '14.9' }, recebimentos: [], limites_mes: [{ envelope_id: 'e', limite_centavos: 1000000 }], config: null, parcelas_futuras: [], desejos: [], parametros: null,
      focus: [2026, 2027, 2028].map(ano => ({ ano, selic_fim: '0.12', ipca: '0.04', divulgado_em: '2026-11-09', fonte: 'exemplo' })) }
    const com = entradaDoBanco({ ...base, saldo_caixa: 1234567 })
    expect(com.entrada!.saldo_caixa).toBe(1234567)
    expect(com.confirmar.join(' ')).not.toMatch(/dinheiro parado na conta/)
    const sem = entradaDoBanco(base)
    expect(sem.entrada!.saldo_caixa).toBe(0)
    expect(sem.confirmar.join(' ')).toMatch(/dinheiro parado na conta/)
  })
})
