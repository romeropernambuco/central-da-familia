// F10 Alerta FGC (ECONOMISTA item 3, F10). Só avisa; não muda onde o dinheiro está.
// R$ 250 mil por CPF e conglomerado; conta conjunta divide o limite pelos titulares;
// aviso quando a soma coberta do CPF passa de R$ 1 milhão. Tesouro Direto (fgc = false) não entra.
import { arred, centavos, Dec } from './decimal'
import type { Aplicacao, Centavos } from './tipos'

export const LIMITE_FGC: Centavos = 25_000_000 // R$ 250.000,00 (regra do FGC, não parâmetro da família)
export const TETO_CPF_FGC: Centavos = 100_000_000 // R$ 1.000.000,00
export const TODOS_OS_BANCOS = 'todos os bancos'

/** Uma conta (sozinha ou conjunta): garantido por titular = min(saldo, 250 mil) ÷ titulares;
 *  fora = max(0, saldo − 250 mil ÷ titulares × titulares). */
export function fgcConta(saldo: Centavos, titulares = 1): { garantido_por_titular: Centavos; fora: Centavos; alerta: boolean } {
  centavos(saldo)
  const t = Number.isInteger(titulares) && titulares >= 1 ? titulares : 1
  const coberto = Math.min(Math.max(saldo, 0), LIMITE_FGC)
  const fora = Math.max(0, saldo - LIMITE_FGC)
  return { garantido_por_titular: arred(new Dec(coberto).div(t)), fora, alerta: fora > 0 }
}

/** Avisos por banco e titular. Aplicações do mesmo titular no mesmo banco somam (parte de cada
 *  titular na conjunta = saldo ÷ titulares, limite da parte = 250 mil ÷ titulares). */
export function avisosFGC(aplicacoes: Aplicacao[]): { banco: string; titular: string | null; fora: Centavos }[] {
  type Grupo = { banco: string; titular: string | null; parte: Dec; limite: Dec }
  const grupos = new Map<string, Grupo>()
  const porTitular = new Map<string, { titular: string | null; coberto: Dec }>()
  for (const ap of aplicacoes) {
    if (!ap.fgc || ap.saldo <= 0) continue
    const t = Number.isInteger(ap.conta_conjunta_titulares) && ap.conta_conjunta_titulares >= 1 ? ap.conta_conjunta_titulares : 1
    const chave = JSON.stringify([ap.banco, ap.titular])
    const g = grupos.get(chave) ?? { banco: ap.banco, titular: ap.titular, parte: new Dec(0), limite: new Dec(0) }
    g.parte = g.parte.plus(centavos(ap.saldo).div(t))
    g.limite = Dec.max(g.limite, new Dec(LIMITE_FGC).div(t))
    grupos.set(chave, g)
  }
  const avisos: { banco: string; titular: string | null; fora: Centavos }[] = []
  for (const g of grupos.values()) {
    const limite = Dec.min(g.limite, LIMITE_FGC)
    const coberto = Dec.min(g.parte, limite)
    const fora = arred(g.parte.minus(coberto))
    if (fora > 0) avisos.push({ banco: g.banco, titular: g.titular, fora })
    const k = JSON.stringify(g.titular)
    const p = porTitular.get(k) ?? { titular: g.titular, coberto: new Dec(0) }
    p.coberto = p.coberto.plus(coberto)
    porTitular.set(k, p)
  }
  for (const p of porTitular.values()) {
    const acima = arred(p.coberto.minus(TETO_CPF_FGC))
    if (acima > 0) avisos.push({ banco: TODOS_OS_BANCOS, titular: p.titular, fora: acima })
  }
  return avisos
}
