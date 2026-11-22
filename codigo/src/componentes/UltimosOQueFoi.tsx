import { textoPrivado } from '../lib/olho'
import type { Lancamento } from '../api/tipos'

/** Os últimos "O que foi?" diferentes, do mais novo para o mais antigo (até `quantos`). Sem acento e caixa repetidos. */
export function ultimosOQueFoi(lista: Pick<Lancamento, 'descricao' | 'criado_em' | 'apagado_em'>[], quantos = 6) {
  const vistos = new Set<string>()
  const out: string[] = []
  for (const l of [...lista].sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''))) {
    const d = (l.descricao || '').trim()
    const chave = d.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    if (!d || l.apagado_em || vistos.has(chave)) continue
    vistos.add(chave)
    out.push(d)
    if (out.length >= quantos) break
  }
  return out
}

/**
 * Anotar mais rápido: os últimos "O que foi?" do mês viram botões de 1 toque, logo abaixo do campo.
 * Some quando o que está escrito já é um deles.
 */
export function UltimosOQueFoi({
  lista,
  atual,
  escolher,
}: {
  lista: Lancamento[]
  atual: string
  escolher: (d: string) => void
}) {
  const nomes = ultimosOQueFoi(lista).filter(d => d !== atual.trim())
  if (!nomes.length) return null
  return (
    <div className="pills lanc-recentes" role="group" aria-label="Últimos O que foi">
      {nomes.map(d => (
        <button key={d} type="button" className="pill" onClick={() => escolher(d)}>
          {textoPrivado(d)}
        </button>
      ))}
    </div>
  )
}
