import { afterEach, expect, it } from 'vitest'
import { esconderValores, linkWhatsApp } from './lib/formato'
import { igual } from './lib/mescla'
import protegida from './api/protegida.ts?raw'

afterEach(() => esconderValores(false))
const texto = (url: string) => decodeURIComponent(url.split('text=')[1])

it('convite com o olho fechado: mensagem com dado da família vira aviso legível; indicação a amigos sai inteira', () => {
  esconderValores(true)
  expect(texto(linkWhatsApp('Oi, Caio! Abre este link.'))).toBe('Conteúdo oculto.')
  expect(texto(linkWhatsApp('Tô usando a Central da Família.', true))).toBe('Tô usando a Central da Família.')
  esconderValores(false)
  expect(texto(linkWhatsApp('Oi, Caio! Abre este link.'))).toBe('Oi, Caio! Abre este link.')
})

it('desfazer compara sem depender da ordem das chaves que o banco devolve', () => {
  expect(igual({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true)
  expect(protegida).toContain("import { igual } from '../lib/mescla'")
  expect(protegida).not.toContain('JSON.stringify(a) === JSON.stringify(b)')
})
