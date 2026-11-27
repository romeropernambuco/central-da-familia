import { afterEach, describe, expect, it, vi } from 'vitest'
import { guardarVistas, lerVistas, marca, marcaDaTarefa, marcasDoEscritorio, marcasNovas } from './novidades'

const fonte = (tarefas: [string, string][], entregas: [string, string][] = []) => ({
  fila: tarefas.map(([membro, id]) => ({ membro: { id: membro }, pergunta: { id } })),
  postos: entregas.map(([membro, resumo]) => ({ membro: { id: membro }, entrega: { resumo } })),
})

afterEach(() => vi.unstubAllGlobals())

describe('o que é novo no escritório desde a última visita', () => {
  it('na primeira visita, sem nada guardado, nada é novidade', () => {
    const marcas = marcasDoEscritorio(fonte([['secretaria', 'seguro']]))
    expect(marcasNovas(marcas, null).size).toBe(0)
  })

  it('tarefa que chegou depois é novidade; a que já estava, não', () => {
    const antes = marcasDoEscritorio(fonte([['secretaria', 'seguro']]))
    const depois = marcasDoEscritorio(
      fonte([
        ['secretaria', 'seguro'],
        ['guardado', 'cdb'],
      ]),
    )
    const novas = marcasNovas(depois, Object.values(antes).flat())
    expect([...novas]).toEqual([marcaDaTarefa('cdb')])
    expect(depois.guardado.some(m => novas.has(m))).toBe(true)
    expect(depois.secretaria.some(m => novas.has(m))).toBe(false)
  })

  it('entrega com outro texto é novidade; a mesma entrega, não', () => {
    const antes = Object.values(marcasDoEscritorio(fonte([], [['comprador', 'Gás pedido.']]))).flat()
    expect(marcasNovas(marcasDoEscritorio(fonte([], [['comprador', 'Gás pedido.']])), antes).size).toBe(0)
    expect(marcasNovas(marcasDoEscritorio(fonte([], [['comprador', 'Feira conferida.']])), antes).size).toBe(1)
  })

  it('o aparelho guarda só marcas embaralhadas: nem o texto da entrega nem o nome da tarefa', () => {
    const guardado: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => guardado[k] ?? null,
      setItem: (k: string, v: string) => {
        guardado[k] = v
      },
    })
    expect(lerVistas('fam')).toBeNull()
    const marcas = marcasDoEscritorio(fonte([['secretaria', 'fatura:nubank']], [['comprador', 'Gás pedido por 120.']]))
    guardarVistas('fam', Object.values(marcas).flat())
    expect(lerVistas('fam')).toEqual(Object.values(marcas).flat())
    expect(lerVistas('outra')).toBeNull()
    expect(JSON.stringify(guardado)).not.toMatch(/nubank|Gás|120|fatura/)
    expect(marca('a')).not.toBe(marca('b'))
  })

  it('sem lugar para guardar, não quebra', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('cheio')
      },
    })
    expect(lerVistas('fam')).toBeNull()
    expect(() => guardarVistas('fam', ['x'])).not.toThrow()
  })
})
