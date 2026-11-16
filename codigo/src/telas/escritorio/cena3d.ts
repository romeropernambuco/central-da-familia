/** API: const cena = montarCena(T, el, { mini: true, ...opcoes });
 * cena.definirEstado(id, 'trabalhando' | 'chamando' | 'resolvido' | 'parado').
 * Não remonta renderer, câmera, personagem nem acessórios. Resolvido faz joinha por
 * 1,6s de tempo visível e volta ao trabalho; outra chamada interrompe a celebração.
 * atualizar mantém a API legada: fila→parado, precisa→chamando, entregue→resolvido.
 * Reduced motion: pose da atividade, render sob demanda, nenhum RAF no mini.
 * Desempenho e contagens: atividadesMini.md. Three continua no import() tardio.
 */
// Cena 3D do Escritório, portada do protótipo aprovado (design2/escritorio3d.html): prédio em corte, 5 salas,
// bonecos low poly feitos por código, câmera isométrica. A animação é o estado: sentado parado (vai começar),
// digitando (trabalhando), recostado com pilha de papel (entregue), de pé na frente da sala acenando (precisa de você).
// Não importa o Three.js: recebe as peças prontas (ver tres.ts), pra o 3D só carregar nesta tela.
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Cena, OpcoesCena, EstadoCena, EstadoAgente } from './cenaBase'
import { MedidorFPS } from './cenaBase'
import { POR_ID } from './equipe'
import { ATIVIDADES_MINI, faseDoId, montarAtividade } from './atividadesMini'

const SALAS: Record<string, { nome: string; rot: [number, number, number]; cx: number; cz: number; d: number; piso: number; tapete: number }> = {
  gestao: { nome: 'Gestão', rot: [9, 2.45, -5.1], cx: 9, cz: -2.5, d: 5, piso: 0xDCC9AA, tapete: 0xB9A98C },
  apoio: { nome: 'Apoio', rot: [9, -0.1, 5.6], cx: 9, cz: 2.5, d: 5, piso: 0xDFCFB4, tapete: 0xA9B19A },
  caixa: { nome: 'Caixa', rot: [-6.1, 2.45, -2.5], cx: -3, cz: -2.5, d: 5, piso: 0xDCC9AA, tapete: 0xB9A98C },
  casa: { nome: 'Casa', rot: [3, 2.45, -5.1], cx: 3, cz: -2.5, d: 5, piso: 0xE4D8C4, tapete: 0xA9B19A },
  cartoes: { nome: 'Cartões', rot: [-6.1, 2.45, 2.5], cx: -3, cz: 2.5, d: 5, piso: 0xD2C4AD, tapete: 0x9FA8B3 },
  patrimonio: { nome: 'Patrimônio', rot: [4.7, -0.1, 5.6], cx: 3, cz: 2.5, d: 5, piso: 0xDFCFB4, tapete: 0xC2A98A },
  recepcao: { nome: 'Recepção', rot: [0, -0.1, 9.5], cx: 0, cz: 7.15, d: 4, piso: 0xE1D3BC, tapete: 0xB4A89A },
}
// a roupa, a sala e a mesa de cada um vêm da lista única da equipe (equipe.ts)
const RESERVA = [
  { camisa: 0x8C6A4A, calca: 0x2E3440, pele: 0xD6A27C, cabelo: 0x6A6A68, estilo: 'coque' },
  { camisa: 0x5E7C5A, calca: 0x34343C, pele: 0x9C6B4C, cabelo: 0x1B1410, estilo: 'longo' },
  { camisa: 0x4F7A78, calca: 0x2E3440, pele: 0xB98562, cabelo: 0x231A14, estilo: 'curto' },
]

const estadoMini = (e: EstadoCena): EstadoAgente => e === 'precisa' ? 'chamando' : e === 'entregue' ? 'resolvido' : e === 'fila' ? 'parado' : 'trabalhando'
const estadoLegado = (e: EstadoAgente): EstadoCena => e === 'chamando' ? 'precisa' : e === 'resolvido' ? 'entregue' : e === 'parado' ? 'fila' : 'trabalhando'

export function montarCena(T: any, el: HTMLElement, o: OpcoesCena): Cena {
  const limpezas: (() => void)[] = [], recursos = new Set<any>()
  let destruida = false
  const guardar = <V extends { dispose(): void }>(v: V): V => { recursos.add(v); return v }
  const destruir = () => {
    if (destruida) return
    destruida = true
    for (const limpar of limpezas.reverse()) { try { limpar() } catch { /* continuar */ } }
    for (const r of recursos) { try { r.dispose() } catch { /* continuar */ } }
    recursos.clear()
  }
  try {
  const reduz = !!o.parado || !!window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const MOBILE = o.celular
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  limpezas.push(() => { renderer.dispose(); try { renderer.forceContextLoss() } catch { /* perdido */ } })
  const prMax = MOBILE() ? 1.5 : 2, pr = Math.min(window.devicePixelRatio || 1, prMax)
  renderer.setPixelRatio(pr)
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap
  const tela3d: HTMLCanvasElement = renderer.domElement
  limpezas.push(() => tela3d.remove())
  tela3d.setAttribute('aria-hidden', 'true')
  el.insertBefore(tela3d, el.firstChild)
  const scene = new T.Scene()

  /* luz */
  /* B2 (pacote 4): céu mais fraco e sol mais forte, pra sombra aparecer; recorte da sombra mais justo (mais nítida) */
  const hemi = new T.HemisphereLight(0xFFF8EE, 0xBFAE92, 0.85); scene.add(hemi)
  const sol = new T.DirectionalLight(0xFFF2DD, 3.0); sol.castShadow = true
  limpezas.push(() => sol.shadow.dispose())
  sol.shadow.mapSize.set(MOBILE() ? 1024 : 2048, MOBILE() ? 1024 : 2048)
  const sc = sol.shadow.camera; sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10; sc.near = 1; sc.far = 60; sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.03
  scene.add(sol); scene.add(sol.target)
  const lampadas: { m: any; l: any }[] = []

  /* peças */
  const GEO = guardar(new T.BoxGeometry(1, 1, 1)), MATS: Record<number, any> = {}
  const mat = (c: number) => MATS[c] || (MATS[c] = guardar(new T.MeshLambertMaterial({ color: c })))
  const BASE = guardar(GEO.toNonIndexed()), BP = BASE.attributes.position.array, BN = BASE.attributes.normal.array, corTmp = new T.Color()
  const VC = guardar(new T.MeshLambertMaterial({ vertexColors: true }))
  /* B2: mancha de sombra fixa sob cada mesa e cada pessoa (fica mesmo quando o modo leve desliga a sombra de verdade) */
  const MANCHA = guardar(new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }))
  const GEO_M = guardar(new T.CircleGeometry(1, 24))
  function mancha(r: number, x: number, y: number, z: number, pai: any) { const m = new T.Mesh(GEO_M, MANCHA); m.scale.set(r, r, 1); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 1; pai.add(m); return m }
  /* junta muitas caixas numa peça só (1 desenho por peça em vez de 1 por caixa) */
  function mesclar(lista: number[][]) {
    const n = lista.length, pos = new Float32Array(n * 108), nor = new Float32Array(n * 108), col = new Float32Array(n * 108)
    for (let i = 0; i < n; i++) { const b = lista[i]; corTmp.setHex(b[3]); for (let v = 0; v < 36; v++) { const k = i * 108 + v * 3; pos[k] = BP[v * 3] * b[0] + b[4]; pos[k + 1] = BP[v * 3 + 1] * b[1] + b[5]; pos[k + 2] = BP[v * 3 + 2] * b[2] + b[6]; nor[k] = BN[v * 3]; nor[k + 1] = BN[v * 3 + 1]; nor[k + 2] = BN[v * 3 + 2]; col[k] = corTmp.r; col[k + 1] = corTmp.g; col[k + 2] = corTmp.b } }
    const g = guardar(new T.BufferGeometry()); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3))
    const m = new T.Mesh(g, VC); m.receiveShadow = true; return m
  }
  const FIXO: number[][][] = [[], []]
  /* caixa: cor em número e pai fixo entra na peça única; material próprio vira peça solta */
  function cx(w: number, h: number, d: number, c: any, x: number, y: number, z: number, pai?: any, semSombra?: boolean): any {
    if (typeof c === 'number' && (!pai || pai.userData.fixo)) { const px = pai ? pai.position.x : 0, pz = pai ? pai.position.z : 0; FIXO[semSombra ? 1 : 0].push([w, h, d, c, x + px, y, z + pz]); return null }
    if (typeof c === 'number' && pai && pai.userData.lista) { pai.userData.lista.push([w, h, d, c, x, y, z]); return null }
    const m = new T.Mesh(GEO, typeof c === 'number' ? mat(c) : c); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = !semSombra; m.receiveShadow = true; (pai || scene).add(m); return m
  }
  function fecha(g: any) { if (g.userData.lista && g.userData.lista.length) { const m = mesclar(g.userData.lista); m.castShadow = true; g.add(m); g.userData.lista = null } }
  function grupo(pai?: any, x = 0, y = 0, z = 0) { const g = new T.Group(); g.position.set(x, y, z); g.userData.lista = []; if (pai) pai.add(g); return g }

  /* prédio: 12 x 10 com 4 salas de 6 x 5, e a Recepção de 6 x 4 na frente */
  const baseMat = guardar(new T.MeshLambertMaterial({ color: 0xE2DACC }))
  const vidro = guardar(new T.MeshLambertMaterial({ color: 0xBFD8E6, emissive: 0x9CC4DA, emissiveIntensity: 0.35 }))
  if (!o.mini) {
  cx(19, 0.3, 11, baseMat, 3, -0.15, 0, scene, true)
  cx(7, 0.3, 4.4, baseMat, 0, -0.15, 7.3, scene, true)
  const PAREDE = 0xF1EADF, RODA = 0xD9CFBF, MEIA = 0xE6DCCD
  cx(12.4, 2.2, 0.2, PAREDE, -0.1, 1.1, -5.1); cx(0.2, 2.2, 10.2, PAREDE, -6.1, 1.1, 0)
  cx(12.2, 0.12, 0.04, RODA, 0, 0.06, -4.98, scene, true); cx(0.04, 0.12, 10, RODA, -5.98, 0.06, 0, scene, true)
  /* paredes baixas entre as salas, com passagem no meio de cada lado */
  ;[[0, -3.3, 0.14, 3.4], [0, 3.3, 0.14, 3.4]].forEach(p => { cx(p[2], 0.7, p[3], MEIA, p[0], 0.35, p[1]) })
  ;[[-3.8, 0, 4.4, 0.14], [3.8, 0, 4.4, 0.14]].forEach(p => { cx(p[2], 0.7, p[3], MEIA, p[0], 0.35, p[1]) })
  /* frente: mureta dos 2 lados, com a porta da Recepção no meio */
  cx(3.0, 0.12, 0.12, MEIA, -4.6, 0.06, 5.0, scene, true); cx(3.0, 0.12, 0.12, MEIA, 4.6, 0.06, 5.0, scene, true); cx(0.12, 0.12, 10.2, MEIA, 6.0, 0.06, 0, scene, true)
  cx(0.12, 0.5, 4.0, MEIA, -3.0, 0.25, 7.15); cx(0.12, 0.12, 4.0, MEIA, 3.0, 0.06, 7.15, scene, true); cx(6.1, 0.12, 0.12, MEIA, 0, 0.06, 9.15, scene, true)
  /* janelas nas 2 paredes altas */
  ;[-4.6, -1.4, 1.4, 4.6].forEach(x => { cx(1.3, 0.8, 0.06, vidro, x, 1.45, -4.98, scene, true) })
  ;[-3.2, 3.2].forEach(z => { cx(0.06, 0.8, 1.3, vidro, -5.98, 1.45, z, scene, true) })

  }
  const MADEIRA = 0xB88D62, MADEIRA_E = 0x8A6645, CADEIRA = 0x4C525B, PAPEL = 0xFBF8F1, PLANTA = 0x5E8A62, VASO = 0xC9B8A0
  function planta(x: number, z: number, pai: any) { cx(0.34, 0.3, 0.34, VASO, x, 0.15, z, pai); cx(0.5, 0.34, 0.5, PLANTA, x, 0.52, z, pai); cx(0.34, 0.3, 0.34, PLANTA, x + 0.04, 0.8, z - 0.03, pai) }
  function luminaria(x: number, z: number, pai: any) { cx(0.2, 0.04, 0.2, 0x55504A, x, 0.02, z, pai); cx(0.05, 1.3, 0.05, 0x55504A, x, 0.65, z, pai); const m = guardar(new T.MeshLambertMaterial({ color: 0xF6E7C6, emissive: 0xFFD58A, emissiveIntensity: 0 })); cx(0.36, 0.3, 0.36, m, x, 1.42, z, pai, true); const l = new T.PointLight(0xFFD9A0, 0, 8, 1.6); l.position.set(x, 1.5, z); pai.add(l); lampadas.push({ m, l }) }

  const salaG: Record<string, any> = {}
  Object.keys(SALAS).forEach(k => {
    const s = SALAS[k], g = new T.Group(); g.position.set(s.cx, 0, s.cz); g.userData.fixo = true; scene.add(g); salaG[k] = g
    if (o.mini && !o.funcionarios.some(f => f.sala === k)) return
    cx(5.9, 0.04, s.d - 0.1, s.piso, 0, 0.02, 0, g, true)
    cx(5.2, 0.02, s.d === 5 ? 1.25 : 1.0, s.tapete, -0.3, 0.05, s.d === 5 ? 1.45 : 1.2, g, true)
  })
  /* decoração que diz o que cada sala cuida */
  if (!o.mini) {
  ;(() => { const g = salaG.caixa /* cofre e pilhas de moedas */
    /* C2: o cofre e as moedas foram pra frente da sala: a 3ª mesa (Tesoureiro de Receitas) fica no fundo */
    cx(0.9, 1.0, 0.7, 0x6C727A, 2.3, 0.5, 1.95, g); cx(0.5, 0.6, 0.04, 0x8A9098, 2.3, 0.52, 2.32, g, true); cx(0.12, 0.12, 0.06, 0xD8C27A, 2.46, 0.52, 2.35, g, true)
    const ouro = guardar(new T.MeshLambertMaterial({ color: 0xD9B95A })); [[1.35, 0.3], [1.6, 0.42], [1.47, 0.18]].forEach((p, i) => { const gc = guardar(new T.CylinderGeometry(0.11, 0.11, p[1], 12)); const c = new T.Mesh(gc, ouro); c.position.set(p[0] + (i === 2 ? 0.02 : 0), p[1] / 2 + 0.04, 1.8 + (i === 2 ? 0.26 : 0)); c.castShadow = true; g.add(c) })
    planta(-2.6, 2.1, g); luminaria(2.75, -2.25, g) })()
  ;(() => { const g = salaG.casa /* cesta da feira */
    cx(0.7, 0.36, 0.5, 0xC49A62, 2.45, 0.22, 2.05, g); cx(0.2, 0.2, 0.2, 0xC0563F, 2.3, 0.46, 2.0, g, true); cx(0.2, 0.22, 0.2, 0x6E9A58, 2.56, 0.47, 2.1, g, true); cx(0.16, 0.16, 0.16, 0xE0B040, 2.42, 0.46, 2.2, g, true)
    planta(-2.6, 2.1, g); luminaria(2.75, -2.25, g) })()
  ;(() => { const g = salaG.cartoes /* 2 cartões grandes de pé */
    cx(0.06, 0.7, 1.1, 0x2E3440, 2.3, 0.75, -1.75, g); cx(0.02, 0.1, 1.1, 0xC9B27A, 2.335, 0.9, -1.75, g, true)
    cx(0.06, 0.7, 1.1, 0x7A5C8A, 2.55, 0.6, -1.2, g); cx(0.02, 0.1, 1.1, 0xE9E2D4, 2.585, 0.75, -1.2, g, true)
    cx(0.6, 0.24, 1.5, MADEIRA_E, 2.4, 0.12, -1.5, g)
    planta(2.55, 2.05, g); luminaria(-2.75, 2.2, g) })()
  ;(() => { const g = salaG.patrimonio /* cofre grande do Guardado e barras de quanto rende */
    cx(1.1, 1.2, 0.8, 0x59616B, 2.2, 0.6, -1.9, g); cx(0.7, 0.8, 0.04, 0x7C848E, 2.2, 0.62, -1.48, g, true); cx(0.16, 0.16, 0.06, 0xD8C27A, 2.42, 0.62, -1.45, g, true)
    ;[0.25, 0.45, 0.7].forEach((h, i) => { cx(0.2, h, 0.2, 0x7E9A86, 2.0 + i * 0.28, h / 2 + 0.04, 1.95, g) })
    planta(-2.6, 2.1, g); luminaria(2.75, 0.2, g) })()
  ;(() => { const g = salaG.recepcao /* sofá de espera e sino no balcão */
    cx(1.5, 0.3, 0.6, 0x7C8A93, 1.9, 0.2, 1.3, g); cx(1.5, 0.5, 0.14, 0x6B7881, 1.9, 0.45, 1.62, g); cx(0.14, 0.42, 0.6, 0x6B7881, 1.2, 0.3, 1.3, g); cx(0.14, 0.42, 0.6, 0x6B7881, 2.6, 0.3, 1.3, g)
    planta(-2.5, 1.5, g); luminaria(2.6, -1.5, g) })()

  }
  /* boneco low poly feito por código */
  function boneco(c: any) {
    const r = new T.Group(), hips = grupo(r); const p: any = { r, hips }
    cx(0.46, 0.5, 0.26, c.camisa, 0, 0.25, 0, hips)
    cx(0.2, 0.05, 0.27, 0xF4EFE6, 0, 0.49, 0.005, hips)
    const head = grupo(hips, 0, 0.5, 0); p.head = head
    cx(0.14, 0.08, 0.14, c.pele, 0, 0.03, 0, head)
    cx(0.44, 0.4, 0.4, c.pele, 0, 0.26, 0, head)
    /* olhos articulados só no mini: piscar não achata a cabeça ou os óculos */
    const olhos = o.mini ? grupo(head, 0, .25, 0) : head; p.olhos = olhos
    ;[-0.1, 0.1].forEach(x => { cx(0.08, 0.06, 0.02, 0xF7F3EC, x, o.mini ? 0 : .25, .204, olhos); cx(0.04, 0.05, 0.02, 0x2A211B, x, o.mini ? -.002 : .248, .212, olhos) })
    if (o.mini) fecha(olhos)
    cx(0.1, 0.025, 0.02, c.cabelo, -0.1, 0.335, 0.205, head); cx(0.1, 0.025, 0.02, c.cabelo, 0.1, 0.335, 0.205, head)
    cx(0.06, 0.07, 0.05, c.pele, 0, 0.2, 0.22, head)
    cx(0.12, 0.025, 0.02, 0x9A5A4C, 0, 0.12, 0.205, head)
    const cabelo = o.mini ? grupo(head, 0, .4, -.08) : head; p.cabelo = cabelo
    cx(0.48, 0.13, 0.44, c.cabelo, 0, o.mini ? .09 : .49, o.mini ? .08 : 0, cabelo); cx(0.48, 0.26, 0.1, c.cabelo, 0, .36, -.19, head); cx(0.48, 0.07, 0.08, c.cabelo, 0, .43, .19, head)
    if (c.estilo === 'longo') { cx(0.5, 0.5, 0.1, c.cabelo, 0, o.mini ? -.22 : .18, o.mini ? -.12 : -.2, cabelo); cx(0.07, 0.42, 0.3, c.cabelo, -.245, o.mini ? -.18 : .22, o.mini ? .03 : -.05, cabelo); cx(0.07, 0.42, 0.3, c.cabelo, .245, o.mini ? -.18 : .22, o.mini ? .03 : -.05, cabelo) }
    if (c.estilo === 'coque') { cx(0.2, 0.18, 0.2, c.cabelo, 0, o.mini ? .23 : .63, o.mini ? 0 : -.08, cabelo) }
    if (o.mini) fecha(cabelo)
    if (c.oculos) { [-0.1, 0.1].forEach(x => { cx(0.17, 0.02, 0.02, 0x1E1E22, x, 0.315, 0.225, head); cx(0.17, 0.02, 0.02, 0x1E1E22, x, 0.185, 0.225, head); cx(0.02, 0.15, 0.02, 0x1E1E22, x - 0.075, 0.25, 0.225, head); cx(0.02, 0.15, 0.02, 0x1E1E22, x + 0.075, 0.25, 0.225, head) }) }
    function braco(x: number) { const b = grupo(hips, x, 0.44, 0); cx(0.13, 0.24, 0.14, c.camisa, 0, -0.12, 0, b); const e = grupo(b, 0, -0.24, 0); cx(0.115, 0.2, 0.125, c.pele, 0, -0.1, 0, e); cx(0.125, 0.09, 0.135, c.pele, 0, -0.24, 0, e); fecha(b); fecha(e); return { o: b, e } }
    function perna(x: number) { const b = grupo(hips, x, 0, 0); cx(0.18, 0.26, 0.2, c.calca, 0, -0.13, 0, b); const k = grupo(b, 0, -0.26, 0); cx(0.165, 0.22, 0.185, c.calca, 0, -0.11, 0, k); cx(0.175, 0.07, 0.27, 0x2A2623, 0, -0.255, 0.035, k); fecha(b); fecha(k); return { o: b, k } }
    p.bL = braco(-0.3); p.bR = braco(0.3); p.pL = perna(-0.12); p.pR = perna(0.12)
    fecha(hips); fecha(head)
    return p
  }
  const HIP_PE = 0.555, HIP_SENTADO = 0.325

  const chars: any[] = [], usadas: Record<string, number[]> = {}
  /* tela acesa pelo estado (B6): trabalhando acesa, precisa de você meia luz, o resto quase apagada */
  const luzTela = (st: EstadoCena) => (st === 'trabalhando' ? 0.9 : st === 'precisa' ? 0.5 : 0.12)
  o.funcionarios.forEach((e, i) => {
    const sala = SALAS[e.sala] ? e.sala : 'recepcao'
    const s = SALAS[sala], g = salaG[sala]
    // C2: a mesa vem da lista única; se a dela já estiver ocupada (ou o funcionário for novo), a 1ª livre
    const u = usadas[sala] || (usadas[sala] = []), quer = POR_ID[e.id]?.sala === sala ? POR_ID[e.id].mesa : null
    const xs = quer != null && !u.includes(quer) ? quer : ([-2, 0, 2].find(x => !u.includes(x)) ?? [-2, 0, 2][u.length % 3]); u.push(xs)
    /* mesa, notebook, cadeira */
    cx(o.mini ? 1.65 : 1.1, 0.06, o.mini ? .85 : .6, MADEIRA, xs, 0.6, -1.0, g); [[-0.48, -0.24], [0.48, -0.24], [-0.48, 0.24], [0.48, 0.24]].forEach(q => { cx(0.06, 0.57, 0.06, MADEIRA_E, xs + q[0], 0.285, -1.0 + q[1], g) })
    if (!o.mini) cx(0.42, 0.02, 0.28, 0x8E949C, xs, 0.64, -1.06, g, true)
    const telaMat = guardar(new T.MeshLambertMaterial({ color: 0x22272E, emissive: 0xD7EADF, emissiveIntensity: luzTela(e.estado) }))
    if (!o.mini) { const monitor = cx(0.42, 0.27, 0.02, telaMat, xs, 0.775, -0.9, g); monitor.rotation.x = 0.18 }
    mancha(0.62, xs, 0.045, -1.25, g)
    if (!o.mini) cx(0.1, 0.12, 0.1, 0xF1EADF, xs + 0.4, 0.69, -0.84, g, true)
    const pilha = grupo(g, xs - 0.36, 0.63, -0.86); cx(0.3, 0.03, 0.22, PAPEL, 0, 0.015, 0, pilha); cx(0.3, 0.03, 0.22, 0xDDD3C2, 0.02, 0.045, 0.01, pilha); cx(0.3, 0.03, 0.22, PAPEL, -0.01, 0.075, 0, pilha); fecha(pilha); pilha.visible = false
    if (!o.mini || !ATIVIDADES_MINI[e.id]?.emPe) {
      cx(0.44, 0.06, 0.44, CADEIRA, xs, 0.21, -1.72, g); cx(0.44, 0.5, 0.06, CADEIRA, xs, 0.5, -1.94, g); cx(0.07, 0.18, 0.07, 0x33373D, xs, 0.09, -1.72, g); cx(0.4, 0.03, 0.4, 0x33373D, xs, 0.015, -1.72, g, true)
    }
    if (!o.mini) {
    const objeto = POR_ID[e.id]?.objeto || 'pasta'
    const acessorio = grupo(g, xs + 0.34, 0.65, -1.08)
    const cor = POR_ID[e.id]?.roupa.camisa || 0x6474A0
    if (objeto === 'grafico' || objeto === 'painel solar') {
      ;[0.08, 0.16, 0.24].forEach((h, j) => cx(0.05, h, 0.12, cor, j * 0.07 - 0.07, h / 2, 0, acessorio))
    } else if (['cofre', 'caixa', 'presente', 'cesta'].includes(objeto)) {
      cx(0.22, 0.18, 0.18, cor, 0, 0.09, 0, acessorio)
      cx(0.04, 0.2, 0.19, 0xD8C27A, 0, 0.1, 0, acessorio)
    } else {
      cx(0.2, 0.025, 0.25, cor, 0, 0.015, 0, acessorio)
      const linhas = objeto === 'calculadora' ? 3 : objeto === 'cartao' ? 1 : 2
      for (let j = 0; j < linhas; j++) cx(0.14, 0.01, 0.02, PAPEL, 0, 0.035, -0.07 + j * 0.06, acessorio)
    }
    fecha(acessorio)
    }
    const b = boneco(POR_ID[e.id]?.roupa || RESERVA[i % RESERVA.length])
    mancha(0.3, 0, 0.07, 0, b.r)
    b.r.traverse((x: any) => { x.userData.id = e.id })
    scene.add(b.r)
    const xg = xs + (xs >= 2 ? -1 : 1), zf = s.d === 5 ? 1.45 : 1.2
    const W = (x: number, z: number) => new T.Vector3(s.cx + x, 0, s.cz + z)
    const ch: any = { id: e.id, sala, st: e.estado, b, pilha, tela: telaMat, S: W(xs, -1.72), G1: W(xg, -1.72), G2: W(xg, zf - 0.5), F: W(xs, zf - 0.5), loc: 'sentado', path: null, fase: i * 1.7, festa: 0, anim: true, pose: {} }
    if (o.mini) {
      ch.fase = faseDoId(e.id)
      const palco = new T.Group(); palco.position.copy(ch.S); scene.add(palco)
      ch.trabalho = montarAtividade(e.id, { T, pai: palco, geo: GEO, mat, guardar })
      ch.estado = estadoMini(e.estado); ch.legadoRecebido = e.estado; ch.tempoEstado = 0; ch.tempoTrabalho = ch.fase; ch.pesoTrabalho = ch.estado === 'trabalhando' ? 1 : 0
      ch.micro = ch.fase; ch.rotacao = 0
      // Indicador de pergunta: peça sólida da paleta, sem luz nem transparência animada.
      const sinal = new T.Group(); palco.add(sinal); sinal.position.set(-.58, 1.48, .1)
      cx(.055, .16, .055, mat(0xD8C27A), 0, 0, 0, sinal, true); cx(.055, .04, .055, mat(0xD8C27A), 0, -.14, 0, sinal, true)
      ch.sinal = sinal
      sinal.name = `chamada:${e.id}`
      // Caneca, vapor voxel e relógio: microvida compartilhada, nunca competem com a atividade.
      const cafe = new T.Group(); palco.add(cafe); cafe.position.set(-.7, .69, .85)
      ch.cafe = cafe
      cx(.13, .14, .13, mat(0xF1EADF), 0, 0, 0, cafe, true); cx(.07, .07, .035, mat(MADEIRA_E), -.09, 0, 0, cafe, true)
      ch.vapor = new T.Group(); cafe.add(ch.vapor)
      for (let j = 0; j < 2; j++) cx(.025, .08, .025, mat(0xDDD3C2), .04 * j, .17 + j * .1, 0, ch.vapor, true)
      ch.relogio = new T.Group(); b.bL.e.add(ch.relogio); ch.relogio.position.set(0, -.19, .075)
      cx(.09, .09, .02, mat(PAPEL), 0, 0, 0, ch.relogio, true)
      ch.ponteiro = cx(.015, .035, .015, mat(MADEIRA_E), 0, .012, .02, ch.relogio, true)
      ch.joinha = new T.Group(); b.bR.e.add(ch.joinha); ch.joinha.position.set(0, -.26, .04)
      ch.joinha.name = `joinha:${e.id}`
      cx(.055, .14, .07, mat(POR_ID[e.id]?.roupa.pele || 0xD9A27E), -.065, 0, 0, ch.joinha, true)
      b.r.name = `agente:${e.id}`; b.r.userData.estado = ch.estado
    }
    if (!o.mini && e.estado === 'precisa') { ch.loc = 'frente'; b.r.position.copy(ch.F); b.r.rotation.y = Math.PI / 4 } else { b.r.position.copy(ch.S) }
    chars.push(ch)
  })
  ;[0, 1].forEach(i => { if (FIXO[i].length) { const m = mesclar(FIXO[i]); m.castShadow = i === 0; scene.add(m) } })

  /* câmera isométrica */
  const cam = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 100)
  const miniCamera = o.mini && chars[0] ? ATIVIDADES_MINI[chars[0].id]?.camera : null
  const DIR = new T.Vector3(...(miniCamera?.direcao || [1, .86, 1])).normalize()
  cam.position.copy(DIR).multiplyScalar(40); cam.lookAt(0, 0, 0); cam.updateMatrixWorld()
  const Rt = new T.Vector3(), Up = new T.Vector3(), Fw = new T.Vector3(); cam.matrixWorld.extractBasis(Rt, Up, Fw)
  function vistaDe(x0: number, x1: number, y1: number, z0: number, z1: number) { const a = [1e9, -1e9, 1e9, -1e9], v = new T.Vector3(); [x0, x1].forEach(x => { [0, y1].forEach(y => { [z0, z1].forEach(z => { v.set(x, y, z).sub(cam.position); const cxx = v.dot(Rt), cy = v.dot(Up); a[0] = Math.min(a[0], cxx); a[1] = Math.max(a[1], cxx); a[2] = Math.min(a[2], cy); a[3] = Math.max(a[3], cy) }) }) }); return { cx: (a[0] + a[1]) / 2, cy: (a[2] + a[3]) / 2, hw: (a[1] - a[0]) / 2, hh: (a[3] - a[2]) / 2 } }
  /* B3 e B4 (pacote 4): enquadramento mais justo; cada sala só com ela mesma */
  const VISTAS: Record<string, any> = { tudo: vistaDe(-6.2, 12.2, 2.2, -5.2, 9.3) }
  Object.keys(SALAS).forEach(k => { const s = SALAS[k]; VISTAS[k] = vistaDe(s.cx - 3, s.cx + 3, 1.9, s.cz - s.d / 2, s.cz + s.d / 2) })
  if (o.mini && chars[0]) {
    const ch = chars[0]
    VISTAS[ch.sala] = vistaDe(ch.S.x - (miniCamera?.largura || 1.15), ch.S.x + (miniCamera?.largura || 1.15), ATIVIDADES_MINI[ch.id]?.emPe ? 1.95 : 1.72, ch.S.z - .35, ch.S.z + (miniCamera?.fundo || 1.35))
  }
  let vAtual = { ...VISTAS[o.mini ? chars[0]?.sala || 'tudo' : 'tudo'] }, vDe: any = null, vPara: any = null, vT0 = 0, camNome = o.mini ? chars[0]?.sala || 'tudo' : 'tudo'
  function aplicaVista(v: any) { const W = el.clientWidth || 1, H = el.clientHeight || 1, a = W / H, m = camNome === 'tudo' ? 1.04 : 1.12, hw = Math.max(v.hw * m, v.hh * m * a), hh = hw / a; cam.left = v.cx - hw; cam.right = v.cx + hw; cam.top = v.cy + hh; cam.bottom = v.cy - hh; cam.updateProjectionMatrix() }
  function irPara(nome: string) { if (!VISTAS[nome]) nome = 'tudo'; camNome = nome; vDe = { ...vAtual }; vPara = VISTAS[nome]; vT0 = performance.now(); chars.forEach(c => { c.tk = '' }) }
  let largura = 0, altura = 0, dpr = pr
  function tamanho() {
    const W = el.clientWidth, H = el.clientHeight
    if (!W || !H) return
    const novo = Math.min(window.devicePixelRatio || 1, degrau > 0 ? 1 : MOBILE() ? 1.5 : 2)
    if (novo !== dpr) { dpr = novo; renderer.setPixelRatio(dpr) }
    if (W !== largura || H !== altura) { largura = W; altura = H; renderer.setSize(W, H, false); aplicaVista(vAtual) }
  }
  const redimensionar = () => { tamanho(); solicitar() }
  window.addEventListener('resize', redimensionar)
  limpezas.push(() => window.removeEventListener('resize', redimensionar))
  const ro = 'ResizeObserver' in window ? new ResizeObserver(redimensionar) : null
  limpezas.push(() => ro?.disconnect())
  ro?.observe(el)

  /* etiquetas em HTML presas à cabeça de cada boneco e nome da sala no piso */
  const v3 = new T.Vector3()
  function naTela(x: number, y: number, z: number) { v3.set(x, y, z).project(cam); return { x: (v3.x * 0.5 + 0.5) * el.clientWidth, y: (-v3.y * 0.5 + 0.5) * el.clientHeight } }
  let selecionado: string | null = null
  function atualizaTags() {
    const W = el.clientWidth, H = el.clientHeight, caixas: number[][] = []
    const ordem = chars.slice().sort((a, b) => { const pa = a.st === 'precisa' ? 0 : a.id === selecionado ? 1 : 2, pb = b.st === 'precisa' ? 0 : b.id === selecionado ? 1 : 2; return pa - pb })
    ordem.forEach(ch => {
      const t: any = o.etiqueta(ch.id); if (!t) return
      const chave = t.dataset.k || ''
      if (ch.tk !== chave || !ch.tw) { ch.tk = chave; ch.tw = t.offsetWidth; ch.th = t.offsetHeight }
      const hy = ch.b.hips.position.y + 1.12, p = naTela(ch.b.r.position.x, hy, ch.b.r.position.z)
      const x0 = Math.round(p.x - ch.tw / 2), y0 = Math.round(p.y - ch.th - 4)
      const fora = p.y < 0 || p.y > H + 20 || p.x < -10 || p.x > W + 10 || (camNome !== 'tudo' && ch.sala !== camNome && ch.id !== selecionado)
      let x = x0, y = y0, bate = false
      const tent = [[0, 0], [0, -ch.th - 4], [ch.tw * 0.55, -ch.th * 0.5], [-ch.tw * 0.55, -ch.th * 0.5], [ch.tw * 0.7, -ch.th - 4], [-ch.tw * 0.7, -ch.th - 4], [0, -2 * ch.th - 8], [ch.tw, 0], [-ch.tw, 0], [0, ch.th + 40]]
      for (let k = 0; k < tent.length; k++) {
        x = Math.max(4, Math.min(W - ch.tw - 4, Math.round(x0 + tent[k][0]))); y = Math.round(y0 + tent[k][1]); bate = y < 2
        for (let i = 0; i < caixas.length && !bate; i++) { const c = caixas[i]; if (x < c[0] + c[2] + 3 && x + ch.tw + 3 > c[0] && y < c[1] + c[3] + 3 && y + ch.th + 3 > c[1]) bate = true }
        if (!bate) break
      }
      if (fora || bate) { t.style.visibility = 'hidden' } else { t.style.visibility = 'visible'; t.style.transform = `translate(${x}px,${y}px)`; caixas.push([x, y, ch.tw, ch.th]) }
    })
    Object.keys(SALAS).forEach(k => {
      const d: any = o.placa(k); if (!d) return
      const q = SALAS[k].rot, p = naTela(q[0], q[1], q[2]); if (!d._w) d._w = d.offsetWidth
      const px = Math.round(p.x - d._w / 2), py = Math.round(p.y - 9)
      let fora = p.y < 10 || p.y > H - 10 || p.x < d._w / 2 || p.x > W - d._w / 2
      // o nome da sala cede a vez: se bater numa etiqueta de funcionário, some
      for (let i = 0; i < caixas.length && !fora; i++) { const c = caixas[i]; if (px < c[0] + c[2] + 2 && px + d._w + 2 > c[0] && py < c[1] + c[3] + 2 && py + 18 + 2 > c[1]) fora = true }
      d.style.visibility = fora ? 'hidden' : 'visible'; d.style.transform = `translate(${px}px,${py}px)`
    })
  }

  /* toque num boneco */
  const ray = new T.Raycaster(), ndc = new T.Vector2()
  const ponteiro = { x: 0, y: 0, dentro: false }
  const acompanhar = (ev: PointerEvent) => {
    if (!o.mini || reduz) return
    const r = tela3d.getBoundingClientRect()
    ponteiro.x = Math.max(-1, Math.min(1, (ev.clientX - r.left) / r.width * 2 - 1))
    ponteiro.y = Math.max(-1, Math.min(1, (ev.clientY - r.top) / r.height * 2 - 1)); ponteiro.dentro = true
  }
  const saiu = () => { ponteiro.dentro = false }
  if (o.mini) {
    tela3d.addEventListener('pointermove', acompanhar); tela3d.addEventListener('pointerleave', saiu)
    limpezas.push(() => { tela3d.removeEventListener('pointermove', acompanhar); tela3d.removeEventListener('pointerleave', saiu) })
  }
  let down: { x: number; y: number } | null = null
  const aoDescer = (ev: PointerEvent) => { down = { x: ev.clientX, y: ev.clientY } }
  const aoSubir = (ev: PointerEvent) => {
    if (!down || Math.abs(ev.clientX - down.x) + Math.abs(ev.clientY - down.y) > 10) return
    const r = tela3d.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, cam); const hit = ray.intersectObjects(chars.map(c => c.b.r), true)
    if (hit.length) o.aoTocar(hit[0].object.userData.id)
  }
  tela3d.addEventListener('pointerdown', aoDescer); tela3d.addEventListener('pointerup', aoSubir)
  limpezas.push(() => { tela3d.removeEventListener('pointerdown', aoDescer); tela3d.removeEventListener('pointerup', aoSubir) })

  /* sol, céu e lâmpadas pela hora */
  let escuro = o.escuro
  function luzDaHora(h: number) {
    const f = (h - 5.5) / 13, dia = f > 0 && f < 1, k = dia ? Math.sin(f * Math.PI) : 0, te = escuro ? 0.72 : 1
    const x = dia ? 2 + 8 * f : 5
    sol.position.set(x, 7 + 9 * k, dia ? 10 - 6 * f : 6); sol.target.position.set(0, 0, 2)
    const quente = dia ? Math.min(1, k * 2.2) : 0
    sol.color.setRGB(1, 0.80 + 0.16 * quente, 0.62 + 0.26 * quente)
    sol.intensity = (dia ? 1.0 + 2.0 * Math.min(1, k * 1.6) : 0.35) * te
    if (!dia) sol.color.setHex(0x9FB2D6)
    /* à noite a cena fica mais quente e mais baixa, mas nunca escura a ponto de não dar pra ler quem é quem */
    hemi.intensity = (dia ? 0.55 + 0.3 * Math.min(1, k * 1.6) : 0.6) * te
    const noite = dia ? Math.max(0, 1 - k * 4) : 1
    lampadas.forEach(L => { L.l.intensity = noite * 14; L.m.emissiveIntensity = noite * 1.4 })
    vidro.emissiveIntensity = dia ? 0.25 + 0.3 * k : 0.02; vidro.color.setHex(dia ? 0xBFD8E6 : 0x2B3A4E)
  }
  function setTema(d: boolean) { escuro = d; baseMat.color.setHex(d ? 0x2A2520 : 0xE2DACC); luzDaHora(o.hora()) }
  setTema(escuro)

  /* movimento */
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const VEL = 1.25
  function pose(ch: any, alvo: any, dt: number) {
    const p = ch.pose, k = Math.min(1, dt * 9); for (const n in alvo) { p[n] = p[n] === undefined ? alvo[n] : lerp(p[n], alvo[n], k) }
    const b = ch.b; b.hips.position.y = p.hy; b.hips.rotation.x = p.hx; b.head.rotation.x = p.cx; b.head.rotation.y = p.cy
    b.bL.o.rotation.x = p.lx; b.bL.o.rotation.z = p.lz; b.bL.e.rotation.x = p.le; b.bR.o.rotation.x = p.rx; b.bR.o.rotation.z = p.rz; b.bR.e.rotation.x = p.re; b.bR.e.rotation.z = p.rez
    b.pL.o.rotation.x = p.tl; b.pL.k.rotation.x = p.kl; b.pR.o.rotation.x = p.tr; b.pR.k.rotation.x = p.kr
  }
  function atualizaChar(ch: any, t: number, dt: number) {
    if (o.mini) { atualizaMini(ch, dt); return }
    if (ch.retornaTrabalho && !reduz) { ch.tempoEstado += dt; if (ch.tempoEstado >= 1.6) { ch.st = 'trabalhando'; ch.retornaTrabalho = false } }
    const st: EstadoCena = ch.st, b = ch.b, a = ch.anim && !reduz ? 1 : 0, ph = t + ch.fase
    ch.pilha.visible = st === 'entregue' || st === 'precisa'
    if (ch.telaSt !== st) { ch.telaSt = st; ch.tela.emissiveIntensity = luzTela(st) }
    /* decide pra onde ir: quem precisa de você levanta e vai pra frente da sala; resolveu, volta pra mesa */
    if (!ch.path) {
      if (st === 'precisa' && ch.loc === 'sentado') { ch.path = [ch.G1, ch.G2, ch.F]; ch.dest = 'frente' }
      else if (st !== 'precisa' && ch.loc === 'frente') { ch.path = [ch.G2, ch.G1, ch.S]; ch.dest = 'sentado' }
    }
    let alvo: any
    if (ch.path) {
      const pt = ch.path[0], dx = pt.x - b.r.position.x, dz = pt.z - b.r.position.z, d = Math.sqrt(dx * dx + dz * dz), passo = VEL * dt
      if (d <= passo) { b.r.position.x = pt.x; b.r.position.z = pt.z; ch.path.shift(); if (!ch.path.length) { ch.path = null; ch.loc = ch.dest } }
      else { b.r.position.x += dx / d * passo; b.r.position.z += dz / d * passo; const ang = Math.atan2(dx, dz); let da = ang - b.r.rotation.y; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; b.r.rotation.y += da * Math.min(1, dt * 12) }
      const s = Math.sin(ph * 9)
      alvo = { hy: HIP_PE + Math.abs(s) * 0.02, hx: 0.04, cx: 0, cy: 0, lx: s * 0.55, lz: 0, le: -0.25, rx: -s * 0.55, rz: 0, re: -0.25, rez: 0, tl: -s * 0.6, kl: Math.max(0, s) * 0.7, tr: s * 0.6, kr: Math.max(0, -s) * 0.7 }
    } else if (ch.loc === 'frente') {
      const da2 = Math.PI / 4 - b.r.rotation.y; b.r.rotation.y += da2 * Math.min(1, dt * 8)
      alvo = { hy: HIP_PE + a * Math.abs(Math.sin(ph * 3)) * 0.015, hx: 0, cx: -0.08, cy: 0, lx: 0, lz: 0, le: -0.15, rx: 0, rz: 2.55, re: 0, rez: a * Math.sin(ph * 7) * 0.45, tl: 0, kl: 0, tr: 0, kr: 0 }
    } else {
      const da3 = 0 - b.r.rotation.y; b.r.rotation.y += da3 * Math.min(1, dt * 8)
      const base: any = { hy: HIP_SENTADO, hx: 0, cx: 0, cy: 0, lx: 0, lz: 0, le: 0, rx: 0, rz: 0, re: 0, rez: 0, tl: -1.5, kl: 1.5, tr: -1.5, kr: 1.5 }
      if (ch.festa > 0) { ch.festa -= dt; base.lx = base.rx = -2.7; base.lz = -0.25; base.rz = 0.25; base.cx = -0.2 }
      else if (st === 'trabalhando') { base.hx = 0.1; base.cx = 0.16; base.lx = -0.62 + a * Math.sin(ph * 13) * 0.05; base.rx = -0.62 - a * Math.sin(ph * 13) * 0.05; base.le = -1.05 + a * Math.sin(ph * 13 + 1) * 0.08; base.re = -1.05 - a * Math.sin(ph * 13 + 1) * 0.08; base.cy = a * Math.sin(ph * 0.7) * 0.08 }
      else if (st === 'entregue') { base.hx = -0.12; base.lx = base.rx = -0.25; base.le = base.re = -0.9; base.cy = a * Math.sin(ph * 0.5) * 0.35; base.cx = -0.03 }
      else { base.lx = base.rx = -0.3; base.le = base.re = -0.8; base.cy = a * Math.sin(ph * 0.4) * 0.2; base.cx = 0.05 }
      alvo = base
    }
    pose(ch, alvo, ch.pose.hy === undefined ? 1 : dt)
  }

  function mudarMini(ch: any, estado: EstadoAgente) {
    if (ch.estado === estado) return
    ch.estado = estado; ch.st = estadoLegado(estado); ch.tempoEstado = 0
    ch.b.r.userData.estado = estado
  }
  function atualizaMini(ch: any, dt: number) {
    const b = ch.b, k = reduz ? 1 : Math.min(1, dt * 9)
    ch.tempoEstado += reduz ? 0 : dt
    if (ch.estado === 'resolvido' && ch.tempoEstado >= 1.6) mudarMini(ch, 'trabalhando')
    const st: EstadoAgente = ch.estado
    ch.pesoTrabalho = lerp(ch.pesoTrabalho, st === 'trabalhando' ? 1 : 0, k)
    if (!reduz) ch.tempoTrabalho += dt * ch.pesoTrabalho
    // Abaixo de 24fps, só o relógio da atividade avança; microposes ficam congeladas.
    if (!reduz && degrau === 0 && fps !== 0 && fps < 24) ch.microCongelada = true
    else if (degrau === 0 && fps >= 24) ch.microCongelada = false
    if (!reduz && degrau === 0 && !ch.microCongelada) ch.micro += dt
    const micro = ch.micro, t = ch.tempoTrabalho
    const respira = reduz ? 0 : Math.sin(micro * 2) * .006
    const emPe = !!ATIVIDADES_MINI[ch.id]?.emPe
    const alvo: any = { hy: (emPe ? HIP_PE : HIP_SENTADO) + respira, hx: .06, cx: .12, cy: 0,
      lx: -.7, lz: 0, le: -1.1, rx: -.7, rz: 0, re: -1.1, rez: 0,
      tl: emPe ? -.03 : -1.5, kl: emPe ? .03 : 1.5, tr: emPe ? .03 : -1.5, kr: emPe ? .02 : 1.5 }
    Object.assign(alvo, ch.trabalho.pose(t))
    ch.trabalho.animar(t)
    const chamar = st === 'chamando', resolveu = st === 'resolvido'
    if (chamar) Object.assign(alvo, { hx: 0, cx: -.06, cy: 0, lx: -.3, le: -.4, rx: -.15, rz: 2.45, re: -.2, rez: reduz ? .2 : Math.sin(ch.tempoEstado * 6 + ch.fase) * .25 })
    if (resolveu) Object.assign(alvo, { hx: -.04, cx: -.08, cy: .1, rx: -1.25, rz: -.18, re: -1.7, rez: 0 })
    const pausa = Math.floor(ch.fase * 10) % 3
    if (st === 'parado') {
      // Três pausas estáveis por id: relógio, alongamento de ombros e café.
      Object.assign(alvo, pausa === 0 ? { lx: -.95, le: -1.9, rx: -.25, re: -.5, cx: .35, cy: -.25 }
        : pausa === 1 ? { lx: -2.1, le: -1.4, lz: -.3, rx: -2.1, re: -1.4, rz: .3, cx: -.13 }
          : { lx: -1, le: -1.8, rx: -.25, re: -.7, hx: 0, cx: .08, cy: -.16 })
    }
    const tomandoCafe = st === 'parado' && pausa === 2
    ch.cafe.position.x = lerp(ch.cafe.position.x, tomandoCafe ? -.3 : -.7, k)
    ch.cafe.position.y = lerp(ch.cafe.position.y, tomandoCafe ? (emPe ? HIP_PE : HIP_SENTADO) + .56 : .69, k)
    ch.cafe.position.z = lerp(ch.cafe.position.z, tomandoCafe ? .28 : .85, k)
    ch.cafe.rotation.x = lerp(ch.cafe.rotation.x, tomandoCafe ? -.2 + (reduz ? 0 : Math.sin(micro) * .035) : 0, k)
    const olhando = (chamar || resolveu) ? Math.atan2(DIR.x, DIR.z) : 0
    ch.rotacao = lerp(ch.rotacao, olhando, k); b.r.rotation.y = ch.rotacao
    if (ponteiro.dentro && st !== 'parado' && !reduz && degrau === 0 && !ch.microCongelada) { alvo.cy += ponteiro.x * .13; alvo.cx += ponteiro.y * .06 }
    pose(ch, alvo, reduz || ch.pose.hy === undefined ? 1 : dt)
    b.olhos.scale.y = reduz ? 1 : Math.pow(Math.max(0, Math.sin(micro * 1.07)), 48) > .8 ? .08 : 1
    b.cabelo.rotation.z = reduz ? 0 : Math.sin(micro * 1.4) * .018
    ch.vapor.position.y = reduz ? 0 : (1 + Math.sin(micro * 1.2)) * .035
    ch.vapor.rotation.z = reduz ? 0 : Math.sin(micro * 1.5) * .12
    ch.ponteiro.rotation.z = -micro * .12
    ch.sinal.visible = chamar; ch.sinal.scale.setScalar(reduz ? 1 : 1 + Math.sin(ch.tempoEstado * 3) * .09)
    ch.joinha.visible = resolveu; ch.pilha.visible = false
  }

  /* laço */
  let visivel = true, ult = 0, tAcum = 0, fps = 0, baixo = 0, degrau = 0, segAnim = 0, segLuz = 0, jsMs = 0, raf = 0, vivo = true
  const fpsHist: number[] = []
  const retornos = new Map<string, { timer?: ReturnType<typeof setTimeout>; restante: number; inicio: number }>()
  function sincronizarRetornos() {
    retornos.forEach((r, id) => {
      const pode = visivel && !document.hidden && !perdido
      if (!pode && r.timer !== undefined) { clearTimeout(r.timer); r.timer = undefined; r.restante = Math.max(0, r.restante - (performance.now() - r.inicio)) }
      if (pode && r.timer === undefined) {
        r.inicio = performance.now()
        r.timer = setTimeout(() => { retornos.delete(id); definirEstado(id, 'trabalhando') }, r.restante)
      }
    })
  }
  limpezas.push(() => { retornos.forEach(r => clearTimeout(r.timer)); retornos.clear() })
  let perdido = false
  let recuperacao: ReturnType<typeof setTimeout> | undefined
  const medidor = new MedidorFPS()
  function pausar() { cancelAnimationFrame(raf); raf = 0; ult = 0; medidor.pausar(); baixo = 0 }
  function solicitar() {
    if (!vivo || destruida || perdido || !visivel || document.hidden || raf) return
    if (o.mini && reduz) quadro(performance.now())
    else raf = requestAnimationFrame(quadro)
  }
  const visibilidade = () => { pausar(); sincronizarRetornos(); solicitar() }
  document.addEventListener('visibilitychange', visibilidade)
  const perdeu = (ev: Event) => {
    ev.preventDefault(); perdido = true; pausar(); sincronizarRetornos(); o.aoContexto?.('perdido'); clearTimeout(recuperacao)
    recuperacao = setTimeout(() => { if (perdido && vivo) { o.aoContexto?.('falhou'); destruir() } }, 8000)
  }
  const restaurou = () => { if (!vivo || destruida) return; clearTimeout(recuperacao); perdido = false; o.aoContexto?.('restaurado'); tamanho(); sincronizarRetornos(); solicitar() }
  tela3d.addEventListener('webglcontextlost', perdeu); tela3d.addEventListener('webglcontextrestored', restaurou)
  limpezas.push(() => { vivo = false; pausar(); clearTimeout(recuperacao); document.removeEventListener('visibilitychange', visibilidade); tela3d.removeEventListener('webglcontextlost', perdeu); tela3d.removeEventListener('webglcontextrestored', restaurou) })
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(en => { visivel = en[0].isIntersecting; visibilidade() }) : null
  limpezas.push(() => io?.disconnect())
  io?.observe(el)
  function quadro(agora: number) {
    raf = 0
    if (!vivo || destruida || perdido || !visivel || document.hidden) { pausar(); return }
    const agora0 = performance.now()
    const dt = ult ? Math.min(0.05, (agora - ult) / 1000) : 0; ult = agora; tAcum += dt
    tamanho()
    segLuz -= dt; if (segLuz <= 0) { segLuz = 30; luzDaHora(o.hora()) }
    /* no celular, no máximo 8 bonecos animados ao mesmo tempo; no modo mais leve, 4 */
    segAnim -= dt; if (segAnim <= 0) { segAnim = 1; let lim = MOBILE() ? 8 : 99; if (degrau >= 3) lim = 4; const pr2 = (c: any) => (c.path ? 0 : c.st === 'precisa' ? 1 : c.id === selecionado ? 2 : c.st === 'trabalhando' ? 3 : 4); chars.slice().sort((a, b) => pr2(a) - pr2(b)).forEach((c, i) => { c.anim = i < lim || !!c.path }) }
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]
      if (reduz && !o.mini) { ch.path = null; ch.loc = ch.st === 'precisa' ? 'frente' : 'sentado'; ch.b.r.position.copy(ch.loc === 'frente' ? ch.F : ch.S); ch.b.r.rotation.y = ch.loc === 'frente' ? Math.PI / 4 : 0 }
      atualizaChar(ch, tAcum, reduz ? 1 : dt)
    }
    if (vPara) { const k = reduz ? 1 : Math.min(1, (agora - vT0) / 1200), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; ['cx', 'cy', 'hw', 'hh'].forEach(n => { vAtual[n] = lerp(vDe[n], vPara[n], e) }); aplicaVista(vAtual); if (k >= 1) vPara = null }
    try { renderer.render(scene, cam) } catch { o.aoContexto?.('falhou'); destruir(); return }
    atualizaTags()
    jsMs = jsMs * 0.95 + (performance.now() - agora0) * 0.05
    /* fluidez: mede 1 vez por segundo e alivia em 3 degraus se ficar abaixo de 24 imagens por segundo */
    const amostra = reduz ? null : medidor.quadro(agora)
    if (amostra !== null) {
      fps = amostra; fpsHist.push(fps); if (fpsHist.length > 60) fpsHist.shift()
      if (fps < 24) { baixo++; if (baixo >= 4 && degrau < 3) { degrau++; baixo = 0; if (degrau === 1) { tamanho() } if (degrau === 2) { renderer.shadowMap.enabled = false; sol.castShadow = false; sol.shadow.dispose(); sol.shadow.map = null; sol.shadow.mapPass = null; scene.traverse((x: any) => { if (x.material) x.material.needsUpdate = true }) } } } else baixo = 0
      o.aoMedir?.(fps, degrau)
    }
    if (!reduz) solicitar()
  }
  let consultaDpr: MediaQueryList | undefined
  const mudouDpr = () => { observarDpr(); redimensionar() }
  function observarDpr() {
    consultaDpr?.removeEventListener('change', mudouDpr)
    consultaDpr = window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)')
    consultaDpr.addEventListener('change', mudouDpr)
  }
  limpezas.push(() => consultaDpr?.removeEventListener('change', mudouDpr))
  observarDpr()
  tamanho(); solicitar()

  // Sem loop com movimento reduzido; apenas a celebração tem um retorno pontual.
  function definirEstado(id: string, estado: EstadoAgente) {
    if (destruida) return
    const ch = chars.find(c => c.id === id)
    if (!ch) return
    if (o.mini && ch.estado === estado) return
    clearTimeout(retornos.get(id)?.timer); retornos.delete(id)
    if (o.mini) mudarMini(ch, estado)
    else { ch.st = estadoLegado(estado); ch.tempoEstado = 0; ch.retornaTrabalho = estado === 'resolvido'; if (ch.retornaTrabalho) ch.festa = 1.6 }
    if (reduz && estado === 'resolvido') { retornos.set(id, { restante: 1600, inicio: 0 }); sincronizarRetornos() }
    solicitar()
  }
  // Também cobre a montagem já em entregue.
  if (o.mini && reduz) chars.filter(ch => ch.estado === 'resolvido').forEach(ch => {
    retornos.set(ch.id, { restante: 1600, inicio: 0 }); sincronizarRetornos()
  })

  return {
    definirEstado,
    atualizar(f) {
      f.forEach(n => {
        const ch = chars.find(c => c.id === n.id)
        if (!ch) return
        if (o.mini) {
          // Um snapshot repetido de entregue não reinicia a celebração após seu retorno.
          if (ch.legadoRecebido !== n.estado) { ch.legadoRecebido = n.estado; definirEstado(n.id, estadoMini(n.estado)) }
          return
        }
        if (ch.st === n.estado) return
        ch.retornaTrabalho = false; clearTimeout(retornos.get(n.id)?.timer); retornos.delete(n.id)
        if (n.estado === 'entregue' && ch.st === 'precisa') ch.festa = 0
        if (n.estado === 'entregue' && ch.st === 'trabalhando') ch.festa = 1.6
        ch.st = n.estado
      })
      if (!o.mini) solicitar()
    },
    selecionar(id) { solicitar(); selecionado = id; if (id && MOBILE()) { const ch = chars.find(c => c.id === id); if (ch) irPara(ch.sala) } chars.forEach(c => { c.tk = '' }) },
    irPara(v) { irPara(v); solicitar() },
    tema(d) { setTema(d); solicitar() },
    medir: () => ({ fps, degrau, hist: fpsHist.slice(), ms: +jsMs.toFixed(2), desenhos: renderer.info.render.calls, triangulos: renderer.info.render.triangles }),
    destruir,
  }
  } catch (erro) { destruir(); throw erro }
}
