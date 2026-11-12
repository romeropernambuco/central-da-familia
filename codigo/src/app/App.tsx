import { useEffect, useState, type ReactNode } from 'react'
import { Building2, CreditCard, House, ListChecks, Plus, Settings2, ShoppingBasket, Landmark, Wallet, Target, ChevronRight, ShieldCheck, Gauge, FlaskConical } from 'lucide-react'
import { useApp } from './contexto'
import { Sheet } from '../componentes/base'
import { Marca } from '../componentes/Marca'
import { Entrar } from '../telas/entrar/Entrar'
import { PrimeiroUso } from '../telas/primeiro-uso/PrimeiroUso'
import { Inicio } from '../telas/inicio/Inicio'
import { Lancar } from '../telas/lancar/Lancar'
import { Lancamentos } from '../telas/lancamentos/Lancamentos'
import { MeuOrcamento } from '../telas/meu-orcamento/MeuOrcamento'
import { Cartoes } from '../telas/cartoes/Cartoes'
import { Casa } from '../telas/casa/Casa'
import { Escritorio } from '../telas/escritorio/Escritorio'
import { Guardado } from '../telas/guardado/Guardado'
import { Planejamento } from '../telas/planejamento/Planejamento'
import { Painel } from '../telas/painel/Painel'
import { Privacidade } from '../telas/privacidade/Privacidade'
import { Ajustes } from '../telas/ajustes/Ajustes'
import { mesLongo, hojeRecife } from '../lib/formato'
import { rotaDoHash, rotaPermitida, type Rota } from './rotas'
export type { Rota } from './rotas'

const MENU: { r: Rota; nome: string; ico: ReactNode }[] = [
  { r: 'inicio', nome: 'Início', ico: <House size={22} /> },
  { r: 'lancamentos', nome: 'Lançamentos', ico: <ListChecks size={22} /> },
  { r: 'orcamento', nome: 'Meu orçamento', ico: <Wallet size={22} /> },
  { r: 'casa', nome: 'Casa', ico: <ShoppingBasket size={22} /> },
  { r: 'guardado', nome: 'Guardado', ico: <Landmark size={22} /> },
  { r: 'cartoes', nome: 'Cartões', ico: <CreditCard size={22} /> },
  { r: 'planejamento', nome: 'Planejamento', ico: <Target size={22} /> },
  { r: 'escritorio', nome: 'Escritório', ico: <Building2 size={22} /> },
  { r: 'ajustes', nome: 'Família e ajustes', ico: <Settings2 size={22} /> },
]

const TITULO: Record<string, [string, string]> = {
  lancamentos: ['o que entrou na conta, com lixeira', 'Lançamentos'],
  orcamento: ['valor do dia e cofrinho', 'Meu orçamento'],
  guardado: ['quanto rendeu hoje', 'Guardado'],
  casa: ['feira, prestadores, gás e folha', 'Casa'],
  cartoes: ['faturas e "E se eu comprar?"', 'Cartões'],
  planejamento: ['limites, reserva, rendas e metas', 'Planejamento'],
  escritorio: ['quem cuida e cobra por você', 'Escritório'],
  ajustes: ['quem está na família e aparência', 'Família e ajustes'],
  privacidade: ['termo, baixar e apagar dados', 'Privacidade'],
  painel: ['painel do dono do produto', 'Os 4 números'],
}

function lerRota(): Rota { return rotaDoHash(location.hash) }
export function ir(r: Rota) { location.hash = '#/' + r }

export function App() {
  const { sessao, familia, api, lancarAberto, erro, abrirLancar, semRede } = useApp()
  const [rota, setRota] = useState<Rota>(lerRota())
  const [mais, setMais] = useState(false)
  const [carregou, setCarregou] = useState(false)
  useEffect(() => {
    const f = () => { setRota(lerRota()); window.scrollTo(0, 0) }
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  useEffect(() => { const t = setTimeout(() => setCarregou(true), 400); return () => clearTimeout(t) }, [])
  useEffect(() => { if (sessao) setCarregou(true) }, [sessao])

  if (!sessao) {
    if (!carregou) return <div className="entrar"><p className="sub">Abrindo…</p></div>
    return <Entrar />
  }
  const equipe = familia?.papel === 'equipe'
  // a equipe nunca vê o primeiro uso (tela de criar família e limites em R$), nem digitando o endereço
  if (!familia || (rota === 'primeiro-uso' && !equipe)) return <PrimeiroUso />
  const r: Rota = rotaPermitida(rota, familia.papel, sessao.dono)
  const permitidas = MENU.filter(m => (!equipe || m.r === 'casa') && (m.r !== 'guardado' || familia.papel === 'casal'))
  const [subt, titulo] = r === 'inicio' ? [`${familia.nome} · Central da Família`, cap(mesLongo(hojeRecife()))] : equipe ? ['itens, lista de compras e gás', 'Casa'] : TITULO[r] || ['', '']
  const navAtivo = r === 'privacidade' || r === 'painel' ? 'ajustes' : r

  return (
    <>
      <nav className="rail" aria-label="Telas">
        <div className="brand"><Marca /><span><b>Central da Família</b><small>{familia.nome}</small></span></div>
        <button className="lancar" type="button" onClick={() => abrirLancar()}><Plus size={20} />Lançar</button>
        {permitidas.map(m => (
          <a key={m.r} href={'#/' + m.r} aria-current={navAtivo === m.r ? 'page' : undefined}>{m.ico}{m.nome}</a>
        ))}
        <p className="foot">{api.modo === 'exemplo' ? 'Modo exemplo: nada sai deste aparelho' : 'Salvo no banco da família'}</p>
      </nav>
      <main id="main">
        <header className="top">
          <div className="tt"><small>{subt}</small><h1>{titulo}</h1></div>
          <span className={'sync' + (api.modo === 'exemplo' ? ' ex' : semRede ? ' off' : '')} role="status"><i />{api.modo === 'exemplo' ? 'exemplo' : semRede ? 'sem internet' : 'salvo'}</span>
          {!equipe && <button className="iconbtn mais" type="button" onClick={() => setMais(true)} aria-label="Mais telas: guardado, cartões, planejamento, escritório e ajustes"><Settings2 size={22} /></button>}
        </header>
        {api.modo === 'exemplo' && r === 'inicio' && (
          <p className="exemplo-faixa"><FlaskConical size={18} aria-hidden="true" />Família Silva de exemplo. Pode mexer à vontade: nada é gravado de verdade.</p>
        )}
        {semRede && api.modo !== 'exemplo' && !erro && <p className="todo warn" role="alert">Sem internet agora. O que aparece pode estar velho e nada novo é salvo até a internet voltar.</p>}
        {erro && <p className="todo warn" role="alert">{erro}</p>}
        {r === 'inicio' && <Inicio />}
        {r === 'lancamentos' && <Lancamentos />}
        {r === 'orcamento' && <MeuOrcamento />}
        {r === 'casa' && <Casa />}
        {r === 'guardado' && <Guardado />}
        {r === 'cartoes' && <Cartoes />}
        {r === 'planejamento' && <Planejamento />}
        {r === 'escritorio' && <Escritorio />}
        {r === 'ajustes' && <Ajustes />}
        {r === 'privacidade' && <Privacidade />}
        {r === 'painel' && <Painel />}
      </main>
      <nav className={'tabbar' + (equipe ? ' so2' : '')} aria-label="Telas">
        {equipe ? (
          <>
            <a href="#/casa" aria-current="page"><ShoppingBasket size={22} />Casa</a>
            <button className="plus" type="button" onClick={() => abrirLancar()} aria-label="Lançar gasto da casa"><Plus size={28} strokeWidth={2.25} /></button>
            <span />
          </>
        ) : (
          <>
            {MENU.slice(0, 2).map(m => <a key={m.r} href={'#/' + m.r} aria-current={navAtivo === m.r ? 'page' : undefined}>{m.ico}{m.nome}</a>)}
            <button className="plus" type="button" onClick={() => abrirLancar()} aria-label="Lançar gasto"><Plus size={28} strokeWidth={2.25} /></button>
            {MENU.slice(2, 4).map(m => <a key={m.r} href={'#/' + m.r} aria-current={navAtivo === m.r ? 'page' : undefined}>{m.ico}{m.r === 'orcamento' ? 'Orçamento' : m.nome}</a>)}
          </>
        )}
      </nav>
      {mais && (
        <Sheet titulo="Mais telas" fechar={() => setMais(false)}>
          <ul className="list">
            {[...MENU.slice(4).filter(m => m.r !== 'guardado' || familia.papel === 'casal'), { r: 'privacidade' as Rota, nome: 'Privacidade', ico: <ShieldCheck size={22} /> }, ...(sessao.dono ? [{ r: 'painel' as Rota, nome: 'Painel dos 4 números', ico: <Gauge size={22} /> }] : [])].map(m => (
              <li key={m.r}>
                <button className="li" type="button" onClick={() => { setMais(false); ir(m.r) }}>
                  <span className="tile">{m.ico}</span><span className="m"><b>{m.nome}</b><small>{(TITULO[m.r] || ['', ''])[0]}</small></span><ChevronRight size={20} className="muted" />
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
      {lancarAberto && <Lancar />}
    </>
  )
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

