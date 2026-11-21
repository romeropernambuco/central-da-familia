/* eslint-disable @typescript-eslint/no-explicit-any */
// O movimento dos bonecos. Cada quadro calcula uma pose-alvo (ângulo de cada junta) e o boneco vai até ela aos poucos:
// é isso que deixa o levantar, o andar e o acenar suaves, sem animação gravada.
import { ATIVIDADES_MINI } from '../atividadesMini'
import type { EstadoAgente, EstadoCena } from '../cenaBase'
import { ESCALA_FUNCIONARIO_MINI } from '../escritorioMini'
import { HIP_PE, HIP_SENTADO } from './boneco'
import { estadoLegado, luzTela } from './estados'

/** Como a cena está rodando agora: com ou sem movimento, em qual degrau do modo leve e a quantos quadros por segundo. */
export interface Ritmo {
  reduz: boolean
  degrau: number
  fps: number
}
/** O que o mini usa para olhar: a direção da câmera e onde está o ponteiro do mouse sobre a cena. */
export interface Olhar {
  DIR: { x: number; z: number }
  ponteiro: { x: number; y: number; dentro: boolean }
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** Velocidade do andar, em metros por segundo. */
const VEL = 1.25

/** Leva cada junta do boneco um passo na direção da pose-alvo. */
export function pose(ch: any, alvo: any, dt: number) {
  const p = ch.pose,
    k = Math.min(1, dt * 9)
  for (const n in alvo) {
    p[n] = p[n] === undefined ? alvo[n] : lerp(p[n], alvo[n], k)
  }
  const b = ch.b
  b.hips.position.y = p.hy
  b.hips.rotation.x = p.hx
  b.head.rotation.x = p.cx
  b.head.rotation.y = p.cy
  b.bL.o.rotation.x = p.lx
  b.bL.o.rotation.z = p.lz
  b.bL.e.rotation.x = p.le
  b.bR.o.rotation.x = p.rx
  b.bR.o.rotation.z = p.rz
  b.bR.e.rotation.x = p.re
  b.bR.e.rotation.z = p.rez
  b.pL.o.rotation.x = p.tl
  b.pL.k.rotation.x = p.kl
  b.pR.o.rotation.x = p.tr
  b.pR.k.rotation.x = p.kr
}

/** Andando pelo caminho (mesa, corredor, frente da sala): avança, vira o corpo e balança braços e pernas. */
function andar(ch: any, dt: number, ph: number) {
  const b = ch.b
  const pt = ch.path[0],
    dx = pt.x - b.r.position.x,
    dz = pt.z - b.r.position.z,
    d = Math.sqrt(dx * dx + dz * dz),
    passo = VEL * dt
  if (d <= passo) {
    b.r.position.x = pt.x
    b.r.position.z = pt.z
    ch.path.shift()
    if (!ch.path.length) {
      ch.path = null
      ch.loc = ch.dest
    }
  } else {
    b.r.position.x += (dx / d) * passo
    b.r.position.z += (dz / d) * passo
    const ang = Math.atan2(dx, dz)
    let da = ang - b.r.rotation.y
    while (da > Math.PI) da -= 2 * Math.PI
    while (da < -Math.PI) da += 2 * Math.PI
    b.r.rotation.y += da * Math.min(1, dt * 12)
  }
  const s = Math.sin(ph * 9)
  return {
    hy: HIP_PE + Math.abs(s) * 0.02,
    hx: 0.04,
    cx: 0,
    cy: 0,
    lx: s * 0.55,
    lz: 0,
    le: -0.25,
    rx: -s * 0.55,
    rz: 0,
    re: -0.25,
    rez: 0,
    tl: -s * 0.6,
    kl: Math.max(0, s) * 0.7,
    tr: s * 0.6,
    kr: Math.max(0, -s) * 0.7,
  }
}

/** De pé na frente da sala, virado para a pessoa e acenando. */
function acenar(ch: any, dt: number, a: number, ph: number) {
  const b = ch.b
  const da2 = Math.PI / 4 - b.r.rotation.y
  b.r.rotation.y += da2 * Math.min(1, dt * 8)
  return {
    hy: HIP_PE + a * Math.abs(Math.sin(ph * 3)) * 0.015,
    hx: 0,
    cx: -0.08,
    cy: 0,
    lx: 0,
    lz: 0,
    le: -0.15,
    rx: 0,
    rz: 2.55,
    re: 0,
    rez: a * Math.sin(ph * 7) * 0.45,
    tl: 0,
    kl: 0,
    tr: 0,
    kr: 0,
  }
}

/** Sentado à mesa: comemorando, digitando, recostado (entregue) ou esperando. */
function sentar(ch: any, st: EstadoCena, dt: number, a: number, ph: number) {
  const b = ch.b
  const da3 = 0 - b.r.rotation.y
  b.r.rotation.y += da3 * Math.min(1, dt * 8)
  const base: any = {
    hy: HIP_SENTADO,
    hx: 0,
    cx: 0,
    cy: 0,
    lx: 0,
    lz: 0,
    le: 0,
    rx: 0,
    rz: 0,
    re: 0,
    rez: 0,
    tl: -1.5,
    kl: 1.5,
    tr: -1.5,
    kr: 1.5,
  }
  if (ch.festa > 0) {
    ch.festa -= dt
    base.lx = base.rx = -2.7
    base.lz = -0.25
    base.rz = 0.25
    base.cx = -0.2
  } else if (st === 'trabalhando') {
    base.hx = 0.1
    base.cx = 0.16
    base.lx = -0.62 + a * Math.sin(ph * 13) * 0.05
    base.rx = -0.62 - a * Math.sin(ph * 13) * 0.05
    base.le = -1.05 + a * Math.sin(ph * 13 + 1) * 0.08
    base.re = -1.05 - a * Math.sin(ph * 13 + 1) * 0.08
    base.cy = a * Math.sin(ph * 0.7) * 0.08
  } else if (st === 'entregue') {
    base.hx = -0.12
    base.lx = base.rx = -0.25
    base.le = base.re = -0.9
    base.cy = a * Math.sin(ph * 0.5) * 0.35
    base.cx = -0.03
  } else {
    base.lx = base.rx = -0.3
    base.le = base.re = -0.8
    base.cy = a * Math.sin(ph * 0.4) * 0.2
    base.cx = 0.05
  }
  return base
}

/** Um funcionário na cena completa: quem precisa de você levanta e vai acenar na frente da sala; resolveu, volta. */
export function moverNaCena(ch: any, t: number, dt: number, reduz: boolean) {
  if (ch.retornaTrabalho && !reduz) {
    ch.tempoEstado += dt
    if (ch.tempoEstado >= 1.6) {
      ch.st = 'trabalhando'
      ch.retornaTrabalho = false
    }
  }
  const st: EstadoCena = ch.st,
    a = ch.anim && !reduz ? 1 : 0,
    ph = t + ch.fase
  ch.pilha.visible = st === 'entregue' || st === 'precisa'
  if (ch.telaSt !== st) {
    ch.telaSt = st
    ch.tela.emissiveIntensity = luzTela(st)
  }
  /* decide pra onde ir: quem precisa de você levanta e vai pra frente da sala; resolveu, volta pra mesa */
  if (!ch.path) {
    if (st === 'precisa' && ch.loc === 'sentado') {
      ch.path = [ch.G1, ch.G2, ch.F]
      ch.dest = 'frente'
    } else if (st !== 'precisa' && ch.loc === 'frente') {
      ch.path = [ch.G2, ch.G1, ch.S]
      ch.dest = 'sentado'
    }
  }
  const alvo = ch.path ? andar(ch, dt, ph) : ch.loc === 'frente' ? acenar(ch, dt, a, ph) : sentar(ch, st, dt, a, ph)
  pose(ch, alvo, ch.pose.hy === undefined ? 1 : dt)
}

export function mudarMini(ch: any, estado: EstadoAgente) {
  if (ch.estado === estado) return
  ch.estado = estado
  ch.st = estadoLegado(estado)
  ch.tempoEstado = 0
  ch.b.r.userData.estado = estado
}

const pausaDe = (ch: any) => Math.floor(ch.fase * 10) % 3

/** Mini com mesa de verdade: as mãos alcançam o teclado e a atividade só modula cotovelo, olhar e punho. */
function alcancarTeclado(
  ch: any,
  alvo: any,
  quadril: number,
  escalaBoneco: number,
  micro: number,
  { reduz, degrau }: Ritmo,
) {
  // Mãos no teclado/objeto: a atividade continua modulando cotovelo, olhar e punho.
  const base = ch.trabalho.pose(0),
    ponto = ch.escritorio.teclado
  const dy = ponto.y / escalaBoneco - quadril - 0.44,
    dz = (ponto.z - 0.1) / escalaBoneco + 0.08
  const beta = Math.acos(Math.max(-1, Math.min(1, (dy * dy + dz * dz - 0.24 ** 2 - 0.285 ** 2) / (2 * 0.24 * 0.285))))
  const alpha = Math.atan2(dz, -dy) - Math.atan2(0.285 * Math.sin(beta), 0.24 + 0.285 * Math.cos(beta))
  alvo.hx = 0
  for (const [ombro, cotovelo] of [
    ['lx', 'le'],
    ['rx', 're'],
  ]) {
    alvo[ombro] = -alpha + ((alvo[ombro] || 0) - (base[ombro] || 0)) * 0.3
    alvo[cotovelo] = -beta + ((alvo[cotovelo] || 0) - (base[cotovelo] || 0)) * 0.3
  }
  ch.escritorio.tela.emissiveIntensity =
    degrau || ch.microCongelada ? 0.55 : 0.75 + (reduz ? 0 : Math.sin(micro * 0.8) * 0.035)
}

/** A pose que cada estado pede por cima do trabalho: chamando acena, resolvido faz joinha, parado tem 3 pausas. */
function poseDoEstado(ch: any, alvo: any, st: EstadoAgente, reduz: boolean) {
  const chamar = st === 'chamando',
    resolveu = st === 'resolvido',
    pausa = pausaDe(ch)
  if (chamar)
    Object.assign(alvo, {
      hx: 0,
      cx: -0.06,
      cy: 0,
      lx: -0.3,
      le: -0.4,
      rx: -0.15,
      rz: 2.45,
      re: -0.2,
      rez: reduz ? 0.2 : Math.sin(ch.tempoEstado * 6 + ch.fase) * 0.25,
    })
  if (resolveu) Object.assign(alvo, { hx: -0.04, cx: -0.08, cy: 0.1, rx: -1.25, rz: -0.18, re: -1.7, rez: 0 })
  if (st === 'parado') {
    // Três pausas estáveis por id: relógio, alongamento de ombros e café.
    Object.assign(
      alvo,
      pausa === 0
        ? { lx: -0.95, le: -1.9, rx: -0.25, re: -0.5, cx: 0.35, cy: -0.25 }
        : pausa === 1
          ? { lx: -2.1, le: -1.4, lz: -0.3, rx: -2.1, re: -1.4, rz: 0.3, cx: -0.13 }
          : { lx: -1, le: -1.8, rx: -0.25, re: -0.7, hx: 0, cx: 0.08, cy: -0.16 },
    )
  }
}

/** A caneca vai à boca na pausa do café e volta para a mesa. */
function moverCafe(ch: any, tomandoCafe: boolean, k: number, quadril: number, escalaBoneco: number, balanco: number) {
  ch.cafe.position.x = lerp(ch.cafe.position.x, tomandoCafe ? -0.3 : -0.7, k)
  ch.cafe.position.y = lerp(
    ch.cafe.position.y,
    tomandoCafe ? (quadril + 0.56) * escalaBoneco : ch.escritorio ? ch.escritorio.tampo + 0.07 : 0.69,
    k,
  )
  ch.cafe.position.z = lerp(ch.cafe.position.z, tomandoCafe ? 0.28 : 0.85, k)
  ch.cafe.rotation.x = lerp(ch.cafe.rotation.x, tomandoCafe ? -0.2 + balanco : 0, k)
}

/** Pousa as duas mãos no teclado (ou no objeto da atividade) enquanto trabalha. */
function apoiarMaos(ch: any, t: number, quadril: number, escalaBoneco: number, reduz: boolean) {
  const b = ch.b
  const variacao = reduz ? 0 : Math.sin(t * 8) * 0.007
  ch.maoL.set(
    -0.08 / escalaBoneco,
    ch.escritorio.teclado.y / escalaBoneco - quadril + variacao,
    (ch.escritorio.teclado.z - 0.1) / escalaBoneco,
  )
  ch.maoR.set(
    0.31 / escalaBoneco,
    ch.escritorio.teclado.y / escalaBoneco - quadril - variacao,
    (ch.escritorio.teclado.z - 0.1) / escalaBoneco,
  )
  if (ch.trabalho.maos) {
    b.r.updateWorldMatrix(true, true)
    ch.trabalho.raiz.updateWorldMatrix(true, false)
    ch.maoL.copy(ch.trabalho.maos.esquerda)
    ch.trabalho.raiz.localToWorld(ch.maoL)
    b.hips.worldToLocal(ch.maoL)
    ch.maoR.copy(ch.trabalho.maos.direita)
    ch.trabalho.raiz.localToWorld(ch.maoR)
    b.hips.worldToLocal(ch.maoR)
  }
  ch.apoiarMao(b.bL, ch.maoL)
  ;(ch.apoiarMaoR || ch.apoiarMao)(b.bR, ch.maoR)
}

/** Piscar, cabelo, vapor do café, ponteiro do relógio, sinal de pergunta e joinha. */
function microvida(ch: any, micro: number, st: EstadoAgente, { reduz, degrau }: Ritmo) {
  const b = ch.b,
    chamar = st === 'chamando',
    resolveu = st === 'resolvido'
  b.olhos.scale.y = reduz ? 1 : Math.pow(Math.max(0, Math.sin(micro * 1.07)), 48) > 0.8 ? 0.08 : 1
  b.cabelo.rotation.z = reduz ? 0 : Math.sin(micro * 1.4) * 0.018
  ch.vapor.position.y = reduz ? 0 : (1 + Math.sin(micro * 1.2)) * 0.035
  ch.vapor.rotation.z = reduz ? 0 : Math.sin(micro * 1.5) * 0.12
  ch.ponteiro.rotation.z = -micro * 0.12
  ch.sinal.visible = chamar
  ch.sinal.scale.setScalar(reduz || degrau || ch.microCongelada ? 1 : 1 + Math.sin(ch.tempoEstado * 3) * 0.09)
  ch.joinha.visible = resolveu
  ch.pilha.visible = false
}

/** O funcionário do mini (o que aparece nas outras abas): trabalha na atividade dele e reage ao estado e ao ponteiro. */
export function moverNoMini(ch: any, dt: number, ritmo: Ritmo, { DIR, ponteiro }: Olhar) {
  const { reduz, degrau, fps } = ritmo
  const b = ch.b,
    k = reduz ? 1 : Math.min(1, dt * 9)
  ch.tempoEstado += reduz ? 0 : dt
  if (ch.estado === 'resolvido' && ch.tempoEstado >= 1.6) mudarMini(ch, 'trabalhando')
  const st: EstadoAgente = ch.estado
  ch.pesoTrabalho = lerp(ch.pesoTrabalho, st === 'trabalhando' ? 1 : 0, k)
  if (!reduz) ch.tempoTrabalho += dt * ch.pesoTrabalho
  // Abaixo de 24fps, só o relógio da atividade avança; microposes ficam congeladas.
  if (!reduz && degrau === 0 && fps !== 0 && fps < 24) ch.microCongelada = true
  else if (degrau === 0 && fps >= 24) ch.microCongelada = false
  if (!reduz && degrau === 0 && !ch.microCongelada) ch.micro += dt
  const micro = ch.micro,
    t = ch.tempoTrabalho
  const respira = reduz ? 0 : Math.sin(micro * 2) * 0.006
  const emPe = !ch.escritorio && !!ATIVIDADES_MINI[ch.id]?.emPe
  const escalaBoneco = ch.escritorio ? ESCALA_FUNCIONARIO_MINI : 1
  const quadril = ch.escritorio ? ch.escritorio.assento / escalaBoneco + ch.folgaQuadril : emPe ? HIP_PE : HIP_SENTADO
  const alvo: any = {
    hy: quadril + (ch.escritorio ? 0 : respira),
    hx: 0.06,
    cx: 0.12,
    cy: 0,
    lx: -0.7,
    lz: 0,
    le: -1.1,
    rx: -0.7,
    rz: 0,
    re: -1.1,
    rez: 0,
    tl: emPe ? -0.03 : -1.5,
    kl: emPe ? 0.03 : 1.5,
    tr: emPe ? 0.03 : -1.5,
    kr: emPe ? 0.02 : 1.5,
  }
  Object.assign(alvo, ch.trabalho.pose(t))
  ch.trabalho.animar(t)
  if (ch.escritorio) alcancarTeclado(ch, alvo, quadril, escalaBoneco, micro, ritmo)
  const chamar = st === 'chamando',
    resolveu = st === 'resolvido'
  poseDoEstado(ch, alvo, st, reduz)
  const tomandoCafe = st === 'parado' && pausaDe(ch) === 2
  moverCafe(ch, tomandoCafe, k, quadril, escalaBoneco, reduz ? 0 : Math.sin(micro) * 0.035)
  const olhando = chamar || resolveu ? Math.atan2(DIR.x, DIR.z) : 0
  ch.rotacao = lerp(ch.rotacao, olhando, k)
  b.r.rotation.y = ch.rotacao
  if (ponteiro.dentro && st !== 'parado' && !reduz && degrau === 0 && !ch.microCongelada) {
    alvo.cy += ponteiro.x * 0.13
    alvo.cx += ponteiro.y * 0.06
  }
  pose(ch, alvo, reduz || ch.pose.hy === undefined ? 1 : dt)
  if (ch.escritorio && st === 'trabalhando') apoiarMaos(ch, t, quadril, escalaBoneco, reduz)
  microvida(ch, micro, st, ritmo)
}
