import { describe, expect, it } from 'vitest'
import { avaliarInsights, candidatosInsights, ETIQUETA_EXEMPLO } from './motor'
import { apresentarInsight } from './apresentacao'
import { instante, tempoRecife } from './tempo'
import { registrarEvento } from './memoria'
import { esconderValores } from '../formato'
import type { FaturaInsight, SnapshotInsights, TipoInsight } from './tipos'

const agora = '2026-12-30T12:00:00-03:00'
const fatura = (v: Partial<FaturaInsight> = {}): FaturaInsight => ({
  cartaoId: 'c1',
  mes: '2027-01',
  nome: 'NomeSentinelaPrivado',
  vencimento: '2027-01-02',
  total: 987654,
  banco: null,
  paga: false,
  podeInformar: true,
  composicao: [],
  ...v,
})
const base = (v: Partial<SnapshotInsights> = {}): SnapshotInsights => ({
  modo: 'real',
  origem: 'real',
  papel: 'casal',
  ...v,
})
const tem = (s: SnapshotInsights, tipo: TipoInsight, a = agora) => candidatosInsights(s, a).some(i => i.tipo === tipo)
const sFatura = (v: Partial<FaturaInsight> = {}) => base({ faturas: [fatura(v)] })
const controle = () => expect(avaliarInsights(sFatura(), agora)).toHaveLength(1)

describe('regras auditáveis dos oito insights', () => {
  it.each([
    ['hoje', '2026-12-30', false, true],
    ['3 dias / ano novo', '2027-01-02', false, true],
    ['4 dias', '2027-01-03', false, false],
    ['ontem', '2026-12-29', false, false],
    ['paga', '2026-12-30', true, false],
  ] as const)('1: fatura %s', (_caso, vencimento, paga, esperado) => {
    controle()
    expect(tem(sFatura({ vencimento, paga }), 'fatura_vencendo')).toBe(esperado)
    const i = avaliarInsights(sFatura(), agora)[0]
    expect(i.pergunta).toBe('Sua fatura vence em breve. Já pagou?')
    expect(i.opcoes.map(o => o.id)).toContain('paguei_hoje')
    expect(i.acao.tipo).toBe('informar_pagamento')
  })
  it.each([
    [10000, 10000, false],
    [10000, 10001, true],
    [10000, 9999, true],
    [0, 1, true],
    [10000, null, false],
  ])('2: total %s / banco %s', (total, banco, esperado) => {
    expect(tem(sFatura({ total: 10000, banco: 10001 }), 'fatura_divergente')).toBe(true)
    expect(tem(sFatura({ total: total!, banco }), 'fatura_divergente')).toBe(esperado)
  })
  it.each([
    ['2026-12-30', false, true, true],
    ['2027-01-02', false, true, true],
    ['2027-01-03', false, true, false],
    ['2026-12-30', true, true, false],
    ['2026-12-30', false, false, false],
  ] as const)('3: parcelas %s, paga %s, parcela %s', (vencimento, paga, parcela, esperado) => {
    const s = sFatura({
      vencimento,
      paga,
      composicao: [{ id: 'l1', nome: 'Compra privada', centavos: 12345, parcela }],
    })
    expect(tem(sFatura({ composicao: [{ id: 'l1', nome: 'Compra', centavos: 100, parcela: true }] }), 'parcelas')).toBe(
      true,
    )
    expect(tem(s, 'parcelas')).toBe(esperado)
    const i = candidatosInsights(
      sFatura({ composicao: [{ id: 'l', nome: 'Compra', centavos: 1, parcela: true }] }),
      agora,
    ).find(i => i.tipo === 'parcelas')!
    expect(i.opcoes.map(o => o.id)).toEqual(['composicao', 'depois', 'resolvido'])
    expect(i.acao.tipo).toBe('composicao')
    // A cobrança ganha o desempate, mas já oferece a mesma composição em um toque.
    expect(avaliarInsights(s, agora).length).toBeLessThanOrEqual(1)
  })
  it.each([
    [1, 0, true],
    [1, 1, false],
    [0, -1, false],
    [100, -1, true],
    [-1, -2, false],
  ])('4: reserva %s / livre %s', (combinada, livre, esperado) => {
    expect(tem(base({ reserva: { mes: '2026-12', combinada: 1, livre: 0 } }), 'reserva')).toBe(true)
    expect(tem(base({ reserva: { mes: '2026-12', combinada, livre } }), 'reserva')).toBe(esperado)
  })
  it.each([
    ['2026-11', null, false, true],
    ['2026-12', null, false, false],
    ['2027-01', null, false, false],
    ['2026-11', '2026-12', false, false],
    ['2026-11', '2026-10', false, true],
    ['2026-11', null, true, false],
    ['2026-11', 'inválido', false, false],
  ] as const)('5: previsto %s, novo %s, recebido %s', (mesPrevisto, mesNovo, recebido, esperado) => {
    const rec = { id: 'r1', nome: 'Contrato privado', meu: true, recebido, mesPrevisto, mesNovo }
    expect(
      tem(base({ recebimentos: [{ ...rec, mesPrevisto: '2026-11', mesNovo: null, recebido: false }] }), 'recebimento'),
    ).toBe(true)
    expect(tem(base({ recebimentos: [rec] }), 'recebimento')).toBe(esperado)
  })
  it.each([
    ['2026-12-30', true, true],
    ['2027-01-14', true, true],
    ['2027-01-15', true, false],
    ['2026-12-29', true, false],
    ['2026-12-30', false, false],
    [null, true, false],
  ] as const)('6: aplicação vence %s / ativa %s', (vencimento, ativa, esperado) => {
    const a = { id: 'a1', nome: 'Aplicação privada', vencimento, ativa }
    expect(tem(base({ aplicacoes: [{ ...a, vencimento: '2026-12-30', ativa: true }] }), 'aplicacao')).toBe(true)
    expect(tem(base({ aplicacoes: [a] }), 'aplicacao')).toBe(esperado)
  })
  it.each([
    [false, null, true],
    [false, '  ', true],
    [true, null, false],
    [false, 'Feira livre', false],
  ] as const)('7: feira com nota %s / justificativa %s', (temNota, justificativa, esperado) => {
    const f = { id: 'f1', data: '2026-12-29', semana: '2026-12-28', temNota, justificativa }
    expect(tem(base({ feiras: [{ ...f, temNota: false, justificativa: null }] }), 'feira_nota')).toBe(true)
    expect(tem(base({ feiras: [f] }), 'feira_nota')).toBe(esperado)
  })
  it.each([
    [99, 100, true],
    [100, 100, false],
    [101, 100, false],
    [100, null, false],
    [null, 100, false],
  ])('8: projetado %s / necessário %s', (projetado, necessario, esperado) => {
    expect(tem(base({ objetivo: { mes: '2029-01', projetado: 99, necessario: 100 } }), 'objetivo')).toBe(true)
    expect(tem(base({ objetivo: { mes: '2029-01', projetado, necessario } }), 'objetivo')).toBe(esperado)
    expect(
      candidatosInsights(base({ objetivo: { mes: '2029-01', projetado: 99, necessario: 100 } }), agora)[0].pergunta,
    ).not.toMatch(/atrasad|meta pessoal/i)
  })
})

it.each([
  ['2026-12-30T22:59:00-03:00', false],
  ['2026-12-30T22:00:00-03:00', false],
  ['2026-12-30T06:59:00-03:00', false],
  ['2026-12-30T07:00:00-03:00', true],
  ['2026-12-30T21:59:00-03:00', true],
])('silêncio e exceção vence hoje às %s', (hora, esperado) => {
  expect(tem(sFatura({ vencimento: '2026-12-30' }), 'fatura_vencendo', hora)).toBe(true)
  expect(tem(sFatura(), 'fatura_vencendo', hora)).toBe(esperado)
  expect(
    tem(base({ aplicacoes: [{ id: 'a', nome: '', ativa: true, vencimento: '2026-12-30' }] }), 'aplicacao', hora),
  ).toBe(true)
  if (!esperado) expect(tem(sFatura({ vencimento: '2026-12-30', banco: 1 }), 'fatura_divergente', hora)).toBe(false)
})

it('datas independem do fuso do aparelho, incluindo meia-noite, mês, ano e fevereiro', () => {
  controle()
  expect(tempoRecife('2027-01-01T02:59:00Z')?.dia).toBe('2026-12-31')
  expect(tempoRecife('2027-01-01T03:00:00Z')?.dia).toBe('2027-01-01')
  expect(tem(sFatura({ vencimento: '2027-03-03' }), 'fatura_vencendo', '2027-02-28T12:00:00-03:00')).toBe(true)
  expect(tem(sFatura({ vencimento: '2028-03-03' }), 'fatura_vencendo', '2028-02-28T12:00:00-03:00')).toBe(false)
  expect(instante('2026-12-30T12:00:00')).toBeNull()
  expect(avaliarInsights(sFatura(), new Date('inválido'))).toEqual([])
})

it('duas faturas no mesmo dia: desempate estável, dedupe por fatura e período', () => {
  const s = base({ faturas: [fatura({ cartaoId: 'b' }), fatura({ cartaoId: 'a' })] })
  const [p] = avaliarInsights(s, agora)
  expect(p.acao).toMatchObject({ cartaoId: 'a' })
  expect(avaliarInsights({ ...s, faturas: [...s.faturas!].reverse() }, agora)).toEqual([p])
  let m = registrarEvento({}, p.chave, { tipo: 'visto' }, agora)
  const [segunda] = avaliarInsights(s, agora, m)
  expect(segunda.acao).toMatchObject({ cartaoId: 'b' })
  m = registrarEvento(m, segunda.chave, { tipo: 'visto' }, agora)
  expect(avaliarInsights(s, agora, m)).toEqual([])
  expect(avaliarInsights(s, '2026-12-31T12:00:00-03:00', m)).toHaveLength(1)
  const candidatos = candidatosInsights(
    sFatura({ banco: 1, composicao: [{ id: 'x', nome: '', centavos: 1, parcela: true }] }),
    agora,
  )
  expect(candidatos).toHaveLength(3)
  expect(new Set(candidatos.map(i => i.chave)).size).toBe(1)
})

it('vence hoje > em breve > informativo, inclusive entre funcionários', () => {
  const s = base({
    faturas: [
      fatura({ cartaoId: 'a', vencimento: '2027-01-01' }),
      fatura({ cartaoId: 'b', vencimento: '2026-12-30', banco: 1 }),
    ],
  })
  expect(avaliarInsights(s, agora)[0]).toMatchObject({
    prioridade: 0,
    tipo: 'fatura_vencendo',
    acao: { cartaoId: 'b' },
  })
  const p = base({
    reserva: { mes: '2026-12', combinada: 1, livre: 0 },
    recebimentos: [{ id: 'r', nome: '', recebido: false, meu: true, mesPrevisto: '2026-11', mesNovo: null }],
  })
  expect(avaliarInsights(p, agora)).toHaveLength(1)
  expect(avaliarInsights(p, agora)[0].tipo).toBe('reserva')
})

it('depois vale até a hora exata e já resolvido persiste no mesmo assunto', () => {
  const s = sFatura(),
    [p] = avaliarInsights(s, agora)
  expect(p).toBeDefined()
  const ate = Date.parse('2026-12-31T07:00:00-03:00')
  const m = registrarEvento({}, p.chave, { tipo: 'depois', ate }, agora)
  expect(avaliarInsights(s, '2026-12-31T06:59:59-03:00', m)).toEqual([])
  expect(avaliarInsights(s, ate, m)).toHaveLength(1)
  const resolvido = registrarEvento({}, p.chave, { tipo: 'resolvido' }, agora)
  expect(avaliarInsights(s, ate, resolvido)).toEqual([])
  expect(avaliarInsights(sFatura({ mes: '2027-02' }), ate, resolvido)).toHaveLength(1)
})

export function todos(): SnapshotInsights {
  return base({
    faturas: [
      fatura({ banco: 1, composicao: [{ id: 'l', nome: 'NomeSentinelaPrivado', centavos: 987654, parcela: true }] }),
    ],
    reserva: { mes: '2026-12', combinada: 987654, livre: 0 },
    recebimentos: [
      { id: 'r', nome: 'NomeSentinelaPrivado', recebido: false, meu: true, mesPrevisto: '2026-11', mesNovo: null },
    ],
    aplicacoes: [{ id: 'a', nome: 'NomeSentinelaPrivado', ativa: true, vencimento: '2027-01-14' }],
    feiras: [{ id: 'f', semana: '2026-12-28', data: '2026-12-29', temNota: false, justificativa: null }],
    objetivo: { mes: '2029-01', projetado: 1, necessario: 987654 },
  })
}

it('papel equipe só recebe feira sem dinheiro; pessoa não recebe finanças do casal', () => {
  expect(candidatosInsights(todos(), agora)).toHaveLength(8)
  const equipe = avaliarInsights({ ...todos(), papel: 'equipe' }, agora)
  expect(equipe).toHaveLength(1)
  expect(equipe[0]).toMatchObject({ rota: 'casa', tipo: 'feira_nota' })
  expect(JSON.stringify(equipe)).not.toMatch(/987654|NomeSentinelaPrivado|paguei/)
  expect(avaliarInsights({ ...todos(), papel: 'pessoa' }, agora)).toEqual([])
})

it('modo exemplo exige proveniência, etiqueta e não contamina modo real', () => {
  const p = avaliarInsights({ ...sFatura(), modo: 'exemplo', origem: 'exemplo' }, agora)[0]
  expect(p).toMatchObject({ exemplo: true, etiqueta: ETIQUETA_EXEMPLO })
  expect(avaliarInsights({ ...sFatura(), origem: 'exemplo' }, agora)).toEqual([])
  expect(avaliarInsights(sFatura(), agora)[0].etiqueta).toBeUndefined()
})

it('olho fechado em cada um dos oito: texto, contexto, opção e aria-label; fixos legíveis', () => {
  const candidatos = candidatosInsights(todos(), agora)
  expect(candidatos).toHaveLength(8)
  for (const i of candidatos) {
    const aberto = apresentarInsight(i, false),
      fechado = apresentarInsight(i, true)
    const textos: Record<string, string> = {
      'Sua fatura vence em breve. Já pagou?': 'Já pagou a fatura que vence em breve?',
      'A fatura não bate com as compras anotadas. Vamos conferir?':
        'Quer conferir a diferença entre a fatura e as compras anotadas?',
      'Sua aplicação está vencendo. Quer revisar o destino?': 'Quer revisar o destino da aplicação que está vencendo?',
      'O livre ficou abaixo da reserva. Como vamos recompor?':
        'O dinheiro livre ficou abaixo da reserva. Quer revisar o plano?',
      'O plano está abaixo do necessário para o objetivo. Quer revisar aportes ou premissas?':
        'O plano ainda não alcança seu objetivo. Quer revisar quanto pretende guardar?',
      'Revisar aportes ou premissas': 'Revisar quanto guardar',
    }
    expect(aberto.pergunta).toBe(textos[i.pergunta] || i.pergunta)
    expect(fechado.pergunta).toBe(textos[i.pergunta] || i.pergunta)
    const saidas = [
      fechado.pergunta,
      fechado.contexto,
      ...fechado.opcoes.flatMap(o => [o.rotulo, o.rotulo /* mesmo contrato do aria-label */]),
    ]
    expect(saidas.join(' ')).not.toMatch(/NomeSentinelaPrivado|987654|9\.876|876,54/)
    expect(fechado.opcoes.map(o => o.rotulo)).toEqual(
      i.opcoes.map(o => (o.rotulo === 'Abrir composição' ? 'Ver compras desta fatura' : textos[o.rotulo] || o.rotulo)),
    )
  }
  // Não depende da política global do olho: os parâmetros são a única entrada da função pura.
  esconderValores(true)
  try {
    expect(candidatosInsights(todos(), agora)).toEqual(candidatos)
  } finally {
    esconderValores(false)
  }
})

it('propriedade: 2000 snapshots determinísticos, incompletos/corrompidos, nunca lançam e no máximo um por rota', () => {
  controle()
  let seed = 173
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 2 ** 32
  }
  const lixo = [null, undefined, false, '', 123, NaN, Infinity, {}, [], { id: '__proto__' }]
  for (let n = 0; n < 2000; n++) {
    const s = { ...todos() } as any
    for (const k of [
      'modo',
      'origem',
      'papel',
      'faturas',
      'reserva',
      'recebimentos',
      'aplicacoes',
      'feiras',
      'objetivo',
    ]) {
      if (random() < 0.6)
        s[k] =
          random() < 0.5
            ? lixo[Math.floor(random() * lixo.length)]
            : Array.from({ length: 4 }, () => lixo[Math.floor(random() * lixo.length)])
    }
    if (random() < 0.5)
      s.faturas = Array.from({ length: 5 }, (_, i) =>
        fatura({
          cartaoId: String(i),
          total: Math.round(random() * 1e9),
          banco: Math.round(random() * 1e9),
          paga: random() < 0.4,
        }),
      )
    const antes = JSON.stringify(s)
    let r: ReturnType<typeof avaliarInsights> = []
    expect(() => {
      r = avaliarInsights(s, random() < 0.8 ? agora : lixo[Math.floor(random() * lixo.length)])
    }).not.toThrow()
    expect(new Set(r.map(i => i.rota)).size).toBe(r.length)
    expect(JSON.stringify(s)).toBe(antes)
  }
})
