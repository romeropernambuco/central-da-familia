// E9: o Atalho do iPhone. Ao pagar com Apple Pay, a automação "Transação" do app Atalhos abre
//   <endereço do app>#/lancar?valor=<valor>&loja=<loja>&cartao=<cartão>
// e o app abre o Lançar já preenchido. NUNCA salva sozinho: a pessoa confere e toca no nome dela.
// Sem tela e sem rede: dá pra testar sozinho. O valor vem do jeito que o iPhone escreve ("R$ 12,34", "1.234,56", "12.34").

export interface DoAtalho {
  /** em reais, já validado (0,01 a 99.999,99, até 2 casas); ausente quando não veio ou veio errado */
  valor?: number
  /** nome da loja, limpo (até 60 letras) */
  loja?: string
  /** nome do cartão como o iPhone mandou (a tela procura o cartão da pessoa com esse nome) */
  cartao?: string
  /** o que veio errado, em palavras simples (a tela mostra e pede pra digitar) */
  erro?: string
}

export const VALOR_MIN = 0.01
export const VALOR_MAX = 99999.99

/** O endereço é do Atalho? (#/lancar com ou sem ?) */
export const ehAtalho = (hash: string) => /^#\/?lancar(\?|$)/.test(hash || '')

/** Pega 1 parâmetro sem quebrar na loja com "&" no nome ("C&A"): a loja vai até o próximo "&valor=" ou "&cartao=". */
function pegar(q: string, chave: 'valor' | 'loja' | 'cartao'): string | undefined {
  const m = new RegExp(`(?:^|&)${chave}=(.*?)(?=&(?:valor|loja|cartao)=|$)`).exec(q)
  if (!m) return undefined
  const cru = m[1].replace(/\+/g, ' ')
  try { return decodeURIComponent(cru) } catch { return cru }
}

/** "R$ 1.234,56", "1234,56", "1,234.56", "12.34", "12" viram número. null se não for um valor com até 2 casas. */
export function lerValor(t: string): number | null {
  let s = t.replace(/R\$|\s| /g, '')
  if (!s || !/^\d[\d.,]*$/.test(s)) return null
  const v = s.lastIndexOf(','), p = s.lastIndexOf('.')
  let inteiro: string, dec = ''
  if (v >= 0 && p >= 0) {
    // o último separador é o dos centavos; o outro é de milhar
    const sep = v > p ? ',' : '.', mil = sep === ',' ? '.' : ','
    const [i, d, ...resto] = s.split(sep)
    if (resto.length) return null
    if (!/^\d{1,3}(\d{3})*$/.test(i.split(mil).join('')) || i.split(mil).slice(1).some(g => g.length !== 3)) return null
    inteiro = i.split(mil).join(''); dec = d
  } else if (v >= 0 || p >= 0) {
    const sep = v >= 0 ? ',' : '.'
    const partes = s.split(sep)
    if (partes.length === 2 && partes[1].length <= 2) { inteiro = partes[0]; dec = partes[1] }
    else if (partes.slice(1).every(g => g.length === 3)) inteiro = partes.join('')
    else return null
  } else inteiro = s
  if (!/^\d+$/.test(inteiro) || !/^\d{0,2}$/.test(dec)) return null
  return Math.round(Number(inteiro + '.' + (dec || '0')) * 100) / 100
}

/** Lê o que o Atalho mandou. null quando o endereço não é do Atalho. */
export function lerAtalho(hash: string): DoAtalho | null {
  if (!ehAtalho(hash)) return null
  const q = (hash.split('?')[1] || '')
  const out: DoAtalho = {}
  const v = pegar(q, 'valor')
  if (v !== undefined && v.trim() !== '') {
    const n = lerValor(v)
    if (n === null) out.erro = `O valor que veio do iPhone (${v.slice(0, 20)}) não é um número com até 2 casas. Digite o valor.`
    else if (n < VALOR_MIN || n > VALOR_MAX) out.erro = `O valor que veio do iPhone está fora do que o app aceita (de R$ 0,01 a R$ 99.999,99). Digite o valor.`
    else out.valor = n
  }
  const loja = pegar(q, 'loja')
  // tira caracteres de controle e espaços repetidos; corta em 60 (cabe no "O que foi?")
  // B1 (revisão): fora os caracteres de controle e < > " ` (o React já escapa; aqui nem entram)
  if (loja) { const l = loja.replace(/[\u0000-\u001f\u007f<>"`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60); if (l) out.loja = l }
  const cartao = pegar(q, 'cartao')
  if (cartao) { const c = cartao.replace(/[\u0000-\u001f\u007f<>"`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40); if (c) out.cartao = c }
  return out
}

/** Sem acento e em minúscula, pra achar o cartão ("Itaú" acha "itau"). */
const simples = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Acha o cartão da pessoa pelo nome que o iPhone mandou (nome, banco ou os 4 últimos números). */
export function acharCartao<C extends { id: string; nome: string; banco?: string | null; final4?: string | null }>(cartoes: C[], doIphone?: string): C | null {
  if (!doIphone) return null
  const a = simples(doIphone)
  const final = /(\d{4})\D*$/.exec(a)?.[1]
  return cartoes.find(c => simples(c.nome) === a)
    || (final ? cartoes.find(c => c.final4 === final) : undefined)
    || cartoes.find(c => a.includes(simples(c.nome)) || simples(c.nome).includes(a))
    || cartoes.find(c => c.banco && a.includes(simples(c.banco)))
    || null
}

/** O endereço que o Atalho abre (pra copiar no passo a passo do Ajustes). */
export const enderecoDoAtalho = (base: string) => `${base}#/lancar?valor=`
