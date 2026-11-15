export type AtalhoGuardado = 'nova' | 'aporte' | 'resgate'
const ouvintes = new Set<(tipo: AtalhoGuardado) => void>()
export function ouvirAtalhoGuardado(abrir: (tipo: AtalhoGuardado) => void) {
  ouvintes.add(abrir)
  return () => { ouvintes.delete(abrir) }
}
export function abrirAtalhoGuardado(evento: { preventDefault(): void }, tipo: AtalhoGuardado) {
  if (!ouvintes.size) return // A navegação normal abre a tela e consome a URL.
  evento.preventDefault()
  ouvintes.forEach(abrir => abrir(tipo))
}
