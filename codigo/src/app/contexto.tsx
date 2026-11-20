import {
  invalidarDados,
  limparLeituras,
  definirEscopoLeitura,
  useInvalidacao,
  LeituraSubstituida,
  geracaoLeitura,
} from './invalidacao'
import { encerrarAcolhimento } from '../lib/acolhimento'
import { salvamento } from './salvamento'
import { FilaPendentes } from '../componentes/FilaPendentes'
import { FalhasDeLeitura } from '../componentes/FalhasDeLeitura'
import { pendentes } from './pendentes'
import { desfazer } from './desfazer'
import { limparRascunhos } from './rascunhos'
import { BarraDesfazer } from '../componentes/BarraDesfazer'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Api } from '../api'
import type { FamiliaMinha, LinhaExplicacao, ResumoHoje, Sessao } from '../api/tipos'
import { Explicacao, Sheet } from '../componentes/base'
import { ErroRede, ErroSessao } from '../api/erros'
import { comIntervalo } from '../lib/seguro'
import { esconderValores, hojeRecife } from '../lib/formato'
import { textoPrivado } from '../lib/formato'

export interface PreLancar {
  envelope?: string
  valor?: number
  descricao?: string
  quando?: 'hoje' | 'ontem'
  /** R12: corrigir este lançamento */ corrigir?: import('../api/tipos').Lancamento
  /** R11: abre direto em "Entrou dinheiro" */ entrou?: boolean
  /** E9: veio do Atalho do iPhone (nunca salva sozinho) */ atalho?: { cartao?: string; erro?: string }
}
interface Toast {
  msg: string
  desfazer?: () => void | Promise<void>
  id: number
}
interface Explicar {
  titulo: string
  linhas: LinhaExplicacao[]
  nota?: string
  /** título da folha (padrão: "De onde veio esse número?") */ cabeca?: string
}

export interface Ctx {
  api: Api
  sessao: Sessao | null
  familia: FamiliaMinha | null
  resumo: ResumoHoje | null
  versao: number
  nomesMudaram?: () => void
  recarregar: () => Promise<void>
  trocarSessao: () => Promise<void>
  sair: () => Promise<void>
  toast: (msg: string, desfazer?: () => void | Promise<void>) => void
  /** Roda uma ação do usuário; se falhar, mostra o motivo num aviso (nunca falha calado). Devolve true se deu certo. */
  tentar: (f: () => Promise<unknown>) => Promise<boolean>
  /** true quando o aparelho está sem internet ou a última busca não chegou no banco. */
  semRede: boolean
  abrirLancar: (pre?: PreLancar) => void
  lancarAberto: PreLancar | null
  fecharLancar: () => void
  explicar: (e: Explicar) => void
  erro: string | null
  erroResumo?: string | null
  /** N12: valores escondidos neste aparelho */
  oculto: boolean
  alternarOculto: () => void
}

export const ContextoApp = createContext<Ctx | null>(null)
export const useApp = () => useContext(ContextoApp)!

export function Provedor({ api, children }: { api: Api; children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [resumo, setResumo] = useState<ResumoHoje | null>(null)
  const [versao, setVersao] = useState(0)
  const [revisaoDesfazer, revisarDesfazer] = useState(0)
  const [toastE, setToast] = useState<Toast | null>(null)
  const [lancarAberto, setLancar] = useState<PreLancar | null>(null)
  const [exp, setExp] = useState<Explicar | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const familia = sessao?.familias[0] || null
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

  // olho fechado: além do <Din>, esconde todo "R$ 1.234" que vem pronto em frase (Escritório, avisos, fichas)
  esconderValores(oculto)

  const invalidacao = useInvalidacao(api, familia?.id || '', 'resumo')
  const equipe = familia?.papel === 'equipe'
  const [semRede, setSemRede] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  const pedido = useRef(0)

  const saindo = useRef(false)
  const consultaSessao = useRef(0)
  useEffect(
    () => () => {
      consultaSessao.current++
      pedido.current++
    },
    [api],
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
      setSessao(s)
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
  }, [api])

  const encerrarSessao = useCallback(
    (avisar: boolean) => {
      consultaSessao.current++
      pedido.current++
      limparLeituras(api)
      pendentes.limpar()
      desfazer.limpar()
      salvamento.limpar()
      encerrarAcolhimento()
      limparRascunhos()
      setResumo(null)
      setFalhaResumo(null)
      setLancar(null)
      setExp(null)
      setSessao(null)
      setErro(null)
      setToast(avisar ? { msg: 'Sua sessão acabou. Entre de novo.', id: Date.now() } : null)
    },
    [api],
  )
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
  }, [api, chaveResumo, equipe, finalizarSessao, guardarResumo])
  const recarregar = useCallback(async () => {
    if (!familia) return
    invalidarDados(api, familia.id)
    setVersao(v => v + 1)
    await lerResumo()
  }, [api, chaveResumo, lerResumo])

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
  useEffect(() => {
    void lerResumo()
    return () => {
      pedido.current++
    }
  }, [lerResumo, invalidacao])
  // o login caiu sozinho (token vencido ou encerrado em outro aparelho)
  useEffect(
    () =>
      api.aoSairSessao?.(() => {
        if (!saindo.current) encerrarSessao(true)
      }),
    [api, encerrarSessao],
  )

  // O número de hoje não pode ficar velho: busca de novo quando o app volta pra frente, quando a internet volta
  // e quando vira o dia em Recife (app aberto de um dia pro outro mostrava o "pode gastar" de ontem).
  useEffect(() => {
    if (!familia) return
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
  }, [familia?.id, recarregar])

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

  const tentar = useCallback(
    async (f: () => Promise<unknown>) => {
      const geracao = geracaoLeitura(api)
      try {
        await f()
        return geracao === geracaoLeitura(api)
      } catch (e) {
        if (geracao !== geracaoLeitura(api) || e instanceof LeituraSubstituida) return false
        if (e instanceof ErroSessao) {
          await finalizarSessao(true)
          return false
        }
        if (e instanceof ErroRede) setSemRede(true)
        setToast({ msg: (e as Error).message || 'Não deu certo. Tente de novo.', id: Date.now() })
        return false
      }
    },
    [api, finalizarSessao],
  )

  useEffect(() => {
    let concluidas = desfazer.concluidas
    return desfazer.ouvir(() => {
      revisarDesfazer(n => n + 1)
      if (desfazer.concluidas !== concluidas) {
        concluidas = desfazer.concluidas
        void trocarSessao()
        void recarregar()
      }
    })
  }, [recarregar, trocarSessao])
  const v: Ctx = {
    api,
    sessao,
    familia,
    resumo: origemResumo === chaveResumo ? resumo : null,
    versao,
    nomesMudaram: () => setVersao(v => v + 1),
    recarregar,
    trocarSessao,
    sair,
    toast,
    erro,
    erroResumo: falhaResumo?.origem === chaveResumo ? falhaResumo.motivo : null,
    tentar,
    semRede,
    // E3 (conserto 6): o aviso de baixo some ao abrir o Corrigir (não fica por cima da folha nem do botão de salvar)
    abrirLancar: pre => {
      if (pre?.corrigir) setToast(null)
      setLancar(pre || {})
    },
    lancarAberto,
    fecharLancar: () => setLancar(null),
    explicar: setExp,
    oculto,
    alternarOculto,
  }
  return (
    <ContextoApp.Provider value={v}>
      <div className={sessao && familia ? 'central-app' : undefined}>
        {children}
        <BarraDesfazer />
        <FilaPendentes aoTentarDeNovo={gasto => void tentar(() => api.lancar(gasto))} />
        <FalhasDeLeitura aoTentarDeNovo={() => void recarregar()} />
        {exp && (
          <Sheet titulo={exp.cabeca || 'De onde veio esse número?'} fechar={() => setExp(null)}>
            <p className="corpo">
              <b>{textoPrivado(exp.titulo, oculto)}</b>
            </p>
            <Explicacao linhas={exp.linhas} nota={exp.nota} />
          </Sheet>
        )}
        {toastE && (
          <div className="toast" style={desfazer.atual ? { bottom: 150 } : undefined} role="status" key={toastE.id}>
            <span>{textoPrivado(toastE.msg, oculto)}</span>
            {toastE.desfazer && (
              <button
                type="button"
                onClick={() => {
                  const d = toastE.desfazer!
                  setToast(null)
                  tentar(async () => {
                    await d()
                  })
                }}
              >
                Desfazer
              </button>
            )}
          </div>
        )}
      </div>
    </ContextoApp.Provider>
  )
}
