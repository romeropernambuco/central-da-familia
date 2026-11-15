import { Simulate } from 'react-dom/test-utils'
import { CampoValor } from '../../componentes/base'
import { act, createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { FichaFuncionario } from './Ficha'
import { esconderValores } from '../../lib/formato'
import { DocumentoTeste, NoTeste } from './numeros.dom-teste'
import type { Api, EscritorioHoje, FuncionarioEsc } from '../../api/tipos'

describe('privacidade da ficha real, sem mocks de hooks', () => {
  it.each(['abrir fechado', 'esconder aberto', 'mostrar novamente', 'salvar intacto'])('%s', async caso => {
    const doc = new DocumentoTeste()
    Object.assign(NoTeste.prototype, { focus() {}, querySelectorAll() { return [] } })
    vi.stubGlobal('document', doc)
    vi.stubGlobal('window', { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} })
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const container = doc.createElement('div'); doc.body.appendChild(container)
    const root = createRoot(container as unknown as HTMLElement)
    const original = [{ id: 'r', nome: 'Conta confidencial', valor: 4321.98, dia: 5 }]
    const salvarConfig = vi.fn(async () => {})
    const api = { config: async (_f: string, chave: string, padrao: unknown) => chave === 'contas_fixas' ? original : padrao, salvarConfig } as unknown as Api
    const inicial = caso === 'abrir fechado' || caso === 'salvar intacto'
    function Tela() {
      const [oculto, setOculto] = useState(inicial)
      return createElement(ContextoApp.Provider, { value: { api, oculto, familia: { id: 'teste', membroNome: 'Pessoa' }, versao: 0,
        tentar: async (f: () => Promise<unknown>) => { await f(); return true }, recarregar: async () => {}, toast: () => {},
      } as unknown as Ctx },
      createElement('button', { onClick: () => { esconderValores(!oculto); setOculto(!oculto) } }, 'Olho'),
      createElement(FichaFuncionario, { f: { id: 'contador', nome: 'Contador', frase: '', estado: 'ok', ultimas_respostas: [] } as unknown as FuncionarioEsc,
        e: { precisa_de_voce: [], entregue: [] } as unknown as EscritorioHoje, responder: async () => true, fechar: () => {} }))
    }
    const botao = (texto: string) => container.buscar(n => n.tagName === 'BUTTON' && n.textContent === texto)[0]
    const inputs = () => container.buscar(n => n.tagName === 'INPUT') as (NoTeste & { value: string })[]
    try {
      esconderValores(inicial)
      await act(async () => root.render(createElement(Tela)))
      await act(async () => container.buscar(n => n.getAttribute('aria-label') === 'Editar')[0].click())
      if (!inicial) {
        expect(inputs()[0].value).toBe('Conta confidencial'); expect(inputs()[1].value).toBe('4.321,98')
        await act(async () => botao('Olho').click())
      }
      expect(inputs()).toHaveLength(3)
      for (const n of inputs().slice(0, 2)) {
        expect.soft(n.value).toBe(''); expect.soft(n.getAttribute('placeholder')).toBe('•••')
        for (const a of ['placeholder', 'title', 'aria-label']) expect(n.getAttribute(a) || '').not.toMatch(/confidencial|4321|4\.321/)
      }
      if (caso === 'mostrar novamente') {
        await act(async () => botao('Olho').click())
        expect(inputs()[0].value).toBe('Conta confidencial'); expect(inputs()[1].value).toBe('4.321,98')
      }
      if (caso === 'salvar intacto') {
        await act(async () => botao('Salvar').click())
        expect(salvarConfig).toHaveBeenCalledWith('teste', 'contas_fixas', original)
      }
    } finally { await act(async () => root.unmount()); esconderValores(false); vi.unstubAllGlobals() }
  })
})



describe('CampoValor montado com contexto real', () => {
  it.each(['lancar novo', 'existente mascarado', 'esconder durante edicao', 'mostrar novamente', 'salvar sem tocar'])('%s', async caso => {
    const doc = new DocumentoTeste()
    vi.stubGlobal('document', doc)
    vi.stubGlobal('window', { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} })
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const container = doc.createElement('div'); doc.body.appendChild(container)
    const root = createRoot(container as unknown as HTMLElement)
    const salvar = vi.fn()
    function Formulario() {
      const [oculto, setOculto] = useState(caso !== 'esconder durante edicao')
      const [valor, setValor] = useState('')
      const [existente, setExistente] = useState('4321,98')
      return createElement(ContextoApp.Provider, { value: { oculto } as Ctx },
        createElement(CampoValor, { valor, mudar: setValor, rotulo: 'Novo' }),
        createElement(CampoValor, { valor: existente, mudar: setExistente, rotulo: 'Existente' }),
        createElement('button', { onClick: () => setOculto(!oculto) }, 'Olho'),
        createElement('button', { onClick: () => salvar({ valor, existente }) }, 'Salvar'))
    }
    const campo = (nome: string) => container.buscar(n => n.getAttribute('aria-label') === nome)[0] as NoTeste & { value: string }
    const botao = (nome: string) => container.buscar(n => n.tagName === 'BUTTON' && n.textContent === nome)[0]
    const digitar = async (nome: string, value: string) => {
      expect(campo(nome).getAttribute('readonly')).toBeNull()
      await act(async () => Simulate.change(campo(nome) as unknown as Element, { target: { value } } as never))
    }
    try {
      await act(async () => root.render(createElement(Formulario)))
      // O campo novo permanece editavel junto dos valores existentes.
      expect(campo('Novo').getAttribute('readonly')).toBeNull()
      expect(campo('Novo').getAttribute('placeholder')).toBeNull()
      if (caso === 'salvar sem tocar') {
        await act(async () => botao('Salvar').click())
        expect(salvar).toHaveBeenCalledWith({ valor: '', existente: '4321,98' })
      } else if (caso === 'existente mascarado') {
        expect(campo('Existente').value).toBe('')
        expect(campo('Existente').getAttribute('placeholder')).toBe('\u2022\u2022\u2022')
        expect(campo('Existente').getAttribute('readonly')).not.toBeNull()
        await act(async () => botao('Olho').click())
        await digitar('Existente', '250,50')
        await act(async () => botao('Olho').click())
        expect(campo('Existente').value).toBe('250,50')
        expect(campo('Existente').getAttribute('readonly')).toBeNull()
      } else {
        await digitar('Novo', '1234,56')
        expect(campo('Novo').value).toBe('1.234,56')
        if (caso === 'esconder durante edicao' || caso === 'mostrar novamente') {
          await act(async () => botao('Olho').click())
          expect(campo('Novo').value).toBe('1.234,56')
          expect(campo('Existente').value).toBe(caso === 'mostrar novamente' ? '4.321,98' : '')
        }
        await digitar('Novo', '2500')
        await act(async () => botao('Salvar').click())
        expect(salvar).toHaveBeenCalledWith({ valor: '2500', existente: '4321,98' })
      }
    } finally { await act(async () => root.unmount()); vi.unstubAllGlobals() }
  })
})
