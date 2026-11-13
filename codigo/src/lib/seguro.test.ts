import { describe, expect, it } from 'vitest'
import { comIntervalo, criarGuardaConfig, resumoSemDinheiro, umaPorVez } from './seguro'
import { textoParaValor, valorDigitadoValido, valorParaTexto, reais, hojeRecife, simularCompra, somaDias } from './formato'
import type { ResumoHoje } from '../api/tipos'

describe('duplo toque no Lançar', () => {
  it('2 toques no mesmo instante gravam 1 vez só', async () => {
    let gravados = 0
    let soltar!: () => void
    const lancar = umaPorVez(async () => { gravados++; await new Promise<void>(r => { soltar = r }) })
    const a = lancar(), b = lancar(), c = lancar()
    soltar()
    await Promise.all([a, b, c])
    expect(gravados).toBe(1)
  })
  it('depois que termina (ou falha), deixa lançar de novo', async () => {
    let n = 0
    const f = umaPorVez(async () => { n++; if (n === 1) throw new Error('sem internet') })
    await expect(f()).rejects.toThrow('sem internet')
    await f()
    expect(n).toBe(2)
  })
})

describe('config da Casa não apaga o que estava salvo', () => {
  it('leitura falhou: gravar é recusado e o banco fica como estava', async () => {
    const banco = { lista: ['arroz', 'feijão'] }
    const g = criarGuardaConfig<string[]>(async () => { throw new Error('Sem internet agora.') }, async v => { banco.lista = v })
    await expect(g.carregar()).rejects.toThrow()
    await expect(g.salvar(['sabão'])).rejects.toThrow(/nada foi mudado/)
    expect(banco.lista).toEqual(['arroz', 'feijão'])
  })
  it('leitura deu certo: grava; leitura velha que chega depois da gravação é descartada', async () => {
    const banco = { lista: ['arroz'] }
    let soltar!: (v: string[]) => void
    let lento = false
    // só a próxima leitura fica presa (a releitura que o salvar faz antes de gravar responde na hora)
    const g = criarGuardaConfig<string[]>(() => { if (lento) { lento = false; return new Promise(r => { soltar = r }) } return Promise.resolve([...banco.lista]) }, async v => { banco.lista = v })
    expect((await g.carregar())?.valor).toEqual(['arroz'])
    lento = true
    const leituraVelha = g.carregar()
    await g.salvar(['arroz', 'sabão'])
    soltar(['arroz'])
    expect(await leituraVelha).toBeNull()
    expect(banco.lista).toEqual(['arroz', 'sabão'])
  })
})

describe('equipe sem dinheiro na memória', () => {
  const r: ResumoHoje = {
    pode_gastar_hoje: 467, livre_mes: 9340, colchao: 1000, dias_restantes: 20,
    explicacao: [{ linha: 'Combinado', valor: 9000 }],
    envelopes: [
      { id: 'a', nome: 'Ana', regra: 'diario', limite_mes: 3000, gasto_mes: 800, livre: 2200, valor_dia: 110, casa: false },
      { id: 'f', nome: 'Feira semanal', regra: 'semanal', limite_mes: 5769.25, gasto_mes: 3274, livre: 2495.25, teto_semana: 1153.85, gasto_semana: 500, limite_base: 5000, casa: true },
      { id: 'c', nome: 'Casa mensal', regra: 'mensal', limite_mes: 1500, gasto_mes: 1850, livre: -350, colchao_meta: 1000, casa: true },
    ],
  }
  it('sobra só o nome dos envelopes da Casa, sem nenhum número de dinheiro', () => {
    const s = resumoSemDinheiro(r)
    expect(s.envelopes.map(e => e.nome)).toEqual(['Feira semanal', 'Casa mensal'])
    const texto = JSON.stringify(s)
    for (const proibido of ['467', '9340', '1000', '5769', '3274', '1153', '5000', '1850', '350', '9000', '2495']) expect(texto).not.toContain(proibido)
    expect(s.explicacao).toEqual([])
    for (const e of s.envelopes) expect([e.limite_mes, e.gasto_mes, e.livre, e.teto_semana, e.gasto_semana, e.limite_base, e.colchao_meta, e.valor_dia]).toEqual([0, 0, 0, undefined, undefined, undefined, undefined, undefined])
  })
})

describe('volta do app pra frente', () => {
  it('foco + visível + online no mesmo segundo buscam 1 vez só', () => {
    let t = 1000
    const pode = comIntervalo(4000, () => t)
    expect([pode(), pode(), pode()]).toEqual([true, false, false])
    t += 4000
    expect(pode()).toBe(true)
  })
})

describe('campo de dinheiro digitado', () => {
  it('a última vírgula é a dos centavos; texto estranho não vira zero calado', () => {
    expect(textoParaValor('1.500,90')).toBe(1500.9)
    expect(textoParaValor('1,500,90')).toBe(1500.9)
    expect(textoParaValor('1500')).toBe(1500)
    expect(textoParaValor('0,1') + textoParaValor('0,2')).toBeCloseTo(0.3, 10)
    expect(textoParaValor('R$\u00a045,9')).toBe(45.9)
    expect(valorDigitadoValido('1,5,3')).toBe(false)
    expect(valorDigitadoValido('')).toBe(false)
    expect(valorDigitadoValido('1500,00')).toBe(true)
    expect(valorDigitadoValido('1500,')).toBe(true)
  })
  it('valor do banco vai pro campo e volta igual (antes 1153.85 virava 115385)', () => {
    for (const v of [1153.85, 5769.25, 5000, 0.07, 1000.1]) expect(textoParaValor(valorParaTexto(v))).toBe(v)
    expect(valorParaTexto(null)).toBe('')
    expect(reais(textoParaValor(valorParaTexto(1153.85)))).toBe('R$\u00a01.153,85')
  })
})

describe('virada de dia, de mês e de ano', () => {
  it('23:59 de 30/11 em Recife ainda é novembro; 00:00 já é dezembro', () => {
    expect(hojeRecife(new Date('2026-12-01T02:59:00Z'))).toBe('2026-11-30')
    expect(hojeRecife(new Date('2026-12-01T03:00:00Z'))).toBe('2026-12-01')
    expect(somaDias('2026-12-01', -1)).toBe('2026-11-30')
    expect(somaDias('2027-01-01', -1)).toBe('2026-12-31')
    expect(somaDias('2028-03-01', -1)).toBe('2028-02-29')
  })
  it('parcelas atravessam o ano e a soma bate no centavo', () => {
    const p = simularCompra(1000, 3, '2026-11-11', 3, 10)
    expect(p.map(x => x.mes)).toEqual(['2026-12', '2027-01', '2027-02'])
    expect(p.map(x => x.valor)).toEqual([333.34, 333.33, 333.33])
    const q = simularCompra(99.99, 12, '2026-12-28', 25, 5)
    expect(q[0].mes).toBe('2027-02')
    expect(Math.round(q.reduce((s, x) => s + x.valor * 100, 0))).toBe(9999)
  })
})
