import { ResumoFamilia } from './ResumoFamilia'
import './inicio.css'
import { lerLancamentosMes } from '../../lib/resumo/leituras'
import { useApp } from '../../app/contexto'
import { useLeituraRemota } from '../../app/useLeituraRemota'
import { Din } from '../../componentes/base'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { textoPrivado } from '../../componentes/privacidade'
import { hojeRecife } from '../../lib/formato'
import { lazy, Suspense } from 'react'
const EscritorioIsometrico = lazy(() => import('../escritorio/EscritorioIsometrico').then(m => ({ default: m.EscritorioIsometrico })))
export { porDiaDe } from '../../lib/resumo/porDia'
export function Inicio() {
  const { familia } = useApp()
  return familia?.papel !== 'equipe' ? <InicioFamilia /> : null
}
function InicioFamilia() {
  const { api, familia, versao, abrirLancar } = useApp()
  const r = useLeituraRemota('inicio-ultimos', familia ? () => lerLancamentosMes(api, familia.id, hojeRecife().slice(0, 7)) : null, [api, versao], 'lancamentos')
  return <div className="view inicio-f29">
    <Suspense fallback={null}><EscritorioIsometrico superficie="inicio" /></Suspense>
    <ResumoFamilia />
    <section className="card inicio-lancamentos"><div className="card-h"><h2>Últimos lançamentos</h2><a href="#/lancamentos">Ver todos</a></div>
      {r.carregando ? <p className="resumo-esqueleto" role="status">Conferindo...</p> : r.erro ? <p role="alert">Não foi possível conferir <button onClick={r.repetir}>Tentar de novo</button></p> : r.dado?.filter(x => !x.apagado_em).length ? <ul className="list">{r.dado.filter(x => !x.apagado_em).slice(0, 4).map(l => <li className="li" key={l.id}><span className="m">{textoPrivado(l.descricao)}</span><Din v={l.valor} /></li>)}</ul> : r.dado ? <SemGastosInicio anotar={() => abrirLancar()} /> : null}
    </section>
  </div>
}
export function SemGastosInicio({ anotar }: { anotar: () => void }) {
  return <EstadoVazio ilustracao="SemGastos" titulo="Nenhum gasto ainda" frase="É só o valor e 1 toque." acao={{ texto: 'Anotar gasto', aoClicar: anotar }} />
}
