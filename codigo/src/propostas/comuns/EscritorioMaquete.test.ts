import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { carregarDadosInicio } from '../dadosExemplo'
import { EscritorioMaquete } from './EscritorioMaquete'
import { PrivacidadePropostas } from './privacidade'

it('destaca a sala, mostra oito plaquinhas e só renderiza o valor do balão com o olho aberto', async () => {
  const { funcionarios, aplicacoes } = await carregarDadosInicio()
  const svg = createElement(EscritorioMaquete, {
    funcionarios, salaDestacada: 'patrimonio', mostrarPlaquinhas: true, valores: { guardado: aplicacoes.total },
  })
  const aberto = renderToStaticMarkup(svg)
  expect(aberto).toContain('data-sala="patrimonio" data-destaque="true"')
  expect(aberto.match(/<foreignObject/g)).toHaveLength(8)
  expect(aberto).toContain('data-numero-financeiro="true"')
  expect(aberto).toContain('R$')

  const oculto = renderToStaticMarkup(createElement(PrivacidadePropostas.Provider, { value: true }, svg))
  expect(oculto).toContain('Valor oculto')
  expect(oculto).not.toContain('data-numero-financeiro')
  expect(oculto).not.toContain('R$')
})
