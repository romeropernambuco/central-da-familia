import type { SalaEquipe } from './equipe'

/** Planta do escritório de paineis/escritorio3d, com a ala nova ao fundo. */
export const PLANTA: Record<SalaEquipe, { x: number; z: number; fundo: number; piso: number; tapete: number }> = {
  caixa: { x: -3, z: -2.5, fundo: 5, piso: 0xdcc9aa, tapete: 0xb9a98c },
  casa: { x: 3, z: -2.5, fundo: 5, piso: 0xe4d8c4, tapete: 0xa9b19a },
  cartoes: { x: -3, z: 2.5, fundo: 5, piso: 0xd2c4ad, tapete: 0x9fa8b3 },
  patrimonio: { x: 3, z: 2.5, fundo: 5, piso: 0xdfcfb4, tapete: 0xc2a98a },
  recepcao: { x: 0, z: 7.15, fundo: 4, piso: 0xe1d3bc, tapete: 0xb4a89a },
  gestao: { x: -3, z: -7.5, fundo: 5, piso: 0xdfd1ac, tapete: 0xbab095 },
  apoio: { x: 3, z: -7.5, fundo: 5, piso: 0xccd4c4, tapete: 0x9bb1a6 },
}

export const SALAS_ISOMETRICAS = Object.keys(PLANTA) as SalaEquipe[]
export type VistaIsometrica = 'tudo' | SalaEquipe
