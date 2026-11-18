import { useId, type ReactNode } from 'react'
import './ilustracoes/estado-vazio.css'

export interface PropsEstadoVazio {
  titulo: string
  frase: string
  acao?: { texto: string; aoClicar: () => void; desabilitada?: boolean }
}

/** Não recebe dados financeiros nem muda sua aparência com valores ocultos. */
export function EstadoVazioVisual({ ilustracao, titulo, frase, acao }: PropsEstadoVazio & { ilustracao: ReactNode }) {
  const id = useId()
  return <section className="cf-estado-vazio" aria-labelledby={id}>
    {ilustracao}
    <h2 id={id}>{titulo}</h2>
    <p>{frase}</p>
    {acao && <button type="button" disabled={acao.desabilitada} onClick={acao.aoClicar}>{acao.texto}</button>}
  </section>
}
