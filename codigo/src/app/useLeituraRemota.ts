import { useEffect, useState } from 'react'

/** Estado pertence ao contexto que o carregou; falha conserva o último resultado desse contexto. */
export function useLeituraRemota<T>(chave: string, buscar: (() => Promise<T>) | null, dependencias: readonly unknown[]) {
  const [r, setR] = useState<{ chave: string; dado: T | null; erro: string; carregando: boolean }>({ chave, dado: null, erro: '', carregando: true })
  const [n, setN] = useState(0)
  useEffect(() => {
    let vivo = true
    setR(a => ({ chave, dado: a.chave === chave ? a.dado : null, erro: '', carregando: !!buscar }))
    if (buscar) buscar().then(dado => { if (vivo) setR({ chave, dado, erro: '', carregando: false }) }).catch((e: Error) => {
      if (vivo) setR(a => ({ ...a, erro: e.message, carregando: false }))
    })
    return () => { vivo = false }
  }, [chave, n, ...dependencias])
  const atual = r.chave === chave ? r : { dado: null, erro: '', carregando: !!buscar }
  return { ...atual, repetir: () => setN(x => x + 1) }
}
