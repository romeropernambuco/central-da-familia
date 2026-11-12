// O que a tela do Escritório precisa saber da cena sem carregar nada de 3D: nomes das salas, tipos e o teste de WebGL.
export type EstadoCena = 'fila' | 'trabalhando' | 'entregue' | 'precisa'
export interface FuncCena { id: string; sala: string; estado: EstadoCena }
export interface OpcoesCena {
  funcionarios: FuncCena[]
  /** etiqueta (botão em HTML) de cada funcionário e nome de cada sala: a cena só posiciona */
  etiqueta: (id: string) => HTMLElement | null
  placa: (sala: string) => HTMLElement | null
  aoTocar: (id: string) => void
  escuro: boolean
  celular: () => boolean
  /** hora de Recife, 0 a 24 (o sol da cena acompanha) */
  hora: () => number
  /** 1 vez por segundo: imagens por segundo e o degrau do modo leve (0 = cheio, 3 = o mais leve) */
  aoMedir?: (fps: number, degrau: number) => void
  parado?: boolean
}
export interface Cena {
  atualizar(f: FuncCena[]): void
  selecionar(id: string | null): void
  irPara(vista: string): void
  tema(escuro: boolean): void
  medir(): { fps: number; degrau: number; hist: number[]; ms: number; desenhos: number; triangulos: number }
  destruir(): void
}

/** As 5 salas, na ordem dos botões. A geometria de cada uma está em cena3d.ts. */
export const SALAS_NOME: Record<string, string> = { caixa: 'Caixa', casa: 'Casa', cartoes: 'Cartões', patrimonio: 'Patrimônio', recepcao: 'Recepção' }

export function temWebGL(): boolean {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))) } catch { return false }
}
