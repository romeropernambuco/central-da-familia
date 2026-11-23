import { donoDoInsight } from './donos'
import type { OpcaoPergunta } from '../../api/tipos'
import { diasEntre } from '../formato'
import { AVISO_PRAZO_DIAS } from '../dinheiroNaRua'
import { diaValido, mesValido, tempoRecife } from './tempo'
import type { AcaoInsight, Insight, MemoriaInsights, SnapshotInsights, TipoInsight } from './tipos'

export const ETIQUETA_EXEMPLO = 'Exemplo: nada é gravado na família real'
const inteiro = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n)
const id = (s: unknown): s is string => typeof s === 'string' && s.length > 0 && s.length <= 200
const lista = <T>(a: readonly T[] | undefined): readonly T[] => (Array.isArray(a) ? a : [])
const chave = (...s: string[]) => JSON.stringify(s)
const op = (id: string, rotulo: string, pede?: 'data' | 'texto'): OpcaoPergunta => ({
  id,
  rotulo,
  ...(pede ? { pede } : {}),
})
const controles = [op('depois', 'Depois'), op('resolvido', 'Já resolvido')]
const ordem: TipoInsight[] = [
  'fatura_vencendo',
  'parcelas',
  'aplicacao',
  'negocio_prazo',
  'aluguel_atrasado',
  'conta_do_ano',
  'fatura_divergente',
  'reserva',
  'recebimento',
  'feira_nota',
  'contrato_imovel',
  'objetivo',
]

/** Candidatos sem efeitos: exportado para auditar cada regra, antes da arbitragem por aba. */
export function candidatosInsights(s: SnapshotInsights, agora: unknown): Insight[] {
  const t = tempoRecife(agora)
  if (
    !t ||
    !s ||
    !['real', 'exemplo'].includes(s.modo) ||
    s.origem !== s.modo ||
    !['casal', 'equipe', 'pessoa'].includes(s.papel)
  )
    return []
  const out: Insight[] = []
  const add = (
    tipo: TipoInsight,
    rota: Insight['rota'],
    funcionario: string,
    assunto: string[],
    pergunta: string,
    acao: AcaoInsight,
    opcoes: OpcaoPergunta[],
    contexto = '',
    privados: string[] = [],
    vence?: string,
    fixa?: 0 | 1 | 2,
  ) => {
    const dias = vence && diaValido(vence) ? diasEntre(t.dia, vence) : null
    const prioridade = fixa ?? (dias === 0 ? 0 : dias !== null && dias > 0 ? 1 : 2)
    // Só eventos que de fato vencem hoje atravessam o silêncio; divergência não herda vencimento.
    if ((t.hora >= 22 || t.hora < 7) && prioridade !== 0) return
    const k = chave(...assunto)
    out.push({
      id: `insight:${tipo}:${k}`,
      chave: k,
      tipo,
      rota,
      funcionario: donoDoInsight({ tipo, funcionario }),
      pergunta,
      contexto,
      trechosPrivados: privados,
      opcoes: [...opcoes, ...controles.map(o => ({ ...o }))],
      acao,
      prioridade,
      ...(vence ? { vence_em: vence } : {}),
      exemplo: s.modo === 'exemplo',
      ...(s.modo === 'exemplo' ? { etiqueta: ETIQUETA_EXEMPLO } : {}),
    })
  }
  if (s.papel === 'casal') {
    for (const f of lista(s.faturas)) {
      if (!f || !id(f.cartaoId) || !mesValido(f.mes) || !diaValido(f.vencimento) || !inteiro(f.total)) continue
      const nome = typeof f.nome === 'string' ? f.nome : ''
      const assunto = ['fatura', f.cartaoId, f.mes]
      const itens = lista(f.composicao).filter(x => x && id(x.id) && typeof x.nome === 'string' && inteiro(x.centavos))
      const composicao: AcaoInsight = {
        tipo: 'composicao',
        cartaoId: f.cartaoId,
        mes: f.mes,
        itens: [...itens],
        total: f.total,
        disponivel: f.composicaoDisponivel,
      }
      const falta = diasEntre(t.dia, f.vencimento)
      if (f.paga === false && falta >= 0 && falta <= 3) {
        add(
          'fatura_vencendo',
          'cartoes',
          'cartao',
          assunto,
          'Sua fatura vence em breve. Já pagou?',
          f.podeInformar ? { tipo: 'informar_pagamento', cartaoId: f.cartaoId, mes: f.mes } : composicao,
          [
            ...(f.podeInformar
              ? [op('paguei_hoje', 'Paguei hoje'), op('paguei_data', 'Informar outro dia de pagamento', 'data')]
              : []),
            op('composicao', 'Ver compras desta fatura'),
          ],
          [
            nome ? `Cartão: ${nome}.` : '',
            itens.some(i => i.parcela === true) ? 'Há parcelas vencendo nesta fatura' : '',
          ]
            .filter(Boolean)
            .join(' '),
          [nome],
          f.vencimento,
        )
        if (itens.some(i => i.parcela === true))
          add(
            'parcelas',
            'cartoes',
            'cartao',
            assunto,
            'Há parcelas vencendo nesta fatura',
            composicao,
            [op('composicao', 'Ver compras desta fatura')],
            nome ? `Cartão: ${nome}.` : '',
            [nome],
            f.vencimento,
          )
      }
      if (inteiro(f.banco) && Math.abs(f.banco - f.total) >= 1)
        add(
          'fatura_divergente',
          'cartoes',
          'cartao',
          assunto,
          'A fatura não bate com as compras anotadas. Vamos conferir?',
          composicao,
          [op('composicao', 'Ver compras desta fatura')],
          nome ? `Cartão: ${nome}.` : '',
          [nome],
        )
    }
    const r = s.reserva
    if (
      r &&
      r.mes === t.dia.slice(0, 7) &&
      inteiro(r.combinada) &&
      r.combinada > 0 &&
      inteiro(r.livre) &&
      r.livre < r.combinada
    )
      add(
        'reserva',
        'planejamento',
        'colchao',
        ['reserva', r.mes],
        'O livre ficou abaixo da reserva. Como vamos recompor?',
        { tipo: 'atalho', destino: '#/planejamento' },
        [op('abrir', 'Revisar a reserva')],
      )
    for (const r of lista(s.recebimentos)) {
      if (!r || !id(r.id) || r.recebido !== false) continue
      const mes = r.mesNovo || r.mesPrevisto
      if (mesValido(mes) && mes < t.dia.slice(0, 7))
        add(
          'recebimento',
          'planejamento',
          'tesoureiro',
          ['recebimento', r.id, mes],
          'Esse dinheiro já entrou ou adiamos a previsão?',
          { tipo: 'recebimento', id: r.id, meu: r.meu === true, ...(inteiro(r.valor) ? { valor: r.valor } : {}) },
          r.meu
            ? [op('recebido', 'Confirmar recebimento', 'data'), op('reagendar', 'Reagendar previsão', 'data')]
            : [op('abrir', 'Ver recebimentos')],
          typeof r.nome === 'string' ? `Recebimento: ${r.nome}.` : '',
          typeof r.nome === 'string' ? [r.nome] : [],
        )
    }
    for (const a of lista(s.aplicacoes)) {
      if (!a || !id(a.id) || a.ativa !== true || !diaValido(a.vencimento)) continue
      const dias = diasEntre(t.dia, a.vencimento)
      if (dias >= 0 && dias <= 15)
        add(
          'aplicacao',
          'guardado',
          'guardado',
          ['aplicacao', a.id, a.vencimento],
          'Sua aplicação está vencendo. Quer revisar o destino?',
          { tipo: 'atalho', destino: '#/guardado' },
          [op('abrir', 'Revisar destino')],
          typeof a.nome === 'string' ? `Aplicação: ${a.nome}.` : '',
          typeof a.nome === 'string' ? [a.nome] : [],
          a.vencimento,
        )
    }
    // Dinheiro na rua: 15 dias antes, no dia do prazo (chave própria, volta mesmo se já respondeu antes) e depois dele.
    for (const n of lista(s.negocios)) {
      if (!n || !id(n.id) || typeof n.nome !== 'string' || !diaValido(n.prazo) || !inteiro(n.naRua) || n.naRua <= 0)
        continue
      const dias = diasEntre(t.dia, n.prazo)
      if (dias > AVISO_PRAZO_DIAS) continue
      const contexto = `Negócio: ${n.nome}. Prazo: ${n.prazo.slice(8, 10)}/${n.prazo.slice(5, 7)}/${n.prazo.slice(0, 4)}.`
      const abrir = [op('abrir', 'Ver o negócio')]
      if (dias < 0)
        add(
          'negocio_prazo',
          'guardado',
          'guardado',
          ['negocio_prazo', n.id, n.prazo, 'atrasado', t.dia.slice(0, 7)],
          'Um dinheiro na rua passou do prazo. Vamos cobrar ou combinar outra data?',
          { tipo: 'atalho', destino: '#/guardado' },
          abrir,
          contexto,
          [n.nome],
          undefined,
          1,
        )
      else
        add(
          'negocio_prazo',
          'guardado',
          'guardado',
          ['negocio_prazo', n.id, n.prazo, dias === 0 ? 'hoje' : 'antes'],
          dias === 0
            ? 'Hoje é o prazo de um dinheiro na rua. Ele voltou?'
            : 'Um dinheiro na rua vence em breve. Já combinou a volta?',
          { tipo: 'atalho', destino: '#/guardado' },
          abrir,
          contexto,
          [n.nome],
          n.prazo,
        )
    }
    // Aluguel que passou do dia combinado (caderno do aluguel): o Ajudante dos Imóveis pergunta 1 vez por mês e imóvel
    for (const a of lista(s.alugueis)) {
      if (!a || !id(a.id) || typeof a.nome !== 'string' || !mesValido(a.mes) || !inteiro(a.dias) || a.dias < 1) continue
      add(
        'aluguel_atrasado',
        'guardado',
        'imoveis',
        ['aluguel_atrasado', a.id, a.mes],
        'Um aluguel passou do dia combinado e ainda não chegou. Ele já entrou?',
        { tipo: 'atalho', destino: '#/guardado' },
        [op('abrir', 'Abrir o caderno do aluguel')],
        `Imóvel: ${a.nome}. Atrasado há ${a.dias === 1 ? '1 dia' : `${a.dias} dias`}.`,
        [a.nome],
        undefined,
        1,
      )
    }
    // Causa na justiça (22/11): cada mês sem pagar aumenta o pedido; o Ajudante dos Imóveis lembra de passar ao advogado
    for (const a of lista(s.causas)) {
      if (!a || !id(a.id) || typeof a.nome !== 'string' || !mesValido(a.mes) || !inteiro(a.pedido) || a.pedido <= 0)
        continue
      const valor =
        'R$ ' + (a.pedido / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      add(
        'aluguel_atrasado',
        'guardado',
        'imoveis',
        ['aluguel_atrasado', a.id, a.mes, 'causa'],
        a.nunca
          ? 'O pedido da causa do aluguel ainda não foi passado ao advogado. Vamos mandar?'
          : 'O pedido da causa do aluguel subiu este mês. Vamos passar o valor novo ao advogado?',
        { tipo: 'atalho', destino: '#/guardado' },
        [op('abrir', 'Abrir a causa no caderno do aluguel')],
        `Imóvel: ${a.nome}. Pedido de hoje: ${valor}, com aluguéis, multa, juros e honorários.`,
        [a.nome],
        undefined,
        1,
      )
    }
    // Contas do ano (IPTU, IPVA...): o Contador lembra de 30 dias antes até a família marcar que pagou
    for (const c of lista(s.contasAno)) {
      if (!c || !id(c.id) || typeof c.nome !== 'string' || !diaValido(c.vence) || !inteiro(c.valor) || c.valor <= 0)
        continue
      const dias = diasEntre(t.dia, c.vence)
      const valor =
        'R$ ' + (c.valor / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      add(
        'conta_do_ano',
        'planejamento',
        'contador',
        ['conta_do_ano', c.id, c.vence],
        dias < 0
          ? 'Uma conta do ano já venceu. Ela foi paga?'
          : dias === 0
            ? 'Hoje vence uma conta do ano. Já pagou?'
            : 'Uma conta do ano vence em breve. O dinheiro já está separado?',
        { tipo: 'atalho', destino: '#/planejamento' },
        [op('abrir', 'Ver as contas do ano')],
        `${c.nome}: ${valor}, vence em ${c.vence.slice(8, 10)}/${c.vence.slice(5, 7)}/${c.vence.slice(0, 4)}.`,
        [c.nome],
        dias >= 0 ? c.vence : undefined,
        dias < 0 ? 1 : undefined,
      )
    }
    for (const c of lista(s.contratos)) {
      if (
        !id(c.id) ||
        !['sem contrato', 'depois do contrato', 'contrato sem data de fim', 'renova o contrato'].includes(c.motivo)
      )
        continue
      add(
        'contrato_imovel',
        'guardado',
        'imoveis',
        ['contrato_imovel', c.id, c.mes || 'sem-data', t.dia.slice(0, 7)],
        'Quer conferir o contrato deste imóvel?',
        { tipo: 'atalho', destino: '#/guardado' },
        [op('abrir', 'Conferir contrato')],
        'Imóvel: ' + c.nome + '.',
        [c.nome],
      )
    }
    const o = s.objetivo
    if (
      o &&
      mesValido(o.mes) &&
      o.mes >= t.dia.slice(0, 7) &&
      inteiro(o.projetado) &&
      inteiro(o.necessario) &&
      (o.faltaComMargem !== undefined
        ? inteiro(o.faltaComMargem) && o.faltaComMargem !== 0
        : o.projetado < o.necessario)
    )
      add(
        'objetivo',
        'planejamento',
        'tesoureiro',
        ['objetivo', o.mes, t.dia.slice(0, 7)],
        o.resumo
          ? 'Quer conferir a estimativa de renda de 2029?'
          : 'O plano está abaixo do necessário para o objetivo. Quer revisar aportes ou premissas?',
        { tipo: 'atalho', destino: '#/planejamento?aba=parametros' },
        [op('abrir', 'Revisar aportes ou premissas')],
        o.resumo,
      )
  }
  // A Casa é a única superfície da equipe; nenhum valor/nome de feira entra na proposta.
  if (s.papel === 'casal' || s.papel === 'equipe')
    for (const f of lista(s.feiras)) {
      if (
        f &&
        id(f.id) &&
        diaValido(f.data) &&
        f.data <= t.dia &&
        diaValido(f.semana) &&
        f.temNota === false &&
        (f.justificativa === null || (typeof f.justificativa === 'string' && !f.justificativa.trim()))
      )
        add(
          'feira_nota',
          'casa',
          'fiscal',
          ['feira', f.id, f.semana],
          'Quer guardar a nota da feira ou registrar que não houve nota?',
          { tipo: 'feira', id: f.id },
          [op('abrir', 'Guardar a nota'), op('sem_nota', 'Explicar por que não houve nota', 'texto')],
        )
    }
  return out
}

/** Puro, sem relógio global, IO, JSX, estado oculto global ou valores de demonstração. */
export function avaliarInsights(s: SnapshotInsights, agora: unknown, memoria: MemoriaInsights = {}): Insight[] {
  const t = tempoRecife(agora)
  if (!t) return []
  const porRota = new Set<string>()
  return candidatosInsights(s, agora)
    .filter(i => {
      const r = memoria && Object.prototype.hasOwnProperty.call(memoria, i.chave) ? memoria[i.chave] : undefined
      return !r || (!r.resolvido && r.vistoEm !== t.dia && !(typeof r.adiadoAte === 'number' && r.adiadoAte > t.ms))
    })
    .sort(
      (a, b) =>
        a.prioridade - b.prioridade ||
        (a.vence_em || '9999').localeCompare(b.vence_em || '9999') ||
        ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo) ||
        a.chave.localeCompare(b.chave),
    )
    .filter(i => {
      if (porRota.has(i.rota)) return false
      porRota.add(i.rota)
      return true
    })
}
