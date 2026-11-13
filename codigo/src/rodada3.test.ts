// Rodada 3 (CONTRATO2 seção C e CONTRATO3): contas do Guardado, formatações, Escritório que guarda as respostas,
// falas no padrão das 4 partes e faxina de termos. O último teste escreve escritorio2/FALAS.md.
import { afterEach, describe, expect, it, vi } from 'vitest'
// @ts-ignore: o projeto não traz os tipos do Node; o Vitest roda em Node
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
const join = (...p: string[]) => p.join('/')
const __dirname = 'src'
import { apiExemplo, exemploComoEquipe, reiniciarExemplo } from './api/exemplo'
import { normalizaCartao, normalizaCusto, normalizaEscritorio, normalizaFeira, normalizaGuardado, normalizaRelatorio, chaveSimples, idFuncNoBanco } from './api/normaliza2'
import { CDI_DIA_PADRAO, barras30, calcularGuardado, cdiAnoDoDia, cdiDiaDoAno, custoDoGasto, demoraTexto, diaUtil, diasUteisEntre, exemploVazio, faixaIR, fraseDoDia, iofPct, liquido, motivoSemRender, pct, proximoDiaUtil, rendeEmDias, rendeNoDia, rendeQuanto, type AplicacaoBase } from './lib/guardado'
import { centavos, hojeRecife } from './lib/formato'
import { rotaPermitida } from './app/rotas'
import { FAZ } from './telas/escritorio/Ficha'
import type { EscritorioHoje, PerguntaEsc } from './api/tipos'

const F = 'fam-silva'
/** Só o relógio é de mentira (os temporizadores do exemplo continuam de verdade). Hora de Recife. */
const em = (dia: string, hora = 10) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(`${dia}T${String(hora).padStart(2, '0')}:00:00-03:00`)); reiniciarExemplo() }
const avanca = (dia: string, hora = 10) => vi.setSystemTime(new Date(`${dia}T${String(hora).padStart(2, '0')}:00:00-03:00`))
afterEach(() => { vi.useRealTimers(); reiniciarExemplo() })
const r2 = (v: number) => Math.round(v * 100) / 100

describe('Guardado: contas conferidas do contrato', () => {
  it('R$\u00a010.000 a 105% do CDI de 13,65% ao ano: R$\u00a05,33 no 1º dia útil e R$\u00a0112,59 em 21 dias úteis', () => {
    const dia = cdiDiaDoAno(13.65)
    expect(r2(rendeNoDia(10000, dia, 105))).toBe(5.33)
    expect(r2(rendeEmDias(10000, dia, 105, 21))).toBe(112.59)
  })
  it('R$\u00a050.000 a 110% com CDI de 0,050788% ao dia: R$\u00a027,93 antes do imposto e R$\u00a022,35 na faixa de 20%', () => {
    const b = rendeNoDia(50000, 0.00050788, 110)
    expect(r2(b)).toBe(27.93)
    expect(r2(liquido(b, 20))).toBe(22.35)
  })
  it('taxa do dia e do ano são a mesma taxa (ida e volta)', () => {
    expect(r2(cdiAnoDoDia(CDI_DIA_PADRAO))).toBe(13.65)
    expect(cdiDiaDoAno(13.65)).toBeCloseTo(0.00050788, 7)
  })
  it('imposto cai com o tempo guardado e o IOF some em 30 dias', () => {
    expect([1, 180, 181, 360, 361, 720, 721].map(faixaIR)).toEqual([22.5, 22.5, 20, 20, 17.5, 17.5, 15])
    expect([1, 15, 29, 30, 45].map(iofPct)).toEqual([96, 50, 3, 0, 0])
  })
  it('dia útil, sábado, domingo e feriado', () => {
    expect(diaUtil('2026-11-12')).toBe(true)   // quinta
    expect(diaUtil('2026-11-14')).toBe(false)  // sábado
    expect(diaUtil('2026-11-15')).toBe(false)  // domingo
    expect(diaUtil('2026-11-20')).toBe(false)  // Consciência Negra
    expect(proximoDiaUtil('2026-11-13')).toBe('2026-11-16')
    expect(diasUteisEntre('2026-11-12', '2026-11-30')).toBe(11)
  })
  it('explica por que hoje rendeu 0', () => {
    expect(motivoSemRender('2026-11-12')).toBeNull()
    expect(motivoSemRender('2026-11-14')).toBe('Hoje é sábado: rende de novo na segunda, 16/11.')
    expect(motivoSemRender('2026-11-15')).toBe('Hoje é domingo: rende de novo amanhã, 16/11.')
    expect(motivoSemRender('2026-11-20')).toBe('Hoje é feriado (Consciência Negra): rende de novo na segunda, 23/11.')
  })
  const apps: AplicacaoBase[] = [{ id: 'a', nome: 'Caixinha', banco: 'Banco', tipo: 'caixinha', pct_cdi: 100, liquidez: 'diaria', vence_em: null, movimentos: [{ data: '2026-11-02', tipo: 'aporte', valor: 10000 }] }]
  const cdi = { dia: CDI_DIA_PADRAO, data: '2026-11-10', fonte: 'teste' }
  it('dia útil rende e sábado rende 0, com o motivo', () => {
    const qui = calcularGuardado(apps, '2026-11-12', cdi)
    expect(qui.rendeu_hoje_bruto).toBeGreaterThan(5)
    // menos de 30 dias guardado: ainda tem IOF, então o que sobra hoje é menor
    expect(qui.rendeu_hoje_liquido).toBeGreaterThan(0)
    expect(qui.rendeu_hoje_liquido).toBeLessThan(qui.rendeu_hoje_bruto)
    expect(qui.motivo_zero).toBeNull()
    expect(qui.explicacao[qui.explicacao.length - 1]).toEqual({ linha: 'Rendeu hoje, já sem o imposto', valor: qui.rendeu_hoje_liquido })
    const sab = calcularGuardado(apps, '2026-11-14', cdi)
    expect(sab.rendeu_hoje_liquido).toBe(0)
    expect(sab.motivo_zero).toBe('Hoje é sábado: rende de novo na segunda, 16/11.')
    expect(sab.total).toBeGreaterThan(qui.total) // a sexta rendeu
    expect(sab.rendeu_mes_liquido).toBeGreaterThan(qui.rendeu_mes_liquido)
  })
  it('30 barras, fim de semana vazio, soma do mês bate com os dias', () => {
    const g = calcularGuardado(apps, '2026-11-12', cdi)
    expect(g.por_dia_30).toHaveLength(30)
    const b = barras30(g.por_dia_30)
    expect(b.filter(x => !x.util).every(x => x.altura === 0 && x.liquido === 0)).toBe(true)
    expect(Math.max(...b.map(x => x.altura))).toBe(100)
    const soma = centavos(g.por_dia_30.filter(d => d.data.startsWith('2026-11')).reduce((s, d) => s + d.liquido, 0))
    expect(Math.abs(soma - g.rendeu_mes_liquido)).toBeLessThanOrEqual(0.05)
  })
  it('guardar mais e tirar mudam o saldo; tirar sai do dinheiro mais antigo', () => {
    const m: AplicacaoBase[] = [{ ...apps[0], movimentos: [...apps[0].movimentos, { data: '2026-11-05', tipo: 'aporte', valor: 5000 }, { data: '2026-11-09', tipo: 'resgate', valor: 4000 }] }]
    const g = calcularGuardado(m, '2026-11-12', cdi)
    expect(g.total).toBeGreaterThan(11000); expect(g.total).toBeLessThan(11080)
  })
  it('LCA não paga imposto: o que rendeu é o que entra', () => {
    const g = calcularGuardado([{ ...apps[0], tipo: 'lci_lca', movimentos: [{ data: '2026-06-01', tipo: 'aporte', valor: 10000 }] }], '2026-11-12', cdi)
    expect(g.rendeu_hoje_liquido).toBe(g.rendeu_hoje_bruto)
    expect(g.aplicacoes[0].ir_faixa).toBe(0)
  })
  it('custo do gasto e exemplo do estado vazio', () => {
    const c = custoDoGasto(1000, '2026-11-12', CDI_DIA_PADRAO, 100)
    expect(c.ate_fim_do_mes).toBeGreaterThan(3); expect(c.ate_fim_do_mes).toBeLessThan(6)
    expect(c.em_12_meses).toBeGreaterThan(100); expect(c.em_12_meses).toBeLessThan(125)
    const e = exemploVazio()
    expect(e.porDia).toBe(3.94); expect(e.porMes).toBeGreaterThan(80); expect(e.porMes).toBeLessThan(90)
  })
})

describe('formatações', () => {
  it('percentual, frase do dia, demora e nome simples', () => {
    expect(pct(13.65)).toBe('13,65%'); expect(pct(0.050788, 6)).toBe('0,050788%')
    expect(rendeQuanto({ tipo: 'cdb', pct_cdi: 110 }, true)).toBe('110% da taxa dos bancos')
    expect(rendeQuanto({ tipo: 'cdb', pct_cdi: 102.5 })).toBe('102,5% do CDI (a taxa dos bancos)')
    expect(rendeQuanto({ tipo: 'poupanca', pct_cdi: 0 })).toBe('regra da poupança')
    expect([0, 1, 3].map(fraseDoDia)).toEqual(['Nada precisa de você', '1 coisa precisa de você', '3 coisas precisam de você'])
    expect([null, 0.5, 12, 90, 3000].map(demoraTexto)).toEqual(['sem resposta ainda', 'menos de 1 min', '12 min', '2 h', '2 dias'])
    expect(chaveSimples('Cartões')).toBe('cartoes'); expect(chaveSimples('Guardião da Reserva')).toBe('guardiao_da_reserva')
  })
  it('o Guardado é só do casal', () => {
    expect(rotaPermitida('guardado', 'casal')).toBe('guardado')
    expect(rotaPermitida('guardado', 'pessoa')).toBe('inicio')
    expect(rotaPermitida('guardado', 'equipe')).toBe('casa')
  })
  it('respostas do banco com campo faltando não quebram a tela', () => {
    const g = normalizaGuardado({ total: '100', aplicacoes: [{ id: 1, nome: 'X', tipo: 'coisa' }] }, '2026-11-14')
    expect(g.aplicacoes[0].tipo).toBe('caixinha'); expect(g.por_dia_30).toEqual([]); expect(g.motivo_zero).toBe('Hoje é sábado: rende de novo na segunda, 16/11.')
    expect(normalizaGuardado({ rendeu_hoje_liquido: 0, aplicacoes: [{ id: 1 }], motivo_zero: 'hoje é sábado: rende de novo na segunda' }).motivo_zero).toBe('Hoje é sábado: rende de novo na segunda')
    expect(normalizaCusto({ ate_fim_do_mes: '4.2' })).toEqual({ ate_fim_do_mes: 4.2, em_12_meses: 0 })
    expect(normalizaRelatorio(null)).toEqual({ funcionarios: [], diario: [] })
    expect(normalizaCartao({ id: 1, nome: 'N', dia_fecha: 3, dia_vence: 10 })).toMatchObject({ dia_fechamento: 3, dia_vencimento: 10, ativo: true })
    expect(normalizaFeira({ id: 1, semana: 's', data: 'd', nota_caminho: 'x', lancamentos: { valor: 50 } }, true)).not.toHaveProperty('valor')
    // equipe: mesmo que o banco mande valor e entregas, nada de dinheiro fica na memória
    const e = normalizaEscritorio({ precisa_de_voce: [{ id: 'p', funcionario: 'fiscal', pergunta: 'x', valor: 99, opcoes: [{ id: 'a', rotulo: 'A', abre: 'nota', pede: 'coisa' }] }], entregue: [{ funcionario: 'x', resumo: 'R$\u00a010' }], funcionarios: [{ id: 'fiscal', nome: 'Fiscal', sala: 'Casa', estado: 'x', cadastro_resumo: 'R$\u00a01' }] }, true)
    expect(e.precisa_de_voce[0]).not.toHaveProperty('valor'); expect(e.entregue).toEqual([]); expect(e.funcionarios[0].estado).toBe('vai_comecar'); expect(e.funcionarios[0]).not.toHaveProperty('cadastro_resumo')
    expect(e.precisa_de_voce[0].opcoes[0]).toEqual({ id: 'a', rotulo: 'A', abre: 'nota' })
  })
})

describe('formato do BANCO2.md (modo real)', () => {
  it('funcionário com nome comprido vira o curto; fala, partes, abre e pede2 passam; diário com data e hora prontas', () => {
    const e = normalizaEscritorio({ precisa_de_voce: [{ id: 'fatura:c:2026-11', funcionario: 'analista_cartao', curta: 'Fatura do Nubank', pergunta: 'Ana, a fatura...', contexto: 'Faltam 3 dias.', partes: { vi: 'a', importa: 'b', sugiro: 'c' }, valor: 1062, dias_esperando: 2, opcoes: [{ id: 'foi_feita', rotulo: 'Foi feita', pede: 'valor', pede2: 'data' }, { id: 'lancar', rotulo: 'Anotar agora', abre: 'lancar' }] }],
      entregue: [{ funcionario: 'gestor_guardado', resumo: 'x', numero: 1 }],
      funcionarios: [{ id: 'guardiao_colchao', nome: 'Guardião da Reserva', sala: 'Caixa', estado: 'entregue', frase: 'A reserva está inteira.', faz: ['1', '2', '3'], cadastro_resumo: { titulo: 'A reserva', itens: [] }, ultimas_respostas: [{ id: 'd', data: '01/01', hora: '10:05', pergunta_curta: 'Reserva', resposta: 'Já repus', por: 'Ana', anotado: 'anotado às 10:05' }] }] })
    expect(e.precisa_de_voce[0]).toMatchObject({ funcionario: 'cartao', assunto: 'Fatura do Nubank', espera_dias: 2, valor: 1062, partes: { vi: 'a' } })
    expect(e.precisa_de_voce[0].opcoes).toEqual([{ id: 'foi_feita', rotulo: 'Foi feita', pede: 'valor', pede2: 'data' }, { id: 'lancar', rotulo: 'Anotar agora', abre: 'lancar' }])
    expect(e.entregue[0].funcionario).toBe('guardado')
    expect(e.funcionarios[0]).toMatchObject({ id: 'colchao', faz: ['1', '2', '3'], cadastro_resumo: 'A reserva' })
    expect(e.funcionarios[0].ultimas_respostas![0]).toMatchObject({ assunto: 'Reserva', resposta: 'Já repus', respondido_por: 'Ana', quando_txt: '01/01, 10:05' })
    expect(idFuncNoBanco('fiscal')).toBe('fiscal_feira'); expect(idFuncNoBanco('contador')).toBe('contador')
  })
  it('custo do gasto vem em objeto; relatório por id; conta do Guardado sem sigla sozinha', () => {
    expect(normalizaCusto({ tem_guardado: true, ate_fim_do_mes: { dias_uteis: 12, bruto: 2.6, liquido: 2.09 }, em_12_meses: { liquido: 42.77 } })).toEqual({ ate_fim_do_mes: 2.09, em_12_meses: 42.77 })
    expect(normalizaCusto({ tem_guardado: false })).toEqual({ ate_fim_do_mes: 0, em_12_meses: 0 })
    const r = normalizaRelatorio({ funcionarios: [{ id: 'fiscal_feira', nome: 'Fiscal da Feira', perguntas: 3, respondidas: 2, pendentes: 1, tempo_medio_min: 40 }], linha_do_tempo: [{ id: 'x', funcionario: 'fiscal_feira', quando: '2026-11-12T13:00:00Z', pergunta_curta: 'Nota', resposta: 'Anexei', por: 'Ana' }] })
    expect(r.funcionarios[0]).toMatchObject({ funcionario: 'fiscal', pendentes: 1 }); expect(r.diario[0]).toMatchObject({ funcionario: 'fiscal', assunto: 'Nota' })
    const g = normalizaGuardado({ aviso: 'hoje é sábado: rende de novo na segunda', aplicacoes: [{ id: 'a' }], explicacao: [{ linha: 'Caixinha: R$\u00a010.326,07 × taxa do dia × 100% do CDI', valor: 5.24 }, { linha: 'IOF dos primeiros dias', valor: -1 }] })
    expect(g.explicacao.map(x => x.linha)).toEqual(['Caixinha: R$\u00a010.326,07 × taxa do dia × 100% da taxa dos bancos', 'imposto de quem tira antes de 30 dias dos primeiros dias'])
    expect(g.motivo_zero).toBe('Hoje é sábado: rende de novo na segunda')
    expect(normalizaCartao({ id: 'c', apelido: 'Nubank do Bruno', dia_fechamento: 8, dia_vencimento: 15, titular_nome: 'Bruno', limite: '5000', taxa_valor: 480, taxa_periodo: 'ano', taxa_mes: 12 })).toMatchObject({ nome: 'Nubank do Bruno', dia_fechamento: 8, titular: 'Bruno', titular_id: null, limite: 5000, taxa_periodo: 'ano' })
  })
})

describe('Guardado no exemplo: dia útil e sábado', () => {
  it('quinta rende; sábado rende 0 e diz por quê', async () => {
    em('2026-11-12')
    const qui = await apiExemplo.guardadoHoje(F)
    // R3: Ana vê as 3 no nome dela e a do casal (a do Bruno não)
    expect(qui.aplicacoes).toHaveLength(4); expect(qui.rendeu_hoje_liquido).toBeGreaterThan(10); expect(qui.motivo_zero).toBeNull()
    expect(centavos(qui.aplicacoes.reduce((s, a) => s + a.rendeu_hoje_liquido, 0))).toBeCloseTo(qui.rendeu_hoje_liquido, 1)
    em('2026-11-14')
    const sab = await apiExemplo.guardadoHoje(F)
    expect(sab.rendeu_hoje_liquido).toBe(0); expect(sab.motivo_zero).toMatch(/^Hoje é sábado: rende de novo na segunda/)
  })
  it('guardar com a mesma chave do toque não grava 2 vezes; tirar mais do que tem é recusado', async () => {
    em('2026-11-12')
    const antes = (await apiExemplo.guardadoHoje(F)).total
    await apiExemplo.guardadoMovimentar('g1', 'aporte', 500, '2026-11-12', 'chave-1')
    await apiExemplo.guardadoMovimentar('g1', 'aporte', 500, '2026-11-12', 'chave-1')
    expect(centavos((await apiExemplo.guardadoHoje(F)).total - antes)).toBe(500)
    await expect(apiExemplo.guardadoMovimentar('g1', 'resgate', 999999, '2026-11-12', 'chave-2')).rejects.toThrow(/Só tem/)
    await apiExemplo.guardadoCriar(F, { nome: 'Caixinha Inter', banco: 'Inter', tipo: 'caixinha', pct_cdi: 100, valor_inicial: 1000, data: '2026-11-12' })
    expect((await apiExemplo.guardadoHoje(F)).aplicacoes).toHaveLength(5)
    expect((await apiExemplo.guardadoCustoDoGasto(F, 200)).ate_fim_do_mes).toBeGreaterThan(0.5)
  })
  it('a equipe não recebe o Guardado nem os lembretes', async () => {
    em('2026-11-12'); exemploComoEquipe()
    await expect(apiExemplo.guardadoHoje(F)).rejects.toThrow(/Só o casal/)
    await expect(apiExemplo.lembretes(F)).rejects.toThrow(/Só o casal/)
  })
})

const fila = async () => (await apiExemplo.escritorioHoje(F)).precisa_de_voce
const doFunc = async (id: string) => (await apiExemplo.escritorioHoje(F)).funcionarios.find(f => f.id === id)!

describe('Escritório: a resposta fica guardada com o funcionário certo', () => {
  it('são 8 funcionários, com o Fiscal da Feira na sala Casa e o Guardião da Reserva', async () => {
    em('2026-11-12')
    const e = await apiExemplo.escritorioHoje(F)
    expect(e.funcionarios.map(f => f.id)).toEqual(['contador', 'colchao', 'cartao', 'folha', 'comprador', 'fiscal', 'guardado', 'secretaria'])
    expect(e.funcionarios.find(f => f.id === 'colchao')!.nome).toBe('Guardião da Reserva')
    expect(e.funcionarios.find(f => f.id === 'fiscal')).toMatchObject({ nome: 'Fiscal da Feira', sala: 'Casa' })
    expect(Object.keys(FAZ).sort()).toEqual(e.funcionarios.map(f => f.id).sort())
    for (const f of e.funcionarios) { expect(FAZ[f.id]).toHaveLength(3); expect(f.cadastro_resumo).toBeTruthy(); expect(f.ultimas_respostas).toBeDefined() }
  })
  // cada tipo de pergunta: [dia, hora, começo do id, opção, dados, funcionário, pedaço da resposta guardada]
  const CASOS: [string, number, string, string, Record<string, unknown>, string, RegExp][] = [
    ['2026-11-12', 10, 'feira_nota:', 'sem_nota', { texto: 'feira livre' }, 'fiscal', /Não teve nota: feira livre/],
    ['2026-11-12', 10, 'feira_nota:', 'anexar_nota', { caminho: 'fam-silva/fe1.jpg' }, 'fiscal', /Anexei a nota/],
    ['2026-11-16', 19, 'feira_feita:', 'foi_feita', { data: '2026-11-16', valor: 298.5 }, 'fiscal', /Foi feita, dia 16\/11, R\$\s298,50/],
    ['2026-11-12', 10, 'lembrete:lb1', 'feito', {}, 'secretaria', /Já fiz/],
    ['2026-11-12', 10, 'lembrete:lb1', 'adiar_para', { data: '2026-11-20' }, 'secretaria', /Me lembra outro dia, dia 20\/11/],
    ['2026-11-12', 10, 'vence:g2', 'renovar', {}, 'guardado', /Vou renovar/],
    ['2026-11-12', 10, 'reserva_parada:', 'deixar_na_conta', {}, 'guardado', /Deixar na conta/],
    ['2026-11-12', 10, 'anuidade:car-nu', 'lembrar_isencao', {}, 'cartao', /Me lembra dia 01\/12/],
    ['2026-11-07', 10, 'fatura:car-nu', 'paguei_outro_dia', { data: '2026-11-06' }, 'cartao', /Paguei outro dia, dia 06\/11/],
    ['2026-11-05', 10, 'dae:', 'paguei_guia', {}, 'folha', /Paguei a guia/],
    ['2026-11-05', 10, 'salario:f1', 'paguei_hoje', {}, 'folha', /Paguei hoje/],
    ['2026-11-12', 18, 'prestador_veio:p2', 'veio', {}, 'comprador', /Veio hoje/],
    ['2026-11-13', 10, 'prestador_vespera:p1', 'ja_mandei', {}, 'comprador', /Já mandei/],
    ['2026-11-01', 10, 'conferir_saldo:', 'saldo_conferido', { valor: 43000 }, 'guardado', /Dizer quanto aparece no banco, R\$\s43\.000\. Diferença de/],
    // R15: o fechamento do mês só fala quando a sobra renderia R$\u00a020 ou mais por mês (o exemplo rende uns R$\u00a04): testado em melhorias.test.ts
    ['2026-11-12', 21, 'lancou:', 'hoje_nao_gastei', {}, 'contador', /Hoje não gastei/],
  ]
  for (const [dia, hora, comeco, opcao, dados, func, resposta] of CASOS) {
    it(`${func}: ${comeco} ${opcao} some da fila e aparece em "O que você já me respondeu"`, async () => {
      em(dia, hora)
      // 12/11 às 21h: tira o gasto de hoje pra o Contador ter o que perguntar
      if (comeco === 'lancou:') { for (const l of await apiExemplo.lancamentos(F, dia.slice(0, 7))) if (l.data === dia) await apiExemplo.apagarLancamento(l.id) }
      const p = (await fila()).find(x => x.id.startsWith(comeco))
      expect(p, `não achei a pergunta ${comeco} em ${dia}`).toBeTruthy()
      expect(p!.funcionario).toBe(func)
      await apiExemplo.escritorioResponder(F, p!.id, opcao, dados)
      expect((await fila()).find(x => x.id === p!.id)).toBeUndefined()
      const f = await doFunc(func)
      expect(f.ultimas_respostas![0].resposta).toMatch(resposta)
      expect(f.ultimas_respostas![0].respondido_por).toBe('Ana')
      expect(hojeRecife(new Date(f.ultimas_respostas![0].quando))).toBe(dia)
      // e no Relatório
      const rel = await apiExemplo.escritorioRelatorio(F, dia, dia)
      expect(rel.diario[0].resposta).toMatch(resposta)
      expect(rel.funcionarios.find(x => x.funcionario === func)!.respondidas).toBeGreaterThanOrEqual(1)
      // o diário inteiro do funcionário ("ver tudo") também traz
      expect((await apiExemplo.escritorioDiario(F, func, 100))[0].resposta).toMatch(resposta)
    })
  }
  it('Guardião da Reserva: pergunta quando o livre do mês fica menor que a reserva, e guarda de onde o dinheiro volta', async () => {
    em('2026-11-12')
    for (const id of ['env-ana', 'env-bruno', 'env-feira', 'env-casa']) await apiExemplo.definirLimite(F, id, 700)
    const p = (await fila()).find(x => x.id.startsWith('colchao:'))!
    expect(p.pergunta).toMatch(/^Ana, a reserva da família \(o dinheiro que vocês combinaram nunca gastar\) está em R\$\s/)
    await apiExemplo.escritorioResponder(F, p.id, 'repor', { texto: 'com o aluguel, dia 15' })
    expect((await doFunc('colchao')).ultimas_respostas![0].resposta).toBe('Dizer de onde volta e quando: com o aluguel, dia 15')
  })
  it('respondida 2 vezes é recusada; resposta que pede dado sem o dado é recusada', async () => {
    em('2026-11-12')
    await apiExemplo.escritorioResponder(F, 'lembrete:lb1', 'feito')
    await expect(apiExemplo.escritorioResponder(F, 'lembrete:lb1', 'feito')).rejects.toThrow(/já foi respondida/)
    const nota = (await fila()).find(x => x.id.startsWith('feira_nota:'))!
    await expect(apiExemplo.escritorioResponder(F, nota.id, 'sem_nota', {})).rejects.toThrow(/Escreva/)
  })
  it('adiar volta na hora certa, com outra frase e lembrando a resposta anterior', async () => {
    em('2026-11-07') // sábado: a fatura do Nubank vence dia 10, faltam 3 dias
    const p1 = (await fila()).find(x => x.id.startsWith('fatura:car-nu'))!
    expect(p1.pergunta).toMatch(/^Ana, a fatura do Nubank está em R\$\s.* e vence terça, 10\/11\. Faltam 3 dias\. Já pagou\?$/)
    await apiExemplo.escritorioResponder(F, p1.id, 'ainda_nao')
    expect((await fila()).find(x => x.id === p1.id)).toBeUndefined()
    avanca('2026-11-07', 23); expect((await fila()).find(x => x.id === p1.id)).toBeUndefined()
    avanca('2026-11-09', 8)
    const p2 = (await fila()).find(x => x.id === p1.id)!
    expect(p2.pergunta).toMatch(/^Ana, Dia 07\/11 você me respondeu "Ainda não paguei"\. a fatura do Nubank .* vence amanhã e você ainda não me disse se pagou\.$/)
    expect(p2.contexto).toMatch(/juros e multa/)
    expect(p2.espera_dias).toBe(2)
    avanca('2026-11-12', 8)
    const p3 = (await fila()).find(x => x.id === p1.id)!
    expect(p3.pergunta).toMatch(/venceu há 2 dias e continua sem resposta/)
    expect(new Set([p1.pergunta, p2.pergunta, p3.pergunta]).size).toBe(3)
    // pagou: o app já sabe, não pergunta mais
    await apiExemplo.faturaInformar(F, 'car-nu', p1.id.split(':')[2], { paga_em: '2026-11-12' })
    expect((await fila()).find(x => x.id === p1.id)).toBeUndefined()
  })
  it('corrigir guarda a resposta antiga, grava uma linha nova e passa a valer a nova', async () => {
    em('2026-11-12')
    const volta = await apiExemplo.escritorioResponder(F, 'reserva_parada:2026-11', 'deixar_na_conta')
    expect((volta as { diario_id?: string }).diario_id).toBeTruthy() // é com esse id que o app liga a linha à pergunta
    const d = (await doFunc('guardado')).ultimas_respostas![0]
    // corrigir = responder de novo a mesma pergunta (igual ao banco)
    await apiExemplo.escritorioResponder(F, d.ref!, 'lembrar_dia_15', { corrige: true })
    const depois = (await doFunc('guardado')).ultimas_respostas!
    expect(depois[0].resposta).toBe('Me lembra dia 15 (corrigiu "Deixar na conta")')
    expect(depois[1].resposta).toBe('Deixar na conta')
    expect((await fila()).some(x => x.id === 'reserva_parada:2026-11')).toBe(false)
    avanca('2026-11-15', 8)
    expect((await fila()).some(x => x.id === 'reserva_parada:2026-11')).toBe(true)
  })
  it('lembrete: criar em 3 campos, a Secretária cobra na hora, repete e apagar some', async () => {
    em('2026-11-12')
    await apiExemplo.lembreteCriar(F, { titulo: 'Ligar pro contador', quando: '2026-11-13T12:00:00.000Z', repetir: 'mes' })
    expect((await apiExemplo.lembretes(F)).map(l => l.titulo)).toContain('Ligar pro contador')
    expect((await fila()).some(p => /ligar pro contador/.test(p.pergunta))).toBe(false)
    avanca('2026-11-13', 10)
    const p = (await fila()).find(x => /ligar pro contador/.test(x.pergunta))!
    expect(p.pergunta).toBe('Ana, você me pediu pra lembrar hoje: ligar pro contador. Já fez?')
    await apiExemplo.escritorioResponder(F, p.id, 'feito')
    const l = (await apiExemplo.lembretes(F)).find(x => x.titulo === 'Ligar pro contador')!
    expect(l.quando.slice(0, 10)).toBe('2026-12-13')
    await apiExemplo.lembreteApagar(F, l.id)
    expect((await apiExemplo.lembretes(F)).some(x => x.titulo === 'Ligar pro contador')).toBe(false)
    await expect(apiExemplo.lembreteCriar(F, { titulo: ' ', quando: '2026-11-13T12:00:00.000Z', repetir: 'nunca' })).rejects.toThrow(/Escreva/)
  })
  it('Analista de Cartão: cadastra cartão com anuidade, informa o valor do banco e pergunta da diferença', async () => {
    em('2026-11-12')
    expect(await apiExemplo.membros(F)).toEqual([{ id: 'm-ana', nome: 'Ana' }, { id: 'm-bruno', nome: 'Bruno' }])
    // rodada 2 (A3): cada um do casal vê só os cartões dele. O cartão do Bruno cadastrado pela Ana não aparece pra ela.
    await apiExemplo.cartaoSalvar(F, { nome: 'Inter do Bruno', banco: 'Inter', titular_id: 'm-bruno', dia_fechamento: 2, dia_vencimento: 9 })
    expect((await apiExemplo.cartoes(F)).find(c => c.nome === 'Inter do Bruno')).toBeUndefined()
    await apiExemplo.cartaoSalvar(F, { nome: 'Inter da Ana', banco: 'Inter', titular_id: 'm-ana', dia_vencimento: 15, taxa_valor: 19.9, taxa_periodo: 'mes' })
    expect((await apiExemplo.cartoes(F)).find(c => c.nome === 'Inter da Ana')).toMatchObject({ titular_id: 'm-ana', titular: 'Ana' })
    expect((await fila()).find(p => p.id.startsWith('cartao_sem_dia:'))!.pergunta).toBe('Ana, o cartão Inter da Ana está sem o dia em que a fatura fecha.')
    await expect(apiExemplo.cartaoSalvar(F, { nome: 'X', final4: '12' })).rejects.toThrow(/4 últimos/)
    const fat = (await apiExemplo.faturas(F, 3)).find(f => f.total > 0)!
    await apiExemplo.faturaInformar(F, fat.cartao_id, fat.mes, { valor_banco: fat.total + 172 })
    const dif = (await fila()).find(p => p.id.startsWith('fatura_dif:'))!
    expect(dif.contexto).toMatch(/^Tem R\$\s172 que não foi anotado aqui\./)
    expect(dif.opcoes.map(o => o.rotulo)).toEqual(['Anotar agora', 'É juros ou tarifa do banco', 'Vejo depois'])
    expect((await apiExemplo.faturasBanco(F))[0]).toMatchObject({ valor_banco: centavos(fat.total + 172), paga_em: null })
  })
  it('Fiscal da Feira: cobra 1 coisa por vez, na ordem: feita, nota, estoque. Com tudo em dia, só mostra o que fez', async () => {
    em('2026-11-16', 12) // segunda antes das 18h: ainda não pergunta
    expect((await fila()).some(p => p.funcionario === 'fiscal')).toBe(false)
    avanca('2026-11-16', 19)
    let f = (await fila()).filter(p => p.funcionario === 'fiscal')
    expect(f).toHaveLength(1); expect(f[0].pergunta).toBe('Ana, a feira desta semana ainda não apareceu aqui. Foi feita?')
    expect(f[0].opcoes.map(o => o.rotulo)).toEqual(['Foi feita', 'Ainda não foi feita', 'Esta semana não vai ter'])
    const antes = (await apiExemplo.lancamentos(F, '2026-11')).length
    await apiExemplo.escritorioResponder(F, f[0].id, 'foi_feita', { data: '2026-11-16', valor: 1080 })
    expect((await apiExemplo.lancamentos(F, '2026-11')).length).toBe(antes + 1) // virou gasto no limite da Feira
    f = (await fila()).filter(p => p.funcionario === 'fiscal')
    expect(f).toHaveLength(1); expect(f[0].pergunta).toBe('Ana, a feira de 16/11 (R$\u00a01.080) está sem a nota.')
    await apiExemplo.escritorioResponder(F, f[0].id, 'anexar_nota', { caminho: await apiExemplo.notaSubir(F, f[0].id.split(':')[1], 'exemplo') })
    f = (await fila()).filter(p => p.funcionario === 'fiscal')
    expect(f).toHaveLength(1); expect(f[0].pergunta).toBe('Ana, a contagem do estoque desta semana ainda não foi feita.')
    const itens = (await apiExemplo.estoque(F)).itens.map((i, k) => ({ item_id: i.id, estado: (k < 3 ? 'acabou' : 'tem') as 'acabou' | 'tem' }))
    await apiExemplo.escritorioResponder(F, f[0].id, 'contar', { itens })
    expect((await fila()).some(p => p.funcionario === 'fiscal')).toBe(false)
    const e = await apiExemplo.escritorioHoje(F)
    expect(e.entregue.find(x => x.funcionario === 'fiscal')!.resumo).toMatch(/^Feira de 16\/11 feita, R\$\s1\.080 de R\$\s.* da semana\. Nota anexada\. Estoque contado: acabaram 3 itens\./)
    expect(e.funcionarios.find(x => x.id === 'fiscal')!.ultimas_respostas!.map(d => d.resposta).slice(0, 3)).toEqual(['Contei o estoque: 8 itens, 3 acabaram', 'Anexei a nota', 'Foi feita, dia 16/11, R$\u00a01.080'])
    expect((await apiExemplo.feiras(F))[0]).toMatchObject({ data: '2026-11-16', valor: 1080, tem_nota: true })
  })
  it('equipe da casa: só perguntas da Casa, sem nenhum valor em dinheiro, e a resposta dela vale', async () => {
    em('2026-11-16', 19); exemploComoEquipe()
    const e = await apiExemplo.escritorioHoje(F)
    expect(e.funcionarios.map(f => f.id)).toEqual(['comprador', 'fiscal'])
    expect(e.entregue).toEqual([])
    expect(JSON.stringify(e)).not.toMatch(/R\$|"valor"/)
    const p = e.precisa_de_voce.find(x => x.funcionario === 'fiscal')!
    expect(p.pergunta).toBe('Carla, a feira desta semana ainda não apareceu aqui. Foi feita?')
    expect(p.opcoes.map(o => [o.rotulo, o.pede])).toEqual([['Foi feita', 'data'], ['Ainda não foi feita', undefined]])
    await apiExemplo.escritorioResponder(F, p.id, 'foi_feita', { data: '2026-11-16' })
    const depois = await apiExemplo.escritorioHoje(F)
    expect(depois.precisa_de_voce.find(x => x.funcionario === 'fiscal')!.opcoes[0]).toMatchObject({ rotulo: 'Anexar a nota agora', abre: 'nota' })
    expect(JSON.stringify(depois)).not.toMatch(/R\$|"valor"/)
    expect(JSON.stringify(await apiExemplo.feiras(F))).not.toMatch(/"valor"/)
    expect(await apiExemplo.escritorioDiario(F, 'fiscal', 10)).toEqual([])
    expect((await apiExemplo.escritorioRelatorio(F, '2026-11-01', '2026-11-30')).diario).toEqual([])
  })
})

/* ---------- conferência das falas (CONTRATO3, item 6.1) ---------- */
const PROIBIDO: [string, RegExp][] = [
  ['colchão', /colch[ãa]o/i], ['envelope', /envelope/i], ['liquidez', /liquidez/i], ['CDI', /\bCDI\b(?! \()/], ['IR', /\bIR\b/], ['IOF', /\bIOF\b/], ['FGC', /\bFGC\b/], ['DAE', /\bDAE\b/], ['eSocial', /eSocial/i],
  ['líquido', /l[íi]quid[oa]/i], ['bruto', /\bbrut[oa]/i], ['regressivo', /regressiv/i], ['fatura fechada', /fatura fechada/i], ['saldo livre', /saldo livre/i], ['PEPS', /\bPEPS\b/], ['aporte', /aporte/i], ['resgate', /resgat/i],
  ['travessão', /[—–]/], ['exclamação', /!/], ['tom de sistema', /Pendência|Lembrete:|Prezad|Olá|digite aqui/i],
]
const termoRuim = (t: string) => PROIBIDO.filter(([, r]) => r.test(t)).map(([n]) => n)
const SECO = /^(sim|não|nao|ok)$/i

describe('falas dos funcionários: 4 partes, sem termo difícil, botão com verbo', () => {
  it('percorre o exemplo em 6 datas, confere cada frase e escreve escritorio2/FALAS.md', async () => {
    const linhas: string[] = [], pend: string[] = []
    let nPerg = 0, nOutras = 0
    const registra = (data: string, e: EscritorioHoje, nome: string) => {
      linhas.push(`\n### ${data}\n`, `Início e Escritório: **${fraseDoDia(e.precisa_de_voce.length)}**\n`, '| Funcionário | O que eu vi | Por que importa | O que eu sugiro | Botões | 4 partes | Termo sem explicação |', '|---|---|---|---|---|---|---|')
      const ver = (p: PerguntaEsc) => {
        nPerg++
        const partes = p.partes, bot = p.opcoes.map(o => o.rotulo)
        const tem4 = !!partes && [partes.vi, partes.importa, partes.sugiro].every(x => x.trim().length > 8) && bot.length >= 2 && bot.every(b => !SECO.test(b.trim()))
        const ruim = termoRuim([p.pergunta, p.contexto, ...bot].join(' '))
        if (!p.pergunta.startsWith(nome + ', ')) pend.push(`${data} ${p.id}: não chama a pessoa pelo nome`)
        if (!tem4) pend.push(`${data} ${p.id}: faltou parte`)
        if (ruim.length) pend.push(`${data} ${p.id}: ${ruim.join(', ')}`)
        if (p.pergunta !== `${partes?.vi}` || p.contexto !== `${partes?.importa} ${partes?.sugiro}`) pend.push(`${data} ${p.id}: a fala da tela não é a soma das partes`)
        linhas.push(`| ${e.funcionarios.find(f => f.id === p.funcionario)?.nome} | ${partes?.vi} | ${partes?.importa} | ${partes?.sugiro} | ${bot.join(' / ')} | ${tem4 ? 'sim' : 'NÃO'} | ${ruim.join(', ') || 'nenhum'} |`)
      }
      e.precisa_de_voce.forEach(ver)
      linhas.push('', 'Quem não tem pergunta mostra 1 linha do que fez (e não inventa assunto):', '')
      for (const f of e.funcionarios.filter(x => x.estado !== 'precisa_de_voce')) {
        nOutras++
        const ruim = termoRuim(f.frase)
        if (ruim.length) pend.push(`${data} ${f.id} (o que fez): ${ruim.join(', ')}`)
        if (f.frase.trim().length < 12) pend.push(`${data} ${f.id}: sem frase`)
        linhas.push(`- **${f.nome}**: ${f.frase}${ruim.length ? ` (TERMO: ${ruim.join(', ')})` : ''}`)
      }
    }
    // 1. quinta comum
    em('2026-11-12', 10); registra('Quinta, 12/11, 10h (dia comum)', await apiExemplo.escritorioHoje(F), 'Ana')
    // 2. o mesmo dia às 21h, sem gasto anotado, e a reserva furada
    for (const l of await apiExemplo.lancamentos(F, '2026-11')) if (l.data === '2026-11-12') await apiExemplo.apagarLancamento(l.id)
    for (const id of ['env-ana', 'env-bruno', 'env-feira', 'env-casa']) await apiExemplo.definirLimite(F, id, 700)
    avanca('2026-11-12', 21); registra('Quinta, 12/11, 21h (sem gasto anotado e com a reserva abaixo do combinado)', await apiExemplo.escritorioHoje(F), 'Ana')
    // 3. 2ª cobrança: 2 dias depois, lembrando o que foi respondido
    for (const p of (await fila()).filter(x => x.opcoes.some(o => o.id === 'ainda_nao'))) await apiExemplo.escritorioResponder(F, p.id, 'ainda_nao')
    await apiExemplo.escritorioResponder(F, 'lembrete:lb1', 'adiar_1_dia')
    avanca('2026-11-14', 10); registra('Sábado, 14/11, 10h (2ª cobrança, 2 dias depois de responder "ainda não")', await apiExemplo.escritorioHoje(F), 'Ana')
    // 4. 3ª cobrança: mais 4 dias sem resposta
    avanca('2026-11-18', 10); registra('Quarta, 18/11, 10h (3ª cobrança, 6 dias esperando)', await apiExemplo.escritorioHoje(F), 'Ana')
    // 5. dia 1: fecha o mês, confere o Guardado, guia do governo
    em('2026-11-01', 9); registra('Domingo, 01/11, 9h (virada do mês)', await apiExemplo.escritorioHoje(F), 'Ana')
    // 6. dia 5: salário, fatura que vence hoje; e segunda 16/11 às 19h com a feira por fazer
    em('2026-11-05', 18); registra('Quinta, 05/11, 18h (dia do salário, fatura vencendo, prestador)', await apiExemplo.escritorioHoje(F), 'Ana')
    em('2026-11-16', 19); registra('Segunda, 16/11, 19h (feira da semana ainda não registrada)', await apiExemplo.escritorioHoje(F), 'Ana')
    exemploComoEquipe(); registra('Segunda, 16/11, 19h, equipe da casa (Carla): só a Casa, sem valor', await apiExemplo.escritorioHoje(F), 'Carla')
    // o que cada um faz e quando (parte 4 da ficha)
    linhas.push('\n### Ficha: "O que eu faço e quando"\n')
    for (const [id, tres] of Object.entries(FAZ)) { const ruim = termoRuim(tres.join(' ')); if (ruim.length) pend.push(`ficha ${id}: ${ruim.join(', ')}`); linhas.push(`- **${id}**: ${tres.join(' ')}`) }

    const topo = ['# Falas do Escritório (gerado pelo teste `src/rodada3.test.ts`)', '',
      'Todas as frases que aparecem no Escritório, nas fichas e no Início, no modo exemplo (Família Silva), em 6 datas simuladas e mais a visão da equipe.',
      'Cada fala é conferida pelo teste: começa pelo 1º nome, tem as 4 partes (o que eu vi, por que importa, o que eu sugiro, botões com verbo), não usa termo da lista sem explicar, não tem travessão, exclamação nem tom de sistema.', '',
      `**Resultado: ${nPerg} perguntas e ${nOutras} linhas de "o que eu fiz" conferidas. Pendências: ${pend.length}.**`, ...pend.map(p => `- PENDENTE: ${p}`)]
    const destino = join(__dirname, '..', '..', 'escritorio2')
    if (existsSync(destino)) writeFileSync(join(destino, 'FALAS.md'), [...topo, ...linhas].join('\n') + '\n')
    expect(pend).toEqual([])
    expect(nPerg).toBeGreaterThanOrEqual(25)
  })
})

describe('faxina de termos no código das telas', () => {
  const arquivos = (dir: string): string[] => readdirSync(dir).flatMap((n: string) => { const p = join(dir, n); return statSync(p).isDirectory() ? arquivos(p) : /\.tsx$/.test(n) ? [p] : [] })
  it('nenhum texto de tela diz "colchão", "jardim" ou "flor"', () => {
    const achados: string[] = []
    for (const a of arquivos(join(__dirname))) {
      const semComentario = readFileSync(a, 'utf8').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      for (const m of semComentario.matchAll(/colchão|Colchão|jardim|Jardim|\bflor(es)?\b|Flower|Sprout/g)) achados.push(`${a}: ${m[0]}`)
    }
    expect(achados).toEqual([])
  })
  it('o estilo não tem degradê nem vidro, e a cena 3D só entra por import dinâmico', () => {
    const css = readFileSync(join(__dirname, 'estilo.css'), 'utf8')
    expect(css).not.toMatch(/gradient\(|backdrop-filter|\.jardim|\.jd\b/)
    const cena = readFileSync(join(__dirname, 'telas/escritorio/Cena3D.tsx'), 'utf8')
    expect(cena).toMatch(/import\('\.\/tres'\)/); expect(cena).toMatch(/import\('\.\/cena3d'\)/)
    for (const a of arquivos(join(__dirname))) expect(readFileSync(a, 'utf8'), a).not.toMatch(/from 'three'|from '\.\/tres'|from '\.\/cena3d'/)
  })
})
