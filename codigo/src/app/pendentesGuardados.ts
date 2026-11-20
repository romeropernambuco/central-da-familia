import type { NovoLancamento } from '../api/tipos'

/**
 * Gasto anotado sem internet fica guardado NESTE aparelho até o banco confirmar.
 * Sem isso, fechar ou recarregar o app perdia o lançamento que ainda estava na fila.
 * Cada item leva o dono (sessão, família, membro): outra pessoa no mesmo aparelho não reenvia o que não é dela.
 * A `chave` do lançamento garante que reenviar nunca grava 2 vezes.
 */
const CHAVE = 'envios_pendentes'
interface Guardado { dono: string; dados: NovoLancamento }

function ler(): Guardado[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) || '[]')
    return Array.isArray(v) ? v.filter(x => x && typeof x.dono === 'string' && x.dados && typeof x.dados.chave === 'string') : []
  } catch { return [] }
}
function gravar(lista: Guardado[]) {
  try { if (lista.length) localStorage.setItem(CHAVE, JSON.stringify(lista)); else localStorage.removeItem(CHAVE) } catch { /* sem armazenamento: a fila segue só na memória */ }
}

export function guardarPendente(dono: string, dados: NovoLancamento) {
  gravar([...ler().filter(x => x.dados.chave !== dados.chave), { dono, dados }])
}
export function tirarPendente(chave: string) {
  const lista = ler(), resto = lista.filter(x => x.dados.chave !== chave)
  if (resto.length !== lista.length) gravar(resto)
}
export function pendentesGuardados(dono: string): NovoLancamento[] {
  return ler().filter(x => x.dono === dono).map(x => x.dados)
}
