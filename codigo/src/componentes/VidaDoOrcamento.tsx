import { useEffect, useId, useRef, useState, type ComponentProps } from 'react'
import { Din } from './base'
import './vida-do-orcamento.css'

/**
 * Peças que dão vida ao Meu orçamento (pedido do dono, 24/11/2026: "algo que deixe mais vivo").
 * Tudo desenhado aqui, no traço das ilustrações do app: nada vem de fora e nada pesa no celular.
 */

const SEM_MOVIMENTO = () =>
  import.meta.env.MODE === 'test' ||
  typeof window === 'undefined' ||
  typeof window.requestAnimationFrame !== 'function' ||
  !window.matchMedia ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** O número principal sobe contando até o valor certo, só na primeira vez que a tela abre. */
export function NumeroQueSobe(props: ComponentProps<typeof Din>) {
  const alvo = props.v
  const [v, setV] = useState(() => (SEM_MOVIMENTO() ? alvo : 0))
  const jaContou = useRef(false)
  useEffect(() => {
    if (jaContou.current || SEM_MOVIMENTO()) {
      setV(alvo)
      return
    }
    jaContou.current = true
    const inicio = performance.now()
    let quadro = 0
    const passo = (agora: number) => {
      const k = Math.min(1, (agora - inicio) / 700)
      const suave = 1 - Math.pow(1 - k, 3)
      setV(k >= 1 ? alvo : Math.round(alvo * suave * 100) / 100)
      if (k < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [alvo])
  return <Din {...props} v={v} />
}

/** Um pote que enche conforme a sobra chega perto do alvo (a conquista de R$ 100). */
export function PoteDaSobra({ valor, alvo, oculto }: { valor: number; alvo: number; oculto: boolean }) {
  const id = useId()
  const nivel = oculto ? 0.5 : Math.max(0, Math.min(1, alvo > 0 ? valor / alvo : 0))
  const altura = 46 * nivel
  return (
    <span
      className="pote"
      role="img"
      aria-label={oculto ? 'Pote da sobra' : `Pote da sobra: ${Math.round(nivel * 100)}% de ${alvo} reais`}
    >
      <svg viewBox="0 0 56 72" width="56" height="72" aria-hidden="true">
        <defs>
          <clipPath id={id}>
            <path d="M12 20h32v36a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8Z" />
          </clipPath>
        </defs>
        <rect x="16" y="8" width="24" height="8" rx="3" className="pote-tampa" />
        <path d="M12 20h32v36a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8Z" className="pote-vidro" />
        <g clipPath={`url(#${id})`}>
          <rect x="10" y={64 - altura} width="36" height={altura + 2} className="pote-agua" />
          {nivel > 0.05 && <circle cx="22" cy={64 - altura + 6} r="2" className="pote-moeda" />}
          {nivel > 0.25 && <circle cx="33" cy={64 - altura + 12} r="2.5" className="pote-moeda" />}
        </g>
        <path d="M12 20h32v36a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8Z" className="pote-borda" />
        <path d="M17 27v22" className="pote-brilho" />
      </svg>
      <small>{oculto ? 'Meta' : `até R$ ${alvo}`}</small>
    </span>
  )
}

export type NivelMedalha = 'ouro' | 'prata' | 'bronze'

/** Medalha cheia quando foi conseguida; apagada quando ainda falta. */
export function Medalha({ nivel, ok }: { nivel: NivelMedalha; ok: boolean }) {
  return (
    <svg
      className={`medalha medalha-${nivel}${ok ? '' : ' medalha-falta'}`}
      viewBox="0 0 44 48"
      width="44"
      height="48"
      aria-hidden="true"
    >
      <path d="M14 2h7l5 14h-7Z" className="medalha-fita-a" />
      <path d="M30 2h-7l-5 14h7Z" className="medalha-fita-b" />
      <circle cx="22" cy="30" r="15" className="medalha-disco" />
      <circle cx="22" cy="30" r="10.5" className="medalha-aro" />
      <path d="m22 23.5 2 4.2 4.6.6-3.4 3.2.9 4.6-4.1-2.3-4.1 2.3.9-4.6-3.4-3.2 4.6-.6Z" className="medalha-estrela" />
    </svg>
  )
}

/** Anel com quantas conquistas já foram feitas. */
export function AnelConquistas({ feitas, total }: { feitas: number; total: number }) {
  const r = 19
  const volta = 2 * Math.PI * r
  const parte = total > 0 ? feitas / total : 0
  return (
    <span className="anel" role="img" aria-label={`${feitas} de ${total} conquistas`}>
      <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
        <circle cx="24" cy="24" r={r} className="anel-fundo" />
        <circle
          cx="24"
          cy="24"
          r={r}
          className="anel-cheio"
          strokeDasharray={`${volta * parte} ${volta}`}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <b aria-hidden="true">
        {feitas}
        <small>/{total}</small>
      </b>
    </span>
  )
}

/** O Assistente do Orçamento, desenhado no traço do app, para dar o recado do mês. */
export function AssistenteFala({ humor }: { humor: 'alerta' | 'contente' }) {
  return (
    <svg className={`assistente assistente-${humor}`} viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
      <circle cx="24" cy="24" r="23" className="assistente-fundo" />
      <path d="M11 46a13 11 0 0 1 26 0" className="assistente-corpo" />
      <path d="m21 36 3 3 3-3" className="assistente-gravata" />
      <circle cx="24" cy="20" r="10" className="assistente-rosto" />
      <path d="M14.5 17.5c1-6 5-9 9.5-9s8.5 3 9.5 9c-3-2-6-3-9.5-3s-6.5 1-9.5 3Z" className="assistente-cabelo" />
      <circle cx="20.5" cy="20.5" r="1.3" className="assistente-olho" />
      <circle cx="27.5" cy="20.5" r="1.3" className="assistente-olho" />
      {humor === 'contente' ? (
        <path d="M20.5 24.5q3.5 3 7 0" className="assistente-boca" />
      ) : (
        <path d="M21 25.5h6" className="assistente-boca" />
      )}
      {humor === 'alerta' && <path d="M38 6v6m0 4v.5" className="assistente-sinal" />}
    </svg>
  )
}
