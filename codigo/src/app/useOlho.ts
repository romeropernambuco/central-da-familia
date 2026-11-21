import { esconderValores } from '../lib/olho'
import { useCallback, useState } from 'react'

/**
 * O olho fechado: valores escondidos neste aparelho (N12). A escolha fica guardada no aparelho e vale também para
 * todo "R$ 1.234" que vem pronto em frase (Escritório, avisos, fichas), não só para o <Din>.
 */
export function useOlho() {
  const [oculto, setOculto] = useState(() => {
    try {
      const o = localStorage.getItem('esconder_valores') === '1'
      esconderValores(o)
      return o
    } catch {
      return false
    }
  })
  const alternarOculto = useCallback(
    () =>
      setOculto(o => {
        const n = !o
        esconderValores(n)
        try {
          localStorage.setItem('esconder_valores', n ? '1' : '0')
        } catch {
          /* sem armazenamento */
        }
        return n
      }),
    [],
  )
  // a cada desenho: o formatador precisa saber do olho antes de qualquer tela montar suas frases
  esconderValores(oculto)
  return { oculto, alternarOculto }
}
