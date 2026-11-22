import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import type { Etiqueta, EtiquetaResumo, EtiquetaSimulacao } from '../../api/tipos'
import { useSessaoAtual } from '../../app/contexto'
import { useOculto } from '../../app/useOculto'
import { Botao, Din, Sheet } from '../../componentes/base'
import { OlhoDaAba } from '../../componentes/ControlesDaAba'
import { Icone } from '../../componentes/Icone'
import { PONTOS, textoPrivado } from '../../lib/olho'
import { dataCurta, diaSemana } from '../../lib/formato'
import { periodoDaEtiqueta, simboloMoeda } from '../../lib/etiquetas'

const numero = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const plural = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`)

/** A viagem por dentro: total, pago antes, durante, por dia, por pessoa por dia, por limite, por moeda e o simulador. */
export function Viagem({ etiqueta, fechar, mudar }: { etiqueta: Etiqueta; fechar: () => void; mudar: () => void }) {
  const { api } = useSessaoAtual()
  const oculto = useOculto()
  const [r, setR] = useState<EtiquetaResumo | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => {
    let vivo = true
    api.etiquetaResumo!(etiqueta.id)
      .then(x => {
        if (vivo) setR(x)
      })
      .catch(e => {
        if (vivo) setErro((e as Error).message)
      })
    return () => {
      vivo = false
    }
  }, [api, etiqueta.id])
  return (
    <Sheet
      titulo={textoPrivado(etiqueta.nome, oculto)}
      subtitulo={textoPrivado(periodoDaEtiqueta(etiqueta), oculto)}
      rotulo="Viagem ou evento"
      fechar={fechar}
      cabecalho={<OlhoDaAba curto />}
    >
      {erro && (
        <p className="erro" role="alert">
          {textoPrivado(erro)}
        </p>
      )}
      {!erro && !r && <p className="sub">Somando os gastos…</p>}
      {r && (
        <>
          <TotalDaViagem r={r} />
          {!r.lancamentos && (
            <p className="todo">
              <span>
                Nenhum gasto nesta etiqueta ainda. Anote um gasto no período dela, ou marque a etiqueta no Anotar.
              </span>
            </p>
          )}
          <Recortes r={r} />
          {r.por_pessoa_dia != null && r.durante > 0 && <Simulador etiqueta={etiqueta.id} base={r} />}
        </>
      )}
      <Botao variante="secundario" type="button" onClick={mudar}>
        <Icone desenho={Pencil} />
        Mudar nome, datas, moeda ou pessoas
      </Botao>
    </Sheet>
  )
}

function TotalDaViagem({ r }: { r: EtiquetaResumo }) {
  const oculto = useOculto()
  const linha = [
    plural(r.lancamentos, 'gasto', 'gastos'),
    r.dias ? plural(r.dias, 'dia', 'dias') : '',
    r.pessoas ? plural(r.pessoas, 'pessoa', 'pessoas') : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const numeros: [string, number | null][] = [
    ['Pago antes', r.antes],
    ['Durante', r.durante],
    ...(r.depois > 0 ? [['Depois da volta', r.depois] as [string, number]] : []),
    ['Por dia', r.por_dia],
    ['Por pessoa por dia', r.por_pessoa_dia],
  ]
  return (
    <section className="viagem-total" aria-labelledby="vgTotal">
      <h3 id="vgTotal" className="lbl">
        Total da etiqueta
      </h3>
      <div className="numrow">
        <Din v={r.total} tam="hero" />
      </div>
      <p className="apoio">{textoPrivado(linha, oculto)}</p>
      <dl className="guard-3">
        {numeros.map(([rotulo, v]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{v == null ? 'sem datas' : <Din v={v} />}</dd>
          </div>
        ))}
      </dl>
      <p className="sub">
        Pago antes é o que saiu antes de a viagem começar, como passagem e hotel. Ele não entra na conta por dia.
      </p>
    </section>
  )
}

/** Os mesmos gastos vistos por limite, por moeda e dia a dia. */
function Recortes({ r }: { r: EtiquetaResumo }) {
  const oculto = useOculto()
  return (
    <>
      {r.por_envelope.length > 0 && (
        <section aria-labelledby="vgLimite">
          <h3 id="vgLimite" className="lbl">
            Por limite
          </h3>
          <ul className="exp">
            {r.por_envelope.map(x => (
              <li key={x.envelope}>
                <span>
                  {textoPrivado(x.envelope, oculto)}{' '}
                  <small className="muted">{oculto ? PONTOS : `${numero(x.pct, 1)}%`}</small>
                </span>
                <Din v={x.total} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {r.por_moeda.some(x => x.moeda !== 'BRL') && (
        <section aria-labelledby="vgMoeda">
          <h3 id="vgMoeda" className="lbl">
            Por moeda
          </h3>
          <ul className="exp">
            {r.por_moeda.map(x => (
              <li key={x.moeda}>
                <span>
                  {x.moeda === 'BRL'
                    ? 'Anotado só em reais'
                    : `${simboloMoeda(x.moeda)} ${oculto ? PONTOS : numero(x.valor_original)}`}
                  {x.moeda !== 'BRL' && !oculto && x.cambio_medio > 0 && (
                    <small className="muted">
                      {' '}
                      · cada {simboloMoeda(x.moeda)} saiu por R$ {numero(x.cambio_medio)}
                    </small>
                  )}
                </span>
                <Din v={x.valor_brl} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {r.por_data.length > 0 && (
        <details className="viagem-dias">
          <summary>Ver dia a dia</summary>
          <ul className="exp">
            {r.por_data.map(x => (
              <li key={x.data}>
                <span>
                  {textoPrivado(`${diaSemana(x.data)} ${dataCurta(x.data)}`, oculto)}{' '}
                  <small className="muted">{textoPrivado(plural(x.lancamentos, 'gasto', 'gastos'), oculto)}</small>
                </span>
                <Din v={x.total} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  )
}

/** "E se fosse outra viagem?": o gasto real por pessoa por dia desta, com outros dias e outras pessoas. */
function Simulador({ etiqueta, base }: { etiqueta: string; base: EtiquetaResumo }) {
  const { api } = useSessaoAtual()
  const [dias, setDias] = useState(String(base.dias || 7))
  const [pessoas, setPessoas] = useState(String(base.pessoas || 2))
  const [s, setS] = useState<EtiquetaSimulacao | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => {
    const d = Number(dias),
      p = Number(pessoas)
    if (!(d >= 1 && d <= 366) || !(p >= 1 && p <= 50)) {
      setS(null)
      setErro('Dias de 1 a 366 e pessoas de 1 a 50.')
      return
    }
    let vivo = true
    // espera a pessoa parar de digitar antes de pedir a conta
    const t = setTimeout(() => {
      api.etiquetaSimular!(etiqueta, d, p)
        .then(x => {
          if (vivo) {
            setS(x)
            setErro('')
          }
        })
        .catch(e => {
          if (vivo) setErro((e as Error).message)
        })
    }, 300)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [api, etiqueta, dias, pessoas])
  const so = (v: string) => v.replace(/\D/g, '').slice(0, 3)
  return (
    <section className="viagem-simulador" aria-labelledby="vgSim">
      <h3 id="vgSim">E se fosse outra viagem?</h3>
      <p className="sub">Usa o gasto real desta: o que cada pessoa gastou por dia.</p>
      <div className="duas-datas">
        <label className="campo">
          <span>Dias</span>
          <input className="inp" inputMode="numeric" value={dias} onChange={e => setDias(so(e.target.value))} />
        </label>
        <label className="campo">
          <span>Pessoas</span>
          <input className="inp" inputMode="numeric" value={pessoas} onChange={e => setPessoas(so(e.target.value))} />
        </label>
      </div>
      {erro && (
        <p className="erro" role="alert">
          {textoPrivado(erro)}
        </p>
      )}
      {s && !erro && (
        <>
          <ul className="exp" aria-live="polite">
            <li>
              <span>Gasto durante a viagem</span>
              <Din v={s.gasto_durante} />
            </li>
            <li>
              <span>Passagem, hotel e o que se paga antes</span>
              <Din v={s.pago_antes_referencia} />
            </li>
            <li className="tot">
              <span>Total estimado</span>
              <Din v={s.total_estimado} />
            </li>
          </ul>
          <p className="sub">{s.aviso}</p>
        </>
      )}
    </section>
  )
}
