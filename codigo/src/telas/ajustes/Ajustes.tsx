import { useEffect, useState } from 'react'
import type { ConviteFamilia } from '../../api/tipos'
import { MessageCircle, Sun, Moon, Smartphone, LogOut, ShieldCheck, Gauge, ChevronRight, UserPlus, Share } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { Sheet } from '../../componentes/base'
import { dataCurta, emailValido, linkWhatsApp, mensagemConvite, somaDias } from '../../lib/formato'

/** Família e ajustes: convites, aparência, privacidade, painel e sair. */
export function Ajustes() {
  const { api, familia, sessao, sair, toast, tentar } = useApp()
  // o convite é gravado ANTES de abrir o WhatsApp: se o banco recusar (e-mail repetido, sem internet), o motivo aparece na hora
  const [convidado, setConvidado] = useState<{ nome: string; email: string } | null>(null)
  const [convidando, setConvidando] = useState(false)
  const [tema, setTema] = useState<string>(() => { try { return localStorage.getItem('tema') || 'auto' } catch { return 'auto' } })
  const [nome2, setNome2] = useState('')
  const [email2, setEmail2] = useState('')
  const [n, setN] = useState(0)
  const link = location.origin + location.pathname
  const casal = familia?.papel === 'casal'
  // C20: com o casal completo, o convite é pra alguém da família (papel pessoa), e o título muda
  const [lista, setLista] = useState<ConviteFamilia[] | null>(null)
  useEffect(() => { if (familia && casal && api.convites) api.convites(familia.id).then(setLista).catch(() => setLista([])) }, [api, familia?.id, n, casal])
  const casalCompleto = (lista || []).filter(c => c.papel === 'casal' && c.situacao !== 'cancelado').length >= 2
  const papelConvite = casalCompleto ? 'pessoa' : 'casal'
  const mudaTema = (t: string) => {
    setTema(t)
    try { localStorage.setItem('tema', t) } catch { /* sem armazenamento */ }
    if (t === 'auto') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = t
  }
  return (
    <div className="tela-larga">
      <div className="col">
        <section className="card" aria-labelledby="aFam">
          <h2 id="aFam">{familia?.nome}</h2>
          <p className="sub" style={{ margin: '4px 0 12px' }}>Você entrou como {familia?.membroNome}{sessao?.email ? ` (${sessao.email})` : ''}.</p>
          {/* A2: a pessoa da família (filha) não convida ninguém */}
          {!casal && <p className="sub">Quem convida e cuida da família é o casal. Aqui você muda a aparência e vê a privacidade.</p>}
          {casal && <>
          {/* E3 (conserto 10): o campo ganha o rótulo "Nome" (antes só tinha a dica dentro do campo, que some ao digitar) */}
          <p className="lbl">{casalCompleto ? 'Convidar alguém da família (filho, avó, quem mora com vocês)' : 'Convidar a 2ª pessoa do casal'}</p>
          <label className="campo" style={{ marginTop: 8 }}><span>Nome</span><input className="inp" placeholder="Ex.: Helena" value={nome2} onChange={e => setNome2(e.target.value)} /></label>
          <label className="campo" style={{ marginTop: 10 }}><span>E-mail de quem você está convidando</span><input className="inp" type="email" inputMode="email" placeholder="pessoa@email.com" value={email2} onChange={e => setEmail2(e.target.value)} /><small>{convidado && convidado.email === email2.trim().toLowerCase() ? 'Convite guardado. A mensagem não leva nenhum valor em dinheiro: só o link e o e-mail.' : 'A pessoa entra com esse e-mail, digita o código de 6 números que chega nele e já cai na família.'}</small></label>
          <div className="row-btns" style={{ marginTop: 10 }}>
            {convidado && convidado.email === email2.trim().toLowerCase()
              ? <a className="btn primary" target="_blank" rel="noreferrer" href={linkWhatsApp(mensagemConvite('pessoa', { familia: familia?.nome || '', quem: convidado.nome, link, email: convidado.email }))}><MessageCircle size={20} />Abrir o WhatsApp com o convite</a>
              : <button className="btn primary" type="button" disabled={convidando} onClick={async () => {
                if (!nome2.trim() || !emailValido(email2)) { toast('Escreva o nome e o e-mail de quem você está convidando.'); return }
                if (!familia) return
                setConvidando(true)
                const ok = await tentar(() => api.convidar(familia.id, papelConvite, nome2.trim(), email2))
                setConvidando(false)
                if (ok) { setConvidado({ nome: nome2.trim(), email: email2.trim().toLowerCase() }); setN(x => x + 1); toast('Convite guardado. Agora mande a mensagem.') }
              }}><UserPlus size={20} />Convidar</button>}
            <a className="btn line" target="_blank" rel="noreferrer" href={linkWhatsApp(mensagemConvite('amiga', { familia: '', quem: '', link }))}><MessageCircle size={20} />Chamar família amiga</a>
          </div>
          </>}
        </section>
        {api.convites && familia && casal && <QuemEsta lista={lista} mudou={() => setN(x => x + 1)} />}
        <section className="card" aria-labelledby="aInst">
          <h2 id="aInst"><Share size={22} aria-hidden="true" />Pôr na tela do iPhone</h2>
          <p className="sub" style={{ marginTop: 6 }}>No Safari, toque em Compartilhar (o quadrado com a seta) e depois em "Adicionar à Tela de Início". O ícone "Central" abre sem a barra do navegador.</p>
        </section>
      </div>
      <div className="col">
        <section className="card" aria-labelledby="aTema">
          <h2 id="aTema">Aparência</h2>
          <div className="seg compacta" role="group" aria-label="Tema" style={{ marginTop: 12 }}>
            <button type="button" aria-pressed={tema === 'auto'} onClick={() => mudaTema('auto')}><Smartphone size={18} />Automático</button>
            <button type="button" aria-pressed={tema === 'light'} onClick={() => mudaTema('light')}><Sun size={18} />Claro</button>
            <button type="button" aria-pressed={tema === 'dark'} onClick={() => mudaTema('dark')}><Moon size={18} />Escuro</button>
          </div>
          <p className="sub" style={{ marginTop: 8 }}>Automático segue o celular: escuro à noite se o celular estiver assim.</p>
        </section>
        <section className="card">
          <ul className="list">
            <li><a className="li" href="#/privacidade" style={{ color: 'inherit', textDecoration: 'none' }}><span className="tile"><ShieldCheck size={20} /></span><span className="m"><b>Privacidade</b><small>termo, baixar e apagar dados</small></span><ChevronRight size={20} className="muted" /></a></li>
            {sessao?.dono && <li><a className="li" href="#/painel" style={{ color: 'inherit', textDecoration: 'none' }}><span className="tile"><Gauge size={20} /></span><span className="m"><b>Painel dos 4 números</b><small>só pro dono do produto</small></span><ChevronRight size={20} className="muted" /></a></li>}
            {api.modo === 'exemplo' && casal && <li><a className="li" href="#/primeiro-uso" style={{ color: 'inherit', textDecoration: 'none' }}><span className="tile"><UserPlus size={20} /></span><span className="m"><b>Ver o primeiro uso</b><small>como uma família nova começa</small></span><ChevronRight size={20} className="muted" /></a></li>}
          </ul>
          <button className="btn line" type="button" style={{ marginTop: 12 }} onClick={async () => { location.hash = '#/inicio'; await sair() }}><LogOut size={20} />Sair</button>
        </section>
      </div>
    </div>
  )
}

/** R4 + C20: quem está na família e como está cada convite. Reenviar avisa; cancelar pede confirmação. */
function QuemEsta({ lista, mudou }: { lista: ConviteFamilia[] | null; mudou: () => void }) {
  const { api, familia, tentar, toast } = useApp()
  const setN = (_f: (x: number) => number) => mudou()
  const [cancelar, setCancelar] = useState<ConviteFamilia | null>(null)
  if (!lista || !familia) return null
  const link = location.origin + location.pathname
  return (
    <section className="card" aria-labelledby="aQuem">
      <h2 id="aQuem">Quem está na família</h2>
      <ul className="list" style={{ marginTop: 8 }}>
        {lista.map(c => (
          <li key={c.id} className="li quem">
            <span className="tile">{c.nome.charAt(0)}</span>
            <span className="m"><b>{c.nome}{c.nome === familia.membroNome ? ' (você)' : ''}</b><small>{c.email || 'sem e-mail'} · {c.papel === 'casal' ? 'casal' : 'pessoa da família'}</small>
              {c.situacao === 'entrou'
                ? <span className="chip ok" style={{ marginTop: 6 }}>entrou{c.entrou_em ? ` em ${dataCurta(c.entrou_em)}` : ''}</span>
                : <span className="chip warn" style={{ marginTop: 6, whiteSpace: 'normal', height: 'auto' }}>esperando entrar{c.enviado_em ? ` desde ${dataCurta(c.enviado_em)}, vale até ${dataCurta(somaDias(c.enviado_em, 14))}` : ''}</span>}
              {c.situacao === 'esperando' && (
                <span className="row-btns quem-btns">
                  <a className="btn sm line" target="_blank" rel="noreferrer" href={linkWhatsApp(mensagemConvite('pessoa', { familia: familia.nome, quem: c.nome, link, email: c.email || undefined }))} onClick={() => { tentar(async () => { await api.reenviarConvite?.(familia.id, c.id); setN(x => x + 1); toast(`Convite de ${c.nome} reenviado: vale mais 14 dias. Mande a mensagem de novo no WhatsApp que abriu.`) }) }}>Reenviar</a>
                  <button className="btn sm ghost" type="button" onClick={() => setCancelar(c)}>Cancelar convite</button>
                </span>
              )}
            </span>
            <span />
          </li>
        ))}
      </ul>
      <p className="sub" style={{ marginTop: 8 }}>A pessoa entra com o mesmo e-mail do convite. Se ela usar outro e-mail, cancele e convide de novo.</p>
      {cancelar && (
        <Sheet titulo={`Cancelar o convite de ${cancelar.nome}?`} fechar={() => setCancelar(null)}>
          <p className="corpo">O link que {cancelar.nome} recebeu para de funcionar. Dá pra convidar de novo depois, com o e-mail certo.</p>
          <button className="btn primary full" type="button" onClick={async () => { const c = cancelar; setCancelar(null); if (await tentar(() => api.cancelarConvite!(familia.id, c.id))) { setN(x => x + 1); toast(`Convite de ${c.nome} cancelado.`) } }}>Sim, cancelar o convite</button>
          <button className="btn ghost full" type="button" onClick={() => setCancelar(null)}>Não, deixar como está</button>
        </Sheet>
      )}
    </section>
  )
}
