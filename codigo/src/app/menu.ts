import type { NomeIcone } from '../componentes/Icone'
import { podeVerNoMenu, rotaPermitida, type Rota } from './rotas'

type Grupo = 'Dia a dia' | 'Patrimônio' | 'Equipe' | 'Conta'
interface Aba {
  r: Rota
  nome: string
  icone: NomeIcone
  grupo: Grupo
}

export const GRUPOS: readonly Grupo[] = ['Dia a dia', 'Patrimônio', 'Equipe', 'Conta']
const abas: readonly Aba[] = [
  { r: 'inicio', nome: 'Início', icone: 'inicio', grupo: 'Dia a dia' },
  { r: 'lancamentos', nome: 'Gastos e entradas', icone: 'lancamentos', grupo: 'Dia a dia' },
  { r: 'orcamento', nome: 'Meu orçamento', icone: 'orcamento', grupo: 'Dia a dia' },
  { r: 'cartoes', nome: 'Cartões', icone: 'cartoes', grupo: 'Dia a dia' },
  { r: 'casa', nome: 'Casa', icone: 'casa', grupo: 'Dia a dia' },
  { r: 'desejos', nome: 'Desejos', icone: 'desejos', grupo: 'Dia a dia' },
  { r: 'guardado', nome: 'Guardado', icone: 'guardado', grupo: 'Patrimônio' },
  { r: 'planejamento', nome: 'Planejamento', icone: 'planejamento', grupo: 'Patrimônio' },
  { r: 'escritorio', nome: 'Escritório', icone: 'escritorio', grupo: 'Equipe' },
  { r: 'ajustes', nome: 'Família e ajustes', icone: 'ajustes', grupo: 'Conta' },
  { r: 'privacidade', nome: 'Privacidade', icone: 'privacidade', grupo: 'Conta' },
  { r: 'painel', nome: 'Painel do dono', icone: 'painel', grupo: 'Conta' },
]
const barra: readonly Rota[] = ['inicio', 'orcamento', 'cartoes']

export function menuDoPapel(papel: Parameters<typeof rotaPermitida>[1], dono: boolean) {
  const lateral = abas.filter(({ r }) =>
    (podeVerNoMenu(r, papel) || r === 'privacidade') && rotaPermitida(r, papel, dono) === r)
  return { lateral, inferior: lateral.filter(({ r }) => barra.includes(r)),
    mais: lateral.filter(({ r }) => !barra.includes(r)) }
}
