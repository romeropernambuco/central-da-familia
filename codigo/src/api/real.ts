// Banco de verdade: Supabase, schema `produto`. As contas vêm das funções (RPC) do CONTRATO.md;
// leituras simples (lista de lançamentos, cartões, config) vão direto nas tabelas, protegidas pela tranca por família.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Api, AvisoCasa, Cartao, ChaveConfig, Fatura, FamiliaMinha, Lancamento, Numero, Papel, ParametrosObjetivo, Sessao } from './tipos'
import { entradaDoBanco, type FuturoBanco } from './futuro'
import { normalizaCartao, normalizaContagem, normalizaCusto, normalizaEscritorio, normalizaFaturaBanco, normalizaFeira, normalizaGuardado, normalizaItem, normalizaLembrete, normalizaLinha, normalizaRelatorio, idFuncNoBanco } from './normaliza2'
import { hojeRecife } from '../lib/formato'
import { MSG_CUPOM, mensagemCupom } from '../lib/foto'
import { AVISOS_CONVITE, ErroRede, ErroSessao, TRADUZ, sessaoVale, traduzErro } from './erros'
import { lancarComChave, normalizaReajuste, normalizaCasa, normalizaCupom, normalizaLancamento, normalizaRecebimento, normalizaResumo } from './normaliza'

let cli: SupabaseClient<any, any, any> | null = null
function sb(): SupabaseClient<any, any, any> {
  if (!cli) {
    const url = import.meta.env.VITE_SUPABASE_URL as string
    const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    if (!url || !chave) throw new Error('Falta VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no arquivo .env')
    cli = createClient<any, any, any>(url, chave, { db: { schema: 'produto' }, auth: { persistSession: true, autoRefreshToken: true } })
  }
  return cli!
}

/** Mensagem do banco em português simples, com tipo (sessão, rede) pra o app reagir. */
function erro(e: { message?: string; code?: string; status?: number } | null): never { throw traduzErro(e) }

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  let r: { data: unknown; error: { message?: string; code?: string } | null }
  try { r = await sb().rpc(nome, args) } catch (x) { throw traduzErro(x as Error) }
  if (r.error) erro(r.error)
  return r.data as T
}

const num = (v: unknown) => Number(v) || 0
/** id em membros de quem está logado nesta família (pra saber o que é dele). */
async function meuMembro(familia: string): Promise<string | null> {
  const { data: s } = await sb().auth.getSession()
  const u = s.session?.user?.id
  if (!u) return null
  const { data } = await sb().from('membros').select('id').eq('familia_id', familia).eq('user_id', u).eq('ativo', true).maybeSingle()
  return data?.id ? String(data.id) : null
}
/** Papel de quem entrou em cada família: a equipe nunca guarda valor em dinheiro das perguntas do Escritório. */
const papeis = new Map<string, Papel>()

export const apiReal: Api = {
  modo: 'real',

  async sessao(): Promise<Sessao | null> {
    const { data } = await sb().auth.getSession()
    const u = data.session?.user
    if (!u) return null
    const buscar = async (): Promise<FamiliaMinha[]> => {
      const { data: membros, error } = await sb().from('membros').select('id, familia_id, papel, nome, envelope_id, familias(nome)').eq('user_id', u.id).eq('ativo', true).order('criado_em')
      if (error) erro(error)
      return (membros || []).map((m: any) => ({ id: m.familia_id, nome: m.familias?.nome || 'Família', papel: m.papel, membroNome: m.nome, envelopeId: m.envelope_id, membroId: m.id ? String(m.id) : null }))
    }
    let familias = await buscar()
    const lembra = (fs: FamiliaMinha[]) => { papeis.clear(); for (const f of fs) papeis.set(f.id, f.papel) }
    // convidado por e-mail que entrou mas o convite não ligou na hora (internet caiu): tenta de novo antes de mostrar "criar família"
    if (!familias.length && !(u as any).is_anonymous && u.email) {
      try { const r = await rpc<{ familias?: unknown[] }>('entrar_por_convite'); if (r?.familias?.length) familias = await buscar() } catch { /* sem convite ou banco recusou: segue pro primeiro uso */ }
    }
    // equipe que errou o código fica com login anônimo sem família: não é sessão (senão caía no "criar família")
    if (!sessaoVale(!!(u as any).is_anonymous, familias.length)) return null
    lembra(familias)
    // equipe nunca é dono do produto: nem pergunta ao banco
    if (familias.length && familias.every(f => f.papel === 'equipe')) return { userId: u.id, email: null, familias, dono: false }
    // Painel dos 4 números: só aparece se a função deixar (dono do produto)
    let dono = false
    try { await rpc('numeros_semana'); dono = true } catch { dono = false }
    return { userId: u.id, email: u.email || null, familias, dono }
  },
  async enviarCodigo(email) {
    const { error } = await sb().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
    if (error) erro(error)
  },
  async confirmarCodigo(email, codigo) {
    const { error } = await sb().auth.verifyOtp({ email: email.trim(), token: codigo, type: 'email' })
    if (error) erro(error)
    // convidado por e-mail (casal ou pessoa): liga o login ao convite. Sem convite, devolve {familias: []} e nada muda.
    // O banco só liga com e-mail confirmado e sessão aberta por código (nunca senha nem login anônimo): se recusar, a pessoa lê o motivo.
    let r: { data: unknown; error: { message?: string; code?: string } | null }
    try { r = await sb().rpc('entrar_por_convite') } catch { return }
    const m = r.error?.message || ''
    if (AVISOS_CONVITE.includes(m)) return { aviso: TRADUZ[m] }
  },
  async entrarEquipe(convite, codigo) {
    const atual = await sb().auth.getSession()
    if (!atual.data.session) {
      const { error } = await sb().auth.signInAnonymously()
      if (error) erro(error)
    }
    // o banco não dá erro em código errado: devolve {ok:false, motivo, restam}
    const r = await rpc<{ ok: boolean; motivo?: string; restam?: number }>('entrar_equipe_convite', { convite, codigo })
    if (!r?.ok) {
      const m = TRADUZ[r?.motivo || ''] || r?.motivo || 'Código errado ou vencido.'
      throw new Error(r?.restam != null && r.restam > 0 && /errado/i.test(m) ? `${m} Restam ${r.restam} tentativas.` : m)
    }
  },
  async sair() { try { await sb().auth.signOut({ scope: 'local' }) } catch { /* sem rede: a sessão local some do mesmo jeito */ } },
  aoSairSessao(avisar) {
    const { data } = sb().auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') avisar() })
    return () => data.subscription.unsubscribe()
  },

  async criarFamilia(nome, nomePessoa) {
    const r = await rpc<{ familia_id: string }>('criar_familia', { nome, nome_pessoa: nomePessoa })
    return r.familia_id
  },
  async salvarEnvelope(familia, id, campos) {
    // só colchão e nome: o limite do mês passa por definirLimite (1 função no banco, mês fechado não muda)
    const { colchao, nome } = campos
    const { error } = await sb().from('envelopes').update({ ...(colchao != null ? { colchao } : {}), ...(nome != null ? { nome } : {}) }).eq('id', id).eq('familia_id', familia)
    if (error) erro(error)
  },
  async definirLimite(familia, envelope, valor) { await rpc('definir_limite', { familia, envelope, valor }) },
  async convidar(familia, papel, nome, email) { return rpc('convidar', { familia, papel, nome, email: email?.trim() || null }) },

  async resumoHoje(familia) {
    const r = normalizaResumo(await rpc('resumo_hoje', { familia }))
    // C3: o papel do dono de cada limite (a filha tem o limite combinado com os pais). Sem a lista, segue sem o papel.
    if (r.envelopes.some(e => e.dono_id)) { try { const ms = await this.membros(familia); for (const e of r.envelopes) if (e.dono_id) e.dono_papel = ms.find(m => m.id === e.dono_id)?.papel ?? null } catch { /* sem a lista de membros */ } }
    return r
  },
  async lancar(n) {
    // 1 gravação só, com a chave do toque: repetir a mesma chave (internet caiu no meio) devolve o mesmo lançamento
    let r: { data: any; error: { message?: string; code?: string } | null }
    try { r = await lancarComChave((nome, args) => sb().rpc(nome, args) as any, n) as any } catch (x) { throw traduzErro(x as Error) }
    if (r.error) erro(r.error)
    // equipe: o banco devolve o lançamento sem `valor` e o resumo com so_nomes
    return { lancamento: normalizaLancamento(r.data?.lancamento), resumo: normalizaResumo(r.data?.resumo), repetido: !!r.data?.repetido }
  },
  async lancamentos(familia, mes) {
    // recorte por mês (antes vinham 500 linhas de todos os meses a cada lançamento); mês cheio vem em páginas de 1.000
    const [a, m] = mes.split('-').map(Number)
    const ini = `${mes}-01`, fim = m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, '0')}-01`
    const out: Lancamento[] = []
    // E2: o casal lê a família toda; `meu` = quem olha lançou (o banco só deixa mexer no que a pessoa lançou, f_02)
    const eu = (await sb().auth.getSession()).data.session?.user?.id
    for (let p = 0; p < 10; p++) {
      // E4: "*" traz parcelas e pago_por depois da f_04 e não quebra antes dela
      // D1 (revisão E4 a E6): o comentário ficava no meio desta linha e apagava família, mês, ordem e paginação
      const { data, error } = await sb().from('lancamentos').select('*').eq('familia_id', familia).gte('data', ini).lt('data', fim).order('data', { ascending: false }).order('criado_em', { ascending: false }).order('id').range(p * 1000, p * 1000 + 999)
      if (error) erro(error)
      out.push(...(data || []).map((l: any) => ({ ...normalizaLancamento(l), ...(eu && l.autor ? { meu: l.autor === eu } : {}) })))
      if ((data || []).length < 1000) break
    }
    return out
  },
  async apagarLancamento(id) { await rpc('apagar_lancamento', { id }) },
  async restaurarLancamento(id) { await rpc('restaurar_lancamento', { id }) },

  async cartoes(familia) {
    // select * : funciona antes e depois das colunas novas (banco, titular, final4). Limite e mensalidade ficam em cartao_custos,
    // que só o casal lê: se a leitura for recusada (pessoa da família), o cartão aparece sem os valores.
    const { data, error } = await sb().from('cartoes').select('*').eq('familia_id', familia).order('nome')
    if (error) erro(error)
    let custos: any[] = []
    try { const c = await sb().from('cartao_custos').select('*').eq('familia_id', familia); custos = c.data || [] } catch { /* sem a tabela ou sem permissão */ }
    let nomes = new Map<string, string>()
    try { nomes = new Map((await this.membros(familia)).map(m => [m.id, m.nome])) } catch { /* sem a lista: o cartão aparece sem o nome do titular */ }
    return (data || []).map((c: any) => normalizaCartao({ ...c, ...(custos.find(x => x.cartao_id === c.id) || {}), id: c.id, titular_nome: nomes.get(c.titular_membro) })).filter(c => c.ativo !== false)
  },
  async criarCartao(familia, c) {
    const { error } = await sb().from('cartoes').insert({ familia_id: familia, ...c })
    if (error) erro(error)
  },
  async faturas(familia, meses) {
    // banco: {regra, faturas:[{cartao_id, cartao, ativo, mes 'AAAA-MM', fecha_em, vence_em, total, compras}]}
    const r = await rpc<any>('faturas', { familia, meses })
    const lista: any[] = r?.faturas || []
    const hoje = hojeRecife()
    return lista.map(f => ({ cartao_id: f.cartao_id, cartao: f.cartao || '', mes: String(f.mes).slice(0, 7), vencimento: f.vence_em, fecha_em: f.fecha_em, total: num(f.total), fechada: !!f.fecha_em && f.fecha_em < hoje })) as Fatura[]
  },

  async config<T>(familia: string, chave: ChaveConfig, padrao: T): Promise<T> {
    const { data, error } = await sb().from('config_familia').select('valor').eq('familia_id', familia).eq('chave', chave).maybeSingle()
    if (error) erro(error)
    return (data?.valor ?? padrao) as T
  },
  async salvarConfig(familia, chave, valor) {
    const { error } = await sb().from('config_familia').upsert({ familia_id: familia, chave, valor }, { onConflict: 'familia_id,chave' })
    if (error) erro(error)
  },

  async casaDaEquipe(familia) { return normalizaCasa(await rpc('casa_da_equipe', { familia })) },
  async casaMarcar(familia, tipo, dados) { return normalizaCasa(await rpc('casa_marcar', { familia, tipo, dados: dados || {} })) },
  async avisosCasa(familia) {
    const [ev, mb] = await Promise.all([
      sb().from('eventos').select('tipo, user_id, criado_em').eq('familia_id', familia).in('tipo', ['casa_gas', 'casa_presenca']).order('criado_em').limit(500),
      sb().from('membros').select('user_id, nome').eq('familia_id', familia),
    ])
    if (ev.error) erro(ev.error)
    const nomes = new Map((mb.data || []).map((m: any) => [m.user_id, m.nome]))
    return (ev.data || []).map((e: any) => ({ tipo: e.tipo as AvisoCasa, data: hojeRecife(new Date(e.criado_em)), nome: nomes.get(e.user_id) || 'Equipe' }))
  },
  async lerCupom(familia, foto) {
    // POST {URL}/functions/v1/ia-ler-cupom, Authorization: Bearer <token do login>, corpo {familia_id, foto}
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error(MSG_CUPOM.rede)
    const { data: s } = await sb().auth.getSession()
    const token = s.session?.access_token
    if (!token) throw new ErroSessao('Sua sessão acabou. Entre de novo pra ler o cupom.')
    let r: Response
    try {
      r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ia-ler-cupom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string },
        body: JSON.stringify({ familia_id: familia, foto }),
      })
    } catch { throw new ErroRede(MSG_CUPOM.rede) }
    let j: any = null
    try { j = await r.json() } catch { /* sem corpo */ }
    if (r.status === 401) throw new ErroSessao(mensagemCupom(401))
    if (!r.ok) throw new Error(mensagemCupom(r.status, j?.erro))
    return normalizaCupom(j)
  },

  // ---------- CONTRATO2.md, seção A: Guardado (só o casal; o banco recusa os outros) ----------
  async guardadoHoje(familia) {
    const g = normalizaGuardado(await rpc('guardado_hoje', { familia }))
    // C2: o banco manda só o id do titular; o nome vem da lista de membros. seu_total e casal_total pelo id de quem olha.
    if (g.aplicacoes.some(a => a.titular !== undefined)) {
      try {
        const [ms, eu] = await Promise.all([this.membros(familia), meuMembro(familia)])
        for (const a of g.aplicacoes) if (a.titular && !a.titular_nome) a.titular_nome = ms.find(m => m.id === a.titular)?.nome ?? null
        const soma = (f: (a: typeof g.aplicacoes[number]) => boolean) => Math.round(g.aplicacoes.filter(f).reduce((s, a) => s + a.saldo, 0) * 100) / 100
        if (eu) { g.seu_total = soma(a => a.titular === eu); g.casal_total = soma(a => !a.titular) }
      } catch { /* sem a lista: aparece sem o nome */ }
    }
    return g
  },
  async guardadoCriar(familia, a) { await rpc('guardado_criar', { familia, nome: a.nome, banco: a.banco, tipo: a.tipo, pct_cdi: a.pct_cdi, valor_inicial: a.valor_inicial, data: a.data, vence_em: a.vence_em || null, chave: crypto.randomUUID(), ...(a.do_casal ? { do_casal: true } : a.titular ? { titular: a.titular } : {}) }) },
  async guardadoMovimentar(aplicacao, tipo, valor, data, chave) { await rpc('guardado_movimentar', { aplicacao, tipo, valor, data, chave }) },
  async guardadoEncerrar(aplicacao) { await rpc('guardado_encerrar', { aplicacao }) },
  async guardadoCustoDoGasto(familia, valor) { return normalizaCusto(await rpc('guardado_custo_do_gasto', { familia, valor })) },

  // ---------- CONTRATO2.md, seção B: Escritório que cobra e Lembretes ----------
  async escritorioHoje(familia) { return normalizaEscritorio(await rpc('escritorio_hoje', { familia }), papeis.get(familia) === 'equipe') },
  async escritorioResponder(familia, pergunta_id, opcao, dados) {
    // banco: {ok, corrigiu, efeito:{mensagem?...}, anotado, escritorio}. Responder de novo a mesma pergunta corrige.
    const r = await rpc<any>('escritorio_responder', { familia, pergunta_id, opcao, dados: dados || {} })
    return { ...(r?.efeito?.mensagem ? { mensagem: String(r.efeito.mensagem) } : {}), ...(r?.anotado?.id ? { diario_id: String(r.anotado.id) } : {}) }
  },
  async escritorioRelatorio(familia, de, ate) { return normalizaRelatorio(await rpc('escritorio_relatorio', { familia, de, ate })) },
  async escritorioDiario(familia, funcionario, limite, antes) { const r = await rpc<any>('escritorio_diario', { familia, funcionario: idFuncNoBanco(funcionario), limite, antes: antes || null }); return ((Array.isArray(r) ? r : r?.itens || r?.diario) || []).map(normalizaLinha) },

  // ---------- CONTRATO3: cadastro do Analista de Cartão e do Fiscal da Feira ----------
  async membros(familia) {
    const { data, error } = await sb().from('membros').select('id, nome, papel').eq('familia_id', familia).eq('ativo', true).in('papel', ['casal', 'pessoa']).order('criado_em')
    if (error) erro(error)
    return (data || []).map((m: any) => ({ id: String(m.id), nome: String(m.nome), ...(m.papel ? { papel: m.papel as Papel } : {}) }))
  },
  async cartaoSalvar(familia, c) {
    // com `cartao` o banco troca TODOS os campos: a ficha sempre manda o cadastro inteiro. `titular` é o id do membro da família.
    await rpc('cartao_salvar', { familia, apelido: c.nome, cartao: c.id || null, banco: c.banco ?? null, titular: c.titular_id || null, dia_fecha: c.dia_fechamento ?? null, dia_vence: c.dia_vencimento ?? null, limite: c.limite ?? null, taxa_valor: c.taxa_valor ?? null, taxa_periodo: c.taxa_valor ? c.taxa_periodo ?? 'ano' : null, taxa_mes: c.taxa_mes ?? null, taxa_isenta_acima: c.taxa_isenta_acima ?? null, final4: c.final4 ?? null, ativo: c.ativo !== false })
  },
  async faturasBanco(familia) {
    const { data, error } = await sb().from('cartao_faturas').select('cartao_id, mes, valor_banco, paga_em, paga_por').eq('familia_id', familia).order('mes', { ascending: false }).limit(60)
    if (error) erro(error)
    return (data || []).map(normalizaFaturaBanco)
  },
  async faturaInformar(familia, cartao, mes, d) {
    // o banco só muda o que vier; tirar a data de pagamento é `desfazer_pagamento`
    await rpc('fatura_informar', { familia, cartao, mes, ...(d.valor_banco != null ? { valor_banco: d.valor_banco } : {}), ...(d.paga_em ? { paga_em: d.paga_em } : d.paga_em === null ? { desfazer_pagamento: true } : {}) })
  },
  async feiras(familia) {
    const eq = papeis.get(familia) === 'equipe'
    // a equipe não pede o valor (a tranca do banco também não deixa ler lançamentos)
    const { data, error } = await sb().from('feiras').select(eq ? 'id, semana, data, loja, nota_caminho, sem_nota_motivo, feita_por' : 'id, semana, data, loja, nota_caminho, sem_nota_motivo, feita_por, lancamentos(valor)').eq('familia_id', familia).order('data', { ascending: false }).limit(26)
    if (error) erro(error)
    return (data || []).map((f: any) => normalizaFeira(f, eq))
  },
  async feiraRegistrar(familia, f) { await rpc('feira_registrar', { familia, data: f.data, valor: f.valor ?? null, loja: f.loja || null, chave: crypto.randomUUID() }) },
  async notaSubir(familia, feira, foto) {
    // bucket privado `notas`, caminho {familia}/{feira}.jpg, upsert false (a equipe só grava, não troca nem lê)
    const caminho = `${familia}/${feira}.jpg`
    const bytes = Uint8Array.from(atob(foto), ch => ch.charCodeAt(0))
    const up = await sb().storage.from('notas').upload(caminho, new Blob([bytes], { type: 'image/jpeg' }), { upsert: false, contentType: 'image/jpeg' })
    // já existe uma nota dessa feira no bucket: segue e só anota o caminho
    if (up.error && !/exists|duplicate/i.test(up.error.message || '')) erro(up.error)
    return caminho
  },
  async feiraAnexarNota(familia, feira, foto) {
    const caminho = await this.notaSubir(familia, feira, foto)
    await rpc('feira_anexar_nota', { feira, caminho })
    return caminho
  },
  async feiraSemNota(_familia, feira, motivo) { await rpc('feira_sem_nota', { feira, motivo }) },
  async estoque(familia) {
    const [it, ct] = await Promise.all([
      sb().from('estoque_itens').select('id, nome, categoria, ativo').eq('familia_id', familia).order('categoria').order('nome'),
      sb().from('estoque_contagens').select('id, semana, data, contado_por, itens').eq('familia_id', familia).order('data', { ascending: false }).limit(12),
    ])
    if (it.error) erro(it.error)
    if (ct.error) erro(ct.error)
    return { itens: (it.data || []).map(normalizaItem), contagens: (ct.data || []).map(normalizaContagem) }
  },
  async estoqueContar(familia, itens) { await rpc('estoque_contar', { familia, itens }) },
  async estoqueItemSalvar(familia, item) { await rpc('estoque_item_salvar', { familia, nome: item.nome, categoria: item.categoria, item: item.id || null, ativo: item.ativo !== false }) },
  async lembretes(familia) {
    // leitura simples da tabela, protegida pela tranca por família; apagado (ativo = false) não aparece
    const { data, error } = await sb().from('esc_lembretes').select('id, titulo, detalhe, quando, repetir, para, funcionario, feito_em').eq('familia_id', familia).eq('ativo', true).order('quando')
    if (error) erro(error)
    return (data || []).map(normalizaLembrete)
  },
  async lembreteCriar(familia, l) { await rpc('lembrete_criar', { familia, titulo: l.titulo, quando: l.quando, repetir: l.repetir, detalhe: l.detalhe || null, para: l.para || 'casal' }) },
  async lembreteConcluir(_familia, lembrete) { await rpc('lembrete_concluir', { lembrete }) },
  async lembreteAdiar(_familia, lembrete, ate) { await rpc('lembrete_adiar', { lembrete, ate }) },
  async lembreteApagar(_familia, lembrete) { await rpc('lembrete_apagar', { lembrete }) },

  async numerosSemana() {
    // banco: {ativacao:{valor,...}, retencao_30:{valor}, tempo_medio:{valor}, erros_conta:{valor, turno_atrasado}}; valor null = ainda sem família pra medir
    const r = await rpc<any>('numeros_semana')
    const v = (o: any) => (o?.valor == null ? null : num(o.valor))
    const ativ = v(r?.ativacao), ret = v(r?.retencao_30), t = v(r?.tempo_medio), e = v(r?.erros_conta) ?? 0
    const atrasado = !!r?.erros_conta?.turno_atrasado
    return [
      { chave: 'ativacao', nome: 'Ativação', valor: ativ ?? 0, texto: ativ == null ? 'sem dado' : ativ + '%', meta: 'meta 80%', ok: ativ != null && ativ >= 80, explicacao: `Famílias que lançaram 10 gastos na 1ª semana: ${num(r?.ativacao?.familias_ativadas)} de ${num(r?.ativacao?.familias_com_7_dias)}.` },
      { chave: 'retencao', nome: 'Retenção no dia 30', valor: ret ?? 0, texto: ret == null ? 'sem dado' : ret + '%', meta: 'meta 60%', ok: ret != null && ret >= 60, explicacao: `Famílias que usaram entre o dia 30 e o 36: ${num(r?.retencao_30?.familias_usando)} de ${num(r?.retencao_30?.familias_com_37_dias)}.` },
      { chave: 'tempo', nome: 'Tempo por lançamento', valor: t ?? 0, texto: t == null ? 'sem dado' : String(t).replace('.', ',') + ' s', meta: 'meta abaixo de 10 s', ok: t != null && t < 10, explicacao: `Média do toque no + até salvar, em ${num(r?.tempo_medio?.lancamentos_medidos)} lançamentos dos últimos 7 dias.` },
      { chave: 'erros', nome: 'Erros de conta', valor: e, texto: String(e), meta: 'meta 0', ok: e === 0 && !atrasado, explicacao: atrasado ? 'O teste da noite não rodou nas últimas 26 horas: confira o turno.' : 'Casos do teste da noite que falharam nos últimos 7 dias.' },
    ] as Numero[]
  },
  // ---------- E5: recebimentos com data (produto.recebimentos, f_05). A tranca do banco: o casal lê; só o dono cria e muda ----------
  async recebimentos(familia) {
    const { data, error } = await sb().from('recebimentos').select('*').eq('familia_id', familia).is('apagado_em', null).order('mes_previsto').order('criado_em')
    if (error) erro(error)
    const ms = await this.membros(familia).catch(() => [] as { id: string; nome: string }[])
    const eu = await meuMembro(familia)
    return (data || []).map((r: any) => normalizaRecebimento(r, ms, eu))
  },
  async recebimentoCriar(familia, r) {
    const eu = await meuMembro(familia)
    if (!eu) throw new Error('Não achei você nesta família. Saia e entre de novo.')
    const { error } = await sb().from('recebimentos').insert({ familia_id: familia, dono_membro: eu, descricao: r.descricao.trim(), valor_centavos: Math.round(r.valor * 100), mes_previsto: `${r.mes_previsto}-01`, tipo: r.tipo, certo: r.certo })
    if (error) erro(error)
  },
  async recebimentoMudar(familia, id, m) {
    const campos: Record<string, unknown> = {}
    if (m.recebido_em !== undefined) { campos.recebido_em = m.recebido_em; campos.valor_recebido_centavos = m.recebido_em && m.valor_recebido != null ? Math.round(m.valor_recebido * 100) : null }
    if (m.mes_novo !== undefined) campos.mes_novo = m.mes_novo ? `${m.mes_novo}-01` : null
    if (m.certo !== undefined) campos.certo = m.certo
    if (m.apagar) campos.apagado_em = new Date().toISOString()
    // o banco só deixa o dono mudar: se não for, volta 0 linhas e a tela avisa
    const { data, error } = await sb().from('recebimentos').update(campos).eq('id', id).eq('familia_id', familia).select('id')
    if (error) erro(error)
    if (!data?.length) throw new Error('Só quem é dono desse recebimento muda ele.')
  },
  // ---------- E6: objetivo 2029 (f_07), histórico, Focus (f_10) e os dados pro motor (f_08) ----------
  async objetivo(familia) {
    const [o, h, f, mb] = await Promise.all([
      sb().from('objetivo').select('parametros').eq('familia_id', familia).maybeSingle(),
      sb().from('objetivo_historico').select('quem, quando, antes, depois').eq('familia_id', familia).order('quando', { ascending: false }).limit(20),
      sb().from('focus_indices').select('ano, selic_fim, ipca, divulgado_em, fonte').order('ano').order('divulgado_em', { ascending: false }),
      sb().from('membros').select('user_id, nome').eq('familia_id', familia),
    ])
    if (o.error) erro(o.error)
    const nomes = new Map((mb.data || []).map((m: any) => [m.user_id, m.nome]))
    const focus = new Map<number, any>()
    for (const x of f.data || []) if (!focus.has(x.ano)) focus.set(x.ano, x)
    return {
      parametros: (o.data?.parametros as ParametrosObjetivo) ?? null,
      historico: (h.data || []).map((x: any) => ({ quem: nomes.get(x.quem) ?? null, quando: x.quando, antes: x.antes, depois: x.depois })),
      focus: [...focus.values()].map((x: any) => ({ ano: Number(x.ano), selic_fim: String(x.selic_fim), ipca: String(x.ipca), divulgado_em: String(x.divulgado_em), fonte: String(x.fonte) })),
    }
  },
  async objetivoSalvar(familia, p) {
    // f_12: 1 função no banco (objetivo_salvar). Antes (D2): select e depois update só de parametros ou insert; os 2
    // salvando juntos pela 1ª vez davam chave repetida. O banco grava o histórico (quem, quando, antes e depois).
    await rpc('objetivo_salvar', { familia, parametros: p })
  },
  // ---------- E7 (F8) com a f_12: o reajuste do teto votado no banco ----------
  async reajusteSituacao(familia, mes) { return normalizaReajuste(await rpc('reajuste_situacao', { familia, mes_vigencia: `${mes}-01` })) },
  async reajusteVotar(familia, mes, teto, ipca) { return normalizaReajuste(await rpc('reajuste_votar', { familia, mes_vigencia: `${mes}-01`, teto_centavos: teto, ipca })) },
  // R1: o banco calcula o limite novo pelo IPCA votado; a tela não manda valor
  async reajusteAplicar(familia, envelope, mes) { await rpc('reajuste_aplicar', { familia, envelope, mes_vigencia: `${mes}-01` }) },

  async futuroEntradas(familia) { return entradaDoBanco(await rpc<FuturoBanco>('futuro_entradas', { familia })) },
  // ---------- E8: desejos (produto.desejos, f_06). A tranca do banco: o casal lê todos, a pessoa só os dela; só o dono muda ----------
  async desejos(familia) {
    const { data, error } = await sb().from('desejos').select('*').eq('familia_id', familia).is('apagado_em', null).order('mes').order('criado_em')
    if (error) erro(error)
    const ms = await this.membros(familia).catch(() => [] as { id: string; nome: string }[])
    const eu = await meuMembro(familia)
    const reaisDe = (c: unknown) => (c == null ? null : num(c) / 100)
    return (data || []).map((d: any) => ({
      id: String(d.id), dono_membro: String(d.dono_membro), dono_nome: ms.find(m => m.id === String(d.dono_membro))?.nome ?? null, meu: !!eu && String(d.dono_membro) === eu,
      nome: String(d.nome), valor: num(d.valor_centavos) / 100, mes: String(d.mes).slice(0, 7), volta_de: d.volta_de, volta: num(d.volta_centavos) / 100,
      volta_mes: d.volta_mes ? String(d.volta_mes).slice(0, 7) : null, antecipado: reaisDe(d.antecipado_centavos), volta_certa: !!d.volta_certa, situacao: d.situacao,
    }))
  },
  async desejoCriar(familia, d) {
    const eu = await meuMembro(familia)
    if (!eu) throw new Error('Não achei você nesta família. Saia e entre de novo.')
    const nada = d.volta_de === 'nada'
    const { error } = await sb().from('desejos').insert({
      familia_id: familia, dono_membro: eu, nome: d.nome.trim(), valor_centavos: Math.round(d.valor * 100), mes: `${d.mes}-01`, volta_de: d.volta_de,
      volta_centavos: nada ? 0 : Math.round(d.volta * 100), volta_mes: nada || !d.volta_mes ? null : `${d.volta_mes}-01`,
      antecipado_centavos: d.volta_de === 'contrato' && d.antecipado != null ? Math.round(d.antecipado * 100) : null, volta_certa: !nada && d.volta_certa,
    })
    if (error) erro(error)
  },
  async desejoMudar(familia, id, m) {
    const campos: Record<string, unknown> = {}
    if (m.situacao) campos.situacao = m.situacao
    if (m.apagar) campos.apagado_em = new Date().toISOString()
    // o banco só deixa o dono mudar: se não for, volta 0 linhas e a tela avisa
    const { data, error } = await sb().from('desejos').update(campos).eq('id', id).eq('familia_id', familia).select('id')
    if (error) erro(error)
    if (!data?.length) throw new Error('Só quem é dono desse desejo muda ele.')
  },
  async exportarFamilia(familia) { return rpc('exportar_familia', { familia }) },
  async exportarMeu(familia) { return rpc('exportar_meu', { familia }) },
  async apagarFamilia(familia, confirmacao) { await rpc('apagar_familia', { familia, confirmacao }) },
}
