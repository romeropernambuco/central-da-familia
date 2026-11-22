import { describe, expect, it } from 'vitest'
import {
  cadernoVazio,
  contaDoAno,
  fraseDaSituacao,
  inicioDoCaderno,
  lerCaderno,
  resumoDoMes,
  situacaoDoMes,
  vencimento,
  type CadernoImovel,
} from './aluguel'

const HOJE = '2026-11-22'
const caderno = (c: Partial<CadernoImovel>): CadernoImovel => ({ ...cadernoVazio(), ...c })

describe('o aluguel de cada mês', () => {
  it('chegou, atrasado ou ainda vai vencer, pelo dia combinado', () => {
    const c = caderno({ dia_vencimento: 10, recebimentos: [{ mes: '2026-10', data: '2026-10-08', valor: 3000 }] })
    expect(situacaoDoMes(c, '2026-10', HOJE)).toEqual({ tipo: 'recebido', data: '2026-10-08', valor: 3000 })
    expect(situacaoDoMes(c, '2026-11', HOJE)).toEqual({ tipo: 'atrasado', dias: 12, vence: '2026-11-10' })
    expect(situacaoDoMes(caderno({ dia_vencimento: 25 }), '2026-11', HOJE)).toEqual({
      tipo: 'a_vencer',
      dias: 3,
      vence: '2026-11-25',
    })
    expect(fraseDaSituacao(situacaoDoMes(c, '2026-10', HOJE))).toBe('chegou em 08/10')
    expect(fraseDaSituacao(situacaoDoMes(c, '2026-11', HOJE))).toBe('atrasado há 12 dias')
    expect(fraseDaSituacao(situacaoDoMes(caderno({ dia_vencimento: 22 }), '2026-11', HOJE))).toBe('vence hoje')
    expect(fraseDaSituacao(situacaoDoMes(caderno({ dia_vencimento: 23 }), '2026-11', HOJE))).toBe('vence dia 23/11')
  })
  it('vencimento no dia 31 de um mês curto cai no último dia', () => {
    expect(vencimento('2027-02', 31)).toBe('2027-02-28')
    expect(vencimento('2028-02', 30)).toBe('2028-02-29')
    expect(vencimento('2026-11', 31)).toBe('2026-11-30')
  })
})

describe('o ano do imóvel', () => {
  it('soma o que chegou e as despesas dos últimos 12 meses e diz quanto rendeu sobre o valor', () => {
    const recebimentos = Array.from({ length: 10 }, (_, i) => ({
      mes: `2026-${String(i + 1).padStart(2, '0')}`,
      data: `2026-${String(i + 1).padStart(2, '0')}-09`,
      valor: 3000,
    }))
    const c = caderno({
      dia_vencimento: 10,
      recebimentos: [
        { mes: '2025-11', data: '2025-11-09', valor: 3000 },
        ...recebimentos,
        { mes: '2025-10', data: '2025-10-09', valor: 3000 },
      ],
      despesas: [
        { id: 'd1', data: '2026-02-10', valor: 1200, descricao: 'IPTU' },
        { id: 'd2', data: '2026-07-01', valor: 800, descricao: 'Conserto' },
        { id: 'd3', data: '2025-01-01', valor: 999, descricao: 'antigo' },
      ],
    })
    const a = contaDoAno(c, 600000, HOJE)
    // dez/25 a nov/26: 12 meses vencidos; chegaram jan a out (10) e não chegaram dez/25 e nov/26
    expect(a).toMatchObject({ esperados: 12, recebidos: 10, recebido: 30000, despesas: 2000, sobrou: 28000 })
    expect(a.atrasados).toEqual(['2025-12', '2026-11'])
    expect(a.pct_ano).toBe(4.7)
    expect(contaDoAno(c, 0, HOJE).pct_ano).toBeNull()
  })
  it('o mês de hoje que ainda não venceu não conta como esperado', () => {
    const a = contaDoAno(caderno({ dia_vencimento: 28, desde: '2025-12' }), 100000, HOJE)
    expect(a.esperados).toBe(11)
    expect(a.atrasados).toHaveLength(11)
  })
  it('imóvel que acabou de entrar no caderno não nasce com 11 meses atrasados', () => {
    const novo = caderno({ dia_vencimento: 5 })
    expect(inicioDoCaderno(novo, '2026-11')).toBe('2026-11')
    expect(situacaoDoMes(novo, '2026-10', HOJE)).toEqual({ tipo: 'antes', vence: '2026-10-05' })
    expect(fraseDaSituacao(situacaoDoMes(novo, '2026-10', HOJE))).toBe('antes do caderno')
    expect(contaDoAno(novo, 100000, HOJE)).toMatchObject({ esperados: 1, atrasados: ['2026-11'] })
    // anotar um mês antigo puxa o começo do caderno para trás
    const comAntigo = caderno({ dia_vencimento: 5, recebimentos: [{ mes: '2026-08', data: '2026-08-05', valor: 1 }] })
    expect(inicioDoCaderno(comAntigo, '2026-11')).toBe('2026-08')
    expect(contaDoAno(comAntigo, 100000, HOJE).atrasados).toEqual(['2026-09', '2026-10', '2026-11'])
  })
})

describe('os aluguéis do mês, todos os imóveis', () => {
  it('quantos chegaram, quantos atrasaram e quanto falta', () => {
    const cad = {
      a: caderno({ recebimentos: [{ mes: '2026-11', data: '2026-11-05', valor: 3000 }] }),
      b: caderno({ dia_vencimento: 10 }),
    }
    expect(
      resumoDoMes(
        [
          { id: 'a', aluguel: 3000 },
          { id: 'b', aluguel: 4000 },
          { id: 'c', aluguel: 1000 },
        ],
        cad,
        HOJE,
      ),
    ).toEqual({
      alugados: 3,
      recebidos: 1,
      atrasados: 2,
      recebido: 3000,
      falta: 5000,
    })
  })
  it('o que veio estragado do banco não derruba a tela', () => {
    for (const v of [null, undefined, 'x', 7, []]) expect(lerCaderno(v)).toEqual({})
    expect(
      lerCaderno({
        a: {
          dia_vencimento: 'x',
          recebimentos: [
            { mes: 'nov', valor: 1 },
            { mes: '2026-11', data: '2026-11-01', valor: 5 },
          ],
          despesas: 'x',
        },
      }),
    ).toEqual({
      a: { dia_vencimento: 10, recebimentos: [{ mes: '2026-11', data: '2026-11-01', valor: 5 }], despesas: [] },
    })
  })
})

it('o mesmo mês marcado em 2 celulares conta 1 vez só', () => {
  const c = lerCaderno({
    a: {
      dia_vencimento: 10,
      recebimentos: [
        { mes: '2026-10', data: '2026-10-08', valor: 100 },
        { mes: '2026-10', data: '2026-10-09', valor: 100 },
      ],
      despesas: [],
    },
  }).a
  expect(c.recebimentos).toEqual([{ mes: '2026-10', data: '2026-10-09', valor: 100 }])
  expect(contaDoAno(c, 0, HOJE).recebido).toBe(100)
})
