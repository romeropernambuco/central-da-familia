import { useEffect, useState } from 'react'

/**
 * Qual seção da tela está à vista agora (24/11/2026: as abas do topo do orçamento marcam onde a pessoa está).
 * Sem IntersectionObserver (navegador antigo ou teste), fica na primeira seção.
 */
export function useSecaoVisivel(ids: string[], pronto: boolean): string {
  const [atual, setAtual] = useState(ids[0])
  const chave = ids.join('|')
  useEffect(() => {
    if (!pronto || typeof IntersectionObserver === 'undefined') return
    const ids = chave.split('|')
    const vistos = new Map<string, boolean>()
    const obs = new IntersectionObserver(
      entradas => {
        for (const e of entradas) vistos.set(e.target.id, e.isIntersecting)
        const primeiro = ids.find(id => vistos.get(id))
        if (primeiro) setAtual(primeiro)
      },
      // conta como "à vista" a seção que passa pela faixa de cima da tela (logo abaixo das abas)
      { rootMargin: '-80px 0px -55% 0px' },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [chave, pronto])
  return atual
}
