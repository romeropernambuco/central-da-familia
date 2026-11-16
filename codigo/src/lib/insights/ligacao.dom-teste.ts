// Dados sentinela nas fronteiras reais: nenhum hook ou motor é substituído.
import { vi } from 'vitest'
import type { Api } from '../../api/tipos'
import type { Ctx } from '../../app/contexto'
import type { Rota } from '../../app/rotas'

export const CASOS_LIGACAO = [
  ['fatura_vencendo', 'cartoes', 'cartao', 'Sua fatura vence em breve. Já pagou?'],
  ['fatura_divergente', 'cartoes', 'cartao', 'A fatura não bate com as compras anotadas. Vamos conferir?'],
  // Parcelas pertencem à mesma cobrança: contexto da fatura, sem um segundo card.
  ['parcelas', 'cartoes', 'cartao', 'Há parcelas vencendo nesta fatura'],
  ['reserva', 'planejamento', 'colchao', 'O livre ficou abaixo da reserva. Como vamos recompor?'],
  ['recebimento', 'planejamento', 'tesoureiro', 'Esse dinheiro já entrou ou adiamos a previsão?'],
  ['aplicacao', 'guardado', 'guardado', 'Sua aplicação está vencendo. Quer revisar o destino?'],
  ['feira_nota', 'casa', 'fiscal', 'Falta guardar a nota ou explicar por que não houve.'],
  ['objetivo', 'planejamento', 'tesoureiro', 'O plano está abaixo do necessário para o objetivo. Quer revisar aportes ou premissas?'],
] as const satisfies readonly (readonly [string, Rota, string, string])[]

export function contextoLigacao(tipo: string): Ctx {
  const nome = 'NomeSentinelaPrivado R$ 9.876,54'
  const familia = { id: 'ligacao-' + tipo, nome, membroId: 'eu', membroNome: nome, papel: 'casal', envelopeId: null }
  const fatura = ['fatura_vencendo', 'fatura_divergente', 'parcelas'].includes(tipo)
  const api = {
    modo: 'real',
    escritorioHoje: vi.fn(async () => ({ funcionarios: [], trabalhando: [], entregue: [], precisa_de_voce: [] })),
    escritorioResponder: vi.fn(async () => ({})),
    escritorioDiario: vi.fn(async () => []), estoque: vi.fn(async () => ({ itens: [], contagens: [] })),
    cartoes: vi.fn(async () => [{ id: 'c', nome, dia_fechamento: 10, dia_vencimento: 2 }]),
    faturas: vi.fn(async () => fatura ? [{ cartao_id: 'c', cartao: nome, mes: '2027-01', vencimento: '2027-01-02', total: 9876.54, fechada: true }] : []),
    faturasBanco: vi.fn(async () => tipo === 'fatura_divergente' ? [{ cartao_id: 'c', mes: '2027-01', valor_banco: 1, paga_em: '2026-12-29' }] : []),
    lancamentos: vi.fn(async () => tipo === 'parcelas' ? [{ id: 'l', descricao: nome, cartao_id: 'c', data: '2026-11-20', valor: 9876.54, parcelas: 3 }] : []),
    recebimentos: vi.fn(async () => tipo === 'recebimento' ? [{ id: 'r', descricao: nome, valor: 9876.54, mes_previsto: '2026-11', mes_novo: null, recebido_em: null, meu: true }] : []),
    guardadoHoje: vi.fn(async () => ({ aplicacoes: tipo === 'aplicacao' ? [{ id: 'a', nome, vence_em: '2027-01-01' }] : [] })),
    feiras: vi.fn(async () => tipo === 'feira_nota' ? [{ id: 'f', data: '2026-12-29', semana: '2026-12-28', tem_nota: false, sem_nota_motivo: null, nome, valor: 9876.54 }] : []),
    faturaInformar: vi.fn(async () => {}), recebimentoMudar: vi.fn(async () => {}), feiraSemNota: vi.fn(async () => {}), feiraAnexarNota: vi.fn(async () => ''),
    futuroEntradas: vi.fn(async () => ({ entrada: tipo !== 'objetivo' ? null : {
      hoje: '2026-12-30', saldo_caixa: 0, aplicacoes: [], recebimentos: [], compromissos: [], dividas: [], desvios: [], desejos: [],
      parametros: { mes_base: '2026-12', virada: '2029-01', gasto_2029_hoje: 987654, renda_certa_2029: 0, margem: '0.10', taxa_real_trabalho: '0.04',
        taxa_bruta_ano: { 2026: '0.13', 2027: '0.12', 2028: '0.11' }, ipca_ano: { 2026: '0.05', 2027: '0.04', 2028: '0.04', 2029: '0.04' },
        aliq_proj: '0.225', piso_meses: 6, teto_mes: 987654, mes_reajuste: 1 },
    } })),
  } as unknown as Api
  return { api, familia, sessao: { userId: 'u', dono: true, familias: [familia] }, versao: 0, oculto: false,
    resumo: tipo === 'reserva' ? { colchao: 9876.54, livre_mes: 0 } : null,
    tentar: async (fn: () => Promise<unknown>) => { try { await fn(); return true } catch { return false } },
    recarregar: vi.fn(async () => {}), explicar: vi.fn(), toast() {}, abrirLancar() {},
  } as unknown as Ctx
}
