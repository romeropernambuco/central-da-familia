import { useSyncExternalStore } from 'react'
import type { Api } from '../api/tipos'
import { observarInvalidacao } from '../lib/invalidacao'

/** Redesenha quem usa quando o recurso (ou qualquer dado da família) é marcado como velho. Devolve a versão atual. */
export function useInvalidacao(api: Api, familia: string, recurso?: string) {
  const { assinar, versao } = observarInvalidacao(api, familia, recurso)
  return useSyncExternalStore(assinar, versao, versao)
}
