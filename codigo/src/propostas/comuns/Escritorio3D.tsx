import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SALAS_NOME, tentarCarregarCena } from '../../telas/escritorio/cenaBase'
import type {
  EstadosIsometricos,
  NavegacaoIsometrica,
  montarEscritorioIsometrico,
} from '../../telas/escritorio/cenaIsometrica'
import { POR_ID } from '../../telas/escritorio/equipe'
import { SALAS_ISOMETRICAS, type VistaIsometrica } from '../../telas/escritorio/plantaIsometrica'
import { EscritorioMaquete, type PropsEscritorioMaquete } from './EscritorioMaquete'
import { distribuirEtiquetas } from './escritorio3d-etiquetas'
import { useValoresOcultos, Valor } from './privacidade'
import './escritorio3d.css'

type Funcionario = NonNullable<PropsEscritorioMaquete['funcionarios']['valor']>[number]

export interface PropsEscritorio3D<T extends Funcionario = Funcionario> extends PropsEscritorioMaquete<T> {
  altura?: number
  panorama?: boolean
  completo?: boolean
  celular?: boolean
  postoSelecionado?: string | null
  navegacao?: NavegacaoIsometrica
  forcarSvg?: boolean
}

const ESTADOS = {
  vai_comecar: 'Ainda vai começar',
  trabalhando: 'Trabalhando',
  entregue: 'Entregue',
  precisa_de_voce: 'Precisa de você',
  indisponivel: 'Estado indisponível',
}
const REDUZIR = '(prefers-reduced-motion: reduce)'

function podeMontarCena() {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof window.HTMLCanvasElement !== 'undefined' &&
    !!(window.WebGLRenderingContext || window.WebGL2RenderingContext) &&
    typeof window.matchMedia === 'function' &&
    typeof IntersectionObserver === 'function' &&
    typeof ResizeObserver === 'function' &&
    typeof requestAnimationFrame === 'function'
  )
}

export function Escritorio3D<T extends Funcionario>({
  altura,
  valores,
  panorama = false,
  completo = !panorama,
  celular,
  navegacao,
  postoSelecionado,
  forcarSvg,
  ...props
}: PropsEscritorio3D<T>) {
  const [reduzir, reduzirMovimento] = useState(() => !podeMontarCena() || window.matchMedia(REDUZIR).matches)
  const [falhou, marcarFalha] = useState(false)
  const valoresPermitidos = props.papel === 'equipe' || props.papel === null ? undefined : valores
  const salaDestacada = panorama && !completo ? undefined : props.salaDestacada

  useEffect(() => {
    if (!podeMontarCena()) return
    const preferencia = window.matchMedia(REDUZIR)
    const atualizar = () => reduzirMovimento(preferencia.matches)
    atualizar()
    preferencia.addEventListener('change', atualizar)
    return () => preferencia.removeEventListener('change', atualizar)
  }, [])

  return (
    <div
      className="escritorio3d"
      data-variante={props.variante ?? 'media'}
      data-completo={completo || undefined}
      data-celular={celular || undefined}
      data-panorama={panorama || undefined}
      style={
        {
          '--escritorio3d-altura': altura === undefined ? undefined : `${altura}px`,
          '--escritorio3d-zoom': navegacao?.zoom,
          '--escritorio3d-x': `${(navegacao?.x ?? 0) * 100}%`,
          '--escritorio3d-y': `${(navegacao?.y ?? 0) * 100}%`,
        } as CSSProperties
      }
      data-renderizacao={forcarSvg || reduzir || falhou ? 'svg' : undefined}
    >
      {forcarSvg || reduzir || falhou ? (
        <EscritorioMaquete
          {...props}
          salaDestacada={salaDestacada}
          mostrarPlaquinhas={false}
          detalhesSobDemanda
          valores={valoresPermitidos}
          postoSelecionado={postoSelecionado}
        />
      ) : (
        <Palco3D
          {...props}
          salaDestacada={salaDestacada}
          valores={valoresPermitidos}
          {...{ panorama, completo, celular, navegacao, postoSelecionado, marcarFalha }}
        />
      )}
    </div>
  )
}

function Palco3D<T extends Funcionario>({
  funcionarios,
  salaDestacada,
  valores,
  variante = 'media',
  oculto,
  onSelecionar,
  panorama,
  completo,
  celular,
  navegacao,
  postoSelecionado,
  marcarFalha,
}: PropsEscritorio3D<T> & { marcarFalha: (falhou: boolean) => void }) {
  const camera = useRef<HTMLDivElement>(null)
  const etiquetas = useRef(new Map<string, HTMLElement>())
  const cena = useRef<ReturnType<typeof montarEscritorioIsometrico> | null>(null)
  const [pronto, marcarPronto] = useState(false)
  const [apontado, apontar] = useState<string | null>(null)
  const [focado, focar] = useState<string | null>(null)
  const [selecionado, selecionar] = useState<string | null>(null)
  const [pagina, mudarPagina] = useState<PropsEscritorioMaquete['salaDestacada']>()
  const olhoFechado = useValoresOcultos()
  const equipe = (funcionarios.valor ?? []).filter(f => Object.prototype.hasOwnProperty.call(POR_ID, f.id))
  const salas = SALAS_ISOMETRICAS.filter(sala => equipe.some(f => f.sala === sala))
  const salaDaPagina = pagina && salas.includes(pagina) ? pagina : salas[0]
  const salaVisivel = salaDestacada ?? (completo ? undefined : salaDaPagina)
  const visiveis = panorama || !salaVisivel ? equipe : equipe.filter(f => f.sala === salaVisivel)
  const selecionadoAgora = postoSelecionado === undefined ? selecionado : postoSelecionado
  const detalhe = [apontado, focado, selecionadoAgora].map(id => visiveis.find(f => f.id === id)).find(Boolean)
  const valor = detalhe && valores?.[detalhe.id]
  const elenco = equipe.map(f => ({ ...POR_ID[f.id], sala: f.sala }))
  const chaveElenco = elenco.map(m => `${m.id}:${m.sala}`).join(',')
  const estados: EstadosIsometricos = Object.fromEntries(equipe.map(f => [f.id, f.estadoHoje.valor ?? undefined]))
  const vista: VistaIsometrica = salaDestacada ?? 'tudo'

  function abrir(funcionario: T) {
    selecionar(funcionario.id)
    onSelecionar?.(funcionario)
  }
  const atuais = useRef({ estados, vista, elenco, visiveis, abrir, pagina: salaDaPagina, navegacao })
  atuais.current = { estados, vista, elenco, visiveis, abrir, pagina: salaDaPagina, navegacao }

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
          const { estados, vista, elenco, pagina } = atuais.current
          cena.current = modulo.montarEscritorioIsometrico(T, el, {
            estados,
            vista,
            etiqueta: () => null,
            placa: () => null,
            aoPerderContexto: () => marcarFalha(true),
            aoTocar: id => {
              const funcionario = atuais.current.visiveis.find(f => f.id === id)
              if (funcionario) atuais.current.abrir(funcionario)
            },
            palco: {
              variante,
              elenco,
              pagina,
              panorama,
              completo,
              celular,
              aoApontar: apontar,
              aoDesenhar: () => marcarPronto(true),
              posicionar(postos, largura, altura) {
                const ids = new Set(atuais.current.visiveis.map(f => f.id))
                const posicoes = distribuirEtiquetas(
                  postos.filter(p => ids.has(p.id)),
                  largura,
                  altura,
                )
                for (const [id, no] of etiquetas.current) {
                  const p = posicoes.get(id)
                  no.style.visibility = p ? 'visible' : 'hidden'
                  if (p) {
                    no.style.left = `${p.x}px`
                    no.style.top = `${p.y}px`
                  }
                }
              },
            },
          })
          if (atuais.current.navegacao) cena.current.navegar(atuais.current.navegacao)
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
  }, [chaveElenco, variante, panorama, completo, celular, marcarFalha])

  // Atualiza estados e câmera sem reconstruir as malhas. Nomes, fichas e valores ficam no React.
  const chaveEstados = equipe.map(f => f.estadoHoje.valor ?? '').join(',')
  useEffect(() => {
    cena.current?.atualizar(atuais.current.estados, vista, salaDaPagina)
  }, [chaveEstados, vista, salaDaPagina])
  useEffect(() => {
    if (navegacao) cena.current?.navegar(navegacao)
  }, [navegacao])
  useEffect(() => {
    if (salaDestacada) mudarPagina(salaDestacada)
  }, [salaDestacada])

  const indice = salas.indexOf(salaDaPagina)
  const virar = (direcao: number) => {
    apontar(null)
    mudarPagina(salas[(indice + direcao + salas.length) % salas.length])
  }

  return (
    <div className="escritorio3d-cena" data-renderizacao={pronto ? '3d' : 'carregando'}>
      <div
        className="escritorio3d-quadro"
        role="group"
        tabIndex={panorama ? 0 : undefined}
        aria-label={
          panorama
            ? 'Vista geral do escritório, com rolagem horizontal'
            : salaVisivel
              ? `Escritório · ${SALAS_NOME[salaVisivel]}`
              : 'Vista completa do escritório'
        }
      >
        <div className="escritorio3d-palco">
          <div className="escritorio3d-camera" ref={camera} aria-hidden="true" />
          {!pronto && (
            <div className="escritorio3d-esqueleto" role="status">
              Carregando escritório…
            </div>
          )}
          <div className="escritorio3d-etiquetas" hidden={!pronto}>
            {visiveis.map(f => {
              const estado = f.estadoHoje.valor ?? 'indisponivel'
              return (
                <button
                  key={f.id}
                  type="button"
                  className="escritorio3d-posto"
                  data-posto={f.id}
                  data-estado={estado}
                  aria-pressed={onSelecionar && selecionadoAgora === f.id}
                  aria-label={`${f.nome} · ${SALAS_NOME[f.sala]} · ${ESTADOS[estado]}`}
                  ref={no => {
                    if (no) etiquetas.current.set(f.id, no)
                    else etiquetas.current.delete(f.id)
                  }}
                  onPointerEnter={(e: PointerEvent) => {
                    if (e.pointerType !== 'touch') apontar(f.id)
                  }}
                  onPointerLeave={() => apontar(null)}
                  onFocus={() => {
                    apontar(null)
                    focar(f.id)
                  }}
                  onBlur={() => focar(null)}
                  onClick={() => abrir(f)}
                />
              )
            })}
          </div>
        </div>
      </div>
      {!completo && !panorama && !salaDestacada && salas.length > 1 && (
        <div className="escritorio3d-paginas" role="group" aria-label="Salas do escritório">
          <button type="button" aria-label="Sala anterior" onClick={() => virar(-1)}>
            <ChevronLeft aria-hidden="true" size={20} />
          </button>
          <span aria-live="polite">
            {SALAS_NOME[salaDaPagina]}{' '}
            <small>
              {indice + 1} de {salas.length}
            </small>
          </span>
          <button type="button" aria-label="Próxima sala" onClick={() => virar(1)}>
            <ChevronRight aria-hidden="true" size={20} />
          </button>
        </div>
      )}
      <div className="escritorio3d-detalhe" aria-live="polite">
        {pronto && !detalhe && (
          <span>
            {salaDestacada
              ? SALAS_NOME[salaDestacada]
              : onSelecionar
                ? 'Selecione um posto para abrir a ficha.'
                : 'Equipe do escritório'}
          </span>
        )}
        {pronto && detalhe && (
          <>
            <strong>{detalhe.nome}</strong>
            <span>
              {POR_ID[detalhe.id].papel} · {ESTADOS[detalhe.estadoHoje.valor ?? 'indisponivel']}
            </span>
            {valor && (
              <span className="escritorio3d-valor">
                {oculto || olhoFechado ? <span aria-label="Valor oculto">•••</span> : <Valor campo={valor} />}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
