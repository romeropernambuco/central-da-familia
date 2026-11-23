import { describe, expect, it } from 'vitest'
import {
  contasParaLembrar,
  fraseDasContas,
  lerContasDoAno,
  linhaDaConta,
  porqueDasContasNoMes,
  proximaDaConta,
  resumoDasContas,
  vencimentoNoAno,
  type ContaDoAno,
} from './contasDoAno'

const conta = (x: Partial<ContaDoAno>): ContaDoAno => ({
  id: 'c1',
  nome: 'IPTU',
  valor: 3000,
  mes: 2,
  dia: 10,
  parcelas: 1,
  pagas: [],
  ...x,
})

describe('contas do ano: a família preenche, o app calcula', () => {
  it('lê só o que faz sentido; dia e parcelas têm padrão', () => {
    expect(
      lerContasDoAno([
        { id: 'a', nome: ' IPTU ', valor: 3000, mes: 2 },
        { id: 'b', nome: 'IPVA', valor: 0, mes: 1 },
        { id: 'c', nome: '', valor: 10, mes: 1 },
        { id: 'd', nome: 'Seguro', valor: 1200, mes: 13 },
        null,
      ]),
    ).toEqual([{ id: 'a', nome: 'IPTU', valor: 3000, mes: 2, dia: 10, parcelas: 1, pagas: [] }])
    expect(lerContasDoAno('lixo')).toEqual([])
  })

  it('dia 31 em mês curto vira o último dia (fevereiro de ano bissexto também)', () => {
    expect(vencimentoNoAno({ mes: 2, dia: 31 }, 2027)).toBe('2027-02-28')
    expect(vencimentoNoAno({ mes: 2, dia: 31 }, 2028)).toBe('2028-02-29')
  })

  it('IPTU de fevereiro visto em novembro: separa o valor em 3 meses (nov, dez, jan)', () => {
    const p = proximaDaConta(conta({}), '2026-11-22')
    expect(p).toMatchObject({ vence: '2027-02-10', meses: 3, porMes: 1000 })
  })

  it('vence este mês: não separa mais (ela é paga no mês, com o separado ou como gasto)', () => {
    expect(proximaDaConta(conta({ mes: 11, dia: 30 }), '2026-11-22')).toMatchObject({
      vence: '2026-11-30',
      porMes: 0,
      dias: 8,
    })
  })

  it('a mesma quantia todo mês do ciclo, sem separar mais do que a conta', () => {
    const c = conta({ desde: '2026-11' }) // IPTU de R$ 3.000 em 10/02
    const mes = (d: string) => proximaDaConta(c, d).porMes
    expect([mes('2026-11-22'), mes('2026-12-05'), mes('2027-01-30'), mes('2027-02-05')]).toEqual([1000, 1000, 1000, 0])
  })

  it('paga este ano: passa para o ano que vem e volta a separar no mês seguinte, em 11 meses', () => {
    const p = proximaDaConta(conta({ mes: 11, dia: 30, pagas: ['2026'], desde: '2026-01' }), '2026-11-22')
    expect(p).toMatchObject({ vence: '2027-11-30', porMes: 0 })
    const dez = proximaDaConta(conta({ mes: 11, dia: 30, pagas: ['2026'], desde: '2026-01' }), '2026-12-01')
    expect(dez).toMatchObject({ meses: 11, porMes: 272.73 })
  })

  it('"Já paguei" no mês: o que foi separado paga a conta (volta para o que dá para gastar)', () => {
    const iptu = conta({ mes: 12, dia: 15, desde: '2026-09', pagas: ['2026'], pagoEm: '2026-12-15' })
    // set, out, nov: R$ 1.000 por mês; pago em dezembro com os R$ 3.000 juntados
    expect(proximaDaConta(iptu, '2026-12-20')).toMatchObject({ pagoComSeparado: 3000, porMes: 0 })
    expect(proximaDaConta(iptu, '2027-01-03')).toMatchObject({ pagoComSeparado: 0, porMes: 272.73 })
    // pôs a conta e pagou no mesmo mês: nada estava separado; o pagamento é gasto do mês
    expect(proximaDaConta({ ...iptu, desde: '2026-12' }, '2026-12-20').pagoComSeparado).toBe(0)
    // pagou adiantado, em novembro, quando só tinha juntado set e out
    expect(proximaDaConta({ ...iptu, pagoEm: '2026-11-25' }, '2026-11-25').pagoComSeparado).toBe(2000)
  })

  it('venceu há pouco sem marcar como paga: continua nela (o Contador pergunta); depois de 30 dias, ano que vem', () => {
    expect(proximaDaConta(conta({ mes: 11, dia: 1 }), '2026-11-22')).toMatchObject({ vence: '2026-11-01', dias: -21 })
    expect(proximaDaConta(conta({ mes: 10, dia: 1 }), '2026-11-22').vence).toBe('2027-10-01')
  })

  it('parcelada: não separa (cada parcela é gasto do mês em que é paga)', () => {
    const p = proximaDaConta(conta({ parcelas: 10 }), '2026-11-22')
    expect(p).toMatchObject({ porMes: 0, pagoComSeparado: 0 })
    expect(linhaDaConta(p)).toBe('R$ 3.000 em 10 parcelas de R$ 300 · vence em 10/02/2027')
  })

  it('soma tudo e diz em uma frase quanto separar por mês', () => {
    const r = resumoDasContas(
      [conta({}), conta({ id: 'c2', nome: 'IPVA', valor: 2400, mes: 1, dia: 20 })],
      '2026-11-22',
    )
    expect(r.lista.map(p => p.conta.nome)).toEqual(['IPVA', 'IPTU']) // a que vence primeiro vem antes
    expect(r.porMes).toBe(2200) // 2400/2 + 3000/3
    expect(r.noAno).toBe(5400)
    const f = fraseDasContas(r)!
    expect(f.titulo).toBe('Separe R$ 2.200 por mês para pagar as contas do ano em dia.')
    expect(f.titulo + f.porque).not.toMatch(/CDI|IPCA|Focus|motor|premissa|provisão/)
    expect(fraseDasContas(resumoDasContas([], '2026-11-22'))).toBeNull()
    expect(fraseDasContas(resumoDasContas([conta({ parcelas: 10 })], '2026-11-22'))!.titulo).toBe(
      'Este mês não precisa separar nada para as contas do ano.',
    )
  })

  it('o "Por quê?" do que dá para gastar diz conta por conta', () => {
    const r = resumoDasContas(
      [
        conta({ desde: '2026-11' }),
        conta({ id: 'c2', nome: 'IPVA', mes: 11, dia: 5, desde: '2026-08', pagas: ['2026'], pagoEm: '2026-11-05' }),
      ],
      '2026-11-22',
    )
    expect(porqueDasContasNoMes(r)).toBe(
      'Contas do ano. IPTU: R$ 1.000 separados este mês (vence em 10/02/2027). ' +
        'IPVA: foi paga com R$ 3.000 que já estavam separados.',
    )
    expect(porqueDasContasNoMes(resumoDasContas([], '2026-11-22'))).toBeNull()
  })

  it('o Contador lembra de 30 dias antes até 30 dias depois, enquanto não estiver paga', () => {
    const hoje = '2026-11-22'
    const lembra = (c: Partial<ContaDoAno>) => contasParaLembrar([conta(c)], hoje).length
    expect(lembra({ mes: 12, dia: 22 })).toBe(1) // 30 dias antes
    expect(lembra({ mes: 12, dia: 23 })).toBe(0) // 31 dias antes
    expect(lembra({ mes: 11, dia: 1 })).toBe(1) // venceu há 21 dias, sem marcar
    expect(lembra({ mes: 11, dia: 1, pagas: ['2026'] })).toBe(0)
  })

  it('a linha diz quando vence em palavras', () => {
    expect(linhaDaConta(proximaDaConta(conta({ mes: 11, dia: 22 }), '2026-11-22'))).toBe('R$ 3.000 · vence hoje')
    expect(linhaDaConta(proximaDaConta(conta({ mes: 11, dia: 23 }), '2026-11-22'))).toBe(
      'R$ 3.000 · vence em 1 dia (23/11/2026)',
    )
    expect(linhaDaConta(proximaDaConta(conta({ mes: 11, dia: 1 }), '2026-11-22'))).toBe(
      'R$ 3.000 · venceu em 01/11/2026',
    )
  })
})
