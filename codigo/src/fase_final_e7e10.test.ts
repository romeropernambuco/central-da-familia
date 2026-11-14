// E7 a E10 (TELAS 2, 13/11). Todo número é de exemplo (casos do ECONOMISTA ou família de exemplo).
// A tela nunca calcula 2029: estes testes conferem que as frases saem do que o motor devolve, com os números dos casos.
import { afterEach, describe, expect, it, vi } from 'vitest'
// @ts-ignore: o projeto não tem os tipos do Node; o Vitest roda em Node
import { readFileSync } from 'node:fs'
import { fraseImpacto, perdaPorMes } from './componentes/Impacto2029'
import { frasesCorte, frasesLinha, frasesRenda, mesAno } from './componentes/Linha2028'
import { situacaoReajuste } from './telas/planejamento/Reajuste'
import { normalizaReajuste } from './api/normaliza'
import { frasesFGC } from './telas/guardado/Guardado'
import { desejoDoMotor, fraseDaFilha, frasesDesejo } from './telas/desejos/Desejos'
import { acharCartao, ehAtalho, lerAtalho, lerValor } from './lib/atalho'
import { marcaDaSemana } from './componentes/RitmoMes'
import { cabeDesejo, futuro, type FuturoEntrada, type FuturoSaida } from './lib/futuro'
import { reajustarTeto, avaliarAntecipacao } from './lib/futuro'
import { apiExemplo, exemploComo, reiniciarExemplo } from './api/exemplo'
import { reais } from './lib/formato'
const reaisDe = (c: number) => reais(c / 100)
import { rotaDoHash, rotaPermitida } from './app/rotas'

const NB = /[\s ]/
const limpa = (s: string | null) => (s || '').replace(/ /g, ' ')
/** Entrada do motor com os padrões dos casos do ECONOMISTA (Focus 06/11/2026). Exemplo. */
function entrada(extra: Partial<FuturoEntrada> = {}, piso = 0): FuturoEntrada {
  return {
    hoje: '2026-11-18', saldo_caixa: 300_000_000, aplicacoes: [], recebimentos: [], compromissos: [], dividas: [], desvios: [], desejos: [],
    parametros: { mes_base: '2026-11', virada: '2029-01', gasto_2029_hoje: 0, renda_certa_2029: 0, margem: '0', taxa_real_trabalho: '0.04',
      taxa_bruta_ano: { 2026: '0.1375', 2027: '0.125', 2028: '0.11' }, ipca_ano: { 2026: '0.0522', 2027: '0.049', 2028: '0.04', 2029: '0.04' },
      aliq_proj: '0.225', piso_meses: piso, teto_mes: 0, mes_reajuste: 1 },
    ...extra,
  }
}

describe('E7: impacto de 2029 (F6) pela tela', () => {
  it('F6-HOJE: R$ 50.000 em 12/2026 tiram R$ 194,89 por mês da renda de 2029, pra sempre', () => {
    const p = perdaPorMes(entrada(), 50000, '2026-12')
    expect(p).toBe(19489)
    expect(limpa(fraseImpacto(p!))).toBe('Isso tira R$ 194,89 por mês da renda de 2029, pra sempre.')
  })
  it('F6-ULTIMO: R$ 10.000 em 12/2028 = R$ 32,74; com prefixo do Lançar a frase continua em minúscula', () => {
    const p = perdaPorMes(entrada(), 10000, '2028-12')
    expect(p).toBe(3274)
    expect(limpa(fraseImpacto(p!, 'Gasto grande: se não estava no combinado, '))).toBe('Gasto grande: se não estava no combinado, isso tira R$ 32,74 por mês da renda de 2029, pra sempre.')
  })
  it('taxa real zero: a frase diz que o rendimento não repõe a inflação (nunca divide por zero)', () => {
    const e = entrada(); e.parametros.taxa_real_trabalho = '0'
    expect(fraseImpacto(perdaPorMes(e, 1000)!)).toMatch(/não repõe a inflação/)
    expect(fraseImpacto(0)).toBeNull()
  })
})

describe('E7: linha até dez/2028 (F4, F9, F5)', () => {
  const l = (mes: string, saldo_final: number, fica_devendo = 0, devendo_ate: string | null = null) => ({ mes, saldo_inicial: 0, rendimento: 0, recebimentos: 0, teto: 0, compromissos: 0, dividas: 0, desvios: 0, retornos: 0, saldo_final, piso: 0, fica_devendo, devendo_ate })
  it('F9-MES: "fica devendo R$ 20.000 pro caixa até 04/2027", sem sinal de menos', () => {
    const s: FuturoSaida = { linha: [l('2027-03', 4_000_000, 2_000_000, '2027-04'), l('2027-04', 9_500_000)], patrimonio_necessario: 9_000_000, renda_sustentavel: 31_000, folga: 500_000, ajustes_falta: null, perguntas: [], avisos_fgc: [] }
    const f = frasesLinha(s)
    expect(limpa(f.devendo)).toBe('Em 03/2027 o caixa fica abaixo do piso: fica devendo R$ 20.000 pro caixa até 04/2027.')
    expect(limpa(f.virada)).toMatch(/^Em 2029 o dinheiro rende R\$ 310 por mês, pra sempre, e sobram R\$ 5\.000/)
    expect(JSON.stringify(f)).not.toMatch(/-R\$|R\$\s?-/)
  })
  it('B4 (revisão): com a família devendo no fim, a frase do piso não diz "fica devendo" de novo', () => {
    const s: FuturoSaida = { linha: [l('2026-12', 7_000_000, 798_537, null), l('2028-12', -30_409_053, 30_409_053 + 1, null)], patrimonio_necessario: 1, renda_sustentavel: 0, folga: -1, ajustes_falta: null, perguntas: [], avisos_fgc: [] }
    const f = frasesLinha(s)
    expect(limpa(f.devendo)).toBe('Em 12/2026 o caixa fica R$ 7.985,37 abaixo do piso e não volta pra cima dele até 12/2028.')
    expect(((f.caixa + ' ' + f.devendo).match(/fica devendo/g) || []).length).toBe(1)
  })
  it('F5 com falta: os ajustes do F9 com número (guardar por mês ou gastar menos em 2029)', () => {
    const s: FuturoSaida = { linha: [l('2028-12', -100_000)], patrimonio_necessario: 1_000_000_00, renda_sustentavel: 0, folga: -122_014_316, ajustes_falta: { guardar_por_mes: 4_695_336, cortar_por_mes_2029: 399_443, desejos_pra_adiar: [] }, perguntas: [], avisos_fgc: [] }
    const f = frasesLinha(s)
    expect(limpa(f.caixa)).toBe('Com estes números, a família fica devendo R$ 1.000 em dez/28.')
    expect(limpa(f.virada)).toBe('Pra viver do rendimento em 2029 faltam R$ 1.220.143,16.')
    // mudado no conserto do corte (MOTOR_index, falta_por_mes e margem_por_mes): "cortando" no lugar de "gastando ... a menos"
    expect(limpa(f.ajuste)).toBe('Fecha guardando R$ 46.953,36 por mês até 12/2028 ou cortando R$ 3.994,43 por mês em 2029.')
  })
  it('a frase da linha sai de futuro() de verdade (família de exemplo do caso, nada calculado na tela)', () => {
    const e = entrada({}, 6); e.parametros.teto_mes = 3_000_000; e.parametros.gasto_2029_hoje = 2_000_000
    const s = futuro(e)
    const f = frasesLinha(s)
    expect(f.caixa).toContain(mesAno(s.linha[s.linha.length - 1].mes) === '12/2028' ? 'dez/28' : '')
    expect(s.linha[0].mes).toBe('2026-12')
  })
})

describe('E7: reajuste do teto (F8) votado no banco (f_12)', () => {
  // o formato que produto.reajuste_situacao devolve (exemplo)
  const doBanco = (votos: [string, string, number][], faltam: [string, string][], aprovado: boolean, ja_vale = false) => normalizaReajuste({
    mes_vigencia: '2027-02', aprovado, teto_aprovado_centavos: aprovado ? votos[0][2] : null, ipca_aprovado: aprovado ? '0.0450' : null,
    vale_a_partir: aprovado ? '2027-02' : null, ja_vale,
    votos: votos.map(([membro_id, nome, teto_centavos]) => ({ membro_id, nome, teto_centavos, ipca: '0.0450', votou_em: '2027-01-05T10:00:00-03:00' })),
    faltam: faltam.map(([membro_id, nome]) => ({ membro_id, nome })),
  })
  it('F8-TETO: R$ 30.000 com IPCA de 5,22% sugere R$ 31.566 (conta do motor)', () => { expect(reajustarTeto(3_000_000, '0.0522')).toBe(3_156_600) })
  it('normaliza o formato do banco (mês AAAA-MM, centavos, IPCA, vale_a_partir, votos e quem falta)', () => {
    const s = doBanco([['m-a', 'Ana', 3_156_600]], [['m-b', 'Bruno']], false)
    expect(s).toEqual({ mes_vigencia: '2027-02', aprovado: false, teto_aprovado: null, ipca_aprovado: null, vale_a_partir: null, ja_vale: false, votos: [{ membro_id: 'm-a', nome: 'Ana', teto: 3_156_600, ipca: '0.0450', votou_em: '2027-01-05T10:00:00-03:00' }], faltam: [{ membro_id: 'm-b', nome: 'Bruno' }] })
  })
  it('F8-SEM-APROVACAO: 1 aprovou e o outro não: sugestão pendente; tetos diferentes não aprovam', () => {
    expect(situacaoReajuste(doBanco([['m-a', 'Ana', 3_156_600]], [['m-b', 'Bruno']], false))).toBe('sugestao pendente')
    expect(situacaoReajuste(doBanco([['m-a', 'Ana', 3_156_600], ['m-b', 'Bruno', 3_100_000]], [], false))).toBe('tetos diferentes')
    expect(situacaoReajuste(null)).toBe('sem sugestao')
  })
  it('os 2 aprovaram: "já vale" é o que o banco diz (ja_vale), a tela não calcula a vigência', () => {
    expect(situacaoReajuste(doBanco([['m-a', 'Ana', 3_156_600], ['m-b', 'Bruno', 3_156_600]], [], true, false))).toBe('aprovado, vale no mes seguinte')
    expect(situacaoReajuste(doBanco([['m-a', 'Ana', 3_156_600], ['m-b', 'Bruno', 3_156_600]], [], true, true))).toBe('aprovado')
  })
})

describe('E7: o exemplo imita as regras da f_12 (com a R1)', () => {
  const em = (dia: string) => vi.setSystemTime(new Date(`${dia}T10:00:00-03:00`))
  const mm = (dia: string) => { vi.useFakeTimers({ toFake: ['Date'] }); em(dia); reiniciarExemplo() }
  afterEach(() => { vi.useRealTimers(); reiniciarExemplo() })
  it('1 voto por adulto (votar de novo troca só o seu), aprovado só com os 2 no mesmo teto e IPCA, aplicar só quando vale e nunca no limite do outro', async () => {
    mm('2027-01-05')
    // R1: vigência no mês de hoje (ou antes) é recusada
    await expect(apiExemplo.reajusteVotar!('fam-silva', '2027-01', 1_000_000, '0.0450')).rejects.toThrow(/ainda não começou/)
    let s = await apiExemplo.reajusteVotar!('fam-silva', '2027-02', 1_000_000, '0.0450')
    expect(s.faltam.map(x => x.nome)).toEqual(['Bruno'])
    s = await apiExemplo.reajusteVotar!('fam-silva', '2027-02', 1_050_000, '0.0450')
    expect(s.votos.length).toBe(1)
    await expect(apiExemplo.reajusteAplicar!('fam-silva', 'env-ana', '2027-02')).rejects.toThrow(/ainda não foi aprovado/)
    exemploComo('bruno')
    s = await apiExemplo.reajusteVotar!('fam-silva', '2027-02', 1_050_000, '0.0400')
    expect(s.aprovado).toBe(false) // IPCA diferente
    expect(s.votos.map(v => v.nome).sort()).toEqual(['Ana', 'Bruno'])
    s = await apiExemplo.reajusteVotar!('fam-silva', '2027-02', 1_050_000, '0.0450')
    expect(s).toMatchObject({ aprovado: true, teto_aprovado: 1_050_000, ipca_aprovado: '0.0450', vale_a_partir: '2027-02', ja_vale: false })
    await expect(apiExemplo.reajusteAplicar!('fam-silva', 'env-bruno', '2027-02')).rejects.toThrow(/vale a partir de 02\/2027/)
    em('2027-02-02')
    await expect(apiExemplo.reajusteAplicar!('fam-silva', 'env-ana', '2027-02')).rejects.toThrow(/O limite de Ana só Ana ajusta/)
    // o exemplo calcula o valor (4.000 × 1,045 = 4.180) e aplicar de novo não acumula
    await apiExemplo.reajusteAplicar!('fam-silva', 'env-bruno', '2027-02')
    await apiExemplo.reajusteAplicar!('fam-silva', 'env-bruno', '2027-02')
    const r = await apiExemplo.resumoHoje('fam-silva')
    const b = r.envelopes.find(e => e.id === 'env-bruno')!
    expect(b.limite_base ?? b.limite_mes).toBe(4180)
    exemploComo('filha')
    await expect(apiExemplo.reajusteVotar!('fam-silva', '2027-03', 1, '0.0450')).rejects.toThrow(/Só os adultos/)
    await expect(apiExemplo.reajusteSituacao!('fam-silva', '2027-02')).rejects.toThrow(/Só o casal/)
  })
  it('R1: aprovação atrasada vale no mês seguinte ao último voto, não na hora', async () => {
    mm('2027-01-05')
    await apiExemplo.reajusteVotar!('fam-silva', '2027-03', 1_000_000, '0.0450')
    exemploComo('bruno'); em('2027-02-20')
    const s = await apiExemplo.reajusteVotar!('fam-silva', '2027-03', 1_000_000, '0.0450')
    expect(s).toMatchObject({ aprovado: true, vale_a_partir: '2027-03', ja_vale: false })
  })
  it('família de 1 adulto: 1 voto basta', async () => {
    mm('2027-01-05'); exemploComo('autonoma')
    expect((await apiExemplo.reajusteVotar!('fam-souza', '2027-02', 500_000, '0.0450')).aprovado).toBe(true)
  })
})

describe('E7: aviso do FGC (F10) no Guardado', () => {
  it('1 frase por banco e pessoa, e o teto de R$ 1 milhão somando os bancos; nunca manda mexer no dinheiro', () => {
    const f = frasesFGC([{ banco: 'Banco Exemplo', titular: 'Ana', fora: 5_000_000 }, { banco: 'todos os bancos', titular: null, fora: 1_000_000 }]).map(limpa)
    expect(f[0]).toBe('No banco Banco Exemplo, no nome de Ana: R$ 50.000 ficam fora da garantia (até R$ 250 mil por pessoa e banco).')
    expect(f[1]).toMatch(/^Somando todos os bancos, do casal passa R\$ 10\.000 do teto de R\$ 1 milhão/)
  })
})

describe('E8: Desejos (F7) com os números dos casos', () => {
  const t = { hoje: '2026-11-18' }
  const d = (certo: boolean) => desejoDoMotor({ nome: 'Viagem (exemplo)', valor: 50000, mes: '2027-01', volta_de: 'investimento', volta: 60000, volta_mes: '2028-01', antecipado: null, volta_certa: certo })
  it('F7-RETORNO-CERTO: volta certa de R$ 60.000 soma R$ 18,37 por mês na renda de 2029', () => {
    const c = cabeDesejo(entrada(t), d(true))
    expect(c.tira_por_mes_2029).toBe(-1837)
    expect(limpa(frasesDesejo(c, d(true)).linhas.join(' '))).toContain('Volta mais do que sai: soma R$ 18,37 por mês na renda de 2029.')
  })
  it('F7-RETORNO-INCERTO: volta incerta tira R$ 193,37 por mês e a volta fica fora da conta ("se vier")', () => {
    const c = cabeDesejo(entrada(t), d(false))
    expect(c.tira_por_mes_2029).toBe(19337)
    const f = frasesDesejo(c, d(false)).linhas.map(limpa)
    expect(f).toContain('Tira R$ 193,37 por mês da renda de 2029, pra sempre.')
    expect(f).toContain('A volta é incerta: fica fora da conta, só entra se vier.')
  })
  it('cabe / ainda não cabe e quando cabe: o caixa com piso alto não comporta o desejo agora', () => {
    const e = entrada(t, 6); e.saldo_caixa = 100_000_000; e.parametros.teto_mes = 1_000_000
    const des = desejoDoMotor({ nome: 'Reforma (exemplo)', valor: 50000, mes: '2027-01', volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false })
    const c = cabeDesejo(e, des)
    const f = frasesDesejo(c, des)
    expect(['Cabe.', 'Cabe, mas tira de 2029.', 'Ainda não cabe.', 'O caixa já está apertado.']).toContain(f.titulo)
    if (c.situacao === 'ainda nao cabe') expect(f.linhas.join(' ')).toMatch(/abaixo do piso\./)
    // MOTOR_index (observação do cabeDesejo): em "ainda não cabe", o caixa já apertado sem o desejo também aparece
    const forjado = frasesDesejo({ situacao: 'ainda nao cabe', tira_por_mes_2029: 100, primeiro_mes_abaixo: '2027-01', caberia_em: '2027-02', apertado_sem_desejo: '2026-12' }, des)
    expect(forjado.linhas).toContain('Mesmo sem este desejo, em 12/2026 o caixa já fica abaixo do piso.')
    const folgado = cabeDesejo(entrada(t), desejoDoMotor({ nome: 'Fone (exemplo)', valor: 500, mes: '2027-01', volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false }))
    expect(frasesDesejo(folgado, d(true)).titulo).toBe('Cabe.')
  })
  it('F7-ANTECIPA: contrato adiantado de R$ 120.000 por R$ 100.000 custa mais do que o caixa rende', async () => {
    const a = avaliarAntecipacao(10_000_000, '2026-12', 12_000_000, '2027-12', { taxa_bruta_ano: { 2026: '0.1375', 2027: '0.125', 2028: '0.11' }, aliq_proj: '0.225', virada: '2029-01', taxa_real_trabalho: '0.04' })
    expect(a.efeito_na_virada).toBe(-1_119_413)
    const des = desejoDoMotor({ nome: 'Carro (exemplo)', valor: 100000, mes: '2026-12', volta_de: 'contrato', volta: 120000, volta_mes: '2027-12', antecipado: 100000, volta_certa: false })
    expect(des.volta_certa).toBe(true)
    // M3 (revisão): a frase mostra a perda até 2029 e quanto tira por mês (impacto_renda_mensal do motor), sem sinal
    expect(a.impacto_renda_mensal).toBeLessThan(0)
    const linha = limpa(frasesDesejo(cabeDesejo(entrada(t), des), des, a).linhas.find(x => /^Adiantar/.test(x))!)
    expect(linha).toBe(`Adiantar o contrato custa mais do que o caixa rende: perde R$ 11.194,13 até 2029 e tira R$ ${(Math.abs(a.impacto_renda_mensal!) / 100).toFixed(2).replace('.', ',')} por mês da renda de 2029.`)
    expect(linha).not.toMatch(/-R\$|R\$\s?-/)
  })
  it('filha: só "dá pra comprar com o seu", sem 2029', () => {
    expect(limpa(fraseDaFilha(120, 200, 300))).toBe('Dá pra comprar com o seu: sobram R$ 80 no seu mês.')
    expect(fraseDaFilha(250, 200, 300, true)).toMatch(/^Dá pra comprar com o seu: cabe no seu limite daquele mês/)
    expect(limpa(fraseDaFilha(700, 200, 300))).toMatch(/são 3 meses juntando tudo/)
    expect(fraseDaFilha(700, 200, 300) + fraseDaFilha(120, 200, 300)).not.toMatch(/2029/)
  })
})

describe('E8: tranca dos desejos no exemplo (igual a f_06)', () => {
  afterEach(() => reiniciarExemplo())
  it('o casal vê todos com o dono; a filha só os dela; a equipe nada', async () => {
    reiniciarExemplo()
    const ana = await apiExemplo.desejos!('fam-silva')
    expect(ana.map(d => d.dono_nome).sort()).toEqual(['Ana', 'Bia', 'Bruno'])
    expect(ana.filter(d => d.meu).map(d => d.dono_nome)).toEqual(['Ana'])
    exemploComo('filha')
    const bia = await apiExemplo.desejos!('fam-silva')
    expect(bia.every(d => d.dono_nome === 'Bia' && d.meu)).toBe(true)
    exemploComo('equipe')
    expect(await apiExemplo.desejos!('fam-silva')).toEqual([])
    await expect(apiExemplo.desejoCriar!('fam-silva', { nome: 'x', valor: 1, mes: '2027-01', volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false })).rejects.toThrow(/equipe/)
  })
  it('só o dono muda: Ana não mexe no desejo do Bruno; desejo novo entra na conta de 2029 (futuroEntradas)', async () => {
    reiniciarExemplo()
    const todos = await apiExemplo.desejos!('fam-silva')
    const doBruno = todos.find(d => d.dono_nome === 'Bruno')!
    await expect(apiExemplo.desejoMudar!('fam-silva', doBruno.id, { situacao: 'desisti' })).rejects.toThrow(/só Bruno muda/)
    await apiExemplo.desejoCriar!('fam-silva', { nome: 'Viagem (exemplo)', valor: 50000, mes: '2027-01', volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false })
    const ent = await apiExemplo.futuroEntradas!('fam-silva')
    expect(ent.entrada!.desejos.some(d => d.valor === 5_000_000 && d.mes === '2027-01')).toBe(true)
    // "Desisti" sai da conta, como no f_08
    const meu = (await apiExemplo.desejos!('fam-silva')).find(d => d.nome === 'Viagem (exemplo)')!
    await apiExemplo.desejoMudar!('fam-silva', meu.id, { situacao: 'desisti' })
    expect((await apiExemplo.futuroEntradas!('fam-silva')).entrada!.desejos.some(d => d.id === meu.id)).toBe(false)
  })
  it('rota desejos: a filha abre; a equipe volta pra Casa', () => {
    expect(rotaDoHash('#/desejos')).toBe('desejos')
    expect(rotaPermitida('desejos', 'pessoa')).toBe('desejos')
    expect(rotaPermitida('desejos', 'equipe')).toBe('casa')
  })
})

describe('E9: Atalho do iPhone (#/lancar?valor=&loja=&cartao=)', () => {
  it('lê o valor do jeito que o iPhone escreve e valida de 0,01 a 99.999,99 com até 2 casas', () => {
    expect(lerValor('R$ 12,34')).toBe(12.34)
    expect(lerValor('R$ 1.234,56')).toBe(1234.56)
    expect(lerValor('12.5')).toBe(12.5)
    expect(lerValor('1,234.56')).toBe(1234.56)
    expect(lerValor('12,345')).toBe(12345)
    expect(lerValor('12,3456')).toBeNull()
    expect(lerValor('abc')).toBeNull()
    expect(lerValor('-5')).toBeNull()
    expect(lerAtalho('#/lancar?valor=0,00')!.erro).toMatch(/R\$ 0,01 a R\$ 99\.999,99/)
    expect(lerAtalho('#/lancar?valor=100000')!.erro).toMatch(/fora do que o app aceita/)
    expect(lerAtalho('#/lancar?valor=99999,99')!.valor).toBe(99999.99)
    expect(lerAtalho('#/lancar?valor=0,01')!.valor).toBe(0.01)
    expect(lerAtalho('#/lancar?valor=12,345')!.valor).toBe(12345)
  })
  it('loja com acento, espaço e "&" no nome; cartão pelo nome sem acento ou pelos 4 últimos números', () => {
    const a = lerAtalho('#/lancar?valor=R%24%2045%2C90&loja=Padaria%20S%C3%A3o%20Jos%C3%A9&cartao=Ita%C3%BA')!
    expect(a).toEqual({ valor: 45.9, loja: 'Padaria São José', cartao: 'Itaú' })
    expect(lerAtalho('#/lancar?valor=10&loja=C&A Modas&cartao=Nubank')!.loja).toBe('C&A Modas')
    // B1 (revisão): < > " ` nunca entram na loja nem no cartão
    const inj = lerAtalho('#/lancar?valor=1&loja=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E&cartao=%22%3E%3Cscript%3E')!
    expect(inj.loja).toBe('img src=x onerror=alert(1)')
    expect(inj.cartao).toBe('script')
    expect(JSON.stringify(inj)).not.toMatch(/[<>`]|\\"/)
    expect(lerAtalho('#/lancar?loja=Farmácia sem codificar&valor=7,5')!).toEqual({ valor: 7.5, loja: 'Farmácia sem codificar' })
    const cs = [{ id: 'c1', nome: 'Itaú', banco: 'Itaú', final4: null }, { id: 'c2', nome: 'Roxinho', banco: 'Nubank', final4: '4321' }]
    expect(acharCartao(cs, 'itau')!.id).toBe('c1')
    expect(acharCartao(cs, 'Nubank Mastercard 4321')!.id).toBe('c2')
    expect(acharCartao(cs, 'Outro banco')).toBeNull()
  })
  it('só #/lancar é do Atalho; outro endereço não abre nada', () => {
    expect(ehAtalho('#/lancar?valor=1')).toBe(true)
    expect(ehAtalho('#/lancar')).toBe(true)
    expect(lerAtalho('#/inicio')).toBeNull()
    expect(rotaDoHash('#/lancar?valor=1')).toBe('inicio')
  })
})

describe('E10: a marca de onde a semana deveria estar hoje', () => {
  it('segunda: 0; quarta 18/11/2026: só segunda e terça passaram (sábado, domingo e o feriado de 20/11 pesam 1,5)', () => {
    expect(marcaDaSemana('2026-11-16')).toBe(0)
    expect(marcaDaSemana('2026-11-18')).toBeCloseTo(2 / 8.5, 5)
  })
  it('semana que começa no mês anterior conta do dia 1; domingo no mês que vem para no fim do mês', () => {
    // 01/12/2026 é terça: a janela vai de 01/12 a 06/12 e nada passou ainda
    expect(marcaDaSemana('2026-12-01')).toBe(0)
    // 30/11/2026 é segunda e o domingo é dezembro: janela de 1 dia
    expect(marcaDaSemana('2026-11-30')).toBe(0)
  })
})
void NB; void vi

describe('QA E11: a virada (31/12/2028, 01/01 e 02/01/2029) e os erros de tela', () => {
  const em = (dia: string) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(`${dia}T10:00:00-03:00`)); reiniciarExemplo() }
  afterEach(() => { vi.useRealTimers(); reiniciarExemplo() })
  it('31/12/2028: projeção sem mês pela frente, frase clara e ajuste "cortar" (nunca "guardando R$ 0")', async () => {
    em('2028-12-31')
    const ent = await apiExemplo.futuroEntradas!('fam-silva')
    expect(ent.entrada).not.toBeNull()
    const s = futuro(ent.entrada!)
    const f = frasesLinha(s)
    expect(f.caixa).toMatch(/último mês antes da virada/)
    if (f.ajuste) expect(f.ajuste).not.toMatch(/guardando R\$ 0/)
    if (s.ajustes_falta?.sugerido === 'cortar') expect(f.ajuste).toMatch(/^Fecha cortando R\$/)
  })
  for (const dia of ['2029-01-01', '2029-01-02']) it(`${dia}: a entrada sai mesmo sem ano até 2028 e o motor responde em modo renda`, async () => {
    em(dia)
    const ent = await apiExemplo.futuroEntradas!('fam-silva')
    expect(ent.entrada).not.toBeNull()
    const s = futuro(ent.entrada!)
    expect(s.modo).toBe('renda')
    const r = frasesRenda(s.renda!)
    expect(limpa(r.rende)).toMatch(/^Em jan\/29, o dinheiro guardado \(R\$ [\d.,]+\) rende R\$ [\d.,]+ por mês acima da inflação, pra sempre\. O mês gasta R\$ [\d.,]+\.$/)
    expect(limpa(r.folga)).toMatch(/^(Sobram|Faltam) R\$ [\d.,]+ por mês/)
    expect(r.taxa).toMatch(/Falta a Selic e o IPCA de 2029/) // o Focus de exemplo vai só até 2028
    // o Desejo responde (nunca fica em "Fazendo a conta…") e fala da renda, sem "2029"
    const d = desejoDoMotor({ nome: 'Viagem (exemplo)', valor: 50000, mes: '2029-02', volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false })
    const c = cabeDesejo(ent.entrada!, d)
    expect(c.modo).toBe('renda')
    const fd = frasesDesejo(c, d)
    expect(fd.linhas.join(' ')).toMatch(/por mês da renda, pra sempre\./)
    expect(fd.linhas.join(' ')).not.toMatch(/2029|12\/2028/)
    // o impacto do Lançar e do estouro: "da renda", sem "de 2029"
    const p = perdaPorMes(ent.entrada!, 2000, dia.slice(0, 7))
    expect(limpa(fraseImpacto(p!, '', 'renda'))).toMatch(/^Isso tira R\$ [\d.,]+ por mês da renda, pra sempre\.$/)
  })
  it('erro 5: a regra do salário é da família, o mesmo número pros 2', async () => {
    em('2026-11-18')
    const ana = await apiExemplo.entrouAMais!('fam-silva', '2026-11')
    exemploComo('bruno')
    expect(await apiExemplo.entrouAMais!('fam-silva', '2026-11')).toEqual(ana)
    expect(ana).toMatchObject({ entrou: 800, guardado: 500 })
  })
  it('E10: a frase da filha diz pra guardar o limite daquele mês (sem "deixar pra ele")', () => {
    expect(fraseDaFilha(250, 200, 300, true)).not.toMatch(/deixar pra ele/)
    expect(fraseDaFilha(250, 200, 300, true)).toMatch(/se você guardar o limite daquele mês pra isso/)
  })
})

describe('Conserto do corte: falta_por_mes na frase principal, margem_por_mes embaixo', () => {
  const base = { guardar_por_mes: 0, desejos_pra_adiar: [], sugerido: 'cortar' as const }
  it('falta e margem: 1 número de falta só, a margem "se der"', () => {
    const c = frasesCorte({ ...base, cortar_por_mes_2029: 1_563_324, falta_por_mes: 1_420_324, margem_por_mes: 143_000 })
    expect(limpa(c.principal)).toBe('Fecha cortando R$ 14.203,24 por mês.')
    expect(limpa(c.margem)).toBe('Mais R$ 1.430 de folga de segurança, se der.')
  })
  it('falta 0: a renda cobre o mês, falta só a folga', () => {
    const c = frasesCorte({ ...base, cortar_por_mes_2029: 143_000, falta_por_mes: 0, margem_por_mes: 143_000 })
    expect(limpa(c.principal)).toBe('A renda cobre o mês. Falta só a folga de segurança: R$ 1.430.')
    expect(c.margem).toBeNull()
  })
  const em = (dia: string) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(`${dia}T10:00:00-03:00`)); reiniciarExemplo() }
  afterEach(() => { vi.useRealTimers(); reiniciarExemplo() })
  for (const dia of ['2028-12-31', '2029-01-01', '2029-01-02']) it(`${dia}: a frase do corte usa falta_por_mes do motor e a soma bate`, async () => {
    em(dia)
    const s = futuro((await apiExemplo.futuroEntradas!('fam-silva')).entrada!)
    const a = s.ajustes_falta
    if (!a) return
    expect((a.falta_por_mes ?? 0) + (a.margem_por_mes ?? 0)).toBe(a.cortar_por_mes_2029)
    const c = frasesCorte(a)
    if (a.falta_por_mes! > 0) expect(limpa(c.principal)).toBe(`Fecha cortando ${limpa(reaisDe(a.falta_por_mes!))} por mês.`)
    if (s.modo === 'renda') expect(a.falta_por_mes).toBe(Math.max(0, -s.renda!.folga_do_mes))
    if ((a.margem_por_mes ?? 0) > 0) expect(limpa(c.principal) + ' ' + limpa(c.margem)).not.toContain(limpa(reaisDe(a.cortar_por_mes_2029)) + ' por mês')
  })
})

describe('PACOTE 1 do design: o âmbar de texto passa 4,5:1 nos 3 fundos claros', () => {
  it('--warn e --warn-ink contra o fundo, a faixa e o branco', () => {
    const css: string = readFileSync('src/estilo.css', 'utf8')
    const claro = css.slice(css.indexOf(':root{'), css.indexOf('@media (prefers-color-scheme:dark)'))
    const tk = (n: string) => new RegExp(`--${n}:(#[0-9A-Fa-f]{6})`).exec(claro)![1]
    const lum = (h: string) => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
    const cr = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
    for (const cor of ['warn', 'warn-ink']) for (const fundo of ['ground', 'raised', 'surface', 'warn-soft']) expect(cr(tk(cor), tk(fundo))).toBeGreaterThanOrEqual(4.5)
  })
})
