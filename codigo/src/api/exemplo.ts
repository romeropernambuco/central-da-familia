// Banco de exemplo em memória: Família Silva. Imita as funções do CONTRATO.md
// pra o app rodar sem rede (só nos builds de exemplo e demo: npm run build:exemplo). Nada sai do aparelho.
import type { DesejoTela, FocusAno, HistoricoObjetivo, ParametrosObjetivo, RecebimentoTela, Api, AvisoCasa, Cartao, CasaDaEquipe, ChaveConfig, ConviteFamilia, Envelope, Fatura, Lancamento, NovoLancamento, ResumoHoje, Sessao } from './tipos'
import * as ex2 from './exemplo2'
import { entradaDoBanco, type FuturoBanco } from './futuro'
import { CONVITE_EXEMPLO } from './conviteExemplo'
import { dadosTeste, familiaTeste, membrosTeste, nomeFamiliaTeste, usarFamiliaTeste } from './dadosTeste'
import { pessoaDoTeste } from '../teste/relogio'
import { centavos, dataCurta, diaSemana, diasNoMes, previsaoGas, diasRestantes, fimDoMes, hojeRecife, mesAnterior, mesCurto, reais, segundaDaSemana, simularCompra, somaDias } from '../lib/formato'
import { gastoSemana, gastosDoMes, mesFatura, mesMais, parcelasDe, pesoDia, plano, projecao, PESO_FDS } from '../lib/plano'

interface EnvBase { id: string; nome: string; regra: Envelope['regra']; limite_mes: number; colchao: number; casa: boolean }

const FAM = 'fam-silva'
// ?como=autonoma abre a Família Souza (Cláudia, mãe solo, renda que muda)
// E3 (conserto 8): o Guardado e o Escritório (exemplo2) nascem antes desta linha; refaz pra a Cláudia não ver o guardado da Família Silva
// (era o "No seu nome R$ 0" da Autônoma)
if (pessoaDoTeste === 'autonoma') { usarFamiliaTeste('souza'); ex2.reiniciarExemplo2() }
/** Convite de exemplo da equipe: o link do exemplo é #/equipe?c=<este id> e o código é 2468. */
export { CONVITE_EXEMPLO }
const espera = (ms = 60) => new Promise(r => setTimeout(r, ms))

function criarDados() {
  const hoje = hojeRecife()
  const [, m] = hoje.split('-').map(Number)
  const t = dadosTeste(hoje)
  const envs: EnvBase[] = t.envs.map(e => ({ ...e }))
  const cartoes: Cartao[] = familiaTeste() === 'souza' ? [
    { id: 'car-nu', nome: 'Nubank', dia_fechamento: 3, dia_vencimento: 10, banco: 'Nubank', titular: 'Cláudia', titular_id: 'm-claudia', limite: 3000, taxa_valor: 0, taxa_periodo: 'mes', taxa_mes: null, taxa_isenta_acima: null, final4: '7788', ativo: true },
  ] : [
    { id: 'car-nu', nome: 'Nubank', dia_fechamento: 3, dia_vencimento: 10, banco: 'Nubank', titular: 'Ana', titular_id: 'm-ana', limite: 8000, taxa_valor: 480, taxa_periodo: 'ano', taxa_mes: (m % 12) + 1, taxa_isenta_acima: null, final4: '4321', ativo: true },
    { id: 'car-itau', nome: 'Itaú', dia_fechamento: 25, dia_vencimento: 5, banco: 'Itaú', titular: 'Bruno', titular_id: 'm-bruno', limite: 5000, taxa_valor: 0, taxa_periodo: 'mes', taxa_mes: null, taxa_isenta_acima: null, final4: null, ativo: true },
  ]
  const lanc: Lancamento[] = t.lanc as Lancamento[]

  const souza = familiaTeste() === 'souza'
  const config: Record<string, unknown> = souza ? {
    casa_prestadores: [], casa_gas: { trocas: [somaDias(hoje, -50), somaDias(hoje, -12)] }, casa_folha: { pessoas: [], daePaga: {} },
    casa_lista: [{ id: 'i1', nome: 'Leite', ok: false }, { id: 'i2', nome: 'Pão', ok: true }], casa_presenca: {}, rendas: t.rendas, metas: [], entradas: t.entradas,
  } : {
    entradas: t.entradas,
    casa_prestadores: [
      { id: 'p1', nome: 'Seu Zé', servico: 'Jardineiro', dia: 6, valor: 150, ultimaVez: somaDias(hoje, -12) },
      { id: 'p2', nome: 'Marcos', servico: 'Piscineiro', dia: new Date(hoje + 'T12:00:00Z').getUTCDay(), valor: 120, ultimaVez: somaDias(hoje, -6) },
    ],
    casa_gas: { trocas: [somaDias(hoje, -64), somaDias(hoje, -33), somaDias(hoje, -2)] },
    casa_folha: {
      pessoas: [{ id: 'f1', nome: 'Carla', funcao: 'Cozinheira', salario: 1800 }],
      daePaga: {},
    },
    casa_lista: [
      { id: 'i1', nome: 'Arroz 5 kg', ok: false }, { id: 'i2', nome: 'Feijão', ok: true }, { id: 'i3', nome: 'Ovos (2 dúzias)', ok: false },
      { id: 'i4', nome: 'Banana', ok: false }, { id: 'i5', nome: 'Detergente', ok: true },
    ],
    casa_presenca: { [hoje]: ['Carla'] },
    rendas: t.rendas,
    metas: [{ id: 'm1', nome: 'Viagem de julho', valor: 6000, guardado: 1800 }, { id: 'm2', nome: 'Material escolar', valor: 1200, guardado: 900 }],
  }
  const ajustes: { mes: string; de: string; para: string; valor: number; id: string }[] = []
  const convites: ConviteFamilia[] = souza ? [{ id: 'cv1', nome: 'Cláudia', email: 'claudia@exemplo.com', papel: 'casal', situacao: 'entrou', entrou_em: '2026-11-01' }] : [
    { id: 'cv1', nome: 'Bruno', email: 'bruno@exemplo.com', papel: 'casal', situacao: 'entrou', entrou_em: '2026-11-01' },
    { id: 'cv2', nome: 'Ana', email: 'ana@exemplo.com', papel: 'casal', situacao: 'entrou', entrou_em: '2026-11-02' },
    { id: 'cv3', nome: 'Bia', email: 'bia@exemplo.com', papel: 'pessoa', situacao: 'entrou', entrou_em: '2026-11-03' },
    { id: 'cv4', nome: 'Vó Lúcia', email: 'lucia@exemplo.com', papel: 'pessoa', situacao: 'esperando', enviado_em: somaDias(hoje, -2) },
  ]
  // compras anotadas pela equipe sem valor (o casal confere pela foto) e coberturas de imprevisto (só no exemplo)
  const comprasEquipe: { id: string; data: string; nome: string; tipo: 'feira' | 'casa'; nota: boolean; por: string }[] = []
  const imprevistos: { id: string; mes: string; envelope: string; valor: number }[] = []
  // E5: recebimentos com data (exemplo, número inventado). O contrato da Ana era pra outubro e não chegou: vira pergunta pra ela
  const m0 = hoje.slice(0, 7), mm = (i: number) => mesMais(m0, i)
  const recebimentos: (Omit<RecebimentoTela, 'dono_nome' | 'meu'> & { apagado: boolean })[] = souza ? [] : [
    { id: 'rc1', dono_membro: 'm-ana', descricao: 'Contrato de consultoria (exemplo)', valor: 18000, mes_previsto: mm(-1), mes_novo: null, tipo: 'contrato', certo: true, recebido_em: null, valor_recebido: null, apagado: false },
    { id: 'rc2', dono_membro: 'm-ana', descricao: 'Bônus do fim do ano (exemplo)', valor: 5000, mes_previsto: mm(4), mes_novo: null, tipo: 'outro', certo: false, recebido_em: null, valor_recebido: null, apagado: false },
    { id: 'rc3', dono_membro: 'm-bruno', descricao: 'Venda do carro antigo (exemplo)', valor: 30000, mes_previsto: mm(2), mes_novo: null, tipo: 'outro', certo: true, recebido_em: null, valor_recebido: null, apagado: false },
  ]
  // E6: o objetivo começa vazio (valem as premissas do TIME.md) e o histórico também; o Focus de exemplo tem número inventado
  const objetivo: { parametros: ParametrosObjetivo | null; historico: HistoricoObjetivo[] } = { parametros: null, historico: [] }
  // E8: desejos de exemplo (número inventado). A Bia vê só o dela; o casal vê todos, com o nome do dono
  const desejos: (Omit<DesejoTela, 'dono_nome' | 'meu'> & { apagado: boolean })[] = souza ? [] : [
    { id: 'ds1', dono_membro: 'm-ana', nome: 'Viagem de férias (exemplo)', valor: 20000, mes: mm(8), volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false, situacao: 'pensando', apagado: false },
    { id: 'ds2', dono_membro: 'm-bruno', nome: 'Troca do carro (exemplo)', valor: 60000, mes: mm(12), volta_de: 'venda', volta: 35000, volta_mes: mm(12), antecipado: null, volta_certa: true, situacao: 'combinado', apagado: false },
    { id: 'ds3', dono_membro: 'm-bia', nome: 'Fone de ouvido (exemplo)', valor: 250, mes: mm(1), volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false, situacao: 'pensando', apagado: false },
  ]
  // E7 (F8) com a f_12: votos do reajuste do teto (1 por adulto por mês de vigência)
  const reajusteVotos: { mes: string; membro_id: string; teto: number; ipca: string; votou_em: string }[] = []
  /** limite de antes do reajuste, por mês de vigência e envelope (aplicar de novo dá o mesmo número, como no banco) */
  const reajusteBase: Record<string, number> = {}
  return { envs, cartoes, lanc, config, hoje, ajustes, convites, comprasEquipe, imprevistos, recebimentos, objetivo, desejos, reajusteVotos, reajusteBase }
}

/** Focus de EXEMPLO (número inventado, não é o boletim do Banco Central): Selic do fim do ano e IPCA. */
const FOCUS_EXEMPLO: FocusAno[] = [
  { ano: 2026, selic_fim: '0.1500', ipca: '0.0450', divulgado_em: '2026-11-09', fonte: 'Focus (exemplo, número inventado)' },
  { ano: 2027, selic_fim: '0.1250', ipca: '0.0400', divulgado_em: '2026-11-09', fonte: 'Focus (exemplo, número inventado)' },
  { ano: 2028, selic_fim: '0.1050', ipca: '0.0380', divulgado_em: '2026-11-09', fonte: 'Focus (exemplo, número inventado)' },
]
let db = criarDados()
/** Igual a produto.reajuste_situacao (f_12): aprovado só com todos os adultos do casal votando no mesmo teto. */
function baseReajusteEx(mes: string) {
  if (papelLogado() !== 'casal') throw new Error('Só o casal vê o reajuste.')
  const adultos = membrosTeste().filter(x => x.papel === 'casal')
  const votos = db.reajusteVotos.filter(v => v.mes === mes).sort((a, b) => a.votou_em.localeCompare(b.votou_em))
  const faltam = adultos.filter(a => !votos.some(v => v.membro_id === a.id))
  const dosAdultos = votos.filter(v => adultos.some(a => a.id === v.membro_id))
  const aprovado = faltam.length === 0 && new Set(dosAdultos.map(v => v.teto)).size === 1 && new Set(dosAdultos.map(v => Number(v.ipca))).size === 1 /* revisão E12: IPCA comparado como número */
  // R1 (igual a f_12): vale no mais tarde entre o mês de vigência e o mês seguinte ao último voto (fuso de Recife)
  const ultimo = dosAdultos.map(v => hojeRecife(new Date(v.votou_em)).slice(0, 7)).sort().pop()
  const vale = aprovado && ultimo ? [mes, mesMais(ultimo, 1)].sort().pop()! : null
  return {
    mes_vigencia: mes, aprovado, teto_aprovado: aprovado ? dosAdultos[0].teto : null, ipca_aprovado: aprovado ? dosAdultos[0].ipca : null,
    // f_14: ja_vale só dentro do prazo (do 1º dia de vale_a_partir até o último dia daquele mês); depois, vencido
    vale_a_partir: vale, ja_vale: !!vale && hojeRecife().slice(0, 7) >= vale && hojeRecife() <= fimDoMes(vale + '-01'),
    vencido: !!vale && hojeRecife() > fimDoMes(vale + '-01'),
    // decisão do coordenador (f_14): aplicar até o último dia do mês de vale_a_partir; depois o voto vence
    aplicar_ate: vale ? fimDoMes(vale + '-01') : null as string | null,
    votos: votos.map(v => ({ membro_id: v.membro_id, nome: membrosTeste().find(x => x.id === v.membro_id)?.nome || '', teto: v.teto, ipca: v.ipca, votou_em: v.votou_em })),
    faltam: faltam.map(a => ({ membro_id: a.id, nome: a.nome })),
  }
}
/** Igual à f_14 (regra final do BANCO): voto_aberto vem quando o mês pedido não está vivo; é o voto mais
 *  recente da família pra um mês que ainda não começou e ainda não aprovado. null com o mês pedido em votação ou aprovado no prazo. */
function situacaoReajusteEx(mes: string) {
  const s = baseReajusteEx(mes)
  let voto_aberto: { mes_vigencia: string; teto: number; ipca: string; votou: { membro_id: string; nome: string }[] } | null = null
  // regra final da f_14: vem sempre que o mês pedido não está vivo (sem voto, vencido, ou não aprovado com a vigência já passada)
  const vivo = s.votos.length > 0 && !s.vencido && (s.aprovado || mes > hojeRecife().slice(0, 7))
  if (!vivo) {
    const x = db.reajusteVotos.filter(v => v.mes !== mes && v.mes > hojeRecife().slice(0, 7) && !baseReajusteEx(v.mes).aprovado)
      .sort((a, b) => b.votou_em.localeCompare(a.votou_em))[0]
    if (x) voto_aberto = { mes_vigencia: x.mes, teto: x.teto, ipca: x.ipca, votou: db.reajusteVotos.filter(v => v.mes === x.mes).map(v => ({ membro_id: v.membro_id, nome: membrosTeste().find(m => m.id === v.membro_id)?.nome || '' })) }
  }
  return { ...s, voto_aberto }
}
type Logado = 'ana' | 'bruno' | 'filha' | 'carla' | 'claudia'
const logadoInicial = (): Logado => (pessoaDoTeste === 'equipe' ? 'carla' : pessoaDoTeste === 'autonoma' ? 'claudia' : pessoaDoTeste)
let logado: Logado | null = logadoInicial()
/** Quem está logado no exemplo, com papel e limite próprio. */
const membroLogado = () => { const ms = membrosTeste(); return ms.find(x => x.id === (logado === 'bruno' ? 'm-bruno' : logado === 'filha' ? 'm-bia' : logado === 'claudia' ? 'm-claudia' : 'm-ana')) || ms[0] }
const papelLogado = (): 'casal' | 'pessoa' | 'equipe' => (logado === 'carla' ? 'equipe' : membroLogado().papel)
/** Cartões que quem olha enxerga. E2 (regra nova, 13/11): o casal lê todos, com o nome do dono; pessoa e equipe, nenhum. */
const cartoesVisiveis = () => (papelLogado() !== 'casal' ? [] : db.cartoes)
/** Cartões em que quem olha mexe (cadastro, fatura, Analista de Cartão): os dele e os sem titular. */
const cartoesMeus = () => (papelLogado() !== 'casal' ? [] : db.cartoes.filter(c => !c.titular_id || c.titular_id === membroLogado().id))
/** Igual ao banco (f_02): quem é dono de cada coisa. */
const donoDoEnv = (id: string): string | null => membrosTeste().find(x => x.envelope === id)?.nome ?? null
let familiaNova: { id: string; nome: string; pessoa: string } | null = null
const tempos: number[] = [6.8, 8.1, 5.9, 9.4, 7.2]
const avisos: { tipo: AvisoCasa; data: string; nome: string }[] = []

function vivos() { return db.lanc.filter(l => !l.apagado_em) }

/** Envelopes que quem está logado enxerga. E2 (regra nova, 13/11): o casal LÊ todos (com o nome do dono); a pessoa, só o dela. */
function visiveis(): EnvBase[] {
  if (logado === 'carla') return db.envs.filter(e => e.casa)
  const eu = membroLogado()
  if (familiaNova) return db.envs.filter(e => e.casa || e.id === eu.envelope || e.id === db.envs[0].id)
  return db.envs.filter(e => eu.papel === 'casal' || e.id === eu.envelope)
}
const podeVer = (envelope: string) => visiveis().some(e => e.id === envelope)
/** Envelopes em que quem está logado ESCREVE (igual a produto.meus_envelopes_escrita, f_01): o casal, o próprio, os da Casa
 * e os sem dono; a pessoa, só o dela; a equipe, os da Casa. */
function escrita(): EnvBase[] {
  if (logado === 'carla') return db.envs.filter(e => e.casa)
  const eu = membroLogado()
  if (familiaNova) return visiveis()
  return db.envs.filter(e => e.id === eu.envelope || (eu.papel === 'casal' && (e.casa || !donoDoEnv(e.id))))
}
const podeEscrever = (envelope: string) => escrita().some(e => e.id === envelope)
/** Lançamento que quem olha pode corrigir ou apagar: no limite em que escreve e lançado por ele (o banco exige o autor). */
const lancMeu = (l: Lancamento) => podeEscrever(l.envelope_id) && (!l.autor || l.autor === (logado === 'carla' ? 'carla' : membroLogado().id))
/** Limite do envelope no mês, com o que a Casa cobriu (só no exemplo). */
function limiteNoMes(e: EnvBase, mes: string): number {
  let l = e.limite_mes
  for (const a of db.ajustes) if (a.mes === mes) { if (a.para === e.id) l += a.valor; if (a.de === e.id) l -= a.valor }
  return centavos(l)
}
const doEnvelope = (id: string) => vivos().filter(l => l.envelope_id === id)
/** E4: mês da 1ª fatura da compra parcelada, pelo cartão (igual a produto._mes_fatura). */
const faturaDoLanc = (l: { cartao_id?: string | null; data: string }) => { const c = db.cartoes.find(x => x.id === l.cartao_id); return c?.dia_fechamento && c.dia_vencimento ? mesFatura(l.data, c.dia_fechamento, c.dia_vencimento) : null }

/** Conta de 1 envelope igual ao banco (_resumo + _diario + _plano). R0. */
function contaEnvelope(e: EnvBase, hoje: string): Envelope {
  const mes = hoje.slice(0, 7), fim = fimDoMes(hoje), dr = diasRestantes(hoje)
  const lancs = doEnvelope(e.id)
  // E4 (TIME.md): à vista sai no dia da compra; cada parcela sai no dia 1 do mês da fatura dela, fora do ritmo
  const { porDia, parcelas } = gastosDoMes(lancs, mes, faturaDoLanc)
  const somaMes = centavos(Object.entries(porDia).filter(([d]) => d <= fim).reduce((s, [, v]) => s + v, 0))
  const lim = limiteNoMes(e, mes)
  // E2: de quem é e se quem olha escreve aqui. E3 (conserto 2): as parcelas que já caem no mês que vem, pra a virada avisar antes
  const base: Envelope = { id: e.id, nome: e.nome, regra: e.regra, casa: e.casa, limite_base: lim, colchao_meta: e.colchao, limite_mes: lim, gasto_mes: 0, livre: 0,
    dono: e.casa ? null : donoDoEnv(e.id), escreve: podeEscrever(e.id),
    // C1/C3 (revisão E2/E3): o id e o papel do dono, como o modo real recebe do banco
    dono_id: e.casa ? null : membrosTeste().find(x => x.envelope === e.id)?.id ?? null, dono_papel: e.casa ? null : membrosTeste().find(x => x.envelope === e.id)?.papel ?? null, parcelas_mes_que_vem: gastosDoMes(lancs, mesMais(mes, 1), faturaDoLanc).parcelas }
  // rodada 2: parcela e compra grande de 1 vez (10% do combinado e no mínimo R$ 150) contam 1 vez na projeção, fora do ritmo.
  // E4: a parcela já não entra no dia da compra (vem toda em `parcelas`, no dia 1): aqui sobra só a compra grande à vista
  const grande = Math.max(150, e.limite_mes * 0.1)
  const pontuais = lancs.filter(l => l.data.startsWith(mes) && l.data <= hoje && (l.parcelas || 1) <= 1 && l.valor >= grande)
  const seg0 = segundaDaSemana(hoje)
  base.pontual_mes = centavos(parcelas + pontuais.reduce((t, l) => t + l.valor, 0))
  base.pontual_semana = centavos(pontuais.filter(l => l.data >= seg0).reduce((t, l) => t + l.valor, 0))
  let hojeV = 0
  if (e.regra === 'diario') {
    // mês passado que passou do combinado sai deste (como _diario)
    const ant = mesAnterior(mes)
    const pa = gastosDoMes(lancs, ant, faturaDoLanc)
    const gastoAnt = centavos(Object.values(pa.porDia).reduce((s, v) => s + v, 0) + pa.parcelas)
    const falta = lancs.some(l => l.data.startsWith(ant)) ? Math.max(0, centavos(gastoAnt - limiteNoMes(e, ant))) : 0
    const pote = Math.max(0, lim - falta - parcelas - e.colchao)
    const p = plano(pote, porDia, hoje)
    const gasto = centavos(somaMes + parcelas)
    // L2 "Por que mudou?": o dia de ontem (de manhã) e o que mexeu no número
    const ontem = somaDias(hoje, -1)
    let mudou: Envelope['mudou'] = null
    if (ontem.startsWith(mes)) {
      const v0 = plano(pote, porDia, ontem).valor_dia, g0 = porDia[ontem] || 0
      const maior = lancs.filter(l => l.data === ontem).sort((x, y) => y.valor - x.valor)[0]
      const dif = centavos(p.valor_dia - v0)
      const peso = pesoDia(hoje) !== pesoDia(ontem) ? (pesoDia(hoje) > 1 ? ` Hoje é ${diaSemana(hoje)}: fim de semana e feriado valem 1,5 dia.` : ' Ontem era fim de semana ou feriado, que vale 1,5 dia; hoje é dia normal.') : ''
      const motivo = Math.abs(dif) < 0.5 ? `Ficou igual a ontem: ${reais(v0)}.${peso}`
        : g0 > v0 ? `Ontem saíram ${reais(g0)} e o dia era ${reais(v0)}${maior ? ` (o maior foi ${maior.descricao || 'um gasto sem nome'}, ${reais(maior.valor)})` : ''}. Os ${reais(centavos(g0 - v0))} a mais foram divididos pelos dias que faltam.${peso}`
        : `Ontem saíram ${reais(g0)} de ${reais(v0)}. O que sobrou foi dividido pelos dias que faltam.${peso}`
      mudou = { ontem: v0, motivo }
    }
    const temAnt = lancs.some(l => l.data.startsWith(ant))
    Object.assign(base, {
      limite_mes: centavos(lim - falta), gasto_mes: gasto, livre: centavos(lim - falta - gasto), valor_dia: p.pode_hoje, valor_dia_inteiro: p.valor_dia, gasto_hoje: p.gasto_hoje,
      ate_fim_mes: p.ate_fim_mes, peso_fds: PESO_FDS, falta_mes_anterior: falta, parcelas_mes: parcelas, amanha: p.amanha, ate_domingo: p.ate_domingo,
      gasto_semana_dia: gastoSemana(porDia, hoje), mudou, mes_anterior: temAnt ? { mes: ant, gasto: gastoAnt, limite: limiteNoMes(e, ant) } : null,
    })
    hojeV = p.pode_hoje
  } else if (e.regra === 'semanal') {
    const t = centavos((lim * 12) / 52)
    const segs: string[] = []
    for (let d = `${mes}-01`; d <= fim; d = somaDias(d, 1)) if (new Date(d + 'T12:00:00Z').getUTCDay() === 1) segs.push(d)
    const seg = segundaDaSemana(hoje)
    const todos = gastosDoMes(lancs, mes, faturaDoLanc).porDia
    const daSemana = (s0: string) => { let x = 0; for (let i = 0; i < 7; i++) x += todos[somaDias(s0, i)] || 0; return x }
    // semana que começou no mês passado também conta (gasto até domingo)
    const gs = centavos(lancs.filter(l => l.data >= seg && l.data <= somaDias(seg, 6)).reduce((s, l) => s + l.valor, 0))
    const g = centavos(segs.reduce((s, x) => s + daSemana(x), 0) + parcelas)
    const dl = 8 - (new Date(hoje + 'T12:00:00Z').getUTCDay() || 7)
    Object.assign(base, { limite_mes: centavos(t * segs.length), gasto_mes: g, livre: centavos(t * segs.length - g), teto_semana: t, gasto_semana: gs })
    hojeV = centavos(Math.max(0, t - gs) / dl)
  } else {
    const g = centavos(somaMes + parcelas)
    const livre = centavos(lim - g)
    // E3 (conserto 5): o gasto de hoje também no limite do mês ("Hoje já saiu R$ X. Ainda pode hoje R$ Y")
    Object.assign(base, { gasto_mes: g, livre, parcelas_mes: parcelas, gasto_hoje: porDia[hoje] || 0 })
    hojeV = centavos(Math.max(0, livre - e.colchao) / dr)
    // rodada 2 (BRUNO ideia 3): o limite do mês também tem "até domingo" (o valor de hoje × os dias até domingo)
    if (!e.casa) {
      const ateDom = Math.min(dr, ((7 - new Date(hoje + 'T12:00:00Z').getUTCDay()) % 7) + 1)
      Object.assign(base, { ate_domingo: centavos(Math.min(Math.max(0, livre - e.colchao), hojeV * ateDom)), gasto_semana_dia: gastoSemana(porDia, hoje), amanha: dr > 1 ? centavos(Math.max(0, livre - e.colchao) / (dr - 1)) : null })
    }
  }
  base.hoje = hojeV
  return base
}

export function calcularResumo(): ResumoHoje {
  const hoje = hojeRecife()
  const dr = diasRestantes(hoje)
  const envs = visiveis()
  // E2: o casal lê todos; o seu vem 1º, depois os dos outros, a Casa por último
  const ordem = (e: EnvBase) => (e.casa ? 2 : podeEscrever(e.id) ? 0 : 1)
  const todos = [...envs].sort((a, b) => ordem(a) - ordem(b)).map(e => contaEnvelope(e, hoje))
  // o "pode gastar hoje" e a explicação somam só o que é de quem olha (o seu e a Casa): o do outro é só pra ler
  const envelopes = todos.filter(e => e.escreve)
  const tot = (f: (e: Envelope) => number) => centavos(envelopes.reduce((s, e) => s + f(e), 0))
  const pode = tot(e => e.hoje || 0)
  const livre = tot(e => e.livre)
  const colchao = tot(e => Math.max(0, Math.min(e.colchao_meta || 0, e.livre)))
  const eu = logado === 'carla' ? null : membroLogado()
  const quem = eu?.papel === 'pessoa' || !envelopes.some(e => e.casa) ? 'seu' : 'seu e da Casa'
  const explicacao = [
    { linha: `Hoje você pode gastar: soma do que cada limite (${quem}) ainda tem pra hoje`, valor: pode },
    ...envelopes.map(e => ({ linha: e.regra === 'diario'
      ? `${e.nome}: o dia de hoje tem ${reais(e.valor_dia_inteiro || 0)}${pesoDia(hoje) > 1 ? ' (hoje é fim de semana ou feriado: vale 1,5 dia)' : ''} menos ${reais(e.gasto_hoje || 0)} gastos hoje`
      : e.regra === 'semanal' ? `${e.nome}: ${reais(e.teto_semana || 0)} da semana menos ${reais(e.gasto_semana || 0)} desde segunda, dividido pelos dias até domingo`
      : `${e.nome}: ${reais(Math.max(0, e.livre - (e.colchao_meta || 0)))} livres${e.colchao_meta ? ' (tirando a reserva)' : ''} divididos por ${dr === 1 ? '1 dia que falta' : `${dr} dias que faltam`}`, valor: e.hoje || 0 })),
    ...(colchao ? [{ linha: 'Reserva (o dinheiro que a família combinou nunca gastar): fica de fora', valor: colchao }] : []),
  ]
  // rodada 2 (BRUNO ideia 1): placar do casal, só o que vem pela frente ("se continuar assim"), sem item de ninguém
  const casal = membrosTeste().filter(x => x.papel === 'casal')
  const placar = eu?.papel === 'casal' && casal.length > 1 ? casal.map(x => {
    const env = db.envs.find(v => v.id === x.envelope)
    if (!env) return null
    const c = contaEnvelope(env, hoje)
    const lim = c.limite_base ?? c.limite_mes
    return { nome: x.nome, fecha: Math.round(projecao(c.gasto_mes, lim, hoje, c.pontual_mes || 0).fecha), limite: lim, eu: x.id === eu.id, gasto: c.gasto_mes }
  }).filter(Boolean) as NonNullable<ResumoHoje['placar_casal']> : undefined
  // E2: some o "total dos limites dos outros sem detalhe": o casal já vê o limite de cada um, com o nome
  return { pode_gastar_hoje: pode, livre_mes: livre, colchao, dias_restantes: dr, envelopes: todos, explicacao, ...(placar ? { placar_casal: placar } : {}) }
}

/** Faturas dos próximos meses. `so` = 'meus' pro Analista de Cartão (fala só do cartão de quem olha); a tela lê todos. */
function faturasCalc(meses: number, so: 'todos' | 'meus' = 'todos'): Fatura[] {
  const hoje = hojeRecife()
  const [a, m] = hoje.split('-').map(Number)
  const out: Fatura[] = []
  const casaIds = new Set(db.envs.filter(e => e.casa).map(e => e.id))
  for (const c of so === 'meus' ? cartoesMeus() : cartoesVisiveis()) {
    const fe = c.dia_fechamento || 1, ve = c.dia_vencimento || 10
    const porMes: Record<string, number> = {}, daCasa: Record<string, number> = {}
    for (const l of vivos().filter(l => l.cartao_id === c.id)) {
      // cada parcela cai no mês da fatura dela (igual ao "E se eu comprar?")
      for (const p of simularCompra(l.valor, l.parcelas || 1, l.data, fe, ve)) {
        porMes[p.mes] = centavos((porMes[p.mes] || 0) + p.valor)
        if (casaIds.has(l.envelope_id)) daCasa[p.mes] = centavos((daCasa[p.mes] || 0) + p.valor)
      }
    }
    for (let i = 0; i < meses; i++) {
      let mm = m + i, aa = a
      while (mm > 12) { mm -= 12; aa++ }
      const k = `${aa}-${String(mm).padStart(2, '0')}`
      const venc = `${k}-${String(Math.min(ve, 28)).padStart(2, '0')}`
      const fechaMes = ve <= fe ? somaDias(`${k}-01`, -1).slice(0, 7) : k
      const fecha = `${fechaMes}-${String(Math.min(fe, 28)).padStart(2, '0')}`
      out.push({ cartao_id: c.id, cartao: c.nome, mes: k, vencimento: venc, total: porMes[k] || 0, fechada: hoje >= fecha, ...(daCasa[k] ? { da_casa: daCasa[k] } : {}) })
    }
  }
  return out
}

const DIAS_SEM = 7
/** Imita produto.casa_da_equipe: copia só os campos sem dinheiro (sem valor, salário ou preço). */
function casaSemDinheiro(): CasaDaEquipe {
  const hoje = hojeRecife()
  const cfg = db.config as Record<string, any>
  const casaIds = new Set(db.envs.filter(e => e.casa).map(e => e.id))
  const dow = new Date(hoje + 'T12:00:00').getDay()
  const g = previsaoGas(cfg.casa_gas?.trocas || [])
  const eu = logado === 'carla' ? 'Carla' : membroLogado().nome
  return {
    hoje, eu,
    lista: (cfg.casa_lista || []).map((i: any) => ({ id: i.id, nome: i.nome, ok: !!i.ok })),
    // compra sem nome vira "Feira semanal de quarta 18/11" (nome do limite + dia), e entram as compras que a equipe anotou sem valor
    comprado: [
      ...db.comprasEquipe.filter(c => c.data <= hoje && c.data > somaDias(hoje, -DIAS_SEM)).map(c => ({ data: c.data, nome: c.nome, k: c.data + 'T99' + c.id })),
      ...vivos().filter(l => casaIds.has(l.envelope_id) && l.data <= hoje && l.data > somaDias(hoje, -DIAS_SEM))
        .map(l => ({ data: l.data, nome: l.descricao || `${db.envs.find(e => e.id === l.envelope_id)?.nome || 'Compra'} de ${diaSemana(l.data)} ${dataCurta(l.data)}`, k: l.data + l.criado_em })),
    ].sort((a, b) => b.k.localeCompare(a.k)).map(({ data, nome }) => ({ data, nome })),
    prestadores: (cfg.casa_prestadores || []).map((p: any) => ({ id: p.id, nome: p.nome, servico: p.servico, dia: p.dia, proxima_visita: somaDias(hoje, (p.dia - dow + 7) % 7), ultima_vez: p.ultimaVez || null })),
    gas: { trocas: [...(cfg.casa_gas?.trocas || [])].sort(), media_dias: g.media, proxima_troca: g.acaba, avisar_em: g.avisar },
    presenca: { hoje: cfg.casa_presenca?.[hoje] || [], meu_ponto: cfg.casa_ponto?.[hoje]?.[eu] || {} },
  }
}

const porChave = new Map<string, Lancamento>()
/** Igual ao banco: pra equipe o resumo vem só com nomes (so_nomes) e o lançamento volta sem valor. */
export function resumoDaEquipe(): ResumoHoje {
  return { pode_gastar_hoje: 0, livre_mes: 0, colchao: 0, dias_restantes: diasRestantes(hojeRecife()), explicacao: [], so_nomes: true,
    envelopes: db.envs.filter(e => e.casa).map(e => ({ id: e.id, nome: e.nome, regra: e.regra, casa: true, limite_mes: 0, gasto_mes: 0, livre: 0 })) }
}
const resumoDeQuemEsta = () => (logado === 'carla' ? resumoDaEquipe() : calcularResumo())
const semValorPraEquipe = (l: Lancamento): Lancamento => (logado === 'carla' ? { ...l, valor: 0, cartao_id: null } : l)

/** O que o Escritório e o Guardado de exemplo leem da Família Silva. */
const mundo: ex2.Mundo = {
  equipe: () => logado === 'carla',
  papel: () => papelLogado(),
  quem: () => (logado === 'carla' ? 'Carla' : (familiaNova?.pessoa || membroLogado().nome).split(' ')[0]),
  // E2: os funcionários perguntam e mexem, então falam só do que é de quem olha (o seu e a Casa), nunca do limite do outro
  resumo: () => { const r = calcularResumo(); return { ...r, envelopes: r.envelopes.filter(e => e.escreve) } },
  eu: () => (logado === 'carla' ? null : membroLogado().id),
  // rodada 2: o Analista de Cartão só fala do cartão de quem está olhando (E2: ele pergunta e mexe, então continua só o seu)
  faturas: () => faturasCalc(3, 'meus'),
  cartoes: () => cartoesMeus(),
  todosCartoes: () => db.cartoes,
  entradasNaConta: () => ((db.config.entradas as any[]) || []).filter(x => x.destino === 'na conta' && (!x.dono || x.dono === membroLogado().nome)),
  guardarEntrada: (id: string) => { const x = ((db.config.entradas as any[]) || []).find(y => y.id === id); if (x) x.destino = 'reserva' },
  config: () => db.config as Record<string, any>,
  // o último dia anotado de quem olha: gasto nos limites que ele vê ou "não gastei" marcado (R9)
  // E2: só o que ele escreve (o seu e a Casa): o gasto do outro, que ele agora lê, não conta como "anotou hoje"
  ultimoGasto: () => [...vivos().filter(l => podeEscrever(l.envelope_id)).map(l => l.data), ...((db.config.dias_sem_gasto as string[] | undefined) || [])].filter(d => d <= hojeRecife()).sort().pop() || null,
  // exemplo: no mês passado sobraram 4% do combinado
  sobraMesPassado: () => centavos(db.envs.reduce((t, x) => t + x.limite_mes, 0) * 0.04),
  lancarFeira: (data, valor, loja) => { const l: Lancamento = { id: 'l' + Date.now(), envelope_id: 'env-feira', cartao_id: null, valor: centavos(valor), data, descricao: loja, apagado_em: null, criado_em: new Date().toISOString() }; db.lanc.push(l); return l.id },
}
const membrosExemplo = () => membrosTeste().filter(x => x.papel === 'casal').map(x => ({ id: x.id, nome: x.nome, papel: x.papel }))
const soCasal = () => { if (logado === 'carla') throw new Error('Só o casal vê o dinheiro guardado.') }
/** E2 (igual a f_02): aplicação no nome do outro é só pra ler. */
function minhaAplicacao(id: string) {
  const t = ex2.titularDaAplicacaoEx(id)
  if (t && t !== membroLogado().id) { const n = membrosTeste().find(x => x.id === t)?.nome || 'outra pessoa'; throw new Error(`Essa aplicação está no nome de ${n}: só ${n} anota guardar, tirar ou encerrar.`) }
}
/** E2: o cartão é de quem olha ou da família? (o do outro é só pra ler) */
function meuCartao(id: string | undefined, titular?: string | null) {
  const c = id ? db.cartoes.find(x => x.id === id) : undefined
  if (c && c.titular_id && c.titular_id !== membroLogado().id) throw new Error(`Esse cartão é de ${c.titular || 'outra pessoa'}: só ${c.titular || 'quem é dono'} muda.`)
  if (titular && titular !== membroLogado().id) throw new Error('Cada um cadastra só o próprio cartão (ou um da família, sem dono).')
}

export const apiExemplo: Api = {
  modo: 'exemplo',
  async sessao(): Promise<Sessao | null> {
    await espera(30)
    if (!logado) return null
    if (logado === 'carla') return { userId: 'u-carla', email: null, dono: false, familias: [{ id: FAM, nome: nomeFamiliaTeste(), papel: 'equipe', membroNome: 'Carla', envelopeId: 'env-feira' }] }
    const eu = membroLogado()
    const fams = [{ id: FAM, nome: nomeFamiliaTeste(), papel: eu.papel, membroNome: eu.nome, envelopeId: eu.envelope, membroId: eu.id }]
    if (familiaNova) fams.unshift({ id: FAM, nome: familiaNova.nome, papel: 'casal', membroNome: familiaNova.pessoa, envelopeId: eu.envelope, membroId: eu.id })
    return { userId: 'u-' + eu.id, email: eu.email, dono: logado === 'bruno', familias: fams }
  },
  async enviarCodigo(email) { await espera(); if (!email.includes('@')) throw new Error('E-mail inválido') },
  async confirmarCodigo(_email, codigo) { await espera(); if (codigo !== '123456') throw new Error('Código não confere. No exemplo, use 123456.'); logado = logadoInicial() === 'carla' ? 'ana' : logadoInicial() },
  async entrarEquipe(convite, codigo) { await espera(); if (convite !== CONVITE_EXEMPLO) throw new Error('Esse link não é o do exemplo. Peça o link pra quem cuida da família.'); if (codigo !== '2468') throw new Error('Código não confere. No exemplo, use 2468.'); logado = 'carla' },
  async sair() { logado = null; familiaNova = null },

  async criarFamilia(nome, nomePessoa) {
    await espera()
    familiaNova = { id: FAM, nome, pessoa: nomePessoa }
    db.envs[0].nome = nomePessoa
    return FAM
  },
  async salvarEnvelope(_f, id, campos) {
    const e = db.envs.find(x => x.id === id)
    if (!e) throw new Error('Envelope não encontrado')
    Object.assign(e, campos)
  },
  async definirLimite(_f, id, valor) {
    const e = db.envs.find(x => x.id === id)
    if (!e) throw new Error('Esse limite não existe mais. Feche e abra a tela de novo.')
    if (!(valor >= 0)) throw new Error('O limite tem que ser um valor de zero pra cima.')
    e.limite_mes = centavos(valor)
  },
  async convidar(_f, papel, nome, email) {
    await espera()
    if (papel === 'equipe') return { convite: CONVITE_EXEMPLO, codigo_4_digitos: '2468', expira_em: new Date(Date.now() + 864e5).toISOString() }
    const ja = db.convites.find(c => c.email && email && c.email === email.trim().toLowerCase() && c.situacao !== 'cancelado')
    if (ja) throw new Error(ja.situacao === 'entrou' ? `${ja.nome} já está na família.` : `Esse e-mail já foi convidado. Use Reenviar em "Quem está na família".`)
    db.convites.push({ id: 'cv' + Date.now(), nome: nome || 'Convidado', email: email ? email.trim().toLowerCase() : null, papel, situacao: 'esperando', enviado_em: hojeRecife() })
    return { ok: true, convite: 'email' }
  },

  async resumoHoje() { await espera(40); return resumoDeQuemEsta() },
  async lancar(nv: NovoLancamento) {
    await espera(80)
    // igual ao banco: a mesma chave do toque nunca grava 2 vezes
    const ja = porChave.get(nv.chave)
    if (ja) return { lancamento: semValorPraEquipe(ja), resumo: resumoDeQuemEsta(), repetido: true }
    // E2 (igual a f_02): o casal lê o limite do outro, mas lança só no seu e na Casa
    // E4 (igual a f_04): parcelado só no cartão com dia de fechamento e de vencimento
    if ((nv.parcelas || 1) > 1 && !faturaDoLanc({ cartao_id: nv.cartao || null, data: nv.data })) throw new Error('Parcelado só no cartão com o dia que fecha e o dia que vence. Cadastre os 2 dias em Cartões.')
    if (logado !== 'carla' && !podeEscrever(nv.envelope)) throw new Error(`Esse limite ${donoDoEnv(nv.envelope) ? `é de ${donoDoEnv(nv.envelope)}` : 'não é seu'}. Lance no seu ou num da Casa.`)
    const l: Lancamento = { id: 'l' + Date.now(), envelope_id: nv.envelope, cartao_id: nv.cartao || null, valor: centavos(nv.valor), data: nv.data, descricao: nv.descricao, apagado_em: null, criado_em: new Date().toISOString(), ...(nv.cartao && (nv.parcelas || 1) > 1 ? { parcelas: Math.min(12, Math.floor(nv.parcelas!)) } : {}), autor: logado === 'carla' ? 'carla' : membroLogado().id }
    db.lanc.push(l)
    porChave.set(nv.chave, l)
    if (nv.segundos != null) tempos.push(nv.segundos)
    return { lancamento: semValorPraEquipe(l), resumo: resumoDeQuemEsta() }
  },
  async lancamentos(_f, mes) {
    await espera(40)
    // lanc_ver (E2): o casal lê os lançamentos da família toda; `meu` diz em qual dá pra mexer
    const meus = db.lanc.filter(l => podeVer(l.envelope_id)).map(l => semValorPraEquipe({ ...l, meu: logado !== 'carla' && lancMeu(l) }))
    const doMes = meus.filter(l => l.data.startsWith(mes))
    // E4: cada parcela aparece no mês da fatura dela (a 1ª também), no dia 1, só pra ler
    const parc: Lancamento[] = []
    for (const l of meus.filter(x => !x.apagado_em && (x.parcelas || 1) > 1)) {
      const ps = parcelasDe(l.valor, l.parcelas!), m1 = faturaDoLanc(l) || l.data.slice(0, 7)
      ps.forEach((v, i) => { if (mesMais(m1, i) === mes) parc.push({ ...l, id: `${l.id}#${i + 1}`, valor: v, data: `${mes}-01`, criado_em: `${mes}-01T00:00:00-03:00`, parcelas: 1, parcela: { n: i + 1, de: ps.length, compra: l.data } }) })
    }
    return [...doMes, ...parc].sort((x, y) => (y.data + y.criado_em).localeCompare(x.data + x.criado_em))
  },
  async corrigirLancamento(id, campos) {
    await espera(60)
    const l = db.lanc.find(x => x.id === id)
    if (!l) throw new Error('Esse lançamento não existe mais. Feche e abra a tela de novo.')
    // E2 (igual a f_02): só quem lançou, e só no seu limite ou na Casa
    if (logado === 'carla' || !lancMeu(l)) throw new Error(donoDoEnv(l.envelope_id) && !podeEscrever(l.envelope_id) ? `Esse gasto é de ${donoDoEnv(l.envelope_id)}: só ${donoDoEnv(l.envelope_id)} corrige.` : 'Só quem lançou corrige esse gasto.')
    if (campos.valor != null && !(campos.valor > 0)) throw new Error('O valor tem que ser maior que zero.')
    if (campos.envelope && !podeEscrever(campos.envelope)) throw new Error('Esse limite não é seu.')
    if (campos.valor != null) l.valor = centavos(campos.valor)
    if (campos.descricao != null) l.descricao = campos.descricao
    if (campos.data) l.data = campos.data
    if (campos.envelope) l.envelope_id = campos.envelope
    if (campos.cartao !== undefined) l.cartao_id = campos.cartao
    if (campos.parcelas != null) l.parcelas = l.cartao_id && campos.parcelas > 1 ? Math.min(12, campos.parcelas) : undefined
  },
  async cobrirComCasa(_f, envelope, valor) {
    await espera(60)
    // E2 (premissa 6): só o dono do gasto aperta "Cobrir com a Casa"
    if (!podeEscrever(envelope)) throw new Error('Só quem passou do combinado escolhe de onde sai.')
    const mes = hojeRecife().slice(0, 7)
    const casa = db.envs.find(e => e.casa && e.regra === 'mensal')
    if (!casa) throw new Error('Não tem limite da Casa pra cobrir.')
    const ce = contaEnvelope(casa, hojeRecife())
    const sobra = centavos(ce.livre - casa.colchao)
    if (sobra < valor) throw new Error(`A Casa só tem ${reais(Math.max(0, sobra))} de sobra este mês, fora a reserva.`)
    const id = 'aj' + Date.now()
    db.ajustes.push({ id, mes, de: casa.id, para: envelope, valor: centavos(valor) })
    return async () => { db.ajustes = db.ajustes.filter(a => a.id !== id) }
  },
  async convites() { await espera(30); return db.convites.filter(c => c.situacao !== 'cancelado').map(c => ({ ...c })) },
  async reenviarConvite(_f, id) { await espera(40); const c = db.convites.find(x => x.id === id); if (!c) throw new Error('Esse convite não existe mais.'); if (c.situacao !== 'esperando') throw new Error(`${c.nome} já entrou.`); c.enviado_em = hojeRecife() },
  async cancelarConvite(_f, id) { await espera(40); const c = db.convites.find(x => x.id === id); if (!c) throw new Error('Esse convite não existe mais.'); if (c.situacao !== 'esperando') throw new Error(`${c.nome} já entrou: não dá pra cancelar o convite.`); c.situacao = 'cancelado' },
  // E2 (igual a f_02): apagar e trazer de volta só quem lançou, no seu limite ou na Casa
  async apagarLancamento(id) { const l = db.lanc.find(x => x.id === id); if (l && !lancMeu(l)) throw new Error('Só quem lançou apaga esse gasto.'); if (l) l.apagado_em = new Date().toISOString() },
  async restaurarLancamento(id) { const l = db.lanc.find(x => x.id === id); if (l && !lancMeu(l)) throw new Error('Só quem lançou traz esse gasto de volta.'); if (l) l.apagado_em = null },

  // E2 (regra nova, 13/11): o casal vê todos os cartões, com o nome do dono; a pessoa da família e a equipe, nenhum
  async cartoes() { await espera(30); return cartoesVisiveis().filter(c => c.ativo !== false).map(c => ({ ...c })) },
  async criarCartao(_f, c) { db.cartoes.push({ id: 'car-' + Date.now(), ...c }) },
  async faturas(_f, meses) { await espera(40); return faturasCalc(meses) },

  async config<T>(_f: string, chave: ChaveConfig, padrao: T): Promise<T> {
    // pessoa da família (filha) não lê o que é do casal: rendas, metas, folha, serviços com valor, entradas
    if (papelLogado() === 'pessoa' && !['casa_lista', 'casa_gas', 'dias_sem_gasto', 'metas_pessoais', 'termo_aceito'].includes(chave)) return padrao
    return (chave in db.config ? db.config[chave] : padrao) as T
  },
  async salvarConfig(_f, chave, valor) { db.config[chave] = JSON.parse(JSON.stringify(valor)) },

  async casaDaEquipe() { await espera(30); return casaSemDinheiro() },
  async casaMarcar(_f, tipo, dados = {}) {
    await espera(40)
    const hoje = hojeRecife()
    const eu = logado === 'carla' ? 'Carla' : membroLogado().nome
    const cfg = db.config as Record<string, any>
    if (tipo === 'comprei' || tipo === 'acabou') {
      const lista: { id: string; nome: string; ok: boolean }[] = cfg.casa_lista || []
      const nome = (dados.nome || '').trim()
      const i = lista.find(x => x.id === dados.id || (!dados.id && x.nome.toLowerCase() === nome.toLowerCase()))
      if (i) i.ok = tipo === 'comprei'
      else if (tipo === 'acabou' && nome) lista.push({ id: 'i' + Date.now(), nome, ok: false })
      else throw new Error('Esse item não está mais na lista.')
      cfg.casa_lista = lista
    } else if (tipo === 'prestador_veio') {
      const p = (cfg.casa_prestadores || []).find((x: any) => x.id === dados.id)
      if (!p) throw new Error('Esse serviço não está mais cadastrado.')
      p.ultimaVez = hoje
    } else if (tipo === 'troquei_gas') {
      const g = cfg.casa_gas || { trocas: [] }
      if (!g.trocas.includes(hoje)) g.trocas.push(hoje)
      cfg.casa_gas = g
      avisos.push({ tipo: 'casa_gas', data: hoje, nome: eu })
    } else {
      const pres = cfg.casa_presenca || {}
      if (!(pres[hoje] || []).includes(eu)) pres[hoje] = [...(pres[hoje] || []), eu]
      cfg.casa_presenca = pres
      const ponto = cfg.casa_ponto || {}
      const hora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit' })
      ponto[hoje] = { ...(ponto[hoje] || {}), [eu]: { ...(ponto[hoje]?.[eu] || {}), [tipo === 'cheguei' ? 'chegou' : 'saiu']: hora } }
      cfg.casa_ponto = ponto
      avisos.push({ tipo: 'casa_presenca', data: hoje, nome: eu })
    }
    return casaSemDinheiro()
  },
  async avisosCasa() { return [...avisos] },
  async anotarCompraEquipe(_f, c) {
    await espera(60)
    const hoje = hojeRecife(), nome = c.nome.trim()
    if (!nome) throw new Error('Escreva o que você comprou. Ex.: feira do mercadinho, detergente.')
    const quem = logado === 'carla' ? 'Carla' : membroLogado().nome
    db.comprasEquipe.push({ id: 'ce' + Date.now(), data: hoje, nome: nome.slice(0, 60), tipo: c.tipo, nota: !!c.foto, por: quem })
    let falta = ''
    if (c.tipo === 'feira') {
      // a feira da semana fica registrada pro Fiscal (sem valor: o casal confere pela foto)
      const f = ex2.feirasEx(mundo).find(x => x.semana === segundaDaSemana(hoje))
      const id = f ? f.id : (ex2.feiraRegistrarEx(mundo, { data: hoje, loja: nome }), ex2.feirasEx(mundo).find(x => x.semana === segundaDaSemana(hoje))?.id)
      // E3 (conserto 9): a foto de hoje é da compra de hoje. Ela não vale como a nota de uma feira de outro dia (o pedido continua)
      const outroDia = f && f.data !== hoje && !f.tem_nota
      if (id && c.foto && !outroDia) ex2.feiraAnexarEx(id)
      if (outroDia) falta = ` A nota da feira de ${dataCurta(f!.data)} ainda falta: tire a foto dela no cartão do Fiscal.`
      else if (!c.foto) falta = ' Quando tiver a nota, tire a foto no cartão do Fiscal.'
    }
    return { aviso: `Anotado: ${nome}${c.tipo === 'feira' ? ' (feira da semana)' : ''}.${c.foto ? ' A foto da nota foi pro casal. O casal confere o valor pela foto.' : ' O casal confere o valor.'}${falta}` }
  },
  async entrouAMais(_f, mes) {
    await espera(20)
    const eu = membroLogado()
    // QA E11 (erro 5): a regra do salário é da FAMÍLIA, 1 número só pros 2 (igual à rodada 2). A pessoa da família (filha) vê só o dela
    const familia = papelLogado() === 'casal'
    const itens: { de: string; valor: number; destino: string }[] = []
    // o que foi guardado pelo "Entrou dinheiro" (aporte com nota) nas aplicações da família
    for (const a of ex2.guardadoHojeEx(eu.id, familia).aplicacoes) for (const m of ex2.movimentosEx(a.id)) if (m.tipo === 'aporte' && m.nota && m.data.startsWith(mes)) itens.push({ de: m.nota, valor: m.valor, destino: 'reserva' })
    // o que já foi guardado aparece pelo movimento da aplicação (não conta 2 vezes)
    for (const x of ((db.config.entradas as any[]) || [])) if (x.destino !== 'reserva' && x.data?.startsWith(mes) && (familia || !x.dono || x.dono === eu.nome)) itens.push({ de: x.de, valor: x.valor, destino: x.destino === 'reserva' ? 'reserva' : x.destino })
    const entrou = centavos(itens.filter(i => i.destino !== 'renda').reduce((t, i) => t + i.valor, 0))
    return { entrou, guardado: centavos(itens.filter(i => i.destino === 'reserva').reduce((t, i) => t + i.valor, 0)), itens }
  },
  async cobrirImprevisto(_f, envelope, valor) {
    await espera(60)
    if (!podeEscrever(envelope)) throw new Error('Esse limite não é seu.')
    const id = 'im' + Date.now()
    db.ajustes.push({ id, mes: hojeRecife().slice(0, 7), de: 'reserva-mes-ruim', para: envelope, valor: centavos(valor) })
    return async () => { db.ajustes = db.ajustes.filter(a => a.id !== id) }
  },
  async lerCupom() {
    await espera(300)
    // resultado fixo de exemplo: nenhuma foto sai do aparelho
    if (logado === 'carla') throw new Error('A leitura de cupom é só pro casal e pras pessoas da família. A equipe anota o que comprou e tira a foto da nota.')
    return { itens: [{ nome: 'Arroz 5 kg', valor: 28.9, qtd: 1 }, { nome: 'Feijão 1 kg', valor: 8.49, qtd: 1 }, { nome: 'Banana prata', valor: 7.98, qtd: 1.2 }, { nome: 'Detergente', valor: 2.79, qtd: 1 }], total: 48.16, soma_dos_itens: 48.16, total_confere: true, data: hojeRecife(), loja: 'Mercadinho', aviso: 'Confira antes de salvar. Nada foi lançado.' }
  },

  // E2: o casal lê todas as aplicações (com o nome do titular); guarda, tira e encerra só na sua e na do casal
  async guardadoHoje() { await espera(30); soCasal(); return ex2.guardadoHojeEx(membroLogado().id, true) },
  async guardadoCriar(_f, a) {
    await espera(60); soCasal()
    // igual ao banco (f_08): "do casal" vai explícito; titular só o próprio; sem os 2, fica no nome de quem cria
    if (a.do_casal && a.titular) throw new Error('Escolha: no seu nome ou do casal, não os 2.')
    if (a.titular && a.titular !== membroLogado().id) throw new Error('Cada um cria aplicação só no próprio nome ou do casal.')
    ex2.guardadoCriarEx({ ...a, titular: a.do_casal ? null : membroLogado().id })
  },
  async guardadoMovimentar(aplicacao, tipo, valor, data, chave, nota) { await espera(60); soCasal(); minhaAplicacao(aplicacao); ex2.guardadoMovimentarEx(aplicacao, tipo, valor, data, chave, nota) },
  async guardadoDesfazer(aplicacao, chave) { await espera(40); soCasal(); minhaAplicacao(aplicacao); ex2.guardadoDesfazerEx(aplicacao, chave) },
  async guardadoEncerrar(aplicacao) { await espera(40); soCasal(); minhaAplicacao(aplicacao); ex2.guardadoEncerrarEx(aplicacao) },
  async guardadoCustoDoGasto(_f, valor) { await espera(20); soCasal(); return ex2.custoDoGastoEx(valor, membroLogado().id) },

  async escritorioHoje() { await espera(30); return ex2.escritorioHojeEx(mundo) },
  async escritorioResponder(_f, pergunta, opcao, dados) { await espera(60); return ex2.escritorioResponderEx(mundo, pergunta, opcao, dados) },
  async escritorioRelatorio(_f, de, ate) { await espera(30); return ex2.relatorioEx(mundo, de, ate) },
  async escritorioDiario(_f, funcionario, limite, antes) { await espera(20); return ex2.diarioEx(mundo, funcionario, limite, antes) },
  async membros() { await espera(20); return membrosExemplo() },
  async cartaoSalvar(_f, c) { await espera(40); soCasal(); meuCartao(c.id, c.titular_id); ex2.cartaoSalvarEx(mundo, { ...c, titular: membrosExemplo().find(m => m.id === c.titular_id)?.nome || null }) },
  async faturasBanco() { await espera(20); soCasal(); return ex2.faturasBancoEx() },
  async faturaInformar(_f, cartao, mes, d) { await espera(40); soCasal(); meuCartao(cartao); ex2.faturaInformarEx(mundo, cartao, mes, d) },
  async feiras() { await espera(20); return ex2.feirasEx(mundo) },
  async feiraRegistrar(_f, f) { await espera(40); ex2.feiraRegistrarEx(mundo, f) },
  async notaSubir(_f, feira) { await espera(80); return `fam-silva/${feira}.jpg` },
  async feiraAnexarNota(_f, feira) { await espera(80); return ex2.feiraAnexarEx(feira) },
  async feiraSemNota(_f, feira, motivo) { await espera(40); ex2.feiraSemNotaEx(feira, motivo) },
  async estoque() { await espera(20); return ex2.estoqueEx() },
  async estoqueContar(_f, itens) { await espera(40); ex2.estoqueContarEx(mundo, itens) },
  async estoqueItemSalvar(_f, item) { await espera(40); soCasal(); ex2.estoqueItemSalvarEx(item) },
  async lembretes() { await espera(20); soCasal(); return ex2.lembretesEx() },
  async lembreteCriar(_f, l) { await espera(40); soCasal(); ex2.lembreteCriarEx(l) },
  async lembreteConcluir(_f, id) { await espera(40); soCasal(); ex2.lembreteConcluirEx(id) },
  async lembreteAdiar(_f, id, ate) { await espera(40); soCasal(); ex2.lembreteAdiarEx(id, ate) },
  async lembreteApagar(_f, id) { await espera(40); soCasal(); ex2.lembreteApagarEx(id) },

  async numerosSemana() {
    await espera(40)
    const media = tempos.reduce((s, t) => s + t, 0) / tempos.length
    return [
      { chave: 'ativacao', nome: 'Ativação', valor: 80, texto: '4 de 5', meta: 'meta 80%', ok: true, explicacao: 'Famílias que lançaram 10 gastos na 1ª semana: 4 das 5 que entraram nas últimas 4 semanas.' },
      { chave: 'retencao', nome: 'Retenção no dia 30', valor: 60, texto: '3 de 5', meta: 'meta 60%', ok: true, explicacao: 'Famílias que ainda abriram o app no 30º dia depois de entrar: 3 de 5.' },
      { chave: 'tempo', nome: 'Tempo por lançamento', valor: Math.round(media * 10) / 10, texto: String(Math.round(media * 10) / 10).replace('.', ',') + ' s', meta: 'meta abaixo de 10 s', ok: media < 10, explicacao: `Média dos últimos ${tempos.length} lançamentos, do toque no botão verde até o salvo.` },
      { chave: 'erros', nome: 'Erros de conta', valor: 0, texto: '0', meta: 'meta 0', ok: true, explicacao: 'Testes da noite que falharam: a soma bate, nenhum mês abaixo da reserva, nenhum lançamento repetido.' },
    ]
  },
  // E2 (conserto 1, igual a f_03): o casal baixa a família inteira, com o nome do dono em cada linha
  // E5 (igual a f_05): o casal vê os recebimentos de todos, com o nome do dono; criar e mudar só o dono; filha e equipe, nada
  async recebimentos() {
    await espera(30)
    if (papelLogado() !== 'casal') return []
    const eu = membroLogado().id
    return db.recebimentos.filter(r => !r.apagado).map(({ apagado: _a, ...r }) => ({ ...r, dono_nome: membrosTeste().find(x => x.id === r.dono_membro)?.nome ?? null, meu: r.dono_membro === eu }))
  },
  async recebimentoCriar(_f, r) {
    await espera(40)
    if (papelLogado() !== 'casal') throw new Error('Só o casal anota recebimento.')
    if (!r.descricao.trim()) throw new Error('Diga o que é (ex.: contrato, venda do carro).')
    if (!(r.valor > 0)) throw new Error('O valor tem que ser maior que zero.')
    if (!/^\d{4}-\d{2}$/.test(r.mes_previsto)) throw new Error('Escolha o mês em que o dinheiro entra.')
    db.recebimentos.push({ id: 'rc' + Date.now(), dono_membro: membroLogado().id, descricao: r.descricao.trim().slice(0, 120), valor: centavos(r.valor), mes_previsto: r.mes_previsto, mes_novo: null, tipo: r.tipo, certo: r.certo, recebido_em: null, valor_recebido: null, apagado: false })
  },
  async recebimentoMudar(_f, id, m) {
    await espera(40)
    const r = db.recebimentos.find(x => x.id === id && !x.apagado)
    if (!r) throw new Error('Esse recebimento não existe mais.')
    if (r.dono_membro !== membroLogado().id) { const n = membrosTeste().find(x => x.id === r.dono_membro)?.nome || 'o dono'; throw new Error(`Esse recebimento é de ${n}: só ${n} muda.`) }
    if (m.mes_novo != null && m.mes_novo <= r.mes_previsto) throw new Error('O mês novo tem que ser depois do mês previsto.')
    if (m.recebido_em !== undefined) { r.recebido_em = m.recebido_em; r.valor_recebido = m.recebido_em ? centavos(m.valor_recebido ?? r.valor) : null }
    if (m.mes_novo !== undefined) r.mes_novo = m.mes_novo
    if (m.certo !== undefined) r.certo = m.certo
    if (m.apagar) r.apagado = true
  },
  // ---------- E6: objetivo 2029, Focus e os dados pro motor (iguais a f_07, f_10 e f_08) ----------
  async objetivo() {
    await espera(30)
    if (papelLogado() !== 'casal') throw new Error('Só o casal vê o objetivo de 2029.')
    return { parametros: db.objetivo.parametros ? JSON.parse(JSON.stringify(db.objetivo.parametros)) : null, historico: db.objetivo.historico.map(h => ({ ...h })), focus: FOCUS_EXEMPLO.map(f => ({ ...f })) }
  },
  async objetivoSalvar(_f, p) {
    await espera(40)
    if (papelLogado() !== 'casal') throw new Error('Só o casal muda o objetivo de 2029.')
    const ok = (t: string) => /^-?\d+(\.\d+)?$/.test(t) && Math.abs(Number(t)) <= 1
    if (![p.margem, p.taxa_real_trabalho, p.aliq_proj, ...(p.aliq_renda != null ? [p.aliq_renda] : []), ...Object.values(p.taxa_bruta_ano), ...Object.values(p.ipca_ano)].every(ok)) throw new Error('Confira as taxas: use um número em %, tipo 10 ou 4,5.')
    if (!(p.mes_reajuste >= 1 && p.mes_reajuste <= 12)) throw new Error('O mês do reajuste vai de 1 a 12.')
    const antes = db.objetivo.parametros
    if (JSON.stringify(antes) === JSON.stringify(p)) return
    db.objetivo.parametros = JSON.parse(JSON.stringify(p))
    // igual ao gatilho do banco: quem, quando, antes e depois (o mais novo primeiro)
    db.objetivo.historico.unshift({ quem: membroLogado().nome, quando: new Date().toISOString(), antes: antes ? JSON.parse(JSON.stringify(antes)) : null, depois: JSON.parse(JSON.stringify(p)) })
  },
  async futuroEntradas() {
    await espera(40)
    if (papelLogado() !== 'casal') throw new Error('Só o casal vê as contas do futuro.')
    const hoje = hojeRecife(), m0 = hoje.slice(0, 7)
    const g = ex2.guardadoHojeEx(membroLogado().id, true)
    const titulares = (t: string | null | undefined) => (t ? membrosTeste().filter(x => x.id === t) : membrosTeste().filter(x => x.papel === 'casal')).map(x => ({ membro_id: x.id, nome: x.nome }))
    // o mesmo formato de produto.futuro_entradas (f_08), em centavos inteiros: passa pelo mesmo entradaDoBanco do modo real
    const j: FuturoBanco = {
      hoje, mes_base: m0,
      aplicacoes: g.aplicacoes.map(a => ({ id: a.id, titular_membro: a.titular ?? null, titular_nome: a.titular_nome ?? null, titulares: titulares(a.titular), banco: a.banco, tipo: a.tipo,
        saldo_centavos: Math.round(a.saldo * 100), pct_cdi: String(a.pct_cdi), isenta: a.tipo === 'lci_lca' || a.tipo === 'poupanca',
        aplicada_em: ex2.movimentosEx(a.id)[0]?.data || hoje, resgate_previsto: a.vence_em })),
      cdi_hoje: { pct_ano: g.cdi_usado.pct_ano },
      // f_11: a família de exemplo não anotou dinheiro em conta corrente (soma 0, igual ao banco sem linhas)
      saldo_caixa: 0,
      recebimentos: db.recebimentos.filter(r => !r.apagado).map(r => ({ id: r.id, dono_nome: membrosTeste().find(x => x.id === r.dono_membro)?.nome ?? null, valor_centavos: Math.round(r.valor * 100), mes_previsto: r.mes_previsto, mes_novo: r.mes_novo, certo: r.certo, recebido_em: r.recebido_em })),
      limites_mes: db.envs.map(e => ({ envelope_id: e.id, limite_centavos: Math.round(limiteNoMes(e, m0) * 100) })),
      config: { casa_folha: db.config.casa_folha as any },
      parcelas_futuras: vivos().filter(l => (l.parcelas || 1) > 1 && faturaDoLanc(l)).map(l => { const m1 = faturaDoLanc(l)!; return { parcelas_lista: parcelasDe(l.valor, l.parcelas!).map((v, i) => ({ mes_fatura: mesMais(m1, i), valor_centavos: Math.round(v * 100) })) } })
        .filter(l => l.parcelas_lista[l.parcelas_lista.length - 1].mes_fatura >= m0),
      // E8: igual ao f_08: os desejos vivos, menos os de quem desistiu
      // revisão E12 (C2): manda todos os vivos com a situação, como o f_08 (o motor pula "feito" e "desisti")
      desejos: db.desejos.filter(d => !d.apagado).map(d => ({ id: d.id, dono_membro: d.dono_membro, valor_centavos: Math.round(d.valor * 100), mes: d.mes, volta_de: d.volta_de, volta_centavos: Math.round(d.volta * 100), volta_mes: d.volta_mes, antecipado_centavos: d.antecipado == null ? null : Math.round(d.antecipado * 100), volta_certa: d.volta_certa, situacao: d.situacao })),
      parametros: db.objetivo.parametros, focus: FOCUS_EXEMPLO,
    }
    return entradaDoBanco(j)
  },
  // ---------- E7 (F8): o reajuste do teto, com as mesmas regras da f_12 ----------
  async reajusteSituacao(_f, mes) { await espera(20); return situacaoReajusteEx(mes) },
  async reajusteVotar(_f, mes, teto, ipca) {
    await espera(30)
    if (papelLogado() !== 'casal') throw new Error('Só os adultos do casal votam o reajuste.')
    if (!(Number.isSafeInteger(teto) && teto > 0)) throw new Error('O teto tem que ser maior que zero.')
    if (!/^-?0\.[0-9]{1,8}$/.test(ipca || '')) throw new Error('O IPCA vem em texto decimal, ex.: 0.0450.')
    // R1 (igual a f_12): o voto é pra um mês que ainda não começou
    if (mes <= hojeRecife().slice(0, 7)) throw new Error('O reajuste vale a partir de um mês que ainda não começou.')
    // 1 voto por adulto: votar de novo troca só o próprio teto e IPCA; ninguém mexe no voto do outro
    const eu = membroLogado().id
    const v = db.reajusteVotos.find(x => x.mes === mes && x.membro_id === eu)
    if (v) { v.teto = teto; v.ipca = ipca } else db.reajusteVotos.push({ mes, membro_id: eu, teto, ipca, votou_em: new Date().toISOString() })
    return situacaoReajusteEx(mes)
  },
  async reajusteAplicar(_f, envelope, mes) {
    await espera(30)
    if (papelLogado() !== 'casal') throw new Error('Só o casal aplica o reajuste.')
    const s = situacaoReajusteEx(mes)
    if (!s.aprovado) throw new Error('O reajuste ainda não foi aprovado por todos os adultos no mesmo teto e IPCA.')
    if (s.aplicar_ate && hojeRecife() > s.aplicar_ate) throw new Error(`O prazo pra aplicar acabou em ${dataCurta(s.aplicar_ate)}. Votem de novo pra valer.`)
    if (!s.ja_vale) throw new Error(`O reajuste vale a partir de ${s.vale_a_partir!.slice(5)}/${s.vale_a_partir!.slice(0, 4)}.`)
    // o limite do outro adulto continua com ele (mesma regra do banco)
    const dono = membrosTeste().find(x => x.envelope === envelope)
    if (dono && dono.papel === 'casal' && dono.id !== membroLogado().id) throw new Error(`O limite de ${dono.nome} só ${dono.nome} ajusta.`)
    const e = db.envs.find(x => x.id === envelope)
    if (!e) throw new Error('Esse limite não existe mais.')
    // o exemplo calcula como o banco: limite de antes × (1 + IPCA votado), no centavo; aplicar de novo não acumula
    const chave = `${mes}|${envelope}`
    if (db.reajusteBase[chave] == null) db.reajusteBase[chave] = e.limite_mes
    await apiExemplo.definirLimite(_f, envelope, Math.round(db.reajusteBase[chave] * (1 + Number(s.ipca_aprovado)) * 100) / 100)
  },
  // ---------- E8: desejos (igual a f_06): o casal vê todos; a pessoa só os dela; só o dono cria e muda ----------
  async desejos() {
    await espera(30)
    const papel = papelLogado()
    if (papel === 'equipe') return []
    const eu = membroLogado().id
    return db.desejos.filter(d => !d.apagado && (papel === 'casal' || d.dono_membro === eu)).map(({ apagado: _a, ...d }) => ({ ...d, dono_nome: membrosTeste().find(x => x.id === d.dono_membro)?.nome ?? null, meu: d.dono_membro === eu }))
  },
  async desejoCriar(_f, d) {
    await espera(40)
    if (papelLogado() === 'equipe') throw new Error('Desejos são da família: a equipe da casa não anota.')
    if (!d.nome.trim()) throw new Error('Diga o que é o desejo (ex.: viagem, bicicleta).')
    if (!(d.valor > 0)) throw new Error('O valor tem que ser maior que zero.')
    if (!/^\d{4}-\d{2}$/.test(d.mes)) throw new Error('Escolha o mês do desejo.')
    // a mesma regra do banco (desejos_volta_coerente): sem volta, sem valor de volta; com volta, valor e mês
    const nada = d.volta_de === 'nada'
    if (!nada && !(d.volta > 0 && d.volta_mes)) throw new Error('Diga quanto volta e em que mês.')
    db.desejos.push({ id: 'ds' + Date.now(), dono_membro: membroLogado().id, nome: d.nome.trim().slice(0, 80), valor: centavos(d.valor), mes: d.mes, volta_de: d.volta_de, volta: nada ? 0 : centavos(d.volta), volta_mes: nada ? null : d.volta_mes, antecipado: d.volta_de === 'contrato' && d.antecipado != null ? centavos(d.antecipado) : null, volta_certa: !nada && d.volta_certa, situacao: 'pensando', apagado: false })
  },
  async desejoMudar(_f, id, m) {
    await espera(40)
    const d = db.desejos.find(x => x.id === id && !x.apagado)
    if (!d) throw new Error('Esse desejo não existe mais.')
    if (d.dono_membro !== membroLogado().id) { const n = membrosTeste().find(x => x.id === d.dono_membro)?.nome || 'o dono'; throw new Error(`Esse desejo é de ${n}: só ${n} muda.`) }
    if (m.situacao) d.situacao = m.situacao
    if (m.apagar) d.apagado = true
  },
  async exportarFamilia() {
    if (papelLogado() !== 'casal') throw new Error('Baixar os dados da família é com o casal. Use "Baixar meus dados".')
    const dono = (id: string) => donoDoEnv(id) ?? 'Da família'
    return { familia: nomeFamiliaTeste(), exportado_em: new Date().toISOString(),
      envelopes: db.envs.map(e => ({ ...e, dono_nome: dono(e.id) })),
      cartoes: db.cartoes.map(c => ({ ...c, dono_nome: c.titular || 'Da família' })),
      lancamentos: db.lanc.map(l => ({ ...l, dono_nome: dono(l.envelope_id) })),
      guardado_aplicacoes: ex2.guardadoHojeEx(membroLogado().id, true).aplicacoes.map(a => ({ ...a, dono_nome: a.titular_nome || 'Da família' })),
      recebimentos: db.recebimentos.map(r => ({ ...r, dono_nome: membrosTeste().find(x => x.id === r.dono_membro)?.nome || 'Da família' })),
      config: db.config }
  },
  // filha (e quem quiser só o seu): o próprio limite e os próprios lançamentos (igual a produto.exportar_meu)
  async exportarMeu() {
    const eu = membroLogado()
    const env = db.envs.find(e => e.id === eu.envelope)
    return { familia: nomeFamiliaTeste(), exportado_em: new Date().toISOString(), membro: { nome: eu.nome, papel: eu.papel },
      envelopes: env ? [{ ...env, dono_nome: eu.nome }] : [], lancamentos: db.lanc.filter(l => l.envelope_id === eu.envelope).map(l => ({ ...l, dono_nome: eu.nome })) }
  },
  async apagarFamilia(_f, confirmacao) {
    await espera()
    if (confirmacao.trim() !== nomeFamiliaTeste()) throw new Error(`Digite o nome da família igualzinho: ${nomeFamiliaTeste()}`)
    db = criarDados(); ex2.reiniciarExemplo2()
    logado = null
  },
}

export function reiniciarExemplo() { usarFamiliaTeste('silva'); ex2.reiniciarExemplo2(); db = criarDados(); logado = 'ana'; familiaNova = null; porChave.clear() }
/** Só pros testes: entra como outra pessoa da família de exemplo. */
export function exemploComo(p: 'ana' | 'bruno' | 'filha' | 'equipe' | 'autonoma') {
  const fam = p === 'autonoma' ? 'souza' : 'silva'
  if (familiaTeste() !== fam) { usarFamiliaTeste(fam); ex2.reiniciarExemplo2(); db = criarDados() }
  logado = p === 'equipe' ? 'carla' : p === 'autonoma' ? 'claudia' : p
}
/** Só pros testes: entra como a equipe (Carla) sem passar pela tela. */
export function exemploComoEquipe() { logado = 'carla' }
