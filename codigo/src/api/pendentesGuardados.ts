import type { NovoLancamento } from './tipos'

/**
 * Gasto anotado sem internet fica guardado NESTE aparelho até o banco confirmar.
 * Sem isso, fechar ou recarregar o app perdia o lançamento que ainda estava na fila.
 *
 * Regras:
 * - cada item leva o dono (sessão, família, membro): outra pessoa no mesmo aparelho não reenvia o que não é dela;
 * - a `chave` do lançamento garante que reenviar nunca grava 2 vezes;
 * - sair da conta ou a sessão cair NÃO apaga o item: ele é reenviado quando o mesmo dono entrar de novo;
 * - se o banco recusar de vez um reenvio feito sozinho pelo app, o item fica marcado como recusado, com o motivo,
 *   para a pessoa ver e decidir (tentar de novo ou descartar). Nada some em silêncio.
 */
const CHAVE = 'envios_pendentes'

export interface EnvioGuardado {
  dono: string
  dados: NovoLancamento
  /** Motivo da recusa definitiva num reenvio automático. Com ele, o app não tenta de novo sozinho. */
  erro?: string
}

const ouvintes = new Set<() => void>()
/** Avisa quando a lista guardada muda (a faixa de pendentes se redesenha). */
export function ouvirGuardados(aviso: () => void) {
  ouvintes.add(aviso)
  return () => {
    ouvintes.delete(aviso)
  }
}

function ler(): EnvioGuardado[] {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE) || '[]')
    if (!Array.isArray(lista)) return []
    return lista.filter(
      item => item && typeof item.dono === 'string' && item.dados && typeof item.dados.chave === 'string',
    )
  } catch {
    return []
  }
}

function gravar(lista: EnvioGuardado[]) {
  try {
    if (lista.length) localStorage.setItem(CHAVE, JSON.stringify(lista))
    else localStorage.removeItem(CHAVE)
  } catch {
    // sem armazenamento neste navegador: a fila segue só na memória
  }
  ouvintes.forEach(aviso => aviso())
}

const semA = (lista: EnvioGuardado[], chave: string) => lista.filter(item => item.dados.chave !== chave)

export function guardarPendente(dono: string, dados: NovoLancamento) {
  gravar([...semA(ler(), dados.chave), { dono, dados }])
}

export function marcarRecusado(dono: string, dados: NovoLancamento, erro: string) {
  gravar([...semA(ler(), dados.chave), { dono, dados, erro }])
}

export function tirarPendente(chave: string) {
  const lista = ler()
  const resto = semA(lista, chave)
  if (resto.length !== lista.length) gravar(resto)
}

/** O que ainda falta enviar deste dono (os recusados ficam de fora: esperam a decisão da pessoa). */
export function pendentesGuardados(dono: string): NovoLancamento[] {
  return ler()
    .filter(item => item.dono === dono && !item.erro)
    .map(item => item.dados)
}

export function recusadosGuardados(dono: string): EnvioGuardado[] {
  return dono ? ler().filter(item => item.dono === dono && !!item.erro) : []
}

let donoAtual = ''
/** Quem está com a sessão aberta neste aparelho ('' = ninguém, ou modo exemplo). */
export function definirDonoDosPendentes(dono: string) {
  if (dono === donoAtual) return
  donoAtual = dono
  ouvintes.forEach(aviso => aviso())
}
export const donoDosPendentes = () => donoAtual
