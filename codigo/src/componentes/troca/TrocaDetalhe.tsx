import type { CSSProperties, ReactNode } from 'react'
import { ListChecks, Wallet } from 'lucide-react'
import { useOculto } from '../../app/useOculto'
import { textoPrivado } from '../../lib/olho'
import { emMoeda, inteiro, nomeDaMoeda, reaisComCentavos, reaisRedondos } from '../../lib/troca/formato'
import { Icone } from '../Icone'
import { CampoNumero, fala, Linha, type BlocoDaTroca } from './partes'

/** Uma linha da conta com a sua barra: onde ela começa e termina na escala da fatura. */
function Degrau({
  nome,
  valor,
  de,
  ate,
  escala,
  tom,
}: {
  nome: ReactNode
  valor: ReactNode
  de?: number
  ate?: number
  escala: number
  tom?: 'volta' | 'custa' | 'soma'
}) {
  const oculto = useOculto()
  const barra = de != null && ate != null && escala > 0 && !oculto
  const inicio = barra ? (Math.max(0, Math.min(de, ate)) / escala) * 100 : 0
  const tamanho = barra ? (Math.abs(ate - de) / escala) * 100 : 0
  return (
    <li className={tom === 'soma' ? 'soma' : tom ? 'troca-' + tom : undefined}>
      <span>{nome}</span>
      <b>{valor}</b>
      {barra && <i style={{ '--de': inicio + '%', '--tam': tamanho + '%' } as CSSProperties} aria-hidden="true" />}
    </li>
  )
}

/** A conta linha por linha, do preço na loja até o que o aparelho custa depois de tudo, com a barra de cada passo. */
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
  const escala = Math.max(pago.fatura, pago.puro)
  const depoisDoReembolso = pago.fatura - conta.reembolsoReais
  return (
    <section className="card" aria-labelledby="trocaDetalhe">
      <div className="card-h">
        <h2 id="trocaDetalhe">
          <Icone desenho={ListChecks} aria-hidden="true" />
          Detalhe da conta
        </h2>
      </div>
      <ul className="troca-degraus">
        <Degrau nome="Compra na loja" valor={emMoeda(conta.preco, t.moeda)} escala={escala} />
        <Degrau
          nome="Ao câmbio de referência"
          valor={reaisComCentavos(pago.puro)}
          de={0}
          ate={pago.puro}
          escala={escala}
        />
        <Degrau
          nome="Taxas do pagamento (spread e IOF)"
          valor={reaisComCentavos(pago.taxas)}
          de={pago.puro}
          ate={pago.fatura}
          escala={escala}
          tom="custa"
        />
        <Degrau
          nome="Na fatura"
          valor={reaisComCentavos(pago.fatura)}
          de={0}
          ate={pago.fatura}
          escala={escala}
          tom="soma"
        />
        <Degrau
          nome={`Tax free (− ${emMoeda(conta.reembolso, t.moeda)})`}
          valor={'− ' + reaisComCentavos(conta.reembolsoReais)}
          de={depoisDoReembolso}
          ate={pago.fatura}
          escala={escala}
          tom="volta"
        />
        <Degrau
          nome="Cashback (dinheiro de volta)"
          valor={(pago.cashback ? '− ' : '') + reaisComCentavos(pago.cashback)}
          de={pago.cashback ? conta.aparelho : undefined}
          ate={pago.cashback ? depoisDoReembolso : undefined}
          escala={escala}
          tom="volta"
        />
        <Degrau
          nome={`${textoPrivado(t.nome)} após o reembolso`}
          valor={reaisComCentavos(conta.aparelho)}
          de={0}
          ate={conta.aparelho}
          escala={escala}
          tom="soma"
        />
        <Degrau
          nome="Venda do usado"
          valor={'− ' + reaisComCentavos(t.venda)}
          de={Math.max(0, conta.aparelho - t.venda)}
          ate={conta.aparelho}
          escala={escala}
          tom="volta"
        />
        <Degrau
          nome={`Milhas, fora da conta (${retorno})`}
          valor={pago.pontos ? '≈ ' + reaisRedondos(pago.milhasValem) : reaisRedondos(0)}
          escala={escala}
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
      <CampoNumero
        linha
        rotulo={`Quanto comprar de ${moeda} na conta`}
        valor={t.contaComprar}
        mudar={v => mudar({ contaComprar: v ?? NaN })}
        milhar
      />
      <div className="troca-remessa">
        <span className="lbl">Reais para a remessa</span>
        <b className="din">{conta ? reaisComCentavos(conta.contaReais) : '…'}</b>
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
