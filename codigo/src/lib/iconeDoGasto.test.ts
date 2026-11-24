import { Coffee, Fuel, Gift, House, Pill, Shirt, ShoppingCart, Utensils, Zap } from 'lucide-react'
import { expect, it } from 'vitest'
import { iconeDoGasto } from './iconeDoGasto'

it('o ícone sai de palavras da descrição, sem acento e sem caixa alta', () => {
  expect(iconeDoGasto('Café')).toBe(Coffee)
  expect(iconeDoGasto('Farmácia')).toBe(Pill)
  expect(iconeDoGasto('RESTAURANTE')).toBe(Utensils)
  expect(iconeDoGasto('Presente de aniversário')).toBe(Gift)
  expect(iconeDoGasto('Combustível')).toBe(Fuel)
  expect(iconeDoGasto('Conta de luz')).toBe(Zap)
  expect(iconeDoGasto('Tênis e mochila em 6x (exemplo)')).toBe(Shirt)
  expect(iconeDoGasto('Hortifruti')).toBe(ShoppingCart)
})

it('palavra dentro de outra não conta, e sem acerto vem o limite da casa ou nada', () => {
  expect(iconeDoGasto('Gastronomia')).toBeNull()
  expect(iconeDoGasto('Coisa qualquer')).toBeNull()
  expect(iconeDoGasto('Coisa qualquer', 'Feira semanal')).toBe(ShoppingCart)
  expect(iconeDoGasto('Coisa qualquer', 'Casa mensal')).toBe(House)
  expect(iconeDoGasto(undefined)).toBeNull()
})
