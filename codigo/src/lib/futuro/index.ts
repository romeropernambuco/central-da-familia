// Junção do motor do dinheiro infinito: futuro() e impacto2029() (PLANO_TECNICO 3A).
// Função pura: só recebe os dados (futuro_entradas do banco) e devolve as contas. Nenhuma taxa fixa aqui:
// tudo vem de e.parametros. A tela nunca calcula 2029: só chama estas funções.
import { anoDe, compararMes, diasDoMes, mesAnterior, mesDaData, proximoMes } from './decimal'
import { avisosFGC } from './f10_fgc'
import { gastoNaVirada, patrimonioNecessario, rendaSustentavel } from './f3_necessario'
import { mesDoRecebimento, projetarLinha, somarPorMes } from './f4_linha'
import { folga as calcFolga } from './f5_folga'
import { impactoDesvio } from './f6_impacto'
import { avaliarDesejo, fluxosDoDesejo } from './f7_desejo'
import { tetoProjetado } from './f8_reajuste'
import { cortarPorMes2029, desejosPraAdiar, guardarPorMesNaLinha } from './f9_falta'
import { fatorLiquido } from './f1_rendimento'
import type { Centavos, Desejo, FuturoEntrada, FuturoSaida, Mes } from './tipos'

export * from './tipos'
export { textoDeCentavos, centavosDeTexto, pct } from './decimal'

function taxasDe(e: FuturoEntrada) {
  const p = e.parametros
  return { taxa_bruta_ano: p.taxa_bruta_ano, aliq_proj: p.aliq_proj, virada: p.virada, taxa_real_trabalho: p.taxa_real_trabalho }
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
    teto, piso: (m) => p.piso_meses * teto(m),
    recebimentos: somarPorMes(recs),
    compromissos: somarPorMes(e.compromissos.filter((c) => naLinha(c.mes))),
    dividas: somarPorMes(e.dividas.filter((c) => naLinha(c.mes))),
    desvios, retornos,
  })
  const saldo_final = linha.length ? linha[linha.length - 1].saldo_final : saldo_inicial

  const gasto = gastoNaVirada(p.gasto_2029_hoje, p.mes_base, p.virada, p.ipca_ano)
  const necessario = patrimonioNecessario(gasto - p.renda_certa_2029, p.margem, p.taxa_real_trabalho)
  const f = necessario === null ? 0 : calcFolga(saldo_final, necessario)
  let ajustes_falta: FuturoSaida['ajustes_falta'] = null
  if (f < 0) {
    const fatores = linha.map((l) => fatorLiquido(p.taxa_bruta_ano[anoDe(l.mes)], p.aliq_proj, diasDoMes(l.mes)))
    ajustes_falta = {
      guardar_por_mes: guardarPorMesNaLinha(-f, fatores),
      cortar_por_mes_2029: cortarPorMes2029(-f, p.taxa_real_trabalho),
      desejos_pra_adiar: desejosPraAdiar(e.desejos),
    }
  }
  return {
    linha,
    patrimonio_necessario: necessario,
    renda_sustentavel: rendaSustentavel(saldo_final, p.taxa_real_trabalho),
    folga: f,
    ajustes_falta,
    perguntas,
    avisos_fgc: avisosFGC(e.aplicacoes),
  }
}

/** "Isso tira R$ Y por mês da renda de 2029, pra sempre." (F6 com os parâmetros da família). */
export function impacto2029(e: FuturoEntrada, desvio: { mes: Mes; valor: Centavos }): { valor_na_virada: Centavos; perda_renda_mensal: Centavos | null } {
  return impactoDesvio(desvio.valor, desvio.mes, taxasDe(e))
}

/** F7 "Cabe?" (REVISOR C3): compara a linha COM o desejo contra a linha SEM ele.
 *  Mês derrubado = abaixo do piso com o desejo e não sem ele.
 *  "Ainda não cabe" = o desejo derruba algum mês; mostra o 1º e o 1º mês (até o último da linha) em que caberia.
 *  "Apertado sem o desejo" = a família já fica abaixo do piso sem ele e o desejo não derruba mês novo: mostra só o custo.
 *  "Cabe" = nada abaixo do piso e folga ≥ 0. "Cabe, mas tira" = nada abaixo do piso, só a folga de 2029 fica negativa. */
export function cabeDesejo(e: FuturoEntrada, desejo: Desejo): {
  situacao: 'cabe' | 'cabe, mas tira' | 'ainda nao cabe' | 'apertado sem o desejo'
  tira_por_mes_2029: Centavos | null
  primeiro_mes_abaixo: Mes | null
  caberia_em: Mes | null
  apertado_sem_desejo: Mes | null /* 1º mês abaixo do piso na linha sem o desejo */
} {
  const tira = avaliarDesejo(desejo, taxasDe(e)).impacto_renda_mensal
  const roda = (d: Desejo) => futuro({ ...e, desejos: [...e.desejos, d] })
  const semDesejo = futuro(e)
  const apertado = semDesejo.linha.find((l) => l.fica_devendo > 0)?.mes ?? null
  const derrubado = (s: FuturoSaida) => s.linha.find((l, i) => l.fica_devendo > 0 && semDesejo.linha[i].fica_devendo === 0)?.mes ?? null
  const s = roda(desejo)
  const primeiro = derrubado(s)
  if (primeiro === null) {
    const situacao = apertado !== null ? 'apertado sem o desejo' : s.folga >= 0 ? 'cabe' : 'cabe, mas tira'
    return { situacao, tira_por_mes_2029: tira, primeiro_mes_abaixo: null, caberia_em: null, apertado_sem_desejo: apertado }
  }
  const ultimo = mesAnterior(e.parametros.virada)
  let caberia: Mes | null = null
  for (let m = proximoMes(desejo.mes); compararMes(m, ultimo) <= 0; m = proximoMes(m)) {
    if (derrubado(roda({ ...desejo, mes: m })) === null) { caberia = m; break }
  }
  return { situacao: 'ainda nao cabe', tira_por_mes_2029: tira, primeiro_mes_abaixo: primeiro, caberia_em: caberia, apertado_sem_desejo: apertado }
}
