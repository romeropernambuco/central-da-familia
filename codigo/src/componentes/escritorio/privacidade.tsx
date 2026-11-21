import { PONTOS } from '../../lib/olho'
import { createContext, useContext, type ReactNode } from 'react'
import type { Campo } from './dadosDeExemplo'

export const PrivacidadePropostas = createContext(false)
export const useValoresOcultos = () => useContext(PrivacidadePropostas)

const formatadores = {
  reais: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
  percentual: new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }),
  quantidade: new Intl.NumberFormat('pt-BR'),
}

/** Marca uma ocorrência para a contagem, inclusive percentual ou número exibido sem unidade. */
export function NumeroFinanceiro({ children, className }: { children: ReactNode; className?: string }) {
  const oculto = useValoresOcultos()
  return (
    <span
      className={className ? `numero-financeiro ${className}` : 'numero-financeiro'}
      data-numero-financeiro={!oculto || undefined}
    >
      {oculto ? (
        <span role="img" aria-label="Valor oculto">
          {PONTOS}
        </span>
      ) : (
        children
      )}
    </span>
  )
}

type CampoFinanceiro = Campo<number, 'reais' | 'centavos' | 'percentual' | 'quantidade'>

export function Valor({ campo, className }: { campo: CampoFinanceiro; className?: string }) {
  if (campo.estado !== 'pronto') return <span>{campo.estado === 'vazio' ? 'Sem registros' : 'Indisponível'}</span>
  const percentual = campo.unidade === 'percentual'
  const unidade = campo.unidade === 'centavos' ? 'reais' : campo.unidade
  const valor = campo.unidade === 'centavos' ? campo.valor / 100 : campo.valor
  return (
    <NumeroFinanceiro className={className}>
      {formatadores[unidade].format(valor)}
      {percentual && <span className="numero-simbolo">%</span>}
    </NumeroFinanceiro>
  )
}

/** Use em gráficos, textos compostos e outros detalhes que podem revelar valores. */
export function DetalheFinanceiro({ children }: { children: ReactNode }) {
  return useValoresOcultos() ? <span>Valores ocultos</span> : <>{children}</>
}
