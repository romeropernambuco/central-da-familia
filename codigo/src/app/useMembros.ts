// Nome de quem lançou (rodada 2, "quem pagou"): o lançamento guarda o id do membro; a tela mostra o nome.
import { useEffect, useState } from 'react'
import { useApp } from './contexto'
import type { Api } from '../api/tipos'

const ouvintes = new Set<() => void>()
let geracao = 0
const cache = new WeakMap<Api, Map<string, Promise<{ id: string; nome: string }[]>>>()
function lerMembros(api: Api, fid: string, versao: number) {
  let entradas = cache.get(api)
  if (!entradas) { entradas = new Map(); cache.set(api, entradas) }
  const chave = `${fid}:${versao}:${geracao}`
  let leitura = entradas.get(chave)
  if (!leitura) { entradas.clear(); leitura = api.membros(fid); entradas.set(chave, leitura) }
  return leitura
}
export function invalidarNomes() { geracao++; ouvintes.forEach(f => f()) }
export function useMembros() {
  const { api, familia, versao } = useApp()
  const [ms, setMs] = useState<{ id: string; nome: string }[]>([])
  const pode = familia?.papel === 'casal'
  const [erro, setErro] = useState(false), [n, setN] = useState(0)
  const repetir = invalidarNomes
  useEffect(() => { const avisar = () => setN(x => x + 1); ouvintes.add(avisar); return () => { ouvintes.delete(avisar) } }, [])
  useEffect(() => {
    let vivo = true; setMs([]); setErro(false)
    if (familia && pode) lerMembros(api, familia.id, versao).then(m => { if (vivo) setMs(m) }).catch(() => { if (vivo) setErro(true) })
    return () => { vivo = false }
  }, [api, familia?.id, pode, versao, n])
  return Object.assign((id?: string | null) => id === familia?.membroId ? familia?.membroNome || null : (id ? ms.find(m => m.id === id)?.nome || null : null), { erro, repetir, lista: ms, invalidar: invalidarNomes })
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
