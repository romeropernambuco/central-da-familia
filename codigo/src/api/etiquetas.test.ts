import { afterEach, describe, expect, it } from 'vitest'
import { apiExemplo, exemploComo, reiniciarExemplo } from './exemplo'
import { etiquetasDoBanco, normalizaEtiqueta, normalizaResumoEtiqueta, normalizaSimulacao } from './etiquetasBanco'
import { TRADUZ, traduzErro } from './erros'
import { hojeRecife, somaDias } from '../lib/formato'
import {
  cambioDoGasto,
  diferencaEtiquetas,
  erroDaEtiqueta,
  etiquetasDaData,
  moedaDeFora,
  resumirEtiqueta,
  simularEtiqueta,
} from '../lib/etiquetas'

afterEach(() => reiniciarExemplo())
const F = 'fam-silva'
const hoje = hojeRecife()
let n = 0
const gastar = (valor: number, data = hoje) =>
  apiExemplo
    .lancar({
      familia: F,
      envelope: 'env-ana',
      valor,
      data,
      descricao: 'Teste de etiqueta',
      cartao: null,
      parcelas: 1,
      segundos: 3,
      chave: 'etq-teste-' + ++n,
    })
    .then(r => r.lancamento.id)

describe('as contas da etiqueta (iguais às do banco)', () => {
  const viagem = { inicio: '2026-11-10', fim: '2026-11-19' }
  const gastos = [
    { valor: 3000, data: '2026-10-02', envelope: 'Viagem' },
    { valor: 600, data: '2026-11-10', envelope: 'Restaurante', moeda_original: 'EUR', valor_original: 100 },
    { valor: 400, data: '2026-11-12', envelope: 'Mercado' },
    { valor: 200, data: '2026-11-12', envelope: 'Restaurante' },
    { valor: 50, data: '2026-11-25', envelope: 'Mercado' },
  ]
  it('separa pago antes, durante e depois, e divide o durante pelos dias e pelas pessoas', () => {
    const r = resumirEtiqueta(viagem, gastos, 4)
    expect(r).toMatchObject({ total: 4250, antes: 3000, durante: 1200, depois: 50, dias: 10, lancamentos: 5 })
    expect(r.por_dia).toBe(120)
    expect(r.por_pessoa_dia).toBe(30)
    expect(r.por_envelope[0]).toEqual({ envelope: 'Viagem', total: 3000, pct: 70.6 })
    expect(r.por_envelope.map(x => x.total).reduce((a, b) => a + b)).toBe(r.total)
    expect(r.por_moeda).toEqual([
      { moeda: 'BRL', valor_original: 3650, valor_brl: 3650, cambio_medio: 1 },
      { moeda: 'EUR', valor_original: 100, valor_brl: 600, cambio_medio: 6 },
    ])
    expect(r.por_data.map(x => x.data)).toEqual(['2026-10-02', '2026-11-10', '2026-11-12', '2026-11-25'])
    expect(r.por_data[2]).toEqual({ data: '2026-11-12', total: 600, lancamentos: 2 })
  })
  it('sem datas tudo é "durante" e não existe conta por dia', () => {
    const r = resumirEtiqueta({ inicio: null, fim: null }, gastos, 4)
    expect(r).toMatchObject({ antes: 0, depois: 0, durante: 4250, dias: null, por_dia: null, por_pessoa_dia: null })
  })
  it('simulação: por pessoa por dia × pessoas × dias, mais o pago antes na proporção das pessoas', () => {
    const base = resumirEtiqueta(viagem, gastos, 4)
    expect(simularEtiqueta(base, 10, 5)).toEqual({
      dias: 10,
      pessoas: 5,
      gasto_durante: 1500,
      pago_antes_referencia: 3750,
      total_estimado: 5250,
    })
    // sem dizer as pessoas, usa as da viagem base: mesmos dias dá o mesmo gasto
    expect(simularEtiqueta(base, 10).total_estimado).toBe(4200)
    expect(() => simularEtiqueta(base, 0)).toThrow('1 a 366')
    expect(() => simularEtiqueta(base, 5, 51)).toThrow('1 a 50')
    expect(() => simularEtiqueta(resumirEtiqueta({ inicio: null, fim: null }, gastos, 4), 5)).toThrow('datas')
  })
  it('a data escolhe a etiqueta; arquivada e sem datas não entram sozinhas', () => {
    const es = [
      { id: 'a', inicio: '2026-11-10', fim: '2026-11-19', moeda: 'EUR' },
      { id: 'b', inicio: null, fim: null, moeda: 'BRL' },
      { id: 'c', inicio: '2026-11-01', fim: '2026-11-30', moeda: 'BRL', arquivada: true },
    ]
    expect(etiquetasDaData(es, '2026-11-10').map(e => e.id)).toEqual(['a'])
    expect(etiquetasDaData(es, '2026-11-19').map(e => e.id)).toEqual(['a'])
    expect(etiquetasDaData(es, '2026-11-20')).toEqual([])
    expect(moedaDeFora(es)).toBe('EUR')
    expect(moedaDeFora([es[1]])).toBeNull()
  })
  it('depois de salvar só vai a diferença: o que a pessoa tirou e o que pôs a mais', () => {
    expect(diferencaEtiquetas(['a'], ['a'])).toEqual({ tirar: [], colocar: [] })
    expect(diferencaEtiquetas(['a'], [])).toEqual({ tirar: ['a'], colocar: [] })
    expect(diferencaEtiquetas(['a'], ['b', 'c'])).toEqual({ tirar: ['a'], colocar: ['b', 'c'] })
    expect(cambioDoGasto(300, 48)).toBe(6.25)
    expect(cambioDoGasto(300, 0)).toBe(0)
  })
  it('a folha de criar etiqueta recusa o que o banco recusaria, com frase que dá pra entender', () => {
    const ok = { nome: 'Europa nov/26', inicio: '2026-11-10', fim: '2026-11-30', moeda: 'EUR', pessoas: '5' }
    expect(erroDaEtiqueta(ok)).toBe('')
    expect(erroDaEtiqueta({ ...ok, inicio: '', fim: '', pessoas: '' })).toBe('')
    expect(erroDaEtiqueta({ ...ok, nome: '  ' })).toContain('nome')
    expect(erroDaEtiqueta({ ...ok, fim: '' })).toContain('juntos')
    expect(erroDaEtiqueta({ ...ok, fim: '2026-11-09' })).toContain('antes do início')
    expect(erroDaEtiqueta({ ...ok, fim: '2028-01-01' })).toContain('1 ano')
    expect(erroDaEtiqueta({ ...ok, moeda: 'EURO' })).toContain('3 letras')
    expect(erroDaEtiqueta({ ...ok, pessoas: '0' })).toContain('1 a 50')
  })
})

describe('etiquetas na família de exemplo (mesmas regras do banco)', () => {
  it('o casal vê as etiquetas com total; gasto novo no período já nasce etiquetado', async () => {
    const antes = await apiExemplo.etiquetas!(F)
    const europa = antes.find(e => e.id === 'etq-europa')!
    expect(europa.total).toBeGreaterThan(0)
    const id = await gastar(100)
    expect(await apiExemplo.etiquetasDoLancamento!(id)).toEqual(['etq-europa'])
    const depois = (await apiExemplo.etiquetas!(F)).find(e => e.id === 'etq-europa')!
    expect(depois.total).toBe(Math.round((europa.total! + 100) * 100) / 100)
    expect(depois.lancamentos).toBe(europa.lancamentos + 1)
  })
  it('gasto fora do período nasce sem etiqueta; à mão entra e conta como pago antes', async () => {
    const id = await gastar(900, somaDias(hoje, -20))
    expect(await apiExemplo.etiquetasDoLancamento!(id)).toEqual([])
    const antes = (await apiExemplo.etiquetaResumo!('etq-europa')).antes
    await apiExemplo.etiquetar!(id, 'etq-europa', true)
    expect((await apiExemplo.etiquetaResumo!('etq-europa')).antes).toBe(antes + 900)
  })
  it('tirada à mão, a etiqueta não volta sozinha nem quando as datas mudam', async () => {
    const id = await gastar(80)
    await apiExemplo.etiquetar!(id, 'etq-europa', false)
    expect(await apiExemplo.etiquetasDoLancamento!(id)).toEqual([])
    const e = (await apiExemplo.etiquetas!(F)).find(x => x.id === 'etq-europa')!
    await apiExemplo.etiquetaSalvar!(F, { ...e, inicio: somaDias(hoje, -10), fim: somaDias(hoje, 5) }, e.id)
    expect(await apiExemplo.etiquetasDoLancamento!(id)).toEqual([])
  })
  it('etiqueta nova com datas entra nos gastos que já estavam anotados; nome repetido é recusado', async () => {
    const id = await gastar(60, somaDias(hoje, -30))
    const r = await apiExemplo.etiquetaSalvar!(F, {
      nome: 'Feriado',
      inicio: somaDias(hoje, -31),
      fim: somaDias(hoje, -29),
      moeda: 'brl',
      pessoas: 2,
    })
    expect(r.aplicada_em).toBeGreaterThanOrEqual(1)
    expect(r.etiqueta).toMatchObject({ nome: 'Feriado', moeda: 'BRL', pessoas: 2, arquivada: false })
    expect(await apiExemplo.etiquetasDoLancamento!(id)).toContain(r.etiqueta.id)
    await expect(
      apiExemplo.etiquetaSalvar!(F, { nome: 'feriado', inicio: null, fim: null, moeda: 'BRL', pessoas: null }),
    ).rejects.toThrow('Já existe')
  })
  it('cada gasto aceita até 3 etiquetas', async () => {
    const id = await gastar(40)
    const nova = (nome: string) =>
      apiExemplo.etiquetaSalvar!(F, { nome, inicio: null, fim: null, moeda: 'BRL', pessoas: null })
    await apiExemplo.etiquetar!(id, 'etq-festa', true)
    await apiExemplo.etiquetar!(id, (await nova('Obra')).etiqueta.id, true)
    await expect(apiExemplo.etiquetar!(id, (await nova('Natal')).etiqueta.id, true)).rejects.toThrow('até 3')
    expect(await apiExemplo.etiquetasDoLancamento!(id)).toHaveLength(3)
  })
  it('valor em euro: o real continua valendo no limite e a viagem mostra por moeda', async () => {
    const id = await gastar(310)
    await apiExemplo.lancamentoMoeda!(id, 50)
    const l = (await apiExemplo.lancamentos(F, hoje.slice(0, 7))).find(x => x.id === id)!
    expect(l).toMatchObject({ valor: 310, moeda_original: 'EUR', valor_original: 50, cambio: 6.2 })
    const r = await apiExemplo.etiquetaResumo!('etq-europa')
    const euro = r.por_moeda.find(x => x.moeda === 'EUR')!
    expect(euro.valor_original).toBeGreaterThanOrEqual(50)
    expect(r.por_moeda.reduce((s, x) => s + x.valor_brl, 0)).toBeCloseTo(r.total, 2)
    await apiExemplo.lancamentoMoeda!(id, null)
    expect((await apiExemplo.lancamentos(F, hoje.slice(0, 7))).find(x => x.id === id)!.moeda_original).toBeUndefined()
    await expect(apiExemplo.lancamentoMoeda!(id, 0)).rejects.toThrow('maior que zero')
  })
  it('o resumo e o simulador batem com a conta: total = antes + durante + depois', async () => {
    const r = await apiExemplo.etiquetaResumo!('etq-europa')
    expect(r.antes).toBeGreaterThan(0)
    expect(Math.round((r.antes + r.durante + r.depois) * 100) / 100).toBe(r.total)
    expect(r.dias).toBe(10)
    expect(r.pessoas).toBe(3)
    const s = await apiExemplo.etiquetaSimular!('etq-europa', r.dias!, r.pessoas)
    expect(s.gasto_durante).toBeCloseTo(r.por_pessoa_dia! * r.dias! * r.pessoas!, 2)
    expect(s.total_estimado).toBeCloseTo(s.gasto_durante + r.antes, 2)
    expect(s.aviso).toContain('Estimativa')
  })
  it('a pessoa da família vê só os nomes; não vê total, não marca e não cria', async () => {
    const id = await gastar(30)
    exemploComo('filha')
    const lista = await apiExemplo.etiquetas!(F)
    expect(lista.map(e => e.nome)).toContain('Europa (exemplo)')
    expect(lista.every(e => e.total === null)).toBe(true)
    await expect(apiExemplo.etiquetaResumo!('etq-europa')).rejects.toThrow('casal')
    await expect(apiExemplo.etiquetaSimular!('etq-europa', 5, 2)).rejects.toThrow('casal')
    await expect(apiExemplo.etiquetar!(id, 'etq-festa', true)).rejects.toThrow('casal')
    await expect(
      apiExemplo.etiquetaSalvar!(F, { nome: 'Minha', inicio: null, fim: null, moeda: 'BRL', pessoas: null }),
    ).rejects.toThrow('casal')
  })
  it('o Assessor da Casa não vê etiqueta nem valor em moeda de fora', async () => {
    const id = await gastar(70)
    await apiExemplo.lancamentoMoeda!(id, 10)
    exemploComo('equipe')
    await expect(apiExemplo.etiquetas!(F)).rejects.toThrow()
    expect(await apiExemplo.etiquetasDoLancamento!(id)).toEqual([])
    const visto = await apiExemplo.lancamentos(F, hoje.slice(0, 7))
    expect(visto.some(l => 'valor_original' in l || 'moeda_original' in l)).toBe(false)
  })
})

describe('etiquetas no banco real: nomes iguais aos das funções do banco', () => {
  it('cada ação chama a função certa, com os parâmetros que ela declara', async () => {
    const chamadas: [string, Record<string, unknown> | undefined][] = []
    const rpc = async <T>(nome: string, args?: Record<string, unknown>) => {
      chamadas.push([nome, args])
      return (nome === 'etiquetas_da_familia' ? [] : {}) as T
    }
    const api = etiquetasDoBanco(rpc, async () => [{ etiqueta_id: 'e1' }, { etiqueta_id: 'e2' }])
    await api.etiquetas('f')
    await api.etiquetaSalvar('f', {
      nome: ' Europa ',
      inicio: '2026-11-10',
      fim: '2026-11-30',
      moeda: 'eur',
      pessoas: 5,
    })
    await api.etiquetar('l', 'e', false)
    await api.lancamentoMoeda('l', 48)
    await api.etiquetaResumo('e')
    await api.etiquetaSimular('e', 10, 5)
    expect(await api.etiquetasDoLancamento('l')).toEqual(['e1', 'e2'])
    expect(chamadas).toEqual([
      ['etiquetas_da_familia', { familia: 'f', incluir_arquivadas: false }],
      [
        'etiqueta_salvar',
        {
          familia: 'f',
          nome: 'Europa',
          inicio: '2026-11-10',
          fim: '2026-11-30',
          moeda: 'EUR',
          pessoas: 5,
          etiqueta: null,
          arquivada: false,
        },
      ],
      ['etiquetar', { lancamento: 'l', etiqueta: 'e', ligar: false }],
      ['lancamento_moeda', { lancamento: 'l', valor_original: 48, moeda: null, cambio: null }],
      ['etiqueta_resumo', { etiqueta: 'e' }],
      ['etiqueta_simular', { etiqueta: 'e', dias: 10, pessoas: 5 }],
    ])
  })
  it('a resposta do banco vira número; resposta vazia vira zero e lista vazia, sem quebrar a tela', () => {
    const r = normalizaResumoEtiqueta({
      etiqueta: { id: 'e', nome: 'Europa', inicio: '2026-11-10', fim: '2026-11-30', moeda: 'EUR', pessoas: null },
      dias: 21,
      pessoas: 5,
      lancamentos: 2,
      total: '1500.50',
      antes: '1000',
      durante: '500.50',
      depois: 0,
      por_dia: '23.83',
      por_pessoa_dia: '4.77',
      por_envelope: [{ envelope: null, total: '1500.50', pct: '100.0' }],
      por_moeda: [{ moeda: 'EUR', valor_original: '80', valor_brl: '500.50', cambio_medio: '6.2563' }],
      por_data: [{ data: '2026-11-10', total: '500.50', lancamentos: 1 }],
    })
    expect(r).toMatchObject({ total: 1500.5, antes: 1000, durante: 500.5, por_dia: 23.83, por_pessoa_dia: 4.77 })
    expect(r.etiqueta).toEqual({
      id: 'e',
      nome: 'Europa',
      inicio: '2026-11-10',
      fim: '2026-11-30',
      moeda: 'EUR',
      pessoas: null,
      arquivada: false,
    })
    expect(r.por_envelope).toEqual([{ envelope: 'Sem limite', total: 1500.5, pct: 100 }])
    expect(r.por_moeda[0].cambio_medio).toBe(6.2563)
    for (const vazio of [null, undefined, {}]) {
      expect(normalizaResumoEtiqueta(vazio)).toMatchObject({ total: 0, por_dia: null, por_envelope: [], por_data: [] })
      expect(normalizaSimulacao(vazio)).toMatchObject({ total_estimado: 0, gasto_durante: 0 })
      expect(normalizaEtiqueta(vazio)).toMatchObject({ moeda: 'BRL', total: null, lancamentos: 0, inicio: null })
    }
  })
  it('as recusas do banco chegam em português com acento', () => {
    for (const sem of [
      'ja existe uma etiqueta com esse nome',
      'cada lancamento aceita ate 3 etiquetas',
      'so o casal cria e muda etiqueta',
      'a etiqueta precisa de datas e de gastos durante a viagem pra simular',
    ]) {
      expect(TRADUZ[sem]).toBeTruthy()
      expect(traduzErro({ code: '23505', message: sem }).message).toBe(TRADUZ[sem])
    }
    expect(traduzErro({ code: '54000', message: 'cada lancamento aceita ate 3 etiquetas' }).message).toBe(
      'Cada gasto aceita até 3 etiquetas.',
    )
  })
})
