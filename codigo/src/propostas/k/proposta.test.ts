import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, expect, it, vi } from 'vitest'
import { build } from 'vite'
import ts from 'typescript'
// @ts-ignore Os testes usam Node, que fica fora dos tipos do app.
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
import { carregarDadosInicio, type DadosInicio } from '../../componentes/escritorio/dadosDeExemplo'
import { PrivacidadePropostas } from '../../componentes/escritorio/privacidade'
import { Proposta } from './Proposta'

const pasta = 'src/propostas/k'
const css = ts.sys.readFile(pasta + '/central.css')!
const cenarios = (['claro', 'escuro'] as const).flatMap(tema =>
  (['celular', 'desktop'] as const).map(dispositivo => ({ tema, dispositivo })),
)
const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
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

function render(cenario = cenarios[0], snapshot = dados, oculto = false, olho = false) {
  return renderToStaticMarkup(
    createElement(
      PrivacidadePropostas.Provider,
      { value: olho },
      createElement(Proposta, { ...cenario, dados: snapshot, oculto }),
    ),
  )
}

function marcadores(html: string) {
  return html.match(/data-numero-financeiro="true"/g) ?? []
}

it.each(cenarios)('renderiza $tema no $dispositivo com resumo, navegação e um título', cenario => {
  const html = render(cenario)
  const celular = cenario.dispositivo === 'celular'
  expect(html).toContain(`data-tema="${cenario.tema}" data-dispositivo="${cenario.dispositivo}"`)
  expect(html.match(/<h1[ >]/g)).toHaveLength(1)
  expect(html.match(/>Exemplo</g)).toHaveLength(1)
  expect(html).toContain('Hoje você pode gastar')
  expect(html).toContain('Precisa de você')
  expect(html).toContain('Total aplicado')
  expect(html).toContain('Faturas previstas')
  expect(html).toContain('href="../../#/orcamento"')
  expect(html).toContain('href="../../#/cartoes"')
  expect(html).toContain('Navegação principal')
  expect(html.includes('role="tablist"')).toBe(celular)
  expect(html.includes('k-trilha-base')).toBe(!celular)
  expect(html).toContain(reais.format(dados.hojePodeGastar.valor.valor!))
  const falta = reais.format(Math.abs(dados.plano2029.faltamPorMesComMargem.valor!) / 100)
  expect(html.split(falta)).toHaveLength(2)
  if (celular) expect(marcadores(html).length).toBeLessThanOrEqual(5)
})

it('oculta cifras, textos livres, cobertura e qualquer geometria proporcional pelo olho ou pela prop', () => {
  const snapshot = structuredClone(dados)
  if (snapshot.pendencias.fila.valor)
    snapshot.pendencias.fila.valor[0].perguntaCurta = 'Conferir repasse de R$ 719,45 (73%)'
  const aberto = render(cenarios[1], snapshot)
  expect(aberto).toContain('k-trilha-preenchida')
  expect(aberto).toContain('k-trilha-posicao')
  for (const html of [render(cenarios[1], snapshot, true), render(cenarios[1], snapshot, false, true)]) {
    expect(marcadores(html)).toHaveLength(0)
    expect(html).toContain('Valor oculto')
    expect(html).toContain('Decisão com detalhes ocultos')
    expect(html).toContain('k-trilha-base')
    expect(html).toContain('Viver de')
    expect(html).not.toMatch(/k-trilha-(?:preenchida|posicao)|719,45|73%|R\$\s*\d|\d+<span class="numero-simbolo">%/)
  }
})

it('apresenta valores vazios ou indisponíveis com texto e restringe o resumo ao casal', () => {
  const snapshot = structuredClone(dados)
  snapshot.hojePodeGastar.valor = { ...snapshot.hojePodeGastar.valor, estado: 'vazio', valor: null }
  snapshot.plano2029.progressao = { ...snapshot.plano2029.progressao, estado: 'indisponivel', valor: null }
  snapshot.pendencias.fila = { ...snapshot.pendencias.fila, estado: 'vazio', valor: null }
  const html = render(cenarios[1], snapshot)
  expect(html.match(/Ainda sem dado/g)?.length).toBeGreaterThanOrEqual(3)
  expect(html).not.toContain('k-trilha-posicao')
  for (const papel of ['equipe', 'pessoa'] as const) {
    snapshot.pessoa.papel = { ...snapshot.pessoa.papel, estado: 'pronto', valor: papel }
    const restrito = render(cenarios[1], snapshot)
    expect(marcadores(restrito)).toHaveLength(0)
    expect(restrito).not.toMatch(/k-trilha|k-fila|maquete-posto/)
    expect(restrito).toContain(papel === 'equipe' ? 'Assessor da Casa' : 'Abrir meu orçamento')
  }
})

it('usa 19 postos nativos e ilustrações decorativas com foco e movimento reduzido', () => {
  const html = render(cenarios[1])
  const postos = html.match(/<button[^>]*class="maquete-posto"[^>]*>/g) ?? []
  const figuras = html.match(/<svg[^>]*class="cf-ilustracao[^>]*>/g) ?? []
  expect(postos).toHaveLength(19)
  expect(postos.every(tag => /type="button".*aria-label="[^"]+/.test(tag))).toBe(true)
  expect(html).toMatch(/class="escritorio-maquete" data-variante="grande"[^>]*aria-hidden="true"/)
  expect(figuras).toHaveLength(3)
  expect(figuras.every(tag => tag.includes('aria-hidden="true"'))).toBe(true)
  expect(css).toContain('outline: 2px solid var(--destaque)')
  expect(css).toContain('prefers-reduced-motion: reduce')
  expect(css).toMatch(/stroke-width: 15px/)
  expect(css + html).not.toMatch(
    /(?:linear|radial|conic)-gradient\(|backdrop-filter|background-clip:\s*text|text-shadow|border-(?:left|inline-start)\s*:|\p{Extended_Pictographic}/u,
  )
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

it('calcula contraste AA dos pares de tokens nos dois temas', () => {
  const ler = (seletor: string) =>
    Object.fromEntries(
      [
        ...css
          .split(seletor + ' {')[1]
          .split('}')[0]
          .matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi),
      ].map(([, id, valor]) => [id, valor]),
    )
  for (const seletor of ['data-proposta="k"', 'data-tema="escuro"']) {
    const tokens = ler(`.k-inicio[${seletor}]`)
    function verificar(tinta: string, fundo: string, minimo: number) {
      const a = luminancia(tokens[tinta])
      const b = luminancia(tokens[fundo])
      expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), `${seletor} ${tinta}/${fundo}`).toBeGreaterThanOrEqual(
        minimo,
      )
    }
    for (const fundo of ['fundo', 'cartao', 'menu', 'k-ativo', 'k-cena']) {
      for (const tinta of ['texto', 'texto-secundario', 'destaque', 'risco']) verificar(tinta, fundo, 4.5)
      verificar('borda', fundo, 3)
    }
    verificar('k-neve', 'k-mata', 4.5)
    verificar('k-trilha', 'fundo', 3)
    verificar('k-agora', 'k-mata', 3)
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

it.skipIf(!chrome)(
  'mede na casca e exercita abas, navegação, fila, teclado e balões no Chromium',
  async () => {
    const dir = mkdtempSync(join(tmpdir(), 'proposta-k-'))
    try {
      const fixture = structuredClone(dados)
      const linha = fixture.pendencias.fila.valor?.[0]
      if (!linha) throw new Error('A fila de exemplo precisa de uma decisão para o teste.')
      fixture.pendencias.fila = {
        ...fixture.pendencias.fila,
        estado: 'pronto',
        valor: [
          {
            ...linha,
            id: 'teste-risco',
            perguntaCurta: 'Revisar R$ 719,45 com cobertura de 73%',
            valor: { ...fixture.faturas.total, estado: 'pronto', valor: 719.45 },
          },
          { ...linha, id: 'teste-operacao', perguntaCurta: 'Conferir operação' },
          { ...linha, id: 'teste-lembrete', perguntaCurta: 'Conferir lembrete' },
        ],
      }
      fixture.alertas = {
        ...fixture.alertas,
        estado: 'pronto',
        valor: [
          { id: 'teste-lembrete', nivel: 'lembrete', texto: 'Conferir lembrete' },
          { id: 'teste-operacao', nivel: 'operacao', texto: 'Conferir operação' },
          { id: 'teste-risco', nivel: 'dinheiro em risco', texto: 'Revisar diferença' },
        ],
      }
      fixture.saldoConta = { ...fixture.saldoConta, estado: 'pronto', valor: 839217.45 }

      const entrada = 'virtual:teste-proposta-k'
      const pacote = await build({
        configFile: false,
        logLevel: 'silent',
        esbuild: { jsx: 'automatic' },
        plugins: [
          {
            name: 'teste-proposta-k',
            resolveId: id => (id === entrada ? '\0' + entrada : undefined),
            load: id => (id === '\0' + entrada ? codigoBrowser(dados, fixture) : undefined),
          },
        ],
        build: {
          write: false,
          copyPublicDir: false,
          minify: false,
          cssCodeSplit: false,
          assetsInlineLimit: 1000000,
          modulePreload: false,
          rollupOptions: { input: entrada, output: { format: 'iife', inlineDynamicImports: true } },
        },
      })
      if (Array.isArray(pacote) || !('output' in pacote)) throw new Error('Bundle de teste ausente.')
      const js = pacote.output.find(item => item.type === 'chunk')
      const estilo = pacote.output.find(item => item.fileName.endsWith('.css'))
      if (js?.type !== 'chunk' || estilo?.type !== 'asset') {
        throw new Error('JavaScript ou CSS do teste ausente: ' + pacote.output.map(item => item.fileName).join(', '))
      }
      const arquivo = join(dir, 'quadro.html')
      writeFileSync(
        arquivo,
        `<!doctype html><meta charset="utf-8"><style>${estilo.source}</style>
      <div id="quadros"></div><pre id="resultado"></pre><script>${js.code.replace(/<\/script/gi, '<\\/script')}</script>`,
      )
      const processo = spawnSync(
        chrome,
        [
          '--headless',
          '--no-sandbox',
          '--no-first-run',
          '--disable-gpu',
          '--disable-background-networking',
          '--window-size=1500,1000',
          '--user-data-dir=' + join(dir, 'perfil'),
          '--virtual-time-budget=4000',
          '--dump-dom',
          pathToFileURL(arquivo).href,
        ],
        { encoding: 'utf8', timeout: 20000, maxBuffer: 12_000_000 },
      )
      expect(processo.status, processo.error?.message ?? processo.stderr).toBe(0)
      const capturado = processo.stdout.match(/<pre id="resultado">([^<]+)<\/pre>/)?.[1]
      expect(capturado, 'O Chromium deve devolver o roteiro e a medição.').toBeTruthy()
      const resultado = JSON.parse(decodeURIComponent(capturado!)) as {
        erro?: string
        quadros: { numeros: string[]; semTransbordo: boolean; alvos: string[] }[]
        interacao: Record<string, boolean>
        outrasAbas: { escritorio: number; plano: number }
      }
      expect(resultado.erro).toBeUndefined()
      expect(resultado.quadros).toHaveLength(cenarios.length)
      resultado.quadros.forEach(({ numeros, semTransbordo, alvos }, i) => {
        const { tema, dispositivo } = cenarios[i]
        console.log(`K ${tema} ${dispositivo} — ${numeros.length} números acima da dobra`)
        expect(numeros.length, numeros.join(' · ')).toBeLessThanOrEqual(dispositivo === 'celular' ? 5 : 8)
        expect(numeros.length).toBeGreaterThanOrEqual(4)
        expect(new Set(numeros).size, numeros.join(' · ')).toBe(numeros.length)
        expect(semTransbordo).toBe(true)
        expect(alvos).toEqual([])
      })
      expect(resultado.outrasAbas.escritorio).toBe(0)
      expect(resultado.outrasAbas.plano).toBeGreaterThanOrEqual(2)
      expect(resultado.outrasAbas.plano).toBeLessThanOrEqual(5)
      console.log(
        `K celular por aba diretamente da casca — Escritório ${resultado.outrasAbas.escritorio}, Plano ${resultado.outrasAbas.plano}`,
      )
      expect(Object.keys(resultado.interacao)).toHaveLength(16)
      for (const [acao, passou] of Object.entries(resultado.interacao)) expect(passou, acao).toBe(true)
    } finally {
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
      } catch {
        // pasta temporária presa pelo navegador no Windows: o sistema limpa depois, o teste não falha por isso
      }
    }
  },
  30000,
)

function codigoBrowser(snapshot: DadosInicio, fixture: DadosInicio) {
  return `
    import { createElement } from 'react'
    import { flushSync } from 'react-dom'
    import { createRoot } from 'react-dom/client'
    import { Proposta } from '/${pasta}/Proposta.tsx'
    import { medirNumeros } from '/src/propostas/medicao.ts'
    import '/src/propostas/base.css'
    const dados = ${JSON.stringify(snapshot)}
    const fixture = ${JSON.stringify(fixture)}
    const cenarios = ${JSON.stringify(cenarios)}
    const chave = 'central-familia:proposta-k:aba'
    const exibir = dados => document.querySelector('#resultado').textContent = encodeURIComponent(JSON.stringify(dados))
    function montar(cenario, snapshot, oculto = false) {
      const caixa = document.createElement('div')
      caixa.className = 'lab'
      caixa.dataset.theme = cenario.tema
      caixa.innerHTML = '<section class="lab-amostra" data-dispositivo="' + cenario.dispositivo
        + '"><div class="lab-quadro"><div class="lab-conteudo" data-proposta="k"></div></div></section>'
      document.querySelector('#quadros').append(caixa)
      const quadro = caixa.querySelector('.lab-quadro')
      const root = createRoot(caixa.querySelector('.lab-conteudo'))
      const render = (config = {}) => flushSync(() => root.render(createElement(Proposta,
        { ...cenario, dados: snapshot, oculto, ...config })))
      render()
      return { quadro, render, desmontar: () => { flushSync(() => root.unmount()); caixa.remove() } }
    }
    function medir({ quadro }) {
      const area = quadro.querySelector('.k-paineis')
      const alvos = [...quadro.querySelectorAll('button, a, summary')].filter(el => el.checkVisibility()).flatMap(el => {
        const nome = el.getAttribute('aria-label') || el.textContent.trim()
        const { width, height } = el.getBoundingClientRect()
        return !nome || width < 44 || height < 44 ? [(nome || 'Sem nome') + ' ' + width + '×' + height] : []
      })
      return { numeros: medirNumeros(quadro), semTransbordo: quadro.scrollWidth === quadro.clientWidth &&
        area.scrollWidth === area.clientWidth, alvos }
    }
    const pausa = () => new Promise(resolve => setTimeout(resolve, 70))
    async function testar() {
      sessionStorage.removeItem(chave)
      const quadros = cenarios.map(c => montar(c, dados))
      await document.fonts.ready
      const medidas = quadros.map(medir)
      const desktop = quadros[1].quadro
      const centros = [...desktop.querySelectorAll('.k-painel')].map(el => el.getBoundingClientRect())
      const tresColunas = centros.length === 3 && centros.every(el => el.top === centros[0].top) &&
        centros[0].right < centros[1].left && centros[1].right < centros[2].left && centros[1].width > centros[0].width
      quadros.forEach(quadro => quadro.desmontar())
      const caso = montar(cenarios[0], fixture)
      let quadro = caso.quadro
      const $ = s => quadro.querySelector(s)
      const apertar = el => flushSync(() => el.click())
      const texto = (s, nome) => [...quadro.querySelectorAll(s)].find(el => el.textContent.trim() === nome)
      const i = { tresColunas }
      i.risco = $('.k-prioridade').textContent.trim() === 'Dinheiro em risco'
      apertar(texto('.k-acoes button', 'Abrir'))
      i.abrir = !$('.k-decisao-detalhe').hidden && $('.k-decisao-detalhe a').hash.includes('teste-risco')
      apertar(texto('.k-acoes button', 'Depois'))
      i.depois = $('.k-prioridade').textContent.trim() === 'Operação' && !!$('.k-desfazer')
      apertar($('.k-desfazer button'))
      apertar(texto('.k-acoes button', 'Já fiz'))
      i.feita = $('.k-prioridade').textContent.trim() === 'Operação' && $('.k-desfazer').textContent.includes('Marcada')
      apertar($('[aria-label="Próxima decisão"]'))
      i.lembrete = $('.k-prioridade').textContent.trim() === 'Lembrete'
      apertar($('.k-desfazer button'))
      i.desfazer = $('.k-prioridade').textContent.trim() === 'Dinheiro em risco'
      const tab = $('[role="tab"][aria-selected="true"]')
      tab.focus()
      flushSync(() => tab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
      i.abaTeclado = document.activeElement.textContent === 'Escritório' && !!$('.k-cena')
      i.escritorio = quadro.querySelectorAll('.maquete-posto').length === 19 &&
        [...quadro.querySelectorAll('.maquete-posto')].every(el => el.tabIndex === 0 && el.offsetWidth >= 44 && el.offsetHeight >= 44) &&
        $('.k-cena').getBoundingClientRect().height >= 286
      const outrasAbas = { escritorio: medirNumeros(quadro).length }
      apertar(texto('.k-salas button', 'Caixa'))
      i.focoEBalao = quadro.querySelectorAll('.maquete-posto').length === 3 && $('.maquete-balao').textContent.includes('839.217,45')
      const posto = $('.maquete-posto')
      posto.focus()
      apertar(posto)
      await pausa()
      i.ficha = !!$('.k-ficha[open] h3') && document.activeElement.getAttribute('aria-label') === 'Fechar ficha'
      apertar($('[aria-label="Fechar ficha"]'))
      await pausa()
      i.retornoDoFoco = !$('.k-ficha') && document.activeElement === posto
      caso.render({ oculto: true })
      i.balaoOculto = $('.maquete-balao').textContent.trim() === '•••' && !quadro.innerHTML.includes('839.217,45') &&
        !quadro.querySelector('[data-numero-financeiro]')
      apertar(texto('.k-menu summary', 'Mais'))
      apertar(texto('.k-menu-extras button', 'Plano 2029'))
      i.menu = $('[role="tab"][aria-selected="true"]').textContent === 'Plano' && !!$('.k-trilha-base') &&
        !$('.k-trilha-preenchida') && !$('.k-trilha-posicao')
      caso.desmontar()
      const volta = montar(cenarios[0], fixture)
      quadro = volta.quadro
      i.sessao = $('[role="tab"][aria-selected="true"]').textContent === 'Plano' && !!$('.k-trilha-preenchida')
      outrasAbas.plano = medirNumeros(quadro).length
      i.cenario = !$('.k-cenario .k-lacuna')
      apertar($('.k-cenario summary'))
      await pausa()
      i.cenario &&= $('.k-cenario[open] .k-lacuna').textContent.includes('sem margem')
      volta.desmontar()
      exibir({ quadros: medidas, interacao: i, outrasAbas })
    }
    testar().catch(erro => exibir({ erro: erro.stack }))
  `
}
