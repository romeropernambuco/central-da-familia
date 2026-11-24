/* eslint-disable @typescript-eslint/no-explicit-any */
// A sala viva do palco do Meu orçamento (3ª versão). Usa o motor do Escritório: luz, peças, etiquetas e toque.
// Não importa o Three.js inteiro: recebe as peças prontas (escritorio/tres.ts), buscadas só quando o palco aparece.
// O laço de desenho para quando a cena sai da tela ou a aba fica oculta; com "reduzir movimento" desenha sob pedido.
import type { CenaDoPalco, OpcoesDaCenaDoPalco } from '../../../componentes/EquipeDoOrcamento'
import { criarEtiquetas } from '../../escritorio/cena/etiquetas'
import { aplicarLuzDaHora, criarLuzes } from '../../escritorio/cena/luz'
import { criarPecas } from '../../escritorio/cena/pecas'
import { ligarToque } from '../../escritorio/cena/toque'
import { avancarRotina } from './rotina'
import { montarSala, SALA } from './sala'

export { MODELOS_DA_SALA } from './sala'

/** De onde a câmera olha: mais de frente que a do Escritório, para a sala caber larga no palco. */
const DIRECAO = [0.42, 0.56, 1]

/** Câmera sem perspectiva, enquadrando o piso, as duas paredes e a cabeça de quem está na frente. */
function criarCamera(T: any, el: HTMLElement) {
  const cam = new T.OrthographicCamera(-5, 5, 5, -5, 0.1, 100)
  cam.position.set(DIRECAO[0], DIRECAO[1], DIRECAO[2]).normalize().multiplyScalar(40)
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld(true)
  const { x, z, parede } = SALA
  const pontos = [
    [-x, 0, -z],
    [x, 0, -z],
    [-x, 0, z],
    [x, 0, z],
    [-x, parede + 0.1, -z],
    [x, parede + 0.1, -z],
    [-x, parede + 0.1, z],
    [x, 1.7, z],
    [x + 0.1, -0.3, z + 0.1],
    [-x - 0.2, -0.3, z + 0.1],
  ]
  const v = new T.Vector3()
  const lim = [1e9, -1e9, 1e9, -1e9]
  for (const p of pontos) {
    v.set(p[0], p[1], p[2]).applyMatrix4(cam.matrixWorldInverse)
    lim[0] = Math.min(lim[0], v.x)
    lim[1] = Math.max(lim[1], v.x)
    lim[2] = Math.min(lim[2], v.y)
    lim[3] = Math.max(lim[3], v.y)
  }
  function enquadrar() {
    const aspecto = (el.clientWidth || 1) / (el.clientHeight || 1),
      hh = Math.max((lim[3] - lim[2]) / 2, (lim[1] - lim[0]) / 2 / aspecto) * 1.03,
      cxm = (lim[0] + lim[1]) / 2,
      cym = (lim[2] + lim[3]) / 2
    cam.left = cxm - hh * aspecto
    cam.right = cxm + hh * aspecto
    cam.top = cym + hh
    cam.bottom = cym - hh
    cam.updateProjectionMatrix()
  }
  return { cam, enquadrar }
}

/** O anel no chão que marca quem está falando. A cor é a de destaque do app. */
function criarAnel(T: any, scene: any, guardar: <V extends { dispose(): void }>(v: V) => V, el: HTMLElement) {
  const material = guardar(new T.MeshBasicMaterial({ color: 0x3f5a36 }))
  const anel = new T.Mesh(guardar(new T.RingGeometry(0.4, 0.52, 32)), material)
  anel.rotation.x = -Math.PI / 2
  anel.position.y = 0.075
  anel.renderOrder = 2
  scene.add(anel)
  return {
    anel,
    pintar() {
      try {
        const cor = getComputedStyle(el).getPropertyValue('--accent').trim()
        if (/^#[0-9a-f]{6}$/i.test(cor)) material.color.set(cor)
      } catch {
        /* sem a cor do tema, fica o verde padrão */
      }
    },
  }
}

/** Guarda o que precisa ser liberado e desfaz tudo de uma vez, na ordem inversa da montagem. */
function criarDescarte() {
  const limpezas: (() => void)[] = [],
    recursos = new Set<{ dispose(): void }>()
  const estado = { destruida: false }
  const guardar = <V extends { dispose(): void }>(v: V): V => {
    recursos.add(v)
    return v
  }
  function destruir() {
    if (estado.destruida) return
    estado.destruida = true
    for (const limpar of limpezas.reverse()) {
      try {
        limpar()
      } catch {
        /* segue desmontando o resto */
      }
    }
    recursos.forEach(r => r.dispose())
    recursos.clear()
  }
  return { limpezas, estado, guardar, destruir }
}

/** O desenhador: leve (no máximo 1,5 de densidade de pixels) e com a sombra do Escritório. */
function criarDesenhador(T: any, el: HTMLElement, limpezas: (() => void)[]) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  limpezas.push(() => {
    renderer.dispose()
    try {
      renderer.forceContextLoss()
    } catch {
      /* contexto já perdido */
    }
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFSoftShadowMap
  const tela3d: HTMLCanvasElement = renderer.domElement
  tela3d.setAttribute('aria-hidden', 'true')
  el.insertBefore(tela3d, el.firstChild)
  limpezas.push(() => tela3d.remove())
  return { renderer, tela3d }
}

/**
 * O laço de desenho. Só roda com a cena na tela e a aba à vista; com "reduzir movimento" não há laço:
 * `solicitar` desenha um quadro e para.
 */
function criarLaco(
  el: HTMLElement,
  tela3d: HTMLCanvasElement,
  limpezas: (() => void)[],
  viva: () => boolean,
  desenhar: (dt: number, reduz: boolean) => void,
  aoPerder: () => void,
) {
  const movimento = window.matchMedia('(prefers-reduced-motion: reduce)')
  let reduz = movimento.matches,
    visivel = true,
    raf = 0,
    ult = 0
  const parada = () => !viva() || !visivel || document.hidden
  function pausar() {
    cancelAnimationFrame(raf)
    raf = 0
    ult = 0
  }
  function quadro(agora: number) {
    raf = 0
    if (parada()) return pausar()
    const dt = ult ? Math.min(0.05, (agora - ult) / 1000) : 0
    ult = agora
    desenhar(dt, reduz)
    if (!reduz) solicitar()
  }
  function solicitar() {
    if (parada() || raf) return
    if (reduz) quadro(performance.now())
    else raf = requestAnimationFrame(quadro)
  }
  const retomar = () => {
    pausar()
    solicitar()
  }
  const mudouMovimento = () => {
    reduz = movimento.matches
    retomar()
  }
  const perdeu = (ev: Event) => {
    ev.preventDefault()
    aoPerder()
  }
  movimento.addEventListener('change', mudouMovimento)
  document.addEventListener('visibilitychange', retomar)
  window.addEventListener('resize', retomar)
  tela3d.addEventListener('webglcontextlost', perdeu)
  const io =
    'IntersectionObserver' in window
      ? new IntersectionObserver(en => {
          visivel = en[en.length - 1].isIntersecting
          retomar()
        })
      : null
  io?.observe(el)
  const ro = 'ResizeObserver' in window ? new ResizeObserver(retomar) : null
  ro?.observe(el)
  limpezas.push(() => {
    pausar()
    io?.disconnect()
    ro?.disconnect()
    movimento.removeEventListener('change', mudouMovimento)
    document.removeEventListener('visibilitychange', retomar)
    window.removeEventListener('resize', retomar)
    tela3d.removeEventListener('webglcontextlost', perdeu)
  })
  return { solicitar, semMovimento: () => reduz }
}

/**
 * Monta a sala dentro de `el`. `modelos` são os móveis já carregados (ver MODELOS_DA_SALA).
 * Devolve como avisar quem é o ativo, trocar o tema e desmontar tudo.
 */
export function montarCenaOrcamento(
  T: any,
  el: HTMLElement,
  modelos: Record<string, any>,
  o: OpcoesDaCenaDoPalco,
): CenaDoPalco {
  const { limpezas, estado, guardar, destruir } = criarDescarte()
  try {
    const { renderer, tela3d } = criarDesenhador(T, el, limpezas)
    const scene = new T.Scene()
    const { hemi, sol } = criarLuzes(T, scene, limpezas, true)
    const pecas = criarPecas(T, scene, guardar)
    const { chars, baseMat, vidro, animarObjetos } = montarSala({ T, scene, guardar, pecas, modelos })
    ;[0, 1].forEach(i => {
      if (!pecas.FIXO[i].length) return
      const m = pecas.mesclar(pecas.FIXO[i])
      m.castShadow = i === 0
      scene.add(m)
    })
    const { cam, enquadrar } = criarCamera(T, el)
    const { anel, pintar } = criarAnel(T, scene, guardar, el)
    const posicionarEtiquetas = criarEtiquetas(T, cam, el, { etiqueta: o.etiqueta, placa: () => null })

    let ativo = o.ativo
    const marcarAtivo = () =>
      chars.forEach(ch => {
        ch.st = ch.id === ativo ? 'precisa' : 'trabalhando' // a etiqueta do ativo tem a vez
      })
    marcarAtivo()

    let largura = 0,
      altura = 0,
      tempo = 0
    function tamanho() {
      const W = el.clientWidth,
        H = el.clientHeight
      if (!W || !H || (W === largura && H === altura)) return
      largura = W
      altura = H
      renderer.setSize(W, H, false)
      enquadrar()
      chars.forEach(ch => {
        ch.tk = ''
      })
    }
    const falhar = () => {
      destruir()
      o.aoFalhar()
    }
    function desenhar(dt: number, reduz: boolean) {
      tempo += dt
      tamanho()
      for (const ch of chars) avancarRotina(ch, tempo, dt, reduz)
      animarObjetos(tempo, reduz)
      const quem = chars.find(ch => ch.id === ativo)
      anel.visible = !!quem
      if (quem) anel.position.set(quem.b.r.position.x, 0.075, quem.b.r.position.z)
      try {
        renderer.render(scene, cam)
      } catch {
        falhar()
        return
      }
      posicionarEtiquetas(chars, ativo, 'tudo')
    }
    const laco = criarLaco(el, tela3d, limpezas, () => !estado.destruida, desenhar, falhar)
    ligarToque(T, tela3d, cam, chars, { aoTocar: o.aoTocar }, limpezas, laco.semMovimento)
    function tema(escuro: boolean) {
      baseMat.color.setHex(escuro ? 0x2a2520 : 0xe2dacc)
      aplicarLuzDaHora(12, escuro, { sol, hemi, lampadas: [], vidro })
      pintar()
      laco.solicitar()
    }
    tema(o.escuro)

    return {
      ativar(id) {
        if (estado.destruida) return
        ativo = id
        marcarAtivo()
        const ch = chars.find(c => c.id === id)
        if (ch && !laco.semMovimento()) ch.pedido = true
        laco.solicitar()
      },
      tema,
      destruir,
    }
  } catch (erro) {
    destruir()
    throw erro
  }
}
