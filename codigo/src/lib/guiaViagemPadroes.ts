// Estimativas de partida do guia da viagem, saindo de Recife, pesquisadas por um especialista em 22/11/2026
// (Google Flights e Google Hotéis para maio/2027 e julho/2027; câmbio PTAX de 19/11/2026: US$ 5,89, € 6,47; blogs e
// sites citados em cada número). São ponto de partida: a família troca pelo valor que cotar. Revisar todo ano.
export type PerfilViagem = 'nacional' | 'america_sul' | 'europa'
export type Confianca = 'alta' | 'media' | 'baixa' | 'sem_fonte'
export interface Estimativa {
  valor: number
  confianca: Confianca
  fonte: string
}

export interface Estimativas {
  nome: string
  exemplo: string
  /** avião ida e volta por pessoa, econômica, sem mala: baixa e alta temporada */
  aviao_baixa: Estimativa
  aviao_alta: Estimativa
  /** mala despachada por trecho (0 = verificar se vem na tarifa) */
  mala_trecho: Estimativa
  /** hotel para a família de 4, por noite */
  hotel_noite: Estimativa
  /** Airbnb casa inteira para família de 4, por noite; limpeza pela estadia; taxa de serviço do hóspede (%) */
  airbnb_noite: Estimativa
  airbnb_limpeza: number
  airbnb_servico_pct: number
  /** seguro viagem por pessoa por dia (0 = opcional) */
  seguro_dia: Estimativa
  /** documentos por pessoa (ETIAS na Europa) */
  documentos: Estimativa
  /** transfer aeroporto–hospedagem lá, ida e volta, pela família */
  transfer: Estimativa
  comida_dia: Estimativa
  transporte_dia: Estimativa
  passeios_dia: Estimativa
  /** taxa de turismo por pessoa adulta por noite (máx. 7 noites em Lisboa) */
  taxa_turismo_noite: Estimativa | null
  /** cobrado em moeda de fora (paga IOF e spread) */
  estrangeira: boolean
  /** margem de imprevisto (%) */
  imprevisto_pct: number
  /** a janela boa para comprar a passagem: meses antes */
  comprar_aviao_meses: number
}

/** IOF sobre gasto no exterior (cartão de crédito, débito, pré-pago e moeda em espécie): Decreto 12.499/2025. */
export const IOF_EXTERIOR_PCT = 3.5
/** Spread do câmbio no cartão de banco comum (estimativa sem fonte) e custo total de conta global (Wise, Nomad). */
export const SPREAD_CARTAO_PCT = 4
export const CONTA_GLOBAL_TOTAL_PCT = 5
/** Estacionamento oficial do aeroporto do Recife por dia (Movepark, com reserva R$ 19,90; no balcão R$ 24). */
export const AEROPORTO_RECIFE_DIA = 24

const e = (valor: number, confianca: Confianca, fonte: string): Estimativa => ({ valor, confianca, fonte })
const SEM = 'estimativa sem fonte: troque pelo valor cotado'

export const ESTIMATIVAS: Record<PerfilViagem, Estimativas> = {
  nacional: {
    nome: 'Nacional',
    exemplo: 'Gramado, Rio, São Paulo',
    aviao_baixa: e(1164, 'alta', 'Google Flights, Recife–Porto Alegre, maio/2027'),
    aviao_alta: e(1834, 'alta', 'Google Flights, Recife–Porto Alegre, julho/2027'),
    mala_trecho: e(110, 'media', 'Melhores Destinos 2026: Gol R$ 110, Latam R$ 60–110, Azul R$ 135'),
    hotel_noite: e(600, 'media', 'Google Hotéis e Rotepass (07/2026): R$ 400–750 fora do Natal Luz'),
    airbnb_noite: e(500, 'sem_fonte', SEM),
    airbnb_limpeza: 145,
    airbnb_servico_pct: 15,
    seguro_dia: e(0, 'media', 'opcional em viagem nacional'),
    documentos: e(0, 'alta', 'RG basta'),
    transfer: e(600, 'sem_fonte', SEM),
    comida_dia: e(200, 'media', 'Rotepass (07/2026): R$ 150–250 por pessoa por dia'),
    transporte_dia: e(50, 'sem_fonte', SEM),
    passeios_dia: e(150, 'media', 'Melhores Destinos (05/2026): ingressos de R$ 90 a R$ 259'),
    taxa_turismo_noite: null,
    estrangeira: false,
    imprevisto_pct: 10,
    comprar_aviao_meses: 3,
  },
  america_sul: {
    nome: 'América do Sul',
    exemplo: 'Buenos Aires, Santiago',
    aviao_baixa: e(2264, 'alta', 'Google Flights, Recife–Buenos Aires, maio/2027'),
    aviao_alta: e(3077, 'alta', 'Google Flights, Recife–Buenos Aires, julho/2027'),
    mala_trecho: e(0, 'baixa', 'confira se a mala vem na tarifa'),
    hotel_noite: e(500, 'media', 'Google Hotéis: 3 estrelas US$ 75 por noite; Agent Trip 2026'),
    airbnb_noite: e(450, 'sem_fonte', SEM),
    airbnb_limpeza: 145,
    airbnb_servico_pct: 15,
    seguro_dia: e(10, 'sem_fonte', SEM),
    documentos: e(0, 'alta', 'Argentina: RG com menos de 10 anos'),
    transfer: e(334, 'media', 'Agent Trip: transfer de Ezeiza R$ 167 por trecho'),
    comida_dia: e(250, 'media', 'Agent Trip (08/2026); o câmbio argentino oscila muito'),
    transporte_dia: e(30, 'media', 'Agent Trip: metrô R$ 4,40, táxi de 3 km R$ 22'),
    passeios_dia: e(140, 'media', 'Agent Trip: R$ 500 a R$ 900 em 5 dias, com tango'),
    taxa_turismo_noite: null,
    estrangeira: true,
    imprevisto_pct: 15,
    comprar_aviao_meses: 4,
  },
  europa: {
    nome: 'Europa',
    exemplo: 'Lisboa, Madri, Paris',
    aviao_baixa: e(5320, 'alta', 'Google Flights, Recife–Lisboa, maio/2027 (TAP direto R$ 5.743)'),
    aviao_alta: e(7177, 'alta', 'Google Flights, Recife–Lisboa, julho/2027 (TAP direto R$ 7.406)'),
    mala_trecho: e(0, 'baixa', 'confira se a mala vem na tarifa'),
    hotel_noite: e(1100, 'baixa', 'Grupo Dicas (20/11/2026): €70–150 por quarto; família precisa de 2 quartos'),
    airbnb_noite: e(850, 'media', 'Google Hotéis: 2 quartos US$ 110–181 por noite'),
    airbnb_limpeza: 145,
    airbnb_servico_pct: 15,
    seguro_dia: e(15, 'media', 'Assistente de Viagem R$ 6,90, Mochileiros R$ 12, Assist Card R$ 18 por dia'),
    documentos: e(130, 'media', 'ETIAS €20 por pessoa; conferir se já vale'),
    transfer: e(260, 'sem_fonte', SEM),
    comida_dia: e(325, 'media', 'Grupo Dicas: almoço €10–15, jantar €25–30'),
    transporte_dia: e(52, 'media', 'Grupo Dicas: €6–10 por pessoa por dia'),
    passeios_dia: e(160, 'media', 'Grupo Dicas: €15–40 por dia'),
    taxa_turismo_noite: e(26, 'alta', 'Lisboa: €4 por pessoa de 13 anos ou mais, até 7 noites'),
    estrangeira: true,
    imprevisto_pct: 15,
    comprar_aviao_meses: 5,
  },
}
