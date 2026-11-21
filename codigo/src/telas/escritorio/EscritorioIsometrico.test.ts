import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { invalidarDados } from '../../lib/invalidacao'
import type { Api, EscritorioHoje, FamiliaMinha, Papel, PerguntaEsc } from '../../api/tipos'
import { normalizaEscritorio } from '../../api/normaliza2'
import { definirModoFuncionario } from './AgenteDaAba'
import { hojeRecife, somaDias } from '../../lib/formato'
import { Inicio } from '../inicio/Inicio'
import { InicioClassico } from '../inicio/InicioClassico'
import { Escritorio } from './Escritorio'
import { EscritorioIsometrico } from './EscritorioIsometrico'
import { EQUIPE } from '../../lib/escritorio/equipe'
import { dadosIsometricos } from './dadosIsometricos'
import { DocumentoTeste, NoTeste } from './numeros.dom-teste'
// @ts-ignore: script Node usado na geração do build.
import { arquivosEssenciais } from '../../../scripts/sw.mjs'

const fake = vi.hoisted(() => ({
  montar: vi.fn(),
  atualizar: vi.fn(),
  destruir: vi.fn(),
  importarThree: vi.fn(),
  falhar: false,
}))
vi.mock('./tres', () => {
  fake.importarThree()
  return {}
})
vi.mock('../inicio/ResumoFamilia', () => {
  const Resumo = () => createElement('h2', null, 'Resumo da família')
  return { ResumoFamilia: Resumo, ResumoApresentacao: Resumo }
})

const pergunta = (id: string, funcionario: string, valor?: number): PerguntaEsc => ({
  id,
  funcionario,
  valor,
  assunto: `Tarefa ${id}`,
  pergunta: `Você confirma ${id}?`,
  contexto: '',
  opcoes: [{ id: 'feito', rotulo: 'Confirmar' }],
})
function fonte(): EscritorioHoje {
  return {
    trabalhando: [{ funcionario: 'contador' }],
    entregue: [{ funcionario: 'analista_cartao', resumo: 'Conferido' }],
    funcionarios: [],
    precisa_total: 9,
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
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), {
      document: doc,
      location: local,
      HTMLElement: NoTeste,
      HTMLIFrameElement: class {},
      WebGLRenderingContext: class {},
    }),
  )
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let dado = fonte()
  const familia = { id: 'f38', papel, membroId: 'm', envelopeId: 'e' } as FamiliaMinha
  const responder = vi.fn(async (_familia: string, id: string, _opcao: string) => {
    dado = { ...dado, precisa_de_voce: dado.precisa_de_voce.filter(p => p.id !== id) }
  })
  const api = {
    modo: 'real',
    escritorioHoje: async () => dado,
    escritorioResponder: responder,
    escritorioDiario: async () => [],
    lancamentos: async () => [],
    guardadoHoje: async () => ({ total: 1, aplicacoes: [] }),
    estoque: async () => ({ itens: [], contagens: [] }),
    avisosCasa: async () => [],
    config: async () => ({}),
  } as unknown as Api
  const ctx = {
    api,
    familia,
    oculto: false,
    versao: 0,
    sessao: { dono: true },
    tentar: async (fn: () => Promise<void>) => {
      await fn()
      return true
    },
    toast() {},
    recarregar: async () => {},
  } as unknown as Ctx
  const el = doc.createElement('div')
  doc.body.appendChild(el)
  const root = createRoot(el as unknown as HTMLElement)
  definirModoFuncionario('completo')
  return {
    el,
    responder,
    render: async (
      Tela: typeof Inicio | typeof InicioClassico | typeof Escritorio | typeof EscritorioIsometrico,
      oculto = false,
    ) =>
      act(async () =>
        root.render(
          createElement(
            ContextoApp.Provider,
            { value: { ...ctx, oculto } },
            createElement(Tela, { superficie: 'escritorio' }),
          ),
        ),
      ),
    ler: (attr: string, valor: string) => el.buscar(n => n.getAttribute(attr) === valor)[0],
    atualizar: async (outro: EscritorioHoje) => {
      dado = outro
      await act(async () => invalidarDados(api, familia.id, ['escritorio']))
    },
    fechar: () => act(async () => root.unmount()),
  }
}
afterEach(() => {
  fake.falhar = false
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

it('f54: Início clássico fora da área visível mostra o painel estático sem pedir Three', async () => {
  const a = montar()
  const observe = vi.fn(),
    disconnect = vi.fn()
  let visibilidade!: (entradas: { isIntersecting: boolean }[]) => void
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(notificar: typeof visibilidade) {
        visibilidade = notificar
      }
      observe = observe
      disconnect = disconnect
    },
  )
  try {
    await a.render(InicioClassico)
    await act(async () => vi.dynamicImportSettled())
    expect(a.el.textContent).toContain('Escritório da família')
    expect(observe).toHaveBeenCalledOnce()
    await act(async () => visibilidade([{ isIntersecting: false }]))
    expect(fake.importarThree).not.toHaveBeenCalled()
    expect(a.ler('class', 'cena3d-bloco')).toBeUndefined()
    expect(a.ler('data-posto', 'contador')).toBeUndefined()
    await act(async () => visibilidade([{ isIntersecting: true }]))
    await act(async () => vi.dynamicImportSettled())
    // entrou na área visível: é a mesma cena da aba Escritório, com um botão por funcionário
    expect(a.ler('class', 'cena3d-bloco')).toBeDefined()
    expect(a.ler('data-posto', 'contador')).toBeDefined()
    expect(disconnect).toHaveBeenCalled()
  } finally {
    await a.fechar()
  }
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
    expect(a.ler('data-posto', 'imoveis').getAttribute('aria-label')).toContain('ainda sem dado')
    expect(a.el.textContent).toContain('9 coisas precisam de você hoje')
  } finally {
    await a.fechar()
  }
})

it('Início J usa o SVG sem WebGL, tem todos os postos e abre o destino real da ficha', async () => {
  const a = montar()
  try {
    await a.render(Inicio)
    expect(a.ler('data-renderizacao', 'svg')).toBeDefined()
    expect(a.el.buscar(n => !!n.getAttribute('data-posto'))).toHaveLength(19)
    await act(async () => a.ler('data-posto', 'cartao').click())
    expect(a.ler('data-ficha', 'cartao').textContent).toContain('Conferido')
    await act(async () => a.ler('aria-label', 'Abrir Cartões').click())
    expect(location.hash).toBe('#/cartoes')
  } finally {
    await a.fechar()
  }
})

it('Início J distingue a equipe das tarefas, usa a mesma fila do Escritório e respeita o olho', async () => {
  const a = montar()
  try {
    await a.atualizar({ funcionarios: [], trabalhando: [], entregue: [], precisa_de_voce: [] })
    await a.render(Inicio)
    expect(a.el.buscar(n => !!n.getAttribute('data-posto'))).toHaveLength(19)
    expect(a.el.textContent).toContain('19 na equipe, nenhuma tarefa em andamento')
    expect(a.el.textContent).not.toContain('0 pessoas trabalhando')
    expect(a.ler('aria-label', 'Precisa de você').textContent).toContain('Nenhuma tarefa pendente.')
    await a.render(EscritorioIsometrico)
    expect(a.ler('aria-label', 'Precisa de você').textContent).toContain('Nenhuma tarefa pendente.')
    await a.render(Inicio)

    const perguntas = [pergunta('primeira', 'guardado'), pergunta('segunda', 'gestor_guardado')]
    await a.atualizar({ funcionarios: [], entregue: [], trabalhando: [], precisa_de_voce: perguntas })
    expect(a.el.textContent).toContain('19 na equipe, 1 aguardando resposta')
    expect(a.ler('aria-label', 'Precisa de você').textContent).toContain('Precisa de você2')

    await a.atualizar({
      funcionarios: [],
      entregue: [],
      trabalhando: [{ funcionario: 'contador' }],
      precisa_de_voce: perguntas,
    })
    expect(a.el.textContent).toContain('1 pessoa trabalhando')
    expect(a.ler('data-posto', 'contador').getAttribute('data-estado')).toBe('trabalhando')
    await a.render(EscritorioIsometrico)
    expect(a.ler('data-posto', 'contador').getAttribute('data-estado')).toBe('trabalhando')
    expect(a.ler('aria-label', 'Precisa de você').textContent).toContain('Precisa de você2')
    await a.render(EscritorioIsometrico, true)
    expect(a.ler('aria-label', 'Precisa de você').textContent).not.toContain('Precisa de você2')

    await a.render(Inicio, true)
    expect(a.el.textContent).not.toMatch(/na equipe|pessoas? trabalhando|Precisa de você2/)
    expect(a.ler('aria-label', 'Precisa de você').textContent).toContain('Tarefa pendente')
  } finally {
    await a.fechar()
  }
})

it('ficha J usa a atividade da leitura, o diário datado e só o adiamento ainda válido', async () => {
  const a = montar()
  const hoje = hojeRecife()
  const instante = (dias: number) => `${somaDias(hoje, dias)}T12:00:00-03:00`
  try {
    await a.atualizar(
      normalizaEscritorio({
        precisa_de_voce: [],
        trabalhando: [{ funcionario: 'analista_cartao', frase: 'Conferindo fatura de R$ 81.234,56.' }],
        entregue: [{ funcionario: 'analista_cartao', resumo: 'Fatura atual em dia.' }],
        funcionarios: [
          {
            id: 'analista_cartao',
            estado: 'entregue',
            frase: 'Fatura atual em dia.',
            ultimas_respostas: [
              { id: '1', ref: 'antiga', quando: instante(-4), resposta: 'Adiada', adiado_ate: instante(1) },
              { id: '2', ref: 'antiga', quando: instante(-2), resposta: 'Conferência de R$ 72.345,67.' },
              { id: '3', ref: 'outra', quando: instante(-1), resposta: 'Depois', adiado_ate: instante(2) },
            ],
          },
        ],
      }),
    )
    await a.render(Inicio)
    await act(async () => a.ler('data-posto', 'cartao').click())
    const ficha = () => a.ler('data-ficha', 'cartao').textContent
    expect(ficha()).toContain('AgoraTarefa em andamento. Conferindo fatura de R$ 81.234,56.')
    expect(ficha()).toContain('Última entregaConferência de R$ 72.345,67. · anteontem')
    expect(ficha()).toContain('Resultado atualFatura atual em dia.')
    expect(ficha()).toContain('Último registroontem')
    expect(ficha()).toContain('Próxima rotinaRetomar tarefa · depois de amanhã')
    expect(ficha()).toContain('Pendências0')
    expect(ficha()).toContain('Ver histórico')

    await a.render(Inicio, true)
    expect(ficha()).not.toMatch(/81\.234|72\.345|Fatura atual em dia|Pendências0/)
    expect(ficha()).toContain('Última entregaResposta registrada · anteontem')
    expect(ficha()).toContain('Pendências••••')
  } finally {
    await a.fechar()
  }
})

it('ficha J mostra o próximo lembrete marcado e conta todas as perguntas da pessoa', async () => {
  const a = montar()
  try {
    await a.atualizar(
      normalizaEscritorio({
        precisa_de_voce: Array.from({ length: 4 }, (_, i) => pergunta(`recado-${i}`, 'secretaria')),
        trabalhando: [{ funcionario: 'secretaria', frase: '1 lembrete marcado. Próximo: Revisar a casa em 25/11.' }],
      }),
    )
    await a.render(Inicio)
    await act(async () => a.ler('data-posto', 'secretaria').click())
    const ficha = () => a.ler('data-ficha', 'secretaria').textContent
    expect(ficha()).toContain('AgoraAguardando sua resposta.')
    expect(ficha()).toContain('Próxima rotinaRevisar a casa em 25/11.')
    expect(ficha()).toContain('Pendências4')
    await a.render(Inicio, true)
    expect(ficha()).toContain('Próxima rotinaLembrete agendado')
    expect(ficha()).not.toContain('Revisar a casa')
  } finally {
    await a.fechar()
  }
})

it('Início J usa a cena original do escritório; sem WebGL fica a maquete em desenho, sem etiquetas em dobro', async () => {
  const a = montar()
  try {
    await a.render(Inicio)
    await act(async () => vi.dynamicImportSettled())
    // a cena do Início é a mesma da aba Escritório (Cena3D); o motor isométrico resumido não é mais montado ali
    expect(a.ler('data-modo', 'lista')).toBeDefined()
    expect(a.el.buscar(n => !!n.getAttribute('data-posto'))).toHaveLength(19)
    expect(a.el.textContent).not.toContain('A cena 3D não abriu neste aparelho')
    expect(a.el.textContent).toContain('precisa de você (vem pra frente da sala e acena)')
  } finally {
    await a.fechar()
  }
})

it.each([
  ['feito', 'Já fiz'],
  ['depois', 'Depois'],
])('fila da J usa a opção da API %s, releitura e máscara na ficha', async (id, rotulo) => {
  const a = montar()
  try {
    const p = { ...pergunta('sentinela', 'guardado', 45678.91), opcoes: [{ id, rotulo }] }
    await a.atualizar({ ...fonte(), precisa_de_voce: [p], precisa_total: 1 })
    await a.render(Inicio)
    expect(a.ler('aria-label', 'Precisa de você').textContent).toContain('45.678,91')
    await act(async () => a.ler('data-posto', 'guardado').click())
    expect(a.ler('data-ficha', 'guardado').textContent).toContain(p.pergunta)
    await a.render(Inicio, true)
    expect(a.ler('data-ficha', 'guardado').textContent).not.toContain(p.pergunta)
    expect(a.ler('aria-label', 'Precisa de você').textContent).not.toContain('45.678,91')
    await act(async () => a.ler('aria-label', rotulo).click())
    expect(a.responder).toHaveBeenCalledOnce()
    expect(a.responder).toHaveBeenCalledWith('f38', 'sentinela', id, undefined)
    expect(a.ler('data-pergunta', 'sentinela')).toBeUndefined()
  } finally {
    await a.fechar()
  }
})

it('sentinela da leitura chega à fila, ao selo e à manchete da cena original, e a invalidação atualiza sem remontar', async () => {
  const a = montar()
  try {
    await a.render(EscritorioIsometrico)
    await act(async () => vi.dynamicImportSettled())
    expect(a.ler('aria-label', 'Precisa de você').textContent).toContain('78.432,19')
    // fila, manchete ("Primeiro: ...") e selo do funcionário que precisa de você
    expect(a.el.textContent.match(/78\.432,19/g)).toHaveLength(3)
    expect(a.el.textContent).toContain('Primeiro: Gestor do Guardado, R$')
    expect(a.el.textContent).toContain('9.321,01')
    expect(a.ler('data-posto', 'guardado').textContent).toContain('78.432,19')
    expect(a.ler('data-posto', 'contador').getAttribute('data-estado')).toBe('trabalhando')
    expect(a.ler('data-posto', 'contador').textContent).toBe('Contador')
    expect(a.ler('data-posto', 'cartao').getAttribute('data-estado')).toBe('entregue')
    expect(a.el.textContent).toContain('precisa de você (vem pra frente da sala e acena)')
    // a aba Escritório não monta mais a cena isométrica resumida
    await a.atualizar({ ...fonte(), trabalhando: [], precisa_de_voce: [pergunta('novo', 'guardado', 651.83)] })
    expect(a.ler('data-posto', 'guardado').textContent).toContain('651,83')
    expect(a.ler('data-posto', 'guardado').getAttribute('data-estado')).toBe('precisa_de_voce')
    expect(a.ler('data-posto', 'contador').getAttribute('data-estado')).toBe('vai_comecar')
    expect(a.ler('aria-label', 'Precisa de você').textContent).toContain('651,83')
    await a.render(EscritorioIsometrico, true)
    expect(a.el.textContent).not.toContain('651,83')
    expect(a.el.textContent).not.toMatch(/coisas? precisam? de você hoje/)
    expect(a.ler('aria-label', 'Precisa de você').textContent).toContain('••••')
    expect(a.ler('data-posto', 'guardado').textContent).toContain('••••')
    expect(a.ler('data-posto', 'guardado').getAttribute('aria-label')).not.toContain('651,83')
  } finally {
    await a.fechar()
  }
})

it('toque na etiqueta abre a ficha certa e, sem WebGL, a lista continua acionável', async () => {
  const a = montar()
  try {
    await a.render(EscritorioIsometrico)
    await act(async () => vi.dynamicImportSettled())
    await act(async () => a.ler('data-posto', 'guardado').click())
    await act(async () => vi.dynamicImportSettled())
    expect(a.ler('data-ficha', 'guardado').textContent).toContain('Você confirma guardado-1?')
    await act(async () => a.ler('aria-label', 'Fechar').click())
    // o DOM de teste não tem WebGL: a cena original cai para a lista e avisa
    expect(a.ler('data-modo', 'lista')).toBeDefined()
    expect(a.el.textContent).toContain('A cena 3D não abriu neste aparelho')
    await act(async () =>
      a.el
        .buscar(
          n => n.tagName === 'BUTTON' && n.getAttribute('data-func') === 'imoveis' && !n.getAttribute('data-posto'),
        )[0]
        .click(),
    )
    await act(async () => vi.dynamicImportSettled())
    expect(a.ler('data-ficha', 'imoveis').textContent).toContain('Ainda sem dado')
  } finally {
    await a.fechar()
  }
})

it('em Só texto ficam a fila e os botões da lista, sem cena; desligado tira o escritório do Início', async () => {
  const a = montar()
  try {
    await a.render(EscritorioIsometrico)
    await act(async () => vi.dynamicImportSettled())
    expect(a.ler('data-modo', 'lista')).toBeDefined()
    expect(a.ler('data-func', 'imoveis')).toBeDefined()
    await act(async () => definirModoFuncionario('compacto'))
    expect(a.ler('data-modo', 'lista')).toBeUndefined()
    expect(a.ler('data-func', 'imoveis')).toBeDefined()
    await act(async () => definirModoFuncionario('desligado'))
    await a.render(Inicio)
    expect(a.el.textContent).not.toContain('Escritório da família')
  } finally {
    await a.fechar()
  }
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
  expect(dadosIsometricos(e, { papel: 'casal', oculto: false }).fila.find(p => p.pergunta.id === 'recado')?.valor).toBe(
    'Ainda sem dado',
  )
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
  } finally {
    await a.fechar()
  }
})

it('a casca do SW deixa a cena e os retratos no cache em tempo de uso', () => {
  const arquivos: Record<string, string> = {
    'index.html': '<script type="module" src="./assets/index-1.js"></script>',
    'assets/index-1.js': "import('./cenaIsometrica-2.js')",
    'assets/cenaIsometrica-2.js': "import{Scene}from './tres-3.js'",
    'assets/tres-3.js': '',
    'retratos-escritorio/imoveis.webp': '',
  }
  expect(arquivosEssenciais(Object.keys(arquivos), (p: string) => arquivos[p])).toEqual([
    'index.html',
    'assets/index-1.js',
  ])
  arquivos['assets/index-1.js'] = "import './cenaIsometrica-2.js'"
  expect(arquivosEssenciais(Object.keys(arquivos), (p: string) => arquivos[p])).not.toContain(
    'assets/cenaIsometrica-2.js',
  )
})
