const marcador = '[data-numero-financeiro]'
const moedaOuPercentual = /(?:[−+-]?\s*R\$\s*[−+-]?\s*\d+(?:\.\d{3})*(?:,\d+)?|[−+-]?\d+(?:\.\d{3})*(?:,\d+)?\s*%)/g

// Usa os retângulos do texto para contar só as ocorrências que cruzam a primeira tela.
export function medirNumeros(quadro: HTMLElement): string[] {
  const borda = quadro.getBoundingClientRect()
  const esquerda = borda.left + quadro.clientLeft
  const direita = esquerda + quadro.clientWidth
  const topo = borda.top + quadro.clientTop - quadro.scrollTop
  const base = topo + quadro.clientHeight
  const faixa = quadro.ownerDocument.createRange()
  const resultado: string[] = []

  function registrar(texto: string) {
    const visivel = Array.from(faixa.getClientRects()).some(r =>
      r.width > 0 && r.height > 0 && r.right > esquerda && r.left < direita && r.bottom > topo && r.top < base)
    if (visivel && texto.trim()) resultado.push(texto.replace(/\s+/g, ' ').trim())
  }

  function percorrer(elemento: Element) {
    if (elemento.matches('script, style')) return
    const visivel = elemento.checkVisibility?.({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })
    if (visivel === false && getComputedStyle(elemento).display !== 'contents') return

    if (elemento.matches(marcador)) {
      faixa.selectNodeContents(elemento)
      registrar(elemento.textContent ?? '')
      return
    }

    for (const filho of elemento.childNodes) {
      if (filho instanceof Element) percorrer(filho)
      else if (filho instanceof Text) {
        for (const achado of filho.data.matchAll(moedaOuPercentual)) {
          faixa.setStart(filho, achado.index)
          faixa.setEnd(filho, achado.index + achado[0].length)
          registrar(achado[0])
        }
      }
    }
  }

  for (const filho of quadro.children) percorrer(filho)
  return resultado
}
