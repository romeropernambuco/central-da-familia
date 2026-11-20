import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import ts from 'typescript'
// @ts-ignore Os testes usam Node, sem tipos de Node no tsconfig do app.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
// @ts-ignore Os testes usam Node, sem tipos de Node no tsconfig do app.
import { spawnSync } from 'node:child_process'
// @ts-ignore Os testes usam Node, sem tipos de Node no tsconfig do app.
import { tmpdir } from 'node:os'
// @ts-ignore Os testes usam Node, sem tipos de Node no tsconfig do app.
import { join } from 'node:path'
// @ts-ignore Os testes usam Node, sem tipos de Node no tsconfig do app.
import { pathToFileURL } from 'node:url'
// @ts-ignore Os testes usam Node, sem tipos de Node no tsconfig do app.
import { env } from 'node:process'
import { carregarDadosInicio, type DadosInicio } from '../dadosExemplo'
import { PrivacidadePropostas } from '../comuns/privacidade'
import { Proposta } from './Proposta'

const pasta = 'src/propostas/b'
const css = ts.sys.readFile(pasta + '/proposta.css')!
const cenarios = (['claro', 'escuro'] as const).flatMap(tema =>
  (['celular', 'desktop'] as const).map(dispositivo => ({ tema, dispositivo })),
)
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
let dados: DadosInicio

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T14:00:00Z'))
  try {
    dados = await carregarDadosInicio()
  } finally {
    vi.useRealTimers()
  }
})

function render(d = dados, oculto?: boolean, c = cenarios[0]) {
  return renderToStaticMarkup(createElement(Proposta, { ...c, dados: d, oculto }))
}

describe('Escritório em primeiro', () => {
  for (const c of cenarios) {
    it(`renderiza o snapshot em ${c.tema} no ${c.dispositivo}, com um h1 e um selo`, () => {
      const html = render(dados, false, c)
      expect(html).toContain(`data-tema="${c.tema}" data-dispositivo="${c.dispositivo}"`)
      expect(html.match(/<h1[ >]/g)).toHaveLength(1)
      expect(html.match(/>Exemplo</g)).toHaveLength(1)
      expect(html).toContain('Maquete isométrica do escritório')
      expect(html.match(/class="maquete-placa\b/g)?.length).toBeGreaterThanOrEqual(8)
      expect(html.match(/data-posicao=/g)).toHaveLength(4)
      expect(html).toContain(moeda.format(dados.hojePodeGastar.valor.valor!))
      expect(html).toContain(moeda.format(dados.plano2029.faltamPorMesComMargem.valor! / 100))
      expect(html).toContain('aluguel líquido mensal estimado')
    })
  }

  it('usa a faixa e a aba inferior para controlar a mesma fila recolhida no celular', () => {
    const celular = render()
    const id = celular.match(/<section class="b-fila b-painel" id="([^"]+)"[^>]* hidden=""/)?.[1]
    expect(id).toBeTruthy()
    expect(
      celular.match(
        new RegExp(`aria-controls="${id}" aria-expanded="false"|aria-expanded="false" aria-controls="${id}"`, 'g'),
      ),
    ).toHaveLength(2)
    expect(celular).toMatch(/<svg class="escritorio-maquete" data-variante="grande"/)
    const desktop = render(dados, false, cenarios[1])
    expect(desktop).toMatch(/<svg class="escritorio-maquete" data-variante="grande"/)
    expect(desktop).not.toContain('b-abrir-fila')
    expect(desktop).not.toMatch(/<section class="b-fila b-painel"[^>]* hidden/)
  })

  it('retira valores, percentuais, proporções e texto livre da marcação inteira quando o olho fecha', () => {
    const alterado = structuredClone(dados)
    const fila = alterado.pendencias.fila.valor!
    fila.splice(1)
    fila[0].id = 'tarefa-918273,46'
    fila[0].perguntaCurta = 'Conferir 918273,46 (77,3%)'
    fila[0].valor = { ...fila[0].valor, estado: 'pronto', valor: 918273.46 }
    const aberto = render(alterado)
    expect(aberto).toContain('918273,46')
    expect(aberto).toContain('77,3%')
    expect(aberto).toContain('data-numero-financeiro')
    const pelaCasca = renderToStaticMarkup(
      createElement(
        PrivacidadePropostas.Provider,
        { value: true },
        createElement(Proposta, { dados: alterado, ...cenarios[0] }),
      ),
    )
    for (const oculto of [render(alterado, true), pelaCasca]) {
      expect(oculto).toContain('aria-label="Valor oculto"')
      expect(oculto).not.toMatch(
        /R\$|\d\s*%|918273|918\.273|data-numero-financeiro|<progress|<meter|aria-value|stroke-dash(?:array|offset)/i,
      )
      const marcadores = [...aberto.matchAll(/data-numero-financeiro="true">([^<]+)/g)]
      expect(marcadores.length).toBeGreaterThan(4)
      for (const [, numero] of marcadores) {
        // Um inteiro curto também pode ser uma coordenada fixa do desenho.
        if (numero.length > 3) expect(oculto).not.toContain(numero)
      }
    }
  })

  it('protege tarefas de Assessor da Casa mesmo se receber o snapshot completo', () => {
    const equipe = structuredClone(dados)
    equipe.pessoa.papel = { ...equipe.pessoa.papel, estado: 'pronto', valor: 'equipe' }
    equipe.pendencias.fila = {
      ...equipe.pendencias.fila,
      estado: 'pronto',
      valor: [
        {
          id: 'feira_nota:ab',
          funcionario: 'fiscal',
          perguntaCurta: 'Feira de R$ 900,00',
          valor: dados.aplicacoes.total,
        },
        { id: 'salario:ab', funcionario: 'folha', perguntaCurta: 'Salário de teste', valor: dados.aplicacoes.total },
      ],
    }
    const html = render(equipe)
    expect(html).toContain('Tarefas da Casa')
    expect(html).toContain('Guardar a nota da feira')
    expect(html).not.toMatch(/R\$|data-numero-financeiro|Salário de teste|Plano 2029|data-posicao/)
  })

  it('nomeia níveis por extenso e ordena dinheiro em risco antes de operação e lembrete', () => {
    const d = structuredClone(dados)
    const niveis = ['lembrete', 'operacao', 'dinheiro em risco'] as const
    d.pendencias.fila = {
      ...d.pendencias.fila,
      estado: 'pronto',
      valor: niveis.map(nivel => ({
        id: nivel,
        funcionario: 'contador',
        perguntaCurta: 'Revisão pendente',
        valor: dados.faturas.total,
      })),
    }
    d.alertas = { ...d.alertas, estado: 'pronto', valor: niveis.map(nivel => ({ id: nivel, nivel, texto: nivel })) }
    const html = render(d)
    const rotulos = ['Dinheiro em risco', 'Operação', 'Lembrete'].map(rotulo => html.indexOf('>' + rotulo + '<'))
    expect(rotulos[0]).toBeGreaterThan(-1)
    expect(rotulos[1]).toBeGreaterThan(rotulos[0])
    expect(rotulos[2]).toBeGreaterThan(rotulos[1])
    expect(html.match(/data-risco="true"/g)).toHaveLength(2)
  })

  it('mostra campos vazios e indisponíveis com ilustrações decorativas e sem zero substituto', () => {
    const d = structuredClone(dados)
    d.hojePodeGastar.valor = { ...d.hojePodeGastar.valor, estado: 'vazio', valor: null }
    d.pendencias.fila = { ...d.pendencias.fila, estado: 'indisponivel', valor: null }
    d.imoveis.aluguelLiquidoEstimado = { ...d.imoveis.aluguelLiquidoEstimado, estado: 'indisponivel', valor: null }
    const html = render(d)
    expect(html.match(/>Ainda sem dado</g)).toHaveLength(2)
    expect(html).toContain('>Sem registros<')
    expect(html).toContain('A fila de tarefas está indisponível.')
    expect(html).not.toMatch(/R\$\s*0,00/)
    const ilustracoes = html.match(/<svg[^>]*class="cf-ilustracao[^"]*"[^>]*>/g) ?? []
    expect(ilustracoes).toHaveLength(3)
    expect(ilustracoes.every(tag => tag.includes('aria-hidden="true"'))).toBe(true)
  })

  it('aplica alvos mínimos, foco visível e reduz movimento, sem efeitos proibidos ou emojis', () => {
    const html = render()
    const regra = css.match(/\.b-inicio :is\(button, a\)\.b-controle\s*\{([^}]+)\}/)?.[1]
    expect(regra).toContain('min-inline-size: 44px')
    expect(regra).toContain('min-block-size: 44px')
    expect(css).toContain('outline: 2px solid var(--destaque)')
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css + html).not.toMatch(
      /gradient\(|backdrop-filter|background-clip:\s*text|text-shadow|border-(?:left|inline-start)\s*:|\p{Extended_Pictographic}/u,
    )
    expect(html).not.toMatch(/<linearGradient|<radialGradient|<filter/i)
  })
})

function luminancia(hex: string) {
  const [r, g, b] = hex
    .slice(1)
    .match(/../g)!
    .map(par => {
      const s = parseInt(par, 16) / 255
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string) {
  const l = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l[0] + 0.05) / (l[1] + 0.05)
}

it('atinge contraste WCAG AA com as cores do CSS nos dois temas', () => {
  const ler = (bloco: string) =>
    Object.fromEntries([...bloco.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map(([, id, valor]) => [id, valor]))
  const claro = ler(css.match(/\.b-inicio \{([^}]+)\}/)![1])
  const escuro = ler(css.match(/\.b-inicio\[data-tema="escuro"\] \{([^}]+)\}/)![1])
  for (const tokens of [claro, { ...claro, ...escuro }]) {
    for (const fundo of ['fundo', 'cartao', 'menu', 'b-cena']) {
      for (const tinta of ['texto', 'texto-secundario', 'risco', 'destaque']) {
        expect(contraste(tokens[tinta], tokens[fundo]), `${tinta}/${fundo}`).toBeGreaterThanOrEqual(4.5)
      }
    }
    expect(contraste(tokens['sobre-destaque'], tokens.destaque)).toBeGreaterThanOrEqual(4.5)
  }
})

const chrome = [
  env.BROWSER_CHROME,
  join(env.ProgramFiles || '', 'Google/Chrome/Application/chrome.exe'),
  join(env['ProgramFiles(x86)'] || '', 'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(caminho => caminho && existsSync(caminho))

it.skipIf(!chrome)('mede acima da dobra com o medidor da casca e verifica geometria e alvos no navegador', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proposta-b-'))
  try {
    const estilos = [
      'src/propostas/base.css',
      'src/propostas/comuns/escritorio-maquete.css',
      'src/componentes/ilustracoes/ilustracoes.css',
      pasta + '/proposta.css',
    ]
      .map(arq => ts.sys.readFile(arq))
      .join('\n')
    const fontes = ['geist', 'inter']
      .map(nome => {
        const fonte = readFileSync(
          `node_modules/@fontsource-variable/${nome}/files/${nome}-latin-wght-normal.woff2`,
        ).toString('base64')
        return `@font-face {font-family: '${nome} Variable'; src: url(data:font/woff2;base64,${fonte}); font-weight: 100 900}`
      })
      .join('\n')
    const quadros = cenarios
      .map(
        c => `<div class="lab" data-theme="${c.tema}"><div class="lab-amostra" data-dispositivo="${c.dispositivo}">
      <div class="lab-quadro"><div class="lab-conteudo" data-proposta="b">${render(dados, false, c)}</div></div>
    </div></div>`,
      )
      .join('')
    const medidor = ts.transpile(ts.sys.readFile('src/propostas/medicao.ts')!.replace('export function', 'function'), {
      target: ts.ScriptTarget.ES2020,
    })
    const arquivo = join(dir, 'medicao.html')
    writeFileSync(
      arquivo,
      `<!doctype html><meta charset="utf-8"><style>${fontes}\n${estilos}</style>${quadros}
      <pre id="resultado"></pre><script>${medidor}
      document.fonts.ready.then(() => {
        const resultado = Array.from(document.querySelectorAll('.lab-quadro')).map(quadro => {
          const caixa = seletor => quadro.querySelector(seletor)?.getBoundingClientRect()
          const moldura = quadro.getBoundingClientRect()
          const cena = caixa('.b-cena')
          const desenho = caixa('.b-desenho')
          const fila = caixa('.b-fila')
          const aba = caixa('.b-abrir-fila')
          const nav = caixa('.b-nav')
          return {
          valores: medirNumeros(quadro),
          semTransbordo: quadro.scrollWidth === quadro.clientWidth,
          topoCena: Math.round(cena.top - moldura.top),
          alturaDesenho: Math.round(desenho.height),
          indicadoresNaCena: quadro.querySelectorAll('.b-cena > .b-indicador').length,
          filaLateral: fila.width > 0 && fila.left > cena.right && Math.abs(fila.top - cena.top) <= 1,
          folhaNoRodape: aba && fila.height === 0 && Math.abs(aba.bottom - nav.top) <= 2 &&
            Math.abs(nav.bottom - moldura.bottom) <= 2 && desenho.bottom < aba.top,
          salasVisiveis: Array.from(quadro.querySelectorAll('.nome-sala')).filter(el => {
            const limite = el.closest('.b-desenho').getBoundingClientRect()
            const r = el.getBoundingClientRect()
            return r.width > 0 && r.left >= limite.left && r.right <= limite.right && r.top >= limite.top && r.bottom <= limite.bottom
          }).length,
          chipsInteiros: Array.from(quadro.querySelectorAll('.b-indicador .numero-financeiro')).every(el => {
            const faixa = document.createRange()
            faixa.selectNodeContents(el)
            const texto = faixa.getBoundingClientRect()
            const cartao = el.closest('.b-indicador').getBoundingClientRect()
            const nav = quadro.querySelector('.b-nav').getBoundingClientRect()
            return texto.right <= cartao.right && (nav.top < cartao.top || texto.bottom <= nav.top)
          }),
          controles: Array.from(quadro.querySelectorAll('button, a[href]')).filter(el => el.checkVisibility()).map(el => {
            const r = el.getBoundingClientRect()
            return { nome: (el.getAttribute('aria-label') || el.textContent).trim(), largura: r.width, altura: r.height }
          })
        }})
        document.querySelector('#resultado').textContent = encodeURIComponent(JSON.stringify(resultado))
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
        '--user-data-dir=' + join(dir, 'perfil'),
        '--window-size=1400,900',
        '--virtual-time-budget=4000',
        '--dump-dom',
        pathToFileURL(arquivo).href,
      ],
      { encoding: 'utf8', timeout: 20000, maxBuffer: 8_000_000 },
    )
    expect(resultado.status, resultado.error?.message ?? resultado.stderr).toBe(0)
    const capturado = resultado.stdout.match(/<pre id="resultado">([^<]+)<\/pre>/)?.[1]
    expect(capturado).toBeTruthy()
    const medicoes = JSON.parse(decodeURIComponent(capturado!)) as {
      valores: string[]
      semTransbordo: boolean
      salasVisiveis: number
      chipsInteiros: boolean
      topoCena: number
      alturaDesenho: number
      indicadoresNaCena: number
      filaLateral: boolean
      folhaNoRodape?: boolean
      controles: { nome: string; largura: number; altura: number }[]
    }[]
    for (const [i, medicao] of medicoes.entries()) {
      expect(medicao.salasVisiveis).toBe(4)
      expect(medicao.chipsInteiros).toBe(true)
      expect(medicao.valores).toContain(moeda.format(dados.hojePodeGastar.valor.valor!).replace(/\s/g, ' '))
      const celular = cenarios[i].dispositivo === 'celular'
      expect(medicao.valores.length, medicao.valores.join(' · ')).toBeLessThanOrEqual(celular ? 5 : 8)
      expect(medicao.topoCena).toBeLessThanOrEqual(celular ? 112 : 124)
      expect(medicao.alturaDesenho).toBeGreaterThanOrEqual(celular ? 280 : 460)
      expect(medicao.indicadoresNaCena).toBe(4)
      if (celular) expect(medicao.folhaNoRodape).toBe(true)
      else expect(medicao.filaLateral).toBe(true)
      expect(medicao.semTransbordo).toBe(true)
      expect(medicao.controles.length).toBeGreaterThanOrEqual(14)
      for (const controle of medicao.controles) {
        expect(controle.nome).not.toBe('')
        expect(controle.largura, controle.nome).toBeGreaterThanOrEqual(44)
        expect(controle.altura, controle.nome).toBeGreaterThanOrEqual(44)
      }
    }
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    } catch {
      // pasta temporária presa pelo navegador no Windows: o sistema limpa depois, o teste não falha por isso
    }
  }
})
