/** Quanto dura a comemoração antes de o funcionário voltar ao trabalho, em milissegundos. */
const COMEMORACAO = 1600

/**
 * Com movimento reduzido não há laço de animação, então a volta ao trabalho depois de "resolvido" é um temporizador.
 * Ele só conta tempo de cena visível: se a aba some ou o desenho se perde, o relógio para e continua depois.
 */
export function criarRetornos(pode: () => boolean, voltar: (id: string) => void) {
  const retornos = new Map<string, { timer?: ReturnType<typeof setTimeout>; restante: number; inicio: number }>()
  function sincronizar() {
    retornos.forEach((r, id) => {
      const rodando = pode()
      if (!rodando && r.timer !== undefined) {
        clearTimeout(r.timer)
        r.timer = undefined
        r.restante = Math.max(0, r.restante - (performance.now() - r.inicio))
      }
      if (rodando && r.timer === undefined) {
        r.inicio = performance.now()
        r.timer = setTimeout(() => {
          retornos.delete(id)
          voltar(id)
        }, r.restante)
      }
    })
  }
  return {
    sincronizar,
    agendar(id: string) {
      retornos.set(id, { restante: COMEMORACAO, inicio: 0 })
      sincronizar()
    },
    cancelar(id: string) {
      clearTimeout(retornos.get(id)?.timer)
      retornos.delete(id)
    },
    limpar() {
      retornos.forEach(r => clearTimeout(r.timer))
      retornos.clear()
    },
  }
}
