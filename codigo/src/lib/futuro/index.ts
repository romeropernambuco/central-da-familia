// Junção do motor do dinheiro infinito: futuro() e impacto2029() (PLANO_TECNICO 3A).
// Função pura: só recebe os dados (futuro_entradas do banco) e devolve as contas. Nenhuma taxa fixa aqui:
// tudo vem de e.parametros. A tela nunca calcula 2029: só chama estas funções.
import { anoDe, compararMes, Dec, diasDoMes, listaMeses, mesAnterior, mesDaData, proximoMes, taxa } from './decimal'
import { taxaRealAnual, taxaRealMensal } from './f2_taxa_real'
import { avisosFGC } from './f10_fgc'
import { gastoNaVirada, patrimonioNecessario, rendaSustentavel } from './f3_necessario'
import { mesDoRecebimento, pisoDoMes, projetarLinha, somarPorMes } from './f4_linha'
import { folga as calcFolga } from './f5_folga'
import { impactoDesvio, perdaRendaMensal } from './f6_impacto'
import { avaliarDesejo, fluxosDoDesejo } from './f7_desejo'
import { tetoProjetado } from './f8_reajuste'
import { ajusteSugerido, cortarPorMes2029, desejosPraAdiar, guardarPorMesNaLinha } from './f9_falta'
import { fatorLiquido } from './f1_rendimento'
import type { Centavos, Desejo, FuturoEntrada, FuturoSaida, LinhaMes, Mes, RendaDoMes } from './tipos'

export * from './tipos'
// Fronteira única (PLANO 3A; REVISOR 2): fora de lib/futuro, tudo se importa daqui. Lista em fase_final/entregas/MOTOR_index.md.
export { Dec, textoDeCentavos, centavosDeTexto, pct, comCasas, mensal, diasDoMes, proximoMes, mesAnterior, compararMes, listaMeses, mesDaData } from './decimal'
export { aliquotaIR, irSobre, diasIR, rendimentoMes, rendimentoAplicacao } from './f1_rendimento'
export { taxaLiquidaAnual, taxaRealAnual, taxaRealMensal, semValor, ALERTA_SEM_VALOR } from './f2_taxa_real'
export { fatorInflacao, gastoNaVirada, patrimonioNecessario, rendaSustentavel } from './f3_necessario'
export { mesDoRecebimento, pisoDoMes, folha13 } from './f4_linha'
export { situacao as situacaoDaFolga } from './f5_folga'
export { valorNaVirada, perdaRendaMensal, impactoDesvio } from './f6_impacto'
export { avaliarDesejo, avaliarAntecipacao, taxaImplicitaMensal, type ResultadoDesejo } from './f7_desejo'
export { reajustarTeto, tetoProjetado, tetoVigente } from './f8_reajuste'
export { ficaDevendo, cortarPorMes2029, desejosPraAdiar, ajusteSugerido, MESES_MINIMOS_PRA_GUARDAR } from './f9_falta'
export { avisosFGC, fgcConta, TODOS_OS_BANCOS, LIMITE_FGC, TETO_CPF_FGC } from './f10_fgc'

function taxasDe(e: FuturoEntrada) {
  const p = e.parametros
  return { taxa_bruta_ano: p.taxa_bruta_ano, aliq_proj: p.aliq_proj, virada: p.virada, taxa_real_trabalho: p.taxa_real_trabalho }
}

/** Depois da virada (hoje no mês da virada ou depois) o motor entra em modo renda (QA E11, erros 1 e 2). */
export function emModoRenda(e: FuturoEntrada): boolean { return compararMes(mesDaData(e.hoje), e.parametros.virada) >= 0 }

/** Taxa real do ano corrente: Fisher com a Selic e o IPCA do ano (líquida do IR da projeção).
 *  Sem os 2 nos parâmetros: a taxa real de trabalho, marcando falta_taxa. */
function taxaRealDoAno(e: FuturoEntrada, ano: number): { real: Dec; falta_taxa: boolean } {
  const p = e.parametros
  const tb = p.taxa_bruta_ano[ano], ip = p.ipca_ano[ano]
  if (tb !== undefined && ip !== undefined) return { real: taxaRealAnual(tb, p.aliq_proj, ip), falta_taxa: false }
  return { real: taxa(p.taxa_real_trabalho), falta_taxa: true }
}

/** Patrimônio real hoje no modo renda: caixa + aplicações − o que os desejos da lista tiram (saída menos volta certa). */
function patrimonioHoje(e: FuturoEntrada): Centavos {
  let s = e.aplicacoes.reduce((t, a) => t + a.saldo, e.saldo_caixa)
  for (const d of e.desejos) {
    const f = fluxosDoDesejo(d)
    s -= f.desvios.reduce((t, x) => t + x.valor, 0)
    s += f.retornos.reduce((t, x) => t + x.valor, 0)
  }
  return s
}

/** Modo renda: sem linha; renda do mês que o patrimônio real sustenta pra sempre, contra o gasto do mês. Nunca trava. */
function futuroRenda(e: FuturoEntrada): FuturoSaida {
  const p = e.parametros
  const mes = mesDaData(e.hoje)
  const { real, falta_taxa: semTaxa } = taxaRealDoAno(e, anoDe(mes))
  let falta_taxa = semTaxa
  let gasto: Centavos
  try { gasto = gastoNaVirada(p.gasto_2029_hoje, p.mes_base, p.virada, p.ipca_ano) } catch { gasto = p.gasto_2029_hoje; falta_taxa = true }
  const patrimonio = patrimonioHoje(e)
  const renda = rendaSustentavel(patrimonio, real)
  const a_cobrir = gasto - p.renda_certa_2029
  const necessario = patrimonioNecessario(a_cobrir, p.margem, real)
  const f = necessario === null ? 0 : patrimonio - necessario
  const perguntas: { recebimento_atrasado: string }[] = []
  for (const r of e.recebimentos) if (mesDoRecebimento(r, mes, mesAnterior(p.virada)).pergunta) perguntas.push({ recebimento_atrasado: r.id })
  const rendaDoMes: RendaDoMes = {
    mes, patrimonio, taxa_real_anual: real.toString(), taxa_real_mensal: real.lte(0) ? '0' : taxaRealMensal(real).toString(),
    renda_sustentavel: renda, gasto_do_mes: gasto, folga_do_mes: renda - Math.max(0, a_cobrir), falta_taxa,
  }
  return {
    modo: 'renda', linha: [], patrimonio_necessario: necessario, renda_sustentavel: renda, folga: f,
    ajustes_falta: f < 0 ? { guardar_por_mes: 0, ...partesDoCorte(cortarPorMes2029(-f, real), a_cobrir, renda), desejos_pra_adiar: desejosPraAdiar(e.desejos), sugerido: 'cortar', meses_restantes: 0 } : null,
    renda: rendaDoMes, perguntas, avisos_fgc: avisosFGC(e.aplicacoes),
  }
}

/** Divide o corte (F9b, com a margem dentro) em: o que falta no mês sem margem + a folga de segurança.
 *  falta_por_mes = gasto a cobrir − renda sustentável (nunca negativo); margem_por_mes = o resto do corte.
 *  A soma das 2 é sempre o corte, centavo por centavo (QA E11: card com 2 números diferentes lado a lado). */
function partesDoCorte(cortar: Centavos, a_cobrir: Centavos, renda: Centavos): { cortar_por_mes_2029: Centavos; falta_por_mes: Centavos; margem_por_mes: Centavos } {
  const falta = Math.min(cortar, Math.max(0, a_cobrir - renda))
  return { cortar_por_mes_2029: cortar, falta_por_mes: falta, margem_por_mes: cortar - falta }
}

/** Meses em que a linha fica devendo pro caixa: do mês abaixo do piso até o mês antes de quitar (ou o fim da linha). */
function mesesDevendo(linha: LinhaMes[]): Set<Mes> {
  const out = new Set<Mes>()
  if (!linha.length) return out
  const fim = linha[linha.length - 1].mes
  for (const l of linha) {
    if (l.fica_devendo <= 0) continue
    const ate = l.devendo_ate ? mesAnterior(l.devendo_ate) : fim
    for (const m of listaMeses(l.mes, ate)) out.add(m)
  }
  return out
}

/** Premissas da junção (escritas no MOTOR_E1b.md):
 *  - saldo do 1º mês da linha = saldo_caixa + soma das aplicações (todo o dinheiro rende pela taxa do ano, F4);
 *  - a linha vai do mês seguinte ao de hoje até o mês antes da virada;
 *  - compromissos, dívidas e desvios de meses anteriores à linha já estão no saldo e não entram;
 *  - desejo com mês já passado entra no 1º mês da linha (ainda é plano, não some);
 *  - teto reajusta no mês de reajuste pelo IPCA do ano anterior (F8, projeção);
 *  - piso do mês = piso_meses × teto do mês;
 *  - "guardar por mês" (F9a) usa os mesmos fatores mês a mês da linha, depósito no fim do mês (revisão do ECONOMISTA). */
export function futuro(e: FuturoEntrada): FuturoSaida {
  if (emModoRenda(e)) return futuroRenda(e)
  const p = e.parametros
  const mes_hoje = mesDaData(e.hoje)
  const de = proximoMes(mes_hoje)
  const ultimo = mesAnterior(p.virada)
  const naLinha = (m: Mes) => compararMes(m, de) >= 0 && compararMes(m, ultimo) <= 0
  const teto = (m: Mes) => tetoProjetado(p.teto_mes, mes_hoje, m, p.mes_reajuste, p.ipca_ano)

  const perguntas: { recebimento_atrasado: string }[] = []
  const recs: { mes: Mes; valor: Centavos }[] = []
  for (const r of e.recebimentos) {
    const x = mesDoRecebimento(r, mes_hoje, ultimo)
    if (x.pergunta) perguntas.push({ recebimento_atrasado: r.id })
    if (x.mes) recs.push({ mes: x.mes, valor: r.valor })
  }
  const desvios = somarPorMes(e.desvios.filter((d) => naLinha(d.mes)))
  const retornos = somarPorMes([])
  for (const d of e.desejos) {
    const f = fluxosDoDesejo(d)
    const ajusta = (m: Mes) => (compararMes(m, de) < 0 ? de : m)
    somarPorMes(f.desvios.map((x) => ({ ...x, mes: ajusta(x.mes) })).filter((x) => naLinha(x.mes)), desvios)
    somarPorMes(f.retornos.map((x) => ({ ...x, mes: ajusta(x.mes) })).filter((x) => naLinha(x.mes)), retornos)
  }

  const saldo_inicial = e.aplicacoes.reduce((s, a) => s + a.saldo, e.saldo_caixa)
  const linha = projetarLinha({
    saldo_inicial, de, ate: ultimo,
    taxa_bruta_ano: p.taxa_bruta_ano, aliq_proj: p.aliq_proj,
    teto, piso: (m) => pisoDoMes(p.piso_meses, teto(m)),
    recebimentos: somarPorMes(recs),
    compromissos: somarPorMes(e.compromissos.filter((c) => naLinha(c.mes))),
    dividas: somarPorMes(e.dividas.filter((c) => naLinha(c.mes))),
    desvios, retornos,
  })
  const saldo_final = linha.length ? linha[linha.length - 1].saldo_final : saldo_inicial

  const gasto = gastoNaVirada(p.gasto_2029_hoje, p.mes_base, p.virada, p.ipca_ano)
  const a_cobrir = gasto - p.renda_certa_2029
  const necessario = patrimonioNecessario(a_cobrir, p.margem, p.taxa_real_trabalho)
  const f = necessario === null ? 0 : calcFolga(saldo_final, necessario)
  let ajustes_falta: FuturoSaida['ajustes_falta'] = null
  if (f < 0) {
    // Poucos meses até a virada (QA E11, erro 3): guardar não serve, o ajuste sugerido é cortar o gasto de 2029.
    const sugerido = ajusteSugerido(linha.length)
    const fatores = linha.map((l) => fatorLiquido(p.taxa_bruta_ano[anoDe(l.mes)], p.aliq_proj, diasDoMes(l.mes)))
    ajustes_falta = {
      guardar_por_mes: sugerido === 'guardar' ? guardarPorMesNaLinha(-f, fatores) : 0,
      ...partesDoCorte(cortarPorMes2029(-f, p.taxa_real_trabalho), a_cobrir, rendaSustentavel(saldo_final, p.taxa_real_trabalho)),
      desejos_pra_adiar: desejosPraAdiar(e.desejos),
      sugerido, meses_restantes: linha.length,
    }
  }
  return {
    modo: 'projecao',
    linha,
    renda: null,
    patrimonio_necessario: necessario,
    renda_sustentavel: rendaSustentavel(saldo_final, p.taxa_real_trabalho),
    folga: f,
    ajustes_falta,
    perguntas,
    avisos_fgc: avisosFGC(e.aplicacoes),
  }
}

/** "Isso tira R$ Y por mês da renda de 2029, pra sempre." (F6 com os parâmetros da família).
 *  Depois da virada: o valor sai de agora, sem juros até a virada, e a perda usa a taxa real do ano (modo renda). */
export function impacto2029(e: FuturoEntrada, desvio: { mes: Mes; valor: Centavos }): { valor_na_virada: Centavos; perda_renda_mensal: Centavos | null; modo?: 'projecao' | 'renda' } {
  if (emModoRenda(e)) {
    const { real } = taxaRealDoAno(e, anoDe(mesDaData(e.hoje)))
    return { valor_na_virada: desvio.valor, perda_renda_mensal: perdaRendaMensal(desvio.valor, real), modo: 'renda' }
  }
  return { ...impactoDesvio(desvio.valor, desvio.mes, taxasDe(e)), modo: 'projecao' }
}

/** F7 "Cabe?" (REVISOR C3 e QA E11 erro 4): compara a linha COM o desejo contra a linha SEM ele.
 *  Mês devendo = do mês abaixo do piso até quitar (igual ao "fica devendo até" da Linha2028).
 *  Mês derrubado = devendo com o desejo e não sem ele.
 *  "Ainda não cabe" = o desejo derruba algum mês. caberia_em = 1º mês depois do desejo em que ele não derruba nada E
 *  a linha sem o desejo não fica devendo daquele mês em diante (nunca "cabe" num mês já apertado).
 *  "Apertado sem o desejo" = a família já fica devendo sem ele e o desejo não derruba mês novo: mostra o custo.
 *  "Cabe" = nada devendo e folga ≥ 0. "Cabe, mas tira" = nada devendo, só a folga de 2029 fica negativa.
 *  Depois da virada (modo renda): compara o patrimônio de hoje, com e sem o desejo, com o piso do mês. */
export function cabeDesejo(e: FuturoEntrada, desejo: Desejo): {
  situacao: 'cabe' | 'cabe, mas tira' | 'ainda nao cabe' | 'apertado sem o desejo'
  tira_por_mes_2029: Centavos | null
  primeiro_mes_abaixo: Mes | null
  caberia_em: Mes | null
  apertado_sem_desejo: Mes | null /* 1º mês devendo na linha sem o desejo */
  modo?: 'projecao' | 'renda' /* opcional no tipo só pra não quebrar quem monta o objeto à mão; sempre vem preenchido */
} {
  if (emModoRenda(e)) return cabeDesejoRenda(e, desejo)
  const tira = avaliarDesejo(desejo, taxasDe(e)).impacto_renda_mensal
  const roda = (d: Desejo) => futuro({ ...e, desejos: [...e.desejos, d] })
  const sem = futuro(e).linha
  const devendoSem = mesesDevendo(sem)
  const apertado = sem.find((l) => devendoSem.has(l.mes))?.mes ?? null
  const derrubado = (s: FuturoSaida) => { const d = mesesDevendo(s.linha); return s.linha.find((l) => d.has(l.mes) && !devendoSem.has(l.mes))?.mes ?? null }
  const s = roda(desejo)
  const primeiro = derrubado(s)
  if (primeiro === null) {
    const situacao = apertado !== null ? 'apertado sem o desejo' : s.folga >= 0 ? 'cabe' : 'cabe, mas tira'
    return { situacao, tira_por_mes_2029: tira, primeiro_mes_abaixo: null, caberia_em: null, apertado_sem_desejo: apertado, modo: 'projecao' }
  }
  const ultimo = mesAnterior(e.parametros.virada)
  const livreDali = (m: Mes) => ![...devendoSem].some((x) => compararMes(x, m) >= 0)
  let caberia: Mes | null = null
  for (let m = proximoMes(desejo.mes); compararMes(m, ultimo) <= 0; m = proximoMes(m)) {
    if (livreDali(m) && derrubado(roda({ ...desejo, mes: m })) === null) { caberia = m; break }
  }
  return { situacao: 'ainda nao cabe', tira_por_mes_2029: tira, primeiro_mes_abaixo: primeiro, caberia_em: caberia, apertado_sem_desejo: apertado, modo: 'projecao' }
}

function cabeDesejoRenda(e: FuturoEntrada, desejo: Desejo): ReturnType<typeof cabeDesejo> {
  const mes = mesDaData(e.hoje)
  const piso = pisoDoMes(e.parametros.piso_meses, e.parametros.teto_mes)
  const { real } = taxaRealDoAno(e, anoDe(mes))
  const f = fluxosDoDesejo(desejo)
  const liquido = f.desvios.reduce((t, x) => t + x.valor, 0) - f.retornos.reduce((t, x) => t + x.valor, 0)
  const tira = perdaRendaMensal(liquido, real)
  const sem = patrimonioHoje(e), com = futuroRenda({ ...e, desejos: [...e.desejos, desejo] })
  const quando = compararMes(desejo.mes, mes) > 0 ? desejo.mes : mes
  if (sem < piso) return { situacao: 'apertado sem o desejo', tira_por_mes_2029: tira, primeiro_mes_abaixo: null, caberia_em: null, apertado_sem_desejo: mes, modo: 'renda' }
  if (com.renda!.patrimonio < piso) return { situacao: 'ainda nao cabe', tira_por_mes_2029: tira, primeiro_mes_abaixo: quando, caberia_em: null, apertado_sem_desejo: null, modo: 'renda' }
  return { situacao: com.folga >= 0 ? 'cabe' : 'cabe, mas tira', tira_por_mes_2029: tira, primeiro_mes_abaixo: null, caberia_em: null, apertado_sem_desejo: null, modo: 'renda' }
}
