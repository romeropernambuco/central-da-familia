import { futuro } from '../lib/futuro'
import { Linha2028, Renda2029 } from './Linha2028'
import type { FuturoEntrada } from '../lib/futuro'
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import { ContextoApp, type Ctx } from '../app/contexto'
import { Imoveis } from '../telas/guardado/Imoveis'
import { Guardado } from '../telas/guardado/Guardado'
import { RumoHero } from './RumoA2029'
import type { RumoCalculado } from '../app/rumo2029'
const dados = vi.hoisted(() => ({ lista: [] as any[], estado: 'erro' }))
vi.mock('../app/useLeituraRemota', () => ({
  useLeituraRemota: () => ({ dado: dados.lista, carregando: false, erro: null }),
}))
vi.mock('../app/useDados2', () => ({
  useGuardado: () => ({ g: null, estado: dados.estado, atualizar() {} }),
  useFuturo: () => ({ saida: null }),
}))
function render(el: ReactElement, oculto = false, papel = 'casal') {
  return renderToStaticMarkup(
    createElement(
      ContextoApp.Provider,
      { value: { oculto, api: { imoveis() {} }, familia: { id: 'f', papel }, versao: 0 } as unknown as Ctx },
      el,
    ),
  )
}
beforeEach(() => {
  dados.lista = []
})
it('imóveis vazios usam EstadoVazio ilustrado e mantêm ação para cadastrar', () => {
  const html = render(createElement(Imoveis, { aplicado: 0 }))
  expect(html).toContain('cf-estado-vazio')
  expect(html).toContain('<svg')
  expect(html).toContain('Nenhum imóvel anotado')
  expect(html).toContain('Seu patrimônio, em um só lugar')
})
it('linha de imóvel mantém nome acessível e sinaliza que abre detalhes com chevron', () => {
  dados.lista = [{ id: 'i', meu: true, apelido: 'Casa', valor: 1000, uso: 'mora', aluguel: 0 }]
  const html = render(createElement(Imoveis, { aplicado: 0 }))
  expect(html).toContain('Abrir para mudar.')
  expect(html).toContain('f30-seta')
  expect(html).toContain('type="button"')
})
it('erro do guardado usa ilustração e oferece nova tentativa', () => {
  const html = render(createElement(Guardado))
  expect(html).toContain('cf-estado-vazio')
  expect(html).toContain('role="alert"')
  expect(html).toContain('Tentar de novo')
})
it('olho fechado mantém exatamente o mesmo visual para coberturas e saldos distintos', () => {
  const c = {
    numeros: { cobre_pct: 30, falta_com_margem: 50000 },
    cobertura: 30,
    referencia: '2029-01',
    total: 1000,
    gasto: 2000,
    aplicacoes: 1000,
    alugueis: 0,
    recorrentes: [],
    rendaCerta: 0,
    saida: {},
    alavancas: [],
    linha: [],
    premissas: [],
    cobreEm: null,
  } as unknown as RumoCalculado
  const a = render(createElement(RumoHero, { calculo: c, abrir() {} }), true)
  const b = render(
    createElement(RumoHero, {
      calculo: { ...c, cobertura: 150, total: 900000, numeros: { ...c.numeros, falta_com_margem: -90000 } },
      abrir() {},
    }),
    true,
  )
  expect(a).toBe(b)
  expect(a).toContain('width:0%')
  expect(a).not.toMatch(/faltam|sobram|polyline/)
})

it('linha e renda escondidas não expõem geometria, cor ou quantidade de meses', () => {
  const entrada: FuturoEntrada = {
    hoje: '2026-11-16',
    saldo_caixa: 80000000,
    aplicacoes: [],
    recebimentos: [],
    compromissos: [],
    dividas: [],
    desvios: [],
    desejos: [],
    imoveis: [],
    parametros: {
      mes_base: '2026-11',
      virada: '2029-01',
      gasto_2029_hoje: 300000,
      renda_certa_2029: 0,
      margem: '0.1',
      taxa_real_trabalho: '0.04',
      taxa_bruta_ano: { 2026: '0.12', 2027: '0.1', 2028: '0.09' },
      ipca_ano: { 2026: '0.04', 2027: '0.04', 2028: '0.04' },
      aliq_proj: '0.225',
      aliq_aluguel: '0.275',
      piso_meses: 6,
      teto_mes: 100000,
      mes_reajuste: 1,
    },
  }
  const outra = { ...entrada, saldo_caixa: 100 }
  const a = futuro(entrada),
    b = futuro(outra)
  expect(render(createElement(Linha2028, { saida: a, entrada }), true)).toBe(
    render(createElement(Linha2028, { saida: b, entrada: outra }), true),
  )
  const rendaA = futuro({ ...entrada, hoje: '2029-01-17' }),
    rendaB = futuro({ ...outra, hoje: '2029-01-17' })
  expect(render(createElement(Renda2029, { saida: rendaA }), true)).toBe(
    render(createElement(Renda2029, { saida: rendaB }), true),
  )
})
