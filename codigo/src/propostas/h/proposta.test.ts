import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { PrivacidadePropostas } from '../comuns/privacidade'
import type { DadosInicio } from '../dadosExemplo'
import type { Dispositivo, Tema } from '../Propostas'
import { Proposta } from './Proposta'
// @ts-ignore Node disponível no executor de testes.
import { readFileSync } from 'node:fs'

const css = readFileSync('src/propostas/h/instrumentos.css', 'utf8') as string
let exemplo: DadosInicio
beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-18T15:00:00Z'))
  try {
    const { carregarDadosInicio } = await import('../dadosExemplo')
    exemplo = await carregarDadosInicio()
  } finally {
    vi.useRealTimers()
  }
})

function renderizar(dados: DadosInicio, tema: Tema, dispositivo: Dispositivo, oculto = false) {
  return renderToStaticMarkup(
    createElement(
      PrivacidadePropostas.Provider,
      { value: oculto },
      createElement(Proposta, { dados, tema, dispositivo }),
    ),
  )
}

const textoDe = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
const numeros = (html: string) =>
  [...html.matchAll(/<span[^>]*data-numero-financeiro="true"[^>]*>(.*?<\/span>)(?:<\/span>)?/g)].map(([, conteudo]) =>
    textoDe(conteudo),
  )
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dinheiro = (valor: number) => moeda.format(valor).replace(/\s/g, ' ')
const instrumento = (html: string, tipo: string) =>
  html.match(new RegExp(`<figure[^>]+data-instrumento="${tipo}"[^>]*>.*?</figure>`))?.[0] ?? ''

const cenarios: [Tema, Dispositivo][] = [
  ['claro', 'celular'],
  ['escuro', 'celular'],
  ['claro', 'desktop'],
  ['escuro', 'desktop'],
]

describe.each(cenarios)('%s · %s', (tema, dispositivo) => {
  it('tem um h1, um selo de exemplo, quatro leituras e maquete decorativa', () => {
    const html = renderizar(exemplo, tema, dispositivo)
    expect(html).toContain(`data-h-tema="${tema}" data-h-dispositivo="${dispositivo}"`)
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html.match(/class="selo-exemplo">Exemplo<\/span>/g)).toHaveLength(1)
    expect(html).toContain('Equipe trabalhando')
    expect(html).toMatch(/aria-hidden="true"><svg class="escritorio-maquete"/)
    expect(html).toMatch(/data-sala="caixa" data-destaque="true"/)
    for (const tipo of ['carteira', 'ritmo', 'plano', 'faturas']) {
      const figura = instrumento(html, tipo)
      expect(figura, tipo).toMatch(/<svg[^>]+class="h-plot[^"]*" aria-hidden="true"/)
      expect(figura, tipo).toMatch(/<figcaption[^>]*>.+\.<\/figcaption>/)
    }
    for (const [svg] of html.matchAll(/<svg[^>]+class="cf-ilustracao[^>]+>/g)) {
      expect(svg).toContain('aria-hidden="true"')
    }
    expect(html).toMatch(/<svg[^>]+class="cf-ilustracao[^>]+>/)
  })

  it('mantém o orçamento de números e usa o valor oficial disponível hoje', () => {
    const html = renderizar(exemplo, tema, dispositivo)
    const marcados = numeros(html)
    // O HTML inteiro já cabe no teto da primeira dobra. A casca mede a interseção em pixels.
    expect(marcados.length).toBeGreaterThanOrEqual(3)
    expect(marcados.length).toBeLessThanOrEqual(dispositivo === 'celular' ? 5 : 8)
    expect(new Set(marcados).size).toBe(marcados.length)
    expect(marcados[0]).toBe(dinheiro(exemplo.hojePodeGastar.valor.valor!))
    expect(marcados.filter(n => n.includes('%'))).toHaveLength(1)
    expect(html.match(/R\$\s*-?\d/g)).toHaveLength(marcados.length - 1)
  })
})

it('remove valores, frases e geometria financeira ao fechar o olho', () => {
  const alterado = structuredClone(exemplo)
  alterado.hojePodeGastar.valor = { ...exemplo.hojePodeGastar.valor, estado: 'pronto', valor: 9876.54 }
  alterado.hojePodeGastar.ritmoMes.limite = { ...exemplo.hojePodeGastar.ritmoMes.limite, estado: 'pronto', valor: 0.01 }
  const serie = alterado.aplicacoes.serieSaldo30Dias.valor!
  serie[serie.length - 1].saldo = 98765.43
  alterado.plano2029.progressao = { ...exemplo.plano2029.progressao, estado: 'pronto', valor: 12.3 }
  alterado.faturas.proximas.valor![0].valor = {
    ...exemplo.faturas.proximas.valor![0].valor,
    estado: 'pronto',
    valor: 76543.21,
  }
  alterado.alertas.valor![0].texto = 'Atenção a R$ 65.432,10 e 54,3%'

  for (const [tema, dispositivo] of cenarios) {
    const aberto = renderizar(exemplo, tema, dispositivo)
    const abertoAlterado = renderizar(alterado, tema, dispositivo)
    const fechado = renderizar(exemplo, tema, dispositivo, true)
    expect(fechado).toContain('Valor oculto')
    expect(fechado).toBe(renderizar(alterado, tema, dispositivo, true))
    expect(fechado).not.toMatch(/R\$|\d\s*%|data-numero-financeiro|class="h-plot|stroke-dasharray="12\.3/)
    expect(fechado.match(/class="h-sem-leitura" aria-hidden="true"/g)).toHaveLength(4)
    for (const tipo of ['carteira', 'ritmo', 'plano', 'faturas']) {
      expect(instrumento(aberto, tipo)).not.toBe(instrumento(abertoAlterado, tipo))
    }
  }
})

it('distingue falta de dados de zero e reserva dinheiro ao perfil autorizado', () => {
  const dados = structuredClone(exemplo)
  dados.hojePodeGastar.valor = { ...dados.hojePodeGastar.valor, estado: 'pronto', valor: 0 }
  dados.aplicacoes.serieSaldo30Dias = { ...dados.aplicacoes.serieSaldo30Dias, estado: 'indisponivel', valor: null }
  dados.faturas.proximas = { ...dados.faturas.proximas, estado: 'vazio', valor: null }
  const aberto = renderizar(dados, 'claro', 'celular')
  expect(numeros(aberto)[0]).toBe('R$ 0,00')
  expect(instrumento(aberto, 'carteira')).toContain('Histórico de aplicações indisponível.')
  expect(instrumento(aberto, 'faturas')).toContain('Nenhuma fatura na janela consultada.')

  dados.pessoa.papel = { ...dados.pessoa.papel, estado: 'pronto', valor: 'equipe' }
  const casa = renderizar(dados, 'escuro', 'desktop')
  expect(casa).toContain('<h1>Tarefas da casa</h1>')
  expect(casa).not.toMatch(/R\$|\d\s*%|data-numero-financeiro|data-instrumento|escritorio-maquete/)
})

it('dá nome a cada ação e mantém alvos de 44 px e foco visível', () => {
  const html = renderizar(exemplo, 'claro', 'celular')
  const botoes = [...html.matchAll(/(<button[^>]*>)(.*?)<\/button>/g)]
  expect(botoes).toHaveLength(10)
  for (const [, abertura, corpo] of botoes) {
    expect(abertura).toContain('type="button"')
    expect(abertura.match(/aria-label="([^"]+)"/)?.[1] ?? textoDe(corpo)).not.toBe('')
  }
  const regra = css.match(/\.h-inicio button\s*\{([^}]+)\}/)?.[1]
  expect(regra).toMatch(/min-inline-size:\s*44px/)
  expect(regra).toMatch(/min-block-size:\s*44px/)
  expect(css).toMatch(/\.h-inicio :focus-visible\s*\{[^}]*outline:\s*2px solid var\(--destaque\)/)
})

it('mantém as três prioridades legíveis sem cor e segue os padrões de acabamento', () => {
  const dados = structuredClone(exemplo)
  dados.alertas = {
    ...dados.alertas,
    estado: 'pronto',
    valor: [
      { id: 'prazo', nivel: 'dinheiro em risco', texto: 'Conferir vencimento' },
      { id: 'estoque', nivel: 'operacao', texto: 'Revisar estoque' },
      { id: 'nota', nivel: 'lembrete', texto: 'Guardar nota' },
    ],
  }
  const html = renderizar(dados, 'escuro', 'celular')
  for (const nivel of ['Dinheiro em risco', 'Operação', 'Lembrete']) expect(html).toContain(`${nivel}</span>`)
  expect(html).not.toMatch(/\p{Extended_Pictographic}|NerdWallet|background-clip|backdrop-filter/iu)
  expect(css).not.toMatch(
    /(?:repeating-)?(?:linear|radial|conic)-gradient\(|backdrop-filter\s*:|background-clip\s*:\s*text|border-(?:left|inline-start)\s*:\s*[3-9]/i,
  )
  expect(css).toMatch(/prefers-reduced-motion:\s*reduce/)
  expect(css).toMatch(/\.numero-financeiro\s*\{[^}]*tabular-nums;[^}]*white-space:\s*nowrap/)
  expect(css).toMatch(/\.numero-simbolo\s*\{\s*font-size:\s*\.65em/)
  expect(css).toMatch(/\.h-principal\s*\{[^}]*\b35px\//)
  expect(css).toMatch(/\.h-secundario\s*\{[^}]*\b27px\//)
})

function luminancia(hex: string) {
  const canais = hex.match(/[a-f\d]{2}/gi)!.map(par => {
    const canal = parseInt(par, 16) / 255
    return canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2]
}

it('calcula AA para texto, foco, controles e marcas dos gráficos nos dois temas', () => {
  for (const tema of ['claro', 'escuro'] as const) {
    expect(renderizar(exemplo, tema, 'desktop')).toContain(`class="h-inicio" data-proposta="h" data-h-tema="${tema}"`)
  }
  const tokens = (seletor: string) =>
    Object.fromEntries(
      [
        ...css
          .split(seletor)[1]
          .split('}')[0]
          .matchAll(/(--[\w-]+):\s*(#[a-f\d]{6});/gi),
      ].map(([, nome, cor]) => [nome, cor]),
    )
  const claro = tokens('.h-inicio[data-proposta="h"] {')
  const escuro = { ...claro, ...tokens('.h-inicio[data-h-tema="escuro"] {') }
  const pares: [string, string, number][] = [
    ['texto', 'fundo', 4.5],
    ['texto', 'cartao', 4.5],
    ['texto', 'h-menta', 4.5],
    ['texto-secundario', 'fundo', 4.5],
    ['texto-secundario', 'cartao', 4.5],
    ['texto-secundario', 'h-menta', 4.5],
    ['texto-secundario', 'h-papel', 4.5],
    ['texto-secundario', 'menu', 4.5],
    ['h-selo', 'cartao', 4.5],
    ['h-sobre-verde', 'h-verde', 4.5],
    ['h-texto-verde', 'h-verde', 4.5],
    ['h-sobre-verde', 'h-faixa', 4.5],
    ['h-texto-verde', 'h-faixa', 4.5],
    ['destaque', 'cartao', 4.5],
    ['destaque', 'h-menta', 4.5],
    ['sobre-destaque', 'destaque', 4.5],
    ['h-risco', 'menu', 4.5],
    ['borda', 'h-menta', 3],
    ['h-selo-borda', 'cartao', 3],
    ['destaque', 'fundo', 3],
    ['destaque', 'h-papel', 3],
    ['h-trilha', 'cartao', 3],
    ['h-barra-secundaria', 'cartao', 3],
  ]
  for (const [tema, paleta] of Object.entries({ claro, escuro })) {
    for (const [frente, fundo, minimo] of pares) {
      const [menor, maior] = [luminancia(paleta[`--${frente}`]), luminancia(paleta[`--${fundo}`])].sort((a, b) => a - b)
      expect((maior + 0.05) / (menor + 0.05), `${tema} · ${frente} sobre ${fundo}`).toBeGreaterThanOrEqual(minimo)
    }
  }
})
