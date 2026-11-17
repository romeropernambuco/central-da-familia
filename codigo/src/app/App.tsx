import { Icone } from '../componentes/Icone'
import { useDestino, focarDestino } from './destinos'
import { Acolhimento } from '../componentes/Acolhimento'
import { AgenteDaAba, AjudaDaAba } from '../componentes/AgenteDaAba'
import { lazy, Suspense, useEffect, useState, useRef, type ReactNode } from 'react'
import { FlaskConical } from 'lucide-react'
import { useApp } from './contexto'
import { Sheet } from '../componentes/base'
import { Marca } from '../componentes/Marca'
import { textoPrivado } from '../componentes/privacidade'
import { Entrar } from '../telas/entrar/Entrar'
const PrimeiroUso = lazy(() => import('../telas/primeiro-uso/PrimeiroUso').then(m => ({ default: m.PrimeiroUso })))
const Inicio = lazy(() => import('../telas/inicio/Inicio').then(m => ({ default: m.Inicio })))
const Lancar = lazy(() => import('../telas/lancar/Lancar').then(m => ({ default: m.Lancar })))
const Lancamentos = lazy(() => import('../telas/lancamentos/Lancamentos').then(m => ({ default: m.Lancamentos })))
const MeuOrcamento = lazy(() => import('../telas/meu-orcamento/MeuOrcamento').then(m => ({ default: m.MeuOrcamento })))
const Cartoes = lazy(() => import('../telas/cartoes/Cartoes').then(m => ({ default: m.Cartoes })))
const Casa = lazy(() => import('../telas/casa/Casa').then(m => ({ default: m.Casa })))
const Escritorio = lazy(() => import('../telas/escritorio/Escritorio').then(m => ({ default: m.Escritorio })))
const Guardado = lazy(() => import('../telas/guardado/Guardado').then(m => ({ default: m.Guardado })))
const Planejamento = lazy(() => import('../telas/planejamento/Planejamento').then(m => ({ default: m.Planejamento })))
const Painel = lazy(() => import('../telas/painel/Painel').then(m => ({ default: m.Painel })))
const Privacidade = lazy(() => import('../telas/privacidade/Privacidade').then(m => ({ default: m.Privacidade })))
const Ajustes = lazy(() => import('../telas/ajustes/Ajustes').then(m => ({ default: m.Ajustes })))
const Desejos = lazy(() => import('../telas/desejos/Desejos').then(m => ({ default: m.Desejos })))
import { dataCurta, mesLongo, hojeRecife } from '../lib/formato'
import { podeVerNoMenu, rotaDoHash, rotaPermitida, type Rota } from './rotas'
import { ehAtalho, lerAtalho } from '../lib/atalho'
export type { Rota } from './rotas'

import { Carregando } from '../componentes/Carregando'

const MENU: { r: Rota; nome: string; ico: ReactNode }[] = [
  { r: 'inicio', nome: 'Início', ico: <Icone nome="inicio" /> },
  { r: 'lancamentos', nome: 'Gastos e entradas', ico: <Icone nome="lancamentos" /> },
  { r: 'orcamento', nome: 'Meu orçamento', ico: <Icone nome="orcamento" /> },
  { r: 'casa', nome: 'Casa', ico: <Icone nome="casa" /> },
  // E8: a calculadora de desejos (a filha também abre: vê só os dela, sem 2029)
  { r: 'desejos', nome: 'Desejos', ico: <Icone nome="desejos" /> },
  { r: 'guardado', nome: 'Guardado', ico: <Icone nome="guardado" /> },
  { r: 'cartoes', nome: 'Cartões', ico: <Icone nome="cartoes" /> },
  { r: 'planejamento', nome: 'Planejamento', ico: <Icone nome="planejamento" /> },
  { r: 'escritorio', nome: 'Escritório', ico: <Icone nome="escritorio" /> },
  { r: 'ajustes', nome: 'Família e ajustes', ico: <Icone nome="ajustes" /> },
]

const TITULO: Record<string, [string, string]> = {
  lancamentos: ['gastos e entradas que vocês anotaram', 'Gastos e entradas'],
  orcamento: ['hoje, semana e fim do mês', 'Meu orçamento'],
  guardado: ['quanto rendeu hoje', 'Guardado'],
  casa: ['feira, prestadores, gás e folha', 'Casa'],
  cartoes: ['faturas e "E se eu comprar?"', 'Cartões'],
  planejamento: ['limites, reserva, rendas e metas', 'Planejamento'],
  desejos: ['o que quero, quando e se cabe', 'Desejos'],
  escritorio: ['quem ajuda você a acompanhar', 'Escritório'],
  ajustes: ['quem está na família e aparência', 'Família e ajustes'],
  privacidade: ['seu papel e seus dados', 'Privacidade'],
  painel: ['painel do dono do produto', 'Os 4 números'],
}

function lerRota(): Rota { return rotaDoHash(location.hash) }
import { ir } from './rotas'
export { ir } from './rotas'

export function App() {
  const { sessao, familia, api, lancarAberto, erro, abrirLancar, semRede, oculto, alternarOculto } = useApp()
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const destino = useDestino()
  useEffect(() => {
    if (!familia || !destino.secao || rotaPermitida(destino.rota, familia.papel) !== destino.rota) return
    return focarDestino(destino)
  }, [familia?.papel, destino.rota, destino.secao, destino.entidade, destino.periodo])
  const [rota, setRota] = useState<Rota>(lerRota())
  const [mais, setMais] = useState(false)
  const [carregou, setCarregou] = useState(false)
  useEffect(() => {
    const f = () => { setRota(lerRota()); window.scrollTo(0, 0) }
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  useEffect(() => { const t = setTimeout(() => setCarregou(true), 400); return () => clearTimeout(t) }, [])
  // E9: o Atalho do iPhone abre #/lancar?valor=&loja=&cartao= e o Lançar abre preenchido. Nunca salva sozinho:
  // a pessoa confere e toca no nome dela. O endereço volta pro Início (voltar no navegador não reabre o Lançar).
  useEffect(() => {
    const ver = () => {
      if (!familia || !ehAtalho(location.hash)) return
      const a = lerAtalho(location.hash)
      history.replaceState(null, '', location.pathname + location.search + '#/inicio')
      setRota('inicio')
      if (!a || familia.papel === 'equipe') return
      abrirLancar({ valor: a.valor, descricao: a.loja, atalho: { cartao: a.cartao, erro: a.erro } })
    }
    ver()
    addEventListener('hashchange', ver)
    return () => removeEventListener('hashchange', ver)
  }, [familia?.id])
  useEffect(() => {
    if (lancarAberto || document.activeElement?.closest('input,textarea,select,[role="dialog"]')) return
    tituloRef.current?.focus?.({ preventScroll: true })
  }, [rota])
  useEffect(() => { if (sessao) setCarregou(true) }, [sessao])

  if (!sessao) {
    if (!carregou) return <Carregando />
    return <Suspense fallback={<Carregando />}><Entrar /><AjudaDaAba rota="entrar" /></Suspense>
  }
  const equipe = familia?.papel === 'equipe'
  // a equipe nunca vê o primeiro uso (tela de criar família e limites em R$), nem digitando o endereço
  // só o casal cria família: a equipe e a pessoa da família (filha) nunca veem o primeiro uso
  if (!familia || (rota === 'primeiro-uso' && familia.papel === 'casal')) return <Suspense fallback={<Carregando />}><PrimeiroUso /></Suspense>
  const r: Rota = rotaPermitida(rota, familia.papel, sessao.dono)
  const permitidas = [...MENU.filter(m => podeVerNoMenu(m.r, familia.papel)), ...(equipe ? [{ r: 'privacidade' as Rota, nome: 'Privacidade', ico: <Icone nome="privacidade" /> }] : [])]
  const [subt, titulo] = r === 'inicio' ? [textoPrivado(familia.nome, oculto), cap(mesLongo(hojeRecife()))] : equipe && r !== 'privacidade' ? ['itens, lista de compras e gás', 'Casa'] : TITULO[r] || ['', '']
  const navAtivo = r === 'privacidade' || r === 'painel' ? 'ajustes' : r

  return (
    <>
      <nav className="rail" aria-label="Telas">
        <div className="brand"><Marca /><span><b>Central da Família</b><small>{textoPrivado(familia.nome, oculto)}</small></span></div>
        {/* C4: a equipe anota pelo botão grande de baixo (1 só na tela, também no computador) */}
        {!equipe && <button className="lancar" type="button" onClick={() => abrirLancar()}><Icone nome="lancar" />Anotar</button>}
        {permitidas.map(m => (
          <a data-grupo={m.r === 'desejos' || m.r === 'escritorio' ? 'inicio' : undefined} key={m.r} href={'#/' + m.r} aria-current={navAtivo === m.r ? 'page' : undefined}>{m.ico}{m.nome}</a>
        ))}
        <p className="foot">{api.modo === 'exemplo' ? 'Modo exemplo: nada sai deste aparelho' : 'Dados da família'}</p>
      </nav>
      <main id="main">
        <header className="top">
          <div className="tt"><small>{subt}</small><h1 ref={tituloRef} tabIndex={-1} id="titulo-tela">{titulo}</h1></div>
          <span className={'sync' + (api.modo === 'exemplo' ? ' ex' : semRede ? ' off' : '')} role="status"><Icone nome={semRede ? 'erro' : api.modo === 'exemplo' ? 'ajuda' : 'salvo'} />{api.modo === 'exemplo' ? 'exemplo' : semRede ? 'Sem internet' : 'Conectado'}</span>
          {!equipe && <button className="iconbtn olho" type="button" onClick={alternarOculto} aria-pressed={oculto} aria-label={oculto ? 'Mostrar os valores' : 'Esconder os valores'} title={oculto ? 'Mostrar os valores' : 'Esconder os valores'}>{oculto ? <Icone nome="olhoFechado" /> : <Icone nome="olho" />}</button>}
          {<button className="btn line mais" type="button" onClick={() => setMais(true)} aria-label={equipe ? 'Mais: privacidade' : familia.papel === 'casal' ? 'Mais telas: desejos, guardado, cartões, planejamento, escritório e ajustes' : 'Mais telas: desejos, ajustes e privacidade'}><Icone nome="mais" aria-hidden="true" />Mais</button>}
        </header>
        {api.modo === 'exemplo' && r === 'inicio' && (
          <p className="exemplo-faixa"><Icone desenho={FlaskConical} aria-hidden="true" />Exemplo: você está vendo como {textoPrivado(familia.membroNome, oculto)}, no dia {dataCurta(hojeRecife())}. Pode mexer à vontade: nada é gravado de verdade.</p>
        )}
        {semRede && api.modo !== 'exemplo' && !erro && <p className="todo warn" role="alert">Sem internet agora. O que aparece pode estar velho e nada novo é salvo até a internet voltar.</p>}
        {erro && <p className="todo warn" role="alert">{erro}</p>}
        <Acolhimento key={[sessao.userId, familia.id].join(':')} />
        {r !== 'inicio' && r !== 'escritorio' && <AgenteDaAba key={r} rota={r} />}
        <Suspense key={'tela:' + r} fallback={<Carregando />} >
        {r === 'inicio' && <Inicio />}
        {r === 'lancamentos' && <Lancamentos />}
        {r === 'orcamento' && <MeuOrcamento />}
        {r === 'casa' && <Casa />}
        {r === 'guardado' && <Guardado />}
        {r === 'cartoes' && <Cartoes />}
        {r === 'planejamento' && <Planejamento />}
        {r === 'desejos' && <Desejos />}
        {r === 'escritorio' && <Escritorio />}
        {r === 'ajustes' && <Ajustes />}
        {r === 'privacidade' && <Privacidade />}
        {r === 'painel' && <Painel />}
        </Suspense>
        {(r === 'inicio' || r === 'escritorio') && <AgenteDaAba key={r} rota={r} semCena />}
        <AjudaDaAba rota={r} />
      </main>
      {/* C4 (decisão do dono, 14/11): a equipe da casa só tem 1 tela; no lugar da barra de 1 aba, 1 botão grande */}
      <nav className={'tabbar' + (equipe ? ' so1' : '')} aria-label={equipe ? 'Anotar' : 'Telas'}>
        {equipe ? (
          <button className="plus anotar" type="button" onClick={() => abrirLancar()}><Icone nome="lancar" aria-hidden="true" />Anotar compra</button>
        ) : (
          <>
            {MENU.slice(0, 2).map(m => <a key={m.r} href={'#/' + m.r} aria-current={navAtivo === m.r ? 'page' : undefined}>{m.ico}{m.nome}</a>)}
            <div className="tabbar-lancar"><button className="plus" type="button" onClick={() => abrirLancar()} aria-label="Anotar gasto"><Icone nome="lancar" aria-hidden="true" /></button><span>Anotar</span></div>
            {MENU.slice(2, 4).map(m => <a key={m.r} href={'#/' + m.r} aria-current={navAtivo === m.r ? 'page' : undefined}>{m.ico}{m.r === 'orcamento' ? 'Orçamento' : m.nome}</a>)}
          </>
        )}
      </nav>
      {mais && (
        <Sheet titulo="Mais telas" fechar={() => setMais(false)}>
          <ul className="list">
            {[...MENU.slice(4).filter(m => podeVerNoMenu(m.r, familia.papel)), { r: 'privacidade' as Rota, nome: 'Privacidade', ico: <Icone nome="privacidade" /> }, ...(sessao.dono ? [{ r: 'painel' as Rota, nome: 'Painel dos 4 números', ico: <Icone nome="painel" /> }] : [])].map(m => (
              <li key={m.r}>
                <button className="li" aria-current={navAtivo === m.r ? 'page' : undefined} type="button" onClick={() => { setMais(false); ir(m.r) }}>
                  <span className="tile">{m.ico}</span><span className="m"><b>{m.nome}</b><small>{(TITULO[m.r] || ['', ''])[0]}</small></span><Icone nome="abrir" className="muted" />
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
      {lancarAberto && <Suspense fallback={<Carregando />}><Lancar key={JSON.stringify([api.modo, sessao.userId, familia.id])} /></Suspense>}
    </>
  )
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

