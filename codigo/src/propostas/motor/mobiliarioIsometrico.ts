import { PLANTA, SALAS_ISOMETRICAS } from '../../lib/escritorio/plantaIsometrica'
import type { SalaEquipe } from '../../lib/escritorio/equipe'

type Caixa = (cor: number, dimensoes: number[], posicao: number[]) => { rotation: { y: number; z: number } }
const PAREDE = 0xf1eadf,
  MEIA = 0xe6dccd,
  RODAPE = 0xd9cfbf
const MADEIRA = 0xb88d62,
  ESCURA = 0x8a6645,
  CADEIRA = 0x4c525b

/** Pisos, muretas, janelas e objetos do escritório original, em coordenadas de mundo. */
export function montarPredio(cx: Caixa, vidro: Caixa) {
  cx(0xe2dacc, [13, 0.3, 16], [0, -0.15, -2.5])
  cx(0xe2dacc, [7, 0.3, 4.4], [0, -0.15, 7.3])
  cx(PAREDE, [12.4, 2.2, 0.2], [-0.1, 1.1, -10.1])
  cx(PAREDE, [0.2, 2.2, 15.2], [-6.1, 1.1, -2.5])
  cx(RODAPE, [12.2, 0.12, 0.04], [0, 0.06, -9.98])
  cx(RODAPE, [0.04, 0.12, 15], [-5.98, 0.06, -2.5])
  for (const z of [-8.3, -3.3, 3.3]) cx(MEIA, [0.14, 0.7, 3.4], [0, 0.35, z])
  for (const z of [-5, 0]) for (const x of [-3.8, 3.8]) cx(MEIA, [4.4, 0.7, 0.14], [x, 0.35, z])
  for (const x of [-4.6, 4.6]) cx(MEIA, [3, 0.12, 0.12], [x, 0.06, 5])
  cx(MEIA, [0.12, 0.12, 15.2], [6, 0.06, -2.5])
  cx(MEIA, [0.12, 0.5, 4], [-3, 0.25, 7.15])
  cx(MEIA, [0.12, 0.12, 4], [3, 0.06, 7.15])
  cx(MEIA, [6.1, 0.12, 0.12], [0, 0.06, 9.15])
  for (const x of [-4.6, -1.4, 1.4, 4.6]) vidro(0xbfd8e6, [1.3, 0.8, 0.06], [x, 1.45, -9.98])
  for (const z of [-8.2, -3.2, 3.2]) vidro(0xbfd8e6, [0.06, 0.8, 1.3], [-5.98, 1.45, z])
  for (const sala of SALAS_ISOMETRICAS) {
    const p = PLANTA[sala]
    const local: Caixa = (cor, d, [x, y, z]) => cx(cor, d, [p.x + x, y, p.z + z])
    montarSala(sala, local)
  }
}

/** Cada página do laboratório mostra uma sala sobre sua própria base. */
export function montarSala(sala: SalaEquipe, cx: Caixa, isolada = false) {
  const p = PLANTA[sala]
  const fundo = isolada ? Math.min(4.15, p.fundo) : p.fundo
  if (isolada) {
    cx(0xd1bda8, [6.02, 0.24, fundo], [0, -0.12, 0])
    cx(PAREDE, [5.9, 0.77, 0.1], [0, 0.415, -fundo / 2 + 0.05])
    cx(0xd1bda8, [5.9, 0.06, 0.13], [0, 0.83, -fundo / 2 + 0.05])
  }
  cx(p.piso, [5.9, 0.04, fundo - 0.1], [0, 0.02, 0])
  cx(p.tapete, [5.2, 0.02, p.fundo === 5 ? 1.25 : 1], [-0.3, 0.05, isolada ? 1.18 : p.fundo === 5 ? 1.45 : 1.2])
  decorar(
    sala,
    isolada
      ? (cor, [l, a, f], [x, y, z]) =>
          z < 0
            ? cx(cor, [l, a, f], [x, y, z * 0.82])
            : cx(cor, [l * 0.78, a * 0.59, f * 0.76], [x, y * 0.59 + 0.03, z * 0.74])
      : cx,
  )
}

function decorar(sala: SalaEquipe, cx: Caixa) {
  const vasoX = sala === 'cartoes' ? 2.55 : -2.6,
    vasoZ = sala === 'recepcao' ? 1.5 : 2.05
  cx(0xc9b8a0, [0.34, 0.3, 0.34], [vasoX, 0.15, vasoZ])
  cx(0x5e8a62, [0.5, 0.34, 0.5], [vasoX, 0.52, vasoZ])
  cx(0x5e8a62, [0.34, 0.3, 0.34], [vasoX + 0.04, 0.8, vasoZ - 0.03])
  const lampX = sala === 'cartoes' ? -2.75 : 2.75,
    lampZ = sala === 'recepcao' ? -1.5 : sala === 'cartoes' ? 2.2 : -2.2
  cx(0x55504a, [0.2, 0.04, 0.2], [lampX, 0.06, lampZ])
  cx(0x55504a, [0.05, 1.3, 0.05], [lampX, 0.65, lampZ])
  cx(0xf6e7c6, [0.36, 0.3, 0.36], [lampX, 1.42, lampZ])
  switch (sala) {
    case 'caixa':
      cx(0x6c727a, [0.9, 1, 0.7], [2.3, 0.5, 1.95])
      cx(0x8a9098, [0.5, 0.6, 0.04], [2.3, 0.52, 2.32])
      cx(0xd8c27a, [0.12, 0.12, 0.06], [2.46, 0.52, 2.35])
      break
    case 'casa':
      cx(0xc49a62, [0.7, 0.36, 0.5], [2.45, 0.22, 2.05])
      cx(0xc0563f, [0.2, 0.2, 0.2], [2.3, 0.46, 2])
      cx(0x6e9a58, [0.2, 0.22, 0.2], [2.56, 0.47, 2.1])
      cx(0xe0b040, [0.16, 0.16, 0.16], [2.42, 0.46, 2.2])
      break
    case 'cartoes':
      cx(ESCURA, [0.6, 0.24, 1.5], [2.63, 0.12, 0.43])
      cx(0x2e3440, [0.06, 0.7, 1.1], [2.53, 0.75, 0.18])
      cx(0xc9b27a, [0.02, 0.1, 1.1], [2.565, 0.9, 0.18])
      cx(0x7a5c8a, [0.06, 0.7, 1.1], [2.77, 0.6, 0.73])
      cx(0xe9e2d4, [0.02, 0.1, 1.1], [2.805, 0.75, 0.73])
      break
    case 'patrimonio':
      cx(ESCURA, [1.3, 0.4, 0.9], [2.26, 0.2, 0.41])
      cx(PAREDE, [0.42, 0.34, 0.42], [1.95, 0.57, 0.39])
      cx(0xd8d2c6, [0.36, 0.7, 0.36], [2.57, 0.75, 0.33])
      ;[0.25, 0.45, 0.7].forEach((h, i) => cx(0x7e9a86, [0.2, h, 0.2], [2 + i * 0.28, h / 2 + 0.04, 1.95]))
      break
    case 'recepcao':
      cx(0x7c8a93, [1.5, 0.3, 0.6], [1.9, 0.2, 1.3])
      cx(0x6b7881, [1.5, 0.5, 0.14], [1.9, 0.45, 1.62])
      for (const x of [1.2, 2.6]) cx(0x6b7881, [0.14, 0.42, 0.6], [x, 0.3, 1.3])
      break
    case 'gestao':
      cx(MADEIRA, [1.4, 0.5, 0.45], [2, 0.29, 1.8])
      cx(0x3f5873, [1.3, 0.64, 0.08], [2, 0.85, 1.88])
      cx(0x9fa8b3, [1.1, 0.45, 0.02], [2, 0.85, 1.93])
      break
    case 'apoio':
      cx(ESCURA, [1.45, 0.66, 0.52], [2, 0.37, 1.7])
      cx(0x8e949c, [0.6, 0.42, 0.06], [2, 0.9, 1.75])
      for (const x of [1.57, 2.45]) cx(0xa97252, [0.25, 0.22, 0.28], [x, 0.8, 1.7])
  }
}

export function montarMesa(cx: Caixa, oval: Caixa, comPlanta: boolean) {
  cx(MADEIRA, [1.44, 0.073, 0.76], [0, 0.6, 0.65])
  cx(ESCURA, [1.38, 0.07, 0.05], [0, 0.55, 0.99])
  for (const x of [-0.64, 0.64]) for (const z of [0.34, 0.97]) cx(ESCURA, [0.07, 0.57, 0.07], [x, 0.285, z])
  cx(CADEIRA, [0.49, 0.032, 0.198], [0, 0.649, 0.44])
  for (const z of [0.392, 0.443, 0.494]) cx(0xa5ab9b, [0.418, 0.009, 0.015], [0, 0.667, z])
  cx(0xede6d7, [0.196, 0.012, 0.21], [0.437, 0.646, 0.7]).rotation.y = -0.17
  cx(0xa6a896, [0.117, 0.009, 0.012], [0.43, 0.655, 0.703]).rotation.y = -0.17
  // Caneca com a boca e o fundo do café visíveis na vista superior.
  oval(0xf5eadb, [0.143, 0.157, 0.143], [0.545, 0.713, 0.376])
  oval(0x645040, [0.097, 0.025, 0.097], [0.545, 0.785, 0.376])
  cx(0xf5eadb, [0.053, 0.067, 0.025], [0.62, 0.724, 0.376])
  if (comPlanta) {
    cx(0xa49178, [0.143, 0.132, 0.143], [0.58, 0.703, 0.923])
    oval(0x667a53, [0.163, 0.245, 0.143], [0.58, 0.833, 0.923]).rotation.z = 0.31
    oval(0x849173, [0.132, 0.177, 0.123], [0.627, 0.807, 0.91]).rotation.z = -0.55
  }
}

export function montarCadeira(cx: Caixa, oval: Caixa) {
  cx(0x464b43, [0.08, 0.2, 0.08], [0, 0.142, 0])
  cx(0x464b43, [0.52, 0.045, 0.065], [0, 0.045, 0])
  cx(0x464b43, [0.065, 0.045, 0.51], [0, 0.045, 0])
  oval(CADEIRA, [0.562, 0.115, 0.504], [0, 0.265, 0])
  cx(0x464b43, [0.065, 0.35, 0.067], [0, 0.42, -0.225])
  oval(0x637063, [0.57, 0.416, 0.126], [0, 0.526, -0.243])
  for (const x of [-0.272, 0.272]) {
    cx(0x464b43, [0.055, 0.16, 0.055], [x, 0.346, -0.037])
    oval(CADEIRA, [0.085, 0.062, 0.29], [x, 0.423, -0.045])
  }
}
