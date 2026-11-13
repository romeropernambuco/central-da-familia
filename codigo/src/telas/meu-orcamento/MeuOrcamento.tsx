import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, PiggyBank, Trophy, Lock, Plus, ShoppingBag, CircleCheck, Target } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { CampoValor, Din, Sheet } from '../../componentes/base'
import { Qm } from '../../componentes/Qm'
import { CobrirEstouro, fraseEstouro, numeroEnvelope, tetoDoMes } from '../../componentes/EnvelopeCard'
import { RitmoMes } from '../../componentes/RitmoMes'
import { useConfig } from '../../app/useConfig'
import { donoDo, escreveNo } from '../../app/dono'
import { cofrinhoDoMes } from '../../lib/plano'
import type { Lancamento } from '../../api/tipos'
import { centavos, dataCurta, diasNoMes, diasRestantes, fimDoMes, hojeRecife, plural, reais, somaDias, textoParaValor } from '../../lib/formato'

/** Meu orçamento: hoje, semana, fim do mês, cofrinho e conquistas. Abre no limite de quem olha (R2). */
export function MeuOrcamento() {
  const { api, familia, resumo, versao, abrirLancar, toast } = useApp()
  const pessoais = (resumo?.envelopes || []).filter(e => !e.casa)
  const [envId, setEnvId] = useState<string | null>(null)
  const env = pessoais.find(e => e.id === envId) || pessoais.find(e => e.id === familia?.envelopeId) || pessoais[0]
  const [lanc, setLanc] = useState<Lancamento[]>([])
  const [semGasto, salvarSemGasto] = useConfig<string[]>('dias_sem_gasto', [])
  // FILHA ideia 1: meta no cofrinho ("Quero juntar pra: Fone R$ 150")
  const [metas, salvarMetas] = useConfig<Record<string, { nome: string; valor: number }>>('metas_pessoais', {})
  const [dpc, setDpc] = useState(false)
  const [metaAberta, setMetaAberta] = useState(false)
  useEffect(() => { if (familia) api.lancamentos(familia.id, hojeRecife().slice(0, 7)).then(setLanc).catch(() => {}) }, [api, familia?.id, versao])

  const hoje = hojeRecife()
  const mes = hoje.slice(0, 7)
  const dados = useMemo(() => {
    const meus = lanc.filter(l => !l.apagado_em && env && l.envelope_id === env.id && l.data.startsWith(mes))
    const porDia: Record<string, number> = {}
    for (const l of meus) porDia[l.data] = centavos((porDia[l.data] || 0) + l.valor)
    const base = env ? centavos((env.limite_base ?? env.limite_mes) / diasNoMes(hoje)) : 0
    const fechados: string[] = []
    for (let d = `${mes}-01`; d < hoje; d = somaDias(d, 1)) fechados.push(d)
    // dia marcado "não gastei" conta como anotado (R9)
    const anot = new Set([...Object.keys(porDia), ...(semGasto || [])])
    // R8: o cofrinho bate com o mês: dia acima do valor come a sobra dos outros dias
    return { porDia, base, fechados, anot, cof: cofrinhoDoMes(porDia, base, fechados, anot) }
  }, [lanc, env?.id, hoje, semGasto])

  if (!resumo) return <div className="card"><p className="sub">Abrindo…</p></div>
  if (!env) return <div className="card"><p className="sub">Ainda não tem limite de pessoa. Crie em Planejamento.</p></div>

  const n = numeroEnvelope(env, resumo.dias_restantes)
  // E2 (regra nova, 13/11): o casal abre o orçamento do outro pra ler, com o nome dele, sem nenhum botão de mexer
  const meu = escreveNo(env, familia), dono = donoDo(env) || 'outra pessoa'
  const gastoHoje = dados.porDia[hoje] || 0
  const ontem = somaDias(hoje, -1)
  // R9: no lugar de "N dias em branco", 1 pergunta sobre ontem
  const perguntarOntem = meu && ontem.startsWith(mes) && !dados.anot.has(ontem)
  const ult3 = [1, 2, 3].map(i => somaDias(hoje, -i)).filter(d => d.startsWith(mes))
  const branco = ult3.filter(d => !dados.anot.has(d)).length
  const dentro = dados.fechados.filter(d => dados.anot.has(d) && (dados.porDia[d] || 0) <= dados.base).length
  const ir = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const frase = fraseEstouro(env, n)
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
          {pessoais.map(e => <button key={e.id} type="button" className="pill" aria-pressed={e.id === env.id} onClick={() => setEnvId(e.id)}>{e.nome}{escreveNo(e, familia) ? '' : <small className="pill-dono">só ver</small>}</button>)}
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
          <section className="card" id="oHoje" aria-labelledby="oHojeT" style={{ scrollMarginTop: 72 }} {...(meu ? {} : { 'data-do-outro': dono })}>
            <h2 id="oHojeT">{env.nome}, hoje</h2>
            {!meu && <p className="sub dono-linha">Orçamento de {dono}: aqui é só pra ver. Quem lança e mexe é {dono}.</p>}
            <p className="lbl" style={{ marginTop: 8 }}>{n.estado === 'devendo' ? 'Este mês fica devendo' : env.regra === 'diario' ? 'Pode gastar hoje' : 'Pode gastar hoje (o livre do mês ÷ os dias que faltam)'}</p>
            <div className="numrow">{n.estado === 'devendo' ? <span className="din-warn"><Din v={n.devendo} tam="big" /></span> : <Din v={env.hoje ?? n.valor} tam="big" />}<Qm titulo={`${env.nome}: ${n.rotulo}`} linhas={n.linhas} /></div>
            {frase && <p className="todo warn frase-estouro">{frase}</p>}
            {meu && n.estado === 'devendo' && env.regra !== 'semanal' && <CobrirEstouro e={env} valor={n.devendo} />}
            <p className="sub">Já saiu hoje <b>{reais(gastoHoje)}</b> · no mês {reais(env.gasto_mes)} de {reais(tetoDoMes(env))}{env.parcelas_mes ? `, sendo ${reais(env.parcelas_mes)} de parcelas` : ''}</p>
            {n.estado !== 'devendo' && <RitmoMes e={env} quem={meu ? undefined : dono} />}
            {perguntarOntem && (
              <div className="todo ontem" style={{ marginTop: 12 }}><CalendarCheck size={20} aria-hidden="true" />
                <span><b>Ontem você não gastou nada?</b> É só pra conta ficar certa.
                  <span className="row-btns" style={{ marginTop: 8 }}>
                    <button className="btn sm line" type="button" onClick={async () => { if (await salvarSemGasto([...(semGasto || []), ontem])) toast('Anotado: ontem você não gastou.') }}>Não gastei</button>
                    <button className="btn sm line" type="button" onClick={() => abrirLancar({ envelope: env.id, quando: 'ontem' })}>Esqueci de lançar</button>
                  </span>
                </span>
              </div>
            )}
            {meu && <div className="row-btns" style={{ marginTop: 14 }}>
              <button className="btn primary" type="button" onClick={() => abrirLancar({ envelope: env.id })}><Plus size={20} />Lançar em {env.nome}</button>
              {/* FILHA ideia 2: "Dá pra comprar?" sem cartão e sem fatura */}
              <button className="btn line" type="button" onClick={() => setDpc(true)}><ShoppingBag size={20} />Dá pra comprar?</button>
            </div>}
          </section>

          <section className="card" id="oCofrinho" aria-labelledby="oCofT" style={{ scrollMarginTop: 72 }}>
            <div className="card-h"><h2 id="oCofT"><PiggyBank size={24} aria-hidden="true" />Cofrinho</h2></div>
            <div className="numrow"><Din v={env.livre < 0 ? 0 : dados.cof} tam="mid" />
              <Qm titulo="Cofrinho" linhas={[
                { linha: 'Dia de base (combinado do mês dividido pelos dias do mês)', valor: dados.base },
                { linha: `Nos ${plural(dados.fechados.filter(d => dados.anot.has(d)).length, 'dia anotado', 'dias anotados')} até ontem: o que sobrou menos o que passou`, valor: dados.cof },
              ]} nota="A mesma base do número de hoje: o que sobra do dia de base fica no cofrinho e volta dividido pelos dias que faltam. Dia que passou do valor come a sobra dos outros dias. Dia sem anotação não conta. Hoje só entra amanhã." />
            </div>
            <p className="sub">{env.livre < 0 ? 'Vazio este mês: o mês passou do combinado. Em 1º de cada mês ele começa de novo.'
              : dados.cof <= 0 ? `Ainda vazio. Ele enche nos dias em que ${meu ? 'você gasta' : `${dono} gasta`} menos que ${reais(dados.base)}, o dia de base. Livre no mês: ${reais(Math.max(0, env.livre))}.`
              // E3 (conserto 5): o cofrinho e o número do dia na mesma base: o dia de base mais o cofrinho dividido pelos dias que faltam
              : `Sobra ${meu ? 'do seu combinado' : `do combinado de ${dono}`} até ontem, em cima do dia de base de ${reais(dados.base)}. Ela já está no número de hoje: dividida pelos ${plural(diasRestantes(hoje), 'dia que falta', 'dias que faltam')}, é por isso que hoje dá ${reais(env.hoje ?? n.valor)}.`}</p>
            {(() => {
              const m = metas?.[env.id]
              if (!m) return meu ? <button className="btn sm line" type="button" style={{ marginTop: 10 }} onClick={() => setMetaAberta(true)}><Target size={18} />Quero juntar pra…</button> : null
              const tem = env.livre < 0 ? 0 : dados.cof, falta = centavos(Math.max(0, m.valor - tem))
              // no ritmo do valor de base, quando dá pra comprar: o livre do mês até o fim do mês cobre a meta?
              const quando = falta <= 0 ? 'já dá pra comprar' : env.livre >= m.valor ? `compra em ${dataCurta(fimDoMes(hoje))} se gastar até ${reais(centavos((env.livre - m.valor) / diasRestantes(hoje)))} por dia` : 'não cabe no livre deste mês'
              return (
                <div className="meta-cofre">
                  <p className="corpo"><b>Quero juntar pra: {m.nome} {reais(m.valor)}</b> · faltam {reais(falta)} · {quando}</p>
                  <div className="meter ok" aria-hidden="true"><i style={{ width: Math.min(100, (tem / m.valor) * 100) + '%' }} /></div>
                  {meu && <button className="btn sm ghost" type="button" style={{ justifySelf: 'start' }} onClick={() => salvarMetas(Object.fromEntries(Object.entries(metas || {}).filter(([k]) => k !== env.id)))}>Tirar a meta</button>}
                </div>
              )
            })()}
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
      {dpc && <DaPraComprar livre={Math.max(0, env.livre)} fechar={() => setDpc(false)} />}
      {metaAberta && <NovaMeta fechar={() => setMetaAberta(false)} salvar={async (nome, valor) => { if (await salvarMetas({ ...(metas || {}), [env.id]: { nome, valor } })) setMetaAberta(false) }} />}
    </div>
  )
}

/** "Dá pra comprar?": só o livre do mês de quem olha, sem cartão e sem fatura. Nada é gravado. */
function DaPraComprar({ livre, fechar }: { livre: number; fechar: () => void }) {
  const [txt, setTxt] = useState('')
  const v = textoParaValor(txt), depois = centavos(livre - v)
  return (
    <Sheet titulo="Dá pra comprar?" fechar={fechar}>
      <p className="sub">Simulação: nada é gravado.</p>
      <div className="campo"><span>Quanto custa?</span><CampoValor valor={txt} mudar={setTxt} rotulo="Quanto custa" /></div>
      {v > 0 && <p className={'todo ' + (depois >= 0 ? 'ok' : 'warn')}><CircleCheck size={20} aria-hidden="true" /><span>{depois >= 0 ? <><b>Cabe.</b> Seu livre do mês vai de {reais(livre)} pra {reais(depois)}.</> : <><b>Não cabe neste mês.</b> Faltam {reais(-depois)}. Dá pra juntar no cofrinho e comprar depois.</>}</span></p>}
    </Sheet>
  )
}

function NovaMeta({ fechar, salvar }: { fechar: () => void; salvar: (nome: string, valor: number) => void }) {
  const [nome, setNome] = useState(''), [v, setV] = useState('')
  return (
    <Sheet titulo="Quero juntar pra…" fechar={fechar}>
      <form style={{ display: 'grid', gap: 12 }} onSubmit={e => { e.preventDefault(); if (nome.trim() && textoParaValor(v) > 0) salvar(nome.trim(), textoParaValor(v)) }}>
        <label className="campo"><span>O que você quer comprar?</span><input className="inp" placeholder="Ex.: Fone" value={nome} onChange={e => setNome(e.target.value)} /></label>
        <div className="campo"><span>Quanto custa?</span><CampoValor valor={v} mudar={setV} rotulo="Quanto custa" /></div>
        <button className="btn primary full" type="submit">Guardar a meta</button>
      </form>
    </Sheet>
  )
}
