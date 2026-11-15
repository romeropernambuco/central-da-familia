import type { Api, FamiliaMinha } from '../../api/tipos'
import type { Rota } from '../../app/rotas'
import { hojeRecife } from '../../lib/formato'

export type Indicador = { nome: string; texto: string; valor?: never } | { nome: string; valor: number; texto?: never }
const quantidade = (nome: string, valor: number): Indicador => ({ nome, texto: String(valor) })

/** Mesmas leituras das abas, sem escrita e sem manter uma segunda conta financeira. */
export async function numerosDaAba(api: Api, familia: FamiliaMinha, rota: Rota): Promise<Indicador[]> {
  const id = familia.id
  switch (rota) {
    case 'inicio': {
      const r = await api.resumoHoje(id)
      return [{ nome: 'Pode gastar hoje', valor: r.pode_gastar_hoje }, { nome: 'Livre no mês', valor: r.livre_mes }]
    }
    case 'orcamento': {
      const r = await api.resumoHoje(id)
      const e = r.envelopes.find(e => e.id === familia.envelopeId)
      if (!e) throw new Error('Orçamento pessoal indisponível')
      return [{ nome: 'Limite do mês', valor: e.limite_mes }, { nome: 'Gasto no mês', valor: e.gasto_mes }, { nome: 'Livre', valor: e.livre }]
    }
    case 'lancamentos': {
      const linhas = (await api.lancamentos(id, hojeRecife().slice(0, 7))).filter(l => !l.apagado_em)
      return [quantidade('Lançamentos ativos no mês', linhas.length), { nome: 'Total anotado no mês', valor: linhas.reduce((s, l) => s + l.valor, 0) }]
    }
    case 'cartoes': {
      const [cartoes, faturas] = await Promise.all([api.cartoes(id), api.faturas(id, 1)])
      return [quantidade('Cartões cadastrados', cartoes.length), { nome: 'Faturas consultadas (1 mês)', valor: faturas.reduce((s, f) => s + f.total, 0) }]
    }
    case 'casa': {
      const e = await api.estoque(id)
      return [quantidade('Itens ativos no estoque', e.itens.filter(i => i.ativo).length), quantidade('Contagens registradas', e.contagens.length)]
    }
    case 'guardado': {
      const g = await api.guardadoHoje(id)
      return [{ nome: 'Total guardado', valor: g.total }, { nome: 'Rendimento líquido hoje', valor: g.rendeu_hoje_liquido }]
    }
    case 'planejamento': {
      if (!api.recebimentos) throw new Error('Recebimentos indisponíveis')
      const abertos = (await api.recebimentos(id)).filter(r => !r.recebido_em)
      return [quantidade('Recebimentos previstos em aberto', abertos.length), { nome: 'Total previsto (todos os meses)', valor: abertos.reduce((s, r) => s + r.valor, 0) }]
    }
    case 'desejos': {
      if (!api.desejos) throw new Error('Desejos indisponíveis')
      const d = await api.desejos(id)
      return [quantidade('Desejos pensando', d.filter(x => x.situacao === 'pensando').length), quantidade('Desejos combinados', d.filter(x => x.situacao === 'combinado').length)]
    }
    case 'painel': return (await api.numerosSemana()).map(n => ({ nome: n.nome, texto: n.texto }))
    case 'ajustes': return [quantidade('Membros cadastrados', (await api.membros(id)).length)]
    case 'privacidade': {
      const membros = await api.membros(id)
      return [quantidade('Adultos responsáveis pela família', membros.filter(m => m.papel === 'casal').length)]
    }
    case 'escritorio': {
      const e = await api.escritorioHoje(id)
      return [quantidade('Perguntas pendentes', e.precisa_total ?? e.precisa_de_voce.length), quantidade('Entregas', e.entregue.length)]
    }
    default: throw new Error('Esta tela não tem indicadores')
  }
}

/** Um resultado ausente usa exclusivamente o provedor local de exemplo do app. */
export async function numerosExemplo(rota: Rota): Promise<Indicador[]> {
  const { apiExemplo } = await import('../../api/exemplo')
  const sessao = await apiExemplo.sessao()
  const familia = sessao?.familias[0]
  if (!familia) throw new Error('Exemplo indisponível')
  return numerosDaAba(apiExemplo, familia, rota)
}
