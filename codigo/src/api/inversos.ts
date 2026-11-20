import type { Api } from './tipos'
import { igual } from '../lib/mescla'

/**
 * Desfazer no banco real, sem função nova no banco: cada ação aqui volta usando a própria API.
 * Regra: lê o "antes" ANTES de gravar; ao desfazer, relê e só volta se o dado ainda estiver como esta ação deixou.
 * Fica de fora o que não tem volta segura: apagar (receita, lembrete, imóvel), encerrar aplicação, concluir lembrete,
 * convites, reajuste, respostas do Escritório, feira e contagem; e os limites do mês, que a tela grava vários de uma vez
 * (desfazer só o último enganaria).
 */
const MUDOU = 'Isso mudou depois; confira antes de desfazer'
const so = <T extends object>(o: T, campos: readonly (keyof T)[]) => Object.fromEntries(campos.map(c => [c, o[c] ?? null]))

export async function prepararInverso(api: Api, prop: string, args: any[]): Promise<(() => Promise<void>) | undefined> {
  const [familia, id, dados] = args
  if (prop === 'restaurarLancamento') return () => api.apagarLancamento(familia)

  if (prop === 'recebimentoMudar' && api.recebimentos && !dados?.apagar) {
    const antes = (await api.recebimentos(familia)).find(x => x.id === id)
    if (!antes) return
    const volta: Record<string, unknown> = {}, tocados: ('recebido_em' | 'valor_recebido' | 'mes_novo' | 'certo')[] = []
    if (dados.recebido_em !== undefined) { volta.recebido_em = antes.recebido_em; volta.valor_recebido = antes.valor_recebido; tocados.push('recebido_em') }
    if (dados.mes_novo !== undefined) { volta.mes_novo = antes.mes_novo; tocados.push('mes_novo') }
    if (dados.certo !== undefined) { volta.certo = antes.certo; tocados.push('certo') }
    if (!tocados.length) return
    return async () => {
      const agora = (await api.recebimentos!(familia)).find(x => x.id === id)
      if (!agora || !igual(so(agora, tocados), so({ ...antes, ...dados }, tocados))) throw new Error(MUDOU)
      await api.recebimentoMudar!(familia, id, volta)
    }
  }

  if (prop === 'faturaInformar') {
    const mes = dados as string, d = args[3] as { valor_banco?: number | null; paga_em?: string | null }
    const achar = async () => (await api.faturasBanco(familia)).find(x => x.cartao_id === id && x.mes.slice(0, 7) === mes.slice(0, 7))
    const antes = await achar()
    const volta: { valor_banco?: number; paga_em?: string | null } = {}
    if (d.valor_banco != null) {
      // o banco não sabe "tirar" o valor informado: sem valor anterior, esta ação não tem volta
      if (antes?.valor_banco == null) return
      volta.valor_banco = antes.valor_banco
    }
    if (d.paga_em !== undefined) volta.paga_em = antes?.paga_em ?? null
    if (!Object.keys(volta).length) return
    return async () => {
      const agora = await achar()
      if (d.valor_banco != null && agora?.valor_banco !== d.valor_banco) throw new Error(MUDOU)
      if (d.paga_em !== undefined && (agora?.paga_em ?? null) !== (d.paga_em ?? null)) throw new Error(MUDOU)
      await api.faturaInformar(familia, id, mes, volta)
    }
  }

  if (prop === 'cartaoSalvar' && id?.id) {
    const antes = (await api.cartoes(familia)).find(x => x.id === id.id)
    if (!antes) return
    const campos = Object.keys(id) as (keyof typeof antes)[]
    return async () => {
      const agora = (await api.cartoes(familia)).find(x => x.id === antes.id)
      if (!agora || !igual(so(agora, campos), so({ ...antes, ...id }, campos))) throw new Error(MUDOU)
      await api.cartaoSalvar(familia, antes)
    }
  }

  if (prop === 'lembreteAdiar') {
    const antes = (await api.lembretes(familia)).find(x => x.id === id)
    if (!antes || antes.feito_em) return
    return async () => {
      const agora = (await api.lembretes(familia)).find(x => x.id === id)
      if (!agora || new Date(agora.quando).getTime() !== new Date(dados).getTime()) throw new Error(MUDOU)
      await api.lembreteAdiar(familia, id, antes.quando)
    }
  }

  if (prop === 'estoqueItemSalvar' && id?.id) {
    const antes = (await api.estoque(familia)).itens.find(x => x.id === id.id)
    if (!antes) return
    return async () => {
      const agora = (await api.estoque(familia)).itens.find(x => x.id === antes.id)
      if (!agora || agora.nome !== id.nome || agora.categoria !== id.categoria || agora.ativo !== (id.ativo ?? antes.ativo)) throw new Error(MUDOU)
      await api.estoqueItemSalvar(familia, antes)
    }
  }
}
