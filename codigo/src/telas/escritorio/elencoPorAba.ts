import inventario from './inventarioModelos.json'
import type { Papel } from '../../api/tipos'
import { SO_CASAL, type Rota } from '../../app/rotas'
import { APELIDO_BANCO, POR_ID, type SalaEquipe } from './equipe'

export const SALA_POR_ABA: Record<string, SalaEquipe> = {
  inicio: 'gestao',
  lancamentos: 'caixa',
  orcamento: 'cartoes',
  desejos: 'gestao',
  cartoes: 'cartoes',
  guardado: 'patrimonio',
  planejamento: 'caixa',
  casa: 'casa',
  escritorio: 'recepcao',
  ajustes: 'apoio',
  privacidade: 'apoio',
  painel: 'gestao',
}
export const PRINCIPAL_POR_ABA: Record<string, string> = {
  inicio: 'anfitriao',
  lancamentos: 'contador',
  orcamento: 'assistente',
  desejos: 'sonhadora',
  cartoes: 'cartao',
  guardado: 'guardado',
  planejamento: 'tesoureiro',
  casa: 'fiscal',
  escritorio: 'secretaria',
  ajustes: 'zelador',
  privacidade: 'protetora',
  painel: 'analista',
}
type Pergunta = { funcionario: string }
export function funcionarioAutorizado(id: string, papel: Papel, ehDono = false): boolean {
  const m = POR_ID[APELIDO_BANCO[id] || id]
  if (!m) return false
  if (papel === 'equipe') return ['fiscal', 'comprador', 'presenca', 'auditor'].includes(m.id)
  if (papel === 'pessoa')
    return (
      !SO_CASAL.includes(m.rota) &&
      !['fiscal', 'folha', 'presenca', 'auditor'].includes(m.id) &&
      (m.id !== 'analista' || ehDono)
    )
  return m.id !== 'analista' || ehDono
}
/** Só escolhe pessoas; não lê dados, relógio, storage nem cria perguntas. */
export function elencoDaAba({
  rota,
  papel,
  ehDono,
  perguntaPendente,
  subaba,
  filaGeral = [],
}: {
  rota: string
  papel: Papel
  ehDono: boolean
  perguntaPendente?: Pergunta | null
  subaba?: string
  filaGeral?: readonly Pergunta[]
}): { principal: string; secundarios: string[]; sala: SalaEquipe } {
  // Defesa para chamadas diretas fora do menu: não devolver especialistas financeiros proibidos.
  if (papel === 'equipe') rota = 'casa'
  if (papel === 'pessoa' && (SO_CASAL.includes(rota as Rota) || (rota === 'painel' && !ehDono))) rota = 'inicio'
  let principal = PRINCIPAL_POR_ABA[rota] || 'anfitriao'
  const secundarios: string[] = []
  const autorizado = (p: Pergunta) => funcionarioAutorizado(p.funcionario, papel, ehDono)
  const idDe = (p: Pergunta) => APELIDO_BANCO[p.funcionario] || p.funcionario
  if (rota === 'inicio') {
    const primeira = filaGeral.find(p => autorizado(p) && idDe(p) !== principal)
    secundarios.push(primeira ? idDe(primeira) : papel === 'casal' ? 'guardado' : 'contador')
  }
  if (rota === 'guardado' && papel === 'casal') secundarios.push('imoveis')
  if (rota === 'planejamento' && papel === 'casal') secundarios.push('colchao')
  if (rota === 'casa') {
    const aba = (subaba || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    const porSubaba: Record<string, string> = {
      lista: 'comprador',
      servicos: 'comprador',
      prestadores: 'comprador',
      gas: 'comprador',
      folha: 'folha',
      presenca: 'presenca',
      estoque: 'auditor',
    }
    if (papel === 'pessoa') principal = 'comprador'
    else {
      const dono =
        perguntaPendente && autorizado(perguntaPendente) && POR_ID[idDe(perguntaPendente)]?.rota === 'casa'
          ? idDe(perguntaPendente)
          : undefined
      const auxiliar = dono || porSubaba[aba]
      if (auxiliar && auxiliar !== principal && funcionarioAutorizado(auxiliar, papel, ehDono))
        secundarios.push(auxiliar)
    }
  }
  return { principal, secundarios, sala: SALA_POR_ABA[rota] || 'gestao' }
}

const comuns = ['floorFull', 'wall', 'chairDesk', 'computerScreen', 'computerKeyboard', 'computerMouse']
interface IdentidadeSala {
  mesa: string
  extras: string[]
  descricao: string
  paleta: { parede: number; piso: number; tapete: number }
  tapete: 'rugRectangle' | 'rugRound'
  exclusivas: string[]
  assinatura: string
  planta: string
}
export const VARIANTES: Record<SalaEquipe, IdentidadeSala> = {
  casa: {
    mesa: 'desk',
    extras: [
      'wallWindow',
      'bookcaseClosedWide',
      'plantSmall1',
      'lampRoundTable',
      'kitchenCoffeeMachine',
      'cardboardBoxClosed',
    ],
    descricao: 'Copa doméstica de terracota com despensa e bancada de café',
    paleta: { parede: 0xc97958, piso: 0xe7b88e, tapete: 0x713e31 },
    tapete: 'rugRectangle',
    exclusivas: ['bookcaseClosedWide', 'plantSmall1', 'lampRoundTable'],
    assinatura: 'Três vasinhos sobre a despensa baixa',
    planta: 'Janela à esquerda, despensa horizontal ao fundo e copa à direita',
  },
  cartoes: {
    mesa: 'desk',
    extras: ['bookcaseClosed', 'doorway', 'chair', 'cardboardBoxClosed'],
    descricao: 'Arquivo violeta vertical com passagem aberta e torre de faturas',
    paleta: { parede: 0x9172bb, piso: 0xc5b4da, tapete: 0x493969 },
    tapete: 'rugRectangle',
    exclusivas: ['bookcaseClosed', 'doorway', 'chair'],
    assinatura: 'Torre escalonada de três caixas junto ao portal aberto',
    planta: 'Arquivo à esquerda, portal isolado à direita, parede de fundo curta',
  },
  caixa: {
    mesa: 'deskCorner',
    extras: ['radio', 'lampSquareTable', 'wallCorner'],
    descricao: 'Contabilidade azul com mesa em L e rádio na ala lateral',
    paleta: { parede: 0x4f70c9, piso: 0xa4bee1, tapete: 0x254a71 },
    tapete: 'rugRectangle',
    exclusivas: ['deskCorner', 'radio', 'lampSquareTable'],
    assinatura: 'Rádio de madeira na ponta da mesa em L',
    planta: 'Canto recuado azul, parede lateral baixa e grande ala de cálculo',
  },
  patrimonio: {
    mesa: 'desk',
    extras: ['bookcaseOpen', 'books', 'loungeChair', 'tableCoffee', 'wallCorner'],
    descricao: 'Biblioteca verde com duas estantes e canto de leitura',
    paleta: { parede: 0x598664, piso: 0xb8c99a, tapete: 0x2e513c },
    tapete: 'rugRound',
    exclusivas: ['bookcaseOpen', 'books', 'loungeChair', 'tableCoffee'],
    assinatura: 'Estantes gêmeas de alturas diferentes e livros em três níveis',
    planta: 'Biblioteca à esquerda e poltrona de leitura à direita, canto aberto',
  },
  recepcao: {
    mesa: 'desk',
    extras: ['loungeSofa', 'sideTable', 'pottedPlant', 'kitchenCoffeeMachine', 'wallDoorway'],
    descricao: 'Salão de espera rosa com sofá e café no balcão lateral',
    paleta: { parede: 0xcc879b, piso: 0xe9c4cf, tapete: 0x873b5a },
    tapete: 'rugRound',
    exclusivas: ['loungeSofa', 'sideTable', 'pottedPlant'],
    assinatura: 'Sofá diagonal acompanhado de planta alta',
    planta: 'Entrada à esquerda, sofá à direita, balcão de café ao fundo',
  },
  gestao: {
    mesa: 'desk',
    extras: ['cabinetTelevision', 'chairCushion', 'plantSmall2', 'wallWindow'],
    descricao: 'Gabinete ocre com mesa larga e TV de apresentação',
    paleta: { parede: 0xc5b939, piso: 0xe5d393, tapete: 0x70591f },
    tapete: 'rugRectangle',
    exclusivas: ['cabinetTelevision', 'chairCushion', 'plantSmall2'],
    assinatura: 'TV elevada no aparador e duas cadeiras de reunião',
    planta: 'Janela panorâmica alta ao fundo, aparador à esquerda e reunião à direita',
  },
  apoio: {
    mesa: 'desk',
    extras: ['laptop', 'speaker', 'trashcan', 'cardboardBoxOpen', 'table', 'wallDoorway'],
    descricao: 'Oficina turquesa com bancada técnica, laptop e caixa aberta',
    paleta: { parede: 0x3ca6a0, piso: 0x9bd6ce, tapete: 0x205b61 },
    tapete: 'rugRectangle',
    exclusivas: ['laptop', 'speaker', 'trashcan', 'cardboardBoxOpen', 'table'],
    assinatura: 'Coluna de som ao lado do laptop de manutenção',
    planta: 'Bancada transversal à esquerda, passagem à direita e rodapé de fundo baixo',
  },
}
export const nomesDaSala = (sala: SalaEquipe) => [
  ...new Set([...comuns, VARIANTES[sala].tapete, VARIANTES[sala].mesa, ...VARIANTES[sala].extras]),
]
export const bytesDaSala = (sala: SalaEquipe) => nomesDaSala(sala).reduce((n, k) => n + (inventario as any)[k].bytes, 0)

export interface OrcamentoMini {
  desenhos: number
  triangulos: number
  KB: number
}
export interface PostoMini {
  id: string
  posicao: [number, number, number]
  escala: number
  /** Volume reservado ao posto inteiro em coordenadas da sala. */
  volume: { min: number[]; max: number[] }
}
export interface ComposicaoMini {
  sala: SalaEquipe
  ids: string[]
  removidos: string[]
  pecas: string[]
  postos: PostoMini[]
  orcamento: OrcamentoMini
}
export const LIMITES_MINI: OrcamentoMini = { desenhos: 40, triangulos: 60000, KB: 150 }
// Desenhos unitários com Anfitrião / triângulos estáticos / incremento por posto.
const CUSTO_SALA: Record<SalaEquipe, [number, number, number]> = {
  caixa: [23, 1693, 1085],
  casa: [27, 2419, 1033],
  cartoes: [24, 2031, 1033],
  patrimonio: [25, 2449, 1033],
  recepcao: [23, 1813, 1033],
  gestao: [25, 2009, 1033],
  apoio: [23, 1725, 1033],
}
// Máximos dos quatro estados: sinal ou joinha, conforme o responsável.
const DESENHOS_RIG: Record<string, number> = {
  contador: 12,
  colchao: 12,
  tesoureiro: 12,
  folha: 11,
  comprador: 11,
  fiscal: 13,
  cartao: 11,
  assistente: 11,
  guardado: 11,
  imoveis: 12,
  usina: 13,
  secretaria: 11,
  presenca: 10,
  auditor: 12,
  anfitriao: 10,
  sonhadora: 10,
  analista: 13,
  zelador: 11,
  protetora: 10,
}
const DESENHOS_SALA: Record<SalaEquipe, number> = {
  caixa: 8,
  casa: 11,
  cartoes: 9,
  patrimonio: 10,
  recepcao: 8,
  gestao: 10,
  apoio: 8,
}
const TRIANGULOS_RIG: Record<string, number> = {
  contador: 684,
  colchao: 528,
  tesoureiro: 456,
  folha: 636,
  comprador: 480,
  fiscal: 540,
  cartao: 552,
  assistente: 480,
  guardado: 1036,
  imoveis: 468,
  usina: 564,
  secretaria: 552,
  presenca: 528,
  auditor: 576,
  anfitriao: 420,
  sonhadora: 444,
  analista: 504,
  zelador: 468,
  protetora: 432,
}
/** Pura: sem DOM, carga ou mutação de ids. O principal nunca é descartado.
 * O teto opcional permite simular limites menores em testes. */
export function composicaoMini(sala: SalaEquipe, ids: readonly string[], limites = LIMITES_MINI): ComposicaoMini {
  const candidatos = [...new Set(ids)].slice(0, 3),
    removidos = [...new Set(ids)].slice(3)
  if (!candidatos.length) throw Error('mini precisa de um principal')
  const prever = (n: number): OrcamentoMini => ({
    desenhos:
      n === 1
        ? CUSTO_SALA[sala][0] + (DESENHOS_RIG[candidatos[0]] || 13) - 10
        : DESENHOS_SALA[sala] + candidatos.reduce((s, id) => s + (DESENHOS_RIG[id] || 13), 0),
    triangulos:
      CUSTO_SALA[sala][1] +
      (n - 1) * CUSTO_SALA[sala][2] +
      (n === 1 ? 72 : 0) +
      candidatos.reduce((s, id) => s + (TRIANGULOS_RIG[id] || 1500), 0),
    KB: bytesDaSala(sala) / 1000,
  })
  let orcamento = prever(candidatos.length)
  while (
    candidatos.length > 1 &&
    (orcamento.desenhos > limites.desenhos || orcamento.triangulos > limites.triangulos || orcamento.KB > limites.KB)
  ) {
    removidos.unshift(candidatos.pop()!)
    orcamento = prever(candidatos.length)
  }
  const coletivo = candidatos.length > 1
  const postos = candidatos.map((id, i): PostoMini => {
    const x = !coletivo || i === 0 ? 0 : i === 1 ? 1.45 : -1.45
    const z = !coletivo ? 0 : i === 0 ? 0.35 : -0.45,
      escala = i ? 0.78 : 1
    const meiaLargura = sala === 'gestao' ? 0.8 : 0.75
    return {
      id,
      posicao: [x, 0, z],
      escala,
      volume: {
        min: [x - meiaLargura * escala, 0, z - 0.3 * escala],
        max: [x + meiaLargura * escala, 1.9 * escala, z + 1.04 * escala],
      },
    }
  })
  return { sala, ids: candidatos, removidos, pecas: nomesDaSala(sala), postos, orcamento }
}
