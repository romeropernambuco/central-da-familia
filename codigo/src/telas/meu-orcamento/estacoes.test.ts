import { describe, expect, it, vi } from 'vitest'
import { reais } from '../../lib/formato'
import { estacoesDoOrcamento } from './estacoes'

const base = {
  oculto: false,
  meu: true,
  gastoHoje: 12,
  dia: 24,
  dentro: false,
  passa: 706.25,
  sobra: 0 as number | null,
  comprasNoMes: 23,
  repetidas: 3,
  somaRepetidas: 2295,
  anotar: () => {},
  irPara: () => {},
}

describe('agentes do palco do Meu orçamento', () => {
  it('são 4, cada um com o cartão dele', () => {
    const e = estacoesDoOrcamento(base)
    expect(e.map(x => x.id)).toEqual(['assistente', 'analista', 'tesoureira', 'comprador'])
    expect(e.map(x => x.alvo)).toEqual(['oHoje', 'oRitmo', 'oCofrinho', 'oRepete'])
  })
  it('cada um fala o número dele em 1 frase', () => {
    const [a, an, t, c] = estacoesDoOrcamento(base)
    expect(a.fala).toBe(`Hoje você já anotou ${reais(12)}.`)
    expect(an.fala).toBe(`Se continuar assim, passa ${reais(706.25)} no fim do mês.`)
    expect(t.fala).toBe('Ainda não sobrou nada este mês.')
    expect(c.fala).toBe(`3 compras se repetem e já somam ${reais(2295)}.`)
  })
  it('com o olho fechado, nenhuma frase leva valor', () => {
    const falas = estacoesDoOrcamento({ ...base, oculto: true, sobra: 80 }).map(x => x.fala)
    for (const f of falas) expect(f).not.toMatch(/R\$|\d{2,}/)
  })
  it('antes do dia 3 o analista não prevê; mês estourado esvazia o pote', () => {
    const e = estacoesDoOrcamento({ ...base, dia: 2, sobra: null })
    expect(e[1].fala).toBe('Ainda é cedo para prever como o mês fecha.')
    expect(e[2].fala).toBe('O pote está vazio: o mês passou do combinado.')
  })
  it('o botão do assistente anota; quem só vê não ganha o botão de anotar', () => {
    const anotar = vi.fn(),
      irPara = vi.fn()
    const dono = estacoesDoOrcamento({ ...base, anotar, irPara })[0]
    expect(dono.acao.rotulo).toBe('Anotar compra')
    dono.acao.fazer()
    expect(anotar).toHaveBeenCalledTimes(1)
    const visita = estacoesDoOrcamento({ ...base, meu: false, anotar, irPara })[0]
    expect(visita.acao.rotulo).toBe('Ver hoje')
    visita.acao.fazer()
    expect(irPara).toHaveBeenCalledWith('oHoje')
    expect(anotar).toHaveBeenCalledTimes(1)
  })
  it('sem compra repetida, o comprador fala das compras do mês', () => {
    const c = estacoesDoOrcamento({ ...base, repetidas: 0, somaRepetidas: 0 })[3]
    expect(c.alvo).toBe('oCompras')
    expect(c.fala).toBe('Você anotou 23 compras este mês.')
  })
})
