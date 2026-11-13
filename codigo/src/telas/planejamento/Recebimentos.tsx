// E5 (fase final): recebimentos com data, um bloco dentro do Planejamento (sem tela nova).
// Regra do dono (13/11): até dez/2028 entram recebimentos com data que o dono marca como certos; o plano conta só esses.
// Casal LÊ todos, com o nome do dono; só o dono lança e mexe. Atrasado nunca some: vai pro mês seguinte e vira pergunta ao
// dono (regra F4 do ECONOMISTA, que mora em lib/futuro: a tela só chama mesDoRecebimento e não faz conta de 2029).
import { useEffect, useState } from 'react'
import { CalendarClock, Check, Plus } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { CampoValor, Din, Sheet, Vazio } from '../../componentes/base'
import type { NovoRecebimento, RecebimentoTela, TipoRecebimento } from '../../api/tipos'
import { mesDoRecebimento } from '../../lib/futuro/f4_linha'
import { dataCurta, hojeRecife, mesCurto, reais, textoParaValor, valorDigitadoValido } from '../../lib/formato'

/** Último mês antes da virada (premissa do TIME.md: a família vive de rendimento a partir de jan/2029). */
const ULTIMO = '2028-12'
const TIPO: Record<TipoRecebimento, string> = { salario: 'salário', contrato: 'contrato', retorno: 'retorno de investimento', outro: 'outro' }
const proximo = (m: string) => { const [a, x] = m.split('-').map(Number); return x === 12 ? `${a + 1}-01` : `${a}-${String(x + 1).padStart(2, '0')}` }

/** Em que mês o recebimento conta e se o dono precisa responder (a regra F4, do motor). */
export function situacaoRecebimento(r: RecebimentoTela, hoje = hojeRecife()) {
  const x = mesDoRecebimento({ id: r.id, dono: r.dono_nome || '', valor: Math.round(r.valor * 100), mes_previsto: r.mes_previsto, mes_novo: r.mes_novo, certo: r.certo, recebido: !!r.recebido_em }, hoje.slice(0, 7), ULTIMO)
  return { conta_em: x.mes, pergunta: x.pergunta, atrasado: !r.recebido_em && r.mes_previsto < hoje.slice(0, 7) }
}

export function Recebimentos() {
  const { api, familia, versao, tentar, toast } = useApp()
  const [lista, setLista] = useState<RecebimentoTela[] | null>(null)
  const [n, setN] = useState(0)
  const [novo, setNovo] = useState(false)
  const [mudar, setMudar] = useState<RecebimentoTela | null>(null)
  useEffect(() => { if (familia && api.recebimentos) api.recebimentos(familia.id).then(setLista).catch(() => setLista([])) }, [api, familia?.id, versao, n])
  if (!api.recebimentos || familia?.papel !== 'casal') return null
  const hoje = hojeRecife()
  const mexer = (id: string, m: Parameters<NonNullable<typeof api.recebimentoMudar>>[2], aviso: string) =>
    tentar(async () => { await api.recebimentoMudar!(familia.id, id, m); setN(x => x + 1); toast(aviso) })
  const abertos = (lista || []).filter(r => !r.recebido_em)
  const chegaram = (lista || []).filter(r => r.recebido_em && r.recebido_em.slice(0, 7) >= hoje.slice(0, 7))
  return (
    <section className="card" aria-labelledby="pRec">
      <div className="card-h"><h2 id="pRec"><CalendarClock size={24} aria-hidden="true" />Recebimentos com data</h2><button className="lnk" type="button" onClick={() => setNovo(true)}><Plus size={16} />Recebimento</button></div>
      <p className="sub" style={{ marginBottom: 8 }}>Dinheiro que vai entrar até dezembro de 2028, cada um com o nome do dono. Só o que está marcado como certo entra na conta de 2029. Só o dono lança e muda.</p>
      {lista && !lista.length && <Vazio ico={<CalendarClock size={24} />} acao={<button className="btn line" type="button" onClick={() => setNovo(true)}><Plus size={20} />Anotar recebimento</button>}>Nenhum recebimento anotado. Ex.: contrato que paga em março, venda do carro.</Vazio>}
      <ul className="list">
        {abertos.map(r => {
          const s = situacaoRecebimento(r, hoje)
          return (
            <li key={r.id} className="li" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }} {...(r.meu ? {} : { 'data-do-outro': r.dono_nome || 'outra pessoa' })}>
              <span className="m"><b>{r.descricao}</b>
                <small>{r.meu ? 'seu' : `de ${r.dono_nome || 'outra pessoa'}`} · {TIPO[r.tipo]} · {r.certo ? 'certo' : 'ainda incerto: fora da conta'}</small>
                <small>{s.conta_em ? `Entra em ${mesCurto(s.conta_em)}${r.mes_novo ? ` (era ${mesCurto(r.mes_previsto)})` : ''}` : r.certo ? 'Depois de dezembro de 2028' : `Previsto pra ${mesCurto(r.mes_previsto)}`}</small>
                {/* atrasado: nunca some; o dono responde quando chega */}
                {s.atrasado && r.certo && (r.meu
                  ? <span className="todo warn" style={{ marginTop: 8 }}><span>Era pra {mesCurto(r.mes_previsto)} e ainda não chegou. Na conta, foi pra {mesCurto(s.conta_em || proximo(hoje.slice(0, 7)))}.{s.pergunta ? ' Chegou?' : ''}</span></span>
                  : <span className="sub" style={{ marginTop: 6 }}>Era pra {mesCurto(r.mes_previsto)} e ainda não chegou. Na conta, foi pra {mesCurto(s.conta_em || proximo(hoje.slice(0, 7)))}.{s.pergunta ? ` ${r.dono_nome || 'O dono'} ainda não disse quando chega.` : ''}</span>)}
                {r.meu && <span className="row-btns" style={{ marginTop: 8 }}>
                  <button className="btn sm line" type="button" onClick={() => mexer(r.id, { recebido_em: hoje, valor_recebido: r.valor }, `Anotado: ${r.descricao} chegou, ${reais(r.valor)}.`)}><Check size={16} />Chegou</button>
                  <button className="btn sm ghost" type="button" onClick={() => setMudar(r)}>Mudar o mês ou tirar</button>
                </span>}
              </span>
              <span className="v"><Din v={r.valor} /></span>
            </li>
          )
        })}
      </ul>
      {chegaram.length > 0 && <p className="sub" style={{ marginTop: 8 }}>Já chegou neste mês: {chegaram.map(r => `${r.descricao} (${r.meu ? 'seu' : r.dono_nome}, ${dataCurta(r.recebido_em!)})`).join('; ')}.</p>}
      {novo && <NovoReceb fechar={() => setNovo(false)} salvar={async r => { if (await tentar(() => api.recebimentoCriar!(familia.id, r))) { setNovo(false); setN(x => x + 1); toast(`${r.descricao} anotado pra ${mesCurto(r.mes_previsto)}.`) } }} />}
      {mudar && <MudarReceb r={mudar} fechar={() => setMudar(null)} mexer={async (m, aviso) => { if (await mexer(mudar.id, m, aviso)) setMudar(null) }} />}
    </section>
  )
}

function NovoReceb({ fechar, salvar }: { fechar: () => void; salvar: (r: NovoRecebimento) => void }) {
  const [desc, setDesc] = useState(''), [v, setV] = useState(''), [mes, setMes] = useState(proximo(hojeRecife().slice(0, 7)))
  const [tipo, setTipo] = useState<TipoRecebimento>('contrato'), [certo, setCerto] = useState(true), [erro, setErro] = useState('')
  return (
    <Sheet titulo="Novo recebimento" fechar={fechar}>
      <form style={{ display: 'grid', gap: 12 }} onSubmit={e => {
        e.preventDefault()
        if (!desc.trim()) { setErro('Diga o que é. Ex.: contrato de março, venda do carro.'); return }
        if (!valorDigitadoValido(v) || textoParaValor(v) <= 0) { setErro('Digite o valor, por exemplo 15.000.'); return }
        if (!/^\d{4}-\d{2}$/.test(mes)) { setErro('Escolha o mês em que entra.'); return }
        salvar({ descricao: desc.trim(), valor: textoParaValor(v), mes_previsto: mes, tipo, certo })
      }}>
        <label className="campo"><span>O que é</span><input className="inp" value={desc} maxLength={120} placeholder="Ex.: contrato de consultoria" onChange={e => setDesc(e.target.value)} /></label>
        <div className="campo"><span>Quanto entra</span><CampoValor valor={v} mudar={setV} rotulo="Quanto entra" /></div>
        <label className="campo"><span>Mês em que entra</span><input className="inp" type="month" value={mes} min={hojeRecife().slice(0, 7)} onChange={e => setMes(e.target.value)} /></label>
        <div className="campo"><span id="rTipo">Que tipo é</span>
          <div className="pills" role="group" aria-labelledby="rTipo">{(Object.keys(TIPO) as TipoRecebimento[]).map(t => <button key={t} type="button" className="pill" aria-pressed={tipo === t} onClick={() => setTipo(t)}>{TIPO[t].replace(/^./, c => c.toUpperCase())}</button>)}</div>
          <small>13º salário não entra aqui: ele só conta nos pagamentos da folha.</small>
        </div>
        <div className="campo"><span id="rCerto">É certo?</span>
          <div className="pills" role="group" aria-labelledby="rCerto">
            <button type="button" className="pill" aria-pressed={certo} onClick={() => setCerto(true)}>Certo: tem data e contrato</button>
            <button type="button" className="pill" aria-pressed={!certo} onClick={() => setCerto(false)}>Ainda incerto</button>
          </div>
          <small>Incerto fica anotado, mas fora da conta de 2029 até virar certo.</small>
        </div>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="btn primary full" type="submit">Anotar</button>
      </form>
    </Sheet>
  )
}

function MudarReceb({ r, fechar, mexer }: { r: RecebimentoTela; fechar: () => void; mexer: (m: { mes_novo?: string | null; certo?: boolean; apagar?: boolean }, aviso: string) => void }) {
  const hoje = hojeRecife().slice(0, 7)
  const min = [proximo(r.mes_previsto), proximo(hoje)].sort()[1]
  const [mes, setMes] = useState(r.mes_novo || min)
  const [certeza, setCerteza] = useState(false)
  return (
    <Sheet titulo={r.descricao} fechar={fechar}>
      <p className="sub">Previsto pra {mesCurto(r.mes_previsto)}, {reais(r.valor)}.</p>
      <label className="campo"><span>Vai chegar em</span><input className="inp" type="month" value={mes} min={min} onChange={e => setMes(e.target.value)} /><small>O mês novo tem que ser depois do previsto. Ele entra na conta nesse mês.</small></label>
      <button className="btn primary full" type="button" disabled={!/^\d{4}-\d{2}$/.test(mes) || mes <= r.mes_previsto} onClick={() => mexer({ mes_novo: mes }, `${r.descricao}: agora entra em ${mesCurto(mes)}.`)}>Mudar pra {/^\d{4}-\d{2}$/.test(mes) ? mesCurto(mes) : 'o mês novo'}</button>
      <button className="btn line full" type="button" onClick={() => mexer({ certo: !r.certo }, r.certo ? `${r.descricao} saiu da conta de 2029 (ficou incerto).` : `${r.descricao} entrou na conta de 2029 (ficou certo).`)}>{r.certo ? 'Marcar como incerto' : 'Marcar como certo'}</button>
      <button className="btn ghost full" type="button" onClick={() => { if (!certeza) { setCerteza(true); return } mexer({ apagar: true }, `${r.descricao} saiu da lista. Nada é apagado de vez.`) }}>{certeza ? 'Toque de novo pra tirar' : 'Não vai mais entrar: tirar da lista'}</button>
    </Sheet>
  )
}
