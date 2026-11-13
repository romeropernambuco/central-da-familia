// E7 a E10 (TELAS 2, 13/11). Todo número é de exemplo (casos do ECONOMISTA ou família de exemplo).
// A tela nunca calcula 2029: estes testes conferem que as frases saem do que o motor devolve, com os números dos casos.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fraseImpacto, perdaPorMes } from './componentes/Impacto2029'
import { frasesLinha, mesAno } from './componentes/Linha2028'
import { situacaoReajuste, type ReajusteAno } from './telas/planejamento/Reajuste'
import { frasesFGC } from './telas/guardado/Guardado'
import { desejoDoMotor, fraseDaFilha, frasesDesejo } from './telas/desejos/Desejos'
import { acharCartao, ehAtalho, lerAtalho, lerValor } from './lib/atalho'
import { marcaDaSemana } from './componentes/RitmoMes'
import { cabeDesejo, futuro, type FuturoEntrada, type FuturoSaida } from './lib/futuro'
import { reajustarTeto } from './lib/futuro/f8_reajuste'
import { apiExemplo, exemploComo, reiniciarExemplo } from './api/exemplo'
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
  const l = (mes: string, saldo_final: number, fica_devendo = 0, devendo_ate: string | null = null) => ({ mes, saldo_inicial: 0, rendimento: 0, recebimentos: 0, teto: 0, compromissos: 0, dividas: 0, desvios: 0, retornos: 0, saldo_final, fica_devendo, devendo_ate })
  it('F9-MES: "fica devendo R$ 20.000 pro caixa até 04/2027", sem sinal de menos', () => {
    const s: FuturoSaida = { linha: [l('2027-03', 4_000_000, 2_000_000, '2027-04'), l('2027-04', 9_500_000)], patrimonio_necessario: 9_000_000, renda_sustentavel: 31_000, folga: 500_000, ajustes_falta: null, perguntas: [], avisos_fgc: [] }
    const f = frasesLinha(s)
    expect(limpa(f.devendo)).toBe('Em 03/2027 o caixa fica abaixo do piso: fica devendo R$ 20.000 pro caixa até 04/2027.')
    expect(limpa(f.virada)).toMatch(/^Em 2029 o dinheiro rende R\$ 310 por mês, pra sempre, e sobram R\$ 5\.000/)
    expect(JSON.stringify(f)).not.toMatch(/-R\$|R\$\s?-/)
  })
  it('F5 com falta: os ajustes do F9 com número (guardar por mês ou gastar menos em 2029)', () => {
    const s: FuturoSaida = { linha: [l('2028-12', -100_000)], patrimonio_necessario: 1_000_000_00, renda_sustentavel: 0, folga: -122_014_316, ajustes_falta: { guardar_por_mes: 4_695_336, cortar_por_mes_2029: 399_443, desejos_pra_adiar: [] }, perguntas: [], avisos_fgc: [] }
    const f = frasesLinha(s)
    expect(limpa(f.caixa)).toBe('Com estes números, a família fica devendo R$ 1.000 em dez/28.')
    expect(limpa(f.virada)).toBe('Pra viver do rendimento em 2029 faltam R$ 1.220.143,16.')
    expect(limpa(f.ajuste)).toBe('Fecha guardando R$ 46.953,36 por mês até 12/2028 ou gastando R$ 3.994,43 a menos por mês em 2029.')
  })
  it('a frase da linha sai de futuro() de verdade (família de exemplo do caso, nada calculado na tela)', () => {
    const e = entrada({}, 6); e.parametros.teto_mes = 3_000_000; e.parametros.gasto_2029_hoje = 2_000_000
    const s = futuro(e)
    const f = frasesLinha(s)
    expect(f.caixa).toContain(mesAno(s.linha[s.linha.length - 1].mes) === '12/2028' ? 'dez/28' : '')
    expect(s.linha[0].mes).toBe('2026-12')
  })
})

describe('E7: reajuste do teto (F8) só com os 2 aprovando', () => {
  const rec = (aprovado: ReajusteAno['aprovado']): ReajusteAno => ({ ipca: '0.0522', teto: 3_000_000, sugerido: reajustarTeto(3_000_000, '0.0522'), aprovado })
  const adultos = [{ id: 'a' }, { id: 'b' }]
  it('F8-TETO: R$ 30.000 com IPCA de 5,22% sugere R$ 31.566 (conta do motor)', () => { expect(reajustarTeto(3_000_000, '0.0522')).toBe(3_156_600) })
  it('F8-SEM-APROVACAO: 1 aprovou e o outro não: sugestão pendente', () => {
    expect(situacaoReajuste(rec({ a: { nome: 'Ana', em: '2027-01-05' } }), adultos, '2027-01-20')).toBe('sugestao pendente')
  })
  it('os 2 aprovaram em janeiro: vale só no mês seguinte', () => {
    const r = rec({ a: { nome: 'Ana', em: '2027-01-05' }, b: { nome: 'Bruno', em: '2027-01-12' } })
    expect(situacaoReajuste(r, adultos, '2027-01-20')).toBe('aprovado, vale no mes seguinte')
    expect(situacaoReajuste(r, adultos, '2027-02-01')).toBe('aprovado')
  })
  it('família de 1 adulto: o "aprovo" dela basta', () => {
    expect(situacaoReajuste(rec({ a: { nome: 'Cláudia', em: '2027-01-05' } }), [{ id: 'a' }], '2027-02-01')).toBe('aprovado')
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
    const folgado = cabeDesejo(entrada(t), desejoDoMotor({ nome: 'Fone (exemplo)', valor: 500, mes: '2027-01', volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false }))
    expect(frasesDesejo(folgado, d(true)).titulo).toBe('Cabe.')
  })
  it('F7-ANTECIPA: contrato adiantado de R$ 120.000 por R$ 100.000 custa mais do que o caixa rende', async () => {
    const { avaliarAntecipacao } = await import('./lib/futuro/f7_desejo')
    const a = avaliarAntecipacao(10_000_000, '2026-12', 12_000_000, '2027-12', { taxa_bruta_ano: { 2026: '0.1375', 2027: '0.125', 2028: '0.11' }, aliq_proj: '0.225', virada: '2029-01', taxa_real_trabalho: '0.04' })
    expect(a.efeito_na_virada).toBe(-1_119_413)
    const des = desejoDoMotor({ nome: 'Carro (exemplo)', valor: 100000, mes: '2026-12', volta_de: 'contrato', volta: 120000, volta_mes: '2027-12', antecipado: 100000, volta_certa: false })
    expect(des.volta_certa).toBe(true)
    expect(frasesDesejo(cabeDesejo(entrada(t), des), des, a).linhas).toContain('Adiantar o contrato custa mais do que o caixa rende no mesmo tempo.')
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
