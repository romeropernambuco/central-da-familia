// Testes das melhorias do protótipo (13/11). Família de EXEMPLO: Ana com teto R$\u00a05.500 por dia, todo número inventado.
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
const ana = async () => (await resumo()).envelopes.find(e => e.id === 'env-ana')!

/* O mês do relatório CONTAS (exemplo): 80 no dia útil, 120 no fim de semana e feriado, semana de 250 por dia (09 a 15),
   + 1.200 no dia 05 e + 900 no dia 16. Os números "do banco" são os da tabela do CONTAS.md (porte de produto._plano). */
const N = 30
const dia = (i: number) => `2026-11-${String(i).padStart(2, '0')}`
const gastoContas: Record<string, number> = {}
for (let i = 1; i <= N; i++) gastoContas[dia(i)] = pesoDia(dia(i)) > 1 ? 120 : 80
for (let i = 9; i <= 15; i++) gastoContas[dia(i)] = 250
gastoContas[dia(5)] += 1200; gastoContas[dia(16)] += 900
const manha = (i: number) => { const g = { ...gastoContas }; delete g[dia(i)]; for (const d of Object.keys(g)) if (d > dia(i)) delete g[d]; return plano(6000, g, dia(i)).pode_hoje } // conta pura conferida à mão com teto 6.000; não depende da família de exemplo (C1 só trocou o teto do exemplo)

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
  it('no app de exemplo, o número da Ana vem do mesmo plano (sábado vale 1,5 dia útil)', async () => {
    em('2026-11-21')
    const e = await ana()
    expect(e.peso_fds).toBe(1.5)
    expect(e.valor_dia_inteiro).toBeGreaterThan(0)
    const util = (e.valor_dia_inteiro || 0) / 1.5
    expect(Math.abs((e.ate_fim_mes! + e.gasto_hoje!) - util * (1.5 * 4 + 6))).toBeLessThan(1) // sáb e dom × 2 semanas + 6 dias úteis
  })
  it('a explicação do "?" fecha com o número da tela', async () => {
    em('2026-11-21')
    const e = await ana(); const r = await resumo()
    const n = numeroEnvelope(e, r.dias_restantes)
    expect(n.linhas[n.linhas.length - 1].valor).toBe(e.valor_dia)
    expect(centavos((n.linhas.find(l => /hoje vale/.test(l.linha))!.valor) - (e.gasto_hoje || 0))).toBe(e.valor_dia)
  })
})

// E2 (regra nova do dono, 13/11): "o orçamento é da família". O casal LÊ tudo, com o nome do dono, e ESCREVE só no seu e na Casa.
// Os testes de R1 ("cada um vê só o seu") mudaram por isso: o motivo está ao lado de cada expect que mudou.
describe('R1, R2, R3 (E2): o casal lê tudo com o dono; escreve no seu e na Casa', () => {
  it('Ana: lê todos os limites (o dela 1º, a Casa por último), cada um com dono; escreve só no dela e na Casa', async () => {
    em('2026-11-18'); exemploComo('ana')
    const r = await resumo()
    // E2: era ['env-ana', 'env-feira', 'env-casa'] (cada um via só o seu)
    expect(r.envelopes.map(e => e.id)).toEqual(['env-ana', 'env-bruno', 'env-bia', 'env-feira', 'env-casa'])
    expect(r.envelopes.map(e => [e.dono, e.escreve])).toEqual([['Ana', true], ['Bruno', false], ['Bia', false], [null, true], [null, true]])
    const l = await apiExemplo.lancamentos(F, '2026-11')
    // E2: era "nenhum do Bruno"; agora ela lê o do Bruno, sem poder mexer
    expect(l.some(x => x.envelope_id === 'env-bruno')).toBe(true)
    expect(l.filter(x => x.envelope_id === 'env-bruno').every(x => x.meu === false)).toBe(true)
    expect(l.filter(x => x.envelope_id === 'env-ana' && !x.apagado_em).every(x => x.meu === true)).toBe(true)
    // E2: some o "total dos limites dos outros sem detalhe" (era 4300): cada limite aparece com o nome
    expect(r.limites_outros).toBeUndefined()
    // o "pode gastar hoje" continua só o dela e o da Casa: o limite do Bruno não entra na soma
    expect(r.pode_gastar_hoje).toBe(centavos(r.envelopes.filter(e => e.escreve).reduce((s, e) => s + (e.hoje || 0), 0)))
  })
  it('Bruno: lê tudo, o dele 1º; a filha: só o dela; a equipe: só nomes da Casa, sem R$', async () => {
    em('2026-11-18'); exemploComo('bruno')
    // E2: era ['env-bruno', 'env-feira', 'env-casa']
    expect((await resumo()).envelopes.map(e => e.id)).toEqual(['env-bruno', 'env-ana', 'env-bia', 'env-feira', 'env-casa'])
    expect((await apiExemplo.sessao())!.familias[0].envelopeId).toBe('env-bruno')
    exemploComo('filha')
    expect((await resumo()).envelopes.map(e => e.id)).toEqual(['env-bia'])
    expect((await apiExemplo.sessao())!.familias[0].papel).toBe('pessoa')
    exemploComo('equipe')
    const r = await resumo()
    expect(r.so_nomes).toBe(true); expect(r.envelopes.every(e => e.limite_mes === 0 && e.casa)).toBe(true)
  })
  it('lançar, corrigir e apagar no limite do outro é recusado (igual a f_02)', async () => {
    em('2026-11-18'); exemploComo('ana')
    // E2: a mensagem agora diz de quem é (era /não é seu/)
    await expect(apiExemplo.lancar({ familia: F, envelope: 'env-bruno', valor: 10, data: '2026-11-18', descricao: '', chave: 'x1' })).rejects.toThrow(/é de Bruno/)
    const doBruno = (await apiExemplo.lancamentos(F, '2026-11')).find(l => l.envelope_id === 'env-bruno' && !l.apagado_em)!
    await expect(apiExemplo.corrigirLancamento!(doBruno.id, { valor: 1 })).rejects.toThrow(/só Bruno corrige/)
    await expect(apiExemplo.apagarLancamento(doBruno.id)).rejects.toThrow(/Só quem lançou/)
    // a luz da Casa foi lançada pelo Bruno: ela lê, mas só quem lançou corrige (o banco exige o autor)
    const luz = (await apiExemplo.lancamentos(F, '2026-11')).find(l => l.descricao === 'Conta de luz')!
    expect(luz.meu).toBe(false)
    await expect(apiExemplo.corrigirLancamento!(luz.id, { valor: 1 })).rejects.toThrow(/Só quem lançou/)
    await expect(apiExemplo.cobrirComCasa!(F, 'env-bruno', 10)).rejects.toThrow(/Só quem passou/)
  })
  it('Guardado com dono (E2): ela lê as 5 aplicações, com o titular; guarda, tira e encerra só na dela e na do casal', async () => {
    em('2026-11-18'); exemploComo('ana')
    const g = await apiExemplo.guardadoHoje(F)
    // E2: era ['g1', 'g2', 'g3', 'g4'] (a do Bruno não aparecia)
    expect(g.aplicacoes.map(a => a.id)).toEqual(['g1', 'g2', 'g3', 'g4', 'g5'])
    expect(g.aplicacoes.find(a => a.id === 'g5')!.titular_nome).toBe('Bruno')
    await expect(apiExemplo.guardadoMovimentar('g5', 'aporte', 10, '2026-11-18', 'k-g5')).rejects.toThrow(/no nome de Bruno/)
    await expect(apiExemplo.guardadoEncerrar('g5')).rejects.toThrow(/no nome de Bruno/)
    await apiExemplo.guardadoMovimentar('g4', 'aporte', 10, '2026-11-18', 'k-g4')
    // C2 (revisão E0): "Do casal" vai explícito e grava sem titular; no nome do Bruno, recusado
    await apiExemplo.guardadoCriar(F, { nome: 'Caixinha Teste', banco: 'Teste', tipo: 'caixinha', pct_cdi: 100, valor_inicial: 100, data: '2026-11-18', do_casal: true })
    expect((await apiExemplo.guardadoHoje(F)).aplicacoes.find(a => a.nome === 'Caixinha Teste')!.titular).toBeNull()
    await expect(apiExemplo.guardadoCriar(F, { nome: 'X', banco: 'X', tipo: 'caixinha', pct_cdi: 100, valor_inicial: 1, data: '2026-11-18', titular: 'm-bruno' })).rejects.toThrow(/próprio nome/)
    expect(g.seu_total!).toBeGreaterThan(50000); expect(g.seu_total!).toBeLessThan(51000)
    expect(g.aplicacoes.find(a => a.id === 'g4')!.titular).toBeNull()
    expect(g.aplicacoes.find(a => a.id === 'g1')!.titular_nome).toBe('Ana')
    exemploComo('bruno')
    // E2: era ['g4', 'g5']; ele lê as da Ana com o nome dela
    expect((await apiExemplo.guardadoHoje(F)).aplicacoes.map(a => a.id)).toEqual(['g1', 'g2', 'g3', 'g4', 'g5', expect.any(String)])
  })
  it('G10: o marco de R$\u00a050.000 dela aparece (o presente de R$\u00a0500 do dia 06 fez passar)', async () => {
    em('2026-11-18'); exemploComo('ana')
    const g = await apiExemplo.guardadoHoje(F)
    expect(marcoGuardado(g.saldo_30_seu!)).toEqual({ valor: 50000, dia: '2026-11-06' })
  })
})

describe('R6: estouro com valor, de onde sai e o amanhã', () => {
  it('dia 30: fica devendo R$\u00a0717 (com a parcela de R$\u00a0200, não os R$\u00a01.200 inteiros), sai de dezembro', async () => {
    em('2026-11-30', 21)
    const e = await ana(); const r = await resumo()
    const n = numeroEnvelope(e, r.dias_restantes)
    expect(n.estado).toBe('devendo'); expect(n.devendo).toBe(517) // C1: teto 6.000 -> 5.500 (era 217, depois 717). E4 (decisão do dono, 13/11, TIME.md): a parcela do tênis de 12/11 no Nubank (fecha 3) cai na fatura de dezembro, não mais em novembro: novembro fica R$ 200 menor
    // rodada 2: sem "Sem culpa", com o próximo passo: de onde sai e com quanto dezembro começa
    // E3 (conserto 2): a parcela de dezembro (R$ 200 do tênis em 6x) entra na frase; era "começa com R$ 4.783 em 01/12."
    expect(fraseEstouro(e, n)).toMatch(/^Passou R\$\s517 do combinado\. Sai do mês de dezembro: ele começa com R\$\s4\.783 em 01\/12 \(R\$\s517 de novembro e R\$\s200 de parcela\)\.$/) // E4: 517 + a 1ª parcela em dezembro
  })
  it('passou só o dia: diz quanto passou e o valor de amanhã', async () => {
    em('2026-11-18')
    await apiExemplo.lancar({ familia: F, envelope: 'env-ana', valor: 400, data: '2026-11-18', descricao: 'Sapato', chave: 'k-est' })
    const e = await ana(); const n = numeroEnvelope(e, (await resumo()).dias_restantes)
    expect(n.estado).toBe('dia_passou'); expect(e.valor_dia).toBe(0)
    expect(fraseEstouro(e, n)).toMatch(/^Hoje passou R\$\s[\d.,]+ do valor do dia\. A partir de amanhã: R\$\s[\d.,]+ por dia\.$/)
    expect(e.amanha!).toBeGreaterThan(0)
  })
  it('Cobrir com a sobra da Casa (só no exemplo) zera o devendo e o Desfazer volta', async () => {
    em('2026-11-30', 21)
    const desfazer = await apiExemplo.cobrirComCasa!(F, 'env-ana', 517) // C1: era 217 com teto 6.000; E4 (decisão do dono, 13/11, TIME.md): a parcela do tênis de 12/11 no Nubank (fecha 3) cai na fatura de dezembro, não mais em novembro (era 717)
    expect((await ana()).livre).toBe(0)
    expect((await resumo()).envelopes.find(e => e.id === 'env-casa')!.livre).toBe(centavos(2500 - 524.7 - 517))
    await desfazer()
    expect((await ana()).livre).toBe(-517)
    await expect(apiExemplo.cobrirComCasa!(F, 'env-ana', 5000)).rejects.toThrow(/só tem/)
  })
})

describe('R7+G3: semana, ritmo e projeção', () => {
  it('até domingo é maior que o dia e, no domingo, é só o dia', async () => {
    em('2026-11-18')
    const e = await ana()
    expect(e.ate_domingo!).toBeGreaterThan(e.valor_dia!)
    expect(e.gasto_semana_dia).toBe(480 + 610 + 12) // seg 16, ter 17 e o café de hoje
    em('2026-11-22')
    const d = await ana()
    expect(d.ate_domingo).toBe(d.valor_dia)
  })
  it('projeção: R$\u00a04.452 em 18 dias fecha em R$\u00a07.420 de R$\u00a05.500 (passa R$\u00a01.920)', () => {
    // C1 (revisão E0): teto do exemplo 6.000 -> 5.500; passa 1.420 -> 1.920 e deveria 3.600 -> 3.300 (5.500 x 18 / 30)
    expect(projecao(4452, 5500, '2026-11-18')).toEqual({ fecha: 7420, dentro: false, passa: 1920, deveria: 3300 })
    expect(projecao(1500, 5500, '2026-11-10').dentro).toBe(true)
  })
  it('gasto da semana conta de segunda até hoje', () => {
    expect(gastoSemana({ '2026-11-15': 99, '2026-11-16': 10, '2026-11-18': 5, '2026-11-19': 7 }, '2026-11-18')).toBe(15)
  })
})

describe('R10+G5: parcelado 1x a 12x, parcela no mês de cada fatura', () => {
  it('R$\u00a01.200 em 6x: R$\u00a0200 por mês, cada parcela no dia 1 do mês da fatura dela (E4)', () => {
    expect(parcelasDe(1200, 6)).toEqual([200, 200, 200, 200, 200, 200])
    expect(parcelasDe(100, 3)).toEqual([33.34, 33.33, 33.33])
    const l = [{ data: '2026-11-12', valor: 1200, parcelas: 6 }]
    // E4 (decisão do dono, 13/11, TIME.md): a parcela do tênis de 12/11 no Nubank (fecha 3) cai na fatura de dezembro, não mais em novembro. Era: 1ª parcela no dia da compra (porDia de 12/11) e as outras de dezembro a abril.
    const nubank = () => '2026-12'
    expect(gastosDoMes(l, '2026-11', nubank)).toEqual({ porDia: {}, parcelas: 0 })
    expect(gastosDoMes(l, '2026-12', nubank)).toEqual({ porDia: {}, parcelas: 200 })
    expect(gastosDoMes(l, '2027-05', nubank)).toEqual({ porDia: {}, parcelas: 200 })
    expect(gastosDoMes(l, '2027-06', nubank)).toEqual({ porDia: {}, parcelas: 0 })
    // sem o cartão (não deveria existir: o banco recusa), a 1ª fatura é o mês da compra, e mesmo assim fora do ritmo do dia
    expect(gastosDoMes(l, '2026-11')).toEqual({ porDia: {}, parcelas: 200 })
    // à vista no cartão continua no dia da compra
    expect(gastosDoMes([{ data: '2026-11-12', valor: 50 }], '2026-11', nubank)).toEqual({ porDia: { '2026-11-12': 50 }, parcelas: 0 })
  })
  it('no exemplo, lançar 6x no cartão conta R$\u00a0200 no mês e as faturas levam R$\u00a0200 cada', async () => {
    em('2026-11-18')
    const antes = (await ana()).gasto_mes
    const fAntes = await apiExemplo.faturas(F, 8)
    await apiExemplo.lancar({ familia: F, envelope: 'env-ana', valor: 600, data: '2026-11-18', descricao: 'Tênis', cartao: 'car-nu', parcelas: 6, chave: 'k-6x' })
    expect(centavos((await ana()).gasto_mes - antes)).toBe(0) // E4 (decisão do dono, 13/11, TIME.md): a parcela do tênis de 12/11 no Nubank (fecha 3) cai na fatura de dezembro, não mais em novembro: era 100 (a 1ª parcela no dia da compra)
    const fDepois = await apiExemplo.faturas(F, 8)
    const dif = (m: string) => centavos(fDepois.find(f => f.cartao_id === 'car-nu' && f.mes === m)!.total - fAntes.find(f => f.cartao_id === 'car-nu' && f.mes === m)!.total)
    expect(['2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06'].map(dif)).toEqual([100, 100, 100, 100, 100, 100, 0])
  })
  it('em dezembro, a parcela aparece nos lançamentos como "parcela 2 de 6" e já sai do mês', async () => {
    em('2026-12-03')
    await apiExemplo.lancar({ familia: F, envelope: 'env-ana', valor: 1200, data: '2026-12-01', descricao: 'Geladeira', cartao: 'car-nu', parcelas: 6, chave: 'k-dez' })
    vi.setSystemTime(new Date('2027-01-05T10:00:00-03:00'))
    // rodada 2: em dezembro o exemplo traz novembro inteiro, então em janeiro também cai a 3ª parcela do tênis de 12/11
    const l = (await apiExemplo.lancamentos(F, '2027-01')).find(x => x.parcela && x.descricao === 'Geladeira')
    expect(l!.parcela).toMatchObject({ n: 2, de: 6 }); expect(l!.valor).toBe(200)
    expect((await ana()).parcelas_mes).toBe(400)
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
    const r = await apiExemplo.lancar({ familia: F, envelope: 'env-ana', valor: 85, data: '2026-11-18', descricao: 'Farmácia', chave: 'k-85' })
    const g = (await ana()).gasto_mes
    await apiExemplo.corrigirLancamento!(r.lancamento.id, { valor: 58 })
    expect(centavos(g - (await ana()).gasto_mes)).toBe(27)
    await apiExemplo.corrigirLancamento!(r.lancamento.id, { valor: 85 })
    expect((await ana()).gasto_mes).toBe(g)
    await expect(apiExemplo.corrigirLancamento!(r.lancamento.id, { envelope: 'env-bruno' })).rejects.toThrow(/não é seu/)
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
    expect(e.resumo).toMatch(/Ana passou R\$\s517 do combinado do mês/) // C1: era 217 com teto 6.000; E4 (decisão do dono, 13/11, TIME.md): a parcela do tênis de 12/11 no Nubank (fecha 3) cai na fatura de dezembro, não mais em novembro (era 717)
  })
  it('olho fechado: todo valor vira R$\u00a0•••', () => {
    esconderValores(true); expect(reais(1234.5)).toBe('R$\u00a0•••')
    esconderValores(false); expect(reais(1234.5)).toBe('R$\u00a01.234,50')
  })
})
