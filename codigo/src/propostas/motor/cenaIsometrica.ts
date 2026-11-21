import type * as Tres from '../../telas/escritorio/tres'
import type { EstadoFuncionario } from '../../api/tipos'
import { EQUIPE, type MembroEquipe, type SalaEquipe } from '../../lib/escritorio/equipe'
import { faseDoId } from '../../telas/escritorio/atividadesMini'
import { montarCadeira, montarMesa, montarPredio, montarSala } from './mobiliarioIsometrico'
import { personagemIsometrico, type PecaIsometrica } from './personagemIsometrico'
import {
  PLANTA,
  SALAS_ISOMETRICAS,
  type NavegacaoIsometrica,
  type VistaIsometrica,
} from '../../lib/escritorio/plantaIsometrica'

export const ORCAMENTO_ISOMETRICO = { desenhos: 32, triangulos: 45000 }
export type EstadosIsometricos = Readonly<Partial<Record<string, EstadoFuncionario>>>
export type { NavegacaoIsometrica }
export interface PostoProjetado {
  id: string
  x: number
  y: number
  chama: boolean
}

export interface OpcoesIsometricas {
  estados: EstadosIsometricos
  vista: VistaIsometrica
  etiqueta: (id: string) => HTMLElement | null
  placa: (sala: SalaEquipe) => HTMLElement | null
  aoTocar: (id: string) => void
  aoPerderContexto: () => void
  /** Composição mais próxima usada no laboratório. */
  palco?: {
    variante: 'compacta' | 'media' | 'grande'
    elenco: readonly MembroEquipe[]
    pagina?: SalaEquipe
    panorama?: boolean
    completo?: boolean
    celular?: boolean
    posicionar: (postos: readonly PostoProjetado[], largura: number, altura: number) => void
    aoApontar: (id: string | null) => void
    aoDesenhar: () => void
  }
}

/** A cena só recebe estados e referências de posição. Valores ficam na interface React. */
export function montarEscritorioIsometrico(T: typeof Tres, el: HTMLElement, opcoes: OpcoesIsometricas) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  const canvas = renderer.domElement as HTMLCanvasElement
  canvas.setAttribute('aria-hidden', 'true')
  const recursos = new Set<{ dispose(): void }>()
  const limpar = new Set<() => void>()
  const guardar = <R extends { dispose(): void }>(r: R) => {
    recursos.add(r)
    return r
  }
  const scene = new T.Scene()
  let parado = false
  let frame: number | null = null
  const cancelar = () => {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
  }
  function destruir() {
    if (parado) return
    parado = true
    cancelar()
    limpar.forEach(fn => fn())
    recursos.forEach(r => r.dispose())
    scene.clear()
    renderer.dispose()
    renderer.forceContextLoss()
    canvas.remove()
  }
  try {
    return iniciar()
  } catch (erro) {
    destruir()
    throw erro
  }

  function iniciar() {
    const palco = opcoes.palco
    const completo = !!palco?.completo
    const aproximado = !!palco && !palco.panorama && !completo
    let pagina = palco?.pagina ?? palco?.elenco[0]?.sala ?? 'caixa'
    const salaEmCena = () => (vista === 'tudo' ? pagina : vista)
    const emCena = (sala: SalaEquipe) => !aproximado || sala === salaEmCena()
    const movimento = window.matchMedia('(prefers-reduced-motion: reduce)')
    let estados = opcoes.estados,
      vista = opcoes.vista,
      naTela = true,
      leve = false
    let navegacao: NavegacaoIsometrica = { zoom: 1, x: 0, y: 0 }
    let largura = 0,
      altura = 0,
      precisaRedesenhar = true
    let ultimo = 0,
      tempo = 0,
      somaFrames = 0,
      somaTempos = 0
    const mat = guardar(new T.MeshLambertMaterial())
    const janela = guardar(new T.MeshLambertMaterial({ color: 0xbfd8e6, emissive: 0x9cc4da, emissiveIntensity: 0.35 }))
    const mancha = guardar(
      new T.MeshBasicMaterial({
        color: 0,
        transparent: true,
        vertexColors: aproximado,
        opacity: aproximado ? 1 : 0.085,
        depthWrite: false,
      }),
    )
    const cubo = guardar(new T.BoxGeometry(1, 1, 1))
    const esfera = guardar(new T.SphereGeometry(0.5, aproximado ? 16 : 8, aproximado ? 10 : 4))
    const circulo = guardar(aproximado ? new T.RingGeometry(0, 1, 24, 4) : new T.CircleGeometry(1, 16))
    if (aproximado) {
      const posicao = circulo.attributes.position
      const rgba = new Float32Array(posicao.count * 4)
      for (let i = 0; i < posicao.count; i++) {
        const raio = Math.hypot(posicao.getX(i), posicao.getY(i))
        rgba[i * 4 + 3] = 0.21 * Math.max(0, 1 - raio) ** 1.5
      }
      circulo.setAttribute('color', new T.BufferAttribute(rgba, 4))
    }
    const fosforo = guardar(new T.MeshBasicMaterial())
    const externo = new T.Group(),
      movel = new T.Group()
    const telas = new T.Group(),
      marcadores = new T.Group(),
      entregas = new T.Group()
    telas.name = 'telas acesas'
    marcadores.name = 'pedidos de atenção'
    entregas.name = 'selos de entrega'
    const cor = new T.Color()
    let salaDaPeca: SalaEquipe | undefined
    function peca(geo: any): PecaIsometrica {
      return (pai, tinta, d, p) => {
        const objeto = new T.Mesh(geo, mat)
        objeto.userData.cor = tinta
        objeto.userData.sala = salaDaPeca
        objeto.scale.set(d[0], d[1], d[2])
        objeto.position.set(p[0], p[1], p[2])
        pai.add(objeto)
        return objeto
      }
    }
    const basico = peca(cubo),
      oval = peca(esfera)
    const direcaoCamera = completo
      ? new T.Vector3(palco?.celular ? 0.24 : 0.84, 0.94, 1).normalize()
      : new T.Vector3(1, palco ? 0.72 : 0.86, palco ? 1.2 : 1).normalize()
    const pontoDeAtencao = palco ? peca(guardar(new T.CircleGeometry(0.5, 24))) : oval
    const vidros = new T.Group(),
      manchas = new T.Group()
    if (aproximado) {
      for (const sala of SALAS_ISOMETRICAS) {
        salaDaPeca = sala
        montarSala(sala, (c, d, p) => basico(externo, c, d, p), true)
      }
    } else {
      montarPredio(
        (c, d, p) => basico(externo, c, d, p),
        (c, d, p) => basico(vidros, c, d, p),
      )
      const telhado = new T.Mesh(guardar(new T.ConeGeometry(0.36, 0.26, 4)), mat)
      telhado.userData.cor = 0xa6584a
      telhado.rotation.y = Math.PI / 4
      telhado.position.set(4.8, 0.87, 0.78)
      externo.add(telhado)
    }

    const personagens = (palco?.elenco ?? EQUIPE).map(m => {
      salaDaPeca = m.sala
      const sala = PLANTA[m.sala]
      const x = aproximado ? m.mesa * 0.83 : sala.x + m.mesa
      const z = aproximado ? -0.88 : sala.z - (sala.fundo === 4 ? 1.4 : 1.67)
      montarMesa(
        (c, d, p) => basico(externo, c, d, [x + p[0], p[1], z + p[2]]),
        (c, d, p) => oval(externo, c, d, [x + p[0], p[1], z + p[2]]),
        m.mesa !== 0,
      )
      for (const escala of palco ? [0.77] : [0.53, 0.39]) {
        const sombra = new T.Mesh(circulo, mancha)
        sombra.userData.sala = m.sala
        sombra.position.set(x, 0.047, z + 0.07)
        sombra.scale.set(escala, escala * 0.9, 1)
        sombra.rotation.x = -Math.PI / 2
        manchas.add(sombra)
      }
      const b = personagemIsometrico(T, basico, oval, m, aproximado || completo)
      if (completo) b.cabeca.scale.setScalar(1.15)
      b.raiz.position.set(x, 0, z)
      movel.add(b.raiz)
      montarCadeira(
        (c, d, p) => basico(b.raiz, c, d, p),
        (c, d, p) => oval(b.raiz, c, d, p),
      )

      const monitor = new T.Group()
      monitor.position.set(x - 0.48, 0, z + 0.805)
      monitor.rotation.y = palco ? 1.29 : 1.61
      externo.add(monitor)
      basico(monitor, 0x50584f, [0.45, 0.327, 0.06], [0, 0.897, 0])
      basico(monitor, 0x313833, [0.399, 0.274, 0.012], [0, 0.897, 0.034])
      basico(monitor, 0x50584f, [0.063, 0.161, 0.06], [0, 0.718, -0.01])
      basico(monitor, 0x50584f, [0.211, 0.022, 0.13], [0, 0.647, -0.01])
      const luzes = new T.Group()
      luzes.position.copy(monitor.position)
      luzes.rotation.copy(monitor.rotation)
      telas.add(luzes)
      const tela = [
        basico(luzes, palco ? 0xc8efe5 : 0xbecdaf, [0.394, 0.269, 0.009], [0, 0.897, 0.043]),
        basico(luzes, palco ? 0x358778 : 0x5d7559, [0.28, 0.03, 0.008], [-0.013, 0.971, 0.05]),
        basico(luzes, palco ? 0x5ca499 : 0x73886b, [0.19, 0.024, 0.008], [-0.059, 0.917, 0.05]),
        basico(luzes, palco ? 0x5ca499 : 0x73886b, [0.23, 0.024, 0.008], [-0.038, 0.874, 0.05]),
      ]

      const marcador = pontoDeAtencao(
        marcadores,
        palco ? 0xffb33f : 0xb7773c,
        [0.18, 0.18, 0.18],
        [x + 0.47, palco ? 1.59 : 1.48, z - 0.01],
      )
      const contorno = palco
        ? pontoDeAtencao(marcadores, 0x633917, [0.18, 0.18, 0.18], [x + 0.47, 1.59, z - 0.01])
        : null
      if (contorno) {
        contorno.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), direcaoCamera)
        marcador.quaternion.copy(contorno.quaternion)
        marcador.position.addScaledVector(direcaoCamera, 0.01)
      }
      const apoioSelo = new T.Group()
      entregas.add(apoioSelo)
      apoioSelo.position.set(x + 0.422, palco ? 0.706 : 0.671, z + 0.65)
      apoioSelo.rotation.x = palco ? 0.36 : 0
      const selo = [basico(apoioSelo, 0xeae2cb, [0.252, 0.022, 0.23], [0, 0, 0])]
      for (const [x1, z1, x2, z2] of [
        [0.352, 0.676, 0.413, 0.713],
        [0.413, 0.713, 0.485, 0.575],
      ]) {
        const traco = basico(
          apoioSelo,
          0x465d49,
          [0.033, 0.012, Math.hypot(x2 - x1, z2 - z1) + 0.014],
          [(x1 + x2) / 2 - 0.422, 0.016, (z1 + z2) / 2 - 0.65],
        )
        traco.rotation.y = Math.atan2(x2 - x1, z2 - z1)
        selo.push(traco)
      }
      return {
        m,
        b,
        x,
        z,
        tela,
        marcador,
        contorno,
        selo,
        fase: faseDoId(m.id),
        estado: null as EstadoFuncionario | undefined | null,
        entregouEm: 0,
      }
    })
    // Só os lotes chegam à GPU. A hierarquia original preserva as articulações.
    function instanciar(raiz: any, material: any, sombra: boolean, pintar = true, visibilidadeVariavel = false) {
      const lotes = new Map<any, any[]>()
      raiz.traverse((obj: any) => {
        if (!obj.isMesh) return
        const grupo = lotes.get(obj.geometry)
        if (grupo) grupo.push(obj)
        else lotes.set(obj.geometry, [obj])
      })
      const malhas = [...lotes].map(([geo, pecas]) => {
        const lote = guardar(new T.InstancedMesh(geo, material, pecas.length))
        lote.name = raiz.name
        lote.frustumCulled = false
        lote.castShadow = sombra
        lote.receiveShadow = sombra
        scene.add(lote)
        return { lote, pecas }
      })
      return (primeiro = false) => {
        raiz.updateMatrixWorld(true)
        for (const { lote, pecas } of malhas) {
          let i = 0
          for (const p of pecas) {
            if (!emCena(p.userData.sala) || (visibilidadeVariavel && !p.visible)) continue
            lote.setMatrixAt(i, p.matrixWorld)
            if ((primeiro || visibilidadeVariavel) && pintar) lote.setColorAt(i, cor.setHex(p.userData.cor))
            i++
          }
          lote.count = i
          lote.instanceMatrix.needsUpdate = true
          if (lote.instanceColor && (primeiro || visibilidadeVariavel)) lote.instanceColor.needsUpdate = true
        }
      }
    }
    const atualizarMoveis = instanciar(externo, mat, true)
    atualizarMoveis(true)
    instanciar(vidros, janela, false, false)(true)
    const atualizarManchas = instanciar(manchas, mancha, false, false)
    atualizarManchas(true)
    const atualizarInstancias = instanciar(movel, mat, false)
    const atualizarTelas = instanciar(telas, fosforo, false, true, true)
    const atualizarMarcadores = instanciar(marcadores, fosforo, false, true, true)
    const atualizarEntregas = instanciar(entregas, mat, false, true, true)
    atualizarInstancias(true)

    scene.add(new T.HemisphereLight(0xfff8ee, 0xbfae92, palco ? 1.75 : 1.55))
    const sol = guardar(new T.DirectionalLight(0xfff2dd, palco ? 1.5 : 2.1))
    sol.position.set(-6, 12, palco ? 4 : 8)
    sol.castShadow = true
    sol.shadow.mapSize.set(palco ? 512 : 1024, palco ? 512 : 1024)
    const sombraLimite = aproximado ? 5 : 14
    Object.assign(sol.shadow.camera, {
      left: -sombraLimite,
      right: sombraLimite,
      top: sombraLimite,
      bottom: -sombraLimite,
      near: 1,
      far: 50,
    })
    sol.shadow.camera.updateProjectionMatrix()
    sol.shadow.normalBias = 0.025
    sol.shadow.bias = -0.0006
    scene.add(sol, sol.target)
    renderer.shadowMap.enabled = palco?.variante !== 'compacta' && !palco?.panorama && !completo
    renderer.shadowMap.type = T.PCFSoftShadowMap
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
    renderer.info.autoReset = false
    renderer.setClearColor(0, 0)
    canvas.className = 'iso-canvas'
    el.prepend(canvas)

    const cam = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 100)
    cam.position.copy(direcaoCamera).multiplyScalar(40)
    cam.lookAt(0, 0, 0)
    cam.updateMatrixWorld(true)
    const ponto = new T.Vector3()
    function enquadrar(...volumes: [number, number, number, number, number][]) {
      let left = Infinity,
        right = -Infinity,
        top = -Infinity,
        bottom = Infinity
      for (const [x0, x1, z0, z1, teto] of volumes) {
        for (const x of [x0, x1])
          for (const y of [-0.3, teto])
            for (const z of [z0, z1]) {
              ponto.set(x, y, z).applyMatrix4(cam.matrixWorldInverse)
              left = Math.min(left, ponto.x)
              right = Math.max(right, ponto.x)
              bottom = Math.min(bottom, ponto.y)
              top = Math.max(top, ponto.y)
            }
      }
      return { x: (left + right) / 2, y: (bottom + top) / 2, w: (right - left) / 2, h: (top - bottom) / 2 }
    }
    const geral = enquadrar([-6.5, 6.5, -10.5, 5.5, 1.8], [-6.25, 6.25, -10.22, -10, 2.2], [-3.5, 3.5, 5.1, 9.5, 1.8])
    const salas = Object.fromEntries(
      SALAS_ISOMETRICAS.map(k => {
        const { x, z, fundo } = PLANTA[k]
        return [k, enquadrar([x - 3, x + 3, z - fundo / 2, z + fundo / 2, 2.2])]
      }),
    )
    const postosPorSala = completo
      ? Object.fromEntries(
          SALAS_ISOMETRICAS.map(k => [
            k,
            enquadrar(
              ...personagens
                .filter(({ m }) => m.sala === k)
                .map(({ x, z }): [number, number, number, number, number] => [
                  x - 0.86,
                  x + 0.86,
                  z - 0.35,
                  z + 1.04,
                  1.75,
                ]),
            ),
          ]),
        )
      : undefined
    // Mantém pessoas, mãos levantadas e alvos dentro do quadro mesmo no zoom móvel.
    const postosDaSala = enquadrar([-2.01, 2.31, -1.19, -0.41, 1.72])
    const pisoDaSala = enquadrar([-3.05, 3.05, -2.1, 2.1, 0.9])
    const quadro =
      palco &&
      {
        compacta: { geral: 60, foco: 83, larguraMinima: 7.95 },
        media: { geral: 65, foco: 86, larguraMinima: 7.7 },
        grande: { geral: 70, foco: 90, larguraMinima: 7.45 },
      }[palco.variante]
    function alvo() {
      const a = largura / altura
      if (completo) {
        const postos = postosPorSala?.[vista]
        const centro = vista === 'tudo' ? geral : postos && postos.w > 0 ? postos : salas[vista]
        const ajuste = vista === 'tudo' ? 1.04 : 1.22
        const w = (Math.max(centro.w, centro.h * a) * ajuste) / navegacao.zoom
        return { x: centro.x - navegacao.x * w * 2, y: centro.y + (navegacao.y * w * 2) / a, w }
      }
      if (aproximado && quadro) {
        const foco = vista !== 'tudo'
        const centro = foco ? postosDaSala : pisoDaSala
        const escala = foco ? quadro.foco : Math.min(quadro.geral, largura / quadro.larguraMinima)
        const folga = foco ? 10 : 24
        const larguraDosPostos =
          ((postosDaSala.w + Math.abs(centro.x - postosDaSala.x)) * largura) / Math.max(1, largura - 2 * folga)
        const w = Math.max(largura / (2 * escala), larguraDosPostos, centro.h * a)
        return { x: centro.x, y: centro.y, w }
      }
      const centro = vista === 'tudo' ? geral : salas[vista]
      return { ...centro, w: Math.max(centro.w, centro.h * a) * (vista === 'tudo' ? 1.02 : 1.13) }
    }
    let atual: ReturnType<typeof alvo> | undefined,
      passos = 21
    function camera() {
      const destino = alvo()
      const curva = !atual || movimento.matches || passos >= 20 ? 1 : 0.22
      atual ??= destino
      atual = {
        x: atual.x + (destino.x - atual.x) * curva,
        y: atual.y + (destino.y - atual.y) * curva,
        w: atual.w + (destino.w - atual.w) * curva,
      }
      const w = atual.w,
        h = (w * altura) / largura
      Object.assign(cam, { left: atual.x - w, right: atual.x + w, top: atual.y + h, bottom: atual.y - h })
      cam.updateProjectionMatrix()
      passos = curva === 1 ? 21 : passos + 1
    }
    function posicionar(no: HTMLElement | null, x: number, y: number, z: number) {
      if (!no) return
      ponto.set(x, y, z).project(cam)
      no.style.left = `${(ponto.x + 1) * 50}%`
      no.style.top = `${(1 - ponto.y) * 50}%`
    }

    function posicionarPessoas() {
      const postos: PostoProjetado[] = []
      for (const { m, x, z } of personagens) {
        if (palco ? !emCena(m.sala) : vista !== 'tudo' && vista !== m.sala) continue
        ponto.set(x, completo ? 1.08 : 0.89, z + 0.065).project(cam)
        if (completo && (Math.abs(ponto.x) > 1 || Math.abs(ponto.y) > 1)) continue
        if (palco)
          postos.push({
            id: m.id,
            x: ((ponto.x + 1) * largura) / 2,
            y: ((1 - ponto.y) * altura) / 2,
            chama: estados[m.id] === 'precisa_de_voce',
          })
        else {
          const no = opcoes.etiqueta(m.id)
          if (!no) continue
          no.style.left = `${(ponto.x + 1) * 50}%`
          no.style.top = `${(1 - ponto.y) * 50}%`
        }
      }
      palco?.posicionar(postos, largura, altura)
    }

    function desenhar(reposicionar: boolean) {
      camera()
      const reduzir = movimento.matches
      let mudaramAderecos = reposicionar
      for (const posto of personagens) {
        const { m, b, fase, tela, selo, marcador, contorno } = posto
        if (!emCena(m.sala)) continue
        const estado = estados[m.id]
        const trabalha = estado === 'trabalhando'
        const chama = estado === 'precisa_de_voce'
        const entregue = estado === 'entregue'
        if (estado !== posto.estado) {
          posto.estado = estado
          posto.entregouEm = tempo
          mudaramAderecos = true
          for (const p of tela) p.visible = trabalha
          for (const p of selo) p.visible = entregue
        }
        marcador.visible = chama
        const t = reduzir ? 0 : tempo + fase
        const idadeEntrega = (tempo - posto.entregouEm - fase * 0.055) / 1.15
        const alongar =
          entregue && !reduzir
            ? Math.sin(Math.PI * Math.max(0, Math.min(1, idadeEntrega))) ** 2 * (palco ? 0.66 : 1)
            : 0
        const tecla = trabalha && !reduzir ? Math.sin(t * 13) * 0.09 : 0
        const ler = trabalha && !reduzir ? Math.sin(t * 1.45) : 0
        const cafe = completo && estado === 'vai_comecar' && !reduzir ? Math.max(0, Math.sin(t * 0.83)) ** 6 : 0
        const papel =
          completo && trabalha && (m.objeto === 'pasta' || m.objeto === 'prancheta') && !reduzir
            ? Math.max(0, Math.sin(t * 1.2)) ** 4
            : 0
        const acenar = chama && !reduzir ? Math.sin(t * 3.4) : 0
        b.raiz.rotation.y = chama
          ? 0.62 + acenar * 0.035
          : entregue
            ? 0.28 + alongar * 0.28
            : trabalha
              ? -0.04 + ler * 0.075
              : 0.18
        b.quadril.position.y = 0.319
        b.tronco.rotation.x = entregue ? -0.21 - alongar * 0.12 : trabalha ? 0.11 : chama ? -0.06 : 0.015
        b.cabeca.rotation.x = trabalha ? (palco ? 0.045 : 0.16) + ler * 0.045 : entregue ? -0.07 : 0.02
        b.cabeca.rotation.y = trabalha ? (palco ? 0.17 : -0.24) + ler * 0.065 : chama ? 0.1 : 0.11
        for (const { coxa, joelho } of b.pernas) {
          coxa.rotation.x = -Math.PI / 2 + 0.06
          joelho.rotation.x = Math.PI / 2 - 0.16
        }
        b.esquerda.ombro.rotation.x = trabalha ? -0.68 + tecla : entregue ? -0.17 - alongar * 0.6 : -0.13
        b.esquerda.ombro.rotation.z = trabalha ? 0.15 : entregue ? -0.12 - alongar * 1.17 : -0.08
        b.esquerda.cotovelo.rotation.x = trabalha ? -1.02 : entregue ? -0.64 + alongar * 0.43 : -0.63
        b.direita.ombro.rotation.x = chama
          ? -2.43
          : trabalha
            ? -0.68 - tecla - papel * 0.25
            : entregue
              ? -0.2 - alongar * 0.6
              : -0.29 - cafe * 0.68
        b.direita.ombro.rotation.z = chama
          ? 0.53 + acenar * 0.11
          : trabalha
            ? -0.15
            : entregue
              ? 0.13 + alongar * 1.17
              : 0.1
        b.direita.cotovelo.rotation.x = chama
          ? -0.53 + acenar * 0.13
          : trabalha
            ? -1.02 - papel * 0.22
            : entregue
              ? -0.65 + alongar * 0.43
              : -0.9 - cafe * 0.58
        marcador.scale.setScalar(0.17 + acenar * 0.022)
        if (contorno) {
          contorno.visible = chama
          contorno.scale.setScalar(0.208 + acenar * 0.022)
        }
      }
      if (reposicionar) {
        for (const k of SALAS_ISOMETRICAS) {
          if (vista !== 'tudo' && vista !== k) continue
          const { x, z, fundo } = PLANTA[k]
          posicionar(opcoes.placa(k), x - 0.3, 0.1, z + fundo / 2 - 0.68)
        }
        posicionarPessoas()
      }
      atualizarInstancias()
      if (mudaramAderecos) {
        atualizarTelas()
        atualizarEntregas()
      }
      atualizarMarcadores()
      renderer.info.reset()
      renderer.render(scene, cam)
      const { calls, triangles } = renderer.info.render
      for (const [chave, valor] of [
        ['desenhos', calls],
        ['triangulos', triangles],
        ['leve', leve],
      ] as const) {
        const texto = String(valor)
        if (canvas.dataset[chave] !== texto) canvas.dataset[chave] = texto
      }
    }

    let primeiroQuadro = true
    const ativo = () => !parado && naTela && !document.hidden && largura > 0 && altura > 0
    function agendar() {
      if (frame === null && ativo() && (precisaRedesenhar || !movimento.matches || passos <= 20))
        frame = requestAnimationFrame(tick)
    }
    function tick(agora: number) {
      frame = null
      if (!ativo()) return
      const ms = ultimo ? agora - ultimo : 0
      if (!leve && ms > 0 && !movimento.matches) {
        somaFrames++
        somaTempos += ms
        if (somaTempos >= 1800) {
          if ((somaFrames * 1000) / somaTempos < 25) {
            leve = true
            renderer.shadowMap.enabled = false
            tamanho()
          }
          somaFrames = somaTempos = 0
        }
      }
      if (precisaRedesenhar || !leve || ms >= 55) {
        tempo += Math.min(ms, 100) / 1000
        ultimo = agora
        const reposicionar = precisaRedesenhar || passos <= 20
        precisaRedesenhar = false
        desenhar(reposicionar)
        if (primeiroQuadro) {
          primeiroQuadro = false
          palco?.aoDesenhar()
        }
      }
      agendar()
    }
    function tamanho() {
      largura = el.clientWidth
      altura = el.clientHeight
      if (largura && altura) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, aproximado ? (leve ? 1.5 : 2) : leve ? 1 : 1.5))
        renderer.setSize(largura, altura, false)
      }
      precisaRedesenhar = true
      agendar()
    }
    const suspender = () => {
      ultimo = somaFrames = somaTempos = 0
      cancelar()
      if (ativo()) {
        precisaRedesenhar = true
        agendar()
      }
    }
    const redimensionar = new ResizeObserver(tamanho)
    limpar.add(() => redimensionar.disconnect())
    redimensionar.observe(el)
    const intersecao = new IntersectionObserver(([entrada]) => {
      naTela = entrada.isIntersecting
      suspender()
    })
    limpar.add(() => intersecao.disconnect())
    intersecao.observe(el)
    document.addEventListener('visibilitychange', suspender)
    limpar.add(() => document.removeEventListener('visibilitychange', suspender))
    movimento.addEventListener('change', suspender)
    limpar.add(() => movimento.removeEventListener('change', suspender))
    const perdeu = (e: Event) => {
      e.preventDefault()
      destruir()
      opcoes.aoPerderContexto()
    }
    canvas.addEventListener('webglcontextlost', perdeu)
    limpar.add(() => canvas.removeEventListener('webglcontextlost', perdeu))
    const raio = new T.Raycaster(),
      cursor = new T.Vector2(),
      volume = new T.Box3()
    const acertar = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      cursor.set((2 * (e.clientX - r.left)) / r.width - 1, 1 - (2 * (e.clientY - r.top)) / r.height)
      raio.setFromCamera(cursor, cam)
      let menor = Infinity
      let id: string | undefined
      for (const { m, b, x, z } of personagens) {
        if (palco ? !emCena(m.sala) : (vista !== 'tudo' && vista !== m.sala) || !opcoes.etiqueta(m.id)) continue
        const centro = z
        volume.min.set(x - 0.32, 0.3, centro - 0.28)
        volume.max.set(x + 0.32, b.quadril.position.y + 1.12, centro + 0.31)
        if (!raio.ray.intersectBox(volume, ponto)) continue
        const d = ponto.distanceToSquared(raio.ray.origin)
        if (d < menor) {
          menor = d
          id = m.id
        }
      }
      return id
    }
    const clicar = (e: MouseEvent) => {
      const id = acertar(e)
      if (id) opcoes.aoTocar(id)
    }
    canvas.addEventListener('click', clicar)
    limpar.add(() => canvas.removeEventListener('click', clicar))
    if (palco) {
      const apontar = (e: PointerEvent) => {
        if (e.pointerType !== 'touch') palco.aoApontar(acertar(e) ?? null)
      }
      const sair = () => palco.aoApontar(null)
      canvas.addEventListener('pointermove', apontar)
      canvas.addEventListener('pointerleave', sair)
      limpar.add(() => {
        canvas.removeEventListener('pointermove', apontar)
        canvas.removeEventListener('pointerleave', sair)
      })
    }
    tamanho()
    return {
      navegar(proxima: NavegacaoIsometrica) {
        navegacao = proxima
        precisaRedesenhar = true
        agendar()
      },
      atualizar(proximos: EstadosIsometricos, proxima: VistaIsometrica, proximaPagina = pagina) {
        const salaAnterior = salaEmCena()
        estados = proximos
        pagina = proximaPagina
        if (vista !== proxima) {
          vista = proxima
          passos = 0
        }
        if (aproximado && salaAnterior !== salaEmCena()) {
          atualizarMoveis(true)
          atualizarManchas()
          atualizarInstancias(true)
          renderer.shadowMap.needsUpdate = true
        }
        precisaRedesenhar = true
        agendar()
      },
      destruir,
    }
  }
}
