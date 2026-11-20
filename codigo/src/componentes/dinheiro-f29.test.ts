import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import type { Envelope } from '../api/tipos'
const estado = vi.hoisted(() => ({ oculto: false }))
vi.mock('../app/contexto', () => ({ useApp: () => ({ oculto: estado.oculto, familia: { papel: 'casal' } }) }))
vi.mock('../app/useMembros', () => ({ useAdultos: () => 2 }))
import { EnvelopeCard } from './EnvelopeCard'
import { FaixaDoMes } from '../telas/lancamentos/Lancamentos'
const envelope = {
  id: 'e',
  nome: 'Pessoal',
  regra: 'mensal',
  limite_mes: 1000,
  gasto_mes: 100,
  livre: 900,
  casa: true,
} as Envelope
beforeEach(() => {
  estado.oculto = false
})
it('usa chip semântico e ação nomeada no envelope', () => {
  const html = renderToStaticMarkup(createElement(EnvelopeCard, { e: envelope, diasRestantes: 10, onClick() {} }))
  expect(html).toContain('icone-chip')
  expect(html).toContain('aria-label="Anotar em Pessoal"')
  expect(html).toContain('lucide-plus')
})
it('não desenha o uso do limite com o olho fechado', () => {
  estado.oculto = true
  const html = renderToStaticMarkup(createElement(EnvelopeCard, { e: envelope, diasRestantes: 10 }))
  expect(html).not.toContain('class="meter')
})
it('agrupa realizado em indicadores com ícones e saldo em destaque', () => {
  const html = renderToStaticMarkup(
    createElement(FaixaDoMes, { totais: { entrou: 300, saiu: 100, saldo: 200, previsto: 50 } }),
  )
  expect(html).toContain('mes-indicadores')
  expect(html).toContain('indicador-principal')
  expect(html).toContain('lucide-arrow-down-left')
})
it('mantém a mesma geometria e cor com uso pequeno ou acima do limite quando oculto', () => {
  estado.oculto = true
  const desenhar = (gasto_mes: number, livre: number) =>
    renderToStaticMarkup(createElement(EnvelopeCard, { e: { ...envelope, gasto_mes, livre }, diasRestantes: 10 }))
  expect(desenhar(10, 990)).toBe(desenhar(9999, -8999))
})
it('o vazio do Início usa EstadoVazio com ilustração e conserva a ação', async () => {
  const { SemGastosInicio } = await import('../telas/inicio/Inicio')
  const { EstadoVazioVisual } = await import('./EstadoVazioVisual')
  const { SemGastos } = await import('./ilustracoes/figuras')
  const anotar = vi.fn()
  const elemento = SemGastosInicio({ anotar })
  expect(elemento.type).toBe(EstadoVazioVisual)
  expect(elemento.props.ilustracao.type).toBe(SemGastos)
  elemento.props.acao.aoClicar()
  expect(anotar).toHaveBeenCalledTimes(1)
  const html = renderToStaticMarkup(elemento)
  expect(html).toContain('cf-estado-vazio')
  expect(html).toContain('aria-labelledby=')
  expect(html).toContain('Anotar gasto')
})
