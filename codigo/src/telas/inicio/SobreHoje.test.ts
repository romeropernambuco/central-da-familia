import { esconderValores } from '../../lib/olho'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import type { Envelope, ResumoHoje } from '../../api/tipos'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { projecaoCasal } from '../../lib/resumo/orcamento'
import { SobreHoje } from './SobreHoje'

afterEach(() => {
  vi.useRealTimers()
  esconderValores(false)
})

const mensal: Envelope = { id: 'eu', nome: 'Meu limite', regra: 'mensal', limite_mes: 1000, gasto_mes: 300, livre: 700 }

/** Renderiza a faixa num dia escolhido (meio-dia no Recife) e devolve só o texto, com espaço comum no lugar do que não quebra. */
function faixa(dia: string, e: Envelope, extra: { placar?: ReturnType<typeof projecaoCasal>; oculto?: boolean } = {}) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${dia}T12:00:00-03:00`))
  esconderValores(!!extra.oculto)
  const resumo = {
    dias_restantes: 10,
    livre_mes: 0,
    pode_gastar_hoje: 0,
    colchao: 0,
    explicacao: [],
    envelopes: [e],
  } as ResumoHoje
  const contexto = {
    resumo,
    familia: { id: 'f', papel: 'casal', envelopeId: 'eu', membroId: 'm', membroNome: 'Ana' },
    oculto: !!extra.oculto,
    explicar() {},
  } as unknown as Ctx
  const html = renderToStaticMarkup(
    createElement(ContextoApp.Provider, { value: contexto }, createElement(SobreHoje, { e, placar: extra.placar })),
  )
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;| /g, ' ')
    .replace(/\s+/g, ' ')
}

it('no meio do mês, com gasto hoje, diz quanto saiu e quanto ainda pode; sem gasto, não diz nada disso', () => {
  expect(faixa('2026-11-15', { ...mensal, gasto_hoje: 50, hoje: 120 })).toContain(
    'Hoje já saiu R$ 50. Ainda pode hoje R$ 120.',
  )
  const semGasto = faixa('2026-11-15', mensal)
  expect(semGasto).not.toContain('Hoje já saiu')
  expect(semGasto).not.toContain('começa com')
  expect(semGasto).toContain('De onde veio esse número?')
})

it('nos dias 1 a 3 conta como o mês passado fechou; no dia 4 a frase some', () => {
  const comMesPassado = { ...mensal, mes_anterior: { mes: '2026-11', gasto: 900, limite: 1000 } }
  const dia2 = faixa('2026-12-02', comMesPassado)
  expect(dia2).toContain('Novembro: R$ 900 de R$ 1.000, dentro.')
  expect(dia2).toContain('Dezembro começa com R$ 1.000')
  expect(faixa('2026-12-04', comMesPassado)).not.toContain('Novembro:')
  const passou = faixa('2026-12-01', {
    ...comMesPassado,
    mes_anterior: { mes: '2026-11', gasto: 1150, limite: 1000 },
    falta_mes_anterior: 150,
  })
  expect(passou).toContain('passou R$ 150')
  expect(passou).toContain('Dezembro começa com R$ 850')
})

it('nos 2 últimos dias avisa com quanto o mês que vem começa, só se houver parcela caindo nele', () => {
  const comParcela = { ...mensal, parcelas_mes_que_vem: 200 }
  expect(faixa('2026-11-29', comParcela)).toContain('Dezembro começa com R$ 800')
  expect(faixa('2026-11-30', comParcela)).toContain('Dezembro começa com R$ 800')
  expect(faixa('2026-11-28', comParcela)).not.toContain('começa com')
  expect(faixa('2026-11-30', mensal)).not.toContain('começa com')
  // virada de ano
  expect(faixa('2026-12-31', comParcela)).toContain('Janeiro começa com R$ 800')
})

it('em mês devendo mostra a frase do estouro e não promete "ainda pode hoje"', () => {
  const devendo = faixa('2026-11-15', { ...mensal, gasto_mes: 1200, livre: -200, gasto_hoje: 80 })
  expect(devendo).toContain('Passou R$ 200 do combinado.')
  expect(devendo).not.toContain('Ainda pode hoje')
})

it('o casal: quem vai passar aparece pelo nome; se ninguém passa, mostra a sobra dos dois', () => {
  const passa = projecaoCasal([
    { nome: 'Ana', fecha: 1300, limite: 1000, eu: true },
    { nome: 'Bruno', fecha: 800, limite: 1000, eu: false },
  ])
  const sobra = projecaoCasal([
    { nome: 'Ana', fecha: 900, limite: 1000, eu: true },
    { nome: 'Bruno', fecha: 800, limite: 1000, eu: false },
  ])
  expect(faixa('2026-11-15', mensal, { placar: passa })).toContain(
    'Ana (você) vai passar R$ 300. O que passa sai de dezembro.',
  )
  expect(faixa('2026-11-15', mensal, { placar: sobra })).toContain('juntos, sobram R$ 300 no fim do mês.')
  expect(faixa('2026-11-15', mensal)).not.toContain('O casal')
})

it('com o olho fechado não aparece valor nem nome, e a frase com valor continua legível', () => {
  const passa = projecaoCasal([
    { nome: 'Ana', fecha: 1300, limite: 1000, eu: true },
    { nome: 'Bruno', fecha: 800, limite: 1000, eu: false },
  ])
  const fechado = faixa('2026-11-15', { ...mensal, gasto_hoje: 50, hoje: 120 }, { placar: passa, oculto: true })
  expect(fechado).toContain('Hoje já saiu R$ •••. Ainda pode hoje R$ •••.')
  expect(fechado).not.toMatch(/\d{2,}/)
  expect(fechado).not.toContain('Ana')
  expect(fechado).not.toContain('Bruno')
})
