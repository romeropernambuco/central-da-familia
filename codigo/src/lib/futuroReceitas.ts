// E6: monta a entrada do motor de 2029 (lib/futuro, tipo FuturoEntrada) a partir do que produto.futuro_entradas (f_08)
// devolve. O modo exemplo monta o MESMO formato do banco e passa por aqui também: as 2 pontas saem iguais.
// Aqui não tem conta de 2029: só troca de formato (centavos, mês 'AAAA-MM', taxa em texto decimal) e as premissas do
// TIME.md quando a família ainda não disse o valor (marcadas em `confirmar`). Quem calcula é futuro(), em lib/futuro.
import { Dec, PADROES_ECONOMISTA, folha13, type FuturoEntrada, type Imovel, type Parametros, type Taxa } from './futuro'
import { salariosAteAVirada } from './futuroSalario'
import { viagensNoPlano } from './viagem'
import type {
  CenarioReceitas,
  ControleReceitas,
  FonteReceita,
  FontesReceita,
  FocusAno,
  NovoImovel,
  ParametrosObjetivo,
} from '../api/tipos'

/** O BANCO aceita a chave aliq_renda (IR de 2029 em diante, texto decimal, opcional) nos parâmetros do objetivo desde a f_13.
 *  Se um dia precisar voltar a não mandar (banco sem a f_13), basta pôr false: o campo fica travado no padrão de 15%. */
export const BANCO_GUARDA_ALIQ_RENDA = true
/** f_15: o banco aceita aliq_aluguel nos parâmetros. Banco sem a f_15: pôr false (a chave não vai; vale o padrão de 27,5%). */
export const BANCO_GUARDA_ALIQ_ALUGUEL = true

/** A virada: a partir de jan/2029 a família vive de rendimento (BRIEF). */
export const VIRADA = '2029-01'

/** Parâmetros que a tela começa a mostrar enquanto a família não gravou os dela: as premissas do TIME.md.
 *  Nenhum valor real: gasto e piso ficam [confirmar]; taxas são as recomendadas (margem 10%, 4% real, IR 15%). */
export const PARAMETROS_INICIAIS: ParametrosObjetivo = {
  gasto_2029_hoje: null,
  renda_certa_2029: 0,
  margem: '0.1000',
  taxa_real_trabalho: '0.0400',
  aliq_proj: PADROES_ECONOMISTA.aliq_proj /* revisão E12: 22,5% até 2028 (ECONOMISTA), editável no Objetivo */,
  aliq_renda: PADROES_ECONOMISTA.aliq_renda /* de 2029 em diante: 15% */,
  taxa_bruta_ano: {},
  ipca_ano: {},
  piso_meses: null,
  mes_reajuste: 1,
  travado_focus: false,
}

/** O que a tela recebe: a entrada pronta pro motor e o que ainda é premissa (pra escrever [confirmar] ao lado). */
export interface EntradaPronta {
  entrada: FuturoEntrada | null
  confirmar: string[]
  motivo?: string
  receitasBase?: FuturoEntrada['recebimentos']
  fontesReceita?: FontesReceita
  controleReceitas?: ControleReceitas
}

export const mesReceitaValido = (m: unknown): m is string => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m)
const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export function lerFontesReceita(v: unknown): { fontes: FontesReceita; corrompida: boolean } {
  if (v == null) return { fontes: {}, corrompida: false }
  if (!objeto(v)) return { fontes: {}, corrompida: true }
  const fontes: FontesReceita = {}
  let corrompida = false
  for (const [id, f] of Object.entries(v)) {
    if (
      !objeto(f) ||
      !['empresa', 'negocio_novo', 'aluguel', 'salario', 'outro'].includes(String(f.origem)) ||
      !['garantido', 'provavel', 'incerto'].includes(String(f.certeza)) ||
      !['unica', 'mensal', 'anual'].includes(String(f.recorrencia)) ||
      (f.fim !== undefined && !mesReceitaValido(f.fim)) ||
      (f.rotulo !== undefined && (typeof f.rotulo !== 'string' || f.rotulo.length > 80))
    ) {
      corrompida = true
      continue
    }
    fontes[id] = f as unknown as FonteReceita
  }
  return { fontes, corrompida }
}
export function lerControleReceitas(v: unknown): { controle: ControleReceitas; corrompida: boolean } {
  if (v == null) return { controle: {}, corrompida: false }
  if (!objeto(v)) return { controle: {}, corrompida: true }
  const controle: ControleReceitas = {}
  let corrompida = false
  const valor = (x: unknown) => Number.isSafeInteger(x) && Number(x) >= 0
  for (const [id, c] of Object.entries(v)) {
    if (
      !objeto(c) ||
      (c.valor !== undefined && !valor(c.valor)) ||
      (c.atualizado_em !== undefined && typeof c.atualizado_em !== 'string') ||
      (c.recebidas !== undefined &&
        (!objeto(c.recebidas) ||
          Object.entries(c.recebidas).some(
            ([m, r]) =>
              !mesReceitaValido(m) ||
              !objeto(r) ||
              !valor(r.valor) ||
              typeof r.data !== 'string' ||
              !/^\d{4}-\d{2}-\d{2}$/.test(r.data),
          )))
    ) {
      corrompida = true
      continue
    }
    controle[id] = c as ControleReceitas[string]
  }
  return { controle, corrompida }
}

/** Só meses: dias 29–31 nunca avançam para outro mês. Fim inclusivo; limite dez/2031.
 * Mês novo desloca apenas a primeira ocorrência, mantendo a cadência original.
 * Recebido no banco quita só a primeira; as demais são identificadas por id + mês. */
export function mesesDaReceita(inicio: string, fonte?: FonteReceita): string[] {
  inicio = inicio.slice(0, 7)
  if (!mesReceitaValido(inicio)) return []
  if (!fonte || fonte.recorrencia === 'unica') return [inicio]
  const fim = fonte.fim && fonte.fim < '2031-12' ? fonte.fim : '2031-12'
  const [a, m] = inicio.split('-').map(Number),
    out: string[] = []
  for (let n = a * 12 + m - 1; n <= 2031 * 12 + 11; n += fonte.recorrencia === 'anual' ? 12 : 1) {
    const mes = `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}`
    if (mes > fim) break
    out.push(mes)
  }
  return out
}

/** Cenários são cópias para simulação. Nenhum parâmetro, saldo ou taxa é alterado. */
export function prepararReceitas(
  base: FuturoEntrada['recebimentos'],
  fontes: FontesReceita = {},
  controle: ControleReceitas = {},
  cenario: CenarioReceitas = 'garantido',
): FuturoEntrada['recebimentos'] {
  return base.flatMap(r => {
    const f = fontes[r.id],
      c = controle[r.id]
    const inclui = f
      ? f.certeza === 'garantido' || (cenario !== 'garantido' && f.certeza === 'provavel') || cenario === 'tudo'
      : r.certo || cenario === 'tudo'
    return mesesDaReceita(r.mes_previsto, f).map((mes, i) => ({
      ...r,
      id: i === 0 ? r.id : `${r.id}@${mes}`,
      valor: c?.valor ?? r.valor,
      mes_previsto: mes,
      mes_novo: i === 0 ? (r.mes_novo?.slice(0, 7) ?? null) : null,
      certo: inclui,
      recebido: (i === 0 && r.recebido) || !!c?.recebidas?.[mes],
    }))
  })
}

/** Formato que produto.futuro_entradas devolve (só os campos que o motor usa). */
export interface FuturoBanco {
  hoje: string
  mes_base: string
  aplicacoes: {
    id: string
    titular_membro: string | null
    titular_nome: string | null
    titulares: { membro_id: string; nome: string }[]
    banco: string
    tipo: string
    saldo_centavos: number
    pct_cdi: string | number
    isenta: boolean
    aplicada_em: string
    resgate_previsto: string | null
  }[]
  cdi_hoje: { pct_ano: string | number | null }
  /** f_11: soma do dinheiro em conta corrente, fora das aplicações (centavos). Ausente = banco antes da f_11. */
  saldo_caixa?: number | string | null
  recebimentos: {
    id: string
    dono_nome: string | null
    valor_centavos: number
    mes_previsto: string
    mes_novo: string | null
    certo: boolean
    recebido_em: string | null
    /** f_08: o nome do recebimento */ descricao?: string | null
  }[]
  limites_mes: { envelope_id: string; limite_centavos: number }[]
  config: {
    casa_folha?: { pessoas?: { salario?: number }[] }
    /** Planejamento → Rendas (salário de cada um); f_08 já manda */
    rendas?: unknown
    fontes_receita?: unknown
    receitas_controle?: unknown
    /** viagens planejadas (lib/viagem.ts): parcelas e custos lá */
    viagens?: unknown
  } | null
  parcelas_futuras: { parcelas_lista: { mes_fatura: string; valor_centavos: number }[] }[]
  desejos: {
    id: string
    dono_membro: string
    valor_centavos: number
    mes: string
    volta_de: 'nada' | 'contrato' | 'investimento' | 'venda'
    volta_centavos: number | null
    volta_mes: string | null
    antecipado_centavos: number | null
    volta_certa: boolean
    situacao?: 'pensando' | 'combinado' | 'feito' | 'desisti'
  }[]
  parametros: ParametrosObjetivo | null
  focus: FocusAno[]
  /** f_15: os imóveis da família (só o dado; a conta é do motor). Ausente = banco antes da f_15 */
  imoveis?: ImovelBanco[]
}

/** Formato de cada imóvel em produto.futuro_entradas (f_15). Aceita também as chaves do tipo Imovel do motor (valor, aluguel_bruto,
 *  custos_mes), caso o BANCO passe a mandar com esses nomes. Só troca de formato. */
export interface ImovelBanco {
  id: string
  /** f_15 final: o id do membro dono */ dono?: string
  dono_membro?: string
  dono_nome?: string | null
  apelido: string
  uso: Imovel['uso']
  valor_estimado_centavos?: number | string
  valor?: number | string
  aluguel_centavos?: number | string
  aluguel_bruto?: number | string
  custos_centavos?: number | string
  custos_mes?: number | string
  vacancia: string | number
  tem_contrato: boolean
  contrato_ate: string | null
  venda_valor_centavos?: number | string | null
  venda_valor?: number | string | null
  venda_mes: string | null
  venda_contrato: boolean
  /** posto pelo app a partir do caderno do aluguel ("não me pagou"): o aluguel volta a contar a partir deste mês */
  sem_aluguel_ate?: string | null
}

/** O imóvel do banco no formato do motor (centavos, mês 'AAAA-MM'). */
export function imovelDoBanco(i: ImovelBanco): Imovel {
  const n = (...v: unknown[]) => {
    for (const x of v) if (x != null && x !== '') return Number(x) || 0
    return 0
  }
  const venda = i.venda_valor_centavos ?? i.venda_valor
  return {
    id: String(i.id),
    dono: String(i.dono ?? i.dono_membro ?? ''),
    apelido: i.apelido,
    uso: i.uso,
    valor: n(i.valor_estimado_centavos, i.valor),
    aluguel_bruto: n(i.aluguel_centavos, i.aluguel_bruto),
    custos_mes: n(i.custos_centavos, i.custos_mes),
    vacancia: String(i.vacancia ?? '0'),
    tem_contrato: !!i.tem_contrato,
    contrato_ate: i.contrato_ate ? String(i.contrato_ate).slice(0, 7) : null,
    venda_valor: venda == null ? null : Number(venda) || null,
    venda_mes: i.venda_mes ? String(i.venda_mes).slice(0, 7) : null,
    venda_contrato: !!i.venda_contrato,
    ...(i.sem_aluguel_ate && /^\d{4}-\d{2}$/.test(i.sem_aluguel_ate) ? { sem_aluguel_ate: i.sem_aluguel_ate } : {}),
  }
}

/** Poupança: 0,5% ao mês (regra atual), sem imposto: perto de 6,17% ao ano. */
const POUPANCA_ANO = '0.0617'

export function entradaDoBanco(j: FuturoBanco): EntradaPronta {
  const confirmar: string[] = []
  const p0 = j.parametros
  if (!p0) confirmar.push('parâmetros do objetivo (valem os números de exemplo até a família gravar os dela)')
  const p = p0 || PARAMETROS_INICIAIS
  const hoje = String(j.hoje).slice(0, 10),
    m0 = j.mes_base || hoje.slice(0, 7)
  // modo renda (QA E11, erros 1 e 2): depois da virada o motor não precisa dos anos até 2028; vale a taxa do ano de hoje
  // (se tiver) e, sem ela, o motor usa a taxa de trabalho e avisa (falta_taxa). A entrada sai mesmo sem nenhum ano.
  const depoisDaVirada = m0 >= VIRADA
  const anoHoje = Number(m0.slice(0, 4)),
    ultimoAno = depoisDaVirada ? anoHoje : Number(VIRADA.slice(0, 4)) - 1

  // taxa do ano: a da família se ela travou; senão a do Focus mais novo do ano; senão a da família; senão o ano mais perto que tiver
  const focus = new Map((j.focus || []).map(f => [f.ano, f]))
  const doAno = (k: 'selic_fim' | 'ipca', daFamilia: Record<string, string>, nome: string): Record<number, Taxa> => {
    const out: Record<number, Taxa> = {}
    for (let a = anoHoje; a <= ultimoAno; a++) {
      const v = p.travado_focus
        ? (daFamilia[String(a)] ?? focus.get(a)?.[k])
        : (focus.get(a)?.[k] ?? daFamilia[String(a)])
      if (v != null) out[a] = String(v)
    }
    const tem = Object.keys(out).map(Number).sort()
    if (!tem.length || depoisDaVirada) return out
    for (let a = anoHoje; a <= ultimoAno; a++)
      if (out[a] == null) {
        const perto = tem.reduce((x, y) => (Math.abs(y - a) < Math.abs(x - a) ? y : x))
        out[a] = out[perto]
        confirmar.push(`${nome} de ${a} (usei a de ${perto})`)
      }
    return out
  }
  const taxa_bruta_ano = doAno('selic_fim', p.taxa_bruta_ano || {}, 'Selic')
  const ipca_ano = doAno('ipca', p.ipca_ano || {}, 'IPCA')
  if (!depoisDaVirada && (!Object.keys(taxa_bruta_ano).length || !Object.keys(ipca_ano).length))
    return {
      entrada: null,
      confirmar,
      motivo: 'Falta a Selic e o IPCA de cada ano até 2028 (do Focus ou digitados aqui).',
    }

  const teto_mes = (j.limites_mes || []).reduce((s, l) => s + (Number(l.limite_centavos) || 0), 0)
  if (p.gasto_2029_hoje == null) confirmar.push('gasto por mês em 2029 (a conta usa o teto do mês de hoje)')
  if (depoisDaVirada && (!taxa_bruta_ano[anoHoje] || !ipca_ano[anoHoje]))
    confirmar.push(`Selic e IPCA de ${anoHoje} (a conta usa o rendimento acima da inflação do objetivo)`)
  if (p.piso_meses == null) confirmar.push('piso do caixa (a conta usa 6 meses de teto)')
  if ((j.imoveis || []).some(i => i.uso !== 'mora') && !p.aliq_aluguel)
    confirmar.push(`imposto do aluguel (a conta usa ${textoDaTaxa(PADROES_ECONOMISTA.aliq_aluguel)}%)`)
  const parametros: Parametros = {
    mes_base: m0,
    virada: VIRADA,
    gasto_2029_hoje: p.gasto_2029_hoje ?? teto_mes,
    renda_certa_2029: p.renda_certa_2029 || 0,
    margem: p.margem,
    taxa_real_trabalho: p.taxa_real_trabalho,
    taxa_bruta_ano,
    ipca_ano,
    aliq_proj: p.aliq_proj,
    // os 2 impostos: até 2028 (aliq_proj) e de 2029 em diante (aliq_renda); vazio = padrão do ECONOMISTA
    aliq_renda: p.aliq_renda || PADROES_ECONOMISTA.aliq_renda,
    // f_15: IR do aluguel. Sem ele, o motor usa 27,5% e avisa (aliq_aluguel_confirmar)
    ...(p.aliq_aluguel ? { aliq_aluguel: p.aliq_aluguel } : {}),
    piso_meses: p.piso_meses ?? 6,
    teto_mes,
    mes_reajuste: p.mes_reajuste || 1,
  }

  const cdi = j.cdi_hoje?.pct_ano == null ? null : new Dec(String(j.cdi_hoje.pct_ano))
  if (!cdi) confirmar.push('taxa de hoje das aplicações (sem o CDI do dia)')
  const aplicacoes = (j.aplicacoes || []).map(a => ({
    id: String(a.id),
    titular: a.titular_nome ?? null,
    titulares: (a.titulares || []).map(t => t.nome),
    banco: a.banco,
    saldo: Number(a.saldo_centavos) || 0,
    taxa_bruta_anual:
      a.tipo === 'poupanca'
        ? POUPANCA_ANO
        : cdi
          ? new Dec(String(a.pct_cdi || 0)).div(100).times(cdi).div(100).toString()
          : '0',
    isenta: !!a.isenta,
    aplicada_em: String(a.aplicada_em).slice(0, 10),
    resgate_previsto: a.resgate_previsto ? String(a.resgate_previsto).slice(0, 10) : null,
    fgc: a.tipo !== 'tesouro_selic',
  }))
  // f_11: o banco manda a soma do dinheiro em conta corrente (saldos_conta). Sem o campo (banco antes da f_11): 0 e [confirmar]
  const saldo_caixa = j.saldo_caixa == null ? 0 : Number(j.saldo_caixa) || 0
  if (j.saldo_caixa == null) confirmar.push('dinheiro parado na conta, fora das aplicações (a conta usa R$ 0)')

  const compromissos: FuturoEntrada['compromissos'] = []
  // Parcelas já estão no teto do envelope; como compromissos seriam descontadas duas vezes.
  // 13º só nos pagamentos (decisão do dono): 1 salário de cada pessoa da folha em dezembro de cada ano até a virada
  compromissos.push(
    ...folha13(
      (j.config?.casa_folha?.pessoas || []).map(x => Math.round((Number(x.salario) || 0) * 100)),
      m0,
      VIRADA,
    ),
  )
  // viagem planejada: parcelas da compra antecipada e custos lá, da sobra do mês (regra do dono, 22/11)
  const viagens = viagensNoPlano(j.config?.viagens, m0)
  compromissos.push(...viagens.compromissos)

  const fontes = lerFontesReceita(j.config?.fontes_receita),
    controle = lerControleReceitas(j.config?.receitas_controle)
  if (fontes.corrompida || controle.corrompida)
    confirmar.push(
      'Cadastro de receitas com dados inválidos: confira as fontes e as ocorrências antes de usar a projeção.',
    )
  const receitasBase = [
    ...(j.recebimentos || []).map(r => ({
      id: String(r.id),
      dono: r.dono_nome || '',
      valor: Number(r.valor_centavos) || 0,
      mes_previsto: String(r.mes_previsto).slice(0, 7),
      mes_novo: r.mes_novo ? String(r.mes_novo).slice(0, 7) : null,
      certo: !!r.certo,
      recebido: !!r.recebido_em,
      descricao: r.descricao ?? null,
    })),
    // o salário de Rendas até a virada; quem já cadastrou o salário em Recebimentos (origem salário) não conta 2 vezes
    ...(Object.values(fontes.fontes).some(f => f.origem === 'salario')
      ? []
      : salariosAteAVirada(j.config?.rendas, m0, VIRADA)),
  ]
  return {
    confirmar,
    receitasBase,
    fontesReceita: fontes.fontes,
    controleReceitas: controle.controle,
    entrada: {
      hoje,
      saldo_caixa,
      aplicacoes,
      recebimentos: prepararReceitas(receitasBase, fontes.fontes, controle.controle),
      compromissos,
      dividas: [],
      desvios: viagens.desvios,
      desejos: (j.desejos || []).map(d => ({
        id: String(d.id),
        dono: String(d.dono_membro),
        valor: Number(d.valor_centavos) || 0,
        mes: d.mes,
        volta_de: d.volta_de,
        volta: Number(d.volta_centavos) || 0,
        volta_mes: d.volta_mes,
        antecipado: d.antecipado_centavos == null ? null : Number(d.antecipado_centavos),
        volta_certa: !!d.volta_certa,
        ...(d.situacao ? { situacao: d.situacao } : {}),
      })),
      // revisão E12 (C2): a situação vai junto; o motor ignora "feito" (o dinheiro já saiu do saldo) e "desisti"
      parametros,
      // RODADA_PATRIMONIO: o aluguel com contrato entra pelos imóveis (nunca em renda_certa_2029, senão conta 2 vezes)
      imoveis: (j.imoveis || []).map(imovelDoBanco),
    },
  }
}

/** "10,5" (por cento, como a pessoa digita) vira "0.105" (texto decimal do banco). null se não for número. */
export function taxaDoTexto(t: string): string | null {
  const s = t.trim().replace(/\s|%/g, '').replace(',', '.')
  if (!/^-?\d{1,3}(\.\d{1,4})?$/.test(s)) return null
  return new Dec(s).div(100).toString()
}
/** "0.105" vira "10,5" (pra mostrar e editar). */
export function textoDaTaxa(t: string | null | undefined): string {
  if (t == null || !/^-?\d+(\.\d+)?$/.test(String(t))) return ''
  return new Dec(String(t)).times(100).toDecimalPlaces(4).toString().replace('.', ',')
}

/** As regras de gravação do imóvel (as mesmas checagens da tabela produto.imovel, f_15). Volta a frase do que falta, ou ''. */
export function imovelInvalido(d: NovoImovel): string {
  if (!d.apelido.trim()) return 'Dê um apelido pro imóvel (ex.: sala do centro).'
  if (d.apelido.trim().length > 60) return 'O apelido pode ter até 60 letras.'
  if (!(d.valor >= 0) || d.valor > 1e9) return 'Confira o valor do imóvel.'
  if (!['mora', 'aluga', 'parado', 'vende'].includes(d.uso)) return 'Escolha para que serve o imóvel.'
  if (!(d.aluguel >= 0) || !(d.custos >= 0) || d.aluguel > 1e8 || d.custos > 1e8)
    return 'Confira o aluguel e os custos.'
  if (!/^[0-9]+(\.[0-9]+)?$/.test(d.vacancia) || Number(d.vacancia) > 1) return 'Os meses vazios vão de 0 a 100%.'
  if (d.contrato_ate != null && !/^\d{4}-(0[1-9]|1[0-2])$/.test(d.contrato_ate))
    return 'Escolha o mês em que o contrato acaba.'
  if ((d.venda_valor == null) !== (d.venda_mes == null)) return 'Na venda planejada, diga o valor e o mês.'
  if (d.venda_valor != null && !(d.venda_valor > 0)) return 'O valor da venda tem que ser maior que zero.'
  return ''
}

/** A entrada do motor com as receitas do cenário escolhido (Garantido, Com previstos ou Com tudo). */
export function entradaDoCenario(
  p: EntradaPronta,
  c: CenarioReceitas,
  fontes = p.fontesReceita ?? {},
  controle = p.controleReceitas ?? {},
): FuturoEntrada | null {
  return p.entrada
    ? { ...p.entrada, recebimentos: prepararReceitas(p.receitasBase ?? p.entrada.recebimentos, fontes, controle, c) }
    : null
}
