import { useState } from 'react'
import { useOculto } from '../../app/useOculto'
import { reais, textoParaValor, valorDigitadoValido, valorParaTexto } from '../../lib/formato'
import { textoPrivado } from '../../lib/olho'
import { caminhosDaTroca, compararComBrasil, type Caminho } from '../../lib/troca/brasil'
import type { ContaDaTroca, CustoPagamento } from '../../lib/troca/conta'
import { inteiro, reaisComCentavos, reaisRedondos } from '../../lib/troca/formato'
import type { Troca } from '../../lib/troca/tipos'
import { CampoValor, Din } from '../base'
import { fala, type BlocoDaTroca } from './partes'

/** Os 3 jeitos de montar o topo, para o dono comparar. O padrão é o A. */
export type DesenhoDoTopo = 'a' | 'b' | 'c'

/** O que o cartão escolhido devolve: pontos (fora da conta), dinheiro de volta (já na conta) ou nada. */
function retornoDoCartao(custo: CustoPagamento, programa: string): string {
  if (custo.pontos)
    return `+ ${inteiro(custo.pontos)} pontos ${programa} · valem ≈ ${reaisRedondos(custo.milhasValem)} em passagem, não entram na conta`
  return custo.cashback
    ? `Já desconta ${reaisRedondos(custo.cashback)} de cashback, que volta em dinheiro`
    : 'Sem pontos e sem cashback'
}

function Pago({ t, conta }: { t: Troca; conta: ContaDaTroca }) {
  const pago = t.pagamentos.find(p => p.id === conta.escolhido.id)
  if (!pago) return null
  return (
    <p className="troca-pago">
      Pagando com <b>{textoPrivado(pago.nome)}</b>
      <br />
      {retornoDoCartao(conta.escolhido, t.programa)}
    </p>
  )
}

const rotuloDoCusto = (t: Troca, conta: ContaDaTroca | null) =>
  conta && conta.custo < 0
    ? 'A troca deixa sobra de'
    : t.comImposto
      ? 'Custo da troca com imposto'
      : 'Custo da troca sem imposto'

/** O nome de cada caminho, do jeito que a pessoa fala. */
function nomeDoCaminho(c: Caminho, t: Troca): string {
  const vezes = Math.trunc(t.brasil?.parcelas ?? 1) || 1
  if (c.id === 'brasil') return vezes > 1 ? `No Brasil em ${textoPrivado(`${vezes}x`)}` : 'No Brasil à vista'
  return c.id === 'foraComImposto' ? 'Lá fora, com o imposto' : 'Lá fora, sem o imposto'
}

/** A frase que responde: qual caminho ganha e por quanto. Só existe quando a versão tem preço no Brasil. */
function Resposta({ t, conta }: { t: Troca; conta: ContaDaTroca }) {
  const c = compararComBrasil(t, conta)
  if (!c) return null
  return (
    <p className="troca-frase">
      {c.melhor === 'brasil' ? 'Comprar no Brasil sai ' : 'Comprar lá fora sai '}
      <Din v={c.economia} /> mais barato.
    </p>
  )
}

/** Os caminhos lado a lado: quanto custa a troca em cada um, com a barra na mesma escala. */
function Caminhos({ t, conta }: { t: Troca; conta: ContaDaTroca }) {
  const oculto = useOculto()
  const caminhos = caminhosDaTroca(t, conta)
  return (
    <div className="troca-secao">
      <h3>Quanto custa a troca em cada caminho</h3>
      <ul className="troca-caminhos">
        {caminhos.map(c => (
          <li key={c.id} className={'troca-caminho' + (c.melhor ? ' melhor' : c.escolhido ? ' escolhido' : '')}>
            <span>
              {nomeDoCaminho(c, t)}
              {c.melhor && <span className="chip ok">mais barato</span>}
            </span>
            <b>{reaisComCentavos(c.custo)}</b>
            {!oculto && <i style={{ width: c.barra + '%' }} aria-hidden="true" />}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** De onde vem o custo: o que volta com a venda, o que sai do bolso e o imposto. */
function Fatias({ t, conta }: { t: Troca; conta: ContaDaTroca | null }) {
  const oculto = useOculto()
  return (
    <div className="troca-secao">
      <h3>De onde vem o custo</h3>
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
    </div>
  )
}

/** A régua da venda do usado: campo, barra de arrastar com os anúncios marcados e as pontas. */
function VendaDoUsado({ t, mudar }: Pick<BlocoDaTroca, 't' | 'mudar'>) {
  const oculto = useOculto()
  const escrito = (v: number) => (Number.isFinite(v) ? valorParaTexto(v) : '')
  const lido = (s: string) => (s === '' ? 0 : valorDigitadoValido(s) ? textoParaValor(s) : NaN)
  const [txt, setTxt] = useState(escrito(t.venda))
  const [vista, setVista] = useState(t.venda)
  if (!Object.is(vista, t.venda)) {
    setVista(t.venda)
    // mudou por fora (régua, desfazer, outra comparação): o campo acompanha; se foi a própria digitação, fica como está
    if (!Object.is(lido(txt), t.venda)) setTxt(escrito(t.venda))
  }
  const naRegua = Math.min(Math.max(t.venda || 0, t.vendaMin), t.vendaMax)
  const faixa = t.vendaMax - t.vendaMin
  const anuncios = t.referencias.filter(r => r.preco >= t.vendaMin && r.preco <= t.vendaMax)
  return (
    <div className="troca-secao troca-controle">
      <div className="troca-venda">
        <label className="lbl" htmlFor="trocaVenda">
          Venda do {textoPrivado(t.usado) || 'usado'}
        </label>
        <CampoValor
          id="trocaVenda"
          rotulo="Venda do usado em reais"
          valor={txt}
          mudar={novo => {
            setTxt(novo)
            mudar({ venda: lido(novo) })
          }}
        />
      </div>
      {!oculto && faixa > 0 && (
        <>
          <div className="troca-trilho">
            {/* cada tracinho é um anúncio guardado: dá para ver onde o seu preço cai */}
            {anuncios.map(r => (
              <span
                key={r.link}
                className="anuncio"
                style={{ left: `calc(10px + (100% - 20px) * ${(r.preco - t.vendaMin) / faixa})` }}
              />
            ))}
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
          </div>
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

/** Versão do aparelho e a chave do imposto: os 2 controles que mudam o número grande. */
function Controles({ t, mudar }: Pick<BlocoDaTroca, 't' | 'mudar'>) {
  // trocar de versão volta o reembolso e o valor da alfândega para a tabela, como no painel original
  const escolher = (versao: number): Partial<Troca> => ({ versao, reembolso: null, valorAduana: null })
  return (
    <div className="troca-controle">
      {t.versoes.length > 1 && (
        <>
          <p className="lbl" id="trocaVersoes">
            {fala(t.textos.versoes || 'Versão')}
          </p>
          <div className="seg" role="group" aria-labelledby="trocaVersoes">
            {t.versoes.map((v, i) => (
              <button key={v.rotulo} type="button" aria-pressed={i === t.versao} onClick={() => mudar(escolher(i))}>
                {v.rotulo}
              </button>
            ))}
          </div>
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
    </div>
  )
}

/** A: o número em cartaz, a frase que responde e os caminhos em barras. */
function TopoCartaz({ t, conta }: { t: Troca; conta: ContaDaTroca | null }) {
  return (
    <>
      <div className="troca-poster">
        <p className="lbl" id="trocaCusto">
          {rotuloDoCusto(t, conta)}
        </p>
        {conta ? <Din v={Math.abs(conta.custo)} /> : <span className="din">…</span>}
      </div>
      {conta && <Pago t={t} conta={conta} />}
      {conta && <Resposta t={t} conta={conta} />}
      {conta && <Caminhos t={t} conta={conta} />}
    </>
  )
}

/** B: bandeja de números, do jeito do Início: o custo em cima e os outros 3 em quadros. */
function TopoBandeja({ t, conta }: { t: Troca; conta: ContaDaTroca | null }) {
  const c = conta ? compararComBrasil(t, conta) : null
  const melhorCartao = conta?.ordem[0]
  return (
    <>
      <div className="troca-bandeja">
        <div className="larga">
          <p className="lbl" id="trocaCusto">
            {rotuloDoCusto(t, conta)}
          </p>
          {conta ? <Din v={Math.abs(conta.custo)} /> : <span className="din">…</span>}
        </div>
        {conta && c && (
          <div className="ganha">
            <p className="lbl">Economia prevista</p>
            <Din v={c.economia} />
            <small>comprando {c.melhor === 'brasil' ? 'no Brasil' : 'lá fora'}</small>
          </div>
        )}
        {conta && (
          <div>
            <p className="lbl">Imposto na volta</p>
            <Din v={conta.imposto} />
            <small>{t.comImposto ? 'dentro do custo' : 'fora do custo'}</small>
          </div>
        )}
        {conta && melhorCartao && !c && (
          <div>
            <p className="lbl">Cartão mais barato</p>
            <Din v={Math.round(melhorCartao.liquido)} />
            <small>{textoPrivado(t.pagamentos.find(p => p.id === melhorCartao.id)?.nome ?? '')}</small>
          </div>
        )}
      </div>
      {conta && <Pago t={t} conta={conta} />}
      {conta && <Caminhos t={t} conta={conta} />}
    </>
  )
}

/** C: os dois lados em colunas, um contra o outro, com o que entra em cada conta. */
function TopoBalanca({ t, conta }: { t: Troca; conta: ContaDaTroca | null }) {
  if (!conta) return <span className="din">…</span>
  const caminhos = caminhosDaTroca(t, conta)
  const brasil = caminhos.find(x => x.id === 'brasil')
  const fora = caminhos.find(x => x.escolhido)!
  const outro = brasil ?? caminhos.find(x => !x.escolhido)!
  const c = compararComBrasil(t, conta)
  const lados = [fora, outro]
  return (
    <>
      <p className="lbl" id="trocaCusto">
        {rotuloDoCusto(t, conta)}: os dois lados
      </p>
      <div className="troca-balanca">
        {lados.map(lado => (
          <div key={lado.id} className={'troca-lado' + (lado.melhor ? ' melhor' : '')}>
            <h3>{nomeDoCaminho(lado, t)}</h3>
            <Din v={Math.abs(lado.custo)} />
            {lado.melhor && <span className="chip">mais barato</span>}
            <ul>
              {lado.id === 'brasil' && c ? (
                <>
                  <li>
                    Preço da loja <b>{reaisRedondos(c.brasil)}</b>
                  </li>
                  <li>
                    Ganho de parcelar <b>− {reaisRedondos(c.ganhoDeParcelar)}</b>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    Aparelho, já com o reembolso <b>{reaisRedondos(conta.aparelho)}</b>
                  </li>
                  <li>
                    Imposto na volta{' '}
                    <b>{lado.id === 'foraComImposto' ? reaisRedondos(conta.imposto) : reaisRedondos(0)}</b>
                  </li>
                </>
              )}
              <li>
                Venda do usado <b>− {reaisRedondos(t.venda)}</b>
              </li>
            </ul>
          </div>
        ))}
      </div>
      <Resposta t={t} conta={conta} />
      <Pago t={t} conta={conta} />
    </>
  )
}

/** O topo: responde quanto custa a troca e qual caminho ganha, e traz os controles que mudam essa resposta. */
export function TrocaResumo({
  t,
  conta,
  mudar,
  erro,
  desenho = 'a',
}: BlocoDaTroca & { erro: string; desenho?: DesenhoDoTopo }) {
  useOculto()
  return (
    <section className="card troca-resumo" aria-labelledby="trocaCusto" aria-live="polite">
      <Controles t={t} mudar={mudar} />
      {desenho === 'b' ? (
        <TopoBandeja t={t} conta={conta} />
      ) : desenho === 'c' ? (
        <TopoBalanca t={t} conta={conta} />
      ) : (
        <TopoCartaz t={t} conta={conta} />
      )}
      {erro && (
        <p className="erro" role="status">
          {erro}
        </p>
      )}
      <Fatias t={t} conta={conta} />
      <VendaDoUsado t={t} mudar={mudar} />
    </section>
  )
}
