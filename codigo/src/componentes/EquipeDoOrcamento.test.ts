import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { EquipeDoOrcamento, type Estacao } from './EquipeDoOrcamento'

const estacoes: Estacao[] = ['Assistente', 'Analista', 'Tesoureira', 'Comprador'].map((nome, i) => ({
  id: nome.toLowerCase(),
  nome,
  cuida: ['Hoje', 'Semana e mês', 'Sobra', 'Compras'][i],
  img: `/orcamento-3d/agente-${i}.webp`,
  fala: `Fala de ${nome}.`,
  alvo: 'oHoje',
  acao: { rotulo: 'Ver', fazer() {} },
}))

describe('palco do Meu orçamento', () => {
  it('sem WebGL (teste, aparelho antigo) mostra as figuras paradas, mesmo com a sala 3D ligada', () => {
    const abrir = vi.fn(() => () => {})
    const comSala = renderToStaticMarkup(createElement(EquipeDoOrcamento, { estacoes, cena: abrir }))
    const semSala = renderToStaticMarkup(createElement(EquipeDoOrcamento, { estacoes }))
    expect(comSala).toBe(semSala)
    expect(abrir).not.toHaveBeenCalled()
    expect(comSala).not.toContain('orc-cena')
    expect(comSala.match(/<img /g)).toHaveLength(4)
    for (const e of estacoes) expect(comSala).toContain(e.img)
  })

  it('o plano B mantém o balão e os quatro botões com nome, marcando o ativo', () => {
    const html = renderToStaticMarkup(createElement(EquipeDoOrcamento, { estacoes }))
    expect(html).toContain('Fala de Assistente.')
    expect(html.match(/class="orc-agente"/g)).toHaveLength(4)
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html).toContain('aria-label="Equipe do seu orçamento"')
  })
})
