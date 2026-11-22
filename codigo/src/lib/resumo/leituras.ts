import type { Api, FamiliaMinha } from '../../api/tipos'
import { lerControleReceitas, lerFontesReceita } from '../futuroReceitas'
import { entradaDoCenario } from '../futuroReceitas'
import { futuro } from '../futuro'
import { FUSO, hojeRecife, segundaDaSemana, somaDias } from '../formato'
import { destaqueOrcamento, disponivelHojeCasa, envelopesVisiveis, projecaoCasal } from './orcamento'
import { totaisDoMes } from './movimentacao'
import { totaisGuardado } from './guardado'
import { totalImoveis } from './imoveis'
import { faturasAConferir } from './faturas'
import { totaisRecebimentos } from './recebimentos'
import { situacaoCasa } from './casa'
import { totaisDesejos } from './desejos'
import { totalPendencias } from './pendencias'
import { conferenciasDoPlano, numerosRumo2029 } from './plano2029'
import { saldoDasContas } from './saldos'
import { camposAusentes } from './contrato'
import { lerCompartilhado } from '../invalidacao'
import { entradasDoAluguel, lerCaderno } from '../aluguel'
export function lerLancamentosMes(api: Api, id: string, mes: string) {
  return lerCompartilhado(api, id, 'lancamentos', ['inicio-mes', mes], () => api.lancamentos(id, mes))
}

export async function lerRecebimentos(api: Api, id: string) {
  if (!api.recebimentos) throw new Error('Recebimentos indisponíveis')
  const [lista, f, c] = await Promise.all([
    api.recebimentos(id),
    api.config(id, 'fontes_receita', {}),
    api.config(id, 'receitas_controle', {}),
  ])
  const fontes = lerFontesReceita(f),
    controle = lerControleReceitas(c)
  if (fontes.corrompida || controle.corrompida) throw new Error('Cadastro de receitas incompleto')
  return { lista, fontes: fontes.fontes, controle: controle.controle }
}
export async function lerTotaisRecebimentos(api: Api, id: string) {
  const r = await lerRecebimentos(api, id)
  return totaisRecebimentos(r.lista, r.fontes, r.controle)
}
export async function lerFaturas(api: Api, id: string, hoje: string) {
  const [fs, banco] = await Promise.all([api.faturas(id, 14), api.faturasBanco(id)])
  return faturasAConferir(fs, banco, hoje, somaDias(hoje, 30))
}
export async function lerCasa(api: Api, id: string, hoje: string) {
  const [e, feiras, estoque] = await Promise.all([api.escritorioHoje(id), api.feiras(id), api.estoque(id)])
  return situacaoCasa(e, feiras, estoque, segundaDaSemana(hoje))
}
export async function lerPlano(api: Api, id: string) {
  if (!api.futuroEntradas) throw new Error('Projeção indisponível')
  const p = await api.futuroEntradas(id)
  const e = entradaDoCenario(p, 'garantido')
  if (!e) throw new Error(p.motivo || 'Projeção incompleta')
  return {
    unidade: 'centavos' as const,
    ...numerosRumo2029(futuro(e), e),
    confirmar: p.confirmar,
    conferenciaAntiga: false,
    conferenciasPlano: conferenciasDoPlano(e),
  }
}
export async function lerImoveis(api: Api, id: string) {
  if (!api.imoveis) throw new Error('Imóveis indisponíveis')
  const lista = await api.imoveis(id)
  if (
    !Array.isArray(lista) ||
    camposAusentes(lista).length ||
    lista.some(i => camposAusentes(i).length || !Number.isFinite(i.valor))
  )
    throw new Error('Imóveis incompletos')
  // Falha de projeção não esconde o valor cadastrado. Não recalcula o aluguel.
  let aluguel: number | null = null
  try {
    const p = await api.futuroEntradas?.(id)
    if (p?.entrada) aluguel = futuro(p.entrada).imoveis?.reduce((s, i) => s + i.aluguel_liquido_mes, 0) ?? null
  } catch {
    /* explicitamente indisponível */
  }
  return {
    valor: { unidade: 'reais' as const, valor: totalImoveis(lista) },
    aluguel: aluguel === null ? null : { unidade: 'centavos' as const, valor: aluguel },
    idsConferencia: lista.map(i => i.id),
  }
}
export async function lerOrcamento(api: Api, f: FamiliaMinha, hoje: string) {
  const r = await api.resumoHoje(f.id)
  if (
    camposAusentes(r).length ||
    r.so_nomes ||
    !Array.isArray(r.envelopes) ||
    r.envelopes.some(e => camposAusentes(e).length) ||
    !Number.isFinite(r.pode_gastar_hoje)
  )
    throw new Error('Orçamento incompleto')
  const d = destaqueOrcamento(r, f.envelopeId, hoje, FUSO)
  if (f.papel === 'pessoa' && d.escopo !== 'pessoal') throw new Error('Orçamento pessoal indisponível')
  if (!Number.isFinite(d.valor)) throw new Error('Orçamento incompleto')
  const casal = f.papel === 'casal'
  return {
    valor: { unidade: 'reais' as const, valor: d.valor },
    escopo: d.escopo,
    devendo: d.numero?.estado === 'devendo',
    envelope: d.meu ?? null,
    envelopes: envelopesVisiveis(r.envelopes, f),
    diasRestantes: r.dias_restantes,
    casa: casal ? disponivelHojeCasa(r.envelopes) : null,
    placar: casal && Number(hoje.slice(8)) >= 3 ? projecaoCasal(r.placar_casal) : null,
    placarIndisponivel: casal && api.modo === 'real' && !r.placar_casal?.length,
  }
}
export async function lerMes(api: Api, id: string, hoje: string, mes = hoje.slice(0, 7)) {
  const [gastos, receitas, anotadas, caderno] = await Promise.all([
    lerLancamentosMes(api, id, mes),
    lerRecebimentos(api, id),
    api.config<{ data: string; valor: number }[]>(id, 'entradas', []),
    // o aluguel que chegou (caderno do aluguel) também é dinheiro que entrou no mês; sem o caderno, segue sem ele
    Promise.resolve()
      .then(() => (typeof api.aluguelCaderno === 'function' ? api.aluguelCaderno(id) : null))
      .catch(() => null),
  ])
  const entradas = Array.isArray(anotadas)
    ? [...anotadas, ...entradasDoAluguel(lerCaderno(caderno), mes, hoje)]
    : anotadas
  if (
    !Array.isArray(gastos) ||
    !Array.isArray(receitas.lista) ||
    !Array.isArray(entradas) ||
    camposAusentes(gastos).length ||
    gastos.some(l => camposAusentes(l).length || !Number.isFinite(l.valor)) ||
    receitas.lista.some(r => camposAusentes(r).length || !Number.isFinite(r.valor)) ||
    entradas.some(e => !e.data || !Number.isFinite(e.valor))
  )
    throw new Error('Movimentação incompleta')
  return {
    unidade: 'reais' as const,
    ...totaisDoMes(mes, hoje, gastos, receitas.lista, entradas, receitas.fontes, receitas.controle),
  }
}
export async function lerAplicacoes(api: Api, id: string) {
  const g = await api.guardadoHoje(id)
  if (
    camposAusentes(g).length ||
    ![g.total, g.rendeu_hoje_liquido, g.rendeu_mes_liquido, g.rendeu_desde_inicio_liquido].every(Number.isFinite)
  )
    throw new Error('Aplicações incompletas')
  return {
    unidade: 'reais' as const,
    ...totaisGuardado(g),
    idsConferencia: g.aplicacoes.map(a => a.id),
    atualizadoEm: g.atualizado_em || null,
  }
}
export async function lerPendencias(api: Api, id: string) {
  const e = await api.escritorioHoje(id)
  if (camposAusentes(e).length || !Array.isArray(e.precisa_de_voce)) throw new Error('Fila incompleta')
  return { total: totalPendencias(e), primeira: e.precisa_de_voce[0] }
}
export async function lerDesejos(api: Api, id: string) {
  if (!api.desejos) throw new Error('Desejos indisponíveis')
  return totaisDesejos(await api.desejos(id))
}
export async function lerSaldo(api: Api, id: string) {
  if (!api.saldosConta) throw new Error('Saldo em conta ainda sem dado')
  const contas = await api.saldosConta(id)
  const saldo = saldoDasContas(contas)
  return { contas, saldo }
}
export const relogioResumo = hojeRecife
