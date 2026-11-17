import { Check, CircleHelp, Clock, Hand, Keyboard } from 'lucide-react'
import type { EstadoFuncionario } from '../../api/tipos'
import type { SalaEquipe } from '../../telas/escritorio/equipe'
import type { Campo, DadosInicio } from '../dadosExemplo'
import { Valor } from './privacidade'
import './escritorio-maquete.css'

type Dinheiro = Campo<number, 'reais' | 'centavos'>
type Ponto = [x: number, y: number, z?: number]
type Sala = { id: SalaEquipe; nome: string; x: number; y: number; pessoas: [string, string] }

const salas: Sala[] = [
  { id: 'caixa', nome: 'Caixa', x: 0, y: 0, pessoas: ['contador', 'tesoureiro'] },
  { id: 'casa', nome: 'Casa', x: 156, y: 0, pessoas: ['folha', 'comprador'] },
  { id: 'cartoes', nome: 'Cartões', x: 0, y: 148, pessoas: ['cartao', 'assistente'] },
  { id: 'patrimonio', nome: 'Patrimônio', x: 156, y: 148, pessoas: ['guardado', 'imoveis'] },
]

const estados = {
  vai_comecar: { Icone: Clock, rotulo: 'Ainda vai começar' },
  trabalhando: { Icone: Keyboard, rotulo: 'Trabalhando' },
  entregue: { Icone: Check, rotulo: 'Entregue' },
  precisa_de_voce: { Icone: Hand, rotulo: 'Precisa de você' },
} satisfies Record<EstadoFuncionario, { Icone: typeof Check; rotulo: string }>

function projetar([x, y, z = 0]: Ponto) {
  return [320 + (x - y) * Math.sqrt(3) / 2, 90 + (x + y) / 2 - z]
}

function Face({ vertices, tinta }: { vertices: Ponto[]; tinta: string }) {
  return <polygon points={vertices.map(p => projetar(p).join(',')).join(' ')} className={tinta} />
}

function Bloco({ x, y, l, p, h, base = 0, tom }: {
  x: number; y: number; l: number; p: number; h: number; base?: number; tom: string
}) {
  const z = base + h
  return <g data-tom={tom}>
    <Face vertices={[[x, y + p, base], [x + l, y + p, base], [x + l, y + p, z], [x, y + p, z]]} tinta="face-media" />
    <Face vertices={[[x + l, y, base], [x + l, y + p, base], [x + l, y + p, z], [x + l, y, z]]} tinta="face-escura" />
    <Face vertices={[[x, y, z], [x + l, y, z], [x + l, y + p, z], [x, y + p, z]]} tinta="face-clara" />
  </g>
}

function Posicao({ sala, i }: { sala: Sala; i: number }) {
  const [x, y] = mesaDe(sala, i)
  const [rostoX, rostoY] = projetar([x + 13, y + 9, 42])
  return <g>
    <Bloco x={x + 4} y={y - 3} l={18} p={17} h={18} tom="movel" />
    <Bloco x={x + 5} y={y + 3} l={16} p={14} base={16} h={19} tom={i ? 'roupa-clara' : 'roupa'} />
    <circle cx={rostoX} cy={rostoY} r="8" className={i ? 'pele-clara' : 'pele'} />
    <path d={`M ${rostoX - 8} ${rostoY} a 8 8 0 1 1 16 0 q -10 -2 -12 -4 z`} className="cabelo" />
    <Bloco x={x - 4} y={y + 21} l={32} p={17} h={24} tom="movel" />
    <Bloco x={x - 8} y={y + 17} l={40} p={24} base={24} h={4} tom="mesa" />
    <Bloco x={x + 2} y={y + 24} l={16} p={11} base={28} h={2} tom="tela" />
    <Bloco x={x + 2} y={y + 34} l={16} p={2} base={30} h={11} tom="tela" />
  </g>
}

const mesaDe = ({ x, y }: Sala, i: number): [number, number] => [x + (i ? 100 : 23), y + (i ? 53 : 38)]

export interface PropsEscritorioMaquete {
  funcionarios: DadosInicio['funcionarios']
  salaDestacada?: SalaEquipe
  mostrarPlaquinhas?: boolean
  valores?: Partial<Record<string, Dinheiro>>
}

export function EscritorioMaquete({ funcionarios, salaDestacada, mostrarPlaquinhas = false, valores }: PropsEscritorioMaquete) {
  const lista = funcionarios.valor ?? []
  return <svg className="escritorio-maquete" viewBox="0 0 640 445" role="group" aria-label="Maquete isométrica do escritório">
    {salas.map(s => {
      const [x, y] = projetar([s.x + 74, s.y + 120, 0])
      return <g key={s.id} data-sala={s.id} data-destaque={salaDestacada === s.id} role="group" aria-label={s.nome}>
        <Bloco x={s.x} y={s.y} l={146} p={138} h={8} base={-8} tom="piso" />
        <Bloco x={s.x} y={s.y} l={146} p={4} h={25} tom="parede" />
        <Bloco x={s.x} y={s.y + 4} l={4} p={134} h={25} tom="parede" />
        {s.pessoas.map((id, i) => <Posicao key={id} sala={s} i={i} />)}
        <text x={x} y={y} textAnchor="middle" className="nome-sala">{s.nome}</text>
      </g>
    })}
    {salas.flatMap(s => s.pessoas.map((id, i) => {
      const f = lista.find(p => p.id === id)
      const v = valores?.[id]
      if (!f || (!mostrarPlaquinhas && !v)) return null

      const [mx, my] = mesaDe(s, i)
      const [x, y] = projetar([mx + 13, my + 9, 52])
      const { Icone, rotulo } = f.estadoHoje.valor ? estados[f.estadoHoje.valor] : { Icone: CircleHelp, rotulo: 'Estado indisponível' }
      return <foreignObject key={id} x={x - 60} y={y - 51} width="120" height="51">
        <div className="maquete-legenda">
          {mostrarPlaquinhas && <span className="maquete-placa" role="img" aria-label={`${f.nome} · ${rotulo}`} title={rotulo}><Icone size={13} aria-hidden />{f.curto}</span>}
          {v && <span className="maquete-placa"><Valor campo={v} /></span>}
        </div>
      </foreignObject>
    }))}
  </svg>
}
