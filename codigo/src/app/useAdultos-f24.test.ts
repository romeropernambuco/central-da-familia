import { it, expect, vi } from 'vitest'
const h = vi.hoisted(() => ({
  efeito: null as null | (() => (() => void) | undefined),
  set: vi.fn(),
  membros: vi.fn(),
}))
vi.mock('react', () => ({
  useState: () => [null, h.set],
  useEffect: (f: typeof h.efeito) => {
    h.efeito = f
  },
}))
vi.mock('./contexto', () => {
  // o contexto de mentira responde igual por inteiro e por parte
  const useApp = () => ({ api: { membros: h.membros }, familia: { id: 'ficticia', papel: 'casal' } })
  return {
    useApp,
    useSessaoAtual: useApp,
    useAcoes: useApp,
    useDadosDoDia: useApp,
    useOlhoApp: useApp,
    useFolhaLancar: useApp,
  }
})
import { useAdultos } from './useMembros'
it.each([false, true])('ignora leitura tardia ao trocar a aba (rejeição=%s)', async falha => {
  h.set.mockClear()
  let resolver!: (v: any) => void, rejeitar!: (v: any) => void
  h.membros.mockReturnValue(
    new Promise((r, j) => {
      resolver = r
      rejeitar = j
    }),
  )
  useAdultos()
  const limpar = h.efeito!()
  limpar?.()
  if (falha) rejeitar(Error('offline'))
  else resolver([{ papel: 'casal' }])
  await Promise.resolve()
  await Promise.resolve()
  expect(h.set).not.toHaveBeenCalled()
})
