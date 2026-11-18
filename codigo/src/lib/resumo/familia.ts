import type { ResumoFamilia } from './tipos'
export type CamposDaFamilia = { [K in keyof ResumoFamilia]: { campo: ResumoFamilia[K] } }
/** Composição sem estado global: cada campo já traz valor, proveniência e estado da sua fonte. */
export function comporResumoFamilia(campos: CamposDaFamilia): ResumoFamilia {
  return {
    saldoConta: campos.saldoConta.campo,
    podeGastarHoje: campos.podeGastarHoje.campo,
    faturas: campos.faturas.campo,
    aplicacoes: campos.aplicacoes.campo,
    recebimentos: campos.recebimentos.campo,
    plano2029: campos.plano2029.campo,
    casa: campos.casa.campo,
    imoveis: campos.imoveis.campo,
    movimentacaoMes: campos.movimentacaoMes.campo,
    desejos: campos.desejos.campo,
    pendencias: campos.pendencias.campo,
  }
}
