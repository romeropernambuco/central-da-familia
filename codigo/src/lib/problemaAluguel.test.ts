// "Não me pagou" (ideia do dono, 22/11/2026): inquilino para de pagar, a família registra a providência e até quando
// fica sem receber; o app para de acusar atraso todo mês, o plano não conta com o aluguel até a volta e a Secretária lembra.
import { describe, expect, it } from 'vitest'
import {
  cadernoVazio,
  comProblema,
  contaDoAno,
  fraseDaSituacao,
  lerCaderno,
  lerProblema,
  mesesSemReceber,
  resumoDoMes,
  situacaoDoMes,
  type CadernoImovel,
  type ProblemaAluguel,
} from './aluguel'
import { aluguelNoMes } from './futuro'
import { imovelDoBanco, type ImovelBanco } from './futuroReceitas'
import { comProblemasDoAluguel, SEM_DATA_DE_VOLTA } from './futuroAluguel'
import { tituloDoLembrete } from '../componentes/ProblemaAluguel'

const problema = (v: Partial<ProblemaAluguel> = {}): ProblemaAluguel => ({
  etapa: 'advogado',
  desde: '2027-01',
  volta: '2027-09',
  advogado: 'Dra. Paula',
  divida: 7500,
  andamento: [],
  ...v,
})
const caderno = (v: Partial<CadernoImovel> = {}): CadernoImovel => ({
  ...cadernoVazio(),
  dia_vencimento: 5,
  desde: '2026-11',
  ...v,
})

describe('o caderno sabe do problema', () => {
  const c = caderno({ problema: problema() })
  it('de jan a ago é "sem receber", não "atrasado"; set volta ao normal', () => {
    expect(situacaoDoMes(c, '2027-03', '2027-03-20')).toMatchObject({ tipo: 'sem_receber', etapa: 'advogado' })
    expect(fraseDaSituacao(situacaoDoMes(c, '2027-03', '2027-03-20'))).toBe(
      'sem receber: com o advogado, volta em 09/27',
    )
    expect(situacaoDoMes(c, '2026-12', '2027-03-20').tipo).toBe('atrasado')
    expect(situacaoDoMes(c, '2027-09', '2027-09-20').tipo).toBe('atrasado')
    expect(comProblema(c, '2027-05')).toBe(true)
    expect(comProblema(c, '2027-09')).toBe(false)
    expect(mesesSemReceber(c, '2026-11', '2027-12')).toBe(8)
  })
  it('sem data de volta: fica "sem receber" até resolver', () => {
    const s = caderno({ problema: problema({ volta: null, etapa: 'despejo' }) })
    expect(fraseDaSituacao(situacaoDoMes(s, '2028-06', '2028-06-10'))).toBe('sem receber: despejo na justiça')
  })
  it('o mês que chegou (acordo) continua "chegou"; o ano conta os meses parados como esperados, não como atrasados', () => {
    const a = caderno({
      problema: problema({ etapa: 'acordo' }),
      recebimentos: [{ mes: '2027-02', data: '2027-02-20', valor: 1000 }],
    })
    expect(situacaoDoMes(a, '2027-02', '2027-03-01').tipo).toBe('recebido')
    const ano = contaDoAno(a, 500000, '2027-04-20')
    expect(ano.atrasados).toEqual(['2026-11', '2026-12'])
    expect(ano.esperados).toBe(6)
  })
  it('o resumo do mês não põe no "falta" o aluguel que já se sabe que não vem', () => {
    const r = resumoDoMes([{ id: 'a', aluguel: 2500 }], { a: c }, '2027-03-20')
    expect(r).toMatchObject({ alugados: 1, recebidos: 0, atrasados: 0, falta: 0 })
  })
  it('o que vem do banco: etapa inventada ou mês errado não passa; volta antes do começo vira "sem data"', () => {
    expect(lerProblema({ etapa: 'inventada', desde: '2027-01' })).toBeNull()
    expect(lerProblema({ etapa: 'vazio', desde: '27-01' })).toBeNull()
    expect(lerProblema({ etapa: 'vazio', desde: '2027-05', volta: '2027-02', divida: -3 })).toMatchObject({
      volta: null,
      divida: 0,
      andamento: [],
    })
    expect(lerCaderno({ x: { dia_vencimento: 5, recebimentos: [], despesas: [], problema: null } }).x.problema).toBe(
      undefined,
    )
  })
})

describe('o plano não conta com o aluguel até a volta', () => {
  const banco: ImovelBanco = {
    id: 'im1',
    apelido: 'Apto',
    uso: 'aluga',
    valor_estimado_centavos: 50000000,
    aluguel_centavos: 250000,
    custos_centavos: 0,
    vacancia: '0',
    tem_contrato: true,
    contrato_ate: '2029-12',
    venda_mes: null,
    venda_contrato: false,
  }
  it('o motor pula os meses antes da volta', () => {
    const [i] = comProblemasDoAluguel(
      { imoveis: [banco] },
      { im1: { desde: '2027-01', volta: '2027-09' } },
      '2027-03',
    ).imoveis!
    const im = imovelDoBanco(i)
    expect(im.sem_aluguel_ate).toBe('2027-09')
    expect(aluguelNoMes(im, '2027-08')).toBe(false)
    expect(aluguelNoMes(im, '2027-09')).toBe(true)
  })
  it('sem data de volta: não conta até a família dizer; problema já resolvido ou de outro imóvel: nada muda', () => {
    const sem = comProblemasDoAluguel({ imoveis: [banco] }, { im1: { desde: '2027-01', volta: null } }, '2027-03')
    expect(sem.imoveis![0].sem_aluguel_ate).toBe(SEM_DATA_DE_VOLTA)
    expect(aluguelNoMes(imovelDoBanco(sem.imoveis![0]), '2029-12')).toBe(false)
    const passado = comProblemasDoAluguel(
      { imoveis: [banco] },
      { im1: { desde: '2027-01', volta: '2027-02' } },
      '2027-03',
    )
    expect(passado.imoveis![0].sem_aluguel_ate).toBeUndefined()
    expect(
      comProblemasDoAluguel({ imoveis: [banco] }, { outro: { desde: '2027-01', volta: null } }, '2027-03'),
    ).toEqual({
      imoveis: [banco],
    })
  })
})

describe('o lembrete da Secretária', () => {
  it('fala do imóvel sem errar o gênero e usa só o nome de quem cuida', () => {
    expect(tituloDoLembrete('advogado', 'Sala do centro', 'Dra. Paula, 81 9 9999-0000')).toBe(
      'Cobrar Dra. Paula sobre o processo do imóvel Sala do centro',
    )
    expect(tituloDoLembrete('despejo', 'Casa', null)).toBe('Cobrar o advogado sobre o processo do imóvel Casa')
    expect(tituloDoLembrete('cobrando', 'Apto 302', null)).toBe('Cobrar o inquilino do imóvel Apto 302')
    expect(tituloDoLembrete('reforma', 'Apto 302', null)).toBe('Ver como está o imóvel Apto 302 (em reforma)')
  })
})
