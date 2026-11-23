// Pedido do dono (23/11/2026): o IPTU e qualquer conta do ano saem do que dá para gastar; o "pode gastar" mostra o que
// de fato está livre, e o "Por quê?" diz o que foi separado.
import { expect, it } from 'vitest'
import { fraseDaSeparacao, separarDoMes } from './separacao'

const base = { entrou: 0, previsto: 0, rendaCadastrada: 10000, lucro: 500, gasto: 6000 }

it('o separado para as contas do ano sai do que pode gastar', () => {
  const s = separarDoMes({ ...base, contasAno: 1000 })!
  expect(s.pode).toBe(9500)
  expect(fraseDaSeparacao(s).frase).toContain('menos R$ 1.000 separados para as contas do ano')
  const comViagem = separarDoMes({ ...base, reservado: 1500, contasAno: 1000 })!
  expect(comViagem.pode).toBe(8000)
  expect(fraseDaSeparacao(comViagem).frase).toContain(
    'menos R$ 1.500 separados para a viagem e R$ 1.000 para as contas do ano',
  )
})

it('no mês em que a conta foi paga, o separado cobre o pagamento (não conta duas vezes)', () => {
  // o IPTU de R$ 3.000 está no gasto do mês; os R$ 3.000 separados nos meses anteriores voltam
  const pago = separarDoMes({ ...base, gasto: 9000, pagoComSeparado: 3000 })!
  expect(pago).toMatchObject({ pode: 13500, folga: 4500, situacao: 'folga' })
  expect(fraseDaSeparacao(pago).frase).toContain('mais R$ 3.000 já separados que pagaram contas do ano')
})

it('sem contas do ano, a frase de antes não muda', () => {
  const s = separarDoMes(base)!
  expect(s).toMatchObject({ contasAno: 0, pagoComSeparado: 0, pode: 10500 })
  expect(fraseDaSeparacao(s).frase).not.toContain('contas do ano')
})
