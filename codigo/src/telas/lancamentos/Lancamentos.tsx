import { useEffect, useState } from 'react'
import { Trash2, Undo2, CreditCard, ListChecks, History } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { Din, Vazio } from '../../componentes/base'
import type { Cartao, Lancamento } from '../../api/tipos'
import { centavos, dataCurta, diaSemana, hojeRecife, mesAnterior, mesLongo, reais, somaDias } from '../../lib/formato'

/** Lançamentos do mês com lixeira: apagar não some de vez, dá pra trazer de volta. */
export function Lancamentos() {
  const { api, familia, resumo, versao, recarregar, toast, tentar, abrirLancar } = useApp()
  const [falha, setFalha] = useState('')
  const [carregou, setCarregou] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [lixeira, setLixeira] = useState(false)
  const [n, setN] = useState(0)
  const hoje = hojeRecife()
  // recorte por mês: abre só o mês de hoje; "Ver meses anteriores" traz 1 mês de cada vez
  const [meses, setMeses] = useState<string[]>([hoje.slice(0, 7)])
  const [porMes, setPorMes] = useState<Record<string, Lancamento[]>>({})
  const [buscandoMes, setBuscandoMes] = useState(false)
  const lista = meses.flatMap(m => porMes[m] || [])
  useEffect(() => {
    if (!familia) return
    let vivo = true
    Promise.all(meses.map(m => api.lancamentos(familia.id, m).then(l => [m, l] as const)))
      .then(rs => { if (vivo) { setPorMes(Object.fromEntries(rs)); setFalha(''); setCarregou(true) } })
      .catch(e => { if (vivo) setFalha((e as Error).message) })
      .finally(() => { if (vivo) setBuscandoMes(false) })
    api.cartoes(familia.id).then(c => { if (vivo) setCartoes(c) }).catch(() => {})
    return () => { vivo = false }
  }, [api, familia?.id, versao, n, meses.join()])
  const proximo = mesAnterior(meses[meses.length - 1])
  const maisMeses = meses.length < 24

  const nomeEnv = (id: string) => resumo?.envelopes.find(e => e.id === id)?.nome || 'Limite'
  const nomeCartao = (id: string | null) => (id ? cartoes.find(c => c.id === id)?.nome : null)
  const vis = lista.filter(l => (lixeira ? !!l.apagado_em : !l.apagado_em))
  const rot = (d: string) => (d === hoje ? 'Hoje' : d === somaDias(hoje, -1) ? 'Ontem' : `${diaSemana(d).replace(/^./, c => c.toUpperCase())}, ${dataCurta(d)}`)
  const dias = [...new Set(vis.map(l => l.data))]
  const naLixeira = lista.filter(l => l.apagado_em).length

  // 1 toque por vez em cada linha; se o banco recusar ou a internet cair, aparece o motivo (antes falhava calado)
  async function apagar(l: Lancamento) {
    if (ocupado) return
    setOcupado(l.id)
    const ok = await tentar(() => api.apagarLancamento(l.id))
    setOcupado(null)
    if (!ok) return
    setN(x => x + 1); await recarregar()
    toast(`${reais(l.valor)} foi pra lixeira.`, async () => { await api.restaurarLancamento(l.id); setN(x => x + 1); await recarregar() })
  }
  async function restaurar(l: Lancamento) {
    if (ocupado) return
    setOcupado(l.id)
    const ok = await tentar(() => api.restaurarLancamento(l.id))
    setOcupado(null)
    if (!ok) return
    setN(x => x + 1); await recarregar()
    toast(`${reais(l.valor)} voltou pra conta.`)
  }

  return (
    <div className="view">
      <div className="segbar">
        <div className="seg" role="group" aria-label="Mostrar">
          <button type="button" aria-pressed={!lixeira} onClick={() => setLixeira(false)}>Lançamentos</button>
          <button type="button" aria-pressed={lixeira} onClick={() => setLixeira(true)}><Trash2 size={18} />Lixeira{naLixeira ? ` (${naLixeira})` : ''}</button>
        </div>
      </div>
      {lixeira && <p className="todo"><Trash2 size={20} aria-hidden="true" /><span>O que está aqui <b>não entra na conta</b>. Toque na setinha de voltar se apagou sem querer.</span></p>}
      <section className="card">
        {falha && <p className="aviso-erro" role="alert">Não deu pra buscar os lançamentos: {falha} Eles continuam guardados no banco.</p>}
        {!falha && !carregou && <p className="sub">Buscando os lançamentos…</p>}
        {!falha && carregou && !vis.length && (lixeira
          ? <Vazio ico={<Trash2 size={24} />}>A lixeira está vazia{meses.length > 1 ? ' nos meses abertos' : ' neste mês'}.</Vazio>
          : <Vazio ico={<ListChecks size={24} />} acao={<button className="btn primary" type="button" onClick={() => abrirLancar()}>Lançar um gasto</button>}>Nenhum lançamento {meses.length > 1 ? 'nos meses abertos' : `em ${mesLongo(meses[0] + '-01')}`}.</Vazio>)}
        {dias.map(d => {
          const doDia = vis.filter(l => l.data === d)
          return (
            <div key={d}>
              <h3 className="dayh">{rot(d)} · {reais(centavos(doDia.reduce((s, l) => s + l.valor, 0)))}</h3>
              <ul className="list">
                {doDia.map(l => (
                  <li key={l.id} className="li">
                    <span className="tile">{nomeEnv(l.envelope_id).charAt(0)}</span>
                    <span className="m"><b>{l.descricao || 'Gasto'}</b><small>{nomeEnv(l.envelope_id)}{nomeCartao(l.cartao_id) ? <> · <CreditCard size={13} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> {nomeCartao(l.cartao_id)}</> : null}</small></span>
                    <span className="v" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Din v={l.valor} />
                      {lixeira
                        ? <button className="iconbtn" type="button" disabled={ocupado === l.id} onClick={() => restaurar(l)} aria-label={`Trazer de volta ${l.descricao || 'gasto'} de ${reais(l.valor)}`} title="Trazer de volta"><Undo2 size={20} /></button>
                        : <button className="iconbtn" type="button" disabled={ocupado === l.id} onClick={() => apagar(l)} aria-label={`Apagar ${l.descricao || 'gasto'} de ${reais(l.valor)}`}><Trash2 size={20} /></button>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {carregou && maisMeses && (
          <div className="mais-meses">
            <p className="sub">Aparecendo: {meses.length === 1 ? mesLongo(meses[0] + '-01') : `de ${mesLongo(meses[meses.length - 1] + '-01')} a ${mesLongo(meses[0] + '-01')}`}.</p>
            <button className="btn line" type="button" disabled={buscandoMes} onClick={() => { setBuscandoMes(true); setMeses([...meses, proximo]) }}><History size={20} />{buscandoMes ? 'Buscando…' : `Ver meses anteriores (${mesLongo(proximo + '-01')})`}</button>
          </div>
        )}
      </section>
    </div>
  )
}
