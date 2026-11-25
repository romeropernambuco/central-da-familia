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

import type { Cena, OpcoesCena, EstadoAgente } from '../../lib/escritorio/cenaBase'
import { POR_ID } from '../../lib/escritorio/equipe'
import { composicaoMini } from './escritorioMini'
import type { SalaEquipe } from '../../lib/escritorio/equipe'
import { criarCamera } from './cena/camera'
import { estadoLegado, estadoMini } from './cena/estados'
import { criarEtiquetas } from './cena/etiquetas'
import { criarFluidez } from './cena/fluidez'
import { aplicarLuzDaHora, criarLuzes, desligarSombras } from './cena/luz'
import { carregarEscritorioMini } from './cena/miniEscritorio'
import { escolherAnimados, fixarSemMovimento, moverNaCena, moverNoMini, mudarMini } from './cena/movimento'
import { montarPostos } from './cena/postos'
import { criarPecas } from './cena/pecas'
import { SALAS } from './cena/planta'
import { montarPredio } from './cena/predio'
import { criarRetornos } from './cena/retornos'
import { ligarToque } from './cena/toque'
import { criarVista } from './cena/vista'

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

    /* câmera isométrica: o enquadramento vivo está em cena/vista.ts */
    const { cam, VISTAS, DIR, miniCamera } = criarCamera(T, chars, !!o.mini, coletivo)
    const vista = criarVista(cam, el, VISTAS, chars, !!o.mini, coletivo)
    /* fluidez: alivia em 3 degraus se a cena ficar lenta (ver cena/fluidez.ts) */
    const fluidez = criarFluidez(degrau => {
      if (degrau === 1) tamanho()
      if (degrau === 2) desligarSombras(renderer, sol, scene)
    }, o.aoMedir)
    let largura = 0,
      altura = 0,
      dpr = pr
    function tamanho() {
      const W = el.clientWidth,
        H = el.clientHeight
      if (!W || !H) return
      const novo = Math.min(window.devicePixelRatio || 1, fluidez.degrau > 0 ? 1 : MOBILE() ? 1.5 : 2)
      if (novo !== dpr) {
        dpr = novo
        renderer.setPixelRatio(dpr)
      }
      if (W !== largura || H !== altura) {
        largura = W
        altura = H
        renderer.setSize(W, H, false)
        vista.aplicar()
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
    const posicionarEtiquetas = criarEtiquetas(T, cam, el, { ...o, rostos: !o.mini })
    let selecionado: string | null = null

    /* toque num boneco */
    const ponteiro = ligarToque(T, tela3d, cam, chars, o, limpezas, () => reduz)

    /* sol, céu e lâmpadas pela hora */
    let escuro = o.escuro
    let horaFixa: number | null = null
    const horaDaCena = () => horaFixa ?? o.hora()
    const luzDaHora = (h: number) => aplicarLuzDaHora(h, escuro, { sol, hemi, lampadas, vidro })
    function setTema(d: boolean) {
      escuro = d
      baseMat.color.setHex(d ? 0x2a2520 : 0xe2dacc)
      luzDaHora(horaDaCena())
    }
    setTema(escuro)

    /* movimento: ver cena/movimento.ts */
    const atualizaChar = (ch: any, t: number, dt: number) =>
      o.mini
        ? moverNoMini(ch, dt, { reduz, degrau: fluidez.degrau, fps: fluidez.fps }, { DIR, ponteiro })
        : moverNaCena(ch, t, dt, reduz)

    /* laço de desenho */
    let visivel = true,
      ult = 0,
      tAcum = 0,
      segAnim = 0,
      segLuz = 0,
      jsMs = 0,
      raf = 0,
      vivo = true
    let perdido = false
    let recuperacao: ReturnType<typeof setTimeout> | undefined
    const retornos = criarRetornos(
      () => visivel && !document.hidden && !perdido,
      id => definirEstado(id, 'trabalhando'),
    )
    limpezas.push(retornos.limpar)
    function pausar() {
      cancelAnimationFrame(raf)
      raf = 0
      ult = 0
      fluidez.pausar()
    }
    function solicitar() {
      if (!vivo || destruida || perdido || !visivel || document.hidden || raf) return
      if (reduz) quadro(performance.now())
      else raf = requestAnimationFrame(quadro)
    }
    /** Para, acerta os temporizadores e recomeça: usado quando muda a visibilidade ou a preferência de movimento. */
    const retomar = () => {
      pausar()
      retornos.sincronizar()
      solicitar()
    }
    const mudouMovimento = () => {
      reduz = movimento.matches
      retomar()
    }
    movimento.addEventListener('change', mudouMovimento)
    limpezas.push(() => movimento.removeEventListener('change', mudouMovimento))
    document.addEventListener('visibilitychange', retomar)
    const perdeu = (ev: Event) => {
      ev.preventDefault()
      perdido = true
      pausar()
      retornos.sincronizar()
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
      retornos.sincronizar()
      solicitar()
    }
    tela3d.addEventListener('webglcontextlost', perdeu)
    tela3d.addEventListener('webglcontextrestored', restaurou)
    limpezas.push(() => {
      vivo = false
      pausar()
      clearTimeout(recuperacao)
      document.removeEventListener('visibilitychange', retomar)
      tela3d.removeEventListener('webglcontextlost', perdeu)
      tela3d.removeEventListener('webglcontextrestored', restaurou)
    })
    const io =
      'IntersectionObserver' in window
        ? new IntersectionObserver(en => {
            visivel = en[0].isIntersecting
            retomar()
          })
        : null
    limpezas.push(() => io?.disconnect())
    io?.observe(el)
    function animar(dt: number) {
      /* no celular, no máximo 8 bonecos animados ao mesmo tempo; no modo mais leve, 4 */
      segAnim -= dt
      if (segAnim <= 0) {
        segAnim = 1
        escolherAnimados(chars, fluidez.degrau >= 3 ? 4 : MOBILE() ? 8 : 99, selecionado)
      }
      for (const ch of chars) {
        if (reduz && !o.mini) fixarSemMovimento(ch)
        atualizaChar(ch, tAcum, reduz ? 1 : dt)
      }
    }
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
        luzDaHora(horaDaCena())
      }
      animar(dt)
      vista.avancar(agora, reduz)
      try {
        renderer.render(scene, cam)
      } catch {
        o.aoContexto?.('falhou')
        destruir()
        return
      }
      posicionarEtiquetas(chars, selecionado, vista.nome)
      jsMs = jsMs * 0.95 + (performance.now() - agora0) * 0.05
      if (reduz) return
      fluidez.quadro(agora)
      solicitar()
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

    if (o.mini && chars.length)
      carregarEscritorioMini({
        T,
        scene,
        sol,
        cam,
        chars,
        pecas,
        guardar,
        limpezas,
        composicao: composicao!,
        coletivo,
        DIR,
        miniCamera,
        vista,
        destruida: () => destruida,
        posar: ch => atualizaChar(ch, 0, 0),
        solicitar,
      })

    // Sem loop com movimento reduzido; apenas a celebração tem um retorno pontual.
    function definirEstado(id: string, estado: EstadoAgente) {
      if (destruida) return
      const ch = chars.find(c => c.id === id)
      if (!ch) return
      if (o.mini && ch.estado === estado) return
      retornos.cancelar(id)
      if (o.mini) mudarMini(ch, estado)
      else {
        ch.st = estadoLegado(estado)
        ch.tempoEstado = 0
        ch.retornaTrabalho = estado === 'resolvido'
        if (ch.retornaTrabalho) ch.festa = 1.6
      }
      if (reduz && estado === 'resolvido') retornos.agendar(id)
      solicitar()
    }
    // Também cobre a montagem já em entregue.
    if (o.mini && reduz) chars.filter(ch => ch.estado === 'resolvido').forEach(ch => retornos.agendar(ch.id))

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
          ch.humor = n.humor
          ch.dorme = n.dorme
          if (ch.st === n.estado) return
          ch.retornaTrabalho = false
          retornos.cancelar(n.id)
          if (n.estado === 'entregue' && ch.st === 'precisa') ch.festa = 0
          if (n.estado === 'entregue' && ch.st === 'trabalhando') ch.festa = 1.6
          ch.st = n.estado
        })
        if (!o.mini) solicitar()
      },
      selecionar(id) {
        solicitar()
        selecionado = id
        const ch = id && MOBILE() ? chars.find(c => c.id === id) : null
        if (ch) vista.irPara(ch.sala)
        chars.forEach(c => {
          c.tk = ''
        })
      },
      hora(h) {
        horaFixa = h
        luzDaHora(horaDaCena())
        solicitar()
      },
      reuniao() {
        // com movimento reduzido ninguém anda: a equipe só acorda
        if (o.mini || reduz) return
        chars.forEach((ch, i) => {
          ch.reuniao = 5 + (i % 3) * 0.4
        })
        solicitar()
      },
      irPara(v) {
        vista.irPara(v)
        solicitar()
      },
      tema(d) {
        setTema(d)
        solicitar()
      },
      aproximar: (fator: number) => {
        const zoom = vista.aproximar(fator)
        solicitar()
        return zoom
      },
      medir: () => ({
        fps: fluidez.fps,
        degrau: fluidez.degrau,
        hist: fluidez.historico(),
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
