import type { MouseEvent } from 'react'
import type { NomeIcone } from '../../componentes/Icone'
import type { DadosInicio } from '../dadosExemplo'
import { EscritorioMaquete, type PropsEscritorioMaquete } from '../comuns/EscritorioMaquete'
import { NumeroFinanceiro, Valor } from '../comuns/privacidade'

export const comodos = [
  {
    id: 'caixa',
    nome: 'Escritório',
    area: 'Caixa',
    icone: 'orcamento',
    legenda: 'Saldo em conta',
    ler: (d: DadosInicio) => d.saldoConta,
  },
  {
    id: 'casa',
    nome: 'Cozinha',
    area: 'Casa',
    icone: 'casa',
    legenda: 'Itens em falta',
    ler: (d: DadosInicio) => d.casa.itensEmFalta,
  },
  {
    id: 'cartoes',
    nome: 'Carteira',
    area: 'Cartões',
    icone: 'cartoes',
    legenda: 'Próximas faturas',
    ler: (d: DadosInicio) => d.faturas.total,
  },
  {
    id: 'patrimonio',
    nome: 'Cofre',
    area: 'Patrimônio',
    icone: 'guardado',
    legenda: 'Em aplicações',
    ler: (d: DadosInicio) => d.aplicacoes.total,
  },
] as const satisfies readonly {
  id: PropsEscritorioMaquete['salaDestacada']
  nome: string
  area: string
  icone: NomeIcone
  legenda: string
  ler: (d: DadosInicio) => Parameters<typeof Valor>[0]['campo']
}[]

export type Comodo = (typeof comodos)[number]['id']

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function ValorPlaca({ campo }: { campo: ReturnType<(typeof comodos)[number]['ler']> }) {
  if (campo.estado !== 'pronto' || campo.unidade !== 'reais') return <Valor campo={campo} className="cv-placa-valor" />
  return (
    <NumeroFinanceiro className="cv-placa-valor">
      {moeda.formatToParts(campo.valor).map(({ type, value }, i) =>
        type === 'currency' ? (
          <span className="numero-simbolo" key={i}>
            {value}
          </span>
        ) : (
          value
        ),
      )}
    </NumeroFinanceiro>
  )
}

export function Cena({
  dados,
  foco,
  plaquinhas,
  aoTocar,
}: {
  dados: DadosInicio
  foco?: Comodo
  plaquinhas?: boolean
  aoTocar?: (sala: Comodo) => void
}) {
  const funcionarios =
    foco && dados.funcionarios.estado === 'pronto'
      ? { ...dados.funcionarios, valor: dados.funcionarios.valor.filter(p => p.sala === foco) }
      : dados.funcionarios
  function tocar(evento: MouseEvent) {
    if (!(evento.target instanceof Element)) return
    const id = evento.target.closest('[data-sala]')?.getAttribute('data-sala')
    const sala = comodos.find(c => c.id === id)
    if (sala) aoTocar?.(sala.id)
  }
  return (
    <div
      className="casa-viva-cena"
      data-interativa={!!aoTocar}
      aria-hidden="true"
      onClick={aoTocar ? tocar : undefined}
    >
      <EscritorioMaquete
        funcionarios={funcionarios}
        salaDestacada={foco}
        mostrarPlaquinhas={plaquinhas}
        variante="media"
      />
    </div>
  )
}
