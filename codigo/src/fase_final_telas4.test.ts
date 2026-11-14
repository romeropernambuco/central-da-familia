// TELAS 4 (14/11): C3 e pacote 2 do design (gráficos A, B e C) e o bloco Imóveis (RODADA_PATRIMONIO).
// Todo número é de exemplo (família de exemplo Silva ou entrada montada aqui). A tela não calcula 2029: estes testes
// conferem o desenho e as frases a partir do que o motor (futuro) devolve.
import { afterEach, describe, expect, it } from 'vitest'
import { acumuladoDoMes, mesMaisApertado } from './componentes/Graficos'
import { frasesGatilho } from './componentes/Linha2028'
import { seloDesejo } from './telas/desejos/Desejos'
import { seloImovel, pctAno } from './telas/guardado/Imoveis'
import { avisoRendaCerta } from './telas/planejamento/Parametros'
import { imovelDoBanco, imovelInvalido } from './api/futuro'
import { apiExemplo, exemploComo, reiniciarExemplo } from './api/exemplo'
import { futuro, type LinhaMes } from './lib/futuro'
import type { NovoImovel } from './api/tipos'

const limpa = (s: string | null) => (s || '').replace(/ /g, ' ')

describe('Gráfico A: o gasto do mês acumulado', () => {
  it('parcela e compra grande (fora do porDia) entram no dia 1 e a ponta de hoje bate com o gasto do mês', () => {
    const p = acumuladoDoMes(1000, 5, '2026-11', { '2026-11-02': 100, '2026-11-05': 300 })
    expect(p).toEqual([600, 700, 700, 700, 1000])
  })
  it('sem os lançamentos, vai reto até hoje e termina no gasto do mês', () => {
    const p = acumuladoDoMes(900, 3, '2026-11', null)
    expect(p[p.length - 1]).toBe(900)
    expect(p.length).toBe(3)
  })
})

describe('Gráfico B: o mês mais apertado', () => {
  const l = (mes: string, saldo: number, piso: number): LinhaMes => ({ mes, saldo_inicial: 0, rendimento: 0, recebimentos: 0, teto: 0, compromissos: 0, dividas: 0, desvios: 0, retornos: 0, saldo_final: saldo, piso, fica_devendo: 0, devendo_ate: null })
  it('é o de menor distância entre o caixa e o piso, não o de menor caixa', () => {
    expect(mesMaisApertado([l('2027-01', 500, 100), l('2027-02', 400, 380), l('2027-03', 300, 100)])!.mes).toBe('2027-02')
  })
})

describe('Desejos: a resposta em 1 palavra antes da conta', () => {
  it('os 4 casos do motor, sem um 5º', () => {
    expect(seloDesejo('cabe')).toBe('Cabe')
    expect(seloDesejo('cabe, mas tira')).toBe('Aperta')
    expect(seloDesejo('ainda nao cabe')).toBe('Ainda não')
    expect(seloDesejo('caixa ja apertado' as never)).toBe('Apertado')
  })
})

describe('Imóveis: formato do banco (f_15) para o motor', () => {
  it('centavos e mês AAAA-MM; contrato_ate vem como data do fim do mês', () => {
    const i = imovelDoBanco({ id: 'x', dono_membro: 'm', dono_nome: 'Bruno', apelido: 'Sala (exemplo)', uso: 'aluga', valor_estimado_centavos: 60000000, aluguel_centavos: '300000', custos_centavos: 50000, vacancia: '0.08', tem_contrato: true, contrato_ate: '2029-12-31', venda_valor_centavos: null, venda_mes: null, venda_contrato: false })
    expect(i).toMatchObject({ valor: 60000000, aluguel_bruto: 300000, custos_mes: 50000, vacancia: '0.08', contrato_ate: '2029-12', venda_valor: null, dono: 'm' })
  })
  it('aceita também as chaves do tipo Imovel do motor', () => {
    const i = imovelDoBanco({ id: 'y', dono: 'm-ana', apelido: 'Lote', uso: 'vende', valor: 20000000, aluguel_bruto: 0, custos_mes: 0, vacancia: '0', tem_contrato: false, contrato_ate: null, venda_valor: 22000000, venda_mes: '2028-10', venda_contrato: false })
    expect(i).toMatchObject({ valor: 20000000, venda_valor: 22000000, venda_mes: '2028-10', dono: 'm-ana' })
  })
  it('as regras de gravação: apelido, venda com valor e mês, meses vazios de 0 a 100%', () => {
    const ok: NovoImovel = { apelido: 'Sala', valor: 1, uso: 'aluga', aluguel: 1, custos: 0, vacancia: '0.08', tem_contrato: true, contrato_ate: '2029-12', venda_valor: null, venda_mes: null, venda_contrato: false }
    expect(imovelInvalido(ok)).toBe('')
    expect(imovelInvalido({ ...ok, apelido: ' ' })).toMatch(/apelido/)
    expect(imovelInvalido({ ...ok, venda_valor: 10 })).toMatch(/valor e o mês/)
    expect(imovelInvalido({ ...ok, vacancia: '1.5' })).toMatch(/0 a 100/)
  })
  it('o selo: com contrato entra; sem contrato não entra; onde mora não rende', () => {
    const b = { aluguel: 3000, venda_valor: null, venda_contrato: false }
    expect(seloImovel({ ...b, uso: 'aluga', tem_contrato: true, contrato_ate: '2029-12' })).toEqual({ texto: 'com contrato até 12/2029', entra: true })
    expect(seloImovel({ ...b, uso: 'aluga', tem_contrato: false, contrato_ate: null })).toEqual({ texto: 'sem contrato: não entra na conta', entra: false })
    expect(seloImovel({ ...b, aluguel: 0, uso: 'mora', tem_contrato: false, contrato_ate: null })!.entra).toBe(false)
    expect(pctAno('0.032770')).toBe('3,3%')
  })
})

describe('Imóveis na família de exemplo (o cenário do teste do patrimônio, números inventados)', () => {
  afterEach(() => reiniciarExemplo())
  it('o casal lê os 4 com o dono; filha e equipe nunca', async () => {
    reiniciarExemplo()
    const ana = await apiExemplo.imoveis!('fam-silva')
    expect(ana.map(i => i.apelido)).toEqual(['Sala comercial (exemplo)', 'Apartamento de praia (exemplo)', 'Casa onde moramos (exemplo)', 'Lote (exemplo)'])
    expect(ana.filter(i => i.meu).map(i => i.dono_nome)).toEqual(['Ana', 'Ana'])
    exemploComo('filha')
    await expect(apiExemplo.imoveis!('fam-silva')).rejects.toThrow(/casal/)
    exemploComo('equipe')
    await expect(apiExemplo.imoveis!('fam-silva')).rejects.toThrow(/casal/)
  })
  it('só o dono muda: Ana não mexe na sala do Bruno; o apartamento de praia é R$ 4.000 de média por mês', async () => {
    reiniciarExemplo()
    const l = await apiExemplo.imoveis!('fam-silva')
    const sala = l.find(i => i.apelido.startsWith('Sala'))!
    await expect(apiExemplo.imovelSalvar!('fam-silva', sala.id, { ...sala, valor: 1 })).rejects.toThrow(/Bruno/)
    await expect(apiExemplo.imovelTirar!('fam-silva', sala.id)).rejects.toThrow(/Bruno/)
    expect(l.find(i => i.apelido.startsWith('Apartamento'))!.aluguel).toBe(4000)
  })
  it('na conta: só a sala (com contrato) entra; praia, lote e o recebimento incerto viram "pode entrar"; renda 2029 = aplicações + aluguel', async () => {
    reiniciarExemplo()
    const e = (await apiExemplo.futuroEntradas!('fam-silva')).entrada!
    expect(e.imoveis!.length).toBe(4)
    const s = futuro(e)
    expect(s.patrimonio_imoveis).toBe(320000000) // 600 + 900 + 1.500 + 200 mil: à parte, nunca saque
    const sala = s.imoveis!.find(i => i.apelido.startsWith('Sala'))!
    expect(sala.entra_na_conta).toBe(true)
    expect(s.aluguel_liquido_2029).toBe(sala.aluguel_liquido_mes)
    expect(s.renda_total_2029).toBe(s.renda_sustentavel + (s.aluguel_liquido_2029 || 0))
    const gs = (s.gatilhos || []).map(g => limpa(frasesGatilho(g)))
    expect(gs.some(t => /^Apartamento de praia \(exemplo\): R\$ [\d.,]+ por mês.*sem contrato/.test(t))).toBe(true)
    expect(gs.some(t => /^Lote \(exemplo\): R\$ 220\.000(,00)? em 10\/2028 \(sem contrato\)/.test(t))).toBe(true)
    expect(s.gatilhos!.some(g => g.origem === 'recebimento' && g.motivo === 'incerto')).toBe(true)
    expect(gs.some(t => /^Recebimento de Ana: R\$ [\d.,]+ em \d\d\/\d{4} \(incerto\)\.$/.test(t))).toBe(true)
    expect(s.imoveis!.find(i => i.apelido.startsWith('Casa'))!.aluguel_liquido_mes).toBe(0)
  })
})

describe('Aviso do VERIFICADOR: aluguel lançado também em "Renda certa em 2029"', () => {
  const imo = [{ apelido: 'Sala comercial (exemplo)', aluguel_liquido_mes: 166430, entra_na_conta: true }, { apelido: 'Praia', aluguel_liquido_mes: 290000, entra_na_conta: false }]
  it('valor igual ou maior que o aluguel líquido de um imóvel com contrato: avisa com o apelido', () => {
    expect(avisoRendaCerta(166430, imo)).toBe('Esse valor parece incluir o aluguel de Sala comercial (exemplo). Ele já conta sozinho.')
    expect(avisoRendaCerta(500000, imo)).toMatch(/Sala comercial/)
  })
  it('menor que o aluguel, campo vazio ou imóvel sem contrato: não avisa', () => {
    expect(avisoRendaCerta(166429, imo)).toBeNull()
    expect(avisoRendaCerta(0, imo)).toBeNull()
    expect(avisoRendaCerta(300000, [imo[1]])).toBeNull()
  })
})
