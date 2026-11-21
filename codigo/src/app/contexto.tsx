import { textoPrivado } from '../lib/olho'
import { geracaoLeitura, LeituraSubstituida } from '../lib/invalidacao'
import { FilaPendentes } from '../componentes/FilaPendentes'
import { FalhasDeLeitura } from '../componentes/FalhasDeLeitura'
import { reenviarRecusado } from './envioGuardado'
import { desfazer } from '../api/desfazer'
import { BarraDesfazer } from '../componentes/BarraDesfazer'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Api } from '../api'
import type { FamiliaMinha, LinhaExplicacao, ResumoHoje, Sessao } from '../api/tipos'
import { Explicacao, Sheet } from '../componentes/base'
import { ErroRede, ErroSessao } from '../api/erros'
import { useAvisos, type Toast } from './useAvisos'
import { useOlho } from './useOlho'
import { useResumo } from './useResumo'
import { useSessao } from './useSessao'

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

// O contexto é entregue em cinco partes. Cada tela assina só a parte que usa: quando aparece um aviso ou abre a
// folha de anotar, quem só precisa saber "qual é a família" não é desenhado de novo.
/** Quem está dentro do app. Muda só ao entrar, trocar de pessoa ou sair. */
export type ParteSessao = Pick<Ctx, 'api' | 'sessao' | 'familia' | 'erro'>
/** O que a tela pode mandar fazer. São sempre as mesmas funções: assinar esta parte nunca causa novo desenho. */
export type ParteAcoes = Pick<
  Ctx,
  | 'recarregar'
  | 'trocarSessao'
  | 'sair'
  | 'toast'
  | 'tentar'
  | 'abrirLancar'
  | 'fecharLancar'
  | 'explicar'
  | 'alternarOculto'
  | 'nomesMudaram'
>
/** Os números de hoje e o sinal de que algo foi gravado (versao). */
export type ParteDados = Pick<Ctx, 'resumo' | 'erroResumo' | 'versao' | 'semRede'>
export type ParteOlho = Pick<Ctx, 'oculto'>
export type ParteLancar = Pick<Ctx, 'lancarAberto'>

const CtxSessao = createContext<ParteSessao | null>(null)
const CtxAcoes = createContext<ParteAcoes | null>(null)
const CtxDados = createContext<ParteDados | null>(null)
const CtxOlho = createContext<ParteOlho | null>(null)
const CtxLancar = createContext<ParteLancar | null>(null)
/**
 * O contexto inteiro num objeto só. O app de verdade não preenche este: quem preenche são os testes e as prévias,
 * que montam uma tela sozinha com `<ContextoApp.Provider value={...}>`. As partes abaixo aceitam os dois caminhos.
 */
export const ContextoApp = createContext<Ctx | null>(null)

/** Quem está dentro do app: api, sessão, família e o erro de entrada. */
export function useSessaoAtual(): ParteSessao {
  const parte = useContext(CtxSessao)
  const inteiro = useContext(ContextoApp)
  return (parte ?? inteiro)!
}
/** As ações: avisar, tentar, recarregar, abrir a folha de anotar, explicar um número, sair. */
export function useAcoes(): ParteAcoes {
  const parte = useContext(CtxAcoes)
  const inteiro = useContext(ContextoApp)
  return (parte ?? inteiro)!
}
/** O resumo de hoje, o erro dele, a versão dos dados e se está sem internet. */
export function useDadosDoDia(): ParteDados {
  const parte = useContext(CtxDados)
  const inteiro = useContext(ContextoApp)
  return (parte ?? inteiro)!
}
/** Só o olho: fechado ou aberto. */
export function useOlhoApp(): ParteOlho {
  const parte = useContext(CtxOlho)
  const inteiro = useContext(ContextoApp)
  return (parte ?? inteiro)!
}
/** Só a folha de anotar: aberta (e com o quê) ou fechada. */
export function useFolhaLancar(): ParteLancar {
  const parte = useContext(CtxLancar)
  const inteiro = useContext(ContextoApp)
  return (parte ?? inteiro)!
}
/** Tudo de uma vez. Quem usa é desenhado de novo a cada mudança de qualquer parte: prefira a parte certa acima. */
export function useApp(): Ctx {
  const inteiro = useContext(ContextoApp)
  const sessao = useContext(CtxSessao)
  const acoes = useContext(CtxAcoes)
  const dados = useContext(CtxDados)
  const olho = useContext(CtxOlho)
  const lancar = useContext(CtxLancar)
  const junto = useMemo(
    () => (sessao && acoes && dados && olho && lancar ? { ...sessao, ...acoes, ...dados, ...olho, ...lancar } : null),
    [sessao, acoes, dados, olho, lancar],
  )
  return (inteiro ?? junto)!
}

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

  // E3 (conserto 6): o aviso de baixo some ao abrir o Corrigir (não fica por cima da folha nem do botão de salvar)
  const abrirLancar = useCallback(
    (pre?: PreLancar) => {
      if (pre?.corrigir) setToast(null)
      setLancar(pre || {})
    },
    [setToast],
  )
  const fecharLancar = useCallback(() => setLancar(null), [])

  // cada parte só vira objeto novo quando algo dela muda; é isso que poupa o desenho das telas
  const parteSessao = useMemo(() => ({ api, sessao, familia, erro }), [api, sessao, familia, erro])
  const parteAcoes = useMemo(
    () => ({
      recarregar,
      trocarSessao,
      sair,
      toast,
      tentar,
      abrirLancar,
      fecharLancar,
      explicar: setExp,
      alternarOculto,
      nomesMudaram,
    }),
    [recarregar, trocarSessao, sair, toast, tentar, abrirLancar, fecharLancar, alternarOculto, nomesMudaram],
  )
  const parteDados = useMemo(() => ({ resumo, erroResumo, versao, semRede }), [resumo, erroResumo, versao, semRede])
  const parteOlho = useMemo(() => ({ oculto }), [oculto])
  const parteLancar = useMemo(() => ({ lancarAberto }), [lancarAberto])
  return (
    // dentro do app vale sempre o que este provedor entrega: um contexto inteiro vindo de fora (teste) não passa daqui
    <ContextoApp.Provider value={null}>
      <CtxSessao.Provider value={parteSessao}>
        <CtxAcoes.Provider value={parteAcoes}>
          <CtxDados.Provider value={parteDados}>
            <CtxOlho.Provider value={parteOlho}>
              <CtxLancar.Provider value={parteLancar}>
                <div className={sessao && familia ? 'central-app' : undefined}>
                  {children}
                  <Moldura
                    exp={exp}
                    fecharExp={() => setExp(null)}
                    aviso={toastE}
                    fecharAviso={() => setToast(null)}
                    oculto={oculto}
                    tentar={tentar}
                    reenviar={gasto => void tentar(() => reenviarRecusado(novo => api.lancar(novo), gasto))}
                    recarregar={recarregar}
                  />
                </div>
              </CtxLancar.Provider>
            </CtxOlho.Provider>
          </CtxDados.Provider>
        </CtxAcoes.Provider>
      </CtxSessao.Provider>
    </ContextoApp.Provider>
  )
}

/** O que fica por cima de qualquer tela: desfazer, fila de envios, leituras que falharam, a folha de explicação e o aviso. */
function Moldura({
  exp,
  fecharExp,
  aviso,
  fecharAviso,
  oculto,
  tentar,
  reenviar,
  recarregar,
}: {
  exp: Explicar | null
  fecharExp: () => void
  aviso: Toast | null
  fecharAviso: () => void
  oculto: boolean
  tentar: Ctx['tentar']
  reenviar: Parameters<typeof FilaPendentes>[0]['aoTentarDeNovo']
  recarregar: () => Promise<void>
}) {
  return (
    <>
      <BarraDesfazer />
      <FilaPendentes aoTentarDeNovo={reenviar} />
      <FalhasDeLeitura aoTentarDeNovo={() => void recarregar()} />
      {exp && (
        <Sheet titulo={exp.cabeca || 'De onde veio esse número?'} fechar={fecharExp}>
          <p className="corpo">
            <b>{textoPrivado(exp.titulo, oculto)}</b>
          </p>
          <Explicacao linhas={exp.linhas} nota={exp.nota} />
        </Sheet>
      )}
      {aviso && (
        <div className="toast" style={desfazer.atual ? { bottom: 150 } : undefined} role="status" key={aviso.id}>
          <span>{textoPrivado(aviso.msg, oculto)}</span>
          {aviso.desfazer && (
            <button
              type="button"
              onClick={() => {
                const d = aviso.desfazer!
                fecharAviso()
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
    </>
  )
}
