import { ArrowDown, BriefcaseBusiness, CreditCard, Ellipsis, Flag, House, Wallet } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/inter'
import type { PropsProposta } from '../Propostas'
import { useValoresOcultos } from '../comuns/privacidade'
import { resumoDaEquipe, type PessoaDoEscritorio } from '../comuns/modeloPosto'
import { Escritorio } from './Escritorio'
import { Fila, organizarFila, type Resposta } from './Fila'
import { Bento, Financeiro, Referencias, Rumo } from './Financeiro'
import './proposta.css'

const abas = [
  ['inicio', 'Início', House],
  ['orcamento', 'Orçamento', Wallet],
  ['faturas', 'Faturas', CreditCard],
  ['escritorio', 'Escritório', BriefcaseBusiness],
] as const
type Destino = typeof abas[number][0] | 'plano' | 'referencias' | 'aplicacoes' | 'imoveis' | 'receitas'

export function Proposta({ dados, tema, dispositivo }: PropsProposta) {
  const id = useId()
  const painel = useRef<HTMLDivElement>(null)
  const mais = useRef<HTMLDetailsElement>(null)
  const [ativo, setAtivo] = useState<Destino>('inicio')
  const [respostas, setRespostas] = useState<Partial<Record<string, Resposta>>>({})
  const [selecao, setSelecao] = useState<{ pessoa: PessoaDoEscritorio; tarefa?: string }>()
  const [tarefaAlvo, setTarefaAlvo] = useState<{ id: string }>()
  const oculto = useValoresOcultos()
  const celular = dispositivo === 'celular'
  const papel = dados.pessoa.papel.valor
  const podeVer = papel === 'casal' || papel === 'pessoa'
  const alvo = (destino: Destino | 'fila') => id + '-' + destino

  function focar(destino: Destino | 'fila') {
    const elemento = painel.current?.ownerDocument.getElementById(alvo(destino))
    elemento?.focus({ preventScroll: true })
    const secao = celular && destino === 'inicio' ? elemento?.closest('.m-abertura') : elemento
    secao?.scrollIntoView({ block: 'start', inline: 'nearest' })
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
  const tarefaDaFicha = selecao && (tarefas.find(t => t.id === selecao.tarefa && t.pessoa?.id === selecao.pessoa.id) ??
    pendentes.find(t => t.pessoa?.id === selecao.pessoa.id))
  function selecionar(pessoa?: PessoaDoEscritorio, tarefa?: string) {
    setSelecao(pessoa ? { pessoa, tarefa } : undefined)
  }
  const risco = pendentes.some(tarefa => tarefa.nivel === 'dinheiro em risco')
  const estado = risco ? 'Há um vencimento que pede atenção.'
    : pendentes.length ? 'A equipe tem decisões esperando por você.'
      : dados.pendencias.fila.estado === 'indisponivel' ? 'Ainda sem dado sobre a fila.' : 'Nenhuma decisão aguardando você.'
  const maisAtivo = ativo === 'plano' || ativo === 'referencias'

  const cabecalho = <header className="m-cabecalho">
    <div className="m-identidade">
      {celular && <p className="m-contexto">Central da Família</p>}
      <h1 id={alvo('inicio')} tabIndex={-1}>{celular ? dados.saudacao.valor || 'Início' : 'Central da Família'}</h1>
      <span className="selo-exemplo">Exemplo</span>
    </div>
    <section className="m-saude" aria-label="Estado do dia" data-risco={risco}>
      <div><p><span className="m-sinal" aria-hidden="true" />{estado}</p>
        <p className="m-legenda">{resumoDaEquipe(dados.funcionarios)}</p></div>
      <button className="m-alvo" type="button" onClick={() => focar(pendentes.length ? 'fila' : 'escritorio')}>
        {pendentes.length ? 'Ver fila' : 'Ver equipe'}<ArrowDown aria-hidden="true" size={16} />
      </button>
    </section>
  </header>
  const escritorio = <Escritorio dados={dados} titulo={alvo('escritorio')} {...{ celular, oculto, selecionar }}
    pessoa={selecao?.pessoa} tarefa={tarefaDaFicha} tarefaDaFila={selecao?.tarefa} verTarefa={id => setTarefaAlvo({ id })} />
  const fila = <Fila dados={dados} tarefas={tarefas} titulo={alvo('fila')} oculto={oculto} respostas={respostas}
    completa={celular} {...{ selecionar, tarefaAlvo }}
    responder={(id, resposta) => setRespostas(anteriores => ({ ...anteriores, [id]: resposta }))} />

  return <div className="m-central" data-tema={tema} data-dispositivo={dispositivo} ref={painel}>
    <div className="m-miolo">
      {celular ? <>
        <div className="m-abertura">
          {cabecalho}
          <Referencias dados={dados} titulo={alvo('referencias')} oculto={oculto} />
        </div>
        {escritorio}
        {fila}
        <Rumo titulo={alvo('plano')} cobertura={dados.plano2029.progressao} oculto={oculto} celular />
        <section className="m-motores" aria-labelledby={id + '-motores'}>
          <h2 id={id + '-motores'}>Motores da família</h2>
          <Bento dados={dados} alvo={alvo} celular />
        </section>
      </> : <>
        {cabecalho}
        <div className="m-colunas">
          <div className="m-trabalho">{escritorio}{fila}</div>
          <Financeiro dados={dados} alvo={alvo} oculto={oculto} />
        </div>
      </>}
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
