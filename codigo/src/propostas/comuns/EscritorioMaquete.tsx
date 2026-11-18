import { BellRing, Keyboard, Pause } from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import type { EstadoFuncionario } from '../../api/tipos'
import { Icone } from '../../componentes/Icone'
import { POR_ID, type SalaEquipe } from '../../telas/escritorio/equipe'
import type { Campo, DadosInicio } from '../dadosExemplo'
import { PisoMaquete, PostoMaquete, SalaMaquete, SimbolosMaquete, projetar, salas } from './maquete-desenho'
import { useValoresOcultos, Valor } from './privacidade'
import './escritorio-maquete.css'

type Dinheiro = Campo<number, 'reais' | 'centavos'>
type Funcionario = NonNullable<DadosInicio['funcionarios']['valor']>[number]
type CaixaVista = readonly [x: number, y: number, largura: number, altura: number]

const estados = {
  vai_comecar: { desenho: Pause, rotulo: 'Ainda vai começar' },
  trabalhando: { desenho: Keyboard, rotulo: 'Trabalhando' },
  entregue: { nome: 'salvo', rotulo: 'Entregue' },
  precisa_de_voce: { desenho: BellRing, rotulo: 'Precisa de você' },
  indisponivel: { nome: 'ajuda', rotulo: 'Estado indisponível' },
} as const satisfies Record<EstadoFuncionario | 'indisponivel', Parameters<typeof Icone>[0] & { rotulo: string }>

const vistaGeral: CaixaVista = [68, 22, 788, 448]

/** As quatro props originais continuam válidas. A variante regula o espaço ocupado.
 * salaDestacada também aproxima e centraliza a sala. onSelecionar adiciona botões
 * nativos sobre os postos. oculto soma-se ao olho global. Informe papel ao oferecer
 * valores para respeitar a permissão de quem usa a tela.
 */
export interface PropsEscritorioMaquete {
  funcionarios: DadosInicio['funcionarios']
  salaDestacada?: SalaEquipe
  mostrarPlaquinhas?: boolean
  valores?: Partial<Record<string, Dinheiro>>
  variante?: 'compacta' | 'media' | 'grande'
  oculto?: boolean
  papel?: DadosInicio['pessoa']['papel']['valor']
  onSelecionar?: (funcionario: Funcionario) => void
}

export function EscritorioMaquete({
  funcionarios, salaDestacada, mostrarPlaquinhas = false, valores,
  variante = 'media', oculto = false, papel, onSelecionar, detalhesSobDemanda = false,
}: PropsEscritorioMaquete & { detalhesSobDemanda?: boolean }) {
  const id = useId()
  const olhoFechado = useValoresOcultos()
  const rolagem = useRef<HTMLDivElement>(null)
  const [apontado, apontar] = useState<string | null>(null)
  const [focado, focar] = useState<string | null>(null)
  const [selecionado, selecionar] = useState<string | null>(null)
  const interativa = !!onSelecionar || detalhesSobDemanda
  const foco = salas.find(sala => sala.id === salaDestacada)
  const [centroX, centroY] = foco ? projetar(foco.x + 92, foco.y + 73) : [0, 0]
  const [vx, vy, largura, altura] = foco
    ? [centroX - 237, centroY - 156, 474, 270] as const
    : vistaGeral

  useEffect(() => {
    const area = rolagem.current
    if (area) area.scrollLeft = foco ? (area.scrollWidth - area.clientWidth) / 2 : 0
  }, [foco, interativa])

  const planta = salas.map(sala => ({
    sala,
    postos: (funcionarios.valor ?? []).filter(f => f.sala === sala.id).map((funcionario, i) => {
      const membro = POR_ID[funcionario.id]
      const mesa = membro?.mesa ?? (i - 1) * 2
      const [x, y] = projetar(sala.x + 92 + 29 * mesa, sala.y + 81)
      const estado: keyof typeof estados = funcionario.estadoHoje.valor ?? 'indisponivel'
      return { funcionario, roupa: membro?.roupa, mesa, x, y, estado }
    }).sort((a, b) => a.y - b.y),
  }))
  const valorPermitido = papel !== 'equipe' && papel !== null
  const focoDa = (sala: SalaEquipe) => ({ destaque: foco?.id === sala, atenuada: !!foco && foco.id !== sala })

  const visiveis = planta.filter(({ sala }) => !foco || sala === foco)
    .flatMap(({ sala, postos }) => postos.map(posto => ({ ...posto, sala })))
  const detalhe = detalhesSobDemanda
    ? [apontado, focado, selecionado].map(id => visiveis.find(p => p.funcionario.id === id)).find(Boolean)
    : undefined
  const valorDetalhe = detalhe && valorPermitido && valores?.[detalhe.funcionario.id]
  const svg = <svg className="escritorio-maquete" data-variante={variante}
    width={largura} height={altura} viewBox={`${vx} ${vy} ${largura} ${altura}`} aria-hidden="true" focusable="false">
    <title>Maquete isométrica do escritório</title>
    <defs>
      <SimbolosMaquete id={id} />
      {mostrarPlaquinhas && Object.entries(estados).map(([estado, { rotulo, ...icone }]) =>
        <g key={estado} id={`${id}-${estado}`}><Icone {...icone} size={12} strokeWidth={2.3} /></g>)}
    </defs>
    {planta.map(({ sala }) => <PisoMaquete key={sala.id} sala={sala} {...focoDa(sala.id)} id={id} />)}
    {planta.map(({ sala, postos }) => <SalaMaquete key={sala.id} sala={sala} {...focoDa(sala.id)} id={id}>
      {postos.map(({ funcionario, roupa, x, y, estado }) =>
        <PostoMaquete key={funcionario.id} funcionario={funcionario.id} {...{ id, roupa, x, y, estado }} />)}
    </SalaMaquete>)}
    {mostrarPlaquinhas && planta.map(({ sala, postos }) => {
      const [x, y] = projetar(sala.x + 92, sala.y + 81)
      return <foreignObject key={sala.id} className="maquete-legendas" x={x - 105} y={y - 110} width="210" height="94"
        data-atenuada={focoDa(sala.id).atenuada || undefined}>
        <div>
          {postos.map(({ funcionario, mesa, estado }) =>
            <span key={funcionario.id} className="maquete-placa maquete-rotulo" data-mesa={mesa || undefined} data-estado={estado}
              title={estados[estado].rotulo}>
              <svg width="12" height="12"><use href={`#${id}-${estado}`} /></svg>
              {funcionario.curto}
            </span>)}
        </div>
      </foreignObject>
    })}
    {!detalhesSobDemanda && valores && valorPermitido &&
      <foreignObject className="maquete-legendas" x={vx} y={vy} width={largura} height={altura}>
        <div>
          {planta.flatMap(({ sala, postos }) => postos.map(({ funcionario, x, y, estado }) => {
            const valor = valores[funcionario.id]
            return valor && <span key={funcionario.id} className="maquete-balao" data-estado={estado}
              data-atenuada={focoDa(sala.id).atenuada || undefined} style={{ left: x + 38 - vx, top: y - 102 - vy }}>
              {oculto || olhoFechado ? <span aria-label="Valor oculto">•••</span> : <Valor campo={valor} />}
            </span>
          }))}
        </div>
      </foreignObject>}
  </svg>

  if (!interativa) return svg

  return <>
    <div ref={rolagem} className="maquete-rolagem" role="group" aria-label="Postos do escritório"
      data-variante={variante}>
      <div className="maquete-palco" style={{ '--maquete-largura-toque': `${largura}px` } as CSSProperties}>
        {svg}
        {visiveis.map(({ funcionario, x, y, estado, sala }) => <button key={funcionario.id} type="button"
          className="maquete-posto" aria-label={`${funcionario.nome} · ${sala.nome} · ${estados[estado].rotulo}`}
          style={{ left: `${(x - 4 - vx) / largura * 100}%`, top: `${(y - 47 - vy) / altura * 100}%` }}
          onPointerEnter={e => { if (detalhesSobDemanda && e.pointerType !== 'touch') apontar(funcionario.id) }}
          onPointerLeave={() => apontar(null)}
          onFocus={() => { if (detalhesSobDemanda) { apontar(null); focar(funcionario.id) } }} onBlur={() => focar(null)}
          onClick={() => {
            if (detalhesSobDemanda) selecionar(funcionario.id)
            onSelecionar?.(funcionario)
          }} />)}
      </div>
    </div>
    {detalhesSobDemanda && <div className="escritorio3d-detalhe" aria-live="polite">
      {detalhe && <>
        <strong>{detalhe.funcionario.nome}</strong>
        <span>{POR_ID[detalhe.funcionario.id]?.papel || detalhe.sala.nome} · {estados[detalhe.estado].rotulo}</span>
        {valorDetalhe && <span className="escritorio3d-valor">
          {oculto || olhoFechado ? <span aria-label="Valor oculto">•••</span> : <Valor campo={valorDetalhe} />}
        </span>}
      </>}
    </div>}
  </>
}
