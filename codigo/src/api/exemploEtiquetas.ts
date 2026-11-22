import type { Api, Etiqueta, Papel } from './tipos'
import { hojeRecife, somaDias } from '../lib/formato'
import { MAX_ETIQUETAS, cambioDoGasto, etiquetasDaData, resumirEtiqueta, simularEtiqueta } from '../lib/etiquetas'

/**
 * Etiquetas da família de exemplo: imitam as funções do banco (produto.etiqueta_*), com número inventado.
 * Ficam fora do estado principal do exemplo de propósito: a cópia de segurança de exemplo continua com o mesmo formato.
 */
type Base = Omit<Etiqueta, 'total' | 'lancamentos'>
interface GastoEx {
  id: string
  valor: number
  data: string
  envelope_id: string
  autor?: string
}
/** O que o exemplo principal empresta: quem está olhando e os gastos que não estão na lixeira. */
export interface MundoEtiquetas {
  papel(): Papel
  eu(): string
  gastos(): GastoEx[]
  nomeEnvelope(id: string): string
  /** casal e pessoas da família (a equipe não conta) */
  pessoasDaFamilia(): number
}

let etiquetas: Base[] = []
/** lancamento -> etiqueta -> está ativa (false guarda que foi tirada à mão e não volta sozinha) */
let ligacoes = new Map<string, Map<string, boolean>>()
let moedas = new Map<string, { moeda: string; valor: number; cambio: number }>()
let n = 0
let semeado = false

/** `vazia`: a família nova (?como=nova) começa sem etiqueta nenhuma. */
export function reiniciarEtiquetasEx(vazia = false) {
  const hoje = hojeRecife()
  etiquetas = vazia
    ? []
    : [
        {
          id: 'etq-europa',
          nome: 'Europa (exemplo)',
          inicio: somaDias(hoje, -6),
          fim: somaDias(hoje, 3),
          moeda: 'EUR',
          pessoas: null,
          arquivada: false,
        },
        {
          id: 'etq-festa',
          nome: 'Festa de 15 anos',
          inicio: null,
          fim: null,
          moeda: 'BRL',
          pessoas: null,
          arquivada: false,
        },
      ]
  ligacoes = new Map()
  moedas = new Map()
  n = 0
  semeado = false
}
reiniciarEtiquetasEx()

const ativasDo = (lancamento: string) =>
  [...(ligacoes.get(lancamento) || [])].filter(([, ativa]) => ativa).map(([id]) => id)
function ligar(lancamento: string, etiqueta: string, ativa: boolean) {
  const m = ligacoes.get(lancamento) || new Map<string, boolean>()
  m.set(etiqueta, ativa)
  ligacoes.set(lancamento, m)
}
/** Igual ao banco: o gasto novo (ou já anotado) no período recebe a etiqueta, menos o que foi tirado à mão e o que já tem 3. */
function aplicarPeloPeriodo(e: Base, gastos: GastoEx[]) {
  let aplicadas = 0
  for (const g of gastos) {
    if (!etiquetasDaData([e], g.data).length) continue
    if (ligacoes.get(g.id)?.has(e.id) || ativasDo(g.id).length >= MAX_ETIQUETAS) continue
    ligar(g.id, e.id, true)
    aplicadas++
  }
  return aplicadas
}

function gastosDa(m: MundoEtiquetas, etiqueta: string) {
  return m
    .gastos()
    .filter(g => ligacoes.get(g.id)?.get(etiqueta))
    .map(g => ({
      valor: g.valor,
      data: g.data,
      envelope: m.nomeEnvelope(g.envelope_id),
      moeda_original: moedas.get(g.id)?.moeda ?? null,
      valor_original: moedas.get(g.id)?.valor ?? null,
    }))
}
const soCasal = (m: MundoEtiquetas, frase: string) => {
  if (m.papel() !== 'casal') throw new Error(frase)
}
function achar(id: string) {
  const e = etiquetas.find(x => x.id === id)
  if (!e) throw new Error('Etiqueta não encontrada.')
  return e
}

/** O gasto da moeda de fora, pra lista de gastos do exemplo mostrar igual ao banco. */
export const moedaDoGastoEx = (lancamento: string) => {
  const x = moedas.get(lancamento)
  return x ? { moeda_original: x.moeda, valor_original: x.valor, cambio: x.cambio } : {}
}
/** Chamado pelo exemplo a cada gasto novo: as etiquetas do período entram sozinhas. */
export function aoLancarEx(gasto: GastoEx) {
  for (const e of etiquetas.filter(x => !x.arquivada)) aplicarPeloPeriodo(e, [gasto])
}

type AcoesEtiqueta = Required<
  Pick<
    Api,
    | 'etiquetas'
    | 'etiquetaSalvar'
    | 'etiquetar'
    | 'etiquetasDoLancamento'
    | 'lancamentoMoeda'
    | 'etiquetaResumo'
    | 'etiquetaSimular'
  >
>

export function etiquetasDeExemplo(m: MundoEtiquetas): AcoesEtiqueta {
  const pessoasDe = (e: Base) => e.pessoas ?? (m.pessoasDaFamilia() || null)
  const comTotal = (e: Base): Etiqueta => {
    const gs = gastosDa(m, e.id)
    return {
      ...e,
      total: m.papel() === 'casal' ? resumirEtiqueta(e, gs, null).total : null,
      lancamentos: gs.length,
    }
  }
  // a 1ª leitura aplica as etiquetas com período nos gastos que o exemplo já tinha
  const preparar = () => {
    for (const e of etiquetas.filter(x => !x.arquivada && x.inicio)) aplicarPeloPeriodo(e, m.gastos())
    if (semeado) return
    semeado = true
    // pro exemplo ter o que mostrar: 1 gasto "pago antes" (como uma passagem) e 1 gasto anotado em euro
    const europa = etiquetas.find(x => x.id === 'etq-europa')
    if (!europa?.inicio) return
    const antes = m.gastos().find(g => g.data < europa.inicio!)
    if (antes) ligar(antes.id, europa.id, true)
    const durante = m.gastos().find(g => ligacoes.get(g.id)?.get(europa.id) && g.data >= europa.inicio!)
    if (durante) {
      const emEuro = Math.round((durante.valor / 6.2) * 100) / 100
      moedas.set(durante.id, { moeda: 'EUR', valor: emEuro, cambio: cambioDoGasto(durante.valor, emEuro) })
    }
  }
  return {
    async etiquetas(_f, incluirArquivadas = false) {
      if (m.papel() === 'equipe') throw new Error('Sem permissão.')
      preparar()
      return etiquetas
        .filter(e => incluirArquivadas || !e.arquivada)
        .map(comTotal)
        .sort((a, b) => (b.inicio || '').localeCompare(a.inicio || '') || a.nome.localeCompare(b.nome))
    },
    async etiquetaSalvar(_f, nova, id) {
      soCasal(m, 'Só o casal cria e muda etiqueta.')
      const nome = nova.nome.trim()
      if (etiquetas.some(e => e.id !== id && e.nome.toLowerCase() === nome.toLowerCase()))
        throw new Error('Já existe uma etiqueta com esse nome.')
      const e: Base = {
        id: id || 'etq-' + ++n,
        nome,
        inicio: nova.inicio,
        fim: nova.fim,
        moeda: nova.moeda.trim().toUpperCase() || 'BRL',
        pessoas: nova.pessoas,
        arquivada: !!nova.arquivada,
      }
      if (id) Object.assign(achar(id), e)
      else etiquetas.push(e)
      const aplicada_em = e.inicio && !e.arquivada ? aplicarPeloPeriodo(e, m.gastos()) : 0
      return { etiqueta: comTotal(e), aplicada_em }
    },
    async etiquetar(lancamento, etiqueta, ativa) {
      soCasal(m, 'Só o casal marca e desmarca etiqueta.')
      achar(etiqueta)
      if (ativa && !ligacoes.get(lancamento)?.get(etiqueta) && ativasDo(lancamento).length >= MAX_ETIQUETAS)
        throw new Error('Cada gasto aceita até 3 etiquetas.')
      ligar(lancamento, etiqueta, ativa)
    },
    async etiquetasDoLancamento(lancamento) {
      if (m.papel() === 'equipe') return []
      preparar()
      return ativasDo(lancamento)
    },
    async lancamentoMoeda(lancamento, valorOriginal, moeda) {
      const g = m.gastos().find(x => x.id === lancamento)
      if (!g || (m.papel() !== 'casal' && g.autor !== m.eu())) throw new Error('Só quem lançou muda esse gasto.')
      if (valorOriginal == null) {
        moedas.delete(lancamento)
        return
      }
      if (!(valorOriginal > 0)) throw new Error('O valor na moeda de fora tem que ser maior que zero.')
      const usada =
        moeda ||
        ativasDo(lancamento)
          .map(achar)
          .find(e => e.moeda !== 'BRL')?.moeda
      if (!usada || usada === 'BRL') throw new Error('Informe a moeda de fora, como EUR ou USD.')
      moedas.set(lancamento, { moeda: usada, valor: valorOriginal, cambio: cambioDoGasto(g.valor, valorOriginal) })
    },
    async etiquetaResumo(etiqueta) {
      soCasal(m, 'Só o casal vê os totais da etiqueta.')
      preparar()
      const e = achar(etiqueta)
      return { etiqueta: { ...e }, ...resumirEtiqueta(e, gastosDa(m, e.id), pessoasDe(e)) }
    },
    async etiquetaSimular(etiqueta, dias, pessoas) {
      soCasal(m, 'Só o casal vê os totais da etiqueta.')
      preparar()
      const e = achar(etiqueta)
      return {
        ...simularEtiqueta(resumirEtiqueta(e, gastosDa(m, e.id), pessoasDe(e)), dias, pessoas),
        aviso:
          'Estimativa com o gasto real desta viagem. Passagem e hotel mudam por destino e data: confirme o preço do dia.',
      }
    },
  }
}
