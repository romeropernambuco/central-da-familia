import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
// @ts-ignore: os testes rodam em Node e o tsconfig do app exclui seus tipos.
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
// @ts-ignore: idem.
import { spawnSync } from 'node:child_process'
// @ts-ignore: idem.
import { tmpdir } from 'node:os'
// @ts-ignore: idem.
import { dirname, join } from 'node:path'
// @ts-ignore: idem.
import { pathToFileURL } from 'node:url'
// @ts-ignore: idem.
import { env } from 'node:process'
import ts from 'typescript'
import { beforeAll, expect, it, vi } from 'vitest'
import type { PropsProposta } from '../Propostas'
import { PrivacidadePropostas } from '../comuns/privacidade'
import { carregarDadosInicio, type DadosInicio } from '../dadosExemplo'
import { DetalheCasa, type Destino } from './DetalheCasa'
import { Proposta } from './Proposta'
const css = readFileSync(new URL('./casa-viva.css', import.meta.url), 'utf8') as string

let dados: DadosInicio
beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T12:00:00Z'))
  try {
    dados = await carregarDadosInicio()
  } finally {
    vi.useRealTimers()
  }
})

function markup(elemento: ReactElement, oculto = false) {
  return renderToStaticMarkup(createElement(PrivacidadePropostas.Provider, { value: oculto }, elemento))
}

function inicio(props: Partial<PropsProposta> = {}, oculto = false) {
  return markup(createElement(Proposta, { dados, tema: 'claro', dispositivo: 'celular', ...props }), oculto)
}

function detalhe(destino: Destino, fonte = dados, oculto = false) {
  return markup(createElement(DetalheCasa, { dados: fonte, destino, abrir: () => {}, fechar: () => {} }), oculto)
}

const financeiro = /data-numero-financeiro="true"[^>]*>((?:[^<]|<span\b[^>]*>[^<]*<\/span>)*)<\/span>/g
const texto = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
const valores = (html: string) => [...html.matchAll(financeiro)].map(([, valor]) => texto(valor))
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const contextos = [
  ['claro', 'celular'],
  ['escuro', 'celular'],
  ['claro', 'desktop'],
  ['escuro', 'desktop'],
] as const

it.each(contextos)(
  'renderiza Casa Viva em %s no %s com as quatro entradas e um título principal',
  (tema, dispositivo) => {
    const html = inicio({ tema, dispositivo })
    expect(html).toContain(`data-cv-tema="${tema}" data-cv-dispositivo="${dispositivo}"`)
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html.match(/>Exemplo</g)).toHaveLength(1)
    expect(html).toContain('Saúde da casa')
    expect(html.match(/data-comodo="/g)).toHaveLength(4)
    expect(html).toMatch(/Escritório.*Cozinha.*Carteira.*Cofre/)
    expect(html.indexOf('class="cv-nav"') < html.indexOf('class="cv-mapa"')).toBe(dispositivo === 'desktop')
    expect(valores(html)).toContain(texto(brl.format(dados.hojePodeGastar.valor.valor!)))
    expect(valores(html)).toContain(texto(brl.format(dados.plano2029.faltamPorMesComMargem.valor! / 100)))
  },
)

it('reserva quatro valores para a maquete e um para o primeiro resumo móvel', () => {
  const preenchido = structuredClone(dados)
  preenchido.saldoConta = { ...dados.saldoConta, estado: 'pronto', valor: 123_456 }
  preenchido.casa.itensEmFalta = { ...dados.casa.itensEmFalta, estado: 'pronto', valor: 3 }
  const celular = inicio({ dados: preenchido })
  const inicioPlano = celular.indexOf('<h2>Plano 2029</h2>')
  expect(inicioPlano).toBeGreaterThan(0)
  expect(valores(celular.slice(0, inicioPlano))).toHaveLength(5)
  const desktop = valores(inicio({ dados: preenchido, dispositivo: 'desktop' }))
  expect(desktop).toHaveLength(6)
  expect(new Set(desktop).size).toBe(desktop.length)
})

const chrome = [
  env.BROWSER_CHROME,
  join(env.ProgramFiles ?? '', 'Google/Chrome/Application/chrome.exe'),
  join(env['ProgramFiles(x86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(caminho => caminho && existsSync(caminho))

it.skipIf(!chrome)('mede a primeira dobra, a legibilidade dos valores e os alvos na geometria real da casca', () => {
  const raizTemp = realpathSync(tmpdir())
  const pasta = mkdtempSync(join(raizTemp, 'medicao-casa-viva-'))
  try {
    const arquivo = join(pasta, 'casca.html')
    const estilos = ['../base.css', '../comuns/escritorio-maquete.css', '../../componentes/ilustracoes/ilustracoes.css']
      .map(caminho => readFileSync(new URL(caminho, import.meta.url), 'utf8'))
      .join('\n')
    const fontes = [
      ['dm-sans', 'DM Sans'],
      ['fraunces', 'Fraunces'],
    ]
      .map(([pastaFonte, familia]) => {
        const fonte = readFileSync(
          `node_modules/@fontsource-variable/${pastaFonte}/files/${pastaFonte}-latin-wght-normal.woff2`,
        )
        return `@font-face { font-family: "${familia} Variable"; src: url(data:font/woff2;base64,${fonte.toString('base64')}); font-weight: 100 900; }`
      })
      .join('\n')
    const quadros = contextos
      .map(
        ([tema, dispositivo]) =>
          `<div class="lab" data-theme="${tema}"><div class="lab-amostra" data-dispositivo="${dispositivo}">
        <div class="lab-quadro"><div class="lab-conteudo" data-proposta="g">${inicio({ tema, dispositivo })}</div></div>
      </div></div>`,
      )
      .join('')
    const medidor = ts.transpile(
      readFileSync(new URL('../medicao.ts', import.meta.url), 'utf8').replace('export function', 'function'),
      { target: ts.ScriptTarget.ES2020 },
    )
    writeFileSync(
      arquivo,
      `<!doctype html><meta charset="utf-8"><style>${fontes}\n${estilos}\n${css}</style>${quadros}
      <pre id="resultado"></pre><script>${medidor}
      document.fonts.ready.then(() => {
        const medicoes = [...document.querySelectorAll('.lab-quadro')].map(quadro => {
          const nav = quadro.querySelector('.cv-nav').getBoundingClientRect()
          const principal = quadro.querySelector('.numero-principal').getBoundingClientRect()
          return {
            numeros: medirNumeros(quadro),
            semTransbordo: quadro.scrollWidth === quadro.clientWidth,
            valoresInteiros: [...quadro.querySelectorAll('.cv-placa-valor')].every(n => n.scrollWidth <= n.clientWidth),
            orcamentoVisivel: nav.top < principal.top || principal.bottom <= nav.top,
            controles: [...quadro.querySelectorAll('button')].map(botao => {
              const { width, height } = botao.getBoundingClientRect()
              return Math.min(width, height)
            }),
          }
        })
        document.querySelector('#resultado').textContent = encodeURIComponent(JSON.stringify(medicoes))
      })
      </script>`,
    )
    const resultado = spawnSync(
      chrome!,
      [
        '--headless',
        '--no-sandbox',
        '--no-first-run',
        '--disable-gpu',
        '--disable-background-networking',
        `--user-data-dir=${join(pasta, 'perfil')}`,
        '--window-size=1400,900',
        '--virtual-time-budget=4000',
        '--dump-dom',
        pathToFileURL(arquivo).href,
      ],
      { encoding: 'utf8', timeout: 25_000, maxBuffer: 8_000_000 },
    )
    expect(resultado.status, resultado.error?.message ?? resultado.stderr).toBe(0)
    const capturado = resultado.stdout.match(/<pre id="resultado">([^<]+)<\/pre>/)?.[1]
    expect(capturado).toBeTruthy()
    const medicoes = JSON.parse(decodeURIComponent(capturado!)) as {
      numeros: string[]
      semTransbordo: boolean
      valoresInteiros: boolean
      orcamentoVisivel: boolean
      controles: number[]
    }[]
    expect(medicoes.map(m => m.numeros.length)).toEqual([3, 3, 4, 4])
    for (const [i, medicao] of medicoes.entries()) {
      expect(new Set(medicao.numeros).size).toBe(medicao.numeros.length)
      expect(medicao, contextos[i].join(' · ')).toMatchObject({
        semTransbordo: true,
        valoresInteiros: true,
        orcamentoVisivel: true,
      })
      expect(medicao.controles).toHaveLength(12)
      expect(Math.min(...medicao.controles)).toBeGreaterThanOrEqual(44)
    }
  } finally {
    if (dirname(realpathSync(pasta)) === raizTemp)
      try {
        rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
      } catch {
        // pasta temporária presa pelo navegador no Windows: o sistema limpa depois, o teste não falha por isso
      }
  }
})

it('remove montantes, percentuais, proporções e números em texto livre pelo olho da casca', () => {
  const exemplo = structuredClone(dados)
  exemplo.plano2029.progressao = { ...dados.plano2029.progressao, estado: 'pronto', valor: 73.4 }
  exemplo.alertas = {
    ...dados.alertas,
    estado: 'pronto',
    valor: [{ id: 'aviso', nivel: 'operacao', texto: 'Conferir 987654,32 e 66,6% (R$ 9.876,54)' }],
  }
  expect(detalhe('plano', exemplo)).toMatch(/<progress[^>]+value="73.4"/)
  expect(detalhe('plano', exemplo)).toContain('73,4<span class="numero-simbolo">%</span>')
  expect(detalhe('pendencias', exemplo)).toContain('987654,32')
  expect(detalhe('patrimonio')).toContain('Aluguel líquido estimado')
  const telasOcultas = [
    inicio({ dados: exemplo }, true),
    ...(['caixa', 'casa', 'cartoes', 'patrimonio', 'plano', 'pendencias'] as const).map(destino =>
      detalhe(destino, exemplo, true),
    ),
  ]
  for (const html of telasOcultas) {
    expect(html).not.toMatch(
      /data-numero-financeiro|R\$|\d\s*%|987654|73[.,]4|66,6|<(?:progress|meter)\b|aria-value(?:now|text)=/,
    )
  }
  expect(telasOcultas[0]).toContain('aria-label="Valor oculto"')
  expect(telasOcultas[telasOcultas.length - 1]).toContain('Valores ocultos')
})

it('reserva a vista do Assessor da Casa às rotinas domésticas', () => {
  const equipe = structuredClone(dados)
  equipe.pessoa.papel = { ...dados.pessoa.papel, estado: 'pronto', valor: 'equipe' }
  const html = inicio({ dados: equipe })
  expect(html).toContain('Sua rotina de compras, estoque e presença está na Casa.')
  expect(html).toContain('Abrir Casa')
  expect(html).not.toMatch(/R\$|data-numero-financeiro|Plano 2029|data-comodo|<dialog/)
})

it('mostra ausências sem trocar um zero disponível por falta de informação', () => {
  const semDados = structuredClone(dados)
  semDados.saldoConta = { ...dados.saldoConta, estado: 'vazio', valor: null }
  semDados.aplicacoes.total = { ...dados.aplicacoes.total, estado: 'indisponivel', valor: null }
  semDados.hojePodeGastar.valor = { ...dados.hojePodeGastar.valor, estado: 'pronto', valor: 0 }
  semDados.alertas = { ...dados.alertas, estado: 'indisponivel', valor: null }
  semDados.funcionarios = { ...dados.funcionarios, estado: 'indisponivel', valor: null }
  const html = inicio({ dados: semDados })
  expect(html).toContain('Avisos indisponíveis')
  expect(html).toContain('Sem registros')
  expect(html).toContain('Indisponível')
  expect(valores(html)).toContain(texto(brl.format(0)))
  expect(detalhe('casa', semDados)).toContain('Equipe indisponível.')
  expect(detalhe('pendencias', semDados)).toContain('ainda não conseguiu carregar os avisos')
})

it('ordena e nomeia os três níveis de aviso por extenso', () => {
  const exemplo = structuredClone(dados)
  exemplo.alertas = {
    ...dados.alertas,
    estado: 'pronto',
    valor: [
      { id: 'lembrete:a', nivel: 'lembrete', texto: 'Rever a lista' },
      { id: 'feira:b', nivel: 'operacao', texto: 'Conferir a nota' },
      { id: 'fatura:c', nivel: 'dinheiro em risco', texto: 'Resolver a fatura' },
    ],
  }
  expect(inicio({ dados: exemplo })).toContain('Há um pagamento que pede atenção')
  const html = detalhe('pendencias', exemplo)
  expect([...html.matchAll(/class="cv-pilula">(.+?)<\/span>/g)].map(([, conteudo]) => texto(conteudo))).toEqual([
    'Dinheiro em risco',
    'Operação',
    'Lembrete',
  ])
})

it('abre detalhes com título associado, maquete focada e equipe identificada em texto', () => {
  const html = detalhe('caixa')
  const id = html.match(/<dialog[^>]*aria-labelledby="([^"]+)"/)?.[1]
  expect(id).toBeTruthy()
  expect(html).toContain(`<h2 id="${id}" tabindex="-1">Escritório</h2>`)
  expect(html).toMatch(/data-sala="caixa"[^>]*data-destaque="true"/)
  expect(html).toContain('aria-label="Equipe do cômodo"')
  expect(html).toContain('Contador')
  const equipe = dados.funcionarios.valor!.filter(f => f.sala === 'caixa')
  const postos = [...html.matchAll(/<g data-funcionario="([^"]+)"/g)].map(([, id]) => id)
  expect(postos.sort()).toEqual(equipe.map(f => f.id).sort())
  const rotulos = [
    ...html.matchAll(/<span\b[^>]*data-estado="[^"]+"[^>]*title="[^"]+"[^>]*><svg\b[^>]*>.*?<\/svg>([^<]+)<\/span>/g),
  ].map(([, nome]) => nome)
  expect(rotulos.sort()).toEqual(equipe.map(f => f.curto).sort())
  expect(html).not.toContain('<h1')
})

it('dá nome e alvo de 44 px a cada controle e esconde as figuras decorativas', () => {
  const regra = css.match(/\.casa-viva \.cv-alvo\s*\{([^}]+)\}/)?.[1]
  expect(regra).toMatch(/min-inline-size: 44px/)
  expect(regra).toMatch(/min-block-size: 44px/)
  const telas = [inicio(), detalhe('caixa'), detalhe('mais')]
  const botoes = [...telas.join('').matchAll(/<button\b([^>]*)>(.*?)<\/button>/g)]
  expect(botoes.length).toBeGreaterThanOrEqual(15)
  for (const [, atributos, conteudo] of botoes) {
    expect(atributos).toContain('class="cv-alvo')
    expect(atributos.match(/aria-label="([^"]+)"/)?.[1] ?? texto(conteudo)).not.toBe('')
  }
  for (const html of telas.slice(0, 2)) {
    expect(html).toMatch(/class="casa-viva-cena"[^>]*aria-hidden="true"><svg class="escritorio-maquete"/)
  }
  const figuras = [...telas[0].matchAll(/<svg\b[^>]*class="cf-ilustracao"[^>]*>/g)]
  expect(figuras).toHaveLength(3)
  for (const [figura] of figuras) expect(figura).toContain('aria-hidden="true"')
})

it('aplica foco terracota, números tabulares e superfícies sólidas', () => {
  const html = inicio()
  expect(html).toContain('lucide')
  expect(html).not.toMatch(/\p{Extended_Pictographic}|<(?:linearGradient|radialGradient|filter)\b/u)
  expect(css).not.toMatch(
    /gradient\(|backdrop-filter|background-clip:\s*text|text-shadow|border-(?:left|inline-start)\s*:/i,
  )
  expect(css).toMatch(/outline: 2px solid var\(--destaque\)/)
  expect(css).toMatch(/tabular-nums;\s*white-space: nowrap/)
  expect(css).toMatch(/prefers-reduced-motion: reduce/)
})

function luminancia(hex: string) {
  const [r, g, b] = hex
    .slice(1)
    .match(/../g)!
    .map(par => {
      const srgb = Number.parseInt(par, 16) / 255
      return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
    })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

it.each(['claro', 'escuro'])('atinge AA com os pares de tokens do tema %s', tema => {
  const bloco = css.split('}')[tema === 'claro' ? 0 : 1]
  const tokens = Object.fromEntries(
    [...bloco.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/g)].map(([, nome, hex]) => [nome, hex]),
  )
  const pares = [
    ['texto', 'fundo'],
    ['texto', 'cartao'],
    ['texto', 'menu'],
    ['texto', 'cv-palco'],
    ['texto-secundario', 'cartao'],
    ['texto-secundario', 'menu'],
    ['texto-secundario', 'fundo'],
    ['texto-secundario', 'cv-palco'],
    ['texto-secundario', 'cv-nav'],
    ['destaque', 'cartao'],
    ['destaque', 'fundo'],
    ['destaque', 'cv-ativo'],
    ['destaque', 'cv-nav'],
    ['sobre-destaque', 'destaque'],
    ['risco', 'cv-risco-fundo'],
  ]
  for (const [frente, fundo] of pares) {
    const a = luminancia(tokens[frente])
    const b = luminancia(tokens[fundo])
    expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), `${frente} / ${fundo}`).toBeGreaterThanOrEqual(4.5)
  }
})
