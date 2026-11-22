// Simulação de 22/11/2026: a Marina, R$ 5 mil de salário, R$ 100 mil num CDB a 110% do CDI e um apartamento de
// R$ 500 mil alugado por R$ 2.500, usando o app do zero (?como=nova). Cada teste guarda um conserto que saiu dela.
import { describe, expect, it } from 'vitest'
import { rendeNoMesEstimado } from './guardado'
import { montarSnapshot } from './insights/snapshot'
import { lerAtalho } from './atalho'
import { limiteSemNome } from '../app/useNomeNoLimite'
import { ultimosOQueFoi } from '../componentes/UltimosOQueFoi'
import type { FamiliaMinha, GuardadoAplicacao, ImovelTela } from '../api/tipos'

const casal: FamiliaMinha = {
  id: 'f1',
  nome: 'Família Lima',
  papel: 'casal',
  membroNome: 'Marina',
  envelopeId: 'env-p1',
  membroId: 'm-marina',
}
const apto = (v: Partial<ImovelTela> = {}): ImovelTela =>
  ({
    id: 'im1',
    dono_membro: 'm-marina',
    dono_nome: 'Marina',
    meu: true,
    apelido: 'Apartamento',
    valor: 500000,
    uso: 'aluga',
    aluguel: 2500,
    custos: 0,
    vacancia: '0',
    tem_contrato: true,
    contrato_ate: '2027-11',
    venda_valor: null,
    venda_mes: null,
    venda_contrato: false,
    ...v,
  }) as ImovelTela

describe('Guardado: quanto rende por mês', () => {
  const cdb = (v: Partial<GuardadoAplicacao> = {}) =>
    ({ id: 'a1', saldo: 100000, pct_cdi: 110, ir_faixa: 22.5, ...v }) as GuardadoAplicacao
  it('R$ 100 mil a 110% do CDI de 13,65% rendem perto de R$ 914 por mês, já sem o imposto', () => {
    const v = rendeNoMesEstimado({ cdi_usado: { data: '2026-11-10', pct_ano: 13.65, fonte: 'x' }, aplicacoes: [cdb()] })
    expect(v).toBeGreaterThan(900)
    expect(v).toBeLessThan(930)
  })
  it('sem imposto (LCI) rende mais; sem aplicação ou sem taxa, zero', () => {
    const cdi = { data: '2026-11-10', pct_ano: 13.65, fonte: 'x' }
    expect(rendeNoMesEstimado({ cdi_usado: cdi, aplicacoes: [cdb({ ir_faixa: 0 })] })).toBeGreaterThan(
      rendeNoMesEstimado({ cdi_usado: cdi, aplicacoes: [cdb()] }),
    )
    expect(rendeNoMesEstimado({ cdi_usado: cdi, aplicacoes: [] })).toBe(0)
    expect(rendeNoMesEstimado({ cdi_usado: { ...cdi, pct_ano: 0 }, aplicacoes: [cdb()] })).toBe(0)
  })
})

describe('Escritório: o aluguel que passou do dia chega ao Ajudante dos Imóveis', () => {
  const agora = '2026-11-22T10:00:00-03:00'
  const snap = (aluguel: unknown, imoveis = [apto()]) =>
    montarSnapshot(casal, 'exemplo', { imoveis, aluguel }, agora).alugueis
  it('caderno aberto e o aluguel do mês sem chegar depois do dia combinado: atrasado', () => {
    expect(snap({ im1: { dia_vencimento: 10, recebimentos: [], despesas: [], desde: '2026-11' } })).toEqual([
      { id: 'im1', nome: 'Apartamento', mes: '2026-11', dias: 12 },
    ])
  })
  it('imóvel recém-cadastrado (caderno nunca aberto), aluguel que chegou ou imóvel que não aluga: nada', () => {
    expect(snap({})).toEqual([])
    expect(
      snap({
        im1: { dia_vencimento: 10, recebimentos: [{ mes: '2026-11', data: '2026-11-09', valor: 2500 }], despesas: [] },
      }),
    ).toEqual([])
    expect(
      snap({ im1: { dia_vencimento: 10, recebimentos: [], despesas: [], desde: '2026-11' } }, [apto({ uso: 'mora' })]),
    ).toEqual([])
  })
  it('sem a leitura do caderno, não inventa atraso', () => {
    expect(montarSnapshot(casal, 'exemplo', { imoveis: [apto()] }, agora).alugueis).toBeUndefined()
  })
})

describe('Família de 3 (casal e filha) e Anotar mais rápido', () => {
  it('limite "Pessoa N" é o que o banco cria para os adultos; o resto tem nome', () => {
    expect(limiteSemNome('Pessoa 1')).toBe(true)
    expect(limiteSemNome('Pessoa 2')).toBe(true)
    expect(limiteSemNome('Caio')).toBe(false)
    expect(limiteSemNome('Limite de Lia')).toBe(false)
    expect(limiteSemNome('Pessoa 2 extra')).toBe(false)
  })
  it('últimos "O que foi?": do mais novo, sem repetir (acento e caixa), sem apagado nem vazio, até 6', () => {
    const l = (descricao: string | null, criado_em: string, apagado_em: string | null = null) => ({
      descricao,
      criado_em,
      apagado_em,
    })
    expect(
      ultimosOQueFoi([
        l('Padaria', '2026-11-01T10:00'),
        l('Farmácia', '2026-11-03T10:00'),
        l('farmacia', '2026-11-02T10:00'),
        l('Uber', '2026-11-04T10:00', '2026-11-05'),
        l('', '2026-11-05T10:00'),
        l(null, '2026-11-06T10:00'),
        l('Café', '2026-11-07T10:00'),
      ]),
    ).toEqual(['Café', 'Farmácia', 'Padaria'])
    expect(ultimosOQueFoi(Array.from({ length: 9 }, (_, i) => l('G' + i, `2026-11-0${i + 1}`))).length).toBe(6)
  })
})

describe('Atalho "Anotar" do ícone do app', () => {
  it('#/lancar sem nada não traz valor, loja, cartão nem erro (o app abre o Anotar limpo)', () => {
    expect(lerAtalho('#/lancar')).toEqual({})
    expect(lerAtalho('#/lancar?valor=12,50&loja=Padaria')).toEqual({ valor: 12.5, loja: 'Padaria' })
  })
})
