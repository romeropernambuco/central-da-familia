// Testes das melhorias do protótipo (13/11). Família de EXEMPLO: Andreza com teto R$\u00a06.000 por dia, todo número inventado.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiExemplo, exemploComo, reiniciarExemplo } from './api/exemplo'
import { cofrinhoDoMes, gastosDoMes, gastoSemana, parcelasDe, pesoDia, plano, projecao } from './lib/plano'
import { centavos, esconderValores, mesDaFatura, reais } from './lib/formato'
import { fraseEstouro, numeroEnvelope } from './componentes/EnvelopeCard'
import { marcoGuardado } from './lib/guardado'

const F = 'fam-silva'
const em = (dia: string, hora = 10) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(`${dia}T${String(hora).padStart(2, '0')}:00:00-03:00`)); reiniciarExemplo() }
afterEach(() => { vi.useRealTimers() })
const resumo = () => apiExemplo.resumoHoje(F)
const andreza = async () => (await resumo()).envelopes.find(e => e.id === 'env-andreza')!

/* O mês do relatório CONTAS (exemplo): 80 no dia útil, 120 no fim de semana e feriado, semana de 250 por dia (09 a 15),
   + 1.200 no dia 05 e + 900 no dia 16. Os números "do banco" são os da tabela do CONTAS.md (porte de produto._plano). */
const N = 30
const dia = (i: number) => `2026-11-${String(i).padStart(2, '0')}`
const gastoContas: Record<string, number> = {}
for (let i = 1; i <= N; i++) gastoContas[dia(i)] = pesoDia(dia(i)) > 1 ? 120 : 80
for (let i = 9; i <= 15; i++) gastoContas[dia(i)] = 250
gastoContas[dia(5)] += 1200; gastoContas[dia(16)] += 900
const manha = (i: number) => { const g = { ...gastoContas }; delete g[dia(i)]; for (const d of Object.keys(g)) if (d > dia(i)) delete g[d]; return plano(6000, g, dia(i)).pode_hoje }

describe('R0: o modo exemplo faz a mesma conta do banco', () => {
  it('bate com a tabela do CONTAS (banco) dia a dia, com centavo e peso de fim de semana', () => {
    expect(manha(1)).toBe(253.52)
    expect(manha(9)).toBe(156.86)
    expect(manha(14)).toBe(201.22)
    expect(manha(16)).toBe(128.57)
    expect(manha(17)).toBe(76.97)
    expect(manha(21)).toBe(113.75)
    expect(manha(30)).toBe(30)
  })
  it('estouro da semana empurra pros dias seguintes (o 17 fica menor que o 8)', () => {
    expect(manha(17)).toBeLessThan(manha(8))
  })
  it('no app de exemplo, o número da Andreza vem do mesmo plano (sábado vale 1,5 dia útil)', async () => {
    em('2026-11-21')
    const e = await andreza()
    expect(e.peso_fds).toBe(1.5)
    expect(e.valor_dia_inteiro).toBeGreaterThan(0)
    const util = (e.valor_dia_inteiro || 0) / 1.5
    expect(Math.abs((e.ate_fim_mes! + e.gasto_hoje!) - util * (1.5 * 4 + 6))).toBeLessThan(1) // sáb e dom × 2 semanas + 6 dias úteis
  })
  it('a explicação do "?" fecha com o número da tela', async () => {
    em('2026-11-21')
    const e = await andreza(); const r = await resumo()
    const n = numeroEnvelope(e, r.dias_restantes)
    expect(n.linhas[n.linhas.length - 1].valor).toBe(e.valor_dia)
    expect(centavos((n.linhas.find(l => /hoje vale/.test(l.linha))!.valor) - (e.gasto_hoje || 0))).toBe(e.valor_dia)
  })
})

describe('R1, R2, R3: cada um vê o seu e a Casa', () => {
  it('Andreza: o limite dela e os da Casa; nada do Romero nem da Bia', async () => {
    em('2026-11-18'); exemploComo('andreza')
    const ids = (await resumo()).envelopes.map(e => e.id)
    expect(ids).toEqual(['env-andreza', 'env-feira', 'env-casa'])
    const l = await apiExemplo.lancamentos(F, '2026-11')
    expect(l.some(x => x.envelope_id === 'env-romero')).toBe(false)
    expect((await resumo()).limites_outros).toBe(4300)
  })
  it('Romero: o dele e a Casa; a filha: só o dela; a equipe: só nomes da Casa, sem R$', async () => {
    em('2026-11-18'); exemploComo('romero')
    expect((await resumo()).envelopes.map(e => e.id)).toEqual(['env-romero', 'env-feira', 'env-casa'])
    expect((await apiExemplo.sessao())!.familias[0].envelopeId).toBe('env-romero')
    exemploComo('filha')
    expect((await resumo()).envelopes.map(e => e.id)).toEqual(['env-bia'])
    expect((await apiExemplo.sessao())!.familias[0].papel).toBe('pessoa')
    exemploComo('equipe')
    const r = await resumo()
    expect(r.so_nomes).toBe(true); expect(r.envelopes.every(e => e.limite_mes === 0 && e.casa)).toBe(true)
  })
  it('lançar no limite de outra pessoa é recusado', async () => {
    em('2026-11-18'); exemploComo('andreza')
    await expect(apiExemplo.lancar({ familia: F, envelope: 'env-romero', valor: 10, data: '2026-11-18', descricao: '', chave: 'x1' })).rejects.toThrow(/não é seu/)
  })
  it('Guardado com dono: R$\u00a050.000 no nome dela (exemplo), a do casal aparece, a do Romero não', async () => {
    em('2026-11-18'); exemploComo('andreza')
    const g = await apiExemplo.guardadoHoje(F)
    expect(g.aplicacoes.map(a => a.id)).toEqual(['g1', 'g2', 'g3', 'g4'])
    expect(g.seu_total!).toBeGreaterThan(50000); expect(g.seu_total!).toBeLessThan(51000)
    expect(g.aplicacoes.find(a => a.id === 'g4')!.titular).toBeNull()
    expect(g.aplicacoes.find(a => a.id === 'g1')!.titular_nome).toBe('Andreza')
    exemploComo('romero')
    expect((await apiExemplo.guardadoHoje(F)).aplicacoes.map(a => a.id)).toEqual(['g4', 'g5'])
  })
  it('G10: o marco de R$\u00a050.000 dela aparece (o presente de R$\u00a0500 do dia 06 fez passar)', async () => {
    em('2026-11-18'); exemploComo('andreza')
    const g = await apiExemplo.guardadoHoje(F)
    expect(marcoGuardado(g.saldo_30_seu!)).toEqual({ valor: 50000, dia: '2026-11-06' })
  })
})

describe('R6: estouro com valor, de onde sai e o amanhã', () => {
  it('dia 30: fica devendo R$\u00a0217 (com a parcela de R$\u00a0200, não os R$\u00a01.200 inteiros), sai de dezembro', async () => {
    em('2026-11-30', 21)
    const e = await andreza(); const r = await resumo()
    const n = numeroEnvelope(e, r.dias_restantes)
    expect(n.estado).toBe('devendo'); expect(n.devendo).toBe(217)
    // rodada 2: sem "Sem culpa", com o próximo passo: de onde sai e com quanto dezembro começa
    expect(fraseEstouro(e, n)).toMatch(/^Passou R\$\s217 do combinado\. Sai do mês de dezembro: ele começa com R\$\s5\.783 em 01\/12\.$/)
  })
  it('passou só o dia: diz quanto passou e o valor de amanhã', async () => {
    em('2026-11-18')
    await apiExemplo.lancar({ familia: F, envelope: 'env-andreza', valor: 400, data: '2026-11-18', descricao: 'Sapato', chave: 'k-est' })
    const e = await andreza(); const n = numeroEnvelope(e, (await resumo()).dias_restantes)
    expect(n.estado).toBe('dia_passou'); expect(e.valor_dia).toBe(0)
    expect(fraseEstouro(e, n)).toMatch(/^Hoje passou R\$\s[\d.,]+ do valor do dia\. A partir de amanhã: R\$\s[\d.,]+ por dia\.$/)
    expect(e.amanha!).toBeGreaterThan(0)
  })
  it('Cobrir com a sobra da Casa (só no exemplo) zera o devendo e o Desfazer volta', async () => {
    em('2026-11-30', 21)
    const desfazer = await apiExemplo.cobrirComCasa!(F, 'env-andreza', 217)
    expect((await andreza()).livre).toBe(0)
    expect((await resumo()).envelopes.find(e => e.id === 'env-casa')!.livre).toBe(centavos(2500 - 524.7 - 217))
    await desfazer()
    expect((await andreza()).livre).toBe(-217)
    await expect(apiExemplo.cobrirComCasa!(F, 'env-andreza', 5000)).rejects.toThrow(/só tem/)
  })
})

describe('R7+G3: semana, ritmo e projeção', () => {
  it('até domingo é maior que o dia e, no domingo, é só o dia', async () => {
    em('2026-11-18')
    const e = await andreza()
    expect(e.ate_domingo!).toBeGreaterThan(e.valor_dia!)
    expect(e.gasto_semana_dia).toBe(480 + 610 + 12) // seg 16, ter 17 e o café de hoje
    em('2026-11-22')
    const d = await andreza()
    expect(d.ate_domingo).toBe(d.valor_dia)
  })
  it('projeção: R$\u00a04.452 em 18 dias fecha em R$\u00a07.420 de R$\u00a06.000 (passa R$\u00a01.420)', () => {
    expect(projecao(4452, 6000, '2026-11-18')).toEqual({ fecha: 7420, dentro: false, passa: 1420, deveria: 3600 })
    expect(projecao(1500, 6000, '2026-11-10').dentro).toBe(true)
  })
  it('gasto da semana conta de segunda até hoje', () => {
    expect(gastoSemana({ '2026-11-15': 99, '2026-11-16': 10, '2026-11-18': 5, '2026-11-19': 7 }, '2026-11-18')).toBe(15)
  })
})

describe('R10+G5: parcelado 1x a 12x, parcela no mês de cada fatura', () => {
  it('R$\u00a01.200 em 6x: R$\u00a0200 por mês, 1ª no dia da compra, as outras no mês delas', () => {
    expect(parcelasDe(1200, 6)).toEqual([200, 200, 200, 200, 200, 200])
    expect(parcelasDe(100, 3)).toEqual([33.34, 33.33, 33.33])
    const l = [{ data: '2026-11-12', valor: 1200, parcelas: 6 }]
    expect(gastosDoMes(l, '2026-11')).toEqual({ porDia: { '2026-11-12': 200 }, parcelas: 0 })
    expect(gastosDoMes(l, '2026-12')).toEqual({ porDia: {}, parcelas: 200 })
    expect(gastosDoMes(l, '2027-04')).toEqual({ porDia: {}, parcelas: 200 })
    expect(gastosDoMes(l, '2027-05')).toEqual({ porDia: {}, parcelas: 0 })
  })
  it('no exemplo, lançar 6x no cartão conta R$\u00a0200 no mês e as faturas levam R$\u00a0200 cada', async () => {
    em('2026-11-18')
    const antes = (await andreza()).gasto_mes
    const fAntes = await apiExemplo.faturas(F, 8)
    await apiExemplo.lancar({ familia: F, envelope: 'env-andreza', valor: 600, data: '2026-11-18', descricao: 'Tênis', cartao: 'car-nu', parcelas: 6, chave: 'k-6x' })
    expect(centavos((await andreza()).gasto_mes - antes)).toBe(100)
    const fDepois = await apiExemplo.faturas(F, 8)
    const dif = (m: string) => centavos(fDepois.find(f => f.cartao_id === 'car-nu' && f.mes === m)!.total - fAntes.find(f => f.cartao_id === 'car-nu' && f.mes === m)!.total)
    expect(['2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06'].map(dif)).toEqual([100, 100, 100, 100, 100, 100, 0])
  })
  it('em dezembro, a parcela aparece nos lançamentos como "parcela 2 de 6" e já sai do mês', async () => {
    em('2026-12-03')
    await apiExemplo.lancar({ familia: F, envelope: 'env-andreza', valor: 1200, data: '2026-12-01', descricao: 'Geladeira', cartao: 'car-nu', parcelas: 6, chave: 'k-dez' })
    vi.setSystemTime(new Date('2027-01-05T10:00:00-03:00'))
    // rodada 2: em dezembro o exemplo traz novembro inteiro, então em janeiro também cai a 3ª parcela do tênis de 12/11
    const l = (await apiExemplo.lancamentos(F, '2027-01')).find(x => x.parcela && x.descricao === 'Geladeira')
    expect(l!.parcela).toMatchObject({ n: 2, de: 6 }); expect(l!.valor).toBe(200)
    expect((await andreza()).parcelas_mes).toBe(400)
  })
  it('compra no dia do fechamento vai pra fatura seguinte, igual ao banco', () => {
    expect(mesDaFatura(11, 3, 3, 10)).toBe(12)
    expect(mesDaFatura(11, 2, 3, 10)).toBe(11)
  })
})

describe('R11+G12: entrou dinheiro vai pro guardado e não muda o gasto', () => {
  it('presente de R$\u00a0500: guardado +500, número de hoje igual; Desfazer tira', async () => {
    em('2026-11-18')
    const r0 = await resumo(); const g0 = await apiExemplo.guardadoHoje(F)
    await apiExemplo.guardadoMovimentar('g1', 'aporte', 500, '2026-11-18', 'k-presente', 'Presente da madrinha')
    expect((await resumo()).pode_gastar_hoje).toBe(r0.pode_gastar_hoje)
    expect(centavos((await apiExemplo.guardadoHoje(F)).total - g0.total)).toBe(500)
    await apiExemplo.guardadoDesfazer!('g1', 'k-presente')
    expect((await apiExemplo.guardadoHoje(F)).total).toBe(g0.total)
    await expect(apiExemplo.guardadoDesfazer!('g1', 'k-presente')).rejects.toThrow(/já foi desfeito/)
  })
})

describe('R12: corrigir lançamento', () => {
  it('troca R$\u00a085 por R$\u00a058 e o resumo acompanha; corrigir de volta desfaz', async () => {
    em('2026-11-18')
    const r = await apiExemplo.lancar({ familia: F, envelope: 'env-andreza', valor: 85, data: '2026-11-18', descricao: 'Farmácia', chave: 'k-85' })
    const g = (await andreza()).gasto_mes
    await apiExemplo.corrigirLancamento!(r.lancamento.id, { valor: 58 })
    expect(centavos(g - (await andreza()).gasto_mes)).toBe(27)
    await apiExemplo.corrigirLancamento!(r.lancamento.id, { valor: 85 })
    expect((await andreza()).gasto_mes).toBe(g)
    await expect(apiExemplo.corrigirLancamento!(r.lancamento.id, { envelope: 'env-romero' })).rejects.toThrow(/não é seu/)
  })
})

describe('R4: convite sem armadilha', () => {
  it('lista quem entrou e quem espera; e-mail repetido avisa; cancelar libera convidar de novo', async () => {
    em('2026-11-18')
    const l = await apiExemplo.convites!(F)
    expect(l.find(c => c.nome === 'Vó Lúcia')!.situacao).toBe('esperando')
    await expect(apiExemplo.convidar(F, 'pessoa', 'Vó', 'lucia@exemplo.com')).rejects.toThrow(/já foi convidado/)
    await expect(apiExemplo.cancelarConvite!(F, 'cv1')).rejects.toThrow(/já entrou/)
    await apiExemplo.reenviarConvite!(F, 'cv4')
    await apiExemplo.cancelarConvite!(F, 'cv4')
    await apiExemplo.convidar(F, 'pessoa', 'Vó Lúcia', 'lucia@exemplo.com')
    expect((await apiExemplo.convites!(F)).filter(c => c.email === 'lucia@exemplo.com')).toHaveLength(1)
  })
})

describe('R8, R15, N12: cofrinho, cortes e olho', () => {
  it('cofrinho: dia acima do valor come a sobra dos outros, nunca abaixo de 0', () => {
    const anot = new Set(['a', 'b', 'c'])
    expect(cofrinhoDoMes({ a: 100, b: 300, c: 150 }, 200, ['a', 'b', 'c'], anot)).toBe(50)
    expect(cofrinhoDoMes({ a: 500 }, 200, ['a'], new Set(['a']))).toBe(0)
    expect(cofrinhoDoMes({}, 200, ['a', 'b'], new Set(['a']))).toBe(200)
  })
  it('fechamento do mês fica calado quando a sobra renderia menos de R$\u00a020 por mês', async () => {
    em('2026-11-01', 10)
    expect((await apiExemplo.escritorioHoje(F)).precisa_de_voce.some(p => p.id.startsWith('fechou_mes:'))).toBe(false)
  })
  it('Guardião da Reserva não diz só "está inteira" quando a pessoa passou do combinado', async () => {
    em('2026-11-30', 21)
    const e = (await apiExemplo.escritorioHoje(F)).entregue.find(x => x.funcionario === 'colchao')!
    expect(e.resumo).toMatch(/Andreza passou R\$\s217 do combinado do mês/)
  })
  it('olho fechado: todo valor vira R$\u00a0•••', () => {
    esconderValores(true); expect(reais(1234.5)).toBe('R$\u00a0•••')
    esconderValores(false); expect(reais(1234.5)).toBe('R$\u00a01.234,50')
  })
})
