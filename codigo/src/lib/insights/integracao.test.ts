import { describe, expect, it, vi } from 'vitest'
import type { Api, FamiliaMinha, Lancamento } from '../../api/tipos'
import { montarSnapshot, emCentavos, type LeiturasInsights } from './snapshot'
import { avaliarInsights, candidatosInsights } from './motor'
import { lerDadosInsights } from './leitura'
import { criarMemoriaLocal, chaveArmazenamento, lerMemoria, registrarEvento } from './memoria'
import { executarResposta } from './respostas'
import type { Insight, SnapshotInsights } from './tipos'

const agora = '2026-12-30T12:00:00-03:00'
const familia: FamiliaMinha = {
  id: 'familia',
  nome: 'Privada',
  papel: 'casal',
  membroNome: 'Privado',
  membroId: 'eu',
  envelopeId: null,
}
const lanc = (v: Partial<Lancamento> = {}): Lancamento => ({
  id: 'compra',
  cartao_id: 'c',
  data: '2026-11-20',
  envelope_id: 'e',
  parcelas: 3,
  valor: 100.01,
  descricao: 'Compra privada',
  apagado_em: null,
  criado_em: '',
  ...v,
})
const leituras = (): LeiturasInsights => ({
  cartoes: [{ id: 'c', nome: 'Cartão privado', dia_fechamento: 10, dia_vencimento: 5 }],
  faturas: [
    { cartao_id: 'c', cartao: 'Cartão privado', mes: '2027-01', vencimento: '2027-01-02', total: 33.33, fechada: true },
  ],
  banco: [],
  lancamentos: [lanc()],
})
const snap = () => montarSnapshot(familia, 'real', leituras(), agora)
const pergunta = () => avaliarInsights(snap(), agora)[0]
const destinos = () => ({ navegar: vi.fn(), composicao: vi.fn(), nota: vi.fn() })

it.each([
  [0, 0],
  [0.01, 1],
  [1.005, 101],
  [0.29, 29],
  [33.33, 3333],
  [-1.005, -101],
  [NaN, null],
  [Infinity, null],
  [1e18, null],
  [undefined, null],
])('converte na fronteira %s para %s centavos', (entrada, esperado) => {
  expect(emCentavos(0.01)).toBe(1)
  expect(emCentavos(entrada)).toBe(esperado)
})

it('snapshot usa parcelas existentes, inclusive deslocamento de fechamento e virada de ano; não duplica sintéticas', () => {
  const d = leituras()
  d.lancamentos!.push(
    lanc({ id: 'compra#1', valor: 33.35, parcela: { n: 1, de: 3, compra: '2026-11-20' } }),
    lanc(),
    lanc({ id: 'apagada', apagado_em: agora }),
    lanc({ id: 'outro', cartao_id: 'outro' }),
  )
  const s = montarSnapshot(familia, 'real', d, agora)
  expect(s.faturas?.[0].composicao).toEqual([{ id: 'compra', nome: 'Compra privada', centavos: 3335, parcela: true }])
  expect(candidatosInsights(s, agora).map(i => i.tipo)).toContain('parcelas')
  expect(s.faturas?.[0].total).toBe(3333)
})

it('falha de pagamento/cartões não vira cobrança, cartão inativo não alerta e cartão alheio só consulta', () => {
  expect(pergunta()).toBeDefined()
  for (const chave of ['banco', 'cartoes', 'faturas'] as const) {
    const d = leituras()
    delete d[chave]
    expect(avaliarInsights(montarSnapshot(familia, 'real', d, agora), agora)).toEqual([])
  }
  const d = leituras()
  d.cartoes![0].ativo = false
  expect(avaliarInsights(montarSnapshot(familia, 'real', d, agora), agora)).toEqual([])
  d.cartoes![0].ativo = true
  d.cartoes![0].titular_id = 'outro'
  expect(
    avaliarInsights(montarSnapshot(familia, 'real', d, agora), agora)[0].opcoes.some(o => o.id === 'paguei_hoje'),
  ).toBe(false)
})

it('objetivo compara a última projeção financeira, sem somar imóveis e sem converter centavos novamente', () => {
  const s = montarSnapshot(
    familia,
    'real',
    {
      futuro: {
        modo: 'projecao',
        linha: [{ saldo_final: 99 }],
        patrimonio_necessario: 100,
        patrimonio_imoveis: 10000000,
      } as any,
      mesObjetivo: '2029-01',
    },
    agora,
  )
  expect(s.objetivo).toEqual({ mes: '2029-01', projetado: 99, necessario: 100 })
  expect(avaliarInsights(s, agora)[0].tipo).toBe('objetivo')
  const renda = montarSnapshot(
    familia,
    'real',
    { futuro: { modo: 'renda', linha: [], patrimonio_necessario: 100 } as any, mesObjetivo: '2029-01' },
    agora,
  )
  expect(renda.objetivo).toBeUndefined()
})

it('snapshot equipe descarta todo dinheiro mesmo se a API devolver campos a mais', () => {
  expect(pergunta()).toBeDefined()
  const s = montarSnapshot(
    { ...familia, papel: 'equipe' },
    'real',
    {
      ...leituras(),
      feiras: [
        {
          id: 'f',
          semana: '2026-12-28',
          data: '2026-12-29',
          tem_nota: false,
          sem_nota_motivo: null,
          valor: 9876.54,
          loja: 'Segredo',
          feita_por: 'Nome privado',
        },
      ],
    },
    agora,
  )
  expect(Object.keys(s).sort()).toEqual(['feiras', 'modo', 'origem', 'papel'])
  expect(JSON.stringify(s)).not.toMatch(/9876|Segredo|Nome privado|100\.01/)
  expect(avaliarInsights(s, agora)[0].tipo).toBe('feira_nota')
})

it('leitura respeita papel/aba antes de consultar APIs e não empresta dados de outras fontes', async () => {
  expect(pergunta()).toBeDefined()
  const api = {
    modo: 'real',
    feiras: vi.fn(async () => []),
    cartoes: vi.fn(),
    faturas: vi.fn(),
    guardadoHoje: vi.fn(),
    recebimentos: vi.fn(),
  } as unknown as Api
  await lerDadosInsights(api, { ...familia, papel: 'equipe' }, 'cartoes', agora)
  await lerDadosInsights(api, { ...familia, papel: 'equipe' }, 'guardado', agora)
  const r = await lerDadosInsights(api, { ...familia, papel: 'equipe' }, 'casa', agora)
  expect(r.dados).toEqual({ feiras: [] })
  expect(api.feiras).toHaveBeenCalledTimes(1)
  for (const f of [api.cartoes, api.faturas, api.guardadoHoje, api.recebimentos]) expect(f).not.toHaveBeenCalled()
})

it('leitura parcial não vira não pago; histórico real inclui compras antigas sem inventar parcelas', async () => {
  expect(pergunta()).toBeDefined()
  const d = leituras()
  const api = {
    modo: 'real',
    cartoes: async () => d.cartoes,
    faturas: async () => d.faturas,
    faturasBanco: vi.fn(async () => {
      throw new Error('Indisponível')
    }),
    lancamentos: vi.fn(async () => [lanc()]),
  } as unknown as Api
  const falha = await lerDadosInsights(api, familia, 'cartoes', agora)
  expect(falha.erros).toHaveLength(1)
  expect(avaliarInsights(montarSnapshot(familia, 'real', falha.dados, agora), agora)).toEqual([])
  expect(api.lancamentos).not.toHaveBeenCalled()
  api.faturasBanco = async () => []
  const ok = await lerDadosInsights(api, familia, 'cartoes', agora)
  expect(api.lancamentos).toHaveBeenCalledTimes(26)
  expect(api.lancamentos).toHaveBeenCalledWith('familia', '2024-11')
  expect(avaliarInsights(montarSnapshot(familia, 'real', ok.dados, agora), agora)).toHaveLength(1)
})

describe('persistência só de metadados, isolada e tolerante à falha', () => {
  it('adiamento/dedupe/resolvido sobrevivem a remontagem e não contêm snapshot', () => {
    const data = new Map<string, string>()
    const storage = {
      getItem: (k: string) => data.get(k) || null,
      setItem: (k: string, v: string) => {
        data.set(k, v)
      },
    }
    const chave = chaveArmazenamento('real', 'u', 'f')
    const m = criarMemoriaLocal(chave, () => storage),
      p = pergunta()
    m.registrar(p.chave, { tipo: 'depois', ate: Date.parse(agora) + 1000 }, agora)
    expect(criarMemoriaLocal(chave, () => storage).ler()[p.chave].adiadoAte).toBe(Date.parse(agora) + 1000)
    m.registrar(p.chave, { tipo: 'resolvido' }, agora)
    expect(avaliarInsights(snap(), agora, criarMemoriaLocal(chave, () => storage).ler())).toEqual([])
    expect(data.get(chave)).not.toMatch(/Cartão privado|3333|Compra privada/)
    expect(
      new Set(
        ['real:u:f', 'exemplo:u:f', 'real:u2:f', 'real:u:f2'].map(x =>
          chaveArmazenamento(...(x.split(':') as [string, string, string])),
        ),
      ).size,
    ).toBe(4)
    expect(criarMemoriaLocal(chaveArmazenamento('exemplo', 'u', 'f'), () => storage).ler()).toEqual({})
  })
  it('armazenamento bloqueado e JSON corrompido preservam sessão; campos desconhecidos são descartados', () => {
    const m = criarMemoriaLocal('k', () => {
        throw new Error('Sem storage')
      }),
      p = pergunta()
    m.registrar(p.chave, { tipo: 'visto' }, agora)
    expect(m.ler()[p.chave].vistoEm).toBe('2026-12-30')
    expect(lerMemoria('inválido')).toEqual({})
    expect(lerMemoria('{"a":{"resolvido":true,"nome":"Segredo","valor":123,"vistoEm":"2026-02-30"}}')).toEqual({
      a: { resolvido: true },
    })
    expect(registrarEvento({}, 'a', { tipo: 'depois', ate: 0 }, agora)).toEqual({})
  })
  it('duas instâncias preservam resolução/adiamento de outra aba do navegador', () => {
    let dado = '{}'
    const storage = {
      getItem: () => dado,
      setItem: (_k: string, v: string) => {
        dado = v
      },
    }
    const a = criarMemoriaLocal('k', () => storage),
      b = criarMemoriaLocal('k', () => storage),
      p = pergunta()
    a.registrar(p.chave, { tipo: 'visto' }, agora)
    b.registrar(p.chave, { tipo: 'resolvido' }, agora)
    expect(a.ler()[p.chave].resolvido).toBe(true)
    a.registrar('outro', { tipo: 'depois', ate: Date.parse(agora) + 1000 }, agora)
    expect(b.ler().outro.adiadoAte).toBeDefined()
  })
})

describe('ações somente após resposta explícita', () => {
  it.each(['paguei_hoje', 'paguei_data'])('%s usa faturaInformar, nunca pagamento de parcela', async opcao => {
    const api = { modo: 'real', faturaInformar: vi.fn(async () => {}) } as unknown as Api
    const r = await executarResposta(
      api,
      'familia',
      'casal',
      pergunta(),
      opcao,
      { data: '2026-12-29' },
      agora,
      destinos(),
    )
    expect(r).toEqual({ tipo: 'resolvido' })
    expect(api.faturaInformar).toHaveBeenCalledWith('familia', 'c', '2027-01', {
      paga_em: opcao === 'paguei_hoje' ? '2026-12-30' : '2026-12-29',
    })
  })
  it('falha de gravação não produz resolved; data futura não grava', async () => {
    expect(pergunta()).toBeDefined()
    const api = {
      modo: 'real',
      faturaInformar: vi.fn(async () => {
        throw new Error('Offline')
      }),
    } as unknown as Api
    await expect(executarResposta(api, 'f', 'casal', pergunta(), 'paguei_hoje', {}, agora, destinos())).rejects.toThrow(
      'Offline',
    )
    await expect(
      executarResposta(api, 'f', 'casal', pergunta(), 'paguei_data', { data: '2027-01-01' }, agora, destinos()),
    ).rejects.toThrow('até hoje')
    expect(api.faturaInformar).toHaveBeenCalledTimes(1)
  })
  it('parcelas só abrem composição e depois/resolvido não escrevem na API', async () => {
    const p = candidatosInsights(snap(), agora).find(i => i.tipo === 'parcelas')!
    expect(p).toBeDefined()
    const api = { modo: 'real' } as Api,
      d = destinos()
    expect(await executarResposta(api, 'f', 'casal', p, 'composicao', {}, agora, d)).toEqual({ tipo: 'visto' })
    expect(d.composicao).toHaveBeenCalledTimes(1)
    expect(await executarResposta(api, 'f', 'casal', p, 'depois', {}, agora, d)).toEqual({
      tipo: 'depois',
      ate: Date.parse('2026-12-31T07:00:00-03:00'),
    })
    expect(await executarResposta(api, 'f', 'casal', p, 'resolvido', {}, agora, d)).toEqual({ tipo: 'resolvido' })
  })
  it('recebimento confirma valor conhecido em reais na API ou reagenda mês futuro; alheio não muda', async () => {
    const s: SnapshotInsights = {
      modo: 'real',
      origem: 'real',
      papel: 'casal',
      recebimentos: [
        { id: 'r', nome: '', recebido: false, meu: true, mesPrevisto: '2026-11', mesNovo: null, valor: 10001 },
      ],
    }
    const p = avaliarInsights(s, agora)[0],
      api = { modo: 'real', recebimentoMudar: vi.fn(async () => {}) } as unknown as Api
    expect(p).toBeDefined()
    expect(await executarResposta(api, 'f', 'casal', p, 'recebido', { data: '2026-12-29' }, agora, destinos())).toEqual(
      { tipo: 'resolvido' },
    )
    expect(api.recebimentoMudar).toHaveBeenLastCalledWith('f', 'r', {
      recebido_em: '2026-12-29',
      valor_recebido: 100.01,
    })
    await executarResposta(api, 'f', 'casal', p, 'reagendar', { data: '2027-01-01' }, agora, destinos())
    expect(api.recebimentoMudar).toHaveBeenLastCalledWith('f', 'r', { mes_novo: '2027-01' })
    await expect(
      executarResposta(api, 'f', 'casal', p, 'reagendar', { data: '2026-12-31' }, agora, destinos()),
    ).rejects.toThrow('depois')
    expect(
      await executarResposta(
        api,
        'f',
        'casal',
        { ...p, acao: { tipo: 'recebimento', id: 'r', meu: false } },
        'recebido',
        {},
        agora,
        destinos(),
      ),
    ).toBe(false)
  })
  it('nota abre tarefa sem upload automático, justificativa usa feiraSemNota inclusive equipe', async () => {
    const s: SnapshotInsights = {
      modo: 'real',
      origem: 'real',
      papel: 'equipe',
      feiras: [{ id: 'f', semana: '2026-12-28', data: '2026-12-29', temNota: false, justificativa: null }],
    }
    const p = avaliarInsights(s, agora)[0],
      api = { modo: 'real', feiraSemNota: vi.fn(async () => {}) } as unknown as Api,
      d = destinos()
    expect(await executarResposta(api, 'f', 'equipe', p, 'abrir', {}, agora, d)).toEqual({ tipo: 'visto' })
    expect(d.nota).toHaveBeenCalledWith('f')
    expect(api.feiraSemNota).not.toHaveBeenCalled()
    await executarResposta(api, 'f', 'equipe', p, 'sem_nota', { texto: ' Feira livre ' }, agora, d)
    expect(api.feiraSemNota).toHaveBeenCalledWith('f', 'f', 'Feira livre')
  })
  it('valida modo, papel e opção na ação, bloqueia exemplo em API real e finanças para equipe', async () => {
    const p = pergunta(),
      api = { modo: 'real', faturaInformar: vi.fn(async () => {}) } as unknown as Api
    expect(p).toBeDefined()
    for (const [papel, i, opcao] of [
      ['equipe', p, 'paguei_hoje'],
      ['pessoa', p, 'paguei_hoje'],
      ['casal', { ...p, exemplo: true }, 'paguei_hoje'],
      ['casal', p, 'inventada'],
    ] as [string, Insight, string][]) {
      expect(await executarResposta(api, 'f', papel, i, opcao, {}, agora, destinos())).toBe(false)
    }
    expect(api.faturaInformar).not.toHaveBeenCalled()
  })
})
