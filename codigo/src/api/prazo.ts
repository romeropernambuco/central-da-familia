/**
 * Toda requisição ao banco tem prazo. Sem isso, uma rede presa deixava a tela em "Conferindo…" para sempre.
 *
 * O prazo estourado vira a mesma falha de rede que o navegador dá ("Failed to fetch"), então o resto do app
 * trata igual: `traduzErro` transforma em `ErroRede`.
 */
export const PRAZO_PADRAO_MS = 15_000
/** Funções do servidor que leem foto (cupom, nota) demoram mais que uma leitura comum. */
export const PRAZO_DE_FUNCAO_MS = 45_000
/** Envio de arquivo (foto da nota) e operações que mexem na família inteira: rede lenta de celular precisa de folga. */
export const PRAZO_LONGO_MS = 90_000

const OPERACOES_LONGAS = [
  '/storage/',
  '/rpc/exportar_familia',
  '/rpc/exportar_meu',
  '/rpc/apagar_familia',
  '/rpc/backup',
]

type Buscar = typeof fetch

const enderecoDe = (entrada: Parameters<Buscar>[0]) =>
  typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url

export function prazoPara(endereco: string): number {
  if (OPERACOES_LONGAS.some(trecho => endereco.includes(trecho))) return PRAZO_LONGO_MS
  return endereco.includes('/functions/') ? PRAZO_DE_FUNCAO_MS : PRAZO_PADRAO_MS
}

/** Devolve um `fetch` que desiste depois do prazo e respeita o cancelamento pedido por quem chamou. */
export function buscarComPrazo(buscar: Buscar = fetch, prazo: (endereco: string) => number = prazoPara): Buscar {
  return async (entrada, opcoes) => {
    const controle = new AbortController()
    const deQuemChamou = opcoes?.signal
    const cancelarJunto = () => controle.abort()
    if (deQuemChamou?.aborted) controle.abort()
    else deQuemChamou?.addEventListener('abort', cancelarJunto)

    let estourou = false
    const relogio = setTimeout(
      () => {
        estourou = true
        controle.abort()
      },
      prazo(enderecoDe(entrada)),
    )

    try {
      return await buscar(entrada, { ...opcoes, signal: controle.signal })
    } catch (falha) {
      if (estourou) throw new TypeError('Failed to fetch', { cause: falha })
      throw falha
    } finally {
      clearTimeout(relogio)
      deQuemChamou?.removeEventListener('abort', cancelarJunto)
    }
  }
}
