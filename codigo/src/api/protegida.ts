import { salvamento } from '../app/salvamento'
import { pendentes } from '../app/pendentes'
import { limparRascunhos } from '../app/rascunhos'
import type { Api } from './tipos'
import { desfazer } from '../app/desfazer'
const copia = <T,>(v: T): T => structuredClone(v)
const igual = (a: unknown,b: unknown) => JSON.stringify(a) === JSON.stringify(b)
export function protegerApi(api: Api): Api {
 const mutacoes = /^(salvar|criar|definir|convidar|cancelar|reenviar|lancar$|apagarLancamento|restaurarLancamento|corrigirLancamento|casaMarcar|guardado(Criar|Movimentar|Encerrar)|recebimento(Criar|Mudar)|objetivoSalvar|desejo(Criar|Mudar)|imovel(Salvar|Tirar)|cartaoSalvar|estoqueItemSalvar|backupRestaurar|anotarCompraEquipe|escritorioResponder|faturaInformar|feira(Registrar|AnexarNota|SemNota)|estoqueContar|lembrete(Criar|Concluir|Adiar|Apagar)|reajuste(Votar|Aplicar))/
 return new Proxy(api, { get(alvo, prop: keyof Api) {
 const f = alvo[prop]
 if (typeof f !== 'function' || !mutacoes.test(prop)) return f
 return async (...args: any[]) => salvamento.acompanhar(async () => {
 if (desfazer.ocupado) return (f as Function).apply(api,args)
 const geracao = pendentes.geracao
 let inverso: (() => Promise<void>) | undefined
 const [familia, id, dados] = args
 let snapshot: Record<string,unknown> | undefined
 if(api.modo === 'exemplo' && api.backupLer && prop !== 'backupRestaurar') {
 try { snapshot = await api.backupLer(typeof familia === 'string' ? familia : familia.familia) } catch { /* outro papel não recebe valores */ }
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
 if (antes) inverso = () => api.imovelSalvar!(familia,id,antes)
 }
 if (prop === 'desejoMudar' && !dados.apagar) {
 const antes = (await api.desejos!(familia)).find(x=>x.id===id)
 if (antes) inverso = () => api.desejoMudar!(familia,id,{situacao: antes.situacao})
 }

 const r = prop === 'lancar' ? await pendentes.enviar(familia.chave, () => api.lancar(familia)) : await (f as Function).apply(api,args)
 if(geracao !== pendentes.geracao) throw new Error('Sessão encerrada. Confira os dados ao entrar.')
 const escopo = prop === 'criarCartao' || prop === 'cartaoSalvar' ? 'cartao' : prop === 'imovelSalvar' ? 'imovel' : prop === 'guardadoCriar' ? 'aplicacao' : prop === 'recebimentoCriar' ? 'receita' : prop === 'salvarConfig' && id === 'casa_prestadores' ? 'prestador' : prop === 'salvarConfig' && id === 'casa_folha' ? 'assessor' : ''
 if(escopo) limparRascunhos('cadastro:' + escopo)
 if(prop === 'salvarConfig' && ['rendas','metas','metas_pessoais'].includes(id)) { limparRascunhos('cadastro:plano'); limparRascunhos('cadastro:meta') }
 if (snapshot && api.backupLer && api.backupRestaurar) {
 const fid = typeof familia === 'string' ? familia : familia.familia
 const depois = await api.backupLer(fid), antes = snapshot
 inverso = async () => { if(!igual(await api.backupLer!(fid),depois)) throw new Error('Dados mudaram depois dessa ação. Confira antes de desfazer.'); await api.backupRestaurar!(fid,antes) }
 }
 desfazer.dispensar()
 if (inverso) desfazer.registrar({ rotulo: 'Última alteração', desfazer: async () => { await inverso!(); return true } })
 return r
 })
 } })
}
