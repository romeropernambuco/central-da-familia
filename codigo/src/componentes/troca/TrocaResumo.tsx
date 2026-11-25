import { useOculto } from '../../app/useOculto'
import { reais, textoParaValor, valorDigitadoValido, valorParaTexto } from '../../lib/formato'
import { textoPrivado } from '../../lib/olho'
import type { CustoPagamento } from '../../lib/troca/conta'
import { inteiro, reaisComCentavos, reaisRedondos } from '../../lib/troca/formato'
import type { Troca } from '../../lib/troca/tipos'
import { CampoValor, Din } from '../base'
import { fala, type BlocoDaTroca } from './partes'

/** O que o cartão escolhido devolve: pontos (fora da conta), dinheiro de volta (já na conta) ou nada. */
function Retorno({ custo, programa }: { custo: CustoPagamento; programa: string }) {
  if (custo.pontos)
    return (
      <p className="todo ok">
        + {inteiro(custo.pontos)} pontos {programa} · valem ≈ {reaisRedondos(custo.milhasValem)} em passagem, não entram
        na conta
      </p>
    )
  return (
    <p className="todo quieto">
      {custo.cashback
        ? `Já desconta ${reaisRedondos(custo.cashback)} de cashback, que volta em dinheiro`
        : 'Sem pontos e sem cashback'}
    </p>
  )
}

/** A régua da venda do usado: campo de valor, barra de arrastar e as marcas. Com o olho fechado, a barra some. */
function VendaDoUsado({ t, mudar }: Pick<BlocoDaTroca, 't' | 'mudar'>) {
  const oculto = useOculto()
  const naRegua = Math.min(Math.max(t.venda || 0, t.vendaMin), t.vendaMax)
  return (
    <div className="troca-controle">
      <div className="troca-venda">
        <label className="lbl" htmlFor="trocaVenda">
          Venda do {textoPrivado(t.usado) || 'usado'}
        </label>
        <CampoValor
          id="trocaVenda"
          rotulo="Venda do usado em reais"
          valor={Number.isFinite(t.venda) ? valorParaTexto(t.venda) : ''}
          mudar={txt => mudar({ venda: valorDigitadoValido(txt) ? textoParaValor(txt) : txt === '' ? 0 : t.venda })}
        />
      </div>
      {!oculto && t.vendaMax > t.vendaMin && (
        <>
          <input
            className="troca-regua"
            type="range"
            aria-label="Arrastar o valor da venda do usado"
            min={t.vendaMin}
            max={t.vendaMax}
            step={50}
            value={naRegua}
            onChange={e => mudar({ venda: Number(e.target.value) })}
          />
          <div className="troca-marcas">
            <span>{reais(t.vendaMin)}</span>
            {t.textos.vendaMeio && <span>{fala(t.textos.vendaMeio)}</span>}
            <span>{reais(t.vendaMax)}</span>
          </div>
        </>
      )}
    </div>
  )
}

function Versoes({ t, mudar }: Pick<BlocoDaTroca, 't' | 'mudar'>) {
  if (t.versoes.length < 2) return null
  // trocar de versão volta o reembolso e o valor da alfândega para a tabela, como no painel original
  const escolher = (versao: number): Partial<Troca> => ({ versao, reembolso: null, valorAduana: null })
  return (
    <div className="troca-controle">
      <p className="lbl" id="trocaVersoes">
        {t.textos.versoes || 'Versão'}
      </p>
      <div className="seg" role="group" aria-labelledby="trocaVersoes">
        {t.versoes.map((v, i) => (
          <button key={v.rotulo} type="button" aria-pressed={i === t.versao} onClick={() => mudar(escolher(i))}>
            {v.rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}

/** O topo: quanto custa a troca, de onde vem cada parte e os dois controles que mais mudam a conta. */
export function TrocaResumo({ t, conta, mudar, erro }: BlocoDaTroca & { erro: string }) {
  const oculto = useOculto()
  const pago = t.pagamentos.find(p => p.id === conta?.escolhido.id)
  const sobra = !!conta && conta.custo < 0
  return (
    <section className="card troca-resumo" aria-labelledby="trocaCusto" aria-live="polite">
      <p className="lbl" id="trocaCusto">
        {sobra ? 'A troca deixa sobra de' : t.comImposto ? 'Custo da troca com imposto' : 'Custo da troca sem imposto'}
      </p>
      <div className="numrow">
        {conta ? <Din v={Math.abs(conta.custo)} tam="hero" /> : <span className="din hero">…</span>}
      </div>
      {conta && pago && (
        <>
          <p className="sub">
            Pagando com <b>{textoPrivado(pago.nome)}</b>
          </p>
          <Retorno custo={conta.escolhido} programa={t.programa} />
        </>
      )}
      <label className="troca-chave">
        <input
          type="checkbox"
          role="switch"
          checked={t.comImposto}
          onChange={e => mudar({ comImposto: e.target.checked })}
        />
        <span className="troca-chave-botao" aria-hidden="true" />
        Incluir o imposto do Brasil
      </label>
      {conta && !oculto && (
        <div className="troca-barra" aria-hidden="true">
          <i className="venda" style={{ width: conta.barra.venda + '%' }} />
          <i className="bolso" style={{ width: conta.barra.bolso + '%' }} />
          <i className="imposto" style={{ width: conta.barra.imposto + '%' }} />
        </div>
      )}
      <ul className="troca-legenda">
        <li>
          <span className="ponto venda" />
          Volta com a venda
          <b>{conta ? reaisComCentavos(t.venda) : '…'}</b>
        </li>
        <li>
          <span className="ponto bolso" />
          {conta && conta.bolso < 0 ? 'Sobra depois da venda' : 'Sai do bolso'}
          <b>{conta ? reaisComCentavos(Math.abs(conta.bolso)) : '…'}</b>
        </li>
        <li className={t.comImposto ? undefined : 'fora'}>
          <span className="ponto imposto" />
          Imposto
          <b>{conta ? reaisComCentavos(conta.imposto) : '…'}</b>
        </li>
      </ul>
      <Versoes t={t} mudar={mudar} />
      <VendaDoUsado t={t} mudar={mudar} />
      {erro && (
        <p className="erro" role="status">
          {erro}
        </p>
      )}
    </section>
  )
}
