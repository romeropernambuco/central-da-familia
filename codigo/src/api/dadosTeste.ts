// Famílias de EXEMPLO dos testadores. Todo número aqui é inventado.
// Família Silva (mesmos dados no "antes" e no "depois"): Ana teto R$ 5.500 por dia, R$ 50.000 guardados no nome dela,
// 1 compra de R$ 1.200 em 6x no cartão (dia 12), material escolar de R$ 900 (dia 10), semana que estoura (dias 15 a 18)
// e 1 presente de R$ 500 (dia 6) que foi pro guardado.
// Rodada 2: (a) a partir de 01/12 o exemplo lembra novembro inteiro (virada do mês); (b) a conta de luz da Casa foi paga
// pelo Bruno no Itaú (quem pagou); (c) cada renda tem dono; (d) o Bruno recebeu um reembolso de R$ 300 que ainda está
// na conta (regra do salário); (e) Família Souza: Cláudia, mãe solo com renda que muda (?como=autonoma).
import { somaDias } from '../lib/formato'

export type FamiliaTeste = 'silva' | 'souza'
let qual: FamiliaTeste = 'silva'
/** Só pro teste: qual família de exemplo está aberta. */
export const usarFamiliaTeste = (f: FamiliaTeste) => { qual = f }
export const familiaTeste = () => qual
export const nomeFamiliaTeste = () => (qual === 'souza' ? 'Família Souza' : 'Família Silva')
/** Compatível com o código antigo (Família Silva). */
export const FAMILIA_TESTE = 'Família Silva'
/** O mês que os testadores usam. A partir do mês seguinte o exemplo traz este mês inteiro (dia 1 lembra do mês anterior). */
export const MES_TESTE = '2026-11'

export interface EnvTeste { id: string; nome: string; regra: 'mensal' | 'diario' | 'semanal'; limite_mes: number; colchao: number; casa: boolean }
export interface LancTeste { id: string; envelope_id: string; cartao_id: string | null; valor: number; data: string; descricao: string | null; apagado_em: string | null; criado_em: string; parcelas?: number; autor?: string }
export interface AppTeste { id: string; nome: string; banco: string; tipo: 'caixinha' | 'cdb' | 'lci_lca' | 'poupanca' | 'tesouro_selic'; pct_cdi: number; liquidez: 'diaria' | 'vencimento'; vence_em: string | null; titular: string | null; movimentos: { data: string; tipo: 'aporte' | 'resgate' | 'saldo_conferido'; valor: number; nota?: string }[] }
export interface MembroTeste { id: string; nome: string; papel: 'casal' | 'pessoa'; envelope: string; email: string }

const MEMBROS_SILVA: MembroTeste[] = [
  { id: 'm-ana', nome: 'Ana', papel: 'casal', envelope: 'env-ana', email: 'ana@exemplo.com' },
  { id: 'm-bruno', nome: 'Bruno', papel: 'casal', envelope: 'env-bruno', email: 'bruno@exemplo.com' },
  { id: 'm-bia', nome: 'Bia', papel: 'pessoa', envelope: 'env-bia', email: 'bia@exemplo.com' },
]
const MEMBROS_SOUZA: MembroTeste[] = [
  { id: 'm-claudia', nome: 'Cláudia', papel: 'casal', envelope: 'env-claudia', email: 'claudia@exemplo.com' },
]
/** Quem é da família de exemplo aberta. */
export const membrosTeste = () => (qual === 'souza' ? MEMBROS_SOUZA : MEMBROS_SILVA)
/** Compatível com o código antigo. */
export const MEMBROS_TESTE = MEMBROS_SILVA

/** Gasto do dia da Ana (dia 1 a 31), sem o material escolar e sem a compra parcelada. Exemplo. */
const ANA = [150, 0, 120, 95, 180, 140, 260, 0, 110, 85, 130, 70, 160, 230, 520, 480, 610, 450, 140, 0, 210, 120, 95, 130, 0, 150, 120, 240, 110, 90, 0]
const DESC_A = ['Padaria', 'Uber', 'Farmácia', 'Mercadinho', 'Lanche das crianças', 'Salão', 'Presente de aniversário', 'Roupa das crianças']
/** Gasto do dia da Cláudia (exemplo): mãe solo, gasto miúdo. */
const CLAUDIA = [60, 0, 85, 40, 120, 70, 140, 0, 55, 90, 45, 60, 110, 95, 160, 75, 130, 50, 65, 0, 100, 40, 85, 60, 0, 70, 90, 120, 50, 40, 0]
const DESC_C = ['Padaria', 'Ônibus', 'Farmácia', 'Mercadinho', 'Lanche dos meninos', 'Gás do carro', 'Material de trabalho']

const ultimoDia = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate()

export function dadosTeste(hoje: string) {
  return qual === 'souza' ? souza(hoje) : silva(hoje)
}

function silva(hoje: string) {
  const [a, m, d] = hoje.split('-').map(Number)
  const ini = `${a}-${String(m).padStart(2, '0')}-01`
  const envs: EnvTeste[] = [
    { id: 'env-ana', nome: 'Ana', regra: 'diario', limite_mes: 5500, colchao: 0, casa: false },
    { id: 'env-bruno', nome: 'Bruno', regra: 'mensal', limite_mes: 4000, colchao: 0, casa: false },
    { id: 'env-bia', nome: 'Bia', regra: 'mensal', limite_mes: 300, colchao: 0, casa: false },
    { id: 'env-feira', nome: 'Feira semanal', regra: 'semanal', limite_mes: 2000, colchao: 0, casa: true },
    { id: 'env-casa', nome: 'Casa mensal', regra: 'mensal', limite_mes: 2500, colchao: 1000, casa: true },
  ]
  const lanc: LancTeste[] = []
  let n = 0
  const add = (env: string, valor: number, data: string, descricao: string, cartao: string | null = null, extra: Partial<LancTeste> = {}) =>
    lanc.push({ id: 'l' + ++n, envelope_id: env, cartao_id: cartao, valor, data, descricao, apagado_em: null, criado_em: data + 'T12:00:00-03:00', autor: env === 'env-bruno' ? 'm-bruno' : env === 'env-bia' ? 'm-bia' : 'm-ana', ...extra })
  /** Um mês de exemplo do dia 1 até o dia `ate` (sem contar o dia `ate`). */
  const mesDeExemplo = (aa: number, mm: number, ate: number) => {
    const m2 = String(mm).padStart(2, '0')
    const dia = (i: number) => `${aa}-${m2}-${String(i).padStart(2, '0')}`
    for (let i = 1; i < ate; i++) {
      const di = dia(i)
      if (ANA[i - 1]) add('env-ana', ANA[i - 1], di, DESC_A[i % DESC_A.length], i % 4 === 0 ? 'car-nu' : null)
      if (i === 10) add('env-ana', 900, di, 'Material escolar das crianças (exemplo)')
      if (i === 12) add('env-ana', 1200, di, 'Tênis e mochila em 6x (exemplo)', 'car-nu', { parcelas: 6 })
      if (i % 3 === 1) add('env-bruno', [190, 120, 260, 90][i % 4], di, ['Combustível', 'Barbeiro', 'Restaurante', 'Livro'][i % 4], i % 2 ? 'car-itau' : null)
      if (i % 5 === 2) add('env-bia', 25, di, 'Lanche da escola')
      const dow = new Date(Date.UTC(aa, mm - 1, i)).getUTCDay()
      if (dow === 1 || dow === 4) add('env-feira', dow === 1 ? 312.4 : 186.9, di, dow === 1 ? 'Feira da semana' : 'Hortifruti', null, { autor: 'm-ana' })
    }
    // a conta de luz da Casa foi paga pelo Bruno no Itaú dele (rodada 2: "quem pagou")
    if (ate > 5) add('env-casa', 286.5, dia(5), 'Conta de luz', 'car-itau', { autor: 'm-bruno' })
    if (ate > 8) add('env-casa', 118.2, dia(8), 'Conta de água')
    if (ate > 2) add('env-casa', 120, dia(2), 'Gás de cozinha')
  }
  // virada do mês: no mês seguinte ao do teste, o exemplo traz o mês do teste inteiro (o dia 1 lembra do que passou)
  const [ta, tm] = MES_TESTE.split('-').map(Number)
  // só no mês logo depois do mês do teste (dezembro): é ali que os testadores conferem a virada
  const depoisDoTeste = hoje.slice(0, 7) === `${tm === 12 ? ta + 1 : ta}-${String(tm === 12 ? 1 : tm + 1).padStart(2, '0')}`
  // E3 (conserto 2): o mês lembrado é igual ao que o dia 30 mostrava (dias 1 a 29 e o Café do último dia), pra o dia 30 e o dia 1
  // falarem o mesmo número. Antes o dia 30 ganhava os R$ 90 do dia a dia só depois de virar o mês (R$ 717 no dia 30 e R$ 795 no dia 1).
  if (depoisDoTeste) { const ult = ultimoDia(ta, tm), md = `${ta}-${String(tm).padStart(2, '0')}`; mesDeExemplo(ta, tm, ult); add('env-ana', 12, `${md}-${ult}`, 'Café') }
  else {
    // mês passado (cartão: entra nas faturas de agora)
    add('env-bruno', 620, somaDias(ini, -10), 'Pneu do carro', 'car-itau')
    add('env-ana', 380, somaDias(ini, -5), 'Farmácia', 'car-nu')
  }
  mesDeExemplo(a, m, d)
  // hoje: 1 gasto pequeno da Ana
  add('env-ana', 12, hoje, 'Café')
  // 1 apagado na lixeira (do Bruno)
  add('env-bruno', 45, hoje, 'Lançado em dobro')
  lanc[lanc.length - 1].apagado_em = new Date().toISOString()

  // Guardado: R$ 50.000 no nome da Ana (depois de o presente de R$ 500 entrar), R$ 8.000 do casal, R$ 15.000 do Bruno
  const d6 = `${a}-${String(m).padStart(2, '0')}-06`
  const apps: AppTeste[] = [
    { id: 'g1', nome: 'Caixinha Nubank', banco: 'Nubank', tipo: 'caixinha', pct_cdi: 100, liquidez: 'diaria', vence_em: null, titular: 'm-ana', movimentos: [{ data: somaDias(ini, -95), tipo: 'aporte', valor: 11500 }, ...(d > 6 ? [{ data: d6, tipo: 'aporte' as const, valor: 500, nota: 'Presente (exemplo)' }] : [])] },
    { id: 'g2', nome: 'CDB Inter', banco: 'Inter', tipo: 'cdb', pct_cdi: 110, liquidez: 'vencimento', vence_em: somaDias(hoje, 12), titular: 'm-ana', movimentos: [{ data: somaDias(ini, -120), tipo: 'aporte', valor: 19000 }] },
    { id: 'g3', nome: 'Tesouro Selic', banco: 'Tesouro Direto', tipo: 'tesouro_selic', pct_cdi: 100, liquidez: 'diaria', vence_em: null, titular: 'm-ana', movimentos: [{ data: somaDias(ini, -60), tipo: 'aporte', valor: 17400 }] },
    { id: 'g4', nome: 'LCA Banco do Brasil', banco: 'Banco do Brasil', tipo: 'lci_lca', pct_cdi: 92, liquidez: 'vencimento', vence_em: somaDias(hoje, 200), titular: null, movimentos: [{ data: somaDias(ini, -160), tipo: 'aporte', valor: 8000 }] },
    { id: 'g5', nome: 'CDB Itaú', banco: 'Itaú', tipo: 'cdb', pct_cdi: 100, liquidez: 'diaria', vence_em: null, titular: 'm-bruno', movimentos: [{ data: somaDias(ini, -300), tipo: 'aporte', valor: 15000 }] },
  ]
  // cada renda tem dono (cada um vê a sua no Planejamento)
  const rendas = [
    { id: 'r1', nome: 'Salário Ana (exemplo)', valor: 7000, tipo: 'salario', dono: 'Ana' },
    { id: 'r2', nome: 'Salário Bruno (exemplo)', valor: 9000, tipo: 'salario', dono: 'Bruno' },
  ]
  // dinheiro que entrou a mais e ainda está na conta (o Gestor do Guardado pergunta: regra do salário)
  const entradas = d > 11 ? [{ id: 'e1', data: `${a}-${String(m).padStart(2, '0')}-11`, valor: 300, de: 'Reembolso do plano de saúde (exemplo)', destino: 'na conta', dono: 'Bruno' }] : []
  return { envs, lanc, apps, rendas, entradas }
}

/** Família Souza (exemplo): Cláudia, mãe solo de 2, renda de R$ 3.200 a R$ 5.800 conforme o mês. */
function souza(hoje: string) {
  const [a, m, d] = hoje.split('-').map(Number)
  const m2 = String(m).padStart(2, '0')
  const ini = `${a}-${m2}-01`
  const dia = (i: number) => `${a}-${m2}-${String(i).padStart(2, '0')}`
  const envs: EnvTeste[] = [
    { id: 'env-claudia', nome: 'Cláudia', regra: 'diario', limite_mes: 2000, colchao: 0, casa: false },
    { id: 'env-feira', nome: 'Feira semanal', regra: 'semanal', limite_mes: 600, colchao: 0, casa: true },
    { id: 'env-casa', nome: 'Casa mensal', regra: 'mensal', limite_mes: 600, colchao: 300, casa: true },
  ]
  const lanc: LancTeste[] = []
  let n = 0
  const add = (env: string, valor: number, data: string, descricao: string, cartao: string | null = null, extra: Partial<LancTeste> = {}) =>
    lanc.push({ id: 's' + ++n, envelope_id: env, cartao_id: cartao, valor, data, descricao, apagado_em: null, criado_em: data + 'T12:00:00-03:00', autor: 'm-claudia', ...extra })
  const mesC = (aa: number, mm: number, ate: number) => {
    const d2 = (i: number) => `${aa}-${String(mm).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    for (let i = 1; i < ate; i++) {
      if (CLAUDIA[i - 1]) add('env-claudia', CLAUDIA[i - 1], d2(i), DESC_C[i % DESC_C.length], i % 5 === 0 ? 'car-nu' : null)
      if (new Date(Date.UTC(aa, mm - 1, i)).getUTCDay() === 6) add('env-feira', 128.5, d2(i), 'Feira da semana')
    }
  }
  // E3 (conserto 2): no mês seguinte ao do teste, a Souza também lembra o mês do teste (antes o dia 1 não descontava nada)
  const [ta, tm] = MES_TESTE.split('-').map(Number)
  if (`${a}-${m2}` === `${tm === 12 ? ta + 1 : ta}-${String(tm === 12 ? 1 : tm + 1).padStart(2, '0')}`) { const ult = ultimoDia(ta, tm); mesC(ta, tm, ult); add('env-claudia', 8, `${MES_TESTE}-${ult}`, 'Café') }
  mesC(a, m, d)
  if (d > 5) add('env-casa', 160, dia(5), 'Conta de luz')
  if (d > 10) add('env-casa', 95, dia(10), 'Internet')
  add('env-claudia', 8, hoje, 'Café')
  const apps: AppTeste[] = [
    { id: 'g1', nome: 'Caixinha Nubank', banco: 'Nubank', tipo: 'caixinha', pct_cdi: 100, liquidez: 'diaria', vence_em: null, titular: 'm-claudia', movimentos: [{ data: somaDias(ini, -90), tipo: 'aporte', valor: 4000 }] },
  ]
  const rendas = [{ id: 'r1', nome: 'Meu trabalho (exemplo)', valor: 3200, tipo: 'variavel', fraco: 3200, bom: 5800, dono: 'Cláudia' }]
  return { envs, lanc, apps, rendas, entradas: [] as { id: string; data: string; valor: number; de: string; destino: string; dono: string }[] }
}
