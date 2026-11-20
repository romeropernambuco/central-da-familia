import { rollup } from 'rollup'
import ts from 'typescript'
// @ts-ignore Os tipos de Node ficam fora do app.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
// @ts-ignore Os tipos de Node ficam fora do app.
import { spawnSync } from 'node:child_process'
// @ts-ignore Os tipos de Node ficam fora do app.
import { tmpdir } from 'node:os'
// @ts-ignore Os tipos de Node ficam fora do app.
import { join, resolve } from 'node:path'
// @ts-ignore Os tipos de Node ficam fora do app.
import { pathToFileURL } from 'node:url'
// @ts-ignore Os tipos de Node ficam fora do app.
import { env } from 'node:process'
import type { DadosInicio } from '../dadosExemplo'
import type { Dispositivo, Tema } from '../Propostas'

export const chrome = [
  env.BROWSER_CHROME,
  join(env.ProgramFiles || '', 'Google/Chrome/Application/chrome.exe'),
  join(env['ProgramFiles(x86)'] || '', 'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(caminho => caminho && existsSync(caminho))

const pasta = 'src/propostas/i'
const fixture = '\0previa-proposta-i'

async function codigoDoNavegador() {
  const estilos = /(?:\.css$|^@fontsource-variable\/)/
  const pacote = await rollup({
    input: fixture,
    external: ['react', 'react-dom', 'lucide-react'],
    plugins: [
      {
        name: 'fixture-tsx',
        resolveId(id, importador) {
          if (id === fixture || estilos.test(id)) return id
          if (!importador || !id.startsWith('.')) return null
          const caminho = resolve(importador, '..', id)
          return [caminho + '.tsx', caminho + '.ts', join(caminho, 'index.ts')].find(existsSync)
        },
        load(id) {
          if (estilos.test(id)) return ''
          if (id === fixture)
            return [
              'export { Proposta } from ' + JSON.stringify(resolve(pasta, 'Proposta.tsx')),
              'export { medirNumeros } from ' + JSON.stringify(resolve('src/propostas/medicao.ts')),
            ].join('\n')
        },
        transform(codigo, id) {
          if (!/\.tsx?$/.test(id)) return
          const fonte = id.endsWith('.tsx') ? "import React from 'react';\n" + codigo : codigo
          return ts.transpileModule(fonte, {
            compilerOptions: {
              target: ts.ScriptTarget.ES2020,
              module: ts.ModuleKind.ESNext,
              jsx: ts.JsxEmit.React,
            },
            fileName: id,
          }).outputText
        },
      },
    ],
  })
  try {
    const { output } = await pacote.generate({
      format: 'iife',
      name: 'Previas',
      globals: { react: 'React', 'react-dom': 'ReactDOM', 'lucide-react': 'LucideReact' },
    })
    return output[0].code
  } finally {
    await pacote.close()
  }
}

const executar = String.raw`
const saida = document.querySelector('#resultado');
function rodar() {
  const quadros = [];
  for (const dados of snapshots) for (const cenario of cenarios) {
    const item = document.createElement('div');
    item.className = 'lab';
    item.dataset.theme = cenario.tema;
    item.innerHTML = '<div class="lab-amostra" data-dispositivo="' + cenario.dispositivo +
      '"><div class="lab-quadro"><div class="lab-conteudo" data-proposta="i"></div></div></div>';
    document.querySelector('#previas').append(item);
    const quadro = item.querySelector('.lab-quadro');
    const root = ReactDOM.createRoot(quadro.firstElementChild);
    ReactDOM.flushSync(() => root.render(React.createElement(Previas.Proposta, { ...cenario, dados })));
    quadros.push({ quadro, root });
  }
  return document.fonts.ready.then(() => {
    const medicoes = quadros.map(({ quadro }) => {
      const q = quadro.getBoundingClientRect();
      const nav = quadro.querySelector('.i-nav').getBoundingClientRect();
      return {
        valores: Previas.medirNumeros(quadro),
        semTransbordo: quadro.scrollWidth === quadro.clientWidth,
        menuVisivel: nav.top < q.bottom && nav.bottom <= q.bottom && nav.left >= q.left && nav.right <= q.right,
        controles: [...quadro.querySelectorAll('button, summary')].filter(el => el.checkVisibility()).map(el => ({
          nome: (el.getAttribute('aria-label') || el.textContent).trim(),
          largura: el.getBoundingClientRect().width,
          altura: el.getBoundingClientRect().height,
        })),
      };
    });
    const { quadro: q, root } = quadros[4];
    const botao = (seletor, nome) => [...q.querySelectorAll(seletor)].find(el => el.textContent.trim() === nome);
    const click = el => ReactDOM.flushSync(() => el.click());
    const verificacoes = {};
    click(botao('.i-nav button', 'Orçamento'));
    verificacoes.orcamento = document.activeElement.textContent === 'Hoje você pode gastar' &&
      botao('.i-nav button', 'Orçamento').getAttribute('aria-current') === 'location';
    click(q.querySelector('.i-mais summary'));
    click(botao('.i-mais-opcoes button', 'Plano 2029'));
    verificacoes.mais = document.activeElement.textContent === 'Rumo a 2029' && !q.querySelector('.i-mais').open;
    click(botao('.i-nav button', 'Escritório'));
    verificacoes.escritorio = document.activeElement.textContent === 'Escritório da família';
    const posto = q.querySelector('button.maquete-posto');
    posto.focus();
    verificacoes.postoFocavel = document.activeElement === posto && posto.tabIndex === 0;
    click(posto);
    verificacoes.ficha = document.activeElement.matches('.i-ficha h3') && !!q.querySelector('.i-ficha h3');
    click(botao('.i-salas button', 'Casa'));
    verificacoes.sala = !!q.querySelector('[data-sala="casa"][data-destaque="true"]') &&
      !!q.querySelector('[aria-label="Pessoas na sala"]');
    click(botao('.i-acoes button', 'Abrir'));
    verificacoes.detalhe = !!q.querySelector('.i-detalhe-tarefa:not([hidden])');
    click(botao('.i-acoes button', 'Já fiz'));
    verificacoes.feita = !q.querySelector('.i-fila').textContent.includes('Revisar cobrança');
    click(botao('.i-desfazer button', 'Desfazer'));
    verificacoes.desfeita = q.querySelector('.i-fila').textContent.includes('Revisar cobrança');
    click(botao('.i-acoes button', 'Depois'));
    click(botao('.i-fila button', 'Ver todos'));
    verificacoes.lembrete = q.querySelector('.i-fila').textContent.includes('Retomar lembrete');
    click(botao('.i-pastas button', 'Depois'));
    verificacoes.adiada = q.querySelector('.i-fila').textContent.includes('Revisar cobrança');
    click(botao('.i-acoes button', 'Retomar'));
    click(botao('.i-pastas button', 'Agora'));
    verificacoes.retomada = q.querySelector('.i-fila').textContent.includes('Revisar cobrança');
    click(botao('.i-salas button', 'Todas as salas'));
    click(q.querySelector('.maquete-posto[aria-label^="Ajudante dos Imóveis"]'));
    verificacoes.balaoNaFicha = !q.querySelector('.maquete-balao') &&
      q.querySelector('.i-ficha').textContent.includes('8.102,39');
    const detalhe = q.querySelector('.i-cenario');
    click(detalhe.querySelector('summary'));
    return new Promise(resolve => detalhe.addEventListener('toggle', () => setTimeout(resolve, 0), { once: true })).then(() => {
      verificacoes.cenarioAberto = !!detalhe.querySelector('[data-numero-financeiro]');
      ReactDOM.flushSync(() => root.render(React.createElement(Previas.Proposta, { ...cenarios[0], dados: snapshots[1], oculto: true })));
      verificacoes.cenarioMascarado = !q.querySelector('[data-numero-financeiro], .i-posicao, .i-cobertura') &&
        detalhe.textContent.includes('Diferença mensal sem margem') && !q.textContent.includes('8.102,39');
      return { medicoes, verificacoes };
    });
  });
}
Promise.resolve().then(rodar).then(
  r => saida.textContent = encodeURIComponent(JSON.stringify(r)),
  erro => saida.textContent = encodeURIComponent(JSON.stringify({ erro: String(erro.stack || erro) }))
);
`

interface Resultado {
  erro?: string
  medicoes: {
    valores: string[]
    semTransbordo: boolean
    menuVisivel: boolean
    controles: { nome: string; altura: number; largura: number }[]
  }[]
  verificacoes: Record<string, boolean>
}

export async function medirNoChromium(dados: DadosInicio[], cenarios: { tema: Tema; dispositivo: Dispositivo }[]) {
  const dir = mkdtempSync(join(tmpdir(), 'proposta-i-'))
  try {
    const estilos = [
      'src/propostas/base.css',
      'src/propostas/comuns/escritorio-maquete.css',
      'src/componentes/ilustracoes/ilustracoes.css',
      pasta + '/bento.css',
    ]
      .map(arq => ts.sys.readFile(arq))
      .join('\n')
    const fontes = [
      ['bricolage-grotesque', 'Bricolage Grotesque'],
      ['inter', 'Inter'],
    ]
      .map(([pacote, nome]) => {
        const fonte = readFileSync(
          'node_modules/@fontsource-variable/' + pacote + '/files/' + pacote + '-latin-wght-normal.woff2',
        ).toString('base64')
        return (
          '@font-face{font-family:"' +
          nome +
          ' Variable";src:url(data:font/woff2;base64,' +
          fonte +
          ');font-weight:100 900}'
        )
      })
      .join('\n')
    const biblioteca = (arq: string) => readFileSync('node_modules/' + arq, 'utf8')
    const libs = [
      biblioteca('react/umd/react.production.min.js'),
      biblioteca('react-dom/umd/react-dom.production.min.js'),
      'globalThis.react = globalThis.React;',
      biblioteca('lucide-react/dist/umd/lucide-react.min.js'),
    ].join('\n;\n')
    const arquivo = join(dir, 'casca.html')
    const snapshots = JSON.stringify(dados).replace(/</g, '\\u003c')
    writeFileSync(
      arquivo,
      '<!doctype html><meta charset="utf-8"><style>' +
        fontes +
        '\n' +
        estilos +
        '</style>' +
        '<main id="previas"></main><pre id="resultado"></pre><script>' +
        'window.addEventListener("error", e => document.querySelector("#resultado").textContent = encodeURIComponent(JSON.stringify({erro:e.message})));' +
        '</script><script>' +
        libs +
        '\n' +
        (await codigoDoNavegador()) +
        '\n' +
        'const snapshots=' +
        snapshots +
        ';const cenarios=' +
        JSON.stringify(cenarios) +
        ';' +
        executar +
        '</script>',
    )
    const processo = spawnSync(
      chrome!,
      [
        '--headless',
        '--no-sandbox',
        '--no-first-run',
        '--disable-gpu',
        '--disable-background-networking',
        '--user-data-dir=' + join(dir, 'perfil'),
        '--window-size=1440,900',
        '--virtual-time-budget=5000',
        '--dump-dom',
        pathToFileURL(arquivo).href,
      ],
      { encoding: 'utf8', timeout: 22000, maxBuffer: 8_000_000 },
    )
    if (processo.status !== 0) throw new Error(processo.error?.message ?? processo.stderr)
    const captura = processo.stdout.match(/<pre id="resultado">([^<]+)<\/pre>/)?.[1]
    if (!captura) throw new Error('O Chromium não devolveu a medição. ' + processo.stderr)
    const resultado = JSON.parse(decodeURIComponent(captura)) as Resultado
    if (resultado.erro) throw new Error(resultado.erro)
    return resultado
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    } catch {
      // pasta temporária presa pelo navegador no Windows: o sistema limpa depois, o teste não falha por isso
    }
  }
}
