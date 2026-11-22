// Viagem planejada (regra do dono, 22/11/2026): "quero comprar, estou antecipando o pagamento dessa viagem, mesmo
// parcelando em 12 meses; e vou ter os custos lá. Isso vai sair de algum lugar. O sistema tem que prever como não perder
// ou quanto eu tenho que ganhar por mês para preparar esse rendimento extra. A finalidade é aumentar o nosso orçamento."
// A viagem é planejada com antecedência, paga no cartão em parcelas e sai da sobra do mês, nunca da gordura.
// Valores da viagem em reais; o que vai para o motor (lib/futuro) em centavos.
import type { FuturoEntrada, LinhaMes } from './futuro'

export type SituacaoViagem = 'planejando' | 'comprada' | 'feita'
export interface ViagemPlanejada {
  id: string
  nome: string
  /** mês da viagem (AAAA-MM): os custos lá saem neste mês */
  mes: string
  /** mês da compra (a 1ª parcela) */
  compra: string
  /** passagem e hospedagem (reais) */
  pacote: number
  /** em quantas vezes no cartão (1 a 12) */
  parcelas: number
  /** o que se gasta lá: comida, passeios, transporte (reais) */
  custos_la: number
  /** desconto se pagar à vista (%); null = não perguntou */
  desconto_vista: number | null
  situacao: SituacaoViagem
}

const MES = /^\d{4}-(0[1-9]|1[0-2])$/
const c2 = (v: number) => Math.round(v * 100) / 100
export const mesMaisV = (m: string, n: number) => {
  const [a, mm] = m.split('-').map(Number)
  const t = a * 12 + (mm - 1) + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}
const mesesEntre = (de: string, ate: string) => {
  const [a1, m1] = de.split('-').map(Number),
    [a2, m2] = ate.split('-').map(Number)
  return (a2 - a1) * 12 + (m2 - m1)
}

/** O que veio da configuração: só passa viagem com meses e valores certos. */
export function lerViagens(v: unknown): ViagemPlanejada[] {
  if (!Array.isArray(v)) return []
  return v.flatMap((x): ViagemPlanejada[] => {
    if (!x || typeof x !== 'object') return []
    const o = x as Partial<ViagemPlanejada>
    if (typeof o.id !== 'string' || typeof o.mes !== 'string' || !MES.test(o.mes)) return []
    const pacote = Number(o.pacote) || 0,
      custos = Number(o.custos_la) || 0
    if (pacote < 0 || custos < 0 || pacote + custos <= 0) return []
    return [
      {
        id: o.id,
        nome: typeof o.nome === 'string' && o.nome.trim() ? o.nome.trim().slice(0, 60) : 'Viagem',
        mes: o.mes,
        compra: typeof o.compra === 'string' && MES.test(o.compra) && o.compra <= o.mes ? o.compra : o.mes,
        pacote: c2(pacote),
        parcelas: Math.min(12, Math.max(1, Math.round(Number(o.parcelas) || 1))),
        custos_la: c2(custos),
        desconto_vista:
          typeof o.desconto_vista === 'number' && o.desconto_vista > 0 && o.desconto_vista < 100
            ? o.desconto_vista
            : null,
        situacao: o.situacao === 'comprada' || o.situacao === 'feita' ? o.situacao : 'planejando',
      },
    ]
  })
}

/**
 * Quanto a viagem tira de cada mês (reais), de `desde` em diante: as parcelas do pacote a partir da compra e o cofrinho
 * dos custos lá (guardados em partes iguais de `desde` até o mês da viagem).
 */
export function custosDaViagem(v: ViagemPlanejada, desde: string) {
  const out = new Map<string, { parcela: number; cofrinho: number }>()
  const soma = (m: string, k: 'parcela' | 'cofrinho', valor: number) => {
    if (m < desde) return
    const a = out.get(m) || { parcela: 0, cofrinho: 0 }
    a[k] = c2(a[k] + valor)
    out.set(m, a)
  }
  const p = c2(v.pacote / v.parcelas)
  for (let i = 0; i < v.parcelas; i++) soma(mesMaisV(v.compra, i), 'parcela', p)
  const n = Math.max(1, mesesEntre(desde, v.mes) + 1)
  if (v.mes >= desde) for (let i = 0; i < n; i++) soma(mesMaisV(desde, i), 'cofrinho', c2(v.custos_la / n))
  return [...out.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([mes, x]) => ({ mes, ...x }))
}

/**
 * A viagem no plano (centavos): as parcelas como compromisso enquanto não foi comprada (comprada, elas estão no cartão);
 * os custos lá como desvio no mês da viagem enquanto não foi feita.
 */
export function viagensNoPlano(v: unknown, m0: string): Pick<FuturoEntrada, 'compromissos' | 'desvios'> {
  const compromissos: FuturoEntrada['compromissos'] = [],
    desvios: FuturoEntrada['desvios'] = []
  for (const x of lerViagens(v)) {
    if (x.situacao === 'feita') continue
    if (x.situacao === 'planejando') {
      const p = Math.round((x.pacote * 100) / x.parcelas)
      for (let i = 0; i < x.parcelas; i++) {
        const mes = mesMaisV(x.compra, i)
        if (mes > m0) compromissos.push({ mes, valor: p, tipo: 'parcela' })
      }
    }
    if (x.custos_la > 0 && x.mes > m0)
      desvios.push({ mes: x.mes, valor: Math.round(x.custos_la * 100), origem: `viagem:${x.id}` })
  }
  return { compromissos, desvios }
}

export interface AnaliseViagem {
  total: number
  /** o mês mais pesado: parcela + cofrinho */
  maiorMes: { mes: string; valor: number }
  /** a viagem cabe na sobra e no que o guardado rende, mês a mês somado, sem tocar na gordura */
  cabe: boolean
  /** quanto a família precisa ganhar a mais (ou cortar) por mês, de agora até `ate`, para não tocar na gordura */
  aMaisPorMes: number
  ate: string
  /** à vista com desconto x parcelado deixando o dinheiro render */
  vista: { desconto: number; rendeParcelando: number; compensa: 'vista' | 'parcelar' } | null
}

/**
 * Compara a viagem com a linha do plano (centavos), mês a mês somado: a sobra de um mês guardada ajuda o seguinte; o que
 * ficar negativo seria comido da gordura. `linha` é o plano COM esta viagem dentro (quando ela está no plano);
 * `noPlano` diz isso, para devolver a viagem à sobra antes de comparar. `taxaMes` = o que o guardado rende por mês.
 */
export function analisarViagem(
  v: ViagemPlanejada,
  linha: readonly LinhaMes[],
  taxaMes: number,
  noPlano: boolean,
): AnaliseViagem | null {
  if (!linha.length) return null
  const desde = linha[0].mes
  const custos = custosDaViagem(v, desde)
  if (!custos.length) return null
  const doPlano = new Map(noPlano ? viagemNoPlanoPorMes(v, mesMaisV(desde, -1)) : [])
  let acc = 0,
    precisa = 0
  const fim = custos[custos.length - 1].mes
  for (let k = 0; k < linha.length && linha[k].mes <= fim; k++) {
    const l = linha[k]
    const sobra = (l.saldo_final - l.saldo_inicial) / 100 + (doPlano.get(l.mes) || 0)
    const c = custos.find(x => x.mes === l.mes)
    acc += sobra - (c ? c.parcela + c.cofrinho : 0)
    if (acc < 0) precisa = Math.max(precisa, -acc / (k + 1))
  }
  const maior = custos.reduce((a, b) => (b.parcela + b.cofrinho > a.parcela + a.cofrinho ? b : a))
  const vista =
    v.desconto_vista === null || v.parcelas < 2
      ? null
      : (() => {
          const desconto = c2((v.pacote * v.desconto_vista) / 100)
          // parcelando sem juros, o dinheiro de cada parcela fica rendendo até o mês dela
          const p = v.pacote / v.parcelas
          let rende = 0
          for (let i = 1; i < v.parcelas; i++) rende += p * (Math.pow(1 + taxaMes, i) - 1)
          const rendeParcelando = c2(rende)
          return { desconto, rendeParcelando, compensa: desconto > rendeParcelando ? 'vista' : 'parcelar' } as const
        })()
  return {
    total: c2(v.pacote + v.custos_la),
    maiorMes: { mes: maior.mes, valor: c2(maior.parcela + maior.cofrinho) },
    cabe: precisa <= 0,
    aMaisPorMes: c2(Math.ceil(precisa)),
    ate: fim,
    vista,
  }
}

/** O que esta viagem tira de cada mês no plano (reais), para devolver à sobra antes de comparar. */
function viagemNoPlanoPorMes(v: ViagemPlanejada, m0: string): [string, number][] {
  const { compromissos, desvios } = viagensNoPlano([v], m0)
  const m = new Map<string, number>()
  for (const x of [...compromissos, ...desvios]) m.set(x.mes, (m.get(x.mes) || 0) + x.valor / 100)
  return [...m.entries()]
}

const brl = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const mmaa = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`

/** O que o app fala da viagem. */
export function frasesDaViagem(v: ViagemPlanejada, a: AnaliseViagem): string[] {
  const out = [
    `Custa ${brl(a.total)}: ${brl(v.pacote)} de passagem e hospedagem${v.parcelas > 1 ? ` em ${v.parcelas}x de ${brl(v.pacote / v.parcelas)}` : ''} e ${brl(v.custos_la)} para gastar lá. O mês mais pesado é ${mmaa(a.maiorMes.mes)}: ${brl(a.maiorMes.valor)}.`,
    v.custos_la > 0
      ? `Cofrinho dos custos lá: guarde a parte de cada mês até ${mmaa(v.mes)}, para não pagar a viagem com a gordura.`
      : '',
    a.cabe
      ? 'Cabe na sobra do mês e no que o guardado rende: a gordura fica inteira.'
      : `Para não tocar na gordura, a família precisa de ${brl(a.aMaisPorMes)} a mais por mês até ${mmaa(a.ate)}: renda extra ou corte nos limites. Ganhar isso a mais é o que faz o orçamento crescer.`,
  ]
  if (a.vista)
    out.push(
      a.vista.compensa === 'vista'
        ? `À vista compensa: o desconto de ${brl(a.vista.desconto)} é maior do que os ${brl(a.vista.rendeParcelando)} que o dinheiro renderia parcelando. Só pague à vista com a sobra, não com a gordura.`
        : `Parcelar sem juros compensa: o dinheiro rende ${brl(a.vista.rendeParcelando)} enquanto as parcelas caem, mais do que o desconto de ${brl(a.vista.desconto)}.`,
    )
  return out.filter(Boolean)
}
