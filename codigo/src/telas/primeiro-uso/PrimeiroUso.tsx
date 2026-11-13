import { useState } from 'react'
import { ArrowRight, MessageCircle, Check, Clock } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { ir } from '../../app/App'
import { Marca } from '../../componentes/Marca'
import { Din } from '../../componentes/base'
import type { Envelope } from '../../api/tipos'
import { emailValido, linkWhatsApp, mensagemConvite, textoParaValor, valorDigitadoValido, valorParaTexto } from '../../lib/formato'

const linkApp = () => location.origin + location.pathname

/** Primeiro uso em 5 minutos: família, limites, 2ª pessoa e família amiga. */
export function PrimeiroUso() {
  const { api, sessao, trocarSessao, recarregar, toast, sair } = useApp()
  const [passo, setPasso] = useState(1)
  // R4: antes de criar uma família nova, pergunta se alguém da casa já convidou (evita família paralela)
  const [jaPerguntou, setJaPerguntou] = useState(false)
  const [nomeFam, setNomeFam] = useState('')
  const [nome, setNome] = useState('')
  const [fid, setFid] = useState<string | null>(null)
  const [envs, setEnvs] = useState<Envelope[]>([])
  const [lim, setLim] = useState<Record<string, string>>({})
  const [colchao, setColchao] = useState('1000')
  const [segunda, setSegunda] = useState('')
  const [email2, setEmail2] = useState('')
  const [convidado, setConvidado] = useState(false)
  const [hoje, setHoje] = useState(0)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function faz(f: () => Promise<void>) {
    setErro(''); setOcupado(true)
    try { await f() } catch (e) { setErro((e as Error).message) } finally { setOcupado(false) }
  }

  const passo1 = () => faz(async () => {
    if (nomeFam.trim().length < 2 || nome.trim().length < 2) throw new Error('Escreva o nome da família e o seu nome.')
    const id = await api.criarFamilia(nomeFam.trim(), nome.trim())
    setFid(id)
    const r = await api.resumoHoje(id)
    setEnvs(r.envelopes)
    setLim(Object.fromEntries(r.envelopes.map(e => [e.id, (e.limite_base ?? e.limite_mes) ? valorParaTexto(e.limite_base ?? e.limite_mes) : ''])))
    setPasso(2)
  })
  const passo2 = () => faz(async () => {
    if (!fid) return
    const ruim = envs.find(e => (lim[e.id] || '') !== '' && !valorDigitadoValido(lim[e.id]))
    if (ruim || !valorDigitadoValido(colchao || '0')) throw new Error(`Confira o valor de ${ruim ? ruim.nome : 'Reserva'}: use só números e 1 vírgula, tipo 1500,00.`)
    for (const e of envs) await api.definirLimite(fid, e.id, textoParaValor(lim[e.id] || '0'))
    const casa = envs.find(e => e.casa && e.regra === 'mensal') || envs[envs.length - 1]
    if (casa) await api.salvarEnvelope(fid, casa.id, { colchao: textoParaValor(colchao) })
    const r = await api.resumoHoje(fid)
    setHoje(r.pode_gastar_hoje)
    setPasso(3)
  })
  const fim = async () => { await trocarSessao(); await recarregar(); ir('inicio'); setTimeout(() => toast('Pronto! Esse é o número de hoje.'), 80) }

  const msgPessoa = mensagemConvite('pessoa', { familia: nomeFam, quem: segunda, link: linkApp(), email: email2 })
  const msgAmiga = mensagemConvite('amiga', { familia: nomeFam, quem: '', link: linkApp() })

  return (
    <div className="entrar">
      <div className="logo"><Marca size={48} /><b>Central da Família</b></div>
      <div className="passos" aria-label={`Passo ${passo} de 4`}>{[1, 2, 3, 4].map(i => <i key={i} className={i <= passo ? 'on' : ''} />)}</div>
      <p className="sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={16} aria-hidden="true" />Passo {passo} de 4. Leva uns 5 minutos no total.</p>

      {passo === 1 && !jaPerguntou && (
        <div className="card" style={{ display: 'grid', gap: 14 }}>
          <h2>Alguém da sua casa já te convidou?</h2>
          <p className="sub">Se quem mora com você já usa a Central, essa pessoa te mandou um convite no e-mail{sessao?.email ? '' : ''}. {sessao?.email ? <>Você entrou com <b>{sessao.email}</b>.</> : null} O convite só funciona com o mesmo e-mail que ela usou.</p>
          <button className="btn primary full" type="button" onClick={async () => { await sair() }}>Sim: entrar com o e-mail do convite</button>
          <button className="btn line full" type="button" onClick={() => setJaPerguntou(true)}>Não: vou criar a família<ArrowRight size={20} /></button>
          <p className="sub">Não sabe qual e-mail? Pergunte pra quem convidou ou peça pra reenviar o convite em Família e ajustes.</p>
        </div>
      )}

      {passo === 1 && jaPerguntou && (
        <form className="card" style={{ display: 'grid', gap: 14 }} onSubmit={e => { e.preventDefault(); passo1() }}>
          <h2>Quem é a família?</h2>
          <label className="campo"><span>Nome da família</span><input className="inp" placeholder="Ex.: Família Oliveira" value={nomeFam} onChange={e => setNomeFam(e.target.value)} /><small>Aparece no topo do app e no convite.</small></label>
          <label className="campo"><span>Seu nome</span><input className="inp" placeholder="Ex.: Helena" value={nome} onChange={e => setNome(e.target.value)} /><small>{sessao?.email ? `Você entrou com ${sessao.email}.` : 'Você entra como quem cuida da família.'}</small></label>
          {erro && <p className="erro" role="alert">{erro}</p>}
          <button className="btn primary full" disabled={ocupado} type="submit">Criar a família<ArrowRight size={20} /></button>
        </form>
      )}

      {passo === 2 && (
        <form className="card" style={{ display: 'grid', gap: 14 }} onSubmit={e => { e.preventDefault(); passo2() }}>
          <h2>Quanto cada um pode gastar no mês?</h2>
          <p className="sub">Cada caixinha é um limite: o app desconta dela cada gasto. Pode mudar depois em Planejamento.</p>
          {envs.map(e => (
            <label className="campo" key={e.id}><span>{e.nome}</span>
              <input className="inp" inputMode="decimal" placeholder="R$ por mês" value={lim[e.id] || ''} onChange={x => setLim({ ...lim, [e.id]: x.target.value.replace(/[^\d,]/g, '') })} />
              <small>{e.regra === 'diario' ? 'Vira um valor por dia.' : e.regra === 'semanal' ? 'Vira um teto por semana.' : 'Vale pro mês inteiro.'}</small>
            </label>
          ))}
          <label className="campo"><span>Reserva</span>
            <input className="inp" inputMode="decimal" value={colchao} onChange={e => setColchao(e.target.value.replace(/[^\d,]/g, ''))} />
            <small>Dinheiro que nunca entra no "pode gastar". A conta da casa nunca desce dele.</small>
          </label>
          {erro && <p className="erro" role="alert">{erro}</p>}
          <button className="btn primary full" disabled={ocupado} type="submit">Ver o número de hoje<ArrowRight size={20} /></button>
        </form>
      )}

      {passo === 3 && (
        <div className="card" style={{ display: 'grid', gap: 14 }}>
          <p className="lbl">Hoje você pode gastar</p>
          <Din v={hoje} tam="big" />
          {/* AUTONOMA ideia 4: quem cuida sozinha da casa segue sem achar que falta alguém */}
          <button className="btn primary full" type="button" onClick={() => setPasso(4)}>Aqui é só eu (com meus filhos)<ArrowRight size={20} /></button>
          <h2>Mais alguém divide as contas com você?</h2>
          <p className="sub">Se sim, chame essa pessoa: quando os 2 lançam, o número fica certo. A mensagem já vai pronta pro WhatsApp.</p>
          <label className="campo"><span>Nome dela ou dele</span><input className="inp" placeholder="Ex.: Caio" value={segunda} onChange={e => setSegunda(e.target.value)} /></label>
          <label className="campo"><span>E-mail dela ou dele</span><input className="inp" type="email" inputMode="email" placeholder="bruno@email.com" value={email2} onChange={e => { setEmail2(e.target.value); setConvidado(false) }} /><small>É com esse e-mail que a pessoa entra. O convite fica guardado nele.</small></label>
          {convidado
            ? <a className="btn primary full" href={linkWhatsApp(msgPessoa)} target="_blank" rel="noreferrer"><MessageCircle size={20} />Abrir o WhatsApp com o convite</a>
            : <button className="btn primary full" type="button" disabled={ocupado} onClick={() => faz(async () => {
              if (!segunda.trim() || !emailValido(email2)) throw new Error('Escreva o nome e o e-mail de quem divide as contas com você.')
              if (!fid) return
              // grava o convite antes de abrir o WhatsApp: se o banco recusar, o motivo aparece aqui
              await api.convidar(fid, 'casal', segunda.trim(), email2)
              setConvidado(true)
            })}><MessageCircle size={20} />Convidar</button>}
          {convidado && <p className="sub">Convite guardado no e-mail {email2.trim()}. A mensagem não leva nenhum valor em dinheiro.</p>}
          {erro && <p className="erro" role="alert">{erro}</p>}
          <button className="btn ghost full" type="button" onClick={() => setPasso(4)}>Convido depois<ArrowRight size={20} /></button>
        </div>
      )}

      {passo === 4 && (
        <div className="card" style={{ display: 'grid', gap: 14 }}>
          <p className="todo ok"><Check size={20} aria-hidden="true" /><span><b>Tudo pronto.</b> Agora é só tocar no botão verde e anotar cada gasto: valor e 1 toque.</span></p>
          <h2>Chame uma família amiga</h2>
          <p className="sub">Quem testa junto troca dica. A mensagem já vai pronta.</p>
          <a className="btn line full" href={linkWhatsApp(msgAmiga)} target="_blank" rel="noreferrer"><MessageCircle size={20} />Mandar pra uma família amiga</a>
          <button className="btn primary full" type="button" onClick={fim}>Abrir o Início<ArrowRight size={20} /></button>
        </div>
      )}
    </div>
  )
}
