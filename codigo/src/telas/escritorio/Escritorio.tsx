import { copiarProtegido, textoPrivado } from '../../lib/olho'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import './escritorio.css'
import { Icone } from '../../componentes/Icone'
import { NomeDaPessoa } from '../../componentes/NomeDaPessoa'
import { CampoPrivado } from '../../componentes/privacidade'
import { useEffect, useMemo, useState } from 'react'
import { BellRing, Copy, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useEscritorio } from '../../app/useDados2'
import { Vazio } from '../../componentes/base'
import { FuncIco } from '../../componentes/Pergunta'
import type { FuncionarioEsc, Lembrete, PerguntaEsc, RelatorioEsc, Repetir } from '../../api/tipos'
import { donoDaPergunta } from './donoDaPergunta'
import { chaveSimples } from '../../api/normaliza2'
import { dataCurta, diaSemana, FUSO, hojeRecife, somaDias } from '../../lib/formato'
import { demoraTexto } from '../../lib/guardado'
import { EscritorioIsometrico } from './EscritorioIsometrico'
// @ts-ignore: extensão explícita distingue Cena3D.tsx de cena3d.ts no Windows (Vite resolve .tsx).
import { abaDoHash } from '../../lib/escritorio/cenaBase'
import { DESTINO_SECRETARIA } from '../../lib/escritorio/equipe'
import { umaPorVez } from '../../lib/seguro'

type Aba = 'hoje' | 'relatorio' | 'lembretes'
export const nomeDoDono = (p: PerguntaEsc, fs: FuncionarioEsc[]) => donoDaPergunta(p, fs)?.nome || p.funcionario

/** Escritório: a equipe em 3D, o que cada um precisa de você (1 pergunta por vez), o Relatório e os Lembretes. */
export function Escritorio() {
  const [aba, setAba] = useState<Aba>(() => abaDoHash(location.hash))
  useEffect(() => {
    const navegar = () => setAba(abaDoHash(location.hash))
    window.addEventListener('hashchange', navegar)
    return () => window.removeEventListener('hashchange', navegar)
  }, [])
  return (
    <div
      className="view escritorio-visual"
      onClickCapture={ev => {
        // O bot?o compartilhado pertence ? outra frente; resolvemos aqui a subaba da Secret?ria.
        const alvo = ev.target instanceof Element ? ev.target.closest('a[href="#/escritorio"]') : null
        if (alvo?.closest('[data-ficha="secretaria"]')) {
          ev.preventDefault()
          ev.stopPropagation()
          location.hash = DESTINO_SECRETARIA
          setAba('lembretes')
        }
      }}
    >
      <nav className="segbar" aria-label="Partes do Escritório">
        <div className="seg compacta">
          {(
            [
              ['hoje', 'Hoje'],
              ['relatorio', 'Relatório'],
              ['lembretes', 'Lembretes'],
            ] as [Aba, string][]
          ).map(([a, n]) => (
            <button key={a} type="button" aria-pressed={aba === a} onClick={() => setAba(a)}>
              <Icone nome={a === 'hoje' ? 'escritorio' : a === 'relatorio' ? 'folha' : 'recepcao'} />
              {n}
            </button>
          ))}
        </div>
      </nav>
      {aba === 'hoje' && <EscritorioIsometrico superficie="escritorio" />}
      {aba === 'relatorio' && <Relatorio />}
      {aba === 'lembretes' && <Lembretes />}
    </div>
  )
}

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const diaDe = (iso: string) => hojeRecife(new Date(iso))

/** Relatório: o diário de tudo que foi perguntado e respondido, com a conta de quanto demorou. */
function Relatorio() {
  const [dias, setDias] = useState(7)
  return (
    <>
      <div className="pills" role="group" aria-label="Período do relatório">
        {[7, 30].map(n => (
          <button key={n} type="button" className="pill" aria-pressed={dias === n} onClick={() => setDias(n)}>
            Últimos {n} dias
          </button>
        ))}
      </div>
      <RelatorioPeriodo key={dias} dias={dias} />
    </>
  )
}
function RelatorioPeriodo({ dias }: { dias: number }) {
  const { api, familia, versao, sessao, oculto } = useApp()
  // R15: "demora pra responder" soa como bronca: só o dono do produto vê
  const dono = !!sessao?.dono
  const [n, setN] = useState(0)
  const [r, setR] = useState<RelatorioEsc | null>(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [copiaTentada, setCopiaTentada] = useState(false)
  const { e } = useEscritorio()
  useEffect(() => {
    if (!familia) return
    let vivo = true
    const hoje = hojeRecife()
    api
      .escritorioRelatorio(familia.id, somaDias(hoje, -(dias - 1)), hoje)
      .then(x => {
        if (vivo) {
          setR(x)
          setErro('')
        }
      })
      .catch((x: Error) => {
        if (vivo) setErro(x.message)
      })
    return () => {
      vivo = false
    }
  }, [api, familia?.id, versao, dias, n])
  const nome = (id: string) =>
    e?.funcionarios.find(f => f.id === id || chaveSimples(f.nome) === chaveSimples(id))?.nome || id
  const idDe = (id: string) =>
    e?.funcionarios.find(f => f.id === id || chaveSimples(f.nome) === chaveSimples(id))?.id || id

  if (erro && !r)
    return (
      <div className="card" role="alert">
        <EstadoVazio
          ilustracao="Erro"
          titulo="Não foi possível conferir."
          frase="Tente novamente para abrir o diário."
          acao={{ texto: 'Tentar de novo', aoClicar: () => setN(x => x + 1) }}
        />
      </div>
    )
  if (!r)
    return (
      <div className="card">
        <p className="sub">Abrindo o diário…</p>
      </div>
    )
  const tot = r.funcionarios.reduce(
    (s, f) => ({ p: s.p + f.perguntas, r: s.r + f.respondidas, pe: s.pe + f.pendentes }),
    { p: 0, r: 0, pe: 0 },
  )
  const comTempo = r.funcionarios.filter(f => f.tempo_medio_min != null && f.respondidas > 0)
  const demora = comTempo.length
    ? comTempo.reduce((s, f) => s + (f.tempo_medio_min || 0) * f.respondidas, 0) /
      comTempo.reduce((s, f) => s + f.respondidas, 0)
    : null
  const mostrar = textoPrivado
  const textoIntegral = [
    `Relatório do Escritório, últimos ${dias} dias`,
    `Perguntas: ${tot.p} · Respondidas: ${tot.r} · Esperando você: ${tot.pe}${dono ? ` · Demora pra responder: ${demoraTexto(demora)}` : ''}`,
    '',
    ...r.diario.map(
      d =>
        `${dataCurta(diaDe(d.quando))} ${hhmm(d.quando)} · ${nome(d.funcionario)}: ${d.assunto || d.pergunta}. Resposta: ${d.resposta}${d.respondido_por ? ` (${mostrar(d.respondido_por)})` : ''}`,
    ),
  ].join('\n')
  const texto = oculto ? 'Relatorio: conteudo oculto.' : textoIntegral
  const copiar = async () => {
    setCopiaTentada(true)
    try {
      setCopiado(await copiarProtegido(textoIntegral, texto))
    } catch {
      setCopiado(false)
    }
  }
  const porDia: Record<string, typeof r.diario> = {}
  for (const d of r.diario) (porDia[diaDe(d.quando)] ||= []).push(d)

  return (
    <>
      <section className="card" aria-labelledby="rNum">
        <div className="card-h">
          <h2 id="rNum">
            <Icone nome="salvo" />
            Cobrou, respondeu, resolveu
          </h2>
        </div>
        <dl className="rel-ind">
          <div>
            <dt>Perguntas feitas</dt>
            <dd>{tot.p}</dd>
          </div>
          <div>
            <dt>Respondidas</dt>
            <dd>{tot.r}</dd>
          </div>
          <div>
            <dt>Esperando você</dt>
            <dd>{tot.pe}</dd>
          </div>
          {dono && (
            <div>
              <dt>Demora pra responder</dt>
              <dd className="txt">{demoraTexto(demora)}</dd>
            </div>
          )}
        </dl>
        <p className="sub" style={{ marginTop: 12 }}>
          De onde vêm esses números: cada pergunta que um funcionário faz e cada resposta sua ficam anotadas no diário
          abaixo, com dia e hora. Nada é apagado.
        </p>
        {r.funcionarios.length > 0 && (
          <ul className="list" style={{ marginTop: 8 }}>
            {r.funcionarios.map(f => (
              <li key={f.funcionario} className="li">
                <FuncIco id={idDe(f.funcionario)} />
                <span className="m">
                  <b>{textoPrivado(nome(f.funcionario))}</b>
                  <small style={{ whiteSpace: 'normal' }}>
                    {f.respondidas} de {f.perguntas} respondidas
                    {textoPrivado(
                      dono && f.tempo_medio_min != null ? ` · demora: ${demoraTexto(f.tempo_medio_min)}` : '',
                    )}
                  </small>
                </span>
                <span className="v">
                  {f.pendentes > 0 ? (
                    <span className="chip warn">{f.pendentes} esperando</span>
                  ) : (
                    <span className="chip">em dia</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card" aria-labelledby="rDia">
        <div className="card-h">
          <h2 id="rDia">
            <Icone nome="lancamentos" />
            Diário
          </h2>
          {r.diario.length > 0 && (
            <button className="lnk" type="button" onClick={copiar}>
              <Icone desenho={Copy} />
              Copiar relatório
            </button>
          )}
        </div>
        {copiaTentada && (
          <div className="campo">
            <span>
              {copiado ? 'Relatório copiado. Se não colar, copie daqui:' : 'Não foi possível copiar. Copie daqui:'}
            </span>
            <textarea className="inp area" readOnly rows={6} value={texto} aria-label="Texto do relatório" />
          </div>
        )}
        {!r.diario.length ? (
          <EstadoVazio
            ilustracao="SemRecebimentos"
            titulo="O diário começa aqui"
            frase="Nenhuma resposta anotada nesse período. Quando você responder uma pergunta do Escritório, ela aparece aqui."
          />
        ) : (
          Object.keys(porDia)
            .sort()
            .reverse()
            .map(dia => (
              <div key={dia}>
                <p className="dayh">{dia === hojeRecife() ? 'Hoje' : `${diaSemana(dia)}, ${dataCurta(dia)}`}</p>
                <ul className="list diario">
                  {porDia[dia].map(d => (
                    <li key={d.id} className="li">
                      <FuncIco id={idDe(d.funcionario)} size={36} />
                      <span className="m">
                        <small>
                          {hhmm(d.quando)} · {textoPrivado(nome(d.funcionario))} · respondeu{' '}
                          <NomeDaPessoa pessoa={{ tipo: 'membro', id: `diario:${d.id}`, nome: d.respondido_por }} />
                        </small>
                        <span className="perg-d">{textoPrivado(mostrar(d.assunto || d.pergunta))}</span>
                        <b className="quebra">{textoPrivado(mostrar(d.resposta))}</b>
                      </span>
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

const REPETE: [Repetir, string][] = [
  ['nunca', 'Não repete'],
  ['dia', 'Todo dia'],
  ['semana', 'Toda semana'],
  ['mes', 'Todo mês'],
  ['ano', 'Todo ano'],
]
/** "2026-11-12T09:00" no relógio de Recife vira o instante certo (Recife fica sempre 3 horas atrás de Greenwich). */
export const quandoDeRecife = (local: string) => new Date(local + ':00-03:00').toISOString()
const localDeRecife = (iso: string) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(iso))
    .replace(' ', 'T')

/** Lembretes: 3 campos (o quê, quando, repetir). A Secretária cobra na hora marcada, todo dia, até você responder. */
function Lembretes() {
  const { api, familia, versao, tentar, recarregar, toast, oculto } = useApp()
  const mostrar = textoPrivado
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
    api
      .lembretes(familia.id)
      .then(l => {
        if (vivo) {
          setLista(l)
          setErro('')
        }
      })
      .catch((x: Error) => {
        if (vivo) setErro(x.message)
      })
    return () => {
      vivo = false
    }
  }, [api, familia?.id, versao])
  if (familia?.papel !== 'casal')
    return (
      <div className="card">
        <Vazio ico={<Icone desenho={BellRing} />}>
          Os lembretes são do casal. Peça pra quem cuida da família criar um pra você.
        </Vazio>
      </div>
    )

  const criar = () =>
    trava(async () => {
      if (!familia) return
      if (!titulo.trim()) {
        setFalta('Escreva o que é pra lembrar.')
        return
      }
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(quando)) {
        setFalta('Escolha o dia e a hora.')
        return
      }
      setFalta('')
      setGravando(true)
      const ok = await tentar(() =>
        api.lembreteCriar(familia.id, { titulo: titulo.trim(), quando: quandoDeRecife(quando), repetir }),
      )
      setGravando(false)
      if (ok) {
        setTitulo('')
        toast('Lembrete guardado. A Secretária cobra na hora marcada.')
        await recarregar()
      }
    })
  const agir = async (f: () => Promise<void>, msg: string) => {
    if (await tentar(f)) {
      toast(msg)
      await recarregar()
    }
  }
  const agora = Date.now()

  return (
    <div className="tela-larga">
      <div className="col">
        <section className="card" aria-labelledby="lNovo">
          <div className="card-h">
            <h2 id="lNovo">
              <Icone nome="lancar" />
              Novo lembrete
            </h2>
          </div>
          <div className="form-l">
            <label className="campo">
              <span>O quê</span>
              <CampoPrivado
                className="inp"
                value={titulo}
                maxLength={120}
                placeholder="Ex.: Renovar o seguro do carro"
                onChange={ev => setTitulo(ev.target.value)}
              />
            </label>
            <label className="campo">
              <span>Quando</span>
              <CampoPrivado
                privado={false}
                className="inp"
                type="datetime-local"
                value={quando}
                onChange={ev => setQuando(ev.target.value)}
              />
            </label>
            <div className="campo">
              <span id="lRep">Repetir</span>
              <div className="pills" role="group" aria-labelledby="lRep">
                {REPETE.map(([r, n]) => (
                  <button
                    key={r}
                    type="button"
                    className="pill"
                    aria-pressed={repetir === r}
                    onClick={() => setRepetir(r)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {falta && (
              <p className="erro" role="alert">
                {textoPrivado(falta)}
              </p>
            )}
            <button className="btn primary" type="button" disabled={gravando} onClick={criar}>
              <Icone desenho={Plus} />
              Guardar lembrete
            </button>
            <p className="sub">
              Na hora marcada, a Secretária pergunta no Início e no Escritório. Ela cobra de novo todo dia até você
              dizer que fez ou marcar outro dia.
            </p>
          </div>
        </section>
      </div>
      <div className="col">
        <section className="card" aria-labelledby="lLista">
          <div className="card-h">
            <h2 id="lLista">
              <Icone nome="pendente" />
              Lembretes guardados
            </h2>
            {lista && lista.length > 0 && <span className="chip">{lista.length}</span>}
          </div>
          {erro && !lista ? (
            <p className="aviso-erro" role="alert">
              Não deu pra buscar os lembretes: {textoPrivado(erro)}
            </p>
          ) : !lista ? (
            <p className="sub">Buscando…</p>
          ) : !lista.length ? (
            <EstadoVazio
              ilustracao="TudoEmDia"
              titulo="Nenhum lembrete guardado"
              frase="Crie o primeiro com os 3 campos do formulário."
            />
          ) : (
            <ul className="list lemb">
              {lista.map(l => {
                const venceu = new Date(l.quando).getTime() <= agora
                const dia = diaDe(l.quando)
                return (
                  <li key={l.id} data-lembrete={textoPrivado(mostrar(l.titulo))}>
                    <div className="lemb-t">
                      <b>{textoPrivado(mostrar(l.titulo))}</b>
                      <small>
                        {dia === hojeRecife() ? 'hoje' : `${diaSemana(dia)}, ${dataCurta(dia)}`} às {hhmm(l.quando)} ·{' '}
                        {REPETE.find(x => x[0] === l.repetir)?.[1].toLowerCase()}
                        {venceu ? ' · a Secretária está cobrando' : ''}
                      </small>
                    </div>
                    <div className="lemb-b">
                      <button
                        className="btn sm primary"
                        type="button"
                        onClick={() =>
                          agir(
                            () => api.lembreteConcluir(familia!.id, l.id),
                            l.repetir === 'nunca' ? 'Feito. Lembrete encerrado.' : 'Feito. Volta na próxima data.',
                          )
                        }
                      >
                        <Icone nome="salvo" />
                        Já fiz
                      </button>
                      <button
                        className="btn sm line"
                        type="button"
                        onClick={() =>
                          agir(
                            () =>
                              api.lembreteAdiar(
                                familia!.id,
                                l.id,
                                quandoDeRecife(
                                  `${somaDias(venceu ? hojeRecife() : dia, 1)}T${localDeRecife(l.quando).slice(11, 16)}`,
                                ),
                              ),
                            'Adiado 1 dia.',
                          )
                        }
                      >
                        <Icone nome="pendente" />
                        Adiar 1 dia
                      </button>
                      <button
                        className="iconbtn"
                        type="button"
                        aria-label={textoPrivado(`Apagar o lembrete ${mostrar(l.titulo)}`)}
                        onClick={() => agir(() => api.lembreteApagar(familia!.id, l.id), 'Lembrete apagado.')}
                      >
                        <Icone desenho={Trash2} />
                      </button>
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
export { PrecisaDeVoce } from './PrecisaDeVoce'
