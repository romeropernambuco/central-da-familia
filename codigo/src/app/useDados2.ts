import { lojaEscritorio } from './escritorioCompartilhado'
import { useInvalidacao } from './invalidacao'
// Leitura do Guardado e do Escritório (CONTRATO2.md). Rebusca a cada mudança do app (`versao`): lançamento, resposta, volta pra frente, virada do dia.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useApp } from './contexto'
import type { EscritorioHoje, GuardadoHoje } from '../api/tipos'
import { ErroSessao } from '../api/erros'
import type { EntradaPronta } from '../api/futuro'
import { futuro, type FuturoSaida } from '../lib/futuro'

/** buscando: 1ª leitura · ok · erro: não deu pra buscar (mostra o motivo) · desligado: o banco ainda não tem essa parte. */
export type Leitura = 'buscando' | 'ok' | 'erro' | 'desligado'
/** Perguntas já vistas nesta sessão: é com elas que a ficha reabre uma pergunta respondida pra corrigir. */
export const perguntasVistas = new Map<string, import('../api/tipos').PerguntaEsc>()
/** Linha do diário gravada neste aparelho -> pergunta que ela respondeu. O banco não devolve o id da pergunta na linha, então é por aqui que o Corrigir acha a pergunta. */
export const perguntaDaLinha = new Map<string, string>()
const semFuncao = (m: string) => /ainda não tem essa função/i.test(m)

function useLeitura<T>(buscar: ((familia: string) => Promise<T>) | null, limpar: (v: T) => T = v => v) {
  const { api, familia, versao, tentar } = useApp()
  const invalidacao = useInvalidacao(api, familia?.id || '')
  const chave = `${familia?.id}:${familia?.papel}:${!!buscar}`
  const [origem, setOrigem] = useState(chave)
  const [dado, setDado] = useState<T | null>(null)
  const [estado, setEstado] = useState<Leitura>('buscando')
  const [motivo, setMotivo] = useState('')
  const [n, setN] = useState(0)
  const pedido = useRef(0)
  useEffect(() => {
    setOrigem(chave); setMotivo(''); setEstado('buscando')
    if (origem !== chave || !buscar) setDado(null)
    if (!familia || !buscar) return
    const meu = ++pedido.current
    buscar(familia.id).then(v => { if (meu !== pedido.current) return; setDado(limpar(v)); setEstado('ok'); setMotivo('') }).catch((e: Error) => {
      if (meu !== pedido.current) return
      // sessão vencida: o app volta pra tela de entrar pelo caminho de sempre
      if (e instanceof ErroSessao) { tentar(async () => { throw e }); return }
      setMotivo(e.message); setEstado(semFuncao(e.message) ? 'desligado' : 'erro')
    })
    return () => { if (pedido.current === meu) pedido.current++ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, chave, versao, n, invalidacao])
  return { dado: origem === chave && buscar ? dado : null, estado: origem === chave ? estado : 'buscando' as Leitura, motivo: origem === chave ? motivo : '', atualizar: useCallback(() => setN(x => x + 1), []) }
}

/** O dinheiro guardado e quanto rendeu hoje. Só o casal: a equipe e as outras pessoas nem perguntam ao banco. */
export function useGuardado(): { g: GuardadoHoje | null; estado: Leitura; motivo: string; atualizar: () => void } {
  const { api, familia } = useApp()
  const pode = familia?.papel === 'casal'
  const r = useLeitura<GuardadoHoje>(pode ? f => api.guardadoHoje(f) : null)
  return { g: r.dado, estado: r.estado, motivo: r.motivo, atualizar: r.atualizar }
}

/** Quem precisa de você hoje. A equipe recebe só as perguntas da Casa, sem nenhum valor. */
export function useEscritorio() {
  const { api, familia, versao, recarregar, tentar, toast } = useApp()
  const loja = lojaEscritorio(api, familia?.id || '')
  loja.equipe = familia?.papel === 'equipe'
  loja.aoErro = erro => { if (erro instanceof ErroSessao) void tentar(async () => { throw erro }) }
  const r = useSyncExternalStore(loja.assinar, loja.snapshot)
  useEffect(() => { if (familia) void loja.ler(api, familia.id, versao) }, [loja, api, familia?.id, versao])
  const atualizar = useCallback(() => { if (familia) void loja.ler(api, familia.id) }, [loja, api, familia?.id])
  const responder = useCallback(async (pergunta: string, opcao: string, dados?: Record<string, unknown>) => {
    if (!familia || loja.travas.has(pergunta)) return false
    if (!dados?.corrige && !loja.snapshot().dado?.precisa_de_voce.some(p => p.id === pergunta)) return false
    loja.travas.set(pergunta, 'enviando'); loja.emitir()
    let volta: { mensagem?: string; diario_id?: string; aviso?: string } | undefined
    const ok = await tentar(async () => { volta = (await api.escritorioResponder(familia.id, pergunta, opcao, dados)) || undefined })
    if (!ok) { loja.travas.delete(pergunta); loja.emitir(); return false }
    loja.travas.set(pergunta, 'respondida'); loja.emitir()
    if (volta?.diario_id) perguntaDaLinha.set(volta.diario_id, pergunta)
    const equipe = familia.papel === 'equipe'
    toast(volta?.aviso ? (equipe ? volta.aviso + ' O casal fica sabendo.' : volta.aviso) : equipe ? 'Anotado. O casal fica sabendo.' : familia.papel === 'pessoa' ? 'Anotado.' : 'Anotado. Fica guardado no Relatório do Escritório.')
    await loja.ler(api, familia.id)
    try { await recarregar() } catch { /* A confirmação depende da releitura do Escritório. */ }
    return volta || true
  }, [api, familia?.id, tentar, recarregar, toast, loja])
  const equipe = familia?.papel === 'equipe'
  const dado = r.dado && (equipe ? { ...r.dado, entregue: [], precisa_de_voce: r.dado.precisa_de_voce.map(({ valor: _v, ...p }) => p) } : r.dado)
  for (const p of dado?.precisa_de_voce || []) perguntasVistas.set(p.id, p)
  return { perguntas: dado?.precisa_de_voce || [], e: dado ? { ...dado, precisa_de_voce: dado.precisa_de_voce.slice(0, 3) } : null, estado: r.estado, motivo: r.motivo, atualizar, responder }
}

/** E7: os dados de 2029 (produto.futuro_entradas) e a saída do motor. Só o casal: a filha e a equipe nem perguntam ao banco.
 *  A única conta de 2029 é a de futuro() (lib/futuro); aqui só se chama. */
export function useFuturo(): { ent: EntradaPronta | null; saida: FuturoSaida | null; estado: Leitura; motivo: string; atualizar: () => void } {
  const { api, familia } = useApp()
  const pode = familia?.papel === 'casal' && !!api.futuroEntradas
  const r = useLeitura<EntradaPronta>(pode ? f => api.futuroEntradas!(f) : null)
  const saida = useMemo(() => { try { return r.dado?.entrada ? futuro(r.dado.entrada) : null } catch { return null } }, [r.dado])
  return { ent: r.dado, saida, estado: r.estado, motivo: r.motivo, atualizar: r.atualizar }
}
