/* eslint-disable @typescript-eslint/no-explicit-any */
// O semblante dos funcionários no escritório inteiro. Cada um tem cinco rostos prontos (sobrancelha, boca e o que mais
// a emoção pede) e só um aparece por vez; os olhos são uma peça à parte, que abre mais, aperta e pisca.
import type { EstadoCena, Humor } from '../../../lib/escritorio/cenaBase'
import type { Pecas } from './pecas'

/** [largura, altura, cor, x, y, raio, z]: uma caixinha no rosto. A cor pode ser um nome da paleta do funcionário. */
type Traco = [number, number, number | string, number, number, number?, number?]

const BRANCO = 0xfbf8f1,
  SUOR = 0x8fc4dd,
  ZZZ_Y = 1.14
/** os dois lados do rosto de uma vez: o que vale para x vale espelhado para -x */
const par = (t: Traco): Traco[] => [t, [t[0], t[1], t[2], -t[3], t[4], t[5], t[6]]]

const ROSTOS: Record<Humor, Traco[]> = {
  calmo: [
    ...par([0.11, 0.028, 'pelo', 0.1, 0.345]),
    [0.11, 0.028, 'boca', 0, 0.112],
    ...par([0.032, 0.028, 'boca', 0.068, 0.13]),
  ],
  /* sobrancelha baixa e reta, boca pequena: está com a cabeça no trabalho */
  focado: [
    ...par([0.06, 0.03, 'pelo', 0.125, 0.33]),
    ...par([0.06, 0.03, 'pelo', 0.07, 0.312]),
    [0.075, 0.026, 'boca', 0.012, 0.118],
  ],
  /* olhos fechados em arco, sorriso aberto com dentes e bochecha corada */
  feliz: [
    ...par([0.11, 0.028, 'pelo', 0.1, 0.372]),
    ...par([0.066, 0.03, 'olho', 0.1, 0.268]),
    ...par([0.03, 0.03, 'olho', 0.146, 0.245]),
    ...par([0.03, 0.03, 'olho', 0.054, 0.245]),
    [0.17, 0.085, 'dentro', 0, 0.108, 0.45],
    [0.13, 0.026, BRANCO, 0, 0.135, 0, 0.212],
    ...par([0.075, 0.045, 'corado', 0.165, 0.168, 0.5, 0.2]),
  ],
  /* sobrancelha caída para fora, boca virada para baixo e uma gota de suor */
  preocupado: [
    ...par([0.06, 0.03, 'pelo', 0.07, 0.378]),
    ...par([0.06, 0.03, 'pelo', 0.125, 0.352]),
    [0.085, 0.028, 'boca', 0, 0.128],
    ...par([0.032, 0.028, 'boca', 0.056, 0.108]),
    [0.05, 0.085, SUOR, 0.215, 0.33, 0.5, 0.17],
  ],
  /* fora do horário: olhos fechados em risco, sobrancelha solta e a boca aberta de quem ressona */
  dormindo: [
    ...par([0.11, 0.028, 'pelo', 0.1, 0.33]),
    ...par([0.1, 0.024, 'olho', 0.1, 0.245]),
    [0.055, 0.055, 'dentro', 0, 0.115, 0.5],
  ],
  /* dinheiro em risco: sobrancelha bem inclinada, boca aberta e duas gotas */
  aflito: [
    ...par([0.06, 0.03, 'pelo', 0.066, 0.392]),
    ...par([0.06, 0.03, 'pelo', 0.122, 0.356]),
    [0.085, 0.075, 'dentro', 0, 0.112, 0.45],
    ...par([0.05, 0.085, SUOR, 0.215, 0.33, 0.5, 0.17]),
    [0.04, 0.065, SUOR, 0.2, 0.2, 0.5, 0.185],
  ],
}

/** Quanto os olhos abrem em cada emoção (1 = normal, 0 = somem: o rosto feliz desenha os dele em arco). */
const ABERTURA: Record<Humor, number> = {
  calmo: 1,
  focado: 0.66,
  feliz: 0,
  preocupado: 1.2,
  aflito: 1.32,
  dormindo: 0,
}
const DO_ESTADO: Record<EstadoCena, Humor> = {
  fila: 'calmo',
  trabalhando: 'focado',
  entregue: 'feliz',
  precisa: 'preocupado',
}

/** Os olhos e os cinco rostos, presos à cabeça. Nenhum faz sombra: são detalhes pequenos demais para isso. */
export function montarSemblante(T: any, { cx, fecha, grupo }: Pecas, c: any, head: any) {
  const mistura = (a: number, b: number, f: number) => new T.Color(a).lerp(new T.Color(b), f).getHex()
  const paleta: Record<string, number> = {
    pelo: c.cabelo,
    olho: 0x2a211b,
    boca: mistura(new T.Color(c.pele).multiplyScalar(0.5).getHex(), 0x7a2020, 0.4),
    dentro: 0x4a1f1c,
    corado: mistura(c.pele, 0xe0705f, 0.5),
  }
  const pronto = (g: any) => {
    fecha(g)
    g.children.forEach((m: any) => (m.castShadow = false))
    return g
  }
  const caixa = (g: any, [w, h, cor, x, y, raio, z]: Traco) => {
    cx(w, h, 0.02, typeof cor === 'string' ? paleta[cor] : cor, x, y, z ?? 0.206, g)
    if (raio) g.userData.lista.at(-1).push(raio, 2)
  }
  const olhos = grupo(head, 0, 0.25, 0)
  ;[-0.1, 0.1].forEach(x => {
    caixa(olhos, [0.105, 0.09, 0xf7f3ec, x, 0, 0.5, 0.204])
    caixa(olhos, [0.052, 0.062, paleta.olho, x, -0.004, 0.5, 0.212])
  })
  pronto(olhos)
  const rostos = {} as Record<Humor, any>
  for (const h of Object.keys(ROSTOS) as Humor[]) {
    const g = grupo(head)
    ROSTOS[h].forEach(t => caixa(g, t))
    rostos[h] = pronto(g)
    g.visible = false
  }
  return { olhos, rostos }
}

/** O "Zzz" que sobe de quem dorme: três letras de caixinhas, viradas para quem olha. */
export function montarZzz({ cx, fecha, grupo }: Pecas, r: any) {
  const g = grupo(r, 0.15, ZZZ_Y, 0.6)
  g.rotation.y = Math.PI / 4
  g.scale.setScalar(1.5)
  const z = (s: number, x: number, y: number) =>
    [
      [s, x, y + s * 0.38],
      [s * 0.42, x + s * 0.16, y + s * 0.13],
      [s * 0.42, x - s * 0.16, y - s * 0.13],
      [s, x, y - s * 0.38],
    ].forEach(([w, px, py]) => cx(w, s * 0.24, 0.03, BRANCO, px, py, 0, g))
  z(0.11, 0, 0)
  z(0.15, 0.15, 0.2)
  z(0.2, 0.34, 0.46)
  fecha(g)
  g.children.forEach((m: any) => (m.castShadow = false))
  g.visible = false
  return g
}

/**
 * A emoção de agora: dormindo; feliz enquanto comemora, na reunião ou voltando para a mesa com a tarefa resolvida;
 * senão, a do aviso ou a do estado.
 */
export function humorDe(ch: any): Humor {
  if (ch.dormindo) return 'dormindo'
  if (ch.st !== 'precisa' && (ch.path || ch.reuniao > 0)) return 'feliz'
  if (ch.festa > 0) return 'feliz'
  return ch.humor || DO_ESTADO[ch.st as EstadoCena]
}

/** Troca o rosto quando a emoção muda e faz os olhos piscarem (cada um no seu tempo). */
export function expressar(ch: any, t: number, parado: boolean) {
  const b = ch.b
  if (!b.rostos) return
  const h = humorDe(ch)
  if (h !== ch.rosto) {
    if (ch.rosto) b.rostos[ch.rosto].visible = false
    b.rostos[h].visible = true
    ch.rosto = h
    b.olhos.visible = ABERTURA[h] > 0
  }
  const pisca = !parado && ch.anim && Math.pow(Math.max(0, Math.sin((t + ch.fase) * 1.07)), 48) > 0.8
  b.olhos.scale.y = pisca ? 0.1 : ABERTURA[h] || 1
  if (!b.zzz) return
  b.zzz.visible = h === 'dormindo'
  if (b.zzz.visible && !parado) b.zzz.position.y = ZZZ_Y + Math.sin((t + ch.fase) * 1.6) * 0.05
}
