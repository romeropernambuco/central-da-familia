// Tipos do motor do dinheiro infinito (PLANO_TECNICO item 3A, copiados sem mudar).
// Dinheiro em centavos inteiros; taxa em texto decimal ('0.1375'); mês em 'AAAA-MM'.

export type Centavos = number
export type Mes = string /* 'AAAA-MM' */
export type Taxa = string /* '0.1375' */

// Mudança do REVISOR (C5, 13/11): conta_conjunta_titulares (número) virou titulares (lista de membros da conta),
// pra cada titular da conjunta receber a parte dele no FGC. titular continua sendo o dono que a tela mostra.
export interface Aplicacao { id: string; titular: string | null; titulares: string[]; banco: string; saldo: Centavos; taxa_bruta_anual: Taxa; isenta: boolean; aplicada_em: string; resgate_previsto: string | null; fgc: boolean }
export interface Recebimento { id: string; dono: string; valor: Centavos; mes_previsto: Mes; mes_novo: Mes | null; certo: boolean; recebido: boolean }
export interface Desejo { id: string; dono: string; valor: Centavos; mes: Mes; volta_de: 'nada' | 'contrato' | 'investimento' | 'venda'; volta: Centavos; volta_mes: Mes | null; antecipado: Centavos | null; volta_certa: boolean }
export interface Parametros { mes_base: Mes; virada: Mes /* '2029-01' */; gasto_2029_hoje: Centavos; renda_certa_2029: Centavos; margem: Taxa; taxa_real_trabalho: Taxa; taxa_bruta_ano: Record<number, Taxa>; ipca_ano: Record<number, Taxa>; aliq_proj: Taxa; piso_meses: number; teto_mes: Centavos; mes_reajuste: number }
export interface FuturoEntrada { hoje: string; saldo_caixa: Centavos; aplicacoes: Aplicacao[]; recebimentos: Recebimento[]; compromissos: { mes: Mes; valor: Centavos; tipo: 'conta_grande' | 'folha_13' | 'parcela' }[]; dividas: { mes: Mes; valor: Centavos }[]; desvios: { mes: Mes; valor: Centavos; origem: string }[]; desejos: Desejo[]; parametros: Parametros }
export interface LinhaMes { mes: Mes; saldo_inicial: Centavos; rendimento: Centavos; recebimentos: Centavos; teto: Centavos; compromissos: Centavos; dividas: Centavos; desvios: Centavos; retornos: Centavos; saldo_final: Centavos; fica_devendo: Centavos; devendo_ate: Mes | null }
export interface FuturoSaida { linha: LinhaMes[]; patrimonio_necessario: Centavos | null /* null = taxa real <= 0 */; renda_sustentavel: Centavos; folga: Centavos /* negativo = falta, a tela nunca mostra sinal */; ajustes_falta: { guardar_por_mes: Centavos; cortar_por_mes_2029: Centavos; desejos_pra_adiar: string[] } | null; perguntas: { recebimento_atrasado: string }[]; avisos_fgc: { banco: string; titular: string | null; fora: Centavos }[] }
