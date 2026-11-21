import { useCallback, useEffect, useState, type MutableRefObject } from 'react'
import type { Api } from '../api'
import { ErroRede, ErroSessao } from '../api/erros'
import type { ResumoHoje, Sessao } from '../api/tipos'
import { limparFalhasDeLeitura } from './falhasDeLeitura'
import { geracaoLeitura, invalidarDados, LeituraSubstituida } from '../lib/invalidacao'
import { useInvalidacao } from './useInvalidacao'
import { useRetomada } from './useRetomada'

interface Ligacoes {
  /** Contador das buscas: só a última pedida vale. A sessão também sobe esse número quando troca ou acaba. */
  pedido: MutableRefObject<number>
  finalizarSessao: (avisar: boolean) => Promise<void>
  setErro: (motivo: string | null) => void
}

/**
 * O resumo de hoje (o "pode gastar") e o recarregar geral. O resumo guarda de quem ele é: se a pessoa ou a família
 * mudar, o número antigo não aparece nem por um instante. Quem é da equipe nunca recebe resumo.
 */
export function useResumo(api: Api, sessao: Sessao | null, { pedido, finalizarSessao, setErro }: Ligacoes) {
  const familia = sessao?.familias[0] || null
  const [resumo, setResumo] = useState<ResumoHoje | null>(null)
  const [versao, setVersao] = useState(0)
  const chaveResumo = JSON.stringify([api.modo, sessao?.userId, familia?.id, familia?.membroId, familia?.papel])
  const [origemResumo, setOrigemResumo] = useState('')
  const [falhaResumo, setFalhaResumo] = useState<{ origem: string; motivo: string } | null>(null)
  const guardarResumo = useCallback(
    (r: ResumoHoje) => {
      setResumo(r)
      setOrigemResumo(chaveResumo)
    },
    [chaveResumo],
  )

  const invalidacao = useInvalidacao(api, familia?.id || '', 'resumo')
  const equipe = familia?.papel === 'equipe'
  const [semRede, setSemRede] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)

  const lerResumo = useCallback(async () => {
    if (!familia) return
    // 2 buscas ao mesmo tempo (foco + lançamento, ou 2 celulares): só a última pedida vale, a mais velha é descartada
    const meu = ++pedido.current,
      geracao = geracaoLeitura(api)
    const atual = () => meu === pedido.current && geracao === geracaoLeitura(api)
    if (equipe) {
      setResumo(null)
      return
    }
    try {
      const r = await api.resumoHoje(familia.id)
      if (!atual()) return
      guardarResumo(r)
      setFalhaResumo(null)
      setErro(null)
      setSemRede(false)
    } catch (e) {
      if (!atual() || e instanceof LeituraSubstituida) return
      if (e instanceof ErroSessao) {
        await finalizarSessao(true)
        return
      }
      if (e instanceof ErroRede) setSemRede(true)
      const motivo = (e as Error).message
      setFalhaResumo({ origem: chaveResumo, motivo })
      setErro(motivo)
    }
  }, [api, chaveResumo, equipe, familia, finalizarSessao, guardarResumo, pedido, setErro])
  const recarregar = useCallback(async () => {
    if (!familia) return
    // as leituras vão rodar de novo: o que falhar agora volta para a faixa; o que der certo some dela
    limparFalhasDeLeitura()
    invalidarDados(api, familia.id)
    setVersao(v => v + 1)
    await lerResumo()
  }, [api, familia, lerResumo])

  useEffect(() => {
    void lerResumo()
    const contador = pedido
    return () => {
      contador.current++
    }
  }, [lerResumo, invalidacao, pedido])

  useRetomada(familia?.id, recarregar, setSemRede)

  const nomesMudaram = useCallback(() => setVersao(v => v + 1), [])
  /** Apaga o resumo e a falha guardada: usado quando a sessão acaba. */
  const limpar = useCallback(() => {
    setResumo(null)
    setFalhaResumo(null)
  }, [])

  return {
    resumo: origemResumo === chaveResumo ? resumo : null,
    erroResumo: falhaResumo?.origem === chaveResumo ? falhaResumo.motivo : null,
    versao,
    nomesMudaram,
    recarregar,
    semRede,
    setSemRede,
    limpar,
  }
}
