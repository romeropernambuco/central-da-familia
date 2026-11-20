import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Icone } from '../../componentes/Icone'
import { SemAplicacoes, SemImoveis, SemRecebimentos } from '../../componentes/ilustracoes/figuras'
import { useValoresOcultos, Valor } from '../comuns/privacidade'
import type { DadosInicio } from '../dadosExemplo'

type CampoValor = Parameters<typeof Valor>[0]['campo']

export function Quantia({ campo, tamanho }: { campo: CampoValor; tamanho?: 'principal' | 'secundario' }) {
  return campo.estado === 'pronto' ? (
    <Valor campo={campo} className={tamanho && `k-numero-${tamanho}`} />
  ) : (
    <span className="k-sem-dado">Ainda sem dado</span>
  )
}

export function Lacuna({ dados, detalhe = false }: { dados: DadosInicio; detalhe?: boolean }) {
  const oculto = useValoresOcultos()
  const { faltamPorMesComMargem: oficial, faltamPorMesSemMargem: alternativo } = dados.plano2029
  const campo = detalhe ? alternativo : oficial
  const rotulo =
    oculto || campo.estado !== 'pronto'
      ? 'Diferença por mês'
      : campo.valor < 0
        ? 'Sobra por mês'
        : campo.valor === 0
          ? 'Meta mensal coberta'
          : 'Falta por mês'

  return (
    <div className="k-lacuna">
      <span>
        {rotulo} · {detalhe ? 'sem margem' : 'com margem'}
      </span>
      {detalhe &&
      !oculto &&
      oficial.estado === 'pronto' &&
      alternativo.estado === 'pronto' &&
      oficial.valor === alternativo.valor ? (
        <strong>Mesmo valor do cenário com margem</strong>
      ) : (
        <Quantia
          campo={campo.estado === 'pronto' ? { ...campo, valor: Math.abs(campo.valor) } : campo}
          tamanho={detalhe ? 'secundario' : 'principal'}
        />
      )}
    </div>
  )
}

const marcos = [2026, 2027, 2028, 2029]

function Horizonte({ progressao }: { progressao: DadosInicio['plano2029']['progressao'] }) {
  const oculto = useValoresOcultos()
  const fracao = !oculto && progressao.estado === 'pronto' ? Math.max(0, Math.min(1, progressao.valor / 100)) : null
  const largura = 320
  const altura = 116
  const origem = { x: largura / 16, y: altura - 22 }
  const ponto = (t: number) => ({
    x: origem.x + (largura - 2 * origem.x) * t,
    y: origem.y - (origem.y - 28) * t ** 2,
  })
  const atual = fracao === null ? null : ponto(fracao)
  const trecho = fracao === null ? null : ponto(fracao / 2).x
  const chegada = ponto(1)
  const partida = `M${origem.x} ${origem.y}`

  return (
    <figure className="k-horizonte">
      <figcaption>
        <div className="k-cobertura">
          <span>{atual ? 'Você está aqui' : 'Cobertura atual'}</span>
          <Quantia campo={progressao} tamanho="principal" />
          <span>da meta de renda</span>
        </div>
        <div className="k-meta">
          <Icone desenho={Flag} size={17} />
          <strong>
            Viver de
            <br />
            rendimentos
          </strong>
        </div>
      </figcaption>
      <svg
        className="k-trilha"
        viewBox={`0 0 ${largura} ${altura}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path className="k-trilha-base" d={`${partida} Q${largura / 2} ${origem.y} ${chegada.x} ${chegada.y}`} />
        {atual && trecho !== null && trecho > origem.x && (
          <path
            className="k-trilha-preenchida"
            d={`${partida} Q${trecho.toFixed(2)} ${origem.y} ${atual.x.toFixed(2)} ${atual.y.toFixed(2)}`}
          />
        )}
        {marcos.map((ano, i) => {
          const { x, y } = ponto(i / (marcos.length - 1))
          return <circle key={ano} className="k-trilha-marco" cx={x} cy={y} r="3.5" />
        })}
        <circle className="k-trilha-destino" cx={chegada.x} cy={chegada.y} r="9" />
        {atual && (
          <g className="k-trilha-posicao">
            <line x1={atual.x} x2={atual.x} y1={atual.y - 18} y2={atual.y} />
            <circle cx={atual.x} cy={atual.y} r="7" />
          </g>
        )}
      </svg>
      <ol aria-label="Marcos do calendário">
        {marcos.map(ano => (
          <li key={ano}>{ano}</li>
        ))}
      </ol>
    </figure>
  )
}

export function Plano({ dados }: { dados: DadosInicio }) {
  const [cenario, setCenario] = useState(false)
  const motores = [
    {
      nome: 'Aplicações',
      legenda: 'Rendimento de hoje',
      Figura: SemAplicacoes,
      campo: dados.aplicacoes.rendeuHoje,
      icone: 'guardado',
    },
    {
      nome: 'Imóveis',
      legenda: 'Aluguel líquido estimado',
      Figura: SemImoveis,
      campo: dados.imoveis.aluguelLiquidoEstimado,
      icone: 'imovel',
    },
    {
      nome: 'Receitas',
      legenda: 'Previstas para o mês',
      Figura: SemRecebimentos,
      campo: dados.recebimentos.previsto,
      icone: 'entrada',
    },
  ] as const

  return (
    <>
      <header className="k-secao-cabecalho">
        <Icone nome="plano2029" size={20} />
        <h2>Rumo a 2029</h2>
      </header>
      <div className="k-plano-cartao">
        <Lacuna dados={dados} />
        <Horizonte progressao={dados.plano2029.progressao} />
        <details className="k-cenario" onToggle={evento => setCenario(evento.currentTarget.open)}>
          <summary>
            Cenário sem margem <Icone nome="abrir" size={16} />
          </summary>
          {cenario && <Lacuna dados={dados} detalhe />}
        </details>
      </div>
      <h3 className="k-motores-titulo">Motores do plano</h3>
      <div className="k-motores">
        {motores.map(({ nome, legenda, Figura, campo, icone }) => (
          <article key={nome} className="k-motor">
            <div className="k-motor-texto">
              <h4>
                <Icone nome={icone} size={16} />
                {nome}
              </h4>
              <p>{legenda}</p>
              <Quantia campo={campo} tamanho="secundario" />
            </div>
            <div className="k-figura" aria-hidden="true">
              <Figura />
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
