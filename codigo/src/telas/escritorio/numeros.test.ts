import { describe, expect, it, vi } from 'vitest'
import { act, createContext, createElement, useContext, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useApp, type Ctx } from '../../app/contexto'
import { esconderValores, hojeRecife } from '../../lib/formato'
import { NumerosAba } from './NumerosAba'
import { DocumentoTeste, NoTeste } from './numeros.dom-teste'
import type { Api, FamiliaMinha } from '../../api/tipos'
import { rotaDoHash, rotaPermitida, type Rota } from '../../app/rotas'
import { EQUIPE } from './equipe'
import { numerosDaAba, numerosExemplo } from './numeros'

vi.mock('../../app/contexto', () => ({ useApp: vi.fn() }))
vi.mock('../../app/App', () => ({ ir: vi.fn() }))

const familia: FamiliaMinha = { id: 'exemplo', nome: 'Exemplo', papel: 'casal', membroNome: 'Exemplo', envelopeId: 'pessoal' }

describe('funcionários das abas', () => {
  it('cobre cada tela principal com identidade e destino válidos no roteador', () => {
    const abas: Rota[] = ['inicio', 'lancamentos', 'orcamento', 'casa', 'desejos', 'guardado', 'cartoes', 'planejamento', 'escritorio', 'ajustes', 'privacidade', 'painel']
    expect(new Set(EQUIPE.map(f => f.rota))).toEqual(new Set(abas))
    expect(new Set(EQUIPE.map(f => f.id)).size).toBe(EQUIPE.length)
    for (const f of EQUIPE) {
      expect(rotaDoHash('#/' + f.rota)).toBe(f.rota)
      expect(f.objeto.length).toBeGreaterThan(2)
      expect(f.papel.endsWith('.')).toBe(true)
    }
    expect(rotaPermitida('painel', 'casal', false)).toBe('inicio')
    expect(rotaPermitida('painel', 'casal', true)).toBe('painel')
    expect(rotaPermitida('guardado', 'pessoa')).toBe('inicio')
  })

  it('usa o envelope de quem olha, mesmo se o outro vier primeiro', async () => {
    const api = { resumoHoje: vi.fn().mockResolvedValue({ envelopes: [
      { id: 'outro', limite_mes: 999, gasto_mes: 999, livre: 0 },
      { id: 'pessoal', limite_mes: 100, gasto_mes: 20, livre: 80 },
    ] }) } as unknown as Api
    const numeros = await numerosDaAba(api, familia, 'orcamento')
    expect(numeros[1].valor).toBe(20)
    expect(numeros[2].valor).toBe(80)
    expect(api.resumoHoje).toHaveBeenCalledWith('exemplo')
    await expect(numerosDaAba(api, { ...familia, envelopeId: 'ausente' }, 'orcamento')).rejects.toThrow('indisponível')
  })

  it('não conta lançamentos apagados e não transforma erro de leitura em zero', async () => {
    const lancamentos = vi.fn().mockResolvedValue([{ valor: 20, data: hojeRecife(), apagado_em: null }, { valor: 90, data: hojeRecife(), apagado_em: '2026-01-01' }])
    const api = { lancamentos } as unknown as Api
    const numeros = await numerosDaAba(api, familia, 'lancamentos')
    expect(numeros[0].texto).toBe('1')
    expect(numeros[1].valor).toBe(20)
    lancamentos.mockRejectedValue(new Error('Sem leitura'))
    await expect(numerosDaAba(api, familia, 'lancamentos')).rejects.toThrow('Sem leitura')
  })

  it('zero desejos é válido; função ausente exige exemplo, sem inventar número', async () => {
    const api = { desejos: vi.fn().mockResolvedValue([]) } as unknown as Api
    expect((await numerosDaAba(api, familia, 'desejos')).map(n => n.texto)).toEqual(['0', '0'])
    await expect(numerosDaAba({} as Api, familia, 'desejos')).rejects.toThrow('indisponíveis')
  })

  it('o provedor de exemplo existente atende todas as abas sem dados reais', async () => {
    const { reiniciarExemplo } = await import('../../api/exemplo')
    reiniciarExemplo()
    for (const rota of new Set(EQUIPE.map(f => f.rota))) {
      const numeros = await numerosExemplo(rota)
      expect(numeros.length, rota).toBeGreaterThan(0)
      for (const n of numeros) {
        expect(n.nome.length, rota).toBeGreaterThan(0)
        expect(String(n.valor ?? n.texto), rota).not.toMatch(/NaN|undefined|Infinity/)
      }
    }
  })
})

describe('privacidade dos indicadores carregados', () => {
  it.each([false, true])('monta NumerosAba com oculto=%s e alterna sem remontar nos dois sentidos', async inicial => {
    const documento = new DocumentoTeste()
    vi.stubGlobal('document', documento)
    vi.stubGlobal('window', { document: documento, HTMLElement: NoTeste, HTMLIFrameElement: class {} })
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const container = documento.createElement('div')
    documento.body.appendChild(container)
    const root = createRoot(container as unknown as HTMLElement)
    const resumoHoje = vi.fn().mockResolvedValue({ envelopes: [
      { id: 'pessoal', limite_mes: 123.45, gasto_mes: -123.45, livre: 0 },
    ] })
    const contexto = createContext<Ctx>(null!)
    vi.mocked(useApp).mockImplementation(() => useContext(contexto))
    const api = { resumoHoje } as unknown as Api
    const tentar = vi.fn()
    const fechar = vi.fn()
    // A mesma instância de elemento depende da atualização do contexto.
    const ficha = createElement(NumerosAba, { id: 'assistente', fechar })
    function Tela() {
      const [oculto, setOculto] = useState(inicial)
      const alternarOculto = () => {
        esconderValores(!oculto)
        setOculto(!oculto)
      }
      return createElement(contexto.Provider, {
        value: { api, familia, sessao: null, versao: 0, tentar, oculto, alternarOculto } as unknown as Ctx,
      },
      createElement('button', {
        onClick: alternarOculto,
        'aria-label': oculto ? 'Mostrar os valores' : 'Esconder os valores',
        'aria-pressed': oculto,
      }),
      ficha)
    }
    try {
      esconderValores(inicial)
      await act(async () => { root.render(createElement(Tela)) })
      const secao = container.buscar(n => n.tagName === 'SECTION')[0]
      const indicadores = container.buscar(n => n.tagName === 'DD')
      expect(indicadores).toHaveLength(3)
      const conferir = (oculto: boolean) => {
        expect(container.buscar(n => n.tagName === 'SECTION')[0]).toBe(secao)
        const atuais = container.buscar(n => n.tagName === 'DD')
        expect(atuais).toHaveLength(3)
        atuais.forEach((no, i) => {
          expect(no).toBe(indicadores[i])
          const dinheiro = no.buscar(n => n.getAttribute('aria-label') !== null)
          expect(dinheiro).toHaveLength(1)
          expect(no.textContent).toBe(oculto ? 'R$•••' : ['R$123,45', 'passou R$123,45', 'R$0'][i])
          expect(dinheiro[0].getAttribute('aria-label')).toBe(oculto
            ? 'valor escondido'
            : ['R$\u00a0123,45', 'passou R$\u00a0123,45', 'R$\u00a00'][i])
        })
        expect(resumoHoje).toHaveBeenCalledTimes(1)
        expect(resumoHoje).toHaveBeenCalledWith('exemplo')
        expect(tentar).not.toHaveBeenCalled()
      }
      conferir(inicial)
      for (const oculto of [!inicial, inicial]) {
        const botao = container.buscar(n => n.tagName === 'BUTTON')[0]
        expect(botao.getAttribute('aria-label')).toBe(oculto ? 'Esconder os valores' : 'Mostrar os valores')
        await act(async () => { botao.click() })
        expect(botao.getAttribute('aria-pressed')).toBe(String(oculto))
        conferir(oculto)
      }
    } finally {
      await act(async () => { root.unmount() })
      esconderValores(false)
      vi.mocked(useApp).mockReset()
      vi.unstubAllGlobals()
    }
  })
})
