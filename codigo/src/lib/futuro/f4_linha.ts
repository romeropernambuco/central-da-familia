// F4 Linha mês a mês (do mês seguinte ao de hoje até o mês antes da virada) + recebimento atrasado.
// ECONOMISTA item 3, F4: rendimento sobre o saldo do 1º dia; entradas e saídas no último dia.
import { anoDe, centavos, compararMes, diasDoMes, listaMeses, proximoMes } from './decimal'
import { rendimentoAplicacao, rendimentoMes } from './f1_rendimento'
import { ficaDevendo } from './f9_falta'
import type { Aplicacao, Centavos, LinhaMes, Mes, Recebimento, Taxa } from './tipos'

export type PorMes = Map<Mes, Centavos>

export interface LinhaEntrada {
  saldo_inicial: Centavos
  de: Mes
  ate: Mes
  taxa_bruta_ano: Record<number, Taxa>
  aliq_proj: Taxa
  teto: (m: Mes) => Centavos
  piso: (m: Mes) => Centavos
  recebimentos?: PorMes
  compromissos?: PorMes
  dividas?: PorMes
  desvios?: PorMes
  retornos?: PorMes
  alugueis?: PorMes
  aplicacoes?: Aplicacao[] /* saldo_inicial já inclui estes saldos; não somar novamente */
  virada?: Mes
  taxa_individual_sem_vencimento?: boolean /* padrão false, repassado dos parâmetros do motor */
}

/** Carteira em memória. Sem vencimento mantém a projeção histórica agregada por padrão.
 *  Fluxos positivos vão à referência; saídas usam referência, caixa parado e aplicações por id.
 *  Resgate é transferência interna de saldo já líquido, nunca recebimento nem novo desconto de IR. */
function carteira(e: LinhaEntrada) {
  const lotes = (e.aplicacoes ?? []).filter(a => a.resgate_previsto !== null || (e.taxa_individual_sem_vencimento === true && a.taxa_bruta_anual !== undefined)).map(a => ({ ...a }))
    .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  let referencia = e.saldo_inicial - lotes.reduce((s, a) => s + centavos(a.saldo).toNumber(), 0)
  let parado = 0
  const transferir = (a: Aplicacao) => {
    if (a.destino_no_vencimento === 'referencia_familia') referencia += a.saldo
    else parado += a.saldo
    a.saldo = 0
  }
  return {
    render(m: Mes, tb: Taxa): Centavos {
      // Vencidas antes da janela já são caixa na abertura, sem recriar juros passados.
      for (const a of lotes) if (a.resgate_previsto !== null && a.resgate_previsto.slice(0, 7) < m) transferir(a)
      let r = rendimentoMes(referencia, tb, e.aliq_proj, diasDoMes(m))
      referencia += r
      for (const a of lotes) {
        const vencimento = a.resgate_previsto?.slice(0, 7)
        if (vencimento !== undefined && vencimento < m) continue
        const juros = rendimentoAplicacao(a, m, e.virada ?? proximoMes(e.ate), tb, e.aliq_proj)
        a.saldo += juros
        r += juros
        if (vencimento === m) {
          // Destino de referência rende só nos dias posteriores ao vencimento.
          if (a.destino_no_vencimento === 'referencia_familia') {
            const depois = rendimentoMes(a.saldo, tb, e.aliq_proj, diasDoMes(m) - Number(a.resgate_previsto!.slice(8, 10)))
            a.saldo += depois
            r += depois
          }
          transferir(a)
        }
      }
      return r
    },
    movimentar(fluxo: Centavos) {
      if (fluxo >= 0) { referencia += fluxo; return }
      let falta = -fluxo
      const daReferencia = Math.min(Math.max(0, referencia), falta)
      referencia -= daReferencia; falta -= daReferencia
      const doParado = Math.min(Math.max(0, parado), falta)
      parado -= doParado; falta -= doParado
      for (const a of lotes) {
        const saque = Math.min(Math.max(0, a.saldo), falta)
        a.saldo -= saque; falta -= saque
      }
      referencia -= falta // falta de dinheiro continua negativa; nunca rende
    },
  }
}

/** Soma valores por mês. */
export function somarPorMes(itens: { mes: Mes; valor: Centavos }[], alvo: PorMes = new Map()): PorMes {
  for (const it of itens) {
    if (!Number.isSafeInteger(it.valor)) throw new Error(`Centavos precisam ser inteiros: ${it.valor}`)
    alvo.set(it.mes, (alvo.get(it.mes) ?? 0) + it.valor)
  }
  return alvo
}

/** saldo_final[m] = saldo_inicial[m] + rendimento[m] + recebimentos[m] − teto[m] − compromissos[m]
 *  − dividas[m] − desvios[m] + retornos[m]; saldo_inicial[m+1] = saldo_final[m]. */
export function projetarLinha(e: LinhaEntrada): LinhaMes[] {
  const v = (p: PorMes | undefined, m: Mes) => p?.get(m) ?? 0
  const linha: LinhaMes[] = []
  let saldo = e.saldo_inicial
  centavos(saldo)
  const ativos = carteira(e)
  for (const m of listaMeses(e.de, e.ate)) {
    const tb = e.taxa_bruta_ano[anoDe(m)]
    if (tb === undefined) throw new Error(`Falta a taxa bruta de ${anoDe(m)}`)
    const rendimento = ativos.render(m, tb)
    const l: LinhaMes = {
      mes: m, saldo_inicial: saldo, rendimento,
      recebimentos: v(e.recebimentos, m), teto: e.teto(m), compromissos: v(e.compromissos, m),
      dividas: v(e.dividas, m), desvios: v(e.desvios, m), retornos: v(e.retornos, m), alugueis: v(e.alugueis, m),
      saldo_final: 0, piso: e.piso(m), fica_devendo: 0, devendo_ate: null,
    }
    l.saldo_final = saldo + rendimento + l.recebimentos - l.teto - l.compromissos - l.dividas - l.desvios + l.retornos + (l.alugueis ?? 0)
    ativos.movimentar(l.saldo_final - saldo - rendimento)
    if (!Number.isSafeInteger(l.saldo_final)) throw new Error('Saldo fora do limite')
    linha.push(l)
    saldo = l.saldo_final
  }
  const dev = ficaDevendo(linha.map((l) => ({ mes: l.mes, saldo_final: l.saldo_final, piso: l.piso })))
  dev.forEach((d, i) => { linha[i].fica_devendo = d.fica_devendo; linha[i].devendo_ate = d.devendo_ate })
  return linha
}

/** Em que mês o recebimento entra na linha. Só conta o certo e ainda não recebido.
 *  Atrasado (mês previsto antes do mês de hoje): nunca some; entra em mes_novo, ou no mês seguinte a hoje,
 *  e gera pergunta ao dono se ele ainda não deu uma data nova válida. Depois da linha: fica pra 2029, fora dela. */
export function mesDoRecebimento(r: Recebimento, mes_hoje: Mes, ultimo: Mes): { mes: Mes | null; pergunta: boolean } {
  if (r.recebido || !r.certo) return { mes: null, pergunta: false }
  const primeiro = proximoMes(mes_hoje)
  const atrasado = compararMes(r.mes_previsto, mes_hoje) < 0
  let alvo = r.mes_novo ?? r.mes_previsto
  let pergunta = false
  if (compararMes(alvo, primeiro) < 0) { pergunta = atrasado; alvo = primeiro }
  else if (atrasado && r.mes_novo === null) pergunta = true
  if (compararMes(alvo, ultimo) > 0) return { mes: null, pergunta }
  return { mes: alvo, pergunta }
}

/** Piso do caixa no mês: meses de piso × teto do mês (premissa do ECONOMISTA item 4; REVISOR 2, B3). */
export function pisoDoMes(piso_meses: number, teto_do_mes: Centavos): Centavos {
  if (!Number.isInteger(piso_meses) || piso_meses < 0) throw new Error(`Meses de piso inválidos: ${piso_meses}`)
  const v = piso_meses * teto_do_mes
  if (!Number.isSafeInteger(v)) throw new Error('Piso fora do limite')
  return v
}

/** 13º da folha da casa (decisão do dono: só nos pagamentos, nunca como receita): 1 salário de cada pessoa
 *  em dezembro de cada ano, do ano de hoje até o ano antes da virada. Salários em centavos. (REVISOR 2, B3) */
export function folha13(salarios: Centavos[], mes_hoje: Mes, virada: Mes): { mes: Mes; valor: Centavos; tipo: 'folha_13' }[] {
  const total = salarios.reduce((s, x) => { if (!Number.isSafeInteger(x)) throw new Error('Centavos precisam ser inteiros'); return s + Math.max(0, x) }, 0)
  if (total <= 0) return []
  const out: { mes: Mes; valor: Centavos; tipo: 'folha_13' }[] = []
  for (let a = anoDe(mes_hoje); a < anoDe(virada); a++) out.push({ mes: `${a}-12`, valor: total, tipo: 'folha_13' })
  return out
}
