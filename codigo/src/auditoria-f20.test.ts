import { it, expect } from 'vitest'
import { montarSnapshot } from './lib/insights/snapshot'
import { totaisDoMes } from './telas/lancamentos/Lancamentos'
const familia = { id: 'f', papel: 'casal' } as any
it.each(['real', 'exemplo'] as const)('1: reserva usa meta em %s', modo => {
 const s = montarSnapshot(familia, modo, {resumo: {colchao:20, livre_mes:20, envelopes:[{colchao_meta:100},{colchao_meta:50}]} as any}, '2026-11-30T12:00:00-03:00')
 expect(s.reserva?.combinada).toBe(15000)
})
it('5: recorrente confirmada não cobra a mesma ocorrência', () => {
 const d = {recebimentos:[{id:'r', mes_previsto:'2026-11'}], controleReceitas:{r:{recebidas:{'2026-11':{valor:100,data:'2026-11-01'}}}}} as any
 expect(montarSnapshot(familia,'real',d,'2026-11-30T12:00:00-03:00').recebimentos?.[0].recebido).toBe(true)
 d.recebimentos[0].mes_novo='2026-12'
 expect(montarSnapshot(familia,'real',d,'2026-11-30T12:00:00-03:00').recebimentos?.[0].recebido).toBe(true)
 d.recebimentos[0].mes_previsto='2026-12'
 expect(montarSnapshot(familia,'real',d,'2026-11-30T12:00:00-03:00').recebimentos?.[0].recebido).toBe(false)
})
it('parcelas: original e sintética não somam duas vezes', () => {
 const base = {id:'l', data:'2026-11-01', valor:300, parcelas:3} as any
 const parcela = {...base,id:'l#1',valor:100,parcelas:1,parcela:{n:1,de:3,compra:base.data}}
 expect(totaisDoMes('2026-11','2026-11-30',[base,parcela],[],[]).saiu).toBe(300)
 expect(totaisDoMes('2026-11','2026-11-30',[base],[],[]).saiu).toBe(300)
})
import { apiExemplo } from './api/exemplo'
it('parcelas: reproduz as duas representações na API de exemplo',async()=>{
 const s=(await apiExemplo.sessao())!, f=s.familias[0]
 const c=(await apiExemplo.cartoes(f.id)).find(c=>c.dia_fechamento&&c.dia_vencimento)!
 const e=(await apiExemplo.resumoHoje(f.id)).envelopes.find(e=>!e.casa)!
 await apiExemplo.lancar({envelope:e.id,cartao:c.id,valor:300,parcelas:3,data:'2026-11-01',descricao:'Somente teste F20',chave:'parcelas-f20'} as any)
 const ls=(await apiExemplo.lancamentos(f.id,'2026-11')).filter(l=>l.descricao==='Somente teste F20')
 expect(ls.some(l=>l.parcela)).toBe(true)
 expect(ls.some(l=>(l.parcelas||1)>1)).toBe(true)
 expect(ls.reduce((s,l)=>s+l.valor,0)).toBe(400)
 expect(totaisDoMes('2026-11','2026-11-30',ls,[],[]).saiu).toBe(300)
})
import { lerDadosInsights } from './lib/insights/leitura'
it('5: leitura consulta controle e não cobra se a conferência falhar',async()=>{
 const controle={r:{recebidas:{'2026-11':{valor:100,data:'2026-11-01'}}}}
 const api={modo:'real',recebimentos:async()=>[{id:'r',mes_previsto:'2026-11'}],config:async()=>controle} as any
 const r=await lerDadosInsights(api,familia,'planejamento','2026-11-30T12:00:00-03:00')
 expect(montarSnapshot(familia,'real',r.dados,'2026-11-30T12:00:00-03:00').recebimentos?.[0].recebido).toBe(true)
 api.config=async()=>{throw Error('falha')}
 const falha=await lerDadosInsights(api,familia,'planejamento','2026-11-30T12:00:00-03:00')
 expect(falha.dados.recebimentos).toBeUndefined()
 expect(falha.erros).toHaveLength(1)
})
