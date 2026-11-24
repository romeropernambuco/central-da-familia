import { afterEach, expect, it } from 'vitest'
import { apiExemplo, exemploComo, reiniciarExemplo } from './exemplo'
import { normalizaLancamento } from './normaliza'
import { recursosDaMutacao } from './recursos'
import { hojeRecife } from '../lib/formato'

afterEach(() => reiniciarExemplo())
const F = 'fam-silva'
const hoje = hojeRecife()

const gastar = async () =>
  (
    await apiExemplo.lancar({
      familia: F,
      envelope: 'env-ana',
      valor: 33,
      data: hoje,
      descricao: 'Coisa sem tipo',
      cartao: null,
      parcelas: 1,
      segundos: 3,
      chave: 'tipo-teste-' + Math.random(),
    })
  ).lancamento.id

it('tipo do gasto (24/11): quem lançou escolhe, volta a adivinhar com null, e o outro não muda', async () => {
  const id = await gastar()
  const ler = async () => (await apiExemplo.lancamentos(F, hoje.slice(0, 7))).find(l => l.id === id)!
  await apiExemplo.lancamentoTipo!(id, 'Saúde')
  expect((await ler()).tipo).toBe('Saúde')
  await apiExemplo.lancamentoTipo!(id, null)
  expect((await ler()).tipo).toBeNull()
  exemploComo('equipe')
  await expect(apiExemplo.lancamentoTipo!(id, 'Mercado')).rejects.toThrow('Só quem lançou')
})

it('o banco devolve o tipo e a tela relê só a lista de gastos', () => {
  const base = { id: 'x', envelope_id: 'e', valor: 1, data: '2026-11-01', criado_em: '2026-11-01T00:00:00Z' }
  expect(normalizaLancamento({ ...base, tipo: 'Mercado' }).tipo).toBe('Mercado')
  expect('tipo' in normalizaLancamento({ ...base, tipo: null })).toBe(false)
  expect(recursosDaMutacao('lancamentoTipo', [])).toEqual(['lancamentos'])
})
