import { describe, expect, it } from 'vitest'
import { fraseDaSeta, setaDoMes } from './setaDoMes'

describe('seta do mês: entra mais do que sai, ou o contrário, e quanto por cento', () => {
  it('sobe quando entra mais do que sai; a % é a sobra sobre o que entra', () => {
    const a = setaDoMes({ entra: 9000, lucro: 1000, gasto: 6500 })!
    expect(a).toMatchObject({ sentido: 'sobe', entra: 10000, sai: 6500, diferenca: 3500, pct: 35 })
    expect(fraseDaSeta(a).titulo).toBe('Previsto para o mês: entra mais do que sai, sobram R$ 3.500 (35%).')
  })

  it('desce quando sai mais do que entra; a % é o que saiu a mais sobre o que entra', () => {
    const a = setaDoMes({ entra: 9000, lucro: 1000, gasto: 11200 })!
    expect(a).toMatchObject({ sentido: 'desce', diferenca: -1200, pct: 12 })
    expect(fraseDaSeta(a).titulo).toBe('Previsto para o mês: sai mais do que entra, R$ 1.200 a mais (12%).')
  })

  it('empate conta como sobe (não saiu mais do que entrou)', () => {
    expect(setaDoMes({ entra: 5000, lucro: 0, gasto: 5000 })).toMatchObject({ sentido: 'sobe', pct: 0 })
  })

  it('sem nada entrando, não há seta (não divide por zero)', () => {
    expect(setaDoMes({ entra: 0, lucro: 0, gasto: 300 })).toBeNull()
  })

  it('mostra o mês passado sem julgar melhor ou pior (o mês de hoje ainda não acabou)', () => {
    const agora = setaDoMes({ entra: 10000, lucro: 0, gasto: 4000 })!
    const antes = setaDoMes({ entra: 10000, lucro: 0, gasto: 10800 })!
    const f = fraseDaSeta(agora, antes)
    expect(f.comparacao).toBe('Mês passado: saíram 8% a mais do que entrou.')
    expect(fraseDaSeta(agora, setaDoMes({ entra: 10000, lucro: 0, gasto: 8000 })).comparacao).toBe(
      'Mês passado: sobraram 20%.',
    )
    expect(f.comparacao).not.toMatch(/melhor|pior/)
  })

  it('a tela fica curta: título em 1 frase, sem sigla; a conta vai para o "Por quê?"', () => {
    const f = fraseDaSeta(setaDoMes({ entra: 9000, lucro: 1000, gasto: 6500 })!)
    expect(f.titulo.split('. ').length).toBe(1)
    expect(f.titulo + f.porque).not.toMatch(/CDI|IPCA|Focus|motor|premissa/)
    expect(f.porque).toContain('R$ 10.000')
    expect(f.porque).toContain('R$ 6.500')
  })
})
