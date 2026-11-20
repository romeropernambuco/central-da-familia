import type { ResumoFamilia } from './tipos'
export const recursosResumo: Record<keyof ResumoFamilia, string[]> = {
  saldoConta: ['saldos'],
  podeGastarHoje: ['resumo'],
  faturas: ['faturas', 'faturasBanco'],
  aplicacoes: ['guardado'],
  recebimentos: ['recebimentos', 'config:fontes_receita', 'config:receitas_controle'],
  plano2029: ['projecao'],
  casa: ['escritorio', 'feira', 'estoque'],
  imoveis: ['imoveis', 'projecao'],
  movimentacaoMes: [
    'lancamentos',
    'recebimentos',
    'config:entradas',
    'config:fontes_receita',
    'config:receitas_controle',
  ],
  desejos: ['desejos'],
  pendencias: ['escritorio'],
}
