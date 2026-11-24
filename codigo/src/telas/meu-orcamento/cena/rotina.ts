/* eslint-disable @typescript-eslint/no-explicit-any */
// A rotina de cada funcionário da sala do Meu orçamento: trabalha no posto, anda até outro ponto, faz algo lá e volta.
// Andar, sentar e acenar são os do motor do Escritório (cena/movimento.ts); aqui só fica a ordem das etapas.
import { HIP_PE } from '../../escritorio/cena/boneco'
import { acenar, andar, pose, sentar } from '../../escritorio/cena/movimento'

export interface Ponto {
  x: number
  z: number
}
/** Por onde um funcionário anda. Os ângulos são para onde ele olha (0 = para a frente da sala). */
export interface Rotina {
  id: string
  posto: Ponto
  giroPosto: number
  /** trabalha sentado (mesa e cadeira do motor) ou de pé */
  sentado: boolean
  /** pontos de passagem entre o posto e a visita, para não atravessar móvel */
  saida: Ponto[]
  visita: Ponto
  giroVisita: number
  /** o passo à frente quando a pessoa toca nele */
  frente: Ponto
  tempoPosto: number
  tempoVisita: number
  /** leva algo nas mãos na ida (caixa, papel) */
  carrega: boolean
}
export type Etapa = 'posto' | 'ida' | 'visita' | 'volta' | 'frente' | 'acenando' | 'retorno'

/** Quanto tempo o funcionário acena depois de chamado, em segundos. */
export const TEMPO_ACENO = 2.6

const DE_PE = {
  hy: HIP_PE,
  hx: 0,
  cx: 0,
  cy: 0,
  lx: 0,
  lz: 0,
  le: -0.15,
  rx: 0,
  rz: 0,
  re: -0.15,
  rez: 0,
  tl: 0,
  kl: 0,
  tr: 0,
  kr: 0,
}
type Gesto = (ph: number, a: number) => Record<string, number>
const s = Math.sin

/** O trabalho de cada um no posto, por cima da pose de pé (ou sentada). `a` é 0 com "reduzir movimento". */
const NO_POSTO: Record<string, Gesto> = {
  // conta as moedas da sobra na mesa
  tesoureira: (ph, a) => ({
    hx: 0.08,
    cx: 0.16,
    cy: 0.1 + a * s(ph) * 0.2,
    lx: -0.8,
    le: -1.2 + a * Math.cos(ph * 2) * 0.2,
    rx: -0.7,
    re: -1.5,
  }),
  // aponta o quadro e olha para a sala
  analista: (ph, a) => ({
    lz: -1.75 + a * s(ph * 0.8) * 0.18,
    le: 0,
    rx: -0.5,
    re: -1.3,
    cy: -0.45 + a * s(ph * 0.4) * 0.4,
  }),
  // confere as caixas pela lista
  comprador: (ph, a) => ({
    lx: -0.9,
    le: -1.6,
    rx: -0.75,
    re: -1.1 + a * s(ph * 4) * 0.1,
    cx: 0.3,
    cy: -0.2 + a * s(ph * 1.6) * 0.2,
  }),
}
/** O que cada um faz no outro ponto da rota. */
const NA_VISITA: Record<string, Gesto> = {
  // entrega a anotação de hoje na mesa da tesoureira
  assistente: () => ({ hx: 0.12, cx: 0.15, rx: -1.1, re: -0.35, lx: -0.2, le: -0.4 }),
  // gira o mostrador do cofre
  tesoureira: (ph, a) => ({ rx: -1.2, re: -0.3, rez: a * s(ph * 3) * 0.4, lx: -0.5, le: -1.1, cx: 0.1 }),
  // procura um relatório na estante
  analista: (ph, a) => ({ lx: -1.35 + a * s(ph * 2) * 0.2, le: -0.3, rx: -1, re: -0.9, cx: -0.1 }),
  // pousa a caixa na mesinha
  comprador: () => ({ hx: 0.4, cx: 0.2, lx: -0.9, le: -0.3, rx: -0.9, re: -0.3 }),
}

/** Vira o corpo aos poucos para o ângulo pedido, pelo lado mais curto. */
function virar(ch: any, angulo: number, dt: number) {
  let d = angulo - ch.b.r.rotation.y
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  ch.b.r.rotation.y += d * Math.min(1, dt * 8)
}

function partir(ch: any, etapa: Etapa, caminho: Ponto[]) {
  ch.etapa = etapa
  ch.dest = etapa
  ch.path = caminho.slice()
}

/** Chegou ao fim de um trecho andando: começa o que se faz naquele lugar. */
function chegar(ch: any) {
  const r: Rotina = ch.rotina
  if (ch.etapa === 'ida') {
    ch.etapa = 'visita'
    ch.relogio = r.tempoVisita
  } else if (ch.etapa === 'frente') {
    ch.etapa = 'acenando'
    ch.aceno = TEMPO_ACENO
  } else {
    ch.etapa = 'posto'
    ch.relogio = r.tempoPosto
  }
}

/** A pessoa tocou nele: quem está no posto dá um passo à frente; quem está no meio da rota acena onde está. */
function atenderPedido(ch: any) {
  const r: Rotina = ch.rotina
  ch.pedido = false
  if (ch.etapa === 'posto' || ch.etapa === 'retorno') partir(ch, 'frente', [r.frente])
  else if (ch.etapa === 'ida' || ch.etapa === 'volta' || ch.etapa === 'visita') {
    ch.antes = ch.etapa
    ch.etapa = 'acenando'
    ch.aceno = TEMPO_ACENO
  } else if (ch.etapa === 'acenando') ch.aceno = TEMPO_ACENO
}

function trabalharNoPosto(ch: any, dt: number, a: number, ph: number) {
  const r: Rotina = ch.rotina
  if (r.sentado) {
    const base = sentar(ch, r.id === 'assistente' ? 'trabalhando' : 'fila', dt, a, ph)
    return Object.assign(base, NO_POSTO[r.id]?.(ph, a))
  }
  virar(ch, r.giroPosto, dt)
  return { ...DE_PE, ...NO_POSTO[r.id]?.(ph, a) }
}

function visitar(ch: any, dt: number, ph: number) {
  const r: Rotina = ch.rotina
  ch.relogio -= dt
  virar(ch, r.giroVisita, dt)
  // na metade da visita, o que veio nas mãos fica lá
  if (ch.levando && ch.relogio < r.tempoVisita / 2) {
    ch.levando = false
    ch.entregue = true
  }
  if (ch.relogio <= 0) partir(ch, 'volta', [...r.saida.slice().reverse(), r.posto])
  return { ...DE_PE, ...NA_VISITA[r.id]?.(ph, 1) }
}

function acenarParaVoce(ch: any, dt: number, ph: number) {
  ch.aceno -= dt
  if (ch.aceno <= 0) {
    if (ch.antes) {
      ch.etapa = ch.antes
      ch.antes = null
    } else partir(ch, 'retorno', [ch.rotina.posto])
  }
  return acenar(ch, dt, 1, ph)
}

function caminhar(ch: any, dt: number, ph: number) {
  const alvo: any = andar(ch, dt, ph)
  if (ch.levando) Object.assign(alvo, { lx: -0.95, rx: -0.95, le: -0.7, re: -0.7 })
  if (!ch.path) chegar(ch)
  return alvo
}

/** Põe o funcionário no posto, na pose de trabalho, sem animação (montagem e "reduzir movimento"). */
export function fixarNoPosto(ch: any) {
  const r: Rotina = ch.rotina
  ch.etapa = 'posto'
  ch.path = null
  ch.antes = null
  ch.pedido = false
  ch.levando = false
  ch.b.r.position.x = r.posto.x
  ch.b.r.position.z = r.posto.z
  ch.b.r.rotation.y = r.sentado ? 0 : r.giroPosto
  pose(ch, trabalharNoPosto(ch, 1, 0, ch.fase), 1)
}

/** Um quadro da rotina de um funcionário. `t` é o tempo da cena e `dt` o do quadro, em segundos. */
export function avancarRotina(ch: any, t: number, dt: number, reduz: boolean) {
  if (reduz) {
    fixarNoPosto(ch)
    return
  }
  const r: Rotina = ch.rotina,
    ph = t + ch.fase
  if (ch.pedido) atenderPedido(ch)
  let alvo: any
  if (ch.etapa === 'posto') {
    ch.relogio -= dt
    alvo = trabalharNoPosto(ch, dt, 1, ph)
    if (ch.relogio <= 0) {
      ch.levando = r.carrega
      ch.entregue = false
      partir(ch, 'ida', [...r.saida, r.visita])
    }
  } else if (ch.etapa === 'visita') alvo = visitar(ch, dt, ph)
  else if (ch.etapa === 'acenando') alvo = acenarParaVoce(ch, dt, ph)
  else alvo = caminhar(ch, dt, ph)
  pose(ch, alvo, ch.pose.hy === undefined ? 1 : dt)
}

/** Estado inicial da rotina: todos no posto, cada um saindo num momento diferente. */
export function iniciarRotina(ch: any, rotina: Rotina, indice: number) {
  ch.rotina = rotina
  ch.fase = indice * 1.7
  ch.pose = {}
  ch.entregue = false
  ch.aceno = 0
  fixarNoPosto(ch)
  ch.relogio = 2.5 + indice * 3.2
}
