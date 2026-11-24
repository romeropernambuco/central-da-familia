import { describe, expect, it } from 'vitest'
import { conquistasDoMes, iniciaisDistintas } from './conquistas'
import { diaDaCompra } from '../../componentes/ComprasDoMes'
import { dataCurta, reais } from '../../lib/formato'

describe('conquistas do mês: a que falta diz quanto falta', () => {
  it('mantém as 4 conquistas e as regras de antes', () => {
    const c = conquistasDoMes({ temGasto: true, dentro: 7, sobra: 100, seguidos: 3 })
    expect(c.map(x => x.nome)).toEqual([
      '1º gasto anotado',
      '7 dias dentro do valor do dia',
      'Sobra anotada passou de R$ 100',
      '3 dias seguidos anotados',
    ])
    expect(c.every(x => x.ok)).toBe(true)
  })
  it('diz o que falta em cada uma', () => {
    const c = conquistasDoMes({ temGasto: false, dentro: 4, sobra: 30, seguidos: 1 })
    expect(c.map(x => x.ok)).toEqual([false, false, false, false])
    expect(c[1].falta).toBe('Ainda não: 4 de 7 dias até agora')
    expect(c[2].falta).toBe(`Ainda não: faltam ${reais(70)}`)
    expect(c[3].falta).toBe('Ainda não: 1 de 3 dias até agora')
  })
  it('sobra negativa ou zero: faltam os R$ 100 inteiros', () => {
    expect(conquistasDoMes({ temGasto: true, dentro: 0, sobra: -20, seguidos: 0 })[2].falta).toBe(
      `Ainda não: faltam ${reais(100)}`,
    )
  })
})

describe('iniciais que não se repetem', () => {
  it('Bruno e Bia viram Br e Bi; Ana fica com A', () => {
    expect(iniciaisDistintas(['Ana', 'Bruno', 'Bia'])).toEqual(['A', 'Br', 'Bi'])
  })
  it('sem repetição, 1 letra só', () => {
    expect(iniciaisDistintas(['Ana', 'Carlos'])).toEqual(['A', 'C'])
  })
})

describe('dia da compra', () => {
  it('hoje, ontem ou a data curta', () => {
    expect(diaDaCompra('2026-11-24', '2026-11-24', '2026-11-23')).toBe('hoje')
    expect(diaDaCompra('2026-11-23', '2026-11-24', '2026-11-23')).toBe('ontem')
    expect(diaDaCompra('2026-11-20', '2026-11-24', '2026-11-23')).toBe(dataCurta('2026-11-20'))
  })
})
