/* eslint-disable @typescript-eslint/no-explicit-any */
// A sala do Meu orçamento: piso, duas paredes, os quatro postos e os bonecos. Tudo com as peças do Escritório:
// caixas (cena/pecas), mesa e cadeira (cena/postos), boneco (cena/boneco), objetos de trabalho (atividadesMini)
// e os móveis prontos de public/modelos/escritorio. Unidades em metros; a frente da sala é +Z.
import { montarAtividade, type TrabalhoMini } from '../../escritorio/atividadesMini'
import { criarBoneco } from '../../escritorio/cena/boneco'
import type { Guardar, Pecas } from '../../escritorio/cena/pecas'
import { SALAS } from '../../escritorio/cena/planta'
import { montarMesa } from '../../escritorio/cena/postos'
import { CORES } from '../../escritorio/cena/predio'
import { caixaReal, fundirGrupos } from '../../escritorio/escritorioMini'
import { iniciarRotina, type Rotina } from './rotina'

/** Os móveis prontos que a sala usa (nomes dos arquivos .glb). */
export const MODELOS_DA_SALA = [
  'bookcaseOpen',
  'books',
  'cardboardBoxClosed',
  'cardboardBoxOpen',
  'pottedPlant',
  'sideTable',
]

/** Meia largura e meia profundidade do piso, e a altura das paredes. */
export const SALA = { x: 3.6, z: 2.35, parede: 1.85 }

const R = Math.PI
/** Um funcionário por estação do palco, na ordem dos botões. A roupa segue as figuras antigas do palco. */
export const EQUIPE_DA_SALA: { rotina: Rotina; roupa: Record<string, unknown> }[] = [
  {
    // Hoje: digita na mesa com tela e calculadora; leva a anotação do dia à mesa da tesoureira
    roupa: { camisa: 0x4f7a55, calca: 0x2e3440, pele: 0xe8b796, cabelo: 0x6a3f24, estilo: 'longo' },
    rotina: {
      id: 'assistente',
      posto: { x: -1.5, z: 0.3 },
      giroPosto: 0,
      sentado: true,
      saida: [{ x: -0.65, z: 0.3 }],
      visita: { x: 1.25, z: 0.4 },
      giroVisita: R,
      frente: { x: -0.6, z: 0.55 },
      tempoPosto: 13,
      tempoVisita: 2.2,
      carrega: true,
    },
  },
  {
    // Semana e mês: aponta o quadro dos mostradores; vai à estante buscar um relatório
    roupa: { camisa: 0x5c6e8a, calca: 0x6e5a44, pele: 0xe0ae88, cabelo: 0x3a2a1e, estilo: 'curto', oculos: true },
    rotina: {
      id: 'analista',
      posto: { x: -1.3, z: -1.75 },
      giroPosto: 0.25,
      sentado: false,
      saida: [{ x: -2.6, z: -1.3 }],
      visita: { x: -2.6, z: -0.2 },
      giroVisita: -R / 2,
      frente: { x: -1.3, z: -1 },
      tempoPosto: 9,
      tempoVisita: 3.5,
      carrega: false,
    },
  },
  {
    // Sobra: conta moedas na mesa; vai ao cofre guardar
    roupa: { camisa: 0x8e6b7e, calca: 0x6e5a44, pele: 0xebc0a0, cabelo: 0xb9b6b0, estilo: 'coque', oculos: true },
    rotina: {
      id: 'tesoureira',
      posto: { x: 0.9, z: -1.3 },
      giroPosto: 0,
      sentado: true,
      saida: [{ x: 1.95, z: -1.3 }],
      visita: { x: 2.35, z: -1.3 },
      giroVisita: (R * 3) / 4,
      frente: { x: 2.15, z: -0.75 },
      tempoPosto: 10,
      tempoVisita: 4,
      carrega: false,
    },
  },
  {
    // Compras: confere as caixas pela lista; leva uma caixa até a mesinha ao lado da mesa de Hoje
    roupa: { camisa: 0xb08a3e, calca: 0x34425a, pele: 0xd9a27e, cabelo: 0x3a2a1e, estilo: 'curto' },
    rotina: {
      id: 'comprador',
      posto: { x: 2.75, z: 1.9 },
      giroPosto: R / 2,
      sentado: false,
      saida: [],
      visita: { x: 0.5, z: 1.75 },
      giroVisita: -R / 2,
      frente: { x: 2.3, z: 2.05 },
      tempoPosto: 6,
      tempoVisita: 2,
      carrega: true,
    },
  },
]

interface Obra {
  T: any
  scene: any
  guardar: Guardar
  pecas: Pecas
  modelos: Record<string, any>
}

/** Piso, tapete, as duas paredes do fundo e as janelas, nas cores que o Escritório usa. */
function erguerSala({ T, scene, guardar, pecas }: Obra) {
  const { cx } = pecas
  const baseMat = guardar(new T.MeshLambertMaterial({ color: 0xe2dacc }))
  const vidro = guardar(new T.MeshLambertMaterial({ color: 0xbfd8e6, emissive: 0x9cc4da, emissiveIntensity: 0.35 }))
  const { x, z, parede } = SALA
  cx(2 * x + 0.3, 0.3, 2 * z + 0.3, baseMat, -0.05, -0.15, -0.05, scene, true)
  cx(2 * x, 0.04, 2 * z, SALAS.cartoes.piso, 0, 0.02, 0, undefined, true)
  cx(3.4, 0.02, 1.5, SALAS.cartoes.tapete, -0.4, 0.05, 1.45, undefined, true)
  cx(2 * x + 0.2, parede, 0.2, 0xf1eadf, -0.1, parede / 2, -z - 0.1)
  cx(0.2, parede, 2 * z, 0xf1eadf, -x - 0.1, parede / 2, 0)
  cx(2 * x, 0.12, 0.04, 0xd9cfbf, 0, 0.06, -z + 0.02, undefined, true)
  cx(0.04, 0.12, 2 * z, 0xd9cfbf, -x + 0.02, 0.06, 0, undefined, true)
  cx(1.5, 0.75, 0.06, vidro, 0.35, 1.3, -z + 0.02, scene, true)
  cx(0.06, 0.75, 1.3, vidro, -x + 0.02, 1.3, 1.3, scene, true)
  return { baseMat, vidro }
}

/** Um móvel pronto, assentado no chão e com a altura pedida (os modelos vêm em escalas diferentes). */
function criarMovel({ T, modelos }: Obra) {
  return function movel(nome: string, x: number, z: number, altura: number, giro = 0, y = 0, pai?: any) {
    const g = new T.Group(),
      copia = modelos[nome].clone(true)
    g.add(copia)
    const b = caixaReal(copia),
      centro = b.getCenter(new T.Vector3())
    copia.position.add(new T.Vector3(-centro.x, -b.min.y, -centro.z))
    g.scale.setScalar(altura / (b.max.y - b.min.y))
    g.rotation.y = giro
    g.position.set(x, y, z)
    pai?.add(g)
    return g
  }
}

/** Troca os materiais do modelo por uma peça só com cor por vértice (igual ao mini do Escritório) e liga a sombra. */
function acabar(grupo: any, guardar: Guardar) {
  fundirGrupos(grupo, guardar)
  grupo.traverse((m: any) => {
    if (m.isMesh) m.castShadow = m.receiveShadow = true
  })
  return grupo
}

/** Um objeto de trabalho do motor (quadro, cofre, moedas), no tamanho e no lugar pedidos. */
function objeto(o: Obra, id: string, escala: number, x: number, y: number, z: number): TrabalhoMini {
  const { T, scene, guardar, pecas } = o
  const trabalho = montarAtividade(id, { T, pai: scene, geo: pecas.GEO, mat: pecas.mat, guardar })
  trabalho.raiz.scale.setScalar(escala)
  trabalho.raiz.position.set(x, y, z)
  trabalho.raiz.traverse((m: any) => {
    if (m.isMesh) m.castShadow = true
  })
  trabalho.animar(0)
  return trabalho
}

/** Estante, planta, pilha de caixas e a mesinha onde o comprador deixa a caixa. Devolve a caixa que aparece lá. */
function mobiliar(o: Obra) {
  const { T, scene, guardar } = o
  const movel = criarMovel(o),
    fixos = new T.Group()
  const estante = movel('bookcaseOpen', -SALA.x + 0.3, -0.2, 1.6, Math.PI / 2, 0, fixos)
  ;[0.33, 0.72, 1.1].forEach((y, i) =>
    movel('books', estante.position.x + 0.02, -0.35 + i * 0.16, 0.2, Math.PI / 2, y, fixos),
  )
  movel('pottedPlant', -SALA.x + 0.5, SALA.z - 0.5, 1.15, 0, 0, fixos)
  // as compras: caixas empilhadas no canto da frente
  movel('cardboardBoxClosed', 3.2, 1.65, 0.42, 0.1, 0, fixos)
  movel('cardboardBoxClosed', 3.25, 2.1, 0.42, -0.15, 0, fixos)
  movel('cardboardBoxClosed', 3.22, 1.88, 0.36, 0.3, 0.42, fixos)
  movel('cardboardBoxOpen', 3.15, 1.1, 0.4, 0.2, 0, fixos)
  const mesinha = movel('sideTable', -0.15, 1.75, 0.5, 0, 0, fixos)
  scene.add(acabar(fixos, guardar))
  const entregue = acabar(
    movel('cardboardBoxClosed', mesinha.position.x, mesinha.position.z, 0.3, 0.2, 0.5, scene),
    guardar,
  )
  entregue.visible = false
  return { movel, entregue }
}

/** Monta a sala inteira e devolve os personagens e o que a cena anima a cada quadro. */
export function montarSala(o: Obra) {
  const { T, scene, guardar, pecas } = o
  const { cx, fecha, grupo, mancha } = pecas
  const { baseMat, vidro } = erguerSala(o)
  const { movel, entregue } = mobiliar(o)
  const boneco = criarBoneco(T, pecas, false)
  const lugar: any = { T, scene, guardar, pecas, salaG: {}, composicao: null }
  const chars: any[] = EQUIPE_DA_SALA.map(({ rotina, roupa }, i) => {
    if (rotina.sentado) {
      // mesa e cadeira do motor: a cadeira fica 1,72 atrás da origem do grupo
      const g = grupo(scene, rotina.posto.x, 0, rotina.posto.z + 1.72)
      const mesaLarga = rotina.id === 'tesoureira'
      montarMesa(
        lugar,
        { mini: mesaLarga } as any,
        { id: mesaLarga ? 'guardado' : 'contador', estado: 'trabalhando' },
        0,
        g,
      )
      fecha(g)
    }
    const b = boneco(roupa)
    mancha(0.3, 0, 0.07, 0, b.r)
    scene.add(b.r)
    const ch: any = { id: rotina.id, b, st: 'trabalhando', sala: 'orcamento' }
    iniciarRotina(ch, rotina, i)
    return ch
  })
  const por = (id: string) => chars.find(c => c.id === id)
  // Semana e mês: o quadro dos mostradores na parede do fundo
  const quadro = objeto(o, 'analista', 1.25, -2.39, -0.03, -SALA.z + 0.02 - 1.25 * 0.845)
  // Sobra: moedas e gráfico na mesa da tesoureira, e o cofre encostado na parede do fundo
  const tes = por('tesoureira').rotina.posto
  const moedas = objeto(o, 'guardado', 0.7, tes.x, 0.63 - 0.7 * 0.65, tes.z + 0.22)
  const cofre = objeto(o, 'colchao', 1.25, 2.56, -1.25 * 0.65, -SALA.z + 0.02 - 1.25 * 0.525)
  // a chave solta do cofre fica guardada: ela foi desenhada para a bancada do mini
  cofre.raiz.children.filter((f: any) => f.position.x < -0.3).forEach((f: any) => (f.visible = false))
  // Compras: a caixa que o comprador leva nas mãos e a prancheta da lista
  const comprador = por('comprador')
  const caixa = acabar(movel('cardboardBoxClosed', 0, 0.36, 0.3, 0, 0.12, comprador.b.hips), guardar)
  const prancheta = cx(0.17, 0.02, 0.22, CORES.PAPEL, 0, -0.27, 0.1, comprador.b.bL.e, true)
  // Hoje: a folha que o assistente leva e deixa na mesa da tesoureira
  const assistente = por('assistente')
  const folha = cx(0.2, 0.02, 0.26, CORES.PAPEL, 0.12, 0.3, 0.3, assistente.b.hips, true)
  const folhaNaMesa = cx(0.2, 0.02, 0.26, CORES.PAPEL, tes.x + 0.35, 0.645, tes.z + 0.95, scene, true)
  chars.forEach(ch =>
    ch.b.r.traverse((m: any) => {
      m.userData.id = ch.id
    }),
  )
  /** Liga e desliga o que cada um leva, e mexe o quadro, as moedas e o cofre. */
  function animarObjetos(t: number, reduz: boolean) {
    caixa.visible = !!comprador.levando
    entregue.visible = !!comprador.entregue
    prancheta.visible = comprador.etapa === 'posto'
    folha.visible = !!assistente.levando
    folhaNaMesa.visible = !!assistente.entregue
    if (reduz) return
    quadro.animar(t)
    if (por('tesoureira').etapa === 'posto') moedas.animar(t)
    if (por('tesoureira').etapa === 'visita') cofre.animar(t)
  }
  animarObjetos(0, true)
  return { chars, baseMat, vidro, animarObjetos }
}
