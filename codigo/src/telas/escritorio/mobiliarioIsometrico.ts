import { PLANTA, SALAS_ISOMETRICAS } from './plantaIsometrica'
import type { SalaEquipe } from './equipe'

type Caixa = (cor: number, dimensoes: number[], posicao: number[]) => { rotation: { y: number; z: number } }
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
      cx(ESCURA, [.6, .24, 1.5], [2.63, .12, .43])
      cx(0x2E3440, [.06, .7, 1.1], [2.53, .75, .18])
      cx(0xC9B27A, [.02, .1, 1.1], [2.565, .9, .18])
      cx(0x7A5C8A, [.06, .7, 1.1], [2.77, .6, .73])
      cx(0xE9E2D4, [.02, .1, 1.1], [2.805, .75, .73])
      break
    case 'patrimonio':
      cx(ESCURA, [1.3, .4, .9], [2.26, .2, .41])
      cx(PAREDE, [.42, .34, .42], [1.95, .57, .39])
      cx(0xD8D2C6, [.36, .7, .36], [2.57, .75, .33])
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

export function montarMesa(cx: Caixa, oval: Caixa, comPlanta: boolean) {
  cx(MADEIRA, [1.44, .073, .76], [0, .6, .65])
  cx(ESCURA, [1.38, .07, .05], [0, .55, .99])
  for (const x of [-.64, .64]) for (const z of [.34, .97]) cx(ESCURA, [.07, .57, .07], [x, .285, z])
  cx(CADEIRA, [.49, .032, .198], [0, .649, .44])
  for (const z of [.392, .443, .494]) cx(0xA5AB9B, [.418, .009, .015], [0, .667, z])
  cx(0xEDE6D7, [.196, .012, .21], [.437, .646, .7]).rotation.y = -.17
  cx(0xA6A896, [.117, .009, .012], [.43, .655, .703]).rotation.y = -.17
  // Caneca com a boca e o fundo do café visíveis na vista superior.
  oval(0xF5EADB, [.143, .157, .143], [.545, .713, .376])
  oval(0x645040, [.097, .025, .097], [.545, .785, .376])
  cx(0xF5EADB, [.053, .067, .025], [.62, .724, .376])
  if (comPlanta) {
    cx(0xA49178, [.143, .132, .143], [.58, .703, .923])
    oval(0x667A53, [.163, .245, .143], [.58, .833, .923]).rotation.z = .31
    oval(0x849173, [.132, .177, .123], [.627, .807, .91]).rotation.z = -.55
  }
}

export function montarCadeira(cx: Caixa, oval: Caixa) {
  cx(0x464B43, [.08, .2, .08], [0, .142, 0])
  cx(0x464B43, [.52, .045, .065], [0, .045, 0])
  cx(0x464B43, [.065, .045, .51], [0, .045, 0])
  oval(CADEIRA, [.562, .115, .504], [0, .265, 0])
  cx(0x464B43, [.065, .35, .067], [0, .42, -.225])
  oval(0x637063, [.57, .416, .126], [0, .526, -.243])
  for (const x of [-.272, .272]) {
    cx(0x464B43, [.055, .16, .055], [x, .346, -.037])
    oval(CADEIRA, [.085, .062, .29], [x, .423, -.045])
  }
}
