import { Eye, EyeOff, Monitor, Moon, Smartphone, Sun } from 'lucide-react'
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/figtree'
import '@fontsource-variable/bricolage-grotesque'
import './base.css'
import { carregarDadosInicio, type DadosInicio } from './dadosExemplo'
import { PrivacidadePropostas } from './comuns/privacidade'
import { medirNumeros } from './medicao'

export type Tema = 'claro' | 'escuro'
export type Dispositivo = 'celular' | 'desktop'
export interface PropsProposta { dados: DadosInicio; tema: Tema; dispositivo: Dispositivo }

const letras = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'] as const
type Letra = typeof letras[number]
type Escolha = Letra | 'atual' | 'comparar'
const abas: { id: Escolha; texto: string }[] = [
  ...letras.map(id => ({ id, texto: id.toUpperCase() })),
  { id: 'atual', texto: 'Atual' },
  { id: 'comparar', texto: 'Comparar' },
]

const modulos = import.meta.glob<{ Proposta: ComponentType<PropsProposta> }>('./[a-k]/Proposta.tsx')
function propostaDe(id: Letra) {
  return lazy(async () => ({ default: (await modulos[`./${id}/Proposta.tsx`]()).Proposta }))
}
const propostas = { a: propostaDe('a'), b: propostaDe('b'), c: propostaDe('c'), d: propostaDe('d'), e: propostaDe('e'), f: propostaDe('f'), g: propostaDe('g'), h: propostaDe('h'), i: propostaDe('i'), j: propostaDe('j'), k: propostaDe('k') }

function lerEscolha(): Escolha {
  return abas.find(aba => location.hash === `#/${aba.id}`)?.id ?? 'a'
}

function Quadro({ escolha, dispositivo, oculto, children }: {
  escolha: Exclude<Escolha, 'comparar'>; dispositivo: Dispositivo; oculto: boolean; children: ReactNode
}) {
  const quadro = useRef<HTMLDivElement>(null)
  const conteudo = useRef<HTMLDivElement>(null)
  const [numeros, setNumeros] = useState<string[]>([])

  useLayoutEffect(() => {
    const area = quadro.current!
    const painel = conteudo.current!
    let agendado = 0
    const observar = () => {
      cancelAnimationFrame(agendado)
      agendado = requestAnimationFrame(() => {
        const novos = oculto ? [] : medirNumeros(area)
        setNumeros(anteriores => anteriores.length === novos.length && anteriores.every((n, i) => n === novos[i]) ? anteriores : novos)
      })
    }
    const tamanho = new ResizeObserver(observar)
    const mutacao = new MutationObserver(observar)
    tamanho.observe(area)
    tamanho.observe(painel)
    mutacao.observe(painel, { childList: true, subtree: true, characterData: true, attributes: true })
    document.fonts.addEventListener('loadingdone', observar)
    observar()
    return () => {
      cancelAnimationFrame(agendado)
      tamanho.disconnect()
      mutacao.disconnect()
      document.fonts.removeEventListener('loadingdone', observar)
    }
  }, [oculto, dispositivo])

  const rotulo = escolha === 'atual' ? 'Início atual' : `Proposta ${escolha.toUpperCase()}`
  return <section className="lab-amostra" data-dispositivo={dispositivo} aria-label={rotulo}>
    <p className="lab-contagem" aria-live="polite">{rotulo} · {oculto ? 'Valores ocultos' : `${numeros.length} números financeiros acima da dobra`}</p>
    <div ref={quadro} className="lab-quadro" tabIndex={0} aria-label={`Prévia rolável · ${rotulo}`}>
      <div className="lab-conteudo" ref={conteudo} data-proposta={escolha}>{children}</div>
    </div>
    {!oculto && numeros.length > 0 && <details className="lab-medicao" open>
      <summary>Valores acima da dobra</summary>
      <ol>{numeros.map((n, i) => <li key={i}>{n}</li>)}</ol>
    </details>}
  </section>
}

function Atual() {
  return <div className="lab-mensagem">
    <h1>Início atual</h1>
    <p>A referência abre no aplicativo de exemplo, com a navegação e os controles originais.</p>
    <a href="../../#/inicio" target="_blank" rel="noreferrer">Abrir Início de exemplo</a>
  </div>
}

export function Propostas() {
  const [escolha, setEscolha] = useState(lerEscolha)
  const [tema, setTema] = useState<Tema>('claro')
  const [dispositivo, setDispositivo] = useState<Dispositivo>('celular')
  const [oculto, setOculto] = useState(false)
  const [dados, setDados] = useState<DadosInicio>()
  const [erro, setErro] = useState(false)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    const mudar = () => setEscolha(lerEscolha())
    window.addEventListener('hashchange', mudar)
    return () => window.removeEventListener('hashchange', mudar)
  }, [])

  useEffect(() => {
    let ativo = true
    carregarDadosInicio().then(
      resultado => { if (ativo) setDados(resultado) },
      () => { if (ativo) setErro(true) },
    )
    return () => { ativo = false }
  }, [tentativa])

  const visiveis = escolha === 'comparar' ? letras : [escolha]
  return <div className="lab" data-theme={tema}>
    <header className="lab-barra">
      <strong>Laboratório de propostas</strong>
      <nav aria-label="Propostas">
        {abas.map(({ id, texto }) => <a key={id} href={`#/${id}`} aria-current={escolha === id ? 'page' : undefined}>{texto}</a>)}
      </nav>
      <div className="lab-controles">
        <button type="button" aria-label="Tema escuro" aria-pressed={tema === 'escuro'} onClick={() => setTema(tema === 'claro' ? 'escuro' : 'claro')}>
          {tema === 'claro' ? <Moon aria-hidden /> : <Sun aria-hidden />}
        </button>
        <button type="button" aria-label="Visualizar celular (375 × 812)" aria-pressed={dispositivo === 'celular'} onClick={() => setDispositivo('celular')}><Smartphone aria-hidden /></button>
        <button type="button" aria-label="Visualizar desktop (1280 × 800)" aria-pressed={dispositivo === 'desktop'} onClick={() => setDispositivo('desktop')}><Monitor aria-hidden /></button>
        <button type="button" aria-label="Ocultar valores" aria-pressed={oculto} onClick={() => setOculto(!oculto)}>{oculto ? <EyeOff aria-hidden /> : <Eye aria-hidden />}</button>
      </div>
    </header>
    <main className="lab-amostras" data-comparacao={escolha === 'comparar'}>
      <PrivacidadePropostas.Provider value={oculto}>
        {visiveis.map(id => {
          const Tela = id === 'atual' ? null : propostas[id]
          return <Quadro key={id} escolha={id} dispositivo={dispositivo} oculto={oculto}>
            {Tela ? dados ? <Suspense fallback={<p className="lab-mensagem" role="status">Carregando proposta…</p>}>
              <Tela dados={dados} tema={tema} dispositivo={dispositivo} />
            </Suspense> : erro ? <div className="lab-mensagem">
              <p role="alert">Não foi possível carregar os dados de exemplo.</p>
              <button type="button" onClick={() => { setErro(false); setTentativa(n => n + 1) }}>Tentar de novo</button>
            </div> : <p className="lab-mensagem" role="status">Carregando dados de exemplo…</p> : <Atual />}
          </Quadro>
        })}
      </PrivacidadePropostas.Provider>
    </main>
  </div>
}

export function montarPropostas() {
  createRoot(document.getElementById('propostas-root')!).render(<Propostas />)
}
