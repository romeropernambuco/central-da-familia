import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { useApp } from '../app/contexto'
import { valoresOcultos } from '../lib/formato'
export { CampoValor } from './base'
export { textoPrivado, copiarProtegido } from '../lib/formato'
import { textoPrivado } from '../lib/formato'

/** Vazio continua editável; existente só abre com o olho. */
export const CampoPrivado = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { privado?: boolean }>(function CampoPrivado({ privado = true, ...props }, ref) {
  const oculto = useApp()?.oculto ?? valoresOcultos()
  const [edicao, setEdicao] = useState(false)
  const [anterior, setAnterior] = useState(oculto)
  if (anterior !== oculto) { setAnterior(oculto); setEdicao(false) }
  const fechado = privado && oculto && !!props.value && !edicao
  return <input {...props} ref={ref} value={fechado ? '' : props.value} readOnly={fechado || props.readOnly}
    placeholder={fechado ? '•••' : textoPrivado(props.placeholder, oculto)} title={textoPrivado(props.title, oculto)}
    aria-label={props['aria-label']} onChange={e => {
      if (fechado) return
      setEdicao(oculto); props.onChange?.(e)
    }} />
})

/** Taxas e percentuais, sem prefixo de moeda e sem mudar sua conversão. */
export function CampoDecimal(props: InputHTMLAttributes<HTMLInputElement>) {
  return <CampoPrivado {...props} inputMode="decimal" />
}

