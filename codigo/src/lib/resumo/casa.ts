import type { EscritorioHoje, Estoque, Feira } from '../../api/tipos'
/** Os gatilhos do Escritório decidem se é hora de perguntar pela feira. */
export function situacaoCasa(e: EscritorioHoje, feiras: Feira[], estoque: Estoque, semana: string) {
  if (!Array.isArray(e.precisa_de_voce) || !Array.isArray(feiras) || !Array.isArray(estoque.itens) || !Array.isArray(estoque.contagens)) throw new Error('Casa incompleta')
  const perguntas = e.precisa_de_voce
  const contagem = estoque.contagens.filter(c => c.semana === semana).sort((a, b) => b.data.localeCompare(a.data))[0]
  const ativos = new Set(estoque.itens.filter(i => i.ativo).map(i => i.id))
  return { feira: perguntas.some(p => p.id.startsWith('feira_feita:')),
    nota: feiras.filter(f => !f.tem_nota && !f.sem_nota_motivo).length,
    estoque: ativos.size > 0 && !contagem,
    falta: !contagem && ativos.size > 0 ? null : contagem?.itens.filter(i => ativos.has(i.item_id) && i.estado === 'acabou').length ?? 0,
    tarefa: perguntas.find(p => /^(feira_feita|feira_nota|estoque):/.test(p.id))?.id }
}
