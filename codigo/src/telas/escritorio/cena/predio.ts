/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OpcoesCena } from '../../../lib/escritorio/cenaBase'
import type { Guardar, Pecas } from './pecas'
import { SALAS } from './planta'

/** Cores dos móveis, usadas também nas mesas de cada funcionário. */
export const CORES = {
  MADEIRA: 0xb88d62,
  MADEIRA_E: 0x8a6645,
  CADEIRA: 0x4c525b,
  PAPEL: 0xfbf8f1,
  PLANTA: 0x5e8a62,
  VASO: 0xc9b8a0,
}

/** Base, paredes altas do fundo, muretas entre as salas e janelas. */
function erguerParedes(scene: any, cx: Pecas['cx'], baseMat: any, vidro: any) {
  cx(19, 0.3, 11, baseMat, 3, -0.15, 0, scene, true)
  cx(7, 0.3, 4.4, baseMat, 0, -0.15, 7.3, scene, true)
  const PAREDE = 0xf1eadf,
    RODA = 0xd9cfbf,
    MEIA = 0xe6dccd
  cx(12.4, 2.2, 0.2, PAREDE, -0.1, 1.1, -5.1)
  cx(0.2, 2.2, 10.2, PAREDE, -6.1, 1.1, 0)
  cx(12.2, 0.12, 0.04, RODA, 0, 0.06, -4.98, scene, true)
  cx(0.04, 0.12, 10, RODA, -5.98, 0.06, 0, scene, true)
  /* paredes baixas entre as salas, com passagem no meio de cada lado */
  ;[
    [0, -3.3, 0.14, 3.4],
    [0, 3.3, 0.14, 3.4],
  ].forEach(p => {
    cx(p[2], 0.7, p[3], MEIA, p[0], 0.35, p[1])
  })
  ;[
    [-3.8, 0, 4.4, 0.14],
    [3.8, 0, 4.4, 0.14],
  ].forEach(p => {
    cx(p[2], 0.7, p[3], MEIA, p[0], 0.35, p[1])
  })
  /* frente: mureta dos 2 lados, com a porta da Recepção no meio */
  cx(3.0, 0.12, 0.12, MEIA, -4.6, 0.06, 5.0, scene, true)
  cx(3.0, 0.12, 0.12, MEIA, 4.6, 0.06, 5.0, scene, true)
  cx(0.12, 0.12, 10.2, MEIA, 6.0, 0.06, 0, scene, true)
  cx(0.12, 0.5, 4.0, MEIA, -3.0, 0.25, 7.15)
  cx(0.12, 0.12, 4.0, MEIA, 3.0, 0.06, 7.15, scene, true)
  cx(6.1, 0.12, 0.12, MEIA, 0, 0.06, 9.15, scene, true)
  /* janelas nas 2 paredes altas */
  ;[-4.6, -1.4, 1.4, 4.6].forEach(x => {
    cx(1.3, 0.8, 0.06, vidro, x, 1.45, -4.98, scene, true)
  })
  ;[-3.2, 3.2].forEach(z => {
    cx(0.06, 0.8, 1.3, vidro, -5.98, 1.45, z, scene, true)
  })
}

/** A decoração que diz o que cada sala cuida (cofre no Caixa, cesta na Casa...), com planta e luminária. */
function decorarSalas(
  T: any,
  guardar: Guardar,
  cx: Pecas['cx'],
  salaG: Record<string, any>,
  lampadas: { m: any; l: any }[],
) {
  const { MADEIRA_E, PLANTA, VASO } = CORES
  function planta(x: number, z: number, pai: any) {
    cx(0.34, 0.3, 0.34, VASO, x, 0.15, z, pai)
    cx(0.5, 0.34, 0.5, PLANTA, x, 0.52, z, pai)
    cx(0.34, 0.3, 0.34, PLANTA, x + 0.04, 0.8, z - 0.03, pai)
  }
  function luminaria(x: number, z: number, pai: any) {
    cx(0.2, 0.04, 0.2, 0x55504a, x, 0.02, z, pai)
    cx(0.05, 1.3, 0.05, 0x55504a, x, 0.65, z, pai)
    const m = guardar(new T.MeshLambertMaterial({ color: 0xf6e7c6, emissive: 0xffd58a, emissiveIntensity: 0 }))
    cx(0.36, 0.3, 0.36, m, x, 1.42, z, pai, true)
    const l = new T.PointLight(0xffd9a0, 0, 8, 1.6)
    l.position.set(x, 1.5, z)
    pai.add(l)
    lampadas.push({ m, l })
  }

  ;(() => {
    const g = salaG.caixa /* cofre e pilhas de moedas */
    /* C2: o cofre e as moedas foram pra frente da sala: a 3ª mesa (Tesoureiro de Receitas) fica no fundo */
    cx(0.9, 1.0, 0.7, 0x6c727a, 2.3, 0.5, 1.95, g)
    cx(0.5, 0.6, 0.04, 0x8a9098, 2.3, 0.52, 2.32, g, true)
    cx(0.12, 0.12, 0.06, 0xd8c27a, 2.46, 0.52, 2.35, g, true)
    const ouro = guardar(new T.MeshLambertMaterial({ color: 0xd9b95a }))
    ;[
      [1.35, 0.3],
      [1.6, 0.42],
      [1.47, 0.18],
    ].forEach((p, i) => {
      const gc = guardar(new T.CylinderGeometry(0.11, 0.11, p[1], 12))
      const c = new T.Mesh(gc, ouro)
      c.position.set(p[0] + (i === 2 ? 0.02 : 0), p[1] / 2 + 0.04, 1.8 + (i === 2 ? 0.26 : 0))
      c.castShadow = true
      g.add(c)
    })
    planta(-2.6, 2.1, g)
    luminaria(2.75, -2.25, g)
  })()
  ;(() => {
    const g = salaG.casa /* cesta da feira */
    cx(0.7, 0.36, 0.5, 0xc49a62, 2.45, 0.22, 2.05, g)
    cx(0.2, 0.2, 0.2, 0xc0563f, 2.3, 0.46, 2.0, g, true)
    cx(0.2, 0.22, 0.2, 0x6e9a58, 2.56, 0.47, 2.1, g, true)
    cx(0.16, 0.16, 0.16, 0xe0b040, 2.42, 0.46, 2.2, g, true)
    planta(-2.6, 2.1, g)
    luminaria(2.75, -2.25, g)
  })()
  ;(() => {
    const g = salaG.cartoes /* 2 cartões grandes de pé */
    cx(0.06, 0.7, 1.1, 0x2e3440, 2.3, 0.75, -1.75, g)
    cx(0.02, 0.1, 1.1, 0xc9b27a, 2.335, 0.9, -1.75, g, true)
    cx(0.06, 0.7, 1.1, 0x7a5c8a, 2.55, 0.6, -1.2, g)
    cx(0.02, 0.1, 1.1, 0xe9e2d4, 2.585, 0.75, -1.2, g, true)
    cx(0.6, 0.24, 1.5, MADEIRA_E, 2.4, 0.12, -1.5, g)
    planta(2.55, 2.05, g)
    luminaria(-2.75, 2.2, g)
  })()
  ;(() => {
    const g = salaG.patrimonio /* cofre grande do Guardado e barras de quanto rende */
    cx(1.1, 1.2, 0.8, 0x59616b, 2.2, 0.6, -1.9, g)
    cx(0.7, 0.8, 0.04, 0x7c848e, 2.2, 0.62, -1.48, g, true)
    cx(0.16, 0.16, 0.06, 0xd8c27a, 2.42, 0.62, -1.45, g, true)
    ;[0.25, 0.45, 0.7].forEach((h, i) => {
      cx(0.2, h, 0.2, 0x7e9a86, 2.0 + i * 0.28, h / 2 + 0.04, 1.95, g)
    })
    planta(-2.6, 2.1, g)
    luminaria(2.75, 0.2, g)
  })()
  ;(() => {
    const g = salaG.recepcao /* sofá de espera e sino no balcão */
    cx(1.5, 0.3, 0.6, 0x7c8a93, 1.9, 0.2, 1.3, g)
    cx(1.5, 0.5, 0.14, 0x6b7881, 1.9, 0.45, 1.62, g)
    cx(0.14, 0.42, 0.6, 0x6b7881, 1.2, 0.3, 1.3, g)
    cx(0.14, 0.42, 0.6, 0x6b7881, 2.6, 0.3, 1.3, g)
    planta(-2.5, 1.5, g)
    luminaria(2.6, -1.5, g)
  })()
}

/**
 * O prédio em corte: base, paredes, janelas, o piso de cada sala e a decoração.
 * No mini (um funcionário só, nas outras abas) entra apenas o piso da sala dele.
 */
export function montarPredio(
  T: any,
  scene: any,
  guardar: Guardar,
  { cx }: Pecas,
  o: Pick<OpcoesCena, 'mini' | 'funcionarios'>,
) {
  const lampadas: { m: any; l: any }[] = []
  const baseMat = guardar(new T.MeshLambertMaterial({ color: 0xe2dacc }))
  const vidro = guardar(new T.MeshLambertMaterial({ color: 0xbfd8e6, emissive: 0x9cc4da, emissiveIntensity: 0.35 }))
  if (!o.mini) erguerParedes(scene, cx, baseMat, vidro)
  const salaG: Record<string, any> = {}
  Object.keys(SALAS).forEach(k => {
    const s = SALAS[k],
      g = new T.Group()
    g.position.set(s.cx, 0, s.cz)
    g.userData.fixo = true
    scene.add(g)
    salaG[k] = g
    if (o.mini && !o.funcionarios.some(f => f.sala === k)) return
    cx(5.9, 0.04, s.d - 0.1, s.piso, 0, 0.02, 0, g, true)
    cx(5.2, 0.02, s.d === 5 ? 1.25 : 1.0, s.tapete, -0.3, 0.05, s.d === 5 ? 1.45 : 1.2, g, true)
  })
  if (!o.mini) decorarSalas(T, guardar, cx, salaG, lampadas)
  return { salaG, lampadas, baseMat, vidro }
}
