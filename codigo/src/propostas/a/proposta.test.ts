import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { PropsProposta } from '../Propostas'
import { reiniciarExemplo } from '../../api/exemplo'
import { PrivacidadePropostas } from '../../componentes/escritorio/privacidade'
import { carregarDadosInicio, type Campo, type DadosInicio } from '../../componentes/escritorio/dadosDeExemplo'
import { Proposta } from './Proposta'
// @ts-ignore Node é usado apenas nos testes, sem @types/node no app.
import { readFileSync } from 'node:fs'

const css: string = readFileSync(new URL('./painel-calmo.css', import.meta.url), 'utf8').trimStart()

let dados: DadosInicio
beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T10:00:00-03:00'))
  reiniciarExemplo()
  dados = await carregarDadosInicio()
})
afterAll(() => vi.useRealTimers())

function render(props: Partial<Parameters<typeof Proposta>[0]> = {}, olhoDaCasca = false) {
  return renderToStaticMarkup(
    createElement(
      PrivacidadePropostas.Provider,
      { value: olhoDaCasca },
      createElement(Proposta, { dados, tema: 'claro', dispositivo: 'celular', ...props }),
    ),
  )
}

const textos = (html: string) => html.replace(/<[^>]+>/g, '')
const valores = (html: string) =>
  [
    ...html.matchAll(/<span\b[^>]*data-numero-financeiro="true"[^>]*>([^<]+)(?:<span class="numero-simbolo">(%))?/g),
  ].map(([, valor, simbolo]) => valor + (simbolo ?? ''))
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const valorEsperado = (c: Campo<number, 'reais' | 'centavos'>) => {
  if (c.estado !== 'pronto') throw new Error('O snapshot usado neste teste precisa ter valor.')
  return moeda.format(c.unidade === 'centavos' ? c.valor / 100 : c.valor)
}
const contextos = [
  ['claro', 'celular'],
  ['claro', 'desktop'],
  ['escuro', 'celular'],
  ['escuro', 'desktop'],
] as const satisfies readonly [PropsProposta['tema'], PropsProposta['dispositivo']][]

describe.each(contextos)('%s em %s', (tema, dispositivo) => {
  it('renderiza um único h1 e reúne maquete e fila na mesma faixa', () => {
    const html = render({ tema, dispositivo })
    expect(html).toContain(`data-calmo-tema="${tema}" data-calmo-dispositivo="${dispositivo}"`)
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
    expect(textos(html).match(/Exemplo/g)).toHaveLength(1)
    expect(html).toContain('Hoje você pode gastar')
    expect(html).toContain('escritorio-maquete')
    const faixa = html.split('<section class="calmo-escritorio"')[1]
    expect(faixa).toMatch(/<svg class="escritorio-maquete" data-variante="media"/)
    expect(faixa).toContain('escritorio-maquete')
    const nomes = [
      ...faixa.matchAll(
        /<span\b[^>]*data-estado="[^"]+"[^>]*title="[^"]+"[^>]*><svg\b[^>]*>.*?<\/svg>([^<]+)<\/span>/g,
      ),
    ].map(([, nome]) => nome)
    expect(nomes.length).toBeGreaterThanOrEqual(8)
    expect(nomes.sort()).toEqual(dados.funcionarios.valor!.map(f => f.curto).sort())
    expect(faixa).toContain('Equipe e estados')
    expect(faixa).toContain('class="calmo-alertas"')
    expect(faixa).toContain('Abrir fila completa')
  })

  it('prioriza o Plano, marca cada ocorrência e recolhe os valores do ritmo no celular', () => {
    const html = render({ tema, dispositivo })
    const { serieDiaria, limite } = dados.hojePodeGastar.ritmoMes
    const acumulado = serieDiaria.valor!.reduce((soma, ponto) => soma + ponto.valor, 0)
    const plano = dados.plano2029.faltamPorMesComMargem
    const cobertura = dados.plano2029.progressao.valor!.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
    const demais = [dados.aplicacoes.rendeuHoje, dados.faturas.total, dados.recebimentos.previsto]
    const exibidos = [
      valorEsperado(dados.hojePodeGastar.valor),
      moeda.format(acumulado),
      valorEsperado(limite),
      valorEsperado(plano),
      ...(dispositivo === 'desktop' ? [cobertura] : []),
      ...demais.map(valorEsperado),
    ]
    expect(valores(html)).toEqual(exibidos)
    expect(new Set(exibidos).size).toBe(exibidos.length)
    if (dispositivo === 'celular') {
      const detalhe = html.match(/<details class="calmo-ritmo-detalhe">.*?<\/details>/)?.[0]
      expect(detalhe && valores(detalhe)).toEqual([moeda.format(acumulado), valorEsperado(limite)])
      expect(valores(html.replace(detalhe!, ''))).toHaveLength(5)
    } else {
      expect(html).not.toContain('calmo-ritmo-detalhe')
      expect(valores(html)).toHaveLength(8)
    }
  })

  it('omite os dados do HTML inteiro ao fechar o olho da casca', () => {
    const visivel = render({ tema, dispositivo })
    const oculto = render({ tema, dispositivo }, true)
    expect(visivel).toMatch(/class="calmo-linha-mes"[^>]*>/)
    expect(visivel).toMatch(/style="inline-size:[\d.]+%"/)
    for (const valor of valores(visivel)) expect(oculto.includes(valor)).toBe(false)
    expect(oculto).not.toMatch(
      /R\$|\d\s*%|data-numero-financeiro|class="calmo-(linha-mes|mini-linha|barra|anel|limite)"|aria-valuenow|inline-size:/,
    )
    expect(oculto).not.toContain('Total investido')
    expect(oculto.match(/aria-label="Valor oculto"/g)).toHaveLength(5)
  })
})

it('desenha o teto na mesma escala do acumulado e mantém as grandezas nomeadas', () => {
  const ritmo = dados.hojePodeGastar.ritmoMes
  const comRitmo = (limite: number) =>
    render({
      dispositivo: 'desktop',
      dados: {
        ...dados,
        hojePodeGastar: {
          ...dados.hojePodeGastar,
          ritmoMes: {
            ...ritmo,
            limite: { ...ritmo.limite, estado: 'pronto', valor: limite },
            serieDiaria: {
              ...ritmo.serieDiaria,
              estado: 'pronto',
              valor: [
                { data: '2026-11-01', valor: 70 },
                { data: '2026-11-09', valor: 50 },
              ],
            },
          },
        },
      },
    })
  for (const limite of [100, 180]) {
    const html = comRitmo(limite)
    const svg = html.match(/<svg class="calmo-linha-mes".*?<\/svg>/)?.[0] ?? ''
    const yLimite = Number(svg.match(/class="calmo-limite"[^>]* y1="([^"]+)"/)?.[1])
    const yAtual = Number(svg.match(/<circle[^>]+ cy="([^"]+)"/)?.[1])
    expect(yAtual < yLimite).toBe(120 > limite)
    expect(Number.isFinite(yAtual + yLimite)).toBe(true)
    expect(textos(html)).toContain(`À vista no mês${moeda.format(120)}Limite do envelope${moeda.format(limite)}`)
  }
})

it('preserva a leitura dos gastos quando o limite do envelope está indisponível', () => {
  const ritmo = dados.hojePodeGastar.ritmoMes
  const semLimite: DadosInicio = {
    ...dados,
    hojePodeGastar: {
      ...dados.hojePodeGastar,
      ritmoMes: {
        ...ritmo,
        limite: { ...ritmo.limite, estado: 'indisponivel', valor: null },
      },
    },
  }
  const html = render({ dispositivo: 'desktop', dados: semLimite })
  expect(html).toContain('class="calmo-linha-mes"')
  expect(html).toContain('class="calmo-chave-gasto"')
  expect(html).not.toMatch(/class="calmo-(limite|chave-limite)"/)
  expect(textos(html)).toContain('Limite do envelopeAinda sem dado')
})

it('distingue os indicadores de cada decisão e esconde a escala com o olho', () => {
  const html = render({ dispositivo: 'desktop' })
  const cartao = (variante: string) =>
    html.split(`class="calmo-resumo calmo-resumo-${variante}"`)[1]?.split('</article>')[0] ?? ''
  expect(cartao('plano')).toContain('numero-principal')
  expect(cartao('plano')).toContain('calmo-barra')
  expect(cartao('aplicacoes')).toContain('calmo-mini-linha')
  expect(cartao('faturas')).toMatch(/<time dateTime="\d{4}-\d{2}-\d{2}">\d{2}\/\d{2}<\/time>/i)
  expect(cartao('recebimentos')).toContain('calmo-anel')
  expect(cartao('recebimentos')).toContain('% da previsão garantida')
  expect(render({}, true)).not.toContain('data-numero-financeiro')
})

it('aplica a prop oculto também ao texto livre com dados financeiros', () => {
  const texto = 'Rever R$ 44.579,70 e 78,1% de cobertura'
  const comAlerta: DadosInicio = {
    ...dados,
    alertas: { ...dados.alertas, estado: 'pronto', valor: [{ id: 'lembrete:cobertura', nivel: 'lembrete', texto }] },
  }
  expect(render({ dados: comAlerta })).toContain(texto)
  const oculto = render({ dados: comAlerta, oculto: true })
  expect(oculto).not.toMatch(/44\.579|78,1|R\$|data-numero-financeiro/)
  expect(oculto).toContain('Abra a fila para ver o detalhe.')
})

it('prioriza os três níveis por texto e reserva o vermelho ao aviso com risco', () => {
  const comAlertas: DadosInicio = {
    ...dados,
    alertas: {
      ...dados.alertas,
      estado: 'pronto',
      valor: [
        { id: 'lembrete:exemplo', nivel: 'lembrete', texto: 'Lembrar da revisão' },
        { id: 'estoque:hoje', nivel: 'operacao', texto: 'Contar estoque' },
        { id: 'fatura:vencida', nivel: 'dinheiro em risco', texto: 'Conferir fatura' },
      ],
    },
  }
  const html = render({ dados: comAlertas })
  expect(html).toMatch(/<li class="calmo-risco">.*Dinheiro em risco<\/span><p>Conferir fatura<\/p><\/li>/)
  expect(textos(html)).toMatch(/Dinheiro em riscoConferir faturaOperaçãoContar estoqueLembreteLembrar da revisão/)
})

it('mostra ausência sem substituir campos indisponíveis ou vazios por zero', () => {
  const incompleto: DadosInicio = {
    ...dados,
    hojePodeGastar: {
      ...dados.hojePodeGastar,
      valor: { ...dados.hojePodeGastar.valor, estado: 'indisponivel', valor: null },
      ritmoMes: {
        ...dados.hojePodeGastar.ritmoMes,
        serieDiaria: { ...dados.hojePodeGastar.ritmoMes.serieDiaria, estado: 'vazio', valor: null },
      },
    },
    faturas: { ...dados.faturas, total: { ...dados.faturas.total, estado: 'vazio', valor: null } },
    funcionarios: { ...dados.funcionarios, estado: 'indisponivel', valor: null },
  }
  const html = render({ dados: incompleto })
  expect(textos(html).match(/Ainda sem dado/g)).toHaveLength(2)
  expect(textos(html).match(/Sem registros/g)).toHaveLength(3)
  expect(valores(html)).toHaveLength(4)
  expect(html).not.toMatch(/R\$\s*0,00|calmo-linha-mes|escritorio-maquete/)
  const ilustracoes = [...html.matchAll(/<svg[^>]*class="cf-ilustracao[^"]*"[^>]*>/g)].map(m => m[0])
  expect(ilustracoes).toHaveLength(3)
  for (const figura of ilustracoes) expect(figura).toContain('aria-hidden="true"')
})

it('limita o Assessor da Casa às tarefas autorizadas mesmo com um snapshot financeiro', () => {
  const equipe: DadosInicio = {
    ...dados,
    pessoa: { ...dados.pessoa, papel: { ...dados.pessoa.papel, estado: 'pronto', valor: 'equipe' } },
    alertas: {
      ...dados.alertas,
      estado: 'pronto',
      valor: [
        { id: 'feira_nota:1', nivel: 'operacao', texto: 'Nota de R$ 99,90' },
        { id: 'fatura:2', nivel: 'dinheiro em risco', texto: 'Fatura em risco' },
      ],
    },
  }
  const html = render({ dados: equipe })
  expect(html).toContain('Registrar a nota da feira')
  expect(html).toContain('href="../../#/casa"')
  expect(html).not.toMatch(/R\$|fatura|Dinheiro em risco|Plano 2029|calmo-linha-mes|escritorio-maquete/i)
})

it('identifica todos os controles e dá a todos o mesmo piso de 44 por 44 px', () => {
  expect(css).toMatch(/\.calmo \.calmo-alvo\s*\{[^}]*min-inline-size:\s*44px;[^}]*min-block-size:\s*44px;/)
  for (const [tema, dispositivo] of contextos) {
    const controles = [...render({ tema, dispositivo }).matchAll(/<(button|a|summary)\b([^>]*)>(.*?)<\/\1>/g)]
    expect(controles.length).toBeGreaterThan(10)
    for (const [, , atributos, conteudo] of controles) {
      expect(atributos).toMatch(/class="[^"]*\bcalmo-alvo\b/)
      expect(atributos.match(/aria-label="([^"]+)"/)?.[1] ?? textos(conteudo).trim()).not.toBe('')
    }
  }
})

it('usa ícones e formas sem os tratamentos proibidos', () => {
  const html = render()
  expect(html).toContain('class="lucide')
  expect(html).toMatch(/class="calmo-maquete"><svg class="escritorio-maquete"/)
  expect(css).not.toMatch(
    /backdrop-filter|gradient\s*\(|background-clip:\s*text|text-shadow|border-(?:left|inline-start):\s*[^;]*(?:destaque|risco)/i,
  )
  expect(html).not.toMatch(/<linearGradient|<radialGradient|[\p{Extended_Pictographic}\uFE0F]/u)
})

function luminancia(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map(par => {
      const s = Number.parseInt(par, 16) / 255
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}

function tokens(bloco: string) {
  return Object.fromEntries(Array.from(bloco.matchAll(/--([\w-]+):\s*(#[a-f\d]{6});/gi), m => [m[1], m[2]]))
}

it('calcula o contraste AA dos pares de texto, ação e foco em ambos os temas', () => {
  const claro = tokens(css.match(/^\[data-proposta="a"\]\s*\{([^}]+)}/m)![1])
  const escuro = { ...claro, ...tokens(css.match(/\[data-calmo-tema="escuro"\],[^{]*\{([^}]+)}/)![1]) }
  for (const paleta of [claro, escuro]) {
    const pares = [
      ...['fundo', 'cartao', 'menu', 'calmo-hero'].flatMap(fundo =>
        ['texto', 'texto-secundario', 'destaque'].map(frente => [frente, fundo, 4.5] as const),
      ),
      ['sobre-destaque', 'destaque', 4.5],
      ['risco', 'calmo-risco-fundo', 4.5],
      ['calmo-nav-texto', 'calmo-nav-fundo', 4.5],
      ['calmo-nav-suave', 'calmo-nav-fundo', 4.5],
      ['calmo-nav-texto', 'calmo-nav-ativo', 4.5],
      ['calmo-nav-foco', 'calmo-nav-ativo', 4.5],
      ['calmo-nav-foco', 'calmo-nav-fundo', 3],
    ] as const
    for (const [frente, fundo, minimo] of pares) {
      const a = luminancia(paleta[frente])
      const b = luminancia(paleta[fundo])
      const contraste = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      expect(contraste, `${frente} sobre ${fundo}`).toBeGreaterThanOrEqual(minimo)
    }
  }
})
