import type { Api } from './tipos'

type GravarConferencia = (familia: string, valor: unknown) => Promise<void>
type Observador = (nome: keyof Api, args: readonly unknown[], gravar: GravarConferencia) => Promise<unknown>
const efeitos = new WeakMap<Api, Observador>()

export function observarPosMutacao(api: Api, efeito: Observador) {
  efeitos.set(api, efeito)
}
export function publicarPosMutacao(api: Api, nome: keyof Api, args: readonly unknown[], gravar: GravarConferencia) {
  return efeitos.get(api)?.(nome, args, gravar)
}
