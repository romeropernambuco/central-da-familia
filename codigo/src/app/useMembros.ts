// Nome de quem lançou (rodada 2, "quem pagou"): o lançamento guarda o id do membro; a tela mostra o nome.
import { useEffect, useState } from 'react'
import { useApp } from './contexto'

export function useMembros(): (id?: string | null) => string | null {
  const { api, familia } = useApp()
  const [ms, setMs] = useState<{ id: string; nome: string }[]>([])
  const pode = familia?.papel === 'casal'
  useEffect(() => { if (familia && pode) api.membros(familia.id).then(setMs).catch(() => {}) }, [api, familia?.id, pode])
  return id => (id ? ms.find(m => m.id === id)?.nome || null : null)
}

/** E3 (conserto 8): quantos adultos tem o casal. Família de 1 adulto não vê "Do casal" nem "vocês". null = ainda buscando. */
export function useAdultos(): number | null {
  const { api, familia } = useApp()
  const [n, setN] = useState<number | null>(null)
  const pode = familia?.papel === 'casal'
  useEffect(() => {
    if (!familia || !pode) return
    // pessoa da família (filho, avó) não conta como adulto do casal; sem o papel na resposta, conta todo mundo
    api.membros(familia.id).then(ms => setN(Math.max(1, ms.filter(m => !m.papel || m.papel === 'casal').length))).catch(() => setN(2))
  }, [api, familia?.id, pode])
  return n
}
