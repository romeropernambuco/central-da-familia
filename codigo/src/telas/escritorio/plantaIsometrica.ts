import type { SalaEquipe } from './equipe'

/** Planta do escritório de paineis/escritorio3d, com a ala nova ao fundo. */
export const PLANTA: Record<SalaEquipe, { x: number; z: number; fundo: number; piso: number; tapete: number }> = {
  caixa: { x: -3, z: -2.5, fundo: 5, piso: 0xDCC9AA, tapete: 0xB9A98C },
  casa: { x: 3, z: -2.5, fundo: 5, piso: 0xE4D8C4, tapete: 0xA9B19A },
  cartoes: { x: -3, z: 2.5, fundo: 5, piso: 0xD2C4AD, tapete: 0x9FA8B3 },
  patrimonio: { x: 3, z: 2.5, fundo: 5, piso: 0xDFCFB4, tapete: 0xC2A98A },
  recepcao: { x: 0, z: 7.15, fundo: 4, piso: 0xE1D3BC, tapete: 0xB4A89A },
  gestao: { x: -3, z: -7.5, fundo: 5, piso: 0xDFD1AC, tapete: 0xBAB095 },
  apoio: { x: 3, z: -7.5, fundo: 5, piso: 0xCCD4C4, tapete: 0x9BB1A6 },
}

export const SALAS_ISOMETRICAS = Object.keys(PLANTA) as SalaEquipe[]
export type VistaIsometrica = 'tudo' | SalaEquipe
