import type { Campo, DadosInicio, NivelAlerta } from '../dadosExemplo'
import { responsavelDaTarefa } from '../comuns/modeloPosto'

export type Dinheiro = Campo<number, 'reais' | 'centavos'>
export type Funcionario = NonNullable<DadosInicio['funcionarios']['valor']>[number]
export type Sala = Funcionario['sala']

export const salas = {
  caixa: 'Caixa', casa: 'Casa', cartoes: 'Cartões', patrimonio: 'Patrimônio',
  gestao: 'Gestão', recepcao: 'Recepção', apoio: 'Apoio',
} satisfies Record<Sala, string>

export const estados = {
  vai_comecar: 'Ainda vai começar', trabalhando: 'Trabalhando',
  entregue: 'Entregue', precisa_de_voce: 'Precisa de você',
}

export const prioridades = {
  'dinheiro em risco': { texto: 'Dinheiro em risco', icone: 'erro', ordem: 0 },
  operacao: { texto: 'Operação', icone: 'lancamentos', ordem: 1 },
  lembrete: { texto: 'Lembrete', icone: 'pendente', ordem: 2 },
} as const

export function organizarFila(dados: DadosInicio) {
  const niveis = new Map(dados.alertas.valor?.map(a => [a.id, a.nivel]))
  return (dados.pendencias.fila.valor ?? []).map(tarefa => ({
    ...tarefa,
    responsavel: responsavelDaTarefa(dados, tarefa),
    nivel: niveis.get(tarefa.id) ?? ('operacao' satisfies NivelAlerta),
  })).sort((a, b) => prioridades[a.nivel].ordem - prioridades[b.nivel].ordem)
}

export function diferenca(campo: Dinheiro, oculto: boolean) {
  const sinal = !oculto && campo.estado === 'pronto' ? Math.sign(campo.valor) : undefined
  return {
    campo: campo.estado === 'pronto' ? { ...campo, valor: Math.abs(campo.valor) } : campo,
    rotulo: sinal === 1 ? 'Falta por mês' : sinal === -1 ? 'Sobra por mês' :
      sinal === 0 ? 'Meta mensal coberta' : 'Diferença mensal',
  }
}
