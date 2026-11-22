// A cena leva o próprio estilo: assim ela aparece certa em qualquer tela que a use, sem depender de outra ter carregado o CSS.
import { textoPrivado } from '../../lib/olho'
import './escritorio.css'
import { Icone } from '../../componentes/Icone'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Clock, Expand, Hand, Info, Keyboard, Maximize2, Minus, Plus } from 'lucide-react'
import type { EstadoFuncionario, FuncionarioEsc } from '../../api/tipos'
import { chaveSimples } from '../../api/normaliza2'
import { FUSO } from '../../lib/formato'
import {
  SALAS_NOME as SALAS,
  temWebGL,
  tentarCarregarCena,
  type Cena,
  type EstadoCena,
  type FuncCena,
} from '../../lib/escritorio/cenaBase'
import { nomeCurto } from '../../lib/escritorio/equipe'

const ESTADO: Record<EstadoFuncionario, EstadoCena> = {
  vai_comecar: 'fila',
  trabalhando: 'trabalhando',
  entregue: 'entregue',
  precisa_de_voce: 'precisa',
}
export const ROTULO_ESTADO: Record<EstadoFuncionario, string> = {
  vai_comecar: 'ainda vai começar',
  trabalhando: 'trabalhando',
  entregue: 'entregue',
  precisa_de_voce: 'precisa de você',
}
export function IcoEstado({ e }: { e: EstadoFuncionario; size?: number }) {
  return e === 'precisa_de_voce' ? (
    <Icone desenho={Hand} />
  ) : e === 'entregue' ? (
    <Icone desenho={Check} />
  ) : e === 'trabalhando' ? (
    <Icone desenho={Keyboard} />
  ) : (
    <Icone desenho={Clock} />
  )
}
/** Sala que vem do banco ("Cartões", "Patrimônio") vira a chave da cena ("cartoes", "patrimonio"). Sala desconhecida fica na Recepção. */
export const salaDe = (s: string) => {
  const k = chaveSimples(s)
  return SALAS[k] ? k : 'recepcao'
}
// C2: o nome curto da etiqueta vem da lista única da equipe
const curto = (f: FuncionarioEsc) => nomeCurto(f.id, f.nome)
const horaRecife = () => {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  return (Number(p[0].value) % 24) + Number(p[2].value) / 60
}
const escuroAgora = () => {
  const t = document.documentElement.dataset.theme
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
}
const celular = () => window.innerWidth < 900

/**
 * A cena 3D dentro do app. O Three.js só é buscado aqui (import dinâmico): as outras telas não carregam nada de 3D.
 * Sem WebGL, com erro ou depois de 8 s sem abrir, a cena some e fica a lista (que está sempre na tela).
 * Cada boneco tem uma etiqueta em HTML presa à cabeça: é ela o alvo de toque (44 px) e o que o leitor de tela lê.
 */
export function Cena3D({
  funcionarios,
  selecionado,
  aoTocar,
  valores,
  reserva,
  ampliavel,
}: {
  funcionarios: FuncionarioEsc[]
  selecionado: string | null
  aoTocar: (id: string) => void
  /** Valor da pendência de quem precisa de você: aparece no selo, no lugar do nome (já vem mascarado com o olho fechado). */
  valores?: Record<string, string>
  /** O que mostrar quando o 3D não abre neste aparelho, no lugar do aviso (telas sem lista logo abaixo, como o Início). */
  reserva?: ReactNode
  /** Mostra aproximar, afastar e tela cheia. */
  ampliavel?: boolean
}) {
  const bloco = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const aproximar = (fator: number) => setZoom(cena.current?.aproximar?.(fator) ?? 1)
  const [cheia, setCheia] = useState(false)
  useEffect(() => {
    const conferir = () => setCheia(!!bloco.current && document.fullscreenElement === bloco.current)
    document.addEventListener('fullscreenchange', conferir)
    return () => document.removeEventListener('fullscreenchange', conferir)
  }, [])
  const sairDaTelaCheia = () => {
    if (bloco.current && document.fullscreenElement === bloco.current) void document.exitFullscreen?.()
  }
  const telaCheia = () => {
    const el = bloco.current
    if (!el) return
    if (document.fullscreenElement === el) sairDaTelaCheia()
    else
      void el.requestFullscreen?.().catch(() => {
        /* sem tela cheia neste navegador */
      })
  }
  // a ficha do funcionário abre fora da cena: em tela cheia ela ficaria escondida atrás, então a cena volta ao normal antes
  const tocarNoFuncionario = (id: string) => {
    sairDaTelaCheia()
    aoTocar(id)
  }
  const caixa = useRef<HTMLDivElement>(null)
  const cena = useRef<Cena | null>(null)
  const tags = useRef<Record<string, HTMLElement | null>>({})
  const placas = useRef<Record<string, HTMLElement | null>>({})
  const tocar = useRef(aoTocar)
  tocar.current = aoTocar
  const [modo, setModo] = useState<'abrindo' | '3d' | 'lista'>('abrindo')
  const [leve, setLeve] = useState<{ fps: number; degrau: number } | null>(null)
  const [vista, setVista] = useState('tudo')
  const paraCena = (fs: FuncionarioEsc[]): FuncCena[] =>
    fs.map(f => ({ id: f.id, sala: salaDe(f.sala), estado: ESTADO[f.estado] }))
  // a cena é montada 1 vez por equipe (mesmos ids); mudança de estado entra por `atualizar`, sem remontar
  const ids = funcionarios.map(f => f.id + '@' + salaDe(f.sala)).join(',')
  const atuais = useRef(funcionarios)
  atuais.current = funcionarios

  useEffect(() => {
    const el = caixa.current
    if (!el || !ids) return
    const sem3d = new URLSearchParams(location.search).has('sem3d') || /[?&]sem3d/.test(location.hash)
    if (sem3d || !temWebGL()) {
      setModo('lista')
      return
    }
    setModo('abrindo')
    setLeve(null)
    setZoom(1)
    let vivo = true
    const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches
    // o Three.js e o código da cena chegam juntos, só agora: nenhuma outra tela carrega 3D
    const cancelarCarga = tentarCarregarCena(
      () => Promise.all([import('./tres'), import('./cena3d')]),
      ([T, m]) => {
        if (!vivo) return
        try {
          const c = m.montarCena(T, el, {
            funcionarios: paraCena(atuais.current),
            etiqueta: id => tags.current[id] || null,
            placa: s => placas.current[s] || null,
            aoTocar: id => {
              sairDaTelaCheia()
              tocar.current(id)
            },
            escuro: escuroAgora(),
            celular,
            hora: horaRecife,
            parado: reduz,
            aoContexto: estado => {
              if (vivo) setModo(estado === 'falhou' ? 'lista' : estado === 'perdido' ? 'abrindo' : '3d')
            },
            aoMedir: (fps, degrau) =>
              setLeve(a => (degrau > 0 ? (a && a.degrau === degrau ? a : { fps, degrau }) : null)),
          })
          cena.current = c
          ;(window as unknown as { __escritorio?: unknown }).__escritorio = c.medir
          setModo('3d')
        } catch (e) {
          console.warn('Cena 3D não abriu:', e)
          setModo('lista')
        }
      },
      () => {
        if (vivo) setModo('lista')
      },
    )
    // tema: claro e escuro trocam a cor do chão da cena
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const tema = () => cena.current?.tema(escuroAgora())
    mq.addEventListener('change', tema)
    const obs = new MutationObserver(tema)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      vivo = false
      cancelarCarga()
      mq.removeEventListener('change', tema)
      obs.disconnect()
      cena.current?.destruir()
      cena.current = null
      delete (window as unknown as { __escritorio?: unknown }).__escritorio
    }
  }, [ids])

  useEffect(() => {
    cena.current?.atualizar(paraCena(funcionarios))
  })
  useEffect(() => {
    cena.current?.selecionar(selecionado)
    if (selecionado && celular()) {
      const f = atuais.current.find(x => x.id === selecionado)
      if (f) setVista(salaDe(f.sala))
    }
  }, [selecionado, modo])
  const ir = (v: string) => {
    setVista(v)
    cena.current?.irPara(v)
  }
  const salasUsadas = Object.keys(SALAS).filter(k => funcionarios.some(f => salaDe(f.sala) === k))

  return (
    <div className="cena3d-bloco" ref={bloco}>
      {modo === 'lista' && reserva}
      {modo === 'lista' && !reserva && (
        <p className="todo quieto" role="status">
          <Icone desenho={Info} aria-hidden="true" />
          <span>A cena 3D não abriu neste aparelho. Tudo funciona pela lista do Escritório, logo abaixo.</span>
        </p>
      )}
      {/* No celular a cena fica mais larga que a tela e a pessoa arrasta para o lado: assim os 19 cabem com nome. */}
      <div className="cena3d-quadro">
        <div className={'cena3d' + (modo === 'lista' ? ' fora' : '')} ref={caixa} data-modo={modo}>
          {modo === 'abrindo' && <p className="cena3d-espera">Abrindo o escritório…</p>}
          <div className="cena3d-tags" hidden={modo !== '3d'}>
            {Object.keys(SALAS).map(k => (
              <span
                key={k}
                className="placa"
                ref={el => {
                  placas.current[k] = el
                }}
              >
                {SALAS[k]}
              </span>
            ))}
            {/* com reserva na tela, as etiquetas da cena não ficam duplicadas no documento */}
            {!(modo === 'lista' && reserva) &&
              funcionarios.map(f => {
                const precisa = f.estado === 'precisa_de_voce',
                  sel = f.id === selecionado
                // B1 (pacote 4): nome em cada etiqueta, também no "Ver tudo" (a regra de colisão esconde a que bate)
                const soIcone = false
                const selo = (precisa && valores?.[f.id]) || curto(f)
                return (
                  <button
                    key={f.id}
                    type="button"
                    ref={el => {
                      tags.current[f.id] = el
                    }}
                    data-k={`${f.estado}|${sel}|${soIcone}|${selo}`}
                    data-func={f.id}
                    data-posto={f.id}
                    data-estado={f.estado}
                    className={'tag' + (precisa ? ' precisa' : '') + (sel ? ' sel' : '') + (soIcone ? ' curta' : '')}
                    aria-label={textoPrivado(
                      `${f.nome}: ${f.semDado ? 'ainda sem dado' : ROTULO_ESTADO[f.estado]}. Abrir.`,
                    )}
                    aria-pressed={sel}
                    onClick={() => tocarNoFuncionario(f.id)}
                  >
                    <IcoEstado e={f.estado} />
                    <span>{selo}</span>
                  </button>
                )
              })}
          </div>
        </div>
      </div>
      {modo === '3d' && (
        <div className="pills cena3d-salas" role="group" aria-label="Aproximar de uma sala">
          <button type="button" className="pill" aria-pressed={vista === 'tudo'} onClick={() => ir('tudo')}>
            <Icone desenho={Maximize2} />
            Ver tudo
          </button>
          {salasUsadas.map(k => (
            <button key={k} type="button" className="pill" aria-pressed={vista === k} onClick={() => ir(k)}>
              {SALAS[k]}
            </button>
          ))}
          {ampliavel && (
            <>
              <button
                type="button"
                className="pill"
                aria-label="Afastar"
                disabled={zoom <= 1}
                onClick={() => aproximar(1 / 1.25)}
              >
                <Icone desenho={Minus} />
              </button>
              <button
                type="button"
                className="pill"
                aria-label="Aproximar"
                disabled={zoom >= 3}
                onClick={() => aproximar(1.25)}
              >
                <Icone desenho={Plus} />
              </button>
              <button type="button" className="pill" onClick={telaCheia}>
                <Icone desenho={Expand} />
                {cheia ? 'Reduzir' : 'Ampliar'}
              </button>
            </>
          )}
        </div>
      )}
      {modo === '3d' && leve && (
        <p className="sub" role="status">
          Modo leve ligado: este aparelho estava mostrando {leve.fps} imagens por segundo (o mínimo para ficar suave é
          24). A cena ficou mais simples para não travar.
        </p>
      )}
    </div>
  )
}
