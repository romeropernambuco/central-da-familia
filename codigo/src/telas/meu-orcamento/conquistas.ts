import type { NivelMedalha } from '../../componentes/VidaDoOrcamento'
import { reais } from '../../lib/formato'

export type Conquista = { nome: string; ok: boolean; nivel: NivelMedalha; falta: string }

/**
 * As 4 conquistas do mês (24/11/2026: a que falta diz quanto falta, no lugar de só "Ainda não").
 * Mesmas conquistas e mesmas regras de antes; só ganhou a frase do que falta.
 */
export function conquistasDoMes({
  temGasto,
  dentro,
  sobra,
  seguidos,
}: {
  /** já anotou alguma compra no mês */
  temGasto: boolean
  /** dias fechados dentro do valor do dia */
  dentro: number
  /** sobra anotada (reais) */
  sobra: number
  /** dos 3 últimos dias do mês, quantos foram anotados */
  seguidos: number
}): Conquista[] {
  return [
    { nome: '1º gasto anotado', ok: temGasto, nivel: 'bronze', falta: 'Ainda não: falta anotar a primeira compra' },
    {
      nome: '7 dias dentro do valor do dia',
      ok: dentro >= 7,
      nivel: 'ouro',
      falta: `Ainda não: ${Math.min(dentro, 6)} de 7 dias até agora`,
    },
    {
      nome: 'Sobra anotada passou de R$ 100',
      ok: sobra >= 100,
      nivel: 'ouro',
      falta: `Ainda não: faltam ${reais(Math.max(0, 100 - Math.max(0, sobra)))}`,
    },
    {
      nome: '3 dias seguidos anotados',
      ok: seguidos >= 3,
      nivel: 'prata',
      falta: `Ainda não: ${Math.min(seguidos, 2)} de 3 dias até agora`,
    },
  ]
}

/** Iniciais que não se repetem: Bruno e Bia viram "Br" e "Bi"; quem tem a letra sozinho fica com 1 letra. */
export function iniciaisDistintas(nomes: string[]): string[] {
  const primeira = (n: string) => (n || '?').trim().charAt(0).toUpperCase()
  return nomes.map(n => {
    const p = primeira(n)
    const repete = nomes.filter(o => primeira(o) === p).length > 1
    return repete ? p + (n || '').trim().charAt(1).toLowerCase() : p
  })
}
