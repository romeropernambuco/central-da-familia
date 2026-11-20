import { useId, useRef, useState, type ReactNode } from 'react'
import '@fontsource-variable/manrope'
import '@fontsource-variable/inter'
import { Icone, type NomeIcone } from '../../componentes/Icone'
import { Flag } from 'lucide-react'
import {
  CasaVazia,
  Plano2029,
  SemAplicacoes,
  SemGastos,
  SemImoveis,
  SemRecebimentos,
  TudoEmDia,
} from '../../componentes/ilustracoes/figuras'
import { EscritorioMaquete } from '../comuns/EscritorioMaquete'
import { PrivacidadePropostas, useValoresOcultos, Valor } from '../comuns/privacidade'
import type { DadosInicio, NivelAlerta } from '../dadosExemplo'
import type { PropsProposta } from '../Propostas'
import './rumo.css'

type Funcionario = NonNullable<DadosInicio['funcionarios']['valor']>[number]
type Destino = 'inicio' | 'plano' | 'hoje' | 'motores' | 'escritorio'

const motores = [
  {
    titulo: 'Aplicações',
    rotulo: 'rendeu hoje',
    icone: 'guardado',
    responsavel: 'guardado',
    Figura: SemAplicacoes,
    indicador: (dados: DadosInicio) => dados.aplicacoes.rendeuHoje,
    balao: (dados: DadosInicio) => dados.aplicacoes.total,
    rotuloBalao: 'Saldo em aplicações',
  },
  {
    titulo: 'Imóveis',
    rotulo: 'aluguel líquido estimado',
    icone: 'imovel',
    responsavel: 'imoveis',
    Figura: SemImoveis,
    indicador: (dados: DadosInicio) => dados.imoveis.aluguelLiquidoEstimado,
    balao: (dados: DadosInicio) => dados.imoveis.valorCadastrado,
    rotuloBalao: 'Valor cadastrado dos imóveis',
  },
  {
    titulo: 'Receitas',
    rotulo: 'previstas para o mês',
    icone: 'entrada',
    responsavel: 'tesoureiro',
    Figura: SemRecebimentos,
    indicador: (dados: DadosInicio) => dados.recebimentos.previsto,
    balao: (dados: DadosInicio) => dados.recebimentos.garantido,
    rotuloBalao: 'Receita garantida no mês',
  },
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

function SemDado({ Figura, estado }: { Figura?: typeof Plano2029; estado?: 'vazio' | 'indisponivel' }) {
  return (
    <span className="rumo-sem-dado">
      {Figura && <Figura />}
      <span>{estado === 'vazio' ? 'Sem registros' : 'Ainda sem dado'}</span>
    </span>
  )
}

function Horizonte({
  progressao,
  dispositivo,
}: {
  progressao: DadosInicio['plano2029']['progressao']
  dispositivo: PropsProposta['dispositivo']
}) {
  const oculto = useValoresOcultos()
  const fracao = !oculto && progressao.estado === 'pronto' ? Math.max(0, Math.min(1, progressao.valor / 100)) : null
  const largura = dispositivo === 'desktop' ? 640 : 320
  const altura = dispositivo === 'desktop' ? 128 : 116
  const inicio = { x: largura / 16, y: altura - 22 }
  const amplitude = { x: largura - 2 * inicio.x, y: inicio.y - 28 }
  // A cobertura avança no eixo horizontal. A curva só dá forma à trilha.
  const ponto = (t: number) => ({ x: inicio.x + amplitude.x * t, y: inicio.y - amplitude.y * t ** 2 })
  const atual = fracao === null ? null : ponto(fracao)
  const trecho = fracao === null ? null : ponto(fracao / 2).x
  const chegada = ponto(1)
  const origem = `M${inicio.x} ${inicio.y}`
  const marcos = [2026, 2027, 2028, 2029]
  return (
    <figure className="rumo-horizonte">
      <figcaption className="rumo-legenda">
        <div className="rumo-partida">
          <span className="rumo-rotulo">{atual ? 'Você está aqui' : 'Cobertura atual'}</span>
          {progressao.estado === 'pronto' ? (
            <Valor campo={progressao} className="rumo-percentual" />
          ) : (
            <SemDado estado={progressao.estado} />
          )}
          <span className="rumo-cobertura-rotulo">da meta de renda</span>
        </div>
        <div className="rumo-chegada">
          <span>
            <Icone desenho={Flag} size={16} /> Destino
          </span>
          <strong>Viver de rendimentos</strong>
        </div>
      </figcaption>
      <svg
        className="rumo-trilha"
        aria-hidden="true"
        focusable="false"
        viewBox={`0 0 ${largura} ${altura}`}
        preserveAspectRatio="none"
      >
        <path className="rumo-caminho" d={`${origem} Q${largura / 2} ${inicio.y} ${chegada.x} ${chegada.y}`} />
        {atual && trecho !== null && trecho > inicio.x && (
          <path
            className="rumo-cobertura"
            d={`${origem} Q${trecho.toFixed(2)} ${inicio.y} ${atual.x.toFixed(2)} ${atual.y.toFixed(2)}`}
          />
        )}
        {marcos.map(ano => {
          const { x, y } = ponto((ano - marcos[0]) / (marcos.length - 1))
          return <circle key={ano} className="rumo-marco" cx={x} cy={y} r="3.75" />
        })}
        <circle className="rumo-destino" cx={chegada.x} cy={chegada.y} r="10" />
        <circle className="rumo-nucleo" cx={chegada.x} cy={chegada.y} r="3.5" />
        {atual && (
          <g>
            <line className="rumo-haste" x1={atual.x} x2={atual.x} y1={atual.y - 18} y2={atual.y} />
            <circle className="rumo-posicao" cx={atual.x.toFixed(2)} cy={atual.y.toFixed(2)} r="8" />
          </g>
        )}
      </svg>
      <ol className="rumo-marcos" aria-label="Marcos do calendário">
        {marcos.map(ano => (
          <li key={ano}>{ano}</li>
        ))}
      </ol>
    </figure>
  )
}

function Plano({ plano, dispositivo }: { plano: DadosInicio['plano2029']; dispositivo: PropsProposta['dispositivo'] }) {
  const [verCenario, definirCenario] = useState(false)
  const oficial = plano.faltamPorMesComMargem
  const semMargem = plano.faltamPorMesSemMargem
  const iguais = oficial.estado === 'pronto' && semMargem.estado === 'pronto' && oficial.valor === semMargem.valor
  const oculto = useValoresOcultos()
  return (
    <div className="rumo-heroi">
      <div className="rumo-plano-texto">
        <span className="rumo-chapeu">
          <Icone nome="plano2029" size={15} /> Meta da família
        </span>
        <h1>
          Rumo a <span>2029</span>
        </h1>
        <div className="rumo-falta">
          <p className="rumo-rotulo">Falta por mês · com margem</p>
          {oficial.estado === 'pronto' ? (
            <Valor campo={oficial} className="rumo-valor-principal" />
          ) : (
            <SemDado Figura={Plano2029} estado={oficial.estado} />
          )}
        </div>
      </div>
      <Horizonte progressao={plano.progressao} dispositivo={dispositivo} />
      <details className="rumo-cenario" onToggle={evento => definirCenario(evento.currentTarget.open)}>
        <summary>
          Cenário sem margem <Icone nome="abrir" size={16} />
        </summary>
        {verCenario && (
          <div className="rumo-sem-margem">
            <span className="rumo-rotulo">Falta por mês sem a reserva de segurança</span>
            {semMargem.estado !== 'pronto' ? (
              <SemDado estado={semMargem.estado} />
            ) : iguais && !oculto ? (
              <span>Mesmo valor do cenário oficial</span>
            ) : (
              <Valor campo={semMargem} className="rumo-valor-secundario" />
            )}
          </div>
        )}
      </details>
    </div>
  )
}

function Acoes({ alvo, children, icone }: { alvo: () => void; children: ReactNode; icone?: NomeIcone }) {
  return (
    <button type="button" className="rumo-acao" onClick={alvo}>
      {children}
      {icone && <Icone nome={icone} size={16} />}
    </button>
  )
}

function ParaHoje({ dados, somenteTarefas }: { dados: DadosInicio; somenteTarefas: boolean }) {
  const [todas, mostrarTodas] = useState(false)
  const id = useId()
  const oculto = useValoresOcultos()
  const { fila } = dados.pendencias
  const tarefas = (fila.valor ?? [])
    .flatMap(tarefa => {
      if (somenteTarefas) {
        const texto = tarefasCasa[tarefa.id.split(':')[0]]
        return texto ? [{ id: tarefa.id, texto, nivel: 'operacao' as const }] : []
      }
      const nivel = dados.alertas.valor?.find(a => a.id === tarefa.id)?.nivel ?? 'operacao'
      const texto = oculto ? 'Detalhes ocultos' : tarefa.perguntaCurta
      return [{ id: tarefa.id, texto, nivel }]
    })
    .sort((a, b) => niveis[a.nivel].prioridade - niveis[b.nivel].prioridade)
  const disponivel = dados.hojePodeGastar.valor

  return (
    <div className={`rumo-hoje${somenteTarefas ? ' rumo-so-tarefas' : ''}`}>
      {!somenteTarefas && (
        <div className="rumo-orcamento">
          <span className="rumo-icone">
            <Icone nome="orcamento" />
          </span>
          <h2>Para hoje</h2>
          <div className="rumo-orcamento-valor">
            <p className="rumo-rotulo">pode gastar</p>
            {disponivel.estado === 'pronto' ? (
              <Valor campo={disponivel} className="rumo-valor-secundario" />
            ) : (
              <SemDado Figura={SemGastos} estado={disponivel.estado} />
            )}
          </div>
        </div>
      )}
      <div className="rumo-fila">
        <div className="rumo-fila-topo">
          {somenteTarefas ? <h1>Tarefas da casa</h1> : <h2>Precisa de você</h2>}
          {tarefas.length > 2 && (
            <button
              type="button"
              className="rumo-acao"
              aria-expanded={todas}
              aria-controls={id}
              onClick={() => mostrarTodas(!todas)}
            >
              {todas ? 'Recolher tarefas' : 'Ver mais tarefas'}
            </button>
          )}
        </div>
        {tarefas.length > 0 ? (
          <ul className="rumo-tarefas" id={id}>
            {tarefas.slice(0, todas ? undefined : 2).map(tarefa => (
              <li key={tarefa.id}>
                <span className="rumo-nivel" data-risco={tarefa.nivel === 'dinheiro em risco' || undefined}>
                  <Icone nome={niveis[tarefa.nivel].icone} size={14} />
                  {niveis[tarefa.nivel].rotulo}
                </span>
                <span>{tarefa.texto}</span>
              </li>
            ))}
          </ul>
        ) : fila.estado === 'indisponivel' ? (
          <SemDado Figura={CasaVazia} />
        ) : (
          <span className="rumo-sem-dado">
            <TudoEmDia />
            Nada pendente por aqui.
          </span>
        )}
      </div>
    </div>
  )
}

function Motores({ dados, verResponsavel }: { dados: DadosInicio; verResponsavel: (id: string) => void }) {
  return (
    <>
      <h2>O que move o plano</h2>
      <div className="rumo-motores">
        {motores.map(({ titulo, rotulo, responsavel, Figura, indicador }) => {
          const campo = indicador(dados)
          const pessoa = dados.funcionarios.valor?.find(f => f.id === responsavel)
          return (
            <article key={titulo} className="rumo-motor">
              <div className="rumo-motor-leitura">
                <h3>{titulo}</h3>
                <p className="rumo-rotulo">{rotulo}</p>
                {campo.estado === 'pronto' ? (
                  <Valor campo={campo} className="rumo-valor-secundario" />
                ) : (
                  <SemDado estado={campo.estado} />
                )}
              </div>
              <div className="rumo-motor-figura">
                <Figura />
              </div>
              {pessoa && (
                <button
                  type="button"
                  className="rumo-acao rumo-responsavel"
                  onClick={() => verResponsavel(pessoa.id)}
                  aria-label={`Ver ${pessoa.nome} no escritório`}
                >
                  <Icone nome="pessoa" size={16} />
                  {pessoa.curto}
                  <Icone nome="abrir" size={16} />
                </button>
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}

function Escritorio({
  dados,
  escolhido,
  escolher,
}: {
  dados: DadosInicio
  escolhido?: string
  escolher: (id: string) => void
}) {
  const oculto = useValoresOcultos()
  const { funcionarios } = dados
  const equipe = motores.flatMap(motor => {
    const pessoa = funcionarios.valor?.find(f => f.id === motor.responsavel)
    return pessoa ? [{ ...motor, pessoa }] : []
  })
  const ativo = equipe.find(({ pessoa }) => pessoa.id === escolhido) ?? equipe[0]
  const estado = ativo?.pessoa.estadoHoje.valor
  const balao = ativo && escolhido === ativo.pessoa.id && !oculto ? ativo.balao(dados) : null
  const indicador = ativo?.indicador(dados)
  const valorEmCentavos =
    indicador?.estado === 'pronto'
      ? Math.round(indicador.unidade === 'centavos' ? indicador.valor : indicador.valor * 100)
      : null
  const valores =
    ativo && balao?.estado === 'pronto' && Math.round(balao.valor * 100) !== valorEmCentavos
      ? { [ativo.responsavel]: balao }
      : undefined

  return (
    <div className="rumo-escritorio">
      <h2>Quem trabalha por você</h2>
      <div className="rumo-maquete" role="img" aria-label="Maquete isométrica do escritório">
        <EscritorioMaquete
          funcionarios={funcionarios}
          salaDestacada={ativo?.pessoa.sala}
          variante="media"
          mostrarPlaquinhas
          valores={valores}
          papel={dados.pessoa.papel.valor}
        />
      </div>
      <div className="rumo-equipe">
        {ativo ? (
          <>
            <div className="rumo-avatares" role="group" aria-label="Responsáveis pelos motores do plano">
              {equipe.map(({ pessoa, icone }) => (
                <Avatar
                  key={pessoa.id}
                  pessoa={pessoa}
                  icone={icone}
                  ativo={ativo.pessoa.id === pessoa.id}
                  escolher={() => escolher(pessoa.id)}
                />
              ))}
            </div>
            <p className="rumo-agente" aria-live="polite">
              <strong>{ativo.pessoa.nome}</strong>
              <span>
                {estado ? estados[estado] : 'Ainda sem dado'} · {ativo.titulo}
              </span>
              {valores && <span className="rumo-balao-rotulo">{ativo.rotuloBalao} na maquete</span>}
            </p>
          </>
        ) : (
          <SemDado Figura={CasaVazia} />
        )}
      </div>
    </div>
  )
}

function Avatar({
  pessoa,
  icone,
  ativo,
  escolher,
}: {
  pessoa: Funcionario
  icone: NomeIcone
  ativo: boolean
  escolher: () => void
}) {
  return (
    <button type="button" className="rumo-avatar" aria-pressed={ativo} aria-label={pessoa.nome} onClick={escolher}>
      <span className="rumo-retrato">
        <Icone nome={icone} size={17} />
      </span>
      {pessoa.curto}
    </button>
  )
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
  return (
    <nav
      className="rumo-nav"
      aria-label="Atalhos do Início"
      onKeyDown={evento => {
        if (mais && evento.key === 'Escape') {
          abrirMais(false)
          botaoMais.current?.focus()
        }
      }}
    >
      {abas.map(([destino, nome, icone]) => (
        <button
          key={destino}
          type="button"
          className="rumo-aba"
          aria-current={destino === 'inicio' ? 'page' : undefined}
          onClick={() => {
            abrirMais(false)
            ir(destino)
          }}
        >
          <Icone nome={icone} size={18} />
          {nome}
        </button>
      ))}
      <button
        ref={botaoMais}
        type="button"
        className="rumo-aba"
        aria-expanded={mais}
        aria-controls={id}
        onClick={() => abrirMais(!mais)}
      >
        <Icone nome="mais" size={18} />
        Mais
      </button>
      <div className="rumo-mais" id={id} hidden={!mais}>
        <Acoes
          alvo={() => {
            abrirMais(false)
            ir('motores')
          }}
          icone="abrir"
        >
          Motores do plano
        </Acoes>
      </div>
    </nav>
  )
}

export function Proposta({ dados, tema, dispositivo, oculto = false }: PropsProposta & { oculto?: boolean }) {
  const [escolhido, escolher] = useState<string>()
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
  const operacao = alertas.valor?.some(a => a.nivel === 'operacao')
  const mensagem = emRisco
    ? 'Há dinheiro em risco.'
    : operacao
      ? 'Há tarefas para revisar.'
      : alertas.estado === 'pronto'
        ? 'Há lembretes para você.'
        : alertas.estado === 'vazio'
          ? 'Tudo em dia por aqui.'
          : 'Alertas indisponíveis.'
  const escritorio = (
    <section
      className="rumo-secao"
      aria-label="Escritório"
      ref={el => {
        destino.current.escritorio = el
      }}
      tabIndex={-1}
    >
      <Escritorio dados={dados} escolhido={escolhido} escolher={escolher} />
    </section>
  )

  return (
    <PrivacidadePropostas.Provider value={oculto || privacidadeDaCasca}>
      <div className="rumo" data-tema={tema} data-tela={dispositivo}>
        <header
          className="rumo-cabecalho"
          ref={el => {
            destino.current.inicio = el
          }}
          tabIndex={-1}
        >
          <div className="rumo-marca">
            <span className="rumo-logo">
              <Icone nome="inicio" size={19} />
            </span>
            Central da Família
          </div>
          <span className="rumo-exemplo">Exemplo</span>
        </header>
        {!somenteTarefas && dispositivo === 'desktop' && <Navegacao ir={ir} />}
        <div className="rumo-corpo">
          {somenteTarefas ? (
            <ParaHoje dados={dados} somenteTarefas />
          ) : (
            <>
              <div className="rumo-saude">
                <p>
                  <Icone nome={emRisco ? 'erro' : alertas.estado === 'vazio' ? 'salvo' : 'lancamentos'} size={17} />
                  <span data-risco={emRisco || undefined}>{mensagem}</span>
                </p>
                <Acoes alvo={() => ir('hoje')} icone="abrir">
                  Ver tarefas
                </Acoes>
              </div>
              <section
                className="rumo-secao"
                aria-label="Plano 2029"
                ref={el => {
                  destino.current.plano = el
                }}
                tabIndex={-1}
              >
                <Plano plano={dados.plano2029} dispositivo={dispositivo} />
              </section>
              <section
                className="rumo-secao"
                aria-label="Para hoje"
                ref={el => {
                  destino.current.hoje = el
                }}
                tabIndex={-1}
              >
                <ParaHoje dados={dados} somenteTarefas={false} />
              </section>
              {dispositivo === 'celular' && escritorio}
              <section
                className="rumo-secao"
                aria-label="Motores do plano"
                ref={el => {
                  destino.current.motores = el
                }}
                tabIndex={-1}
              >
                <Motores
                  dados={dados}
                  verResponsavel={id => {
                    escolher(id)
                    ir('escritorio')
                  }}
                />
              </section>
              {dispositivo === 'desktop' && escritorio}
            </>
          )}
        </div>
        {!somenteTarefas && dispositivo === 'celular' && <Navegacao ir={ir} />}
      </div>
    </PrivacidadePropostas.Provider>
  )
}
