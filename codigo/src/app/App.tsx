import { textoPrivado } from '../lib/olho'
import './navegacao.css'
import './abas.css'
import '@fontsource-variable/inter'
import { Icone } from '../componentes/Icone'
import { useDestino, focarDestino } from './destinos'
import { Acolhimento } from '../componentes/Acolhimento'
import { AgenteDaAba, AjudaDaAba } from '../telas/escritorio/AgenteDaAba'
import { lazy, Suspense, useEffect, useState, useRef } from 'react'
import { FlaskConical } from 'lucide-react'
import { useAcoes, useDadosDoDia, useFolhaLancar, useOlhoApp, useSessaoAtual } from './contexto'
import { Sheet } from '../componentes/base'
import { OlhoDaAba, SeloDaAba } from '../componentes/ControlesDaAba'
import { Marca } from '../componentes/Marca'
import { Entrar } from '../telas/entrar/Entrar'
const PrimeiroUso = lazy(() => import('../telas/primeiro-uso/PrimeiroUso').then(m => ({ default: m.PrimeiroUso })))
const Inicio = lazy(() => import('../telas/inicio/Inicio').then(m => ({ default: m.Inicio })))
const InicioClassico =
  import.meta.env.MODE === 'exemplo' || import.meta.env.MODE === 'demo'
    ? lazy(() => import('../telas/inicio/InicioClassico').then(m => ({ default: m.InicioClassico })))
    : null
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
import { rotaDoHash, rotaPermitida, type Rota } from '../lib/rotas'
import { ehAtalho, lerAtalho } from '../lib/atalho'
export type { Rota } from '../lib/rotas'

import { Carregando } from '../componentes/Carregando'
import { GRUPOS, menuDoPapel } from '../componentes/menu'

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

const hashClassico = (hash: string) => /^#\/?inicio-classico(?:\?|$)/.test(hash)
import { ir } from '../lib/rotas'
export { ir } from '../lib/rotas'

export function App() {
  const { sessao, familia, api, erro } = useSessaoAtual()
  const { abrirLancar } = useAcoes()
  const { semRede } = useDadosDoDia()
  const { oculto } = useOlhoApp()
  const { lancarAberto } = useFolhaLancar()
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const destino = useDestino()
  useEffect(() => {
    if (!familia || !destino.secao || rotaPermitida(destino.rota, familia.papel) !== destino.rota) return
    return focarDestino(destino)
  }, [familia?.papel, destino.rota, destino.secao, destino.entidade, destino.periodo])
  const [hash, setHash] = useState(() => location.hash)
  const rota = rotaDoHash(hash)
  const [mais, setMais] = useState(false)
  const [carregou, setCarregou] = useState(false)
  useEffect(() => {
    const f = () => {
      setHash(location.hash)
      setMais(false)
      window.scrollTo(0, 0)
    }
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  useEffect(() => {
    const t = setTimeout(() => setCarregou(true), 400)
    return () => clearTimeout(t)
  }, [])
  // E9: o Atalho do iPhone abre #/lancar?valor=&loja=&cartao= e o Lançar abre preenchido. Nunca salva sozinho:
  // a pessoa confere e toca no nome dela. O endereço volta pro Início (voltar no navegador não reabre o Lançar).
  useEffect(() => {
    const ver = () => {
      if (!familia || !ehAtalho(location.hash)) return
      const a = lerAtalho(location.hash)
      history.replaceState(null, '', location.pathname + location.search + '#/inicio')
      setHash('#/inicio')
      if (!a || familia.papel === 'equipe') return
      // o atalho do ícone do app (#/lancar sem nada) abre o Anotar limpo; só o iPhone manda valor, loja ou cartão
      if (a.valor === undefined && !a.loja && !a.cartao && !a.erro) return abrirLancar({})
      abrirLancar({ valor: a.valor, descricao: a.loja, atalho: { cartao: a.cartao, erro: a.erro } })
    }
    ver()
    addEventListener('hashchange', ver)
    return () => removeEventListener('hashchange', ver)
  }, [abrirLancar, familia])
  const folhaAberta = useRef(false)
  folhaAberta.current = !!lancarAberto
  useEffect(() => {
    if (folhaAberta.current || document.activeElement?.closest('input,textarea,select,[role="dialog"]')) return
    tituloRef.current?.focus?.({ preventScroll: true })
  }, [rota])
  useEffect(() => {
    if (sessao) setCarregou(true)
  }, [sessao])

  if (!sessao) {
    if (!carregou) return <Carregando />
    return (
      <Suspense fallback={<Carregando />}>
        <Entrar />
        <AjudaDaAba rota="entrar" />
      </Suspense>
    )
  }
  const equipe = familia?.papel === 'equipe'
  // a equipe nunca vê o primeiro uso (tela de criar família e limites em R$), nem digitando o endereço
  // só o casal cria família: a equipe e a pessoa da família (filha) nunca veem o primeiro uso
  if (!familia || (rota === 'primeiro-uso' && familia.papel === 'casal'))
    return (
      <Suspense fallback={<Carregando />}>
        <PrimeiroUso />
      </Suspense>
    )
  const r: Rota = rotaPermitida(rota, familia.papel, sessao.dono)
  const { lateral, inferior, mais: extras } = menuDoPapel(familia.papel, !!sessao.dono)
  const Classico = r === 'inicio' && api.modo === 'exemplo' && sessao.dono && hashClassico(hash) ? InicioClassico : null
  const [subt, titulo] =
    r === 'inicio'
      ? [textoPrivado(familia.nome, oculto), Classico ? cap(mesLongo(hojeRecife())) : 'Início']
      : equipe && r !== 'privacidade'
        ? ['itens, lista de compras e gás', 'Casa']
        : TITULO[r] || ['', '']
  const link = (m: (typeof lateral)[number], curto = m.nome) => (
    <a key={m.r} href={'#/' + m.r} aria-current={r === m.r ? 'page' : undefined}>
      <Icone nome={m.icone} />
      {curto}
    </a>
  )

  return (
    <>
      <nav className="rail central-rail" aria-label="Telas no computador">
        <div className="brand">
          <Marca />
          <span>
            <b>Central da Família</b>
            <small>{textoPrivado(familia.nome, oculto)}</small>
          </span>
        </div>
        {!equipe && (
          <button className="lancar" type="button" onClick={() => abrirLancar()}>
            <Icone nome="lancar" />
            Anotar
          </button>
        )}
        {GRUPOS.map(grupo => {
          const itens = lateral.filter(m => m.grupo === grupo)
          return (
            itens.length > 0 && (
              <div className="rail-grupo" role="group" key={grupo} aria-label={grupo}>
                <span>{grupo}</span>
                {itens.map(m => link(m))}
              </div>
            )
          )
        })}
        <p className="foot">{api.modo === 'exemplo' ? 'Modo exemplo: nada sai deste aparelho' : 'Dados da família'}</p>
      </nav>
      <main id="main" aria-labelledby="titulo-tela">
        <header className="top aba-cabecalho">
          <div className="tt">
            <h1 ref={tituloRef} tabIndex={-1} id="titulo-tela">
              {titulo}
            </h1>
            <small>{subt}</small>
          </div>
          <SeloDaAba />
          {!equipe && <OlhoDaAba />}
          {equipe && (
            <a className="btn line central-privacidade" href="#/privacidade">
              <Icone nome="privacidade" />
              Privacidade
            </a>
          )}
        </header>
        {api.modo === 'exemplo' && r === 'inicio' && (
          <p className="exemplo-faixa">
            <Icone desenho={FlaskConical} aria-hidden="true" />
            Exemplo: você está vendo como {textoPrivado(familia.membroNome, oculto)}, no dia {dataCurta(hojeRecife())}.
            Pode mexer à vontade: nada é gravado de verdade.
          </p>
        )}
        {semRede && api.modo !== 'exemplo' && !erro && (
          <p className="todo warn" role="alert">
            Sem internet agora. O que aparece pode estar velho e nada novo é salvo até a internet voltar.
          </p>
        )}
        {erro && (
          <p className="todo warn" role="alert">
            {erro}
          </p>
        )}
        <Acolhimento key={[sessao.userId, familia.id].join(':')} />
        {r !== 'inicio' && r !== 'escritorio' && <AgenteDaAba key={r} rota={r} />}
        <div className={r === 'inicio' ? undefined : 'aba-conteudo'}>
          <Suspense key={'tela:' + r + (Classico ? ':classico' : '')} fallback={<Carregando />}>
            {r === 'inicio' && (Classico ? <Classico /> : <Inicio />)}
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
        </div>
        {(r === 'inicio' || r === 'escritorio') && <AgenteDaAba key={r} rota={r} semCena />}
        <AjudaDaAba rota={r} />
      </main>
      <nav
        className={'tabbar central-mobile' + (equipe ? ' so1' : '')}
        aria-label={equipe ? 'Anotar' : 'Telas no celular'}
      >
        {equipe ? (
          <button className="plus anotar" type="button" onClick={() => abrirLancar()}>
            <Icone nome="lancar" aria-hidden="true" />
            Anotar compra
          </button>
        ) : (
          <>
            {inferior.filter(m => m.r !== 'cartoes').map(m => link(m, m.r === 'orcamento' ? 'Orçamento' : m.nome))}
            <button
              className="plus tabbar-lancar"
              type="button"
              onClick={() => abrirLancar()}
              aria-label="Anotar gasto"
            >
              <Icone nome="lancar" aria-hidden="true" />
              <span>Anotar</span>
            </button>
            {inferior.filter(m => m.r === 'cartoes').map(m => link(m))}
            <button
              className="central-mais"
              type="button"
              onClick={() => setMais(true)}
              aria-expanded={mais}
              data-ativo={extras.some(m => m.r === r) || undefined}
            >
              <Icone nome="mais" />
              Mais
            </button>
          </>
        )}
      </nav>
      {mais && !equipe && (
        <Sheet titulo="Mais telas" fechar={() => setMais(false)}>
          <ul className="list central-extras">
            {extras.map(m => (
              <li key={m.r}>
                <button
                  className="li"
                  aria-current={r === m.r ? 'page' : undefined}
                  type="button"
                  onClick={() => {
                    setMais(false)
                    ir(m.r)
                  }}
                >
                  <span className="tile">
                    <Icone nome={m.icone} />
                  </span>
                  <span className="m">
                    <b>{m.nome}</b>
                    <small>{(TITULO[m.r] || ['', ''])[0]}</small>
                  </span>
                  <Icone nome="abrir" className="muted" />
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
      {lancarAberto && (
        <Suspense fallback={<Carregando />}>
          <Lancar key={JSON.stringify([api.modo, sessao.userId, familia.id])} />
        </Suspense>
      )}
    </>
  )
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
