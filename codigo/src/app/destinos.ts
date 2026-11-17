import { useEffect, useState } from 'react'
import { rotaDoHash, rotaPermitida, type Rota } from './rotas'
export interface DestinoResumo { rota: Rota; secao: string; entidade?: string; periodo?: string }
export function enderecoDestino(d: DestinoResumo) {
  const p = new URLSearchParams({ secao: d.secao })
  if (d.entidade) p.set('entidade', d.entidade)
  if (d.periodo) p.set('periodo', d.periodo)
  return `#/${d.rota}?${p}`
}
export function lerDestino(hash: string): DestinoResumo {
  const p = new URLSearchParams(hash.split('?')[1])
  return { rota: rotaDoHash(hash), secao: p.get('secao') || '', entidade: p.get('entidade') || undefined, periodo: p.get('periodo') || undefined }
}
export function destinoPermitido(d: DestinoResumo, papel: 'casal' | 'pessoa' | 'equipe') { return rotaPermitida(d.rota, papel) === d.rota }
export function useDestino() {
  const [hash, setHash] = useState(() => typeof location === 'undefined' ? '' : location.hash)
  useEffect(() => { if (typeof window === 'undefined') return; const f = () => setHash(typeof location === 'undefined' ? '' : location.hash); window.addEventListener?.('hashchange', f); return () => window.removeEventListener?.('hashchange', f) }, [])
  return lerDestino(hash)
}
/** Observa o destino até a seção lazy e seu registro existirem; sem corrida com Suspense. */
export function focarDestino(d: DestinoResumo, raiz: HTMLElement = document.body) {
  let feito = false
  const tentar = () => {
    const candidatos = Array.from(raiz.querySelectorAll<HTMLElement>('[data-secao]'))
    const el = candidatos.find(el => el.dataset.secao === d.secao && (!d.entidade || el.dataset.entidade === d.entidade) && (!d.periodo || !el.dataset.periodo || el.dataset.periodo === d.periodo))
    if (!el || feito) return
    feito = true; el.tabIndex = -1; el.focus({ preventScroll: true }); el.scrollIntoView?.({ block: 'start', behavior: 'auto' })
  }
  const obs = new MutationObserver(tentar)
  obs.observe(raiz, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-entidade', 'data-periodo'] })
  tentar()
  return () => obs.disconnect()
}
