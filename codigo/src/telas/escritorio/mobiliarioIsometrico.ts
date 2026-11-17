import { PLANTA, SALAS_ISOMETRICAS } from './plantaIsometrica'
import type { SalaEquipe } from './equipe'

type Caixa = (cor: number, dimensoes: number[], posicao: number[]) => void
const PAREDE = 0xF1EADF, MEIA = 0xE6DCCD, RODAPE = 0xD9CFBF
const MADEIRA = 0xB88D62, ESCURA = 0x8A6645, CADEIRA = 0x4C525B

/** Pisos, muretas, janelas e objetos do escritório original, em coordenadas de mundo. */
export function montarPredio(cx: Caixa, vidro: Caixa) {
  cx(0xE2DACC, [13, .3, 16], [0, -.15, -2.5])
  cx(0xE2DACC, [7, .3, 4.4], [0, -.15, 7.3])
  cx(PAREDE, [12.4, 2.2, .2], [-.1, 1.1, -10.1])
  cx(PAREDE, [.2, 2.2, 15.2], [-6.1, 1.1, -2.5])
  cx(RODAPE, [12.2, .12, .04], [0, .06, -9.98])
  cx(RODAPE, [.04, .12, 15], [-5.98, .06, -2.5])
  for (const z of [-8.3, -3.3, 3.3]) cx(MEIA, [.14, .7, 3.4], [0, .35, z])
  for (const z of [-5, 0]) for (const x of [-3.8, 3.8]) cx(MEIA, [4.4, .7, .14], [x, .35, z])
  for (const x of [-4.6, 4.6]) cx(MEIA, [3, .12, .12], [x, .06, 5])
  cx(MEIA, [.12, .12, 15.2], [6, .06, -2.5])
  cx(MEIA, [.12, .5, 4], [-3, .25, 7.15])
  cx(MEIA, [.12, .12, 4], [3, .06, 7.15])
  cx(MEIA, [6.1, .12, .12], [0, .06, 9.15])
  for (const x of [-4.6, -1.4, 1.4, 4.6]) vidro(0xBFD8E6, [1.3, .8, .06], [x, 1.45, -9.98])
  for (const z of [-8.2, -3.2, 3.2]) vidro(0xBFD8E6, [.06, .8, 1.3], [-5.98, 1.45, z])
  for (const sala of SALAS_ISOMETRICAS) {
    const p = PLANTA[sala]
    const local: Caixa = (cor, d, [x, y, z]) => cx(cor, d, [p.x + x, y, p.z + z])
    local(p.piso, [5.9, .04, p.fundo - .1], [0, .02, 0])
    local(p.tapete, [5.2, .02, p.fundo === 5 ? 1.25 : 1], [-.3, .05, p.fundo === 5 ? 1.45 : 1.2])
    decorar(sala, local)
  }
}

function decorar(sala: SalaEquipe, cx: Caixa) {
  const vasoX = sala === 'cartoes' ? 2.55 : -2.6, vasoZ = sala === 'recepcao' ? 1.5 : 2.05
  cx(0xC9B8A0, [.34, .3, .34], [vasoX, .15, vasoZ])
  cx(0x5E8A62, [.5, .34, .5], [vasoX, .52, vasoZ])
  cx(0x5E8A62, [.34, .3, .34], [vasoX + .04, .8, vasoZ - .03])
  const lampX = sala === 'cartoes' ? -2.75 : 2.75, lampZ = sala === 'recepcao' ? -1.5 : sala === 'cartoes' ? 2.2 : -2.2
  cx(0x55504A, [.2, .04, .2], [lampX, .06, lampZ])
  cx(0x55504A, [.05, 1.3, .05], [lampX, .65, lampZ])
  cx(0xF6E7C6, [.36, .3, .36], [lampX, 1.42, lampZ])
  switch (sala) {
    case 'caixa':
      cx(0x6C727A, [.9, 1, .7], [2.3, .5, 1.95])
      cx(0x8A9098, [.5, .6, .04], [2.3, .52, 2.32])
      cx(0xD8C27A, [.12, .12, .06], [2.46, .52, 2.35])
      break
    case 'casa':
      cx(0xC49A62, [.7, .36, .5], [2.45, .22, 2.05])
      cx(0xC0563F, [.2, .2, .2], [2.3, .46, 2])
      cx(0x6E9A58, [.2, .22, .2], [2.56, .47, 2.1])
      cx(0xE0B040, [.16, .16, .16], [2.42, .46, 2.2])
      break
    case 'cartoes':
      cx(ESCURA, [.6, .24, 1.5], [2.4, .12, -1.5])
      cx(0x2E3440, [.06, .7, 1.1], [2.3, .75, -1.75])
      cx(0xC9B27A, [.02, .1, 1.1], [2.335, .9, -1.75])
      cx(0x7A5C8A, [.06, .7, 1.1], [2.55, .6, -1.2])
      cx(0xE9E2D4, [.02, .1, 1.1], [2.585, .75, -1.2])
      break
    case 'patrimonio':
      cx(ESCURA, [1.3, .4, .9], [2.1, .2, -1.7])
      cx(PAREDE, [.42, .34, .42], [1.8, .57, -1.72])
      cx(0xD8D2C6, [.36, .7, .36], [2.42, .75, -1.78])
      ;[.25, .45, .7].forEach((h, i) => cx(0x7E9A86, [.2, h, .2], [2 + i * .28, h / 2 + .04, 1.95]))
      break
    case 'recepcao':
      cx(0x7C8A93, [1.5, .3, .6], [1.9, .2, 1.3])
      cx(0x6B7881, [1.5, .5, .14], [1.9, .45, 1.62])
      for (const x of [1.2, 2.6]) cx(0x6B7881, [.14, .42, .6], [x, .3, 1.3])
      break
    case 'gestao':
      cx(MADEIRA, [1.4, .5, .45], [2, .29, 1.8])
      cx(0x3F5873, [1.3, .64, .08], [2, .85, 1.88])
      cx(0x9FA8B3, [1.1, .45, .02], [2, .85, 1.93])
      break
    case 'apoio':
      cx(ESCURA, [1.45, .66, .52], [2, .37, 1.7])
      cx(0x8E949C, [.6, .42, .06], [2, .9, 1.75])
      for (const x of [1.57, 2.45]) cx(0xA97252, [.25, .22, .28], [x, .8, 1.7])
  }
}

export function montarMesa(cx: Caixa, cadeira: boolean) {
  cx(MADEIRA, [1.37, .06, .68], [0, .6, .58])
  for (const x of [-.62, .62]) for (const z of [.28, .87]) cx(ESCURA, [.06, .57, .06], [x, .285, z])
  cx(0xF1EADF, [.09, .11, .09], [.59, .685, .42])
  if (!cadeira) return
  cx(CADEIRA, [.44, .06, .44], [0, .21, 0])
  cx(CADEIRA, [.44, .5, .06], [0, .5, -.22])
  cx(0x33373D, [.07, .18, .07], [0, .09, 0])
  cx(0x33373D, [.4, .03, .4], [0, .015, 0])
}
