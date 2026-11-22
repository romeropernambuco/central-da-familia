// O guia da viagem (pedido do dono, 22/11/2026): a viagem item por item, com as estimativas pesquisadas.
import { describe, expect, it } from 'vitest'
import { avisosDoGuia, guiaPadrao, lerGuia, somarGuia, vezes } from './guiaViagem'
import { salariosAteAVirada, donosComSalario } from './futuroSalario'

describe('o guia da viagem', () => {
  const lisboa = guiaPadrao({
    perfil: 'europa',
    temporada: 'baixa',
    adultos: 2,
    criancas: 2,
    bebes: 0,
    noites: 7,
    hospedagem: 'airbnb',
  })

  it('monta os itens da Europa com seguro, ETIAS, taxa de turismo e o Airbnb com limpeza e serviço', () => {
    const ids = lisboa.itens.map(i => i.id)
    expect(ids).toEqual(
      expect.arrayContaining(['aviao', 'hospedagem', 'taxas_airbnb', 'seguro', 'documentos', 'comida', 'taxa_turismo']),
    )
    expect(lisboa.itens.find(i => i.id === 'aviao')!.valor).toBe(5320)
    expect(lisboa.imprevisto_pct).toBe(15)
    expect(lisboa.itens.every(i => !i.cotado)).toBe(true)
  })

  it('conta pessoas, noites e dias: criança a 70% na comida, taxa de turismo só adultos e no máximo 7 noites', () => {
    expect(vezes({ id: 'aviao', conta: 'pessoa' }, lisboa)).toBe(4)
    expect(vezes({ id: 'comida', conta: 'pessoa_dia' }, lisboa)).toBeCloseTo(3.4 * 8, 5)
    expect(vezes({ id: 'taxa_turismo', conta: 'adulto_noite' }, { ...lisboa, noites: 10 })).toBe(14)
    expect(vezes({ id: 'aviao', conta: 'pessoa' }, { ...lisboa, bebes: 1 })).toBe(4.1)
  })

  it('soma: o pago antes vira o pacote, o gasto lá + moeda + imprevisto vira o cofrinho', () => {
    const s = somarGuia(lisboa)
    expect(s.total).toBeCloseTo(s.antes + s.la + s.moeda + s.imprevisto, 1)
    expect(s.pacote + s.custosLa).toBeCloseTo(s.total, 1)
    expect(s.moeda).toBeGreaterThan(0)
    const nacional = somarGuia(guiaPadrao({ ...lisboa, perfil: 'nacional', hospedagem: 'hotel' }))
    expect(nacional.moeda).toBe(0)
  })

  it('antecipa: janela da passagem, IOF, seguro obrigatório na Europa e o que ainda é estimativa', () => {
    const a = avisosDoGuia(lisboa, '2027-11', '2026-11').join(' ')
    expect(a).toContain('Ponha um alerta de preço')
    expect(a).toContain('IOF de 3,5%')
    expect(a).toContain('30 mil euros')
    expect(a).toContain('ainda são estimativa')
    expect(avisosDoGuia({ ...lisboa, temporada: 'alta' }, '2027-07', '2027-05').join(' ')).toContain('Alta temporada')
  })

  it('o guia guardado volta igual; o estragado não passa', () => {
    expect(lerGuia(JSON.parse(JSON.stringify(lisboa)))).toEqual(lisboa)
    expect(lerGuia({ perfil: 'marte', itens: [] })).toBeNull()
  })
})

describe('o salário de Rendas no plano (simulação de 22/11)', () => {
  const rendas = [
    { id: 'a', nome: 'Salário', valor: 9000, tipo: 'salario', dono: 'Ana' },
    { id: 'b', nome: 'Salário', valor: 9000, tipo: 'salario', dono: 'Bruno' },
    { id: 'c', nome: 'Bicos', valor: 3000, tipo: 'variavel', dono: 'Bruno' },
  ]
  it('quem cadastrou o próprio salário em Recebimentos não conta 2 vezes, mas o do outro continua', () => {
    const donos = donosComSalario([{ id: 'r1', dono_nome: 'Ana' }], { r1: { origem: 'salario' } })
    const s = salariosAteAVirada(rendas, '2026-11', '2027-01', donos)
    expect(new Set(s.map(x => x.dono))).toEqual(new Set(['Bruno']))
  })
  it('renda que muda sem o mês fraco conta pelo valor (antes valia zero)', () => {
    const s = salariosAteAVirada(rendas, '2026-11', '2027-01')
    expect(s.find(x => x.id.startsWith('renda:c@'))!.valor).toBe(300000)
  })
})
