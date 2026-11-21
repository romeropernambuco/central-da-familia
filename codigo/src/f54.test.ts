import { act, createElement, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
// @ts-expect-error Node é fornecido pelo Vitest.
import { readFileSync } from 'node:fs'
import { App } from './app/App'
import { ContextoApp, type Ctx } from './app/contexto'
import { apiExemplo } from './api/exemplo'
import { protegerApi } from './api/protegida'
import { lerRecebimentos } from './lib/resumo/leituras'
import { Ajustes } from './telas/ajustes/Ajustes'
import { Cartoes } from './telas/cartoes/Cartoes'
import { DocumentoTeste, NoTeste } from './telas/escritorio/numeros.dom-teste'
import { Inicio } from './telas/inicio/Inicio'

let ctx: Ctx
let box: NoTeste
let doc: DocumentoTeste
let root: ReturnType<typeof createRoot>
let aoCarregar: ReturnType<typeof vi.fn>
beforeEach(async () => {
  doc = new DocumentoTeste()
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), {
      document: doc,
      HTMLElement: NoTeste,
      HTMLIFrameElement: class {},
      scrollTo() {},
    }),
  )
  vi.stubGlobal('location', {
    origin: 'https://teste.local',
    pathname: '/app/',
    protocol: 'https:',
    search: '?sem3d',
    hash: '#/privacidade',
  })
  vi.stubGlobal('localStorage', { getItem: () => null, setItem() {} })
  aoCarregar = vi.fn()
  vi.stubGlobal('addEventListener', aoCarregar)
  vi.stubGlobal('removeEventListener', vi.fn())
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const sessao = (await apiExemplo.sessao())!
  const familia = { ...sessao.familias[0], papel: 'casal' as const }
  ctx = {
    api: { ...apiExemplo, membros: async () => [] },
    sessao,
    familia,
    oculto: false,
    versao: 0,
    toast: vi.fn(),
    tentar: async (f: () => Promise<unknown>) => {
      await f()
      return true
    },
    abrirLancar: vi.fn(),
  } as unknown as Ctx
  box = doc.createElement('div')
  doc.body.appendChild(box)
  root = createRoot(box as unknown as HTMLElement)
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})
async function montar(el: ReactElement) {
  await act(async () => root.render(createElement(ContextoApp.Provider, { value: { ...ctx } }, el)))
}

it('4 e 5: convite oculto usa botão nativo e o nome longo fica fora do elemento truncado', async () => {
  const nome = 'NomeCompletoDeCadastroSemEspacos'.repeat(3)
  ctx.api.convites = async () => [
    { id: 'convite', nome, email: 'convite@teste.local', papel: 'pessoa', situacao: 'esperando' },
  ]
  ctx.api.reenviarConvite = vi.fn(async () => {})
  await montar(createElement(Ajustes))
  const reenviar = () => box.buscar(n => n.textContent === 'Reenviar' && ['A', 'BUTTON'].includes(n.tagName))[0]
  expect(reenviar().getAttribute('href')).toContain('wa.me')
  const linha = box.buscar(n => n.getAttribute('class') === 'li quem')[0]
  const editar = linha.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Editar nome')[0]
  expect(editar.parentNode?.tagName).not.toBe('B')
  expect(editar.parentNode?.textContent).toContain(nome)
  const css = readFileSync('src/telas/ajustes/ajustes.css', 'utf8')
  expect(css).toMatch(/\.quem-nome\{[^}]*white-space:normal;overflow-wrap:anywhere/)
  ctx.oculto = true
  await montar(createElement(Ajustes))
  expect(reenviar().tagName).toBe('BUTTON')
  expect(reenviar().getAttribute('type')).toBe('button')
  expect(reenviar().getAttribute('href')).toBeNull()
  await act(async () => reenviar().click())
  expect(ctx.toast).toHaveBeenCalledWith('Abra o olho para compartilhar este convite.')
  expect(ctx.api.reenviarConvite).not.toHaveBeenCalled()
})

it('4: convite recém-criado mantém ação de WhatsApp no teclado com o olho fechado', async () => {
  ctx.api.convidar = vi.fn(async () => ({ ok: true }))
  await montar(createElement(Ajustes))
  for (const [placeholder, valor] of [
    ['Ex.: Helena', 'Helena'],
    ['pessoa@email.com', 'helena@teste.local'],
  ]) {
    const input = box.buscar(n => n.getAttribute('placeholder') === placeholder)[0]
    const props = Object.entries(input).find(([k]) => k.startsWith('__reactProps'))![1] as {
      onChange(evento: object): void
    }
    await act(async () => props.onChange({ target: { value: valor } }))
  }
  await act(async () => box.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Convidar')[0].click())
  const abrir = () =>
    box.buscar(n => ['A', 'BUTTON'].includes(n.tagName) && n.textContent === 'Abrir o WhatsApp com o convite')[0]
  expect(abrir().tagName).toBe('A')
  expect(abrir().getAttribute('href')).toContain('wa.me')
  ctx.oculto = true
  await montar(createElement(Ajustes))
  expect(abrir().tagName).toBe('BUTTON')
  expect(abrir().getAttribute('href')).toBeNull()
  await act(async () => abrir().click())
  expect(ctx.toast).toHaveBeenCalledWith('Abra o olho para compartilhar este convite.')
  expect(ctx.api.convidar).toHaveBeenCalledOnce()
})

it('6: foco do aviso e contorno do segmento atingem 3:1 em ambos os temas', () => {
  const estilos = readFileSync('src/estilo.css', 'utf8')
  const apoio = readFileSync('src/componentes/apoio-f32.css', 'utf8')
  expect(apoio).toContain('.toast.f32-feedback button:focus-visible{outline-color:var(--toast-ink)}')
  expect(estilos).toMatch(/\.seg button\[aria-pressed="true"\]\{[^}]*inset 0 0 0 2px var\(--ink\)/)
  const luminancia = (hex: string) =>
    hex.match(/../g)!.reduce((s, componente, i) => {
      const c = parseInt(componente, 16) / 255
      return s + (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i]
    }, 0)
  for (const tema of [0, 1]) {
    const token = (nome: string) =>
      luminancia([...estilos.matchAll(new RegExp('--' + nome + ':#([a-f0-9]{6})', 'gi'))][tema][1])
    for (const [frente, fundo] of [
      ['toast-ink', 'toast-bg'],
      ['ink', 'surface'],
      ['ink', 'raised'],
    ]) {
      const a = token(frente),
        b = token(fundo)
      expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), frente + '/' + fundo).toBeGreaterThanOrEqual(3)
    }
  }
})

it('7: Privacidade tem pílula própria na lateral e no Mais, sem ativar Ajustes', async () => {
  await montar(createElement(App))
  const ajustes = box.buscar(n => n.getAttribute('href') === '#/ajustes')[0]
  expect(ajustes.getAttribute('aria-current')).toBeNull()
  const privacidade = box.buscar(n => n.getAttribute('href') === '#/privacidade')[0]
  expect(privacidade.getAttribute('aria-current')).toBe('page')
  const mais = box.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Mais')[0]
  expect(mais.getAttribute('data-ativo')).toBe('true')
  await act(async () => mais.click())
  const atuais = box
    .buscar(n => n.getAttribute('role') === 'dialog')[0]
    .buscar(n => n.getAttribute('aria-current') === 'page')
  expect(atuais).toHaveLength(1)
  expect(atuais[0].textContent).toContain('Privacidade')
})

const telasDoCasal = [
  'inicio',
  'lancamentos',
  'orcamento',
  'cartoes',
  'casa',
  'desejos',
  'guardado',
  'planejamento',
  'escritorio',
  'ajustes',
  'privacidade',
]
const telasDaPessoa = ['inicio', 'lancamentos', 'orcamento', 'casa', 'desejos', 'ajustes', 'privacidade']
const rotulos: Record<string, string> = {
  inicio: 'Início',
  lancamentos: 'Gastos e entradas',
  orcamento: 'Meu orçamento',
  cartoes: 'Cartões',
  casa: 'Casa',
  desejos: 'Desejos',
  guardado: 'Guardado',
  planejamento: 'Planejamento',
  escritorio: 'Escritório',
  ajustes: 'Família e ajustes',
  privacidade: 'Privacidade',
  painel: 'Painel do dono',
}
const papeis = [
  ['casal', true, [...telasDoCasal, 'painel']],
  ['casal', false, telasDoCasal],
  ['pessoa', false, telasDaPessoa],
  ['equipe', false, ['casa', 'privacidade']],
] as const

it.each(papeis)(
  'as rotas do menu funcionam no desktop e no celular para %s (dono: %s)',
  async (papel, dono, esperadas) => {
    ctx.familia = { ...ctx.familia!, papel }
    ctx.sessao = { ...ctx.sessao!, dono }
    await montar(createElement(App))
    const navegar = () => {
      for (const [evento, fn] of aoCarregar.mock.calls) if (evento === 'hashchange') fn()
    }
    const links = (rotulo: string) =>
      box.buscar(n => n.tagName === 'NAV' && n.getAttribute('aria-label') === rotulo)[0].buscar(n => n.tagName === 'A')
    const rota = (n: NoTeste) => n.getAttribute('href')!.slice(2)
    const conferirTela = (r: string) =>
      expect(box.buscar(n => n.getAttribute('id') === 'titulo-tela')[0].textContent).toBe(
        r === 'painel' ? 'Os 4 números' : rotulos[r],
      )
    const lateral = links('Telas no computador')
    expect(lateral.map(rota)).toEqual(esperadas)
    for (const link of lateral) {
      await act(async () => {
        location.hash = link.getAttribute('href')!
        navegar()
        await vi.dynamicImportSettled()
      })
      expect(link.getAttribute('aria-current')).toBe('page')
      conferirTela(rota(link))
    }
    if (papel === 'equipe') {
      expect(box.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Mais')).toHaveLength(0)
      expect(box.buscar(n => n.getAttribute('aria-label') === 'Anotar').map(n => n.textContent)).toEqual([
        'Anotar compra',
      ])
      await act(async () => {
        location.hash = '#/guardado'
        navegar()
      })
      conferirTela('casa')
      expect(box.buscar(n => n.getAttribute('data-referencia') !== null)).toHaveLength(0)
      return
    }
    const inferior = links('Telas no celular')
    for (const link of inferior) {
      await act(async () => {
        location.hash = link.getAttribute('href')!
        navegar()
        await vi.dynamicImportSettled()
      })
      conferirTela(rota(link))
    }
    const mais = () => box.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Mais')[0]
    const extras = () =>
      box.buscar(n => n.getAttribute('class') === 'list central-extras')[0].buscar(n => n.tagName === 'BUTTON')
    await act(async () => mais().click())
    const restantes = esperadas.filter(r => !inferior.some(n => rota(n) === r))
    expect(extras().map(n => n.buscar(m => m.tagName === 'B')[0].textContent)).toEqual(restantes.map(r => rotulos[r]))
    for (const r of restantes) {
      await act(async () => {
        if (mais().getAttribute('aria-expanded') === 'false') mais().click()
      })
      await act(async () => {
        extras()
          .find(n => n.textContent.startsWith(rotulos[r]))!
          .click()
        navegar()
        await vi.dynamicImportSettled()
      })
      expect(location.hash).toBe('#/' + r)
      conferirTela(r)
    }
    await act(async () => box.buscar(n => n.getAttribute('aria-label') === 'Anotar gasto')[0].click())
    expect(ctx.abrirLancar).toHaveBeenCalledOnce()
  },
)

it('8: últimos lançamentos usa botão compartilhado e cartão sem fatura tem texto próprio', async () => {
  ctx.api.lancamentos = async () => {
    throw new Error('offline')
  }
  await montar(createElement(Inicio))
  const retry = box
    .buscar(n => n.getAttribute('class') === 'card inicio-lancamentos')[0]
    .buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Tentar de novo')[0]
  expect(retry.getAttribute('class')).toMatch(/\bbtn\b/)
  expect(readFileSync('src/estilo.css', 'utf8')).toMatch(/\.btn,[^{]*\{min-height:44px;min-width:44px/)
  ctx.api.cartoes = async () => [
    { id: 'novo', nome: 'Cartão novo', titular: ctx.familia!.membroNome } as Awaited<
      ReturnType<Ctx['api']['cartoes']>
    >[number],
  ]
  ctx.api.faturas = async () => []
  await montar(createElement(Cartoes))
  const cartao = box.buscar(n => n.getAttribute('aria-label')?.startsWith('Cartão Cartão novo') ?? false)[0]
  expect(cartao.textContent).toContain('Nenhuma fatura neste cartão ainda.')
  expect(cartao.textContent).not.toContain('Próximas 0 faturas')
})

it('9: restrições compactas ficam dentro do breakpoint móvel', () => {
  const css = readFileSync('src/componentes/agente-cartao.css', 'utf8')
  const movel = css.split('@media(max-width:600px){')[1]
  expect(movel).toContain('.agente-aba .perg{padding:0;background:none}')
  expect(css.split('@media(max-width:600px){')[0]).toContain('.agente-aba .perg{padding:16px')
})

it('12: partida baixada após load registra SW imediatamente', async () => {
  Object.assign(doc, { readyState: 'complete' })
  const register = vi.fn(async () => ({ update: async () => {} }))
  vi.stubGlobal('navigator', { serviceWorker: { register } })
  await import('./partida')
  expect(register).toHaveBeenCalledWith('./sw.js', { updateViaCache: 'none' })
  expect(aoCarregar).not.toHaveBeenCalledWith('load', expect.any(Function), expect.anything())
})

it('15: projeção e recebimentos compartilham as duas leituras de configuração', async () => {
  const config = vi.fn(async <T>(_familia: string, _chave: string, padrao: T) => padrao)
  const interna = { ...apiExemplo, modo: 'real' as const, config, recebimentos: async () => [] }
  const montarFuturo = interna.futuroEntradas!
  interna.futuroEntradas = async function (familia) {
    await Promise.all([this.config(familia, 'fontes_receita', {}), this.config(familia, 'receitas_controle', {})])
    return montarFuturo.call(this, familia)
  }
  const api = protegerApi(interna)
  await Promise.all([api.futuroEntradas!('teste'), lerRecebimentos(api, 'teste')])
  expect(config.mock.calls.map(([, chave]) => chave).sort()).toEqual(['fontes_receita', 'receitas_controle'])
})
