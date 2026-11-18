import { ArrowDown, BriefcaseBusiness, CreditCard, Ellipsis, Flag, House, Wallet } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/inter'
import type { PropsProposta } from '../Propostas'
import { useValoresOcultos } from '../comuns/privacidade'
import { Escritorio } from './Escritorio'
import { Fila, organizarFila, type Resposta } from './Fila'
import { Financeiro } from './Financeiro'
import './proposta.css'

const abas = [
  ['inicio', 'Início', House],
  ['orcamento', 'Orçamento', Wallet],
  ['faturas', 'Faturas', CreditCard],
  ['escritorio', 'Escritório', BriefcaseBusiness],
] as const
type Destino = typeof abas[number][0] | 'plano' | 'referencias'

export function Proposta({ dados, tema, dispositivo }: PropsProposta) {
  const id = useId()
  const painel = useRef<HTMLDivElement>(null)
  const mais = useRef<HTMLDetailsElement>(null)
  const [ativo, setAtivo] = useState<Destino>('inicio')
  const [respostas, setRespostas] = useState<Partial<Record<string, Resposta>>>({})
  const oculto = useValoresOcultos()
  const papel = dados.pessoa.papel.valor
  const podeVer = papel === 'casal' || papel === 'pessoa'
  const alvo = (destino: Destino | 'fila') => id + '-' + destino

  function focar(destino: Destino | 'fila') {
    const elemento = painel.current?.ownerDocument.getElementById(alvo(destino))
    elemento?.focus({ preventScroll: true })
    elemento?.scrollIntoView({ block: 'start', inline: 'nearest' })
    if (mais.current) mais.current.open = false
    setAtivo(destino === 'fila' ? 'inicio' : destino)
  }

  if (!podeVer) return <div className="m-central m-restrito" data-tema={tema} data-dispositivo={dispositivo}>
    <span className="selo-exemplo">Exemplo</span>
    <h1>{papel === 'equipe' ? 'Assessor da Casa' : 'Início indisponível'}</h1>
    <p>{papel === 'equipe' ? 'As tarefas da casa ficam na sua área de trabalho.' : 'Aguarde a confirmação do seu acesso.'}</p>
  </div>

  const tarefas = organizarFila(dados)
  const pendentes = tarefas.filter(tarefa => !respostas[tarefa.id])
  const risco = pendentes.some(tarefa => tarefa.nivel === 'dinheiro em risco')
  const estado = risco ? 'Há um vencimento que pede atenção.'
    : pendentes.length ? 'A equipe tem decisões esperando por você.'
      : dados.pendencias.fila.estado === 'indisponivel' ? 'Ainda sem dado sobre a fila.' : 'Nenhuma decisão aguardando você.'
  const maisAtivo = ativo === 'plano' || ativo === 'referencias'

  return <div className="m-central" data-tema={tema} data-dispositivo={dispositivo} ref={painel}>
    <div className="m-miolo">
      <header className="m-cabecalho">
        <div className="m-identidade">
          <h1 id={alvo('inicio')} tabIndex={-1}>Central da Família</h1>
          <span className="selo-exemplo">Exemplo</span>
        </div>
        <section className="m-saude" aria-label="Estado do dia" data-risco={risco}>
          <p><span className="m-sinal" aria-hidden="true" />{estado}</p>
          <button className="m-alvo" type="button" onClick={() => focar(pendentes.length ? 'fila' : 'escritorio')}>
            {pendentes.length ? 'Ver fila' : 'Ver equipe'}<ArrowDown aria-hidden="true" size={16} />
          </button>
        </section>
      </header>
      <div className="m-colunas">
        <div className="m-trabalho">
          <Escritorio dados={dados} titulo={alvo('escritorio')} celular={dispositivo === 'celular'} oculto={oculto} />
          <Fila dados={dados} tarefas={tarefas} titulo={alvo('fila')} oculto={oculto} respostas={respostas}
            responder={(id, resposta) => setRespostas(anteriores => ({ ...anteriores, [id]: resposta }))} />
        </div>
        <Financeiro dados={dados} alvo={alvo} oculto={oculto} />
      </div>
    </div>
    <nav className="m-menu" aria-label="Áreas da Central">
      <span className="m-marca" aria-hidden="true"><House size={22} /></span>
      {abas.map(([destino, rotulo, Icone]) =>
        <button key={destino} className="m-alvo" type="button"
          aria-current={ativo === destino ? 'location' : undefined} onClick={() => focar(destino)}>
          <Icone aria-hidden="true" size={20} /><span>{rotulo}</span>
        </button>)}
      <details ref={mais} onKeyDown={evento => {
        if (evento.key !== 'Escape' || !evento.currentTarget.open) return
        evento.currentTarget.open = false
        evento.currentTarget.querySelector('summary')?.focus()
      }}>
        <summary className="m-alvo" aria-current={maisAtivo ? 'location' : undefined}>
          <Ellipsis aria-hidden="true" size={20} /><span>Mais</span>
        </summary>
        <div className="m-mais">
          <button className="m-alvo" type="button" onClick={() => focar('plano')}><Flag aria-hidden="true" size={18} />Plano 2029</button>
          <button className="m-alvo" type="button" onClick={() => focar('referencias')}><Wallet aria-hidden="true" size={18} />Referências</button>
        </div>
      </details>
    </nav>
  </div>
}
