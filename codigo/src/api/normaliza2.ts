// Arruma as respostas do CONTRATO2.md (Guardado, Escritório, Lembretes) no formato das telas.
// Tolerante de propósito: campo que faltar vira zero ou lista vazia, nunca tela quebrada. Sem Supabase aqui: dá pra testar sozinho.
import type {
  Abre,
  Cartao,
  Contagem,
  EstadoItem,
  FaturaBanco,
  Feira,
  ItemEstoque,
  LinhaDiario,
  Pede,
  CustoDoGasto,
  EscritorioHoje,
  EstadoFuncionario,
  GuardadoHoje,
  Lembrete,
  PerguntaEsc,
  RelatorioEsc,
  Repetir,
  TipoAplicacao,
} from './tipos'
import { cru, lista, type Cru } from './cru'
import { hojeRecife } from '../lib/formato'
import { motivoSemRender } from '../lib/guardado'
import { registrarContrato } from '../lib/resumo/contrato'
import { APELIDO_BANCO } from '../lib/escritorio/equipe'

const num = (v: unknown) => Number(v) || 0
const txt = (v: unknown) => (v == null ? '' : String(v))
/** Texto que passa como veio; vazio ou ausente vira nada. */
const txtOuNada = (v: unknown) => (v as string) || null
/** O banco chama os funcionários por nomes compridos; as telas usam os curtos. */
// C2 (14/11): a lista vem da fonte única da equipe (lib/escritorio/equipe.ts)
const APELIDO: Record<string, string> = APELIDO_BANCO
const NOME_NO_BANCO: Record<string, string> = Object.fromEntries(Object.entries(APELIDO).map(([a, b]) => [b, a]))
export const idFunc = (v: unknown) => APELIDO[txt(v)] || txt(v)
export const idFuncNoBanco = (id: string) => NOME_NO_BANCO[id] || id
/** Sigla sozinha não entra em tela: a conta que vem do banco troca CDI e IOF por palavra de casa. */
export const semSigla = (t: string) =>
  t
    .replace(/\bdo CDI\b(?! \()/g, 'da taxa dos bancos')
    .replace(/\bCDI\b(?! \()/g, 'taxa dos bancos')
    .replace(/\bIOF\b/g, 'imposto de quem tira antes de 30 dias')
    .replace(/\bFGC\b/g, 'fundo que protege até R$ 250 mil por banco')
    .replace(/\bIR\b/g, 'imposto de renda')
const TIPOS: TipoAplicacao[] = ['caixinha', 'cdb', 'lci_lca', 'poupanca', 'tesouro_selic']
const ESTADOS: EstadoFuncionario[] = ['vai_comecar', 'trabalhando', 'entregue', 'precisa_de_voce']
const REPETIR: Repetir[] = ['nunca', 'dia', 'semana', 'mes', 'ano']

export function normalizaGuardado(bruto: unknown, hoje = hojeRecife()): GuardadoHoje {
  const r = cru(bruto),
    cdi = cru(r.cdi_usado)
  const aplicacoes = lista(r.aplicacoes).map(a => ({
    id: txt(a.id),
    nome: txt(a.nome),
    banco: txt(a.banco),
    tipo: (TIPOS.includes(a.tipo as TipoAplicacao) ? a.tipo : 'caixinha') as TipoAplicacao,
    pct_cdi: num(a.pct_cdi),
    saldo: num(a.saldo),
    rendeu_hoje_liquido: num(a.rendeu_hoje_liquido),
    rendeu_mes_liquido: num(a.rendeu_mes_liquido),
    ir_faixa: num(a.ir_faixa),
    vence_em: txtOuNada(a.vence_em),
    liquidez: a.liquidez === 'vencimento' ? ('vencimento' as const) : ('diaria' as const),
    fgc_ok: a.fgc_ok !== false,
    // C2 (revisão E2/E3): o banco manda titular_membro (id) e, quando vier, a lista titulares [{membro_id, nome}]; null = do casal
    titular:
      a.titular_membro !== undefined
        ? a.titular_membro == null
          ? null
          : txt(a.titular_membro)
        : a.titular !== undefined
          ? a.titular == null
            ? null
            : txt(a.titular)
          : undefined,
    titular_nome:
      a.titular_nome != null
        ? txt(a.titular_nome)
        : a.titular_membro != null && Array.isArray(a.titulares)
          ? ((lista(a.titulares).find(t => String(t?.membro_id) === String(a.titular_membro))?.nome ?? null) as
              string | null)
          : null,
  }))
  const hojeLiq = num(r.rendeu_hoje_liquido)
  // o banco diz por que rendeu 0; se o campo não vier, o app deduz pelo calendário (sábado, domingo, feriado)
  const dito = r.motivo_zero ?? r.motivo ?? r.por_que_zero ?? r.aviso ?? null
  const motivo = dito ? txt(dito) : hojeLiq === 0 && aplicacoes.length ? motivoSemRender(hoje) : null
  return registrarContrato(
    {
      total: num(r.total),
      rendeu_hoje_bruto: num(r.rendeu_hoje_bruto),
      rendeu_hoje_liquido: hojeLiq,
      rendeu_mes_liquido: num(r.rendeu_mes_liquido),
      rendeu_desde_inicio_liquido: num(r.rendeu_desde_inicio_liquido),
      cdi_usado: {
        data: txt(cdi.data),
        pct_ano: num(cdi.pct_ano),
        fonte: txt(cdi.fonte),
      },
      por_dia_30: lista(r.por_dia_30).map(d => ({ data: txt(d.data), liquido: num(d.liquido) })),
      aplicacoes,
      explicacao: lista(r.explicacao).map(x => ({ linha: semSigla(txt(x.linha)), valor: num(x.valor) })),
      atualizado_em: txt(r.atualizado_em),
      motivo_zero: motivo ? motivo.charAt(0).toUpperCase() + motivo.slice(1) : null,
    },
    Array.isArray(r.aplicacoes) ? r : { ...r, aplicacoes: undefined },
    ['aplicacoes'],
    ['total', 'rendeu_hoje_liquido', 'rendeu_mes_liquido', 'rendeu_desde_inicio_liquido'],
  )
}

export function normalizaCusto(bruto: unknown): CustoDoGasto {
  const r = cru(bruto)
  // banco: {tem_guardado, ate_fim_do_mes:{liquido}, em_12_meses:{liquido}}; sem Guardado (ou pessoa e equipe) vem só {tem_guardado:false}
  const v = (x: unknown) => num(typeof x === 'object' && x ? cru(x).liquido : x)
  if (r.tem_guardado === false) return { ate_fim_do_mes: 0, em_12_meses: 0 }
  return { ate_fim_do_mes: v(r.ate_fim_do_mes), em_12_meses: v(r.em_12_meses) }
}

function normalizaPergunta(p: Cru, semDinheiro: boolean): PerguntaEsc {
  const partes = cru(p.partes)
  const pede = (v: unknown) => (['data', 'valor', 'texto'].includes(v as string) ? (v as Pede) : undefined)
  const abre = (v: unknown) =>
    ['lancar', 'guardado', 'cartao', 'nota', 'contagem'].includes(v as string) ? (v as Abre) : undefined
  return {
    id: txt(p.id),
    funcionario: idFunc(p.funcionario),
    pergunta: txt(p.pergunta),
    contexto: txt(p.contexto),
    // equipe da casa: mesmo que o banco mande, o valor em dinheiro não entra na memória do aparelho
    ...(p.valor != null && !semDinheiro ? { valor: num(p.valor) } : {}),
    opcoes: lista(p.opcoes).map(o => ({
      id: txt(o.id),
      rotulo: txt(o.rotulo),
      ...(pede(o.pede) ? { pede: pede(o.pede) } : {}),
      ...(pede(o.pede2) ? { pede2: pede(o.pede2) } : {}),
      ...(abre(o.abre) ? { abre: abre(o.abre) } : {}),
    })),
    vence_em: txtOuNada(p.vence_em),
    atrasado_dias: num(p.atrasado_dias),
    ...(p.mensagem ? { mensagem: txt(p.mensagem) } : {}),
    ...(p.curta || p.assunto ? { assunto: txt(p.curta || p.assunto) } : {}),
    ...(p.partes ? { partes: { vi: txt(partes.vi), importa: txt(partes.importa), sugiro: txt(partes.sugiro) } } : {}),
    espera_dias: num(p.espera_dias ?? p.dias_esperando),
  }
}

export function normalizaEscritorio(bruto: unknown, semDinheiro = false): EscritorioHoje {
  const r = cru(bruto)
  return registrarContrato(
    {
      precisa_de_voce: lista(r.precisa_de_voce).map(p => normalizaPergunta(p, semDinheiro)),
      trabalhando: semDinheiro
        ? []
        : lista(r.trabalhando).map(t => ({
            funcionario: idFunc(t.funcionario ?? t.id),
            resumo: txt(t.resumo || t.frase) || undefined,
          })),
      entregue: semDinheiro
        ? []
        : lista(r.entregue).map(e => ({
            funcionario: idFunc(e.funcionario),
            resumo: txt(e.resumo),
            numero: e.numero == null ? null : num(e.numero),
          })),
      funcionarios: lista(r.funcionarios).map(f => ({
        id: idFunc(f.id),
        nome: txt(f.nome),
        sala: txt(f.sala),
        estado: (ESTADOS.includes(f.estado as EstadoFuncionario) ? f.estado : 'vai_comecar') as EstadoFuncionario,
        frase: txt(f.frase || f.fez_hoje || f.sem_pergunta),
        ...(Array.isArray(f.faz) && f.faz.length ? { faz: f.faz.map(txt) } : {}),
        ...(f.cadastro_resumo && !semDinheiro
          ? {
              cadastro_resumo:
                typeof f.cadastro_resumo === 'string'
                  ? f.cadastro_resumo
                  : txt(cru(f.cadastro_resumo).titulo ?? cru(f.cadastro_resumo).texto),
            }
          : {}),
        ...(Array.isArray(f.ultimas_respostas)
          ? { ultimas_respostas: semDinheiro ? [] : f.ultimas_respostas.map(normalizaLinha) }
          : {}),
      })),
    },
    bruto,
    ['precisa_de_voce'],
  )
}

export function normalizaLinha(bruto: unknown): LinhaDiario {
  const d = bruto as Cru
  // banco: {id, quando, data:"12/11", hora:"10:05", pergunta_curta, pergunta, resposta, por, anotado:"anotado às 10:05"}
  const hoje = hojeRecife(),
    ddmm = `${hoje.slice(8)}/${hoje.slice(5, 7)}`
  const qt = d.data && d.hora ? (d.data === ddmm && d.anotado ? txt(d.anotado) : `${d.data}, ${d.hora}`) : undefined
  const ref = d.ref ?? d.pergunta_id
  return {
    id: txt(d.id),
    ...(ref ? { ref: txt(ref) } : {}),
    ...(qt ? { quando_txt: qt } : {}),
    funcionario: idFunc(d.funcionario),
    assunto: txt(d.pergunta_curta ?? d.curta ?? d.assunto),
    pergunta: txt(d.pergunta),
    resposta: txt(d.resposta),
    quando: txt(d.quando),
    adiado_ate: txtOuNada(d.adiado_ate),
    respondido_por: txtOuNada(d.por || d.respondido_por_nome || d.respondido_por),
  }
}
const numOuNada = (v: unknown) => (v == null || v === '' ? null : num(v))
/** Cartão: aceita os nomes antigos (dia_fechamento, dia_vencimento) e os do CONTRATO3 (dia_fecha, dia_vence). */
export function normalizaCartao(bruto: unknown): Cartao {
  const c = bruto as Cru
  return {
    id: txt(c.id),
    nome: txt(c.apelido ?? c.nome),
    dia_fechamento: numOuNada(c.dia_fecha ?? c.dia_fechamento),
    dia_vencimento: numOuNada(c.dia_vence ?? c.dia_vencimento),
    banco: txtOuNada(c.banco),
    titular: txtOuNada(c.titular_nome),
    titular_id: txtOuNada(c.titular_membro),
    limite: numOuNada(c.limite),
    taxa_valor: numOuNada(c.taxa_valor),
    taxa_periodo: c.taxa_periodo === 'ano' ? 'ano' : c.taxa_periodo === 'mes' ? 'mes' : null,
    taxa_mes: numOuNada(c.taxa_mes),
    taxa_isenta_acima: numOuNada(c.taxa_isenta_acima),
    final4: txtOuNada(c.final4),
    ativo: c.ativo !== false,
  }
}
export const normalizaFaturaBanco = (bruto: unknown): FaturaBanco => {
  const f = bruto as Cru
  return registrarContrato(
    {
      cartao_id: txt(f.cartao_id),
      mes: txt(f.mes).slice(0, 7),
      valor_banco: numOuNada(f.valor_banco),
      paga_em: txtOuNada(f.paga_em),
      paga_por: txtOuNada(f.paga_por_nome || f.paga_por),
    },
    { ...f, valor_banco: 'valor_banco' in f ? true : undefined, paga_em: 'paga_em' in f ? true : undefined },
    ['cartao_id', 'mes', 'valor_banco', 'paga_em'],
  )
}
/** Feira: o valor vem do lançamento ligado e só chega pro casal. */
export function normalizaFeira(bruto: unknown, semDinheiro = false): Feira {
  const f = bruto as Cru
  const v = f.valor ?? cru(f.lancamentos).valor ?? cru(f.lancamento).valor
  return {
    id: txt(f.id),
    semana: txt(f.semana),
    data: txt(f.data),
    ...(v != null && !semDinheiro ? { valor: num(v) } : {}),
    loja: txtOuNada(f.loja),
    tem_nota: !!(f.tem_nota ?? f.nota_caminho),
    sem_nota_motivo: txtOuNada(f.sem_nota_motivo),
    feita_por: txtOuNada(f.feita_por_nome || f.feita_por),
  }
}
export const normalizaItem = (i: Cru): ItemEstoque => ({
  id: txt(i.id),
  nome: txt(i.nome),
  categoria: txt(i.categoria || 'Despensa'),
  ativo: i.ativo !== false,
})
export const normalizaContagem = (c: Cru): Contagem => ({
  id: txt(c.id),
  semana: txt(c.semana),
  data: txt(c.data),
  contado_por: txtOuNada(c.contado_por_nome || c.contado_por),
  itens: lista(c.itens).map(i => ({
    item_id: txt(i.item_id),
    estado: (['tem', 'pouco', 'acabou'].includes(i.estado as string) ? i.estado : 'tem') as EstadoItem,
  })),
})

export function normalizaLembrete(bruto: unknown): Lembrete {
  const l = bruto as Cru
  return {
    id: txt(l.id),
    titulo: txt(l.titulo),
    detalhe: txtOuNada(l.detalhe),
    quando: txt(l.quando),
    repetir: (REPETIR.includes(l.repetir as Repetir) ? l.repetir : 'nunca') as Repetir,
    para: txt(l.para || 'eu'),
    funcionario: txtOuNada(l.funcionario),
    feito_em: txtOuNada(l.feito_em),
  }
}

export function normalizaRelatorio(bruto: unknown): RelatorioEsc {
  const r = cru(bruto)
  const fs = lista(r.funcionarios || r.por_funcionario)
  const diario = lista(r.diario || r.linha_do_tempo)
  const minutos = (f: Cru): number | null => {
    if (f.tempo_medio_min != null) return num(f.tempo_medio_min)
    if (f.tempo_medio_horas != null) return num(f.tempo_medio_horas) * 60
    if (f.tempo_medio_segundos != null) return num(f.tempo_medio_segundos) / 60
    return f.tempo_medio == null ? null : num(f.tempo_medio)
  }
  return {
    funcionarios: fs.map(f => ({
      funcionario: idFunc(f.id ?? f.funcionario ?? f.nome),
      perguntas: num(f.perguntas),
      respondidas: num(f.respondidas),
      pendentes: num(f.pendentes),
      tempo_medio_min: minutos(f),
    })),
    diario: diario.map(normalizaLinha),
  }
}

/** Nome do funcionário ou da sala sem acento e em minúsculas, pra casar "Cartões" com "cartoes". */
export const chaveSimples = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
