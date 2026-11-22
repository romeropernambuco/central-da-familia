// "Recebi da dívida" (regra do dono, 22/11/2026): o advogado recupera o bruto, fica com a parte dele e repassa o resto;
// na conta da família entra o repasse; os honorários são despesa do imóvel; a dívida e a causa descontam o bruto.
import { describe, expect, it } from 'vitest'
import { receberDaDivida, type CadernoImovel } from './aluguel'

const caderno = (divida: number): CadernoImovel => ({
  dia_vencimento: 10,
  recebimentos: [],
  despesas: [],
  problema: { etapa: 'advogado', desde: '2026-09', volta: null, advogado: 'Dra. Paula', divida, andamento: [] },
})

describe('recebi da dívida do inquilino', () => {
  it('recuperou 8 mil, o advogado ficou com 1,6 mil: entram 6,4 mil e a dívida e a causa descontam os 8 mil', () => {
    const r = receberDaDivida(caderno(10000), 8000, 1600, '2026-11-22', 'e1', 'h1')!
    expect(r.entrada).toEqual({
      id: 'e1',
      data: '2026-11-22',
      valor: 6400,
      de: 'Dívida do inquilino',
      destino: 'aluguel atrasado',
    })
    expect(r.caderno.problema!.divida).toBe(2000)
    expect(r.caderno.problema!.causa).toEqual({ recuperado: 8000 })
    expect(r.caderno.despesas).toEqual([
      { id: 'h1', data: '2026-11-22', valor: 1600, descricao: 'Honorários do advogado' },
    ])
    expect(r.caderno.problema!.andamento.at(-1)!.texto).toBe(
      'Recuperou R$ 8.000,00 da dívida; ficou com o advogado R$ 1.600,00; chegou R$ 6.400,00',
    )
  })

  it('uma 2ª recuperação soma no que já voltou; sem honorários não cria despesa; a dívida não fica negativa', () => {
    const r1 = receberDaDivida(caderno(1000), 1200, 0, '2026-11-22', 'e2')!
    expect(r1.caderno.despesas).toEqual([])
    expect(r1.caderno.problema!.divida).toBe(0)
    const r2 = receberDaDivida(r1.caderno, 300, 0, '2026-12-05', 'e3')!
    expect(r2.caderno.problema!.causa).toEqual({ recuperado: 1500 })
  })

  it('sem problema aberto, valor zero ou advogado ficando com mais do que recuperou: nada muda', () => {
    expect(receberDaDivida({ ...caderno(100), problema: null }, 50, 0, '2026-11-22', 'x')).toBeNull()
    expect(receberDaDivida(caderno(100), 0, 0, '2026-11-22', 'x')).toBeNull()
    expect(receberDaDivida(caderno(100), 50, 60, '2026-11-22', 'x')).toBeNull()
  })
})
