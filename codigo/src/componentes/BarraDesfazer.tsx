import './apoio-f32.css'
import { Icone } from './Icone'
import { salvamento } from '../app/salvamento'
import { useEffect, useState } from 'react'
import { desfazer } from '../app/desfazer'
export function BarraDesfazer() {
  const [, mudar] = useState(0)
  const [pausado, pausar] = useState(false)
  useEffect(() => desfazer.ouvir(() => mudar(n => n + 1)), [])
  useEffect(() => salvamento.ouvir(() => mudar(n => n + 1)), [])
  const a = desfazer.atual
  useEffect(() => {
    if (!a || pausado || desfazer.erro || desfazer.ocupado) return
    const t = setTimeout(() => desfazer.dispensar(), 10000)
    return () => clearTimeout(t)
  }, [a, pausado, desfazer.erro, desfazer.ocupado])
  if (!a)
    return salvamento.estado ? (
      <p className="todo f32-feedback" role="status">
        {salvamento.aviso || salvamento.estado}
      </p>
    ) : null
  return (
    <div
      className="toast f32-feedback"
      role="status"
      aria-live="polite"
      onMouseEnter={() => pausar(true)}
      onMouseLeave={() => pausar(false)}
      onFocus={() => pausar(true)}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) pausar(false)
      }}
    >
      <Icone nome="salvo" />
      <span>
        {desfazer.erro
          ? desfazer.mensagem || 'Não foi possível desfazer. Tente de novo.'
          : a.rotulo === 'Envio agendado'
            ? 'Vai enviar em 6 segundos.'
            : salvamento.estado || 'Feito.'}
      </span>
      <button
        type="button"
        aria-label={desfazer.erro ? 'Tentar desfazer de novo' : 'Desfazer Última ação'}
        disabled={desfazer.ocupado}
        onClick={() => void desfazer.executar()}
      >
        <Icone nome="desfazer" />
        {desfazer.erro ? 'Tentar de novo' : 'Desfazer'}
      </button>
      <button type="button" aria-label="Manter aviso de desfazer" onClick={() => pausar(true)}>
        Manter aviso
      </button>
    </div>
  )
}
