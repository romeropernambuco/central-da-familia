// O ícone de cada gasto na lista (pedido do dono, 23/11/2026: "mais clean e com ícones").
// O lançamento não guarda categoria; o ícone sai de palavras da descrição (e, sem acerto, do nome do limite).
// Sem acerto nenhum, devolve null e a tela usa o ícone de sempre.
import {
  BookOpen,
  Bus,
  Car,
  Coffee,
  Droplets,
  Flame,
  Fuel,
  Gift,
  House,
  Pill,
  Scissors,
  Shirt,
  ShoppingCart,
  Utensils,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const sem = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** A ordem importa: a primeira palavra que bate vence ("café da escola" é café, "conta de luz" é luz). */
const REGRAS: [RegExp, LucideIcon][] = [
  [/\b(cafe|padaria|lanche|sorvete|pizza|pastel)\b/, Coffee],
  [/\b(restaurante|almoco|jantar|ifood|churrasco|hamburguer)\b/, Utensils],
  [/\b(mercad\w*|feira|hortifruti|supermercado|acougue|atacado|sacolao)\b/, ShoppingCart],
  [/\b(farmacia|remedio\w*|consulta|exame|dentista|medico)\b/, Pill],
  [/\b(combustivel|gasolina|etanol|posto)\b/, Fuel],
  [/\b(onibus|metro|passagem|trem)\b/, Bus],
  [/\b(uber|taxi|99|estacionamento|pedagio|oficina)\b/, Car],
  [/\b(luz|energia)\b/, Zap],
  [/\b(agua|esgoto)\b/, Droplets],
  [/\b(gas)\b/, Flame],
  [/\b(aluguel|condominio|internet|iptu|reforma)\b/, House],
  [/\b(presente|aniversario|festa)\b/, Gift],
  [/\b(livro\w*|escola|curso|material escolar|faculdade|mensalidade)\b/, BookOpen],
  [/\b(salao|barbeiro|cabelo|manicure|unha\w*)\b/, Scissors],
  [/\b(roupa\w*|tenis|sapato\w*|mochila|camisa|calca)\b/, Shirt],
]

export function iconeDoGasto(descricao: string | undefined | null, limite?: string | null): LucideIcon | null {
  const texto = sem(descricao || '')
  for (const [regra, icone] of REGRAS) if (regra.test(texto)) return icone
  // sem palavra conhecida: o limite da casa diz o suficiente (a feira é compra de mercado)
  if (/feira/.test(sem(limite || ''))) return ShoppingCart
  if (/casa/.test(sem(limite || ''))) return House
  return null
}
