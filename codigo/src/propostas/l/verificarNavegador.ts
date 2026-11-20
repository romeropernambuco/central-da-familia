import { rollup } from 'rollup'
import ts from 'typescript'
// @ts-ignore APIs do Node usadas apenas no teste de navegador.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
// @ts-ignore APIs do Node usadas apenas no teste de navegador.
import { spawn } from 'node:child_process'
// @ts-ignore APIs do Node usadas apenas no teste de navegador.
import { tmpdir } from 'node:os'
// @ts-ignore APIs do Node usadas apenas no teste de navegador.
import { dirname, join, resolve } from 'node:path'
// @ts-ignore APIs do Node usadas apenas no teste de navegador.
import { pathToFileURL } from 'node:url'
// @ts-ignore APIs do Node usadas apenas no teste de navegador.
import { env } from 'node:process'
import type { DadosInicio } from '../dadosExemplo'

export const chromium = [
  env.BROWSER_CHROME,
  join(env.ProgramFiles ?? '', 'Google/Chrome/Application/chrome.exe'),
  join(env['ProgramFiles(x86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].find(caminho => caminho && existsSync(caminho))

const pasta = 'src/propostas/l'
const entrada = '\0proposta-l'

async function montarPagina(snapshots: DadosInicio[]) {
  const estilo = /\.css$|^@fontsource-variable\//
  const pacote = await rollup({
    input: entrada,
    external: ['react', 'react-dom', 'lucide-react'],
    plugins: [
      {
        name: 'previa-l',
        resolveId(id, origem) {
          if (id === entrada || estilo.test(id)) return id
          if (id === 'three') return resolve('node_modules/three/build/three.module.js')
          if (!origem || !id.startsWith('.')) return null
          const caminho = resolve(dirname(origem), id)
          return [caminho + '.tsx', caminho + '.ts', join(caminho, 'index.ts')].find(existsSync)
        },
        load(id) {
          if (estilo.test(id)) return ''
          if (id === entrada)
            return [
              'export { Proposta } from ' + JSON.stringify(resolve(pasta, 'Proposta.tsx')),
              'export { PrivacidadePropostas } from ' + JSON.stringify(resolve('src/propostas/comuns/privacidade.tsx')),
              'export { medirNumeros } from ' + JSON.stringify(resolve('src/propostas/medicao.ts')),
            ].join('\n')
        },
        transform(codigo, id) {
          if (!/\.tsx?$/.test(id)) return
          const fonte = id.endsWith('.tsx') ? "import React from 'react';\n" + codigo : codigo
          return ts.transpileModule(fonte, {
            compilerOptions: {
              target: ts.ScriptTarget.ES2022,
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
      inlineDynamicImports: true,
      name: 'Previa',
      globals: { react: 'React', 'lucide-react': 'LucideReact' },
    })
    const ler = (arquivo: string) => readFileSync(arquivo, 'utf8')
    const estilos = [
      'src/propostas/base.css',
      'src/propostas/comuns/escritorio-maquete.css',
      'src/propostas/comuns/escritorio3d.css',
      'src/componentes/ilustracoes/ilustracoes.css',
      pasta + '/proposta.css',
    ].map(ler)
    for (const [pacoteFonte, nome] of [
      ['bricolage-grotesque', 'Bricolage Grotesque'],
      ['inter', 'Inter'],
    ]) {
      const bytes = readFileSync(
        `node_modules/@fontsource-variable/${pacoteFonte}/files/${pacoteFonte}-latin-wght-normal.woff2`,
      )
      estilos.push(
        `@font-face{font-family:"${nome} Variable";src:url(data:font/woff2;base64,${bytes.toString('base64')});font-weight:100 900}`,
      )
    }
    const libs = [
      'react/umd/react.production.min.js',
      'react-dom/umd/react-dom.production.min.js',
      'lucide-react/dist/umd/lucide-react.min.js',
    ].map(arquivo => ler('node_modules/' + arquivo))
    return (
      '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>' +
      estilos.join('\n') +
      '</style><div class="lab"><section class="lab-amostra"><div class="lab-quadro"><div class="lab-conteudo"></div></div></section></div><script>' +
      [...libs.slice(0, 2), 'globalThis.react = React', libs[2], output[0].code].join('\n;\n') +
      '\nconst snapshots=' +
      JSON.stringify(snapshots).replace(/</g, '\\u003c') +
      ';' +
      String.raw`
        const quadro = document.querySelector('.lab-quadro');
        const raiz = ReactDOM.createRoot(quadro.firstElementChild);
        const q = seletor => quadro.querySelector(seletor);
        const todos = seletor => [...quadro.querySelectorAll(seletor)];
        const texto = el => el?.textContent.trim();
        const botao = (seletor, nome) => todos(seletor).find(el => texto(el) === nome);
        const click = el => ReactDOM.flushSync(() => el.click());
        function montar(tema, dispositivo, largura, oculto = false, snapshot = 0) {
          const amostra = quadro.parentElement;
          amostra.closest('.lab').dataset.theme = tema;
          amostra.dataset.dispositivo = dispositivo;
          amostra.style.setProperty('--largura', largura + 'px');
          ReactDOM.flushSync(() => raiz.render(React.createElement(Previa.PrivacidadePropostas.Provider, { value: oculto },
            React.createElement(Previa.Proposta, { dados: snapshots[snapshot], tema, dispositivo }))));
          quadro.scrollTop = 0;
        }
      ` +
      '</script></html>'
    )
  } finally {
    await pacote.close()
  }
}

type Rodar = <T>(expressao: string) => Promise<T>
type Tecla = (key: 'Tab' | 'Enter' | 'Escape' | ' ') => Promise<void>

export async function noNavegador(snapshots: DadosInicio[], verificar: (rodar: Rodar, tecla: Tecla) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'proposta-l-'))
  try {
    const arquivo = join(dir, 'previa.html')
    writeFileSync(arquivo, await montarPagina(snapshots))
    const chrome = spawn(
      chromium!,
      [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--no-first-run',
        '--disable-background-networking',
        '--force-prefers-reduced-motion',
        '--window-size=1600,950',
        '--remote-debugging-port=0',
        '--user-data-dir=' + dir,
        pathToFileURL(arquivo).href,
      ],
      { stdio: 'ignore' },
    )
    const encerrado = new Promise<void>(ok => chrome.once('close', () => ok()))
    let socket: WebSocket | undefined
    try {
      const porta = join(dir, 'DevToolsActivePort')
      for (let i = 0; i < 50 && !existsSync(porta); i++) await new Promise(ok => setTimeout(ok, 100))
      const [port, caminho] = readFileSync(porta, 'utf8').trim().split(/\r?\n/)
      const conn = (socket = new WebSocket(`ws://127.0.0.1:${port}${caminho}`))
      await new Promise<void>((ok, falhou) => {
        conn.addEventListener('open', () => ok(), { once: true })
        conn.addEventListener('error', () => falhou(new Error('Chromium indisponível')), { once: true })
      })
      let id = 0
      function enviar<T>(method: string, params: object = {}, sessionId?: string) {
        const atual = ++id
        return new Promise<T>((ok, falhou) => {
          function receber(evento: MessageEvent<string>) {
            const resposta = JSON.parse(evento.data)
            if (resposta.id !== atual) return
            clearTimeout(tempo)
            conn.removeEventListener('message', receber)
            if (resposta.error) falhou(new Error(resposta.error.message))
            else ok(resposta.result)
          }
          const tempo = setTimeout(() => {
            conn.removeEventListener('message', receber)
            falhou(new Error(`Sem resposta do Chromium para ${method}`))
          }, 5000)
          conn.addEventListener('message', receber)
          conn.send(JSON.stringify({ id: atual, method, params, sessionId }))
        })
      }
      const { targetInfos } = await enviar<{ targetInfos: { targetId: string; type: string }[] }>('Target.getTargets')
      const { sessionId } = await enviar<{ sessionId: string }>('Target.attachToTarget', {
        targetId: targetInfos.find(t => t.type === 'page')!.targetId,
        flatten: true,
      })
      const rodar: Rodar = async <T>(expression: string) => {
        const { result, exceptionDetails } = await enviar<{
          result: { value: T; description?: string }
          exceptionDetails?: unknown
        }>('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)
        if (exceptionDetails) throw new Error(result.description)
        return result.value
      }
      for (let i = 0; i < 30 && !(await rodar<boolean>("typeof montar === 'function'")); i++)
        await new Promise(ok => setTimeout(ok, 100))
      await verificar(rodar, async key => {
        const codigo = { Tab: 9, Enter: 13, Escape: 27, ' ': 32 }[key]
        for (const type of ['keyDown', 'keyUp']) {
          const text =
            type === 'keyDown' ? { Tab: undefined, Enter: '\r', Escape: undefined, ' ': ' ' }[key] : undefined
          await enviar(
            'Input.dispatchKeyEvent',
            { type, key, windowsVirtualKeyCode: codigo, text, unmodifiedText: text },
            sessionId,
          )
        }
        await rodar('new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => ok(true))))')
      })
      await enviar('Browser.close')
    } finally {
      socket?.close()
      if (chrome.exitCode === null) chrome.kill()
      await encerrado
    }
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 100 })
  }
}
