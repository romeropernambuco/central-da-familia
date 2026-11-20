import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import * as base from './base'

it('impede novo envio durante carregamento e anuncia a espera sem perder o nome', () => {
  const html = renderToStaticMarkup(
    createElement(base.Botao, { carregando: true, type: 'submit', icone: 'salvo' }, 'Salvar'),
  )
  expect(html).toContain('disabled=""')
  expect(html).toContain('aria-busy="true"')
  expect(html).toContain('type="submit"')
  expect(html).toContain('Salvar')
  expect(html).not.toContain('role="img"')
})

it('oculta ícones decorativos e dá nome apenas aos que informam sozinhos', async () => {
  const { Icone } = await import('./Icone')
  const decorativo = renderToStaticMarkup(createElement(Icone, { nome: 'casa' }))
  expect(decorativo).toContain('aria-hidden="true"')
  expect(decorativo).toContain('stroke-width="1.75"')
  const informativo = renderToStaticMarkup(createElement(Icone, { nome: 'erro', rotulo: 'Falha ao salvar' }))
  expect(informativo).toContain('role="img"')
  expect(informativo).toContain('aria-label="Falha ao salvar"')
  expect(informativo).not.toContain('aria-hidden')
})

it('troca o substituto pela ilustração sem duplicar a informação ou perder a ação', () => {
  const html = renderToStaticMarkup(
    createElement(
      base.Vazio,
      {
        children: 'Nenhum im�vel',
        ico: 'substituto',
        ilustracao: createElement('svg', { 'aria-hidden': true }),
        acao: createElement('button', null, 'Cadastrar'),
      },
      'Nenhum imóvel',
    ),
  )
  expect(html).toContain('<svg aria-hidden="true"')
  expect(html).not.toContain('substituto')
  expect(html).toContain('Nenhum imóvel')
  expect(html).toContain('Cadastrar')
})
