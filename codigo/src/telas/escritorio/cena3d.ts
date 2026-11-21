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

import type { Cena, OpcoesCena, EstadoAgente } from './cenaBase'
import { MedidorFPS } from './cenaBase'
import { POR_ID } from './equipe'
import {
  caixaReal,
  composicaoMini,
  montarEscritorioMini,
  fundirGrupos,
  fundirRamo,
  enquadrarMini,
  criarApoioDasMaos,
  ESCALA_FUNCIONARIO_MINI,
} from './escritorioMini'
import type { SalaEquipe } from './equipe'
import { criarBoneco } from './cena/boneco'
import { criarCamera } from './cena/camera'
import { estadoLegado, estadoMini } from './cena/estados'
import { criarEtiquetas } from './cena/etiquetas'
import { aplicarLuzDaHora, criarLuzes } from './cena/luz'
import { lerp, moverNaCena, moverNoMini, mudarMini } from './cena/movimento'
import { montarPostos } from './cena/postos'
import { criarPecas } from './cena/pecas'
import { SALAS } from './cena/planta'
import { montarPredio } from './cena/predio'

export function montarCena(T: any, el: HTMLElement, o: OpcoesCena): Cena {
  const salaPedida = o.sala || POR_ID[o.funcionarios[0]?.id]?.sala || o.funcionarios[0]?.sala || 'recepcao'
  const salaMini = SALAS[salaPedida] ? salaPedida : 'recepcao'
  const composicao =
    o.mini && o.funcionarios.length
      ? composicaoMini(
          salaMini as SalaEquipe,
          o.funcionarios.map(f => f.id),
        )
      : null
  if (composicao)
    o = {
      ...o,
      funcionarios: composicao.ids.map(id => ({ ...o.funcionarios.find(f => f.id === id)!, sala: composicao.sala })),
    }
  const coletivo = !!composicao && composicao.ids.length > 1
  const limpezas: (() => void)[] = [],
    recursos = new Set<any>()
  let destruida = false
  const guardar = <V extends { dispose(): void }>(v: V): V => {
    recursos.add(v)
    return v
  }
  const destruir = () => {
    if (destruida) return
    destruida = true
    for (const limpar of limpezas.reverse()) {
      try {
        limpar()
      } catch {
        /* continuar */
      }
    }
    for (const r of recursos) {
      try {
        r.dispose()
      } catch {
        /* continuar */
      }
    }
    recursos.clear()
  }
  try {
    const movimento = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduz = !!o.parado || movimento.matches
    const MOBILE = o.celular
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    limpezas.push(() => {
      renderer.dispose()
      try {
        renderer.forceContextLoss()
      } catch {
        /* perdido */
      }
    })
    const prMax = MOBILE() ? 1.5 : 2,
      pr = Math.min(window.devicePixelRatio || 1, prMax)
    renderer.setPixelRatio(pr)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = T.PCFSoftShadowMap
    const tela3d: HTMLCanvasElement = renderer.domElement
    limpezas.push(() => tela3d.remove())
    tela3d.setAttribute('aria-hidden', 'true')
    el.insertBefore(tela3d, el.firstChild)
    const scene = new T.Scene()

    const { hemi, sol } = criarLuzes(T, scene, limpezas, MOBILE())

    const pecas = criarPecas(T, scene, guardar)
    const { mesclar, FIXO } = pecas
    const { salaG, lampadas, baseMat, vidro } = montarPredio(T, scene, guardar, pecas, o)

    const chars = montarPostos({ T, scene, guardar, pecas, salaG, composicao }, o)
    ;[0, 1].forEach(i => {
      if (FIXO[i].length) {
        const m = mesclar(FIXO[i])
        m.castShadow = i === 0
        scene.add(m)
      }
    })

    /* câmera isométrica */
    const { cam, VISTAS, DIR, miniCamera } = criarCamera(T, chars, !!o.mini, coletivo)
    let vAtual = { ...VISTAS[o.mini ? chars[0]?.sala || 'tudo' : 'tudo'] },
      vDe: any = null,
      vPara: any = null,
      vT0 = 0,
      camNome = o.mini ? chars[0]?.sala || 'tudo' : 'tudo'
    let zoom = 1
    function aplicaVista(v: any) {
      if (chars[0]?.limitesMini) {
        enquadrarMini(cam, el.clientWidth || 1, el.clientHeight || 1, chars[0].limitesMini, coletivo)
        return
      }
      const W = el.clientWidth || 1,
        H = el.clientHeight || 1,
        a = W / H,
        m = camNome === 'tudo' ? 1.04 : 1.12,
        hw = Math.max(v.hw * m, v.hh * m * a) / zoom,
        hh = hw / a
      cam.left = v.cx - hw
      cam.right = v.cx + hw
      cam.top = v.cy + hh
      cam.bottom = v.cy - hh
      cam.updateProjectionMatrix()
    }
    function irPara(nome: string) {
      if (!VISTAS[nome]) nome = 'tudo'
      camNome = nome
      vDe = { ...vAtual }
      vPara = VISTAS[nome]
      vT0 = performance.now()
      chars.forEach(c => {
        c.tk = ''
      })
    }
    let largura = 0,
      altura = 0,
      dpr = pr
    function tamanho() {
      const W = el.clientWidth,
        H = el.clientHeight
      if (!W || !H) return
      const novo = Math.min(window.devicePixelRatio || 1, degrau > 0 ? 1 : MOBILE() ? 1.5 : 2)
      if (novo !== dpr) {
        dpr = novo
        renderer.setPixelRatio(dpr)
      }
      if (W !== largura || H !== altura) {
        largura = W
        altura = H
        renderer.setSize(W, H, false)
        aplicaVista(vAtual)
      }
    }
    const redimensionar = () => {
      tamanho()
      solicitar()
    }
    window.addEventListener('resize', redimensionar)
    limpezas.push(() => window.removeEventListener('resize', redimensionar))
    const ro = 'ResizeObserver' in window ? new ResizeObserver(redimensionar) : null
    limpezas.push(() => ro?.disconnect())
    ro?.observe(el)

    /* etiquetas em HTML presas à cabeça de cada boneco e nome da sala no piso */
    const posicionarEtiquetas = criarEtiquetas(T, cam, el, o)
    let selecionado: string | null = null
    const atualizaTags = () => posicionarEtiquetas(chars, selecionado, camNome)

    /* toque num boneco */
    const ray = new T.Raycaster(),
      ndc = new T.Vector2()
    const ponteiro = { x: 0, y: 0, dentro: false }
    const acompanhar = (ev: PointerEvent) => {
      if (!o.mini || reduz) return
      const r = tela3d.getBoundingClientRect()
      ponteiro.x = Math.max(-1, Math.min(1, ((ev.clientX - r.left) / r.width) * 2 - 1))
      ponteiro.y = Math.max(-1, Math.min(1, ((ev.clientY - r.top) / r.height) * 2 - 1))
      ponteiro.dentro = true
    }
    const saiu = () => {
      ponteiro.dentro = false
    }
    if (o.mini) {
      tela3d.addEventListener('pointermove', acompanhar)
      tela3d.addEventListener('pointerleave', saiu)
      limpezas.push(() => {
        tela3d.removeEventListener('pointermove', acompanhar)
        tela3d.removeEventListener('pointerleave', saiu)
      })
    }
    let down: { x: number; y: number } | null = null
    const aoDescer = (ev: PointerEvent) => {
      down = { x: ev.clientX, y: ev.clientY }
    }
    const aoSubir = (ev: PointerEvent) => {
      if (!down || Math.abs(ev.clientX - down.x) + Math.abs(ev.clientY - down.y) > 10) return
      const r = tela3d.getBoundingClientRect()
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, cam)
      const hit = ray.intersectObjects(
        chars.map(c => c.b.r),
        true,
      )
      if (hit.length) o.aoTocar(hit[0].object.userData.id)
    }
    tela3d.addEventListener('pointerdown', aoDescer)
    tela3d.addEventListener('pointerup', aoSubir)
    limpezas.push(() => {
      tela3d.removeEventListener('pointerdown', aoDescer)
      tela3d.removeEventListener('pointerup', aoSubir)
    })

    /* sol, céu e lâmpadas pela hora */
    let escuro = o.escuro
    const luzDaHora = (h: number) => aplicarLuzDaHora(h, escuro, { sol, hemi, lampadas, vidro })
    function setTema(d: boolean) {
      escuro = d
      baseMat.color.setHex(d ? 0x2a2520 : 0xe2dacc)
      luzDaHora(o.hora())
    }
    setTema(escuro)

    /* movimento: ver cena/movimento.ts */
    const atualizaChar = (ch: any, t: number, dt: number) =>
      o.mini ? moverNoMini(ch, dt, { reduz, degrau, fps }, { DIR, ponteiro }) : moverNaCena(ch, t, dt, reduz)

    /* laço */
    let visivel = true,
      ult = 0,
      tAcum = 0,
      fps = 0,
      baixo = 0,
      degrau = 0,
      segAnim = 0,
      segLuz = 0,
      jsMs = 0,
      raf = 0,
      vivo = true
    const fpsHist: number[] = []
    const retornos = new Map<string, { timer?: ReturnType<typeof setTimeout>; restante: number; inicio: number }>()
    function sincronizarRetornos() {
      retornos.forEach((r, id) => {
        const pode = visivel && !document.hidden && !perdido
        if (!pode && r.timer !== undefined) {
          clearTimeout(r.timer)
          r.timer = undefined
          r.restante = Math.max(0, r.restante - (performance.now() - r.inicio))
        }
        if (pode && r.timer === undefined) {
          r.inicio = performance.now()
          r.timer = setTimeout(() => {
            retornos.delete(id)
            definirEstado(id, 'trabalhando')
          }, r.restante)
        }
      })
    }
    limpezas.push(() => {
      retornos.forEach(r => clearTimeout(r.timer))
      retornos.clear()
    })
    let perdido = false
    let recuperacao: ReturnType<typeof setTimeout> | undefined
    const medidor = new MedidorFPS()
    function pausar() {
      cancelAnimationFrame(raf)
      raf = 0
      ult = 0
      medidor.pausar()
      baixo = 0
    }
    function solicitar() {
      if (!vivo || destruida || perdido || !visivel || document.hidden || raf) return
      if (reduz) quadro(performance.now())
      else raf = requestAnimationFrame(quadro)
    }
    const mudouMovimento = () => {
      reduz = movimento.matches
      pausar()
      sincronizarRetornos()
      solicitar()
    }
    movimento.addEventListener('change', mudouMovimento)
    limpezas.push(() => movimento.removeEventListener('change', mudouMovimento))
    const visibilidade = () => {
      pausar()
      sincronizarRetornos()
      solicitar()
    }
    document.addEventListener('visibilitychange', visibilidade)
    const perdeu = (ev: Event) => {
      ev.preventDefault()
      perdido = true
      pausar()
      sincronizarRetornos()
      o.aoContexto?.('perdido')
      clearTimeout(recuperacao)
      recuperacao = setTimeout(() => {
        if (perdido && vivo) {
          o.aoContexto?.('falhou')
          destruir()
        }
      }, 8000)
    }
    const restaurou = () => {
      if (!vivo || destruida) return
      clearTimeout(recuperacao)
      perdido = false
      o.aoContexto?.('restaurado')
      tamanho()
      sincronizarRetornos()
      solicitar()
    }
    tela3d.addEventListener('webglcontextlost', perdeu)
    tela3d.addEventListener('webglcontextrestored', restaurou)
    limpezas.push(() => {
      vivo = false
      pausar()
      clearTimeout(recuperacao)
      document.removeEventListener('visibilitychange', visibilidade)
      tela3d.removeEventListener('webglcontextlost', perdeu)
      tela3d.removeEventListener('webglcontextrestored', restaurou)
    })
    const io =
      'IntersectionObserver' in window
        ? new IntersectionObserver(en => {
            visivel = en[0].isIntersecting
            visibilidade()
          })
        : null
    limpezas.push(() => io?.disconnect())
    io?.observe(el)
    function quadro(agora: number) {
      raf = 0
      if (!vivo || destruida || perdido || !visivel || document.hidden) {
        pausar()
        return
      }
      const agora0 = performance.now()
      const dt = ult ? Math.min(0.05, (agora - ult) / 1000) : 0
      ult = agora
      tAcum += dt
      tamanho()
      segLuz -= dt
      if (segLuz <= 0) {
        segLuz = 30
        luzDaHora(o.hora())
      }
      /* no celular, no máximo 8 bonecos animados ao mesmo tempo; no modo mais leve, 4 */
      segAnim -= dt
      if (segAnim <= 0) {
        segAnim = 1
        let lim = MOBILE() ? 8 : 99
        if (degrau >= 3) lim = 4
        const pr2 = (c: any) =>
          c.path ? 0 : c.st === 'precisa' ? 1 : c.id === selecionado ? 2 : c.st === 'trabalhando' ? 3 : 4
        chars
          .slice()
          .sort((a, b) => pr2(a) - pr2(b))
          .forEach((c, i) => {
            c.anim = i < lim || !!c.path
          })
      }
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i]
        if (reduz && !o.mini) {
          ch.path = null
          ch.loc = ch.st === 'precisa' ? 'frente' : 'sentado'
          ch.b.r.position.copy(ch.loc === 'frente' ? ch.F : ch.S)
          ch.b.r.rotation.y = ch.loc === 'frente' ? Math.PI / 4 : 0
        }
        atualizaChar(ch, tAcum, reduz ? 1 : dt)
      }
      if (vPara) {
        const k = reduz ? 1 : Math.min(1, (agora - vT0) / 1200),
          e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
        ;['cx', 'cy', 'hw', 'hh'].forEach(n => {
          vAtual[n] = lerp(vDe[n], vPara[n], e)
        })
        aplicaVista(vAtual)
        if (k >= 1) vPara = null
      }
      try {
        renderer.render(scene, cam)
      } catch {
        o.aoContexto?.('falhou')
        destruir()
        return
      }
      atualizaTags()
      jsMs = jsMs * 0.95 + (performance.now() - agora0) * 0.05
      /* fluidez: mede 1 vez por segundo e alivia em 3 degraus se ficar abaixo de 24 imagens por segundo */
      const amostra = reduz ? null : medidor.quadro(agora)
      if (amostra !== null) {
        fps = amostra
        fpsHist.push(fps)
        if (fpsHist.length > 60) fpsHist.shift()
        if (fps < 24) {
          baixo++
          if (baixo >= 4 && degrau < 3) {
            degrau++
            baixo = 0
            if (degrau === 1) {
              tamanho()
            }
            if (degrau === 2) {
              renderer.shadowMap.enabled = false
              sol.castShadow = false
              sol.shadow.dispose()
              sol.shadow.map = null
              sol.shadow.mapPass = null
              scene.traverse((x: any) => {
                if (x.material) x.material.needsUpdate = true
              })
            }
          }
        } else baixo = 0
        o.aoMedir?.(fps, degrau)
      }
      if (!reduz) solicitar()
    }
    let consultaDpr: MediaQueryList | undefined
    const mudouDpr = () => {
      observarDpr()
      redimensionar()
    }
    function observarDpr() {
      consultaDpr?.removeEventListener('change', mudouDpr)
      consultaDpr = window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)')
      consultaDpr.addEventListener('change', mudouDpr)
    }
    limpezas.push(() => consultaDpr?.removeEventListener('change', mudouDpr))
    observarDpr()
    tamanho()
    solicitar()

    if (o.mini && chars.length) {
      const controller = new AbortController()
      limpezas.push(() => controller.abort())
      void import('./modelosEscritorio')
        .then(async ({ modelosEscritorio }) => {
          if (destruida) return
          const { nomesDaSala } = await import('./escritorioMini')
          if (destruida) return
          const modelos = await modelosEscritorio.adquirir(nomesDaSala(chars[0].sala), controller.signal).pronto
          if (!modelos || destruida) return
          const escritorio = montarEscritorioMini(
            chars[0].sala,
            modelos,
            POR_ID[chars[0].id]?.roupa.camisa || 0x6474a0,
            criarBoneco(T, pecas, true),
            composicao!,
          )
          if (destruida) {
            escritorio.destruir()
            return
          }
          limpezas.push(escritorio.destruir)
          // Medidas sem alterar os pivôs; rollback conserva o fallback se a fusão falhar.
          const preparados: any[] = []
          try {
            for (const ch of chars) {
              const indice = chars.indexOf(ch),
                posto = composicao!.postos[indice],
                dados = escritorio.postos[indice]
              const objeto = ch.trabalho.raiz,
                medido = caixaReal(objeto.clone(true)),
                centro = medido.getCenter(new T.Vector3())
              const escala = ch.sala === 'caixa' ? 0.42 : 0.52
              preparados.push({
                ch,
                objeto,
                escala,
                posicao: new T.Vector3(
                  (ch.id === 'imoveis' ? 0.04 : ch.sala === 'caixa' ? -0.18 : -0.28) - centro.x * escala,
                  dados.tampo - medido.min.y * escala,
                  (ch.id === 'imoveis' ? 0.43 : 0.53) - centro.z * escala,
                ),
                posto,
                dados,
              })
            }
          } catch {
            escritorio.destruir()
            return
          }
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
          try {
            // Uma única sala/lease para o elenco; cada posto conserva coordenadas locais para o IK.
            const objetos = [...scene.children].filter(
              x => !x.isLight && x !== sol.target && !chars.some(ch => x === ch.b.r || x === ch.palco),
            )
            const origem = coletivo
              ? new T.Vector3(SALAS[chars[0].sala].cx, 0, SALAS[chars[0].sala].cz - 1.72)
              : chars[0].S
            escritorio.raiz.position.copy(origem)
            scene.add(escritorio.raiz)
            const limites = caixaReal(escritorio.raiz)
            for (const { ch, objeto, escala, posicao, posto, dados } of preparados) {
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
              atualizaChar(ch, 0, 0)
              if (coletivo) {
                // Pernas sentadas são rígidas; cabelo e olhos se juntam à cabeça móvel.
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
              limites.union(caixaReal(ch.b.r)).union(caixaReal(ch.palco))
              limites.max.y = Math.max(
                limites.max.y,
                ch.S.y + (dados.assento + 1.24 * ESCALA_FUNCIONARIO_MINI) * posto.escala,
              )
            }
            if (!coletivo) {
              DIR.y *= 0.3
              DIR.normalize()
            }
            cam.position.copy(DIR).multiplyScalar(40)
            cam.lookAt(0, 0, 0)
            cam.updateMatrixWorld(true)
            chars[0].limitesMini = limites
            vPara = null
            aplicaVista(vAtual)
            objetos.forEach(x => {
              x.visible = false
            })
            solicitar()
          } catch (erro) {
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
            cam.position.copy(DIR).multiplyScalar(40)
            cam.lookAt(0, 0, 0)
            cam.updateMatrixWorld(true)
            aplicaVista(vAtual)
            throw erro
          }
        })
        .catch(() => {
          controller.abort() /* fallback em falha de carga */
        })
    }

    // Sem loop com movimento reduzido; apenas a celebração tem um retorno pontual.
    function definirEstado(id: string, estado: EstadoAgente) {
      if (destruida) return
      const ch = chars.find(c => c.id === id)
      if (!ch) return
      if (o.mini && ch.estado === estado) return
      clearTimeout(retornos.get(id)?.timer)
      retornos.delete(id)
      if (o.mini) mudarMini(ch, estado)
      else {
        ch.st = estadoLegado(estado)
        ch.tempoEstado = 0
        ch.retornaTrabalho = estado === 'resolvido'
        if (ch.retornaTrabalho) ch.festa = 1.6
      }
      if (reduz && estado === 'resolvido') {
        retornos.set(id, { restante: 1600, inicio: 0 })
        sincronizarRetornos()
      }
      solicitar()
    }
    // Também cobre a montagem já em entregue.
    if (o.mini && reduz)
      chars
        .filter(ch => ch.estado === 'resolvido')
        .forEach(ch => {
          retornos.set(ch.id, { restante: 1600, inicio: 0 })
          sincronizarRetornos()
        })

    return {
      definirEstado,
      atualizar(f) {
        f.forEach(n => {
          const ch = chars.find(c => c.id === n.id)
          if (!ch) return
          if (o.mini) {
            // Um snapshot repetido de entregue não reinicia a celebração após seu retorno.
            if (ch.legadoRecebido !== n.estado) {
              ch.legadoRecebido = n.estado
              definirEstado(n.id, estadoMini(n.estado))
            }
            return
          }
          if (ch.st === n.estado) return
          ch.retornaTrabalho = false
          clearTimeout(retornos.get(n.id)?.timer)
          retornos.delete(n.id)
          if (n.estado === 'entregue' && ch.st === 'precisa') ch.festa = 0
          if (n.estado === 'entregue' && ch.st === 'trabalhando') ch.festa = 1.6
          ch.st = n.estado
        })
        if (!o.mini) solicitar()
      },
      selecionar(id) {
        solicitar()
        selecionado = id
        if (id && MOBILE()) {
          const ch = chars.find(c => c.id === id)
          if (ch) irPara(ch.sala)
        }
        chars.forEach(c => {
          c.tk = ''
        })
      },
      irPara(v) {
        irPara(v)
        solicitar()
      },
      tema(d) {
        setTema(d)
        solicitar()
      },
      aproximar: (fator: number) => {
        zoom = Math.min(3, Math.max(1, +(zoom * fator).toFixed(3)))
        aplicaVista(vAtual)
        chars.forEach(c => {
          c.tk = ''
        })
        solicitar()
        return zoom
      },
      medir: () => ({
        fps,
        degrau,
        hist: fpsHist.slice(),
        ms: +jsMs.toFixed(2),
        desenhos: renderer.info.render.calls,
        triangulos: renderer.info.render.triangles,
      }),
      destruir,
    }
  } catch (erro) {
    destruir()
    throw erro
  }
}
