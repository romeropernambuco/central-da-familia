import { build } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore Dependência do ambiente de teste, fora dos tipos do navegador.
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
// @ts-ignore Dependência do ambiente de teste, fora dos tipos do navegador.
import { spawnSync } from 'node:child_process'
// @ts-ignore Dependência do ambiente de teste, fora dos tipos do navegador.
import { tmpdir } from 'node:os'
// @ts-ignore Dependência do ambiente de teste, fora dos tipos do navegador.
import { join } from 'node:path'
// @ts-ignore Dependência do ambiente de teste, fora dos tipos do navegador.
import { env } from 'node:process'
// @ts-ignore Dependência do ambiente de teste, fora dos tipos do navegador.
import { pathToFileURL } from 'node:url'
import type { DadosInicio } from '../dadosExemplo'

export const chromium = [
  env.BROWSER_CHROME, join(env.ProgramFiles ?? '', 'Google/Chrome/Application/chrome.exe'),
  join(env['ProgramFiles(x86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(caminho => caminho && existsSync(caminho))

const verificacao = String.raw`
const cenarios = ['claro', 'escuro'].flatMap(tema => [375, 1280, 1440].map(largura => ({ tema, largura })));
const quadros = cenarios.map(({ tema, largura }) => {
  const celular = largura === 375;
  const dispositivo = celular ? 'celular' : 'desktop';
  const lab = document.createElement('div');
  lab.className = 'lab';
  lab.dataset.theme = tema;
  lab.innerHTML = '<div class="lab-amostra" data-dispositivo="' + dispositivo +
    '" style="--largura:' + largura + 'px"><div class="lab-quadro"><div class="lab-conteudo"></div></div></div>';
  document.body.append(lab);
  const quadro = lab.querySelector('.lab-quadro');
  const root = createRoot(quadro.firstElementChild);
  const render = oculto => flushSync(() => root.render(createElement(PrivacidadePropostas.Provider, { value: oculto },
    createElement(Proposta, { dados, tema, dispositivo }))));
  render(false);
  return { quadro, render, celular, largura };
});

async function rodar() {
  await document.fonts.ready;
  const medicoes = quadros.map(({ quadro, celular, largura }) => {
    const caixa = seletor => quadro.querySelector(seletor).getBoundingClientRect();
    const contorno = quadro.getBoundingClientRect();
    const menu = caixa('.m-menu');
    const escritorio = caixa('.m-escritorio');
    const fila = caixa('.m-fila');
    const rumo = caixa('.m-rumo');
    const numeros = medirNumeros(quadro);
    quadro.scrollTop = 420;
    const menuRolado = caixa('.m-menu');
    quadro.scrollTop = 0;
    quadro.querySelector('.m-menu details').open = true;
    quadro.querySelector('.m-escritorio details').open = true;
    const controles = [...quadro.querySelectorAll('button, summary, select')]
      .filter(el => el.getClientRects().length > 0).map(el => {
        const caixa = el.getBoundingClientRect();
        return { largura: caixa.width, altura: caixa.height,
          nome: el.getAttribute('aria-label') || el.labels?.[0]?.textContent || el.textContent };
      });
    quadro.querySelector('.m-menu details').open = false;
    quadro.querySelector('.m-escritorio details').open = false;
    return {
      largura: quadro.clientWidth,
      altura: quadro.clientHeight,
      numeros,
      semTransbordo: quadro.scrollWidth === largura,
      numerosInteiros: [...quadro.querySelectorAll('.numero-financeiro')].every(numero => {
        const faixa = document.createRange();
        faixa.selectNodeContents(numero);
        return faixa.getBoundingClientRect().right <= numero.closest('.m-cartao').getBoundingClientRect().right;
      }),
      menuFixo: menu.bottom <= contorno.bottom && Math.abs(menuRolado.top - menu.top) < 1,
      ordem: celular ? fila.top >= escritorio.bottom && rumo.top >= fila.bottom
        : rumo.left > escritorio.right && rumo.top === escritorio.top && fila.top >= escritorio.bottom &&
          escritorio.width / rumo.width > 1.45 && escritorio.width / rumo.width < 1.55,
      controles,
    };
  });
  const { quadro, render } = quadros[0];
  const achar = (seletor, rotulo) => [...quadro.querySelectorAll(seletor)].find(el => el.textContent.trim() === rotulo);
  const clicar = el => flushSync(() => el.click());
  const passos = {};
  for (const [rotulo, titulo] of [['Orçamento', 'Hoje você pode gastar'], ['Faturas', 'Faturas'],
    ['Escritório', 'Escritório'], ['Início', 'Central da Família']]) {
    const botao = achar('.m-menu > button', rotulo);
    clicar(botao);
    passos[rotulo] = document.activeElement.textContent === titulo && botao.getAttribute('aria-current') === 'location';
  }
  const mais = quadro.querySelector('.m-menu details');
  mais.open = true;
  clicar(achar('.m-mais button', 'Plano 2029'));
  passos.mais = !mais.open && document.activeElement.textContent === 'Rumo a 2029' &&
    mais.querySelector('summary').getAttribute('aria-current') === 'location';
  const posto = quadro.querySelector('.m-palco [data-renderizacao="svg"] button.maquete-posto');
  if (!posto) throw new Error('A maquete SVG não mostrou um posto interativo.');
  posto.focus();
  passos.cena = document.activeElement === posto && posto.tabIndex === 0;
  clicar(posto);
  passos.cena = passos.cena && document.activeElement.matches('.m-ficha h3') && !!quadro.querySelector('.m-ficha');
  clicar(quadro.querySelector('[aria-label="Fechar ficha"]'));
  quadro.querySelector('.m-escritorio details').open = true;
  const trabalho = quadro.querySelector('.m-equipe button');
  trabalho.focus();
  passos.postoFocavel = document.activeElement === trabalho && trabalho.tabIndex === 0 && trabalho.type === 'button';
  clicar(trabalho);
  passos.ficha = document.activeElement.matches('.m-ficha h3') && document.activeElement.textContent === trabalho.textContent;
  clicar(quadro.querySelector('[aria-label="Fechar ficha"]'));
  passos.fechar = !quadro.querySelector('.m-ficha') && document.activeElement.textContent === 'Escritório';
  clicar(achar('.m-acoes button', 'Abrir'));
  passos.detalhe = quadro.querySelector('.m-detalhe')?.textContent.includes('98.765,43');
  render(true);
  passos.olho = quadro.querySelector('.m-detalhe')?.textContent === 'Detalhes financeiros ocultos' &&
    !quadro.querySelector('.m-posicao, .m-avanco, [data-numero-financeiro]') &&
    !/R\$|73,25%|31\/79|98\.765,43/.test(quadro.innerHTML);
  render(false);
  clicar(achar('.m-acoes button', 'Já fiz'));
  passos.feita = !quadro.querySelector('.m-tarefa') && quadro.querySelector('.m-saude').textContent.includes('Nenhuma decisão');
  clicar(achar('.m-retorno button', 'Desfazer'));
  passos.desfeita = !!quadro.querySelector('.m-tarefa');
  clicar(achar('.m-acoes button', 'Depois'));
  clicar(achar('.m-filtros button', 'Adiadas'));
  passos.adiada = !!achar('.m-acoes button', 'Retomar');
  clicar(achar('.m-acoes button', 'Retomar'));
  passos.retomada = !!achar('.m-acoes button', 'Já fiz');
  return { medicoes, passos };
}
`

interface Resultado {
  erro?: string
  medicoes: {
    largura: number; altura: number; numeros: string[]
    semTransbordo: boolean; numerosInteiros: boolean; menuFixo: boolean; ordem: boolean
    controles: { largura: number; altura: number; nome: string }[]
  }[]
  passos: Record<string, boolean>
}

export async function verificarNavegador(dados: DadosInicio) {
  const entrada = '\0verificar-proposta-m'
  const resultado = await build({
    configFile: false, logLevel: 'silent', base: './',
    plugins: [react(), {
      name: 'verificar-proposta-m',
      resolveId: id => id === entrada ? id : undefined,
      load: id => id === entrada ? `
        import { createElement } from 'react';
        import { createRoot } from 'react-dom/client';
        import { flushSync } from 'react-dom';
        import { Proposta } from '/src/propostas/m/Proposta.tsx';
        import { PrivacidadePropostas } from '/src/propostas/comuns/privacidade.tsx';
        import { medirNumeros } from '/src/propostas/medicao.ts';
        import '/src/propostas/base.css';
        const dados = ${JSON.stringify(dados)};
        ${verificacao}
        rodar().then(
          r => document.querySelector('pre').textContent = encodeURIComponent(JSON.stringify(r)),
          e => document.querySelector('pre').textContent = encodeURIComponent(JSON.stringify({ erro: String(e.stack || e) })),
        );
      ` : undefined,
    }],
    build: {
      write: false, assetsInlineLimit: 100_000, minify: false, copyPublicDir: false, cssCodeSplit: false,
      rollupOptions: { input: entrada, output: { format: 'iife', inlineDynamicImports: true } },
    },
  })
  if (!('output' in resultado)) throw new Error('O Vite não devolveu a prévia.')
  const pasta = mkdtempSync(join(tmpdir(), 'proposta-m-'))
  try {
    for (const arquivo of resultado.output) {
      // Arquivos de fonte são incorporados pelo Vite.
      if (arquivo.type === 'asset' && !arquivo.fileName.endsWith('.css')) continue
      writeFileSync(join(pasta, arquivo.fileName.split('/').pop()!), arquivo.type === 'chunk' ? arquivo.code : arquivo.source)
    }
    const folha = resultado.output.find(a => a.fileName.endsWith('.css'))?.fileName.split('/').pop()
    if (!folha) throw new Error('O Vite não devolveu o CSS da prévia.')
    const script = resultado.output.find(a => a.type === 'chunk')!.fileName.split('/').pop()
    const arquivo = join(pasta, 'previa.html')
    writeFileSync(arquivo, `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${folha}">
      <pre></pre><script src="${script}"></script>`)
    const processo = spawnSync(chromium!, ['--headless', '--no-sandbox', '--no-first-run', '--disable-gpu',
      '--disable-background-networking', '--force-prefers-reduced-motion',
      '--user-data-dir=' + join(pasta, 'perfil'), '--window-size=1480,960',
      '--virtual-time-budget=5000', '--dump-dom', pathToFileURL(arquivo).href],
    { encoding: 'utf8', timeout: 20000, maxBuffer: 8_000_000 })
    if (processo.status !== 0) throw new Error(processo.error?.message ?? processo.stderr)
    const captura = processo.stdout.match(/<pre>([^<]+)<\/pre>/)?.[1]
    if (!captura) throw new Error('O Chromium não devolveu as verificações da prévia.')
    const ret = JSON.parse(decodeURIComponent(captura)) as Resultado
    if (ret.erro) throw new Error(ret.erro)
    return ret
  } finally {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}
