import { afterEach, describe, expect, it } from 'vitest'
import { apiExemplo, reiniciarExemplo } from '../api/exemplo'
import { validarEstado } from '../lib/validarEstado'

type Solto = Record<string, unknown>
type Copia = {
  lancamentos: Solto[]
  cartoes: Solto[]
  aplicacoes: Solto[]
  config: Solto
  chavesLancamentos: unknown
  estado: { envs: Solto[]; config: Solto; objetivo: Solto }
  estado2: { n: number; chaves: unknown[]; apps: Solto[] }
} & Solto

afterEach(() => reiniciarExemplo())
const copiaBoa = async () => {
  reiniciarExemplo()
  return JSON.parse(JSON.stringify(await apiExemplo.backupLer!('fam-silva'))) as Copia
}

describe('conferidor da cópia de segurança', () => {
  it('aceita a cópia inteira da família de exemplo, e também a cópia sem o estado interno', async () => {
    const d = await copiaBoa()
    expect(d.lancamentos.length).toBeGreaterThan(0)
    expect(d.cartoes.length).toBeGreaterThan(0)
    expect(() => validarEstado(d)).not.toThrow()
    const { estado: _estado, ...semEstado } = d
    expect(() => validarEstado(semEstado)).not.toThrow()
  })

  it('recusa o que nem é uma cópia', () => {
    for (const v of [null, undefined, 7, 'texto', [], true])
      expect(() => validarEstado(v)).toThrow('Cópia inválida ou incompleta: dados')
  })

  const estragos: [string, (d: Copia) => void, string][] = [
    ['número que não é número de verdade', d => (d.lancamentos[0].valor = Infinity), 'dados'],
    [
      'campo com nome perigoso',
      d => Object.defineProperty(d.config, 'constructor', { value: 1, enumerable: true }),
      'dados',
    ],
    ['lista que virou texto', d => ((d as Solto).lancamentos = 'x'), 'lancamentos'],
    ['valor que virou texto', d => (d.lancamentos[0].valor = '10'), 'lancamentos.valor'],
    ['gasto sem identificação', d => (d.lancamentos[0].id = ''), 'lancamentos.id'],
    ['cartão repetido', d => d.cartoes.push({ ...d.cartoes[0] }), 'cartoes.id'],
    ['configurações em formato de lista', d => ((d as Solto).config = []), 'configurações ou parâmetros'],
    ['chaves de envio em formato errado', d => (d.chavesLancamentos = 'x'), 'chaves de lançamento'],
    ['estado interno que virou lista', d => ((d as Solto).estado2 = []), 'estado'],
    ['histórico dos parâmetros estragado', d => (d.estado.objetivo.historico = 'x'), 'estado da família'],
    ['trocas de gás em formato errado', d => (d.estado.config.casa_gas = { trocas: 'x' }), 'gás'],
    ['folha da Casa que virou lista', d => (d.estado.config.casa_folha = []), 'casa_folha'],
    ['contador negativo', d => (d.estado2.n = -1), 'contador'],
    ['chave de movimento que não é texto', d => d.estado2.chaves.push(1), 'chaves'],
    ['limite que sumiu, com gasto apontando pra ele', d => d.estado.envs.splice(0), 'referência'],
    ['aplicação diferente da que está no estado', d => (d.aplicacoes[0].nome = 'Outra'), 'aplicações inconsistentes'],
    ['gasto diferente do que está no estado', d => d.lancamentos.pop(), ''],
  ]
  it.each(estragos)('recusa: %s', async (_nome, estragar, onde) => {
    const d = await copiaBoa()
    estragar(d)
    expect(() => validarEstado(d)).toThrow('Cópia inválida ou incompleta: ' + onde)
  })
})
