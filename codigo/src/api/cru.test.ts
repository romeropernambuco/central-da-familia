import { describe, expect, it } from 'vitest'
import { cru, lista } from './cru'
import { normalizaCasa, normalizaLancamento, normalizaResumo } from './normaliza'
import { normalizaEscritorio, normalizaGuardado } from './normaliza2'

describe('resposta crua do banco', () => {
  it('o que não é objeto vira objeto sem campos', () => {
    for (const v of [null, undefined, 0, 7, '', 'texto', true]) expect(cru(v)).toEqual({})
    const o = { a: 1 }
    expect(cru(o)).toBe(o)
  })

  it('o que não é lista vira lista vazia', () => {
    for (const v of [null, undefined, 0, 'texto', { a: 1 }]) expect(lista(v)).toEqual([])
    const l = [{ a: 1 }]
    expect(lista(l)).toBe(l)
  })

  it('resposta vazia do banco nunca quebra a tela: vira zero e lista vazia', () => {
    for (const vazio of [null, undefined, {}]) {
      expect(normalizaResumo(vazio)).toMatchObject({ pode_gastar_hoje: 0, envelopes: [], explicacao: [] })
      expect(normalizaCasa(vazio)).toMatchObject({ lista: [], prestadores: [], gas: { trocas: [] } })
      expect(normalizaGuardado(vazio)).toMatchObject({ total: 0, aplicacoes: [] })
      expect(normalizaEscritorio(vazio)).toMatchObject({ precisa_de_voce: [], funcionarios: [] })
      expect(normalizaLancamento(vazio)).toMatchObject({ valor: 0, cartao_id: null })
    }
  })

  it('lista que veio em formato errado vira lista vazia, sem derrubar a tela', () => {
    expect(normalizaResumo({ envelopes: 'x', explicacao: { a: 1 } })).toMatchObject({ envelopes: [], explicacao: [] })
    expect(normalizaCasa({ lista: 5, gas: 'x', presenca: null })).toMatchObject({ lista: [], gas: { trocas: [] } })
  })

  it('quem lê o banco não usa tipo frouxo: todo campo é convertido ou tem o formato dito por escrito', () => {
    const fontes = import.meta.glob<string>('./{real,normaliza,normaliza2,cru}.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    })
    expect(Object.keys(fontes)).toHaveLength(4)
    for (const [arquivo, fonte] of Object.entries(fontes)) {
      const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      expect(codigo.match(/\bany\b/g) || [], arquivo).toEqual([])
    }
  })
})
