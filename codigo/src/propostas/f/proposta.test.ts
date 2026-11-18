import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, expect, it, vi } from 'vitest'
import ts from 'typescript'
// @ts-ignore Os testes usam Node, que fica fora dos tipos do app.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
// @ts-ignore Os testes usam Node, que fica fora dos tipos do app.
import { spawnSync } from 'node:child_process'
// @ts-ignore Os testes usam Node, que fica fora dos tipos do app.
import { tmpdir } from 'node:os'
// @ts-ignore Os testes usam Node, que fica fora dos tipos do app.
import { join } from 'node:path'
// @ts-ignore Os testes usam Node, que fica fora dos tipos do app.
import { pathToFileURL } from 'node:url'
// @ts-ignore Os testes usam Node, que fica fora dos tipos do app.
import { env } from 'node:process'
import { carregarDadosInicio, type DadosInicio } from '../dadosExemplo'
import { PrivacidadePropostas } from '../comuns/privacidade'
import { Proposta } from './Proposta'

const pasta = 'src/propostas/f'
const css = ts.sys.readFile(pasta + '/proposta.css')!
const cenarios = (['claro', 'escuro'] as const).flatMap(tema => (['celular', 'desktop'] as const).map(dispositivo => ({ tema, dispositivo })))
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
let dados: DadosInicio

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T14:00:00Z'))
  try { dados = await carregarDadosInicio() } finally { vi.useRealTimers() }
})

function render(c = cenarios[0], snapshot = dados, oculto = false) {
  return renderToStaticMarkup(createElement(PrivacidadePropostas.Provider, { value: oculto },
    createElement(Proposta, { ...c, dados: snapshot })))
}

it.each(cenarios)('renderiza o exemplo em $tema no $dispositivo com uma decisão no centro e a equipe ao lado', c => {
  const html = render(c)
  expect(html).toContain(`data-tema="${c.tema}" data-dispositivo="${c.dispositivo}"`)
  expect(html.match(/<h1[ >]/g)).toHaveLength(1)
  expect(html).toContain('>Precisa de você</h1>')
  expect(html.match(/>Exemplo</g)).toHaveLength(1)
  expect(html).toContain('Maquete isométrica do escritório')
  expect(html).toContain('Trabalhando agora')
  expect(html).toContain(moeda.format(dados.hojePodeGastar.valor.valor!))
  expect(html).toContain(moeda.format(dados.plano2029.faltamPorMesComMargem.valor! / 100))
  expect(html).toContain(moeda.format(dados.aplicacoes.total.valor!))
  expect(html).toContain(moeda.format(dados.faturas.total.valor!))
  expect(html).toContain('aria-label="Pastas da caixa de entrada"')
  expect(html).toContain('aria-keyshortcuts="F"')
  expect(html).toContain('aria-keyshortcuts="D"')
  expect(html).toContain('aria-keyshortcuts="A"')
})

function comTarefas(niveis: DadosInicio['alertas']['valor']) {
  const snapshot = structuredClone(dados)
  snapshot.alertas = { ...dados.alertas, estado: 'pronto', valor: niveis ?? [] }
  snapshot.pendencias.fila = { ...dados.pendencias.fila, estado: 'pronto', valor: (niveis ?? []).map(a => ({
    id: a.id, funcionario: 'contador', perguntaCurta: a.texto, valor: { ...dados.faturas.total, estado: 'pronto', valor: 918273.46 },
  })) }
  return snapshot
}

it('mostra os três níveis por extenso em ordem de prioridade e destaca a sala da primeira decisão', () => {
  const html = render(cenarios[1], comTarefas([
    { id: 'l', nivel: 'lembrete', texto: 'Retomar lembrete' },
    { id: 'o', nivel: 'operacao', texto: 'Conferir registro' },
    { id: 'r', nivel: 'dinheiro em risco', texto: 'Revisar dinheiro em risco' },
  ]))
  const posicoes = ['Dinheiro em risco', 'Operação', 'Lembrete'].map(r => html.indexOf('>' + r + '</span>'))
  expect(posicoes[0]).toBeGreaterThan(-1)
  expect(posicoes[1]).toBeGreaterThan(posicoes[0])
  expect(posicoes[2]).toBeGreaterThan(posicoes[1])
  expect(html).toContain('>Revisar prioridade</button>')
  expect(html).toContain('data-sala="caixa" data-destaque="true"')
})

it('fecha o olho sem expor moeda, percentual, proporção, texto livre ou identificador nos links', () => {
  const snapshot = comTarefas([{ id: 'tarefa:731876,29', nivel: 'operacao', texto: 'Conferir R$ 731876,29 (77,3%; razão 17/19)' }])
  const aberto = render(cenarios[0], snapshot)
  expect(aberto).toContain('77,3%')
  expect(aberto).toContain(moeda.format(918273.46))
  expect(aberto).toContain('entidade=tarefa%3A731876%2C29')
  for (const c of cenarios) {
    const fechado = render(c, snapshot, true)
    expect(fechado).toContain('Tarefa com detalhes ocultos')
    expect(fechado).toContain('aria-label="Valor oculto"')
    expect(fechado.match(/R\$|731876|918[.]?273|77,3%|17\/19|\d\s*%|data-numero-financeiro|\baria-value\w*|<(progress|meter)\b|style="|pathLength=|stroke-dash(?:array|offset)=/i)?.[0]).toBeUndefined()
  }
})

it('identifica a sobra no Plano 2029 e oculta a direção da diferença com o olho fechado', () => {
  const snapshot = structuredClone(dados)
  snapshot.plano2029.faltamPorMesComMargem = { ...dados.plano2029.faltamPorMesComMargem, estado: 'pronto', valor: -187650 }
  const aberto = render(cenarios[0], snapshot)
  expect(aberto).toContain('Sobra por mês · com margem')
  expect(aberto).toContain(moeda.format(1876.5))
  const fechado = render(cenarios[0], snapshot, true)
  expect(fechado).toContain('Diferença mensal · com margem')
  expect(fechado).not.toMatch(/(?:Sobra|Falta) por mês|Meta mensal coberta/)
})

it('mostra somente tarefas permitidas e descrições seguras ao Assessor da Casa mesmo com snapshot integral', () => {
  const snapshot = comTarefas([
    { id: 'feira_nota:a', nivel: 'operacao', texto: 'Feira de R$ 901,00 (90%)' },
    { id: 'salario:b', nivel: 'dinheiro em risco', texto: 'Salário privado' },
  ])
  snapshot.pessoa.papel = { ...dados.pessoa.papel, estado: 'pronto', valor: 'equipe' }
  const html = render(cenarios[1], snapshot)
  expect(html).toContain('>Tarefas da Casa</h1>')
  expect(html).toContain('Guardar a nota da feira')
  expect(html).not.toMatch(/R\$|\d\s*%|data-numero-financeiro|Salário privado|Plano 2029|Maquete isométrica|feira_nota/)
})

it('distingue fila vazia de falta de leitura e mantém ilustrações decorativas fora da leitura assistiva', () => {
  const snapshot = structuredClone(dados)
  snapshot.pendencias.fila = { ...snapshot.pendencias.fila, estado: 'vazio', valor: null }
  snapshot.hojePodeGastar.valor = { ...snapshot.hojePodeGastar.valor, estado: 'indisponivel', valor: null }
  snapshot.aplicacoes.total = { ...snapshot.aplicacoes.total, estado: 'vazio', valor: null }
  const vazio = render(cenarios[0], snapshot)
  expect(vazio).toContain('Fila livre')
  expect(vazio).toContain('>Indisponível</span>')
  expect(vazio).toContain('>Sem registros</span>')
  snapshot.pendencias.fila = { ...snapshot.pendencias.fila, estado: 'indisponivel', valor: null }
  const indisponivel = render(cenarios[0], snapshot)
  expect(indisponivel).toContain('Fila indisponível')
  expect(indisponivel).not.toContain('Fila livre')
  for (const html of [vazio, indisponivel]) {
    expect(html).toMatch(/<svg[^>]*class="cf-ilustracao"[^>]*aria-hidden="true"/)
    expect(html).toContain('class="f-cena" aria-hidden="true"')
  }
})

it('tem foco de destaque, movimento reduzido e geometria de números sem os efeitos proibidos', () => {
  expect(css).toContain('outline: 2px solid var(--destaque)')
  expect(css).toMatch(/prefers-reduced-motion:\s*reduce[^}]*animation:\s*none/)
  expect(css).toMatch(/\.numero-financeiro\s*\{[^}]*tabular-nums[^}]*white-space:\s*nowrap/)
  expect(css).toMatch(/\.numero-principal\s*\{\s*font-size:\s*(34|35|36)px/)
  expect(css).toMatch(/\.numero-secundario\s*\{\s*font-size:\s*(26|27|28)px/)
  expect(css).toMatch(/\.numero-simbolo\s*\{\s*font-size:\s*\.\d+em/)
  expect(css + render()).not.toMatch(/gradient\(|backdrop-filter|background-clip:\s*text|text-shadow|border-(?:left|inline-start)\s*:|\p{Extended_Pictographic}/u)
})

function luminancia(hex: string) {
  const [r, g, b] = hex.slice(1).match(/../g)!.map(par => {
    const s = parseInt(par, 16) / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

it('atinge contraste WCAG AA nos pares de texto, alerta, botão e foco dos dois temas', () => {
  const ler = (bloco: string) => Object.fromEntries([...bloco.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map(([, id, valor]) => [id, valor]))
  const escuro = ler(css.match(/\.f-inicio \{([^}]+)\}/)![1])
  const claro = ler(css.match(/\.f-inicio\[data-tema="claro"\] \{([^}]+)\}/)![1])
  for (const tokens of [escuro, { ...escuro, ...claro }]) {
    function testar(tinta: string, fundo: string, minimo: number) {
      const [maior, menor] = [luminancia(tokens[tinta]), luminancia(tokens[fundo])].sort((x, y) => y - x)
      expect((maior + 0.05) / (menor + 0.05), `${tinta}/${fundo}`).toBeGreaterThanOrEqual(minimo)
    }
    for (const fundo of ['fundo', 'cartao', 'menu', 'f-oficina', 'f-linha-ativa']) {
      for (const tinta of ['texto', 'texto-secundario', 'risco', 'destaque']) testar(tinta, fundo, 4.5)
      testar('borda', fundo, 3)
    }
    testar('sobre-destaque', 'destaque', 4.5)
  }
})

const chrome = [
  env.BROWSER_CHROME,
  join(env.ProgramFiles || '', 'Google/Chrome/Application/chrome.exe'),
  join(env['ProgramFiles(x86)'] || '', 'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(caminho => caminho && existsSync(caminho))

it.skipIf(!chrome)('usa o medidor da casca e verifica contagem, encaixe e alvos com nome nos quatro quadros', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proposta-f-'))
  try {
    const estilos = ['src/propostas/base.css', 'src/propostas/comuns/escritorio-maquete.css', 'src/componentes/ilustracoes/ilustracoes.css', pasta + '/proposta.css']
      .map(arq => ts.sys.readFile(arq)).join('\n')
    const fontes = ['geist', 'inter'].map(nome => {
      const fonte = readFileSync(`node_modules/@fontsource-variable/${nome}/files/${nome}-latin-wght-normal.woff2`).toString('base64')
      const familia = nome[0].toUpperCase() + nome.slice(1)
      return `@font-face { font-family: '${familia} Variable'; src: url(data:font/woff2;base64,${fonte}); font-weight: 100 900 }`
    }).join('\n')
    const quadros = cenarios.map(c => `<div class="lab" data-theme="${c.tema}"><div class="lab-amostra" data-dispositivo="${c.dispositivo}">
      <div class="lab-quadro"><div class="lab-conteudo" data-proposta="f">${render(c)}</div></div>
    </div></div>`).join('')
    const medidor = ts.transpile(ts.sys.readFile('src/propostas/medicao.ts')!.replace('export function', 'function'), { target: ts.ScriptTarget.ES2020 })
    const arquivo = join(dir, 'medicao.html')
    writeFileSync(arquivo, `<!doctype html><meta charset="utf-8"><style>${fontes}\n${estilos}</style>${quadros}
      <pre id="resultado"></pre><script>${medidor}
      document.fonts.ready.then(() => {
        const resultado = Array.from(document.querySelectorAll('.lab-quadro')).map(quadro => ({
          valores: medirNumeros(quadro),
          semTransbordo: quadro.scrollWidth === quadro.clientWidth,
          contextoInteiro: Array.from(quadro.querySelectorAll('.f-indicador .numero-financeiro')).every(el => {
            const caixa = el.closest('.f-indicador').getBoundingClientRect();
            return el.getBoundingClientRect().right <= caixa.right;
          }),
          controles: Array.from(quadro.querySelectorAll('button, a[href]')).filter(el => el.checkVisibility()).map(el => ({
            nome: (el.getAttribute('aria-label') || el.textContent).trim(),
            altura: el.getBoundingClientRect().height,
            largura: el.getBoundingClientRect().width
          }))
        }));
        document.querySelector('#resultado').textContent = encodeURIComponent(JSON.stringify(resultado));
      });
      </script>`)
    const resultado = spawnSync(chrome!, ['--headless', '--no-sandbox', '--no-first-run', '--disable-gpu', '--disable-background-networking',
      '--user-data-dir=' + join(dir, 'perfil'), '--window-size=1400,900', '--virtual-time-budget=4000', '--dump-dom', pathToFileURL(arquivo).href],
    { encoding: 'utf8', timeout: 20000, maxBuffer: 8_000_000 })
    expect(resultado.status, resultado.error?.message ?? resultado.stderr).toBe(0)
    const capturado = resultado.stdout.match(/<pre id="resultado">([^<]+)<\/pre>/)?.[1]
    expect(capturado).toBeTruthy()
    const medicoes = JSON.parse(decodeURIComponent(capturado!)) as {
      valores: string[]; semTransbordo: boolean; contextoInteiro: boolean; controles: { nome: string; largura: number; altura: number }[]
    }[]
    expect(medicoes).toHaveLength(cenarios.length)
    for (const [i, medicao] of medicoes.entries()) {
      const c = cenarios[i]
      expect(medicao.semTransbordo, c.dispositivo).toBe(true)
      expect(medicao.contextoInteiro, c.dispositivo).toBe(true)
      expect(medicao.valores.length, medicao.valores.join(' · ')).toBeGreaterThanOrEqual(4)
      expect(medicao.valores.length, medicao.valores.join(' · ')).toBeLessThanOrEqual(c.dispositivo === 'celular' ? 5 : 8)
      expect(new Set(medicao.valores).size, medicao.valores.join(' · ')).toBe(medicao.valores.length)
      expect(medicao.controles.length).toBeGreaterThanOrEqual(16)
      for (const controle of medicao.controles) {
        expect(controle.nome).not.toBe('')
        expect(controle.largura, controle.nome).toBeGreaterThanOrEqual(44)
        expect(controle.altura, controle.nome).toBeGreaterThanOrEqual(44)
      }
      console.info(`F ${c.tema} ${c.dispositivo}: ${medicao.valores.length} números acima da dobra`)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
