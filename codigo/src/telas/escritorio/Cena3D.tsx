// A cena leva o próprio estilo: assim ela aparece certa em qualquer tela que a use, sem depender de outra ter carregado o CSS.
import { textoPrivado } from '../../lib/olho'
import './escritorio.css'
import { Icone } from '../../componentes/Icone'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Clock, Expand, Hand, Info, Keyboard, Maximize2, Minus, Moon, Plus } from 'lucide-react'
import type { EstadoFuncionario, FuncionarioEsc } from '../../api/tipos'
import { chaveSimples } from '../../api/normaliza2'
import {
  SALAS_NOME as SALAS,
  temWebGL,
  tentarCarregarCena,
  type Cena,
  type EstadoCena,
  type FuncCena,
  type Humor,
} from '../../lib/escritorio/cenaBase'
import { nomeCurto } from '../../lib/escritorio/equipe'
import { HORA_DA_NOITE, horaRecife } from '../../lib/escritorio/turno'
import { FaixaDoTurno } from '../../componentes/escritorio/FaixaDoTurno'
import { useTurno } from './useTurno'

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
const escuroAgora = () => {
  const t = document.documentElement.dataset.theme
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
}
const celular = () => window.innerWidth < 900
/** O que o leitor de tela diz da etiqueta: nome, estado, se tem novidade, a fala e o que o toque faz. */
function rotuloDaEtiqueta(
  f: FuncionarioEsc,
  dormindo: boolean,
  novo: boolean,
  dito: string | undefined,
  responde: boolean,
) {
  const estado = dormindo ? 'dormindo' : f.semDado ? 'ainda sem dado' : ROTULO_ESTADO[f.estado]
  return textoPrivado(
    `${f.nome}: ${estado}.${novo ? ' Novidade.' : ''}${dito ? ` ${dito}.` : ''} ${responde ? 'Responder' : 'Abrir'}.`,
  )
}

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
  falas,
  humores,
  novos,
  aoResponder,
  expediente,
  reserva,
  ampliavel,
}: {
  funcionarios: FuncionarioEsc[]
  selecionado: string | null
  aoTocar: (id: string) => void
  /** Valor da pendência de quem precisa de você: aparece no selo, no lugar do nome (já vem mascarado com o olho fechado). */
  valores?: Record<string, string>
  /** O que cada um tem a dizer, em ordem: o balão mostra uma fala por vez e passa para a próxima. Já vem mascarado. */
  falas?: Record<string, string[]>
  /** A emoção que o aviso de cada um pede (aflito, preocupado, feliz); quem não está aqui fica com a do estado. */
  humores?: Record<string, Humor>
  /** Quem tem novidade desde a última visita: ganha a marca "Novo" ao lado do nome. */
  novos?: Record<string, boolean>
  /** Com isto, tocar em quem precisa de você abre direto a resposta da tarefa, em vez da ficha. */
  aoResponder?: (id: string) => void
  /** O escritório segue o relógio: depois das 20h a equipe dorme e dá para chamar todo mundo para uma reunião. */
  expediente?: boolean
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
  const responde = (f?: FuncionarioEsc) => !!aoResponder && f?.estado === 'precisa_de_voce'
  // a ficha e a resposta abrem fora da cena: em tela cheia ficariam escondidas atrás, então a cena volta ao normal antes
  const tocarNoFuncionario = (id: string) => {
    sairDaTelaCheia()
    if (responde(atuais.current.find(f => f.id === id))) aoResponder!(id)
    else aoTocar(id)
  }
  const caixa = useRef<HTMLDivElement>(null)
  const cena = useRef<Cena | null>(null)
  const tags = useRef<Record<string, HTMLElement | null>>({})
  const placas = useRef<Record<string, HTMLElement | null>>({})
  const tocar = useRef(tocarNoFuncionario)
  tocar.current = tocarNoFuncionario
  const [modo, setModo] = useState<'abrindo' | '3d' | 'lista'>('abrindo')
  const [leve, setLeve] = useState<{ fps: number; degrau: number } | null>(null)
  const [vista, setVista] = useState('tudo')
  const humor = useRef(humores)
  humor.current = humores
  const { turno, forcada, acordados, setAcordados, dormem, ensaio, verODia, voltar } = useTurno(!!expediente)
  // quem precisa de você fica acordado esperando; o resto da equipe dorme
  const dorme = (f: FuncionarioEsc) => dormem && f.estado !== 'precisa_de_voce'
  const sono = useRef({ dormem, forcada })
  sono.current = { dormem, forcada }
  const paraCena = (fs: FuncionarioEsc[]): FuncCena[] =>
    fs.map(f => ({
      id: f.id,
      sala: salaDe(f.sala),
      estado: ESTADO[f.estado],
      humor: humor.current?.[f.id],
      dorme: sono.current.dormem && f.estado !== 'precisa_de_voce',
    }))
  const reuniao = () => {
    setAcordados(true)
    cena.current?.reuniao?.()
  }
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
            aoTocar: id => tocar.current(id),
            escuro: escuroAgora(),
            celular,
            hora: () => (sono.current.forcada ? HORA_DA_NOITE : horaRecife()),
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
  // o dia passando: a luz da cena acompanha a hora da amostra; sem amostra, volta ao relógio
  useEffect(() => {
    cena.current?.hora?.(ensaio)
  }, [ensaio, modo])
  // onde a cena é mais larga que a tela (celular), ela abre no meio do escritório, não no canto vazio
  useEffect(() => {
    const quadro = caixa.current?.parentElement
    if (modo === '3d' && quadro) quadro.scrollLeft = (quadro.scrollWidth - quadro.clientWidth) / 2
  }, [modo])
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
  // quem precisa de você fala o tempo todo; os outros avisos se revezam, 2 por vez, para a cena não ficar coberta
  const roteiro = (f: FuncionarioEsc) => (dorme(f) ? undefined : falas?.[f.id])
  const avisos = funcionarios.filter(f => roteiro(f)?.length && f.estado !== 'precisa_de_voce').map(f => f.id)
  const [vez, setVez] = useState(0)
  const revezam = avisos.length > 2 && modo === '3d'
  const grupos = Math.ceil(avisos.length / 2) || 1
  const giram = modo === '3d' && (revezam || funcionarios.some(f => (roteiro(f)?.length || 0) > 1))
  useEffect(() => {
    if (!giram || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const relogio = setInterval(() => setVez(v => v + 1), 5000)
    return () => clearInterval(relogio)
  }, [giram])
  const falaAgora = (id: string) =>
    !avisos.includes(id) || !revezam || Math.floor(avisos.indexOf(id) / 2) === vez % grupos
  // a fala muda a cada volta: quem reveza troca quando o balão reabre; quem fica sempre aberto troca a cada 10 s
  const ditoDe = (f: FuncionarioEsc) => {
    const lista = roteiro(f)
    if (!lista?.length) return undefined
    const volta = revezam && avisos.includes(f.id) ? Math.floor(vez / grupos) : Math.floor(vez / 2)
    return lista[volta % lista.length]
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
      {expediente && modo === '3d' && (
        <FaixaDoTurno
          turno={turno}
          dormem={dormem}
          acordados={acordados}
          alguemAcordado={funcionarios.some(f => f.estado === 'precisa_de_voce')}
          chamar={reuniao}
          deixarDormir={() => setAcordados(false)}
          ensaio={ensaio}
          verODia={verODia}
          voltar={voltar}
        />
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
                const dormindo = dorme(f),
                  novo = !!novos?.[f.id]
                const valor = precisa ? valores?.[f.id] : undefined,
                  dito = ditoDe(f),
                  fala = dito && (sel || falaAgora(f.id)) ? dito : undefined,
                  selo = fala ? curto(f) : valor || curto(f)
                return (
                  <button
                    key={f.id}
                    type="button"
                    ref={el => {
                      tags.current[f.id] = el
                    }}
                    data-k={`${f.estado}|${sel}|${soIcone}|${selo}|${valor}|${fala}|${responde(f)}|${dormindo}|${novo}`}
                    data-func={f.id}
                    data-posto={f.id}
                    data-estado={f.estado}
                    className={
                      'tag' +
                      (precisa ? ' precisa' : '') +
                      (sel ? ' sel' : '') +
                      (soIcone ? ' curta' : '') +
                      (dormindo ? ' dorme' : '') +
                      (fala ? ' fala' : dito ? ' quer-falar' : '')
                    }
                    aria-label={rotuloDaEtiqueta(f, dormindo, novo, dito, responde(f))}
                    aria-haspopup={responde(f) ? 'dialog' : undefined}
                    aria-pressed={sel}
                    onClick={() => tocarNoFuncionario(f.id)}
                  >
                    {dormindo ? <Icone desenho={Moon} /> : <IcoEstado e={f.estado} />}
                    <span>
                      {selo}
                      {novo && <em className="tag-novo">Novo</em>}
                    </span>
                    {fala && (
                      <span className="tag-dito">
                        {valor && <b>{valor}</b>}
                        {fala}
                      </span>
                    )}
                    {fala && responde(f) && (
                      <span className="tag-acao">
                        Responder <Icone nome="abrir" size={14} />
                      </span>
                    )}
                  </button>
                )
              })}
          </div>
        </div>
      </div>
      {modo === '3d' && (
        <div className="pills cena3d-salas" role="group" aria-label="Aproximar de uma sala">
          <div className="cena3d-vistas">
            <button type="button" className="pill" aria-pressed={vista === 'tudo'} onClick={() => ir('tudo')}>
              <Icone desenho={Maximize2} />
              Ver tudo
            </button>
            {salasUsadas.map(k => (
              <button key={k} type="button" className="pill" aria-pressed={vista === k} onClick={() => ir(k)}>
                {SALAS[k]}
              </button>
            ))}
          </div>
          {ampliavel && (
            <div className="cena3d-ferramentas">
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
            </div>
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
