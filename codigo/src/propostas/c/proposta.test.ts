// @vitest-environment node
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { carregarDadosInicio, type DadosInicio } from '../dadosExemplo'
import { PrivacidadePropostas } from '../comuns/privacidade'
import { Proposta } from './Proposta'
// @ts-expect-error O TypeScript do aplicativo não inclui os tipos de Node usados pelo Vitest.
import { readFileSync } from 'node:fs'

const css: string = readFileSync(new URL('./jornada.css', import.meta.url), 'utf8')

let exemplo: DadosInicio
beforeAll(async () => { exemplo = await carregarDadosInicio() })

const combinacoes = [
  ['claro', 'celular'], ['escuro', 'celular'], ['claro', 'desktop'], ['escuro', 'desktop'],
] as const

function renderizar(ajustes: Partial<Parameters<typeof Proposta>[0]> = {}, olhoDaCasca = false) {
  return renderToStaticMarkup(createElement(PrivacidadePropostas.Provider, { value: olhoDaCasca },
    createElement(Proposta, { dados: exemplo, tema: 'claro', dispositivo: 'celular', ...ajustes })))
}

const moedaPercentual = /R\$\s*[−+-]?\d|\d[\d,.]*\s*(?:<[^>]+>\s*)?%/u
const quantidadeMarcadores = (html: string) => Array.from(html.matchAll(/data-numero-financeiro=/g)).length

describe('Jornada do Dia', () => {
  it.each(combinacoes)('renderiza o snapshot em %s no %s', (tema, dispositivo) => {
    const html = renderizar({ tema, dispositivo })
    expect(html).toContain('data-jc-tema="' + tema + '"')
    expect(html).toContain('data-jc-dispositivo="' + dispositivo + '"')
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html.match(/>Exemplo</g)).toHaveLength(1)
    for (const texto of ['Agora', 'Esta semana', 'O caminho até 2029', 'Sua equipe']) {
      expect(html).toContain(texto)
    }
    expect(html.indexOf('Agora')).toBeLessThan(html.indexOf('Esta semana'))
    expect(html).toContain('Maquete isométrica do escritório')
  })

  it.each(combinacoes)('garante o teto da primeira dobra em %s no %s pela contagem total', (tema, dispositivo) => {
    // Em SSR não há retângulos. O total de marcadores limita qualquer dobra geométrica.
    // A medição por Range da casca foi conferida no Chromium e registrada nas notas.
    const html = renderizar({ tema, dispositivo })
    const limite = dispositivo === 'celular' ? 5 : 8
    expect(quantidadeMarcadores(html)).toBeGreaterThanOrEqual(4)
    expect(quantidadeMarcadores(html)).toBeLessThanOrEqual(limite)
    const valores = Array.from(html.matchAll(/data-numero-financeiro="true">([\s\S]*?)<\/span>/g), m => m[1])
    expect(valores.some(valor => moedaPercentual.test(valor))).toBe(true)
    expect(new Set(valores).size).toBe(valores.length)
    const semMarcadores = html.replace(/<span[^>]* data-numero-financeiro="true">.*?(?:<span class="numero-simbolo">.*?<\/span>)?<\/span>/gs, '')
    expect(semMarcadores.replace(/<[^>]+>/g, '')).not.toMatch(moedaPercentual)
  })

  it.each(['casca', 'prop'] as const)('retira valores, textos compostos e proporções pelo olho via %s', via => {
    const sentinela = 'R$ 873.253,11 com 78,32% comprometidos'
    const dados = structuredClone(exemplo)
    dados.hojePodeGastar.valor = { ...dados.hojePodeGastar.valor, estado: 'pronto', valor: 873253.11 }
    dados.plano2029.progressao = { ...dados.plano2029.progressao, estado: 'pronto', valor: 78.32 }
    dados.pendencias.fila = {
      ...dados.pendencias.fila, estado: 'pronto', valor: [
        { id: 'lembrete:sentinela', funcionario: 'secretaria', perguntaCurta: sentinela,
          valor: dados.hojePodeGastar.valor },
      ],
    }
    const aberto = renderizar({ dados })
    expect(aberto).toContain(sentinela)
    expect(aberto).toContain('inline-size:78.32%')
    const html = renderizar(via === 'prop' ? { dados, oculto: true } : { dados }, via === 'casca')
    expect(html).toContain('aria-label="Valor oculto"')
    expect(html).not.toMatch(moedaPercentual)
    expect(html).not.toMatch(/873[.,]?253|78[.,]32|data-numero-financeiro|jc-trilha|(?:aria-value(?:now|min|max|text)|inline-size|stroke-dasharray)="?[\d.]+%/i)
    expect(html).not.toContain('comprometidos')
  })

  it('reserva o papel de Assessor da Casa às tarefas operacionais permitidas', () => {
    const dados = structuredClone(exemplo)
    dados.pessoa.papel = { ...dados.pessoa.papel, estado: 'pronto', valor: 'equipe' }
    const valor = dados.hojePodeGastar.valor
    dados.pendencias.fila = { ...dados.pendencias.fila, estado: 'pronto', valor: [
      { id: 'feira_nota:teste', funcionario: 'fiscal', perguntaCurta: 'Nota no valor de R$ 200', valor },
      { id: 'salario:teste', funcionario: 'folha', perguntaCurta: 'Salário da equipe', valor },
    ] }
    const html = renderizar({ dados })
    expect(html).toContain('Tarefas da casa')
    expect(html).toContain('Anexar a nota da feira')
    expect(html).not.toMatch(/Salário|Nota no valor|jc-vinheta|jc-semana|jc-caminho|#\/(orcamento|cartoes|planejamento)/)
    expect(quantidadeMarcadores(html)).toBe(0)
  })

  it('explicita campos vazios ou indisponíveis sem preencher zero', () => {
    const dados = structuredClone(exemplo)
    dados.hojePodeGastar.valor = { ...dados.hojePodeGastar.valor, estado: 'indisponivel', valor: null }
    dados.pendencias.fila = { ...dados.pendencias.fila, estado: 'vazio', valor: null }
    dados.faturas.proximas = { ...dados.faturas.proximas, estado: 'vazio', valor: null }
    dados.recebimentos.previsto = { ...dados.recebimentos.previsto, estado: 'indisponivel', valor: null }
    dados.plano2029.progressao = { ...dados.plano2029.progressao, estado: 'vazio', valor: null }
    dados.plano2029.faltamPorMesComMargem = { ...dados.plano2029.faltamPorMesComMargem, estado: 'indisponivel', valor: null }
    dados.funcionarios = { ...dados.funcionarios, estado: 'vazio', valor: null }
    const html = renderizar({ dados })
    expect(html.match(/Ainda sem dado/g)).toHaveLength(7)
    expect(quantidadeMarcadores(html)).toBe(0)
    expect(html).not.toContain('jc-trilha')
  })

  it('nomeia e distingue as três classes de alerta', () => {
    const dados = structuredClone(exemplo)
    const niveis = ['lembrete', 'operacao', 'dinheiro em risco'] as const
    dados.alertas = { ...dados.alertas, estado: 'pronto', valor: niveis.map(nivel => ({ id: nivel, nivel, texto: nivel })) }
    dados.pendencias.fila = { ...dados.pendencias.fila, estado: 'pronto', valor: niveis.map(nivel =>
      ({ id: nivel, funcionario: 'secretaria', perguntaCurta: nivel, valor: dados.hojePodeGastar.valor })) }
    const html = renderizar({ dados, dispositivo: 'desktop' })
    const etiquetas = [...html.matchAll(/<span class="jc-etiqueta"([^>]*)>.*?<\/svg>([^<]+)<\/span>/g)]
    expect(etiquetas.map(m => m[2])).toEqual(['Dinheiro em risco', 'Operação', 'Lembrete'])
    expect(etiquetas.filter(m => m[1].includes('data-risco'))).toHaveLength(1)
  })

  it('inclui somente vencimentos de hoje até domingo e protege a data pelo olho', () => {
    const dados = structuredClone(exemplo)
    const dataBase = { ...dados.data, estado: 'pronto' as const, valor: '2026-11-17' }
    dados.data = dataBase
    const proximas = dados.faturas.proximas
    dados.faturas.proximas = { ...proximas, estado: 'pronto', valor: [
      '2026-11-16', '2026-11-17', '2026-11-22', '2026-11-23',
    ].map(data => ({
      id: data, nome: 'Cartão de teste', conferir: true, valor: dados.faturas.total,
      vencimento: { ...dataBase, valor: data },
    })) }
    const html = renderizar({ dados })
    expect(html).toMatch(/data-numero-financeiro="true">2<\/span> faturas vencem até 22\/11/)
    const fechado = renderizar({ dados, oculto: true })
    expect(fechado).toContain('Vencimentos ocultos')
    expect(fechado).not.toContain('22/11')
  })

  it('usa ilustrações decorativas fora da árvore acessível e mantém controles nomeados de 44 px', () => {
    const html = renderizar()
    const figuras = Array.from(html.matchAll(/<svg\b[^>]*class="cf-ilustracao[^"]*"[^>]*>/g), m => m[0])
    expect(figuras).toHaveLength(4)
    for (const figura of figuras) expect(figura).toContain('aria-hidden="true"')
    expect(html).toContain('class="jc-maquete" aria-hidden="true"')
    const controles = [...html.matchAll(/<(a|summary)\b[^>]*>(.*?)<\/\1>/gs)]
    expect(controles.length).toBeGreaterThan(12)
    for (const [, , conteudo] of controles) {
      expect(conteudo.replace(/<svg\b.*?<\/svg>/gs, '').replace(/<[^>]+>/g, '').trim()).not.toBe('')
    }
    expect(css).toMatch(/\.jc :is\(a, summary\)\s*\{[^}]*min-inline-size: 44px;[^}]*min-block-size: 44px;/s)
    expect(css).toMatch(/\.jc :focus-visible\s*\{[^}]*outline: 2px solid var\(--destaque\)/)
  })

  it('mantém as superfícies planas e a linha do tempo como filete neutro', () => {
    const html = renderizar()
    expect(html).toContain('jc-capitulo')
    expect(css).toContain('border-inline-start: 1px solid var(--jc-filete)')
    expect(css).toMatch(/--jc-filete:[^;]*var\(--borda\)[^;]*var\(--fundo\)/)
    expect(css).not.toMatch(/gradient\(|backdrop-filter|background-clip\s*:\s*text|text-fill-color\s*:\s*transparent|text-shadow|drop-shadow\(/i)
    for (const borda of css.matchAll(/(?:border-left|border-inline-start)(?:-[a-z]+)?:([^;]+);/g)) {
      expect(borda[1].trim()).toBe('1px solid var(--jc-filete)')
    }
    expect(html.replace(/<svg\b.*?<\/svg>/gs, '')).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map(offset => {
    const canal = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return canal <= .04045 ? canal / 12.92 : ((canal + .055) / 1.055) ** 2.4
  })
  return .2126 * r + .7152 * g + .0722 * b
}

function contraste(a: string, b: string) {
  const [menor, maior] = [luminancia(a), luminancia(b)].sort((x, y) => x - y)
  return (maior + .05) / (menor + .05)
}

it.each(['claro', 'escuro'] as const)('calcula contraste AA dos tokens do tema %s', tema => {
  const claro = css.match(/\[data-proposta="c"\]\.jc\s*\{([^}]+)\}/)?.[1] ?? ''
  const escuro = css.match(/\[data-jc-tema="escuro"\]\s*\{([^}]+)\}/)?.[1] ?? ''
  const tokens = Object.fromEntries(Array.from((claro + (tema === 'escuro' ? escuro : '')).matchAll(
    /--([\w-]+):\s*(#[\da-f]{6});/gi), m => [m[1], m[2]]))
  const pares = [
    ['texto', 'fundo', 4.5], ['texto', 'cartao', 4.5], ['texto', 'menu', 4.5],
    ['texto-secundario', 'fundo', 4.5], ['texto-secundario', 'cartao', 4.5], ['texto-secundario', 'menu', 4.5],
    ['sobre-destaque', 'destaque', 4.5], ['risco', 'menu', 4.5],
    ['texto-equipe', 'fundo-equipe', 4.5], ['secundario-equipe', 'fundo-equipe', 4.5],
    ['destaque', 'fundo', 3], ['destaque', 'cartao', 3], ['destaque', 'menu', 3],
    ['foco-equipe', 'fundo-equipe', 3], ['borda', 'fundo', 3], ['borda', 'cartao', 3],
  ] as const
  for (const [frente, fundo, minimo] of pares) {
    expect(contraste(tokens[frente], tokens[fundo]), frente + ' sobre ' + fundo).toBeGreaterThanOrEqual(minimo)
  }
})
