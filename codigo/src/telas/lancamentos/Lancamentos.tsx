import { textoPrivado } from '../../componentes/privacidade'
import { useEffect, useState } from 'react'
import { Trash2, Undo2, CreditCard, ListChecks, History, Pencil } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useMembros } from '../../app/useMembros'
import { cartaoMeu, donoDo, mexeNoLancamento, rotuloDono } from '../../app/dono'
import { Din, Vazio } from '../../componentes/base'
import type { Cartao, Envelope, FamiliaMinha, Fatura, Lancamento } from '../../api/tipos'
import { centavos, dataCurta, diaSemana, hojeRecife, mesAnterior, mesLongo, reais, somaDias } from '../../lib/formato'

/** Lançamentos do mês com lixeira: apagar não some de vez, dá pra trazer de volta. */
export function Lancamentos() {
  const { api, familia, resumo, versao, recarregar, toast, tentar, abrirLancar } = useApp()
  const [falha, setFalha] = useState('')
  const [carregou, setCarregou] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [lixeira, setLixeira] = useState(false)
  const [n, setN] = useState(0)
  const nomeDe = useMembros()
  const casal = familia?.papel === 'casal'
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
    // C5: a 2ª coluna do computador só mostra totais que o app já tem (o resumo do mês e as faturas); o casal lê
    if (familia.papel === 'casal') api.faturas(familia.id, 2).then(f => { if (vivo) setFaturas(f) }).catch(() => {})
    return () => { vivo = false }
  }, [api, familia?.id, versao, n, meses.join()])
  const proximo = mesAnterior(meses[meses.length - 1])
  const maisMeses = meses.length < 24

  const nomeEnv = (id: string) => resumo?.envelopes.find(e => e.id === id)?.nome || 'Limite'
  const envDe = (id: string) => resumo?.envelopes.find(e => e.id === id)
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
      {!lixeira && api.corrigirLancamento && <p className="sub">Errou o valor ou o limite? Toque no lápis pra corrigir ou apagar. O que for apagado fica na lixeira.{familia?.papel === 'casal' ? ' O gasto do outro aparece com o nome dele: só ele corrige.' : ''}</p>}
      {lixeira && <p className="todo"><Trash2 size={20} aria-hidden="true" /><span>O que está aqui <b>não entra na conta</b>. Toque na setinha de voltar se apagou sem querer.</span></p>}
      <div className={casal ? 'tela-larga lanc-larga' : undefined}>
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
                {doDia.map(l => {
                  // E2: o casal lê o gasto do outro com o nome dele, sem lápis nem lixeira
                  const mexe = mexeNoLancamento(l, envDe(l.envelope_id), familia), dono = rotuloDono(envDe(l.envelope_id), familia)
                  return (
                  <li key={l.id} className="li" {...(dono ? { 'data-do-outro': textoPrivado((envDe(l.envelope_id) && donoDo(envDe(l.envelope_id)!)) || 'família') } : {})}>
                    <span className="tile">{textoPrivado(nomeEnv(l.envelope_id).charAt(0))}</span>
                    <span className="m"><b>{textoPrivado(l.descricao || 'Sem nome')}</b><small>{textoPrivado(dono ? (dono.endsWith(nomeEnv(l.envelope_id)) ? cap(dono) : `${nomeEnv(l.envelope_id)} ${dono}`) : nomeEnv(l.envelope_id))}{textoPrivado(resumo?.envelopes.find(e => e.id === l.envelope_id)?.casa && nomeDe(l.autor) ? ` · pago por ${nomeDe(l.autor)}` : '')}{nomeCartao(l.cartao_id) ? <> · <CreditCard size={13} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> {textoPrivado(nomeCartao(l.cartao_id))}</> : null}{l.parcela ? ` · parcela ${l.parcela.n} de ${l.parcela.de} (compra de ${dataCurta(l.parcela.compra)})` : (l.parcelas || 1) > 1 ? ` · ${l.parcelas}x de ${reais(centavos(l.valor / l.parcelas!))}` : ''}</small></span>
                    <span className="v" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Din v={l.valor} />
                      {l.parcela || !mexe ? null : lixeira
                        ? <button className="iconbtn" type="button" disabled={ocupado === l.id} onClick={() => restaurar(l)} aria-label={`Trazer de volta ${textoPrivado(l.descricao || 'gasto')} de ${reais(l.valor)}`} title="Trazer de volta"><Undo2 size={20} /></button>
                        // B14: só o lápis na linha; a lixeira fica dentro do Corrigir (sem o risco de apagar por engano)
                        : api.corrigirLancamento ? <button className="iconbtn" type="button" onClick={() => abrirLancar({ corrigir: l })} aria-label={`Corrigir ou apagar ${textoPrivado(l.descricao || 'gasto')} de ${reais(l.valor)}`} title="Corrigir"><Pencil size={19} /></button>
                        : <button className="iconbtn" type="button" disabled={ocupado === l.id} onClick={() => apagar(l)} aria-label={`Apagar ${textoPrivado(l.descricao || 'gasto')} de ${reais(l.valor)}`}><Trash2 size={20} /></button>}
                    </span>
                  </li>
                  )
                })}
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
      {casal && <TotaisDoMes envelopes={resumo?.envelopes || []} faturas={faturas} cartoes={cartoes} familia={familia} hoje={hoje} />}
      </div>
    </div>
  )
}

/**
 * C5 (decisão do dono, 14/11): no computador, ao lado da lista, os totais que já existem no app:
 * quanto cada limite já gastou no mês (o resumo do banco) e a próxima fatura de cada cartão (a soma do banco).
 * Nenhuma conta nova aqui: só mostra. No celular fica escondida (a lista ocupa a tela).
 */
function TotaisDoMes({ envelopes, faturas, cartoes, familia, hoje }: { envelopes: Envelope[]; faturas: Fatura[]; cartoes: Cartao[]; familia: FamiliaMinha | null; hoje: string }) {
  // regra do dono (E2): o casal lê tudo, com o nome do dono escrito no que é do outro adulto
  const doOutroCartao = (id: string) => { const c = cartoes.find(x => x.id === id); return c && !cartaoMeu(c, familia) ? (c.titular || 'outra pessoa') : null }
  // a 1ª fatura com valor que ainda vai vencer, de cada cartão
  const proxPorCartao: Fatura[] = []
  for (const f of faturas.filter(x => x.vencimento >= hoje && x.total > 0).sort((a, b) => a.vencimento.localeCompare(b.vencimento))) if (!proxPorCartao.some(x => x.cartao_id === f.cartao_id)) proxPorCartao.push(f)
  return (
    <aside className="col lanc-totais" aria-label="Totais do mês">
      <section className="card" aria-labelledby="ltMes">
        <div className="card-h"><h2 id="ltMes">Este mês, por limite</h2></div>
        <p className="sub">Quanto já saiu de cada limite em {mesLongo(hoje.slice(0, 7) + '-01')}, do que foi combinado.</p>
        <ul className="list">
          {envelopes.map(e => (
            <li key={e.id} className="li" {...(rotuloDono(e, familia) ? { 'data-do-outro': textoPrivado(donoDo(e) || 'família') } : {})}><span className="tile">{textoPrivado(e.nome.charAt(0))}</span><span className="m"><b>{textoPrivado(e.nome)}</b><small>{textoPrivado(rotuloDono(e, familia) ? `${cap(rotuloDono(e, familia))} · ` : '')}de <Din v={e.limite_mes} /> combinados</small></span><span className="v"><Din v={e.gasto_mes} /></span></li>
          ))}
        </ul>
      </section>
      <section className="card" aria-labelledby="ltCart">
        <div className="card-h"><h2 id="ltCart">Próxima fatura de cada cartão</h2></div>
        {!proxPorCartao.length ? <p className="sub">Nenhuma fatura com valor pela frente.</p> : (
          <ul className="list">
            {proxPorCartao.map(f => (
              <li key={f.cartao_id + f.mes} className="li" {...(doOutroCartao(f.cartao_id) ? { 'data-do-outro': textoPrivado(doOutroCartao(f.cartao_id)!) } : {})}><span className="tile"><CreditCard size={20} aria-hidden="true" /></span><span className="m"><b>{textoPrivado(f.cartao)}</b><small>{textoPrivado(doOutroCartao(f.cartao_id) ? `De ${doOutroCartao(f.cartao_id)} · ` : '')}vence {dataCurta(f.vencimento)}</small></span><span className="v"><Din v={f.total} /></span></li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
