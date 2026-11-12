import { useState } from 'react'
import { MessageCircle, Sun, Moon, Smartphone, LogOut, ShieldCheck, Gauge, ChevronRight, UserPlus, Share } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { emailValido, linkWhatsApp, mensagemConvite } from '../../lib/formato'

/** Família e ajustes: convites, aparência, privacidade, painel e sair. */
export function Ajustes() {
  const { api, familia, sessao, sair, toast, tentar } = useApp()
  // o convite é gravado ANTES de abrir o WhatsApp: se o banco recusar (e-mail repetido, sem internet), o motivo aparece na hora
  const [convidado, setConvidado] = useState<{ nome: string; email: string } | null>(null)
  const [convidando, setConvidando] = useState(false)
  const [tema, setTema] = useState<string>(() => { try { return localStorage.getItem('tema') || 'auto' } catch { return 'auto' } })
  const [nome2, setNome2] = useState('')
  const [email2, setEmail2] = useState('')
  const link = location.origin + location.pathname
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
          <label className="campo"><span>Convidar a 2ª pessoa do casal</span><input className="inp" placeholder="Nome" value={nome2} onChange={e => setNome2(e.target.value)} /></label>
          <label className="campo" style={{ marginTop: 10 }}><span>E-mail de quem você está convidando</span><input className="inp" type="email" inputMode="email" placeholder="pessoa@email.com" value={email2} onChange={e => setEmail2(e.target.value)} /><small>{convidado && convidado.email === email2.trim().toLowerCase() ? 'Convite guardado. A mensagem não leva nenhum valor em dinheiro: só o link e o e-mail.' : 'A pessoa entra com esse e-mail, digita o código de 6 números que chega nele e já cai na família.'}</small></label>
          <div className="row-btns" style={{ marginTop: 10 }}>
            {convidado && convidado.email === email2.trim().toLowerCase()
              ? <a className="btn primary" target="_blank" rel="noreferrer" href={linkWhatsApp(mensagemConvite('pessoa', { familia: familia?.nome || '', quem: convidado.nome, link, email: convidado.email }))}><MessageCircle size={20} />Abrir o WhatsApp com o convite</a>
              : <button className="btn primary" type="button" disabled={convidando} onClick={async () => {
                if (!nome2.trim() || !emailValido(email2)) { toast('Escreva o nome e o e-mail de quem você está convidando.'); return }
                if (!familia) return
                setConvidando(true)
                const ok = await tentar(() => api.convidar(familia.id, 'casal', nome2.trim(), email2))
                setConvidando(false)
                if (ok) { setConvidado({ nome: nome2.trim(), email: email2.trim().toLowerCase() }); toast('Convite guardado. Agora mande a mensagem.') }
              }}><UserPlus size={20} />Convidar</button>}
            <a className="btn line" target="_blank" rel="noreferrer" href={linkWhatsApp(mensagemConvite('amiga', { familia: '', quem: '', link }))}><MessageCircle size={20} />Chamar família amiga</a>
          </div>
        </section>
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
            {api.modo === 'exemplo' && <li><a className="li" href="#/primeiro-uso" style={{ color: 'inherit', textDecoration: 'none' }}><span className="tile"><UserPlus size={20} /></span><span className="m"><b>Ver o primeiro uso</b><small>como uma família nova começa</small></span><ChevronRight size={20} className="muted" /></a></li>}
          </ul>
          <button className="btn line" type="button" style={{ marginTop: 12 }} onClick={async () => { location.hash = '#/inicio'; await sair() }}><LogOut size={20} />Sair</button>
        </section>
      </div>
    </div>
  )
}
