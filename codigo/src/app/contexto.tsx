import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Api } from '../api'
import type { FamiliaMinha, LinhaExplicacao, ResumoHoje, Sessao } from '../api/tipos'
import { Explicacao, Sheet } from '../componentes/base'
import { ErroRede, ErroSessao } from '../api/erros'
import { comIntervalo, resumoSemDinheiro } from '../lib/seguro'
import { hojeRecife } from '../lib/formato'

export interface PreLancar { envelope?: string; valor?: number; descricao?: string }
interface Toast { msg: string; desfazer?: () => void | Promise<void>; id: number }
interface Explicar { titulo: string; linhas: LinhaExplicacao[]; nota?: string }

export interface Ctx {
  api: Api
  sessao: Sessao | null
  familia: FamiliaMinha | null
  resumo: ResumoHoje | null
  versao: number
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
}

const C = createContext<Ctx | null>(null)
export const useApp = () => useContext(C)!

export function Provedor({ api, children }: { api: Api; children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [resumo, setResumo] = useState<ResumoHoje | null>(null)
  const [versao, setVersao] = useState(0)
  const [toastE, setToast] = useState<Toast | null>(null)
  const [lancarAberto, setLancar] = useState<PreLancar | null>(null)
  const [exp, setExp] = useState<Explicar | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const familia = sessao?.familias[0] || null

  const equipe = familia?.papel === 'equipe'
  const [semRede, setSemRede] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  const pedido = useRef(0)

  const saindo = useRef(false)
  const trocarSessao = useCallback(async () => {
    setToast(null) // aviso de uma pessoa (pode ter R$) nunca fica na tela pra próxima que entrar no mesmo aparelho
    try { setSessao(await api.sessao()); setErro(null) } catch (e) {
      setSessao(null)
      // sessão vencida não é erro pra mostrar: a tela de entrar já explica
      setErro(e instanceof ErroSessao ? null : (e as Error).message)
    }
  }, [api])

  /** Sessão caiu (token vencido, saiu em outro aparelho): limpa o que está na memória e volta pra tela de entrar. */
  const sessaoCaiu = useCallback(async () => {
    setResumo(null); setLancar(null); setExp(null)
    saindo.current = true
    try { await api.sair() } catch { /* já estava fora */ } finally { saindo.current = false }
    setSessao(null); setErro(null)
    setToast({ msg: 'Sua sessão acabou. Entre de novo.', id: Date.now() })
  }, [api])

  /** Sair por vontade própria: limpa tudo da memória e volta pra tela de entrar, sem aviso de erro. */
  const sair = useCallback(async () => {
    setResumo(null); setLancar(null); setExp(null)
    saindo.current = true
    try { await api.sair() } catch { /* sem rede: sai do aparelho do mesmo jeito */ } finally { saindo.current = false }
    await trocarSessao()
  }, [api, trocarSessao])

  const recarregar = useCallback(async () => {
    if (!familia) return
    // 2 buscas ao mesmo tempo (foco + lançamento, ou 2 celulares): só a última pedida vale, a mais velha é descartada
    const meu = ++pedido.current
    try {
      const r = await api.resumoHoje(familia.id)
      if (meu !== pedido.current) return
      // equipe da casa: nenhum valor em dinheiro fica na memória do aparelho
      setResumo(equipe ? resumoSemDinheiro(r) : r)
      setVersao(v => v + 1)
      setErro(null); setSemRede(false)
    } catch (e) {
      if (meu !== pedido.current) return
      if (e instanceof ErroSessao) { await sessaoCaiu(); return }
      if (e instanceof ErroRede) setSemRede(true)
      setErro((e as Error).message)
    }
  }, [api, familia?.id, equipe, sessaoCaiu])

  useEffect(() => { trocarSessao() }, [trocarSessao])
  useEffect(() => { setResumo(null); recarregar() }, [recarregar])
  // o login caiu sozinho (token vencido ou encerrado em outro aparelho)
  useEffect(() => api.aoSairSessao?.(() => {
    if (saindo.current) return
    setResumo(null); setLancar(null); setExp(null); setSessao(null); setErro(null)
    setToast({ msg: 'Sua sessão acabou. Entre de novo.', id: Date.now() })
  }), [api])

  // O número de hoje não pode ficar velho: busca de novo quando o app volta pra frente, quando a internet volta
  // e quando vira o dia em Recife (app aberto de um dia pro outro mostrava o "pode gastar" de ontem).
  useEffect(() => {
    if (!familia) return
    const pode = comIntervalo(4000)
    let dia = hojeRecife()
    const voltar = () => { if (document.visibilityState === 'visible' && pode()) recarregar() }
    const rede = () => { setSemRede(navigator.onLine === false); if (navigator.onLine !== false) recarregar() }
    const relogio = setInterval(() => { const h = hojeRecife(); if (h !== dia) { dia = h; recarregar() } }, 30000)
    document.addEventListener('visibilitychange', voltar)
    addEventListener('focus', voltar); addEventListener('online', rede); addEventListener('offline', rede)
    return () => { clearInterval(relogio); document.removeEventListener('visibilitychange', voltar); removeEventListener('focus', voltar); removeEventListener('online', rede); removeEventListener('offline', rede) }
  }, [familia?.id, recarregar])

  useEffect(() => { const f = () => setToast(t => (t?.desfazer ? t : null)); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  const toast = useCallback((msg: string, desfazer?: () => void | Promise<void>) => setToast({ msg, desfazer, id: Date.now() }), [])
  useEffect(() => {
    if (!toastE) return
    // com Desfazer o aviso fica 10 s (dá tempo de ler e tocar); sem, 4 s
    const t = setTimeout(() => setToast(null), toastE.desfazer ? 10000 : 4000)
    return () => clearTimeout(t)
  }, [toastE])

  const tentar = useCallback(async (f: () => Promise<unknown>) => {
    try { await f(); return true } catch (e) {
      if (e instanceof ErroSessao) { await sessaoCaiu(); return false }
      if (e instanceof ErroRede) setSemRede(true)
      setToast({ msg: (e as Error).message || 'Não deu certo. Tente de novo.', id: Date.now() })
      return false
    }
  }, [sessaoCaiu])

  const v: Ctx = {
    api, sessao, familia, resumo, versao, recarregar, trocarSessao, sair, toast, erro, tentar, semRede,
    abrirLancar: pre => setLancar(pre || {}), lancarAberto, fecharLancar: () => setLancar(null),
    explicar: setExp,
  }
  return (
    <C.Provider value={v}>
      {children}
      {exp && (
        <Sheet titulo="De onde veio esse número?" fechar={() => setExp(null)}>
          <p className="corpo"><b>{exp.titulo}</b></p>
          <Explicacao linhas={exp.linhas} nota={exp.nota} />
        </Sheet>
      )}
      {toastE && (
        <div className="toast" role="status" key={toastE.id}>
          <span>{toastE.msg}</span>
          {toastE.desfazer && <button type="button" onClick={() => { const d = toastE.desfazer!; setToast(null); tentar(async () => { await d() }) }}>Desfazer</button>}
        </div>
      )}
    </C.Provider>
  )
}
