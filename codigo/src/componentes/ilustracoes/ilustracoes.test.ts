import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
// @ts-expect-error Node disponível no executor de testes.
import { readFileSync } from 'node:fs'
import { Ilustracao, ilustracoes } from './index'
import { EstadoVazio } from '../EstadoVazio'

const nomes = [
  'SemGastos',
  'TudoEmDia',
  'SemCartoes',
  'SemImoveis',
  'SemAplicacoes',
  'SemRecebimentos',
  'SemDesejos',
  'CasaVazia',
  'AssessorDaCasa',
  'FamiliaConvite',
  'Plano2029',
  'Backup',
  'Desfeito',
  'Erro',
  'Carregando',
  'PrivacidadeOlho',
  'Bemvindo',
]

it('oferece o conjunto completo em português', () => {
  expect(Object.keys(ilustracoes).sort()).toEqual([...nomes].sort())
})

describe.each(nomes)('%s', nome => {
  const componente = () => ilustracoes[nome as keyof typeof ilustracoes]
  it('renderiza SVG pequeno, decorativo e sem conteúdo ativo ou cores fixas', () => {
    const svg = renderToStaticMarkup(createElement(componente()))
    expect(svg).toContain('viewBox="0 0 160 120"')
    expect(svg).toContain('aria-hidden="true"')
    expect(svg).toContain('focusable="false"')
    expect(svg).not.toContain('<title')
    expect(new TextEncoder().encode(svg).length).toBeLessThanOrEqual(4096)
    expect(svg).not.toMatch(/<(?:image|script|foreignObject)\b|\shref=|\son\w+=/i)
    for (const [, cor] of svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)) {
      expect(cor).toMatch(/^(?:none|currentColor|var\(--[a-z-]+\))$/)
    }
    expect(renderToStaticMarkup(createElement(Ilustracao, { nome: nome as keyof typeof ilustracoes }))).toBe(svg)
  })
  it('só anuncia a figura quando recebe título, com id único', () => {
    const svg = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(componente(), { titulo: 'Uma ilustração' }),
        createElement(componente(), { titulo: 'Outra ilustração' }),
      ),
    )
    expect(svg).not.toContain('aria-hidden')
    expect(svg.match(/role="img"/g)).toHaveLength(2)
    const ids = [...svg.matchAll(/<title id="([^"]+)">/g)].map(m => m[1])
    expect(new Set(ids).size).toBe(2)
    for (const id of ids) expect(svg).toContain(`aria-labelledby="${id}"`)
    expect(svg).toContain('Uma ilustração</title>')
  })
})

it('EstadoVazio funciona sozinho, com título, frase e ação opcional', () => {
  const props = { ilustracao: 'SemGastos' as const, titulo: 'Seu começo por aqui', frase: 'Registre quando quiser.' }
  const simples = renderToStaticMarkup(createElement(EstadoVazio, props))
  expect(simples).toContain('<h2')
  expect(simples).toContain('Seu começo por aqui')
  expect(simples).toContain('Registre quando quiser.')
  expect(simples).not.toContain('<button')
  const acao = renderToStaticMarkup(
    createElement(EstadoVazio, { ...props, acao: { texto: 'Adicionar gasto', aoClicar: () => {} } }),
  )
  expect(acao).toContain('type="button"')
  expect(acao).toContain('Adicionar gasto</button>')
})

it('respeita movimento reduzido e mantém toque e foco no CSS próprio', () => {
  const css = readFileSync('src/componentes/ilustracoes/ilustracoes.css', 'utf8')
  expect(css).toMatch(/prefers-reduced-motion:\s*reduce/)
  expect(css).toContain('animation: none')
  const estado = readFileSync('src/componentes/ilustracoes/estado-vazio.css', 'utf8')
  expect(estado).toContain('min-height: 44px')
  expect(estado).toContain(':focus-visible')
})

it('a galeria é uma entrada DEV isolada, sem import no app nem export no índice', async () => {
  const { build } = await import('vite')
  // Vitest usa NODE_ENV=test; um build real usa production.
  vi.stubEnv('NODE_ENV', 'production')
  let resultado
  try {
    resultado = await build({
      configFile: false,
      mode: 'production',
      logLevel: 'silent',
      build: { write: false, minify: false, rollupOptions: { input: 'src/componentes/ilustracoes/galeria.html' } },
    })
  } finally {
    vi.unstubAllEnvs()
  }
  const saidas = Array.isArray(resultado) ? resultado : [resultado]
  const codigo = saidas
    .flatMap(r => ('output' in r ? r.output : []))
    .map(a => (a.type === 'chunk' ? a.code : String(a.source)))
    .join('')
  expect(codigo.includes('Galeria de ilustrações')).toBe(false)
  expect(codigo.includes('Nenhum gasto ainda')).toBe(false)
  expect(codigo.includes('galeria-claro')).toBe(false)
})
