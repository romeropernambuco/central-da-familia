import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { invalidarDados } from '../../app/invalidacao'
import type { Api, EscritorioHoje, FamiliaMinha, Papel, PerguntaEsc } from '../../api/tipos'
import { definirModoFuncionario } from '../../componentes/AgenteDaAba'
import { Inicio } from '../inicio/Inicio'
import { Escritorio } from './Escritorio'
import { EscritorioIsometrico } from './EscritorioIsometrico'
import { EQUIPE } from './equipe'
import { dadosIsometricos } from './dadosIsometricos'
import { DocumentoTeste, NoTeste } from './numeros.dom-teste'
// @ts-ignore: script Node usado na geração do build.
import { arquivosEssenciais } from '../../../scripts/sw.mjs'

const fake = vi.hoisted(() => ({
  montar: vi.fn(), atualizar: vi.fn(), destruir: vi.fn(), importarThree: vi.fn(), falhar: false,
}))
vi.mock('./tres', () => { fake.importarThree(); return {} })
vi.mock('./cenaIsometrica', () => ({
  montarEscritorioIsometrico: (_t: unknown, _el: unknown, opcoes: unknown) => {
    fake.montar(opcoes)
    if (fake.falhar) throw new Error('WebGL indisponível')
    return { atualizar: fake.atualizar, destruir: fake.destruir }
  },
}))
vi.mock('../inicio/ResumoFamilia', () => ({ ResumoFamilia: () => createElement('h2', null, 'Resumo da família') }))

const pergunta = (id: string, funcionario: string, valor?: number): PerguntaEsc => ({
  id, funcionario, valor, assunto: `Tarefa ${id}`, pergunta: `Você confirma ${id}?`, contexto: '', opcoes: [{ id: 'feito', rotulo: 'Confirmar' }],
})
function fonte(): EscritorioHoje {
  return {
    trabalhando: [{ funcionario: 'contador' }], entregue: [{ funcionario: 'analista_cartao', resumo: 'Conferido' }],
    funcionarios: [], precisa_total: 9,
    precisa_de_voce: [
      pergunta('guardado-1', 'gestor_guardado', 78432.19),
      pergunta('guardado-2', 'gestor_guardado', 9321.01),
      pergunta('feira', 'fiscal_feira', 29123.51),
      pergunta('recado', 'secretaria'),
    ],
  }
}

function montar(papel: Papel = 'casal', sem3d = false) {
  const doc = Object.assign(new DocumentoTeste(), { contains: () => false })
  const create = doc.createElement.bind(doc)
  doc.createElement = nome => Object.assign(create(nome), { focus() {} })
  const local = { search: sem3d ? '?sem3d=1' : '', hash: '#/escritorio' }
  vi.stubGlobal('document', doc)
  vi.stubGlobal('location', local)
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    document: doc, location: local, HTMLElement: NoTeste, HTMLIFrameElement: class {}, WebGLRenderingContext: class {},
  }))
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let dado = fonte()
  const familia = { id: 'f38', papel, membroId: 'm', envelopeId: 'e' } as FamiliaMinha
  const responder = vi.fn(async () => undefined)
  const api = {
    modo: 'real', escritorioHoje: async () => dado, escritorioResponder: responder, escritorioDiario: async () => [],
    lancamentos: async () => [], guardadoHoje: async () => ({ total: 1, aplicacoes: [] }),
    estoque: async () => ({ itens: [], contagens: [] }), avisosCasa: async () => [], config: async () => ({}),
  } as unknown as Api
  const ctx = { api, familia, oculto: false, versao: 0, sessao: { dono: true }, tentar: async (fn: () => Promise<void>) => {
    await fn()
    return true
  }, toast() {}, recarregar: async () => {} } as unknown as Ctx
  const el = doc.createElement('div')
  doc.body.appendChild(el)
  const root = createRoot(el as unknown as HTMLElement)
  definirModoFuncionario('completo')
  return {
    el, responder,
    render: async (Tela: typeof Inicio | typeof Escritorio | typeof EscritorioIsometrico, oculto = false) =>
      act(async () => root.render(createElement(ContextoApp.Provider, { value: { ...ctx, oculto } }, createElement(Tela, { superficie: 'escritorio' })))),
    ler: (attr: string, valor: string) => el.buscar(n => n.getAttribute(attr) === valor)[0],
    atualizar: async (outro: EscritorioHoje) => {
      dado = outro
      await act(async () => invalidarDados(api, familia.id, ['escritorio']))
    },
    fechar: () => act(async () => root.unmount()),
  }
}
afterEach(() => { fake.falhar = false; vi.clearAllMocks(); vi.unstubAllGlobals() })

it('f54: Início fora da área visível mostra o painel estático sem pedir Three', async () => {
  const a = montar()
  const observe = vi.fn(), disconnect = vi.fn()
  let visibilidade!: (entradas: { isIntersecting: boolean }[]) => void
  vi.stubGlobal('IntersectionObserver', class {
    constructor(notificar: typeof visibilidade) { visibilidade = notificar }
    observe = observe
    disconnect = disconnect
  })
  try {
    await a.render(Inicio)
    await act(async () => vi.dynamicImportSettled())
    expect(a.el.textContent).toContain('Escritório da família')
    expect(observe).toHaveBeenCalledOnce()
    await act(async () => visibilidade([{ isIntersecting: false }]))
    expect(fake.importarThree).not.toHaveBeenCalled()
    expect(fake.montar).not.toHaveBeenCalled()
    await act(async () => visibilidade([{ isIntersecting: true }]))
    await act(async () => vi.dynamicImportSettled())
    expect(fake.importarThree).toHaveBeenCalledOnce()
    expect(fake.montar).toHaveBeenCalledOnce()
    expect(fake.montar.mock.calls[0][0].etiqueta('contador')).toBe(a.ler('data-posto', 'contador'))
    expect(a.ler('data-posto', 'contador').textContent).toBe('')
    expect(disconnect).toHaveBeenCalled()
  } finally { await a.fechar() }
})

it('Início antes do Resumo e Escritório com a sala e a lista, usando a fila integral oficial', async () => {
  const a = montar()
  try {
    await a.render(Inicio)
    await act(async () => vi.dynamicImportSettled())
    const texto = a.el.textContent
    expect(texto.indexOf('Escritório da família')).toBeGreaterThanOrEqual(0)
    expect(texto.indexOf('Escritório da família')).toBeLessThan(texto.indexOf('Resumo da família'))
    await a.render(Escritorio)
    await act(async () => vi.dynamicImportSettled())
    expect(a.el.buscar(n => !!n.getAttribute('data-posto'))).toHaveLength(EQUIPE.length)
    expect(a.el.textContent).toContain('Precisa de você9')
    expect(a.el.textContent).toContain('A equipe, sala por sala')
    expect(a.ler('data-posto', 'imoveis').getAttribute('aria-label')).toContain('Ainda sem dado')
  } finally { await a.fechar() }
})

it('sentinela da leitura chega à fila, e a invalidação atualiza sem remontar', async () => {
  const a = montar()
  try {
    await a.render(EscritorioIsometrico)
    await act(async () => vi.dynamicImportSettled())
    expect(a.ler('aria-label', 'Precisa de você').textContent).toContain('78.432,19')
    expect(a.el.textContent.match(/78\.432,19/g)).toHaveLength(1)
    expect(a.el.textContent).toContain('9.321,01')
    expect(a.ler('data-posto', 'contador').getAttribute('data-estado')).toBe('trabalhando')
    expect(a.ler('data-posto', 'cartao').getAttribute('data-estado')).toBe('entregue')
    expect(fake.montar).toHaveBeenCalledOnce()
    await a.atualizar({ ...fonte(), trabalhando: [], precisa_de_voce: [pergunta('novo', 'guardado', 651.83)] })
    expect(a.ler('data-posto', 'guardado').textContent).toBe('')
    expect(a.ler('data-posto', 'guardado').getAttribute('data-estado')).toBe('precisa_de_voce')
    expect(a.ler('aria-label', 'Precisa de você').textContent).toContain('651,83')
    expect(fake.atualizar.mock.lastCall?.[0].contador).toBe('vai_comecar')
    expect(fake.montar).toHaveBeenCalledOnce()
    await a.render(EscritorioIsometrico, true)
    expect(a.el.textContent).not.toContain('651,83')
    expect(a.ler('aria-label', 'Precisa de você').textContent).toContain('••••')
    expect(a.ler('data-posto', 'guardado').getAttribute('aria-label')).not.toContain('651,83')
  } finally { await a.fechar() }
  expect(fake.destruir).toHaveBeenCalledOnce()
})

it('toque no posto abre a ficha certa, filtros movem a cena e o fallback é acionável', async () => {
  const a = montar()
  try {
    await a.render(EscritorioIsometrico)
    await act(async () => vi.dynamicImportSettled())
    const patrimonio = a.el.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Patrimônio')[0]
    await act(async () => patrimonio.click())
    expect(fake.atualizar.mock.lastCall?.[1]).toBe('patrimonio')
    await act(async () => a.ler('data-posto', 'guardado').click())
    await act(async () => vi.dynamicImportSettled())
    expect(a.ler('data-ficha', 'guardado').textContent).toContain('Você confirma guardado-1?')
    await act(async () => a.ler('aria-label', 'Fechar').click())
    await act(async () => fake.montar.mock.calls[0][0].aoPerderContexto())
    expect(a.ler('data-renderizacao', 'lista')).toBeDefined()
    await act(async () => a.ler('data-func', 'imoveis').click())
    await act(async () => vi.dynamicImportSettled())
    expect(a.ler('data-ficha', 'imoveis').textContent).toContain('Ainda sem dado')
  } finally { await a.fechar() }
})

it('sem WebGL ou em Só texto ficam a fila e os botões da lista, sem uma segunda montagem da cena', async () => {
  const a = montar()
  fake.falhar = true
  try {
    await a.render(EscritorioIsometrico)
    await act(async () => vi.dynamicImportSettled())
    expect(a.ler('data-renderizacao', 'lista')).toBeDefined()
    expect(a.ler('data-func', 'imoveis')).toBeDefined()
    await act(async () => definirModoFuncionario('compacto'))
    expect(a.ler('data-renderizacao', 'lista')).toBeUndefined()
    expect(a.ler('data-func', 'imoveis')).toBeDefined()
    expect(fake.montar).toHaveBeenCalledOnce()
    await act(async () => definirModoFuncionario('desligado'))
    await a.render(Inicio)
    expect(a.el.textContent).not.toContain('Escritório da família')
  } finally { await a.fechar() }
})

it('papéis preservam a fila autorizada e para o Assessor retiram dinheiro até do payload da tarefa', () => {
  const e = fonte()
  e.precisa_de_voce.push(pergunta('meu registro', 'contador', 8.97))
  const pessoa = dadosIsometricos(e, { papel: 'pessoa', oculto: false })
  expect(pessoa.fila.map(t => t.pergunta.id)).toEqual(['meu registro'])
  expect(pessoa.fila[0].valor).toContain('8,97')
  const equipe = dadosIsometricos(e, { papel: 'equipe', oculto: false })
  expect(equipe.fila).toHaveLength(1)
  expect(equipe.fila[0].valor).toBeNull()
  expect(equipe.fila[0].pergunta).not.toHaveProperty('valor')
  expect(equipe.postos.find(p => p.membro.id === 'fiscal')?.funcionario.estado).toBe('precisa_de_voce')
  expect(equipe.fila[0].texto).toBe('Tarefa feira')
  expect(dadosIsometricos(e, { papel: 'casal', oculto: false }).fila.find(p => p.pergunta.id === 'recado')?.valor).toBe('Ainda sem dado')
})

it('o Assessor abre a tarefa da Casa pela lista sem expor dinheiro no painel nem na folha', async () => {
  const a = montar('equipe', true)
  try {
    await a.render(EscritorioIsometrico)
    expect(a.el.textContent).not.toMatch(/R\$|29\.123|guardado-1/)
    const tarefa = a.el.buscar(n => n.tagName === 'BUTTON' && n.textContent.includes('Tarefa feira'))[0]
    await act(async () => tarefa.click())
    expect(a.ler('role', 'dialog').textContent).toContain('Você confirma feira?')
    expect(a.ler('role', 'dialog').textContent).not.toMatch(/R\$|29\.123/)
  } finally { await a.fechar() }
})

it('a casca do SW deixa a cena e os retratos no cache em tempo de uso', () => {
  const arquivos: Record<string, string> = {
    'index.html': '<script type="module" src="./assets/index-1.js"></script>',
    'assets/index-1.js': "import('./cenaIsometrica-2.js')",
    'assets/cenaIsometrica-2.js': "import{Scene}from './tres-3.js'",
    'assets/tres-3.js': '',
    'retratos-escritorio/imoveis.webp': '',
  }
  expect(arquivosEssenciais(Object.keys(arquivos), (p: string) => arquivos[p])).toEqual(['index.html', 'assets/index-1.js'])
  arquivos['assets/index-1.js'] = "import './cenaIsometrica-2.js'"
  expect(arquivosEssenciais(Object.keys(arquivos), (p: string) => arquivos[p])).not.toContain('assets/cenaIsometrica-2.js')
})
