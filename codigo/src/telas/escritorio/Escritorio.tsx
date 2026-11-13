import { useEffect, useMemo, useState } from 'react'
import { BellRing, ChevronRight, ClipboardList, Copy, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useEscritorio } from '../../app/useDados2'
import { Vazio } from '../../componentes/base'
import { FuncIco, PerguntaCard } from '../../componentes/Pergunta'
import type { FuncionarioEsc, Lembrete, PerguntaEsc, RelatorioEsc, Repetir } from '../../api/tipos'
import { FichaFuncionario, donoDaPergunta } from './Ficha'
import { chaveSimples } from '../../api/normaliza2'
import { dataCurta, diaSemana, FUSO, hojeRecife, somaDias } from '../../lib/formato'
import { demoraTexto, fraseDoDia } from '../../lib/guardado'
import { Cena3D, IcoEstado, ROTULO_ESTADO, salaDe } from './Cena3D'
import { SALAS_NOME } from './cenaBase'
import { umaPorVez } from '../../lib/seguro'

type Aba = 'hoje' | 'relatorio' | 'lembretes'
export const nomeDoDono = (p: PerguntaEsc, fs: FuncionarioEsc[]) => donoDaPergunta(p, fs)?.nome || p.funcionario

/** Escritório: a equipe em 3D, o que cada um precisa de você (1 pergunta por vez), o Relatório e os Lembretes. */
export function Escritorio() {
  const [aba, setAba] = useState<Aba>(() => (/[?&]aba=lembretes/.test(location.hash) ? 'lembretes' : /[?&]aba=relatorio/.test(location.hash) ? 'relatorio' : 'hoje'))
  return (
    <div className="view">
      <nav className="segbar" aria-label="Partes do Escritório">
        <div className="seg">
          {([['hoje', 'Hoje'], ['relatorio', 'Relatório'], ['lembretes', 'Lembretes']] as [Aba, string][]).map(([a, n]) => <button key={a} type="button" aria-pressed={aba === a} onClick={() => setAba(a)}>{n}</button>)}
        </div>
      </nav>
      {aba === 'hoje' && <Hoje />}
      {aba === 'relatorio' && <Relatorio />}
      {aba === 'lembretes' && <Lembretes />}
    </div>
  )
}

function Hoje() {
  const { e, estado, motivo, responder } = useEscritorio()
  const [sel, setSel] = useState<string | null>(() => /[?&]f=([a-z_]+)/.exec(location.hash)?.[1] || null)
  if (estado === 'desligado') return <div className="card"><Vazio ico={<ClipboardList size={24} />}>O Escritório novo ainda está sendo ligado no banco da família. Assim que ligar, os funcionários aparecem aqui com as perguntas do dia.</Vazio></div>
  if (estado === 'erro' && !e) return <div className="card"><p className="aviso-erro" role="alert">Não deu pra buscar o Escritório: {motivo}</p></div>
  if (!e) return <div className="card"><p className="sub">Chamando a equipe…</p></div>

  const fila = e.precisa_de_voce
  const aberto = e.funcionarios.find(f => f.id === sel) || null
  const salas = Object.keys(SALAS_NOME).filter(k => e.funcionarios.some(f => salaDe(f.sala) === k))
  const primeiro = fila[0] && donoDaPergunta(fila[0], e.funcionarios)

  return (
    <>
      <div className="esc-frase">
        <h2>{fraseDoDia(fila.length)}{fila.length ? ' hoje' : ''}</h2>
        <p className="sub">{fila.length ? 'Quem precisa de você está de pé, na frente da sala, acenando. Toque num funcionário pra abrir a ficha dele: a pergunta, o que ele cuida e o que você já respondeu.' : 'Tudo em ordem. Toque num funcionário pra ver o que ele cuida e o que você já respondeu pra ele.'}</p>
        {primeiro && <button type="button" className="btn primary" onClick={() => setSel(primeiro.id)}>Responder {primeiro.nome}<ChevronRight size={18} /></button>}
      </div>
      <div className="esc-grade">
        <section className="card esc-cena-card" aria-label="O escritório da família em 3D">
          <Cena3D funcionarios={e.funcionarios} selecionado={aberto?.id || null} aoTocar={setSel} />
        </section>
        <section className="card" aria-labelledby="eEq">
          <div className="card-h"><h2 id="eEq">A equipe, sala por sala</h2></div>
          {salas.map(k => (
            <div key={k} className="esc-sala">
              <h3>{SALAS_NOME[k]}</h3>
              <ul className="list">
                {e.funcionarios.filter(f => salaDe(f.sala) === k).map(f => (
                  <li key={f.id}>
                    <button className="li" type="button" data-func={f.id} onClick={() => setSel(f.id)} aria-label={`${f.nome}: ${ROTULO_ESTADO[f.estado]}. Abrir a ficha.`}>
                      <FuncIco id={f.id} precisa={f.estado === 'precisa_de_voce'} />
                      <span className="m"><b className="quebra">{f.nome}</b><small style={{ whiteSpace: 'normal' }}>{f.frase}</small><span className={'chip' + (f.estado === 'precisa_de_voce' ? ' ok' : '')} style={{ marginTop: 6 }}><IcoEstado e={f.estado} />{ROTULO_ESTADO[f.estado]}</span></span>
                      <ChevronRight size={20} className="muted" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
      {aberto && <FichaFuncionario f={aberto} e={e} responder={responder} fechar={() => setSel(null)} />}
    </>
  )
}

const hhmm = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const diaDe = (iso: string) => hojeRecife(new Date(iso))

/** Relatório: o diário de tudo que foi perguntado e respondido, com a conta de quanto demorou. */
function Relatorio() {
  const { api, familia, versao, sessao } = useApp()
  // R15: "demora pra responder" soa como bronca: só o dono do produto vê
  const dono = !!sessao?.dono
  const [dias, setDias] = useState(7)
  const [r, setR] = useState<RelatorioEsc | null>(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const { e } = useEscritorio()
  useEffect(() => {
    if (!familia) return
    let vivo = true
    const hoje = hojeRecife()
    api.escritorioRelatorio(familia.id, somaDias(hoje, -(dias - 1)), hoje).then(x => { if (vivo) { setR(x); setErro('') } }).catch((x: Error) => { if (vivo) setErro(x.message) })
    return () => { vivo = false }
  }, [api, familia?.id, versao, dias])
  const nome = (id: string) => e?.funcionarios.find(f => f.id === id || chaveSimples(f.nome) === chaveSimples(id))?.nome || id
  const idDe = (id: string) => e?.funcionarios.find(f => f.id === id || chaveSimples(f.nome) === chaveSimples(id))?.id || id

  if (erro && !r) return <div className="card"><p className="aviso-erro" role="alert">Não deu pra buscar o Relatório: {erro}</p></div>
  if (!r) return <div className="card"><p className="sub">Abrindo o diário…</p></div>
  const tot = r.funcionarios.reduce((s, f) => ({ p: s.p + f.perguntas, r: s.r + f.respondidas, pe: s.pe + f.pendentes }), { p: 0, r: 0, pe: 0 })
  const comTempo = r.funcionarios.filter(f => f.tempo_medio_min != null && f.respondidas > 0)
  const demora = comTempo.length ? comTempo.reduce((s, f) => s + (f.tempo_medio_min || 0) * f.respondidas, 0) / comTempo.reduce((s, f) => s + f.respondidas, 0) : null
  const texto = [`Relatório do Escritório, últimos ${dias} dias`, `Perguntas: ${tot.p} · Respondidas: ${tot.r} · Esperando você: ${tot.pe} · Demora pra responder: ${demoraTexto(demora)}`, '', ...r.diario.map(d => `${dataCurta(diaDe(d.quando))} ${hhmm(d.quando)} · ${nome(d.funcionario)}: ${d.assunto || d.pergunta}. Resposta: ${d.resposta}${d.respondido_por ? ` (${d.respondido_por})` : ''}`)].join('\n')
  const copiar = async () => { try { await navigator.clipboard.writeText(texto) } catch { /* sem permissão: o texto aparece na caixa pra copiar à mão */ } setCopiado(true) }
  const porDia: Record<string, typeof r.diario> = {}
  for (const d of r.diario) (porDia[diaDe(d.quando)] ||= []).push(d)

  return (
    <>
      <div className="pills" role="group" aria-label="Período do relatório">
        {[7, 30].map(n => <button key={n} type="button" className="pill" aria-pressed={dias === n} onClick={() => setDias(n)}>Últimos {n} dias</button>)}
      </div>
      <section className="card" aria-labelledby="rNum">
        <div className="card-h"><h2 id="rNum">Cobrou, respondeu, resolveu</h2></div>
        <dl className="rel-ind">
          <div><dt>Perguntas feitas</dt><dd>{tot.p}</dd></div>
          <div><dt>Respondidas</dt><dd>{tot.r}</dd></div>
          <div><dt>Esperando você</dt><dd>{tot.pe}</dd></div>
          {dono && <div><dt>Demora pra responder</dt><dd className="txt">{demoraTexto(demora)}</dd></div>}
        </dl>
        <p className="sub" style={{ marginTop: 12 }}>De onde vêm esses números: cada pergunta que um funcionário faz e cada resposta sua ficam anotadas no diário abaixo, com dia e hora. Nada é apagado.</p>
        {r.funcionarios.length > 0 && (
          <ul className="list" style={{ marginTop: 8 }}>
            {r.funcionarios.map(f => (
              <li key={f.funcionario} className="li">
                <FuncIco id={idDe(f.funcionario)} />
                <span className="m"><b>{nome(f.funcionario)}</b><small style={{ whiteSpace: 'normal' }}>{f.respondidas} de {f.perguntas} respondidas{dono && f.tempo_medio_min != null ? ` · demora: ${demoraTexto(f.tempo_medio_min)}` : ''}</small></span>
                <span className="v">{f.pendentes > 0 ? <span className="chip warn">{f.pendentes} esperando</span> : <span className="chip">em dia</span>}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card" aria-labelledby="rDia">
        <div className="card-h"><h2 id="rDia">Diário</h2>{r.diario.length > 0 && <button className="lnk" type="button" onClick={copiar}><Copy size={16} />Copiar relatório</button>}</div>
        {copiado && <div className="campo"><span>Relatório copiado. Se não colar, copie daqui:</span><textarea className="inp area" readOnly rows={6} value={texto} aria-label="Texto do relatório" /></div>}
        {!r.diario.length ? <Vazio ico={<ClipboardList size={24} />}>Nenhuma resposta anotada nesse período. Quando você responder uma pergunta do Escritório, ela aparece aqui.</Vazio> : (
          Object.keys(porDia).sort().reverse().map(dia => (
            <div key={dia}>
              <p className="dayh">{dia === hojeRecife() ? 'Hoje' : `${diaSemana(dia)}, ${dataCurta(dia)}`}</p>
              <ul className="list diario">
                {porDia[dia].map(d => (
                  <li key={d.id} className="li">
                    <FuncIco id={idDe(d.funcionario)} size={36} />
                    <span className="m"><small>{hhmm(d.quando)} · {nome(d.funcionario)}{d.respondido_por ? ` · respondeu ${d.respondido_por}` : ''}</small><span className="perg-d">{d.assunto || d.pergunta}</span><b className="quebra">{d.resposta}</b></span>
                    <span />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </>
  )
}

const REPETE: [Repetir, string][] = [['nunca', 'Não repete'], ['dia', 'Todo dia'], ['semana', 'Toda semana'], ['mes', 'Todo mês'], ['ano', 'Todo ano']]
/** "2026-11-12T09:00" no relógio de Recife vira o instante certo (Recife fica sempre 3 horas atrás de Greenwich). */
export const quandoDeRecife = (local: string) => new Date(local + ':00-03:00').toISOString()
const localDeRecife = (iso: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace(' ', 'T')

/** Lembretes: 3 campos (o quê, quando, repetir). A Secretária cobra na hora marcada, todo dia, até você responder. */
function Lembretes() {
  const { api, familia, versao, tentar, recarregar, toast } = useApp()
  const [lista, setLista] = useState<Lembrete[] | null>(null)
  const [erro, setErro] = useState('')
  const [titulo, setTitulo] = useState('')
  const [quando, setQuando] = useState(() => `${somaDias(hojeRecife(), 1)}T09:00`)
  const [repetir, setRepetir] = useState<Repetir>('nunca')
  const [falta, setFalta] = useState('')
  const [gravando, setGravando] = useState(false)
  const trava = useMemo(() => umaPorVez(async (f: () => Promise<void>) => f()), [])
  useEffect(() => {
    if (!familia) return
    let vivo = true
    api.lembretes(familia.id).then(l => { if (vivo) { setLista(l); setErro('') } }).catch((x: Error) => { if (vivo) setErro(x.message) })
    return () => { vivo = false }
  }, [api, familia?.id, versao])
  if (familia?.papel !== 'casal') return <div className="card"><Vazio ico={<BellRing size={24} />}>Os lembretes são do casal. Peça pra quem cuida da família criar um pra você.</Vazio></div>

  const criar = () => trava(async () => {
    if (!familia) return
    if (!titulo.trim()) { setFalta('Escreva o que é pra lembrar.'); return }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(quando)) { setFalta('Escolha o dia e a hora.'); return }
    setFalta(''); setGravando(true)
    const ok = await tentar(() => api.lembreteCriar(familia.id, { titulo: titulo.trim(), quando: quandoDeRecife(quando), repetir }))
    setGravando(false)
    if (ok) { setTitulo(''); toast('Lembrete guardado. A Secretária cobra na hora marcada.'); await recarregar() }
  })
  const agir = async (f: () => Promise<void>, msg: string) => { if (await tentar(f)) { toast(msg); await recarregar() } }
  const agora = Date.now()

  return (
    <div className="tela-larga">
      <div className="col">
        <section className="card" aria-labelledby="lNovo">
          <div className="card-h"><h2 id="lNovo">Novo lembrete</h2></div>
          <div className="form-l">
            <label className="campo"><span>O quê</span><input className="inp" value={titulo} maxLength={120} placeholder="Ex.: Renovar o seguro do carro" onChange={ev => setTitulo(ev.target.value)} /></label>
            <label className="campo"><span>Quando</span><input className="inp" type="datetime-local" value={quando} onChange={ev => setQuando(ev.target.value)} /></label>
            <div className="campo"><span id="lRep">Repetir</span>
              <div className="pills" role="group" aria-labelledby="lRep">{REPETE.map(([r, n]) => <button key={r} type="button" className="pill" aria-pressed={repetir === r} onClick={() => setRepetir(r)}>{n}</button>)}</div>
            </div>
            {falta && <p className="erro" role="alert">{falta}</p>}
            <button className="btn primary" type="button" disabled={gravando} onClick={criar}><Plus size={20} />Guardar lembrete</button>
            <p className="sub">Na hora marcada, a Secretária pergunta no Início e no Escritório. Ela cobra de novo todo dia até você dizer que fez ou marcar outro dia.</p>
          </div>
        </section>
      </div>
      <div className="col">
        <section className="card" aria-labelledby="lLista">
          <div className="card-h"><h2 id="lLista">Lembretes guardados</h2>{lista && lista.length > 0 && <span className="chip">{lista.length}</span>}</div>
          {erro && !lista ? <p className="aviso-erro" role="alert">Não deu pra buscar os lembretes: {erro}</p> : !lista ? <p className="sub">Buscando…</p> : !lista.length ? (
            <Vazio ico={<BellRing size={24} />}>Nenhum lembrete guardado. Crie o primeiro com os 3 campos {window.innerWidth < 900 ? 'acima' : 'ao lado'}.</Vazio>
          ) : (
            <ul className="list lemb">
              {lista.map(l => {
                const venceu = new Date(l.quando).getTime() <= agora
                const dia = diaDe(l.quando)
                return (
                  <li key={l.id} data-lembrete={l.titulo}>
                    <div className="lemb-t">
                      <b>{l.titulo}</b>
                      <small>{dia === hojeRecife() ? 'hoje' : `${diaSemana(dia)}, ${dataCurta(dia)}`} às {hhmm(l.quando)} · {REPETE.find(x => x[0] === l.repetir)?.[1].toLowerCase()}{venceu ? ' · a Secretária está cobrando' : ''}</small>
                    </div>
                    <div className="lemb-b">
                      <button className="btn sm primary" type="button" onClick={() => agir(() => api.lembreteConcluir(familia!.id, l.id), l.repetir === 'nunca' ? 'Feito. Lembrete encerrado.' : 'Feito. Volta na próxima data.')}>Já fiz</button>
                      <button className="btn sm line" type="button" onClick={() => agir(() => api.lembreteAdiar(familia!.id, l.id, quandoDeRecife(`${somaDias(venceu ? hojeRecife() : dia, 1)}T${localDeRecife(l.quando).slice(11, 16)}`)), 'Adiado 1 dia.')}>Adiar 1 dia</button>
                      <button className="iconbtn" type="button" aria-label={`Apagar o lembrete ${l.titulo}`} onClick={() => agir(() => api.lembreteApagar(familia!.id, l.id), 'Lembrete apagado.')}><Trash2 size={20} /></button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

/**
 * "N coisas precisam de você", com a 1ª pergunta respondível ali mesmo. Usado no Início (casal e pessoas)
 * e na Casa da equipe (que só recebe perguntas da Casa, sem nenhum valor em dinheiro).
 */
export function PrecisaDeVoce({ equipe }: { equipe?: boolean }) {
  const { e, estado, responder } = useEscritorio()
  const { familia } = useApp()
  // A2: a pessoa da família (filha) só vê o cartão quando é sobre ela, e não tem a tela do Escritório
  const pessoa = familia?.papel === 'pessoa'
  if (estado === 'desligado' || !e) return null
  const fila = e.precisa_de_voce
  if ((equipe || pessoa) && !fila.length) return null
  const p = fila[0]
  return (
    <section className="card precisa" aria-labelledby="pvT" data-precisa={fila.length}>
      <div className="card-h">
        <h2 id="pvT">{equipe ? (fila.length === 1 ? '1 coisa da casa precisa de você' : `${fila.length} coisas da casa precisam de você`) : fraseDoDia(fila.length)}</h2>
        {!equipe && !pessoa && <a className="lnk" href="#/escritorio">Escritório<ChevronRight size={16} /></a>}
      </div>
      {p ? (
        <>
          <PerguntaCard key={p.id} p={p} quem={nomeDoDono(p, e.funcionarios)} responder={responder} posicao={fila.length > 1 ? `1 de ${fila.length}` : undefined} />
          {fila.length > 1 && !equipe && <p className="sub" style={{ marginTop: 10 }}>Depois desta: {(() => { const nomes = [...new Set(fila.slice(1).map(x => nomeDoDono(x, e.funcionarios)))]; return nomes.slice(0, 2).join(' e ') + (nomes.length > 2 ? ` e mais ${nomes.length - 2}` : '') })()}.</p>}
        </>
      ) : (
        <p className="sub">Tudo em ordem. Os {e.funcionarios.length} funcionários do Escritório conferiram os números da família. Quando um deles precisar de uma resposta sua, a pergunta aparece aqui.</p>
      )}
    </section>
  )
}
