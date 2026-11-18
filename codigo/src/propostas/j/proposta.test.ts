import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, expect, it, vi } from 'vitest'
import ts from 'typescript'
// @ts-ignore APIs do Node usadas só pelos testes.
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
// @ts-ignore APIs do Node usadas só pelos testes.
import { spawnSync } from 'node:child_process'
// @ts-ignore APIs do Node usadas só pelos testes.
import { tmpdir } from 'node:os'
// @ts-ignore APIs do Node usadas só pelos testes.
import { dirname, join } from 'node:path'
// @ts-ignore APIs do Node usadas só pelos testes.
import { pathToFileURL } from 'node:url'
// @ts-ignore APIs do Node usadas só pelos testes.
import { env } from 'node:process'
import { carregarDadosInicio, type DadosInicio } from '../dadosExemplo'
import { PrivacidadePropostas } from '../comuns/privacidade'
import { Proposta } from './Proposta'

const pasta = 'src/propostas/j'
const css = ts.sys.readFile(pasta + '/proposta.css')!
const cenarios = (['celular', 'desktop'] as const).flatMap(dispositivo =>
  (['escuro', 'claro'] as const).map(tema => ({ tema, dispositivo })))
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
let dados: DadosInicio

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-18T14:00:00Z'))
  try { dados = await carregarDadosInicio() } finally { vi.useRealTimers() }
})

function render(c = cenarios[0], snapshot = dados, oculto = false, olhoDaCasca = false) {
  return renderToStaticMarkup(createElement(PrivacidadePropostas.Provider, { value: olhoDaCasca },
    createElement(Proposta, { ...c, dados: snapshot, oculto })))
}

it.each(cenarios)('renderiza o escritório no centro em $tema no $dispositivo', c => {
  const html = render(c)
  expect(html).toContain(`data-tema="${c.tema}" data-dispositivo="${c.dispositivo}"`)
  expect(html.match(/<h1[ >]/g)).toHaveLength(1)
  expect(html.match(/>Exemplo</g)).toHaveLength(1)
  expect(html).toContain('Maquete isométrica do escritório')
  expect(html.match(/class="maquete-posto"/g)).toHaveLength(19)
  expect(html.match(/class="maquete-placa maquete-rotulo"/g)).toHaveLength(19)
  expect(html.match(/<svg[^>]*class="cf-ilustracao"[^>]*aria-hidden="true"/g)).toHaveLength(4)
  expect(html).toContain('Rumo a 2029')
  expect(html).toContain('Viver de rendimentos')
  for (const campo of [dados.hojePodeGastar.valor, dados.aplicacoes.total, dados.faturas.total, dados.plano2029.faltamPorMesComMargem]) {
    expect(campo.estado).toBe('pronto')
    const reais = Math.abs(campo.valor ?? NaN) / (campo.unidade === 'centavos' ? 100 : 1)
    expect(html.replace(/<[^>]+>/g, '').split(moeda.format(reais))).toHaveLength(2)
  }
})

function comDecisoes(): DadosInicio {
  const d = structuredClone(dados)
  d.alertas = { ...d.alertas, estado: 'pronto', valor: [
    { id: 'lembrete', nivel: 'lembrete', texto: 'Lembrar da nota' },
    { id: 'operacao', nivel: 'operacao', texto: 'Revisar registro' },
    { id: 'tarefa:731876,29', nivel: 'dinheiro em risco', texto: 'Conferir R$ 731876,29 (77,3%; razão 17/19)' },
  ] }
  d.pendencias.fila = { ...d.pendencias.fila, estado: 'pronto', valor: d.alertas.valor.map((a, i) => ({
    id: a.id, funcionario: 'Contador', perguntaCurta: a.texto, valor: {
      ...d.faturas.total, estado: 'pronto', valor: 818273.46 + i,
    },
  })) }
  d.saldoConta = { ...d.saldoConta, estado: 'pronto', valor: 918273.46 }
  d.plano2029.progressao = { ...d.plano2029.progressao, estado: 'pronto', valor: 77.3 }
  d.plano2029.faltamPorMesComMargem = { ...d.plano2029.faltamPorMesComMargem, estado: 'pronto', valor: -786543 }
  return d
}

it('mascara etiquetas financeiras, texto livre e geometria da trilha com a prop e com o olho da casca', () => {
  const snapshot = comDecisoes()
  const aberto = render(cenarios[1], snapshot)
  expect(aberto).toContain('Sobra por mês')
  expect(aberto).toContain('j-cobertura')
  expect(aberto).toContain('j-aqui')
  expect(aberto).toMatch(/77,3<span class="numero-simbolo">%/)
  const trilha = (html: string) => html.match(/<svg class="j-trilha".*?<\/svg>/)?.[0]
  for (const c of cenarios) {
    const fechado = render(c, snapshot, true)
    expect(render(c, snapshot, false, true)).toBe(fechado)
    expect(fechado).toContain('Valor oculto')
    expect(fechado).toContain('Decisão com detalhes ocultos')
    expect(fechado).not.toMatch(/R\$|731876|818\.27|77,3|17\/19|j-cobertura|j-aqui|data-numero-financeiro|aria-valuenow|Sobra por mês|Falta por mês/)
    const outro = structuredClone(snapshot)
    if (outro.plano2029.progressao.estado === 'pronto') outro.plano2029.progressao.valor = 19.2
    expect(trilha(fechado)).toBeTruthy()
    expect(trilha(render(c, outro, true))).toBe(trilha(fechado))
  }
})

it('trata vazio e indisponível como ainda sem dado e protege o Assessor mesmo com o snapshot integral', () => {
  const d = comDecisoes()
  d.aplicacoes.total = { ...d.aplicacoes.total, estado: 'vazio', valor: null }
  d.faturas.total = { ...d.faturas.total, estado: 'indisponivel', valor: null }
  d.plano2029.progressao = { ...d.plano2029.progressao, estado: 'indisponivel', valor: null }
  const html = render(cenarios[1], d)
  expect(html.match(/>Ainda sem dado</g)!.length).toBeGreaterThanOrEqual(3)
  expect(html).not.toContain('j-aqui')
  d.pessoa.papel = { ...d.pessoa.papel, estado: 'pronto', valor: 'equipe' }
  const assessor = render(cenarios[0], d)
  expect(assessor).toContain('<h1>Tarefas da casa</h1>')
  expect(assessor).toContain('href="../../#/casa"')
  expect(assessor).not.toMatch(/R\$|data-numero-financeiro|j-trilha|j-chip|Maquete isométrica|Conferir|731876/)
})

it('preserva tipografia, foco, movimento reduzido e a espessura da trilha sem os efeitos proibidos', () => {
  expect(css).toContain('outline: 2px solid var(--destaque)')
  expect(css).toMatch(/prefers-reduced-motion:\s*reduce[^}]*animation:\s*none/)
  expect(css).toMatch(/\.numero-financeiro\s*\{[^}]*tabular-nums[^}]*white-space:\s*nowrap/)
  expect(css).toMatch(/\.numero-principal\s*\{\s*font-size:\s*36px/)
  expect(css).toMatch(/\.numero-secundario\s*\{\s*font-size:\s*27px/)
  expect(css).toMatch(/\.numero-simbolo[^{}]*\{\s*font-size:\s*\.\d+em/)
  expect(css).toMatch(/\.j-trilha path\s*\{[^}]*stroke-width:\s*15px/)
  expect(css + render()).not.toMatch(/gradient\(|backdrop-filter|background-clip:\s*text|text-shadow|border-(?:left|inline-start)\s*:|\p{Extended_Pictographic}/u)
})

function luminancia(hex: string) {
  const [r, g, b] = hex.slice(1).match(/../g)!.map(par => {
    const canal = parseInt(par, 16) / 255
    return canal <= 0.04045 ? canal / 12.92 : ((canal + .055) / 1.055) ** 2.4
  })
  return .2126 * r + .7152 * g + .0722 * b
}

it('atinge AA para texto, risco, botões ativos e foco nos dois temas', () => {
  const ler = (bloco: string) => Object.fromEntries([...bloco.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map(([, id, valor]) => [id, valor]))
  const escuro = ler(css.match(/\.j-inicio \{([^}]+)\}/)![1])
  const claro = ler(css.match(/\.j-inicio\[data-tema="claro"\] \{([^}]+)\}/)![1])
  for (const tokens of [escuro, { ...escuro, ...claro }]) {
    function contraste(tinta: string, fundo: string, minimo: number) {
      const [maior, menor] = [luminancia(tokens[tinta]), luminancia(tokens[fundo])].sort((a, b) => b - a)
      expect((maior + .05) / (menor + .05), `${tinta}/${fundo}`).toBeGreaterThanOrEqual(minimo)
    }
    for (const fundo of ['fundo', 'cartao', 'menu', 'j-cena']) {
      for (const tinta of ['texto', 'texto-secundario', 'risco', 'destaque']) contraste(tinta, fundo, 4.5)
      contraste('borda', fundo, 3)
    }
    contraste('sobre-destaque', 'destaque', 4.5)
  }
})

const chrome = [
  env.BROWSER_CHROME,
  join(env.ProgramFiles || '', 'Google/Chrome/Application/chrome.exe'),
  join(env['ProgramFiles(x86)'] || '', 'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(caminho => caminho && existsSync(caminho))

// Executa a mesma proposta React no Chrome local, sem servidor nem rede. Só os módulos da interface
// entram no HTML temporário. O snapshot chega por serialização do contrato de exemplo.
function modulosDoNavegador(entradas: string[]) {
  const modulos = new Map<string, string>()
  function coletar(arquivo: string) {
    if (modulos.has(arquivo)) return
    const js = ts.transpile(ts.sys.readFile(arquivo)!, {
      target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS,
    })
    modulos.set(arquivo, js)
    for (const [, caminho] of js.matchAll(/require\("([^"]+)"\)/g)) {
      if (caminho.startsWith('.') && !caminho.endsWith('.css')) {
        const base = join(dirname(arquivo), caminho).replace(/\\/g, '/')
        const resolvido = ['.ts', '.tsx'].map(ext => base + ext).find(existsSync)
        if (!resolvido) throw new Error(`Módulo da prévia ausente: ${base}`)
        coletar(resolvido)
      }
    }
  }
  for (const entrada of entradas) coletar(entrada)
  return `const modulos = {${[...modulos].map(([arquivo, js]) => `${JSON.stringify(arquivo)}:(React,require,exports)=>{${js}\n}`).join(',')}};
    const cache = {};
    function carregar(id) {
      if (cache[id]) return cache[id];
      const exports = cache[id] = {};
      modulos[id](React, caminho => {
        if (caminho === 'react') return React;
        if (caminho === 'lucide-react') return LucideReact;
        if (caminho.endsWith('.css') || caminho.startsWith('@fontsource-variable/')) return {};
        const base = new URL(caminho, 'https://local/' + id).pathname.slice(1);
        return carregar(modulos[base + '.ts'] ? base + '.ts' : base + '.tsx');
      }, exports);
      return exports;
    }`
}

const roteiroNavegador = `
async ({ cenarios, dados, tarefas }) => {
  const raizes = Array.from(document.querySelectorAll('.lab-conteudo')).map(el => ReactDOM.createRoot(el));
  function montar(i, snapshot, oculto = false) {
    ReactDOM.flushSync(() => raizes[i].render(React.createElement(Proposta, { ...cenarios[i], dados: snapshot, oculto })));
  }
  const clicar = (el) => ReactDOM.flushSync(() => el.click());
  cenarios.forEach((_, i) => montar(i, dados));
  await document.fonts.ready;
  return Array.from(document.querySelectorAll('.lab-quadro')).map((quadro, i) => {
    const obter = (seletor) => quadro.querySelector(seletor);
    const texto = (seletor) => obter(seletor)?.textContent.trim();
    const botao = (seletor, nome) => [...quadro.querySelectorAll(seletor)].find(el => el.textContent.trim() === nome);
    const medidas = () => [...quadro.querySelectorAll('button, summary, a[href]')]
      .filter(el => el.checkVisibility()).map(el => {
        const r = el.getBoundingClientRect();
        return { nome: el.getAttribute('aria-label') || el.textContent.trim(), largura: r.width, altura: r.height };
      });
    const inicial = {
      total: medirNumeros(quadro),
      semTransbordo: quadro.clientWidth === quadro.scrollWidth,
      encaixe: [...quadro.querySelectorAll('.j-chip .numero-financeiro')].every(n =>
        n.getBoundingClientRect().right <= n.closest('.j-chip').getBoundingClientRect().right),
      controles: medidas(),
      folhaRecolhida: obter('.j-fila-corpo').hidden,
      folhaAntesDoMenu: !obter('.j-folha-gatilho') ||
        obter('.j-folha-gatilho').getBoundingClientRect().bottom <= obter('.j-nav').getBoundingClientRect().top,
    };
    clicar(botao('.j-nav button', 'Orçamento'));
    const menu = document.activeElement === obter('[data-cartao="orcamento"] h3') &&
      botao('.j-nav button', 'Orçamento').getAttribute('aria-current') === 'location';
    clicar(obter('.j-nav summary'));
    clicar(botao('.j-nav-extras button', 'Rumo a 2029'));
    const mais = document.activeElement === obter('.j-plano h2') && !obter('.j-nav details').open;
    montar(i, tarefas);
    const posto = obter('.maquete-posto[aria-label^="Contador"]');
    posto.focus();
    const postoNativo = posto instanceof HTMLButtonElement && posto.tabIndex === 0 && document.activeElement === posto;
    clicar(posto);
    const ficha = texto('.j-ficha h3');
    const balao = texto('.maquete-balao');
    montar(i, tarefas, true);
    const balaoOculto = texto('.maquete-balao');
    const semMedidasOcultas = medirNumeros(quadro).length === 0 && !obter('.j-cobertura') && !obter('.j-aqui');
    montar(i, tarefas);
    clicar(obter('.j-ficha button'));
    clicar(botao('.j-salas button', 'Caixa'));
    const sala = obter('.escritorio-maquete [data-sala="caixa"][data-destaque="true"]') && texto('.j-ficha h3') === 'Caixa';
    clicar(botao('.j-salas button', 'Todas'));
    if (obter('.j-folha-gatilho')) clicar(obter('.j-folha-gatilho'));
    const prioridade = texto('.j-nivel');
    clicar(botao('.j-acoes button', 'Abrir'));
    const abriu = Boolean(obter('.j-decisao-detalhe:not([hidden]) a[href*="entidade="]'));
    const alvosComFila = medidas();
    clicar(botao('.j-acoes button', 'Depois'));
    const operacao = texto('.j-nivel');
    clicar(botao('.j-fila-abas button', 'Depois'));
    const guardada = texto('.j-nivel') === prioridade;
    clicar(botao('.j-retorno button', 'Desfazer'));
    const desfez = texto('.j-nivel') === prioridade;
    clicar(botao('.j-acoes button', 'Já fiz'));
    clicar(botao('.j-fila-abas button', 'Feitas'));
    const feita = texto('.j-nivel') === prioridade;
    clicar(botao('.j-retorno button', 'Desfazer'));
    clicar(botao('.j-paginacao button', 'Próxima'));
    if (obter('.j-folha-gatilho')) clicar(botao('.j-paginacao button', 'Próxima'));
    const lembrete = [...quadro.querySelectorAll('.j-nivel')].map(e => e.textContent);
    return { ...inicial, menu, mais, postoNativo, ficha, balao, balaoOculto, semMedidasOcultas, sala: !!sala,
      prioridade, abriu, alvosComFila, operacao, guardada, desfez, feita, lembrete };
  });
}`

it.skipIf(!chrome)('mede a casca e exercita navegação, teclado nativo, fila e privacidade no Chromium', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proposta-j-'))
  try {
    const estilos = ['src/propostas/base.css', 'src/propostas/comuns/escritorio-maquete.css', 'src/componentes/ilustracoes/ilustracoes.css', pasta + '/proposta.css']
      .map(arq => ts.sys.readFile(arq)).join('\n')
    const fontes = ['geist', 'inter'].map(nome => {
      const fonte = readFileSync(`node_modules/@fontsource-variable/${nome}/files/${nome}-latin-wght-normal.woff2`).toString('base64')
      return `@font-face { font-family: '${nome[0].toUpperCase() + nome.slice(1)} Variable'; src: url(data:font/woff2;base64,${fonte}); font-weight: 100 900 }`
    }).join('\n')
    const biblioteca = (arq: string) => `<script>${ts.sys.readFile('node_modules/' + arq)}</script>`
    const bibliotecas = biblioteca('react/umd/react.production.min.js') +
      biblioteca('react-dom/umd/react-dom.production.min.js') + '<script>window.react = React;</script>' +
      biblioteca('lucide-react/dist/umd/lucide-react.min.js')
    const quadros = cenarios.map(c => `<div class="lab" data-theme="${c.tema}"><div class="lab-amostra" data-dispositivo="${c.dispositivo}">
      <div class="lab-quadro"><div class="lab-conteudo" data-proposta="j"></div></div></div></div>`).join('')
    const arquivo = join(dir, 'medicao.html')
    const modulos = modulosDoNavegador([pasta + '/Proposta.tsx', 'src/propostas/medicao.ts'])
    const fixture = JSON.stringify({ cenarios, dados, tarefas: comDecisoes() }).replace(/</g, '\\u003c')
    writeFileSync(arquivo, `<!doctype html><meta charset="utf-8"><style>${fontes}\n${estilos}</style>
      ${quadros}<pre id="resultado"></pre>${bibliotecas}<script>${modulos}
      const saida = document.querySelector('#resultado');
      const { Proposta } = carregar('${pasta}/Proposta.tsx');
      const { medirNumeros } = carregar('src/propostas/medicao.ts');
      (${roteiroNavegador})(${fixture}).then(dados => saida.textContent = encodeURIComponent(JSON.stringify(dados)))
        .catch(erro => saida.textContent = 'erro: ' + erro.stack);
      </script>`)
    const execucao = spawnSync(chrome!, ['--headless', '--no-sandbox', '--no-first-run', '--disable-gpu', '--disable-background-networking',
      '--user-data-dir=' + join(dir, 'perfil'), '--window-size=1400,900', '--virtual-time-budget=4000', '--dump-dom', pathToFileURL(arquivo).href],
    { encoding: 'utf8', timeout: 20000, maxBuffer: 12_000_000 })
    expect(execucao.status, execucao.error?.message ?? execucao.stderr).toBe(0)
    const capturado = execucao.stdout.match(/<pre id="resultado">([^<]*)<\/pre>/)?.[1]
    expect(capturado, 'resultado do roteiro no navegador').toBeTruthy()
    expect(capturado).not.toMatch(/^erro/)
    const medicoes = JSON.parse(decodeURIComponent(capturado!)) as {
      total: string[]; semTransbordo: boolean; encaixe: boolean; menu: boolean; mais: boolean; postoNativo: boolean
      ficha: string; balao: string; balaoOculto: string; semMedidasOcultas: boolean; sala: boolean; prioridade: string
      abriu: boolean; operacao: string; guardada: boolean; desfez: boolean; feita: boolean; lembrete: string[]
      folhaRecolhida: boolean; folhaAntesDoMenu: boolean; controles: { nome: string; largura: number; altura: number }[]
      alvosComFila: { nome: string; largura: number; altura: number }[]
    }[]
    expect(medicoes).toHaveLength(cenarios.length)
    for (const [i, m] of medicoes.entries()) {
      const c = cenarios[i]
      console.info(`J ${c.dispositivo} ${c.tema}: ${m.total.length} números acima da dobra (${m.total.join(' · ')})`)
      expect(m.total.length, m.total.join(' · ')).toBeGreaterThanOrEqual(4)
      expect(m.total.length, m.total.join(' · ')).toBeLessThanOrEqual(c.dispositivo === 'celular' ? 5 : 8)
      expect(new Set(m.total).size).toBe(m.total.length)
      expect(m).toMatchObject({
        semTransbordo: true, encaixe: true, menu: true, mais: true, postoNativo: true, ficha: 'Contador',
        balao: moeda.format(918273.46), balaoOculto: '•••', semMedidasOcultas: true, sala: true,
        prioridade: 'Dinheiro em risco', abriu: true, operacao: 'Operação', guardada: true, desfez: true, feita: true,
        folhaRecolhida: c.dispositivo === 'celular', folhaAntesDoMenu: true,
      })
      expect(m.lembrete).toContain('Lembrete')
      expect(m.controles.length).toBeGreaterThanOrEqual(32)
      for (const alvo of [...m.controles, ...m.alvosComFila]) {
        expect(alvo.nome).not.toBe('')
        expect(alvo.largura, alvo.nome).toBeGreaterThanOrEqual(44)
        expect(alvo.altura, alvo.nome).toBeGreaterThanOrEqual(44)
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}, 30000)
