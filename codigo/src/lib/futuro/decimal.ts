// Base do motor: Decimal configurado, arredondamento, centavos, dias e meses.
// Regras (PLANO_TECNICO 3A): taxa sempre em Decimal (precisão 40, meio pra cima),
// dinheiro em centavos inteiros, arredonda só na hora de gravar cada valor.
// Nesta pasta não se usa a potência nem a formatação nativas do JavaScript.
import DecimalBase from 'decimal.js'
import type { Centavos, Mes, Taxa } from './tipos'

/** Decimal só do motor (cópia isolada: não muda a configuração global da biblioteca). */
export const Dec = DecimalBase.clone({
  precision: 40,
  rounding: DecimalBase.ROUND_HALF_UP,
  toExpNeg: -9e15,
  toExpPos: 9e15,
})
export type Dec = InstanceType<typeof Dec>

export const ZERO = new Dec(0)
export const UM = new Dec(1)

/** Texto decimal ('0.1375') vira Decimal. Recusa texto que não é número. */
export function taxa(t: Taxa | Dec): Dec {
  if (t instanceof Dec) return t
  if (typeof t !== 'string' || !/^-?\d+(\.\d+)?$/.test(t.trim())) throw new Error(`Taxa inválida: ${String(t)}`)
  return new Dec(t.trim())
}

/** Confere que é centavo inteiro seguro e devolve como Decimal. */
export function centavos(v: Centavos): Dec {
  if (!Number.isSafeInteger(v)) throw new Error(`Centavos precisam ser inteiros: ${String(v)}`)
  return new Dec(v)
}

/** Arredonda meio pra cima (longe do zero) para centavos inteiros. Único ponto de gravação. */
export function arred(x: Dec): Centavos {
  const n = x.toDecimalPlaces(0, Dec.ROUND_HALF_UP).toNumber()
  if (!Number.isSafeInteger(n)) throw new Error(`Valor fora do limite: ${x.toString()}`)
  return n === 0 ? 0 : n // tira o -0
}

/** Potência em Decimal (expoente inteiro sai exato; fracionário com precisão 40). */
export function potencia(base: Dec, expoente: Dec | number): Dec {
  if (base.lte(0)) throw new Error('Base da potência precisa ser positiva')
  return base.pow(expoente)
}

/** Taxa anual pra mensal: (1 + anual)^(1/12) − 1. */
export function mensal(anual: Dec | Taxa): Dec {
  return potencia(UM.plus(taxa(anual)), UM.div(12)).minus(1)
}

/** Escreve um Decimal com N casas, meio pra cima, sem formatação nativa. */
export function comCasas(x: Dec, casas: number): string {
  const escala = new Dec(10).pow(casas)
  const inteiro = x.times(escala).toDecimalPlaces(0, Dec.ROUND_HALF_UP)
  const neg = inteiro.isNeg() && !inteiro.isZero()
  let dig = inteiro.abs().toString()
  if (casas === 0) return (neg ? '-' : '') + dig
  while (dig.length <= casas) dig = '0' + dig
  return (neg ? '-' : '') + dig.slice(0, dig.length - casas) + '.' + dig.slice(dig.length - casas)
}

/** Taxa em % com 4 casas (testes) ou 2 (tela): 0.087125 → '8.7125'. */
export function pct(x: Dec, casas = 4): string { return comCasas(x.times(100), casas) }

/** '788.41' → 78841. Aceita sinal. Recusa mais de 2 casas. */
export function centavosDeTexto(s: string): Centavos {
  if (!/^-?\d+(\.\d{1,2})?$/.test(s.trim())) throw new Error(`Valor inválido: ${s}`)
  return arred(new Dec(s.trim()).times(100))
}

/** 78841 → '788.41'. */
export function textoDeCentavos(c: Centavos): string { return comCasas(centavos(c).div(100), 2) }

// ---------- meses e dias ----------
function partes(m: Mes): [number, number] {
  const r = /^(\d{4})-(\d{2})$/.exec(m)
  if (!r) throw new Error(`Mês inválido: ${m}`)
  const a = Number(r[1]), mm = Number(r[2])
  if (mm < 1 || mm > 12) throw new Error(`Mês inválido: ${m}`)
  return [a, mm]
}
export function mes(a: number, m: number): Mes { return `${a}-${m < 10 ? '0' : ''}${m}` }
export function anoDe(m: Mes): number { return partes(m)[0] }
export function numeroDoMes(m: Mes): number { return partes(m)[1] }
export function proximoMes(m: Mes): Mes { const [a, mm] = partes(m); return mm === 12 ? mes(a + 1, 1) : mes(a, mm + 1) }
export function mesAnterior(m: Mes): Mes { const [a, mm] = partes(m); return mm === 1 ? mes(a - 1, 12) : mes(a, mm - 1) }
/** Negativo se a < b, zero se igual, positivo se a > b. */
export function compararMes(a: Mes, b: Mes): number { const [x, y] = partes(a), [z, w] = partes(b); return (x - z) * 12 + (y - w) }
/** Quantos meses de a até b (b − a). */
export function mesesEntre(a: Mes, b: Mes): number { return compararMes(b, a) }
/** Lista de a até b, inclusive. Vazia se b < a. */
export function listaMeses(de: Mes, ate: Mes): Mes[] {
  const out: Mes[] = []
  for (let m = de; compararMes(m, ate) <= 0; m = proximoMes(m)) out.push(m)
  return out
}
/** Mês de uma data 'AAAA-MM-DD'. */
export function mesDaData(data: string): Mes {
  const r = /^(\d{4})-(\d{2})-(\d{2})/.exec(data)
  if (!r) throw new Error(`Data inválida: ${data}`)
  return `${r[1]}-${r[2]}`
}
/** Dias corridos do mês (28, 29, 30 ou 31). */
export function diasDoMes(m: Mes): number { const [a, mm] = partes(m); return new Date(Date.UTC(a, mm, 0)).getUTCDate() }
/** Dias corridos entre 2 datas 'AAAA-MM-DD' (fim − início). */
export function diasCorridos(inicio: string, fim: string): number {
  const p = (s: string) => { const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (!r) throw new Error(`Data inválida: ${s}`); return Date.UTC(Number(r[1]), Number(r[2]) - 1, Number(r[3])) }
  return Math.round((p(fim) - p(inicio)) / 86400000)
}
