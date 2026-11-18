import type { EscritorioHoje, Estoque, Feira } from '../../api/tipos'
/** Os gatilhos do Escritório decidem se é hora de perguntar pela feira. */
export function situacaoCasa(e: EscritorioHoje, feiras: Feira[], estoque: Estoque, semana: string) {
  if (!Array.isArray(e.precisa_de_voce) || !Array.isArray(feiras) || !Array.isArray(estoque.itens) || !Array.isArray(estoque.contagens)) throw new Error('Casa incompleta')
  const perguntas = e.precisa_de_voce
  const contagem = estoque.contagens.filter(c => c.semana === semana).sort((a, b) => b.data.localeCompare(a.data))[0]
  const ativos = new Set(estoque.itens.filter(i => i.ativo).map(i => i.id))
  const feiraConfirmada = feiras.some(f => f.semana === semana)
  const cobrarFeira = perguntas.some(p => p.id === `feira_feita:${semana}`)
  const cobrarEstoque = perguntas.some(p => p.id === `estoque:${semana}`)
  return { feira: cobrarFeira, estoque: ativos.size > 0 && !contagem,
    estadoFeira: feiraConfirmada ? 'confirmada' as const : 'nao_iniciada' as const,
    cobrarEstoque,
    nota: feiras.filter(f => !f.tem_nota && !f.sem_nota_motivo).length,
    estadoEstoque: !ativos.size ? 'sem_cadastro' as const : contagem ? 'confirmada' as const : 'nao_iniciada' as const,
    falta: contagem ? contagem.itens.filter(i => ativos.has(i.item_id) && i.estado === 'acabou').length : null,
    tarefa: perguntas.find(p => /^(feira_feita|feira_nota|estoque):/.test(p.id))?.id }
}

export function rotulosCasa(c: ReturnType<typeof situacaoCasa>) {
  return {
    feira: c.estadoFeira === 'confirmada' ? 'Feira em dia' : c.feira ? 'Feira ainda sem confirmação · cobrança pendente' : 'Feira: verificação ainda não iniciada',
    estoque: c.estadoEstoque === 'confirmada' ? 'Estoque conferido' : c.estadoEstoque === 'sem_cadastro' ? 'Estoque sem cadastro' : c.cobrarEstoque ? 'Estoque: contagem pendente' : 'Estoque: verificação ainda não iniciada',
  }
}
