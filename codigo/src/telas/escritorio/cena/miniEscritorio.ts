/* eslint-disable @typescript-eslint/no-explicit-any */
// O escritório de verdade do mini (o funcionário que aparece nas outras abas): sala, mesa e cadeira vêm de modelos
// carregados depois. Enquanto não chegam, ou se a montagem falhar, fica a cena simples de caixas.
import { POR_ID } from '../equipe'
import {
  caixaReal,
  type composicaoMini,
  criarApoioDasMaos,
  ESCALA_FUNCIONARIO_MINI,
  fundirGrupos,
  fundirRamo,
  montarEscritorioMini,
} from '../escritorioMini'
import { criarBoneco } from './boneco'
import type { Guardar, Pecas } from './pecas'
import { SALAS } from './planta'
import type { VistaViva } from './vista'

export interface PalcoMini {
  T: any
  scene: any
  sol: any
  cam: any
  chars: any[]
  pecas: Pecas
  guardar: Guardar
  limpezas: (() => void)[]
  composicao: ReturnType<typeof composicaoMini>
  coletivo: boolean
  DIR: any
  miniCamera: any
  vista: VistaViva
  destruida: () => boolean
  /** Recalcula a pose do boneco já no lugar novo. */
  posar: (ch: any) => void
  solicitar: () => void
}

type Escritorio = ReturnType<typeof montarEscritorioMini>

function apontarCamera(cam: any, DIR: any) {
  cam.position.copy(DIR).multiplyScalar(40)
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld(true)
}

/** Mede o objeto de trabalho de cada um e calcula onde ele pousa no tampo, sem mexer em nada ainda. */
function medirPostos({ T, chars, composicao }: PalcoMini, escritorio: Escritorio) {
  return chars.map((ch, indice) => {
    const dados = escritorio.postos[indice]
    const objeto = ch.trabalho.raiz,
      medido = caixaReal(objeto.clone(true)),
      centro = medido.getCenter(new T.Vector3())
    const escala = ch.sala === 'caixa' ? 0.42 : 0.52
    return {
      ch,
      objeto,
      escala,
      posicao: new T.Vector3(
        (ch.id === 'imoveis' ? 0.04 : ch.sala === 'caixa' ? -0.18 : -0.28) - centro.x * escala,
        dados.tampo - medido.min.y * escala,
        (ch.id === 'imoveis' ? 0.43 : 0.53) - centro.z * escala,
      ),
      posto: composicao.postos[indice],
      dados,
    }
  })
}
type Preparado = ReturnType<typeof medirPostos>[number]

/** Guarda como cada peça dos bonecos está agora, para poder voltar atrás se a montagem falhar. */
function fotografar(chars: any[]) {
  const anteriores: any[] = []
  for (const ch of chars)
    for (const raiz of [ch.b.r, ch.palco])
      raiz.traverse((n: any) =>
        anteriores.push({
          n,
          filhos: [...n.children],
          pos: n.position.clone(),
          escala: n.scale.clone(),
          rot: n.quaternion.clone(),
          visivel: n.visible,
          sombra: n.castShadow,
        }),
      )
  return anteriores
}

/** No mini com mais de uma pessoa: pernas sentadas viram uma peça rígida; cabelo e olhos se juntam à cabeça. */
function enrijecer({ T, guardar }: PalcoMini, ch: any) {
  const pernas = new T.Group()
  ch.b.hips.add(pernas)
  for (const perna of [ch.b.pL, ch.b.pR]) {
    pernas.add(perna.o.clone(true))
    perna.o.visible = false
  }
  fundirRamo(pernas, guardar)
  fundirRamo(ch.b.head, guardar)
  ch.cafe.visible = false
  ch.relogio.visible = false
}

/** Senta um funcionário na cadeira de verdade: escala, altura das pernas, apoio das mãos e o objeto no tampo. */
function sentarNoPosto(p: PalcoMini, escritorio: Escritorio, { ch, objeto, escala, posicao, posto, dados }: Preparado) {
  const { T, guardar } = p
  objeto.scale.setScalar(escala)
  objeto.position.copy(posicao)
  fundirGrupos(objeto, guardar)
  fundirGrupos(ch.cafe, guardar)
  fundirGrupos(ch.sinal, guardar)
  ch.b.r.children
    .filter((m: any) => m.isMesh)
    .forEach((m: any) => {
      m.visible = false
    })
  ch.b.r.traverse((m: any) => {
    m.castShadow = false
  })
  ch.folgaQuadril = 0.26 * Math.cos(1.5) + 0.1 * Math.sin(1.5)
  ch.b.r.scale.setScalar(ESCALA_FUNCIONARIO_MINI * posto.escala)
  ch.b.r.position.z = ch.S.z + 0.1 * posto.escala
  ch.palco.scale.setScalar(posto.escala)
  ch.apoiarMao = criarApoioDasMaos()
  ch.maoL = new T.Vector3()
  ch.maoR = new T.Vector3()
  if (ch.id === 'imoveis') ch.apoiarMaoR = criarApoioDasMaos(0.325)
  for (const perna of [ch.b.pL, ch.b.pR])
    perna.k.scale.y =
      (dados.assento / ESCALA_FUNCIONARIO_MINI +
        ch.folgaQuadril -
        0.26 * Math.cos(1.5) -
        dados.piso / ESCALA_FUNCIONARIO_MINI) /
      0.29
  ch.escritorio = { ...dados, tela: escritorio.tela }
  ch.pose = {}
  ch.rotacao = 0
  p.posar(ch)
  if (p.coletivo) enrijecer(p, ch)
}

/** Troca a cena de caixas pela sala de verdade: uma sala só para o elenco, cada posto com suas coordenadas. */
function instalar(p: PalcoMini, escritorio: Escritorio, preparados: Preparado[]) {
  const { T, scene, sol, cam, chars, coletivo, DIR } = p
  const objetos = [...scene.children].filter(
    (x: any) => !x.isLight && x !== sol.target && !chars.some(ch => x === ch.b.r || x === ch.palco),
  )
  const origem = coletivo ? new T.Vector3(SALAS[chars[0].sala].cx, 0, SALAS[chars[0].sala].cz - 1.72) : chars[0].S
  escritorio.raiz.position.copy(origem)
  scene.add(escritorio.raiz)
  const limites = caixaReal(escritorio.raiz)
  for (const item of preparados) {
    const { ch, posto, dados } = item
    sentarNoPosto(p, escritorio, item)
    limites.union(caixaReal(ch.b.r)).union(caixaReal(ch.palco))
    limites.max.y = Math.max(limites.max.y, ch.S.y + (dados.assento + 1.24 * ESCALA_FUNCIONARIO_MINI) * posto.escala)
  }
  if (!coletivo) {
    DIR.y *= 0.3
    DIR.normalize()
  }
  apontarCamera(cam, DIR)
  chars[0].limitesMini = limites
  p.vista.parar()
  p.vista.aplicar()
  objetos.forEach((x: any) => {
    x.visible = false
  })
  p.solicitar()
}

/** Volta tudo ao que era antes de `instalar`: a cena de caixas continua valendo. */
function desfazer(p: PalcoMini, escritorio: Escritorio, anteriores: any[]) {
  const { scene, cam, chars, coletivo, DIR, miniCamera } = p
  scene.remove(escritorio.raiz)
  escritorio.destruir()
  for (const { n, filhos, pos, escala, rot, visivel, sombra } of anteriores) {
    n.clear()
    if (filhos.length) n.add(...filhos)
    n.position.copy(pos)
    n.scale.copy(escala)
    n.quaternion.copy(rot)
    n.visible = visivel
    n.castShadow = sombra
  }
  chars.forEach(ch => {
    ch.escritorio = null
    ch.limitesMini = null
    ch.pose = {}
  })
  DIR.set(...(coletivo ? [0, 0.24, 1] : miniCamera?.direcao || [1, 0.86, 1])).normalize()
  apontarCamera(cam, DIR)
  p.vista.aplicar()
}

async function montar(p: PalcoMini, sinal: AbortSignal) {
  const { T, chars, pecas, composicao, limpezas, destruida } = p
  const { modelosEscritorio } = await import('../modelosEscritorio')
  if (destruida()) return
  const { nomesDaSala } = await import('../escritorioMini')
  if (destruida()) return
  const modelos = await modelosEscritorio.adquirir(nomesDaSala(chars[0].sala), sinal).pronto
  if (!modelos || destruida()) return
  const escritorio = montarEscritorioMini(
    chars[0].sala,
    modelos,
    POR_ID[chars[0].id]?.roupa.camisa || 0x6474a0,
    criarBoneco(T, pecas, true),
    composicao,
  )
  if (destruida()) {
    escritorio.destruir()
    return
  }
  limpezas.push(escritorio.destruir)
  // Medidas sem alterar os pivôs; o desfazer conserva a cena simples se a fusão falhar.
  let preparados: Preparado[]
  try {
    preparados = medirPostos(p, escritorio)
  } catch {
    escritorio.destruir()
    return
  }
  const anteriores = fotografar(chars)
  try {
    instalar(p, escritorio, preparados)
  } catch (erro) {
    desfazer(p, escritorio, anteriores)
    throw erro
  }
}

/** Carrega os modelos e monta o escritório do mini. Se a cena for destruída no meio, a carga é cancelada. */
export function carregarEscritorioMini(p: PalcoMini) {
  const controller = new AbortController()
  p.limpezas.push(() => controller.abort())
  void montar(p, controller.signal).catch(() => {
    controller.abort() /* fica a cena simples em falha de carga */
  })
}
