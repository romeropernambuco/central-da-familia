import { textoPrivado } from '../../lib/olho'
import { totaisGuardado } from '../../lib/resumo/guardado'
import './guardado.css'
import { Icone } from '../../componentes/Icone'
import { Landmark, ChevronRight } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useGuardado } from '../../app/useDados2'
import { Din } from '../../componentes/base'
import { reais } from '../../lib/formato'

export function CartaoGuardado() {
  const { familia } = useApp()
  const { g, estado } = useGuardado()
  if (familia?.papel !== 'casal' || estado === 'desligado' || !g) return null
  const vazio = !g.aplicacoes.length
  return (
    <a
      className="card guard-card"
      href="#/guardado"
      aria-label={
        vazio
          ? 'Guardado: começar a guardar'
          : `Guardado: ${reais(totaisGuardado(g).total)}. Rendeu hoje ${reais(totaisGuardado(g).hoje)}. Abrir.`
      }
    >
      <span className="tile">
        <Icone desenho={Landmark} />
      </span>
      {vazio ? (
        <span className="m">
          <b>Guardado</b>
          <small>Diga onde o dinheiro está e veja quanto ele rende por dia.</small>
        </span>
      ) : (
        <span className="m">
          <span className="guard-l">
            <span>Guardado</span>
            <Din v={totaisGuardado(g).total} />
          </span>
          <span className="guard-l dest">
            <span>Rendeu hoje</span>
            <Din v={totaisGuardado(g).hoje} />
          </span>
          {g.motivo_zero && <small>{textoPrivado(g.motivo_zero)}</small>}
        </span>
      )}
      <Icone desenho={ChevronRight} className="muted" aria-hidden="true" />
    </a>
  )
}
