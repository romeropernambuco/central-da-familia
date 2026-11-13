// Arruma as respostas do banco no formato que as telas usam. Sem Supabase aqui: dá pra testar sozinho.
import type { CasaDaEquipe, CupomLido, Lancamento, NovoLancamento, ResumoHoje } from './tipos'
import { hojeRecife } from '../lib/formato'
import { funcaoNaoExiste } from './erros'

const num = (v: unknown) => Number(v) || 0

export function normalizaResumo(r: any): ResumoHoje {
  return {
    pode_gastar_hoje: num(r?.pode_gastar_hoje),
    livre_mes: num(r?.livre_mes),
    colchao: num(r?.colchao),
    dias_restantes: num(r?.dias_restantes),
    // equipe da casa: o banco manda {so_nomes: true} e só id, nome, regra e casa de cada envelope (nenhum número)
    ...(r?.so_nomes ? { so_nomes: true } : {}),
    envelopes: (r?.envelopes || []).map((e: any) => ({
      ...e, limite_mes: num(e.limite_mes), gasto_mes: num(e.gasto_mes), livre: num(e.livre),
      limite_base: e.limite_base == null ? undefined : num(e.limite_base),
      colchao_meta: e.colchao_meta == null ? undefined : num(e.colchao_meta),
      // por dia: o banco manda valor_dia (o dia inteiro) e hoje (o dia menos o que já saiu hoje). O app mostra o que ainda pode.
      valor_dia: e.regra === 'diario' ? (e.hoje != null ? num(e.hoje) : e.valor_dia != null ? num(e.valor_dia) : undefined) : undefined,
      valor_dia_inteiro: e.regra === 'diario' && e.valor_dia != null ? num(e.valor_dia) : undefined,
      teto_semana: e.teto_semana == null ? undefined : num(e.teto_semana),
      gasto_semana: e.gasto_semana == null ? undefined : num(e.gasto_semana),
    })),
    explicacao: (r?.explicacao || []).map((x: any) => ({ linha: String(x.linha), valor: num(x.valor) })),
  }
}

export function normalizaCasa(r: any): CasaDaEquipe {
  return {
    hoje: r?.hoje || hojeRecife(), eu: r?.eu ?? null,
    lista: (r?.lista || []).map((i: any) => ({ id: String(i.id), nome: String(i.nome || ''), ok: !!i.ok })),
    comprado: (r?.comprado || []).map((c: any) => ({ data: String(c.data), nome: String(c.nome) })),
    prestadores: (r?.prestadores || []).map((p: any) => ({ id: String(p.id), nome: String(p.nome || ''), servico: String(p.servico || ''), dia: Number(p.dia) || 0, proxima_visita: String(p.proxima_visita), ultima_vez: p.ultima_vez || null })),
    gas: { trocas: r?.gas?.trocas || [], media_dias: r?.gas?.media_dias ?? null, proxima_troca: r?.gas?.proxima_troca ?? null, avisar_em: r?.gas?.avisar_em ?? null },
    presenca: { hoje: r?.presenca?.hoje || [], meu_ponto: r?.presenca?.meu_ponto || {} },
  }
}

/** Lançamento que volta do banco. Pra equipe ele vem sem `valor` (e sem cartão): fica 0 e a tela da equipe nunca mostra. */
export function normalizaLancamento(l: any): Lancamento {
  return { id: String(l?.id), envelope_id: l?.envelope_id, cartao_id: l?.cartao_id ?? null, valor: num(l?.valor), data: String(l?.data || ''), descricao: l?.descricao ?? null, apagado_em: l?.apagado_em ?? null, criado_em: String(l?.criado_em || ''), ...(Number(l?.parcelas) > 1 ? { parcelas: Number(l.parcelas) } : {}) }
}

export function normalizaCupom(j: any): CupomLido {
  return {
    itens: (j?.itens || []).map((i: any) => ({ nome: String(i.nome || 'Item'), valor: num(i.valor), qtd: i.qtd ?? null })),
    total: num(j?.total), data: j?.data || null, loja: j?.loja || null, aviso: j?.aviso,
    soma_dos_itens: j?.soma_dos_itens == null ? undefined : num(j.soma_dos_itens),
    total_confere: typeof j?.total_confere === 'boolean' ? j.total_confere : undefined,
  }
}

export type RpcCru = (nome: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>

/**
 * Lançar com a chave do toque. Funciona antes e depois de o dono rodar o SQL pendente:
 * 1º produto.lancar_com_chave; se o banco não tiver essa função, produto.lancar com o parâmetro `chave` (bloco 5).
 * Nunca cai pro lançar sem chave: aí a repetição depois de 10 s voltaria a gravar em dobro.
 */
export async function lancarComChave(rpc: RpcCru, n: NovoLancamento): Promise<{ data: unknown; error: { message?: string; code?: string } | null }> {
  const args = { familia: n.familia, envelope: n.envelope, valor: n.valor, chave: n.chave, data: n.data, descricao: n.descricao || null, cartao: n.cartao || null, segundos: n.segundos ?? null }
  const r = await rpc('lancar_com_chave', args)
  if (r.error && funcaoNaoExiste(r.error)) return rpc('lancar', args)
  return r
}
