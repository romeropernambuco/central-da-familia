// Leitura do Guardado e do Escritório (CONTRATO2.md). Rebusca a cada mudança do app (`versao`): lançamento, resposta, volta pra frente, virada do dia.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const { familia, versao, tentar } = useApp()
  const [dado, setDado] = useState<T | null>(null)
  const [estado, setEstado] = useState<Leitura>('buscando')
  const [motivo, setMotivo] = useState('')
  const [n, setN] = useState(0)
  const pedido = useRef(0)
  useEffect(() => {
    if (!familia || !buscar) return
    const meu = ++pedido.current
    buscar(familia.id).then(v => { if (meu !== pedido.current) return; setDado(limpar(v)); setEstado('ok'); setMotivo('') }).catch((e: Error) => {
      if (meu !== pedido.current) return
      // sessão vencida: o app volta pra tela de entrar pelo caminho de sempre
      if (e instanceof ErroSessao) { tentar(async () => { throw e }); return }
      setMotivo(e.message); setEstado(semFuncao(e.message) ? 'desligado' : 'erro')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familia?.id, versao, n, !!buscar])
  return { dado, estado, motivo, atualizar: useCallback(() => setN(x => x + 1), []) }
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
  const { api, familia, recarregar, tentar, toast } = useApp()
  const equipe = familia?.papel === 'equipe'
  // segurança dupla: mesmo que o banco mande, valor e entregas (que têm R$) não ficam na memória do aparelho da equipe
  // rodada 2 (regras de silêncio): na tela, no máximo 3 coisas por vez. E3 (conserto 9): o total continua contado (precisa_total)
  const r = useLeitura<EscritorioHoje>(f => api.escritorioHoje(f), v => { const x = { ...v, precisa_total: v.precisa_de_voce.length, precisa_de_voce: v.precisa_de_voce.slice(0, 3) }; return equipe ? { ...x, entregue: [], precisa_de_voce: x.precisa_de_voce.map(({ valor: _v, ...p }) => p) } : x })
  const atualizar = r.atualizar
  const responder = useCallback(async (pergunta: string, opcao: string, dados?: Record<string, unknown>) => {
    if (!familia) return false
    let volta: { mensagem?: string; diario_id?: string; aviso?: string } | undefined
    const ok = await tentar(async () => { volta = (await api.escritorioResponder(familia.id, pergunta, opcao, dados)) || undefined })
    // deu certo ou não, relê: se a pergunta já tinha sido respondida em outro celular, ela some daqui também
    atualizar()
    // rodada 2: a confirmação diz o que foi feito e quanto falta ("Nota da feira de 16/11 guardada. Falta 1 coisa.")
    if (ok) { toast(volta?.aviso ? (equipe ? volta.aviso + ' O casal fica sabendo.' : volta.aviso) : equipe ? 'Anotado. O casal fica sabendo.' : familia.papel === 'pessoa' ? 'Anotado.' : 'Anotado. Fica guardado no Relatório do Escritório.'); await recarregar() }
    if (ok && volta?.diario_id) perguntaDaLinha.set(volta.diario_id, pergunta)
    return ok ? volta || true : false
  }, [api, familia?.id, tentar, recarregar, atualizar, toast, equipe])
  for (const p of r.dado?.precisa_de_voce || []) perguntasVistas.set(p.id, p)
  return { e: r.dado, estado: r.estado, motivo: r.motivo, atualizar, responder }
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
