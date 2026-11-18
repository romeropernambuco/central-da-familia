import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Check, Clock, Hand, Maximize2, Minus } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useDestino } from '../../app/destinos'
import { useInvalidacao } from '../../app/invalidacao'
import { useEscritorio } from '../../app/useDados2'
import type { EscritorioHoje, EstadoFuncionario } from '../../api/tipos'
import { useModoFuncionario } from '../../componentes/AgenteDaAba'
import { Sheet } from '../../componentes/base'
import { Icone } from '../../componentes/Icone'
import { PerguntaCard } from '../../componentes/Pergunta'
import { totalPendencias } from '../../lib/resumo/pendencias'
import { Carregando } from '../../componentes/Carregando'
import { SALAS_NOME, tentarCarregarCena } from './cenaBase'
import type { montarEscritorioIsometrico } from './cenaIsometrica'
import { dadosIsometricos, type DadosIsometricos } from './dadosIsometricos'
import type { SalaEquipe } from './equipe'
import { SALAS_ISOMETRICAS, type VistaIsometrica } from './plantaIsometrica'
import { useEquipeCompleta } from './useEquipe'
import './escritorioIsometrico.css'

const FichaFuncionario = lazy(() => import('./Ficha').then(m => ({ default: m.FichaFuncionario })))

const ESTADO = {
  vai_comecar: { rotulo: 'Parado', icone: Minus },
  trabalhando: { rotulo: 'Trabalhando', icone: Clock },
  entregue: { rotulo: 'Entregue', icone: Check },
  precisa_de_voce: { rotulo: 'Precisa de você', icone: Hand },
} satisfies Record<EstadoFuncionario, { rotulo: string; icone: typeof Check }>
const ICONES_SALA = {
  caixa: 'orcamento', casa: 'casa', cartoes: 'cartoes', patrimonio: 'guardado', recepcao: 'recepcao', gestao: 'painel', apoio: 'ajustes',
} as const
type Selecionar = (id: string, pergunta?: string) => void
type CenaIsometrica = ReturnType<typeof montarEscritorioIsometrico>
type Superficie = 'inicio' | 'escritorio' | 'folha'

const retrato = (id: string) => `${import.meta.env.BASE_URL}retratos-escritorio/${id}.webp`

function EquipeIsometrica({ dados, selecionar }: { dados: DadosIsometricos; selecionar: Selecionar }) {
  return <section className="iso-equipe card">
    <h3>A equipe, sala por sala</h3>
    <div className="iso-equipe-grade">
      {SALAS_ISOMETRICAS.map(sala => {
        const postos = dados.postos.filter(p => p.membro.sala === sala)
        return !!postos.length && <div key={sala}>
          <h4><Icone nome={ICONES_SALA[sala]} />{SALAS_NOME[sala]}</h4>
          <ul>{postos.map(({ membro, funcionario }) => <li key={membro.id}>
            <button type="button" data-func={membro.id} onClick={() => selecionar(membro.id)}>
              <img src={retrato(membro.id)} width={36} height={36} alt="" loading="lazy" />
              <span><b>{membro.nome}</b><small>{funcionario.semDado ? 'Ainda sem dado' : ESTADO[funcionario.estado].rotulo}</small></span>
              <Icone desenho={ArrowUpRight} />
            </button>
          </li>)}</ul>
        </div>
      })}
    </div>
  </section>
}

function PainelIsometrico({ dados, superficie, comCena, selecionar, ampliar }: {
  dados: DadosIsometricos
  superficie: Superficie
  comCena: boolean
  selecionar: Selecionar
  ampliar?: () => void
}) {
  const titulo = useId(), descricao = useId()
  const palco = useRef<HTMLDivElement>(null)
  const etiquetas = useRef(new Map<string, HTMLElement>())
  const placas = useRef(new Map<SalaEquipe, HTMLElement>())
  const cena = useRef<CenaIsometrica | null>(null)
  const tocar = useRef(selecionar)
  tocar.current = selecionar
  const [vista, ir] = useState<VistaIsometrica>('tudo')
  const [renderizacao, renderizar] = useState<'carregando' | '3d' | 'lista'>('carregando')
  const [visivel, marcarVisivel] = useState(() => superficie !== 'inicio' || typeof IntersectionObserver === 'undefined')
  const estados = useMemo(() => Object.fromEntries(dados.postos.map(({ funcionario: f }) => [f.id, f.estado])), [dados.postos])
  const atuais = useRef({ estados, vista })
  atuais.current = { estados, vista }
  const salas = SALAS_ISOMETRICAS.filter(s => dados.postos.some(p => p.membro.sala === s))

  useEffect(() => {
    if (visivel || !comCena || !palco.current) return
    const observador = new IntersectionObserver(entradas => {
      if (entradas.some(entrada => entrada.isIntersecting)) marcarVisivel(true)
    })
    observador.observe(palco.current)
    return () => observador.disconnect()
  }, [comCena, visivel])

  useEffect(() => {
    const el = palco.current
    if (!comCena || !visivel || !el) return
    renderizar('carregando')
    if (typeof window.WebGLRenderingContext === 'undefined' ||
      new URLSearchParams(window.location?.search).has('sem3d') || /[?&]sem3d/.test(window.location?.hash || '')) {
      renderizar('lista')
      return
    }
    const cancelar = tentarCarregarCena(() => Promise.all([import('./tres'), import('./cenaIsometrica')]), ([T, m]) => {
      cena.current = m.montarEscritorioIsometrico(T, el, {
        ...atuais.current,
        previa: superficie === 'inicio',
        etiqueta: id => etiquetas.current.get(id) ?? null,
        placa: sala => placas.current.get(sala) ?? null,
        aoTocar: id => tocar.current(id),
        aoPerderContexto: () => { renderizar('lista') },
      })
      renderizar('3d')
    }, () => renderizar('lista'))
    return () => { cancelar(); cena.current?.destruir(); cena.current = null }
  }, [comCena, superficie, visivel])
  useEffect(() => { cena.current?.atualizar(estados, vista) }, [estados, vista])

  const listar = superficie !== 'inicio' && (superficie === 'escritorio' || !comCena || renderizacao === 'lista')
  return <section className={`iso-escritorio iso-${superficie}`} aria-labelledby={titulo}>
    <header className="iso-titulo"><h2 id={titulo}>Escritório da família</h2>
      {ampliar && <button type="button" className="iso-ampliar" onClick={ampliar}><Icone desenho={Maximize2} />Abrir escritório</button>}
    </header>
    <p className="sr" id={descricao}>Escritório isométrico com mesas de trabalho em sete salas interligadas. Há {dados.postos.length} fichas disponíveis neste perfil.</p>
    <div className="iso-grade">
      {comCena && <div className="iso-vista">
        {renderizacao === '3d' && <div className="iso-filtros" role="group" aria-label="Salas do escritório">
          <button type="button" aria-pressed={vista === 'tudo'} onClick={() => ir('tudo')}>Ver tudo</button>
          {salas.map(s => <button key={s} type="button" aria-pressed={vista === s} onClick={() => ir(s)}>{SALAS_NOME[s]}</button>)}
        </div>}
        <div className="iso-palco" ref={palco} data-renderizacao={renderizacao} aria-describedby={descricao}>
          {!visivel ? <p className="iso-aviso">Escritório da família</p>
            : renderizacao === 'carregando' && <p className="iso-aviso" role="status">Abrindo o escritório…</p>}
          {renderizacao === 'lista' && <p className="iso-aviso" role="status">{superficie === 'inicio' ? 'Abra o escritório para ver a lista da equipe.' : 'A equipe está disponível na lista abaixo.'}</p>}
          <div className="iso-etiquetas" hidden={renderizacao !== '3d'}>
            {salas.map(s => <span key={s} className="iso-placa" aria-hidden="true" hidden={vista !== 'tudo' && vista !== s}
              ref={el => { if (el) placas.current.set(s, el); else placas.current.delete(s) }}>
              <Icone nome={ICONES_SALA[s]} />{SALAS_NOME[s]}
            </span>)}
            {dados.postos.map(({ membro: m, funcionario: f, balao }) => {
              const status = ESTADO[f.estado]
              return <button key={m.id} data-posto={m.id} data-estado={f.estado} type="button" className="iso-etiqueta"
                hidden={vista !== 'tudo' && vista !== m.sala} onClick={() => selecionar(m.id)}
                ref={el => { if (el) etiquetas.current.set(m.id, el); else etiquetas.current.delete(m.id) }}
                aria-label={`${m.nome}. ${f.semDado ? 'Ainda sem dado' : status.rotulo}.${balao ? ' ' + balao : ''} Abrir ficha.`}>
                {balao && <span className="iso-balao">{balao}</span>}
                <span className="iso-plaquinha"><Icone desenho={status.icone} /><span className="iso-curto">{m.curto}</span><span className="iso-inicial">{m.curto[0]}</span></span>
              </button>
            })}
          </div>
          {ampliar && <button type="button" className="iso-toque" aria-label="Abrir escritório em tela cheia" onClick={ampliar} />}
        </div>
      </div>}
      <aside className="iso-fila" aria-label="Precisa de você">
        <h3><Icone desenho={Hand} />Precisa de você{dados.total > 0 && <span className="iso-total">{dados.total}</span>}</h3>
        {dados.fila.length ? <ul>{dados.fila.map(t => <li key={t.pergunta.id}>
          <button type="button" onClick={() => selecionar(t.membro.id, t.pergunta.id)}>
            <img src={retrato(t.membro.id)} width={36} height={36} alt="" loading="lazy" />
            <span><b>{t.membro.nome}</b><small>{t.texto}</small>{t.valor && <strong className="iso-valor">{t.valor}</strong>}</span>
            <Icone desenho={ArrowUpRight} />
          </button>
        </li>)}</ul> : <p>{dados.postos.some(p => !p.funcionario.semDado) ? 'Nenhuma tarefa pendente.' : 'Ainda sem dado.'}</p>}
      </aside>
    </div>
    {listar && <EquipeIsometrica dados={dados} selecionar={selecionar} />}
  </section>
}

export function EscritorioIsometrico({ superficie }: { superficie: 'inicio' | 'escritorio' }) {
  const { familia, sessao } = useApp()
  const modo = useModoFuncionario()
  if (!familia || (superficie === 'inicio' && modo === 'desligado')) return null
  return <EscritorioAutorizado key={[familia.id, familia.membroId, familia.papel, sessao?.userId].join(':')} superficie={superficie} comCena={modo === 'completo'} />
}

function EscritorioAutorizado({ superficie, comCena }: { superficie: 'inicio' | 'escritorio'; comCena: boolean }) {
  const { api, familia, sessao, oculto } = useApp()
  const destino = useDestino()
  const invalidacao = useInvalidacao(api, familia!.id)
  const { e, perguntas, estado, atualizar, responder } = useEscritorio()
  const papel = familia!.papel
  const funcs = useEquipeCompleta(e?.funcionarios, papel === 'casal' && !!e, invalidacao)
  const dado = useMemo(() => e ? { ...e, funcionarios: funcs, precisa_de_voce: perguntas ?? e.precisa_de_voce } : null, [e, funcs, perguntas])
  const dados = useMemo(() => ({
    ...dadosIsometricos(dado, { papel, dono: sessao?.dono, oculto }),
    ...(papel === 'casal' && e ? { total: totalPendencias(e) } : {}),
  }), [dado, e, papel, sessao?.dono, oculto])
  const [amplo, ampliar] = useState(false)
  const [selecionado, selecionar] = useState<{ id: string; pergunta?: string } | null>(() => {
    if (superficie !== 'escritorio' || typeof location === 'undefined') return null
    const id = new URLSearchParams(location.hash.split('?')[1]).get('f')
    return id ? { id } : null
  })
  const donoDoDestino = superficie === 'escritorio' && destino.secao === 'tarefa'
    ? dados.fila.find(x => x.pergunta.id === destino.entidade)?.membro.id : undefined
  useEffect(() => {
    if (donoDoDestino) selecionar({ id: donoDoDestino, pergunta: destino.entidade })
  }, [donoDoDestino, destino.entidade])
  const aberto = dados.postos.find(p => p.membro.id === selecionado?.id)
  const tarefa = dados.fila.find(p => p.pergunta.id === selecionado?.pergunta) || dados.fila.find(p => p.membro.id === aberto?.membro.id)
  const fechar = () => selecionar(null)
  const tocar: Selecionar = (id, pergunta) => selecionar({ id, pergunta })
  const eFicha: EscritorioHoje = { trabalhando: [], entregue: [], ...(papel === 'casal' ? dado : null), funcionarios: dados.postos.map(p => p.funcionario), precisa_de_voce: dados.perguntas }

  return <>
    {superficie === 'escritorio' && estado === 'erro' && <p role="alert">Não foi possível conferir a equipe. <button type="button" className="lnk" onClick={atualizar}>Tentar de novo</button></p>}
    {superficie === 'escritorio' && estado === 'ok' && funcs.falhou && <p role="alert">Não foi possível conferir toda a equipe. <button type="button" className="lnk" onClick={funcs.repetir}>Tentar de novo</button></p>}
    {!amplo ? <PainelIsometrico {...{ dados, superficie, comCena }} selecionar={tocar} ampliar={superficie === 'inicio' ? () => ampliar(true) : undefined} />
      : <div className={comCena ? 'iso-reserva' : undefined} aria-hidden="true" />}
    {amplo && !aberto && <Sheet titulo="Escritório da família" fechar={() => ampliar(false)}>
      <div className="iso-expandido"><PainelIsometrico dados={dados} superficie="folha" comCena={comCena} selecionar={tocar} /></div>
    </Sheet>}
    {aberto && (papel === 'casal' && (aberto.membro.id !== 'analista' || sessao?.dono)
      ? <Suspense fallback={<Carregando />}><FichaFuncionario key={aberto.membro.id} f={aberto.funcionario} e={eFicha} responder={responder} fechar={fechar} perguntaInicial={selecionado?.pergunta} omitirNumeros={aberto.funcionario.semDado} /></Suspense>
      : <Sheet titulo={aberto.membro.nome} fechar={fechar} lado>
          {tarefa ? <PerguntaCard key={tarefa.pergunta.id} p={tarefa.pergunta} quem={aberto.membro.nome} responder={responder} semQuem />
            : <p>{aberto.funcionario.semDado ? 'Ainda sem dado. ' : ''}{aberto.membro.papel}</p>}
        </Sheet>)}
  </>
}
