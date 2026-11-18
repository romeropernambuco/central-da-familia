import { useRef } from 'react'
import { Icone, type NomeIcone } from '../../componentes/Icone'
import { NumeroFinanceiro, Valor } from '../comuns/privacidade'
import type { Campo } from '../dadosExemplo'
import type { Dinheiro } from './modelo'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function Quantia({ campo, tamanho }: {
  campo: Dinheiro | Campo<number, 'quantidade'>; tamanho?: 'principal' | 'secundario'
}) {
  if (campo.estado !== 'pronto') return <span className="j-sem-dado">Ainda sem dado</span>
  const classe = tamanho && `numero-${tamanho}`
  if (campo.unidade === 'quantidade') return <Valor campo={campo} className={classe} />
  const partes = moeda.formatToParts(campo.unidade === 'centavos' ? campo.valor / 100 : campo.valor)
  return <NumeroFinanceiro className={classe}>
    {partes.map(({ type, value }, i) => type === 'currency'
      ? <span className="j-moeda" key={i}>{value}</span> : value)}
  </NumeroFinanceiro>
}

export function abrirFoco(alvo?: HTMLElement | null) {
  alvo?.focus({ preventScroll: true })
  alvo?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

const abas = [
  ['inicio', 'Início', 'inicio'], ['orcamento', 'Orçamento', 'orcamento'],
  ['faturas', 'Faturas', 'cartoes'], ['escritorio', 'Escritório', 'escritorio'],
] as const satisfies readonly (readonly [string, string, NomeIcone])[]
const extras = [
  ['aplicacoes', 'Aplicações', 'guardado'], ['imoveis', 'Imóveis', 'imovel'], ['plano', 'Rumo a 2029', 'plano2029'],
] as const satisfies readonly (readonly [string, string, NomeIcone])[]

export type Destino = typeof abas[number][0] | typeof extras[number][0]

export function Navegacao({ atual, navegar }: { atual: Destino; navegar: (destino: Destino) => void }) {
  const mais = useRef<HTMLDetailsElement>(null)
  return <nav className="j-nav" aria-label="Navegação principal">
    {abas.map(([destino, texto, icone]) => <button type="button" key={destino}
      aria-current={atual === destino ? 'location' : undefined} onClick={() => navegar(destino)}>
      <Icone nome={icone} size={18} />{texto}
    </button>)}
    <details ref={mais} onKeyDown={e => {
      if (e.key !== 'Escape' || !mais.current?.open) return
      mais.current.open = false
      mais.current.querySelector('summary')?.focus()
    }}>
      <summary data-ativo={extras.some(([id]) => id === atual)}><Icone nome="mais" size={18} />Mais</summary>
      <div className="j-nav-extras">
        {extras.map(([destino, texto, icone]) => <button type="button" key={destino}
          aria-current={atual === destino ? 'location' : undefined} onClick={() => {
            if (mais.current) mais.current.open = false
            navegar(destino)
          }}><Icone nome={icone} size={18} />{texto}</button>)}
      </div>
    </details>
  </nav>
}
