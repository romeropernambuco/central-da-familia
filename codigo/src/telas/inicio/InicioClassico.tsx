import { UltimosLancamentos } from './UltimosLancamentos'
import { ResumoFamilia } from './ResumoFamilia'
import './inicio.css'
import { useSessaoAtual } from '../../app/contexto'
import { lazy, Suspense } from 'react'
const EscritorioIsometrico = lazy(() =>
  import('../escritorio/EscritorioIsometrico').then(m => ({ default: m.EscritorioIsometrico })),
)
export { porDiaDe } from '../../lib/resumo/porDia'
export function InicioClassico() {
  const { familia } = useSessaoAtual()
  return familia?.papel !== 'equipe' ? <InicioFamilia /> : null
}
function InicioFamilia() {
  return (
    <div className="view inicio-f29">
      <Suspense fallback={null}>
        <EscritorioIsometrico superficie="inicio" />
      </Suspense>
      <ResumoFamilia />
      <UltimosLancamentos />
    </div>
  )
}
