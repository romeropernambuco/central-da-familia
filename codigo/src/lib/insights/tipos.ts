import type { Papel, PerguntaEsc } from '../../api/tipos'
import type { Rota } from '../../app/rotas'

/** Fronteira do motor: dinheiro SOMENTE em centavos inteiros seguros. Ausência não é zero. */
export interface FaturaInsight {
  cartaoId: string; mes: string; nome: string; vencimento: string
  total: number; banco: number | null; paga: boolean; podeInformar: boolean
  composicaoDisponivel?: boolean
  composicao: { id: string; nome: string; centavos: number; parcela: boolean }[]
}
export interface SnapshotInsights {
  modo: 'real' | 'exemplo'
  /** A proveniência deve coincidir com modo; exemplo nunca preenche uma leitura real ausente. */
  origem: 'real' | 'exemplo'
  papel: Papel
  faturas?: readonly FaturaInsight[]
  reserva?: { mes: string; combinada: number; livre: number }
  recebimentos?: readonly { id: string; nome: string; mesPrevisto: string; mesNovo: string | null; recebido: boolean; meu: boolean; valor?: number }[]
  aplicacoes?: readonly { id: string; nome: string; vencimento: string | null; ativa: boolean }[]
  feiras?: readonly { id: string; semana: string; data: string; temNota: boolean; justificativa: string | null }[]
  objetivo?: { mes: string; projetado: number | null; necessario: number | null; resumo?: string }
}
export type TipoInsight = 'fatura_vencendo' | 'fatura_divergente' | 'parcelas' | 'reserva' | 'recebimento' | 'aplicacao' | 'feira_nota' | 'objetivo'
export type AcaoInsight =
  | { tipo: 'informar_pagamento'; cartaoId: string; mes: string }
  | { tipo: 'composicao'; cartaoId: string; mes: string; itens: FaturaInsight['composicao']; total: number; disponivel?: boolean }
  | { tipo: 'recebimento'; id: string; meu: boolean; valor?: number }
  | { tipo: 'feira'; id: string }
  | { tipo: 'atalho'; destino: '#/planejamento' | '#/guardado' | '#/planejamento?aba=parametros' }
export interface Insight extends PerguntaEsc {
  rota: Rota; tipo: TipoInsight
  /** 0 vence hoje; 1 vence em breve; 2 informativo. Desempate estável, sem depender da ordem do banco. */
  prioridade: 0 | 1 | 2
  /** Assunto + período. Todos os avisos de uma mesma fatura partilham esta chave. */
  chave: string
  acao: AcaoInsight
  exemplo: boolean
  etiqueta?: string
}
export interface RegistroInsight { vistoEm?: string; adiadoAte?: number; resolvido?: boolean }
export type MemoriaInsights = Readonly<Record<string, RegistroInsight>>
export type EventoInsight = { tipo: 'visto' } | { tipo: 'resolvido' } | { tipo: 'depois'; ate: number }
