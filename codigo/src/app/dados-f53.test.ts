import { expect, it, vi } from 'vitest'
import { protegerApi } from '../api/protegida'
import { ErroSessao } from '../api/erros'
import type { Api, EscritorioHoje, FamiliaMinha, Sessao } from '../api/tipos'
import { criarGuardaConfig } from '../lib/seguro'
import { faturasAConferir } from '../lib/resumo/faturas'
import { totaisDoMes } from '../lib/resumo/movimentacao'
import { lerDadosInsights } from '../lib/insights/leitura'
import { definirEscopoLeitura, escopoLeitura } from './invalidacao'
import { lojaEscritorio } from './escritorioCompartilhado'
import { acompanharConferencias } from './useNumerosAtualizados'
import { desfazer } from './desfazer'
import { criarCacheModelos } from '../telas/escritorio/modelosEscritorio'

const familia = { id: 'f', membroId: 'm', papel: 'casal' } as FamiliaMinha
const sessao = (userId: string): Sessao => ({ userId, email: null, dono: false, familias: [familia] })
function adiar<T>() {
  let resolver!: (v: T) => void, rejeitar!: (e: Error) => void
  const promessa = new Promise<T>((r, j) => {
    resolver = r
    rejeitar = j
  })
  return { promessa, resolver, rejeitar }
}
const proteger = (api: Partial<Api>) => protegerApi({ modo: 'real', ...api } as Api)

it('f53.1: mesclagem lê da fonte e encontra edição de outro aparelho', async () => {
  const A = { id: 'A' },
    X = { id: 'X' },
    L = { id: 'L' }
  let remoto = [A]
  const transporte = vi.fn(async () => remoto)
  const api = proteger({
    config: transporte as unknown as Api['config'],
    salvarConfig: async (_f, _chave, dados) => {
      remoto = dados as typeof remoto
    },
  })
  const ler = (opcoes?: { fresco: boolean }) => api.config('f', 'casa_lista', [] as typeof remoto, opcoes)
  const guarda = criarGuardaConfig(ler, v => api.salvarConfig('f', 'casa_lista', v))
  expect(await guarda.carregar()).toEqual({ valor: [A] })
  remoto = [A, X]
  expect(await ler()).toEqual([A])
  expect(await guarda.salvar([A, L])).toEqual({ valor: [A, X, L], mudou: true })
  expect(await ler()).toEqual([A, X, L])
  remoto = [X]
  expect(await ler({ fresco: true })).toEqual([X])
  expect(await ler()).toEqual([X])
})

it('f53.2: confirmação entra no mês efetivo sem repetir a primeira ocorrência paga no registro-base', () => {
  const r = {
    id: 'r',
    valor: 500,
    certo: true,
    mes_previsto: '2026-10',
    recebido_em: '2026-11-01',
    valor_recebido: 480,
  } as Awaited<ReturnType<NonNullable<Api['recebimentos']>>>[number]
  const controle = {
    r: {
      recebidas: {
        '2026-10': { valor: 48000, data: '2026-11-01' },
        '2026-11': { valor: 50550, data: '2026-12-02' },
      },
    },
  }
  expect(totaisDoMes('2026-11', '2026-12-03', [], [r], [], {}, controle).entrou).toBe(480)
  expect(totaisDoMes('2026-12', '2026-12-03', [], [r], [], {}, controle).entrou).toBe(505.5)
  expect(totaisDoMes('2026-12', '2026-12-01', [], [r], [], {}, controle).entrou).toBe(0)
})

it('f53.3: API protege o escopo de sucessos tardios após nova consulta e logout', async () => {
  const antiga = adiar<Sessao>(),
    depois = adiar<Sessao>()
  const api = proteger({
    sessao: vi
      .fn()
      .mockReturnValueOnce(antiga.promessa)
      .mockResolvedValueOnce(sessao('nova'))
      .mockReturnValueOnce(depois.promessa),
    sair: async () => {},
  })
  const a = expect(api.sessao()).rejects.toThrow('substituída')
  await api.sessao()
  antiga.resolver(sessao('antiga'))
  await a
  expect(escopoLeitura(api)?.sessao).toBe('nova')
  const b = expect(api.sessao()).rejects.toThrow('substituída')
  await api.sair()
  depois.resolver(sessao('nova'))
  await b
  expect(escopoLeitura(api)).toBeNull()
})

it('f53.4: ErroSessao tardio do Escritório perde o tipo original e o manipulador antigo', async () => {
  const pendente = adiar<EscritorioHoje>()
  const novo = { precisa_de_voce: [], funcionarios: [], entregue: [], trabalhando: [] } as unknown as EscritorioHoje
  const api = proteger({ escritorioHoje: vi.fn().mockReturnValueOnce(pendente.promessa).mockResolvedValue(novo) })
  definirEscopoLeitura(api, 'antiga', familia)
  const loja = lojaEscritorio(api, 'f'),
    derrubar = vi.fn()
  loja.aoErro(derrubar)
  const leitura = loja.ler(api, 'f')
  const rejeitada = expect(api.escritorioHoje('f')).rejects.not.toBeInstanceOf(ErroSessao)
  await Promise.resolve()
  definirEscopoLeitura(api, 'nova', familia)
  const atual = lojaEscritorio(api, 'f')
  await atual.ler(api, 'f')
  pendente.rejeitar(new ErroSessao())
  await leitura
  await rejeitada
  expect(derrubar).not.toHaveBeenCalled()
  expect(atual.snapshot().estado).toBe('ok')
  expect(escopoLeitura(api)?.sessao).toBe('nova')
})

it('f53.14: Assessor consulta notas pela API protegida e só recebe feiras sanitizadas', async () => {
  const feiras = vi.fn(async () => [
    {
      id: 'feira',
      semana: '2026-11-16',
      data: '2026-11-17',
      valor: 987,
      tem_nota: false,
      loja: null,
      feita_por: null,
      sem_nota_motivo: null,
    },
  ])
  const resumoHoje = vi.fn()
  const api = proteger({ feiras, resumoHoje })
  const equipe = { ...familia, papel: 'equipe' } as const
  definirEscopoLeitura(api, 'equipe', equipe)
  const r = await lerDadosInsights(api, equipe, 'casa', new Date('2026-11-18T12:00:00Z'))
  expect(r.erros).toEqual([])
  expect(feiras).toHaveBeenCalledWith('f', { semValores: true })
  expect(r.dados.feiras?.[0]).toMatchObject({ id: 'feira', tem_nota: false })
  expect(r.dados.feiras?.[0]).not.toHaveProperty('valor')
  await expect(api.resumoHoje('f')).rejects.toThrow('restrita')
  expect(resumoHoje).not.toHaveBeenCalled()
})

it('f53.15: mês sem compras não vira pendência, fatura informada com saldo continua', () => {
  const f = { cartao_id: 'c', cartao: 'Cartão', mes: '2026-11', vencimento: '2026-11-25', total: 0, fechada: false }
  expect(faturasAConferir([f], [], '2026-11-17', '2026-12-17')).toEqual({ lista: [], total: 0 })
  expect(
    faturasAConferir([f], [{ cartao_id: 'c', mes: f.mes, valor_banco: 77, paga_em: null }], '2026-11-17', '2026-12-17')
      .total,
  ).toBe(77)
})

it('f53.17: Casa descarta cache das chaves alteradas após mutação', async () => {
  let dados: Record<string, unknown> = { casa_gas: [1], casa_lista: ['A'] }
  const api = proteger({
    config: (async (_f: string, k: string) => dados[k]) as Api['config'],
    casaMarcar: (async () => {
      dados = { casa_gas: [1, 2], casa_lista: ['B'] }
      return {}
    }) as unknown as Api['casaMarcar'],
  })
  expect(await api.config('f', 'casa_gas', [])).toEqual([1])
  expect(await api.config('f', 'casa_lista', [])).toEqual(['A'])
  await api.casaMarcar('f', 'troquei_gas')
  expect(await api.config('f', 'casa_gas', [])).toEqual([1, 2])
  expect(await api.config('f', 'casa_lista', [])).toEqual(['B'])
})

it('f53.17: conferência pós-imóvel grava uma vez e mantém o inverso do imóvel', async () => {
  let valor = 100
  const gravar = vi.fn(async () => {})
  const salvar = vi.fn(async (_f, _id, dados) => {
    valor = dados.valor
  })
  const imoveis = vi.fn(async () => [{ id: 'i', valor } as any])
  const api = proteger({
    imoveis,
    imovelSalvar: salvar,
    config: (async () => ({})) as Api['config'],
    salvarConfig: gravar,
  })
  definirEscopoLeitura(api, 'teste', familia)
  acompanharConferencias(api, 'f', [])
  acompanharConferencias(api, 'f', [])
  try {
    await api.imovelSalvar!('f', 'i', { valor: 200 } as any)
    expect(salvar).toHaveBeenCalledTimes(1)
    expect(imoveis).toHaveBeenCalledTimes(1)
    expect(gravar).toHaveBeenCalledTimes(1)
    expect(gravar).toHaveBeenCalledWith(
      'f',
      'numeros_atualizados',
      expect.objectContaining({ imoveis: { i: expect.any(String) } }),
    )
    await expect(desfazer.atual!.desfazer()).resolves.toBe(true)
    expect(valor).toBe(100)
  } finally {
    desfazer.limpar()
  }
})

it('f53.20: cancelamento do primeiro parse não apaga bytes já usados pela segunda lease', async () => {
  const primeiro = adiar<any>(),
    comecou = adiar<void>()
  const buscar = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }))
  const modelo = () => ({ traverse() {} })
  const decodificar = vi
    .fn(async () => modelo())
    .mockImplementationOnce(() => {
      comecou.resolver()
      return primeiro.promessa
    })
  const cache = criarCacheModelos(buscar, decodificar, '/')
  const a = cache.adquirir(['mesa'], new AbortController().signal)
  await comecou.promessa
  a.liberar()
  const b = cache.adquirir(['mesa'], new AbortController().signal)
  expect(await b.pronto).not.toBeNull()
  primeiro.resolver(modelo())
  expect(await a.pronto).toBeNull()
  b.liberar()
  const c = cache.adquirir(['mesa'], new AbortController().signal)
  expect(await c.pronto).not.toBeNull()
  expect(buscar).toHaveBeenCalledTimes(1)
  c.liberar()
})
