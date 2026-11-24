// O ícone de cada gasto na lista (pedido do dono, 23/11/2026: "mais clean e com ícones").
// O lançamento não guarda categoria; o ícone sai de palavras da descrição (e, sem acerto, do nome do limite).
// Sem acerto nenhum, devolve null e a tela usa o ícone de sempre.
import {
  BookOpen,
  Briefcase,
  PawPrint,
  Tv,
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
const REGRAS: [RegExp, LucideIcon, string][] = [
  [/\b(cafe|padaria|lanche|lanchonete|sorvete|pizza|pastel|tapioca|acai)\b/, Coffee, 'Lanche e café'],
  [/\b(restaurante|almoco|jantar|ifood|churrasco|hamburguer|delivery)\b/, Utensils, 'Restaurante'],
  [/\b(mercad\w*|feira|hortifruti|supermercado|acougue|atacado|atacadao|sacolao)\b/, ShoppingCart, 'Mercado'],
  [/\b(farmacia|remedio\w*|consulta|exame|dentista|medico|academia|plano de saude)\b/, Pill, 'Saúde'],
  // 24/11: "gás do carro" é combustível, não o gás de cozinha (vem antes da regra do gás)
  [/\b(combustivel|gasolina|etanol|alcool|diesel|posto|gnv|gas do carro)\b/, Fuel, 'Combustível'],
  [/\b(onibus|metro|passagem|trem)\b/, Bus, 'Ônibus e metrô'],
  [/\b(uber|taxi|99|estacionamento|pedagio|oficina)\b/, Car, 'Carro e corrida'],
  [/\b(luz|energia)\b/, Zap, 'Luz'],
  [/\b(agua|esgoto)\b/, Droplets, 'Água'],
  [/\b(gas)\b/, Flame, 'Gás'],
  [/\b(aluguel|condominio|internet|iptu|reforma)\b/, House, 'Casa'],
  [/\b(presente|aniversario|festa)\b/, Gift, 'Presentes e festas'],
  [/\b(livro\w*|escola|curso|material escolar|faculdade|mensalidade)\b/, BookOpen, 'Escola e livros'],
  [/\b(salao|barbeiro|cabelo|manicure|unha\w*)\b/, Scissors, 'Beleza'],
  [/\b(roupa\w*|tenis|sapato\w*|mochila|camisa|calca)\b/, Shirt, 'Roupas'],
  [/\b(netflix|spotify|streaming|assinatura\w*|disney|globoplay|prime video)\b/, Tv, 'Assinaturas'],
  [/\b(pet|petshop|racao|veterinari\w*|banho e tosa)\b/, PawPrint, 'Bichos'],
  [/\b(trabalho|papelaria|escritorio)\b/, Briefcase, 'Trabalho'],
]

export type GrupoDoGasto = { nome: string; icone: LucideIcon | null }

/** O tipo do gasto (nome e ícone) para somar "onde foi o dinheiro". Sem acerto: "Outros". */
export function grupoDoGasto(descricao: string | undefined | null, limite?: string | null): GrupoDoGasto {
  const texto = sem(descricao || '')
  for (const [regra, icone, nome] of REGRAS) if (regra.test(texto)) return { nome, icone }
  // sem palavra conhecida: o limite da casa diz o suficiente (a feira é compra de mercado)
  if (/feira/.test(sem(limite || ''))) return { nome: 'Mercado', icone: ShoppingCart }
  if (/casa/.test(sem(limite || ''))) return { nome: 'Casa', icone: House }
  return { nome: 'Outros', icone: null }
}

export function iconeDoGasto(descricao: string | undefined | null, limite?: string | null): LucideIcon | null {
  return grupoDoGasto(descricao, limite).icone
}
