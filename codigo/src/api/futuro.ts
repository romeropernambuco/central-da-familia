// E6: monta a entrada do motor de 2029 (lib/futuro, tipo FuturoEntrada) a partir do que produto.futuro_entradas (f_08)
// devolve. O modo exemplo monta o MESMO formato do banco e passa por aqui também: as 2 pontas saem iguais.
// Aqui não tem conta de 2029: só troca de formato (centavos, mês 'AAAA-MM', taxa em texto decimal) e as premissas do
// TIME.md quando a família ainda não disse o valor (marcadas em `confirmar`). Quem calcula é futuro(), em lib/futuro.
import { Dec, PADROES_ECONOMISTA, folha13, type FuturoEntrada, type Parametros, type Taxa } from '../lib/futuro'
import type { FocusAno, ParametrosObjetivo } from './tipos'

/** A virada: a partir de jan/2029 a família vive de rendimento (BRIEF). */
export const VIRADA = '2029-01'

/** Parâmetros que a tela começa a mostrar enquanto a família não gravou os dela: as premissas do TIME.md.
 *  Nenhum valor real: gasto e piso ficam [confirmar]; taxas são as recomendadas (margem 10%, 4% real, IR 15%). */
export const PARAMETROS_INICIAIS: ParametrosObjetivo = {
  gasto_2029_hoje: null, renda_certa_2029: 0, margem: '0.1000', taxa_real_trabalho: '0.0400', aliq_proj: PADROES_ECONOMISTA.aliq_proj /* revisão E12: 22,5% até 2028 (ECONOMISTA), editável no Objetivo */,
  taxa_bruta_ano: {}, ipca_ano: {}, piso_meses: null, mes_reajuste: 1, travado_focus: false,
}

/** O que a tela recebe: a entrada pronta pro motor e o que ainda é premissa (pra escrever [confirmar] ao lado). */
export interface EntradaPronta { entrada: FuturoEntrada | null; confirmar: string[]; motivo?: string }

/** Formato que produto.futuro_entradas devolve (só os campos que o motor usa). */
export interface FuturoBanco {
  hoje: string; mes_base: string
  aplicacoes: { id: string; titular_membro: string | null; titular_nome: string | null; titulares: { membro_id: string; nome: string }[]; banco: string; tipo: string; saldo_centavos: number; pct_cdi: string | number; isenta: boolean; aplicada_em: string; resgate_previsto: string | null }[]
  cdi_hoje: { pct_ano: string | number | null }
  /** f_11: soma do dinheiro em conta corrente, fora das aplicações (centavos). Ausente = banco antes da f_11. */
  saldo_caixa?: number | string | null
  recebimentos: { id: string; dono_nome: string | null; valor_centavos: number; mes_previsto: string; mes_novo: string | null; certo: boolean; recebido_em: string | null }[]
  limites_mes: { envelope_id: string; limite_centavos: number }[]
  config: { casa_folha?: { pessoas?: { salario?: number }[] } } | null
  parcelas_futuras: { parcelas_lista: { mes_fatura: string; valor_centavos: number }[] }[]
  desejos: { id: string; dono_membro: string; valor_centavos: number; mes: string; volta_de: 'nada' | 'contrato' | 'investimento' | 'venda'; volta_centavos: number | null; volta_mes: string | null; antecipado_centavos: number | null; volta_certa: boolean; situacao?: 'pensando' | 'combinado' | 'feito' | 'desisti' }[]
  parametros: ParametrosObjetivo | null
  focus: FocusAno[]
}

/** Poupança: 0,5% ao mês (regra atual), sem imposto: perto de 6,17% ao ano. */
const POUPANCA_ANO = '0.0617'

export function entradaDoBanco(j: FuturoBanco): EntradaPronta {
  const confirmar: string[] = []
  const p0 = j.parametros
  if (!p0) confirmar.push('parâmetros do objetivo (valem os números de exemplo até a família gravar os dela)')
  const p = p0 || PARAMETROS_INICIAIS
  const hoje = String(j.hoje).slice(0, 10), m0 = j.mes_base || hoje.slice(0, 7)
  // modo renda (QA E11, erros 1 e 2): depois da virada o motor não precisa dos anos até 2028; vale a taxa do ano de hoje
  // (se tiver) e, sem ela, o motor usa a taxa de trabalho e avisa (falta_taxa). A entrada sai mesmo sem nenhum ano.
  const depoisDaVirada = m0 >= VIRADA
  const anoHoje = Number(m0.slice(0, 4)), ultimoAno = depoisDaVirada ? anoHoje : Number(VIRADA.slice(0, 4)) - 1

  // taxa do ano: a da família se ela travou; senão a do Focus mais novo do ano; senão a da família; senão o ano mais perto que tiver
  const focus = new Map((j.focus || []).map(f => [f.ano, f]))
  const doAno = (k: 'selic_fim' | 'ipca', daFamilia: Record<string, string>, nome: string): Record<number, Taxa> => {
    const out: Record<number, Taxa> = {}
    for (let a = anoHoje; a <= ultimoAno; a++) {
      const v = p.travado_focus ? daFamilia[String(a)] ?? focus.get(a)?.[k] : focus.get(a)?.[k] ?? daFamilia[String(a)]
      if (v != null) out[a] = String(v)
    }
    const tem = Object.keys(out).map(Number).sort()
    if (!tem.length || depoisDaVirada) return out
    for (let a = anoHoje; a <= ultimoAno; a++) if (out[a] == null) { const perto = tem.reduce((x, y) => (Math.abs(y - a) < Math.abs(x - a) ? y : x)); out[a] = out[perto]; confirmar.push(`${nome} de ${a} (usei a de ${perto})`) }
    return out
  }
  const taxa_bruta_ano = doAno('selic_fim', p.taxa_bruta_ano || {}, 'Selic')
  const ipca_ano = doAno('ipca', p.ipca_ano || {}, 'IPCA')
  if (!depoisDaVirada && (!Object.keys(taxa_bruta_ano).length || !Object.keys(ipca_ano).length)) return { entrada: null, confirmar, motivo: 'Falta a Selic e o IPCA de cada ano até 2028 (do Focus ou digitados aqui).' }

  const teto_mes = (j.limites_mes || []).reduce((s, l) => s + (Number(l.limite_centavos) || 0), 0)
  if (p.gasto_2029_hoje == null) confirmar.push('gasto por mês em 2029 (a conta usa o teto do mês de hoje)')
  if (depoisDaVirada && (!taxa_bruta_ano[anoHoje] || !ipca_ano[anoHoje])) confirmar.push(`Selic e IPCA de ${anoHoje} (a conta usa o rendimento acima da inflação do objetivo)`)
  if (p.piso_meses == null) confirmar.push('piso do caixa (a conta usa 6 meses de teto)')
  const parametros: Parametros = {
    mes_base: m0, virada: VIRADA, gasto_2029_hoje: p.gasto_2029_hoje ?? teto_mes, renda_certa_2029: p.renda_certa_2029 || 0,
    margem: p.margem, taxa_real_trabalho: p.taxa_real_trabalho, taxa_bruta_ano, ipca_ano, aliq_proj: p.aliq_proj,
    piso_meses: p.piso_meses ?? 6, teto_mes, mes_reajuste: p.mes_reajuste || 1,
  }

  const cdi = j.cdi_hoje?.pct_ano == null ? null : new Dec(String(j.cdi_hoje.pct_ano))
  if (!cdi) confirmar.push('taxa de hoje das aplicações (sem o CDI do dia)')
  const aplicacoes = (j.aplicacoes || []).map(a => ({
    id: String(a.id), titular: a.titular_nome ?? null, titulares: (a.titulares || []).map(t => t.nome), banco: a.banco, saldo: Number(a.saldo_centavos) || 0,
    taxa_bruta_anual: a.tipo === 'poupanca' ? POUPANCA_ANO : cdi ? new Dec(String(a.pct_cdi || 0)).div(100).times(cdi).div(100).toString() : '0',
    isenta: !!a.isenta, aplicada_em: String(a.aplicada_em).slice(0, 10), resgate_previsto: a.resgate_previsto ? String(a.resgate_previsto).slice(0, 10) : null,
    fgc: a.tipo !== 'tesouro_selic',
  }))
  // f_11: o banco manda a soma do dinheiro em conta corrente (saldos_conta). Sem o campo (banco antes da f_11): 0 e [confirmar]
  const saldo_caixa = j.saldo_caixa == null ? 0 : Number(j.saldo_caixa) || 0
  if (j.saldo_caixa == null) confirmar.push('dinheiro parado na conta, fora das aplicações (a conta usa R$ 0)')

  const compromissos: FuturoEntrada['compromissos'] = []
  for (const l of j.parcelas_futuras || []) for (const x of l.parcelas_lista || []) compromissos.push({ mes: x.mes_fatura, valor: Number(x.valor_centavos) || 0, tipo: 'parcela' })
  // 13º só nos pagamentos (decisão do dono): 1 salário de cada pessoa da folha em dezembro de cada ano até a virada
  compromissos.push(...folha13(((j.config?.casa_folha?.pessoas) || []).map(x => Math.round((Number(x.salario) || 0) * 100)), m0, VIRADA))

  return {
    confirmar,
    entrada: {
      hoje, saldo_caixa, aplicacoes,
      recebimentos: (j.recebimentos || []).map(r => ({ id: String(r.id), dono: r.dono_nome || '', valor: Number(r.valor_centavos) || 0, mes_previsto: r.mes_previsto, mes_novo: r.mes_novo, certo: !!r.certo, recebido: !!r.recebido_em })),
      compromissos, dividas: [], desvios: [],
      desejos: (j.desejos || []).map(d => ({ id: String(d.id), dono: String(d.dono_membro), valor: Number(d.valor_centavos) || 0, mes: d.mes, volta_de: d.volta_de, volta: Number(d.volta_centavos) || 0, volta_mes: d.volta_mes, antecipado: d.antecipado_centavos == null ? null : Number(d.antecipado_centavos), volta_certa: !!d.volta_certa, ...(d.situacao ? { situacao: d.situacao } : {}) })),
      // revisão E12 (C2): a situação vai junto; o motor ignora "feito" (o dinheiro já saiu do saldo) e "desisti"
      parametros,
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
