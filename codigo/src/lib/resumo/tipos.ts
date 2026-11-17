import type { totaisDoMes } from './movimentacao'
import type { totaisGuardado } from './guardado'
import type { numerosRumo2029 } from './plano2029'

/** API de telas usa reais decimais; futuro() usa centavos inteiros. Nunca inferir a unidade. */
export type Dinheiro = { unidade: 'reais'; valor: number } | { unidade: 'centavos'; valor: number }
export const emReais = (valor: number): Dinheiro => ({ unidade: 'reais', valor })
export const paraMotor = (d: Dinheiro): number => d.unidade === 'centavos' ? d.valor : Math.round(d.valor * 100)
export const daTela = (valor: number): Dinheiro => ({ unidade: 'reais', valor })
export interface FonteResumo {
  recurso: string
  escopo: { familia: string; membro?: string; papel: string }
  periodo?: { inicio: string; fim: string; fuso: string }
  natureza: 'realizado' | 'previsto' | 'estimado' | 'cadastrado'
}
interface Metadados {
  fonte: FonteResumo[]
  /** Fim da leitura, nunca significa conferência do cadastro. */
  consultadoEm: string | null
  /** Registro humano de useNumerosAtualizados; null = Sem conferência registrada. */
  conferidoEm: string | null
  /** Data informada pela fonte; null quando o contrato não a fornece. */
  atualizadoEm: string | null
}
export type CampoResumo<T> = Metadados & (
  { estado: 'pronto'; valor: T } |
  { estado: 'carregando' | 'vazio' | 'erro' | 'indisponivel' | 'restrito'; valor: null; motivo?: string }
)
export type RecebimentosResumo = ReturnType<typeof import('./recebimentos').recebimentosDoMes>
export type CasaResumo = ReturnType<typeof import('./casa').situacaoCasa>
type OrcamentoResumo = Awaited<ReturnType<typeof import('./leituras').lerOrcamento>>
export interface ResumoFamilia {
  saldoConta: CampoResumo<Dinheiro>
  podeGastarHoje: CampoResumo<OrcamentoResumo>
  movimentacaoMes: CampoResumo<{ unidade: 'reais' } & ReturnType<typeof totaisDoMes>>
  aplicacoes: CampoResumo<{ unidade: 'reais' } & ReturnType<typeof totaisGuardado>>
  imoveis: CampoResumo<{ valor: Dinheiro; aluguel: Dinheiro | null }>
  faturas: CampoResumo<ReturnType<typeof import('./faturas').faturasAConferir>>
  recebimentos: CampoResumo<RecebimentosResumo>
  casa: CampoResumo<CasaResumo>
  desejos: CampoResumo<ReturnType<typeof import('./desejos').totaisDesejos>>
  pendencias: CampoResumo<{ total: number; primeira?: { id: string; assunto: string } }>
  plano2029: CampoResumo<{ unidade: 'centavos' } & ReturnType<typeof numerosRumo2029>>
}
