import type { EstadoAgente, EstadoCena } from '../../../lib/escritorio/cenaBase'

// A cena completa fala em estados do escritório (fila, trabalhando, entregue, precisa);
// o mini das outras abas fala em estados de interação. Estas duas funções traduzem de um para o outro.
export const estadoMini = (e: EstadoCena): EstadoAgente =>
  e === 'precisa' ? 'chamando' : e === 'entregue' ? 'resolvido' : e === 'fila' ? 'parado' : 'trabalhando'
export const estadoLegado = (e: EstadoAgente): EstadoCena =>
  e === 'chamando' ? 'precisa' : e === 'resolvido' ? 'entregue' : e === 'parado' ? 'fila' : 'trabalhando'

/** Brilho da tela do notebook pelo estado: trabalhando acesa, precisa de você meia luz, o resto quase apagada. */
export const luzTela = (st: EstadoCena) => (st === 'trabalhando' ? 0.9 : st === 'precisa' ? 0.5 : 0.12)
