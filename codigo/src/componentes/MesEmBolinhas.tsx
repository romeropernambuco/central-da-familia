import type { CSSProperties } from 'react'
import { diasNoMes, plural } from '../lib/formato'
import './mes-em-bolinhas.css'

type Estado = 'dentro' | 'passou' | 'sem' | 'hoje' | 'futuro'
const NOME: Record<Estado, string> = {
  dentro: 'dentro do valor do dia',
  passou: 'passou do valor do dia',
  sem: 'sem anotação',
  hoje: 'hoje',
  futuro: 'ainda vai chegar',
}
const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/**
 * O mês em bolinhas (24/11/2026): cada dia mostra se ficou dentro do valor do dia, passou ou ficou sem anotar.
 * Explica a sobra sem conta. Com o olho fechado não aparece.
 */
export function MesEmBolinhas({
  hoje,
  porDia,
  base,
  anotados,
  oculto,
}: {
  hoje: string
  porDia: Record<string, number>
  base: number
  anotados: Set<string>
  oculto: boolean
}) {
  if (oculto) return null
  const mes = hoje.slice(0, 7)
  const total = diasNoMes(hoje)
  const [a, m] = mes.split('-').map(Number)
  const vazio = new Date(Date.UTC(a, m - 1, 1)).getUTCDay()
  const dias = Array.from({ length: total }, (_, i) => {
    const d = `${mes}-${String(i + 1).padStart(2, '0')}`
    const estado: Estado =
      d > hoje
        ? 'futuro'
        : d === hoje
          ? 'hoje'
          : !anotados.has(d)
            ? 'sem'
            : (porDia[d] || 0) <= base
              ? 'dentro'
              : 'passou'
    return { d, n: i + 1, estado }
  })
  const conta = (e: Estado) => dias.filter(x => x.estado === e).length
  const dentro = conta('dentro'),
    passou = conta('passou'),
    sem = conta('sem')
  return (
    <div className="bolinhas">
      <p className="bolinhas-titulo">
        <b>{plural(dentro, 'dia dentro', 'dias dentro')}</b>
        {passou > 0 && <> · {plural(passou, 'passou', 'passaram')}</>}
        {sem > 0 && <> · {plural(sem, 'sem anotar', 'sem anotar')}</>}
      </p>
      <ol className="bolinhas-grade" aria-label="Seu mês dia a dia">
        {SEMANA.map((s, i) => (
          <li key={'s' + i} className="bolinhas-sem" aria-hidden="true">
            {s}
          </li>
        ))}
        {Array.from({ length: vazio }, (_, i) => (
          <li key={'v' + i} aria-hidden="true" />
        ))}
        {dias.map(x => (
          <li
            key={x.d}
            className={'bolinha ' + x.estado}
            style={{ '--i': x.n } as CSSProperties}
            aria-label={`Dia ${x.n}: ${NOME[x.estado]}`}
          >
            <span aria-hidden="true">{x.n}</span>
          </li>
        ))}
      </ol>
      <p className="bolinhas-legenda" aria-hidden="true">
        <span className="dentro">dentro</span>
        <span className="passou">passou</span>
        <span className="sem">sem anotar</span>
      </p>
    </div>
  )
}
