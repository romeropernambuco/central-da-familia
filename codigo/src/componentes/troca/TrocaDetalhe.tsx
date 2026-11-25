import { ListChecks, Wallet } from 'lucide-react'
import { useOculto } from '../../app/useOculto'
import { textoPrivado } from '../../lib/olho'
import { emMoeda, inteiro, nomeDaMoeda, reaisComCentavos, reaisRedondos } from '../../lib/troca/formato'
import { Icone } from '../Icone'
import { CampoNumero, fala, Linha, type BlocoDaTroca } from './partes'

/** A conta linha por linha, do preço na loja até o que o aparelho custa depois de tudo. */
export function TrocaDetalhe({ t, conta }: BlocoDaTroca) {
  useOculto()
  if (!conta) return null
  const pago = conta.escolhido
  const cartao = t.pagamentos.find(p => p.id === pago.id)
  const retorno = pago.pontos
    ? `≈ ${inteiro(pago.pontos)} pontos ${t.programa}`
    : cartao?.cashbackPct
      ? 'cashback'
      : 'sem pontos'
  return (
    <section className="card" aria-labelledby="trocaDetalhe">
      <div className="card-h">
        <h2 id="trocaDetalhe">
          <Icone desenho={ListChecks} aria-hidden="true" />
          Detalhe da conta
        </h2>
      </div>
      <ul className="exp troca-linhas">
        <Linha nome="Compra na loja" valor={emMoeda(conta.preco, t.moeda)} />
        <Linha nome="Ao câmbio de referência" valor={reaisComCentavos(pago.puro)} />
        <Linha nome="Taxas do pagamento (spread e IOF)" valor={reaisComCentavos(pago.taxas)} tom="custa" />
        <Linha nome="Na fatura" valor={reaisComCentavos(pago.fatura)} />
        <Linha
          nome={`Tax free (− ${emMoeda(conta.reembolso, t.moeda)})`}
          valor={'− ' + reaisComCentavos(conta.reembolsoReais)}
          tom="volta"
        />
        <Linha nome={`${textoPrivado(t.nome)} após o reembolso`} valor={reaisComCentavos(conta.aparelho)} />
        <Linha nome="Venda do usado" valor={'− ' + reaisComCentavos(t.venda)} tom="volta" />
        <Linha
          nome="Cashback (dinheiro de volta)"
          valor={(pago.cashback ? '− ' : '') + reaisComCentavos(pago.cashback)}
          tom="volta"
        />
        <Linha
          nome={`Milhas, fora da conta (${retorno})`}
          valor={pago.pontos ? '≈ ' + reaisRedondos(pago.milhasValem) : reaisRedondos(0)}
        />
      </ul>
      {t.textos.detalhe && <p className="sub">{fala(t.textos.detalhe)}</p>}
    </section>
  )
}

/** Para quem paga pela conta em moeda de lá: quanto comprar, quanto isso custa em reais e quanto sobra. */
export function TrocaContaEmMoeda({ t, conta, mudar }: BlocoDaTroca) {
  useOculto()
  const daConta = t.pagamentos.find(p => p.tipo === 'conta')
  if (!daConta) return null
  const moeda = nomeDaMoeda(t.moeda)
  const falta = !!conta && conta.contaSobra < 0
  return (
    <section className="card" aria-labelledby="trocaConta">
      <div className="card-h">
        <h2 id="trocaConta">
          <Icone desenho={Wallet} aria-hidden="true" />
          Se pagar pelo {textoPrivado(daConta.nome)}: quanto comprar
        </h2>
      </div>
      <div className="troca-dupla">
        <CampoNumero
          rotulo={`Quanto comprar de ${moeda} na conta`}
          valor={t.contaComprar}
          mudar={v => mudar({ contaComprar: v ?? NaN })}
        />
        <div className="campo">
          <span>Reais para a remessa</span>
          <b className="din mid">{conta ? reaisComCentavos(conta.contaReais) : '…'}</b>
        </div>
      </div>
      {conta && (
        <ul className="exp troca-linhas">
          <Linha nome={`Preço cheio do ${textoPrivado(t.nome)} no caixa`} valor={emMoeda(conta.preco, t.moeda)} />
          <Linha
            nome={falta ? 'Falta na conta para pagar' : 'Sobra na conta depois de pagar'}
            valor={(falta ? 'faltam ' : '') + emMoeda(Math.abs(conta.contaSobra), t.moeda)}
            tom={falta ? 'custa' : undefined}
          />
        </ul>
      )}
      {t.textos.contaComprar && <p className="sub">{fala(t.textos.contaComprar)}</p>}
    </section>
  )
}
