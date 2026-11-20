import { afterEach, expect, it, vi } from 'vitest'
import { apiExemplo, reiniciarExemplo } from '../../api/exemplo'
import { centavos } from '../../lib/formato'
import { gravarLimites } from './limites'

const F = 'fam-silva'
afterEach(() => reiniciarExemplo())
const limite = async (id: string) => {
  const e = (await apiExemplo.resumoHoje(F)).envelopes.find(x => x.id === id)!
  return centavos(e.limite_base ?? e.limite_mes)
}
const dois = async () => (await apiExemplo.resumoHoje(F)).envelopes.filter(e => e.regra !== 'semanal').slice(0, 2)

it('vários limites gravados de uma vez voltam todos juntos com um desfazer só', async () => {
  const [a, b] = await dois(),
    antesA = await limite(a.id),
    antesB = await limite(b.id)
  const r = await gravarLimites(
    apiExemplo,
    F,
    [
      { envelope: a.id, antes: antesA, depois: antesA + 100 },
      { envelope: b.id, antes: antesB, depois: antesB + 50 },
    ],
    null,
  )
  expect(r.erro).toBeUndefined()
  expect(await limite(a.id)).toBe(antesA + 100)
  expect(await limite(b.id)).toBe(antesB + 50)
  await r.voltar!()
  expect(await limite(a.id)).toBe(antesA)
  expect(await limite(b.id)).toBe(antesB)
})

it('se um limite mudou depois, o desfazer recusa e não mexe em nenhum', async () => {
  const [a, b] = await dois(),
    antesA = await limite(a.id),
    antesB = await limite(b.id)
  const r = await gravarLimites(
    apiExemplo,
    F,
    [
      { envelope: a.id, antes: antesA, depois: antesA + 100 },
      { envelope: b.id, antes: antesB, depois: antesB + 50 },
    ],
    null,
  )
  await apiExemplo.definirLimite(F, b.id, antesB + 70)
  await expect(r.voltar!()).rejects.toThrow('confira antes de desfazer')
  expect(await limite(a.id)).toBe(antesA + 100)
  expect(await limite(b.id)).toBe(antesB + 70)
})

it('gravação que para no meio devolve o erro e um desfazer só do que foi gravado', async () => {
  const [a, b] = await dois(),
    antesA = await limite(a.id),
    antesB = await limite(b.id)
  let n = 0
  const api = {
    ...apiExemplo,
    definirLimite: vi.fn(async (f: string, e: string, v: number) => {
      if (++n === 2) throw new Error('caiu')
      return apiExemplo.definirLimite(f, e, v)
    }),
  }
  const r = await gravarLimites(
    api,
    F,
    [
      { envelope: a.id, antes: antesA, depois: antesA + 100 },
      { envelope: b.id, antes: antesB, depois: antesB + 50 },
    ],
    null,
  )
  expect((r.erro as Error).message).toBe('caiu')
  expect(await limite(a.id)).toBe(antesA + 100)
  expect(await limite(b.id)).toBe(antesB)
  await r.voltar!()
  expect(await limite(a.id)).toBe(antesA)
})

it('sem mudança não há desfazer', async () => {
  expect((await gravarLimites(apiExemplo, F, [], null)).voltar).toBeUndefined()
})
