import { Maximize2, Minimize2, Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { SALAS_NOME } from '../../telas/escritorio/cenaBase'
import type { NavegacaoIsometrica } from '../../telas/escritorio/plantaIsometrica'
import type { SalaEquipe } from '../../telas/escritorio/equipe'

const inicial = { zoom: 1, x: 0, y: 0 }
const salas: SalaEquipe[] = ['caixa', 'casa', 'cartoes', 'patrimonio', 'gestao', 'recepcao', 'apoio']
const limitar = (n: number, minimo: number, maximo: number) => Math.max(minimo, Math.min(n, maximo))
const ajustar = (zoom: number, x: number, y: number) => {
  const limite = (zoom - 1) / 2
  return { zoom, x: limitar(x, -limite, limite), y: limitar(y, -limite, limite) }
}

export function VisorEscritorio({
  sala,
  aoMudarSala,
  celular,
  children,
  folha,
  tarefaDaFila,
}: {
  sala?: SalaEquipe
  aoMudarSala?: (sala?: SalaEquipe) => void
  celular?: boolean
  children: (navegacao: NavegacaoIsometrica) => ReactNode
  folha?: ReactNode
  tarefaDaFila?: string
}) {
  const quadro = useRef<HTMLDivElement>(null)
  const fechar = useRef<HTMLButtonElement>(null)
  const [ampliado, ampliar] = useState(false)
  const [navegacao, navegar] = useState(inicial)
  const tela = useRef(inicial)
  const dedos = useRef(new Map<number, [number, number]>())
  const arrastou = useRef(false)

  function aplicar(proxima: NavegacaoIsometrica) {
    tela.current = proxima
    navegar(proxima)
  }

  useEffect(() => {
    aplicar(inicial)
  }, [sala])
  useEffect(() => {
    if (tarefaDaFila) aplicar(inicial)
  }, [tarefaDaFila])
  useEffect(() => {
    const elemento = quadro.current
    const doc = elemento?.ownerDocument
    if (!doc || !elemento) return
    const sincronizar = () => ampliar(doc.fullscreenElement === elemento)
    doc.addEventListener('fullscreenchange', sincronizar)
    return () => doc.removeEventListener('fullscreenchange', sincronizar)
  }, [])

  async function alternar() {
    const elemento = quadro.current
    if (!elemento) return
    const doc = elemento.ownerDocument
    if (doc.fullscreenElement === elemento) await doc.exitFullscreen()
    else if (ampliado) ampliar(false)
    else if (elemento.requestFullscreen) {
      try {
        await elemento.requestFullscreen()
        ampliar(true)
      } catch {
        ampliar(true)
      }
    } else ampliar(true)
    fechar.current?.focus({ preventScroll: true })
  }

  function mover(e: PointerEvent<HTMLDivElement>) {
    const anterior = dedos.current.get(e.pointerId)
    if (!anterior) return
    const outro = [...dedos.current].find(([id]) => id !== e.pointerId)?.[1]
    const dx = e.clientX - anterior[0],
      dy = e.clientY - anterior[1]
    if (!arrastou.current && !outro && Math.hypot(dx, dy) < 5) return
    dedos.current.set(e.pointerId, [e.clientX, e.clientY])
    const atual = tela.current
    if (!outro && atual.zoom === 1) return
    arrastou.current = true
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId)
    const { width, height, left, top } = e.currentTarget.getBoundingClientRect()
    if (!outro) {
      aplicar(ajustar(atual.zoom, atual.x + (dx * atual.zoom) / width, atual.y + (dy * atual.zoom) / height))
      return
    }
    const d = Math.hypot(anterior[0] - outro[0], anterior[1] - outro[1])
    const zoom = limitar((atual.zoom * Math.hypot(e.clientX - outro[0], e.clientY - outro[1])) / Math.max(1, d), 1, 4)
    const x = ((anterior[0] + outro[0]) / 2 - left) / width - 0.5
    const y = ((anterior[1] + outro[1]) / 2 - top) / height - 0.5
    aplicar(
      ajustar(
        zoom,
        x + dx / (2 * width) - ((x - atual.x) * zoom) / atual.zoom,
        y + dy / (2 * height) - ((y - atual.y) * zoom) / atual.zoom,
      ),
    )
  }

  const zoom = (fator: number) => {
    const proximo = limitar(navegacao.zoom * fator, 1, 4)
    aplicar(ajustar(proximo, (navegacao.x * proximo) / navegacao.zoom, (navegacao.y * proximo) / navegacao.zoom))
  }
  return (
    <div
      ref={quadro}
      className="escritorio3d-visor"
      data-ampliado={ampliado || undefined}
      data-celular={celular || undefined}
      onKeyDown={e => {
        if (e.key === 'Escape' && ampliado && !e.defaultPrevented && !quadro.current?.ownerDocument.fullscreenElement)
          ampliar(false)
      }}
    >
      <div className="escritorio3d-comandos">
        {aoMudarSala && (
          <div className="escritorio3d-salas" role="group" aria-label="Foco por sala">
            <button
              type="button"
              aria-pressed={!sala}
              onClick={() => {
                aplicar(inicial)
                aoMudarSala()
              }}
            >
              Todas
            </button>
            {salas.map(id => (
              <button
                key={id}
                type="button"
                aria-pressed={sala === id}
                onClick={() => {
                  aplicar(inicial)
                  aoMudarSala(id)
                }}
              >
                {SALAS_NOME[id]}
              </button>
            ))}
          </div>
        )}
        <div className="escritorio3d-zoom" role="group" aria-label="Câmera do escritório">
          <button
            type="button"
            aria-label="Diminuir zoom"
            disabled={navegacao.zoom === 1}
            onClick={() => zoom(1 / 1.4)}
          >
            <Minus size={18} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Aumentar zoom" disabled={navegacao.zoom === 4} onClick={() => zoom(1.4)}>
            <Plus size={18} aria-hidden="true" />
          </button>
          <button type="button" ref={fechar} onClick={() => void alternar()}>
            {ampliado ? <Minimize2 size={17} aria-hidden="true" /> : <Maximize2 size={17} aria-hidden="true" />}
            {ampliado ? 'Reduzir' : 'Ampliar'}
          </button>
        </div>
      </div>
      <div
        className="escritorio3d-gestos"
        data-zoom={navegacao.zoom > 1 || undefined}
        onPointerDown={e => {
          if (e.button !== 0) return
          if (!dedos.current.size) arrastou.current = false
          dedos.current.set(e.pointerId, [e.clientX, e.clientY])
        }}
        onPointerMove={mover}
        onPointerUp={e => {
          dedos.current.delete(e.pointerId)
        }}
        onPointerCancel={e => {
          dedos.current.delete(e.pointerId)
        }}
        onLostPointerCapture={e => {
          if (e.target === e.currentTarget) dedos.current.delete(e.pointerId)
        }}
        onPointerLeave={e => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) dedos.current.delete(e.pointerId)
        }}
        onClickCapture={e => {
          if (arrastou.current && e.detail > 0) {
            e.stopPropagation()
            arrastou.current = false
          }
        }}
      >
        {children(navegacao)}
      </div>
      {folha}
    </div>
  )
}
