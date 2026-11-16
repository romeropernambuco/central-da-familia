/** Cenografia exclusiva do mini. Importado SOMENTE por cena3d (chunk tardio).
 * Unidades em metros, boneco em (0,0,0), bancada a +Z. Sem luz/textura/sombra nova.
 * Geometrias/materiais pertencem à montagem, nunca a um cache global entre contextos.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-ignore: Three r160 é distribuído sem tipos neste projeto.
import { InstancedMesh, Matrix4 } from 'three'

export interface AtividadeMini {
  atividade: string
  objeto: string
  emPe?: boolean
  camera: { direcao: [number, number, number]; largura: number; fundo: number }
}
const ficha = (atividade: string, objeto: string, x: number, y: number, z: number, largura = 1.15, fundo = 1.35): AtividadeMini =>
  ({ atividade, objeto, camera: { direcao: [x, y, z], largura, fundo } })
const emPe = (atividade: AtividadeMini): AtividadeMini => ({ ...atividade, emPe: true })

/** Uma atividade e uma composição por id; não são indicadores financeiros reais. */
export const ATIVIDADES_MINI: Record<string, AtividadeMini> = {
  contador: ficha('Calcular e virar a página', 'calculadora e livro de lançamentos', .8, .85, 1.4),
  colchao: ficha('Girar o mostrador e conferir a chave', 'cofre com porta, mostrador e chave', 1.1, .8, 1.5),
  tesoureiro: ficha('Carimbar os recebimentos', 'carimbo e envelopes', .7, 1.1, 1.6),
  folha: ficha('Separar maços de cédulas', 'cédulas com cintas', 1.2, 1.1, 1.5),
  comprador: emPe(ficha('Conferir a sacola pela lista', 'sacola com alças e lista riscada', .9, .9, 1.6)),
  fiscal: emPe(ficha('Marcar a feira na prancheta', 'prancheta e caixotes de frutas', 1.3, .95, 1.7, 1.25)),
  cartao: ficha('Passar cartão e conferir fatura', 'maquininha, cartão com chip e fatura', .8, 1.05, 1.5),
  assistente: ficha('Distribuir o orçamento nos compartimentos', 'carteira aberta e divisórias do mês', 1, 1.15, 1.6),
  guardado: ficha('Empilhar moedas e acompanhar rendimento', 'moedas e gráfico ascendente', 1.25, .85, 1.6),
  usina: emPe(ficha('Inspecionar as células solares', 'dois painéis solares e medidor', .9, 1.05, 1.7, 1.25)),
  secretaria: ficha('Atender telefone e anotar na agenda', 'telefone com gancho e agenda aberta', 1.2, .8, 1.8),
  presenca: ficha('Registrar vistos na grade', 'quadro de presença com grade e vistos', .75, .95, 1.8),
  auditor: emPe(ficha('Contar e apontar caixas', 'caixas etiquetadas e contador manual', 1.4, .9, 1.8, 1.3)),
  anfitriao: emPe(ficha('Receber e organizar o balcão', 'balcão, sino e fichas de boas-vindas', .65, .8, 1.7)),
  sonhadora: ficha('Folhear o mural de sonhos', 'mural articulado com casa, viagem e presente', 1.1, .9, 1.8, 1.25),
  analista: ficha('Conferir os quatro mostradores', 'painel de quatro mostradores com ponteiros', 1.15, .8, 1.9, 1.25),
  zelador: emPe(ficha('Regular o mecanismo com a chave', 'chave de boca e roda de ajuste', .85, 1, 1.7)),
  protetora: ficha('Abrir e fechar o cadeado', 'cadeado com arco móvel e pasta protegida', 1, .8, 1.9),
}

export const LIMITE_MESHES_MINI = 150
/** Hash estável: mini de um único funcionário não perde a defasagem da equipe. */
export function faseDoId(id: string): number {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return (h % 10007) / 10007 * Math.PI * 2
}

export interface OficinaMini {
  T: any; pai: any; geo: any
  mat(cor: number): any
  guardar<V extends { dispose(): void }>(recurso: V): V
}
export interface TrabalhoMini {
  raiz: any
  /** Tempo local para quando sai de trabalhando; sem alocações no frame. */
  animar(t: number): void
  pose(t: number): Record<string, number>
}

const PAPEL = 0xFBF8F1, TINTA = 0x3F5873, OURO = 0xD8C27A, VERDE = 0x7E9A86, MADEIRA = 0xB88D62

export function montarAtividade(id: string, f: OficinaMini): TrabalhoMini {
  const { T, mat, geo, guardar } = f
  const raiz = new T.Group(); raiz.name = `atividade:${id}`; f.pai.add(raiz)
  const g = (pai = raiz, x = 0, y = 0, z = 0) => { const a = new T.Group(); a.position.set(x, y, z); pai.add(a); return a }
  const box = (w: number, h: number, d: number, c: number, x: number, y: number, z: number, pai = raiz) => {
    const m = new T.Mesh(geo, mat(c)); m.scale.set(w, h, d); m.position.set(x, y, z); pai.add(m); return m
  }
  // Instâncias têm buffer próprio (dispose registrado), mas dividem forma/material.
  const repetidos = (forma: any, cor: number, poses: number[][], pai = raiz) => {
    const m = guardar(new InstancedMesh(forma, mat(cor), poses.length)), matriz = new Matrix4()
    poses.forEach((p, i) => { matriz.makeScale(p[3], p[4], p[5]); matriz.setPosition(p[0], p[1], p[2]); m.setMatrixAt(i, matriz) })
    m.instanceMatrix.needsUpdate = true; pai.add(m); return m
  }
  // Cache por forma dentro da montagem; moedas de todos os maços usam este cilindro.
  let cilindro: any
  const moedas = (poses: number[][], pai = raiz) => {
    cilindro ||= guardar(new T.CylinderGeometry(1, 1, 1, 10))
    return repetidos(cilindro, OURO, poses, pai)
  }
  const linhas = (x: number, y: number, z: number, n = 3, pai = raiz) => {
    for (let i = 0; i < n; i++) box(.24, .008, .018, TINTA, x, y, z + i * .075, pai)
  }
  const folha = (x: number, z: number, pai = raiz) => { box(.38, .025, .43, PAPEL, x, .67, z, pai); linhas(x, .69, z - .12, 3, pai) }
  const caneta = (pai = raiz) => { const m = box(.025, .025, .25, TINTA, .26, .74, .51, pai); m.userData.movel = true; return m }
  const prancheta = (pai: any) => { box(.49, .6, .05, MADEIRA, 0, 0, 0, pai); box(.42, .5, .02, PAPEL, 0, -.015, .037, pai); box(.18, .06, .035, TINTA, 0, .28, .04, pai) }
  const animacoes: ((t: number) => void)[] = []
  let gesto: (t: number) => Record<string, number> = () => ({})
  switch (id) {
    case 'contador': {
      box(.36, .06, .46, TINTA, -.29, .69, .53)
      box(.27, .012, .09, VERDE, -.29, .728, .39)
      repetidos(geo, PAPEL, Array.from({ length: 9 }, (_, i) => [-.39 + i % 3 * .1, .731, .51 + Math.floor(i / 3) * .1, .06, .018, .055]))
      repetidos(geo, PAPEL, Array.from({ length: 5 }, (_, i) => [.34, .66 + i * .018, .65, .42, .016, .43]))
      const pagina = g(raiz, .14, .76, .65); box(.4, .012, .42, PAPEL, .2, 0, 0, pagina); linhas(.2, .012, -.12, 3, pagina)
      animacoes.push(t => { pagina.rotation.z = Math.max(0, Math.sin(t * 1.3)) * 2.4 })
      gesto = t => ({ lx: -.83 + Math.sin(t * 8) * .08, le: -1.1, rx: -.68, re: -.9 - Math.max(0, Math.sin(t * 1.3)) * .7, cy: Math.sin(t * 1.3) * .16 }); break
    }
    case 'colchao': {
      box(.68, .68, .43, 0x59616B, .27, .99, .74)
      const porta = g(raiz, -.05, .99, .97)
      box(.6, .59, .035, 0x8A9098, .3, 0, 0, porta)
      const dial = g(porta, .3, 0, .04)
      box(.21, .21, .05, TINTA, 0, 0, 0, dial); box(.025, .17, .025, OURO, 0, 0, .04, dial)
      const chave = g(raiz, -.37, .79, .53)
      box(.13, .13, .045, OURO, 0, 0, 0, chave); box(.04, .2, .04, OURO, 0, -.13, 0, chave); box(.09, .04, .04, OURO, .025, -.2, 0, chave)
      animacoes.push(t => { dial.rotation.z = Math.sin(t * 1.5) * 1.8; porta.rotation.y = -.12 * (1 + Math.sin(t * .7)); chave.rotation.z = Math.sin(t * 1.5) * .2 })
      gesto = t => ({ rx: -.9, re: -1.7 + Math.sin(t * 1.5) * .18, lx: -.65, le: -1.25, cy: .2 }); break
    }
    case 'tesoureiro': {
      repetidos(geo, PAPEL, Array.from({ length: 4 }, (_, i) => [.28, .67 + .022 * i, .6 + .025 * i, .48, .02, .3]))
      box(.48, .015, .025, OURO, .28, .765, .65)
      const carimbo = g(raiz, -.23, .78, .55)
      box(.25, .06, .18, TINTA, 0, 0, 0, carimbo); box(.07, .17, .07, MADEIRA, 0, .1, 0, carimbo); box(.16, .06, .1, MADEIRA, 0, .2, 0, carimbo)
      const selo = box(.15, .01, .1, 0x9A5B4A, .28, .78, .6); selo.userData.movel = true
      animacoes.push(t => { const s = (1 + Math.sin(t * 2.8)) / 2; carimbo.position.set(.28 - s * .5, .79 + s * .24, .6); selo.scale.x = .15 * (1 - s * .2) })
      gesto = t => ({ rx: -.6 - (1 + Math.sin(t * 2.8)) * .22, re: -1.15, lx: -.7, le: -1, cy: .14 }); break
    }
    case 'folha': {
      repetidos(geo, VERDE, Array.from({ length: 18 }, (_, i) => [-.38 + Math.floor(i / 6) * .37, .665 + i % 6 * .018, .66, .29, .014, .33]))
      repetidos(geo, PAPEL, [-.38, -.01, .36].map(x => [x, .725, .66, .06, .13, .34]))
      const nota = g(raiz, 0, .85, .4); box(.3, .014, .2, VERDE, 0, 0, 0, nota); box(.08, .01, .09, PAPEL, 0, .014, 0, nota)
      animacoes.push(t => { nota.position.x = Math.sin(t * 3.5) * .3; nota.rotation.z = Math.sin(t * 3.5) * .25 })
      gesto = t => ({ lx: -.8, rx: -.8, le: -1.1 + Math.sin(t * 3.5) * .22, re: -1.1 - Math.sin(t * 3.5) * .22, cy: Math.sin(t * 3.5) * .12 }); break
    }
    case 'comprador': {
      const saco = g(raiz, -.43, .71, .56)
      box(.4, .48, .32, MADEIRA, 0, .17, 0, saco)
      for (const x of [-.12, .12]) box(.035, .23, .035, TINTA, x, .49, 0, saco)
      box(.27, .035, .035, TINTA, 0, .6, 0, saco)
      box(.15, .16, .13, VERDE, -.08, .45, .06, saco); box(.12, .24, .13, OURO, .1, .44, -.02, saco)
      folha(.32, .57); const lapis = caneta()
      animacoes.push(t => { saco.rotation.z = Math.sin(t * 1.6) * .06; lapis.position.x = .3 + Math.sin(t * 4) * .1 })
      gesto = t => ({ lx: -.9, le: -1.8, rx: -.7, re: -1 + Math.sin(t * 4) * .08, cy: -.2 + Math.sin(t * 1.6) * .16 }); break
    }
    case 'fiscal': {
      const placa = g(raiz, -.33, .96, .44); placa.rotation.x = -.35; prancheta(placa)
      for (let i = 0; i < 3; i++) box(.26, .025, .01, TINTA, 0, .12 - i * .13, .052, placa)
      repetidos(geo, MADEIRA, [[.4, .75, .77, .49, .2, .38], [.42, .85, .72, .53, .04, .42]])
      repetidos(geo, 0xC0563F, [[.25, .94, .7, .13, .13, .13], [.39, .94, .82, .13, .13, .13]])
      repetidos(geo, VERDE, [[.52, .94, .7, .15, .14, .14], [.54, .94, .85, .12, .13, .12]])
      const lapis = caneta(placa); lapis.position.set(.07, -.08, .09); lapis.rotation.x = Math.PI / 2
      animacoes.push(t => { lapis.position.x = .05 + Math.sin(t * 5) * .1; placa.rotation.z = Math.sin(t * 1.2) * .025 })
      gesto = t => ({ lx: -.8, le: -1.7, rx: -.85, re: -1.6 + Math.sin(t * 5) * .08, cy: -.26 }); break
    }
    case 'cartao': {
      box(.31, .16, .47, TINTA, -.28, .74, .65); box(.24, .018, .17, VERDE, -.28, .83, .53)
      repetidos(geo, PAPEL, Array.from({ length: 6 }, (_, i) => [-.35 + i % 2 * .14, .83, .68 + Math.floor(i / 2) * .065, .08, .015, .04]))
      const cartao = g(raiz, -.28, .88, .63); box(.25, .17, .025, 0x7A5C8A, 0, 0, 0, cartao); box(.055, .05, .012, OURO, -.06, 0, .02, cartao)
      folha(.32, .6)
      animacoes.push(t => { cartao.position.z = .63 + Math.sin(t * 2.4) * .18; cartao.position.y = .9 + Math.max(0, Math.sin(t * 2.4)) * .12 })
      gesto = t => ({ lx: -.85 + Math.sin(t * 2.4) * .18, le: -1.25, rx: -.7, re: -1, cy: Math.sin(t * 1.2) * .27 }); break
    }
    case 'assistente': {
      box(.66, .09, .42, 0x8A6645, .04, .7, .6)
      for (const x of [-.25, -.03, .19, .37]) box(.025, .13, .41, OURO, x, .77, .6)
      const carteira = g(raiz, -.42, .78, .46); box(.3, .03, .26, 0x9A5B4A, 0, 0, 0, carteira); box(.3, .23, .025, 0x9A5B4A, 0, .1, -.12, carteira)
      const ficha = g(raiz, 0, .86, .6); box(.12, .02, .2, VERDE, 0, 0, 0, ficha)
      animacoes.push(t => { ficha.position.x = -.12 + Math.sin(t * 1.7) * .2; ficha.position.y = .84 + Math.max(0, Math.cos(t * 1.7)) * .13 })
      gesto = t => ({ lx: -.75, le: -1.3, rx: -.8, re: -1.2 + Math.sin(t * 1.7) * .22, cy: -.1 + Math.sin(t * 1.7) * .2 }); break
    }
    case 'guardado': {
      moedas(Array.from({ length: 15 }, (_, i) => [-.42 + Math.floor(i / 5) * .19, .67 + i % 5 * .045, .62, .085, .036, .085]))
      const moeda = g(raiz, -.18, .95, .55); moedas([[0, 0, 0, .09, .04, .09]], moeda)
      box(.47, .55, .05, PAPEL, .37, .96, .88)
      for (let i = 0; i < 3; i++) box(.09, .13 + .13 * i, .04, VERDE, .22 + .14 * i, .79 + .065 * i, .93)
      animacoes.push(t => { moeda.position.x = -.23 + Math.sin(t * 2) * .17; moeda.position.y = .91 + Math.cos(t * 2) * .08 })
      gesto = t => ({ lx: -.8, le: -1.2 + Math.cos(t * 2) * .2, rx: -.7, re: -1.8, cy: .12 + Math.sin(t) * .22 }); break
    }
    case 'usina': {
      const paineis = g(raiz, 0, .87, .75); paineis.rotation.x = -.45
      for (const x of [-.34, .34]) {
        box(.57, .43, .06, 0x8E949C, x, 0, 0, paineis)
        repetidos(geo, TINTA, Array.from({ length: 6 }, (_, i) => [x - .17 + i % 3 * .17, -.1 + Math.floor(i / 3) * .2, .04, .14, .16, .025]), paineis)
        box(.07, .18, .12, 0x8E949C, x, .72, .74)
      }
      const medidor = g(raiz, -.3, .83, .38); box(.22, .1, .2, OURO, 0, 0, 0, medidor); box(.13, .015, .1, VERDE, 0, .06, 0, medidor)
      animacoes.push(t => { medidor.position.x = Math.sin(t * 1.15) * .4; medidor.rotation.y = Math.sin(t * 1.15) * .15 })
      gesto = t => ({ lx: -.8, le: -1.1 + Math.sin(t * 1.15) * .2, rx: -.9, re: -1.5, cy: Math.sin(t * 1.15) * .3 }); break
    }
    case 'secretaria': {
      box(.31, .1, .35, TINTA, -.4, .7, .65)
      const telefone = g(raiz, -.33, 1.13, .09)
      box(.08, .31, .07, TINTA, 0, 0, 0, telefone); for (const y of [-.15, .15]) box(.14, .09, .12, TINTA, .03, y, .02, telefone)
      // Cabo voxel em degraus, sem curva/tesselação adicional.
      for (let i = 0; i < 4; i++) box(.025, .1, .025, TINTA, -.36, .78 + i * .06, .47 - i * .1)
      folha(.28, .54); box(.025, .035, .44, MADEIRA, .28, .7, .54)
      const lapis = caneta()
      animacoes.push(t => { telefone.rotation.z = Math.sin(t * 1.8) * .04; lapis.position.z = .52 + Math.sin(t * 4.5) * .07 })
      gesto = t => ({ lx: -1.1, le: -2.1, lz: -.15, rx: -.7, re: -1 + Math.sin(t * 4.5) * .07, cx: -.08, cy: -.12 }); break
    }
    case 'presenca': {
      const quadro = g(raiz, .15, 1.05, .84); box(.87, .66, .06, MADEIRA, 0, 0, 0, quadro); box(.79, .58, .02, PAPEL, 0, 0, .04, quadro)
      for (let i = 0; i < 4; i++) { box(.76, .012, .015, TINTA, 0, -.25 + i * .17, .06, quadro); box(.012, .52, .015, TINTA, -.36 + i * .24, 0, .06, quadro) }
      const visto = g(quadro, -.2, .1, .08); const a = box(.07, .025, .02, VERDE, -.025, -.02, 0, visto); a.rotation.z = -.7; const b = box(.14, .025, .02, VERDE, .04, .015, 0, visto); b.rotation.z = .8
      animacoes.push(t => { visto.position.x = -.22 + Math.floor((1 + Math.sin(t * .9)) * 1.49) * .22; visto.scale.setScalar(.85 + .15 * Math.sin(t * 4)) })
      gesto = t => ({ rx: -1.25, re: -1.25 + Math.sin(t * .9) * .22, lx: -.6, le: -.9, cy: .18 }); break
    }
    case 'auditor': {
      const poses = [[-.48, .81, .75, .34, .29, .32], [-.12, .81, .75, .34, .29, .32], [.24, .81, .75, .34, .29, .32], [.06, 1.11, .75, .34, .29, .32]]
      repetidos(geo, MADEIRA, poses)
      repetidos(geo, PAPEL, poses.map(p => [p[0], p[1], p[2] + .168, .15, .09, .012]))
      const ponteiro = box(.035, .035, .38, TINTA, -.15, 1.15, .43); ponteiro.userData.movel = true
      box(.18, .08, .18, 0x8E949C, -.42, .72, .35)
      animacoes.push(t => { ponteiro.position.x = Math.sin(t * 1.4) * .34; ponteiro.rotation.y = Math.sin(t * 1.4) * -.4 })
      gesto = t => ({ rx: -1.35, re: -1.25, rz: Math.sin(t * 1.4) * .22, lx: -.65, le: -1.2, cy: Math.sin(t * 1.4) * .3 }); break
    }
    case 'anfitriao': {
      box(1.24, .24, .16, MADEIRA, 0, .76, .99)
      box(.22, .045, .21, TINTA, -.4, .69, .63); box(.16, .12, .16, OURO, -.4, .77, .63); box(.045, .06, .045, OURO, -.4, .86, .63)
      const fichas = g(raiz, .3, .67, .53); box(.38, .03, .29, PAPEL, 0, 0, 0, fichas); box(.23, .012, .045, VERDE, 0, .025, 0, fichas)
      animacoes.push(t => { fichas.position.x = .27 + Math.sin(t * 1.3) * .08; fichas.rotation.y = Math.sin(t * 1.3) * .1 })
      gesto = t => ({ lx: -.25, lz: -.5 + Math.sin(t * 2.3) * .18, le: -2.4, rx: -.7, re: -1, rez: Math.sin(t * 2.3) * .08, cy: -.2, cx: -.08 }); break
    }
    case 'sonhadora': {
      box(1.05, .72, .065, MADEIRA, .04, 1.04, .89)
      const paginas = g(raiz, -.44, 1.04, .94)
      box(.96, .65, .025, PAPEL, .48, 0, 0, paginas)
      // Casa, viagem e presente legíveis como três silhuetas no mural.
      box(.2, .18, .025, VERDE, .2, -.04, .035, paginas); const telhado = box(.18, .18, .02, 0x9A5B4A, .2, .12, .035, paginas); telhado.rotation.z = Math.PI / 4
      box(.23, .07, .025, TINTA, .51, .04, .035, paginas); box(.035, .25, .025, TINTA, .51, .04, .035, paginas)
      box(.19, .2, .025, 0x8E6B7E, .78, 0, .035, paginas); box(.025, .22, .025, OURO, .78, 0, .055, paginas)
      animacoes.push(t => { paginas.rotation.y = Math.max(0, Math.sin(t * 1.1)) * -.6 })
      gesto = t => ({ rx: -1.15, re: -1.5 + Math.sin(t * 1.1) * .3, lx: -.9, le: -1.5, cy: Math.sin(t * 1.1) * .23 }); break
    }
    case 'analista': {
      box(1.02, .74, .07, TINTA, .07, 1.07, .88)
      const ponteiros: any[] = []
      for (let i = 0; i < 4; i++) {
        const x = -.17 + i % 2 * .48, y = .91 + Math.floor(i / 2) * .34
        box(.4, .27, .02, PAPEL, x, y, .93)
        const p = g(raiz, x, y, .96); box(.025, .1, .02, VERDE, 0, .045, 0, p); box(.06, .025, .02, OURO, 0, 0, .02, p); ponteiros.push(p)
      }
      animacoes.push(t => { ponteiros.forEach((p, i) => { p.rotation.z = Math.sin(t * .8 + i * 1.4) * 1.1 }) })
      gesto = t => ({ rx: -1.15 - Math.sin(t * .8) * .15, re: -1.4, rz: Math.cos(t * .8) * .2, lx: -.6, le: -1, cy: Math.sin(t * .8) * .25 }); break
    }
    case 'zelador': {
      box(.58, .13, .42, TINTA, .16, .71, .65)
      const roda = g(raiz, .16, .85, .63)
      box(.3, .04, .07, OURO, 0, 0, 0, roda); box(.07, .04, .3, OURO, 0, 0, 0, roda)
      const chave = g(roda); box(.08, .04, .43, 0x8E949C, 0, .06, -.15, chave); for (const x of [-.08, .08]) box(.06, .04, .17, 0x8E949C, x, .06, .12, chave)
      folha(-.38, .67)
      animacoes.push(t => { roda.rotation.y = Math.sin(t * 2.1) * .65 })
      gesto = t => ({ rx: -.9, re: -1.2, rz: Math.sin(t * 2.1) * .23, lx: -.65, le: -.95, cx: .24 }); break
    }
    case 'protetora': {
      box(.59, .07, .45, TINTA, -.19, .7, .64); box(.12, .02, .46, OURO, -.19, .75, .64)
      box(.43, .35, .19, OURO, .3, .9, .65); box(.05, .09, .02, TINTA, .3, .91, .756)
      const arco = g(raiz, .15, 1.06, .65)
      for (const x of [0, .3]) box(.055, .25, .055, 0x8E949C, x, .1, 0, arco)
      box(.35, .055, .055, 0x8E949C, .15, .23, 0, arco)
      animacoes.push(t => { const a = Math.max(0, Math.sin(t * 1.8)); arco.position.y = 1.06 + a * .12; arco.rotation.y = a * .7 })
      gesto = t => ({ rx: -1, re: -1.75 + Math.max(0, Math.sin(t * 1.8)) * -.15, lx: -.65, le: -1, cy: .18 }); break
    }
    default: folha(0, .6)
  }
  return { raiz, animar(t) { for (const fn of animacoes) fn(t) }, pose: gesto }
}
