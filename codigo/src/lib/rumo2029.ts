import {
  futuro,
  rendaSustentavel,
  gastoNaVirada,
  listaMeses,
  proximoMes,
  type FuturoEntrada,
  type FuturoSaida,
} from './futuro'

/** Valores em centavos; faltas negativas significam sobra. A decisão é a folga do motor, com margem. */
export function numerosRumo2029(s: FuturoSaida, e: FuturoEntrada) {
  const gasto_necessario =
    s.renda?.gasto_do_mes ??
    gastoNaVirada(e.parametros.gasto_2029_hoje, e.parametros.mes_base, e.parametros.virada, e.parametros.ipca_ano)
  const renda = (s.renda_total_2029 ?? s.renda_sustentavel) + e.parametros.renda_certa_2029
  const falta_sem_margem = gasto_necessario - renda
  const falta_com_margem =
    s.patrimonio_necessario === null
      ? null
      : s.folga < 0
        ? s.ajustes_falta!.cortar_por_mes_2029
        : -rendaSustentavel(s.folga, s.renda?.taxa_real_anual ?? e.parametros.taxa_real_trabalho)
  const margem = falta_com_margem === null ? null : falta_com_margem - falta_sem_margem
  const alvo = margem === null ? 0 : gasto_necessario + margem
  return {
    gasto_necessario,
    renda,
    falta_sem_margem,
    margem,
    falta_com_margem,
    cobre_pct: gasto_necessario > 0 && alvo > 0 ? (renda / alvo) * 100 : null,
  }
}

/** Usa a saída do mesmo cenário do seletor; receitas acumuladas já estão nas aplicações. */
export function rumoDoCenario(e: FuturoEntrada, s: FuturoSaida, config: unknown, detalhes = true): RumoCalculado {
  const n = numerosRumo2029(s, e)
  const referencia = s.renda?.mes ?? e.parametros.virada
  const recorrentes = receitasNoMes(e, lerFontes(config), referencia).map(r => ({
    ...r,
    entra: false,
    nota: 'Até 12/2028 já está nas aplicações; não soma na renda de 2029.',
  }))
  const linha =
    detalhes && referencia <= '2031-12'
      ? listaMeses(referencia, '2031-12').map(mes => {
          const entrada = preparar(e, {}, mes)
          // Preserva as receitas do adaptador, sem criar uma segunda regra de recorrência.
          entrada.recebimentos = e.recebimentos
          entrada.parametros.renda_certa_2029 = e.parametros.renda_certa_2029
          const m = numerosRumo2029(futuro(entrada), entrada)
          return { mes, renda: m.renda, gasto: m.gasto_necessario, cobertura: m.cobre_pct }
        })
      : []
  const alavancas: Alavanca[] = []
  const efeito = (nova: FuturoEntrada) =>
    Math.round((n.falta_com_margem ?? 0) - (numerosRumo2029(futuro(nova), nova).falta_com_margem ?? 0))
  if (detalhes && referencia === '2029-01') {
    const guardar = s.ajustes_falta?.guardar_por_mes ?? 0
    const meses = listaMeses(proximoMes(e.hoje.slice(0, 7)), '2028-12')
    if (guardar > 0 && meses.length)
      alavancas.push({
        id: 'guardar',
        texto: 'Guardar a mais por mês',
        valor: guardar,
        efeito: efeito({
          ...e,
          recebimentos: [
            ...e.recebimentos,
            ...meses.map(m => ({
              id: `simular:${m}`,
              dono: '',
              valor: guardar,
              mes_previsto: m,
              mes_novo: null,
              certo: true,
              recebido: false,
            })),
          ],
        }),
        premissa: 'Guardando no fim de cada mês até 12/2028.',
      })
    const corte = Math.min(e.parametros.gasto_2029_hoje, s.ajustes_falta?.cortar_por_mes_2029 ?? 0)
    if (corte > 0)
      alavancas.push({
        id: 'cortar',
        texto: 'Reduzir o gasto mensal (valor de hoje)',
        valor: corte,
        efeito: efeito({
          ...e,
          parametros: { ...e.parametros, gasto_2029_hoje: e.parametros.gasto_2029_hoje - corte },
        }),
        premissa: 'Gastando menos todo mês, já contando a inflação até 2029.',
      })
    for (const i of e.imoveis ?? []) {
      if (i.uso === 'mora' || i.aluguel_bruto <= 0 || (i.tem_contrato && (i.contrato_ate ?? '') >= '2029-12')) continue
      alavancas.push({
        id: `imovel:${i.id}`,
        texto: `Se houver contrato até dez/2029: ${i.apelido}`,
        valor: 0,
        efeito: efeito({
          ...e,
          imoveis: e.imoveis!.map(x => (x.id === i.id ? { ...x, tem_contrato: true, contrato_ate: '2029-12' } : x)),
        }),
        premissa: 'Se o imóvel tiver contrato, com os mesmos custos e imposto.',
      })
    }
    for (const r of e.recebimentos) {
      const antecipar = proximoMes(e.hoje.slice(0, 7))
      if (
        !r.certo ||
        r.recebido ||
        r.id.includes('@') ||
        (r.mes_novo ?? r.mes_previsto) <= antecipar ||
        antecipar >= '2029-01'
      )
        continue
      alavancas.push({
        id: `receita:${r.id}`,
        texto: `Se antecipar: ${r.descricao || 'recebimento'}`,
        valor: r.valor,
        efeito: efeito({
          ...e,
          recebimentos: e.recebimentos.map(x => (x.id === r.id ? { ...x, mes_novo: antecipar } : x)),
        }),
        premissa: `Se o dinheiro chegar em ${antecipar.slice(5)}/${antecipar.slice(0, 4)}, pelo mesmo valor.`,
      })
    }
  }
  return {
    referencia,
    saida: s,
    numeros: n,
    gasto: n.gasto_necessario,
    total: n.renda,
    cobertura: n.cobre_pct,
    falta: Math.max(0, n.falta_com_margem ?? 0),
    aplicacoes: s.renda_sustentavel,
    alugueis: s.aluguel_liquido_2029 ?? 0,
    rendaCerta: e.parametros.renda_certa_2029,
    recorrentes,
    linha,
    cobreEm: linha.find(m => m.cobertura !== null && m.cobertura >= 100)?.mes ?? null,
    alavancas: alavancas
      .filter(a => a.efeito > 0)
      .sort((a, b) => b.efeito - a.efeito)
      .slice(0, 3),
    premissas: [
      'A decisão usa a margem de segurança do motor, aplicada ao gasto após descontar renda certa e aluguéis elegíveis.',
      'Receitas recorrentes não são renda permanente no motor: entradas até dez/2028 compõem o patrimônio das aplicações. Previsto e incerto só entram no cenário escolhido.',
      'Garantido descreve o cadastro, não uma promessa. Rendimentos são estimativas. Renda certa do Objetivo mantém a origem cadastrada a confirmar.',
      'Quando cobre simula cada mês com margem de segurança; anos sem taxa repetem a última Selic e o último IPCA. Não garante os meses seguintes.',
    ],
  }
}

type Origem = 'empresa' | 'negocio_novo' | 'aluguel' | 'salario' | 'outro'
type Certeza = 'garantido' | 'provavel' | 'incerto'
export interface FonteReceita {
  origem: Origem
  certeza: Certeza
  recorrencia: 'unica' | 'mensal' | 'anual'
  fim?: string
}
export type FontesReceita = Record<string, FonteReceita>
const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const mesValido = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
export function lerFontes(v: unknown): FontesReceita {
  if (!objeto(v)) return {}
  return Object.fromEntries(
    Object.entries(v).filter(
      ([, f]) =>
        objeto(f) &&
        ['empresa', 'negocio_novo', 'aluguel', 'salario', 'outro'].includes(String(f.origem)) &&
        ['garantido', 'provavel', 'incerto'].includes(String(f.certeza)) &&
        ['unica', 'mensal', 'anual'].includes(String(f.recorrencia)) &&
        (f.fim === undefined || mesValido(f.fim)),
    ),
  ) as FontesReceita
}
export interface FonteMensal {
  id: string
  nome: string
  valor: number
  grupo: 'Garantido' | 'Previsto' | 'Incerto'
  entra: boolean
  nota: string
}
export interface CoberturaMes {
  mes: string
  renda: number
  gasto: number
  cobertura: number | null
}
export interface Alavanca {
  id: string
  texto: string
  valor: number
  efeito: number
  premissa: string
}
export interface RumoCalculado {
  numeros: ReturnType<typeof numerosRumo2029>
  rendaCerta?: number
  referencia: string
  saida: FuturoSaida
  gasto: number
  total: number
  cobertura: number | null
  falta: number
  aplicacoes: number
  alugueis: number
  recorrentes: FonteMensal[]
  linha: CoberturaMes[]
  cobreEm: string | null
  alavancas: Alavanca[]
  premissas: string[]
}

function receitasNoMes(e: FuturoEntrada, fontes: FontesReceita, mes: string): FonteMensal[] {
  const fimMinimo = listaMeses(mes, `${Number(mes.slice(0, 4)) + 1}-${mes.slice(5)}`)[11]
  return e.recebimentos.flatMap(r => {
    const f = fontes[r.id]
    if (!f || !['empresa', 'negocio_novo'].includes(f.origem) || f.recorrencia === 'unica') return []
    const inicio = r.mes_novo ?? r.mes_previsto
    if (inicio > mes || (f.fim && f.fim < mes)) return []
    const grupo =
      f.certeza === 'incerto' || (f.certeza === 'garantido' && !r.certo)
        ? 'Incerto'
        : f.certeza === 'provavel'
          ? 'Previsto'
          : 'Garantido'
    const curta = !!f.fim && f.fim < fimMinimo
    const entra = grupo === 'Garantido' && f.recorrencia === 'mensal' && !curta
    return [
      {
        id: r.id,
        nome: r.descricao || (f.origem === 'empresa' ? 'Empresa' : 'Novo negócio'),
        valor: r.valor,
        grupo,
        entra,
        nota:
          f.recorrencia === 'anual'
            ? 'Por ano; fora da cobertura mensal.'
            : curta
              ? `Termina em ${f.fim}; fora da cobertura de 12 meses.`
              : !entra
                ? 'Fora da cobertura.'
                : f.fim
                  ? `Mensal até ${f.fim}.`
                  : 'Mensal, sem fim informado; confirmar continuidade.',
      },
    ]
  })
}

/** Adaptação local, sem alterar o motor: recorrência identificada vira fluxo com data, nunca aporte e renda em duplicidade. */
function preparar(e: FuturoEntrada, fontes: FontesReceita, mes: string): FuturoEntrada {
  const recebimentos = e.recebimentos.flatMap(r => {
    const f = fontes[r.id]
    if (!f) return (r.mes_novo ?? r.mes_previsto) < '2029-01' ? [r] : []
    if (f.origem === 'salario' || f.origem === 'aluguel') return []
    if (f.recorrencia === 'unica') return [{ ...r, certo: r.certo && f.certeza === 'garantido' }]
    if (!['empresa', 'negocio_novo'].includes(f.origem) || !r.certo || f.certeza !== 'garantido') return []
    const inicio = r.mes_novo ?? r.mes_previsto
    if (!mesValido(inicio) || inicio >= mes) return []
    return listaMeses(inicio, mes)
      .filter(m => m < mes && (!f.fim || m <= f.fim) && (f.recorrencia === 'mensal' || m.slice(5) === inicio.slice(5)))
      .map(m => ({ ...r, id: `${r.id}:${m}`, mes_previsto: m, mes_novo: null, recebido: m <= e.hoje.slice(0, 7) }))
  })
  // Mantém as taxas existentes. Só estende para anos sem taxa, explicitamente nas premissas.
  const estender = (taxas: Record<number, string>) => {
    const copia = { ...taxas },
      anos = Object.keys(taxas)
        .map(Number)
        .sort((a, b) => a - b)
    const ultima = anos[anos.length - 1]
    if (ultima) for (let a = ultima + 1; a <= 2031; a++) copia[a] = taxas[ultima]
    return copia
  }
  return {
    ...e,
    recebimentos,
    parametros: {
      ...e.parametros,
      virada: mes,
      renda_certa_2029: 0,
      taxa_bruta_ano: estender(e.parametros.taxa_bruta_ano),
      ipca_ano: estender(e.parametros.ipca_ano),
    },
  }
}

function medir(e: FuturoEntrada, fontes: FontesReceita, mes: string) {
  const entrada = preparar(e, fontes, mes),
    saida = futuro(entrada)
  const gasto = gastoNaVirada(
    entrada.parametros.gasto_2029_hoje,
    entrada.parametros.mes_base,
    mes,
    entrada.parametros.ipca_ano,
  )
  const recorrentes = receitasNoMes(e, fontes, mes)
  const aplicacoes = saida.renda_sustentavel,
    alugueis = saida.aluguel_liquido_2029 ?? 0
  const total = aplicacoes + alugueis + recorrentes.filter(r => r.entra).reduce((s, r) => s + r.valor, 0)
  return {
    numeros: numerosRumo2029(saida, entrada),
    entrada,
    saida,
    gasto,
    aplicacoes,
    alugueis,
    recorrentes,
    total,
    cobertura: gasto > 0 ? (total / gasto) * 100 : null,
    falta: Math.max(0, gasto - total),
  }
}

/** Todos os cenários passam pelo mesmo motor; nenhuma previsão é gravada. Ver DEFINICOES-PROVISORIAS.md. */
export function calcularRumo(e: FuturoEntrada, config: unknown, detalhes = true): RumoCalculado {
  const referencia = e.hoje.slice(0, 7) > '2029-01' ? e.hoje.slice(0, 7) : '2029-01'
  const fontes = lerFontes(config),
    base = medir(e, fontes, referencia)
  const inicio = e.hoje.slice(0, 7) > '2029-01' ? e.hoje.slice(0, 7) : '2029-01'
  const linha =
    detalhes && inicio <= '2031-12'
      ? listaMeses(inicio, '2031-12').map(mes => {
          const m = mes === referencia ? base : medir(e, fontes, mes)
          return { mes, renda: m.total, gasto: m.gasto, cobertura: m.cobertura }
        })
      : []
  const alavancas: Alavanca[] = []
  const efeito = (nova: FuturoEntrada) => {
    const m = medir(nova, fontes, '2029-01')
    return Math.round(m.total - m.gasto - (base.total - base.gasto))
  }
  if (detalhes && referencia === '2029-01') {
    const guardar = base.saida.ajustes_falta?.guardar_por_mes ?? 0
    const meses = listaMeses(proximoMes(e.hoje.slice(0, 7)), '2028-12')
    if (guardar > 0 && meses.length) {
      const nova = {
        ...e,
        recebimentos: [
          ...e.recebimentos,
          ...meses.map(m => ({
            id: `simular:${m}`,
            dono: '',
            valor: guardar,
            mes_previsto: m,
            mes_novo: null,
            certo: true,
            recebido: false,
          })),
        ],
      }
      alavancas.push({
        id: 'guardar',
        texto: 'Guardar a mais por mês',
        valor: guardar,
        efeito: efeito(nova),
        premissa: 'Guardando no fim de cada mês até 12/2028.',
      })
    }
    const corte = Math.min(e.parametros.gasto_2029_hoje, base.saida.ajustes_falta?.cortar_por_mes_2029 ?? 0)
    if (corte > 0)
      alavancas.push({
        id: 'cortar',
        texto: 'Reduzir o gasto mensal (valor de hoje)',
        valor: corte,
        efeito: efeito({
          ...e,
          parametros: { ...e.parametros, gasto_2029_hoje: e.parametros.gasto_2029_hoje - corte },
        }),
        premissa: 'Gastando menos todo mês, já contando a inflação até 2029.',
      })
    for (const i of e.imoveis ?? []) {
      if (i.uso === 'mora' || i.aluguel_bruto <= 0 || (i.tem_contrato && (i.contrato_ate ?? '') >= '2029-12')) continue
      const nova = {
        ...e,
        imoveis: e.imoveis!.map(x => (x.id === i.id ? { ...x, tem_contrato: true, contrato_ate: '2029-12' } : x)),
      }
      alavancas.push({
        id: `imovel:${i.id}`,
        texto: `Se houver contrato até dez/2029: ${i.apelido}`,
        valor: 0,
        efeito: efeito(nova),
        premissa: 'Se o imóvel tiver contrato, com o mesmo aluguel, custos e imposto.',
      })
    }
    for (const r of e.recebimentos) {
      if (
        !r.certo ||
        r.recebido ||
        (fontes[r.id] && (fontes[r.id].recorrencia !== 'unica' || fontes[r.id].certeza !== 'garantido'))
      )
        continue
      const antecipar = proximoMes(e.hoje.slice(0, 7))
      if ((r.mes_novo ?? r.mes_previsto) <= antecipar || antecipar >= '2029-01') continue
      alavancas.push({
        id: `receita:${r.id}`,
        texto: `Se antecipar: ${r.descricao || 'recebimento'}`,
        valor: r.valor,
        efeito: efeito({
          ...e,
          recebimentos: e.recebimentos.map(x => (x.id === r.id ? { ...x, mes_novo: antecipar } : x)),
        }),
        premissa: `Se o dinheiro chegar em ${antecipar.slice(5)}/${antecipar.slice(0, 4)}, pelo mesmo valor.`,
      })
    }
  }
  return {
    ...base,
    referencia,
    linha,
    cobreEm: linha.find(m => m.cobertura !== null && m.cobertura >= 100)?.mes ?? null,
    alavancas: alavancas
      .filter(a => a.efeito > 0)
      .sort((a, b) => b.efeito - a.efeito)
      .slice(0, 3),
    premissas: [
      `Base: ${e.hoje}. Fonte: saldos, imóveis, recebimentos e parâmetros da família. Rendimento real estimado: ${(Number(e.parametros.taxa_real_trabalho) * 100).toLocaleString('pt-BR')}% ao ano, acima da inflação.`,
      `Taxas anuais usadas pelo motor (parâmetros da família/Focus): Selic ${
        Object.entries(e.parametros.taxa_bruta_ano)
          .map(([a, t]) => `${a}: ${(Number(t) * 100).toLocaleString('pt-BR')}%`)
          .join('; ') || 'não informada'
      }. IPCA ${
        Object.entries(e.parametros.ipca_ano)
          .map(([a, t]) => `${a}: ${(Number(t) * 100).toLocaleString('pt-BR')}%`)
          .join('; ') || 'não informado'
      }.`,
      `Imposto sobre rendimentos na projeção: ${(Number(e.parametros.aliq_proj) * 100).toLocaleString('pt-BR')}%; no modo renda: ${(Number(e.parametros.aliq_renda ?? e.parametros.aliq_proj) * 100).toLocaleString('pt-BR')}%.`,
      `Gasto necessário corrigido pelo IPCA do motor; a barra não inclui a margem de segurança de ${(Number(e.parametros.margem) * 100).toLocaleString('pt-BR')}%. Aplicações incluem o caixa projetado e os recebimentos certos acumulados.`,
      `Aluguéis: só contratos com 12 meses à frente; descontam custos, vacância e imposto de ${(Number(e.parametros.aliq_aluguel ?? '0.275') * 100).toLocaleString('pt-BR')}%${base.saida.aliq_aluguel_confirmar ? ' (a confirmar)' : ''}.`,
      'Fora da cobertura: salário, verba, renda certa sem origem identificada, receitas prováveis ou incertas, anuais e contratos com menos de 12 meses. Aluguel cadastrado em recebimentos fica fora para evitar duplicidade.',
      'Empresas e novos negócios: só receitas mensais identificadas como garantidas e certas. Sem data de fim, a continuidade precisa ser confirmada. “Garantido” descreve o cadastro, não uma promessa de rendimento.',
      'Receitas de empresas usam o valor cadastrado, sem calcular impostos ou despesas do negócio: confirme quanto fica líquido para a família.',
      'Quando cobre: cenários de início da vida de rendimentos, mês a mês, até dez/2031. Mantém o teto e os fluxos cadastrados até cada data; não supõe salário nem aportes extras. Anos sem taxa repetem a última Selic e o último IPCA disponíveis. Não significa cobertura para sempre.',
      ...(e.parametros.renda_certa_2029 > 0
        ? [
            'Há renda certa no objetivo antigo; este painel não a soma, pois sua origem pode incluir salário ou aluguel já contado.',
          ]
        : []),
    ],
  }
}
