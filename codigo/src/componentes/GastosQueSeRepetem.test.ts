import { describe, expect, it } from 'vitest'
import type { Lancamento } from '../api/tipos'
import { gastosQueSeRepetem } from './GastosQueSeRepetem'

let n = 0
const c = (descricao: string, valor: number, data: string) =>
  ({ id: 'l' + ++n, envelope_id: 'e', descricao, valor, data, criado_em: data + 'T10:00:00Z' }) as Lancamento

describe('compras que se repetem', () => {
  it('junta o mesmo nome com acento, maiúscula e espaço diferentes', () => {
    const r = gastosQueSeRepetem([
      c('Café', 8, '2026-11-02'),
      c('cafe ', 10, '2026-11-05'),
      c('CAFÉ', 12, '2026-11-20'),
      c('Padaria', 30, '2026-11-03'),
    ])
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ nome: 'CAFÉ', n: 3, total: 30, media: 10 })
  })
  it('só entra o que voltou 3 vezes ou mais; maior soma primeiro; no máximo 3', () => {
    const l = [
      ...['01', '02', '03'].map(d => c('Uber', 20, `2026-11-${d}`)),
      ...['01', '02', '03', '04'].map(d => c('Padaria', 15, `2026-11-${d}`)),
      ...['01', '02', '03'].map(d => c('Farmácia', 50, `2026-11-${d}`)),
      ...['01', '02', '03'].map(d => c('Lanche', 5, `2026-11-${d}`)),
      c('Salão', 200, '2026-11-04'),
      c('Salão', 200, '2026-11-09'),
    ]
    expect(gastosQueSeRepetem(l).map(g => g.nome)).toEqual(['Farmácia', 'Uber', 'Padaria'])
  })
  it('compra sem nome não conta', () => {
    expect(gastosQueSeRepetem([c('', 5, '2026-11-01'), c(' ', 5, '2026-11-02'), c('', 5, '2026-11-03')])).toEqual([])
  })
})
