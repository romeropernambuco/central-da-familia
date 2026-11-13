// N12 (rodada 2): o olho esconde TODO valor da tela, inclusive o que vem pronto em frase (fala do funcionário do
// Escritório, aviso depois de salvar, ficha). O <Din> e o reais() já escondem sozinhos; isto pega o resto:
// qualquer "R$ 1.234,56" em texto, aria-label ou title vira "R$ •••" enquanto o olho estiver fechado, e volta ao abrir.
import { mascararTexto } from '../lib/formato'

const ATRS = ['aria-label', 'title', 'placeholder']
const TEM_VALOR = /R\$[\s ]*[\d.]+/
// número solto logo depois de um texto que termina em "R$" (JSX "R$ {valor}" vira 2 pedaços de texto)
const SO_NUMERO = /^[\s ]*\d(?:[\d.]*\d)?(,\d{1,2})?/

const textos = new WeakMap<Text, string>()
const atributos = new WeakMap<Element, Record<string, string>>()

function mascararNo(t: Text) {
  const v = t.nodeValue || ''
  let novo = v
  if (TEM_VALOR.test(v)) novo = mascararTexto(v)
  else {
    const ant = t.previousSibling
    if (ant && ant.nodeType === 3 && /R\$[\s ]*$/.test(ant.nodeValue || '') && SO_NUMERO.test(v)) novo = v.replace(SO_NUMERO, '•••')
  }
  if (novo !== v) { textos.set(t, v); t.nodeValue = novo }
}
function mascararEl(el: Element) {
  for (const a of ATRS) {
    const v = el.getAttribute(a)
    if (v && TEM_VALOR.test(v)) {
      const orig = atributos.get(el) || {}
      orig[a] = v; atributos.set(el, orig)
      el.setAttribute(a, mascararTexto(v))
    }
  }
}
function varrer(raiz: Node) {
  if (raiz.nodeType === 3) { mascararNo(raiz as Text); return }
  if (raiz.nodeType !== 1) return
  mascararEl(raiz as Element)
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? mascararNo(n as Text) : mascararEl(n as Element)
}
function restaurar(raiz: Node) {
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  for (let n: Node | null = raiz; n; n = w.nextNode()) {
    if (n.nodeType === 3) { const o = textos.get(n as Text); if (o != null && (n as Text).nodeValue?.includes('•••')) (n as Text).nodeValue = o; textos.delete(n as Text) }
    else if (n.nodeType === 1) { const o = atributos.get(n as Element); if (o) { for (const [a, v] of Object.entries(o)) (n as Element).setAttribute(a, v); atributos.delete(n as Element) } }
  }
}

let obs: MutationObserver | null = null
/** Liga ou desliga a máscara no documento inteiro (as folhas abrem fora do #root, por isso o body). */
export function mascaraDoOlho(ligar: boolean) {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
  obs?.disconnect(); obs = null
  if (!ligar) { restaurar(document.body); return }
  varrer(document.body)
  obs = new MutationObserver(ms => {
    obs!.disconnect()
    for (const m of ms) {
      if (m.type === 'characterData') mascararNo(m.target as Text)
      else if (m.type === 'attributes') mascararEl(m.target as Element)
      else m.addedNodes.forEach(varrer)
    }
    obs!.observe(document.body, OPC)
  })
  obs.observe(document.body, OPC)
}
const OPC: MutationObserverInit = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRS }
