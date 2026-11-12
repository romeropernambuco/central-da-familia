// Arruma as respostas do CONTRATO2.md (Guardado, Escritório, Lembretes) no formato das telas.
// Tolerante de propósito: campo que faltar vira zero ou lista vazia, nunca tela quebrada. Sem Supabase aqui: dá pra testar sozinho.
import type { Abre, Cartao, Contagem, EstadoItem, FaturaBanco, Feira, ItemEstoque, LinhaDiario, Pede, CustoDoGasto, EscritorioHoje, EstadoFuncionario, GuardadoHoje, Lembrete, PerguntaEsc, RelatorioEsc, Repetir, TipoAplicacao } from './tipos'
import { hojeRecife } from '../lib/formato'
import { motivoSemRender } from '../lib/guardado'

const num = (v: unknown) => Number(v) || 0
const txt = (v: unknown) => (v == null ? '' : String(v))
/** O banco chama os funcionários por nomes compridos; as telas usam os curtos. */
const APELIDO: Record<string, string> = { guardiao_colchao: 'colchao', analista_cartao: 'cartao', folha_casa: 'folha', fiscal_feira: 'fiscal', gestor_guardado: 'guardado' }
const NOME_NO_BANCO: Record<string, string> = Object.fromEntries(Object.entries(APELIDO).map(([a, b]) => [b, a]))
export const idFunc = (v: unknown) => APELIDO[txt(v)] || txt(v)
export const idFuncNoBanco = (id: string) => NOME_NO_BANCO[id] || id
/** Sigla sozinha não entra em tela: a conta que vem do banco troca CDI e IOF por palavra de casa. */
export const semSigla = (t: string) => t.replace(/\bdo CDI\b(?! \()/g, 'da taxa dos bancos').replace(/\bCDI\b(?! \()/g, 'taxa dos bancos').replace(/\bIOF\b/g, 'imposto de quem tira antes de 30 dias').replace(/\bFGC\b/g, 'fundo que protege até R$ 250 mil por banco').replace(/\bIR\b/g, 'imposto de renda')
const TIPOS: TipoAplicacao[] = ['caixinha', 'cdb', 'lci_lca', 'poupanca', 'tesouro_selic']
const ESTADOS: EstadoFuncionario[] = ['vai_comecar', 'trabalhando', 'entregue', 'precisa_de_voce']
const REPETIR: Repetir[] = ['nunca', 'dia', 'semana', 'mes', 'ano']

export function normalizaGuardado(r: any, hoje = hojeRecife()): GuardadoHoje {
  const aplicacoes = (r?.aplicacoes || []).map((a: any) => ({
    id: txt(a.id), nome: txt(a.nome), banco: txt(a.banco), tipo: (TIPOS.includes(a.tipo) ? a.tipo : 'caixinha') as TipoAplicacao, pct_cdi: num(a.pct_cdi), saldo: num(a.saldo),
    rendeu_hoje_liquido: num(a.rendeu_hoje_liquido), rendeu_mes_liquido: num(a.rendeu_mes_liquido), ir_faixa: num(a.ir_faixa),
    vence_em: a.vence_em || null, liquidez: a.liquidez === 'vencimento' ? 'vencimento' as const : 'diaria' as const, fgc_ok: a.fgc_ok !== false,
  }))
  const hojeLiq = num(r?.rendeu_hoje_liquido)
  // o banco diz por que rendeu 0; se o campo não vier, o app deduz pelo calendário (sábado, domingo, feriado)
  const dito = r?.motivo_zero ?? r?.motivo ?? r?.por_que_zero ?? r?.aviso ?? null
  const motivo = dito ? txt(dito) : hojeLiq === 0 && aplicacoes.length ? motivoSemRender(hoje) : null
  return {
    total: num(r?.total), rendeu_hoje_bruto: num(r?.rendeu_hoje_bruto), rendeu_hoje_liquido: hojeLiq, rendeu_mes_liquido: num(r?.rendeu_mes_liquido),
    rendeu_desde_inicio_liquido: num(r?.rendeu_desde_inicio_liquido),
    cdi_usado: { data: txt(r?.cdi_usado?.data), pct_ano: num(r?.cdi_usado?.pct_ano), fonte: txt(r?.cdi_usado?.fonte) },
    por_dia_30: (r?.por_dia_30 || []).map((d: any) => ({ data: txt(d.data), liquido: num(d.liquido) })),
    aplicacoes,
    explicacao: (r?.explicacao || []).map((x: any) => ({ linha: semSigla(txt(x.linha)), valor: num(x.valor) })),
    atualizado_em: txt(r?.atualizado_em), motivo_zero: motivo ? motivo.charAt(0).toUpperCase() + motivo.slice(1) : null,
  }
}

export function normalizaCusto(r: any): CustoDoGasto {
  // banco: {tem_guardado, ate_fim_do_mes:{liquido}, em_12_meses:{liquido}}; sem Guardado (ou pessoa e equipe) vem só {tem_guardado:false}
  const v = (x: any) => num(typeof x === 'object' && x ? x.liquido : x)
  if (r?.tem_guardado === false) return { ate_fim_do_mes: 0, em_12_meses: 0 }
  return { ate_fim_do_mes: v(r?.ate_fim_do_mes), em_12_meses: v(r?.em_12_meses) }
}

function normalizaPergunta(p: any, semDinheiro: boolean): PerguntaEsc {
  const pede = (v: unknown) => (['data', 'valor', 'texto'].includes(v as string) ? (v as Pede) : undefined)
  const abre = (v: unknown) => (['lancar', 'guardado', 'cartao', 'nota', 'contagem'].includes(v as string) ? (v as Abre) : undefined)
  return {
    id: txt(p.id), funcionario: idFunc(p.funcionario), pergunta: txt(p.pergunta), contexto: txt(p.contexto),
    // equipe da casa: mesmo que o banco mande, o valor em dinheiro não entra na memória do aparelho
    ...(p.valor != null && !semDinheiro ? { valor: num(p.valor) } : {}),
    opcoes: (p.opcoes || []).map((o: any) => ({ id: txt(o.id), rotulo: txt(o.rotulo), ...(pede(o.pede) ? { pede: pede(o.pede) } : {}), ...(pede(o.pede2) ? { pede2: pede(o.pede2) } : {}), ...(abre(o.abre) ? { abre: abre(o.abre) } : {}) })),
    vence_em: p.vence_em || null, atrasado_dias: num(p.atrasado_dias),
    ...(p.mensagem ? { mensagem: txt(p.mensagem) } : {}), ...(p.curta || p.assunto ? { assunto: txt(p.curta || p.assunto) } : {}), ...(p.partes ? { partes: { vi: txt(p.partes.vi), importa: txt(p.partes.importa), sugiro: txt(p.partes.sugiro) } } : {}), espera_dias: num(p.espera_dias ?? p.dias_esperando),
  }
}

export function normalizaEscritorio(r: any, semDinheiro = false): EscritorioHoje {
  return {
    precisa_de_voce: (r?.precisa_de_voce || []).map((p: any) => normalizaPergunta(p, semDinheiro)),
    trabalhando: (r?.trabalhando || []).map((t: any) => ({ funcionario: idFunc(t.funcionario ?? t.id), resumo: t.resumo ? txt(t.resumo) : undefined })),
    entregue: semDinheiro ? [] : (r?.entregue || []).map((e: any) => ({ funcionario: idFunc(e.funcionario), resumo: txt(e.resumo), numero: e.numero == null ? null : num(e.numero) })),
    funcionarios: (r?.funcionarios || []).map((f: any) => ({ id: idFunc(f.id), nome: txt(f.nome), sala: txt(f.sala), estado: (ESTADOS.includes(f.estado) ? f.estado : 'vai_comecar') as EstadoFuncionario, frase: txt(f.frase || f.fez_hoje || f.sem_pergunta), ...(Array.isArray(f.faz) && f.faz.length ? { faz: f.faz.map(txt) } : {}),
      ...(f.cadastro_resumo && !semDinheiro ? { cadastro_resumo: typeof f.cadastro_resumo === 'string' ? f.cadastro_resumo : txt(f.cadastro_resumo?.titulo ?? f.cadastro_resumo?.texto) } : {}),
      ...(Array.isArray(f.ultimas_respostas) ? { ultimas_respostas: semDinheiro ? [] : f.ultimas_respostas.map(normalizaLinha) } : {}) })),
  }
}

export function normalizaLinha(d: any): LinhaDiario {
  // banco: {id, quando, data:"12/11", hora:"10:05", pergunta_curta, pergunta, resposta, por, anotado:"anotado às 10:05"}
  const hoje = hojeRecife(), ddmm = `${hoje.slice(8)}/${hoje.slice(5, 7)}`
  const qt = d.data && d.hora ? (d.data === ddmm && d.anotado ? txt(d.anotado) : `${d.data}, ${d.hora}`) : undefined
  const ref = d.ref ?? d.pergunta_id
  return { id: txt(d.id), ...(ref ? { ref: txt(ref) } : {}), ...(qt ? { quando_txt: qt } : {}), funcionario: idFunc(d.funcionario), assunto: txt(d.pergunta_curta ?? d.curta ?? d.assunto), pergunta: txt(d.pergunta), resposta: txt(d.resposta), quando: txt(d.quando), adiado_ate: d.adiado_ate || null, respondido_por: d.por || d.respondido_por_nome || d.respondido_por || null }
}
const numOuNada = (v: unknown) => (v == null || v === '' ? null : num(v))
/** Cartão: aceita os nomes antigos (dia_fechamento, dia_vencimento) e os do CONTRATO3 (dia_fecha, dia_vence). */
export function normalizaCartao(c: any): Cartao {
  return { id: txt(c.id), nome: txt(c.apelido ?? c.nome), dia_fechamento: numOuNada(c.dia_fecha ?? c.dia_fechamento), dia_vencimento: numOuNada(c.dia_vence ?? c.dia_vencimento), banco: c.banco || null, titular: c.titular_nome || null, titular_id: c.titular_membro || null,
    limite: numOuNada(c.limite), taxa_valor: numOuNada(c.taxa_valor), taxa_periodo: c.taxa_periodo === 'ano' ? 'ano' : c.taxa_periodo === 'mes' ? 'mes' : null, taxa_mes: numOuNada(c.taxa_mes), taxa_isenta_acima: numOuNada(c.taxa_isenta_acima), final4: c.final4 || null, ativo: c.ativo !== false }
}
export const normalizaFaturaBanco = (f: any): FaturaBanco => ({ cartao_id: txt(f.cartao_id), mes: txt(f.mes).slice(0, 7), valor_banco: numOuNada(f.valor_banco), paga_em: f.paga_em || null, paga_por: f.paga_por_nome || f.paga_por || null })
/** Feira: o valor vem do lançamento ligado e só chega pro casal. */
export function normalizaFeira(f: any, semDinheiro = false): Feira {
  const v = f.valor ?? f.lancamentos?.valor ?? f.lancamento?.valor
  return { id: txt(f.id), semana: txt(f.semana), data: txt(f.data), ...(v != null && !semDinheiro ? { valor: num(v) } : {}), loja: f.loja || null, tem_nota: !!(f.tem_nota ?? f.nota_caminho), sem_nota_motivo: f.sem_nota_motivo || null, feita_por: f.feita_por_nome || f.feita_por || null }
}
export const normalizaItem = (i: any): ItemEstoque => ({ id: txt(i.id), nome: txt(i.nome), categoria: txt(i.categoria || 'Despensa'), ativo: i.ativo !== false })
export const normalizaContagem = (c: any): Contagem => ({ id: txt(c.id), semana: txt(c.semana), data: txt(c.data), contado_por: c.contado_por_nome || c.contado_por || null, itens: (c.itens || []).map((i: any) => ({ item_id: txt(i.item_id), estado: (['tem', 'pouco', 'acabou'].includes(i.estado) ? i.estado : 'tem') as EstadoItem })) })

export function normalizaLembrete(l: any): Lembrete {
  return { id: txt(l.id), titulo: txt(l.titulo), detalhe: l.detalhe || null, quando: txt(l.quando), repetir: (REPETIR.includes(l.repetir) ? l.repetir : 'nunca') as Repetir, para: txt(l.para || 'eu'), funcionario: l.funcionario || null, feito_em: l.feito_em || null }
}

export function normalizaRelatorio(r: any): RelatorioEsc {
  const fs: any[] = r?.funcionarios || r?.por_funcionario || []
  const diario: any[] = r?.diario || r?.linha_do_tempo || []
  const minutos = (f: any): number | null => {
    if (f.tempo_medio_min != null) return num(f.tempo_medio_min)
    if (f.tempo_medio_horas != null) return num(f.tempo_medio_horas) * 60
    if (f.tempo_medio_segundos != null) return num(f.tempo_medio_segundos) / 60
    return f.tempo_medio == null ? null : num(f.tempo_medio)
  }
  return {
    funcionarios: fs.map(f => ({ funcionario: idFunc(f.id ?? f.funcionario ?? f.nome), perguntas: num(f.perguntas), respondidas: num(f.respondidas), pendentes: num(f.pendentes), tempo_medio_min: minutos(f) })),
    diario: diario.map(normalizaLinha),
  }
}

/** Nome do funcionário ou da sala sem acento e em minúsculas, pra casar "Cartões" com "cartoes". */
export const chaveSimples = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
