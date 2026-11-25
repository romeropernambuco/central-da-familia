import type { ReactNode } from 'react'
import { enderecoDestino, type DestinoResumo } from '../app/destinos'
import type { NomeIcone } from './Icone'
import { SetaDoMes } from './SetaDoMes'
import type { AtalhoInicio, HorizonteInicio } from './InicioNovo'

type Referencia = { chave: string; titulo: string; destino: DestinoResumo; legenda?: string }
type Ler = (chave: string, tamanho?: 'principal' | 'secundario') => ReactNode

/**
 * Arruma os números do Início novo em "jeitos de olhar" (Hoje, Este mês, 2029) e em atalhos da família.
 * Não faz conta nenhuma: recebe as referências já prontas do Início e só decide onde cada uma aparece.
 */
export function montarInicioNovo(a: {
  chips: readonly Referencia[]
  /** o número principal de cada referência do topo (pode gastar hoje, plano, aplicado, faturas) */
  lerChip: Ler
  /** o número de cada rotina (resta no mês, rendeu hoje, quantas faturas, aluguel) */
  lerRotina: Ler
  visivel: (chave: string) => boolean
  casal: boolean
  sobreHoje: ReactNode
  /** quanto do combinado do mês já foi: os dois números prontos e a fração; nulo quando não dá para mostrar */
  mes: { gasto: ReactNode; teto: ReactNode; fracao: number } | null
  destinoImoveis: DestinoResumo
}): { horizontes: HorizonteInicio[]; atalhos: AtalhoInicio[] } {
  const chip = (chave: string) => a.chips.find(c => c.chave === chave)
  const hoje = chip('podeGastarHoje'),
    plano = chip('plano2029'),
    aplicado = chip('aplicacoes'),
    faturas = chip('faturas')
  const horizontes: HorizonteInicio[] = []
  if (hoje && a.visivel(hoje.chave)) {
    const href = enderecoDestino(hoje.destino)
    horizontes.push({
      chave: 'podeGastarHoje',
      aba: 'Hoje',
      rotulo: hoje.titulo,
      numero: a.lerChip('podeGastarHoje', 'principal'),
      apoio: (
        <>
          {hoje.legenda && <p>{hoje.legenda}</p>}
          {a.sobreHoje}
        </>
      ),
      href,
      abrir: 'Abrir meu orçamento',
    })
    horizontes.push({
      chave: 'mes',
      aba: 'Este mês',
      rotulo: 'Resta no mês',
      numero: a.lerRotina('podeGastarHoje', 'principal'),
      barra: a.mes?.fracao ?? null,
      apoio: (
        <>
          {a.mes && (
            <p>
              Já saiu {a.mes.gasto} de {a.mes.teto}.
            </p>
          )}
          {a.casal && <SetaDoMes />}
        </>
      ),
      href,
      abrir: 'Abrir meu orçamento',
    })
  }
  if (a.casal && plano && a.visivel(plano.chave))
    horizontes.push({
      chave: 'plano2029',
      aba: '2029',
      rotulo: 'Plano 2029',
      numero: a.lerChip('plano2029', 'principal'),
      apoio: (
        <>
          {plano.legenda && <p>{plano.legenda}.</p>}
          <p>A trilha até 2029 está mais abaixo, depois do Escritório.</p>
        </>
      ),
      href: enderecoDestino(plano.destino),
      abrir: 'Abrir Plano 2029',
    })
  const atalhos: AtalhoInicio[] = []
  const atalho = (chave: string, titulo: string, icone: NomeIcone, destino: DestinoResumo, legenda: ReactNode) =>
    a.visivel(chave) && atalhos.push({ chave, titulo, icone, href: enderecoDestino(destino), numero: null, legenda })
  if (aplicado)
    atalho('aplicacoes', aplicado.titulo, 'guardado', aplicado.destino, <>Rendeu hoje {a.lerRotina('aplicacoes')}</>)
  if (faturas)
    atalho('faturas', faturas.titulo, 'cartoes', faturas.destino, <>{a.lerRotina('faturas')} para pagar ou conferir</>)
  atalho('imoveis', 'Aluguel do mês', 'imovel', a.destinoImoveis, 'Sem imposto')
  for (const x of atalhos)
    x.numero = x.chave === 'imoveis' ? a.lerRotina('imoveis', 'secundario') : a.lerChip(x.chave, 'secundario')
  return { horizontes, atalhos }
}
