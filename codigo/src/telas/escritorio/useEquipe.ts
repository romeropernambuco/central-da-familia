import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../app/contexto'
import { useConfig } from '../../app/useConfig'
import type { Estoque, FuncionarioEsc, RecebimentoTela } from '../../api/tipos'
import { dataCurta, hojeRecife, reais } from '../../lib/formato'
import { SALAS_NOME } from './cenaBase'
import { EQUIPE, POR_ID } from './equipe'

const mesAno = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`
const n = (v: number, um: string, mais: string) => (v === 1 ? `1 ${um}` : `${v} ${mais}`)

/**
 * C2 (14/11): a equipe inteira, da lista única (equipe.ts). Quem o banco manda vem como veio; os outros entram aqui,
 * cada um com o dado que já existe no banco (recebimentos, presença, contagem do estoque). Quem ainda não tem dado
 * entra com semDado: o card diz o que ele vai fazer e "ainda sem dado", sem número nenhum.
 */
export function useEquipeCompleta(doBanco: FuncionarioEsc[] | undefined): FuncionarioEsc[] {
  const { api, familia, versao } = useApp()
  const [rec, setRec] = useState<RecebimentoTela[] | null>(null)
  const [est, setEst] = useState<Estoque | null>(null)
  const [avisos, setAvisos] = useState<{ tipo: string; data: string; nome: string }[]>([])
  const [pres] = useConfig<Record<string, string[]>>('casa_presenca', {})
  useEffect(() => {
    if (!familia) return
    let vivo = true
    if (api.recebimentos) api.recebimentos(familia.id).then(r => { if (vivo) setRec(r) }).catch(() => { if (vivo) setRec(null) })
    api.estoque(familia.id).then(r => { if (vivo) setEst(r) }).catch(() => { if (vivo) setEst(null) })
    api.avisosCasa(familia.id).then(r => { if (vivo) setAvisos(r) }).catch(() => {})
    return () => { vivo = false }
  }, [api, familia?.id, versao])

  return useMemo(() => completarEquipe(doBanco, { rec, est, avisos, pres }, hojeRecife()), [doBanco, rec, est, avisos, pres])
}

/** A conta da lista (sem React, pra dar pra testar): os do banco + os que faltam da lista única, na ordem dela. */
export function completarEquipe(doBanco: FuncionarioEsc[] | undefined, d: { rec: RecebimentoTela[] | null; est: Estoque | null; avisos: { tipo: string; data: string; nome: string }[]; pres: Record<string, string[]> }, hoje: string): FuncionarioEsc[] {
    if (!doBanco) return []
    const { rec, est, avisos, pres } = d
    const frase: Record<string, string | null> = {
      // Tesoureiro: o que tem data pra entrar e ainda não entrou (produto.recebimentos)
      tesoureiro: rec == null ? null : (() => {
        const abertos = rec.filter(r => !r.recebido_em).sort((a, b) => (a.mes_novo || a.mes_previsto).localeCompare(b.mes_novo || b.mes_previsto))
        if (!abertos.length) return 'Nenhum dinheiro com data pra entrar. Cadastre no Planejamento e eu acompanho.'
        const p = abertos[0], m = p.mes_novo || p.mes_previsto
        return `${n(abertos.length, 'recebimento', 'recebimentos')} com data pra entrar. O próximo: ${p.descricao}, ${reais(p.valor)} em ${mesAno(m)}${p.mes_novo ? ' (mudou de mês)' : ''}${p.certo ? '' : ', ainda sem contrato'}.`
      })(),
      // Presença: quem marcou "Cheguei" hoje na tela Casa
      presenca: (() => {
        const veio = [...new Set([...(pres[hoje] || []), ...avisos.filter(a => a.tipo === 'casa_presenca' && a.data === hoje).map(a => a.nome)])]
        return veio.length ? `Hoje ${veio.length === 1 ? 'marcou presença' : 'marcaram presença'}: ${veio.join(', ')}.` : 'Ninguém da equipe da casa marcou presença hoje ainda.'
      })(),
      // Auditor: a última contagem do estoque
      auditor: est == null ? null : (() => {
        const c = [...est.contagens].sort((a, b) => b.data.localeCompare(a.data))[0]
        if (!c) return 'Nenhuma contagem do estoque ainda. Quando a equipe contar, eu confiro.'
        const acabou = c.itens.filter(i => i.estado === 'acabou').length, pouco = c.itens.filter(i => i.estado === 'pouco').length
        return `Última contagem do estoque: ${dataCurta(c.data)}. ${acabou === 0 ? 'Nada acabou' : `${n(acabou, 'item acabou', 'itens acabaram')}`}${pouco ? `, ${n(pouco, 'com pouco', 'com pouco')}` : ''}.`
      })(),
    }
    const tem = new Set(doBanco.map(f => f.id))
    const extras: FuncionarioEsc[] = EQUIPE.filter(m => !tem.has(m.id)).map(m => {
      const f = frase[m.id] ?? null
      return f
        ? { id: m.id, nome: m.nome, sala: SALAS_NOME[m.sala], estado: 'entregue', frase: f, faz: m.faz }
        : { id: m.id, nome: m.nome, sala: SALAS_NOME[m.sala], estado: 'vai_comecar', frase: `Ainda sem dado. ${m.papel}`, faz: m.faz, semDado: true }
    })
    // a ordem da lista única (quem não está nela vai pro fim, na ordem do banco)
    const ordem = (id: string) => { const i = EQUIPE.findIndex(m => m.id === id); return i < 0 ? 99 : i }
    return [...doBanco, ...extras].map((f, i) => ({ f, i })).sort((a, b) => ordem(a.f.id) - ordem(b.f.id) || a.i - b.i).map(x => x.f)
}

export const papelDe = (id: string) => POR_ID[id]?.papel
