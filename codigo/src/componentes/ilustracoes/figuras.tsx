import { useId, type ReactNode } from 'react'
import './ilustracoes.css'

/** Figuras sempre estáticas em relação a dados: nunca recebem saldo, quantidade ou perfil. */
export interface IlustracaoProps {
  titulo?: string
  className?: string
  /** Movimento breve de acolhimento; desligado por padrão. */
  animada?: boolean
}

function criarFigura(nome: string, desenho: ReactNode) {
  function Figura({ titulo, className = '', animada = false }: IlustracaoProps) {
    const id = useId()
    const informativa = Boolean(titulo?.trim())
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 160 120"
        width="160"
        height="120"
        className={`cf-ilustracao ${animada ? 'cf-ilustracao--animada' : ''} ${className}`.trim()}
        focusable="false"
        aria-hidden={informativa ? undefined : true}
        role={informativa ? 'img' : undefined}
        aria-labelledby={informativa ? id : undefined}
      >
        {informativa && <title id={id}>{titulo}</title>}
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M28 98h104" opacity=".25" />
          <rect x="30" y="16" width="100" height="80" rx="32" fill="var(--accent-soft)" stroke="none" />
          <g className="cf-ilustracao-desenho">{desenho}</g>
          <path d="M23 48v6m-3-3h6m111 20v6m-3-3h6" opacity=".5" />
        </g>
      </svg>
    )
  }
  Figura.displayName = nome
  return Figura
}

export const SemGastos = /*#__PURE__*/ criarFigura(
  'SemGastos',
  <>
    <path d="M49 36h62v34a31 25 0 0 1-62 0Z" fill="var(--surface)" />
    <path d="M49 43h62M58 53v17a22 16 0 0 0 44 0V53" strokeDasharray="3 5" />
    <path d="M72 24h16m-8-6v12" />
  </>,
)
export const TudoEmDia = /*#__PURE__*/ criarFigura(
  'TudoEmDia',
  <>
    <circle cx="80" cy="59" r="30" fill="var(--surface)" />
    <path d="m65 59 10 10 21-23" strokeWidth="3" />
    <path d="m39 28 4 6m75 0 4-6M80 13v7M34 77l7-2m78 0 7 2" />
  </>,
)
export const SemCartoes = /*#__PURE__*/ criarFigura(
  'SemCartoes',
  <>
    <rect x="43" y="27" width="70" height="46" rx="9" fill="var(--accent-soft)" transform="rotate(-8 78 50)" />
    <rect x="42" y="40" width="78" height="49" rx="9" fill="var(--surface)" />
    <path d="M43 54h76M55 74h14m7 0h7" />
    <rect x="98" y="67" width="10" height="10" rx="3" />
  </>,
)
export const SemImoveis = /*#__PURE__*/ criarFigura(
  'SemImoveis',
  <>
    <path d="M48 53 80 27l32 26v35a6 6 0 0 1-6 6H54a6 6 0 0 1-6-6Z" fill="var(--surface)" />
    <path d="m39 58 41-34 41 34M70 94V69a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v25" />
    <rect x="58" y="48" width="12" height="10" rx="3" fill="var(--accent-soft)" />
  </>,
)
export const SemAplicacoes = /*#__PURE__*/ criarFigura(
  'SemAplicacoes',
  <>
    <rect x="48" y="49" width="64" height="44" rx="12" fill="var(--surface)" />
    <circle cx="80" cy="71" r="12" />
    <path d="M80 65v12m-6-6h12m26-10h5m-5 19h5" />
    <path
      d="M80 49V27m0 12c-15 0-19-10-19-15 13 0 19 6 19 15Zm0-5c0-12 9-18 18-18 0 12-7 18-18 18Z"
      fill="var(--accent-soft)"
    />
  </>,
)
export const SemRecebimentos = /*#__PURE__*/ criarFigura(
  'SemRecebimentos',
  <>
    <path d="M48 59 39 83v10h82V83l-9-24H48Z" fill="var(--surface)" />
    <path d="M40 80h24l5 7h22l5-7h24M80 23v42m-12-12 12 12 12-12" />
    <path d="M53 35h8m38 0h8" opacity=".5" />
  </>,
)
export const SemDesejos = /*#__PURE__*/ criarFigura(
  'SemDesejos',
  <>
    <path d="m80 27 12 23 25 4-18 19 4 26-23-12-23 12 4-26-18-19 25-4Z" fill="var(--surface)" />
    <path d="m80 43 6 12 13 2M39 33l5 5m72 0 5-5M80 13v5" />
  </>,
)
export const CasaVazia = /*#__PURE__*/ criarFigura(
  'CasaVazia',
  <>
    <path d="m48 54 16-25m48 25L96 29" />
    <path d="m43 54 9 35a6 6 0 0 0 6 5h44a6 6 0 0 0 6-5l9-35Z" fill="var(--surface)" />
    <rect x="39" y="48" width="82" height="12" rx="6" fill="var(--accent-soft)" />
    <path d="m64 69 3 15m13-15v15m16-15-3 15" />
  </>,
)
export const AssessorDaCasa = /*#__PURE__*/ criarFigura(
  'AssessorDaCasa',
  <>
    <circle cx="70" cy="34" r="13" fill="var(--surface)" />
    <path d="M44 93V72a26 22 0 0 1 52 0v21M55 74v19m30-19v19" fill="var(--surface)" />
    <path d="m57 55 13 11 13-11" />
    <rect x="94" y="73" width="25" height="21" rx="5" fill="var(--accent-soft)" />
    <path d="M100 73v-5a6 6 0 0 1 12 0v5M103 83h7" />
  </>,
)
export const FamiliaConvite = /*#__PURE__*/ criarFigura(
  'FamiliaConvite',
  <>
    <rect x="39" y="40" width="82" height="53" rx="9" fill="var(--surface)" />
    <path d="m41 44 35 25a7 7 0 0 0 8 0l35-25M42 90l22-20m54 20L96 70" />
    <path d="M80 37c-16-9-13-22-5-22 3 0 5 2 5 4 2-5 10-6 13 0 4 7-4 13-13 18Z" fill="var(--accent-soft)" />
  </>,
)
export const Plano2029 = /*#__PURE__*/ criarFigura(
  'Plano2029',
  <>
    <path d="M56 74a24 24 0 0 1 48 0" fill="var(--surface)" />
    <path d="M35 75h90M80 36v-8m-28 20-6-6m62 6 6-6M40 94c26-21 54-21 80 0" />
    <path
      d="M109 94V65m0 9c-13 0-18-8-18-15 12 0 18 6 18 15Zm0-6c0-11 7-17 17-17 0 12-7 17-17 17Z"
      fill="var(--accent-soft)"
    />
  </>,
)
export const Backup = /*#__PURE__*/ criarFigura(
  'Backup',
  <>
    <path d="M80 23 111 35v25c0 19-15 31-31 37-16-6-31-18-31-37V35Z" fill="var(--surface)" />
    <path d="M80 78V45m-12 12 12-12 12 12M65 76v6h30v-6" />
  </>,
)
export const Desfeito = /*#__PURE__*/ criarFigura(
  'Desfeito',
  <>
    <path d="M53 43h34a25 25 0 0 1 0 50H70" strokeWidth="3" />
    <path d="M70 25 51 43l19 18" strokeWidth="3" />
    <circle cx="49" cy="91" r="5" fill="var(--surface)" />
  </>,
)
export const Erro = /*#__PURE__*/ criarFigura(
  'Erro',
  <>
    <path d="M65 83H54a17 17 0 0 1-1-34 28 28 0 0 1 54-2 18 18 0 0 1 4 36h-10" fill="var(--surface)" />
    <path d="m75 69-7 9 10 7-6 10m17-26 8 8-9 9 7 9" />
    <path d="M42 30h9m60 0h8" opacity=".5" />
  </>,
)
export const Carregando = /*#__PURE__*/ criarFigura(
  'Carregando',
  <>
    <circle cx="80" cy="60" r="28" fill="var(--surface)" />
    <path d="M80 32a28 28 0 0 1 28 28" strokeWidth="4" />
    <path d="M80 44v17l11 7" />
    <path d="M44 23h7m59 73h7" opacity=".5" />
  </>,
)
export const PrivacidadeOlho = /*#__PURE__*/ criarFigura(
  'PrivacidadeOlho',
  <>
    <path d="M43 51c17 25 57 25 74 0" strokeWidth="3" />
    <path d="m50 61-7 10m24-1-3 12m16-9v13m16-16 3 12m11-21 7 10" />
  </>,
)
export const Bemvindo = /*#__PURE__*/ criarFigura(
  'Bemvindo',
  <>
    <path d="M51 94V36a8 8 0 0 1 8-8h43a8 8 0 0 1 8 8v58Z" fill="var(--surface)" />
    <path d="m63 94 31 7V31l-31 6Z" fill="var(--accent-soft)" />
    <path d="M84 66v5M33 37v8m-4-4h8m86-14v8m-4-4h8" />
  </>,
)
