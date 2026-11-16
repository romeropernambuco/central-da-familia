import { useSyncExternalStore } from 'react'
import type { Api } from '../api/tipos'

const lojas = new WeakMap<Api, Map<string, { versao: number; ouvintes: Set<() => void> }>>()
function loja(api: Api, familia: string) {
  let familias = lojas.get(api)
  if (!familias) { familias = new Map(); lojas.set(api, familias) }
  let l = familias.get(familia)
  if (!l) { l = { versao: 0, ouvintes: new Set() }; familias.set(familia, l) }
  return l
}
export function invalidarDados(api: Api, familia: string) {
  const l = loja(api, familia); l.versao++; l.ouvintes.forEach(f => f())
}
export function useInvalidacao(api: Api, familia: string) {
  const l = loja(api, familia)
  return useSyncExternalStore(f => { l.ouvintes.add(f); return () => l.ouvintes.delete(f) }, () => l.versao)
}
