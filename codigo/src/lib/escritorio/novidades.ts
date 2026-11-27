// O que é novidade no escritório desde a última visita neste aparelho: tarefa que chegou e entrega que mudou.
// O aparelho guarda só marcas embaralhadas (nunca o texto da tarefa nem valor) e só para a família que está aberta.

/** O mínimo que a conta precisa de cada tarefa e de cada posto. */
export interface FonteDeNovidades {
  fila: { membro: { id: string }; pergunta: { id: string } }[]
  postos: { membro: { id: string }; entrega?: { resumo: string } }[]
}

/** Marca curta e sem volta: o texto que entra não dá para ler de volta no aparelho. */
export function marca(texto: string): string {
  let a = 5381,
    b = 52711
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i)
    a = (a * 33) ^ c
    b = (b * 33) ^ c
  }
  return ((a >>> 0) * 4096 + (b >>> 0)).toString(36)
}

/** As marcas de cada funcionário: uma por tarefa que espera você e uma pela entrega que ele mostra agora. */
export function marcasDoEscritorio({ fila, postos }: FonteDeNovidades): Record<string, string[]> {
  const marcas: Record<string, string[]> = {}
  for (const t of fila) (marcas[t.membro.id] ||= []).push(marcaDaTarefa(t.pergunta.id))
  for (const { membro, entrega } of postos)
    if (entrega?.resumo.trim()) (marcas[membro.id] ||= []).push(marca(`entrega:${membro.id}:${entrega.resumo.trim()}`))
  return marcas
}

export const marcaDaTarefa = (id: string) => marca(`tarefa:${id}`)

/** As marcas que o aparelho ainda não viu. Na primeira visita (nada guardado) nada é novidade. */
export function marcasNovas(marcas: Record<string, string[]>, vistas: readonly string[] | null): Set<string> {
  if (!vistas) return new Set()
  const ja = new Set(vistas)
  return new Set(
    Object.values(marcas)
      .flat()
      .filter(m => !ja.has(m)),
  )
}

const chave = (familia: string) => `escritorio_visto:${familia}`

export function lerVistas(familia: string): string[] | null {
  try {
    const lista: unknown = JSON.parse(localStorage.getItem(chave(familia)) || 'null')
    return Array.isArray(lista) ? lista.filter((m): m is string => typeof m === 'string') : null
  } catch {
    return null
  }
}

export function guardarVistas(familia: string, vistas: Iterable<string>) {
  try {
    localStorage.setItem(chave(familia), JSON.stringify([...new Set(vistas)].slice(0, 400)))
  } catch {
    /* aparelho sem lugar para guardar: a marca "Novo" só não aparece na próxima visita */
  }
}
