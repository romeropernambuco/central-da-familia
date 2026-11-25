// Uma comparação inteira cabe num link (#/trocar?c=...). É assim que uma pesquisa pronta (preço da loja, anúncios do
// usado, regras do cartão) chega ao app sem servidor: a pessoa abre o link, confere e guarda.
import { lerTroca } from './ler'
import type { Troca } from './tipos'

/** Limite para não tentar ler um endereço absurdo. */
const TAMANHO_MAXIMO = 60_000

const paraBase64Url = (bytes: Uint8Array) => {
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const deBase64Url = (s: string) => {
  const binario = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binario, c => c.charCodeAt(0))
}

/** O trecho que vai depois de "#/trocar?". */
export function trocaParaLink(t: Troca): string {
  return 'c=' + paraBase64Url(new TextEncoder().encode(JSON.stringify(t)))
}

/** Lê a comparação que veio no endereço. Qualquer coisa fora do formato devolve null. */
export function trocaDoLink(hash: string): Troca | null {
  const m = /^#\/?trocar\?(.*)$/.exec(hash || '')
  const c = m ? new URLSearchParams(m[1]).get('c') : null
  if (!c || c.length > TAMANHO_MAXIMO || !/^[\w-]+$/.test(c)) return null
  try {
    return lerTroca(JSON.parse(new TextDecoder().decode(deBase64Url(c))))
  } catch {
    // link cortado ou adulterado: é "sem comparação", igual a não ter vindo nada
    return null
  }
}
