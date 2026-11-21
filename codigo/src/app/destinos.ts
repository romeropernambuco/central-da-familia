import { useEffect, useState } from 'react'
import { mesReceitaValido } from '../lib/futuroReceitas'
import { rotaDoHash, rotaPermitida, type Rota } from '../lib/rotas'
export interface DestinoResumo {
  rota: Rota
  secao: string
  entidade?: string
  periodo?: string
}
export function enderecoDestino(d: DestinoResumo) {
  const p = new URLSearchParams({ secao: d.secao })
  if (d.entidade) p.set('entidade', d.entidade)
  if (d.periodo) p.set('periodo', d.periodo)
  return `#/${d.rota}?${p}`
}
const secoes: Partial<Record<Rota, string[]>> = {
  orcamento: ['orcamento'],
  lancamentos: ['mes'],
  planejamento: ['saldo', 'plano2029', 'recebimentos'],
  cartoes: ['fatura'],
  guardado: ['aplicacoes', 'imoveis'],
  casa: ['feira', 'gas', 'prestadores', 'folha'],
  desejos: ['desejo'],
  escritorio: ['tarefa', 'historico'],
}
export function lerDestino(hash: string): DestinoResumo {
  const rota = rotaDoHash(hash)
  const p = new URLSearchParams(hash.split('?')[1])
  const secao = p.get('secao') || (rota === 'lancamentos' && p.has('periodo') ? 'mes' : '')
  if (!secoes[rota]?.includes(secao)) return { rota, secao: '' }
  const id = p.get('entidade')
  const entidade =
    id &&
    (/^[\w-]+$/.test(id) || (secao === 'tarefa' && /^[\w.-]+(?::[\w.-]+)*$/.test(id))) &&
    ['fatura', 'desejo', 'tarefa'].includes(secao)
      ? id
      : undefined
  const mes = p.get('periodo')
  const periodo = ['fatura', 'recebimentos', 'mes'].includes(secao) && mesReceitaValido(mes) ? mes : undefined
  return { rota, secao, entidade, periodo }
}
export function destinoPermitido(d: DestinoResumo, papel: 'casal' | 'pessoa' | 'equipe') {
  return rotaPermitida(d.rota, papel) === d.rota
}
export function useDestino() {
  const [hash, setHash] = useState(() => (typeof location === 'undefined' ? '' : location.hash))
  useEffect(() => {
    if (typeof window === 'undefined') return
    const f = () => setHash(typeof location === 'undefined' ? '' : location.hash)
    window.addEventListener?.('hashchange', f)
    return () => window.removeEventListener?.('hashchange', f)
  }, [])
  return lerDestino(hash)
}
/** Observa o destino até a seção lazy e seu registro existirem; sem corrida com Suspense. */
export function focarDestino(d: DestinoResumo, raiz: HTMLElement = document.body) {
  let encerrado = false
  const parar = () => {
    if (!encerrado) {
      encerrado = true
      obs.disconnect()
    }
  }
  const tentar = () => {
    if (encerrado) return
    const candidatos = Array.from(raiz.querySelectorAll<HTMLElement>('[data-secao]'))
    const el = candidatos.find(
      el =>
        el.dataset.secao === d.secao &&
        (!d.entidade || el.dataset.entidade === d.entidade) &&
        (!d.periodo || el.dataset.periodo === d.periodo),
    )
    if (!el) return
    parar()
    el.tabIndex = -1
    el.focus({ preventScroll: true })
    el.scrollIntoView?.({ block: 'start', behavior: 'auto' })
  }
  const obs = new MutationObserver(tentar)
  obs.observe(raiz, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-secao', 'data-entidade', 'data-periodo'],
  })
  tentar()
  return parar
}
