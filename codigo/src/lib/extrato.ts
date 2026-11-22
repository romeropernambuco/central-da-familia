// Colar extrato: lê o texto que a pessoa copiou do app ou do site do banco e separa data, descrição e valor.
// Tudo acontece no aparelho: nada do extrato vai para serviço externo.
// Entende 3 jeitos de extrato: OFX (arquivo de banco aberto como texto), planilha CSV (vírgula, ponto e vírgula ou tab)
// e texto solto copiado da tela (uma linha por movimento, ou data numa linha e o resto embaixo).

export interface LinhaExtrato {
  /** AAAA-MM-DD */
  data: string
  descricao: string
  /** sempre positivo; `entrada` diz o sentido */
  valor: number
  /** dinheiro que entrou (Pix recebido, salário, estorno); só os gastos viram lançamento */
  entrada: boolean
}

const c2 = (v: number) => Math.round(v * 100) / 100
const limpa = (s: string) => s.replace(/\s+/g, ' ').trim()

/** "1.234,56", "1,234.56", "-45,90", "R$ 45,90", "45.9" viram número; o que não é valor devolve null. */
export function lerValor(txt: string): number | null {
  let s = txt.replace(/R\$|\s|\u00a0/g, '')
  const negativo = /^-|^\(|-$|\)$|^−/.test(s)
  s = s.replace(/[()−+-]/g, '')
  if (!/^\d{1,3}([.,]\d{3})*([.,]\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(s)) return null
  const ultimo = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  const decimal = ultimo >= 0 && s.length - ultimo - 1 <= 2 ? s[ultimo] : null
  const inteiro = decimal ? s.slice(0, ultimo) : s
  const n = Number(inteiro.replace(/[.,]/g, '') + (decimal ? '.' + s.slice(ultimo + 1) : ''))
  return Number.isFinite(n) ? (negativo ? -n : n) : null
}

const MESES: Record<string, number> = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12,
}
const pad = (n: number) => String(n).padStart(2, '0')
/** "20/11/2026", "20/11/26", "20/11", "2026-11-20", "20 nov", "20 NOV 2026" viram AAAA-MM-DD. Sem ano: o ano de `hoje`
 * (ou o anterior, se a data cairia no futuro). */
export function lerData(txt: string, hoje: string): string | null {
  const s = txt.trim().toLowerCase()
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  const br = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(s)
  const ext = /^(\d{1,2})\s*(?:de\s+)?([a-zç]{3})[a-zç]*\.?(?:\s*(?:de\s+)?(\d{4}))?/.exec(s)
  const partes: [number, number, number | null] | null = iso
    ? [+iso[3], +iso[2], +iso[1]]
    : br
      ? [+br[1], +br[2], br[3] ? (br[3].length === 2 ? 2000 + +br[3] : +br[3]) : null]
      : ext && MESES[ext[2]]
        ? [+ext[1], MESES[ext[2]], ext[3] ? +ext[3] : null]
        : null
  if (!partes) return null
  const [d, m, a] = partes
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const anoHoje = +hoje.slice(0, 4)
  const montar = (ano: number) => `${ano}-${pad(m)}-${pad(d)}`
  // sem ano e caindo no futuro: é do ano passado
  const data = a == null && montar(anoHoje) > hoje ? montar(anoHoje - 1) : montar(a ?? anoHoje)
  return new Date(data + 'T12:00:00Z').getUTCMonth() + 1 === m ? data : null
}

const ENTRADA =
  /\b(recebid[oa]|recebimento|sal[aá]rio|estorno|reembolso|rendimento|dep[oó]sito|cr[eé]dito em conta|pix de |transfer[eê]ncia de )/i

function deOfx(texto: string, hoje: string): LinhaExtrato[] {
  const out: LinhaExtrato[] = []
  for (const bloco of texto.split(/<STMTTRN>/i).slice(1)) {
    const tag = (n: string) => new RegExp(`<${n}>([^<\\r\\n]*)`, 'i').exec(bloco)?.[1]?.trim() || ''
    const bruto = tag('DTPOSTED')
    const data = /^\d{8}/.test(bruto)
      ? lerData(`${bruto.slice(0, 4)}-${bruto.slice(4, 6)}-${bruto.slice(6, 8)}`, hoje)
      : null
    const v = lerValor(tag('TRNAMT').replace('.', ','))
    if (!data || v == null || v === 0) continue
    out.push({
      data,
      descricao: limpa(tag('MEMO') || tag('NAME')) || 'Movimento do extrato',
      valor: c2(Math.abs(v)),
      entrada: v > 0,
    })
  }
  return out
}

function separador(linha: string) {
  return [';', '\t', ','].sort((a, b) => linha.split(b).length - linha.split(a).length)[0]
}
function celulas(linha: string, sep: string) {
  const out: string[] = []
  let atual = '',
    aspas = false
  for (const ch of linha) {
    if (ch === '"') aspas = !aspas
    else if (ch === sep && !aspas) {
      out.push(atual)
      atual = ''
    } else atual += ch
  }
  out.push(atual)
  return out.map(c => c.trim())
}

/** Planilha com cabeçalho. Fatura de cartão (colunas date/title/amount, valor positivo = compra) e conta (negativo = saída). */
function deCsv(linhas: string[], hoje: string): LinhaExtrato[] | null {
  const sep = separador(linhas[0])
  const cab = celulas(linhas[0], sep).map(c => c.toLowerCase())
  if (cab.length < 3) return null
  // a ordem dos nomes é a preferência: "Descrição" ganha de "Histórico" quando a planilha tem os 2
  const acha = (...nomes: RegExp[]) => {
    for (const n of nomes) {
      const i = cab.findIndex(c => n.test(c))
      if (i >= 0) return i
    }
    return -1
  }
  const iData = acha(/^data/, /^date$/, /lan[cç]amento/)
  const iValor = acha(/^valor/, /^amount$/, /^quantia/)
  const iDesc = acha(/descri/, /^title$/, /hist[oó]rico/, /estabelecimento/, /^memo/)
  if (iData < 0 || iValor < 0) return null
  const cartao = cab.includes('title') || cab.includes('amount')
  const out: LinhaExtrato[] = []
  for (const l of linhas.slice(1)) {
    const c = celulas(l, sep)
    const data = lerData(c[iData] || '', hoje)
    const v = lerValor(c[iValor] || '')
    if (!data || v == null || v === 0) continue
    const descricao = limpa(c[iDesc] || '') || 'Movimento do extrato'
    // fatura: compra é positiva e pagamento ou estorno é negativo; conta: saída é negativa
    const entrada = cartao ? v < 0 : v > 0
    out.push({ data, descricao, valor: c2(Math.abs(v)), entrada })
  }
  return out
}

const VALOR_NA_LINHA =
  /(?:^|\s)([-−+]?\s?R?\$?\s?\(?-?\d{1,3}(?:\.\d{3})*,\d{2}\)?-?|[-−+]?\s?R\$\s?\d+(?:,\d{2})?)\s*([CD])?\s*$/i

/** Texto solto: cada movimento numa linha ("20/11 Padaria -12,50"), ou a data numa linha sozinha e os movimentos embaixo. */
function deTexto(linhas: string[], hoje: string): LinhaExtrato[] {
  const out: LinhaExtrato[] = []
  let dataAtual: string | null = null
  for (const bruta of linhas) {
    const linha = limpa(bruta)
    if (!linha) continue
    const dataNoComeco =
      /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\s+(?:de\s+)?[a-zç]{3}[a-zç]*\.?(?:\s+(?:de\s+)?\d{4})?)\b/i.exec(
        linha,
      )
    const data = dataNoComeco ? lerData(dataNoComeco[1], hoje) : null
    let resto = dataNoComeco && data ? linha.slice(dataNoComeco[0].length).trim() : linha
    if (data) dataAtual = data
    const v = VALOR_NA_LINHA.exec(resto)
    if (!v || !dataAtual) continue
    const valor = lerValor(v[1])
    if (valor == null || valor === 0) continue
    resto = limpa(resto.slice(0, v.index))
      .replace(/\s+[-–]\s*$/, '')
      .replace(/\b\d{2}:\d{2}\b/, '')
      .trim()
    const credito = v[2]?.toUpperCase() === 'C'
    const debito = v[2]?.toUpperCase() === 'D'
    const sinal = /^\s*[-−]|\(|-\s*$/.test(v[1])
    const entrada = credito || (!debito && !sinal && ENTRADA.test(resto))
    out.push({ data: dataAtual, descricao: resto || 'Movimento do extrato', valor: c2(Math.abs(valor)), entrada })
  }
  return out
}

/** Lê o extrato colado. Linha que não tem data e valor é ignorada (saldo, cabeçalho, propaganda). */
export function lerExtrato(texto: string, hoje: string): LinhaExtrato[] {
  const t = texto.replace(/\r/g, '')
  if (/<STMTTRN>/i.test(t)) return deOfx(t, hoje)
  const linhas = t.split('\n').filter(l => l.trim())
  if (!linhas.length) return []
  const csv =
    linhas.length > 1 && /[;,\t]/.test(linhas[0]) && !/\d{1,2}\/\d{1,2}/.test(linhas[0]) ? deCsv(linhas, hoje) : null
  const lidas = csv ?? deTexto(linhas, hoje)
  return lidas.filter(l => !/^saldo\b/i.test(l.descricao))
}

const palavras = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(
      p => p.length >= 4 && !/^(compra|pagamento|debito|credito|cartao|pix|enviado|transferencia|para|com)$/.test(p),
    )

/** O limite que a pessoa costuma usar para essa loja: o do gasto anterior com a palavra mais parecida, ou o padrão. */
export function sugerirLimite(
  descricao: string,
  anteriores: { descricao: string | null; envelope_id: string }[],
  permitidos: string[],
  padrao: string,
): string {
  const minhas = new Set(palavras(descricao))
  let melhor = { id: '', pontos: 0 }
  for (const a of anteriores) {
    if (!a.descricao || !permitidos.includes(a.envelope_id)) continue
    const pontos = palavras(a.descricao).filter(p => minhas.has(p)).length
    if (pontos > melhor.pontos) melhor = { id: a.envelope_id, pontos }
  }
  return melhor.id || padrao
}

/** Já anotado: mesmo valor, data até 2 dias de diferença. Pega o gasto anotado à mão antes de colar o extrato. */
export function jaAnotado(l: LinhaExtrato, anotados: { data: string; valor: number; apagado_em?: string | null }[]) {
  const dia = (d: string) => Date.parse(d + 'T12:00:00Z') / 86400000
  return anotados.some(
    a => !a.apagado_em && Math.abs(a.valor - l.valor) < 0.005 && Math.abs(dia(a.data) - dia(l.data)) <= 2,
  )
}
