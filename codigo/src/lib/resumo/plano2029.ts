/** Fachada fina: preserva o motor e as unidades (centavos) de rumo2029. */
import type { FuturoEntrada } from '../futuro'

export function conferenciasDoPlano(e: FuturoEntrada) {
  return {
    aplicacoes: e.aplicacoes.map(a => a.id),
    imoveis: (e.imoveis ?? []).map(i => i.id),
    recebimentos: e.recebimentos.filter(r => !r.recebido).map(r => r.id),
  }
}

export { numerosRumo2029, rumoDoCenario } from '../../app/rumo2029'
export type { RumoCalculado } from '../../app/rumo2029'
