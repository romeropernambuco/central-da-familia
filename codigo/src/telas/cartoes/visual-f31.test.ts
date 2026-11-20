import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Cartoes } from './Cartoes'
import { PrecisaDeVoce } from '../escritorio/PrecisaDeVoce'
import { LerCupom } from '../../componentes/LerCupom'
import { esconderValores } from '../../lib/formato'

const m = vi.hoisted(() => ({ app: vi.fn(), escritorio: vi.fn(), estados: [] as unknown[] }))
vi.mock('../../app/contexto', () => ({ useApp: m.app }))
vi.mock('../../app/useDados2', () => ({ useEscritorio: m.escritorio }))
vi.mock('../../componentes/Qm', () => ({ Qm: () => null }))
vi.mock('react', async original => ({
  ...(await original<typeof import('react')>()),
  useState: (inicial: unknown) => [
    m.estados.length ? m.estados.shift() : typeof inicial === 'function' ? (inicial as () => unknown)() : inicial,
    vi.fn(),
  ],
}))
beforeEach(() => {
  m.estados = []
  m.app.mockReturnValue({ api: {}, familia: { id: 'f', papel: 'casal' }, oculto: false, resumo: { envelopes: [] } })
})
afterEach(() => {
  esconderValores(false)
  vi.clearAllMocks()
})
function estadosCartoes(total?: number) {
  const cartoes = total === undefined ? [] : [{ id: 'c', nome: 'Teste', dia_fechamento: 10, dia_vencimento: 20 }]
  const faturas =
    total === undefined
      ? []
      : [0, total].map((t, i) => ({
          cartao_id: 'c',
          mes: `2026-${11 + i}`,
          vencimento: `2026-${11 + i}-20`,
          total: t,
          fechada: false,
        }))
  m.estados = [
    cartoes,
    faturas,
    false,
    false,
    null,
    0,
    { chave: JSON.stringify(['f', undefined, 'casal']), carregando: false, falha: '', temDado: true },
  ]
}
it('cartões sem dados usam EstadoVazio ilustrado e ação de cadastro nativa', () => {
  estadosCartoes()
  const html = renderToStaticMarkup(createElement(Cartoes))
  expect(html).toContain('cf-estado-vazio')
  expect(html).toContain('viewBox="0 0 160 120"')
  expect(html).toMatch(/<button[^>]*type="button"[^>]*>Cadastrar cartão<\/button>/)
})
it('olho fechado mantém todas as linhas e neutraliza a geometria das faturas, incluindo zeros', () => {
  esconderValores(true)
  m.app.mockReturnValue({ api: {}, familia: { id: 'f', papel: 'casal' }, oculto: true, resumo: { envelopes: [] } })
  const barras = (total: number) => {
    estadosCartoes(total)
    return renderToStaticMarkup(createElement(Cartoes)).match(/<span class="bar"[^>]*>.*?<\/span>/g)
  }
  expect(barras(500)).toEqual(barras(9000))
  expect(barras(500)).toHaveLength(2)
  expect(barras(500)?.every(b => b.includes('class="neutra" style="width:50%"'))).toBe(true)
})
it('tudo em dia usa estado ilustrado sem oferecer ações financeiras', () => {
  m.escritorio.mockReturnValue({ estado: 'pronto', e: { precisa_de_voce: [], funcionarios: [] } })
  const html = renderToStaticMarkup(createElement(PrecisaDeVoce))
  expect(html).toContain('cf-estado-vazio')
  expect(html).toContain('Tudo em ordem')
  expect(html).toContain('viewBox="0 0 160 120"')
  expect(html).not.toContain('Anotar compra')
})
it('leitura do cupom orienta com ilustração antes de abrir a câmera', () => {
  const html = renderToStaticMarkup(createElement(LerCupom, { fechar: vi.fn() }))
  expect(html).toContain('cf-estado-vazio')
  expect(html).toContain('Uma foto, tudo para conferir')
  expect(html).toContain('Tirar foto')
  expect(html).toContain('Escolher da galeria')
})
