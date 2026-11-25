import { CreditCard } from 'lucide-react'
import { useOculto } from '../../app/useOculto'
import { textoPrivado } from '../../lib/olho'
import { vereditoDaTroca, type ContaDaTroca, type CustoPagamento } from '../../lib/troca/conta'
import { inteiro, nomeDaMoeda, reaisRedondos, semZeros } from '../../lib/troca/formato'
import type { PagamentoTroca, Troca } from '../../lib/troca/tipos'
import { Icone } from '../Icone'
import { CampoNumero, fala, type BlocoDaTroca } from './partes'

const nomeDe = (t: Troca, c: CustoPagamento) => textoPrivado(t.pagamentos.find(p => p.id === c.id)?.nome ?? '')

/** A frase que diz quem ganha em dinheiro, quem vem depois e quanto a conta em moeda sai a mais. */
function fraseDoVeredito(conta: ContaDaTroca, t: Troca): string {
  const v = vereditoDaTroca(conta, t)
  if (!v) return ''
  const melhor = v.melhores[0]
  const quem =
    v.melhores.length > 1
      ? `${v.melhores.map(c => nomeDe(t, c)).join(' e ')} empatam em ${reaisRedondos(melhor.liquido)}`
      : `${nomeDe(t, melhor)} é o mais barato: ${reaisRedondos(melhor.liquido)}`
  const depois = v.seguinte
    ? ` ${nomeDe(t, v.seguinte.custo)} sai ${reaisRedondos(v.seguinte.diferenca)} mais caro.`
    : ''
  const contaEmMoeda = t.pagamentos.find(p => p.tipo === 'conta')
  const daConta =
    v.contaAMais != null && v.contaAMais >= 1 && contaEmMoeda && contaEmMoeda.id !== v.seguinte?.custo.id
      ? ` ${textoPrivado(contaEmMoeda.nome)} sai ${reaisRedondos(v.contaAMais)} mais caro.`
      : ''
  return `Em dinheiro, ${quem}.${depois}${daConta} Milhas não entram nessa conta.`
}

/** A linha pequena debaixo do valor de cada forma de pagar. */
function retornoCurto(p: PagamentoTroca, c: CustoPagamento, programa: string): string {
  if (c.cashback) return `fatura ${reaisRedondos(c.fatura)} − ${reaisRedondos(c.cashback)} em dinheiro`
  if (c.pontos) return `+ ${inteiro(c.pontos / 1000)} mil pontos ${programa}`
  return p.tipo === 'referencia' ? 'base' : 'sem retorno'
}

const notaDe = (p: PagamentoTroca) =>
  p.spreadIncerto && p.tipo === 'cartao' ? `Spread ${semZeros(p.spreadPct)}% · ${p.nota}` : p.nota

/** As formas de pagar, cada uma com o que custa de verdade. Tocar escolhe. */
export function TrocaPagamento({ t, conta, mudar }: BlocoDaTroca) {
  useOculto()
  const melhor = conta?.ordem[0]?.id
  return (
    <section className="card" aria-labelledby="trocaPagar">
      <div className="card-h">
        <h2 id="trocaPagar">
          <Icone desenho={CreditCard} aria-hidden="true" />
          Com qual cartão pagar
        </h2>
        <span className="sub">Toque para escolher</span>
      </div>
      <div className="troca-opcoes" role="group" aria-labelledby="trocaPagar">
        {t.pagamentos.map(p => {
          const c = conta?.custos.find(x => x.id === p.id)
          return (
            <button
              key={p.id}
              type="button"
              className={'troca-opcao' + (p.tipo === 'referencia' ? ' base' : '')}
              aria-pressed={p.id === t.pagamento}
              onClick={() => mudar({ pagamento: p.id })}
            >
              <span className="troca-opcao-nome">
                <b>{textoPrivado(p.nome)}</b>
                <small>{notaDe(p)}</small>
                {p.id === melhor && <span className="chip ok">Menos dinheiro</span>}
              </span>
              <span className="troca-opcao-valor">
                <b>{c ? reaisRedondos(c.liquido) : '…'}</b>
                <small>{c ? retornoCurto(p, c, t.programa) : ''}</small>
              </span>
            </button>
          )
        })}
      </div>
      {conta && <p className="sub troca-veredito">{fraseDoVeredito(conta, t)}</p>}
      <AjustesDePagamento t={t} mudar={mudar} />
    </section>
  )
}

/** Os números de milhas e de taxa que não são oficiais: ficam à vista para a pessoa corrigir. */
function AjustesDePagamento({ t, mudar }: Pick<BlocoDaTroca, 't' | 'mudar'>) {
  const temPontos = t.pagamentos.some(p => p.pontosPorDolar > 0)
  const contaEmMoeda = t.pagamentos.find(p => p.tipo === 'conta')
  const incertos = t.pagamentos.filter(p => p.spreadIncerto && p.tipo === 'cartao')
  if (!temPontos && !contaEmMoeda && !incertos.length) return null
  const mudarSpread = (id: string, spreadPct: number) =>
    mudar({ pagamentos: t.pagamentos.map(p => (p.id === id ? { ...p, spreadPct } : p)) })
  const moeda = nomeDaMoeda(t.moeda)
  return (
    <div className="troca-ajustes">
      <h3>Milhas e taxas que você pode ajustar</h3>
      {temPontos && (
        <>
          <div className="troca-dupla">
            <CampoNumero
              rotulo={`Bônus na ${t.programa || 'transferência'} (%)`}
              valor={t.bonusPct}
              mudar={v => mudar({ bonusPct: v ?? NaN })}
            />
            <CampoNumero
              rotulo={`Preço de mil pontos ${t.programa} (R$)`}
              valor={t.milheiro}
              mudar={v => mudar({ milheiro: v ?? NaN })}
            />
          </div>
          {t.textos.milhas && <p className="sub">{fala(t.textos.milhas)}</p>}
        </>
      )}
      {contaEmMoeda && (
        <CampoNumero
          rotulo={`Câmbio do ${textoPrivado(contaEmMoeda.nome)}, com tudo (R$ por ${moeda})`}
          valor={t.contaCambio}
          mudar={v => mudar({ contaCambio: v ?? NaN })}
          ajuda={t.textos.conta && textoPrivado(t.textos.conta)}
        />
      )}
      {incertos.map(p => (
        <CampoNumero
          key={p.id}
          rotulo={`Spread do ${textoPrivado(p.nome)} no crédito (%)`}
          valor={p.spreadPct}
          mudar={v => mudarSpread(p.id, v ?? NaN)}
          ajuda={p.spreadIncerto}
        />
      ))}
      {t.textos.pagamentos && <p className="sub">{fala(t.textos.pagamentos)}</p>}
    </div>
  )
}
