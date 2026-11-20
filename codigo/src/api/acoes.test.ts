import { expect, it, vi } from 'vitest'
import { ACOES_QUE_GRAVAM, ACOES_QUE_PASSAM_DIRETO, ACOES_QUE_SO_LEEM, gravaNoBanco } from './acoes'
import { apiExemplo } from './exemplo'
import { apiReal } from './real'
import { protegerApi } from './protegida'

const listas = { grava: ACOES_QUE_GRAVAM, le: ACOES_QUE_SO_LEEM, direto: ACOES_QUE_PASSAM_DIRETO } as const
const todas = Object.values(listas).flat() as string[]
const funcoesDe = (api: object) =>
  Object.entries(api)
    .filter(([, v]) => typeof v === 'function')
    .map(([nome]) => nome)

it('toda ação que existe na API (exemplo e banco real) está declarada em alguma lista', () => {
  const existentes = [...new Set([...funcoesDe(apiExemplo), ...funcoesDe(apiReal)])].sort()
  expect(existentes.filter(nome => !todas.includes(nome))).toEqual([])
})

it('nenhuma ação está em duas listas e nenhuma lista cita ação que não existe', () => {
  expect(todas.filter((nome, i) => todas.indexOf(nome) !== i)).toEqual([])
  const existentes = new Set([...funcoesDe(apiExemplo), ...funcoesDe(apiReal)])
  expect(todas.filter(nome => !existentes.has(nome))).toEqual([])
})

it('só as ações da lista de gravação passam pela proteção; as outras saem como vieram', () => {
  expect(gravaNoBanco('lancar')).toBe(true)
  expect(gravaNoBanco('cobrirComCasa')).toBe(true)
  expect(gravaNoBanco('resumoHoje')).toBe(false)
  expect(gravaNoBanco('sessao')).toBe(false)
  expect(gravaNoBanco('acaoQueNaoExiste')).toBe(false)
})

it('uma ação nova fora das listas não ganha proteção calada: o primeiro teste é quem acusa', () => {
  const novaAcao = vi.fn(async () => 'feito')
  const api = protegerApi({ ...apiExemplo, salvarAlgoNovo: novaAcao } as unknown as typeof apiExemplo)
  // sem estar na lista, ela sai como veio (é a mesma função) e a falta aparece no teste de cobertura acima
  expect((api as unknown as { salvarAlgoNovo: unknown }).salvarAlgoNovo).toBe(novaAcao)
  expect(todas).not.toContain('salvarAlgoNovo')
})
