// Escolhe o banco: exemplo em memória (só nos builds de exemplo e demo) ou Supabase de verdade.
// Portão 6: o build de produção não pode carregar nem conter a família de exemplo.
// import.meta.env.MODE vira texto fixo no build; em produção a condição é falsa e o import some do pacote.
import type { Api } from './tipos'

export const modoExemplo: boolean = import.meta.env.MODE === 'exemplo' || import.meta.env.MODE === 'demo'

let real: Api | null = null

export async function carregarApi(): Promise<Api> {
  if (import.meta.env.MODE === 'exemplo' || import.meta.env.MODE === 'demo') return (await import('./exemplo')).apiExemplo
  if (!real) real = (await import('./real')).apiReal
  return real
}

export type { Api } from './tipos'
