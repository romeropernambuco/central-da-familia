import { expect, it } from 'vitest'
import type { FamiliaMinha } from '../../api/tipos'
import { lerDadosInsights } from './leitura'
import { avaliarInsights, candidatosInsights } from './motor'
import { montarSnapshot } from './snapshot'

const familia = { id: 'f', papel: 'casal', membroId: 'm' } as FamiliaMinha
const iptu = { id: 'iptu', nome: 'IPTU da casa', valor: 3000, mes: 12, dia: 10 }
const snap = (contas: unknown, agora: string) => montarSnapshot(familia, 'real', { contasAno: contas }, agora)

it('o Contador lembra a conta do ano 30 dias antes, no Planejamento, com nome, valor e data', () => {
  const agora = '2026-11-23T10:00:00-03:00'
  const i = candidatosInsights(snap([iptu], agora), agora).find(i => i.tipo === 'conta_do_ano')!
  expect(i).toMatchObject({ funcionario: 'contador', rota: 'planejamento', prioridade: 1, vence_em: '2026-12-10' })
  expect(i.pergunta).toBe('Uma conta do ano vence em breve. O dinheiro já está separado?')
  expect(i.contexto).toBe('IPTU da casa: R$ 3.000,00, vence em 10/12/2026.')
  expect(i.trechosPrivados).toEqual(['IPTU da casa'])
  expect(avaliarInsights(snap([iptu], agora), agora)[0].tipo).toBe('conta_do_ano')
})

it('longe do vencimento, ou já paga, ele não fala', () => {
  const agora = '2026-11-23T10:00:00-03:00'
  const nada = (c: object) => candidatosInsights(snap([c], agora), agora).some(i => i.tipo === 'conta_do_ano')
  expect(nada({ ...iptu, mes: 2 })).toBe(false)
  expect(nada({ ...iptu, mes: 11, dia: 1, pagas: ['2026'] })).toBe(false)
})

it('no dia, pergunta se pagou (atravessa o silêncio da noite); depois do dia, pergunta se foi paga', () => {
  const noDia = '2026-12-10T23:00:00-03:00'
  expect(candidatosInsights(snap([iptu], noDia), noDia)[0]).toMatchObject({
    prioridade: 0,
    pergunta: 'Hoje vence uma conta do ano. Já pagou?',
  })
  const depois = '2026-12-20T10:00:00-03:00'
  expect(candidatosInsights(snap([iptu], depois), depois)[0]).toMatchObject({
    prioridade: 1,
    pergunta: 'Uma conta do ano já venceu. Ela foi paga?',
  })
})

it('só o casal; a leitura das contas é só no Planejamento e, se falhar, não vira erro da aba', async () => {
  const agora = '2026-11-23T10:00:00-03:00'
  for (const papel of ['pessoa', 'equipe'] as const)
    expect(montarSnapshot({ ...familia, papel }, 'real', { contasAno: [iptu] }, agora).contasAno).toBeUndefined()
  const chaves: string[] = []
  const api = {
    modo: 'real',
    config: async (_f: string, chave: string) => {
      chaves.push(chave)
      if (chave === 'contas_ano') throw Error('falha')
      return {}
    },
  } as never
  const r = await lerDadosInsights(api, familia, 'planejamento', agora)
  expect(chaves).toContain('contas_ano')
  expect(r.dados.contasAno).toBeUndefined()
  expect(r.erros).toHaveLength(0)
  chaves.length = 0
  await lerDadosInsights(api, familia, 'cartoes', agora).catch(() => undefined)
  expect(chaves).not.toContain('contas_ano')
})
