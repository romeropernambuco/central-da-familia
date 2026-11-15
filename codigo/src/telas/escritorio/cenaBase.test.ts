import { afterEach, expect, it, vi } from 'vitest'
import { abaDoHash, tentarCarregarCena } from './cenaBase'
import { DESTINO_SECRETARIA } from './equipe'
afterEach(() => vi.useRealTimers())
it('destina a Secretária à subaba Lembretes e interpreta mudanças de aba', () => {
  expect(abaDoHash(DESTINO_SECRETARIA)).toBe('lembretes')
  expect(abaDoHash('#/escritorio?f=secretaria&aba=relatorio')).toBe('relatorio')
  expect(abaDoHash('#/escritorio?aba=inexistente')).toBe('hoje')
})
it('invalida o import tardio após 8 segundos', async () => {
  vi.useFakeTimers()
  let resolver!: (v: string) => void
  const montar = vi.fn(), falhar = vi.fn()
  tentarCarregarCena(() => new Promise<string>(r => { resolver = r }), montar, falhar)
  vi.advanceTimersByTime(8000); expect(falhar).toHaveBeenCalledTimes(1)
  resolver('tardio'); await Promise.resolve()
  expect(montar).not.toHaveBeenCalled()
})
it('ignora uma tentativa desmontada sem afetar a seguinte', async () => {
  vi.useFakeTimers()
  let resolver!: (v: string) => void
  const montar = vi.fn(), falhar = vi.fn()
  const cancelar = tentarCarregarCena(() => new Promise<string>(r => { resolver = r }), montar, falhar)
  cancelar(); tentarCarregarCena(() => Promise.resolve('nova'), montar, falhar)
  resolver('antiga'); await Promise.resolve(); vi.advanceTimersByTime(8000)
  expect(montar).toHaveBeenCalledTimes(1); expect(montar).toHaveBeenCalledWith('nova'); expect(falhar).not.toHaveBeenCalled()
})
it('limpa o timeout no sucesso e trata erro da montagem', async () => {
  vi.useFakeTimers()
  const falhar = vi.fn()
  tentarCarregarCena(() => Promise.resolve('ok'), () => { throw Error('montagem') }, falhar)
  await Promise.resolve(); vi.advanceTimersByTime(8000)
  expect(falhar).toHaveBeenCalledTimes(1)
})
