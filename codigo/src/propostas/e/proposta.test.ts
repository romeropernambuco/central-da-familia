import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { reiniciarExemplo } from '../../api/exemplo'
import { PrivacidadePropostas } from '../../componentes/escritorio/privacidade'
import { carregarDadosInicio, type DadosInicio } from '../../componentes/escritorio/dadosDeExemplo'
import type { Dispositivo, Tema } from '../Propostas'
import { Proposta } from './Proposta'
import ts from 'typescript'
// @ts-expect-error Importação Node usada apenas nos testes.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
// @ts-expect-error Importação Node usada apenas nos testes.
import { spawnSync } from 'node:child_process'
// @ts-expect-error Importação Node usada apenas nos testes.
import { tmpdir } from 'node:os'
// @ts-expect-error Importação Node usada apenas nos testes.
import { join } from 'node:path'
// @ts-expect-error Importação Node usada apenas nos testes.
import { env } from 'node:process'
// @ts-expect-error Importação Node usada apenas nos testes.
import { pathToFileURL } from 'node:url'

let exemplo: DadosInicio
const css = String(readFileSync(new URL('./bento.css', import.meta.url), 'utf8'))
const regra = (seletor: string) => {
  const inicio = css.indexOf(seletor + ' {')
  return inicio < 0 ? '' : css.slice(inicio, css.indexOf('}', inicio))
}

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T14:00:00Z'))
  reiniciarExemplo()
  exemplo = await carregarDadosInicio()
})
afterAll(() => {
  vi.useRealTimers()
  reiniciarExemplo()
})

function renderizar(tema: Tema, dispositivo: Dispositivo, dados = exemplo, oculto = false) {
  return renderToStaticMarkup(
    createElement(
      PrivacidadePropostas.Provider,
      { value: oculto },
      createElement(Proposta, { dados, tema, dispositivo }),
    ),
  )
}

const contextos = [
  ['claro', 'celular'],
  ['escuro', 'celular'],
  ['claro', 'desktop'],
  ['escuro', 'desktop'],
] as const
const formatar = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
const valoresMarcados = (html: string) =>
  Array.from(html.matchAll(/data-numero-financeiro="true">([^<]+)<\/span>/g), m => m[1])

describe.each(contextos)('%s em %s', (tema, dispositivo) => {
  it('renderiza cinco peças ilustradas, um título principal e um selo Exemplo', () => {
    const html = renderizar(tema, dispositivo)
    expect(html).toContain(`data-tema="${tema}" data-formato="${dispositivo}"`)
    expect(html.match(/class="bento-cartao bento-/g)).toHaveLength(5)
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toMatch(/<h1[^>]*>Hoje você pode gastar<\/h1>/)
    expect(html.match(/>Exemplo</g)).toHaveLength(1)
    expect(regra('.bento-exemplo')).toContain('dashed var(--borda)')
    const figuras = Array.from(html.matchAll(/<svg\b[^>]*class="cf-ilustracao"[^>]*>/g), m => m[0])
    expect(figuras).toHaveLength(5)
    expect(figuras.every(svg => svg.includes('aria-hidden="true"') && svg.includes('focusable="false"'))).toBe(true)
    expect(html).toMatch(
      /role="img" aria-label="Maquete isométrica do escritório"><svg\b[^>]*data-variante="media"[^>]*aria-hidden="true"/,
    )
    expect(html).toContain('Precisa de você</h3>')
  })

  it('limita os números marcados em toda a página e apresenta as quatro fontes uma vez', () => {
    const html = renderizar(tema, dispositivo)
    const valores = valoresMarcados(html)
    expect(valores.length).toBeGreaterThanOrEqual(4)
    expect(valores.length).toBeLessThanOrEqual(dispositivo === 'celular' ? 5 : 8)
    expect(new Set(valores).size).toBe(valores.length)
    expect(valores.slice(0, 4)).toEqual([
      formatar(exemplo.hojePodeGastar.valor.valor!),
      formatar(exemplo.plano2029.faltamPorMesComMargem.valor! / 100),
      formatar(exemplo.aplicacoes.total.valor!),
      formatar(exemplo.faturas.total.valor!),
    ])
    expect(html.match(/R\$\s*[\d.,]+/g)).toHaveLength(valores.length)
    expect(html).toContain('Falta por mês, com margem')
  })

  it('descarta valores e detalhes financeiros com o olho fechado', () => {
    const dados = structuredClone(exemplo)
    const original = dados.pendencias.fila.valor?.[0]
    const perguntaCurta = 'Conferir R$ 98.765,43 com 73,25% de cobertura e proporção 31/79'
    dados.pendencias.fila = {
      ...dados.pendencias.fila,
      estado: 'pronto',
      valor: [
        {
          id: original?.id ?? 'conferencia',
          funcionario: 'contador',
          perguntaCurta,
          valor: { estado: 'pronto', unidade: 'reais', natureza: 'previsto', valor: 11223.45 },
        },
      ],
    }
    const aberto = renderizar(tema, dispositivo, dados)
    const fechado = renderizar(tema, dispositivo, dados, true)
    expect(aberto).toContain(perguntaCurta)
    expect(aberto).toMatch(/R\$\s*11\.223,45/)
    expect(fechado.match(/aria-label="Valor oculto"/g)).toHaveLength(4)
    expect(fechado).not.toMatch(/data-numero-financeiro|R\$|73,25%|31\/79|11\.223,45|98\.765,43/)
    expect(fechado).not.toMatch(
      /<progress\b|<meter\b|role="(?:progressbar|meter)"|aria-valuenow|stroke-dashoffset|sparkline/i,
    )
    expect(fechado).toContain('Precisa de você')
  })
})

it('diferencia ausência, erro e um zero verdadeiro', () => {
  const dados = structuredClone(exemplo)
  dados.hojePodeGastar.valor = { ...dados.hojePodeGastar.valor, estado: 'vazio', valor: null }
  dados.plano2029.faltamPorMesComMargem = {
    ...dados.plano2029.faltamPorMesComMargem,
    estado: 'indisponivel',
    valor: null,
  }
  dados.aplicacoes.total = { ...dados.aplicacoes.total, estado: 'pronto', valor: 0 }
  dados.pendencias.fila = { ...dados.pendencias.fila, estado: 'vazio', valor: null }
  const html = renderizar('claro', 'celular', dados)
  expect(html).toContain('Sem orçamento para hoje')
  expect(html).toContain('Indisponível por enquanto')
  expect(valoresMarcados(html)).toContain(formatar(0))
  expect(html).toContain('Nenhuma tarefa aguardando você.')
})

it('mostra a sobra mensal com margem e oculta também a indicação de sobra', () => {
  const dados = structuredClone(exemplo)
  dados.plano2029.faltamPorMesComMargem = { ...dados.plano2029.faltamPorMesComMargem, estado: 'pronto', valor: -234567 }
  dados.pendencias.fila = {
    ...dados.pendencias.fila,
    estado: 'pronto',
    valor: [
      {
        id: 'conferir',
        funcionario: 'contador',
        perguntaCurta: 'Conferir saldo',
        valor: { estado: 'pronto', unidade: 'reais', natureza: 'previsto', valor: 2345.67 },
      },
    ],
  }
  const aberto = renderizar('claro', 'desktop', dados)
  expect(aberto).toContain('Sobra por mês, com margem')
  expect(valoresMarcados(aberto).filter(valor => valor === formatar(2345.67))).toHaveLength(1)
  const fechado = renderizar('claro', 'desktop', dados, true)
  expect(fechado).toContain('Projeção mensal com margem')
  expect(fechado).not.toMatch(/Sobra por mês|2\.345,67/)
})

it('bloqueia todo o mosaico financeiro para o Assessor da Casa com o olho aberto', () => {
  const dados = structuredClone(exemplo)
  dados.pessoa.papel = { ...dados.pessoa.papel, estado: 'pronto', valor: 'equipe' }
  const html = renderizar('claro', 'desktop', dados)
  expect(html).toContain('<h1>Assessor da Casa</h1>')
  expect(html).not.toMatch(/R\$|data-numero-financeiro|Plano 2029|Precisa de você|bento-grade/)
})

it('ordena dinheiro em risco, operação e lembrete e imprime rótulo e tema visual explícitos', () => {
  const dados = structuredClone(exemplo)
  const ids = ['lembrar', 'operar', 'vencer']
  dados.pendencias.fila = {
    ...dados.pendencias.fila,
    estado: 'pronto',
    valor: ids.map(id => ({
      id,
      funcionario: 'contador',
      perguntaCurta: id,
      valor: { estado: 'indisponivel', valor: null, unidade: 'reais', natureza: 'previsto' },
    })),
  }
  dados.alertas = {
    ...dados.alertas,
    estado: 'pronto',
    valor: [
      { id: 'lembrar', nivel: 'lembrete', texto: '' },
      { id: 'operar', nivel: 'operacao', texto: '' },
      { id: 'vencer', nivel: 'dinheiro em risco', texto: '' },
    ],
  }
  const html = renderizar('claro', 'desktop', dados)
  expect(html.indexOf('>vencer</p>')).toBeLessThan(html.indexOf('>operar</p>'))
  expect(html.indexOf('>operar</p>')).toBeLessThan(html.indexOf('>lembrar</p>'))
  expect(html).toContain('>Dinheiro em risco</span>')
  expect(html).toContain('>Operação</span>')
  expect(html).toContain('>Lembrete</span>')
  expect(html).toContain('Confira um vencimento.')
  expect(regra('.bento-nivel[data-nivel="dinheiro em risco"]')).toContain('var(--risco)')
})

it.each(['celular', 'desktop'] as const)('nomeia os alvos em %s e dá a eles dimensões mínimas e foco', dispositivo => {
  const html = renderizar('claro', dispositivo)
  const alvos = [...html.matchAll(/<(button|summary)\b([^>]*)>(.*?)<\/\1>/g)]
  expect(alvos.length).toBeGreaterThanOrEqual(12)
  for (const [, , atributos, conteudo] of alvos) {
    expect(atributos).toMatch(/class="[^"]*\bbento-alvo\b/)
    expect(conteudo.replace(/<svg\b.*?<\/svg>|<[^>]+>/g, '').trim()).not.toBe('')
  }
  expect(new Set(alvos.map(alvo => alvo[3].replace(/<svg\b.*?<\/svg>/g, '')))).toContain('Patrimônio')
  expect(regra('.bento-inicio .bento-alvo')).toContain('min-inline-size: 44px')
  expect(regra('.bento-inicio .bento-alvo')).toContain('min-block-size: 44px')
  expect(regra('.bento-inicio :focus-visible')).toContain('outline: 2px solid var(--destaque)')
})

it('segue as restrições de acabamento dentro do módulo', () => {
  const html = renderizar('escuro', 'desktop')
  expect(regra('.bento-grade')).toContain('display: grid')
  expect(css).toContain('"hoje hoje plano" "aplicacoes faturas plano" "escritorio escritorio escritorio"')
  expect(css).toMatch(/prefers-reduced-motion:\s*reduce/)
  expect(regra('.bento-valor .numero-financeiro')).toMatch(
    /font-variant-numeric: tabular-nums;[\s\S]*white-space: nowrap/,
  )
  expect(css).toContain('font-size: 2.25rem')
  expect(css).toContain('font-size: 1.6875rem')
  expect(css).not.toMatch(
    /gradient\s*\(|backdrop-filter|background-clip:\s*text|border-(?:left|inline-start)\s*:|neon/i,
  )
  expect(html).not.toMatch(/\p{Extended_Pictographic}/u)
  expect(html.match(/style="[^"]*(?:width|height):[^"]*%/g) ?? []).toHaveLength(0)
})

function luminancia(hex: string) {
  const canais = hex.match(/[0-9a-f]{2}/gi)!.map(canal => {
    const s = parseInt(canal, 16) / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2]
}

it.each(['claro', 'escuro'] as const)('calcula contraste AA dos tokens em %s', tema => {
  const seletor = tema === 'claro' ? '.bento-inicio' : '.bento-inicio[data-tema="escuro"]'
  const cores = new Map(Array.from(regra(seletor).matchAll(/--([a-z-]+): (#[\da-f]{6});/g), m => [m[1], m[2]]))
  const superficies = ['fundo', 'cartao', 'menu', 'plano', 'aplicacoes', 'faturas']
  const pares = [
    ...superficies.flatMap(
      fundo =>
        [
          ['texto', fundo, 4.5],
          ['texto-secundario', fundo, 4.5],
        ] as const,
    ),
    ...['cartao', 'menu', 'fundo', 'plano', 'aplicacoes', 'faturas'].map(fundo => ['destaque', fundo, 3] as const),
    ['sobre-destaque', 'destaque', 4.5],
    ['risco', 'menu', 4.5],
    ['sobre-heroi', 'heroi', 4.5],
    ['legenda-heroi', 'heroi', 4.5],
    ['borda', 'cartao', 3],
    ['borda', 'menu', 3],
  ] as const
  for (const [tinta, fundo, alvo] of pares) {
    expect(cores.has(tinta) && cores.has(fundo), `${tinta} sobre ${fundo}`).toBe(true)
    const ordem = [luminancia(cores.get(tinta)!), luminancia(cores.get(fundo)!)].sort((a, b) => b - a)
    expect((ordem[0] + 0.05) / (ordem[1] + 0.05), `${tinta} sobre ${fundo}`).toBeGreaterThanOrEqual(alvo)
  }
})

const chrome = [
  env.BROWSER_CHROME,
  join(env.ProgramFiles ?? '', 'Google/Chrome/Application/chrome.exe'),
  join(env['ProgramFiles(x86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(caminho => caminho && existsSync(caminho))

it.skipIf(!chrome)(
  'mede a primeira tela com o CSS e o medidor do laboratório em Chromium',
  () => {
    const pasta = mkdtempSync(join(tmpdir(), 'proposta-e-'))
    try {
      const estilos =
        [
          '../base.css',
          '../../componentes/escritorio/escritorio-maquete.css',
          '../../componentes/ilustracoes/ilustracoes.css',
        ]
          .map(caminho => readFileSync(new URL(caminho, import.meta.url), 'utf8'))
          .join('\n') +
        '\n' +
        css
      const fontes = [
        ['bricolage-grotesque', 'Bricolage Grotesque Variable'],
        ['inter', 'Inter Variable'],
      ]
        .map(([pacote, familia]) => {
          const arquivo = `node_modules/@fontsource-variable/${pacote}/files/${pacote}-latin-wght-normal.woff2`
          const fonte = readFileSync(arquivo).toString('base64')
          return `@font-face {font-family: '${familia}'; src: url(data:font/woff2;base64,${fonte}); font-weight: 100 900}`
        })
        .join('\n')
      const medidor = ts.transpile(
        readFileSync(new URL('../medicao.ts', import.meta.url), 'utf8').replace('export function', 'function'),
        { target: ts.ScriptTarget.ES2020 },
      )
      const quadros = contextos
        .map(
          ([tema, dispositivo]) => `
      <div class="lab" data-theme="${tema}">
        <section class="lab-amostra" data-dispositivo="${dispositivo}">
          <div class="lab-quadro"><div class="lab-conteudo" data-proposta="e">${renderizar(tema, dispositivo)}</div></div>
        </section>
      </div>`,
        )
        .join('')
      const arquivo = join(pasta, 'medicao.html')
      writeFileSync(
        arquivo,
        `<!doctype html><meta charset="utf-8"><style>${fontes}\n${estilos}</style>${quadros}
      <pre id="resultado"></pre><script>${medidor}
      document.fonts.ready.then(() => {
        const medidas = [...document.querySelectorAll('.lab-quadro')].map(quadro => {
          const alvos = [...quadro.querySelectorAll('.bento-alvo')].filter(alvo => alvo.checkVisibility())
          const numeros = [...quadro.querySelectorAll('.bento-valor .numero-financeiro')]
          return {
            dimensoes: [quadro.clientWidth, quadro.clientHeight],
            valores: medirNumeros(quadro),
            semTransbordo: quadro.scrollWidth === quadro.clientWidth,
            numerosInteiros: numeros.every(numero => {
              const faixa = document.createRange()
              faixa.selectNodeContents(numero)
              const texto = faixa.getBoundingClientRect()
              return texto.right <= numero.closest('.bento-cartao').getBoundingClientRect().right
            }),
            alvoMinimo: Math.min(...alvos.map(alvo => Math.min(alvo.offsetWidth, alvo.offsetHeight))),
          }
        })
        document.querySelector('#resultado').textContent = encodeURIComponent(JSON.stringify(medidas))
      })
      </script>`,
      )
      const resultado = spawnSync(
        chrome!,
        [
          '--headless',
          '--no-sandbox',
          '--disable-gpu',
          '--disable-background-networking',
          '--no-first-run',
          '--user-data-dir=' + join(pasta, 'perfil'),
          '--window-size=1400,1000',
          '--virtual-time-budget=4000',
          '--dump-dom',
          pathToFileURL(arquivo).href,
        ],
        { encoding: 'utf8', timeout: 25000, maxBuffer: 8_000_000 },
      )
      expect(resultado.status, resultado.error?.message ?? resultado.stderr).toBe(0)
      const captura = resultado.stdout.match(/<pre id="resultado">([^<]+)<\/pre>/)?.[1]
      expect(captura).toBeTruthy()
      const medidas = JSON.parse(decodeURIComponent(captura!)) as {
        dimensoes: number[]
        valores: string[]
        semTransbordo: boolean
        numerosInteiros: boolean
        alvoMinimo: number
      }[]
      expect(medidas).toHaveLength(contextos.length)
      for (const [i, [tema, dispositivo]] of contextos.entries()) {
        const medida = medidas[i]
        const celular = dispositivo === 'celular'
        expect(medida.dimensoes).toEqual(celular ? [375, 812] : [1280, 800])
        expect(medida.valores[0]).toEqual(formatar(exemplo.hojePodeGastar.valor.valor!).replace(/\s/g, ' '))
        expect(medida.valores.length).toBeLessThanOrEqual(celular ? 5 : 8)
        expect(new Set(medida.valores).size).toBe(medida.valores.length)
        expect(medida.semTransbordo && medida.numerosInteiros).toBe(true)
        expect(medida.alvoMinimo).toBeGreaterThanOrEqual(44)
        console.info(`Proposta E · ${tema} · ${dispositivo} · ${medida.valores.length} acima da dobra`)
      }
    } finally {
      try {
        rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
      } catch {
        // pasta temporária presa pelo navegador no Windows: o sistema limpa depois, o teste não falha por isso
      }
    }
  },
  35000,
)
