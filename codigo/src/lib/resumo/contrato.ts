/** A normalização tolerante continua atendendo às telas. O resumo consegue saber
 * se havia campos obrigatórios na resposta original, antes de virarem zero. */
const contratos = new WeakMap<object, string[]>()
export function registrarContrato<T extends object>(normalizado: T, bruto: unknown, campos: string[]): T {
  const r = bruto as Record<string, unknown> | null
  contratos.set(normalizado, campos.filter(c => !r || r[c] === undefined || r[c] === null))
  return normalizado
}
export function camposAusentes(dado: object): string[] { return contratos.get(dado) || [] }
/** Cada consumidor mantém a mesma liberdade de ordenar/editar sua cópia que tinha
 * com a API sem cache; a cópia conserva a evidência do contrato original. */
export function copiarLeitura<T>(dado: T): T {
  const copia = structuredClone(dado)
  if (dado && typeof dado === 'object' && copia && typeof copia === 'object' && contratos.has(dado)) contratos.set(copia, [...contratos.get(dado)!])
  return copia
}
