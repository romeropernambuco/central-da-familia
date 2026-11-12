// Escolhe o banco: exemplo em memória (?exemplo=1 ou VITE_MODO=exemplo) ou Supabase de verdade.
import type { Api } from './tipos'
import { apiExemplo } from './exemplo'

export const modoExemplo: boolean =
  import.meta.env.VITE_MODO === 'exemplo' ||
  (typeof location !== 'undefined' && new URLSearchParams(location.search).has('exemplo'))

let real: Api | null = null

export async function carregarApi(): Promise<Api> {
  if (modoExemplo) return apiExemplo
  if (!real) real = (await import('./real')).apiReal
  return real
}

export type { Api } from './tipos'
