import { describe, expect, it } from 'vitest'
import {
  reais, partesDinheiro, hojeRecife, somaDias, diasNoMes, dataCurta, mesCurto, diasRestantes, segundaDaSemana,
  tecla, textoParaValor, simularCompra, cofrinho, avisoDAE, reservaFolha, previsaoGas, mensagemConvite,
  codigo4Valido, codigo6Valido, emailValido, segundosDesde, segundosTexto, centavos,
} from './formato'

describe('dinheiro', () => {
  it('formata sem ,00 e com milhar', () => {
    expect(reais(8380)).toBe('R$\u00a08.380')
    expect(reais(1234567.5)).toBe('R$\u00a01.234.567,50')
    expect(reais(45.9)).toBe('R$\u00a045,90')
    expect(reais(0)).toBe('R$\u00a00')
    // rodada 2: nunca sinal de menos na tela: o que passou vira "passou R$ 10"
    expect(reais(-10)).toBe('passou R$\u00a010')
  })
  it('não erra centavo de ponto flutuante', () => {
    expect(reais(0.1 + 0.2)).toBe('R$\u00a00,30')
    expect(centavos(1.005)).toBe(1.01)
    expect(partesDinheiro(19.99)).toEqual({ sinal: '', inteiro: '19', cents: ',99' })
  })
})

describe('datas no fuso de Recife', () => {
  it('hoje vira o dia de Recife mesmo perto da meia-noite UTC', () => {
    expect(hojeRecife(new Date('2026-11-12T02:30:00Z'))).toBe('2026-11-11')
    expect(hojeRecife(new Date('2026-11-12T03:30:00Z'))).toBe('2026-11-12')
  })
  it('contas de calendário', () => {
    expect(somaDias('2026-11-30', 1)).toBe('2026-12-01')
    expect(diasNoMes('2028-02-10')).toBe(29)
    expect(dataCurta('2026-11-03')).toBe('03/11')
    expect(mesCurto('2027-01')).toBe('jan/27')
    expect(diasRestantes('2026-11-11')).toBe(20)
    expect(segundaDaSemana('2026-11-15')).toBe('2026-11-09')
    expect(segundaDaSemana('2026-11-09')).toBe('2026-11-09')
  })
})

describe('teclado do Lançar', () => {
  const digita = (s: string) => s.split('').reduce((a, t) => tecla(a, t === '<' ? 'apagar' : t), '')
  it('monta o valor', () => {
    expect(digita('45,9')).toBe('45,9')
    expect(textoParaValor(digita('45,9'))).toBe(45.9)
    expect(digita('1,234')).toBe('1,23')
    expect(digita(',5')).toBe('0,5')
    expect(digita('0012')).toBe('12')
    expect(digita('12<')).toBe('1')
    expect(digita('1234567')).toBe('123456')
    expect(digita('1,,2')).toBe('1,2')
  })
})

describe('E se eu comprar?', () => {
  it('parcela e joga na fatura certa', () => {
    const p = simularCompra(1000, 3, '2026-11-02', 3, 10)
    expect(p.map(x => x.mes)).toEqual(['2026-11', '2026-12', '2027-01'])
    expect(p.reduce((s, x) => s + x.valor, 0)).toBeCloseTo(1000, 2)
    expect(p[0].valor).toBe(333.34)
    const depois = simularCompra(100, 1, '2026-11-05', 3, 10)
    expect(depois[0].mes).toBe('2026-12')
    expect(simularCompra(50, 0, '2026-12-20', 25, 5)[0].mes).toBe('2027-01')
    expect(simularCompra(50, 1, '2026-12-28', 25, 5)[0].mes).toBe('2027-02')
  })
})

describe('cofrinho', () => {
  it('cofrinho soma só sobra de dia anotado', () => {
    expect(cofrinho({ a: 40, b: 150, c: 100 }, 100, ['a', 'b', 'c', 'd'])).toBe(60)
  })
})

describe('casa', () => {
  it('aviso da guia DAE antes do dia 7', () => {
    expect(avisoDAE('2026-12-03', false)).toEqual({ mostrar: true, dias: 4, vence: '2026-12-07' })
    expect(avisoDAE('2026-12-03', true).mostrar).toBe(false)
    expect(avisoDAE('2026-12-08', false).mostrar).toBe(false)
  })
  it('reserva de férias e 13º', () => {
    expect(reservaFolha(1800)).toEqual({ decimo: 150, ferias: 200, total: 350 })
  })
  it('gás avisa 5 dias antes', () => {
    expect(previsaoGas(['2026-09-01', '2026-10-01', '2026-10-31'])).toEqual({ media: 30, acaba: '2026-11-30', avisar: '2026-11-25' })
    expect(previsaoGas(['2026-10-01']).media).toBeNull()
  })
})

describe('convites e códigos', () => {
  it('mensagem pronta sem travessão', () => {
    const m = mensagemConvite('pessoa', { familia: 'Silva', quem: 'Bruno', link: 'https://x', email: 'bruno@x.com' })
    expect(m).toContain('nosso número do dia')
    expect(m).not.toMatch(/[—–]/)
    expect(mensagemConvite('equipe', { familia: 'Silva', quem: 'Carla', link: 'https://x', codigo: '4821' })).toContain('4821')
  })
  it('valida códigos e e-mail', () => {
    expect(codigo6Valido('123456')).toBe(true)
    expect(codigo6Valido('12345')).toBe(false)
    expect(codigo4Valido('0042')).toBe(true)
    expect(emailValido('ana@silva.com')).toBe(true)
    expect(emailValido('ana@')).toBe(false)
  })
  it('mede segundos', () => {
    expect(segundosDesde(1000, 7450)).toBe(6.5)
    expect(segundosTexto(6.5)).toBe('6,5 s')
  })
})
