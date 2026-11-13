// F5 Folga ou falta na virada (ECONOMISTA item 3, F5). Positivo: sobra. Negativo: vira F9. Nunca vermelho.
import type { Centavos } from './tipos'

export function folga(saldo_final_ultimo_mes: Centavos, patrimonio_necessario: Centavos): Centavos {
  if (!Number.isSafeInteger(saldo_final_ultimo_mes) || !Number.isSafeInteger(patrimonio_necessario)) throw new Error('Centavos precisam ser inteiros')
  return saldo_final_ultimo_mes - patrimonio_necessario
}

/** A tela nunca mostra sinal: devolve a situação e o valor sem sinal. */
export function situacao(f: Centavos): { situacao: 'folga' | 'ajuste'; valor: Centavos } {
  return f >= 0 ? { situacao: 'folga', valor: f } : { situacao: 'ajuste', valor: -f }
}
