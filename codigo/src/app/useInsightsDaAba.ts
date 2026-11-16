import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { Api } from '../api/tipos'
import { lojaEscritorio } from './escritorioCompartilhado'
import { useApp } from './contexto'
import { rotaPermitida, type Rota } from './rotas'
import { ErroSessao } from '../api/erros'
import { primeiraPerguntaGeral, FALA_ANALISTA } from '../lib/insights/donos'
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

// Uma sessão de exibição por aba, inclusive quando a ficha e o fundo estão montados.
// Compartilha a leitura em andamento e a retenção do card visto, sem polling ou novo endpoint.
const sessoes = new WeakMap<Api, Map<string, ReturnType<typeof criarSessao>>>()
function criarSessao(chave: string) {
  let estado: { visivel: Insight | null; mudanca: number; revisao: number } = { visivel: null, mudanca: 0, revisao: 0 }
  const ouvintes = new Set<() => void>()
  const leituras = new Map<string, ReturnType<typeof lerDadosInsights>>()
  return {
    memoria: criarMemoriaLocal(chave), leituras,
    snapshot: () => estado,
    assinar(f: () => void) {
      ouvintes.add(f)
      return () => { ouvintes.delete(f); if (!ouvintes.size) { estado = { ...estado, visivel: null }; leituras.clear() } }
    },
    mudar(p: Partial<typeof estado>) { estado = { ...estado, ...p, mudanca: estado.mudanca + 1 }; ouvintes.forEach(f => f()) },
  }
}
function sessaoInsights(api: Api, escopo: string, chave: string) {
  let mapa = sessoes.get(api)
  if (!mapa) { mapa = new Map(); sessoes.set(api, mapa) }
  let sessao = mapa.get(escopo)
  if (!sessao) { sessao = criarSessao(chave); mapa.set(escopo, sessao) }
  return sessao
}

/** Não monta UI nem escreve durante a avaliação. A tela recebe PerguntaEsc + responder.
 * chamar marcarVista(p.id) APÓS exibir (não durante render); ver integração em lib/insights/README.md. */
export function useInsightsDaAba(rota: Rota) {
  const { api, familia, sessao, versao, resumo, oculto, tentar, recarregar, explicar } = useApp()
  const [agora, setAgora] = useState(() => Date.now())
  const [dados, setDados] = useState<{ escopo: string; versao: number; dados: LeiturasInsights; falhou: boolean } | null>(null)
  const [nota, setNota] = useState<{ escopo: string; feira: string } | null>(null)
  const pode = !!familia && rotaPermitida(rota, familia.papel, sessao?.dono) === rota
  const escopo = chaveArmazenamento(api.modo, sessao?.userId || '', familia?.id || '') + ':' + rota + ':' + familia?.papel + ':' + familia?.membroId
  const atual = useRef(escopo); atual.current = escopo
  const trava = useRef(new Set<string>())
  const compartilhada = sessaoInsights(api, escopo, chaveArmazenamento(api.modo, sessao?.userId || '', familia?.id || ''))
  const { memoria } = compartilhada
  const { visivel, mudanca, revisao } = useSyncExternalStore(compartilhada.assinar, compartilhada.snapshot, compartilhada.snapshot)
  const loja = lojaEscritorio(api, familia?.id || '')
  const fila = useSyncExternalStore(loja.assinar, loja.snapshot, loja.snapshot)
  useEffect(() => {
    if (rota === 'inicio' && pode && familia && typeof api.escritorioHoje === 'function') void loja.ler(api, familia.id, versao)
  }, [rota, pode, api, familia?.id, familia?.papel, versao, loja])
  const primeiraPerguntaInicio = rota === 'inicio' && pode && familia
    ? primeiraPerguntaGeral(fila.dado?.precisa_de_voce || [], familia.papel, agora, oculto, loja.travas) : null
  const setRevisao = () => compartilhada.mudar({ revisao: revisao + 1 })
  const dia = tempoRecife(agora)?.dia
  useEffect(() => {
    const tick = () => setAgora(Date.now())
    const storage = () => { compartilhada.mudar({}); tick() }
    // Somente as fronteiras do calendário/silêncio podem mudar uma proposta sem novos dados.
    const t = tempoRecife(agora)
    const inicio = t ? Date.parse(t.dia + 'T00:00:00-03:00') : agora
    const proxima = [7, 22, 24].map(h => inicio + h * 3600000).find(ms => ms > agora)!
    const relogio = setTimeout(tick, Math.max(1, proxima - agora))
    addEventListener('focus', tick); addEventListener('storage', storage)
    document.addEventListener('visibilitychange', tick)
    return () => { clearTimeout(relogio); removeEventListener('focus', tick); removeEventListener('storage', storage); document.removeEventListener('visibilitychange', tick) }
  }, [compartilhada, agora])
  useEffect(() => {
    if (!pode || !familia) return
    let vivo = true
    setDados(null)
    const chave = JSON.stringify([versao, revisao, dia])
    let leitura = compartilhada.leituras.get(chave)
    if (!leitura) { compartilhada.leituras.clear(); leitura = lerDadosInsights(api, familia, rota, Date.now()); compartilhada.leituras.set(chave, leitura) }
    void leitura.then(r => {
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
  const propostas = useMemo(() => snapshot ? avaliarInsights(snapshot, agora, memoria.ler()).filter(i => i.rota === rota) : [], [snapshot, agora, memoria, mudanca, rota])
  // A confirmação de exibição persiste o dedupe, mas não retira o card já na tela.
  const m = memoria.ler()
  const memoriaRetida = visivel ? { ...m, [visivel.chave]: { ...m[visivel.chave], vistoEm: undefined } } : m
  const retido = visivel && snapshot
    ? avaliarInsights(snapshot, agora, memoriaRetida).find(i => i.id === visivel.id) : undefined
  const p = retido || propostas[0]
  const registrar = useCallback((i: Insight, evento: EventoInsight) => {
    memoria.registrar(i.chave, evento, Date.now())
    compartilhada.mudar(evento.tipo !== 'visto' ? { visivel: null } : {})
  }, [memoria, compartilhada])
  const marcarVista = useCallback((id: string) => {
    if (p?.id !== id) return
    if (visivel?.id === id) return
    compartilhada.mudar({ visivel: p }); registrar(p, { tipo: 'visto' })
  }, [p, visivel, compartilhada, registrar])
  const responder = useCallback(async (id: string, opcao: string, campos: Record<string, unknown> = {}) => {
    if (!p || p.id !== id || !familia || trava.current.has(id) || loja.travas.has(id) || atual.current !== escopo) return false
    const lembranca = memoria.ler()[p.chave]
    if (lembranca?.resolvido || (lembranca?.adiadoAte || 0) > Date.now()) return false
    trava.current.add(id)
    loja.travas.set(id, 'enviando'); loja.emitir()
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
    if (!ok || !evento) { loja.travas.delete(id); loja.emitir(); return false }
    // Só respostas definitivas mantêm a trava após o envio. O adiamento expira
    // pela memória, sem depender de uma releitura bem-sucedida do Escritório.
    if (evento.tipo === 'visto' || evento.tipo === 'depois') loja.travas.delete(id)
    else loja.travas.set(id, 'respondida')
    loja.emitir()
    registrar(p, evento)
    if (atual.current !== escopo) return true
    if (evento.tipo === 'resolvido') { setRevisao(); try { await recarregar() } catch { /* Já gravada e lembrada. */ } }
    return true
  }, [p, familia, escopo, tentar, snapshot, api, explicar, oculto, registrar, recarregar, loja, compartilhada, revisao])
  const anexarNota = useCallback(async (fotoBase64Jpeg: string) => {
    if (!pode || !familia || !['casal', 'equipe'].includes(familia.papel) || nota?.escopo !== escopo || atual.current !== escopo || trava.current.has('nota') || !fotoBase64Jpeg) return false
    trava.current.add('nota')
    const ok = await tentar(() => api.feiraAnexarNota(familia.id, nota.feira, fotoBase64Jpeg))
    trava.current.delete('nota')
    if (!ok || atual.current !== escopo) return false
    if (p?.acao.tipo === 'feira' && p.acao.id === nota.feira) registrar(p, { tipo: 'resolvido' })
    setNota(null); setRevisao(); try { await recarregar() } catch { /* Foto já guardada. */ } return true
  }, [pode, familia, nota, escopo, tentar, api, recarregar, p, registrar, compartilhada, revisao])
  const pergunta = p ? apresentarInsight(p, oculto) : null
  return { primeiraPerguntaInicio, falaDoAnalista: rota === 'painel' && pode && sessao?.dono ? FALA_ANALISTA : null, pergunta, perguntas: pergunta ? [pergunta] : [], responder, marcarVista,
    exemplo: api.modo === 'exemplo', estado: !pode ? 'desligado' : !validos ? 'buscando' : validos.falhou ? 'erro' : 'ok',
    motivo: validos?.falhou ? 'Parte dos dados não pôde ser conferida. Tente atualizar.' : '',
    atualizar: setRevisao, notaPendente: nota?.escopo === escopo ? nota.feira : null,
    anexarNota, fecharNota: () => setNota(null) }
}
