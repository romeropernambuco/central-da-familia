// Contas do Guardado (a caixinha): quanto o dinheiro guardado rende por dia útil.
// O banco de verdade faz a conta em produto.guardado_hoje; aqui ficam as mesmas regras pro modo exemplo,
// pro estado vazio (exemplo calculado) e pros testes. Sem tela e sem rede: dá pra testar sozinho.
import type { GuardadoAplicacao, GuardadoHoje, LinhaExplicacao, TipoAplicacao } from '../api/tipos'
import { centavos, dataCurta, diasEntre, somaDias } from './formato'

/** CDI de 1 dia útil em 10/11/2026: 0,050788% (Banco Central, série 12). Usado só quando o banco não manda a taxa. */
export const CDI_DIA_PADRAO = 0.00050788
export const DIAS_UTEIS_ANO = 252

/** Feriados nacionais em que o dinheiro não rende (2026 e 2027). */
export const FERIADOS: Record<string, string> = {
  '2026-01-01': 'Ano Novo', '2026-02-16': 'Carnaval', '2026-02-17': 'Carnaval', '2026-04-03': 'Sexta-feira Santa', '2026-04-21': 'Tiradentes',
  '2026-05-01': 'Dia do Trabalho', '2026-06-04': 'Corpus Christi', '2026-09-07': 'Independência', '2026-10-12': 'Nossa Senhora Aparecida',
  '2026-11-02': 'Finados', '2026-11-20': 'Consciência Negra', '2026-12-25': 'Natal',
  '2027-01-01': 'Ano Novo', '2027-02-08': 'Carnaval', '2027-02-09': 'Carnaval', '2027-03-26': 'Sexta-feira Santa', '2027-04-21': 'Tiradentes',
  '2027-05-27': 'Corpus Christi', '2027-09-07': 'Independência', '2027-10-12': 'Nossa Senhora Aparecida', '2027-11-02': 'Finados', '2027-11-15': 'Proclamação da República', '2027-12-25': 'Natal',
}

const dow = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay()
const NOME_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/** Dia em que o dinheiro rende: segunda a sexta, fora feriado nacional. */
export function diaUtil(iso: string): boolean {
  const d = dow(iso)
  return d !== 0 && d !== 6 && !FERIADOS[iso]
}
export function proximoDiaUtil(iso: string): string {
  let d = somaDias(iso, 1)
  while (!diaUtil(d)) d = somaDias(d, 1)
  return d
}
/** Por que hoje rendeu R$ 0. Devolve null em dia útil. Ex.: "Hoje é sábado: rende de novo na segunda, 16/11." */
export function motivoSemRender(iso: string): string | null {
  if (diaUtil(iso)) return null
  const d = dow(iso)
  const hojeE = FERIADOS[iso] ? `feriado (${FERIADOS[iso]})` : NOME_DIA[d]
  const prox = proximoDiaUtil(iso)
  const quando = diasEntre(iso, prox) === 1 ? 'amanhã' : (dow(prox) === 6 || dow(prox) === 0 ? 'no ' : 'na ') + NOME_DIA[dow(prox)]
  return `Hoje é ${hojeE}: rende de novo ${quando}, ${dataCurta(prox)}.`
}

/** Taxa de 1 dia útil a partir da taxa do ano (13,65 vira 0,0005079). */
export const cdiDiaDoAno = (pctAno: number) => Math.pow(1 + pctAno / 100, 1 / DIAS_UTEIS_ANO) - 1
/** Taxa do ano a partir da taxa de 1 dia útil (0,00050788 vira 13,65). */
export const cdiAnoDoDia = (dia: number) => (Math.pow(1 + dia, DIAS_UTEIS_ANO) - 1) * 100

/** Imposto de renda, que cai com o tempo guardado: 22,5% até 180 dias, 20% até 360, 17,5% até 720, depois 15%. */
export function faixaIR(diasCorridos: number): number {
  if (diasCorridos <= 180) return 22.5
  if (diasCorridos <= 360) return 20
  if (diasCorridos <= 720) return 17.5
  return 15
}
const IOF = [96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3]
/** IOF sobre o rendimento de quem tira antes de 30 dias: 96% no 1º dia, caindo até 0 no 30º. */
export function iofPct(diasCorridos: number): number {
  if (diasCorridos < 1) return 96
  return diasCorridos >= 30 ? 0 : IOF[diasCorridos - 1]
}

/** Quanto um saldo rende em 1 dia útil, antes do imposto. Não arredonda (quem mostra é que arredonda). */
export const rendeNoDia = (saldo: number, cdiDia: number, pctCdi: number) => saldo * cdiDia * (pctCdi / 100)
/** Rendimento de N dias úteis seguidos, com juro sobre juro. */
export const rendeEmDias = (saldo: number, cdiDia: number, pctCdi: number, diasUteis: number) => saldo * (Math.pow(1 + cdiDia * (pctCdi / 100), diasUteis) - 1)
/** Tira o imposto do rendimento. */
export const liquido = (bruto: number, irPct: number, iof = 0) => bruto * (1 - iof / 100) * (1 - irPct / 100)

export function diasUteisEntre(deExclusive: string, ateInclusive: string): number {
  let n = 0
  for (let d = somaDias(deExclusive, 1); d <= ateInclusive; d = somaDias(d, 1)) if (diaUtil(d)) n++
  return n
}

export const ROTULO_TIPO: Record<TipoAplicacao, string> = { caixinha: 'Caixinha', cdb: 'CDB', lci_lca: 'LCI ou LCA', poupanca: 'Poupança', tesouro_selic: 'Tesouro Selic' }
export const tipoIsento = (t: TipoAplicacao) => t === 'lci_lca' || t === 'poupanca'

/** "0,050788%" (taxa de 1 dia) ou "13,65%" (taxa do ano). */
export function pct(v: number, casas = 2): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%'
}
/** "110% do CDI", "100% do CDI"; poupança não tem percentual. */
export function rendeQuanto(a: { tipo: TipoAplicacao; pct_cdi: number }, curto = false): string {
  if (a.tipo === 'poupanca') return 'regra da poupança'
  // sigla sozinha não entra em tela: na lista vai "da taxa dos bancos"; na conta, vai explicada
  return `${String(Math.round(a.pct_cdi * 100) / 100).replace('.', ',')}% ${curto ? 'da taxa dos bancos' : 'do CDI (a taxa dos bancos)'}`
}

export interface MovimentoBase { data: string; tipo: 'aporte' | 'resgate' | 'saldo_conferido'; valor: number; nota?: string; chave?: string }
export interface AplicacaoBase {
  id: string; nome: string; banco: string; tipo: TipoAplicacao; pct_cdi: number
  liquidez: 'diaria' | 'vencimento'; vence_em: string | null; encerrada_em?: string | null
  movimentos: MovimentoBase[]
  /** no nome de quem (membro); null = do casal */
  titular?: string | null
}

interface Lote { data: string; saldo: number }

/**
 * A conta do Guardado, dia por dia, do 1º dinheiro guardado até hoje.
 * Cada dinheiro que entra vira 1 lote (o imposto de cada lote conta do dia em que ele entrou; quem sai primeiro é o lote mais velho).
 * Dia útil: cada lote rende saldo × CDI do dia × % do CDI. Sábado, domingo e feriado: R$ 0.
 */
export function calcularGuardado(apps: AplicacaoBase[], hoje: string, cdi: { dia: number; data: string; fonte: string }): GuardadoHoje {
  const porDia: Record<string, number> = {}
  const saldoDia: Record<string, number> = {}
  const explicacao: LinhaExplicacao[] = []
  const aplicacoes: GuardadoAplicacao[] = []
  const mes = hoje.slice(0, 7)
  let total = 0, hojeBruto = 0, hojeLiq = 0, mesLiq = 0, tudoLiq = 0
  const porBanco: Record<string, number> = {}
  const util = diaUtil(hoje)

  for (const a of apps.filter(x => !x.encerrada_em)) {
    const movs = [...a.movimentos].sort((x, y) => x.data.localeCompare(y.data))
    if (!movs.length) continue
    const isento = tipoIsento(a.tipo)
    // poupança (Selic acima de 8,5% ao ano): 0,5% ao mês, que dá perto de 0,0237% por dia útil. TR fica em 0: é estimativa.
    const taxa = a.tipo === 'poupanca' ? Math.pow(1.005, 1 / 21) - 1 : cdi.dia * (a.pct_cdi / 100)
    let lotes: Lote[] = []
    let aHojeLiq = 0, aHojeBruto = 0, aMes = 0, aTudo = 0, antesDeHoje = 0, irHoje = 0
    for (let d = movs[0].data; d <= hoje; d = somaDias(d, 1)) {
      for (const m of movs.filter(x => x.data === d)) {
        if (m.tipo === 'aporte') lotes.push({ data: d, saldo: m.valor })
        else if (m.tipo === 'resgate') {
          let falta = m.valor
          for (const l of lotes) { const t = Math.min(l.saldo, falta); l.saldo -= t; falta -= t; if (falta <= 0) break }
          lotes = lotes.filter(l => l.saldo > 0.004)
        } else {
          // saldo conferido no app do banco: acerta a diferença no lote mais novo
          const soma = lotes.reduce((s, l) => s + l.saldo, 0)
          if (lotes.length) lotes[lotes.length - 1].saldo = Math.max(0, lotes[lotes.length - 1].saldo + (m.valor - soma))
          else lotes.push({ data: d, saldo: m.valor })
        }
      }
      if (d === hoje) antesDeHoje = lotes.reduce((s, l) => s + l.saldo, 0)
      if (!diaUtil(d)) { saldoDia[d] = (saldoDia[d] || 0) + lotes.reduce((s, l) => s + l.saldo, 0); continue }
      let bruto = 0, liq = 0
      for (const l of lotes) {
        const dias = diasEntre(l.data, d)
        // dinheiro que entrou hoje começa a render no dia útil seguinte
        if (dias < 1) continue
        const b = l.saldo * taxa
        const ir = isento ? 0 : faixaIR(dias)
        bruto += b
        liq += isento ? b : liquido(b, ir, dias < 30 ? iofPct(Math.max(1, dias)) : 0)
        l.saldo += b
      }
      porDia[d] = (porDia[d] || 0) + liq
      saldoDia[d] = (saldoDia[d] || 0) + lotes.reduce((s, l) => s + l.saldo, 0)
      aTudo += liq
      if (d.startsWith(mes)) aMes += liq
      if (d === hoje) { aHojeLiq = liq; aHojeBruto = bruto; irHoje = bruto - liq }
    }
    const saldo = lotes.reduce((s, l) => s + l.saldo, 0)
    const maisVelho = lotes.length ? diasEntre(lotes[0].data, hoje) : 0
    total += saldo; hojeBruto += aHojeBruto; hojeLiq += aHojeLiq; mesLiq += aMes; tudoLiq += aTudo
    porBanco[a.banco] = (porBanco[a.banco] || 0) + saldo
    aplicacoes.push({
      id: a.id, nome: a.nome, banco: a.banco, tipo: a.tipo, pct_cdi: a.pct_cdi, saldo: centavos(saldo),
      rendeu_hoje_liquido: centavos(aHojeLiq), rendeu_mes_liquido: centavos(aMes), ir_faixa: isento ? 0 : faixaIR(maisVelho),
      vence_em: a.vence_em, liquidez: a.liquidez, fgc_ok: true,
    })
    if (util && aHojeBruto > 0) {
      explicacao.push({ linha: `${a.nome}: ${dinheiro(antesDeHoje)} × ${a.tipo === 'poupanca' ? 'regra da poupança' : `${pct(cdi.dia * 100, 6)} do dia × ${rendeQuanto(a)}`}`, valor: centavos(aHojeBruto) })
      if (irHoje > 0.004) explicacao.push({ linha: `Imposto de renda de ${pct(faixaIR(maisVelho), 1).replace(',0%', '%')} sobre esse rendimento`, valor: -centavos(irHoje) })
    }
  }
  // garantia do FGC: até R$ 250 mil por pessoa em cada banco (Tesouro Selic é garantido pelo governo, não entra)
  for (const ap of aplicacoes) ap.fgc_ok = ap.tipo === 'tesouro_selic' || (porBanco[ap.banco] || 0) <= 250000
  const motivo = !aplicacoes.length ? null : motivoSemRender(hoje)
  if (motivo) explicacao.push({ linha: motivo, valor: 0 })
  explicacao.push({ linha: util ? 'Rendeu hoje, já sem o imposto' : 'Rendeu hoje', valor: centavos(hojeLiq) })
  const por_dia_30: { data: string; liquido: number }[] = []
  const saldo_30: { data: string; saldo: number }[] = []
  for (let i = 29; i >= 0; i--) { const d = somaDias(hoje, -i); por_dia_30.push({ data: d, liquido: centavos(porDia[d] || 0) }); saldo_30.push({ data: d, saldo: centavos(saldoDia[d] || 0) }) }
  return {
    total: centavos(total), rendeu_hoje_bruto: centavos(hojeBruto), rendeu_hoje_liquido: centavos(hojeLiq), rendeu_mes_liquido: centavos(mesLiq),
    rendeu_desde_inicio_liquido: centavos(tudoLiq), cdi_usado: { data: cdi.data, pct_ano: Math.round(cdiAnoDoDia(cdi.dia) * 100) / 100, fonte: cdi.fonte },
    por_dia_30, saldo_30, aplicacoes, explicacao, atualizado_em: new Date().toISOString(), motivo_zero: motivo,
  }
}

function dinheiro(v: number): string {
  return 'R$ ' + centavos(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Quanto um gasto deixa de render: até o fim do mês e em 12 meses, já sem imposto (usa a faixa de quem acabou de guardar). */
export function custoDoGasto(valor: number, hoje: string, cdiDia: number, pctCdi = 100): { ate_fim_do_mes: number; em_12_meses: number } {
  const fim = hoje.slice(0, 8) + String(new Date(Date.UTC(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)), 0)).getUTCDate()).padStart(2, '0')
  const n = diasUteisEntre(hoje, fim)
  return {
    ate_fim_do_mes: centavos(liquido(rendeEmDias(valor, cdiDia, pctCdi, n), 22.5)),
    em_12_meses: centavos(liquido(rendeEmDias(valor, cdiDia, pctCdi, DIAS_UTEIS_ANO), 17.5)),
  }
}

/** Exemplo do estado vazio: R$ 10.000 a 100% do CDI rendem quanto por dia útil e por mês (21 dias úteis), já sem imposto. */
export function exemploVazio(cdiDia = CDI_DIA_PADRAO): { valor: number; porDia: number; porMes: number } {
  return { valor: 10000, porDia: centavos(liquido(rendeNoDia(10000, cdiDia, 100), 22.5)), porMes: centavos(liquido(rendeEmDias(10000, cdiDia, 100, 21), 22.5)) }
}

/** Altura de cada barra dos 30 dias (0 a 100) e se o dia rende. */
export function barras30(dias: { data: string; liquido: number }[]): { data: string; liquido: number; altura: number; util: boolean }[] {
  const max = Math.max(0.01, ...dias.map(d => d.liquido))
  return dias.map(d => ({ ...d, util: diaUtil(d.data), altura: d.liquido > 0 ? Math.max(6, Math.round((d.liquido / max) * 100)) : 0 }))
}

/** "há 5 min", "há 3 h", "há 2 dias": demora pra responder no Relatório. */
export function demoraTexto(min: number | null | undefined): string {
  if (min == null || !isFinite(min)) return 'sem resposta ainda'
  if (min < 1) return 'menos de 1 min'
  if (min < 60) return `${Math.round(min)} min`
  if (min < 48 * 60) return `${Math.round(min / 60)} h`
  return `${Math.round(min / 1440)} dias`
}

/** "3 coisas precisam de você", "1 coisa precisa de você", "Nada precisa de você". */
export function fraseDoDia(n: number): string {
  if (n <= 0) return 'Nada precisa de você'
  return n === 1 ? '1 coisa precisa de você' : `${n} coisas precisam de você`
}

/** Marco do guardado (G10): o maior número redondo que o saldo passou nos últimos 30 dias, ou null. Marcos de R$ 10.000 em R$ 10.000. */
export function marcoGuardado(saldo30: { data: string; saldo: number }[], passo = 10000): { valor: number; dia: string } | null {
  for (let i = saldo30.length - 1; i > 0; i--) {
    const a = Math.floor(saldo30[i - 1].saldo / passo), b = Math.floor(saldo30[i].saldo / passo)
    if (saldo30[i - 1].saldo > 0 && b > a) return { valor: b * passo, dia: saldo30[i].data }
  }
  return null
}
