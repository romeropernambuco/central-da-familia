import { invalidarDados, lerCompartilhado, familiaDoId, registrarDono, vincularMemoria, limparLeituras, definirEscopoLeitura, escopoLeitura, geracaoLeitura, LeituraSubstituida } from '../app/invalidacao'
import { recursosDaMutacao, recursoDaLeitura } from './recursos'
import { copiarLeitura } from '../lib/resumo/contrato'
import { salvamento } from '../app/salvamento'
import { pendentes } from '../app/pendentes'
import type { Api } from './tipos'
import { publicarPosMutacao } from './posMutacao'
import { desfazer } from '../app/desfazer'
import { igual } from '../lib/mescla'
import { guardarPendente, pendentesGuardados, tirarPendente } from '../app/pendentesGuardados'
const copia = <T,>(v: T): T => structuredClone(v)
export function protegerApi(api: Api): Api {
 let consultaSessao = 0
 // Só o banco real guarda a fila no aparelho: no exemplo os dados nascem de novo a cada abertura.
 const dono = () => { const e = escopoLeitura(api); return api.modo === 'real' && e ? `${e.sessao}|${e.familia}|${e.membro}` : '' }
 const retomar = () => { const d = dono(); if (!d) return
   for (const n of pendentesGuardados(d)) if (!pendentes.itens.has(n.chave)) void (publica.lancar(n) as Promise<unknown>).catch(() => { /* erro definitivo já tirou da fila */ })
 }
 const mutacoes = /^(salvar|criar|definir|convidar|cancelar|reenviar|lancar$|apagarLancamento|restaurarLancamento|corrigirLancamento|casaMarcar|guardado(Criar|Movimentar|Encerrar)|recebimento(Criar|Mudar)|objetivoSalvar|desejo(Criar|Mudar)|imovel(Salvar|Tirar)|cartaoSalvar|estoqueItemSalvar|backupRestaurar|anotarCompraEquipe|escritorioResponder|faturaInformar|feira(Registrar|AnexarNota|SemNota)|estoqueContar|lembrete(Criar|Concluir|Adiar|Apagar)|reajuste(Votar|Aplicar))/
 const publica = new Proxy(api, { get(alvo, prop: keyof Api) {
 const f = alvo[prop]
 if (typeof f !== 'function') return f
 if (prop === 'sair') return async () => { limparLeituras(api); return api.sair() }
 if (prop === 'sessao') return async () => {
   const pedido = ++consultaSessao, geracao = geracaoLeitura(api)
   const atual = () => pedido === consultaSessao && geracao === geracaoLeitura(api)
   let s
   try { s = await api.sessao() } catch (erro) { if (!atual()) throw new LeituraSubstituida(); throw erro }
   if (!atual()) throw new LeituraSubstituida()
   definirEscopoLeitura(api, s?.userId || '', s?.familias[0] || null)
   retomar()
   return s
 }
 if (prop === 'aoSairSessao') return (avisar: () => void) => api.aoSairSessao!(() => { limparLeituras(api); avisar() })
 const recurso = recursoDaLeitura(prop)
 if (recurso) return (...args: any[]) => lerCompartilhado(api, args[0], prop === 'config' ? `config:${args[1]}` : recurso,
   prop === 'config' ? args.slice(1, 3) : args.slice(1), async () => {
     if (prop === 'feiras' && escopoLeitura(api)?.papel === 'equipe') {
       const feiras = await api.feiras(args[0], { semValores: true })
       return feiras.map(({ valor: _valor, ...feira }) => feira)
     }
     // A projeção lê as mesmas configurações que a tela, no mesmo cache de sessão.
     return (f as Function).apply(prop === 'futuroEntradas' ? publica : api, args)
   }, prop === 'config' ? args[3] : undefined).then(resultado => {
   if (prop === 'lancamentos') for (const l of resultado) registrarDono(api, l.id, args[0])
   if (prop === 'guardadoHoje') for (const a of resultado.aplicacoes) registrarDono(api, a.id, args[0])
   return copiarLeitura(resultado)
 })
 if (!mutacoes.test(prop) && prop !== 'guardadoDesfazer' && prop !== 'cobrirComCasa' && prop !== 'cobrirImprevisto' && prop !== 'apagarFamilia') return f
 return async (...args: any[]) => salvamento.acompanhar(async () => {
 // Inversos chamam explicitamente a API interna; chamadas públicas sempre passam pelas proteções.
 if(prop === 'backupRestaurar' && pendentes.itens.size) throw new Error('Há envios pendentes. Conclua ou cancele antes de restaurar.')
 const geracao = pendentes.geracao
 const escopoInicial = escopoLeitura(api), geracaoInicial = geracaoLeitura(api)
 const sessaoAtual = () => geracao === pendentes.geracao && geracaoInicial === geracaoLeitura(api) && escopoInicial === escopoLeitura(api)
 let inverso: (() => Promise<void>) | undefined
 const [familia, id, dados] = args
 const soId = /^(apagarLancamento|restaurarLancamento|corrigirLancamento|guardadoMovimentar|guardadoEncerrar|guardadoDesfazer)$/.test(prop)
 const fid = soId ? familiaDoId(api, familia) : typeof familia === 'string' ? familia : familia?.familia
 const recursos = recursosDaMutacao(prop, args)
 const publicar = () => { if (fid) invalidarDados(api, fid, recursos) }
 let snapshot: Record<string,unknown> | undefined
 if(api.modo === 'exemplo' && api.backupLer && prop !== 'backupRestaurar') {
 try { snapshot = await api.backupLer(fid || (typeof familia === 'string' ? familia : familia.familia)) } catch { /* outro papel não recebe valores */ }
 }
 if (prop === 'salvarConfig') {
 const antes = copia(await api.config(familia, id, null)), depois = copia(dados)
 if (antes !== null) inverso = async () => { if (!igual(await api.config(familia,id,null), depois)) throw new Error('Outra pessoa alterou esse dado. Confira antes de desfazer.'); await api.salvarConfig(familia,id,antes) }
 }
 if (prop === 'objetivoSalvar') {
 const antes = copia((await api.objetivo!(familia)).parametros), depois = copia(id)
 if (antes) inverso = async () => { if (!igual((await api.objetivo!(familia)).parametros,depois)) throw new Error('Objetivo mudou.'); await api.objetivoSalvar!(familia,antes) }
 }
 if (prop === 'imovelSalvar' && id) {
 const antes = copia((await api.imoveis!(familia)).find(x=>x.id===id))
 if (antes) { const depois = {...antes,...copia(dados)}; inverso = async () => { if (!igual((await api.imoveis!(familia)).find(x=>x.id===id),depois)) throw new Error('Isso mudou depois; confira antes de desfazer'); await api.imovelSalvar!(familia,id,antes) } }
 }
 if (prop === 'desejoMudar' && !dados.apagar) {
 const antes = copia((await api.desejos!(familia)).find(x=>x.id===id))
 if (antes) { const depois = {...antes,...copia(dados)}; inverso = async () => { if(!igual((await api.desejos!(familia)).find(x=>x.id===id),depois)) throw new Error('Isso mudou depois; confira antes de desfazer'); await api.desejoMudar!(familia,id,{situacao:antes.situacao}) } }
 }

 if (!sessaoAtual()) throw new Error('Sessão encerrada. Confira os dados ao entrar.')
 const guardado = prop === 'lancar' ? dono() : ''
 if (guardado) guardarPendente(guardado, familia)
 let r
 // sem internet a promessa fica em aberto e o item continua guardado; resposta ou erro definitivo tira do aparelho
 try { r = prop === 'lancar' ? await pendentes.enviar(familia.chave, () => api.lancar(familia)) : await (f as Function).apply(api,args) }
 finally { if (guardado) tirarPendente(familia.chave) }
 if (!sessaoAtual()) throw new Error('Sessão encerrada. Confira os dados ao entrar.')
 if (snapshot && api.backupLer && api.backupRestaurar) {
 const fid = typeof familia === 'string' ? familia : familia.familia
 try { const depois = await api.backupLer(fid), antes = snapshot
 inverso = async () => { if(!igual(await api.backupLer!(fid),depois)) throw new Error('Isso mudou depois; confira antes de desfazer'); await api.backupRestaurar!(fid,antes) }
 } catch { inverso = undefined; salvamento.aviso = 'Salvo. Desfazer indisponível agora.' }
 }
 if (!sessaoAtual()) throw new LeituraSubstituida()
 const conferencia = publicarPosMutacao(publica, prop, args, async (familia, valor) => {
   if (!sessaoAtual()) throw new LeituraSubstituida()
   await api.salvarConfig(familia, 'numeros_atualizados', valor)
   if (sessaoAtual()) invalidarDados(api, familia, ['config:numeros_atualizados'])
 })
 if (conferencia) await conferencia
 if (!sessaoAtual()) throw new LeituraSubstituida()
 publicar()
 // Algumas ações devolvem o inverso diretamente; ele pertence ao mesmo conjunto de recursos.
 const resultado = typeof r === 'function' ? async () => { await r(); publicar() } : r
 desfazer.dispensar()
 if (inverso) desfazer.registrar({ rotulo: 'Última alteração', desfazer: async () => { await inverso!(); publicar(); return true } })
 return resultado
 })
 } })
 vincularMemoria(api, publica)
 return publica
}
