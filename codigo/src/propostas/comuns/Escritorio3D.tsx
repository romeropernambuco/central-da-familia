import { EscritorioMaquete, type PropsEscritorioMaquete } from './EscritorioMaquete'

/** Ponto de encaixe estavel do escritorio 3D das propostas. Mesma API da maquete SVG.
 * Hoje delega a maquete; a frente f60 troca o miolo por Three.js (com fallback SVG).
 * Quem consome nunca precisa mudar. */
export interface PropsEscritorio3D extends PropsEscritorioMaquete {
  altura?: number
}

export function Escritorio3D({ altura: _altura, ...resto }: PropsEscritorio3D) {
  return <EscritorioMaquete {...resto} />
}
