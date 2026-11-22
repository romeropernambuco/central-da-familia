// "Recebi da dívida" (regra do dono, 22/11/2026): o que o advogado recuperar entra como dinheiro do mês; honorários são
// despesa do imóvel.
import { describe, expect, it } from 'vitest'
import { receberDaDivida, type CadernoImovel } from './aluguel'

const caderno = (divida: number): CadernoImovel => ({
  dia_vencimento: 10,
  recebimentos: [],
  despesas: [],
  problema: { etapa: 'advogado', desde: '2026-09', volta: null, advogado: 'Dra. Paula', divida, andamento: [] },
})

describe('recebi da dívida do inquilino', () => {
  it('o dinheiro entra no mês, a dívida diminui e os honorários viram despesa do imóvel', () => {
    const r = receberDaDivida(caderno(7500), 3000, 600, '2026-11-22', 'e1', 'h1')!
    expect(r.entrada).toEqual({
      id: 'e1',
      data: '2026-11-22',
      valor: 3000,
      de: 'Dívida do inquilino',
      destino: 'aluguel atrasado',
    })
    expect(r.caderno.problema!.divida).toBe(4500)
    expect(r.caderno.despesas).toEqual([
      { id: 'h1', data: '2026-11-22', valor: 600, descricao: 'Honorários do advogado' },
    ])
    expect(r.caderno.problema!.andamento.at(-1)!.texto).toBe('Recebeu R$ 3.000,00 da dívida; honorários R$ 600,00')
  })

  it('sem honorários não cria despesa; recebeu mais que a dívida: a dívida fica zero', () => {
    const r = receberDaDivida(caderno(1000), 1200, 0, '2026-11-22', 'e2')!
    expect(r.caderno.despesas).toEqual([])
    expect(r.caderno.problema!.divida).toBe(0)
  })

  it('sem problema aberto ou valor zero: nada muda', () => {
    expect(receberDaDivida({ ...caderno(100), problema: null }, 50, 0, '2026-11-22', 'x')).toBeNull()
    expect(receberDaDivida(caderno(100), 0, 0, '2026-11-22', 'x')).toBeNull()
  })
})
