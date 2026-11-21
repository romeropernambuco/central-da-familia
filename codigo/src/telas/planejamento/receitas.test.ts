import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { DocumentoTeste, NoTeste } from '../escritorio/numeros.dom-teste'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { Recebimentos } from './Recebimentos'
import type { Api, ChaveConfig, FonteReceita, RecebimentoTela } from '../../api/tipos'
import { entradaDoBanco } from '../../lib/futuroReceitas'
import { esconderValores } from '../../lib/formato'

const roots: Root[] = []
const props = (n: NoTeste) => Object.entries(n).find(([k]) => k.startsWith('__reactProps'))![1] as any
afterEach(async () => {
  for (const r of roots.splice(0)) await act(async () => r.unmount())
  esconderValores(false)
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
const receb = (): RecebimentoTela => ({
  id: 'r',
  descricao: 'Empresa fictícia secreta',
  valor: 1234.56,
  mes_previsto: '2026-12',
  certo: true,
  tipo: 'contrato',
  meu: true,
  dono_membro: 'm',
  dono_nome: 'Nome privado',
  mes_novo: null,
  recebido_em: null,
  valor_recebido: null,
})
const mensal: FonteReceita = {
  origem: 'empresa',
  certeza: 'garantido',
  recorrencia: 'mensal',
  fim: '2027-02',
  rotulo: 'Rótulo secreto',
}
async function montar({
  cfg = {},
  papel = 'casal',
  oculto = false,
  linhas = [receb()],
  apiExtra = {},
  storage = new Map<string, string>(),
}: {
  cfg?: Record<string, unknown>
  papel?: 'casal' | 'pessoa' | 'equipe'
  oculto?: boolean
  linhas?: RecebimentoTela[]
  apiExtra?: Partial<Api>
  storage?: Map<string, string>
} = {}) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-12-16T12:00:00Z'))
  const doc = new DocumentoTeste()
  Object.assign(NoTeste.prototype, {
    focus() {},
    closest() {
      return null
    },
    querySelectorAll() {
      return []
    },
  })
  Object.defineProperty(NoTeste.prototype, 'options', {
    configurable: true,
    get() {
      return this.childNodes
    },
  })
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }),
  )
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
  })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  esconderValores(oculto)
  const api = {
    modo: 'exemplo',
    config: vi.fn(async (_f: string, k: ChaveConfig, p: unknown) => cfg[k] ?? p),
    salvarConfig: vi.fn(async (_f: string, k: ChaveConfig, v: unknown) => {
      cfg[k] = structuredClone(v)
    }),
    recebimentos: vi.fn(async () => linhas.map(x => ({ ...x }))),
    recebimentoMudar: vi.fn(async (_f: string, id: string, m: Partial<RecebimentoTela>) => {
      Object.assign(
        linhas.find(x => x.id === id)!,
        m,
      )
    }),
    recebimentoCriar: vi.fn(async (_f: string, r: any) => {
      linhas.push({ ...receb(), ...r, id: 'novo' })
    }),
    futuroEntradas: vi.fn(async () =>
      entradaDoBanco({
        hoje: '2026-12-16',
        mes_base: '2026-12',
        aplicacoes: [],
        saldo_caixa: 200000000,
        cdi_hoje: { pct_ano: '10' },
        recebimentos: linhas.map(x => ({
          id: x.id,
          dono_nome: x.dono_nome,
          valor_centavos: Math.round(x.valor * 100),
          mes_previsto: x.mes_previsto,
          mes_novo: x.mes_novo,
          certo: x.certo,
          recebido_em: x.recebido_em,
        })),
        config: cfg,
        parcelas_futuras: [],
        desejos: [],
        limites_mes: [{ envelope_id: 'e', limite_centavos: 100000 }],
        parametros: null,
        focus: [2026, 2027, 2028].map(ano => ({
          ano,
          selic_fim: '0.1',
          ipca: '0.04',
          divulgado_em: '2026-11-01',
          fonte: 'Teste',
        })),
      }),
    ),
    ...apiExtra,
  } as unknown as Api
  const toast = vi.fn(),
    ctx = {
      api,
      familia: { id: 'familia-ficticia', papel, nome: 'Teste' },
      versao: 0,
      oculto,
      toast,
      recarregar: async () => {},
      tentar: async (f: () => Promise<unknown>) => {
        try {
          await f()
          return true
        } catch {
          return false
        }
      },
    } as unknown as Ctx
  const box = doc.createElement('div')
  doc.body.appendChild(box)
  const root = createRoot(box as unknown as HTMLElement)
  roots.push(root)
  const render = async (extra: Partial<Ctx> = {}) => {
    Object.assign(ctx, extra)
    esconderValores(!!ctx.oculto)
    await act(async () =>
      root.render(createElement(ContextoApp.Provider, { value: { ...ctx } }, createElement(Recebimentos))),
    )
  }
  await render()
  const botao = (s: string) =>
    box.buscar(n => n.tagName === 'BUTTON' && (n.textContent === s || n.getAttribute('aria-label') === s))[0]
  const click = async (s: string) => {
    expect(botao(s), s).toBeDefined()
    await act(async () => botao(s).click())
  }
  const campo = (s: string) =>
    box.buscar(
      n =>
        (n.tagName === 'INPUT' || n.tagName === 'SELECT') &&
        (n.getAttribute('aria-label') === s || !!n.parentNode?.textContent.startsWith(s)),
    )[0]
  const change = async (s: string, value: string) => {
    expect(campo(s), s).toBeDefined()
    await act(async () => props(campo(s)).onChange({ target: { value } }))
  }
  const submit = async (duplo = false) => {
    const f = box.buscar(n => n.tagName === 'FORM')[0]
    expect(f).toBeDefined()
    await act(async () => {
      void props(f).onSubmit({ preventDefault() {} })
      if (duplo) void props(f).onSubmit({ preventDefault() {} })
    })
  }
  return { box, api, ctx, cfg, toast, linhas, storage, botao, campo, click, change, submit, render }
}

it('Chegou exige conferência; corrige reais e data, trava duplo toque e oferece desfazer', async () => {
  const a = await montar()
  await a.click('Chegou')
  expect(a.api.recebimentoMudar).not.toHaveBeenCalled()
  expect(a.box.textContent).toContain('Valor previsto:')
  expect(a.box.textContent).toContain('dia não informado')
  await a.submit()
  expect(a.api.recebimentoMudar).not.toHaveBeenCalled()
  expect(a.box.textContent).toContain('Informe a data')
  await a.change('Quanto realmente chegou', '987,65')
  await a.change('Data em que chegou', '2026-12-15')
  await a.submit(true)
  expect(a.api.recebimentoMudar).toHaveBeenCalledTimes(1)
  expect(a.api.recebimentoMudar).toHaveBeenLastCalledWith('familia-ficticia', 'r', {
    recebido_em: '2026-12-15',
    valor_recebido: 987.65,
  })
  const desfazer = a.toast.mock.calls[a.toast.mock.calls.length - 1][1]
  expect(desfazer).toBeTypeOf('function')
  await act(async () => desfazer())
  expect(a.linhas[0].recebido_em).toBeNull()
  expect(a.linhas[0].valor_recebido).toBeNull()
})
it('falha ao confirmar mantém a data e o valor digitados; fechar a conferência não grava', async () => {
  const a = await montar({
    apiExtra: {
      recebimentoMudar: vi.fn(async () => {
        throw new Error('rede')
      }),
    },
  })
  await a.click('Chegou')
  await a.change('Quanto realmente chegou', '432,10')
  await a.change('Data em que chegou', '2026-12-14')
  await a.submit()
  expect(a.box.textContent).toContain('Seus campos continuam aqui')
  expect(props(a.campo('Quanto realmente chegou')).value).toBe('432,10')
  expect(props(a.campo('Data em que chegou')).value).toBe('2026-12-14')
  await a.click('Fechar')
  expect(a.api.recebimentoMudar).toHaveBeenCalledTimes(1)
})
it('conferir uma ocorrência não cria linhas nem quita a série e desfazer preserva outra ocorrência', async () => {
  const a = await montar({ cfg: { fontes_receita: { r: mensal } } })
  await a.click('Chegou')
  await a.change('Qual ocorrência chegou?', '2027-01')
  await a.change('Data em que chegou', '2026-12-16')
  await a.submit()
  expect(a.api.recebimentoMudar).not.toHaveBeenCalled()
  expect(a.api.recebimentoCriar).not.toHaveBeenCalled()
  expect((a.cfg.receitas_controle as any).r.recebidas['2027-01'].data).toBe('2026-12-16')
  const desfazer = a.toast.mock.calls[a.toast.mock.calls.length - 1][1]
  ;(a.cfg.receitas_controle as any).r.recebidas['2027-02'] = { valor: 100, data: '2026-12-16' }
  await act(async () => desfazer())
  expect((a.cfg.receitas_controle as any).r.recebidas['2027-01']).toBeUndefined()
  expect((a.cfg.receitas_controle as any).r.recebidas['2027-02']).toEqual({ valor: 100, data: '2026-12-16' })
})
it('cadastrar novo negócio provável grava certo=false e contrato fixo na config', async () => {
  const a = await montar({ linhas: [] })
  expect(a.box.textContent).toContain('Tem uma empresa ou negócio novo')
  await a.click('Cadastre aqui')
  await a.change('O que é', 'Projeto fictício')
  await a.change('Quanto entra', '900')
  await a.click('Novo negócio')
  await a.click('Provável')
  await a.click('Todo mês')
  await a.change('Até quando', '2027-06')
  await a.submit()
  expect(a.api.recebimentoCriar).toHaveBeenCalledWith(
    'familia-ficticia',
    expect.objectContaining({ certo: false, valor: 900 }),
  )
  expect((a.cfg.fontes_receita as any).novo).toEqual({
    origem: 'negocio_novo',
    certeza: 'provavel',
    recorrencia: 'mensal',
    fim: '2027-06',
  })
  expect(a.box.textContent).not.toContain('Tem uma empresa ou negócio novo')
})
it('falha da fonte depois de criar permite repetir sem cadastrar duas vezes', async () => {
  const cfg: Record<string, unknown> = {},
    salvar = vi
      .fn()
      .mockRejectedValueOnce(new Error('rede'))
      .mockImplementation(async (_f, k, v) => {
        cfg[k] = structuredClone(v)
      })
  const a = await montar({ cfg, linhas: [], apiExtra: { salvarConfig: salvar } })
  await a.click('Recebimento')
  await a.change('O que é', 'Projeto fictício')
  await a.change('Quanto entra', '900')
  await a.click('Novo negócio')
  await a.submit()
  expect(a.box.textContent).toContain('falta guardar a fonte')
  await a.submit()
  expect(a.api.recebimentoCriar).toHaveBeenCalledTimes(1)
  expect((cfg.fontes_receita as any).novo.origem).toBe('negocio_novo')
})
it('editar a série preserva recibos conferidos e sincroniza a certeza do banco', async () => {
  const cfg = {
    fontes_receita: { r: mensal },
    receitas_controle: { r: { recebidas: { '2026-12': { valor: 10000, data: '2026-12-15' } } } },
  }
  const a = await montar({ cfg })
  await a.click('Mudar o mês ou tirar')
  await a.click('Provável')
  await a.change('Valor de cada recebimento', '2300')
  await a.submit()
  expect(cfg.receitas_controle.r.recebidas['2026-12'].valor).toBe(10000)
  expect((cfg.receitas_controle.r as any).valor).toBe(230000)
  expect(cfg.fontes_receita.r.certeza).toBe('provavel')
  expect(a.api.recebimentoMudar).toHaveBeenCalledWith('familia-ficticia', 'r', { certo: false })
})
it('preferência Com tudo persiste neste aparelho e o oficial retornado continua Garantido', async () => {
  const cfg = { fontes_receita: { r: { ...mensal, certeza: 'incerto' } } }
  const a = await montar({ cfg })
  await a.click('Com tudo')
  expect(a.storage.get('cenario_receitas')).toBe('tudo')
  const oficial = await a.api.futuroEntradas!('familia-ficticia')
  expect(oficial.entrada!.recebimentos.every(r => !r.certo)).toBe(true)
  await act(async () => roots[0].unmount())
  roots.shift()
  const b = await montar({ cfg, storage: a.storage })
  expect(b.botao('Com tudo').getAttribute('aria-pressed')).toBe('true')
  expect(b.box.textContent).toContain('Garantido é o número oficial')
  vi.stubGlobal('localStorage', {
    getItem() {
      throw new Error('bloqueado')
    },
    setItem() {
      throw new Error('bloqueado')
    },
  })
  const c = await montar()
  vi.stubGlobal('localStorage', {
    setItem() {
      throw new Error('bloqueado')
    },
  })
  await c.click('Com previstos')
  expect(c.botao('Com previstos').getAttribute('aria-pressed')).toBe('true')
})
it('config corrompida não parece vazio nem sobrescreve dados ao editar fonte', async () => {
  const a = await montar({ cfg: { fontes_receita: 'quebrado' } })
  expect(a.box.textContent).toContain('dados inválidos')
  await a.click('Mudar o mês ou tirar')
  expect(props(a.botao('Salvar fonte e valor')).disabled).toBe(true)
  await a.submit()
  expect(a.api.salvarConfig).not.toHaveBeenCalled()
})
it('olho fechado protege valores, rótulos e datas em todos os cenários e na conferência', async () => {
  const a = await montar({ cfg: { fontes_receita: { r: mensal } }, oculto: true })
  await a.click('Com tudo')
  await a.click('Chegou')
  expect(a.box.textContent).toContain('Conferir recebimento')
  expect(a.box.textContent).not.toContain('Empresa fictícia secreta')
  expect(a.box.textContent).not.toContain('Rótulo secreto')
  expect(a.box.textContent).not.toContain('1.234')
  expect(a.box.textContent).not.toContain('2026-12-16')
  expect(props(a.campo('Quanto realmente chegou')).value).toBe('')
  expect(a.box.buscar(n => n.tagName === 'OPTION' && /^\d{4}-\d{2}$/.test(n.getAttribute('value') || ''))).toHaveLength(
    0,
  )
  expect(
    a.box.buscar(n => [...n.atributos.values()].some(v => v.includes('secreto') || v.includes('1234.56'))),
  ).toHaveLength(0)
  await a.render({ oculto: false })
  expect(props(a.campo('Quanto realmente chegou')).value).toBe('1.234,56')
})
it.each(['pessoa', 'equipe'] as const)('%s não monta nem lê receitas ou config', async papel => {
  const a = await montar({ papel })
  expect(a.box.textContent).toBe('')
  expect(a.api.config).not.toHaveBeenCalled()
  expect(a.api.recebimentos).not.toHaveBeenCalled()
  expect(a.api.futuroEntradas).not.toHaveBeenCalled()
})
