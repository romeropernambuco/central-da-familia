export const rascunhos = new Map<string, unknown>()
export function limparRascunhos(prefixo = '') {
  for (const k of rascunhos.keys()) if (k.startsWith(prefixo)) rascunhos.delete(k)
}
