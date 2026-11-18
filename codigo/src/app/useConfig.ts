import { useInvalidacao } from './invalidacao'
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
  const { api, familia, sessao, tentar, versao, toast } = useApp()
  const [v, setV] = useState<T>(padrao)
  const [falha, setFalha] = useState('')
  const [lido, setLido] = useState(false)
  const atual = useRef(v); atual.current = v
  const fid = familia?.id
  const invalidacao = useInvalidacao(api, fid || '')
  const escopo = JSON.stringify([sessao?.userId, fid, familia?.membroId, familia?.papel, chave])
  const [origem, setOrigem] = useState(escopo)
  const escopoAtual = useRef(escopo); escopoAtual.current = escopo
  const guarda = useMemo(() => criarGuardaConfig<T>(opcoes => api.config<T>(fid!, chave, padrao, opcoes), nv => api.salvarConfig(fid!, chave, nv)), [api, escopo])
  useEffect(() => {
    if (origem !== escopo) { setV(padrao); setFalha(''); setLido(false); setOrigem(escopo) }
    if (!fid) return
    let vivo = true
    guarda.carregar().then(r => { if (vivo && r) { setV(r.valor); setFalha(''); setLido(true) } }).catch(e => { if (vivo && !guarda.lido) setFalha((e as Error).message) })
    return () => { vivo = false }
  }, [guarda, fid, versao, invalidacao])
  const salvar = async (nv: T) => {
    if (!fid || origem !== escopo || !lido) return false
    const aindaAtual = () => escopoAtual.current === escopo
    const antes = atual.current
    setV(nv)
    let juntou = false
    const ok = await tentar(async () => { const r = await guarda.salvar(nv); juntou = r.mudou; if (r.mudou && aindaAtual()) setV(r.valor) })
    if (!aindaAtual()) return ok
    if (!ok) setV(antes)
    else if (juntou) toast('Outro aparelho alterou estes dados. Confira como ficaram depois de salvar.')
    return ok
  }
  return [origem === escopo ? v : padrao, salvar, origem === escopo ? falha : '', origem === escopo && lido]
}
