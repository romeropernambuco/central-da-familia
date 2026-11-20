import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { apiExemplo } from '../../api/exemplo'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { Privacidade } from './Privacidade'

/** O termo como a pessoa lê, por papel: só o texto, com espaços normalizados. */
function termo(papel: 'casal' | 'pessoa' | 'equipe') {
  const contexto = {
    api: apiExemplo,
    familia: { id: 'fam-silva', nome: 'Família de teste', papel, membroId: 'm', membroNome: 'Ana' },
    sessao: { userId: 'u', dono: false, familias: [] },
    oculto: false,
    versao: 0,
    toast() {},
    tentar: async () => true,
    sair: async () => {},
    alternarOculto() {},
  } as unknown as Ctx
  const html = renderToStaticMarkup(
    createElement(ContextoApp.Provider, { value: contexto }, createElement(Privacidade)),
  )
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
}

// Trava de função devolvida (inventário A3.5): estes três textos davam confiança e tinham sido cortados.
it.each(['casal', 'pessoa', 'equipe'] as const)('%s lê o que não guardamos e o que a IA faz e não faz', papel => {
  const texto = termo(papel)
  expect(texto).toContain('Não guardamos senha de banco nem o número do cartão.')
  expect(texto).toContain('As contas de dinheiro são feitas pelo app e pelo banco de dados, nunca pela IA.')
  expect(texto).toContain('A IA só lê a foto do cupom quando você manda')
})

it('os direitos da LGPD aparecem para a família, com o texto certo para cada papel, e não para quem ajuda na casa', () => {
  expect(termo('casal')).toContain('Seus direitos (LGPD)')
  expect(termo('casal')).toContain('Você pode baixar tudo a qualquer hora e apagar a família inteira.')
  expect(termo('pessoa')).toContain(
    'Você pode baixar os seus dados a qualquer hora. Apagar a família inteira é com o casal.',
  )
  expect(termo('equipe')).not.toContain('LGPD')
})
