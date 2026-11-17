import { Landmark, ChevronRight } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useGuardado } from '../../app/useDados2'
import { Din } from '../../componentes/base'
import { reais } from '../../lib/formato'
import { textoPrivado } from '../../componentes/privacidade'

export function CartaoGuardado() {
  const { familia } = useApp()
  const { g, estado } = useGuardado()
  if (familia?.papel !== 'casal' || estado === 'desligado' || !g) return null
  const vazio = !g.aplicacoes.length
  return (
    <a className="card guard-card" href="#/guardado" aria-label={vazio ? 'Guardado: começar a guardar' : `Guardado: ${reais(g.total)}. Rendeu hoje ${reais(g.rendeu_hoje_liquido)}. Abrir.`}>
      <span className="tile"><Landmark size={20} /></span>
      {vazio ? (
        <span className="m"><b>Guardado</b><small>Diga onde o dinheiro está e veja quanto ele rende por dia.</small></span>
      ) : (
        <span className="m">
          <span className="guard-l"><span>Guardado</span><Din v={g.total} /></span>
          <span className="guard-l dest"><span>Rendeu hoje</span><Din v={g.rendeu_hoje_liquido} /></span>
          {g.motivo_zero && <small>{textoPrivado(g.motivo_zero)}</small>}
        </span>
      )}
      <ChevronRight size={20} className="muted" aria-hidden="true" />
    </a>
  )
}
