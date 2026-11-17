import { useEffect, useId, useRef, useState } from 'react'
import { useApp } from '../../app/contexto'
import { useLeituraRemota } from '../../app/useLeituraRemota'
import { CampoValor, Sheet } from '../../componentes/base'
import { CampoPrivado } from '../../componentes/privacidade'
import { dataConferencia, hojeRecife, textoParaValor, valorDigitadoValido, valorParaTexto } from '../../lib/formato'
import { lerSaldo } from '../../lib/resumo/leituras'
import { novoUuid } from '../../lib/seguro'
import './saldo.css'
export function InformarSaldo({ fechar }: { fechar: () => void }) {
  const { api, familia, oculto } = useApp()
  const [nome, setNome] = useState(''), [v, setV] = useState(''), [data, setData] = useState(hojeRecife())
  const [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false)
  const [id, setId] = useState(novoUuid)
  const campoId = useId(), nomeRef = useRef<HTMLInputElement>(null)
  useEffect(() => { nomeRef.current?.focus() }, [])
  const contas = useLeituraRemota('saldo-formulario', familia?.papel === 'casal' && api.saldosConta ? () => api.saldosConta!(familia.id) : null, [api], 'saldos')
  if (familia?.papel !== 'casal' || !api.salvarSaldoConta) return null
  return <Sheet titulo="Informar saldo" fechar={fechar}><form className="saldo-form" onSubmit={async e => {
    e.preventDefault()
    if (ocupado) return
    if (!nome.trim() || !valorDigitadoValido(v) || !data || data > hojeRecife()) { setErro('Confira a conta, o valor e a data.'); return }
    setOcupado(true); setErro('')
    try { await api.salvarSaldoConta!(familia.id, { id, nome: nome.trim(), valor: textoParaValor(v), conferidoEm: data }); fechar() }
    catch { setErro('Não foi possível salvar o saldo. Tente de novo.'); setOcupado(false) }
  }}>
    <p>Informe o saldo da conta corrente e a data em que conferiu no banco.</p>
    {!!contas.dado?.length && <label className="campo">Conta cadastrada<select className="inp" value={contas.dado.some(c => c.id === id) ? id : ''} onChange={e => {
      const c = contas.dado?.find(c => c.id === e.target.value)
      setId(c?.id || novoUuid()); setNome(c?.nome || ''); setV(c ? valorParaTexto(c.valor) : ''); setData(hojeRecife())
    }}><option value="">Nova conta</option>{contas.dado.map(c => <option key={c.id} value={c.id}>{oculto ? '••••' : c.nome}</option>)}</select></label>}
    <label className="campo"><span>Conta</span><CampoPrivado ref={nomeRef} className="inp" placeholder="Conta corrente" required value={nome} onChange={e => setNome(e.target.value)} /></label>
    <div className="campo"><label htmlFor={campoId}>Saldo em conta</label><CampoValor id={campoId} rotulo="Saldo em conta" valor={v} mudar={setV} /></div>
    <label className="campo">Data da conferência<CampoPrivado className="inp" type="date" required max={hojeRecife()} value={data} onChange={e => setData(e.target.value)} /></label>
    {erro && <p role="alert">{erro}</p>}<button className="btn primary" type="submit" disabled={ocupado || oculto}>{ocupado ? 'Salvando...' : 'Salvar saldo'}</button>
  </form></Sheet>
}
export function SaldoConta() {
  const { api, familia, versao, oculto } = useApp()
  const [informar, setInformar] = useState(false)
  const r = useLeituraRemota('saldo-contas', familia?.papel === 'casal' && api.saldosConta ? () => lerSaldo(api, familia.id) : null, [api, versao], 'saldos')
  if (familia?.papel !== 'casal') return null
  return <section className="card" data-secao="saldo"><h2>Saldo em conta</h2>
    {!api.saldosConta ? <p>Ainda sem dado</p> : r.carregando ? <p>Conferindo...</p> : r.erro ? <p role="alert">Não foi possível conferir <button onClick={r.repetir}>Tentar de novo</button></p> : r.dado?.contas.length ? <><strong>{oculto ? '••••' : r.dado.saldo.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><p>{r.dado.saldo.conferidoEm ? <>Conferido em {oculto ? '••••' : dataConferencia(r.dado.saldo.conferidoEm)}</> : 'Sem conferência registrada'}</p></> : <p>Ainda sem dado</p>}
    {api.salvarSaldoConta && <button className="btn line" onClick={() => setInformar(true)}>Informar saldo</button>}{informar && <InformarSaldo fechar={() => setInformar(false)} />}
  </section>
}
