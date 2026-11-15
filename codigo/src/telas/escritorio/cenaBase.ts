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
  aoContexto?: (estado: 'perdido' | 'restaurado' | 'falhou') => void
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

/** Salas na ordem dos botões. A geometria de cada uma está em cena3d.ts. */
export const SALAS_NOME: Record<string, string> = { caixa: 'Caixa', casa: 'Casa', cartoes: 'Cartões', patrimonio: 'Patrimônio', recepcao: 'Recepção', gestao: 'Gestão', apoio: 'Apoio' }

export function temWebGL(): boolean {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))) } catch { return false }
}

/** Mede intervalos reais; o primeiro frame e as pausas n?o s?o amostras. */
export class MedidorFPS {
  private ultimo: number | null = null
  private aquecimento = 0
  private tempo = 0
  private frames = 0
  pausar() { this.ultimo = null; this.tempo = 0; this.frames = 0 }
  quadro(agora: number): number | null {
    const anterior = this.ultimo; this.ultimo = agora
    if (anterior === null) return null
    const dt = agora - anterior
    if (dt <= 0) return null
    if (this.aquecimento < 3000) { this.aquecimento += dt; return null }
    this.tempo += dt; this.frames++
    if (this.tempo < 1000) return null
    const fps = Math.round(this.frames * 1000 / this.tempo)
    this.tempo = 0; this.frames = 0
    return fps
  }
}

/** Cada import tem sua pr?pria validade, inclusive depois do timeout. */
export function tentarCarregarCena<T>(carregar: () => Promise<T>, montar: (modulos: T) => void, falhar: () => void): () => void {
  let valida = true
  const cancelar = () => { valida = false; clearTimeout(timeout) }
  const timeout = setTimeout(() => { if (valida) { cancelar(); falhar() } }, 8000)
  carregar().then(modulos => {
    if (!valida) return
    clearTimeout(timeout)
    try { montar(modulos) } catch { cancelar(); falhar() }
  }).catch(() => { if (valida) { cancelar(); falhar() } })
  return cancelar
}

export const abaDoHash = (hash: string): 'hoje' | 'lembretes' | 'relatorio' => { const aba = new URLSearchParams(hash.split('?')[1] || '').get('aba'); return aba === 'lembretes' || aba === 'relatorio' ? aba : 'hoje' }
