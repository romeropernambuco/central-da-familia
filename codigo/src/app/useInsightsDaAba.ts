import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from './contexto'
import { rotaPermitida, type Rota } from './rotas'
import { ErroSessao } from '../api/erros'
import { avaliarInsights } from '../lib/insights/motor'
import { montarSnapshot } from '../lib/insights/snapshot'
import { lerDadosInsights } from '../lib/insights/leitura'
import { apresentarInsight } from '../lib/insights/apresentacao'
import { chaveArmazenamento, criarMemoriaLocal } from '../lib/insights/memoria'
import { executarResposta } from '../lib/insights/respostas'
import { tempoRecife } from '../lib/insights/tempo'
import type { EventoInsight, Insight } from '../lib/insights/tipos'
import type { LeiturasInsights } from '../lib/insights/snapshot'
import { textoPrivado } from '../componentes/privacidade'

/** Não monta UI nem escreve durante a avaliação. A tela recebe PerguntaEsc + responder.
 * chamar marcarVista(p.id) APÓS exibir (não durante render); ver integração em lib/insights/README.md. */
export function useInsightsDaAba(rota: Rota) {
  const { api, familia, sessao, versao, resumo, oculto, tentar, recarregar, explicar } = useApp()
  const [agora, setAgora] = useState(() => Date.now())
  const [revisao, setRevisao] = useState(0)
  const [dados, setDados] = useState<{ escopo: string; versao: number; dados: LeiturasInsights; falhou: boolean } | null>(null)
  const [nota, setNota] = useState<{ escopo: string; feira: string } | null>(null)
  const [mudanca, setMudanca] = useState(0)
  const pode = !!familia && rotaPermitida(rota, familia.papel, sessao?.dono) === rota
  const escopo = chaveArmazenamento(api.modo, sessao?.userId || '', familia?.id || '') + ':' + rota + ':' + familia?.papel + ':' + familia?.membroId
  const atual = useRef(escopo); atual.current = escopo
  const trava = useRef(new Set<string>())
  const memoria = useMemo(() => criarMemoriaLocal(chaveArmazenamento(api.modo, sessao?.userId || '', familia?.id || '')), [api, api.modo, sessao?.userId, familia?.id])
  const dia = tempoRecife(agora)?.dia
  useEffect(() => {
    const tick = () => setAgora(Date.now())
    const storage = () => { setMudanca(x => x + 1); tick() }
    const relogio = setInterval(tick, 30000)
    addEventListener('focus', tick); addEventListener('storage', storage)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(relogio); removeEventListener('focus', tick); removeEventListener('storage', storage); document.removeEventListener('visibilitychange', tick) }
  }, [])
  useEffect(() => {
    if (!pode || !familia) return
    let vivo = true
    setDados(null)
    void lerDadosInsights(api, familia, rota, Date.now()).then(r => {
      if (!vivo) return
      const sessaoVencida = r.erros.find(e => e instanceof ErroSessao)
      if (sessaoVencida) { void tentar(async () => { throw sessaoVencida }); return }
      setDados({ escopo, versao, dados: r.dados, falhou: r.erros.length > 0 })
    }).catch(e => { if (vivo) { setDados({ escopo, versao, dados: {}, falhou: true }); if (e instanceof ErroSessao) void tentar(async () => { throw e }) } })
    return () => { vivo = false }
  }, [api, escopo, familia?.papel, familia?.membroId, versao, revisao, dia, pode])
  const validos = pode && dados?.escopo === escopo && dados.versao === versao ? dados : null
  const snapshot = useMemo(() => familia && validos ? montarSnapshot(familia, api.modo, { ...validos.dados,
    ...(rota === 'planejamento' ? { resumo } : {}) }, agora) : null, [familia, validos, api.modo, rota, resumo, agora])
  const [visivel, setVisivel] = useState<{ escopo: string; insight: Insight } | null>(null)
  const propostas = useMemo(() => snapshot ? avaliarInsights(snapshot, agora, memoria.ler()).filter(i => i.rota === rota) : [], [snapshot, agora, memoria, mudanca, rota])
  // A confirmação de exibição persiste o dedupe, mas não retira o card já na tela.
  const m = memoria.ler()
  const memoriaRetida = visivel ? { ...m, [visivel.insight.chave]: { ...m[visivel.insight.chave], vistoEm: undefined } } : m
  const retido = visivel?.escopo === escopo && snapshot
    ? avaliarInsights(snapshot, agora, memoriaRetida).find(i => i.id === visivel.insight.id) : undefined
  const p = retido || propostas[0]
  const registrar = useCallback((i: Insight, evento: EventoInsight) => {
    memoria.registrar(i.chave, evento, Date.now()); setMudanca(x => x + 1)
    if (evento.tipo !== 'visto') setVisivel(null)
  }, [memoria])
  const marcarVista = useCallback((id: string) => {
    if (p?.id !== id) return
    setVisivel({ escopo, insight: p }); registrar(p, { tipo: 'visto' })
  }, [p, escopo, registrar])
  const responder = useCallback(async (id: string, opcao: string, campos: Record<string, unknown> = {}) => {
    if (!p || p.id !== id || !familia || trava.current.has(id) || atual.current !== escopo) return false
    trava.current.add(id)
    const resultado: { evento: EventoInsight | false } = { evento: false }
    const ok = await tentar(async () => {
      let i = p
      if (opcao === 'composicao' && p.acao.tipo === 'informar_pagamento') {
        const a = p.acao
        const f = snapshot?.faturas?.find(f => f.cartaoId === a.cartaoId && f.mes === a.mes)
        if (!f) return
        i = { ...p, acao: { tipo: 'composicao', cartaoId: f.cartaoId, mes: f.mes, itens: f.composicao, total: f.total, disponivel: f.composicaoDisponivel } }
      }
      resultado.evento = await executarResposta(api, familia.id, familia.papel, i, opcao, campos, Date.now(), {
        navegar: destino => { location.hash = destino },
        nota: feira => setNota({ escopo, feira }),
        composicao: a => explicar({ titulo: 'Composição da fatura', linhas: [
          ...a.itens.map(x => ({ linha: textoPrivado(x.nome, oculto), valor: x.centavos / 100 })), { linha: 'Total calculado da fatura', valor: a.total / 100 },
        ], nota: a.disponivel === false ? 'Não foi possível carregar a composição. Atualize e tente novamente.' : 'Compras localizadas nos lançamentos disponíveis. Tarifas ou itens não localizados devem ser conferidos no banco.' }),
      })
    })
    trava.current.delete(id)
    const evento = resultado.evento
    if (!ok || !evento || atual.current !== escopo) return false
    registrar(p, evento)
    if (evento.tipo === 'resolvido') { setRevisao(x => x + 1); await recarregar() }
    return true
  }, [p, familia, escopo, tentar, snapshot, api, explicar, oculto, registrar, recarregar])
  const anexarNota = useCallback(async (fotoBase64Jpeg: string) => {
    if (!pode || !familia || !['casal', 'equipe'].includes(familia.papel) || nota?.escopo !== escopo || atual.current !== escopo || trava.current.has('nota') || !fotoBase64Jpeg) return false
    trava.current.add('nota')
    const ok = await tentar(() => api.feiraAnexarNota(familia.id, nota.feira, fotoBase64Jpeg))
    trava.current.delete('nota')
    if (!ok || atual.current !== escopo) return false
    setNota(null); setVisivel(null); setRevisao(x => x + 1); await recarregar(); return true
  }, [pode, familia, nota, escopo, tentar, api, recarregar])
  const pergunta = p ? apresentarInsight(p, oculto) : null
  return { pergunta, perguntas: pergunta ? [pergunta] : [], responder, marcarVista,
    exemplo: api.modo === 'exemplo', estado: !pode ? 'desligado' : !validos ? 'buscando' : validos.falhou ? 'erro' : 'ok',
    motivo: validos?.falhou ? 'Parte dos dados não pôde ser conferida. Tente atualizar.' : '',
    atualizar: () => setRevisao(x => x + 1), notaPendente: nota?.escopo === escopo ? nota.feira : null,
    anexarNota, fecharNota: () => setNota(null) }
}
