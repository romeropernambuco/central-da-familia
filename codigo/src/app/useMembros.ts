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
