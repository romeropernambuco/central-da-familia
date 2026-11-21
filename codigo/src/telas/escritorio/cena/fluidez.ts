import { MedidorFPS } from '../cenaBase'

/**
 * Vigia a fluidez: mede as imagens por segundo uma vez por segundo e, se ficar abaixo de 24 por quatro medidas
 * seguidas, sobe um degrau do modo leve (até 3). Quem montou a cena decide o que cada degrau desliga.
 */
export function criarFluidez(aoSubirDegrau: (degrau: number) => void, aoMedir?: (fps: number, degrau: number) => void) {
  const medidor = new MedidorFPS()
  const hist: number[] = []
  let fps = 0,
    baixo = 0,
    degrau = 0
  return {
    get fps() {
      return fps
    },
    get degrau() {
      return degrau
    },
    /** As últimas 60 medidas. */
    historico: () => hist.slice(),
    pausar() {
      medidor.pausar()
      baixo = 0
    },
    /** Chamado a cada quadro desenhado. */
    quadro(agora: number) {
      const amostra = medidor.quadro(agora)
      if (amostra === null) return
      fps = amostra
      hist.push(fps)
      if (hist.length > 60) hist.shift()
      if (fps >= 24) baixo = 0
      else if (++baixo >= 4 && degrau < 3) {
        degrau++
        baixo = 0
        aoSubirDegrau(degrau)
      }
      aoMedir?.(fps, degrau)
    },
  }
}
