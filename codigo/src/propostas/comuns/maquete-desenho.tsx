import type { ReactNode } from 'react'
import type { Roupa, SalaEquipe } from '../../telas/escritorio/equipe'

type Sala = { id: SalaEquipe; nome: string; x: number; y: number }

// A recepção avança do corpo do prédio. As demais salas dividem a mesma laje.
export const salas: Sala[] = [
  { id: 'caixa', nome: 'Caixa', x: 0, y: 0 },
  { id: 'casa', nome: 'Casa', x: 0, y: 146 },
  { id: 'gestao', nome: 'Gestão', x: 184, y: 0 },
  { id: 'apoio', nome: 'Apoio', x: 184, y: 146 },
  { id: 'patrimonio', nome: 'Patrimônio', x: 368, y: 0 },
  { id: 'recepcao', nome: 'Recepção', x: 184, y: 292 },
  { id: 'cartoes', nome: 'Cartões', x: 368, y: 146 },
]

export function projetar(x: number, y: number) {
  return [Math.round(350 + (x - y) * .866), Math.round(100 + (x + y) * .43)]
}

const transladar = (x: number, y: number) => `translate(${projetar(x, y).join(' ')})`

type CamadaSala = { sala: Sala; id: string; destaque: boolean; atenuada: boolean }
const salasPrincipais: SalaEquipe[] = ['caixa', 'casa', 'cartoes', 'patrimonio']

export function PisoMaquete({ sala, id, destaque, atenuada }: CamadaSala) {
  return <g data-sala={sala.id} data-destaque={destaque} data-atenuada={atenuada} transform={transladar(sala.x, sala.y)}>
    <g data-tom="piso">
      <path className="maquete-laje" d="M-126 63 33 142 159 79v9L33 151l-159-79Z" />
      <g transform="matrix(.866 .43 -.866 .43 0 0)">
        <rect width="184" height="146" className="maquete-piso" />
        <rect width="184" height="146" fill={`url(#${id}-tabuas)`} />
        <rect x="9" y="58" width="166" height="64" rx="6" className="maquete-tapete" />
        <rect x="14" y="63" width="156" height="54" rx="4" className="maquete-trama" />
        {destaque && <rect x="2" y="2" width="180" height="142" className="maquete-contorno" />}
      </g>
    </g>
  </g>
}

export function SalaMaquete({ sala, id, atenuada, children }: CamadaSala & { children: ReactNode }) {
  return <g data-atenuada={atenuada || undefined}>
    <g transform={transladar(sala.x, sala.y)}>
      <use href={`#${id}-${sala.y === 0 ? 'janelas' : 'divisoria'}`} transform="matrix(.866 .43 0 1 0 0)" />
      {sala.x === 0 && <use href={`#${id}-janelas`} transform="matrix(-.866 .43 0 1 0 0) scale(.793 1)" />}
    </g>
    <g transform={transladar(sala.x + 85, sala.y + 23)}>
      <use href={`#${id}-estante`} />
      <use href={`#${id}-objeto-${sala.id}`} />
    </g>
    <use href={`#${id}-planta`} transform={transladar(sala.x + 22, sala.y + 123)} />
    {children}
    <use href={`#${id}-luz`} transform={transladar(sala.x + 170, sala.y + 123)} />
    <text transform={transladar(sala.x + 115, sala.y + 130)} textAnchor="middle"
      className={salasPrincipais.includes(sala.id) ? 'maquete-nome-sala nome-sala' : 'maquete-nome-sala'}>{sala.nome}</text>
  </g>
}

const cabelo = {
  curto: 'M-14-51v-5q1-14 16-14q13 0 12 17l-5-4-5-5q-7 8-18 11Z',
  longo: 'M-15-49q-4-21 11-22q16-4 19 12l3 17q-3 7-9 6l1-20q-8 0-13-7q-1 8-9 11l-1 16q-6-3-2-13Z',
  coque: 'M-14-52q-2-13 8-17a6 6 0 1 1 11 0q9 2 9 15l-5-4-6-5q-6 7-17 11Z',
}

const tinta = (cor: number) => `#${cor.toString(16).padStart(6, '0')}`

export function PostoMaquete({ id, funcionario, roupa, x, y, estado }: {
  id: string; funcionario: string; roupa?: Roupa; x: number; y: number; estado: string
}) {
  return <g data-funcionario={funcionario} data-estado={estado} transform={`translate(${x} ${y})`}
    color={roupa && tinta(roupa.pele)}>
    <use href={`#${id}-corpo`} fill={roupa && tinta(roupa.camisa)} />
    <use href={`#${id}-${roupa?.estilo ?? 'curto'}`} fill={roupa ? tinta(roupa.cabelo) : 'var(--texto)'} />
    {roupa?.oculos && <use href={`#${id}-oculos`} />}
    <use href={`#${id}-mesa`} />
    <use className="maquete-maos" href={`#${id}-maos`} />
  </g>
}

/** Peças em coordenadas locais, compartilhadas por <use> nas sete salas e nos 19 postos. */
export function SimbolosMaquete({ id }: { id: string }) {
  return <>
    <pattern id={`${id}-tabuas`} width="56" height="20" patternUnits="userSpaceOnUse">
      <path className="maquete-juntas" d="M0 10h56M0 20h56M12 0v10m30 0v10" />
    </pattern>
    <g id={`${id}-janelas`}>
      <path className="maquete-parede" d="M0-53h184V0H0Z" />
      <path className="maquete-friso" d="M0-53h184M0-4h184" />
      <path className="maquete-vidro" d="M17-44h64v29H17ZM104-44h64v29h-64Z" />
      <path className="maquete-friso" d="M49-44v29m87-29v29M17-28h64m23 0h64M14-14h70m17 0h70" />
    </g>
    <g id={`${id}-divisoria`}>
      <path className="maquete-parede" d="M0-14h46V0H0Zm138 0h46V0h-46Z" />
      <path className="maquete-friso" d="M0-14h46m92 0h46" />
    </g>
    <g id={`${id}-estante`}>
      <ellipse className="maquete-sombra" cx="1" cy="2" rx="38" ry="10" />
      <path className="maquete-madeira-escura" d="M-32-33 13-11v18l-45-22Z" />
      <path className="maquete-madeira-media" d="M13-11 31-20v18L13 7Z" />
      <path className="maquete-madeira" d="m-32-33 18-9 45 22-18 9Z" />
      <path className="maquete-metal" d="m-28-27 36 18v12l-36-18Z" />
      <path className="maquete-papel" opacity=".75" d="m-24-22 4 2v7l-4-2Zm7 3 4 2v7l-4-2Zm7 4 5 2v7l-5-2Zm15 9-6-3v6l6 3Z" />
    </g>
    <g id={`${id}-objeto-caixa`}>
      <path className="maquete-metal" d="m-6-51 20 10v19L-6-32Z" />
      <path className="maquete-parede" d="m14-41 10-5v19l-10 5Z" />
      <path className="maquete-vidro" d="m-6-51 10-5 20 10-10 5Z" />
      <path className="maquete-friso" d="m-3-47 14 7v14l-14-7Z" />
      <ellipse className="maquete-ouro" cx="4" cy="-37" rx="2.4" ry="3.2" />
    </g>
    <g id={`${id}-objeto-casa`}>
      <path className="maquete-folha" d="M-6-43q-7-12 4-9q1-10 8-5q2 4 1 9q12-7 11 3l-6 9Z" />
      <path className="maquete-ouro" d="M-8-43h27l-4 12H-4Z" />
      <path className="maquete-trama" d="M-5-39h22m-18 5h15M0-43l2 12m7-12v12" />
      <path className="maquete-friso" d="M-3-44q7-23 17 0" />
    </g>
    <g id={`${id}-objeto-cartoes`}>
      <rect className="maquete-metal" x="-13" y="-51" width="30" height="18" rx="3" transform="rotate(-12)" />
      <g transform="rotate(12)">
        <rect className="maquete-vidro" x="-3" y="-48" width="30" height="18" rx="3" />
        <path className="maquete-metal" d="M-3-43h30v3H-3Z" />
        <rect className="maquete-ouro" x="1" y="-38" width="6" height="4" rx="1" />
      </g>
    </g>
    <g id={`${id}-objeto-patrimonio`}>
      <path className="maquete-ouro" d="M-10-38q-4-11 9-14q8-2 12 3l6-4v7l6 1v6l-5 2-2 6h-4l-1-4H3l-2 4h-5l-1-6Z" />
      <path className="maquete-tinta" d="M-2-49h8v1.5h-8Zm16 5h2v2h-2Z" />
    </g>
    <g id={`${id}-objeto-gestao`}>
      <path className="maquete-metal" d="M-9-30v-30l34 16v28Z" />
      <path className="maquete-papel" d="M-7-33v-24l30 14v24Z" />
      <path className="maquete-juntas" d="m-4-50 23 11m-23-5 23 11m-23-5 12 6" />
      <path className="maquete-folha" d="m13-27 2 3 6-3-1 3-5 3-3-5Z" />
    </g>
    <g id={`${id}-objeto-apoio`}>
      <path className="maquete-madeira-media" d="m-8-48 17 8v12l-17-8Z" />
      <path className="maquete-madeira-escura" d="m9-40 13-6v12L9-28Z" />
      <path className="maquete-ouro" d="m-10-49 15-8 19 10-15 8Z" />
      <path className="maquete-papel" d="m0-40 6 3v4l-6-3Z" />
    </g>
    <g id={`${id}-objeto-recepcao`}>
      <path className="maquete-metal" d="m-12-45 21 10v5l-21-10Z" />
      <path className="maquete-papel" d="m-12-45 11-5 21 10-11 5Z" />
      <path className="maquete-ouro" d="M9-34q0-9 5-9t5 9Z" />
      <circle cx="14" cy="-43" r="1.5" className="maquete-metal" />
    </g>
    <g id={`${id}-planta`}>
      <ellipse className="maquete-sombra" cx="3" cy="1" rx="13" ry="5" />
      <path className="maquete-madeira-media" d="M-9-12h18L6 0a7 3 0 0 1-12 0Z" />
      <ellipse className="maquete-metal" cy="-12" rx="9" ry="4" />
      <path className="maquete-folha" d="M0-13q-15-4-14-17q9 0 13 10q-5-18 6-21q5 9-1 19q4-7 14-7Q17-17 0-13Z" />
      <path className="maquete-veios" d="M0-13 4-35M0-16l-9-9m11 9 10-8" />
    </g>
    <g id={`${id}-luz`}>
      <ellipse className="maquete-brilho" cy="-14" rx="24" ry="16" />
      <ellipse className="maquete-metal" cy="1" rx="8" ry="3.5" />
      <path className="maquete-haste" d="M0 1v-34" />
      <path className="maquete-ouro" d="M-6-39H6l5 12h-22Z" />
      <ellipse className="maquete-papel" cy="-27" rx="11" ry="2.5" />
    </g>
    <g id={`${id}-corpo`}>
      <ellipse className="maquete-sombra" rx="33" ry="15" cy="0" />
      <path className="maquete-haste" d="M-11-21v17m-9 2 9-3 9 6" />
      <path className="maquete-metal" d="M-23-54q0-5 5-4l15 5q5 1 5 7v22l-11 6-14-7Z" />
      <path className="maquete-vidro" d="m-22-26 12-4 17 7-15 7Z" />
      <path d="M-19-24v-11q0-8 10-11l14-2q11 3 13 13v9l-15 9Z" />
      <path className="maquete-papel" d="m-8-45 6 8 7-8-6 3Z" />
    </g>
    <g id={`${id}-rosto`}>
      <path fill="currentColor" d="M-14-55q1-13 14-13q14 0 14 13v7q-1 9-10 11q-9 2-14-7q-6-1-4-11Z" />
      <path className="maquete-tinta" d="M-4-53h2v2h-2Zm10 0h2v2H6Z" />
      <path fill="none" stroke="#58372a" strokeWidth=".75" d="M0-45q3 2 6-1" />
    </g>
    {Object.entries(cabelo).map(([estilo, d]) => <g key={estilo} id={`${id}-${estilo}`}>
      <use href={`#${id}-rosto`} />
      <path d={d} />
    </g>)}
    <path id={`${id}-oculos`} fill="none" stroke="#312820" strokeWidth="1.2" d="M-7-55h7v6h-7Zm10 0h7v6H3ZM0-53h3" />
    <g id={`${id}-mesa`}>
      <path className="maquete-madeira-escura" d="M-29-27h4V0l-4-2Zm31 14h4v28l-4-2Zm25-12h4V2l-4 2Z" />
      <path className="maquete-madeira-media" d="M-32-27 4-9l30-15v4L4-5l-36-18Z" />
      <path className="maquete-madeira" d="m-32-27 30-15 36 18L4-9Z" />
      <path className="maquete-metal" d="m-10-28 11-5 13 6-11 6Z" />
      <path className="maquete-friso" d="m-5-28 9 4m-5-6 9 4" />
      <path className="maquete-papel" d="m-27-27 8-4 12 6-8 4Z" />
      <path className="maquete-juntas" d="m-22-28 7 3m-9-2 7 3" />
      <path className="maquete-metal" d="m15-20 4-2 7 3-4 2Zm4-12 3 1v11l-3-1Z" />
      <path className="maquete-metal" d="M9-47 31-36v15L9-32Z" />
      <path className="maquete-tela" d="m11-44 18 9v11l-18-9Z" />
      <path className="maquete-juntas" d="m14-39 11 5m-11-2 7 3" />
    </g>
    <path id={`${id}-maos`} fill="currentColor" d="m-12-34 8 5q3 3 0 4l-10-5Zm20 3 6 5q2 4-2 4l-8-6Z" />
  </>
}
