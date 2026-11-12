// Formatação e pequenas contas de tela. A conta de dinheiro de verdade é do banco;
// aqui só fica o que o app precisa pra mostrar, simular ou medir.

export const FUSO = 'America/Recife'
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const DIA_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/** Arredonda pra centavo sem erro de ponto flutuante. */
export function centavos(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100
}

/** Separa o valor em partes pra desenhar: "R$", "1.234", ",90". O ",00" some. */
export function partesDinheiro(v: number): { sinal: string; inteiro: string; cents: string } {
  const n = centavos(Number(v) || 0)
  const sinal = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  const inteiro = Math.floor(abs + 1e-9)
  const c = Math.round((abs - inteiro) * 100)
  const txt = inteiro.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return { sinal, inteiro: txt, cents: c ? ',' + String(c).padStart(2, '0') : '' }
}

/** "R$ 1.234" ou "R$ 45,90" ou "-R$ 10". */
export function reais(v: number): string {
  const p = partesDinheiro(v)
  return `${p.sinal}R$ ${p.inteiro}${p.cents}`
}

/** Hoje no fuso de Recife, no formato 2026-11-11. */
export function hojeRecife(agora: Date = new Date()): string {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })
  return f.format(agora)
}

function partes(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return { a, m, d }
}

export function somaDias(iso: string, n: number): string {
  const { a, m, d } = partes(iso)
  const dt = new Date(Date.UTC(a, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

export function diasEntre(de: string, ate: string): number {
  const x = partes(de), y = partes(ate)
  return Math.round((Date.UTC(y.a, y.m - 1, y.d) - Date.UTC(x.a, x.m - 1, x.d)) / 86400000)
}

export function diasNoMes(iso: string): number {
  const { a, m } = partes(iso)
  return new Date(Date.UTC(a, m, 0)).getUTCDate()
}

export function diaSemana(iso: string): string {
  const { a, m, d } = partes(iso)
  return DIA_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]
}

/** 11/11 */
export function dataCurta(iso: string): string {
  const { m, d } = partes(iso)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

/** 11/11/2026 */
export function dataBr(iso: string): string {
  const { a } = partes(iso)
  return `${dataCurta(iso)}/${a}`
}

/** "2026-11" ou "2026-11-03" vira "nov/26" */
export function mesCurto(iso: string): string {
  const { a, m } = partes(iso)
  return `${MES[m - 1]}/${String(a).slice(2)}`
}

export function mesLongo(iso: string): string {
  return MES_LONGO[partes(iso).m - 1]
}

/** Último dia do mês da data, ex.: 2026-11-30 */
export function fimDoMes(iso: string): string {
  const { a, m } = partes(iso)
  return `${a}-${String(m).padStart(2, '0')}-${String(diasNoMes(iso)).padStart(2, '0')}`
}

/** Dias que faltam no mês contando hoje. */
export function diasRestantes(iso: string): number {
  return diasNoMes(iso) - partes(iso).d + 1
}

/** Segunda-feira da semana da data. */
export function segundaDaSemana(iso: string): string {
  const { a, m, d } = partes(iso)
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay()
  return somaDias(iso, dow === 0 ? -6 : 1 - dow)
}

export function saudacao(agora: Date = new Date()): string {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, hour: '2-digit', hour12: false }).format(agora))
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

/* ---------- teclado do Lançar ---------- */

/** Aplica uma tecla ao texto do valor. Aceita dígitos, "," e "apagar". Até 2 casas e até R$ 999.999,99. */
export function tecla(atual: string, t: string): string {
  if (t === 'apagar') return atual.slice(0, -1)
  if (t === ',') {
    if (atual.includes(',')) return atual
    return (atual || '0') + ','
  }
  if (!/^\d$/.test(t)) return atual
  const [int, dec] = atual.split(',')
  if (dec !== undefined && dec.length >= 2) return atual
  if (dec === undefined && int.replace(/^0+/, '').length >= 6) return atual
  if (atual === '0') return t
  return atual + t
}

/**
 * Texto digitado vira valor. A ÚLTIMA vírgula é a dos centavos; ponto e vírgulas anteriores são milhar.
 * "1.500,90" = 1500.9; "1,500,90" = 1500.9. Texto que não é número devolve 0 (use valorDigitadoValido pra barrar).
 */
export function textoParaValor(txt: string): number {
  if (!txt) return 0
  const limpo = String(txt).replace(/[^\d,]/g, '')
  const i = limpo.lastIndexOf(',')
  const int = (i < 0 ? limpo : limpo.slice(0, i)).replace(/,/g, '')
  const dec = i < 0 ? '' : limpo.slice(i + 1)
  return centavos(Number((int || '0') + '.' + (dec || '0')) || 0)
}

/** Valor do banco (1153.85) vira texto de campo ("1153,85"), pronto pra textoParaValor ler de volta igual. */
export function valorParaTexto(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return ''
  return String(centavos(Number(v))).replace('.', ',')
}

/** Campo de dinheiro só vale com no máximo 1 vírgula e 2 casas: barra "1,5,3" antes de salvar. */
export const valorDigitadoValido = (txt: string) => /^\d{1,9}(,\d{0,2})?$/.test(txt.trim())

/* ---------- códigos ---------- */

export const codigo6Valido = (c: string) => /^\d{6}$/.test(c)
export const codigo4Valido = (c: string) => /^\d{4}$/.test(c)
export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim())

/* ---------- "E se eu comprar?" (simulação, nada é gravado) ---------- */

/**
 * Mês (1 a 12, pode passar de 12) em que vence a fatura de uma compra feita no dia d do mês m.
 * Compra depois do fechamento vai pra fatura seguinte. Se o vencimento é antes do fechamento no calendário
 * (ex.: fecha 25, vence 5), a fatura vence no mês seguinte ao fechamento.
 */
export function mesDaFatura(m: number, d: number, diaFechamento: number, diaVencimento: number): number {
  return m + (d > diaFechamento ? 1 : 0) + (diaVencimento <= diaFechamento ? 1 : 0)
}

export interface ParcelaSimulada { mes: string; valor: number }

/**
 * Divide a compra em parcelas iguais (a 1ª leva a diferença dos centavos)
 * e diz em qual mês de fatura cada uma cai, pelo dia de fechamento do cartão.
 */
export function simularCompra(valor: number, parcelas: number, dataCompra: string, diaFechamento: number, diaVencimento: number): ParcelaSimulada[] {
  const n = Math.max(1, Math.min(24, Math.floor(parcelas)))
  const total = Math.round(valor * 100)
  const base = Math.floor(total / n)
  const sobra = total - base * n
  const { a, m, d } = partes(dataCompra)
  let mes = mesDaFatura(m, d, diaFechamento, diaVencimento)
  let ano = a
  const out: ParcelaSimulada[] = []
  for (let i = 0; i < n; i++) {
    while (mes > 12) { mes -= 12; ano++ }
    out.push({ mes: `${ano}-${String(mes).padStart(2, '0')}`, valor: (base + (i === 0 ? sobra : 0)) / 100 })
    mes++
  }
  return out
}

/* ---------- Meu orçamento: cofrinho ---------- */

/** Soma do que sobrou do valor do dia nos dias já fechados (só dias com anotação). */
export function cofrinho(gastoPorDia: Record<string, number>, valorDia: number, diasFechados: string[]): number {
  let s = 0
  for (const dia of diasFechados) {
    if (!(dia in gastoPorDia)) continue
    s += Math.max(0, valorDia - gastoPorDia[dia])
  }
  return centavos(s)
}

/* ---------- Casa ---------- */

/** Aviso da guia DAE (eSocial doméstico): vence dia 7. Aparece do dia 1 ao dia 7 se ainda não foi paga. */
export function avisoDAE(hoje: string, pagaNoMes: boolean): { mostrar: boolean; dias: number; vence: string } {
  const { a, m, d } = partes(hoje)
  const vence = `${a}-${String(m).padStart(2, '0')}-07`
  return { mostrar: !pagaNoMes && d <= 7, dias: 7 - d, vence }
}

/** Quanto guardar por mês pra férias (com 1/3) e 13º de 1 salário. Estimativa simples. */
export function reservaFolha(salario: number): { decimo: number; ferias: number; total: number } {
  const decimo = centavos(salario / 12)
  const ferias = centavos((salario + salario / 3) / 12)
  return { decimo, ferias, total: centavos(decimo + ferias) }
}

/** Gás: média de dias entre as trocas e quando avisar (5 dias antes de acabar). */
export function previsaoGas(trocas: string[]): { media: number | null; acaba: string | null; avisar: string | null } {
  const t = [...trocas].sort()
  if (t.length < 2) return { media: null, acaba: null, avisar: null }
  let soma = 0
  for (let i = 1; i < t.length; i++) soma += diasEntre(t[i - 1], t[i])
  const media = Math.round(soma / (t.length - 1))
  const acaba = somaDias(t[t.length - 1], media)
  return { media, acaba, avisar: somaDias(acaba, -5) }
}

/* ---------- convites ---------- */

/** Link que a equipe abre: leva o id do convite (não o código). O código de 4 números vai separado na mensagem. */
export function linkEquipe(base: string, convite: string): string {
  return `${base.split('#')[0]}#/equipe?c=${encodeURIComponent(convite)}`
}

/**
 * Mensagens prontas pro WhatsApp. Decisão do dono: nenhuma leva valor em R$ (mensagem encaminhada não espalha dinheiro da casa).
 * O app só abre o WhatsApp com o texto; quem envia é a pessoa.
 */
export function mensagemConvite(tipo: 'pessoa' | 'amiga' | 'equipe', o: { familia: string; quem: string; link: string; codigo?: string; email?: string }): string {
  if (tipo === 'pessoa')
    return `Oi${o.quem.trim() ? ', ' + o.quem.trim() : ''}! Coloquei a casa na Central da Família. Entra aqui pra ver o nosso número do dia: ${o.link} Entra com o seu e-mail${o.email ? ' (' + o.email.trim() + ')' : ''} e digita o código de 6 números que chega nele.`
  if (tipo === 'amiga')
    return `Tô usando a Central da Família: abro e vejo quanto a casa pode gastar hoje, num número só. Feira e equipe da casa ficam no mesmo lugar. Quer testar com a gente? ${o.link}`
  return `Oi, ${o.quem}! Pra anotar as compras da casa, abre este link: ${o.link} Depois digita o código ${o.codigo}. O código vale por 24 horas e só funciona nesse link.`
}

export function linkWhatsApp(texto: string): string {
  return 'https://wa.me/?text=' + encodeURIComponent(texto)
}

/* ---------- tempo de lançar ---------- */

export function segundosDesde(inicioMs: number, agoraMs: number): number {
  return Math.max(0, Math.round((agoraMs - inicioMs) / 100) / 10)
}

export function segundosTexto(s: number): string {
  return `${String(Math.round(s * 10) / 10).replace('.', ',')} s`
}

/* ---------- campo de valor e meses ---------- */

/** "3000" vira "3.000" e "1153,85" vira "1.153,85" pra mostrar no campo. Só mexe na parte inteira. */
export function milhar(txt: string): string {
  const limpo = String(txt || '').replace(/[^\d,]/g, '')
  const i = limpo.indexOf(',')
  const int = (i < 0 ? limpo : limpo.slice(0, i)).replace(/^0+(?=\d)/, '')
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (i < 0 ? '' : limpo.slice(i))
}

/** Mês anterior no formato AAAA-MM. */
export function mesAnterior(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`
}

/** Junta meses seguidos de fatura zerada numa linha só ("jan a abr: R$ 0"), pra não pesar mais que a fatura que existe. */
export function agruparFaturas<F extends { mes: string; total: number }>(fs: F[]): ({ tipo: 'mes'; f: F } | { tipo: 'zeros'; de: string; ate: string })[] {
  const out: ({ tipo: 'mes'; f: F } | { tipo: 'zeros'; de: string; ate: string })[] = []
  for (const f of fs) {
    const ult = out[out.length - 1]
    if (f.total > 0) out.push({ tipo: 'mes', f })
    else if (ult && ult.tipo === 'zeros') ult.ate = f.mes
    else out.push({ tipo: 'zeros', de: f.mes, ate: f.mes })
  }
  return out
}
