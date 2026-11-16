import { diaValido, tempoRecife } from './tempo'
import type { EventoInsight, MemoriaInsights, RegistroInsight } from './tipos'

export const chaveArmazenamento = (modo: string, usuario: string, familia: string) =>
  `insights:v1:${JSON.stringify([modo, usuario, familia])}`

/** JSON de storage não é confiável. Lista permitida: nenhum nome, texto livre ou dinheiro. */
export function lerMemoria(texto: string | null): MemoriaInsights {
  try {
    const v: unknown = JSON.parse(texto || '{}')
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
    const pares = Object.entries(v).filter(([k]) => k.length <= 800).slice(-2000).map(([k, r]) => {
      const n: RegistroInsight = {}
      if (r && typeof r === 'object') {
        if (diaValido(r.vistoEm)) n.vistoEm = r.vistoEm
        if (typeof r.adiadoAte === 'number' && Number.isFinite(r.adiadoAte)) n.adiadoAte = r.adiadoAte
        if (r.resolvido === true) n.resolvido = true
      }
      return [k, n]
    })
    return Object.fromEntries(pares)
  } catch { return {} }
}
export function registrarEvento(m: MemoriaInsights, chave: string, evento: EventoInsight, agora: unknown): MemoriaInsights {
  const t = tempoRecife(agora)
  if (!t) return m
  const anterior = Object.prototype.hasOwnProperty.call(m, chave) ? m[chave] : {}
  if (evento.tipo === 'depois' && (!Number.isFinite(evento.ate) || evento.ate <= t.ms)) return m
  return { ...m, [chave]: { ...anterior, ...(evento.tipo === 'visto' ? { vistoEm: t.dia }
    : evento.tipo === 'resolvido' ? { resolvido: true } : { adiadoAte: evento.ate }) } }
}

/** Mesmo padrão localStorage do olho no contexto, com fallback em memória se o navegador bloquear.
 * Leitura/escrita só de metadados. Não criptografa nem armazena o snapshot financeiro. */
export function criarMemoriaLocal(chave: string, armazenamento: () => Pick<Storage, 'getItem' | 'setItem'> = () => localStorage) {
  let memoria: MemoriaInsights = {}
  const reler = () => {
    const salvo = lerMemoria(armazenamento().getItem(chave))
    for (const [k, r] of Object.entries(salvo)) {
      const a = memoria[k] || {}
      memoria = { ...memoria, [k]: { ...a, ...r,
        vistoEm: [a.vistoEm || '', r.vistoEm || ''].sort().pop() || undefined,
        adiadoAte: Math.max(a.adiadoAte || 0, r.adiadoAte || 0) || undefined,
        resolvido: a.resolvido || r.resolvido || undefined } }
    }
  }
  return {
    ler() {
      try { reler() } catch { /* usa a sessão */ }
      return memoria
    },
    registrar(k: string, evento: EventoInsight, agora: unknown) {
      // Relê para preservar os outros assuntos respondidos em outra aba do navegador.
      try { reler() } catch { /* usa a sessão */ }
      memoria = registrarEvento(memoria, k, evento, agora)
      try { armazenamento().setItem(chave, JSON.stringify(memoria)) } catch { /* sessão continua funcional */ }
      return memoria
    },
  }
}
