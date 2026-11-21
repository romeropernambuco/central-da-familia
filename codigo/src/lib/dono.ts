// E2 (regra nova do dono, 13/11): o orçamento é da família. O casal LÊ tudo, com o nome do dono em cada coisa,
// e cada um ESCREVE só no que é seu e na Casa. A filha só o dela; a equipe só a Casa, sem R$.
// A tela só repete a regra: quem tranca de verdade é o banco (f_01 e f_02). Sem tela aqui: dá pra testar sozinho.
import type { Cartao, Envelope, FamiliaMinha, GuardadoAplicacao, Lancamento } from '../api/tipos'

/** Quem olha pode lançar e mexer neste limite? O banco manda `escreve`; sem o campo, vale o seu e a Casa. */
export function escreveNo(e: Envelope | undefined, f: FamiliaMinha | null): boolean {
  if (!e || !f) return false
  if (e.escreve != null) return e.escreve
  if (f.papel === 'equipe') return !!e.casa
  if (f.papel === 'pessoa') return e.id === f.envelopeId
  return !!e.casa || e.id === f.envelopeId
}

/** Nome do dono do limite; null quando é da família (Casa ou limite do casal sem dono). */
export function donoDo(e: Envelope): string | null {
  if (e.dono !== undefined) return e.dono
  return e.casa ? null : e.nome
}

/** "de Bruno" no que é do outro; vazio no seu e no da família. */
export function rotuloDono(e: Envelope | undefined, f: FamiliaMinha | null): string {
  if (!e || escreveNo(e, f)) return ''
  const d = donoDo(e)
  return d ? `de ${d}` : 'da família'
}

/** Pode corrigir ou apagar este lançamento? Só quem lançou, e só no limite que é seu ou da Casa (o banco também exige o autor). */
export function mexeNoLancamento(l: Lancamento, e: Envelope | undefined, f: FamiliaMinha | null): boolean {
  if (l.parcela) return false
  if (l.meu === false) return false
  return escreveNo(e, f)
}

/** Cartão de quem olha (ou sem titular, que é da família). O do outro: só leitura. */
export function cartaoMeu(c: Cartao, f: FamiliaMinha | null): boolean {
  if (!c.titular_id && !c.titular) return true
  if (f?.membroId && c.titular_id) return c.titular_id === f.membroId
  return c.titular === f?.membroNome
}

/** Aplicação no nome de quem olha ou do casal: dá pra guardar, tirar e encerrar. A do outro: só leitura. */
export function aplicacaoMinha(a: GuardadoAplicacao, f: FamiliaMinha | null): boolean {
  if (!a.titular) return true
  if (f?.membroId) return a.titular === f.membroId
  return a.titular_nome === f?.membroNome
}
