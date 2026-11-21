import { esconderValores } from './lib/olho'
import { desfazer } from './api/desfazer'
import { BarraDesfazer } from './componentes/BarraDesfazer'
import { Fragment } from 'react'
import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { DocumentoTeste, NoTeste } from './telas/escritorio/numeros.dom-teste'
import { ContextoApp, type Ctx } from './app/contexto'
import { apiExemplo } from './api/exemplo'
import type { Api } from './api/tipos'
const roots: Root[] = []
afterEach(async () => {
  await act(async () => desfazer.limpar())
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
  vi.stubGlobal('addEventListener', window.addEventListener.bind(window))
  vi.stubGlobal('removeEventListener', window.removeEventListener.bind(window))
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
    await act(async () =>
      root.render(
        createElement(
          ContextoApp.Provider,
          { value: ctx },
          createElement(Fragment, null, el, createElement(BarraDesfazer)),
        ),
      ),
    )
  }
  await render()
  const find = (tag: string, text: string) =>
    box.buscar(n => n.tagName === tag && (n.textContent === text || n.getAttribute('aria-label') === text))[0]
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

import { Privacidade } from './telas/privacidade/Privacidade'
it('12 confirma saída conforme olho atual após leitura', async () => {
  const p = pendente<any>(),
    confirm = vi.fn(() => false)
  const a = await montar(createElement(Privacidade), { exportarFamilia: () => p.promessa }, { oculto: false })
  ;(window as any).confirm = confirm
  let click!: Promise<void>
  await act(async () => {
    click = a.click('Baixar os dados da família')
  })
  await a.render({ oculto: true })
  esconderValores(true)
  await act(async () => {
    p.resolver({ valor: 123 })
    await click
  })
  expect(confirm).toHaveBeenCalledOnce()
  esconderValores(false)
})
it('13 Assessor pode sair da privacidade sem Ajustes', async () => {
  const sair = vi.fn(async () => {})
  const a = await montar(
    createElement(Privacidade),
    {},
    { familia: { id: 'f', papel: 'equipe', nome: 'F', membroId: 'x', membroNome: 'C', envelopeId: null }, sair },
  )
  await a.click('Sair')
  expect(sair).toHaveBeenCalledOnce()
})

import { NomeDaPessoa } from './componentes/NomeDaPessoa'
it('14 autor sem mapeamento tem identificação honesta', async () => {
  const a = await montar(
    createElement(NomeDaPessoa, { pessoa: { tipo: 'membro', id: 'auth-unknown' }, autoria: true } as any),
    { membros: async () => [{ id: 'm1', nome: 'Ana' }] },
  )
  expect(a.box.textContent).toContain('alguém da família')
  expect(a.box.textContent).not.toContain('Sem nome')
})

it('16 edição de Assessor recusa nome de outro Assessor', async () => {
  const salvar = vi.fn(async () => {})
  const a = await montar(
    createElement(NomeDaPessoa, { pessoa: { tipo: 'assessor', id: '1', nome: 'Carla' }, editar: true }),
    {
      salvarNomePessoa: salvar,
      config: async () =>
        ({
          pessoas: [
            { id: '1', nome: 'Carla' },
            { id: '2', nome: 'Davi' },
          ],
        }) as any,
    },
  )
  await a.click('Editar nome')
  await a.change('Nome', 'Davi')
  await a.submit()
  expect(salvar).not.toHaveBeenCalled()
  expect(a.box.textContent).toContain('Já existe')
})

import { Lancar } from './telas/lancar/Lancar'
import { rascunhos } from './app/rascunhos'
it('4 rascunho recupera tipo de operação', async () => {
  rascunhos.set('anotar:' + JSON.stringify(['exemplo', 'u', 'f']), {
    txt: '10',
    desc: 'Presente',
    quando: '2026-11-16',
    cartao: null,
    envelope: 'e',
    parcelas: 1,
    modo: 'entrou',
  })
  const a = await montar(
    createElement(Lancar),
    { cartoes: async () => [], lancamentos: async () => [], guardadoHoje: async () => ({ aplicacoes: [] }) as any },
    {
      sessao: { userId: 'u' } as any,
      familia: { id: 'f', papel: 'casal', nome: 'F', membroId: 'm', membroNome: 'Ana', envelopeId: 'e' },
      resumo: { envelopes: [] } as any,
      lancarAberto: {},
      fecharLancar() {},
    },
  )
  expect(a.box.textContent).toContain('Quanto entrou?')
  await a.click('Anotar')
  expect(rascunhos.size).toBe(0)
})
import { AgenteDaAba } from './telas/escritorio/AgenteDaAba'
it('22 Anfitrião não repete frase do papel', async () => {
  const a = await montar(createElement(AgenteDaAba, { rota: 'inicio' }), {
    escritorioHoje: async () => ({ funcionarios: [], entregue: [], trabalhando: [], precisa_de_voce: [] }),
  })
  expect(a.box.textContent.split('Acompanho o resumo de hoje da família.').length - 1).toBeLessThanOrEqual(1)
})

import { FolhaImovel } from './componentes/Imoveis'
it('5 formulário limpa só a própria chave após confirmar', async () => {
  rascunhos.clear()
  rascunhos.set('cadastro:imovel:f:outro:undefined:a', { apelido: 'Outro' })
  const salvar = vi.fn(async () => true),
    a = await montar(
      createElement(FolhaImovel, {
        inicial: {
          id: 'i',
          meu: true,
          apelido: 'Sala',
          valor: 100,
          uso: 'parado',
          aluguel: 0,
          custos: 0,
          vacancia: '0',
          tem_contrato: false,
          contrato_ate: null,
          venda_valor: null,
          venda_mes: null,
          venda_contrato: false,
        } as any,
        fechar() {},
        salvar,
        tirar() {},
      }),
    )
  await a.change('Ex.: sala do centro', 'Novo')
  expect(rascunhos.has('cadastro:imovel:f:i:undefined:a')).toBe(true)
  await a.click('Salvar')
  expect(salvar).toHaveBeenCalledOnce()
  expect([...rascunhos.keys()]).toEqual(['cadastro:imovel:f:outro:undefined:a'])
  rascunhos.clear()
})
