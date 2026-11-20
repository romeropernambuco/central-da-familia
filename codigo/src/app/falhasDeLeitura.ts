import { LeituraSubstituida } from './invalidacao'

/**
 * Leituras de apoio de uma tela (cartões, faturas, avisos) que falharam.
 * Antes cada tela engolia o erro e ficava com um pedaço vazio, sem explicar. Agora a falha é anotada aqui
 * e uma faixa única avisa a pessoa e oferece tentar de novo.
 */
const falhas = new Set<string>()
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach(aviso => aviso())

export function ouvirFalhasDeLeitura(aviso: () => void) {
  ouvintes.add(aviso)
  return () => {
    ouvintes.delete(aviso)
  }
}

/** Use no `.catch` da leitura: `.catch(falhaDeLeitura('as faturas'))`. */
export function falhaDeLeitura(oQue: string) {
  return (erro: unknown) => {
    // leitura trocada por outra mais nova (mudou de família ou de sessão) não é falha
    if (erro instanceof LeituraSubstituida) return
    falhas.add(oQue)
    avisar()
  }
}

export const falhasDeLeitura = () => [...falhas]

export function limparFalhasDeLeitura() {
  if (!falhas.size) return
  falhas.clear()
  avisar()
}
