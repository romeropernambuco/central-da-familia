import type * as Tres from './tres'
import type { EstadoFuncionario } from '../../api/tipos'
import { EQUIPE, type MembroEquipe, type SalaEquipe } from './equipe'
import { ATIVIDADES_MINI, faseDoId, montarAtividade } from './atividadesMini'
import { montarMesa, montarPredio } from './mobiliarioIsometrico'
import { personagemIsometrico, type CaixaIsometrica } from './personagemIsometrico'
import { PLANTA, SALAS_ISOMETRICAS, type VistaIsometrica } from './plantaIsometrica'

export const ORCAMENTO_ISOMETRICO = { desenhos: 32, triangulos: 45000 }
export type EstadosIsometricos = Readonly<Partial<Record<string, EstadoFuncionario>>>
export interface PostoProjetado {
  id: string
  x: number
  y: number
  chama: boolean
}

export interface OpcoesIsometricas {
  estados: EstadosIsometricos
  vista: VistaIsometrica
  previa?: boolean
  etiqueta: (id: string) => HTMLElement | null
  placa: (sala: SalaEquipe) => HTMLElement | null
  aoTocar: (id: string) => void
  aoPerderContexto: () => void
  /** Composição mais próxima usada no laboratório. */
  palco?: {
    variante: 'compacta' | 'media' | 'grande'
    elenco: readonly MembroEquipe[]
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
  const guardar = <R extends { dispose(): void }>(r: R) => { recursos.add(r); return r }
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
    const movimento = window.matchMedia('(prefers-reduced-motion: reduce)')
    let estados = opcoes.estados, vista = opcoes.vista, naTela = true, leve = false
    let largura = 0, altura = 0, precisaRedesenhar = true
    let ultimo = 0, tempo = 0, somaFrames = 0, somaTempos = 0
    const mat = guardar(new T.MeshLambertMaterial())
    const janela = guardar(new T.MeshLambertMaterial({ color: 0xBFD8E6, emissive: 0x9CC4DA, emissiveIntensity: .35 }))
    const mancha = guardar(new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: .14, depthWrite: false }))
    const cubo = guardar(new T.BoxGeometry(1, 1, 1)), circulo = guardar(new T.CircleGeometry(1, 16))
    const externo = new T.Group(), movel = new T.Group()
    const cor = new T.Color(), matriz = new T.Matrix4(), local = new T.Matrix4()
    const basico: CaixaIsometrica = (pai, tinta, d, p) => {
      const objeto = new T.Mesh(cubo, mat)
      objeto.userData.cor = tinta
      objeto.scale.set(...d)
      objeto.position.set(...p)
      pai.add(objeto)
      return objeto
    }
    const vidros = new T.Group(), manchas = new T.Group()
    montarPredio((c, d, p) => basico(externo, c, d, p), (c, d, p) => basico(vidros, c, d, p))
    const telhado = new T.Mesh(guardar(new T.ConeGeometry(.36, .26, 4)), mat)
    telhado.userData.cor = 0xA6584A
    telhado.rotation.y = Math.PI / 4
    telhado.position.set(4.8, .87, .78)
    externo.add(telhado)

    const personagens = (palco?.elenco ?? EQUIPE).map(m => {
      const sala = PLANTA[m.sala], x = sala.x + m.mesa, z = sala.z - (sala.fundo === 4 ? 1.4 : 1.67)
      const emPe = !!ATIVIDADES_MINI[m.id]?.emPe
      montarMesa((c, d, p) => basico(externo, c, d, [x + p[0], p[1], z + p[2]]), !emPe)
      const sombra = new T.Mesh(circulo, mancha)
      sombra.position.set(x, .046, z + .29)
      sombra.scale.set(.73, .69, 1)
      sombra.rotation.x = -Math.PI / 2
      manchas.add(sombra)
      const posto = new T.Group()
      posto.position.set(x, 0, z)
      movel.add(posto)
      const b = personagemIsometrico(T, basico, m.roupa)
      posto.add(b.raiz)
      if (palco) b.cabeca.scale.setScalar(1.14)
      const cores = new Map<number, any>()
      // Estes postos trabalham diante de uma tela. Os demais conservam os objetos de ofício.
      const digital = !!palco && ['contador', 'cartao', 'assistente', 'analista'].includes(m.id)
      const atividade = digital ? montarEstacaoDigital(posto) : montarAtividade(m.id, { T, pai: posto, geo: cubo, guardar, mat(c) {
        if (!cores.has(c)) cores.set(c, guardar(new T.MeshLambertMaterial({ color: c })))
        return cores.get(c)
      } })
      return { m, b, atividade, emPe, x, z, fase: faseDoId(m.id) }
    })

    function montarEstacaoDigital(posto: any) {
      basico(posto, 0x555751, [.7, .41, .065], [0, .98, .83])
      basico(posto, 0xD9DBCE, [.61, .33, .012], [0, .98, .791])
      basico(posto, 0x555751, [.08, .22, .08], [0, .74, .83])
      basico(posto, 0x555751, [.48, .032, .19], [0, .647, .49])
      const cursor = basico(posto, 0x555751, [.18, .036, .014], [-.15, 1.06, .78])
      return {
        animar(t: number) { cursor.position.y = 1.06 - Math.floor(t * 2 % 4) * .055 },
        pose(t: number) {
          return {
            cx: .23 + Math.sin(t * 1.6) * .12, cy: -.08 + Math.sin(t * 1.3) * .09,
            lx: -.81, rx: -.81, lz: .16, rz: -.16,
            le: -1.08 + Math.sin(t * 16) * .21, re: -1.08 - Math.sin(t * 16) * .21,
          }
        },
      }
    }

    // As peças do rig e das atividades preservam as articulações, mas só os lotes chegam à GPU.
    function instanciar(raiz: any, material: any, sombra: boolean, pintar = true) {
      const lotes = new Map<any, any[]>()
      raiz.traverse((obj: any) => {
        if (!obj.isMesh) return
        const grupo = lotes.get(obj.geometry)
        if (grupo) grupo.push(obj)
        else lotes.set(obj.geometry, [obj])
      })
      const malhas = [...lotes].map(([geo, pecas]) => {
        const quantidade = pecas.reduce((n, p) => n + (p.isInstancedMesh ? p.count : 1), 0)
        const lote = guardar(new T.InstancedMesh(geo, material, quantidade))
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
            const n = p.isInstancedMesh ? p.count : 1
            for (let j = 0; j < n; j++, i++) {
              matriz.copy(p.matrixWorld)
              if (p.isInstancedMesh) {
                p.getMatrixAt(j, local)
                matriz.multiply(local)
              }
              lote.setMatrixAt(i, matriz)
              if (primeiro && pintar) lote.setColorAt(i, p.userData.cor === undefined ? p.material.color : cor.setHex(p.userData.cor))
            }
          }
          lote.instanceMatrix.needsUpdate = true
        }
      }
    }
    instanciar(externo, mat, true)(true)
    instanciar(vidros, janela, false, false)(true)
    instanciar(manchas, mancha, false, false)(true)
    const atualizarInstancias = instanciar(movel, mat, true)
    atualizarInstancias(true)

    scene.add(new T.HemisphereLight(0xFFF8EE, 0xBFAE92, 1.55))
    const sol = guardar(new T.DirectionalLight(0xFFF2DD, 2.1))
    sol.position.set(-6, 12, 8)
    sol.castShadow = true
    sol.shadow.mapSize.set(1024, 1024)
    Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 })
    sol.shadow.camera.updateProjectionMatrix()
    sol.shadow.normalBias = .025
    sol.shadow.bias = -.0006
    scene.add(sol, sol.target)
    renderer.shadowMap.enabled = palco?.variante !== 'compacta'
    renderer.shadowMap.type = T.PCFSoftShadowMap
    renderer.info.autoReset = false
    renderer.setClearColor(0, 0)
    canvas.className = 'iso-canvas'
    el.prepend(canvas)

    const cam = new T.OrthographicCamera(-10, 10, 10, -10, .1, 100)
    cam.position.set(1, palco ? 1.04 : .86, palco ? 1.12 : 1).normalize().multiplyScalar(40)
    cam.lookAt(0, 0, 0)
    cam.updateMatrixWorld(true)
    const ponto = new T.Vector3()
    function enquadrar(...volumes: [number, number, number, number, number][]) {
      let left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity
      for (const [x0, x1, z0, z1, teto] of volumes) {
        for (const x of [x0, x1]) for (const y of [-.3, teto]) for (const z of [z0, z1]) {
          ponto.set(x, y, z).applyMatrix4(cam.matrixWorldInverse)
          left = Math.min(left, ponto.x)
          right = Math.max(right, ponto.x)
          bottom = Math.min(bottom, ponto.y)
          top = Math.max(top, ponto.y)
        }
      }
      return { x: (left + right) / 2, y: (bottom + top) / 2, w: (right - left) / 2, h: (top - bottom) / 2 }
    }
    const geral = palco
      ? enquadrar([-6.15, 6.15, -10.2, 5.1, 1.3], [-6.15, 6.15, -10.15, -10, 2.12], [-3.2, 3.2, 5.1, 9.28, 1.65])
      : enquadrar([-6.5, 6.5, -10.5, 5.5, 1.8], [-6.25, 6.25, -10.22, -10, 2.2], [-3.5, 3.5, 5.1, 9.5, 1.8])
    const salas = Object.fromEntries(SALAS_ISOMETRICAS.map(k => {
      const { x, z, fundo } = PLANTA[k]
      return [k, enquadrar([x - 3, x + 3, z - fundo / 2, z + fundo / 2, palco ? 1.85 : 2.2])]
    }))
    const alvo = () => vista === 'tudo' ? geral : salas[vista]
    let atual = { ...alvo() }, passos = 0
    function camera() {
      const destino = alvo()
      const curva = movimento.matches || passos >= 20 ? 1 : .22
      atual = {
        x: atual.x + (destino.x - atual.x) * curva,
        y: atual.y + (destino.y - atual.y) * curva,
        w: atual.w + (destino.w - atual.w) * curva,
        h: atual.h + (destino.h - atual.h) * curva,
      }
      const a = largura / altura
      const margem = palco ? (vista === 'tudo' ? 1 : 1.06) : (vista === 'tudo' ? 1.02 : 1.13)
      const w = Math.max(atual.w, atual.h * a) * margem, h = w / a
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

    /** Como no painel original, pendências têm prioridade quando duas plaquinhas se cruzam. */
    function posicionarPessoas() {
      if (palco) {
        const postos: PostoProjetado[] = []
        for (const { m, b, x, z } of personagens) {
          if (vista !== 'tudo' && vista !== m.sala) continue
          ponto.set(x, b.quadril.position.y + 1.16, z + b.raiz.position.z).project(cam)
          postos.push({ id: m.id, x: (ponto.x + 1) * largura / 2, y: (1 - ponto.y) * altura / 2 - 11,
            chama: estados[m.id] === 'precisa_de_voce' })
        }
        palco.posicionar(postos, largura, altura)
        return
      }
      const compacto = opcoes.previa && window.innerWidth < 900
      const ocupadas: { esquerda: number; direita: number; topo: number; base: number }[] = []
      for (const prioridade of [true, false]) for (const { m, b, x, z } of personagens) {
        const alerta = estados[m.id] === 'precisa_de_voce'
        if (alerta !== prioridade || (vista !== 'tudo' && vista !== m.sala)) continue
        const no = opcoes.etiqueta(m.id)
        if (!no) continue
        ponto.set(x, b.quadril.position.y + 1.22, z + b.raiz.position.z).project(cam)
        const px = (ponto.x + 1) * largura / 2, py = (1 - ponto.y) * altura / 2
        const meia = (alerta ? (compacto ? 72 : Math.max(86, 22 + m.curto.length * 6)) : compacto ? 23 : 22 + m.curto.length * 6) / 2
        const acima = alerta ? (compacto ? 24 : 33) : 9
        const limitarX = (v: number) => Math.max(meia + 2, Math.min(largura - meia - 2, v))
        let left = limitarX(px), top = py
        for (const [dx, dy] of [[0, 0], [0, -14], [0, 14], [18, -10], [-18, -10], [18, 14], [-18, 14], [0, -27]]) {
          const x = limitarX(px + dx), y = py + dy
          const caixa = { esquerda: x - meia, direita: x + meia, topo: y - acima, base: y + 9 }
          if (caixa.topo < 1 || caixa.base > altura || ocupadas.some(o =>
            caixa.esquerda < o.direita && caixa.direita > o.esquerda && caixa.topo < o.base && caixa.base > o.topo)) continue
          ocupadas.push(caixa)
          left = x
          top = y
          break
        }
        no.style.left = `${left * 100 / largura}%`
        no.style.top = `${top * 100 / altura}%`
      }
    }

    function desenhar(reposicionar: boolean) {
      camera()
      for (const { m, b, atividade, emPe, fase } of personagens) {
        const estado = estados[m.id]
        const trabalha = estado === 'trabalhando'
        const chama = estado === 'precisa_de_voce'
        const t = movimento.matches ? 0 : tempo + fase
        const gesto = trabalha ? atividade.pose(t) : {}
        atividade.animar(trabalha && !leve ? t : 0)
        b.raiz.position.z = chama ? 2.25 : 0
        b.raiz.rotation.y = chama ? Math.PI / 4 : palco && trabalha ? 0 : .17
        b.quadril.position.y = emPe || chama ? .555 : .325
        for (const { coxa, joelho } of b.pernas) {
          coxa.rotation.x = emPe || chama ? 0 : -Math.PI / 2
          joelho.rotation.x = emPe || chama ? 0 : Math.PI / 2
        }
        b.cabeca.rotation.x = gesto.cx ?? (chama ? -.08 : .13)
        b.cabeca.rotation.y = gesto.cy ?? (movimento.matches ? 0 : Math.sin(t * .8) * .045)
        b.esquerda.ombro.rotation.x = gesto.lx ?? (chama ? (palco ? -2.55 : -1.75) : -.73)
        b.esquerda.ombro.rotation.z = gesto.lz ?? (chama ? -.32 : -.05)
        b.esquerda.cotovelo.rotation.x = gesto.le ?? (chama ? (palco ? -.45 : -.95) + Math.sin(t * 4) * .18 : -1.17)
        b.direita.ombro.rotation.x = gesto.rx ?? -.73
        b.direita.ombro.rotation.z = gesto.rz ?? .05
        b.direita.cotovelo.rotation.x = gesto.re ?? -1.17
      }
      if (reposicionar) {
        for (const k of SALAS_ISOMETRICAS) {
          if (vista !== 'tudo' && vista !== k) continue
          const { x, z, fundo } = PLANTA[k]
          posicionar(opcoes.placa(k), x - .3, .1, z + fundo / 2 - .68)
        }
        posicionarPessoas()
      }
      atualizarInstancias()
      renderer.info.reset()
      renderer.render(scene, cam)
      canvas.dataset.desenhos = String(renderer.info.render.calls)
      canvas.dataset.triangulos = String(renderer.info.render.triangles)
      canvas.dataset.leve = String(leve)
    }

    let primeiroQuadro = true
    const ativo = () => !parado && naTela && !document.hidden && largura > 0 && altura > 0
    function agendar() {
      if (frame === null && ativo() && (precisaRedesenhar || !movimento.matches || passos <= 20)) frame = requestAnimationFrame(tick)
    }
    function tick(agora: number) {
      frame = null
      if (!ativo()) return
      const ms = ultimo ? agora - ultimo : 0
      if (!leve && ms > 0 && !movimento.matches) {
        somaFrames++
        somaTempos += ms
        if (somaTempos >= 1800) {
          if (somaFrames * 1000 / somaTempos < 25) {
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
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, leve ? 1 : 1.5))
        renderer.setSize(largura, altura, false)
      }
      precisaRedesenhar = true
      agendar()
    }
    const suspender = () => {
      ultimo = somaFrames = somaTempos = 0
      cancelar()
      if (ativo()) { precisaRedesenhar = true; agendar() }
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
    const raio = new T.Raycaster(), cursor = new T.Vector2(), volume = new T.Box3()
    const acertar = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      cursor.set(2 * (e.clientX - r.left) / r.width - 1, 1 - 2 * (e.clientY - r.top) / r.height)
      raio.setFromCamera(cursor, cam)
      let menor = Infinity
      let id: string | undefined
      for (const { m, b, x, z } of personagens) {
        if ((vista !== 'tudo' && vista !== m.sala) || (!palco && !opcoes.etiqueta(m.id))) continue
        const centro = z + b.raiz.position.z
        volume.min.set(x - .37, .1, centro - .28)
        volume.max.set(x + .37, b.quadril.position.y + 1.12, centro + .38)
        if (!raio.ray.intersectBox(volume, ponto)) continue
        const d = ponto.distanceToSquared(raio.ray.origin)
        if (d < menor) { menor = d; id = m.id }
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
    passos = 21
    tamanho()
    return {
      atualizar(proximos: EstadosIsometricos, proxima: VistaIsometrica) {
        estados = proximos
        if (vista !== proxima) { vista = proxima; passos = 0 }
        precisaRedesenhar = true
        agendar()
      },
      destruir,
    }
  }
}
