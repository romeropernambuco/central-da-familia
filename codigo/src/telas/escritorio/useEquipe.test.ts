import { beforeEach, expect, it, vi } from 'vitest'
const h = vi.hoisted(() => ({
  estados: [] as unknown[],
  indice: 0,
  efeito: 0,
  efeitos: [] as { deps: unknown[]; limpar?: () => void }[],
  pendentes: [] as (() => void)[],
  app: {} as any,
}))
vi.mock('../../app/contexto', () => ({ useApp: () => h.app }))
vi.mock('react', () => ({
  useState: (inicial: unknown) => {
    const i = h.indice++
    if (!(i in h.estados)) h.estados[i] = inicial
    return [
      h.estados[i],
      (v: unknown) => {
        h.estados[i] = v
      },
    ]
  },
  useEffect: (executar: () => (() => void) | undefined, deps: unknown[]) => {
    const i = h.efeito++,
      antigo = h.efeitos[i]
    if (!antigo || deps.some((d, j) => !Object.is(d, antigo.deps[j]))) {
      h.pendentes.push(() => {
        antigo?.limpar?.()
        h.efeitos[i] = { deps, limpar: executar() }
      })
    }
  },
  useMemo: (fn: () => unknown) => fn(),
}))
import { useEquipeCompleta } from './useEquipe'
import { hojeRecife } from '../../lib/formato'
const pendente = <T>() => {
  let resolver!: (v: T) => void, rejeitar!: (e: Error) => void
  const promise = new Promise<T>((r, j) => {
    resolver = r
    rejeitar = j
  })
  return { promise, resolver, rejeitar }
}
const render = () => {
  h.indice = 0
  h.efeito = 0
  const equipe = useEquipeCompleta([])
  h.pendentes.splice(0).forEach(f => f())
  return equipe
}
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}
beforeEach(() => {
  h.efeitos.forEach(e => e.limpar?.())
  h.estados = []
  h.efeitos = []
  h.pendentes = []
})
it('limpa a família anterior no primeiro render e ignora respostas de outra família', async () => {
  const antiga = pendente<any[]>(),
    nova = pendente<any[]>()
  h.app = {
    familia: { id: 'A' },
    versao: 1,
    api: {
      recebimentos: vi.fn(() => Promise.resolve([])),
      estoque: vi.fn(() => Promise.resolve({ contagens: [] })),
      avisosCasa: vi.fn((f: string) => (f === 'A' ? antiga.promise : nova.promise)),
      config: vi.fn(() => Promise.resolve({})),
    },
  }
  render()
  h.app.familia = { id: 'B' }
  render()
  nova.resolver([{ tipo: 'casa_presenca', data: hojeRecife(), nome: 'Família B' }])
  await flush()
  antiga.resolver([{ tipo: 'casa_presenca', data: '2026-11-15', nome: 'Família A' }])
  await flush()
  expect(JSON.stringify(render())).not.toContain('Família A')
  h.app.familia = { id: 'C' }
  expect(render().find(f => f.id === 'tesoureiro')?.semDado).toBe(true)
})
it('falhas de atualização apagam dados e a resposta antiga não substitui a recente', async () => {
  const atrasada = pendente<any[]>()
  const rec = vi
    .fn()
    .mockResolvedValueOnce([])
    .mockImplementationOnce(() => atrasada.promise)
    .mockRejectedValueOnce(Error('leitura'))
  h.app = {
    familia: { id: 'A' },
    versao: 1,
    api: {
      recebimentos: rec,
      estoque: vi.fn(() => Promise.resolve({ contagens: [] })),
      avisosCasa: vi.fn(() => Promise.resolve([])),
      config: vi.fn(() => Promise.resolve({})),
    },
  }
  render()
  await flush()
  expect(render().find(f => f.id === 'tesoureiro')?.semDado).toBeUndefined()
  h.app.versao = 2
  render()
  h.app.versao = 3
  render()
  await flush()
  expect(render().find(f => f.id === 'tesoureiro')?.semDado).toBe(true)
  atrasada.resolver([])
  await flush()
  expect(render().find(f => f.id === 'tesoureiro')?.semDado).toBe(true)
})
it.each(['avisos', 'presenca'])('3: falha de %s não vira ninguém presente', async campo => {
  h.app = {
    familia: { id: 'teste' },
    versao: 1,
    api: {
      recebimentos: async () => [],
      estoque: async () => ({ contagens: [] }),
      avisosCasa: async () => {
        if (campo === 'avisos') throw Error('falha')
        return []
      },
      config: async () => {
        if (campo === 'presenca') throw Error('falha')
        return {}
      },
    },
  }
  render()
  await flush()
  const equipe = render()
  expect(JSON.stringify(equipe)).not.toContain('Ninguém')
  expect(equipe.find(f => f.id === 'presenca')?.semDado).toBe(true)
  expect(equipe.falhou).toBe(true)
  expect(equipe.repetir).toBeTypeOf('function')
})
