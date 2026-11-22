import type { Cartao } from '../../api/tipos'
import { mesCurto, reais, simularCompra } from '../../lib/formato'
import { compromissoNesteMes, fraseParcelamento } from '../cartoes/simulacao'

/** Uma fonte para a frase, o impacto e a prévia do botão; preserva a conta vigente. */
export function calcularImpactoDaCompra(
  valor: number,
  parcelas: number,
  quando: string,
  hoje: string,
  cartao?: Cartao,
) {
  const simulacao =
    cartao?.dia_fechamento && cartao?.dia_vencimento && parcelas > 1 && valor > 0
      ? simularCompra(valor, parcelas, quando, cartao.dia_fechamento, cartao.dia_vencimento)
      : []
  const contaNoMes = compromissoNesteMes(valor, simulacao.length ? parcelas : 1, hoje, simulacao)
  const mes = mesCurto(quando.slice(0, 7) + '-01')
  const frase =
    simulacao.length > 1 ? fraseParcelamento(valor, simulacao) : `${reais(valor)} à vista: sai do seu limite de ${mes}.`
  const impacto =
    simulacao.length > 1
      ? contaNoMes
        ? `Neste mês conta ${reais(contaNoMes)}.`
        : 'Neste mês não conta nada.'
      : 'Conta no dia da compra.'
  // a regra fica no "Por quê?" fechado da tela, fora da frase à vista
  const porque = simulacao.length > 1 ? 'Cada parcela sai do limite no dia 1 do mês da fatura.' : ''
  return { simulacao, contaNoMes, frase, impacto, porque, confirmacao: `${frase} ${impacto}` }
}
