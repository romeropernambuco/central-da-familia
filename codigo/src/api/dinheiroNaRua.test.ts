import { afterEach, describe, expect, it } from 'vitest'
import { apiExemplo, exemploComo, reiniciarExemplo } from './exemplo'
import {
  contaDoNegocio,
  erroDoNegocio,
  fraseDoPrazo,
  lerNegocios,
  ordenarNegocios,
  totaisNaRua,
  type Negocio,
} from '../lib/dinheiroNaRua'
import { validarEstado } from '../lib/validarEstado'
import { hojeRecife } from '../lib/formato'
import { novoUuid } from '../lib/seguro'
import { guardarVolta } from '../telas/guardado/FolhaNegocio'

afterEach(() => reiniciarExemplo())
const HOJE = '2026-11-22'
const negocio = (n: Partial<Negocio>): Negocio => ({
  id: 'n1',
  nome: 'Carro',
  tipo: 'veiculo',
  minha_parte: 50,
  prazo: '2027-01-31',
  volta_prevista: null,
  movimentos: [{ id: 'm1', data: '2026-11-22', tipo: 'pus', valor: 30000 }],
  encerrado_em: null,
  criado_em: '2026-11-22T10:00:00-03:00',
  ...n,
})

describe('conta de um negócio na rua', () => {
  it('o carro de hoje: R$ 30.000 na rua, nada voltou, lucro ainda desconhecido', () => {
    const c = contaDoNegocio(negocio({}), HOJE, 13.65)
    expect(c).toMatchObject({ posto: 30000, voltado: 0, na_rua: 30000, resultado: -30000, dias: 0 })
    expect(c).toMatchObject({ situacao: 'no_prazo', dias_para_prazo: 70, lucro_previsto: null, pct: null, no_banco: 0 })
    expect(fraseDoPrazo(c)).toBe('faltam 70 dias')
  })
  it('com previsão de volta, mostra o lucro esperado e quanto rende sobre o que foi posto', () => {
    const c = contaDoNegocio(negocio({ volta_prevista: 34000 }), HOJE, 13.65)
    expect(c.lucro_previsto).toBe(4000)
    expect(c.pct).toBe(13.3)
  })
  it('a baia: pôs 2.000, voltaram 700, faltam 1.300; gasto a mais soma no que foi posto', () => {
    const baia = negocio({
      movimentos: [
        { id: 'a', data: '2026-08-24', tipo: 'pus', valor: 2000 },
        { id: 'b', data: '2026-09-10', tipo: 'pus', valor: 300 },
        { id: 'c', data: '2026-11-10', tipo: 'voltou', valor: 700 },
      ],
      prazo: '2026-12-02',
    })
    const c = contaDoNegocio(baia, HOJE, 13.65)
    expect(c).toMatchObject({ posto: 2300, voltado: 700, na_rua: 1600, dias: 90, situacao: 'vence_logo' })
    expect(fraseDoPrazo(c)).toBe('faltam 10 dias')
  })
  it('prazo vencido aparece como atrasado, com os dias de atraso', () => {
    const c = contaDoNegocio(negocio({ prazo: '2026-11-19' }), HOJE, 13.65)
    expect(c.situacao).toBe('atrasado')
    expect(fraseDoPrazo(c)).toBe('atrasado há 3 dias')
    expect(fraseDoPrazo(contaDoNegocio(negocio({ prazo: HOJE }), HOJE, 13.65))).toBe('vence hoje')
    expect(fraseDoPrazo(contaDoNegocio(negocio({ prazo: '2026-11-21' }), HOJE, 13.65))).toBe('atrasado há 1 dia')
  })
  it('encerrado: nada mais na rua, o resultado vira o lucro e os dias param de contar', () => {
    const n = negocio({
      movimentos: [
        { id: 'a', data: '2026-01-01', tipo: 'pus', valor: 30000 },
        { id: 'b', data: '2026-04-01', tipo: 'voltou', valor: 33000 },
      ],
      encerrado_em: '2026-04-01',
    })
    const c = contaDoNegocio(n, HOJE, 13.65)
    expect(c).toMatchObject({ na_rua: 0, resultado: 3000, dias: 90, situacao: 'encerrado', dias_para_prazo: null })
    expect(c.pct).toBe(10)
    expect(fraseDoPrazo(c)).toBe('encerrado')
  })
  it('no banco: 1 ano inteiro a 10% rende 10%; depois que o dinheiro volta, para de render', () => {
    const umAno = negocio({ movimentos: [{ id: 'a', data: '2025-11-22', tipo: 'pus', valor: 10000 }] })
    expect(contaDoNegocio(umAno, HOJE, 10).no_banco).toBeCloseTo(1000, 0)
    const voltou = negocio({
      movimentos: [
        { id: 'a', data: '2025-11-22', tipo: 'pus', valor: 10000 },
        { id: 'b', data: '2026-05-23', tipo: 'voltou', valor: 12000 },
      ],
    })
    const c = contaDoNegocio(voltou, HOJE, 10)
    expect(c.no_banco).toBeGreaterThan(450)
    expect(c.no_banco).toBeLessThan(520)
    expect(contaDoNegocio(umAno, HOJE, 0).no_banco).toBe(0)
  })
  it('quando já voltou mais do que foi posto e o negócio segue aberto, nada falta voltar', () => {
    const n = negocio({
      movimentos: [
        { id: 'a', data: '2026-10-01', tipo: 'pus', valor: 1000 },
        { id: 'b', data: '2026-11-01', tipo: 'voltou', valor: 1500 },
      ],
    })
    expect(contaDoNegocio(n, HOJE, 13.65)).toMatchObject({ na_rua: 0, resultado: 500 })
  })
})

describe('a lista de negócios', () => {
  const lista = [
    negocio({ id: 'longe', prazo: '2027-06-01', volta_prevista: 34000 }),
    negocio({
      id: 'atrasado',
      prazo: '2026-11-01',
      movimentos: [{ id: 'x', data: '2026-09-01', tipo: 'pus', valor: 2000 }],
    }),
    negocio({
      id: 'fechado',
      encerrado_em: '2026-10-10',
      movimentos: [
        { id: 'a', data: '2026-08-01', tipo: 'pus', valor: 5000 },
        { id: 'b', data: '2026-10-10', tipo: 'voltou', valor: 5800 },
      ],
    }),
  ]
  it('soma só o que está aberto; encerrado entra como lucro realizado', () => {
    expect(totaisNaRua(lista, HOJE, 13.65)).toEqual({
      na_rua: 32000,
      abertos: 2,
      atrasados: 1,
      volta_prevista: 34000,
      lucro_encerrados: 800,
    })
    expect(totaisNaRua([], HOJE, 13.65)).toMatchObject({ na_rua: 0, abertos: 0, atrasados: 0 })
  })
  it('abertos primeiro, do prazo mais perto para o mais longe; encerrados no fim', () => {
    expect(ordenarNegocios(lista).map(n => n.id)).toEqual(['atrasado', 'longe', 'fechado'])
  })
  it('o que veio estragado do banco não derruba a tela', () => {
    for (const v of [null, undefined, 'x', 7, {}]) expect(lerNegocios(v)).toEqual([])
    expect(
      lerNegocios([null, { id: 'a' }, { id: 'b', nome: 'B', prazo: '2027-01-01', movimentos: 'x' }, lista[0]]),
    ).toEqual([lista[0]])
  })
  it('a folha recusa negócio sem nome, sem valor, sem prazo ou com parte do lucro impossível', () => {
    const ok = { nome: 'Carro', prazo: '2027-01-31', valor: 30000, minha_parte: '50', hoje: HOJE, novo: true }
    expect(erroDoNegocio(ok)).toBe('')
    expect(erroDoNegocio({ ...ok, nome: ' ' })).toContain('nome')
    expect(erroDoNegocio({ ...ok, valor: 0 })).toContain('quanto você pôs')
    expect(erroDoNegocio({ ...ok, prazo: '' })).toContain('até quando')
    expect(erroDoNegocio({ ...ok, prazo: '2026-11-01' })).toContain('já passou')
    expect(erroDoNegocio({ ...ok, minha_parte: '0' })).toContain('1 a 100')
    expect(erroDoNegocio({ ...ok, minha_parte: '120' })).toContain('1 a 100')
    // mudar um negócio antigo não pede o valor de novo nem recusa prazo que já venceu
    expect(erroDoNegocio({ ...ok, novo: false, valor: 0, prazo: '2026-11-01' })).toBe('')
  })
})

describe('na família de exemplo', () => {
  const F = 'fam-silva'
  it('o casal lê os negócios; a pessoa da família não recebe nada', async () => {
    const doCasal = lerNegocios(await apiExemplo.config(F, 'dinheiro_na_rua', []))
    expect(doCasal.map(n => n.id)).toEqual(['rua-carro', 'rua-baia'])
    expect(totaisNaRua(doCasal, hojeRecife(), 13.65)).toMatchObject({
      na_rua: 31300,
      abertos: 2,
      atrasados: 0,
    })
    exemploComo('filha')
    expect(await apiExemplo.config(F, 'dinheiro_na_rua', [])).toEqual([])
  })
  it('o que o casal grava volta igual e a cópia de segurança continua válida', async () => {
    const lista = lerNegocios(await apiExemplo.config(F, 'dinheiro_na_rua', []))
    const novo = negocio({ id: 'novo', nome: 'Terreno' })
    await apiExemplo.salvarConfig(F, 'dinheiro_na_rua', [...lista, novo])
    expect(lerNegocios(await apiExemplo.config(F, 'dinheiro_na_rua', [])).at(-1)).toEqual(novo)
    const copia = JSON.parse(JSON.stringify(await apiExemplo.backupLer!(F)))
    expect(() => validarEstado(copia)).not.toThrow()
    expect(copia.config.dinheiro_na_rua).toHaveLength(3)
  })
})

describe('o dinheiro que volta vai para o Guardado', () => {
  it('manda ao banco a chave no formato que o banco real aceita (uuid) e com o valor e a data do movimento', async () => {
    const chamadas: unknown[][] = []
    const api = { guardadoMovimentar: async (...a: unknown[]) => void chamadas.push(a) }
    const m = { id: novoUuid(), valor: 5000, data: '2026-11-22' }
    await guardarVolta(api, 'app-1', { nome: 'Carro' }, m)
    expect(chamadas).toEqual([['app-1', 'aporte', 5000, '2026-11-22', m.id, 'Voltou de Carro']])
    expect(chamadas[0][4]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
  it('na família de exemplo o valor entra na aplicação e repetir a mesma volta não soma 2 vezes', async () => {
    const antes = (await apiExemplo.guardadoHoje('fam-silva')).aplicacoes.find(a => a.id === 'g1')!.saldo
    const m = { id: novoUuid(), valor: 700, data: hojeRecife() }
    await guardarVolta(apiExemplo, 'g1', { nome: 'Baia' }, m)
    await guardarVolta(apiExemplo, 'g1', { nome: 'Baia' }, m)
    const depois = (await apiExemplo.guardadoHoje('fam-silva')).aplicacoes.find(a => a.id === 'g1')!.saldo
    expect(Math.round((depois - antes) * 100) / 100).toBe(700)
  })
})
