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
const ficha = (
  atividade: string,
  objeto: string,
  x: number,
  y: number,
  z: number,
  largura = 1.15,
  fundo = 1.35,
): AtividadeMini => ({ atividade, objeto, camera: { direcao: [x, y, z], largura, fundo } })
const emPe = (atividade: AtividadeMini): AtividadeMini => ({ ...atividade, emPe: true })

/** Uma atividade e uma composição por id; não são indicadores financeiros reais. */
export const ATIVIDADES_MINI: Record<string, AtividadeMini> = {
  contador: ficha('Calcular e virar a página', 'calculadora e livro de lançamentos', 0.8, 0.85, 1.4),
  colchao: ficha('Girar o mostrador e conferir a chave', 'cofre com porta, mostrador e chave', 1.1, 0.8, 1.5),
  tesoureiro: ficha('Carimbar os recebimentos', 'carimbo e envelopes', 0.7, 1.1, 1.6),
  folha: ficha('Separar maços de cédulas', 'cédulas com cintas', 1.2, 1.1, 1.5),
  comprador: emPe(ficha('Conferir a sacola pela lista', 'sacola com alças e lista riscada', 0.9, 0.9, 1.6)),
  fiscal: emPe(ficha('Marcar a feira na prancheta', 'prancheta e caixotes de frutas', 1.3, 0.95, 1.7, 1.25)),
  cartao: ficha('Passar cartão e conferir fatura', 'maquininha, cartão com chip e fatura', 0.8, 1.05, 1.5),
  assistente: ficha('Distribuir o orçamento nos compartimentos', 'carteira aberta e divisórias do mês', 1, 1.15, 1.6),
  guardado: ficha('Empilhar moedas e acompanhar rendimento', 'moedas e gráfico ascendente', 1.25, 0.85, 1.6),
  imoveis: ficha(
    'Abrir pasta, acompanhar contrato e virar folha',
    'pasta, contrato e carimbo ilustrativos',
    0.85,
    0.9,
    1.7,
  ),
  usina: emPe(ficha('Inspecionar as células solares', 'dois painéis solares e medidor', 0.9, 1.05, 1.7, 1.25)),
  secretaria: ficha('Atender telefone e anotar na agenda', 'telefone com gancho e agenda aberta', 1.2, 0.8, 1.8),
  presenca: ficha('Registrar vistos na grade', 'quadro de presença com grade e vistos', 0.75, 0.95, 1.8),
  auditor: emPe(ficha('Contar e apontar caixas', 'caixas etiquetadas e contador manual', 1.4, 0.9, 1.8, 1.3)),
  anfitriao: emPe(ficha('Receber e organizar o balcão', 'balcão, sino e fichas de boas-vindas', 0.65, 0.8, 1.7)),
  sonhadora: ficha('Folhear o mural de sonhos', 'mural articulado com casa, viagem e presente', 1.1, 0.9, 1.8, 1.25),
  analista: ficha('Conferir os quatro mostradores', 'painel de quatro mostradores com ponteiros', 1.15, 0.8, 1.9, 1.25),
  zelador: emPe(ficha('Regular o mecanismo com a chave', 'chave de boca e roda de ajuste', 0.85, 1, 1.7)),
  protetora: ficha('Abrir e fechar o cadeado', 'cadeado com arco móvel e pasta protegida', 1, 0.8, 1.9),
}

/** Metadados para a frente do cadastro; não consulta nem representa dados reais. */
export { PERFIL_IMOVEIS } from '../../lib/escritorio/equipe'

export const LIMITE_MESHES_MINI = 150
/** Hash estável: mini de um único funcionário não perde a defasagem da equipe. */
export function faseDoId(id: string): number {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return ((h % 10007) / 10007) * Math.PI * 2
}

export interface OficinaMini {
  T: any
  pai: any
  geo: any
  mat(cor: number): any
  guardar<V extends { dispose(): void }>(recurso: V): V
}
export interface TrabalhoMini {
  raiz: any
  /** Tempo local para quando sai de trabalhando; sem alocações no frame. */
  animar(t: number): void
  pose(t: number): Record<string, number>
  /** Alvos locais da atividade; os buffers são reutilizados, inclusive após escalar o posto. */
  maos?: { esquerda: any; direita: any }
}

const PAPEL = 0xfbf8f1,
  TINTA = 0x3f5873,
  OURO = 0xd8c27a,
  VERDE = 0x7e9a86,
  MADEIRA = 0xb88d62

export function montarAtividade(id: string, f: OficinaMini): TrabalhoMini {
  const { T, mat, geo, guardar } = f
  const raiz = new T.Group()
  raiz.name = `atividade:${id}`
  f.pai.add(raiz)
  const g = (pai = raiz, x = 0, y = 0, z = 0) => {
    const a = new T.Group()
    a.position.set(x, y, z)
    pai.add(a)
    return a
  }
  const box = (w: number, h: number, d: number, c: number, x: number, y: number, z: number, pai = raiz) => {
    const m = new T.Mesh(geo, mat(c))
    m.scale.set(w, h, d)
    m.position.set(x, y, z)
    pai.add(m)
    return m
  }
  // Instâncias têm buffer próprio (dispose registrado), mas dividem forma/material.
  const repetidos = (forma: any, cor: number, poses: number[][], pai = raiz) => {
    const m = guardar(new InstancedMesh(forma, mat(cor), poses.length)),
      matriz = new Matrix4()
    poses.forEach((p, i) => {
      matriz.makeScale(p[3], p[4], p[5])
      matriz.setPosition(p[0], p[1], p[2])
      m.setMatrixAt(i, matriz)
    })
    m.instanceMatrix.needsUpdate = true
    pai.add(m)
    return m
  }
  // Cache por forma dentro da montagem; moedas de todos os maços usam este cilindro.
  let cilindro: any
  const moedas = (poses: number[][], pai = raiz) => {
    cilindro ||= guardar(new T.CylinderGeometry(1, 1, 1, 10))
    return repetidos(cilindro, OURO, poses, pai)
  }
  const linhas = (x: number, y: number, z: number, n = 3, pai = raiz) => {
    for (let i = 0; i < n; i++) box(0.24, 0.008, 0.018, TINTA, x, y, z + i * 0.075, pai)
  }
  const folha = (x: number, z: number, pai = raiz) => {
    box(0.38, 0.025, 0.43, PAPEL, x, 0.67, z, pai)
    linhas(x, 0.69, z - 0.12, 3, pai)
  }
  const caneta = (pai = raiz) => {
    const m = box(0.025, 0.025, 0.25, TINTA, 0.26, 0.74, 0.51, pai)
    m.userData.movel = true
    return m
  }
  const prancheta = (pai: any) => {
    box(0.49, 0.6, 0.05, MADEIRA, 0, 0, 0, pai)
    box(0.42, 0.5, 0.02, PAPEL, 0, -0.015, 0.037, pai)
    box(0.18, 0.06, 0.035, TINTA, 0, 0.28, 0.04, pai)
  }
  const animacoes: ((t: number) => void)[] = []
  let maos: TrabalhoMini['maos']
  let gesto: (t: number) => Record<string, number> = () => ({})
  switch (id) {
    case 'imoveis': {
      box(0.94, 0.035, 0.55, VERDE, 0, 0.67, 0.61)
      const capa = g(raiz, -0.46, 0.7, 0.61)
      box(0.45, 0.025, 0.53, TINTA, 0.225, 0, 0, capa)
      const contrato = g(raiz, 0.01, 0.705, 0.61)
      box(0.4, 0.012, 0.46, PAPEL, 0.2, 0, 0, contrato)
      linhas(0.2, 0.015, -0.14, 4, contrato)
      const carimbo = g(raiz, -0.27, 0.75, 0.63)
      box(0.16, 0.04, 0.12, TINTA, 0, 0, 0, carimbo)
      box(0.055, 0.12, 0.055, MADEIRA, 0, 0.07, 0, carimbo)
      maos = { esquerda: new T.Vector3(-0.27, 0.84, 0.63), direita: new T.Vector3(0.25, 0.73, 0.51) }
      raiz.userData.maos = maos
      animacoes.push(t => {
        const ciclo = ((t % 8) + 8) % 8
        capa.rotation.z = -0.2 - Math.min(1, ciclo) * 2.6
        contrato.rotation.z = ciclo > 6 ? Math.sin(((ciclo - 6) / 2) * Math.PI) * 2.5 : 0
        carimbo.position.y = 0.75 + (ciclo > 5 && ciclo < 6 ? Math.sin((ciclo - 5) * Math.PI) * 0.08 : 0)
        maos!.esquerda.set(-0.27, carimbo.position.y + 0.09, 0.63)
        // matrix atualizada explicitamente: nenhum alvo depende do frame anterior.
        contrato.updateMatrix()
        maos!.direita.set(0.08 + (Math.min(ciclo, 5) / 5) * 0.3, 0.025, -0.06).applyMatrix4(contrato.matrix)
      })
      gesto = t => ({ lx: -0.8, le: -1.2, rx: -0.8, re: -1.25, cy: Math.sin(t * 0.6) * 0.12 })
      break
    }
    case 'contador': {
      box(0.36, 0.06, 0.46, TINTA, -0.29, 0.69, 0.53)
      box(0.27, 0.012, 0.09, VERDE, -0.29, 0.728, 0.39)
      repetidos(
        geo,
        PAPEL,
        Array.from({ length: 9 }, (_, i) => [
          -0.39 + (i % 3) * 0.1,
          0.731,
          0.51 + Math.floor(i / 3) * 0.1,
          0.06,
          0.018,
          0.055,
        ]),
      )
      repetidos(
        geo,
        PAPEL,
        Array.from({ length: 5 }, (_, i) => [0.34, 0.66 + i * 0.018, 0.65, 0.42, 0.016, 0.43]),
      )
      const pagina = g(raiz, 0.14, 0.76, 0.65)
      box(0.4, 0.012, 0.42, PAPEL, 0.2, 0, 0, pagina)
      linhas(0.2, 0.012, -0.12, 3, pagina)
      animacoes.push(t => {
        pagina.rotation.z = Math.max(0, Math.sin(t * 1.3)) * 2.4
      })
      gesto = t => ({
        lx: -0.83 + Math.sin(t * 8) * 0.08,
        le: -1.1,
        rx: -0.68,
        re: -0.9 - Math.max(0, Math.sin(t * 1.3)) * 0.7,
        cy: Math.sin(t * 1.3) * 0.16,
      })
      break
    }
    case 'colchao': {
      box(0.68, 0.68, 0.43, 0x59616b, 0.27, 0.99, 0.74)
      const porta = g(raiz, -0.05, 0.99, 0.97)
      box(0.6, 0.59, 0.035, 0x8a9098, 0.3, 0, 0, porta)
      const dial = g(porta, 0.3, 0, 0.04)
      box(0.21, 0.21, 0.05, TINTA, 0, 0, 0, dial)
      box(0.025, 0.17, 0.025, OURO, 0, 0, 0.04, dial)
      const chave = g(raiz, -0.37, 0.79, 0.53)
      box(0.13, 0.13, 0.045, OURO, 0, 0, 0, chave)
      box(0.04, 0.2, 0.04, OURO, 0, -0.13, 0, chave)
      box(0.09, 0.04, 0.04, OURO, 0.025, -0.2, 0, chave)
      animacoes.push(t => {
        dial.rotation.z = Math.sin(t * 1.5) * 1.8
        porta.rotation.y = -0.12 * (1 + Math.sin(t * 0.7))
        chave.rotation.z = Math.sin(t * 1.5) * 0.2
      })
      gesto = t => ({ rx: -0.9, re: -1.7 + Math.sin(t * 1.5) * 0.18, lx: -0.65, le: -1.25, cy: 0.2 })
      break
    }
    case 'tesoureiro': {
      repetidos(
        geo,
        PAPEL,
        Array.from({ length: 4 }, (_, i) => [0.28, 0.67 + 0.022 * i, 0.6 + 0.025 * i, 0.48, 0.02, 0.3]),
      )
      box(0.48, 0.015, 0.025, OURO, 0.28, 0.765, 0.65)
      const carimbo = g(raiz, -0.23, 0.78, 0.55)
      box(0.25, 0.06, 0.18, TINTA, 0, 0, 0, carimbo)
      box(0.07, 0.17, 0.07, MADEIRA, 0, 0.1, 0, carimbo)
      box(0.16, 0.06, 0.1, MADEIRA, 0, 0.2, 0, carimbo)
      const selo = box(0.15, 0.01, 0.1, 0x9a5b4a, 0.28, 0.78, 0.6)
      selo.userData.movel = true
      animacoes.push(t => {
        const s = (1 + Math.sin(t * 2.8)) / 2
        carimbo.position.set(0.28 - s * 0.5, 0.79 + s * 0.24, 0.6)
        selo.scale.x = 0.15 * (1 - s * 0.2)
      })
      gesto = t => ({ rx: -0.6 - (1 + Math.sin(t * 2.8)) * 0.22, re: -1.15, lx: -0.7, le: -1, cy: 0.14 })
      break
    }
    case 'folha': {
      repetidos(
        geo,
        VERDE,
        Array.from({ length: 18 }, (_, i) => [
          -0.38 + Math.floor(i / 6) * 0.37,
          0.665 + (i % 6) * 0.018,
          0.66,
          0.29,
          0.014,
          0.33,
        ]),
      )
      repetidos(
        geo,
        PAPEL,
        [-0.38, -0.01, 0.36].map(x => [x, 0.725, 0.66, 0.06, 0.13, 0.34]),
      )
      const nota = g(raiz, 0, 0.85, 0.4)
      box(0.3, 0.014, 0.2, VERDE, 0, 0, 0, nota)
      box(0.08, 0.01, 0.09, PAPEL, 0, 0.014, 0, nota)
      animacoes.push(t => {
        nota.position.x = Math.sin(t * 3.5) * 0.3
        nota.rotation.z = Math.sin(t * 3.5) * 0.25
      })
      gesto = t => ({
        lx: -0.8,
        rx: -0.8,
        le: -1.1 + Math.sin(t * 3.5) * 0.22,
        re: -1.1 - Math.sin(t * 3.5) * 0.22,
        cy: Math.sin(t * 3.5) * 0.12,
      })
      break
    }
    case 'comprador': {
      const saco = g(raiz, -0.43, 0.71, 0.56)
      box(0.4, 0.48, 0.32, MADEIRA, 0, 0.17, 0, saco)
      for (const x of [-0.12, 0.12]) box(0.035, 0.23, 0.035, TINTA, x, 0.49, 0, saco)
      box(0.27, 0.035, 0.035, TINTA, 0, 0.6, 0, saco)
      box(0.15, 0.16, 0.13, VERDE, -0.08, 0.45, 0.06, saco)
      box(0.12, 0.24, 0.13, OURO, 0.1, 0.44, -0.02, saco)
      folha(0.32, 0.57)
      const lapis = caneta()
      animacoes.push(t => {
        saco.rotation.z = Math.sin(t * 1.6) * 0.06
        lapis.position.x = 0.3 + Math.sin(t * 4) * 0.1
      })
      gesto = t => ({
        lx: -0.9,
        le: -1.8,
        rx: -0.7,
        re: -1 + Math.sin(t * 4) * 0.08,
        cy: -0.2 + Math.sin(t * 1.6) * 0.16,
      })
      break
    }
    case 'fiscal': {
      const placa = g(raiz, -0.33, 0.96, 0.44)
      placa.rotation.x = -0.35
      prancheta(placa)
      for (let i = 0; i < 3; i++) box(0.26, 0.025, 0.01, TINTA, 0, 0.12 - i * 0.13, 0.052, placa)
      repetidos(geo, MADEIRA, [
        [0.4, 0.75, 0.77, 0.49, 0.2, 0.38],
        [0.42, 0.85, 0.72, 0.53, 0.04, 0.42],
      ])
      repetidos(geo, 0xc0563f, [
        [0.25, 0.94, 0.7, 0.13, 0.13, 0.13],
        [0.39, 0.94, 0.82, 0.13, 0.13, 0.13],
      ])
      repetidos(geo, VERDE, [
        [0.52, 0.94, 0.7, 0.15, 0.14, 0.14],
        [0.54, 0.94, 0.85, 0.12, 0.13, 0.12],
      ])
      const lapis = caneta(placa)
      lapis.position.set(0.07, -0.08, 0.09)
      lapis.rotation.x = Math.PI / 2
      animacoes.push(t => {
        lapis.position.x = 0.05 + Math.sin(t * 5) * 0.1
        placa.rotation.z = Math.sin(t * 1.2) * 0.025
      })
      gesto = t => ({ lx: -0.8, le: -1.7, rx: -0.85, re: -1.6 + Math.sin(t * 5) * 0.08, cy: -0.26 })
      break
    }
    case 'cartao': {
      box(0.31, 0.16, 0.47, TINTA, -0.28, 0.74, 0.65)
      box(0.24, 0.018, 0.17, VERDE, -0.28, 0.83, 0.53)
      repetidos(
        geo,
        PAPEL,
        Array.from({ length: 6 }, (_, i) => [
          -0.35 + (i % 2) * 0.14,
          0.83,
          0.68 + Math.floor(i / 2) * 0.065,
          0.08,
          0.015,
          0.04,
        ]),
      )
      const cartao = g(raiz, -0.28, 0.88, 0.63)
      box(0.25, 0.17, 0.025, 0x7a5c8a, 0, 0, 0, cartao)
      box(0.055, 0.05, 0.012, OURO, -0.06, 0, 0.02, cartao)
      folha(0.32, 0.6)
      animacoes.push(t => {
        cartao.position.z = 0.63 + Math.sin(t * 2.4) * 0.18
        cartao.position.y = 0.9 + Math.max(0, Math.sin(t * 2.4)) * 0.12
      })
      gesto = t => ({ lx: -0.85 + Math.sin(t * 2.4) * 0.18, le: -1.25, rx: -0.7, re: -1, cy: Math.sin(t * 1.2) * 0.27 })
      break
    }
    case 'assistente': {
      box(0.66, 0.09, 0.42, 0x8a6645, 0.04, 0.7, 0.6)
      for (const x of [-0.25, -0.03, 0.19, 0.37]) box(0.025, 0.13, 0.41, OURO, x, 0.77, 0.6)
      const carteira = g(raiz, -0.42, 0.78, 0.46)
      box(0.3, 0.03, 0.26, 0x9a5b4a, 0, 0, 0, carteira)
      box(0.3, 0.23, 0.025, 0x9a5b4a, 0, 0.1, -0.12, carteira)
      const ficha = g(raiz, 0, 0.86, 0.6)
      box(0.12, 0.02, 0.2, VERDE, 0, 0, 0, ficha)
      animacoes.push(t => {
        ficha.position.x = -0.12 + Math.sin(t * 1.7) * 0.2
        ficha.position.y = 0.84 + Math.max(0, Math.cos(t * 1.7)) * 0.13
      })
      gesto = t => ({
        lx: -0.75,
        le: -1.3,
        rx: -0.8,
        re: -1.2 + Math.sin(t * 1.7) * 0.22,
        cy: -0.1 + Math.sin(t * 1.7) * 0.2,
      })
      break
    }
    case 'guardado': {
      moedas(
        Array.from({ length: 15 }, (_, i) => [
          -0.42 + Math.floor(i / 5) * 0.19,
          0.67 + (i % 5) * 0.045,
          0.62,
          0.085,
          0.036,
          0.085,
        ]),
      )
      const moeda = g(raiz, -0.18, 0.95, 0.55)
      moedas([[0, 0, 0, 0.09, 0.04, 0.09]], moeda)
      box(0.47, 0.55, 0.05, PAPEL, 0.37, 0.96, 0.88)
      for (let i = 0; i < 3; i++) box(0.09, 0.13 + 0.13 * i, 0.04, VERDE, 0.22 + 0.14 * i, 0.79 + 0.065 * i, 0.93)
      animacoes.push(t => {
        moeda.position.x = -0.23 + Math.sin(t * 2) * 0.17
        moeda.position.y = 0.91 + Math.cos(t * 2) * 0.08
      })
      gesto = t => ({ lx: -0.8, le: -1.2 + Math.cos(t * 2) * 0.2, rx: -0.7, re: -1.8, cy: 0.12 + Math.sin(t) * 0.22 })
      break
    }
    case 'usina': {
      const paineis = g(raiz, 0, 0.87, 0.75)
      paineis.rotation.x = -0.45
      for (const x of [-0.34, 0.34]) {
        box(0.57, 0.43, 0.06, 0x8e949c, x, 0, 0, paineis)
        repetidos(
          geo,
          TINTA,
          Array.from({ length: 6 }, (_, i) => [
            x - 0.17 + (i % 3) * 0.17,
            -0.1 + Math.floor(i / 3) * 0.2,
            0.04,
            0.14,
            0.16,
            0.025,
          ]),
          paineis,
        )
        box(0.07, 0.18, 0.12, 0x8e949c, x, 0.72, 0.74)
      }
      const medidor = g(raiz, -0.3, 0.83, 0.38)
      box(0.22, 0.1, 0.2, OURO, 0, 0, 0, medidor)
      box(0.13, 0.015, 0.1, VERDE, 0, 0.06, 0, medidor)
      animacoes.push(t => {
        medidor.position.x = Math.sin(t * 1.15) * 0.4
        medidor.rotation.y = Math.sin(t * 1.15) * 0.15
      })
      gesto = t => ({ lx: -0.8, le: -1.1 + Math.sin(t * 1.15) * 0.2, rx: -0.9, re: -1.5, cy: Math.sin(t * 1.15) * 0.3 })
      break
    }
    case 'secretaria': {
      box(0.31, 0.1, 0.35, TINTA, -0.4, 0.7, 0.65)
      const telefone = g(raiz, -0.33, 1.13, 0.09)
      box(0.08, 0.31, 0.07, TINTA, 0, 0, 0, telefone)
      for (const y of [-0.15, 0.15]) box(0.14, 0.09, 0.12, TINTA, 0.03, y, 0.02, telefone)
      // Cabo voxel em degraus, sem curva/tesselação adicional.
      for (let i = 0; i < 4; i++) box(0.025, 0.1, 0.025, TINTA, -0.36, 0.78 + i * 0.06, 0.47 - i * 0.1)
      folha(0.28, 0.54)
      box(0.025, 0.035, 0.44, MADEIRA, 0.28, 0.7, 0.54)
      const lapis = caneta()
      animacoes.push(t => {
        telefone.rotation.z = Math.sin(t * 1.8) * 0.04
        lapis.position.z = 0.52 + Math.sin(t * 4.5) * 0.07
      })
      gesto = t => ({
        lx: -1.1,
        le: -2.1,
        lz: -0.15,
        rx: -0.7,
        re: -1 + Math.sin(t * 4.5) * 0.07,
        cx: -0.08,
        cy: -0.12,
      })
      break
    }
    case 'presenca': {
      const quadro = g(raiz, 0.15, 1.05, 0.84)
      box(0.87, 0.66, 0.06, MADEIRA, 0, 0, 0, quadro)
      box(0.79, 0.58, 0.02, PAPEL, 0, 0, 0.04, quadro)
      for (let i = 0; i < 4; i++) {
        box(0.76, 0.012, 0.015, TINTA, 0, -0.25 + i * 0.17, 0.06, quadro)
        box(0.012, 0.52, 0.015, TINTA, -0.36 + i * 0.24, 0, 0.06, quadro)
      }
      const visto = g(quadro, -0.2, 0.1, 0.08)
      const a = box(0.07, 0.025, 0.02, VERDE, -0.025, -0.02, 0, visto)
      a.rotation.z = -0.7
      const b = box(0.14, 0.025, 0.02, VERDE, 0.04, 0.015, 0, visto)
      b.rotation.z = 0.8
      animacoes.push(t => {
        visto.position.x = -0.22 + Math.floor((1 + Math.sin(t * 0.9)) * 1.49) * 0.22
        visto.scale.setScalar(0.85 + 0.15 * Math.sin(t * 4))
      })
      gesto = t => ({ rx: -1.25, re: -1.25 + Math.sin(t * 0.9) * 0.22, lx: -0.6, le: -0.9, cy: 0.18 })
      break
    }
    case 'auditor': {
      const poses = [
        [-0.48, 0.81, 0.75, 0.34, 0.29, 0.32],
        [-0.12, 0.81, 0.75, 0.34, 0.29, 0.32],
        [0.24, 0.81, 0.75, 0.34, 0.29, 0.32],
        [0.06, 1.11, 0.75, 0.34, 0.29, 0.32],
      ]
      repetidos(geo, MADEIRA, poses)
      repetidos(
        geo,
        PAPEL,
        poses.map(p => [p[0], p[1], p[2] + 0.168, 0.15, 0.09, 0.012]),
      )
      const ponteiro = box(0.035, 0.035, 0.38, TINTA, -0.15, 1.15, 0.43)
      ponteiro.userData.movel = true
      box(0.18, 0.08, 0.18, 0x8e949c, -0.42, 0.72, 0.35)
      animacoes.push(t => {
        ponteiro.position.x = Math.sin(t * 1.4) * 0.34
        ponteiro.rotation.y = Math.sin(t * 1.4) * -0.4
      })
      gesto = t => ({
        rx: -1.35,
        re: -1.25,
        rz: Math.sin(t * 1.4) * 0.22,
        lx: -0.65,
        le: -1.2,
        cy: Math.sin(t * 1.4) * 0.3,
      })
      break
    }
    case 'anfitriao': {
      box(1.24, 0.24, 0.16, MADEIRA, 0, 0.76, 0.99)
      box(0.22, 0.045, 0.21, TINTA, -0.4, 0.69, 0.63)
      box(0.16, 0.12, 0.16, OURO, -0.4, 0.77, 0.63)
      box(0.045, 0.06, 0.045, OURO, -0.4, 0.86, 0.63)
      const fichas = g(raiz, 0.3, 0.67, 0.53)
      box(0.38, 0.03, 0.29, PAPEL, 0, 0, 0, fichas)
      box(0.23, 0.012, 0.045, VERDE, 0, 0.025, 0, fichas)
      animacoes.push(t => {
        fichas.position.x = 0.27 + Math.sin(t * 1.3) * 0.08
        fichas.rotation.y = Math.sin(t * 1.3) * 0.1
      })
      gesto = t => ({
        lx: -0.25,
        lz: -0.5 + Math.sin(t * 2.3) * 0.18,
        le: -2.4,
        rx: -0.7,
        re: -1,
        rez: Math.sin(t * 2.3) * 0.08,
        cy: -0.2,
        cx: -0.08,
      })
      break
    }
    case 'sonhadora': {
      box(1.05, 0.72, 0.065, MADEIRA, 0.04, 1.04, 0.89)
      const paginas = g(raiz, -0.44, 1.04, 0.94)
      box(0.96, 0.65, 0.025, PAPEL, 0.48, 0, 0, paginas)
      // Casa, viagem e presente legíveis como três silhuetas no mural.
      box(0.2, 0.18, 0.025, VERDE, 0.2, -0.04, 0.035, paginas)
      const telhado = box(0.18, 0.18, 0.02, 0x9a5b4a, 0.2, 0.12, 0.035, paginas)
      telhado.rotation.z = Math.PI / 4
      box(0.23, 0.07, 0.025, TINTA, 0.51, 0.04, 0.035, paginas)
      box(0.035, 0.25, 0.025, TINTA, 0.51, 0.04, 0.035, paginas)
      box(0.19, 0.2, 0.025, 0x8e6b7e, 0.78, 0, 0.035, paginas)
      box(0.025, 0.22, 0.025, OURO, 0.78, 0, 0.055, paginas)
      animacoes.push(t => {
        paginas.rotation.y = Math.max(0, Math.sin(t * 1.1)) * -0.6
      })
      gesto = t => ({ rx: -1.15, re: -1.5 + Math.sin(t * 1.1) * 0.3, lx: -0.9, le: -1.5, cy: Math.sin(t * 1.1) * 0.23 })
      break
    }
    case 'analista': {
      box(1.02, 0.74, 0.07, TINTA, 0.07, 1.07, 0.88)
      const ponteiros: any[] = []
      for (let i = 0; i < 4; i++) {
        const x = -0.17 + (i % 2) * 0.48,
          y = 0.91 + Math.floor(i / 2) * 0.34
        box(0.4, 0.27, 0.02, PAPEL, x, y, 0.93)
        const p = g(raiz, x, y, 0.96)
        box(0.025, 0.1, 0.02, VERDE, 0, 0.045, 0, p)
        box(0.06, 0.025, 0.02, OURO, 0, 0, 0.02, p)
        ponteiros.push(p)
      }
      animacoes.push(t => {
        ponteiros.forEach((p, i) => {
          p.rotation.z = Math.sin(t * 0.8 + i * 1.4) * 1.1
        })
      })
      gesto = t => ({
        rx: -1.15 - Math.sin(t * 0.8) * 0.15,
        re: -1.4,
        rz: Math.cos(t * 0.8) * 0.2,
        lx: -0.6,
        le: -1,
        cy: Math.sin(t * 0.8) * 0.25,
      })
      break
    }
    case 'zelador': {
      box(0.58, 0.13, 0.42, TINTA, 0.16, 0.71, 0.65)
      const roda = g(raiz, 0.16, 0.85, 0.63)
      box(0.3, 0.04, 0.07, OURO, 0, 0, 0, roda)
      box(0.07, 0.04, 0.3, OURO, 0, 0, 0, roda)
      const chave = g(roda)
      box(0.08, 0.04, 0.43, 0x8e949c, 0, 0.06, -0.15, chave)
      for (const x of [-0.08, 0.08]) box(0.06, 0.04, 0.17, 0x8e949c, x, 0.06, 0.12, chave)
      folha(-0.38, 0.67)
      animacoes.push(t => {
        roda.rotation.y = Math.sin(t * 2.1) * 0.65
      })
      gesto = t => ({ rx: -0.9, re: -1.2, rz: Math.sin(t * 2.1) * 0.23, lx: -0.65, le: -0.95, cx: 0.24 })
      break
    }
    case 'protetora': {
      box(0.59, 0.07, 0.45, TINTA, -0.19, 0.7, 0.64)
      box(0.12, 0.02, 0.46, OURO, -0.19, 0.75, 0.64)
      box(0.43, 0.35, 0.19, OURO, 0.3, 0.9, 0.65)
      box(0.05, 0.09, 0.02, TINTA, 0.3, 0.91, 0.756)
      const arco = g(raiz, 0.15, 1.06, 0.65)
      for (const x of [0, 0.3]) box(0.055, 0.25, 0.055, 0x8e949c, x, 0.1, 0, arco)
      box(0.35, 0.055, 0.055, 0x8e949c, 0.15, 0.23, 0, arco)
      animacoes.push(t => {
        const a = Math.max(0, Math.sin(t * 1.8))
        arco.position.y = 1.06 + a * 0.12
        arco.rotation.y = a * 0.7
      })
      gesto = t => ({ rx: -1, re: -1.75 + Math.max(0, Math.sin(t * 1.8)) * -0.15, lx: -0.65, le: -1, cy: 0.18 })
      break
    }
    default:
      folha(0, 0.6)
  }
  return {
    raiz,
    animar(t) {
      for (const fn of animacoes) fn(t)
    },
    pose: gesto,
    maos,
  }
}
