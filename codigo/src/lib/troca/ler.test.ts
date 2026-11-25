import { describe, expect, it } from 'vitest'
import { trocasDeExemplo } from '../../api/exemploTrocas'
import { enderecoPtax, lerPtax, montarCotacao } from './cambio'
import { contaDaTroca } from './conta'
import { lerDecimal } from './formato'
import { lerTroca, lerTrocas, linkSeguro } from './ler'
import { trocaDoLink, trocaParaLink } from './link'
import { buscasDoUsado, PAISES, trocaNova } from './nova'

const duo = trocasDeExemplo[0]

describe('o que vem de fora é conferido antes de virar comparação', () => {
  it('uma comparação certa passa igual', () => {
    expect(lerTroca(JSON.parse(JSON.stringify(duo)))).toEqual(duo)
    expect(lerTrocas(trocasDeExemplo)).toEqual(trocasDeExemplo)
  })

  it('sem nome, sem preço ou sem forma de pagar não existe', () => {
    expect(lerTroca(null)).toBeNull()
    expect(lerTroca('texto')).toBeNull()
    expect(lerTroca({ ...duo, nome: '  ' })).toBeNull()
    expect(lerTroca({ ...duo, versoes: [{ rotulo: '1 TB', preco: 0 }] })).toBeNull()
    expect(lerTroca({ ...duo, pagamentos: [] })).toBeNull()
    expect(lerTrocas({ nao: 'lista' })).toEqual([])
  })

  it('número quebrado volta ao padrão e a conta continua fechando', () => {
    const t = lerTroca({ ...duo, cambio: 'abc', dolarFiscal: -1, cota: null, versao: 99, pagamento: 'sumiu' })!
    expect(t.cambio).toBe(1)
    expect(t.dolarFiscal).toBe(1)
    expect(t.cota).toBe(1000)
    expect(t.versao).toBe(3)
    expect(t.pagamento).toBe('sicoob')
    expect(contaDaTroca(t)).not.toBeNull()
  })

  it('link que não é https é jogado fora', () => {
    expect(linkSeguro('https://www.gov.br/x')).toBe('https://www.gov.br/x')
    expect(linkSeguro('javascript:alert(1)')).toBe('')
    expect(linkSeguro('http://exemplo.com')).toBe('')
    expect(linkSeguro('https://a.com/"onmouseover=')).toBe('')
    const t = lerTroca({ ...duo, fontes: [{ rotulo: 'Ruim', link: 'javascript:alert(1)' }, duo.fontes[0]] })!
    expect(t.fontes).toEqual([duo.fontes[0]])
  })

  it('id com nome interno do JavaScript é recusado (quebraria a lista de rascunhos)', () => {
    for (const id of ['constructor', 'toString', '__proto__', 'hasOwnProperty'])
      expect(lerTroca({ ...duo, id })).toBeNull()
  })

  it('forma de pagar repetida: fica a primeira', () => {
    const t = lerTroca({ ...duo, pagamentos: [...duo.pagamentos, { ...duo.pagamentos[0], nome: 'Cópia' }] })!
    expect(t.pagamentos.map(p => p.id)).toEqual(duo.pagamentos.map(p => p.id))
    expect(t.pagamentos[0].nome).toBe('Sicoob Black')
  })

  it('id repetido na lista: fica a primeira', () => {
    expect(lerTrocas([duo, { ...duo, nome: 'Cópia' }]).map(t => t.nome)).toEqual(['iPhone Duo'])
  })
})

describe('comparação por link', () => {
  it('vai e volta igual, com acento', () => {
    const link = '#/trocar?' + trocaParaLink(duo)
    expect(trocaDoLink(link)).toEqual(duo)
    expect(link).not.toMatch(/[+/=]$/)
  })

  it('link cortado, de outra tela ou vazio devolve nada', () => {
    const c = trocaParaLink(duo)
    expect(trocaDoLink('#/trocar?' + c.slice(0, 200))).toBeNull()
    expect(trocaDoLink('#/cartoes?' + c)).toBeNull()
    expect(trocaDoLink('#/trocar')).toBeNull()
    expect(trocaDoLink('#/trocar?c=<script>')).toBeNull()
    expect(trocaDoLink('')).toBeNull()
  })
})

describe('câmbio do Banco Central', () => {
  it('monta o endereço dos últimos 10 dias, com a data no formato do Banco Central', () => {
    const euro = enderecoPtax('EUR', '2026-11-25')
    expect(euro).toContain('CotacaoMoedaPeriodo(moeda=@moeda,')
    expect(euro).toContain("@moeda='EUR'")
    expect(euro).toContain("@dataInicial='11-15-2026'&@dataFinalCotacao='11-25-2026'")
    expect(enderecoPtax('USD', '2027-01-03')).toContain('CotacaoDolarPeriodo(')
    expect(enderecoPtax('USD', '2027-01-03')).toContain("@dataInicial='12-24-2026'&@dataFinalCotacao='01-03-2027'")
  })

  it('lê a resposta real do boletim', () => {
    const resposta = {
      value: [{ cotacaoCompra: 6.4395, cotacaoVenda: 6.4413, dataHoraCotacao: '2026-11-25 13:02:42.418138' }],
    }
    expect(lerPtax(resposta)).toEqual({ reais: 6.4413, data: '2026-11-25' })
    expect(montarCotacao('EUR', { reais: 6.4413, data: '2026-11-25' }, { reais: 5.8825 })).toEqual({
      moeda: 'EUR',
      reais: 6.4413,
      dolares: 1.094994,
      data: '2026-11-25',
    })
  })

  it('iene: 6 casas, para o câmbio pequeno não perder precisão', () => {
    const iene = montarCotacao('JPY', { reais: 0.037712, data: '2026-11-25' }, { reais: 5.8825 })
    expect(iene.reais).toBe(0.037712)
    expect(iene.dolares).toBe(0.006411)
  })

  it('sem boletim (fim de semana sem dado) ou resposta estranha devolve nada', () => {
    expect(lerPtax({ value: [] })).toBeNull()
    expect(lerPtax(null)).toBeNull()
    expect(lerPtax({ value: [{ cotacaoVenda: 'abc', dataHoraCotacao: '2026-11-25' }] })).toBeNull()
    expect(lerPtax({ value: [{ cotacaoVenda: 0, dataHoraCotacao: '2026-11-25' }] })).toBeNull()
  })
})

describe('comparação nova', () => {
  const espanha = PAISES.find(p => p.id === 'es')!
  const cotacao = { moeda: 'EUR' as const, reais: 6.4413, dolares: 1.095, data: '2026-11-25' }

  it('nasce com conta fechando, câmbio do dia e os cartões da comparação anterior', () => {
    const t = trocaNova({
      id: 'n1',
      nome: 'Drone novo',
      usado: 'Drone velho',
      pais: espanha,
      preco: 2099,
      venda: 4000,
      cotacao,
      base: duo,
    })
    expect(lerTroca(t)).toEqual(t)
    expect(t.cambio).toBe(6.4413)
    expect(t.cambioData).toBe('2026-11-25')
    expect(t.pagamentos).toBe(duo.pagamentos)
    // o cenário inteiro vem junto: milhas com bônus e preço, e as regras dos cartões depois da regra da alfândega
    expect([t.bonusPct, t.milheiro, t.programa]).toEqual([120, 14.13, 'Azul'])
    expect(t.textos.milhas).toBe(duo.textos.milhas)
    expect(t.regras.map(x => x.titulo)).toEqual(['Alfândega na volta', ...duo.regras.map(x => x.titulo)])
    expect([t.vendaMin, t.vendaMax]).toEqual([3200, 4800])
    const r = contaDaTroca(t)!
    expect(r.reembolso).toBe(304.36)
    expect(r.imposto).toBeGreaterThan(0)
  })

  it('sem comparação anterior usa formas de pagar padrão; país sem tax free não devolve nada', () => {
    const eua = PAISES.find(p => p.id === 'us')!
    const t = trocaNova({ id: 'n2', nome: 'Câmera', usado: '', pais: eua, preco: 900, venda: 0, cotacao })
    expect(t.pagamentos.map(p => p.tipo)).toEqual(['cartao', 'conta', 'referencia'])
    expect(t.passos).toEqual([])
    const r = contaDaTroca(t)!
    expect(r.reembolso).toBe(0)
    expect(r.imposto).toBe(0)
  })

  it('compra em outra moeda leva os cartões, mas não a conta em euro nem o euro de referência', () => {
    const eua = PAISES.find(p => p.id === 'us')!
    const dolar = { moeda: 'USD' as const, reais: 5.8825, dolares: 1, data: '2026-11-25' }
    const t = trocaNova({
      id: 'n3',
      nome: 'Câmera',
      usado: '',
      pais: eua,
      preco: 1500,
      venda: 0,
      cotacao: dolar,
      base: duo,
    })
    expect(t.pagamentos.map(p => p.id)).toEqual(['sicoob', 'uvp', 'uvc', 'epic', 'nu', 'conta', 'ref'])
    expect(t.pagamentos.find(p => p.tipo === 'conta')!.nome).toBe('Conta em moeda de lá')
    expect(contaDaTroca(t)).not.toBeNull()
  })

  it('buscas do usado prontas; sem nome do usado, nenhuma', () => {
    expect(buscasDoUsado('iPhone 17 Pro Max').map(b => b.link)).toEqual([
      'https://www.olx.com.br/brasil?q=iPhone%2017%20Pro%20Max',
      'https://lista.mercadolivre.com.br/iPhone-17-Pro-Max-usado',
    ])
    expect(buscasDoUsado('  ')).toEqual([])
  })
})

describe('número digitado no campo', () => {
  it('vírgula é decimal, ponto de milhar some', () => {
    expect(lerDecimal('6,4349')).toBe(6.4349)
    expect(lerDecimal('1.234,5')).toBe(1234.5)
    expect(lerDecimal('6.43')).toBe(6.43)
    expect(lerDecimal('120')).toBe(120)
  })
  it('em câmbio e taxa, ponto é casa decimal; só campo de quantia lê "1.000" como mil', () => {
    expect(lerDecimal('6.434')).toBe(6.434)
    expect(lerDecimal('5.882')).toBe(5.882)
    expect(lerDecimal('1.000', true)).toBe(1000)
    expect(lerDecimal('12.500', true)).toBe(12500)
    expect(lerDecimal('6.43', true)).toBe(6.43)
  })
  it('vazio, letra e sinal de menos não viram número', () => {
    expect(lerDecimal('')).toBeNull()
    expect(lerDecimal('abc')).toBeNull()
    expect(lerDecimal('-5')).toBeNull()
  })
})
