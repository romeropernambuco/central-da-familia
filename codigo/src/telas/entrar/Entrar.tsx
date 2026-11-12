import { useEffect, useState } from 'react'
import { ArrowLeft, Link2, Mail, Users } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { Marca } from '../../componentes/Marca'
import { codigo4Valido, codigo6Valido, emailValido } from '../../lib/formato'
import { conviteDoHash, ehLinkEquipe } from '../../app/rotas'
import { CONVITE_EXEMPLO } from '../../api/exemplo'

type Passo = 'email' | 'codigo' | 'equipe'

/** Entrar: e-mail com código de 6 números; a equipe da casa abre o link do convite e digita o código de 4 números. */
export function Entrar() {
  const { api, trocarSessao, toast } = useApp()
  // o convite da equipe vem no link (#/equipe?c=<id>): a tela lê o id e pede só os 4 números
  const [convite, setConvite] = useState<string | null>(() => conviteDoHash(location.hash))
  const [passo, setPasso] = useState<Passo>(() => (ehLinkEquipe(location.hash) ? 'equipe' : 'email'))
  useEffect(() => {
    const f = () => { const c = conviteDoHash(location.hash); setConvite(c); if (ehLinkEquipe(location.hash)) { setPasso('equipe'); setCodigo(''); setErro('') } }
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const ex = api.modo === 'exemplo'

  async function faz(f: () => Promise<void>) {
    setErro(''); setOcupado(true)
    try { await f() } catch (e) { setErro((e as Error).message) } finally { setOcupado(false) }
  }

  return (
    <div className="entrar">
      <div className="logo"><Marca size={48} /><b>Central da Família</b></div>
      <p className="corpo">Quanto a sua casa pode gastar hoje, num número só. Dinheiro, feira e equipe da casa no mesmo lugar.</p>

      {passo === 'email' && (
        <form className="card" style={{ display: 'grid', gap: 14 }} onSubmit={e => { e.preventDefault(); faz(async () => { if (!emailValido(email)) throw new Error('Confira o e-mail: falta o @ ou o final, tipo .com'); await api.enviarCodigo(email); setPasso('codigo') }) }}>
          <h2>Entrar</h2>
          <label className="campo"><span>Seu e-mail</span>
            <input className="inp" type="email" inputMode="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            <small>A gente manda um código de 6 números pra esse e-mail. Não tem senha pra lembrar.</small>
          </label>
          {erro && <p className="erro" role="alert">{erro}</p>}
          <button className="btn primary full" disabled={ocupado} type="submit"><Mail size={20} />Receber o código</button>
          <button className="btn line full" type="button" onClick={() => { setErro(''); setCodigo(''); setPasso('equipe') }}><Users size={20} />Sou da equipe da casa</button>
        </form>
      )}

      {passo === 'codigo' && (
        <form className="card" style={{ display: 'grid', gap: 14 }} onSubmit={e => { e.preventDefault(); faz(async () => { if (!codigo6Valido(codigo)) throw new Error('O código tem 6 números.'); const r = await api.confirmarCodigo(email, codigo); await trocarSessao(); if (r && r.aviso) toast(r.aviso) }) }}>
          <button type="button" className="lnk" style={{ justifySelf: 'start' }} onClick={() => setPasso('email')}><ArrowLeft size={18} />Trocar e-mail</button>
          <h2>Digite o código</h2>
          <p className="sub">Mandamos 6 números para <b>{email}</b>. Pode levar 1 minuto. Olhe também a caixa de spam.</p>
          <input className="inp cod" inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="Código de 6 números" value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          {ex && <p className="sub">No exemplo, o código é 123456.</p>}
          {erro && <p className="erro" role="alert">{erro}</p>}
          <button className="btn primary full" disabled={ocupado || codigo.length !== 6} type="submit">Entrar</button>
        </form>
      )}

      {passo === 'equipe' && (
        <form className="card" style={{ display: 'grid', gap: 14 }} onSubmit={e => { e.preventDefault(); if (!convite) return; faz(async () => { if (!codigo4Valido(codigo)) throw new Error('O código da equipe tem 4 números.'); await api.entrarEquipe(convite, codigo); location.hash = '#/casa'; await trocarSessao() }) }}>
          <button type="button" className="lnk" style={{ justifySelf: 'start' }} onClick={() => { setErro(''); setPasso('email') }}><ArrowLeft size={18} />Voltar</button>
          <h2>Equipe da casa</h2>
          {convite ? (
            <>
              <p className="sub">Digite os 4 números que vieram junto com este link. O código vale por 24 horas e só funciona neste link. Você vai ver só a tela da Casa, pra anotar as compras.</p>
              <input className="inp cod" inputMode="numeric" autoComplete="one-time-code" maxLength={4} aria-label="Código de 4 números" value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 4))} />
              {ex && <p className="sub">No exemplo, o código é 2468.</p>}
              {erro && <p className="erro" role="alert">{erro}</p>}
              <button className="btn primary full" disabled={ocupado || codigo.length !== 4} type="submit">Entrar na Casa</button>
            </>
          ) : (
            <>
              <p className="todo"><Link2 size={20} aria-hidden="true" /><span><b>Peça o link pra quem cuida da família.</b> A entrada da equipe é pelo link do convite, que chega no WhatsApp junto com um código de 4 números. Abra o link neste celular e digite o código.</span></p>
              <p className="sub">Se o link já chegou e abriu esta tela, ele veio cortado: peça pra mandarem de novo.</p>
              {ex && <a className="btn line full" href={'#/equipe?c=' + CONVITE_EXEMPLO}>Abrir o link de exemplo</a>}
            </>
          )}
        </form>
      )}
      <p className="sub">Ao entrar você aceita o termo de uso. Seus dados ficam só com a sua família e você pode baixar ou apagar tudo quando quiser.</p>
    </div>
  )
}
