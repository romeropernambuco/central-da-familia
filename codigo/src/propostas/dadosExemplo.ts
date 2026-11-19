import { apiExemplo, exemploComo } from '../api/exemplo'
import type { EstadoFuncionario, Papel } from '../api/tipos'
import { FUSO, saudacao } from '../lib/formato'
import { projecao } from '../lib/plano'
import { comporResumoFamilia } from '../lib/resumo/familia'
import { totaisDesejos } from '../lib/resumo/desejos'
import { totaisGuardado } from '../lib/resumo/guardado'
import * as ler from '../lib/resumo/leituras'
import { totaisDoMes } from '../lib/resumo/movimentacao'
import { livreDaSemana, numeroEnvelope, tetoDoMes } from '../lib/resumo/orcamento'
import { totalPendencias } from '../lib/resumo/pendencias'
import { porDiaDe } from '../lib/resumo/porDia'
import { recebimentosDoMes } from '../lib/resumo/recebimentos'
import type { CampoResumo, FonteResumo } from '../lib/resumo/tipos'
import { EQUIPE } from '../telas/escritorio/equipe'
import { completarEquipe } from '../telas/escritorio/useEquipe'

type Natureza = FonteResumo['natureza']
type Unidade = 'reais' | 'centavos' | 'percentual' | 'quantidade' | 'data' | 'mes' | 'texto' | 'indicador'
export type Campo<T, U extends Unidade> = { unidade: U; natureza: Natureza } & (
  | { estado: 'pronto'; valor: T }
  | { estado: 'vazio' | 'indisponivel'; valor: null }
)

function campo<T, U extends Unidade>(valor: T | null | undefined, unidade: U, natureza: Natureza): Campo<T, U> {
  if (valor == null) return { unidade, natureza, estado: 'indisponivel', valor: null }
  if (Array.isArray(valor) && !valor.length) return { unidade, natureza, estado: 'vazio', valor: null }
  return { unidade, natureza, estado: 'pronto', valor }
}

const real = (v: number | null | undefined, n: Natureza) => campo(v, 'reais', n)
const centavo = (v: number | null | undefined, n: Natureza) => campo(v, 'centavos', n)
const texto = (v: string | null | undefined) => campo(v, 'texto', 'cadastrado')
const contagem = (v: number | null | undefined, n: Natureza) => campo(v, 'quantidade', n)
const data = (v: string | null | undefined, n: Natureza) => campo(v, 'data', n)
const mesDe = (iso: string) => {
  const [ano, mes] = iso.split('-')
  return [ano, mes].join('-')
}
const diaDe = (iso: string) => iso.split('T').shift()!

// A composição do Início usa o mesmo contrato. A data de leitura não é uma conferência.
function leitura<T>(valor: T | null, fonte: FonteResumo, consultadoEm: string): { campo: CampoResumo<T>; repetir: () => void } {
  const meta = { fonte: [fonte], consultadoEm, conferidoEm: null, atualizadoEm: null }
  return {
    campo: valor == null ? { ...meta, estado: 'indisponivel', valor: null } : { ...meta, estado: 'pronto', valor },
    repetir: () => {},
  }
}

export type NivelAlerta = 'dinheiro em risco' | 'operacao' | 'lembrete'

/** Snapshot compartilhado por todas as propostas. A única API usada é a do exemplo. */
export async function carregarDadosInicio() {
  exemploComo('ana')
  const api = apiExemplo
  const familia = (await api.sessao())?.familias.find(f => f.papel === 'casal')
  if (!familia) throw new Error('Família de exemplo indisponível.')

  const hoje = ler.relogioResumo()
  const mes = mesDe(hoje)
  const { id } = familia
  const [saldo, orcamento, faturas, guardado, receitas, plano, imoveis, casa, mesAtual, desejos,
    escritorio, lancamentos, entradas, estoque, avisos, presenca] = await Promise.all([
    ler.lerSaldo(api, id), ler.lerOrcamento(api, familia, hoje), ler.lerFaturas(api, id, hoje),
    api.guardadoHoje(id), ler.lerRecebimentos(api, id), ler.lerPlano(api, id), ler.lerImoveis(api, id),
    ler.lerCasa(api, id, hoje), ler.lerMes(api, id, hoje), api.desejos!(id),
    api.escritorioHoje(id), ler.lerLancamentosMes(api, id, mes),
    api.config<{ data: string; valor: number }[]>(id, 'entradas', []),
    api.estoque(id), api.avisosCasa(id), api.config<Record<string, string[]>>(id, 'casa_presenca', {}),
  ])
  const consultadoEm = new Date().toISOString()
  const escopo = { familia: id, membro: familia.membroId ?? undefined, papel: familia.papel }
  const fonte = <T>(valor: T | null, recurso: string, natureza: Natureza) =>
    leitura(valor, { recurso, natureza, escopo }, consultadoEm)
  const resumo = comporResumoFamilia({
    saldoConta: fonte(saldo.contas.length ? { unidade: 'reais' as const, valor: saldo.saldo.valor } : null, 'saldosConta', 'cadastrado'),
    podeGastarHoje: fonte(orcamento, 'resumoHoje', 'previsto'),
    faturas: fonte(faturas, 'faturas', 'previsto'),
    aplicacoes: fonte({ unidade: 'reais', ...totaisGuardado(guardado) }, 'guardadoHoje', 'realizado'),
    recebimentos: fonte(recebimentosDoMes(receitas.lista, receitas.fontes, receitas.controle, mes), 'recebimentos', 'previsto'),
    plano2029: fonte(plano, 'futuroEntradas', 'estimado'),
    casa: fonte(casa, 'escritorioHoje/feiras/estoque', 'cadastrado'),
    imoveis: fonte(imoveis, 'imoveis', 'cadastrado'),
    movimentacaoMes: fonte(mesAtual, 'lancamentos/recebimentos/entradas', 'realizado'),
    desejos: fonte(totaisDesejos(desejos), 'desejos', 'cadastrado'),
    pendencias: fonte({ total: totalPendencias(escritorio) }, 'escritorioHoje', 'cadastrado'),
  })

  const meu = resumo.podeGastarHoje.valor?.envelope
  const limite = meu?.limite_base ?? meu?.limite_mes
  const fecha = meu && limite != null ? projecao(meu.gasto_mes, limite, hoje, meu.pontual_mes).fecha : null
  const mov = resumo.movimentacaoMes.valor
  const dias = new Set([...lancamentos.map(l => l.data), ...entradas.map(e => e.data),
    ...receitas.lista.flatMap(r => r.recebido_em ? [diaDe(r.recebido_em)] : [])])
  const serieMov = [...dias].filter(d => mesDe(d) === mes && d <= hoje).sort().map(d => {
    const totais = totaisDoMes(mes, d, lancamentos.filter(l => l.data === d),
      receitas.lista.filter(r => r.recebido_em && diaDe(r.recebido_em) === d), entradas.filter(e => e.data === d))
    return { data: d, entrou: totais.entrou, saiu: totais.saiu, saldo: totais.saldo }
  })

  const g = resumo.aplicacoes.valor
  const p = resumo.plano2029.valor
  const r = resumo.recebimentos.valor
  const c = resumo.casa.valor
  const d = resumo.desejos.valor
  const proximo = desejos.find(x => x.id === d?.primeiro)
  const equipe = completarEquipe(escritorio.funcionarios, { rec: receitas.lista, est: estoque, avisos, pres: presenca }, hoje)
  const perguntas = escritorio.precisa_de_voce

  return {
    pessoa: { nome: texto(familia.membroNome), papel: campo<Papel, 'texto'>(familia.papel, 'texto', 'cadastrado') },
    familia: { id, nome: texto(familia.nome) },
    saudacao: campo(saudacao(), 'texto', 'realizado'),
    data: data(hoje, 'realizado'),
    hojePodeGastar: {
      valor: real(resumo.podeGastarHoje.valor?.valor.valor, 'previsto'),
      ateDomingo: real(meu?.ate_domingo, 'previsto'),
      jaSaiu: real(meu?.gasto_hoje, 'realizado'),
      ritmoMes: {
        serieDiaria: campo(meu ? Object.entries(porDiaDe(lancamentos, meu.id, hoje)).sort(([a], [b]) => a.localeCompare(b))
          .map(([data, valor]) => ({ data, valor })) : null, 'reais', 'realizado'),
        projecao: real(fecha, 'estimado'),
        limite: real(limite, 'cadastrado'),
      },
    },
    saldoConta: real(resumo.saldoConta.valor?.valor, 'cadastrado'),
    faturas: {
      total: real(resumo.faturas.valor?.total, 'previsto'),
      proximas: campo(resumo.faturas.valor?.lista.map(f => ({
        id: f.cartao_id, nome: f.cartao, vencimento: data(f.vencimento, 'previsto'),
        valor: real(f.total, f.conferir ? 'previsto' : 'cadastrado'), conferir: f.conferir,
      })), 'indicador', 'previsto'),
    },
    aplicacoes: {
      total: real(g?.total, 'realizado'),
      rendeuHoje: real(g?.hoje, 'realizado'),
      serie30Dias: campo(guardado.por_dia_30, 'reais', 'realizado'),
      serieSaldo30Dias: campo(guardado.saldo_30, 'reais', 'realizado'),
      lista: campo(guardado.aplicacoes.map(a => ({
        id: a.id, nome: a.nome, banco: a.banco, saldo: real(a.saldo, 'cadastrado'),
        rendeuHoje: real(a.rendeu_hoje_liquido, 'realizado'),
        rendeuMes: real(a.rendeu_mes_liquido, 'realizado'),
        vencimento: data(a.vence_em, 'cadastrado'),
      })), 'indicador', 'cadastrado'),
    },
    imoveis: {
      valorCadastrado: real(resumo.imoveis.valor?.valor.valor, 'cadastrado'),
      aluguelLiquidoEstimado: centavo(resumo.imoveis.valor?.aluguel?.valor, 'estimado'),
    },
    recebimentos: {
      previsto: real(r?.previsto, 'previsto'),
      garantido: real(r?.garantido, 'previsto'),
      provavel: real(r?.provavel, 'previsto'),
      incerto: real(r?.incerto, 'previsto'),
      atrasados: contagem(r?.atrasados, 'previsto'),
    },
    plano2029: {
      faltamPorMesComMargem: centavo(p?.falta_com_margem, 'estimado'),
      faltamPorMesSemMargem: centavo(p?.falta_sem_margem, 'estimado'),
      rendaEstimada: centavo(p?.renda, 'estimado'),
      cenario: campo(p ? 'garantido' as const : null, 'texto', 'estimado'),
      // Cobertura oficial, preservada mesmo quando excede a meta. A barra visual pode saturar no máximo.
      progressao: campo(p?.cobre_pct, 'percentual', 'estimado'),
    },
    casa: {
      feiraPendente: campo(c?.feira, 'indicador', 'cadastrado'),
      notasPendentes: contagem(c?.nota, 'cadastrado'),
      estoquePendente: campo(c?.estoque, 'indicador', 'cadastrado'),
      itensEmFalta: contagem(c?.falta, 'cadastrado'),
      livreDaSemana: campo(orcamento.envelopes.filter(e => e.casa).map(e => ({
        id: e.id, nome: e.nome, valor: real(livreDaSemana(e), 'previsto'),
      })), 'indicador', 'previsto'),
      disponivelDiario: real(resumo.podeGastarHoje.valor?.casa, 'previsto'),
    },
    movimentacaoMes: {
      entrou: real(mov?.entrou, 'realizado'),
      saiu: real(mov?.saiu, 'realizado'),
      saldo: real(mov?.saldo, 'realizado'),
      serie: campo(serieMov, 'reais', 'realizado'),
    },
    desejos: {
      pensando: contagem(d?.pensando, 'cadastrado'),
      combinados: contagem(d?.combinados, 'cadastrado'),
      proximo: proximo ? campo({
        id: proximo.id, nome: proximo.nome, mes: campo(proximo.mes, 'mes', 'previsto'),
        valor: real(proximo.valor, 'cadastrado'), situacao: proximo.situacao,
      }, 'indicador', 'cadastrado') : { estado: 'vazio', valor: null, unidade: 'indicador', natureza: 'cadastrado' } as const,
    },
    envelopes: campo(orcamento.envelopes.map(e => ({
      id: e.id, nome: e.nome, pessoa: texto(e.dono), casa: !!e.casa,
      limite: real(tetoDoMes(e), 'cadastrado'),
      gasto: real(e.gasto_mes, 'realizado'),
      livre: real(e.livre, 'previsto'),
      podeGastarHoje: real(e.hoje, 'previsto'),
      situacao: campo(numeroEnvelope(e, orcamento.diasRestantes, hoje, FUSO).estado, 'texto', 'realizado'),
    })), 'indicador', 'cadastrado'),
    pendencias: {
      total: contagem(resumo.pendencias.valor?.total, 'cadastrado'),
      fila: campo(perguntas.map(q => ({
        id: q.id, funcionario: q.funcionario, perguntaCurta: q.assunto || q.pergunta,
        valor: real(q.valor, 'previsto'),
      })), 'indicador', 'cadastrado'),
    },
    funcionarios: campo(EQUIPE.map(m => {
      const f = equipe.find(f => f.id === m.id)
      const entrega = escritorio.entregue.find(item => item.funcionario === m.id || item.funcionario === f?.nome)
      return {
        id: m.id, nome: f?.nome ?? m.nome, curto: m.curto, sala: m.sala,
        estadoHoje: campo<EstadoFuncionario, 'texto'>(f?.semDado ? null : f?.estado, 'texto', 'realizado'),
        atividadeAtual: texto(f?.estado === 'trabalhando' && !f.semDado ? f.frase : null),
        ultimoResultado: texto(entrega?.resumo || f?.ultimas_respostas?.find(linha => linha.resposta && !linha.adiado_ate)?.resposta),
      }
    }), 'indicador', 'cadastrado'),
    alertas: campo(perguntas.map(q => {
      const nivel: NivelAlerta = q.id.startsWith('lembrete:') ? 'lembrete'
        : /^(fatura|dae):/.test(q.id) && q.vence_em && q.vence_em <= hoje ? 'dinheiro em risco' : 'operacao'
      return { id: q.id, nivel, texto: q.assunto || q.pergunta }
    }), 'indicador', 'cadastrado'),
  }
}

export type DadosInicio = Awaited<ReturnType<typeof carregarDadosInicio>>

/** Expediente fictício do laboratório, independente da hora e da API do aplicativo. */
export function comExpedienteExemplo(dados: DadosInicio): DadosInicio {
  const perguntas = [
    { id: 'exemplo-cartao', funcionario: 'cartao', perguntaCurta: 'Conferir a descrição de uma compra na fatura.' },
    { id: 'exemplo-feira', funcionario: 'fiscal', perguntaCurta: 'Confirmar se a nota da feira já foi guardada.' },
    { id: 'exemplo-lembrete', funcionario: 'secretaria', perguntaCurta: 'Confirmar o horário da próxima revisão da rotina.' },
  ]
  const atividades: Record<string, string> = {
    contador: 'Revisando os lançamentos do dia.', tesoureiro: 'Conferindo as receitas previstas.',
    folha: 'Conferindo os registros da folha da casa.', assistente: 'Revisando o orçamento diário.',
    guardado: 'Conferindo as aplicações cadastradas.', imoveis: 'Revisando os contratos cadastrados.',
    auditor: 'Conferindo a lista de itens com pouco estoque.', analista: 'Revisando os indicadores de uso.',
  }
  const entregas: Record<string, string> = {
    comprador: 'Lista da feira revisada.', presenca: 'Presenças registradas conferidas.',
    anfitriao: 'Resumo do dia organizado.',
  }
  return {
    ...dados,
    funcionarios: campo((dados.funcionarios.valor ?? []).map(pessoa => {
      const atividade = atividades[pessoa.id]
      const resultado = entregas[pessoa.id]
      const estado: EstadoFuncionario = perguntas.some(tarefa => tarefa.funcionario === pessoa.id) ? 'precisa_de_voce'
        : atividade ? 'trabalhando' : resultado ? 'entregue' : 'vai_comecar'
      return { ...pessoa, estadoHoje: campo(estado, 'texto', 'realizado'),
        atividadeAtual: texto(atividade), ultimoResultado: resultado ? texto(resultado) : pessoa.ultimoResultado }
    }), 'indicador', 'cadastrado'),
    pendencias: {
      total: contagem(perguntas.length, 'cadastrado'),
      fila: campo(perguntas.map(tarefa => ({ ...tarefa, valor: real(null, 'previsto') })), 'indicador', 'cadastrado'),
    },
    alertas: campo(perguntas.map(tarefa => ({
      id: tarefa.id, nivel: tarefa.funcionario === 'secretaria' ? 'lembrete' as const : 'operacao' as const, texto: tarefa.perguntaCurta,
    })), 'indicador', 'cadastrado'),
  }
}
