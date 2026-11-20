// F11 Imóveis (RODADA_PATRIMONIO.md, premissa nova do dono, 14/11/2026). Função pura.
// - Aluguel líquido mensal = (aluguel × (1 − vacância) − custos) × (1 − aliq_aluguel).
// - Venda com contrato entra bruta: IR de ganho de capital não modelado [confirmar].
// - Entra como renda SÓ com contrato assinado e só até contrato_ate; depois, ou sem contrato, vira gatilho (fora da conta).
// - Venda planejada entra como recebimento SÓ com contrato; sem contrato, gatilho.
// - O valor do imóvel é patrimônio à parte: o plano nunca saca nem vende.
// - Onde a família mora: valor no patrimônio, renda zero.
import { arred, centavos, compararMes, Dec, listaMeses, proximoMes, taxa, UM, ZERO } from './decimal'
import type { Centavos, Gatilho, Imovel, ImovelSaida, Mes, Recebimento, Taxa } from './tipos'

/** Aluguel líquido do mês (centavos) = (aluguel × (1 − vacância) − custos) × (1 − aliq_aluguel), arredondado 1 vez
 *  (ordem do VERIFICADOR, ESPERADO.md item 5). Mora, sem aluguel ou custos maiores que o aluguel recebido: 0
 *  (os custos de quem mora ou de imóvel parado já estão no teto da casa). */
export function aluguelLiquidoMes(im: Imovel, aliq_aluguel: Taxa | Dec): Centavos {
  if (im.uso === 'mora') return 0
  centavos(im.aluguel_bruto)
  centavos(im.custos_mes)
  const vac = taxa(im.vacancia)
  if (vac.lt(0) || vac.gt(1)) throw new Error(`Vacância inválida: ${im.vacancia}`)
  const antesIR = centavos(im.aluguel_bruto).times(UM.minus(vac)).minus(im.custos_mes)
  if (antesIR.lte(0)) return 0
  return arred(antesIR.times(UM.minus(taxa(aliq_aluguel))))
}

/** Rentabilidade ao ano: aluguel líquido × 12 ÷ valor estimado. Imóvel sem valor: 0. */
export function rentabilidadeAno(im: Imovel, aliq_aluguel: Taxa | Dec): Dec {
  if (im.valor <= 0) return ZERO
  return centavos(aluguelLiquidoMes(im, aliq_aluguel)).times(12).div(centavos(im.valor))
}

/** Venda com contrato até (e incluindo) o mês m: o imóvel sai do patrimônio e o aluguel para depois do mês da venda. */
function vendidoAte(im: Imovel, m: Mes): boolean {
  return im.venda_contrato && im.venda_mes !== null && im.venda_valor !== null && compararMes(im.venda_mes, m) <= 0
}

/** Aluguel com contrato vale no mês m? (contrato assinado, com data de fim ≥ m, e o imóvel não vendido antes de m). */
export function aluguelNoMes(im: Imovel, m: Mes): boolean {
  if (im.uso === 'mora' || !im.tem_contrato || im.contrato_ate === null) return false
  if (compararMes(m, im.contrato_ate) > 0) return false
  if (im.venda_contrato && im.venda_mes !== null && compararMes(m, im.venda_mes) > 0) return false
  return true
}

export interface ImoveisAnalise {
  alugueis: { mes: Mes; valor: Centavos }[] /* por mês da linha, só com contrato */
  vendas: {
    mes: Mes
    valor: Centavos
    id: string
    apelido: string
    dono: string
  }[] /* recebimentos da venda com contrato, dentro da linha */
  aluguel_no_mes_ref: Centavos /* aluguel com contrato no mês de referência (virada ou mês de hoje no modo renda) */
  aluguel_perpetuo: Centavos /* parte que abate o gasto na conta perpétua: contrato vai até mes_ref + 11 meses ou depois (revisão E14, M1) */
  patrimonio_imoveis: Centavos /* valor dos imóveis que a família ainda tem no mês de referência; nunca sacado */
  imoveis: ImovelSaida[]
  gatilhos: Gatilho[]
}

/** Analisa os imóveis pra uma janela de meses (a linha) e um mês de referência (a virada, ou hoje no modo renda). */
/** Até quando o contrato tem que ir pra o aluguel abater o gasto na conta perpétua: 12 meses a partir da referência
 *  (virada 01/2029 → 12/2029). Regra do dono: só dinheiro certo (revisão E14, M1). */
export function contratoMinimoPerpetuo(mes_ref: Mes): Mes {
  let m = mes_ref
  for (let i = 0; i < 11; i++) m = proximoMes(m)
  return m
}

export function analisarImoveis(
  imoveis: Imovel[],
  o: { meses: Mes[]; mes_ref: Mes; mes_hoje?: Mes; aliq_aluguel: Taxa | Dec; taxa_real_aplicacoes: Dec },
): ImoveisAnalise {
  const minimo = contratoMinimoPerpetuo(o.mes_ref)
  let aluguel_perp = 0
  const alugueis: { mes: Mes; valor: Centavos }[] = []
  const vendas: { mes: Mes; valor: Centavos; id: string; apelido: string; dono: string }[] = []
  const gatilhos: Gatilho[] = []
  const saida: ImovelSaida[] = []
  let aluguel_ref = 0,
    patrimonio = 0
  const primeiro = o.meses[0] ?? o.mes_ref
  const ultimo = o.meses.length ? o.meses[o.meses.length - 1] : o.mes_ref
  for (const im of imoveis) {
    centavos(im.valor)
    const liq = aluguelLiquidoMes(im, o.aliq_aluguel)
    const rent = rentabilidadeAno(im, o.aliq_aluguel)
    for (const m of o.meses) if (liq > 0 && aluguelNoMes(im, m)) alugueis.push({ mes: m, valor: liq })
    const noRef = liq > 0 && aluguelNoMes(im, o.mes_ref)
    if (noRef) aluguel_ref += liq
    const perpetuo = noRef && im.contrato_ate !== null && compararMes(im.contrato_ate, minimo) >= 0
    if (perpetuo) aluguel_perp += liq
    else if (noRef)
      gatilhos.push({
        origem: 'imovel',
        id: im.id,
        nome: im.apelido,
        tipo: 'aluguel',
        motivo: 'renova o contrato',
        valor: liq,
        mes: minimo,
        por_mes: true,
        descricao: null,
        aluguel_para_em: proximoMes(im.contrato_ate as Mes),
      })
    if (!vendidoAte(im, o.mes_ref)) patrimonio += im.valor
    // gatilhos do aluguel
    if (liq > 0) {
      if (!im.tem_contrato)
        gatilhos.push({
          origem: 'imovel',
          id: im.id,
          nome: im.apelido,
          tipo: 'aluguel',
          motivo: 'sem contrato',
          valor: liq,
          mes: null,
          por_mes: true,
        })
      else if (im.contrato_ate === null)
        gatilhos.push({
          origem: 'imovel',
          id: im.id,
          nome: im.apelido,
          tipo: 'aluguel',
          motivo: 'contrato sem data de fim',
          valor: liq,
          mes: null,
          por_mes: true,
        })
      else if (compararMes(im.contrato_ate, o.mes_ref) < 0 && !vendidoAte(im, im.contrato_ate))
        gatilhos.push({
          origem: 'imovel',
          id: im.id,
          nome: im.apelido,
          tipo: 'aluguel',
          motivo: 'depois do contrato',
          valor: liq,
          mes: proximoMes(im.contrato_ate),
          por_mes: true,
        })
    }
    // venda
    if (im.venda_valor !== null && im.venda_mes !== null) {
      centavos(im.venda_valor)
      if (!im.venda_contrato)
        gatilhos.push({
          origem: 'imovel',
          id: im.id,
          nome: im.apelido,
          tipo: 'venda',
          motivo: 'sem contrato',
          valor: im.venda_valor,
          mes: im.venda_mes,
          por_mes: false,
        })
      else if (compararMes(im.venda_mes, ultimo) > 0)
        gatilhos.push({
          origem: 'imovel',
          id: im.id,
          nome: im.apelido,
          tipo: 'venda',
          motivo: 'depois da virada',
          valor: im.venda_valor,
          mes: im.venda_mes,
          por_mes: false,
        })
      else if (o.meses.length && compararMes(im.venda_mes, primeiro) >= 0)
        vendas.push({ mes: im.venda_mes, valor: im.venda_valor, id: im.id, apelido: im.apelido, dono: im.dono })
      // venda com contrato num mês já passado: o dinheiro já está no saldo; o imóvel só sai do patrimônio
    }
    saida.push({
      id: im.id,
      dono: im.dono,
      apelido: im.apelido,
      uso: im.uso,
      valor: im.valor,
      aluguel_liquido_mes: liq,
      rentabilidade_ano: rent.toString(),
      taxa_real_aplicacoes: o.taxa_real_aplicacoes.toString(),
      rende_mais_que_aplicacao: liq > 0 && rent.gt(o.taxa_real_aplicacoes),
      entra_na_conta: perpetuo,
      contrato_ate: im.contrato_ate,
      vendido: vendidoAte(im, o.mes_ref),
      rendimento_liquido_anual_percentual: rent.times(100).toString(),
      meses_ate_fim_contrato:
        im.tem_contrato && im.contrato_ate !== null
          ? Math.max(0, compararMes(im.contrato_ate, o.mes_hoje ?? o.mes_ref))
          : null,
      // Comparação hipotética: renovar até dezembro versus respeitar o fim atual.
      // Não inclui imóvel sem contrato datado nem meses posteriores à venda confirmada.
      impacto_renda_2029_sem_renovacao:
        !im.tem_contrato || im.contrato_ate === null
          ? 0
          : listaMeses('2029-01', '2029-12').filter(
              m => !aluguelNoMes(im, m) && aluguelNoMes({ ...im, contrato_ate: '2029-12' }, m),
            ).length * liq,
    })
  }
  return {
    alugueis,
    vendas,
    aluguel_no_mes_ref: aluguel_ref,
    aluguel_perpetuo: aluguel_perp,
    patrimonio_imoveis: patrimonio,
    imoveis: saida,
    gatilhos,
  }
}

/** Recebimentos incertos e não recebidos: aparecem como gatilho, nunca entram na conta (plano base só conta o certo). */
export function gatilhosDeRecebimento(recebimentos: Recebimento[]): Gatilho[] {
  return recebimentos
    .filter(r => !r.certo && !r.recebido)
    .map(r => ({
      origem: 'recebimento' as const,
      id: r.id,
      nome: r.dono,
      tipo: 'recebimento' as const,
      motivo: 'incerto' as const,
      valor: r.valor,
      mes: r.mes_novo ?? r.mes_previsto,
      por_mes: false,
      descricao: r.descricao ?? null,
    }))
}
