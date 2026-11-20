import { useState, type SetStateAction } from 'react'
import { useApp } from './contexto'
import { rascunhos } from './rascunhos'
export function useRascunho<T>(
  chave: string,
  inicial: T | (() => T),
): [T, ((v: SetStateAction<T>) => void) & { limpar: () => void }] {
  const ctx = useApp()
  const k = chave + ':' + ctx?.sessao?.userId + ':' + ctx?.familia?.id
  const [v, setV] = useState<T>(() =>
    rascunhos.has(k) ? (rascunhos.get(k) as T) : typeof inicial === 'function' ? (inicial as () => T)() : inicial,
  )
  return [
    v,
    Object.assign(
      (novo: SetStateAction<T>) =>
        setV(antes => {
          const n = typeof novo === 'function' ? (novo as (a: T) => T)(antes) : novo
          rascunhos.set(k, n)
          return n
        }),
      {
        limpar: () => {
          rascunhos.delete(k)
        },
      },
    ),
  ]
}
