// O guia da viagem (pedido do dono, 22/11/2026): "um guia que a gente consiga construir como seria essa viagem: quanto
// gasta com hospedagem, avião, quantas pessoas, se é Airbnb, comida, transporte; tudo tem que estar previsto e o app
// tem que antecipar". A família escolhe o tipo de viagem, a temporada, quantas pessoas e noites; o app monta os itens
// com as estimativas pesquisadas (lib/guiaViagemPadroes.ts) e a família troca pelos valores que cotar.
// O que se paga antes (avião, hospedagem, seguro) vira o pacote parcelado; o que se gasta lá, mais o custo da moeda
// estrangeira e a margem de imprevisto, vira o cofrinho. Valores em reais.
import {
  AEROPORTO_RECIFE_DIA,
  CONTA_GLOBAL_TOTAL_PCT,
  ESTIMATIVAS,
  IOF_EXTERIOR_PCT,
  SPREAD_CARTAO_PCT,
  type Confianca,
  type PerfilViagem,
} from './guiaViagemPadroes'

/** Como o valor do item se multiplica. */
export type ContaItem = 'viagem' | 'pessoa' | 'noite' | 'pessoa_dia' | 'dia' | 'adulto_noite' | 'trecho_mala'
export type QuandoPaga = 'antes' | 'la'
export interface ItemGuia {
  id: string
  nome: string
  conta: ContaItem
  /** valor unitário em reais (por pessoa, por noite, por pessoa por dia...) */
  valor: number
  quando: QuandoPaga
  /** cobrado em moeda de fora: paga IOF e spread */
  estrangeira: boolean
  /** a família trocou a estimativa pelo valor que cotou */
  cotado: boolean
  confianca: Confianca
  fonte: string
}
export type Hospedagem = 'hotel' | 'airbnb' | 'casa'
export type PagamentoLa = 'cartao' | 'conta_global'
export interface GuiaViagem {
  perfil: PerfilViagem
  temporada: 'baixa' | 'alta'
  adultos: number
  /** crianças de 2 anos ou mais (assento inteiro; comida e passeios a 70%) */
  criancas: number
  /** bebês de colo, até 2 anos (passagem até 10%, regra da ANAC) */
  bebes: number
  noites: number
  hospedagem: Hospedagem
  pagamento: PagamentoLa
  /** margem para imprevisto, em % (10% nacional, 15% fora do Brasil) */
  imprevisto_pct: number
  itens: ItemGuia[]
}

const c2 = (v: number) => Math.round(v * 100) / 100
/** comida e passeios: criança conta 70% de um adulto (estimativa sem fonte, editável trocando o valor) */
const CRIANCA_PARCIAL = 0.7

/** Quantas vezes o valor do item entra no total. */
export function vezes(i: Pick<ItemGuia, 'id' | 'conta'>, g: GuiaViagem): number {
  const pessoas = g.adultos + g.criancas
  const dias = g.noites + 1
  const parcial = i.id === 'comida' || i.id === 'passeios'
  const p = parcial ? g.adultos + g.criancas * CRIANCA_PARCIAL : pessoas
  switch (i.conta) {
    case 'viagem':
      return 1
    case 'noite':
      return g.noites
    case 'dia':
      return dias
    case 'pessoa':
      return i.id === 'aviao' ? c2(pessoas + g.bebes * 0.1) : pessoas
    case 'pessoa_dia':
      return c2(p * dias)
    case 'adulto_noite':
      return g.adultos * Math.min(g.noites, 7)
    case 'trecho_mala':
      return Math.ceil(pessoas / 2) * 2
  }
}

/** Monta o guia com as estimativas pesquisadas do tipo de viagem. */
export function guiaPadrao(x: {
  perfil: PerfilViagem
  temporada: 'baixa' | 'alta'
  adultos: number
  criancas: number
  bebes: number
  noites: number
  hospedagem: Hospedagem
  pagamento?: PagamentoLa
}): GuiaViagem {
  const e = ESTIMATIVAS[x.perfil]
  const fora = e.estrangeira
  const it = (
    id: string,
    nome: string,
    conta: ContaItem,
    est: { valor: number; confianca: Confianca; fonte: string },
    quando: QuandoPaga,
    estrangeira = fora,
  ): ItemGuia => ({
    id,
    nome,
    conta,
    valor: est.valor,
    quando,
    estrangeira,
    cotado: false,
    confianca: est.confianca,
    fonte: est.fonte,
  })
  const aviao = x.temporada === 'alta' ? e.aviao_alta : e.aviao_baixa
  const itens: (ItemGuia | null)[] = [
    it('aviao', 'Passagem de avião, ida e volta', 'pessoa', aviao, 'antes', false),
    e.mala_trecho.valor > 0
      ? it('mala', 'Mala despachada (1 para cada 2 pessoas, por trecho)', 'trecho_mala', e.mala_trecho, 'antes', false)
      : null,
    x.hospedagem === 'hotel'
      ? it('hospedagem', 'Hotel para a família, por noite', 'noite', e.hotel_noite, 'antes')
      : null,
    x.hospedagem === 'airbnb'
      ? it('hospedagem', 'Airbnb, casa inteira, por noite', 'noite', e.airbnb_noite, 'antes')
      : null,
    x.hospedagem === 'airbnb'
      ? it(
          'taxas_airbnb',
          `Limpeza e taxa de serviço do Airbnb (${e.airbnb_servico_pct}%)`,
          'viagem',
          {
            valor: c2(e.airbnb_limpeza + (e.airbnb_noite.valor * x.noites * e.airbnb_servico_pct) / 100),
            confianca: 'media',
            fonte:
              'limpeza mediana R$ 145 (AirROI); serviço de 14% a 16,5% (Izistays 2026). Alguns anúncios já incluem a taxa.',
          },
          'antes',
        )
      : null,
    e.seguro_dia.valor > 0 ? it('seguro', 'Seguro viagem', 'pessoa_dia', e.seguro_dia, 'antes', false) : null,
    e.documentos.valor > 0 ? it('documentos', 'Documentos de entrada (ETIAS)', 'pessoa', e.documentos, 'antes') : null,
    it(
      'aeroporto',
      'Estacionamento no aeroporto do Recife',
      'dia',
      {
        valor: AEROPORTO_RECIFE_DIA,
        confianca: 'media',
        fonte: 'Movepark: R$ 24 por dia no balcão, R$ 19,90 com reserva',
      },
      'la',
      false,
    ),
    it('transfer', 'Transfer do aeroporto lá, ida e volta', 'viagem', e.transfer, 'la'),
    it('comida', 'Comida', 'pessoa_dia', e.comida_dia, 'la'),
    it('transporte', 'Transporte lá (metrô, táxi, Uber)', 'pessoa_dia', e.transporte_dia, 'la'),
    it('passeios', 'Passeios e ingressos', 'pessoa_dia', e.passeios_dia, 'la'),
    e.taxa_turismo_noite
      ? it('taxa_turismo', 'Taxa de turismo (adultos, até 7 noites)', 'adulto_noite', e.taxa_turismo_noite, 'la')
      : null,
  ]
  return {
    perfil: x.perfil,
    temporada: x.temporada,
    adultos: x.adultos,
    criancas: x.criancas,
    bebes: x.bebes,
    noites: x.noites,
    hospedagem: x.hospedagem,
    pagamento: x.pagamento || 'cartao',
    imprevisto_pct: e.imprevisto_pct,
    itens: itens.filter((i): i is ItemGuia => !!i && i.valor > 0),
  }
}

/** O custo de pagar em moeda de fora: IOF e spread no cartão de banco; conta global já tem tudo dentro. */
export const custoMoedaPct = (g: Pick<GuiaViagem, 'pagamento'>) =>
  g.pagamento === 'conta_global' ? CONTA_GLOBAL_TOTAL_PCT : IOF_EXTERIOR_PCT + SPREAD_CARTAO_PCT

export interface SomaGuia {
  linhas: { item: ItemGuia; vezes: number; total: number }[]
  antes: number
  la: number
  /** IOF e spread sobre o que é cobrado em moeda de fora */
  moeda: number
  imprevisto: number
  /** o que vai para o pacote (pago antes, parcelável) e para o cofrinho (lá + margem) */
  pacote: number
  custosLa: number
  total: number
}

export function somarGuia(g: GuiaViagem): SomaGuia {
  const pct = custoMoedaPct(g)
  let moeda = 0
  const linhas = g.itens.map(item => {
    const n = vezes(item, g)
    const total = c2(item.valor * n)
    if (item.estrangeira) moeda += (total * pct) / 100
    return { item, vezes: n, total }
  })
  const antes = c2(linhas.filter(l => l.item.quando === 'antes').reduce((s, l) => s + l.total, 0))
  const la = c2(linhas.filter(l => l.item.quando === 'la').reduce((s, l) => s + l.total, 0))
  moeda = c2(moeda)
  const imprevisto = c2(((antes + la + moeda) * g.imprevisto_pct) / 100)
  // IOF da hospedagem paga antes cai na fatura junto: vai para o pacote; o resto e a margem ficam no cofrinho
  const moedaAntes = c2(
    (linhas.filter(l => l.item.quando === 'antes' && l.item.estrangeira).reduce((s, l) => s + l.total, 0) * pct) / 100,
  )
  return {
    linhas,
    antes,
    la,
    moeda,
    imprevisto,
    pacote: c2(antes + moedaAntes),
    custosLa: c2(la + moeda - moedaAntes + imprevisto),
    total: c2(antes + la + moeda + imprevisto),
  }
}

const CONTAS: ContaItem[] = ['viagem', 'pessoa', 'noite', 'pessoa_dia', 'dia', 'adulto_noite', 'trecho_mala']
const CONF: Confianca[] = ['alta', 'media', 'baixa', 'sem_fonte']
/** O guia que veio guardado: só passa o que tem formato certo. */
export function lerGuia(v: unknown): GuiaViagem | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const o = v as Partial<GuiaViagem>
  if (!o.perfil || !(o.perfil in ESTIMATIVAS) || !Array.isArray(o.itens)) return null
  const int = (x: unknown, min: number, max: number, p: number) =>
    typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max ? x : p
  return {
    perfil: o.perfil,
    temporada: o.temporada === 'alta' ? 'alta' : 'baixa',
    adultos: int(o.adultos, 1, 20, 2),
    criancas: int(o.criancas, 0, 20, 0),
    bebes: int(o.bebes, 0, 10, 0),
    noites: int(o.noites, 1, 90, 7),
    hospedagem: o.hospedagem === 'airbnb' || o.hospedagem === 'casa' ? o.hospedagem : 'hotel',
    pagamento: o.pagamento === 'conta_global' ? 'conta_global' : 'cartao',
    imprevisto_pct: int(o.imprevisto_pct, 0, 50, 10),
    itens: o.itens.flatMap((i): ItemGuia[] =>
      i &&
      typeof i.id === 'string' &&
      typeof i.nome === 'string' &&
      CONTAS.includes(i.conta) &&
      typeof i.valor === 'number' &&
      i.valor >= 0 &&
      (i.quando === 'antes' || i.quando === 'la')
        ? [
            {
              id: i.id,
              nome: i.nome.slice(0, 80),
              conta: i.conta,
              valor: c2(i.valor),
              quando: i.quando,
              estrangeira: !!i.estrangeira,
              cotado: !!i.cotado,
              confianca: CONF.includes(i.confianca) ? i.confianca : 'sem_fonte',
              fonte: typeof i.fonte === 'string' ? i.fonte.slice(0, 200) : '',
            },
          ]
        : [],
    ),
  }
}

const mesesAte = (de: string, ate: string) =>
  (Number(ate.slice(0, 4)) - Number(de.slice(0, 4))) * 12 + Number(ate.slice(5)) - Number(de.slice(5))

/** O que o app antecipa: o que costuma pegar a família desprevenida, conforme o guia e a data. */
export function avisosDoGuia(g: GuiaViagem, mesViagem: string, mesHoje: string): string[] {
  const e = ESTIMATIVAS[g.perfil]
  const out: string[] = []
  const faltam = mesesAte(mesHoje, mesViagem)
  const aviao = g.itens.find(i => i.id === 'aviao')
  if (aviao && !aviao.cotado)
    out.push(
      faltam > e.comprar_aviao_meses + 2
        ? `Passagem: o melhor preço costuma aparecer de ${e.comprar_aviao_meses} a ${e.comprar_aviao_meses + 2} meses antes. Ponha um alerta de preço e compre nessa janela.`
        : 'Passagem: já está na janela de compra. Cote agora; perto da data costuma encarecer.',
    )
  if (g.temporada === 'alta' || [1, 7, 12].includes(Number(mesViagem.slice(5))))
    out.push(
      `Alta temporada: na mesma rota, julho saiu até 58% mais caro que maio. Se a data puder mudar, a diferença é de ${brl(
        Math.max(0, e.aviao_alta.valor - e.aviao_baixa.valor) * (g.adultos + g.criancas),
      )} só no avião.`,
    )
  if (e.estrangeira)
    out.push(
      `Fora do Brasil: tudo cobrado em moeda de fora paga IOF de ${IOF_EXTERIOR_PCT.toLocaleString('pt-BR')}% e o spread do câmbio (já somados). Na maquininha, pague sempre na moeda local, nunca "em reais". Compre a moeda aos poucos, mês a mês, para não depender do câmbio de um dia.`,
    )
  if (g.perfil === 'europa')
    out.push(
      'Europa: o seguro viagem com pelo menos 30 mil euros de cobertura médica é obrigatório. Veja se o seu cartão já dá esse seguro.',
    )
  if (g.bebes > 0)
    out.push(
      'Bebê de colo (até 2 anos) paga até 10% da passagem (regra da ANAC). De 2 anos para cima, assento inteiro.',
    )
  if (g.itens.some(i => i.id === 'taxas_airbnb'))
    out.push('Airbnb: alguns anúncios já incluem a taxa de serviço no preço. Confira para não contar duas vezes.')
  if (g.perfil !== 'nacional' && faltam >= 6 && g.hospedagem === 'hotel')
    out.push(
      'Hotel fora do Brasil com 6 meses ou mais de antecedência muitas vezes ainda não tem preço. Volte para cotar.',
    )
  const estimados = g.itens.filter(i => !i.cotado).length
  if (estimados)
    out.push(
      `${estimados === 1 ? '1 item ainda é estimativa' : `${estimados} itens ainda são estimativa`}: troque pelo valor real quando cotar.`,
    )
  return out
}
const brl = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR')
