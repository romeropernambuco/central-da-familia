import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { temWebGL } from '../lib/escritorio/cenaBase'
import './equipe-do-orcamento-cena.css'

/** Um agente 3D do palco: quem é, do que cuida, o que fala agora e o que o botão dele faz. */
export type Estacao = {
  id: string
  nome: string
  /** do que cuida, em 1 ou 2 palavras ("Semana e mês") */
  cuida: string
  img: string
  /** a frase de agora, já com o olho respeitado por quem monta */
  fala: string
  /** o cartão da aba que é dele (acende quando ele fala) */
  alvo: string
  acao: { rotulo: string; fazer: () => void }
}

/** O que o palco pede à sala 3D depois de aberta. */
export type CenaDoPalco = {
  /** quem fala agora: ganha o anel no chão, dá um passo à frente e acena */
  ativar(id: string): void
  tema(escuro: boolean): void
  destruir(): void
}
export type OpcoesDaCenaDoPalco = {
  ativo: string
  escuro: boolean
  /** a etiqueta (HTML) de cada boneco: a cena só põe em cima da cabeça dele */
  etiqueta(id: string): HTMLElement | null
  aoTocar(id: string): void
  aoFalhar(): void
}
/** Busca e monta a sala dentro de `el`. Devolve como cancelar a carga e desmontar. Quem passa é a tela (carga tardia). */
export type AbrirCenaDoPalco = (
  el: HTMLElement,
  opcoes: OpcoesDaCenaDoPalco,
  aoAbrir: (cena: CenaDoPalco) => void,
) => () => void

/** Acende o cartão do agente por um instante, sem rolar a tela. */
function acender(id: string) {
  const alvo = document.getElementById(id)
  if (!alvo) return
  alvo.classList.remove('orc-v3-foco')
  void alvo.offsetWidth // recomeça a animação se a pessoa tocar de novo
  alvo.classList.add('orc-v3-foco')
}

const escuroAgora = () => {
  const t = document.documentElement.dataset.theme
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
}
/** Dá para tentar a sala 3D? Sem WebGL (ou em teste) o palco fica com as figuras paradas. */
const podeTerCena = () =>
  temWebGL() && !new URLSearchParams(location.search).has('sem3d') && !/[?&]sem3d/.test(location.hash)

/**
 * A sala viva: abre quando aparece na tela, acompanha o tema e avisa a cena quem é o ativo.
 * As etiquetas são HTML por cima do desenho; tocar no boneco ou na etiqueta escolhe o agente.
 */
function SalaViva({
  estacoes,
  ativo,
  abrir,
  aoEscolher,
  aoFalhar,
}: {
  estacoes: Estacao[]
  ativo: number
  abrir: AbrirCenaDoPalco
  aoEscolher: (i: number) => void
  aoFalhar: () => void
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const etiquetas = useRef<Record<string, HTMLElement | null>>({})
  const cena = useRef<CenaDoPalco>()
  const [pronta, setPronta] = useState(false)
  const [visivel, setVisivel] = useState(() => typeof IntersectionObserver === 'undefined')
  /** quem a cena já sabe que é o ativo */
  const marcado = useRef<string>()
  // a cena guarda estas funções uma vez só; a referência deixa que ela chame sempre as de agora
  const agora = useRef({ estacoes, ativo, aoEscolher, aoFalhar })
  agora.current = { estacoes, ativo, aoEscolher, aoFalhar }
  useEffect(() => {
    if (visivel || !caixa.current) return
    const observador = new IntersectionObserver(entradas => {
      if (entradas.some(e => e.isIntersecting)) setVisivel(true)
    })
    observador.observe(caixa.current)
    return () => observador.disconnect()
  }, [visivel])
  useEffect(() => {
    const el = caixa.current
    if (!el || !visivel) return
    marcado.current = agora.current.estacoes[agora.current.ativo]?.id
    const fechar = abrir(
      el,
      {
        ativo: marcado.current || '',
        escuro: escuroAgora(),
        etiqueta: id => etiquetas.current[id] || null,
        aoTocar: id => {
          const i = agora.current.estacoes.findIndex(e => e.id === id)
          if (i >= 0) agora.current.aoEscolher(i)
        },
        aoFalhar: () => agora.current.aoFalhar(),
      },
      aberta => {
        cena.current = aberta
        setPronta(true)
      },
    )
    const tema = () => cena.current?.tema(escuroAgora())
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', tema)
    const obs = new MutationObserver(tema)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', tema)
      obs.disconnect()
      cena.current = undefined
      fechar()
    }
  }, [abrir, visivel])
  const idAtivo = estacoes[ativo]?.id
  useEffect(() => {
    if (!pronta || !idAtivo) return
    // ao abrir, o ativo já veio marcado: só acena quando a pessoa escolhe alguém
    if (marcado.current !== idAtivo) cena.current?.ativar(idAtivo)
    marcado.current = idAtivo
  }, [idAtivo, pronta])
  return (
    <div className="orc-cena" ref={caixa} data-pronta={pronta || undefined}>
      {/* o desenho e as etiquetas são só para ver: quem usa leitor de tela tem a lista de botões logo abaixo */}
      <div className="orc-cena-etiquetas" aria-hidden="true">
        {estacoes.map((e, i) => (
          <button
            key={e.id}
            type="button"
            tabIndex={-1}
            className="orc-cena-etiqueta"
            data-ativo={i === ativo || undefined}
            ref={el => {
              etiquetas.current[e.id] = el
            }}
            onClick={() => aoEscolher(i)}
          >
            {e.nome}
          </button>
        ))}
      </div>
      {!pronta && <p className="orc-cena-espera">Abrindo a sala…</p>}
    </div>
  )
}

/**
 * O palco da 3ª versão do Meu orçamento (24/11/2026): a equipe do orçamento trabalhando.
 * Tocar num agente faz ele falar (número + 1 frase) e acende o cartão dele; o botão do balão leva até lá.
 * Com `cena` e WebGL, o palco é uma sala 3D viva (os bonecos andam e trabalham) com a lista de nomes embaixo.
 * Sem isso (ou se a sala falhar), ficam as figuras paradas de public/orcamento-3d, com movimento em CSS.
 */
export function EquipeDoOrcamento({ estacoes, cena }: { estacoes: Estacao[]; cena?: AbrirCenaDoPalco }) {
  const [ativo, setAtivo] = useState(0)
  const [viva, setViva] = useState(() => !!cena && podeTerCena())
  const atual = estacoes[ativo] || estacoes[0]
  if (!atual) return null
  const escolher = (i: number) => {
    setAtivo(i)
    if (estacoes[i]) acender(estacoes[i].alvo)
  }
  return (
    <div
      className={'orc-palco' + (viva && cena ? ' orc-cena-palco' : '')}
      style={{ ['--agente' as string]: ativo, ['--agentes' as string]: estacoes.length }}
    >
      <div className="orc-palco-balao" aria-live="polite">
        <p>
          <b>{atual.nome}</b>
          {atual.fala}
        </p>
        <button type="button" className="orc-palco-ir" onClick={atual.acao.fazer}>
          {atual.acao.rotulo}
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
      {viva && cena ? (
        <>
          <SalaViva
            estacoes={estacoes}
            ativo={ativo}
            abrir={cena}
            aoEscolher={escolher}
            aoFalhar={() => setViva(false)}
          />
          <div className="orc-cena-lista" role="group" aria-label="Equipe do seu orçamento">
            {estacoes.map((e, i) => (
              <button
                key={e.id}
                type="button"
                className="orc-cena-nome"
                aria-pressed={i === ativo}
                onClick={() => escolher(i)}
              >
                {e.nome}
                <small>{e.cuida}</small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="orc-palco-chao" role="group" aria-label="Equipe do seu orçamento">
          {estacoes.map((e, i) => (
            <button
              key={e.id}
              type="button"
              className="orc-agente"
              aria-pressed={i === ativo}
              onClick={() => escolher(i)}
            >
              <img src={e.img} alt="" width={440} height={440} loading="lazy" />
              <span className="orc-agente-nome">
                {e.nome}
                <small>{e.cuida}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
