import { describe, expect, it } from 'vitest'
import { iniciaisDistintas } from './iniciais'
import { diaDaCompra } from '../../componentes/ComprasDoMes'
import { dataCurta } from '../../lib/formato'

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
