export function valorForaPadrao(valor: number, limiteMes: number, recentes: number[]): boolean {
  const valores = recentes.filter(x => Number.isFinite(x) && x > 0).sort((a, b) => a - b)
  const n = valores.length,
    mediana = n ? (n % 2 ? valores[Math.floor(n / 2)] : (valores[n / 2 - 1] + valores[n / 2]) / 2) : 0
  return valor > 0 && ((limiteMes > 0 && valor > limiteMes * 0.5) || (mediana > 0 && valor > mediana * 5))
}
