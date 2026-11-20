import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Icone } from '../../componentes/Icone'
import { Plano2029 } from '../../componentes/ilustracoes'
import { useValoresOcultos, Valor } from '../comuns/privacidade'
import type { Campo, DadosInicio } from '../dadosExemplo'

export type CampoFinanceiro = Parameters<typeof Valor>[0]['campo']
export type Dinheiro = Campo<number, 'reais' | 'centavos'>

export function Medida({ campo, className }: { campo?: CampoFinanceiro; className?: string }) {
  return campo?.estado === 'pronto' ? (
    <Valor campo={campo} className={className} />
  ) : (
    <span className="i-ausente">Ainda sem dado</span>
  )
}

export function centavos(campo: Dinheiro) {
  return campo.estado === 'pronto' ? Math.round(campo.valor * (campo.unidade === 'reais' ? 100 : 1)) : null
}

export function magnitude(campo: Dinheiro): Dinheiro {
  return campo.estado === 'pronto' ? { ...campo, valor: Math.abs(campo.valor) } : campo
}

/** Cada quantia tem um único lugar. A chave normaliza reais e centavos. */
export function reservarQuantias(campos: Dinheiro[]) {
  const usadas = new Set<number>()
  return campos.map(campo => {
    const chave = centavos(campo)
    if (chave === null) return { campo, repetida: false }
    const repetida = usadas.has(chave)
    usadas.add(chave)
    return { campo, repetida }
  })
}

export function Quantia({
  medida,
  className,
}: {
  medida: ReturnType<typeof reservarQuantias>[number]
  className?: string
}) {
  const oculto = useValoresOcultos()
  return medida.repetida && !oculto ? (
    <span className="i-ausente">Valor já mostrado</span>
  ) : (
    <Medida campo={medida.campo} className={className} />
  )
}

const anos = [2026, 2027, 2028, 2029] as const

function Trilha({ progressao }: { progressao: DadosInicio['plano2029']['progressao'] }) {
  const oculto = useValoresOcultos()
  const fracao = !oculto && progressao.estado === 'pronto' ? Math.max(0, Math.min(1, progressao.valor / 100)) : null
  const largura = 320
  const altura = 116
  const inicio = { x: largura / 16, y: altura - 22 }
  const amplitude = { x: largura - 2 * inicio.x, y: inicio.y - 28 }
  // A distância horizontal representa a cobertura. A curva só dá forma à trilha.
  const ponto = (t: number) => ({ x: inicio.x + amplitude.x * t, y: inicio.y - amplitude.y * t ** 2 })
  const atual = fracao === null ? null : ponto(fracao)
  const controle = fracao === null || fracao === 0 ? null : ponto(fracao / 2)
  const chegada = ponto(1)
  const origem = `M${inicio.x} ${inicio.y}`

  return (
    <figure className="i-trilha">
      <figcaption>
        <span className="i-rotulo">{atual ? 'Você está aqui' : 'Cobertura atual'}</span>
        <Medida campo={progressao} className="i-primario" />
        <span className="i-rotulo">da meta de renda</span>
      </figcaption>
      <svg className="i-curva" aria-hidden="true" focusable="false" viewBox={`0 0 ${largura} ${altura}`}>
        <path className="i-caminho" d={`${origem} Q${largura / 2} ${inicio.y} ${chegada.x} ${chegada.y}`} />
        {atual && controle && (
          <path
            className="i-cobertura"
            d={`${origem} Q${controle.x.toFixed(2)} ${inicio.y} ${atual.x.toFixed(2)} ${atual.y.toFixed(2)}`}
          />
        )}
        {anos.map((ano, indice) => {
          const { x, y } = ponto(indice / (anos.length - 1))
          return <circle key={ano} className="i-marco" cx={x} cy={y} r="3.75" />
        })}
        <circle className="i-chegada" cx={chegada.x} cy={chegada.y} r="10" />
        <circle className="i-nucleo" cx={chegada.x} cy={chegada.y} r="3.5" />
        {atual && (
          <g>
            <line className="i-haste" x1={atual.x} x2={atual.x} y1={atual.y - 18} y2={atual.y} />
            <circle className="i-posicao" cx={atual.x.toFixed(2)} cy={atual.y.toFixed(2)} r="8" />
          </g>
        )}
      </svg>
      <ol className="i-anos" aria-label="Marcos do calendário">
        {anos.map(ano => (
          <li key={ano}>{ano}</li>
        ))}
      </ol>
      <p className="i-destino">
        <Icone desenho={Flag} size={18} /> Viver de rendimentos
      </p>
    </figure>
  )
}

export function CartaoPlano({
  id,
  plano,
  semMargem,
}: {
  id: string
  plano: DadosInicio['plano2029']
  semMargem: ReturnType<typeof reservarQuantias>[number]
}) {
  const [aberto, setAberto] = useState(false)
  const oculto = useValoresOcultos()
  const diferenca = centavos(plano.faltamPorMesSemMargem)
  const rotuloSemMargem = oculto
    ? 'Diferença mensal sem margem'
    : diferenca !== null && diferenca < 0
      ? 'Sobra mensal sem margem'
      : 'Falta mensal sem margem'
  return (
    <section className="i-cartao i-plano" aria-labelledby={id}>
      <div className="i-cabecalho-cartao">
        <span className="i-icone">
          <Icone nome="plano2029" />
        </span>
        <h2 id={id} tabIndex={-1}>
          Rumo a 2029
        </h2>
      </div>
      <Trilha progressao={plano.progressao} />
      <div className="i-arte-plano" aria-hidden="true">
        <Plano2029 />
      </div>
      <details className="i-cenario" onToggle={evento => setAberto(evento.currentTarget.open)}>
        <summary className="i-alvo">
          Cenário sem margem <Icone nome="abrir" size={16} />
        </summary>
        {aberto && (
          <div>
            <p className="i-rotulo">{rotuloSemMargem}</p>
            <Quantia medida={semMargem} className="i-secundario" />
          </div>
        )}
      </details>
    </section>
  )
}
