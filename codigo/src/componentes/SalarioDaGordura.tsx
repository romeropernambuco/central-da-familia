import { useOlhoApp, useSessaoAtual } from '../app/contexto'
import { useGuardado } from '../app/useDados2'
import { useLeituraRemota } from '../app/useLeituraRemota'
import { hojeRecife } from '../lib/formato'
import { rendeNoMesEstimado } from '../lib/guardado'
import { totaisGuardado } from '../lib/resumo/guardado'
import {
  fraseDoSalario,
  ipcaDosProximos12Meses,
  salarioDaGordura,
  type SalarioDaGordura as Divisao,
} from '../lib/salarioDaGordura'

/** A divisão do rendimento do mês (salário da gordura x o que fica guardado), com o IPCA do Focus. Sem guardado: null. */
export function useSalarioDaGordura(): { s: Divisao | null; doFocus: boolean } {
  const { api, familia } = useSessaoAtual()
  const { g } = useGuardado()
  const permitido = familia?.papel === 'casal' && typeof api.objetivo === 'function'
  const { dado } = useLeituraRemota(`${familia?.id}:focus`, permitido ? () => api.objetivo!(familia.id) : null, [api])
  const { ipca, doFocus } = ipcaDosProximos12Meses(dado?.focus, hojeRecife())
  if (!g) return { s: null, doFocus }
  return { s: salarioDaGordura(rendeNoMesEstimado(g), totaisGuardado(g).total, ipca), doFocus }
}

/** O que o guardado rende, quanto a inflação come e o salário da gordura (regra do dono). Com o olho fechado, some. */
export function SalarioDaGordura() {
  const { oculto } = useOlhoApp()
  const { s, doFocus } = useSalarioDaGordura()
  if (!s || oculto) return null
  return (
    <p className="sub guard-rende-mes">
      {fraseDoSalario(s)}
      {doFocus ? '' : ' (Inflação estimada em 5% ao ano: o Focus do Banco Central ainda não chegou.)'}
    </p>
  )
}
