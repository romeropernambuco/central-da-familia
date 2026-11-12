import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from './contexto'
import { criarGuardaConfig } from '../lib/seguro'
import type { ChaveConfig } from '../api/tipos'

/**
 * Lê e grava 1 chave de config da família. Só grava depois de ter lido (senão uma leitura que falhou gravava o vazio
 * por cima de tudo), avisa quando a gravação falha e desfaz na tela, e relê quando o app volta pra frente (versao).
 * Antes de gravar, relê o banco e junta com o que outro celular mudou na mesma chave; se juntou, avisa.
 * Devolve [valor, salvar, falha da leitura, já leu].
 */
export function useConfig<T>(chave: ChaveConfig, padrao: T): [T, (v: T) => Promise<boolean>, string, boolean] {
  const { api, familia, tentar, versao, toast } = useApp()
  const [v, setV] = useState<T>(padrao)
  const [falha, setFalha] = useState('')
  const [lido, setLido] = useState(false)
  const atual = useRef(v); atual.current = v
  const fid = familia?.id
  const guarda = useMemo(() => criarGuardaConfig<T>(() => api.config<T>(fid!, chave, padrao), nv => api.salvarConfig(fid!, chave, nv)), [api, fid, chave])
  useEffect(() => {
    if (!fid) return
    let vivo = true
    guarda.carregar().then(r => { if (vivo && r) { setV(r.valor); setFalha(''); setLido(true) } }).catch(e => { if (vivo && !guarda.lido) setFalha((e as Error).message) })
    return () => { vivo = false }
  }, [guarda, fid, versao])
  const salvar = async (nv: T) => {
    const antes = atual.current
    setV(nv)
    let juntou = false
    const ok = await tentar(async () => { const r = await guarda.salvar(nv); juntou = r.mudou; if (r.mudou) setV(r.valor) })
    if (!ok) setV(antes)
    else if (juntou) toast('Outro celular mexeu nisso ao mesmo tempo. Juntei as 2 mudanças: confira.')
    return ok
  }
  return [v, salvar, falha, lido]
}
