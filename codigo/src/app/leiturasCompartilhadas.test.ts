import { afterEach, expect, it, vi } from 'vitest'
import { definirEscopoLeitura, invalidarDados, lerCompartilhado, limparLeituras, metadadosLeitura } from './invalidacao'
import { protegerApi } from '../api/protegida'
import { numerosDaAba } from '../telas/escritorio/numeros'
import { recursosDaMutacao } from '../api/recursos'
import type { Api, FamiliaMinha, GuardadoHoje } from '../api/tipos'
import { desfazer } from './desfazer'
import { pendentes } from './pendentes'
const familia = { id: 'f', membroId: 'm', papel: 'casal' } as FamiliaMinha
const adiado = <T,>() => { let resolver!: (d: T) => void; const promessa = new Promise<T>(r => { resolver = r }); return { promessa, resolver } }
afterEach(() => { desfazer.limpar(); pendentes.limpar() })
it('deduplica em andamento, invalida apenas recurso alvo e rejeita resposta antiga', async () => {
  const api = { modo: 'real' } as Api, antigo = adiado<number>()
  definirEscopoLeitura(api, 'sessao', familia)
  const buscar = vi.fn(() => antigo.promessa)
  const p = lerCompartilhado(api, 'f', 'guardado', [], buscar)
  const rejeitada = expect(p).rejects.toThrow('substituída')
  const p2 = lerCompartilhado(api, 'f', 'guardado', [], buscar)
  expect(p2).toBe(p)
  await Promise.resolve(); expect(buscar).toHaveBeenCalledTimes(1)
  await lerCompartilhado(api, 'f', 'imoveis', [], async () => 3)
  invalidarDados(api, 'f', ['guardado'])
  expect(await lerCompartilhado(api, 'f', 'guardado', [], async () => 2)).toBe(2)
  antigo.resolver(1); await rejeitada
  expect(await lerCompartilhado(api, 'f', 'guardado', [], async () => 9)).toBe(2)
  expect(await lerCompartilhado(api, 'f', 'imoveis', [], async () => 9)).toBe(3)
})
it('sessão, família, membro e papel isolam e limpam; Assessor não consulta dinheiro', async () => {
  const api = { modo: 'real' } as Api, buscar = vi.fn(async () => 100)
  for (const [sessao, f] of [ ['s1', familia], ['s2', familia], ['s2', { ...familia, id: 'outra' }], ['s2', { ...familia, membroId: 'outro' }], ['s2', { ...familia, papel: 'pessoa' }] ] as [string, FamiliaMinha][]) {
    definirEscopoLeitura(api, sessao, f)
    await lerCompartilhado(api, f.id, 'guardado', [], buscar)
  }
  expect(buscar).toHaveBeenCalledTimes(5)
  definirEscopoLeitura(api, 'equipe', { ...familia, papel: 'equipe' })
  await expect(lerCompartilhado(api, 'f', 'guardado', [], buscar)).rejects.toThrow('restrita')
  await expect(lerCompartilhado(api, 'f', 'resumo', [], buscar)).rejects.toThrow('restrita')
  expect(buscar).toHaveBeenCalledTimes(5)
  limparLeituras(api)
  definirEscopoLeitura(api, 's2', familia)
  await lerCompartilhado(api, 'f', 'guardado', [], buscar)
  expect(buscar).toHaveBeenCalledTimes(6)
})
it('erro não vira zero/vazio e permite nova tentativa', async () => {
  const api = {} as Api
  await expect(lerCompartilhado(api, 'f', 'guardado', [], async () => { throw new Error('offline') })).rejects.toThrow('offline')
  expect(metadadosLeitura(api, 'f', 'guardado')).toMatchObject({ estado: 'erro', erro: 'offline' })
  expect(await lerCompartilhado(api, 'f', 'guardado', [], async () => 0)).toBe(0)
  expect(metadadosLeitura(api, 'f', 'guardado')).toMatchObject({ estado: 'pronto', erro: null })
})
it('mutação só com id resolve família, relê aba/funcionário e desfazer invalida de novo', async () => {
  let total = 100
  const leitura = vi.fn(async () => ({ total, rendeu_hoje_liquido: 2, aplicacoes: [{ id: 'a' }] }) as GuardadoHoje)
  const interna = { modo: 'real', guardadoHoje: leitura, guardadoMovimentar: async () => { total = 120 }, guardadoDesfazer: async () => { total = 100 } } as unknown as Api
  const api = protegerApi(interna)
  definirEscopoLeitura(api, 's', familia)
  expect((await api.guardadoHoje('f')).total).toBe(100)
  expect((await numerosDaAba(api, familia, 'guardado'))[0].valor).toBe(100)
  expect(leitura).toHaveBeenCalledTimes(1)
  await api.guardadoMovimentar('a', 'aporte', 20, '2026-11-17', 'chave')
  expect((await api.guardadoHoje('f')).total).toBe(120)
  expect((await numerosDaAba(api, familia, 'guardado'))[0].valor).toBe(120)
  expect(leitura).toHaveBeenCalledTimes(2)
  await api.guardadoDesfazer!('a', 'chave')
  expect((await numerosDaAba(api, familia, 'guardado'))[0].valor).toBe(100)
})
it('inverso registrado publica os mesmos recursos', async () => {
  let config = 1
  const ler = vi.fn(async () => config)
  const api = protegerApi({ modo: 'real', config: ler, salvarConfig: async (_f: string, _c: string, n: number) => { config = n } } as unknown as Api)
  definirEscopoLeitura(api, 's', familia)
  expect(await api.config('f', 'entradas', 0)).toBe(1)
  await api.salvarConfig('f', 'entradas', 2)
  expect(await api.config('f', 'entradas', 0)).toBe(2)
  await desfazer.atual!.desfazer()
  expect(await api.config('f', 'entradas', 0)).toBe(1)
})
it('mapeia os recursos das mutações de cada domínio no limite da API', () => {
  for (const [acao, recursos] of [
    ['lancar', ['lancamentos', 'resumo', 'faturas', 'pendencias', 'projecao']],
    ['faturaInformar', ['faturasBanco', 'pendencias']],
    ['recebimentoMudar', ['recebimentos', 'controles', 'realizado', 'plano2029']],
    ['guardadoMovimentar', ['guardado', 'projecao', 'pendencias']],
    ['estoqueContar', ['feira', 'estoque', 'lista', 'escritorio']],
  ] as [string, string[]][]) expect(recursosDaMutacao(acao, [])).toEqual(expect.arrayContaining(recursos))
})
it('resposta tardia de mutação não publica desfazer em outra sessão', async () => {
  const espera = adiado<void>()
  const api = protegerApi({ modo: 'real', guardadoMovimentar: () => espera.promessa } as unknown as Api)
  definirEscopoLeitura(api, 's1', familia)
  const p = api.guardadoMovimentar('a', 'aporte', 10, '2026-11-17', 'chave')
  const rejeitada = expect(p).rejects.toThrow('Sessão encerrada')
  await Promise.resolve()
  definirEscopoLeitura(api, 's2', familia)
  espera.resolver()
  await rejeitada
  expect(desfazer.atual).toBeNull()
})
it('editar a cópia de uma leitura não corrompe o total oficial do cache', async () => {
  const api = protegerApi({ modo: 'real', guardadoHoje: async () => ({ total: 123, aplicacoes: [] }) } as unknown as Api)
  definirEscopoLeitura(api, 's', familia)
  const g = await api.guardadoHoje('f'); g.total = 999
  expect((await api.guardadoHoje('f')).total).toBe(123)
})
