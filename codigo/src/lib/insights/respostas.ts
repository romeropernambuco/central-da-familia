import type { Api } from '../../api/tipos'
import type { Insight, EventoInsight } from './tipos'
import { amanhaDeManha, diaValido, tempoRecife } from './tempo'

export interface DestinosInsights {
  navegar: (hash: string) => void
  composicao: (acao: Extract<Insight['acao'], { tipo: 'composicao' }>) => void
  nota: (feira: string) => void
}
/** Adaptador de ações, chamado SOMENTE pelo responder do usuário. Nunca usa escritorioResponder
 * com IDs locais. Confere a opção, o papel, o modo e a autoria novamente na hora do toque. */
export async function executarResposta(api: Api, familia: string, papel: string, i: Insight, opcao: string,
  dados: Record<string, unknown>, agora: unknown, destinos: DestinosInsights): Promise<EventoInsight | false> {
  const t = tempoRecife(agora)
  if (!t || i.exemplo !== (api.modo === 'exemplo') || !i.opcoes.some(o => o.id === opcao) ||
    !(papel === 'casal' || papel === 'equipe' && i.rota === 'casa' && i.tipo === 'feira_nota')) return false
  if (opcao === 'depois') return { tipo: 'depois', ate: amanhaDeManha(t.dia) }
  if (opcao === 'resolvido') return { tipo: 'resolvido' }
  const a = i.acao
  if (opcao === 'composicao') {
    if (a.tipo === 'composicao') destinos.composicao(a)
    else return false // o hook substitui pela composição do snapshot atual ao responder a cobrança
    return { tipo: 'visto' }
  }
  if (a.tipo === 'informar_pagamento' && (opcao === 'paguei_hoje' || opcao === 'paguei_data')) {
    const dia = opcao === 'paguei_hoje' ? t.dia : dados.data
    if (!diaValido(dia) || dia > t.dia) throw new Error('Escolha um dia de pagamento até hoje.')
    await api.faturaInformar(familia, a.cartaoId, a.mes, { paga_em: dia })
    return { tipo: 'resolvido' }
  }
  if (a.tipo === 'recebimento') {
    if (opcao === 'abrir') { destinos.navegar('#/planejamento'); return { tipo: 'visto' } }
    if (!a.meu || !api.recebimentoMudar) return false
    if (!diaValido(dados.data)) throw new Error('Escolha uma data válida.')
    if (opcao === 'recebido') {
      if (dados.data > t.dia || !Number.isSafeInteger(a.valor) || a.valor! <= 0) throw new Error('Confira a data e o valor no Planejamento.')
      await api.recebimentoMudar(familia, a.id, { recebido_em: dados.data, valor_recebido: a.valor! / 100 })
    } else if (opcao === 'reagendar') {
      const mes = dados.data.slice(0, 7)
      if (mes <= t.dia.slice(0, 7)) throw new Error('Escolha um mês depois do mês atual.')
      await api.recebimentoMudar(familia, a.id, { mes_novo: mes })
    } else return false
    return { tipo: 'resolvido' }
  }
  if (a.tipo === 'feira') {
    if (opcao === 'abrir') { destinos.nota(a.id); return { tipo: 'visto' } }
    if (opcao !== 'sem_nota') return false
    if (typeof dados.texto !== 'string' || !dados.texto.trim()) throw new Error('Explique por que não houve nota.')
    await api.feiraSemNota(familia, a.id, dados.texto.trim().slice(0, 80))
    return { tipo: 'resolvido' }
  }
  if (a.tipo === 'atalho' && opcao === 'abrir') { destinos.navegar(a.destino); return { tipo: 'visto' } }
  return false
}
