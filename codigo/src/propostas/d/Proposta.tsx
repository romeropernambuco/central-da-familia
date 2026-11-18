import { useId, useRef, useState, type ReactNode } from 'react'
import '@fontsource-variable/manrope'
import '@fontsource-variable/inter'
import { Icone, type NomeIcone } from '../../componentes/Icone'
import {
  CasaVazia, Plano2029, SemAplicacoes, SemGastos, SemImoveis, SemRecebimentos, TudoEmDia,
} from '../../componentes/ilustracoes/figuras'
import { EscritorioMaquete } from '../comuns/EscritorioMaquete'
import { PrivacidadePropostas, useValoresOcultos, Valor } from '../comuns/privacidade'
import type { Campo, DadosInicio, NivelAlerta } from '../dadosExemplo'
import type { PropsProposta } from '../Propostas'
import './rumo.css'

type Funcionario = NonNullable<DadosInicio['funcionarios']['valor']>[number]
type Destino = 'inicio' | 'plano' | 'hoje' | 'motores' | 'escritorio'

const motores = [
  { titulo: 'Aplicações', rotulo: 'rendeu hoje', icone: 'guardado', responsavel: 'guardado', Figura: SemAplicacoes },
  { titulo: 'Imóveis', rotulo: 'aluguel líquido estimado', icone: 'imovel', responsavel: 'imoveis', Figura: SemImoveis },
  { titulo: 'Receitas previstas', rotulo: 'total previsto para o mês', icone: 'entrada', responsavel: 'tesoureiro', Figura: SemRecebimentos },
] as const

const niveis: Record<NivelAlerta, { rotulo: string; icone: NomeIcone; prioridade: number }> = {
  'dinheiro em risco': { rotulo: 'Dinheiro em risco', icone: 'erro', prioridade: 0 },
  operacao: { rotulo: 'Operação', icone: 'lancamentos', prioridade: 1 },
  lembrete: { rotulo: 'Lembrete', icone: 'secretaria', prioridade: 2 },
}

const estados = {
  vai_comecar: 'Ainda vai começar',
  trabalhando: 'Trabalhando',
  entregue: 'Entregue',
  precisa_de_voce: 'Precisa de você',
}

const tarefasCasa: Readonly<Record<string, string>> = {
  feira_feita: 'Confirmar a feira da semana',
  feira_nota: 'Conferir a nota da feira',
  estoque: 'Contar o estoque da casa',
  prestador_veio: 'Confirmar a visita do prestador',
  gas: 'Conferir a troca do gás',
}

function SemDado({ Figura }: { Figura?: typeof Plano2029 }) {
  return <span className="rumo-sem-dado">
    {Figura && <Figura />}
    <span>Ainda sem dado</span>
  </span>
}

function Horizonte({ progressao }: { progressao: DadosInicio['plano2029']['progressao'] }) {
  const oculto = useValoresOcultos()
  const cobertura = progressao.valor
  const exibirArco = !oculto && cobertura !== null
  const trilha = 'M19 145C111 145 151 31 316 31'
  return <div className="rumo-horizonte">
    <svg className="rumo-trilha" aria-hidden="true" focusable="false" viewBox="0 0 336 162" preserveAspectRatio="none">
      <path className="rumo-contorno" d="M19 122C109 122 147 15 281 15M50 151C152 150 190 53 316 53M114 151C181 134 224 74 316 74M175 151C227 128 266 95 316 95" />
      <path className="rumo-caminho" d={trilha} />
      {exibirArco && cobertura > 0 && <path
        className="rumo-cobertura" d={trilha} pathLength="100" strokeDasharray={`${Math.min(cobertura, 100)} 100`}
      />}
      <circle className="rumo-marco" cx="19" cy="145" r="5" />
      <circle className="rumo-destino" cx="316" cy="31" r="9" />
      <circle className="rumo-marco" cx="316" cy="31" r="3" />
    </svg>
    <div className="rumo-partida">
      <span className="rumo-rotulo">hoje · cobertura da meta</span>
      {progressao.estado === 'pronto' ? <Valor campo={progressao} className="rumo-percentual" /> : <SemDado />}
    </div>
    <span className="rumo-chegada">viver de rendimentos</span>
  </div>
}

function Plano({ plano }: { plano: DadosInicio['plano2029'] }) {
  const oficial = plano.faltamPorMesComMargem
  const semMargem = plano.faltamPorMesSemMargem
  const iguais = oficial.estado === 'pronto' && semMargem.estado === 'pronto' && oficial.valor === semMargem.valor
  const oculto = useValoresOcultos()
  return <div className="rumo-heroi">
    <div className="rumo-plano-texto">
      <span className="rumo-chapeu"><Icone nome="plano2029" size={15} /> Meta da família</span>
      <h1>Rumo a <span>2029</span></h1>
      <div className="rumo-falta">
        <p className="rumo-rotulo">falta por mês · com margem</p>
        {oficial.estado === 'pronto' ? <Valor campo={oficial} className="rumo-valor-principal" /> : <SemDado Figura={Plano2029} />}
        <p className="rumo-sem-margem">
          <span>sem margem</span>
          {semMargem.estado !== 'pronto' ? <SemDado />
            : iguais && !oculto ? <span>Mesmo valor</span> : <Valor campo={semMargem} />}
        </p>
      </div>
    </div>
    <Horizonte progressao={plano.progressao} />
  </div>
}

function Acoes({ alvo, children, icone }: { alvo: () => void; children: ReactNode; icone?: NomeIcone }) {
  return <button type="button" className="rumo-acao" onClick={alvo}>{children}{icone && <Icone nome={icone} size={16} />}</button>
}

function ParaHoje({ dados, somenteTarefas }: { dados: DadosInicio; somenteTarefas: boolean }) {
  const [todas, mostrarTodas] = useState(false)
  const id = useId()
  const oculto = useValoresOcultos()
  const { fila } = dados.pendencias
  const tarefas = (fila.valor ?? []).flatMap(tarefa => {
    if (somenteTarefas) {
      const texto = tarefasCasa[tarefa.id.split(':')[0]]
      return texto ? [{ id: tarefa.id, texto, nivel: 'operacao' as const }] : []
    }
    const nivel = dados.alertas.valor?.find(a => a.id === tarefa.id)?.nivel ?? 'operacao'
    const texto = oculto ? 'Detalhes ocultos' : tarefa.perguntaCurta
    return [{ id: tarefa.id, texto, nivel }]
  }).sort((a, b) => niveis[a.nivel].prioridade - niveis[b.nivel].prioridade)
  const disponivel = dados.hojePodeGastar.valor

  return <div className={`rumo-hoje${somenteTarefas ? ' rumo-so-tarefas' : ''}`}>
    {!somenteTarefas && <div className="rumo-orcamento">
      <span className="rumo-icone"><Icone nome="orcamento" /></span>
      <h2>Para hoje</h2>
      <div className="rumo-orcamento-valor">
        <p className="rumo-rotulo">pode gastar</p>
        {disponivel.estado === 'pronto' ? <Valor campo={disponivel} className="rumo-valor-secundario" /> : <SemDado Figura={SemGastos} />}
      </div>
    </div>}
    <div className="rumo-fila">
      <div className="rumo-fila-topo">
        {somenteTarefas ? <h1>Tarefas da casa</h1> : <h3>Precisa de você</h3>}
        {tarefas.length > 2 && <button type="button" className="rumo-acao" aria-expanded={todas} aria-controls={id} onClick={() => mostrarTodas(!todas)}>
          {todas ? 'Recolher tarefas' : 'Ver mais tarefas'}
        </button>}
      </div>
      {tarefas.length > 0 ? <ul className="rumo-tarefas" id={id}>
        {tarefas.slice(0, todas ? undefined : 2).map(tarefa => <li key={tarefa.id}>
          <span className="rumo-nivel" data-risco={tarefa.nivel === 'dinheiro em risco' || undefined}>
            <Icone nome={niveis[tarefa.nivel].icone} size={14} />
            {niveis[tarefa.nivel].rotulo}
          </span>
          <span>{tarefa.texto}</span>
        </li>)}
      </ul> : fila.estado === 'indisponivel' || (somenteTarefas && fila.estado === 'pronto')
        ? <SemDado Figura={CasaVazia} />
        : <span className="rumo-sem-dado"><TudoEmDia />Nada pendente por aqui.</span>}
    </div>
  </div>
}

function Motores({ dados }: { dados: DadosInicio }) {
  const valores: Campo<number, 'centavos' | 'reais'>[] = [
    dados.aplicacoes.rendeuHoje, dados.imoveis.aluguelLiquidoEstimado, dados.recebimentos.previsto,
  ]
  return <>
    <h2>O que move o plano</h2>
    <div className="rumo-motores">
      {motores.map(({ titulo, rotulo, icone, Figura }, i) => <article key={titulo} className="rumo-motor">
        <header><span className="rumo-icone"><Icone nome={icone} /></span><h3>{titulo}</h3></header>
        <div>
          <p className="rumo-rotulo">{rotulo}</p>
          {valores[i].estado === 'pronto'
            ? <Valor campo={valores[i]} className="rumo-valor-secundario" />
            : <SemDado Figura={Figura} />}
        </div>
      </article>)}
    </div>
  </>
}

function Escritorio({ funcionarios }: { funcionarios: DadosInicio['funcionarios'] }) {
  const [escolhido, escolher] = useState<string>()
  const equipe = motores.flatMap(motor => {
    const pessoa = funcionarios.valor?.find(f => f.id === motor.responsavel)
    return pessoa ? [{ ...motor, pessoa }] : []
  })
  const ativo = equipe.find(({ pessoa }) => pessoa.id === escolhido) ?? equipe[0]
  const estado = ativo?.pessoa.estadoHoje.valor

  return <div className="rumo-escritorio">
    <div className="rumo-equipe">
      <h2>Quem trabalha por você</h2>
      {ativo ? <>
        <div className="rumo-avatares" role="group" aria-label="Responsáveis pelos motores do plano">
          {equipe.map(({ pessoa, icone }) => <Avatar key={pessoa.id} pessoa={pessoa} icone={icone}
            ativo={ativo.pessoa.id === pessoa.id} escolher={() => escolher(pessoa.id)} />)}
        </div>
        <p className="rumo-agente" aria-live="polite">
          <strong>{ativo.pessoa.nome}</strong>
          <span>{estado ? estados[estado] : 'Ainda sem dado'}</span>
        </p>
      </> : <SemDado Figura={CasaVazia} />}
    </div>
    <div className="rumo-maquete" aria-hidden="true">
      <EscritorioMaquete funcionarios={funcionarios} salaDestacada={ativo?.pessoa.sala} />
    </div>
  </div>
}

function Avatar({ pessoa, icone, ativo, escolher }: { pessoa: Funcionario; icone: NomeIcone; ativo: boolean; escolher: () => void }) {
  return <button type="button" className="rumo-avatar" aria-pressed={ativo} aria-label={pessoa.nome} onClick={escolher}>
    <span className="rumo-retrato"><Icone nome={icone} size={17} /></span>{pessoa.curto}
  </button>
}

const abas = [
  ['inicio', 'Início', 'inicio'],
  ['plano', 'Plano', 'plano2029'],
  ['hoje', 'Hoje', 'lancamentos'],
  ['escritorio', 'Escritório', 'escritorio'],
] as const

function Navegacao({ ir }: { ir: (destino: Destino) => void }) {
  const [mais, abrirMais] = useState(false)
  const id = useId()
  const botaoMais = useRef<HTMLButtonElement>(null)
  return <nav className="rumo-nav" aria-label="Atalhos do Início" onKeyDown={evento => {
    if (mais && evento.key === 'Escape') {
      abrirMais(false)
      botaoMais.current?.focus()
    }
  }}>
    {abas.map(([destino, nome, icone]) => <button key={destino} type="button" className="rumo-aba"
      aria-current={destino === 'inicio' ? 'page' : undefined} onClick={() => { abrirMais(false); ir(destino) }}>
      <Icone nome={icone} size={18} />{nome}
    </button>)}
    <button ref={botaoMais} type="button" className="rumo-aba" aria-expanded={mais} aria-controls={id} onClick={() => abrirMais(!mais)}>
      <Icone nome="mais" size={18} />Mais
    </button>
    <div className="rumo-mais" id={id} hidden={!mais}>
      <Acoes alvo={() => { abrirMais(false); ir('motores') }} icone="abrir">Motores do plano</Acoes>
    </div>
  </nav>
}

export function Proposta({ dados, tema, dispositivo, oculto = false }: PropsProposta & { oculto?: boolean }) {
  const privacidadeDaCasca = useValoresOcultos()
  const destino = useRef<Partial<Record<Destino, HTMLElement | null>>>({})
  const ir = (chave: Destino) => {
    const alvo = destino.current[chave]
    alvo?.focus({ preventScroll: true })
    alvo?.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' })
  }
  const somenteTarefas = dados.pessoa.papel.valor !== 'casal'
  const alertas = dados.alertas
  const emRisco = alertas.valor?.some(a => a.nivel === 'dinheiro em risco')
  const mensagem = emRisco ? 'Há dinheiro em risco.' : alertas.estado === 'pronto' ? 'Há tarefas para revisar.'
    : alertas.estado === 'vazio' ? 'Tudo em dia por aqui.' : 'Alertas: ainda sem dado.'
  const escritorio = <section className="rumo-secao" aria-label="Escritório" ref={el => { destino.current.escritorio = el }} tabIndex={-1}>
    <Escritorio funcionarios={dados.funcionarios} />
  </section>

  return <PrivacidadePropostas.Provider value={oculto || privacidadeDaCasca}>
    <div className="rumo" data-tema={tema} data-tela={dispositivo}>
      <header className="rumo-cabecalho" ref={el => { destino.current.inicio = el }} tabIndex={-1}>
        <div className="rumo-marca"><span className="rumo-logo"><Icone nome="inicio" size={19} /></span>Central da Família</div>
        <span className="rumo-exemplo">Exemplo</span>
      </header>
      {!somenteTarefas && <Navegacao ir={ir} />}
      <div className="rumo-corpo">
        {somenteTarefas ? <ParaHoje dados={dados} somenteTarefas /> : <>
          <div className="rumo-saude">
            <p><Icone nome={emRisco ? 'erro' : alertas.estado === 'vazio' ? 'salvo' : 'lancamentos'} size={17} />
              <span data-risco={emRisco || undefined}>{mensagem}</span>
            </p>
            <Acoes alvo={() => ir('hoje')} icone="abrir">Ver tarefas</Acoes>
          </div>
          <section className="rumo-secao" aria-label="Plano 2029" ref={el => { destino.current.plano = el }} tabIndex={-1}>
            <Plano plano={dados.plano2029} />
          </section>
          <section className="rumo-secao" aria-label="Para hoje" ref={el => { destino.current.hoje = el }} tabIndex={-1}>
            <ParaHoje dados={dados} somenteTarefas={false} />
          </section>
          {dispositivo === 'celular' && escritorio}
          <section className="rumo-secao" aria-label="Motores do plano" ref={el => { destino.current.motores = el }} tabIndex={-1}>
            <Motores dados={dados} />
          </section>
          {dispositivo === 'desktop' && escritorio}
        </>}
      </div>
    </div>
  </PrivacidadePropostas.Provider>
}
