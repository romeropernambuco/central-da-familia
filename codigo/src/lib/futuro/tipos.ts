// Tipos do motor do dinheiro infinito (PLANO_TECNICO item 3A, copiados sem mudar).
// Dinheiro em centavos inteiros; taxa em texto decimal ('0.1375'); mês em 'AAAA-MM'.

export type Centavos = number
export type Mes = string /* 'AAAA-MM' */
export type Taxa = string /* '0.1375' */

// Mudança do REVISOR (C5, 13/11): conta_conjunta_titulares (número) virou titulares (lista de membros da conta),
// pra cada titular da conjunta receber a parte dele no FGC. titular continua sendo o dono que a tela mostra.
export interface Aplicacao { id: string; titular: string | null; titulares: string[]; banco: string; saldo: Centavos; taxa_bruta_anual: Taxa; isenta: boolean; aplicada_em: string; resgate_previsto: string | null; fgc: boolean }
export interface Recebimento { id: string; dono: string; valor: Centavos; mes_previsto: Mes; mes_novo: Mes | null; certo: boolean; recebido: boolean }
export interface Desejo { id: string; dono: string; valor: Centavos; mes: Mes; volta_de: 'nada' | 'contrato' | 'investimento' | 'venda'; volta: Centavos; volta_mes: Mes | null; antecipado: Centavos | null; volta_certa: boolean; situacao?: 'pensando' | 'combinado' | 'feito' | 'desisti' /* REVISOR E12 C2: feito já saiu do saldo e desisti não sai; o motor ignora os 2. Sem o campo = pendente */ }
export interface Parametros { mes_base: Mes; virada: Mes /* '2029-01' */; gasto_2029_hoje: Centavos; renda_certa_2029: Centavos; margem: Taxa; taxa_real_trabalho: Taxa; taxa_bruta_ano: Record<number, Taxa>; ipca_ano: Record<number, Taxa>; aliq_proj: Taxa; aliq_renda?: Taxa /* IR do modo renda (2029 em diante, aplicação longa); sem ele vale aliq_proj */; aliq_aluguel?: Taxa /* IR do aluguel (RODADA_PATRIMONIO); sem ele, 15% [confirmar] */; piso_meses: number; teto_mes: Centavos; mes_reajuste: number }
export interface FuturoEntrada { hoje: string; saldo_caixa: Centavos; aplicacoes: Aplicacao[]; recebimentos: Recebimento[]; compromissos: { mes: Mes; valor: Centavos; tipo: 'conta_grande' | 'folha_13' | 'parcela' }[]; dividas: { mes: Mes; valor: Centavos }[]; desvios: { mes: Mes; valor: Centavos; origem: string }[]; desejos: Desejo[]; parametros: Parametros; imoveis?: Imovel[] /* RODADA_PATRIMONIO; sem o campo = nenhum */ }
// piso: acrescentado a pedido do REVISOR 2 (B3): a tela desenha o piso que o motor usou, sem refazer a conta.
export interface LinhaMes { mes: Mes; saldo_inicial: Centavos; rendimento: Centavos; recebimentos: Centavos; teto: Centavos; compromissos: Centavos; dividas: Centavos; desvios: Centavos; retornos: Centavos; alugueis?: Centavos /* aluguel líquido com contrato (RODADA_PATRIMONIO); futuro() sempre preenche */; saldo_final: Centavos; piso: Centavos; fica_devendo: Centavos; devendo_ate: Mes | null }
// QA E11 (erros 1 a 4): campos novos opcionais no tipo pra não quebrar quem já monta FuturoSaida à mão; futuro() sempre preenche.
export interface RendaDoMes { mes: Mes; patrimonio: Centavos; taxa_real_anual: Taxa; taxa_real_mensal: Taxa; renda_sustentavel: Centavos; gasto_do_mes: Centavos; folga_do_mes: Centavos /* negativo = a renda não cobre o mês */; falta_taxa: boolean /* true = sem Selic e IPCA do ano nos parâmetros: usou a taxa real de trabalho */; aluguel_liquido?: Centavos /* aluguel com contrato válido neste mês */; renda_total?: Centavos /* renda_sustentavel + aluguel_liquido */ }
export interface FuturoSaida {
  modo?: 'projecao' | 'renda' /* renda = hoje já é a virada ou depois: sem linha, vale o bloco renda */
  linha: LinhaMes[]
  patrimonio_necessario: Centavos | null /* null = taxa real <= 0 */
  renda_sustentavel: Centavos
  folga: Centavos /* negativo = falta, a tela nunca mostra sinal */
  ajustes_falta: {
    guardar_por_mes: Centavos /* 0 quando sugerido = 'cortar' (faltam poucos meses: não serve) */
    cortar_por_mes_2029: Centavos /* total do corte, com a margem de segurança dentro (= falta_por_mes + margem_por_mes) */
    falta_por_mes?: Centavos /* o que falta no mês sem margem: a tela escreve ESTE na frase principal (= renda.folga_do_mes sem sinal no modo renda) */
    margem_por_mes?: Centavos /* a parte do corte que é só a folga de segurança (margem); a tela escreve como explicação */
    desejos_pra_adiar: string[]
    sugerido?: 'guardar' | 'cortar'
    meses_restantes?: number
  } | null
  renda?: RendaDoMes | null
  // RODADA_PATRIMONIO (imóveis). futuro() sempre preenche.
  patrimonio_imoveis?: Centavos /* valor dos imóveis na virada (ou hoje, no modo renda); à parte, nunca sacado */
  aluguel_liquido_2029?: Centavos /* aluguel com contrato válido no mês da virada (ou no mês de hoje, no modo renda) */
  renda_total_2029?: Centavos /* renda_sustentavel (aplicações) + aluguel_liquido_2029 */
  imoveis?: ImovelSaida[]
  gatilhos?: Gatilho[] /* o que aparece mas não entra na conta: aluguel sem contrato ou depois dele, venda sem contrato, recebimento incerto */
  aliq_aluguel_confirmar?: boolean /* true = sem aliq_aluguel nos parâmetros: usou 15% [confirmar] */
  perguntas: { recebimento_atrasado: string }[]
  avisos_fgc: { banco: string; titular: string | null; fora: Centavos }[]
}

// RODADA_PATRIMONIO, 14/11/2026. Nomes provisórios do MOTOR até o BANCO mandar os da tabela (aí troca só aqui e no api).
export interface Imovel {
  id: string; dono: string; apelido: string
  valor: Centavos /* valor estimado */
  uso: 'mora' | 'aluga' | 'parado' | 'vende'
  aluguel_bruto: Centavos /* por mês */
  custos_mes: Centavos /* IPTU, condomínio, manutenção por mês */
  vacancia: Taxa /* '0.08' = 8% do tempo vazio */
  tem_contrato: boolean; contrato_ate: Mes | null
  venda_valor: Centavos | null; venda_mes: Mes | null; venda_contrato: boolean
}
export interface ImovelSaida {
  id: string; dono: string; apelido: string; uso: Imovel['uso']; valor: Centavos
  aluguel_liquido_mes: Centavos
  rentabilidade_ano: Taxa /* aluguel líquido × 12 ÷ valor */
  taxa_real_aplicacoes: Taxa /* a do dinheiro aplicado, pra comparar */
  rende_mais_que_aplicacao: boolean
  entra_na_conta: boolean /* aluguel com contrato no mês de referência */
  contrato_ate: Mes | null
  vendido: boolean /* venda com contrato até o mês de referência: saiu do patrimônio */
}
export interface Gatilho {
  origem: 'imovel' | 'recebimento'; id: string; nome: string
  tipo: 'aluguel' | 'venda' | 'recebimento'
  motivo: 'sem contrato' | 'depois do contrato' | 'contrato sem data de fim' | 'depois da virada' | 'incerto'
  valor: Centavos; mes: Mes | null /* a partir de quando (aluguel) ou quando (venda e recebimento) */
  por_mes: boolean /* true = valor por mês (aluguel) */
}
