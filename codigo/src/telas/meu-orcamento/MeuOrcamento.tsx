import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, PiggyBank, Trophy, Lock, Plus } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { Din } from '../../componentes/base'
import { Qm } from '../../componentes/Qm'
import { numeroEnvelope } from '../../componentes/EnvelopeCard'
import type { Lancamento } from '../../api/tipos'
import { centavos, cofrinho, diasNoMes, hojeRecife, reais, somaDias } from '../../lib/formato'

/** Meu orçamento: valor do dia, cofrinho e conquistas, valendo pra qualquer pessoa da família. */
export function MeuOrcamento() {
  const { api, familia, resumo, versao, abrirLancar } = useApp()
  const pessoais = (resumo?.envelopes || []).filter(e => !e.casa)
  const [envId, setEnvId] = useState<string | null>(null)
  const env = pessoais.find(e => e.id === envId) || pessoais.find(e => e.id === familia?.envelopeId) || pessoais[0]
  const [lanc, setLanc] = useState<Lancamento[]>([])
  useEffect(() => { if (familia) api.lancamentos(familia.id, hojeRecife().slice(0, 7)).then(setLanc).catch(() => {}) }, [api, familia?.id, versao])

  const hoje = hojeRecife()
  const mes = hoje.slice(0, 7)
  const dados = useMemo(() => {
    const meus = lanc.filter(l => !l.apagado_em && env && l.envelope_id === env.id && l.data.startsWith(mes))
    const porDia: Record<string, number> = {}
    for (const l of meus) porDia[l.data] = centavos((porDia[l.data] || 0) + l.valor)
    const base = env ? Math.floor(env.limite_mes / diasNoMes(hoje)) : 0
    const fechados: string[] = []
    for (let d = `${mes}-01`; d < hoje; d = somaDias(d, 1)) fechados.push(d)
    const anot = new Set(Object.keys(porDia))
    return { porDia, base, fechados, anot, cof: cofrinho(porDia, base, fechados) }
  }, [lanc, env?.id, hoje])

  if (!resumo) return <div className="card"><p className="sub">Abrindo…</p></div>
  if (!env) return <div className="card"><p className="sub">Ainda não tem limite de pessoa. Crie em Planejamento.</p></div>

  const n = numeroEnvelope(env, resumo.dias_restantes)
  const gastoHoje = dados.porDia[hoje] || 0
  const ult3 = [1, 2, 3].map(i => somaDias(hoje, -i)).filter(d => d.startsWith(mes))
  const branco = ult3.filter(d => !dados.anot.has(d)).length
  const dentro = dados.fechados.filter(d => dados.anot.has(d) && (dados.porDia[d] || 0) <= dados.base).length
  const ir = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const conquistas = [
    { nome: '1º gasto anotado', ok: dados.anot.size > 0 },
    { nome: '7 dias dentro do valor do dia', ok: dentro >= 7 },
    { nome: 'Cofrinho passou de R$ 100', ok: dados.cof >= 100 },
    { nome: '3 dias seguidos anotados', ok: ult3.length === 3 && branco === 0 },
  ]

  return (
    <div className="view">
      {pessoais.length > 1 && (
        <div className="pills" role="group" aria-label="De quem é o orçamento">
          {pessoais.map(e => <button key={e.id} type="button" className="pill" aria-pressed={e.id === env.id} onClick={() => setEnvId(e.id)}>{e.nome}</button>)}
        </div>
      )}
      <nav className="segbar" aria-label="Ir para">
        <div className="seg">
          <button type="button" onClick={() => ir('oHoje')}>Hoje</button>
          <button type="button" onClick={() => ir('oCofrinho')}>Cofrinho</button>
          <button type="button" onClick={() => ir('oMais')}>Conquistas</button>
        </div>
      </nav>

      <div className="tela-larga">
        <div className="col">
          <section className="card" id="oHoje" aria-labelledby="oHojeT" style={{ scrollMarginTop: 72 }}>
            <h2 id="oHojeT">{env.nome}, hoje</h2>
            <p className="lbl" style={{ marginTop: 8 }}>{n.valor >= 0 ? (env.regra === 'diario' ? 'Pode gastar hoje' : 'Ainda livre') : 'Passou do combinado'}</p>
            <div className="numrow"><Din v={Math.abs(n.valor)} tam="big" /><Qm titulo={`${env.nome}: ${n.rotulo}`} linhas={n.linhas} /></div>
            <p className="sub">Já saiu hoje <b>{reais(gastoHoje)}</b> · no mês {reais(env.gasto_mes)} de {reais(env.limite_mes)}</p>
            {branco >= 2 && <p className="todo" style={{ marginTop: 12 }}><CalendarCheck size={20} aria-hidden="true" /><span><b>Bem-vindo de volta: {branco} dias em branco.</b> Sem culpa. Lembrou de algum gasto? No Lançar, escolha "Ontem".</span></p>}
            <button className="btn primary" type="button" style={{ marginTop: 14 }} onClick={() => abrirLancar({ envelope: env.id })}><Plus size={20} />Lançar em {env.nome}</button>
          </section>

          <section className="card" id="oCofrinho" aria-labelledby="oCofT" style={{ scrollMarginTop: 72 }}>
            <div className="card-h"><h2 id="oCofT"><PiggyBank size={24} aria-hidden="true" />Cofrinho</h2></div>
            <div className="numrow"><Din v={dados.cof} tam="big" />
              <Qm titulo="Cofrinho" linhas={[
                { linha: 'Valor do dia de base (combinado do mês dividido pelos dias do mês)', valor: dados.base },
                { linha: `Somado o que sobrou nos ${dados.anot.size - (dados.anot.has(hoje) ? 1 : 0)} dias já fechados com anotação`, valor: dados.cof },
              ]} nota="Dia sem anotação não conta, nem pra mais nem pra menos. Hoje só entra amanhã." />
            </div>
            <p className="sub">É o que você deixou de gastar nos dias que ficaram dentro do valor do dia. Pode virar uma meta em Planejamento.</p>
          </section>
        </div>

        <div className="col">
          <section className="card" id="oMais" aria-labelledby="oMaisT" style={{ scrollMarginTop: 72 }}>
            <div className="card-h"><h2 id="oMaisT"><Trophy size={24} aria-hidden="true" />Conquistas</h2></div>
            <ul className="list">
              {conquistas.map(c => (
                <li key={c.nome} className="li">
                  <span className="tile" style={c.ok ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : {}}>{c.ok ? <Trophy size={20} /> : <Lock size={18} />}</span>
                  <span className="m"><b>{c.nome}</b><small>{c.ok ? 'Conseguiu' : 'Ainda não'}</small></span><span />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
