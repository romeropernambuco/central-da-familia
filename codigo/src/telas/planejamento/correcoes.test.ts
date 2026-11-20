import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { DocumentoTeste, NoTeste } from '../escritorio/numeros.dom-teste'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { apiExemplo } from '../../api/exemplo'
import type { Api } from '../../api/tipos'
import { Recebimentos } from './Recebimentos'
import { Parametros } from './Parametros'
import { PrimeiroUso } from '../primeiro-uso/PrimeiroUso'
import { Lancamentos } from '../lancamentos/Lancamentos'
import { Desejos } from '../desejos/Desejos'
import { Ajustes } from '../ajustes/Ajustes'
import { Casa } from '../casa/Casa'
import { MeuOrcamento } from '../meu-orcamento/MeuOrcamento'
import { useGuardado, useFuturo } from '../../app/useDados2'
import { useConfig } from '../../app/useConfig'
import { normalizaLancamento } from '../../api/normaliza'
import { traduzErro, ErroRede } from '../../api/erros'

const roots: Root[] = []
afterEach(async () => {
  for (const r of roots.splice(0)) await act(async () => r.unmount())
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
const pendente = <T>() => {
  let resolver!: (v: T) => void
  let rejeitar!: (e: Error) => void
  const promessa = new Promise<T>((r, j) => {
    resolver = r
    rejeitar = j
  })
  return { promessa, resolver, rejeitar }
}
const props = (n: NoTeste) => Object.entries(n).find(([k]) => k.startsWith('__reactProps'))![1] as any
async function montar(el: ReactElement, api: Partial<Api> = {}, extra: Partial<Ctx> = {}) {
  const doc = new DocumentoTeste()
  Object.defineProperty(NoTeste.prototype, 'options', {
    configurable: true,
    get() {
      return this.childNodes
    },
  })
  Object.assign(NoTeste.prototype, {
    focus() {},
    closest() {
      return null
    },
    querySelectorAll() {
      return []
    },
  })
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }),
  )
  vi.stubGlobal('localStorage', {
    getItem() {
      return null
    },
    setItem() {},
  })
  vi.stubGlobal('location', { hash: '#/casa?sem3d', search: '?sem3d', origin: 'https://teste.invalid', pathname: '/' })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let ctx = {
    api: {
      ...apiExemplo,
      membros: async () => [],
      config: async (_f: string, _k: string, p: unknown) => p,
      escritorioHoje: async () => ({ funcionarios: [], entregue: [], trabalhando: [], precisa_de_voce: [] }),
      ...api,
    },
    familia: { id: 'a', papel: 'casal', nome: 'Teste' },
    resumo: null,
    sessao: null,
    versao: 0,
    toast() {},
    recarregar: async () => {},
    tentar: async (f: () => Promise<unknown>) => {
      try {
        await f()
        return true
      } catch {
        return false
      }
    },
    ...extra,
  } as Ctx
  const box = doc.createElement('div')
  doc.body.appendChild(box)
  const root = createRoot(box as unknown as HTMLElement)
  roots.push(root)
  const render = async (c: Partial<Ctx> = {}) => {
    ctx = { ...ctx, ...c }
    await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, el)))
  }
  await render()
  const find = (tag: string, text: string) =>
    box.buscar(n => n.tagName === tag && (n.textContent.includes(text) || n.getAttribute('aria-label') === text))[0]
  const click = async (text: string) => {
    const b = find('BUTTON', text)
    expect(b, text).toBeDefined()
    await act(async () => b.click())
  }
  const change = async (label: string, value: string) => {
    const n = box.buscar(
      n =>
        n.tagName === 'INPUT' &&
        (n.getAttribute('aria-label') === label ||
          n.parentNode?.textContent.startsWith(label) ||
          n.getAttribute('placeholder') === label),
    )[0]
    expect(n, label).toBeDefined()
    await act(async () => props(n).onChange({ target: { value } }))
  }
  const submit = async (twice = false) => {
    const form = box.buscar(n => n.tagName === 'FORM')[0]
    await act(async () => {
      props(form).onSubmit({ preventDefault() {} })
      if (twice) props(form).onSubmit({ preventDefault() {} })
    })
  }
  return { box, render, click, change, submit, find, ctx }
}

it('F: preserva o id do autor usado por useMembros', () => {
  expect(normalizaLancamento({ id: 'l', autor: 123 }).autor).toBe('123')
})
it('K: erro desconhecido não revela tabela, restrição ou valor', () => {
  const m = traduzErro({ message: 'duplicate key secret_table cpf=123', code: '23505' }).message
  expect(m).not.toMatch(/secret_table|cpf|123/)
  expect(m).toMatch(/diagnóstico: [a-z0-9]{6,8}/i)
})
it('L: resposta perdida não afirma que nada foi salvo', () => {
  expect(new ErroRede().message).toBe('Não foi possível confirmar. Confira antes de tentar de novo.')
})

it('A: envio duplo chama uma vez e tentativa reutiliza a chave', async () => {
  const p = pendente<void>()
  const criar = vi
    .fn()
    .mockImplementationOnce(() => p.promessa)
    .mockRejectedValue(new Error('rede'))
  const a = await montar(createElement(Recebimentos), { recebimentos: async () => [], recebimentoCriar: criar })
  await a.click('Recebimento')
  await a.change('O que é', 'Contrato')
  await a.change('Quanto entra', '5000')
  await a.submit(true)
  expect(criar).toHaveBeenCalledTimes(1)
  expect(props(a.box.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Anotar')[0]).disabled).toBe(true)
  await act(async () => p.resolver())
})
it('A/L: nova tentativa conserva identificador da operação', async () => {
  const criar = vi.fn().mockRejectedValue(new Error('rede'))
  const a = await montar(createElement(Recebimentos), { recebimentos: async () => [], recebimentoCriar: criar })
  await a.click('Recebimento')
  await a.change('O que é', 'Contrato')
  await a.change('Quanto entra', '5000')
  await a.submit()
  await a.submit()
  expect(criar.mock.calls[0][1].chave).toEqual(expect.any(String))
  expect(criar.mock.calls[1][1].chave).toBe(criar.mock.calls[0][1].chave)
})
it('B: retoma leitura após criação sem criar outra família', async () => {
  const criarFamilia = vi.fn(async () => 'nova')
  const resumoHoje = vi.fn().mockRejectedValueOnce(new Error('rede')).mockResolvedValue({ envelopes: [] })
  const a = await montar(createElement(PrimeiroUso), { criarFamilia, resumoHoje })
  await a.click('Não: vou criar')
  await a.change('Nome da família', 'Teste')
  await a.change('Seu nome', 'Pessoa')
  await a.submit()
  await a.submit()
  expect(criarFamilia).toHaveBeenCalledTimes(1)
  expect(resumoHoje).toHaveBeenLastCalledWith('nova')
})
function Leitura() {
  const { g, estado, motivo } = useGuardado()
  return createElement('p', null, JSON.stringify([g, estado, motivo]))
}
function Config() {
  const [v, , erro, leu] = useConfig('dias_sem_gasto', ['padrão'])
  return createElement('p', null, JSON.stringify([v, erro, leu]))
}
it.each([
  [
    'useDados2',
    createElement(Leitura),
    { guardadoHoje: async (f: string) => (f === 'a' ? { segredo: 'anterior' } : new Promise(() => {})) },
  ],
  [
    'useConfig',
    createElement(Config),
    { config: async (f: string) => (f === 'a' ? ['anterior'] : new Promise(() => {})) },
  ],
] as const)('C: %s oculta estado da família anterior durante a nova leitura', async (_nome, el, api) => {
  const a = await montar(el, api as Partial<Api>)
  expect(a.box.textContent).toContain('anterior')
  await a.render({ familia: { ...a.ctx.familia!, id: 'b' } })
  expect(a.box.textContent).not.toContain('anterior')
})
const linha = {
  id: 'l',
  envelope_id: 'e',
  valor: 1,
  data: '2026-11-01',
  descricao: 'anterior',
  criado_em: '',
  cartao_id: null,
  apagado_em: null,
}
it('C: lançamentos não exibe linhas anteriores durante troca de família', async () => {
  const a = await montar(createElement(Lancamentos), {
    lancamentos: async f => (f === 'a' ? [linha] : new Promise(() => {})),
    cartoes: async () => [],
    faturas: async () => [],
  })
  expect(a.box.textContent).toContain('anterior')
  await a.render({ familia: { ...a.ctx.familia!, id: 'b' } })
  expect(a.box.textContent).not.toContain('anterior')
})
it('G: mês acompanha virada de Recife sem remontar', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-12-01T02:59:50Z'))
  const lancamentos = vi.fn(async () => [])
  await montar(createElement(Lancamentos), { lancamentos, cartoes: async () => [], faturas: async () => [] })
  expect(lancamentos).toHaveBeenLastCalledWith('a', '2026-11')
  await act(async () => {
    await vi.advanceTimersByTimeAsync(70000)
  })
  expect(lancamentos).toHaveBeenLastCalledWith('a', '2026-12')
})
const receb = {
  id: 'r',
  descricao: 'Contrato antigo',
  valor: 5000,
  mes_previsto: '2026-12',
  certo: true,
  tipo: 'contrato' as const,
  meu: true,
  dono_membro: 'm',
  dono_nome: null,
  mes_novo: null,
  recebido_em: null,
  valor_recebido: null,
}
it('D: resposta antiga de recebimentos não substitui leitura nova', async () => {
  const p = pendente<any[]>()
  const ler = vi
    .fn()
    .mockImplementationOnce(() => p.promessa)
    .mockResolvedValue([])
  const a = await montar(createElement(Recebimentos), { recebimentos: ler })
  await a.render({ versao: 1 })
  await act(async () => p.resolver([receb]))
  expect(a.box.textContent).not.toContain('Contrato antigo')
})
function Futuro() {
  useFuturo()
  return createElement(Recebimentos)
}
it('E: mudar recebimento invalida leitura compartilhada do futuro', async () => {
  const futuroEntradas = vi.fn(async () => ({ entrada: null, confirmar: [] }))
  const a = await montar(createElement(Futuro), {
    futuroEntradas,
    recebimentos: async () => [receb],
    recebimentoMudar: async () => {},
  })
  const antes = futuroEntradas.mock.calls.length
  await a.click('Chegou')
  expect(futuroEntradas.mock.calls.length).toBeGreaterThan(antes)
})
it('E: criar recebimento invalida futuro de outra instância montada', async () => {
  const futuroEntradas = vi.fn(async () => ({ entrada: null, confirmar: [] }))
  const a = await montar(createElement(Futuro), {
    futuroEntradas,
    recebimentos: async () => [],
    recebimentoCriar: async () => {},
  })
  const antes = futuroEntradas.mock.calls.length
  await a.click('Recebimento')
  await a.change('O que é', 'Contrato')
  await a.change('Quanto entra', '5000')
  await a.submit()
  expect(futuroEntradas.mock.calls.length).toBeGreaterThan(antes)
})
it.each([
  ['recebimentos', createElement(Recebimentos), 'recebimentos'],
  ['desejos', createElement(Desejos), 'desejos'],
  ['ajustes', createElement(Ajustes), 'convites'],
  ['parâmetros', createElement(Parametros), 'objetivo'],
] as const)('I: %s distingue erro de vazio e permite repetir', async (_n, el, metodo) => {
  const a = await montar(el, {
    [metodo]: async () => {
      throw new Error('rede indisponível')
    },
  })
  expect(a.box.textContent).toContain('Tentar novamente')
  expect(a.box.textContent).not.toContain('Nenhum recebimento anotado')
})
it('J: releitura de parâmetros conserva campo editado', async () => {
  const a = await montar(createElement(Parametros), {
    objetivo: async () => ({ parametros: null, historico: [], focus: [] }),
    futuroEntradas: async () => ({ entrada: null, confirmar: [] }),
  })
  await a.change('Gasto por mês em 2029', '987')
  await a.render({ versao: 1 })
  const input = a.box.buscar(n => n.getAttribute('aria-label') === 'Gasto por mês em 2029')[0]
  expect(props(input).value).toContain('987')
})
it.each([
  ['recebimentos', createElement(Recebimentos), 'recebimentos', [{ ...receb, descricao: 'RESULTADO' }]],
  [
    'desejos',
    createElement(Desejos),
    'desejos',
    [{ id: 'd', nome: 'RESULTADO', valor: 1, mes: '2026-12', situacao: 'pensando', volta_de: 'nada' }],
  ],
  [
    'ajustes',
    createElement(Ajustes),
    'convites',
    [{ id: 'c', nome: 'RESULTADO', email: null, papel: 'casal', situacao: 'entrou' }],
  ],
  [
    'parâmetros',
    createElement(Parametros),
    'objetivo',
    {
      parametros: null,
      historico: [],
      focus: [{ ano: 2026, fonte: 'RESULTADO', selic_fim: '0.1', ipca: '0.1', divulgado_em: '2026-11-01' }],
    },
  ],
] as const)('I: %s conserva último resultado como desatualizado e repete leitura', async (_nome, el, metodo, dado) => {
  const ler = vi.fn().mockResolvedValueOnce(dado).mockRejectedValueOnce(new Error('rede')).mockResolvedValue(dado)
  const a = await montar(el, { [metodo]: ler })
  await a.render(metodo === 'convites' ? { api: { ...a.ctx.api, convites: ler } } : { versao: 1 })
  expect(a.box.textContent).toContain('RESULTADO')
  expect(a.box.textContent).toContain('Dados desatualizados.')
  await a.click('Tentar novamente')
  expect(ler).toHaveBeenCalledTimes(3)
  expect(a.box.textContent).not.toContain('Dados desatualizados.')
})
it.each([false, true])('M: equipe conserva texto no envio; falha=%s', async falha => {
  const p = pendente<any>()
  const casa = {
    hoje: '2026-11-15',
    lista: [],
    comprado: [],
    prestadores: [],
    gas: { trocas: [] },
    presenca: { meu_ponto: {}, hoje: [] },
  }
  const a = await montar(
    createElement(Casa),
    { casaDaEquipe: async () => casa as any, casaMarcar: () => p.promessa },
    { familia: { id: 'a', nome: 'Teste', papel: 'equipe', membroNome: 'Pessoa', envelopeId: null } },
  )
  await a.change('Item que acabou', 'Arroz')
  await a.submit()
  const input = a.box.buscar(n => n.getAttribute('aria-label') === 'Item que acabou')[0]
  expect(props(input).value).toBe('Arroz')
  expect(props(a.find('BUTTON', 'Pôr na lista')).disabled).toBe(true)
  await act(async () => {
    if (falha) p.rejeitar(new Error('rede'))
    else p.resolver(casa)
  })
  expect(props(input).value).toBe(falha ? 'Arroz' : '')
  expect(props(a.find('BUTTON', 'Pôr na lista')).disabled).toBe(false)
})

it.each(['limite_base', 'limite_mes'] as const)(
  'H: cofrinho acompanha alteração de %s com mesmo envelope',
  async limite => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))
    const env = {
      id: 'e',
      nome: 'Pessoal',
      regra: 'diario',
      limite_mes: 300,
      ...(limite === 'limite_base' ? { limite_base: 300 } : {}),
      livre: 300,
      gasto_mes: 0,
    }
    const resumo = { envelopes: [env], dias_restantes: 16 } as any
    const a = await montar(
      createElement(MeuOrcamento),
      { lancamentos: async () => [{ ...linha, data: '2026-11-14', valor: 1 }] },
      { resumo },
    )
    await a.render({ resumo: { ...resumo, envelopes: [{ ...env, [limite]: 600 }] } })
    expect(a.box.textContent).toContain('valor diário de referência de R$\u00a020')
  },
)
it.each([
  [
    'parâmetros',
    createElement(Parametros),
    'objetivo',
    {
      parametros: null,
      historico: [],
      focus: [{ ano: 2026, fonte: 'ANTIGA', selic_fim: '0.1', ipca: '0.1', divulgado_em: '2026-11-01' }],
    },
  ],
  [
    'desejos',
    createElement(Desejos),
    'desejos',
    [{ id: 'd', nome: 'ANTIGA', valor: 1, mes: '2026-12', situacao: 'pensando', volta_de: 'nada' }],
  ],
  [
    'equipe',
    createElement(Casa),
    'casaDaEquipe',
    {
      hoje: '2026-11-15',
      lista: [{ id: 'i', nome: 'ANTIGA', ok: false }],
      comprado: [],
      prestadores: [],
      gas: { trocas: [] },
      presenca: { hoje: [], meu_ponto: {} },
    },
  ],
] as const)('D: %s descarta resposta anterior', async (_n, el, metodo, velho) => {
  const p = pendente<unknown>()
  const ler = vi
    .fn()
    .mockImplementationOnce(() => p.promessa)
    .mockResolvedValue(
      metodo === 'objetivo'
        ? { parametros: null, historico: [], focus: [] }
        : metodo === 'desejos'
          ? []
          : { ...velho, lista: [] },
    )
  const a = await montar(
    el,
    { [metodo]: ler },
    metodo === 'casaDaEquipe'
      ? { familia: { id: 'a', nome: 'Teste', papel: 'equipe', membroNome: 'Pessoa', envelopeId: null } }
      : {},
  )
  await a.render({ versao: 1 })
  await act(async () => p.resolver(velho))
  expect(a.box.textContent).not.toContain('ANTIGA')
})
