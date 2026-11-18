import { ErroSessao } from '../api/erros'
import { useApp } from './contexto'
import { useInvalidacao, lerCompartilhado, invalidarDados, geracaoLeitura, LeituraSubstituida } from './invalidacao'
import { useEffect, useState } from 'react'

/** Estado pertence ao contexto que o carregou; falha conserva o último resultado desse contexto. */
export function useLeituraRemota<T>(chave: string, buscar: (() => Promise<T>) | null, dependencias: readonly unknown[], recurso?: string) {
  const ctx = useApp()
  const invalidacao = useInvalidacao(ctx?.api || apiAusente, ctx?.familia?.id || '', recurso)
  const escopo = JSON.stringify([ctx?.api?.modo, ctx?.sessao?.userId, ctx?.familia?.id, ctx?.familia?.membroId, ctx?.familia?.papel, chave])
  chave = recurso?.startsWith('resumo-familia:') ? JSON.stringify([escopo, invalidacao]) : escopo
  const [r, setR] = useState<{ chave: string; dado: T | null; erro: string; carregando: boolean; consultadoEm: string | null }>({ chave, dado: null, erro: '', carregando: true, consultadoEm: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    let vivo = true
    const api = ctx?.api
    const geracao = api && geracaoLeitura(api)
    const atual = () => vivo && (!api || geracao === geracaoLeitura(api))
    setR(a => ({ chave, dado: a.chave === chave ? a.dado : null, erro: '', carregando: !!buscar, consultadoEm: null }))
    if (buscar) (recurso && ctx?.familia ? lerCompartilhado(ctx.api, ctx.familia.id, recurso, ['hook', chave], buscar) : buscar()).then(dado => { if (atual()) setR({ chave, dado, erro: '', carregando: false, consultadoEm: new Date().toISOString() }) }).catch((e: Error) => {
      if (atual() && !(e instanceof LeituraSubstituida)) { if (e instanceof ErroSessao) void ctx?.tentar(async () => { throw e }); setR(a => ({ ...a, erro: e.message, carregando: false })) }
    })
    return () => { vivo = false }
  }, [chave, n, invalidacao, ...dependencias])
  const atual = r.chave === chave ? r : { dado: null, erro: '', carregando: !!buscar, consultadoEm: null }
  return { ...atual, repetir: () => { if (ctx?.familia) invalidarDados(ctx.api, ctx.familia.id, recurso ? [recurso] : undefined); setN(x => x + 1) } }
}

const apiAusente = {} as import('../api/tipos').Api
