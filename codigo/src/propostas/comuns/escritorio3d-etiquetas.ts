import type { PostoProjetado } from '../../telas/escritorio/cenaIsometrica'

interface Posicao { x: number; y: number }

/** Distribui os alvos transparentes sem sobrepor as áreas de toque. */
export function distribuirEtiquetas(postos: readonly PostoProjetado[], largura: number, altura: number) {
  const passo = 46
  const margem = passo / 2
  const vagas: Posicao[] = []
  for (let y = margem; y <= altura - margem; y += passo) {
    for (let x = margem; x <= largura - margem; x += passo) vagas.push({ x, y })
  }
  const ordem = [...postos].sort((a, b) => Number(b.chama) - Number(a.chama))

  function distribuir(livre: boolean) {
    const ocupadas = new Map<string, Posicao>()
    for (const posto of ordem) {
      const perto = {
        x: Math.max(margem, Math.min(largura - margem, posto.x)),
        y: Math.max(margem, Math.min(altura - margem, posto.y)),
      }
      const distancia = (p: Posicao) => (p.x - posto.x) ** 2 + (p.y - posto.y) ** 2
      const opcoes = livre ? [perto, ...vagas] : vagas
      const melhor = opcoes.reduce<Posicao | undefined>((melhor, p) => {
        if (melhor && distancia(melhor) <= distancia(p)) return melhor
        for (const outra of ocupadas.values()) {
          if (Math.abs(outra.x - p.x) < passo && Math.abs(outra.y - p.y) < passo) return melhor
        }
        return p
      }, undefined)
      if (melhor) ocupadas.set(posto.id, melhor)
    }
    return ocupadas
  }

  const livres = distribuir(true)
  return livres.size === postos.length ? livres : distribuir(false)
}
