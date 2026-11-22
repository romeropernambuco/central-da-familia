import type {
  Cartao,
  ControleReceitas,
  FamiliaMinha,
  Fatura,
  FaturaBanco,
  Feira,
  GuardadoHoje,
  ImovelTela,
  Lancamento,
  RecebimentoTela,
  ResumoHoje,
} from '../../api/tipos'
import type { FuturoEntrada, FuturoSaida } from '../futuro'
import { reais, simularCompra } from '../formato'
import { numerosRumo2029 } from '../rumo2029'
import { cartaoMeu } from '../dono'
import { lerNegocios } from '../dinheiroNaRua'
import { cadernoVazio, lerCaderno, situacaoDoMes } from '../aluguel'
import { CAUSA_PADRAO, contaDaCausa, lerCausa } from '../causaAluguel'
import { diaValido, mesValido, tempoRecife } from './tempo'
import type { FaturaInsight, SnapshotInsights } from './tipos'

/** Conversão só na fronteira API (reais) -> snapshot (centavos). Rejeita desconhecido/overflow. */
export function emCentavos(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const n = Math.round((v + Math.sign(v) * Number.EPSILON) * 100)
  return Number.isSafeInteger(n) ? n : null
}
export interface LeiturasInsights {
  cartoes?: Cartao[]
  faturas?: Fatura[]
  banco?: FaturaBanco[]
  lancamentos?: Lancamento[]
  resumo?: ResumoHoje | null
  recebimentos?: RecebimentoTela[]
  guardado?: GuardadoHoje
  feiras?: Feira[]
  futuro?: FuturoSaida | null
  mesObjetivo?: string
  controleReceitas?: ControleReceitas
  entradaObjetivo?: FuturoEntrada
  /** Dinheiro na rua, como veio do banco (produto.negocios_da_familia) */
  negocios?: unknown
  /** Imóveis e o caderno do aluguel (produto.aluguel_da_familia), para o aluguel que passou do dia */
  imoveis?: ImovelTela[]
  aluguel?: unknown
}

/** Aluguéis deste mês que passaram do dia combinado sem chegar (a mesma regra do caderno e da lista de imóveis). */
function alugueisAtrasados(imoveis: ImovelTela[], cru: unknown, dia: string) {
  const caderno = lerCaderno(cru)
  return imoveis.flatMap(i => {
    if (i.uso !== 'aluga') return []
    const s = situacaoDoMes(caderno[i.id] || cadernoVazio(), dia.slice(0, 7), dia)
    return s.tipo === 'atrasado' ? [{ id: i.id, nome: i.apelido, mes: dia.slice(0, 7), dias: s.dias }] : []
  })
}
/** Causas na justiça cujo pedido subiu desde a última vez que a família passou ao advogado (lib/causaAluguel). */
function causasParaAtualizar(imoveis: ImovelTela[], cru: unknown, dia: string) {
  const caderno = lerCaderno(cru)
  return imoveis.flatMap(i => {
    const c = caderno[i.id]
    if (i.uso !== 'aluga' || !c?.problema || !['advogado', 'despejo'].includes(c.problema.etapa)) return []
    const causa = lerCausa(c.problema.causa) || CAUSA_PADRAO
    const k = contaDaCausa(c, i.aluguel, causa, dia)
    const pedido = k && emCentavos(k.pedido)
    return k?.atualizar && pedido
      ? [{ id: i.id, nome: i.apelido, mes: dia.slice(0, 7), pedido, nunca: !causa.passado_em }]
      : []
  })
}
/** Adapta só leituras concluídas da API selecionada; nunca importa/cria EXEMPLO como fallback. */
export function montarSnapshot(
  familia: FamiliaMinha,
  modo: SnapshotInsights['modo'],
  d: LeiturasInsights,
  agora: unknown,
): SnapshotInsights {
  const s: SnapshotInsights = { papel: familia.papel, modo, origem: modo }
  const t = tempoRecife(agora)
  if (!t) return s
  if (familia.papel === 'casal') {
    // Sem a leitura de pagamentos, ausência não pode ser interpretada como "não pago".
    if (d.faturas && d.banco && d.cartoes)
      s.faturas = d.faturas.flatMap(f => {
        const c = d.cartoes!.find(c => c.id === f.cartao_id && c.ativo !== false)
        const total = emCentavos(f.total)
        if (!c || total === null || !mesValido(f.mes)) return []
        const b = d.banco!.find(b => b.cartao_id === f.cartao_id && b.mes.slice(0, 7) === f.mes)
        const composicao: FaturaInsight['composicao'] = []
        const vistos = new Set<string>()
        for (const l of d.lancamentos || []) {
          // O exemplo já devolve parcelas sintéticas: a compra original é a única fonte.
          if (
            l.parcela ||
            vistos.has(l.id) ||
            l.apagado_em ||
            l.cartao_id !== c.id ||
            !diaValido(l.data) ||
            l.data > t.dia ||
            emCentavos(l.valor) === null
          )
            continue
          vistos.add(l.id)
          const n = l.parcelas || 1
          if (!Number.isInteger(n) || n < 1 || n > 24 || !c.dia_fechamento || !c.dia_vencimento) continue
          // Reutiliza integralmente o cálculo existente de atribuição/valores das parcelas.
          const p = simularCompra(l.valor, n, l.data, c.dia_fechamento, c.dia_vencimento).find(p => p.mes === f.mes)
          const centavos = p && emCentavos(p.valor)
          if (typeof centavos === 'number')
            composicao.push({ id: l.id, nome: l.descricao || 'Compra anotada', centavos, parcela: n > 1 })
        }
        return [
          {
            cartaoId: c.id,
            mes: f.mes,
            nome: f.cartao,
            vencimento: f.vencimento,
            total,
            banco: b?.valor_banco == null ? null : emCentavos(b.valor_banco),
            paga: !!b?.paga_em,
            podeInformar: cartaoMeu(c, familia),
            composicao,
            composicaoDisponivel: d.lancamentos !== undefined,
          },
        ]
      })
    if (d.resumo && !d.resumo.so_nomes && d.resumo.envelopes) {
      const combinada = emCentavos(d.resumo.envelopes.reduce((s, e) => s + (e.colchao_meta || 0), 0)),
        livre = emCentavos(d.resumo.livre_mes)
      if (combinada !== null && livre !== null) s.reserva = { mes: t.dia.slice(0, 7), combinada, livre }
    }
    s.recebimentos = d.recebimentos?.map(r => ({
      id: r.id,
      nome: r.descricao,
      mesPrevisto: r.mes_previsto,
      mesNovo: r.mes_novo,
      recebido: !!r.recebido_em || !!d.controleReceitas?.[r.id]?.recebidas?.[r.mes_previsto],
      meu: r.meu,
      ...(emCentavos(r.valor) !== null ? { valor: emCentavos(r.valor)! } : {}),
    }))
    // guardadoHoje devolve apenas aplicações ativas: encerradas não constam nessa leitura.
    s.aplicacoes = d.guardado?.aplicacoes.map(a => ({ id: a.id, nome: a.nome, vencimento: a.vence_em, ativa: true }))
    if (d.negocios !== undefined)
      s.negocios = lerNegocios(d.negocios).flatMap(n => {
        if (n.encerrado_em) return []
        const soma = (tipo: 'pus' | 'voltou') =>
          n.movimentos.filter(m => m && m.tipo === tipo).reduce((v, m) => v + (Number(m.valor) || 0), 0)
        const naRua = emCentavos(soma('pus') - soma('voltou'))
        return naRua !== null && naRua > 0 ? [{ id: n.id, nome: n.nome, prazo: n.prazo, naRua }] : []
      })
    if (d.imoveis && d.aluguel !== undefined) {
      s.alugueis = alugueisAtrasados(d.imoveis, d.aluguel, t.dia)
      s.causas = causasParaAtualizar(d.imoveis, d.aluguel, t.dia)
    }
    // Necessário é de patrimônio FINANCEIRO: imóveis já contribuíram pelo aluguel no motor existente.
    const f = d.futuro
    s.contratos = f?.gatilhos
      ?.filter(
        g =>
          g.origem === 'imovel' &&
          g.tipo === 'aluguel' &&
          f.imoveis?.some(i => i.id === g.id && !i.vendido && i.uso !== 'mora'),
      )
      .map(g => ({ id: g.id, nome: g.nome, motivo: g.motivo, mes: g.mes }))
    if (f && f.modo !== 'renda' && f.linha.length && mesValido(d.mesObjetivo))
      s.objetivo = {
        mes: d.mesObjetivo,
        projetado: f.linha[f.linha.length - 1].saldo_final,
        necessario: f.patrimonio_necessario,
      }
    if (s.objetivo && f && d.entradaObjetivo) {
      const n = numerosRumo2029(f, d.entradaObjetivo)
      if (n.cobre_pct !== null && n.falta_com_margem !== null) {
        s.objetivo.faltaComMargem = n.falta_com_margem
        const saldo = (v: number) => `${v > 0 ? 'faltam' : 'sobram'} ${reais(Math.abs(v) / 100)} por mês`
        s.objetivo.resumo = `No cenário Garantido de 2029, ${saldo(n.falta_com_margem)}, com margem de segurança; é uma estimativa.`
      }
    }
  }
  if (familia.papel === 'casal' || familia.papel === 'equipe')
    s.feiras = d.feiras?.map(f => ({
      id: f.id,
      semana: f.semana,
      data: f.data,
      temNota: f.tem_nota,
      justificativa: f.sem_nota_motivo,
    }))
  return s
}
