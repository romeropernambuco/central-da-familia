import { useOlhoApp } from '../app/contexto'
import { fraseDaSeparacao } from '../lib/separacao'
import { Din } from './base'
import { useSeparacao } from './useSeparacao'
import './planilha.css'

/**
 * "Você está gastando até tanto; não pode gastar isso; está no limite": a separação entre o que entra no mês, o lucro da
 * gordura e a gordura, no mês de hoje. Só o casal vê (gastos da família inteira). Com o olho fechado, some.
 */
export function SeparacaoDoMes() {
  const { oculto } = useOlhoApp()
  const s = useSeparacao()?.agora
  if (oculto || !s) return null
  const { titulo, frase } = fraseDaSeparacao(s)
  // verde com folga, âmbar no limite, vermelho quando passou (o pedaço que passou sai da gordura)
  const cor = s.situacao === 'folga' ? 'ok' : s.situacao === 'limite' ? 'warn' : 'erro'
  const pct = Math.min(100, Math.round((s.gasto / s.pode) * 100))
  return (
    <section
      className="separacao-mes"
      role="status"
      aria-label="Quanto dá para gastar neste mês"
      data-situacao={s.situacao}
    >
      <div className="tres-numeros">
        <div>
          <small>Pode gastar sem tocar na gordura</small>
          <Din v={s.pode} />
        </div>
        <div>
          <small>Já foi</small>
          <Din v={s.gasto} />
        </div>
        <div className={cor}>
          <small>
            {s.situacao === 'passou'
              ? 'Passou (sai da gordura)'
              : s.situacao === 'limite'
                ? 'No limite: ainda dá'
                : 'Ainda dá'}
          </small>
          <Din v={Math.abs(s.folga)} />
        </div>
      </div>
      <div className={`meter ${cor}`} role="img" aria-label={`${pct}% do que dá para gastar sem tocar na gordura`}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <p className="sub">
        <b>{titulo}.</b> {frase}
      </p>
    </section>
  )
}
