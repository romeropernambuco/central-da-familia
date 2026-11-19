import { Flag } from 'lucide-react'
import { Icone } from '../../componentes/Icone'
import { useValoresOcultos, Valor } from '../comuns/privacidade'
import type { DadosInicio } from '../dadosExemplo'
import { diferenca } from './modelo'

const anos = [2026, 2027, 2028, 2029]

export function Trilha({ plano, celular, consultarMargem }: {
  plano: Pick<DadosInicio['plano2029'], 'progressao' | 'faltamPorMesComMargem' | 'faltamPorMesSemMargem'>; celular: boolean; consultarMargem: () => void
}) {
  const oculto = useValoresOcultos()
  const { progressao, faltamPorMesComMargem: oficial, faltamPorMesSemMargem } = plano
  const comparacao = diferenca(faltamPorMesSemMargem, oculto)
  const mesmoValor = !oculto && oficial.estado === 'pronto' && faltamPorMesSemMargem.estado === 'pronto' &&
    Math.abs(oficial.valor) === Math.abs(faltamPorMesSemMargem.valor)
  const fracao = !oculto && progressao.estado === 'pronto'
    ? Math.max(0, Math.min(1, progressao.valor / 100)) : null
  const largura = celular ? 320 : 640
  const altura = celular ? 116 : 128
  const x = largura / 16
  const y = altura - 22
  // A mesma curva quadrática da D. O percentual avança no eixo horizontal.
  const ponto = (t: number) => ({ x: x + (largura - 2 * x) * t, y: y - (y - 28) * t ** 2 })
  const atual = fracao === null ? null : ponto(fracao)
  const chegada = ponto(1)
  const inicio = `M${x} ${y}`
  const caminho = (t: number) => {
    const fim = ponto(t)
    return `${inicio} Q${ponto(t / 2).x} ${y} ${fim.x} ${fim.y}`
  }

  return <>
    <figure className="j-horizonte">
      <figcaption>
        <div>
          <span>{atual ? 'Você está aqui' : 'Cobertura atual'}</span>
          {progressao.estado === 'pronto' ? <Valor campo={progressao} className="numero-principal" />
            : <strong>Ainda sem dado</strong>}
          <span>da meta de renda</span>
        </div>
        <div className="j-chegada">
          <span><Icone desenho={Flag} size={16} /> Destino</span>
          <strong>Viver de rendimentos</strong>
        </div>
      </figcaption>
      <svg className="j-trilha" aria-hidden="true" focusable="false" viewBox={`0 0 ${largura} ${altura}`} preserveAspectRatio="none">
        <path className="j-caminho" d={caminho(1)} />
        {fracao !== null && fracao > 0 && <path className="j-cobertura" d={caminho(fracao)} />}
        {anos.map((ano, i) => {
          const marco = ponto(i / (anos.length - 1))
          return <circle key={ano} className="j-marco" cx={marco.x} cy={marco.y} r="3" />
        })}
        <circle className="j-destino" cx={chegada.x} cy={chegada.y} r="9" />
        {atual && <g className="j-aqui">
          <line x1={atual.x} x2={atual.x} y1={atual.y - 17} y2={atual.y} />
          <line className="j-ponto" x1={atual.x} x2={atual.x} y1={atual.y} y2={atual.y} />
        </g>}
      </svg>
      <ol className="j-anos" aria-label="Marcos do calendário">
        {anos.map(ano => <li key={ano}>{ano}</li>)}
      </ol>
    </figure>
    <div className="j-cenarios">
      <button type="button" onClick={consultarMargem}>Ver diferença com margem <Icone nome="abrir" size={16} /></button>
      <details>
        <summary>Estimativa sem margem <Icone nome="abrir" size={16} /></summary>
        <div className="j-comparacao">
          <span>{comparacao.rotulo}</span>
          {mesmoValor ? <strong>Mesmo montante do resumo</strong> :
            comparacao.campo.estado === 'pronto' ? <Valor campo={comparacao.campo} className="numero-secundario" />
              : <strong>Ainda sem dado</strong>}
        </div>
      </details>
    </div>
  </>
}
