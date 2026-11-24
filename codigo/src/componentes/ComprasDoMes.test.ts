import { expect, it } from 'vitest'
import type { Lancamento } from '../api/tipos'
import { reais } from '../lib/formato'
import { comprasDoMes, fraseDoMesPassado, fraseDosJuntos, somaDoMesPassado, somaPorTipo } from './ComprasDoMes'

const l = (id: string, descricao: string, valor: number, data = '2026-11-10', extra: Partial<Lancamento> = {}) =>
  ({
    id,
    envelope_id: 'e1',
    cartao_id: null,
    valor,
    data,
    descricao,
    apagado_em: null,
    criado_em: data + 'T10:00:00Z',
    ...extra,
  }) as Lancamento

it('onde foi o dinheiro: soma por tipo, maior primeiro, sem apagado, parcela antiga nem outro mês', () => {
  const lanc = [
    l('1', 'Café', 10),
    l('2', 'Padaria', 5.5),
    l('3', 'Mercadinho', 140),
    l('4', 'Coisa qualquer', 20),
    l('5', 'Mercado', 60, '2026-11-12'),
    l('6', 'Café', 999, '2026-11-11', { apagado_em: '2026-11-12' }),
    l('7', 'Tênis', 300, '2026-10-30'),
    l('8', 'Tênis', 50, '2026-11-05', { parcela: { n: 2, de: 6, compra: '7' } }),
    l('9', 'Roupa', 70, '2026-11-01', { envelope_id: 'outro' }),
  ]
  const compras = comprasDoMes(lanc, 'e1', '2026-11')
  expect(compras.map(c => c.id)).toEqual(['5', '1', '2', '3', '4'])
  const grupos = somaPorTipo(compras, 'Ana')
  expect(grupos.map(g => [g.nome, g.valor, g.n])).toEqual([
    ['Mercado', 200, 2],
    ['Lanche e café', 15.5, 2],
    ['Outros', 20, 1],
  ])
})

it('onde foi o dinheiro: além de 4 tipos, o resto vira Outros e Outros fica no fim', () => {
  const compras = ['Café', 'Mercado', 'Farmácia', 'Gasolina', 'Presente', 'Salão'].map((d, i) =>
    l(String(i), d, 100 - i),
  )
  const grupos = somaPorTipo(compras, 'Ana')
  expect(grupos.map(g => g.nome)).toEqual(['Lanche e café', 'Mercado', 'Saúde', 'Combustível', 'Outros'])
  expect(grupos.at(-1)!.valor).toBe(191)
})

it('o tipo escolhido ao anotar vence o nome', () => {
  const grupos = somaPorTipo([l('1', 'Coisa qualquer', 40, '2026-11-10', { tipo: 'Saúde' }), l('2', 'Café', 10)], 'Ana')
  expect(grupos.map(g => [g.nome, g.valor])).toEqual([
    ['Saúde', 40],
    ['Lanche e café', 10],
  ])
})

it('mês passado: compara só até o mesmo dia, e Outros soma os tipos que juntou', () => {
  const antes = [
    l('a', 'Café', 30, '2026-10-05'),
    l('b', 'Café', 500, '2026-10-28'), // depois do dia 24: não entra
    l('c', 'Salão', 50, '2026-10-10'),
  ]
  const soma = somaDoMesPassado(antes, 'e1', 'Ana', '2026-10', 24)!
  expect(soma).toEqual({ 'Lanche e café': 30, Beleza: 50 })
  expect(somaDoMesPassado(antes, 'outro', 'Ana', '2026-10', 24)).toBeNull()
  const base = { icone: null, n: 1, compras: [], juntos: [] as string[] }
  expect(fraseDoMesPassado({ ...base, nome: 'Lanche e café', valor: 50 }, soma, 'outubro')).toBe(
    `${reais(20)} a mais que em outubro`,
  )
  expect(fraseDoMesPassado({ ...base, nome: 'Mercado', valor: 50 }, soma, 'outubro')).toBe('Em outubro não teve')
  expect(fraseDoMesPassado({ ...base, nome: 'Outros', valor: 20, juntos: ['Beleza'] }, soma, 'outubro')).toBe(
    `${reais(30)} a menos que em outubro`,
  )
  expect(fraseDoMesPassado({ ...base, nome: 'Lanche e café', valor: 30 }, soma, 'outubro')).toBe('Igual a outubro')
})

it('Outros diz o que tem dentro e guarda as compras de cada tipo', () => {
  const compras = ['Café', 'Mercado', 'Farmácia', 'Gasolina', 'Presente', 'Salão', 'Coisa'].map((d, i) =>
    l(String(i), d, 100 - i),
  )
  const outros = somaPorTipo(compras, 'Ana').at(-1)!
  expect(outros.juntos).toEqual(['Presentes e festas', 'Beleza'])
  expect(outros.compras.map(c => c.descricao).sort()).toEqual(['Coisa', 'Presente', 'Salão'])
  expect(fraseDosJuntos(outros.juntos)).toBe('Presentes e festas e Beleza')
  expect(fraseDosJuntos(['A', 'B', 'C', 'D'])).toBe('A, B e mais 2')
})
