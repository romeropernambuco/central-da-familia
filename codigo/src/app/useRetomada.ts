import { useEffect } from 'react'
import { hojeRecife } from '../lib/formato'
import { comIntervalo } from '../lib/seguro'

/**
 * O número de hoje não pode ficar velho: busca de novo quando o app volta pra frente, quando a internet volta
 * e quando vira o dia em Recife (app aberto de um dia pro outro mostrava o "pode gastar" de ontem).
 */
export function useRetomada(
  familiaId: string | undefined,
  recarregar: () => Promise<void>,
  setSemRede: (sem: boolean) => void,
) {
  useEffect(() => {
    if (!familiaId) return
    const pode = comIntervalo(4000)
    let dia = hojeRecife()
    const voltar = () => {
      if (document.visibilityState === 'visible' && pode()) recarregar()
    }
    const rede = () => {
      setSemRede(navigator.onLine === false)
      if (navigator.onLine !== false) recarregar()
    }
    const relogio = setInterval(() => {
      const h = hojeRecife()
      if (h !== dia) {
        dia = h
        recarregar()
      }
    }, 30000)
    document.addEventListener('visibilitychange', voltar)
    addEventListener('focus', voltar)
    addEventListener('online', rede)
    addEventListener('offline', rede)
    return () => {
      clearInterval(relogio)
      document.removeEventListener('visibilitychange', voltar)
      removeEventListener('focus', voltar)
      removeEventListener('online', rede)
      removeEventListener('offline', rede)
    }
  }, [familiaId, recarregar, setSemRede])
}
