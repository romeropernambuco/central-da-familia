import { Check, CircleHelp, Hand, Keyboard, Pause } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { SALAS_NOME, tentarCarregarCena } from '../../telas/escritorio/cenaBase'
import type { EstadosIsometricos, montarEscritorioIsometrico } from '../../telas/escritorio/cenaIsometrica'
import { POR_ID } from '../../telas/escritorio/equipe'
import type { VistaIsometrica } from '../../telas/escritorio/plantaIsometrica'
import { EscritorioMaquete, type PropsEscritorioMaquete } from './EscritorioMaquete'
import { distribuirEtiquetas } from './escritorio3d-etiquetas'
import { useValoresOcultos, Valor } from './privacidade'
import './escritorio3d.css'

export interface PropsEscritorio3D extends PropsEscritorioMaquete {
  altura?: number
}

const ESTADOS = {
  vai_comecar: { rotulo: 'Ainda vai começar', Icone: Pause },
  trabalhando: { rotulo: 'Trabalhando', Icone: Keyboard },
  entregue: { rotulo: 'Entregue', Icone: Check },
  precisa_de_voce: { rotulo: 'Precisa de você', Icone: Hand },
  indisponivel: { rotulo: 'Estado indisponível', Icone: CircleHelp },
}
const REDUZIR = '(prefers-reduced-motion: reduce)'

function podeMontarCena() {
  return typeof window !== 'undefined' && typeof document !== 'undefined' &&
    typeof window.HTMLCanvasElement !== 'undefined' &&
    !!(window.WebGLRenderingContext || window.WebGL2RenderingContext) &&
    typeof window.matchMedia === 'function' && typeof IntersectionObserver === 'function' &&
    typeof ResizeObserver === 'function' && typeof requestAnimationFrame === 'function'
}

export function Escritorio3D({ altura, valores, ...props }: PropsEscritorio3D) {
  const [reduzir, reduzirMovimento] = useState(() => !podeMontarCena() || window.matchMedia(REDUZIR).matches)
  const [falhou, marcarFalha] = useState(false)
  const valoresPermitidos = props.papel === 'equipe' || props.papel === null ? undefined : valores

  useEffect(() => {
    if (!podeMontarCena()) return
    const preferencia = window.matchMedia(REDUZIR)
    const atualizar = () => reduzirMovimento(preferencia.matches)
    atualizar()
    preferencia.addEventListener('change', atualizar)
    return () => preferencia.removeEventListener('change', atualizar)
  }, [])

  return <div className="escritorio3d" data-variante={props.variante ?? 'media'}
    style={altura === undefined ? undefined : { '--escritorio3d-altura': `${altura}px` } as CSSProperties}
    data-renderizacao={reduzir || falhou ? 'svg' : undefined}>
    {reduzir || falhou ? <EscritorioMaquete {...props} valores={valoresPermitidos} />
      : <Palco3D {...props} valores={valoresPermitidos} marcarFalha={marcarFalha} />}
  </div>
}

type Funcionario = NonNullable<PropsEscritorio3D['funcionarios']['valor']>[number]

function Palco3D({
  funcionarios, salaDestacada, mostrarPlaquinhas = true, valores, variante = 'media',
  oculto, onSelecionar, marcarFalha,
}: PropsEscritorioMaquete & { marcarFalha: (falhou: boolean) => void }) {
  const area = useRef<HTMLDivElement>(null)
  const camera = useRef<HTMLDivElement>(null)
  const etiquetas = useRef(new Map<string, HTMLElement>())
  const hastes = useRef(new Map<string, SVGLineElement>())
  const cena = useRef<ReturnType<typeof montarEscritorioIsometrico> | null>(null)
  const [pronto, marcarPronto] = useState(false)
  const [apontado, apontar] = useState<string | null>(null)
  const [focado, focar] = useState<string | null>(null)
  const [selecionado, selecionar] = useState<string | null>(null)
  const olhoFechado = useValoresOcultos()
  const equipe = (funcionarios.valor ?? []).filter(f => Object.prototype.hasOwnProperty.call(POR_ID, f.id))
  const visiveis = equipe.filter(f => !salaDestacada || f.sala === salaDestacada)
  const detalhe = [apontado, focado, selecionado].map(id => visiveis.find(f => f.id === id)).find(Boolean)
  const valor = detalhe && valores?.[detalhe.id]
  const elenco = equipe.map(f => ({ ...POR_ID[f.id], sala: f.sala }))
  const chaveElenco = elenco.map(m => `${m.id}:${m.sala}`).join(',')
  const estados: EstadosIsometricos = Object.fromEntries(equipe.map(f => [f.id, f.estadoHoje.valor ?? undefined]))
  const vista: VistaIsometrica = salaDestacada ?? 'tudo'

  function abrir(funcionario: Funcionario) {
    selecionar(funcionario.id)
    onSelecionar?.(funcionario)
  }
  const atuais = useRef({ estados, vista, elenco, visiveis, abrir })
  atuais.current = { estados, vista, elenco, visiveis, abrir }

  useEffect(() => {
    const el = camera.current!
    let cancelar: (() => void) | undefined
    marcarPronto(false)
    const carregar = new IntersectionObserver(entradas => {
      if (cancelar || !entradas.some(e => e.isIntersecting)) return
      carregar.disconnect()
      cancelar = tentarCarregarCena(
        () => Promise.all([import('../../telas/escritorio/tres'), import('../../telas/escritorio/cenaIsometrica')]),
        ([T, modulo]) => {
          const { estados, vista, elenco } = atuais.current
          cena.current = modulo.montarEscritorioIsometrico(T, el, {
            estados, vista,
            etiqueta: () => null, placa: () => null,
            aoPerderContexto: () => marcarFalha(true),
            aoTocar: id => {
              const funcionario = atuais.current.visiveis.find(f => f.id === id)
              if (funcionario) atuais.current.abrir(funcionario)
            },
            palco: {
              variante, elenco, aoApontar: apontar, aoDesenhar: () => marcarPronto(true),
              posicionar(postos, largura, altura) {
                const posicoes = distribuirEtiquetas(postos, largura, altura)
                for (const [id, no] of etiquetas.current) {
                  const p = posicoes.get(id)
                  no.style.visibility = p ? 'visible' : 'hidden'
                  if (p) {
                    no.style.left = `${p.x}px`
                    no.style.top = `${p.y}px`
                  }
                }
                for (const posto of postos) {
                  const p = posicoes.get(posto.id)
                  const haste = hastes.current.get(posto.id)
                  if (!haste || !p) continue
                  haste.setAttribute('x1', String(p.x))
                  haste.setAttribute('y1', String(p.y))
                  haste.setAttribute('x2', String(posto.x))
                  haste.setAttribute('y2', String(posto.y + 11))
                }
              },
            },
          })
        },
        () => marcarFalha(true),
      )
    })
    carregar.observe(el)
    return () => {
      carregar.disconnect()
      cancelar?.()
      cena.current?.destruir()
      cena.current = null
    }
  }, [chaveElenco, variante, marcarFalha])

  // Atualiza estados e câmera sem reconstruir as malhas. Nomes, fichas e valores ficam no React.
  const chaveEstados = equipe.map(f => f.estadoHoje.valor ?? '').join(',')
  useEffect(() => {
    cena.current?.atualizar(atuais.current.estados, vista)
  }, [chaveEstados, vista])
  useEffect(() => {
    if (area.current) area.current.scrollLeft = (area.current.scrollWidth - area.current.clientWidth) / 2
  }, [vista, pronto])

  return <div className="escritorio3d-cena" data-renderizacao={pronto ? '3d' : 'carregando'} data-focada={!!salaDestacada}>
    <div className="escritorio3d-rolagem" ref={area} role="group"
      aria-label={salaDestacada ? `Escritório · ${SALAS_NOME[salaDestacada]}` : 'Postos do escritório'}>
      <div className="escritorio3d-palco">
        <div className="escritorio3d-camera" ref={camera} aria-hidden="true" />
        {!pronto && <div className="escritorio3d-esqueleto" role="status">Carregando escritório…</div>}
        <div className="escritorio3d-etiquetas" hidden={!pronto}>
          <svg className="escritorio3d-hastes" aria-hidden="true" focusable="false">
            {visiveis.map(f => <line key={f.id} ref={no => {
              if (no) hastes.current.set(f.id, no)
              else hastes.current.delete(f.id)
            }} />)}
          </svg>
          {visiveis.map(f => {
            const estado = f.estadoHoje.valor ?? 'indisponivel'
            const { rotulo, Icone } = ESTADOS[estado]
            const comuns = {
              className: 'escritorio3d-posto',
              'data-posto': f.id,
              'data-estado': estado,
              'data-ativo': detalhe?.id === f.id,
              ref: (no: HTMLElement | null) => {
                if (no) etiquetas.current.set(f.id, no)
                else etiquetas.current.delete(f.id)
              },
              onPointerEnter: (e: PointerEvent) => { if (e.pointerType !== 'touch') apontar(f.id) },
              onPointerLeave: () => apontar(null),
            }
            const selo = <span className="escritorio3d-selo" aria-hidden="true">
              <Icone size={14} />{mostrarPlaquinhas && f.curto.slice(0, 1)}
            </span>
            return onSelecionar
              ? <button {...comuns} key={f.id} type="button" aria-label={`${f.nome} · ${SALAS_NOME[f.sala]} · ${rotulo}`}
                onFocus={() => { apontar(null); focar(f.id) }} onBlur={() => focar(null)} onClick={() => abrir(f)}>{selo}</button>
              : <span {...comuns} key={f.id} aria-hidden="true">{selo}</span>
          })}
        </div>
      </div>
    </div>
    <div className="escritorio3d-detalhe" aria-live="polite">
      {pronto && !detalhe && <span>{salaDestacada ? SALAS_NOME[salaDestacada] :
        onSelecionar ? 'Selecione um posto para abrir a ficha.' : 'Equipe do escritório'}</span>}
      {pronto && detalhe && <>
        <strong>{detalhe.nome}</strong>
        <span>{ESTADOS[detalhe.estadoHoje.valor ?? 'indisponivel'].rotulo}</span>
        {valor && <span className="escritorio3d-valor">
          {oculto || olhoFechado ? <span aria-label="Valor oculto">•••</span> : <Valor campo={valor} />}
        </span>}
      </>}
    </div>
  </div>
}
