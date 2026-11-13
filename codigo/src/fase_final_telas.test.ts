// Fase final, etapas E2 e E3 (TELAS, 13/11). Família de EXEMPLO (Ana, Bruno, Bia, Carla, Cláudia), todo número inventado.
// E2: o casal LÊ tudo com o nome do dono e ESCREVE só no seu e na Casa. E3: consertos 1 a 10 da rodada 3 (menos o 7, que vai pra E4).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiExemplo, exemploComo, reiniciarExemplo } from './api/exemplo'
import { aplicacaoMinha, cartaoMeu, escreveNo, mexeNoLancamento, rotuloDono } from './app/dono'
import { comecoDoMes, fraseEstouro, numeroEnvelope, tetoDoMes } from './componentes/EnvelopeCard'
import { todoDia } from './lib/formato'
import type { Envelope, FamiliaMinha } from './api/tipos'

const F = 'fam-silva'
const em = (dia: string, hora = 10) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(`${dia}T${String(hora).padStart(2, '0')}:00:00-03:00`)); reiniciarExemplo() }
afterEach(() => { vi.useRealTimers() })
const tudo = (x: unknown) => JSON.stringify(x)
const env = (x: Partial<Envelope>): Envelope => ({ id: 'e', nome: 'X', regra: 'mensal', limite_mes: 100, gasto_mes: 0, livre: 100, ...x })
const fam = (x: Partial<FamiliaMinha>): FamiliaMinha => ({ id: 'f', nome: 'F', papel: 'casal', membroNome: 'Ana', envelopeId: 'env-ana', membroId: 'm-ana', ...x })

describe('E2: regra do dono na tela (app/dono.ts)', () => {
  it('sem o campo do banco: o casal escreve no seu e na Casa; a filha só no dela; a equipe só na Casa', () => {
    const ana = fam({}), bia = fam({ papel: 'pessoa', envelopeId: 'env-bia' }), carla = fam({ papel: 'equipe', envelopeId: null })
    expect(escreveNo(env({ id: 'env-ana' }), ana)).toBe(true)
    expect(escreveNo(env({ id: 'env-bruno' }), ana)).toBe(false)
    expect(escreveNo(env({ id: 'env-casa', casa: true }), ana)).toBe(true)
    expect(escreveNo(env({ id: 'env-casa', casa: true }), bia)).toBe(false)
    expect(escreveNo(env({ id: 'env-bia' }), bia)).toBe(true)
    expect(escreveNo(env({ id: 'env-casa', casa: true }), carla)).toBe(true)
    // o campo do banco vale mais que a regra da tela
    expect(escreveNo(env({ id: 'env-bruno', escreve: true }), ana)).toBe(true)
    expect(rotuloDono(env({ id: 'env-bruno', nome: 'Bruno', dono: 'Bruno', escreve: false }), ana)).toBe('de Bruno')
    expect(rotuloDono(env({ id: 'env-ana', dono: 'Ana', escreve: true }), ana)).toBe('')
  })
  it('lançamento: só quem lançou mexe, e nunca na linha de parcela', () => {
    const ana = fam({}), meu = env({ id: 'env-ana', escreve: true })
    const l = { id: 'l', envelope_id: 'env-ana', cartao_id: null, valor: 1, data: '2026-11-18', descricao: null, apagado_em: null, criado_em: '' }
    expect(mexeNoLancamento(l, meu, ana)).toBe(true)
    expect(mexeNoLancamento({ ...l, meu: false }, meu, ana)).toBe(false)
    expect(mexeNoLancamento({ ...l, parcela: { n: 2, de: 6, compra: '2026-10-12' } }, meu, ana)).toBe(false)
    expect(mexeNoLancamento(l, env({ id: 'env-bruno', escreve: false }), ana)).toBe(false)
  })
  it('cartão e aplicação: o do outro é só pra ler; sem titular é da família', () => {
    const ana = fam({})
    expect(cartaoMeu({ id: 'c', nome: 'Itaú', dia_fechamento: 1, dia_vencimento: 5, titular_id: 'm-bruno', titular: 'Bruno' }, ana)).toBe(false)
    expect(cartaoMeu({ id: 'c', nome: 'Nubank', dia_fechamento: 1, dia_vencimento: 5, titular_id: 'm-ana', titular: 'Ana' }, ana)).toBe(true)
    expect(cartaoMeu({ id: 'c', nome: 'Da casa', dia_fechamento: 1, dia_vencimento: 5 }, ana)).toBe(true)
    const a = { id: 'g', nome: 'CDB', banco: 'X', tipo: 'cdb' as const, pct_cdi: 100, saldo: 1, rendeu_hoje_liquido: 0, rendeu_mes_liquido: 0, ir_faixa: 0, vence_em: null, liquidez: 'diaria' as const, fgc_ok: true }
    expect(aplicacaoMinha({ ...a, titular: 'm-bruno', titular_nome: 'Bruno' }, ana)).toBe(false)
    expect(aplicacaoMinha({ ...a, titular: null }, ana)).toBe(true)
  })
})

describe('E2 (conserto 1): baixar os dados', () => {
  it('o casal baixa a família inteira com o nome do dono em cada linha', async () => {
    em('2026-11-18'); exemploComo('ana')
    const d = await apiExemplo.exportarFamilia(F) as any
    expect(d.lancamentos.every((l: any) => typeof l.dono_nome === 'string')).toBe(true)
    expect(d.lancamentos.some((l: any) => l.dono_nome === 'Bruno')).toBe(true)
    expect(d.cartoes.map((c: any) => c.dono_nome)).toEqual(['Ana', 'Bruno'])
    expect(d.guardado_aplicacoes.some((a: any) => a.dono_nome === 'Da família')).toBe(true)
  })
  it('a filha baixa só o dela (nada dos pais nem da Casa); o "da família" é recusado pra ela', async () => {
    em('2026-11-18'); exemploComo('filha')
    const d = await apiExemplo.exportarMeu!(F)
    expect(tudo(d)).not.toMatch(/Ana|Bruno|Nubank|Itaú|Casa mensal|Feira semanal/)
    expect((d as any).lancamentos.length).toBeGreaterThan(0)
    await expect(apiExemplo.exportarFamilia(F)).rejects.toThrow(/com o casal/)
  })
})

describe('E3 (conserto 2): virada do mês com 1 número só', () => {
  it('dia 30 às 21h e dia 01 dizem o mesmo começo de dezembro (com a parcela)', async () => {
    em('2026-11-30', 21); exemploComo('ana')
    const e30 = (await apiExemplo.resumoHoje(F)).envelopes.find(e => e.id === 'env-ana')!
    const n30 = numeroEnvelope(e30, 1)
    expect(e30.parcelas_mes_que_vem).toBe(200)
    const frase = fraseEstouro(e30, n30)!
    const comeca30 = /começa com R\$\s([\d.]+(,\d+)?)/.exec(frase)![1]
    em('2026-12-01', 9); exemploComo('ana')
    const e1 = (await apiExemplo.resumoHoje(F)).envelopes.find(e => e.id === 'env-ana')!
    const c1 = comecoDoMes(e1.limite_base ?? e1.limite_mes, e1.falta_mes_anterior || 0, e1.parcelas_mes || 0, 'novembro')
    expect(e1.falta_mes_anterior).toBe(n30.devendo)
    expect(c1.valor.toLocaleString('pt-BR', { minimumFractionDigits: 0 })).toBe(comeca30)
    // o cartão e o topo usam o mesmo teto: gasto + sobra = teto
    expect(Math.round((e1.gasto_mes + e1.livre) * 100) / 100).toBe(tetoDoMes(e1))
  })
  it('a Família Souza também lembra novembro no dia 01', async () => {
    em('2026-12-01', 9); exemploComo('autonoma')
    const e = (await apiExemplo.resumoHoje(F)).envelopes.find(x => x.id === 'env-claudia')!
    expect(e.mes_anterior?.mes).toBe('2026-11')
  })
})

describe('E3 (conserto 3): o placar e o Contador falam o mesmo número', () => {
  it('30/11: quem passou aparece no placar com o gasto; o Contador não diz "sobram"', async () => {
    em('2026-11-30', 21); exemploComo('bruno')
    const r = await apiExemplo.resumoHoje(F)
    const ana = r.placar_casal!.find(x => x.nome === 'Ana')!
    expect(ana.fecha).toBeGreaterThan(ana.limite)
    expect(ana.gasto).toBeGreaterThan(ana.limite)
    const cont = (await apiExemplo.escritorioHoje(F)).entregue.find(x => x.funcionario === 'contador')!
    expect(cont.resumo).toMatch(/Ana passa R\$/)
    expect(cont.resumo).not.toMatch(/sobram/)
  })
})

describe('E3 (conserto 4): "reserva" é só o dinheiro da Casa que nunca se gasta', () => {
  it('o que entra a mais vai "pro guardado"', async () => {
    em('2026-11-18'); exemploComo('bruno')
    const p = (await apiExemplo.escritorioHoje(F)).precisa_de_voce.find(x => x.id.startsWith('entrou_extra:'))!
    const r = await apiExemplo.escritorioResponder(F, p.id, 'guardar_entrada')
    expect(r && r.aviso).toMatch(/foram pro guardado/)
    expect(r && r.aviso).not.toMatch(/reserva/)
  })
})

describe('E3 (conserto 5): o limite do mês também diz quanto saiu hoje', () => {
  it('Bruno (no mês): gasto_hoje vem no envelope', async () => {
    em('2026-11-18'); exemploComo('bruno')
    await apiExemplo.lancar({ familia: F, envelope: 'env-bruno', valor: 87.5, data: '2026-11-18', descricao: 'Almoço', chave: 'k-almoco' })
    const e = (await apiExemplo.resumoHoje(F)).envelopes.find(x => x.id === 'env-bruno')!
    expect(e.gasto_hoje).toBe(87.5)
  })
})

describe('E3 (conserto 9): equipe', () => {
  it('a foto de hoje não apaga o pedido da nota da feira de segunda', async () => {
    em('2026-11-18', 10); exemploComo('equipe')
    const r = await apiExemplo.anotarCompraEquipe!(F, { tipo: 'feira', nome: 'Hortifruti', foto: 'exemplo' })
    expect(r.aviso).toMatch(/nota da feira de 16\/11 ainda falta/)
    expect(r.aviso).not.toMatch(/R\$/)
    const f = (await apiExemplo.feiras(F)).find(x => x.semana === '2026-11-16')!
    expect(f.tem_nota).toBe(false)
  })
})

describe('E3 (conserto 10): miúdos', () => {
  it('"todo sábado", "toda segunda"', () => {
    expect(todoDia(6)).toBe('todo sábado')
    expect(todoDia(0)).toBe('todo domingo')
    expect(todoDia(1)).toBe('toda segunda')
  })
})

// Revisão E2/E3 (C1, C2): o modo real recebe do banco formatos que o exemplo não usa. Formato copiado das migrações
// f_03 (_resumo: dono {membro_id, nome} ou null, escreve) e g/f_08 (guardado: titular_membro, titulares).
import { normalizaResumo } from './api/normaliza'
import { normalizaGuardado } from './api/normaliza2'
describe('revisão E2/E3: o formato real do banco', () => {
  it('C1: dono como objeto vira nome + id; null (Casa, Lazer do casal) fica null; escreve é o do banco', () => {
    const r = normalizaResumo({ envelopes: [
      { id: 'e1', nome: 'Bruno', regra: 'mensal', limite_mes: 4000, gasto_mes: 0, livre: 4000, dono: { membro_id: 'm-b', nome: 'Bruno' }, escreve: false },
      { id: 'e2', nome: 'Lazer do casal', regra: 'mensal', limite_mes: 500, gasto_mes: 0, livre: 500, dono: null, escreve: true },
      { id: 'e3', nome: 'Feira', regra: 'semanal', limite_mes: 2000, gasto_mes: 0, livre: 2000, casa: true, dono: null, escreve: true },
    ] })
    expect(r.envelopes.map(e => [e.dono, e.dono_id, e.escreve])).toEqual([['Bruno', 'm-b', false], [null, null, true], [null, null, true]])
    const ana = { id: 'f', nome: 'F', papel: 'casal' as const, membroNome: 'Ana', envelopeId: 'e0', membroId: 'm-a' }
    expect(rotuloDono(r.envelopes[0], ana)).toBe('de Bruno')
    expect(escreveNo(r.envelopes[1], ana)).toBe(true)
    // banco antigo (sem o campo): continua igual
    expect(normalizaResumo({ envelopes: [{ id: 'x', nome: 'X', regra: 'mensal' }] }).envelopes[0]).not.toHaveProperty('dono')
  })
  it('C2: aplicação com titular_membro (id) e a lista titulares; null = do casal', () => {
    const g = normalizaGuardado({ aplicacoes: [
      { id: 'a1', nome: 'CDB', banco: 'X', tipo: 'cdb', pct_cdi: 100, saldo: 10, titular_membro: 'm-b', titulares: [{ membro_id: 'm-b', nome: 'Bruno' }] },
      { id: 'a2', nome: 'LCA', banco: 'Y', tipo: 'lci_lca', pct_cdi: 92, saldo: 5, titular_membro: null },
      { id: 'a3', nome: 'Velha', banco: 'Z', tipo: 'caixinha', pct_cdi: 100, saldo: 1 },
    ] }, '2026-11-18')
    expect(g.aplicacoes.map(a => [a.titular, a.titular_nome])).toEqual([['m-b', 'Bruno'], [null, null], [undefined, null]])
    const ana = { id: 'f', nome: 'F', papel: 'casal' as const, membroNome: 'Ana', envelopeId: 'e0', membroId: 'm-a' }
    expect(g.aplicacoes.map(a => aplicacaoMinha(a, ana))).toEqual([false, true, true])
  })
})
