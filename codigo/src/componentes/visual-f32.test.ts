import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { AvisoConvite } from '../telas/entrar/Entrar'
import { Carregando, ProtecaoCarga } from './Carregando'

it('explica a falha do convite com EstadoVazio ilustrado e sem expor email', () => {
 const html = renderToStaticMarkup(createElement(AvisoConvite, { mensagem: 'conta maria@example.com' }))
 expect(html).toContain('cf-estado-vazio')
 expect(html).toContain('<svg')
 expect(html).toContain('role="alert"')
 expect(html).not.toContain('maria@example.com')
})
it('anuncia carregamento com marca decorativa sem movimento obrigatório', () => {
 const html = renderToStaticMarkup(createElement(Carregando))
 expect(html).toContain('f32-carga')
 expect(html).toContain('role="status"')
 expect(html).toContain('focusable="false"')
})
it('oferece recuperacao ilustrada com uma acao acessivel', () => {
 const boundary = new ProtecaoCarga({ children: null })
 boundary.state = { erro: new Error('Falha de rede') }
 const html = renderToStaticMarkup(boundary.render())
 expect(html).toContain('cf-estado-vazio')
 expect(html).toContain('Tentar de novo')
 expect(html).toContain('role="alert"')
})
