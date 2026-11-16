import type { Papel, PerguntaEsc } from '../../api/tipos'
import { textoDeAgente } from '../textoAgente'
import { tempoRecife } from './tempo'
import type { TipoInsight } from './tipos'

export const DONOS_INSIGHTS = {
  fatura_vencendo: 'cartao', fatura_divergente: 'cartao', parcelas: 'cartao',
  reserva: 'colchao', recebimento: 'tesoureiro', aplicacao: 'guardado',
  feira_nota: 'fiscal', objetivo: 'tesoureiro', contrato_imovel: 'imoveis',
} as const satisfies Record<TipoInsight, string>
/** Perguntas do banco preservam o funcionário autorizado pelo endpoint. */
export function donoDoInsight(i: Pick<PerguntaEsc, 'funcionario'> & { tipo?: TipoInsight }): string {
  return i.tipo ? DONOS_INSIGHTS[i.tipo] : i.funcionario
}
/** Conserva a ordem da fila autorizada; pessoa só recebe seus gastos. */
export function primeiraPerguntaGeral(perguntas: readonly PerguntaEsc[], papel: Papel, agora: unknown,
  oculto: boolean, bloqueadas: ReadonlyMap<string, unknown> = new Map()) {
  const t = tempoRecife(agora)
  if (!t || papel === 'equipe') return null
  const p = perguntas.find(p => !bloqueadas.has(p.id)
    && (papel === 'casal' || p.funcionario === 'contador' && p.id.startsWith('lancou:'))
    && (!(t.hora >= 22 || t.hora < 7) || p.vence_em === t.dia))
  if (!p) return null
  const fala = (s: string) => textoDeAgente(s, p.trechosPrivados || [], oculto)
  return { dono: donoDoInsight(p), pergunta: { ...p, pergunta: fala(p.pergunta), contexto: fala(p.contexto),
    assunto: p.assunto ? fala(p.assunto) : p.assunto,
    partes: p.partes ? { vi: fala(p.partes.vi), importa: fala(p.partes.importa), sugiro: fala(p.partes.sugiro) } : undefined,
    opcoes: p.opcoes.map(o => ({ ...o, rotulo: fala(o.rotulo) })) } }
}
export const FALA_ANALISTA = 'Aqui acompanho os indicadores de uso do app.'
