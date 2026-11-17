import { useId } from 'react'
import { Ilustracao, type NomeIlustracao } from './ilustracoes'
import './ilustracoes/estado-vazio.css'

export interface EstadoVazioProps {
  ilustracao: NomeIlustracao
  titulo: string
  frase: string
  acao?: { texto: string; aoClicar: () => void; desabilitada?: boolean }
}

/** Não recebe dados financeiros nem muda sua aparência com valores ocultos. */
export function EstadoVazio({ ilustracao, titulo, frase, acao }: EstadoVazioProps) {
  const id = useId()
  return <section className="cf-estado-vazio" aria-labelledby={id}>
    <Ilustracao nome={ilustracao} />
    <h2 id={id}>{titulo}</h2>
    <p>{frase}</p>
    {acao && <button type="button" disabled={acao.desabilitada} onClick={acao.aoClicar}>{acao.texto}</button>}
  </section>
}
