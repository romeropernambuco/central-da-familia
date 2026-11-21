import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { Api } from '../api'
import { ErroRede, ErroSessao } from '../api/erros'
import type { Sessao } from '../api/tipos'
import { encerrarAcolhimento } from '../lib/acolhimento'
import { desfazer } from '../api/desfazer'
import { limparFalhasDeLeitura } from './falhasDeLeitura'
import { definirEscopoLeitura, geracaoLeitura, LeituraSubstituida, limparLeituras } from '../lib/invalidacao'
import { pendentes } from '../api/pendentes'
import { definirDonoDosPendentes } from '../api/pendentesGuardados'
import { limparRascunhos } from './rascunhos'
import { salvamento } from '../api/salvamento'
import type { Toast } from './useAvisos'

interface Ligacoes {
  setToast: (t: Toast | null) => void
  /** Contador das buscas do resumo: subir o número descarta a busca que ainda está no caminho. */
  pedido: MutableRefObject<number>
  /** O que mais precisa ser apagado da tela quando a sessão acaba (resumo, folhas abertas). */
  aoEncerrar: MutableRefObject<() => void>
}

/**
 * Quem está dentro do app: busca a sessão, troca de pessoa e encerra. Ao encerrar, apaga do aparelho tudo o que era
 * da pessoa anterior (leituras, pendentes, rascunhos, desfazer), para a próxima não ver nada dela.
 */
export function useSessao(api: Api, { setToast, pedido, aoEncerrar }: Ligacoes) {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const familia = sessao?.familias[0] || null

  const saindo = useRef(false)
  const consultaSessao = useRef(0)
  useEffect(
    () => () => {
      consultaSessao.current++
      pedido.current++
    },
    [api, pedido],
  )
  const sessaoAtual = useRef(sessao)
  sessaoAtual.current = sessao
  const trocarSessao = useCallback(async () => {
    if (saindo.current) return
    const meu = ++consultaSessao.current
    setToast(null) // O aviso pertence à pessoa que iniciou esta ação.
    try {
      const s = await api.sessao()
      if (meu !== consultaSessao.current) return
      const geracao = geracaoLeitura(api)
      definirEscopoLeitura(api, s?.userId || '', s?.familias[0] || null)
      if (geracao !== geracaoLeitura(api)) pedido.current++
      // sessão igual à que já estava: guarda o mesmo objeto, para ninguém buscar tudo de novo à toa
      setSessao(antes => (antes && s && JSON.stringify(antes) === JSON.stringify(s) ? antes : s))
      setErro(null)
    } catch (e) {
      if (meu !== consultaSessao.current || e instanceof LeituraSubstituida) return
      // Oscilação de rede com a pessoa já dentro do app: ela continua onde estava, com o que já tinha carregado.
      // Cair para a tela de entrar aqui fazia parecer que a conta tinha saído.
      if (e instanceof ErroRede && sessaoAtual.current) {
        setToast({ msg: 'Sem internet agora. Mostrando o que já estava carregado.', id: Date.now() })
        return
      }
      pedido.current++
      limparLeituras(api)
      setSessao(null)
      // sessão vencida não é erro pra mostrar: a tela de entrar já explica
      setErro(e instanceof ErroSessao ? null : (e as Error).message)
    }
  }, [api, pedido, setToast])

  const encerrarSessao = useCallback(
    (avisar: boolean) => {
      consultaSessao.current++
      pedido.current++
      limparLeituras(api)
      limparFalhasDeLeitura()
      definirDonoDosPendentes('')
      pendentes.limpar()
      desfazer.limpar()
      salvamento.limpar()
      encerrarAcolhimento()
      limparRascunhos()
      aoEncerrar.current()
      setSessao(null)
      setErro(null)
      setToast(avisar ? { msg: 'Sua sessão acabou. Entre de novo.', id: Date.now() } : null)
    },
    [api, aoEncerrar, pedido, setToast],
  )
  /** Encerra aqui e avisa o servidor. `avisar` mostra "Sua sessão acabou" (quando não foi a pessoa que pediu). */
  const finalizarSessao = useCallback(
    async (avisar: boolean) => {
      if (saindo.current) return
      saindo.current = true
      encerrarSessao(avisar)
      try {
        await api.sair()
      } catch {
        /* a sessão do app já foi limpa */
      } finally {
        saindo.current = false
      }
    },
    [api, encerrarSessao],
  )
  const sair = useCallback(() => finalizarSessao(false), [finalizarSessao])

  useEffect(() => {
    try {
      localStorage.removeItem('marco_visto')
    } catch {
      /* sem armazenamento */
    }
  }, [])
  useEffect(() => {
    trocarSessao()
  }, [trocarSessao])
  // o login caiu sozinho (token vencido ou encerrado em outro aparelho)
  useEffect(
    () =>
      api.aoSairSessao?.(() => {
        if (!saindo.current) encerrarSessao(true)
      }),
    [api, encerrarSessao],
  )

  return { sessao, familia, erro, setErro, trocarSessao, finalizarSessao, sair }
}
