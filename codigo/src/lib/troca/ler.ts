// Tudo o que chega de fora (configuração guardada, link colado) passa por aqui antes de virar comparação.
// O que não tem forma certa é descartado; número fora do limite volta ao padrão.
import {
  MOEDAS,
  type CompraFeita,
  type CompraNoBrasil,
  type LinkTroca,
  type Moeda,
  type PagamentoTroca,
  type PassoTroca,
  type ReferenciaTroca,
  type RegraTroca,
  type TextosTroca,
  type Troca,
  type VersaoTroca,
} from './tipos'

type Cru = Record<string, unknown>
const objeto = (x: unknown): Cru | null => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Cru) : null)
const lista = (x: unknown): unknown[] => (Array.isArray(x) ? x : [])
const texto = (x: unknown, limite = 400): string => (typeof x === 'string' ? x.trim().slice(0, limite) : '')
const TETO = 1e9

/** Número entre o mínimo e o teto; fora disso (ou sem número) vale o padrão. */
function numero(x: unknown, padrao: number, minimo = 0): number {
  const n = typeof x === 'number' ? x : typeof x === 'string' && x.trim() !== '' ? Number(x) : NaN
  return Number.isFinite(n) && n >= minimo && n <= TETO ? n : padrao
}
const numeroOuVazio = (x: unknown): number | null => (x == null || x === '' ? null : numero(x, 0))

/** Só endereço https entra como link: nada de `javascript:` nem de endereço interno. */
export function linkSeguro(x: unknown): string {
  const s = texto(x, 600)
  return /^https:\/\/[^\s"'<>]+$/.test(s) ? s : ''
}

function lerLink(x: unknown): LinkTroca[] {
  const o = objeto(x)
  const link = linkSeguro(o?.link)
  const rotulo = texto(o?.rotulo, 80)
  return link && rotulo ? [{ rotulo, link }] : []
}

function lerVersao(x: unknown): VersaoTroca[] {
  const o = objeto(x)
  const preco = numero(o?.preco, 0)
  const rotulo = texto(o?.rotulo, 40)
  if (!rotulo || !(preco > 0)) return []
  const precoBrasil = numero(o?.precoBrasil, 0)
  return [
    {
      rotulo,
      preco,
      reembolsoPct: Math.min(numero(o?.reembolsoPct, 0), 100),
      ...(precoBrasil > 0 ? { precoBrasil } : {}),
    },
  ]
}

function lerPagamento(x: unknown): PagamentoTroca[] {
  const o = objeto(x)
  const id = texto(o?.id, 40)
  const nome = texto(o?.nome, 80)
  if (!id || !nome) return []
  const tipo = o?.tipo === 'conta' || o?.tipo === 'referencia' ? o.tipo : 'cartao'
  const incerto = texto(o?.spreadIncerto)
  return [
    {
      id,
      nome,
      nota: texto(o?.nota, 120),
      tipo,
      spreadPct: Math.min(numero(o?.spreadPct, 0), 100),
      iofPct: Math.min(numero(o?.iofPct, 0), 100),
      pontosPorDolar: Math.min(numero(o?.pontosPorDolar, 0), 100),
      cashbackPct: Math.min(numero(o?.cashbackPct, 0), 100),
      ...(incerto ? { spreadIncerto: incerto } : {}),
    },
  ]
}

function lerReferencia(x: unknown): ReferenciaTroca[] {
  const o = objeto(x)
  const local = texto(o?.local, 80)
  const link = linkSeguro(o?.link)
  if (!local || !link) return []
  return [{ local, detalhe: texto(o?.detalhe, 120), preco: numero(o?.preco, 0), link }]
}

function lerPasso(x: unknown): PassoTroca[] {
  const o = objeto(x)
  const frase = texto(o?.texto)
  if (!frase) return []
  const link = lerLink(o?.link)[0]
  return [{ texto: frase, ...(link ? { link } : {}) }]
}

function lerRegra(x: unknown): RegraTroca[] {
  const o = objeto(x)
  const titulo = texto(o?.titulo, 80)
  const frase = texto(o?.texto, 600)
  return titulo && frase ? [{ titulo, texto: frase, fontes: lista(o?.fontes).flatMap(lerLink) }] : []
}

const CHAVES_DE_TEXTO: (keyof TextosTroca)[] = [
  'versoes',
  'vendaMeio',
  'milhas',
  'conta',
  'pagamentos',
  'detalhe',
  'contaComprar',
  'venda',
  'vendaRodape',
  'cambio',
  'aduana',
  'valorAduana',
  'fontesRodape',
]
function lerTextos(x: unknown): TextosTroca {
  const o = objeto(x) ?? {}
  return Object.fromEntries(CHAVES_DE_TEXTO.flatMap(c => (texto(o[c], 600) ? [[c, texto(o[c], 600)]] : [])))
}

function lerFrase(x: unknown): Troca['frase'] {
  const o = objeto(x)
  const frase = texto(o?.texto)
  return frase
    ? { rotulo: texto(o?.rotulo, 60) || 'Frase para a loja', idioma: texto(o?.idioma, 8), texto: frase }
    : null
}

function lerBrasil(x: unknown): CompraNoBrasil | null {
  const o = objeto(x)
  if (!o) return null
  return {
    loja: texto(o.loja, 80),
    parcelas: Math.min(Math.max(Math.trunc(numero(o.parcelas, 1)), 1), 48),
    rendeAnoPct: Math.min(numero(o.rendeAnoPct, 0), 100),
    nota: texto(o.nota, 300),
  }
}

function lerCompra(x: unknown): CompraFeita | null {
  const o = objeto(x)
  const data = texto(o?.data)
  if (!o || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return null
  return {
    onde: o.onde === 'brasil' ? 'brasil' : 'fora',
    forma: texto(o.forma, 80),
    pago: numero(o.pago, 0),
    outraOpcao: numero(o.outraOpcao, 0),
    data,
  }
}

/** Câmbios, cota e imposto: tudo com padrão seguro, para a conta nunca dividir por zero. */
function lerCambios(o: Cru) {
  const cambio = numero(o.cambio, 1, 0.0001)
  const dolarFiscal = numero(o.dolarFiscal, 1, 0.0001)
  return {
    cambio,
    cambioData: /^\d{4}-\d{2}-\d{2}$/.test(texto(o.cambioData)) ? texto(o.cambioData) : '',
    cambioReembolso: numeroOuVazio(o.cambioReembolso) || null,
    dolarPontos: numero(o.dolarPontos, dolarFiscal, 0.0001),
    dolarFiscal,
    cambioFiscal: numero(o.cambioFiscal, cambio, 0.0001),
    cota: numero(o.cota, 1000),
    valorAduana: numeroOuVazio(o.valorAduana),
    contaCambio: numero(o.contaCambio, cambio, 0.0001),
    contaComprar: numero(o.contaComprar, 0),
  }
}

/** Uma comparação. Sem id, nome, versão com preço ou forma de pagar, não existe. */
export function lerTroca(x: unknown): Troca | null {
  const o = objeto(x)
  if (!o) return null
  const id = texto(o.id, 60)
  const nome = texto(o.nome, 100)
  const versoes = lista(o.versoes).flatMap(lerVersao).slice(0, 8)
  const pagamentos = lista(o.pagamentos)
    .flatMap(lerPagamento)
    .filter((p, i, todos) => todos.findIndex(x => x.id === p.id) === i)
    .slice(0, 12)
  // id igual a nome interno do JavaScript ("constructor", "__proto__") confundiria a lista de rascunhos
  if (!id || id in Object.prototype || !nome || !versoes.length || !pagamentos.length) return null
  const venda = numero(o.venda, 0)
  const vendaMin = numero(o.vendaMin, 0)
  const escolhido = texto(o.pagamento, 40)
  return {
    id,
    nome,
    usado: texto(o.usado, 100),
    de: texto(o.de, 60),
    para: texto(o.para, 60),
    moeda: MOEDAS.includes(o.moeda as Moeda) ? (o.moeda as Moeda) : 'EUR',
    versoes,
    versao: Math.min(Math.trunc(numero(o.versao, 0)), versoes.length - 1),
    ivaPct: Math.min(numero(o.ivaPct, 0), 100),
    reembolso: numeroOuVazio(o.reembolso),
    venda,
    vendaMin,
    vendaMax: Math.max(numero(o.vendaMax, 0), vendaMin),
    anunciar: numero(o.anunciar, 0),
    ...lerCambios(o),
    comImposto: o.comImposto !== false,
    pagamentos,
    pagamento: pagamentos.some(p => p.id === escolhido) ? escolhido : pagamentos[0].id,
    bonusPct: Math.min(numero(o.bonusPct, 0), 1000),
    milheiro: numero(o.milheiro, 0),
    programa: texto(o.programa, 40),
    textos: lerTextos(o.textos),
    referencias: lista(o.referencias).flatMap(lerReferencia).slice(0, 12),
    passos: lista(o.passos).flatMap(lerPasso).slice(0, 12),
    frase: lerFrase(o.frase),
    regras: lista(o.regras).flatMap(lerRegra).slice(0, 16),
    fontes: lista(o.fontes).flatMap(lerLink).slice(0, 24),
    brasil: lerBrasil(o.brasil),
    compra: lerCompra(o.compra),
  }
}

/** A lista guardada na configuração da família. Ids repetidos: fica a primeira. */
export function lerTrocas(cru: unknown): Troca[] {
  const vistos = new Set<string>()
  return lista(cru).flatMap(x => {
    const t = lerTroca(x)
    if (!t || vistos.has(t.id)) return []
    vistos.add(t.id)
    return [t]
  })
}
