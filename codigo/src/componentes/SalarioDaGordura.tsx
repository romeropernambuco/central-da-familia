import { useEffect, useState } from 'react'
import { useOlhoApp, useSessaoAtual } from '../app/contexto'
import { useConfig } from '../app/useConfig'
import { useGuardado } from '../app/useDados2'
import { useLeituraRemota } from '../app/useLeituraRemota'
import { hojeRecife } from '../lib/formato'
import { PADROES_ECONOMISTA } from '../lib/futuro'
import { rendeNoMesEstimado } from '../lib/guardado'
import { totaisGuardado } from '../lib/resumo/guardado'
import {
  fraseDoSalario,
  ipcaDosProximos12Meses,
  lerRegra,
  mesDoSalario,
  regraDeHoje,
  type MesDoSalario,
  type RegraSalario,
} from '../lib/salarioDaGordura'
import { FolhaSalarioGordura } from './FolhaSalarioGordura'
import './planilha.css'

interface Salario {
  regra: RegraSalario | null
  mes: MesDoSalario | null
  /** a regra de hoje ainda não está gravada (primeira vez ou revisão do ano) */
  gravar: boolean
  guardado: number
  doFocus: boolean
  salvar: (r: RegraSalario) => Promise<boolean>
  lido: boolean
  /** o imposto do aluguel (o mesmo do plano), para o "pode gastar" contar o aluguel líquido */
  aliqAluguel: number
}

/** O salário da gordura de hoje: a regra gravada (ou a recomendada), o mês com o rendimento e a inflação do Focus. */
export function useSalarioDaGordura(): Salario {
  const { api, familia } = useSessaoAtual()
  const { g } = useGuardado()
  const [cfg, salvar, , lido] = useConfig<unknown>('salario_gordura', null)
  const permitido = familia?.papel === 'casal' && typeof api.objetivo === 'function'
  const { dado } = useLeituraRemota(`${familia?.id}:focus`, permitido ? () => api.objetivo!(familia.id) : null, [api])
  const hoje = hojeRecife()
  const { ipca, doFocus } = ipcaDosProximos12Meses(dado?.focus, hoje)
  const guardado = g ? totaisGuardado(g).total : 0
  const deHoje = g && lido ? regraDeHoje(lerRegra(cfg), guardado, hoje.slice(0, 7)) : null
  const regra = deHoje?.regra ?? null
  const mes = g && regra ? mesDoSalario(rendeNoMesEstimado(g), guardado, ipca, regra.salario_mes) : null
  const aliq = Number(dado?.parametros?.aliq_aluguel ?? PADROES_ECONOMISTA.aliq_aluguel)
  const aliqAluguel = Number.isFinite(aliq) && aliq >= 0 && aliq < 1 ? aliq : 0
  return { regra, mes, gravar: !!deHoje?.gravar, guardado, doFocus, salvar, lido, aliqAluguel }
}

/**
 * O salário da gordura no Guardado: quanto, até quando, quanto o guardado rende e quanto a inflação come. A primeira vez
 * (e a cada 12 meses) o app grava sozinho a regra recomendada; "Mudar o percentual" mostra o impacto de cada escolha.
 * Com o olho fechado, some.
 */
export function SalarioDaGordura() {
  const { oculto } = useOlhoApp()
  const { familia } = useSessaoAtual()
  const s = useSalarioDaGordura()
  const [mudar, setMudar] = useState(false)
  const casal = familia?.papel === 'casal'
  const { regra, gravar, salvar } = s
  useEffect(() => {
    // grava a regra recomendada (ou a revisão do ano) uma vez; se falhar, nada se perde: é recalculada igual depois
    if (casal && gravar && regra) salvar(regra).catch(() => undefined)
    // grava uma vez por regra nova (o mês e o percentual mudam juntos com ela)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casal, gravar, regra?.desde, regra?.pct])
  if (!s.regra || !s.mes || oculto) return null
  const { titulo, linha, porque } = fraseDoSalario(s.regra, s.mes)
  return (
    <section className="salario-gordura" aria-label="Salário da gordura">
      <p className="salario-titulo">
        <b>{titulo}</b>
      </p>
      <p className="sub">{linha}</p>
      <details className="salario-porque">
        <summary>Por quê?</summary>
        <p className="sub">
          {porque}
          {s.doFocus ? '' : ' Inflação estimada em 5% ao ano (a previsão do Banco Central ainda não chegou).'}
        </p>
        {casal && (
          <button type="button" className="explica-l" onClick={() => setMudar(true)}>
            Mudar o percentual e ver o impacto
          </button>
        )}
      </details>
      {mudar && (
        <FolhaSalarioGordura regra={s.regra} guardado={s.guardado} salvar={s.salvar} fechar={() => setMudar(false)} />
      )}
    </section>
  )
}
