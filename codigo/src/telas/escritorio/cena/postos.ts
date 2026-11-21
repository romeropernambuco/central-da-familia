/* eslint-disable @typescript-eslint/no-explicit-any */
import { ATIVIDADES_MINI, PERFIL_IMOVEIS, faseDoId, montarAtividade } from '../atividadesMini'
import type { FuncCena, OpcoesCena } from '../../../lib/escritorio/cenaBase'
import { POR_ID } from '../../../lib/escritorio/equipe'
import type { composicaoMini } from '../escritorioMini'
import { criarBoneco } from './boneco'
import { estadoMini, luzTela } from './estados'
import type { Guardar, Pecas } from './pecas'
import { RESERVA, SALAS } from './planta'
import { CORES } from './predio'

interface Lugar {
  T: any
  scene: any
  guardar: Guardar
  pecas: Pecas
  salaG: Record<string, any>
  /** Composição do mini com mais de um funcionário (null na cena completa). */
  composicao: ReturnType<typeof composicaoMini> | null
}

/** Mesa, notebook, cadeira e o objeto de mesa que diz o que o funcionário faz. Devolve a pilha de papel e a tela. */
function montarMesa({ T, guardar, pecas }: Lugar, o: OpcoesCena, e: FuncCena, xs: number, g: any) {
  const { mancha, cx, fecha, grupo } = pecas
  const { MADEIRA, MADEIRA_E, CADEIRA, PAPEL } = CORES
  /* mesa, notebook, cadeira */
  cx(o.mini ? 1.65 : 1.1, 0.06, o.mini ? 0.85 : 0.6, MADEIRA, xs, 0.6, -1.0, g)
  ;[
    [-0.48, -0.24],
    [0.48, -0.24],
    [-0.48, 0.24],
    [0.48, 0.24],
  ].forEach(q => {
    cx(0.06, 0.57, 0.06, MADEIRA_E, xs + q[0], 0.285, -1.0 + q[1], g)
  })
  if (!o.mini) cx(0.42, 0.02, 0.28, 0x8e949c, xs, 0.64, -1.06, g, true)
  const telaMat = guardar(
    new T.MeshLambertMaterial({ color: 0x22272e, emissive: 0xd7eadf, emissiveIntensity: luzTela(e.estado) }),
  )
  if (!o.mini) {
    const monitor = cx(0.42, 0.27, 0.02, telaMat, xs, 0.775, -0.9, g)
    monitor.rotation.x = 0.18
  }
  mancha(0.62, xs, 0.045, -1.25, g)
  if (!o.mini) cx(0.1, 0.12, 0.1, 0xf1eadf, xs + 0.4, 0.69, -0.84, g, true)
  const pilha = grupo(g, xs - 0.36, 0.63, -0.86)
  cx(0.3, 0.03, 0.22, PAPEL, 0, 0.015, 0, pilha)
  cx(0.3, 0.03, 0.22, 0xddd3c2, 0.02, 0.045, 0.01, pilha)
  cx(0.3, 0.03, 0.22, PAPEL, -0.01, 0.075, 0, pilha)
  fecha(pilha)
  pilha.visible = false
  if (!o.mini || !ATIVIDADES_MINI[e.id]?.emPe) {
    cx(0.44, 0.06, 0.44, CADEIRA, xs, 0.21, -1.72, g)
    cx(0.44, 0.5, 0.06, CADEIRA, xs, 0.5, -1.94, g)
    cx(0.07, 0.18, 0.07, 0x33373d, xs, 0.09, -1.72, g)
    cx(0.4, 0.03, 0.4, 0x33373d, xs, 0.015, -1.72, g, true)
  }
  if (!o.mini) {
    const objeto = POR_ID[e.id]?.objeto || 'pasta'
    const acessorio = grupo(g, xs + 0.34, 0.65, -1.08)
    const cor = POR_ID[e.id]?.roupa.camisa || 0x6474a0
    if (objeto === 'grafico' || objeto === 'painel solar') {
      ;[0.08, 0.16, 0.24].forEach((h, j) => cx(0.05, h, 0.12, cor, j * 0.07 - 0.07, h / 2, 0, acessorio))
    } else if (['cofre', 'caixa', 'presente', 'cesta'].includes(objeto)) {
      cx(0.22, 0.18, 0.18, cor, 0, 0.09, 0, acessorio)
      cx(0.04, 0.2, 0.19, 0xd8c27a, 0, 0.1, 0, acessorio)
    } else {
      cx(0.2, 0.025, 0.25, cor, 0, 0.015, 0, acessorio)
      const linhas = objeto === 'calculadora' ? 3 : objeto === 'cartao' ? 1 : 2
      for (let j = 0; j < linhas; j++) cx(0.14, 0.01, 0.02, PAPEL, 0, 0.035, -0.07 + j * 0.06, acessorio)
    }
    fecha(acessorio)
  }
  return { pilha, telaMat }
}

/** O que só existe no mini das outras abas: a atividade do funcionário, o sinal de pergunta, café, relógio e joinha. */
function equiparMini({ T, scene, guardar, pecas }: Lugar, e: FuncCena, ch: any) {
  const { GEO, mat, cx } = pecas
  const { MADEIRA_E, PAPEL } = CORES
  const b = ch.b
  ch.fase = faseDoId(e.id)
  const palco = new T.Group()
  palco.position.copy(ch.S)
  scene.add(palco)
  ch.palco = palco
  ch.trabalho = montarAtividade(e.id, { T, pai: palco, geo: GEO, mat, guardar })
  ch.estado = estadoMini(e.estado)
  ch.legadoRecebido = e.estado
  ch.tempoEstado = 0
  ch.tempoTrabalho = ch.fase
  ch.pesoTrabalho = ch.estado === 'trabalhando' ? 1 : 0
  ch.micro = ch.fase
  ch.rotacao = 0
  // Indicador de pergunta: peça sólida da paleta, sem luz nem transparência animada.
  const sinal = new T.Group()
  palco.add(sinal)
  sinal.position.set(-0.58, 1.48, 0.1)
  cx(0.055, 0.16, 0.055, mat(0xd8c27a), 0, 0, 0, sinal, true)
  cx(0.055, 0.04, 0.055, mat(0xd8c27a), 0, -0.14, 0, sinal, true)
  ch.sinal = sinal
  sinal.name = `chamada:${e.id}`
  // Caneca, vapor voxel e relógio: microvida compartilhada, nunca competem com a atividade.
  const cafe = new T.Group()
  palco.add(cafe)
  cafe.position.set(-0.7, 0.69, 0.85)
  ch.cafe = cafe
  cx(0.13, 0.14, 0.13, mat(0xf1eadf), 0, 0, 0, cafe, true)
  cx(0.07, 0.07, 0.035, mat(MADEIRA_E), -0.09, 0, 0, cafe, true)
  ch.vapor = new T.Group()
  cafe.add(ch.vapor)
  for (let j = 0; j < 2; j++) cx(0.025, 0.08, 0.025, mat(0xddd3c2), 0.04 * j, 0.17 + j * 0.1, 0, ch.vapor, true)
  ch.relogio = new T.Group()
  b.bL.e.add(ch.relogio)
  ch.relogio.position.set(0, -0.19, 0.075)
  cx(0.09, 0.09, 0.02, mat(PAPEL), 0, 0, 0, ch.relogio, true)
  ch.ponteiro = cx(0.015, 0.035, 0.015, mat(MADEIRA_E), 0, 0.012, 0.02, ch.relogio, true)
  ch.joinha = new T.Group()
  b.bR.e.add(ch.joinha)
  ch.joinha.position.set(0, -0.26, 0.04)
  ch.joinha.name = `joinha:${e.id}`
  cx(0.055, 0.14, 0.07, mat(POR_ID[e.id]?.roupa.pele || 0xd9a27e), -0.065, 0, 0, ch.joinha, true)
  b.r.name = `agente:${e.id}`
  b.r.userData.estado = ch.estado
}

/** A mesa vem da lista única da equipe; se a dele já estiver ocupada (ou o funcionário for novo), fica com a 1ª livre. */
function escolherMesa(id: string, sala: string, ocupadas: number[]) {
  const quer = POR_ID[id]?.sala === sala ? POR_ID[id].mesa : null
  const mesa =
    quer != null && !ocupadas.includes(quer)
      ? quer
      : ([-2, 0, 2].find(x => !ocupadas.includes(x)) ?? [-2, 0, 2][ocupadas.length % 3])
  ocupadas.push(mesa)
  return mesa
}

/**
 * Um posto por funcionário: mesa, notebook, cadeira, o objeto que diz o que ele faz e o boneco.
 * Devolve a lista de personagens da cena, cada um com os pontos por onde anda (sentado, corredor, frente da sala).
 */
export function montarPostos(lugar: Lugar, o: OpcoesCena) {
  const { T, scene, pecas, salaG, composicao } = lugar
  const { mancha, fecha } = pecas
  const coletivo = !!composicao && composicao.ids.length > 1
  const boneco = criarBoneco(T, pecas, !!o.mini)
  const chars: any[] = [],
    usadas: Record<string, number[]> = {}
  o.funcionarios.forEach((e, i) => {
    const sala = e.sala && SALAS[e.sala] ? e.sala : 'recepcao'
    const s = SALAS[sala],
      g = coletivo ? new T.Group() : salaG[sala]
    if (coletivo) {
      const p = composicao!.postos[i]
      g.position.set(s.cx + p.posicao[0], 0, s.cz + p.posicao[2] - 1.72 + 1.72 * p.escala)
      g.scale.setScalar(p.escala)
      g.userData.lista = []
      scene.add(g)
    }
    const xs = coletivo ? 0 : escolherMesa(e.id, sala, usadas[sala] || (usadas[sala] = []))
    const { pilha, telaMat } = montarMesa(lugar, o, e, xs, g)
    let roupa = POR_ID[e.id]?.roupa || (e.id === 'imoveis' ? PERFIL_IMOVEIS.roupa : RESERVA[i % RESERVA.length])
    if (coletivo && i)
      roupa = {
        ...roupa,
        ...Object.fromEntries(
          ['camisa', 'calca', 'pele', 'cabelo'].map(k => [
            k,
            new T.Color((roupa as any)[k]).multiplyScalar(0.86).getHex(),
          ]),
        ),
      }
    const b = boneco(o.mini && e.id === 'imoveis' ? { ...roupa, apontaContrato: true } : roupa)
    mancha(0.3, 0, 0.07, 0, b.r)
    b.r.traverse((x: any) => {
      x.userData.id = e.id
    })
    scene.add(b.r)
    const xg = xs + (xs >= 2 ? -1 : 1),
      zf = s.d === 5 ? 1.45 : 1.2
    const W = (x: number, z: number) => new T.Vector3(s.cx + x, 0, s.cz + z)
    const ch: any = {
      id: e.id,
      sala,
      st: e.estado,
      b,
      pilha,
      tela: telaMat,
      S: W(xs, -1.72),
      G1: W(xg, -1.72),
      G2: W(xg, zf - 0.5),
      F: W(xs, zf - 0.5),
      loc: 'sentado',
      path: null,
      fase: i * 1.7,
      festa: 0,
      anim: true,
      pose: {},
    }
    if (coletivo) ch.S.set(s.cx + composicao!.postos[i].posicao[0], 0, s.cz - 1.72 + composicao!.postos[i].posicao[2])
    if (o.mini) equiparMini(lugar, e, ch)
    if (coletivo) {
      fecha(g)
      b.r.scale.setScalar(composicao!.postos[i].escala)
      ch.palco.scale.setScalar(composicao!.postos[i].escala)
    }
    if (!o.mini && e.estado === 'precisa') {
      ch.loc = 'frente'
      b.r.position.copy(ch.F)
      b.r.rotation.y = Math.PI / 4
    } else {
      b.r.position.copy(ch.S)
    }
    chars.push(ch)
  })
  return chars
}
