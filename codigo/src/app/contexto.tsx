import { geracaoLeitura, LeituraSubstituida } from '../lib/invalidacao'
import { FilaPendentes } from '../componentes/FilaPendentes'
import { FalhasDeLeitura } from '../componentes/FalhasDeLeitura'
import { reenviarRecusado } from './envioGuardado'
import { desfazer } from '../api/desfazer'
import { BarraDesfazer } from '../componentes/BarraDesfazer'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Api } from '../api'
import type { FamiliaMinha, LinhaExplicacao, ResumoHoje, Sessao } from '../api/tipos'
import { Explicacao, Sheet } from '../componentes/base'
import { ErroRede, ErroSessao } from '../api/erros'
import { useAvisos } from './useAvisos'
import { useOlho } from './useOlho'
import { useResumo } from './useResumo'
import { useSessao } from './useSessao'
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
  const { toastE, setToast, toast, revisarDesfazer } = useAvisos()
  const [lancarAberto, setLancar] = useState<PreLancar | null>(null)
  const [exp, setExp] = useState<Explicar | null>(null)
  const { oculto, alternarOculto } = useOlho()

  // a sessão e o resumo dividem o contador de buscas e se avisam quando a sessão acaba
  const pedido = useRef(0)
  const aoEncerrar = useRef(() => {})
  const { sessao, familia, erro, setErro, trocarSessao, finalizarSessao, sair } = useSessao(api, {
    setToast,
    pedido,
    aoEncerrar,
  })
  const {
    resumo,
    erroResumo,
    versao,
    nomesMudaram,
    recarregar,
    semRede,
    setSemRede,
    limpar: limparResumo,
  } = useResumo(api, sessao, { pedido, finalizarSessao, setErro })
  aoEncerrar.current = () => {
    limparResumo()
    setLancar(null)
    setExp(null)
  }

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
    [api, finalizarSessao, setSemRede, setToast],
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
  }, [recarregar, revisarDesfazer, trocarSessao])
  const v: Ctx = {
    api,
    sessao,
    familia,
    resumo,
    versao,
    nomesMudaram,
    recarregar,
    trocarSessao,
    sair,
    toast,
    erro,
    erroResumo,
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
        <FilaPendentes aoTentarDeNovo={gasto => void tentar(() => reenviarRecusado(novo => api.lancar(novo), gasto))} />
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
