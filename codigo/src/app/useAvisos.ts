import { useCallback, useEffect, useState } from 'react'
import { desfazer } from '../api/desfazer'

export interface Toast {
  msg: string
  desfazer?: () => void | Promise<void>
  id: number
}

/** O aviso de baixo da tela: um por vez, some sozinho e dá folga na página enquanto está visível. */
export function useAvisos() {
  const [toastE, setToast] = useState<Toast | null>(null)
  const [revisaoDesfazer, revisarDesfazer] = useState(0)

  // trocar de aba apaga o aviso comum; o que tem Desfazer continua
  useEffect(() => {
    const f = () => setToast(t => (t?.desfazer ? t : null))
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  const toast = useCallback((msg: string, inverso?: () => void | Promise<void>) => {
    if (inverso) {
      desfazer.registrar({
        rotulo: 'Última ação',
        desfazer: async () => {
          await inverso()
          return true
        },
      })
      setToast(null)
    } else setToast({ msg, id: Date.now() })
  }, [])
  // E3 (conserto 6): com o aviso na tela, a página ganha folga embaixo: nada fica escondido atrás dele (Lançar um gasto, Por que mudou?)
  useEffect(() => {
    document.body.classList.toggle('com-aviso', !!toastE || !!desfazer.atual)
    return () => document.body.classList.remove('com-aviso')
  }, [toastE, revisaoDesfazer])
  useEffect(() => {
    if (!toastE) return
    // com Desfazer o aviso fica 10 s (dá tempo de ler e tocar); sem, 4 s
    const t = setTimeout(() => setToast(null), toastE.desfazer ? 10000 : 4000)
    return () => clearTimeout(t)
  }, [toastE])

  return { toastE, setToast, toast, /** chamado quando a barra de Desfazer muda */ revisarDesfazer }
}
