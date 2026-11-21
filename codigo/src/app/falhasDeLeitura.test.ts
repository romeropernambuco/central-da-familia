import { afterEach, expect, it, vi } from 'vitest'
import { listaFalada } from '../componentes/FalhasDeLeitura'
import { falhaDeLeitura, falhasDeLeitura, limparFalhasDeLeitura, ouvirFalhasDeLeitura } from './falhasDeLeitura'
import { LeituraSubstituida } from '../lib/invalidacao'

afterEach(() => limparFalhasDeLeitura())

it('leitura de apoio que falha é anotada, sem repetir, e quem escuta é avisado', async () => {
  const aviso = vi.fn()
  const parar = ouvirFalhasDeLeitura(aviso)
  await Promise.reject(new Error('caiu')).catch(falhaDeLeitura('as faturas'))
  await Promise.reject(new Error('caiu de novo')).catch(falhaDeLeitura('as faturas'))
  await Promise.reject(new Error('caiu')).catch(falhaDeLeitura('os cartões'))
  expect(falhasDeLeitura()).toEqual(['as faturas', 'os cartões'])
  expect(aviso).toHaveBeenCalledTimes(3)
  parar()
})

it('leitura trocada por outra mais nova não conta como falha', async () => {
  await Promise.reject(new LeituraSubstituida()).catch(falhaDeLeitura('as faturas'))
  expect(falhasDeLeitura()).toEqual([])
})

it('limpar esvazia e avisa uma vez; limpar de novo não avisa à toa', () => {
  falhaDeLeitura('os cartões')(new Error('caiu'))
  const aviso = vi.fn()
  const parar = ouvirFalhasDeLeitura(aviso)
  limparFalhasDeLeitura()
  limparFalhasDeLeitura()
  expect(falhasDeLeitura()).toEqual([])
  expect(aviso).toHaveBeenCalledTimes(1)
  parar()
})

it('a lista sai do jeito que se fala', () => {
  expect(listaFalada([])).toBe('')
  expect(listaFalada(['as faturas'])).toBe('as faturas')
  expect(listaFalada(['as faturas', 'os cartões'])).toBe('as faturas e os cartões')
  expect(listaFalada(['as faturas', 'os cartões', 'os avisos'])).toBe('as faturas, os cartões e os avisos')
})
