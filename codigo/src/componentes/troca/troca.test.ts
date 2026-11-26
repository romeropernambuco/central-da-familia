import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { trocasDeExemplo } from '../../api/exemploTrocas'
import { esconderValores } from '../../lib/olho'
import { contaDaTroca, erroDaTroca } from '../../lib/troca/conta'
import type { Troca } from '../../lib/troca/tipos'
import { TrocaAjustes } from './TrocaAjustes'
import { TrocaBrasil } from './TrocaBrasil'
import { TrocaContaEmMoeda, TrocaDetalhe } from './TrocaDetalhe'
import { TrocaNaLoja, TrocaRegras, TrocaVenda } from './TrocaGuia'
import { TrocaPagamento } from './TrocaPagamento'
import { TrocaResumo } from './TrocaResumo'

const olho = vi.hoisted(() => ({ fechado: false }))
vi.mock('../../app/useOculto', () => ({ useOculto: () => olho.fechado }))
vi.mock('../../app/contexto', () => ({
  useOlhoApp: () => ({ oculto: olho.fechado }),
  useSessaoAtual: () => ({
    api: { cotacaoMoeda: async () => null, guardadoHoje: async () => null },
    familia: { id: 'f' },
  }),
}))

const duo = trocasDeExemplo[0]
const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/\s+/g, ' ')

/** A tela inteira de uma comparação, como texto corrido. */
function tela(t: Troca, fechado = false) {
  olho.fechado = fechado
  esconderValores(fechado)
  const bloco = { t, conta: contaDaTroca(t), mudar: () => {} }
  const pecas = [
    createElement(TrocaResumo, { ...bloco, erro: erroDaTroca(t) }),
    createElement(TrocaBrasil, bloco),
    createElement(TrocaPagamento, bloco),
    createElement(TrocaDetalhe, bloco),
    createElement(TrocaContaEmMoeda, bloco),
    createElement(TrocaVenda, { t }),
    createElement(TrocaNaLoja, { t }),
    createElement(TrocaAjustes, bloco),
    createElement(TrocaRegras, { t }),
  ]
  return pecas.map(p => renderToStaticMarkup(p)).join('\n')
}

afterEach(() => {
  olho.fechado = false
  esconderValores(false)
})

describe('a tela mostra a mesma conta do painel original', () => {
  it('cenário padrão: número grande, três fatias e a conta linha por linha', () => {
    const t = texto(tela(duo))
    expect(t).toContain('Custo da troca com imposto')
    expect(t).toContain('R$ 16.615 ,27')
    expect(t).toContain('Pagando com Sicoob Black')
    expect(t).toContain('+ 16.391 pontos Azul · valem ≈ R$ 232 em passagem')
    for (const valor of ['R$ 8.000,00', 'R$ 9.611,39', 'R$ 7.003,88', 'R$ 19.877,41', 'R$ 695,71', 'R$ 20.573,12'])
      expect(t).toContain(valor)
    expect(t).toContain('Tax free (− 460,26 €) − R$ 2.961,73')
    expect(t).toContain('iPhone Duo após o reembolso R$ 17.611,39')
    expect(t).toContain('R$ 21.998,79')
    expect(t).toContain('Sobra na conta depois de pagar 211,00 €')
  })

  it('sem o imposto, o rótulo e o número mudam e a fatia do imposto apaga', () => {
    const html = tela({ ...duo, comImposto: false })
    expect(texto(html)).toContain('Custo da troca sem imposto')
    expect(texto(html)).toContain('R$ 9.611 ,39')
    expect(html).toContain('<li class="fora">')
    expect(html).toContain('class="imposto" style="width:0%"')
  })

  it('a forma de pagar mais barata ganha o selo, e a frase diz quem vem depois', () => {
    const html = tela(duo)
    expect(html.match(/Menos dinheiro/g)).toHaveLength(1)
    expect(html).toMatch(/Ultravioleta · cashback<span class="chip ok">Menos dinheiro/)
    expect(texto(html)).toContain(
      'Em dinheiro, Ultravioleta · cashback é o mais barato: R$ 20.316. Sicoob Black sai R$ 257 mais caro. ' +
        'C6 Conta Global Euro sai R$ 276 mais caro. Milhas não entram nessa conta.',
    )
    expect(html).toMatch(/aria-pressed="true"[^>]*>.*?Sicoob Black/s)
  })

  it('escolher o cartão com dinheiro de volta desconta o cashback da conta', () => {
    const t = texto(tela({ ...duo, pagamento: 'epic' }))
    expect(t).toContain('Pagando com PicPay Epic Black')
    expect(t).toContain('Já desconta R$ 835 de cashback, que volta em dinheiro')
    expect(t).toContain('Cashback (dinheiro de volta) − R$ 834,85')
    expect(t).toContain('Spread 5% · IOF 3,5% · 4% de volta')
  })

  it('faltando moeda na conta, a tela diz quanto falta', () => {
    expect(texto(tela({ ...duo, contaComprar: 3000 }))).toContain('Falta na conta para pagar faltam 89,00 €')
  })

  it('número que não fecha vira aviso, nunca um valor errado', () => {
    const t = texto(tela({ ...duo, cambio: NaN }))
    expect(t).toContain('Confira os valores.')
    expect(t).not.toContain('16.615')
    expect(t).not.toContain('NaN')
  })

  it('nada do painel original se perdeu: anúncios, passos, frase, regras e fontes à vista', () => {
    const html = tela(duo)
    for (const r of duo.referencias) expect(html).toContain(`href="${r.link.replace(/&/g, '&amp;')}"`)
    for (const p of duo.passos) expect(texto(html)).toContain(p.texto)
    expect(html).toContain('lang="es"')
    expect(texto(html)).toContain(duo.frase!.texto)
    for (const r of duo.regras) expect(texto(html)).toContain(r.titulo + ':')
    for (const f of duo.fontes) expect(html).toContain(f.rotulo)
    expect(html).not.toContain('<details')
  })

  it('todo link para fora abre em outra aba e não conta de onde veio', () => {
    const links = tela(duo).match(/<a [^>]+>/g) ?? []
    expect(links.length).toBeGreaterThan(20)
    for (const a of links) {
      expect(a).toContain('href="https://')
      expect(a).toContain('rel="noopener noreferrer"')
    }
  })

  it('comparação sem anúncio guardado mostra a busca pronta do usado', () => {
    const html = tela(trocasDeExemplo[1])
    expect(html).toContain('https://www.olx.com.br/brasil?q=Drone%20antigo')
    expect(texto(html)).toContain('DJI Mavic 4 Pro após o reembolso')
  })
})

describe('lá fora ou no Brasil', () => {
  const duo512 = { ...duo, versao: 1 }

  it('com imposto, a tela diz que no Brasil em 10x sai mais barato e mostra a conta dos dois lados', () => {
    const t = texto(tela(duo512))
    expect(t).toContain('Comprar no Brasil sai R$ 4.770 ,33 mais barato.')
    expect(t).toContain('No Brasil em 10x mais barato R$ 7.452,16')
    expect(t).toContain('Lá fora, sem o imposto R$ 6.827,33')
    expect(t).toContain('Lá fora, com o imposto R$ 12.222,48')
    expect(t).toContain('depois do reembolso e com o imposto do Brasil R$ 20.222,48')
    expect(t).toContain('No Brasil, à vista (Loja de importados no Recife) R$ 16.270,00')
    expect(t).toContain('Ganho de pagar em 10x sem juros com o dinheiro rendendo − R$ 817,84')
    expect(t).toContain('No Brasil em 10x, em valor de hoje R$ 15.452,16')
    expect(t).toContain('Já comprei: confirmar a economia')
  })

  it('sem imposto, a economia prevista passa para o lado de fora', () => {
    const t = texto(tela({ ...duo512, comImposto: false }))
    expect(t).toContain('Comprar lá fora sai R$ 624 ,83 mais barato.')
    expect(t).toContain('Lá fora, sem o imposto mais barato R$ 6.827,33')
  })

  it('versão sem preço no Brasil avisa quais já têm', () => {
    const t = texto(tela(duo))
    expect(t).toContain('Esta versão ainda não tem preço no Brasil. Já tem: 512 GB.')
    expect(t).not.toContain('mais barato.')
    expect(t).toContain('Lá fora, com o imposto R$ 16.615,27')
  })

  it('compra confirmada: a economia deixa de ser prevista e a tela diz onde, quando, como e quanto', () => {
    const compra = {
      onde: 'fora' as const,
      forma: 'Sicoob Black',
      pago: 14800,
      outraOpcao: 15452.16,
      data: '2026-12-02',
    }
    const t = texto(tela({ ...duo512, compra }))
    expect(t).toContain('confirmada Economia que aconteceu')
    expect(t).toContain('R$ 652 ,16')
    expect(t).toContain(
      'Comprou lá fora em 02/12, com Sicoob Black. Custou R$ 14.800,00; a outra opção sairia por R$ 15.452,16.',
    )
    expect(t).toContain('Desfazer a confirmação')
  })

  it('olho fechado esconde os valores, a loja e a forma de pagar da compra', () => {
    const compra = {
      onde: 'fora' as const,
      forma: 'Sicoob Black',
      pago: 14800,
      outraOpcao: 15452.16,
      data: '2026-12-02',
    }
    for (const t of [texto(tela(duo512, true)), texto(tela({ ...duo512, compra }, true))])
      for (const segredo of ['4.770', '16.270', '15.452', '14.800', '652', 'Loja de importados', 'Sicoob', '10x'])
        expect(t, segredo).not.toContain(segredo)
  })
})

describe('as 3 versões do topo mostram a mesma conta', () => {
  const duo512 = { ...duo, versao: 1 }
  const topo = (desenho: 'a' | 'b' | 'c', t = duo512, fechado = false) => {
    olho.fechado = fechado
    esconderValores(fechado)
    return texto(
      renderToStaticMarkup(
        createElement(TrocaResumo, { t, conta: contaDaTroca(t), mudar: () => {}, erro: erroDaTroca(t), desenho }),
      ),
    )
  }

  it.each(['a', 'b', 'c'] as const)('versão %s: custo da troca, quem ganha, controles, fatias e venda', desenho => {
    const t = topo(desenho)
    expect(t).toContain('Custo da troca com imposto')
    expect(t).toContain('R$ 12.222 ,48')
    expect(t).toContain('R$ 4.770 ,33')
    expect(t).toContain('Pagando com Sicoob Black')
    expect(t).toContain('Incluir o imposto do Brasil')
    for (const versao of ['256 GB', '512 GB', '1 TB', '2 TB']) expect(t).toContain(versao)
    for (const fatia of ['Volta com a venda R$ 8.000,00', 'Sai do bolso R$ 6.827,33', 'Imposto R$ 5.395,15'])
      expect(t).toContain(fatia)
    expect(t).toContain('Venda do 17 Pro Max')
  })

  it.each(['a', 'b', 'c'] as const)('versão %s: olho fechado não mostra valor nem nome', desenho => {
    const t = topo(desenho, duo512, true)
    for (const segredo of ['12.222', '4.770', '7.452', '6.827', '5.395', '16.270', '14.827', '8.000', 'Sicoob', '10x'])
      expect(t, segredo).not.toContain(segredo)
  })

  it.each(['a', 'b', 'c'] as const)('versão %s: sem preço no Brasil continua mostrando o custo', desenho => {
    const t = topo(desenho, duo)
    expect(t).toContain('R$ 16.615 ,27')
    expect(t).not.toContain('NaN')
  })
})

describe('olho fechado', () => {
  it('nenhum valor, nome de cartão ou nome de aparelho aparece, nem em campo', () => {
    const html = tela(duo, true)
    const t = texto(html)
    for (const segredo of ['16.615', '9.611', '7.003', '8.000', '20.573', '460,26', '3.089', '16.391', '21.998'])
      expect(t, segredo).not.toContain(segredo)
    // nome de cartão, de aparelho e valor em euro não escapam por texto de apoio, regra ou endereço de busca
    for (const nome of ['Sicoob', 'Nubank', 'PicPay', 'Epic', 'C6', 'Ultravioleta', '17 Pro Max', 'Duo', '2.600'])
      expect(t, nome).not.toContain(nome)
    expect(html).not.toContain('olx.com.br')
    expect(html).not.toContain('<a ')
    expect(html).not.toMatch(/value="[^"]*\d[^"]*"/)
    expect(html).not.toContain('type="range"')
    expect(html).not.toContain('troca-barra')
  })
})
