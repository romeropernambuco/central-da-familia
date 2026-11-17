import { createRoot } from 'react-dom/client'
import { useEffect, useState, type CSSProperties } from 'react'
import { EstadoVazio } from '../EstadoVazio'
import { Ilustracao, ilustracoes, type NomeIlustracao } from './index'
import './galeria.css'

const claro = {
  '--ground': '#F1F3EF', '--surface': '#FFFFFF', '--raised': '#E8EBE6', '--border': '#E3E6E1',
  '--ink': '#16130F', '--ink-2': '#3D3D3A', '--muted': '#62615D', '--accent': '#0E7A5A',
  '--accent-soft': '#E3F2EC', '--accent-press': '#0A6047', '--on-accent': '#FFFFFF', colorScheme: 'light',
} as CSSProperties
const escuro = {
  '--ground': '#100E0C', '--surface': '#1A1714', '--raised': '#24201C', '--border': '#2B2723',
  '--ink': '#F4F4F2', '--ink-2': '#D6D5D1', '--muted': '#A3A29E', '--accent': '#34D399',
  '--accent-soft': '#0F2A21', '--accent-press': '#22B07E', '--on-accent': '#04150F', colorScheme: 'dark',
} as CSSProperties

function Galeria() {
  const [rota, setRota] = useState(location.hash)
  const [animada, setAnimada] = useState(false)
  const [mensagem, setMensagem] = useState('')
  useEffect(() => {
    const atualizar = () => setRota(location.hash)
    window.addEventListener('hashchange', atualizar)
    return () => window.removeEventListener('hashchange', atualizar)
  }, [])
  if (rota !== '#/galeria') return <div className="cf-galeria"><a href="#/galeria">Abrir galeria interna</a></div>
  return <div className="cf-galeria">
    <header>
      <p>Central da Família · Prévia interna</p>
      <h1>Galeria de ilustrações</h1>
      <p>Figuras sem dados pessoais ou financeiros. Os dois temas aparecem lado a lado.</p>
      <label><input type="checkbox" checked={animada} onChange={e => setAnimada(e.target.checked)} />
        Experimentar movimento breve (respeita a preferência por movimento reduzido)
      </label>
    </header>
    <div className="cf-galeria-temas">
      {([['claro', claro], ['escuro', escuro]] as const).map(([tema, estilo]) =>
        <section key={tema} style={estilo} className={`cf-galeria-tema galeria-${tema}`} aria-labelledby={`tema-${tema}`}>
          <h2 id={`tema-${tema}`}>Tema {tema}</h2>
          <div className="cf-galeria-grade">
            {(Object.keys(ilustracoes) as NomeIlustracao[]).map(nome => <figure key={nome}>
              <Ilustracao key={`${nome}-${animada}`} nome={nome} animada={animada} />
              <figcaption>{nome === 'AssessorDaCasa' ? 'Assessor da Casa' : nome}</figcaption>
            </figure>)}
          </div>
          <h3>Estado vazio com ação</h3>
          <EstadoVazio ilustracao="SemGastos" titulo="Nenhum gasto ainda" frase="Comece pelo próximo gasto da casa."
            acao={{ texto: 'Experimentar ação', aoClicar: () => setMensagem(`Ação de exemplo no tema ${tema}.`) }} />
          <h3>Estado vazio sem ação</h3>
          <EstadoVazio ilustracao="TudoEmDia" titulo="Tudo em dia" frase="Um cuidado a menos para hoje." />
          <h3>Figura com descrição acessível</h3>
          <Ilustracao nome="PrivacidadeOlho" titulo="Olho fechado: privacidade" />
        </section>)}
    </div>
    <p role="status">{mensagem}</p>
  </div>
}

export function montarGaleria() {
  const alvo = document.getElementById('galeria-root')
  if (alvo) createRoot(alvo).render(<Galeria />)
}
