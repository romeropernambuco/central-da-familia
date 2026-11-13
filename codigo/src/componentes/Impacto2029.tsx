// E7: 1 linha "isso tira R$ X por mês da renda de 2029, pra sempre" (F6). Vai no estouro, no Lançar quando o gasto é
// grande e no Desejo. A tela NUNCA calcula 2029: só chama impacto2029() de lib/futuro com a entrada de api/futuro.ts.
import { useApp } from '../app/contexto'
import { useFuturo } from '../app/useDados2'
import { impacto2029, type Centavos, type FuturoEntrada } from '../lib/futuro'
import { hojeRecife, reais } from '../lib/formato'

/** A frase, sem conta: recebe a perda por mês em centavos (do motor). null = taxa real ≤ 0 (o rendimento não repõe a inflação). */
export function fraseImpacto(perda: Centavos | null, prefixo = ''): string | null {
  if (perda === null) return 'Nesse cenário o rendimento não repõe a inflação: o app não diz quanto isso tira de 2029.'
  if (perda <= 0) return null
  return `${prefixo}${prefixo ? 'isso' : 'Isso'} tira ${reais(perda / 100)} por mês da renda de 2029, pra sempre.`
}

/** O motor diz quanto R$ X que saem no mês `mes` tiram da renda de 2029 por mês. null quando não dá pra dizer. */
export function perdaPorMes(entrada: FuturoEntrada, valorReais: number, mes = hojeRecife().slice(0, 7)): Centavos | null | undefined {
  const valor = Math.round(valorReais * 100)
  if (!(valor > 0)) return undefined
  try { return impacto2029(entrada, { mes, valor }).perda_renda_mensal } catch { return undefined }
}

/** `valor` em reais; `mes` 'AAAA-MM' (padrão: o mês de hoje). Some pra quem não é do casal (a filha não vê 2029). */
export function Impacto2029({ valor, mes, prefixo, className = '' }: { valor: number; mes?: string; prefixo?: string; className?: string }) {
  const { familia } = useApp()
  const { ent } = useFuturo()
  if (familia?.papel !== 'casal' || !ent?.entrada) return null
  const perda = perdaPorMes(ent.entrada, valor, mes)
  if (perda === undefined) return null
  const f = fraseImpacto(perda, prefixo)
  if (!f) return null
  return <p className={'impacto-2029 ' + className}>{f}</p>
}
