import { useEffect, useState } from 'react'
import { HORA_DA_NOITE, horaRecife, noiteForcada, turnoDe } from '../../lib/escritorio/turno'

/** A amostra do dia começa de manhã cedo e anda uns 15 segundos até a noite. */
const AMANHECER = 6,
  PASSO = 0.08

/**
 * Em que parte do dia o escritório está e se a equipe dorme. De noite todos dormem até a pessoa chamar; o chamado vale
 * enquanto a tela estiver aberta. "Ver o dia passar" corre o relógio da manhã até a noite, só para mostrar.
 * Desligado (as telas que não seguem o relógio), ninguém dorme.
 */
export function useTurno(ligado: boolean) {
  const forcada = ligado && noiteForcada()
  const [hora, setHora] = useState(() => (forcada ? HORA_DA_NOITE : horaRecife()))
  useEffect(() => {
    if (!ligado || forcada) return
    const relogio = setInterval(() => setHora(horaRecife()), 60000)
    return () => clearInterval(relogio)
  }, [ligado, forcada])
  const [acordados, setAcordados] = useState(false)
  // a hora da amostra; null = a hora de verdade
  const [ensaio, setEnsaio] = useState<number | null>(null)
  const passando = ensaio !== null && ensaio < HORA_DA_NOITE
  useEffect(() => {
    if (!passando) return
    const relogio = setInterval(() => setEnsaio(h => (h === null ? h : Math.min(HORA_DA_NOITE, h + PASSO))), 80)
    return () => clearInterval(relogio)
  }, [passando])
  const verODia = () => {
    setAcordados(false)
    // com "reduzir movimento" a amostra pula direto para a noite
    setEnsaio(matchMedia('(prefers-reduced-motion: reduce)').matches ? HORA_DA_NOITE : AMANHECER)
  }
  const turno = turnoDe(ensaio ?? hora)
  return {
    turno,
    forcada,
    acordados,
    setAcordados,
    dormem: ligado && turno === 'noite' && !acordados,
    ensaio,
    verODia,
    voltar: () => setEnsaio(null),
  }
}
