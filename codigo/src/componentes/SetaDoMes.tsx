import { useOlhoApp } from '../app/contexto'
import { fraseDaSeta, setaDoMes } from '../lib/setaDoMes'
import { useSeparacao } from './useSeparacao'
import './planilha.css'

/**
 * A seta do mês no Início: o dinheiro entra mais do que sai, ou o contrário, e quanto por cento. Só o casal vê (gastos da
 * família inteira); com o olho fechado, some.
 */
export function SetaDoMes() {
  const { oculto } = useOlhoApp()
  const sep = useSeparacao()
  const a = sep?.agora ? setaDoMes(sep.agora) : null
  if (oculto || !a) return null
  const antes = sep?.antes ? setaDoMes(sep.antes) : null
  const { titulo, comparacao, porque } = fraseDaSeta(a, antes)
  const sobe = a.sentido === 'sobe'
  return (
    <section className="seta-mes" data-sentido={a.sentido} role="status" aria-label="O dinheiro do mês">
      <p>
        <span className="seta-mes-seta" aria-hidden="true">
          {sobe ? '▲' : '▼'}
        </span>
        <b>{titulo}</b>
      </p>
      {comparacao && <p className="sub">{comparacao}</p>}
      <details className="salario-porque">
        <summary>Por quê?</summary>
        <p className="sub">{porque}</p>
      </details>
    </section>
  )
}
