/** A normalização tolerante continua atendendo às telas. O resumo consegue saber
 * se havia campos obrigatórios na resposta original, antes de virarem zero. */
const contratos = new WeakMap<object, string[]>()
export function registrarContrato<T extends object>(normalizado: T, bruto: unknown, campos: string[], numericos: string[] = []): T {
  const r = bruto as Record<string, unknown> | null
  const numeroValido = (v: unknown) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v))
  contratos.set(normalizado, [
    ...campos.filter(c => r?.[c] == null),
    ...numericos.filter(c => !numeroValido(r?.[c])),
  ])
  return normalizado
}
export function camposAusentes(dado: object): string[] { return contratos.get(dado) || [] }
/** Cada consumidor mantém a mesma liberdade de ordenar/editar sua cópia que tinha
 * com a API sem cache; a cópia conserva a evidência do contrato original. */
export function copiarLeitura<T>(dado: T): T {
  const copia = structuredClone(dado)
  const transferir = (de: any, para: any) => {
    if (!de || typeof de !== 'object' || !para || typeof para !== 'object') return
    if (contratos.has(de)) contratos.set(para, [...contratos.get(de)!])
    for (const chave of Object.keys(de)) transferir(de[chave], para[chave])
  }
  transferir(dado, copia)
  return copia
}
