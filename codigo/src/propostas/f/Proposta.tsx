import { useId, useRef, useState, type KeyboardEvent } from 'react'
import '@fontsource-variable/geist'
import '@fontsource-variable/inter'
import { Icone, icones, type NomeIcone } from '../../componentes/Icone'
import { AssessorDaCasa, Erro, TudoEmDia } from '../../componentes/ilustracoes'
import { enderecoDestino, type DestinoResumo } from '../../app/destinos'
import { chaveSimples } from '../../api/normaliza2'
import type { DadosInicio, NivelAlerta } from '../dadosExemplo'
import type { PropsProposta } from '../Propostas'
import { EscritorioMaquete } from '../comuns/EscritorioMaquete'
import { useValoresOcultos, Valor } from '../comuns/privacidade'
import './proposta.css'

type Pessoa = NonNullable<DadosInicio['funcionarios']['valor']>[number]
type Tarefa = NonNullable<DadosInicio['pendencias']['fila']['valor']>[number]
type Pasta = 'agora' | 'depois' | 'feitas'
type Sala = Pessoa['sala']
const pastas = { agora: 'Agora', depois: 'Depois', feitas: 'Feitas' } as const

const niveis = {
  'dinheiro em risco': {
    ordem: 0,
    rotulo: 'Dinheiro em risco',
    icone: 'erro',
    dica: 'Confira esta pendência primeiro.',
  },
  operacao: {
    ordem: 1,
    rotulo: 'Operação',
    icone: 'lancamentos',
    dica: 'Confira o registro antes de marcar como feito.',
  },
  lembrete: { ordem: 2, rotulo: 'Lembrete', icone: 'recepcao', dica: 'Retome quando puder.' },
  desconhecido: { ordem: 3, rotulo: 'Prioridade indisponível', icone: 'ajuda', dica: 'Abra o registro para conferir.' },
} as const

const tarefasCasa = new Map([
  ['feira_feita', 'Confirmar a feira da semana'],
  ['feira_nota', 'Guardar a nota da feira'],
  ['estoque', 'Conferir o estoque'],
  ['prestador_veio', 'Confirmar a visita do prestador'],
  ['gas', 'Conferir a troca do gás'],
])
const tipo = (tarefa: Tarefa) => tarefa.id.split(':', 1)[0]
const destinoApp = (destino: DestinoResumo) => '../../' + enderecoDestino(destino)

function Avatar({ pessoa }: { pessoa?: Pessoa }) {
  const id = pessoa?.id
  const icone: NomeIcone =
    id === 'cartao'
      ? 'gerente'
      : id === 'guardado'
        ? 'investidor'
        : id && Object.prototype.hasOwnProperty.call(icones, id)
          ? (id as NomeIcone)
          : 'pessoa'
  return (
    <span className="f-avatar" aria-hidden="true">
      <Icone nome={icone} size={16} />
    </span>
  )
}

function Navegacao({ voltar }: { voltar: () => void }) {
  const [mais, setMais] = useState(false)
  const gatilho = useRef<HTMLButtonElement>(null)
  const id = useId()
  const abas = [
    ['lancamentos', 'Gastos', 'lancamentos'],
    ['orcamento', 'Orçamento', 'orcamento'],
    ['casa', 'Casa', 'inicio'],
  ] as const
  const extras = [
    ['escritorio', 'Escritório', 'escritorio'],
    ['cartoes', 'Cartões', 'cartoes'],
    ['guardado', 'Aplicações', 'guardado'],
    ['planejamento', 'Planejamento', 'planejamento'],
    ['desejos', 'Desejos', 'desejos'],
    ['ajustes', 'Ajustes', 'ajustes'],
  ] as const
  return (
    <nav
      className="f-nav"
      aria-label="Navegação principal"
      onKeyDown={e => {
        if (e.key === 'Escape' && mais) {
          setMais(false)
          gatilho.current?.focus()
        }
      }}
    >
      <button
        type="button"
        aria-current="page"
        onClick={() => {
          setMais(false)
          voltar()
        }}
      >
        <Icone nome="email" size={17} />
        Início
      </button>
      {abas.map(([rota, nome, icone]) => (
        <a href={'../../#/' + rota} key={rota}>
          <Icone nome={icone} size={17} />
          {nome}
        </a>
      ))}
      <div className="f-mais">
        <button type="button" ref={gatilho} aria-expanded={mais} aria-controls={id} onClick={() => setMais(!mais)}>
          <Icone nome={mais ? 'fechar' : 'mais'} size={17} />
          Mais
        </button>
        <div className="f-menu" id={id} hidden={!mais}>
          {extras.map(([rota, nome, icone]) => (
            <a href={'../../#/' + rota} key={rota}>
              <Icone nome={icone} size={17} />
              {nome}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}

function Contexto({ dados }: { dados: DadosInicio }) {
  const oculto = useValoresOcultos()
  const plano = dados.plano2029.faltamPorMesComMargem
  const descricaoPlano =
    oculto || plano.estado !== 'pronto'
      ? 'Diferença mensal'
      : plano.valor < 0
        ? 'Sobra por mês'
        : plano.valor === 0
          ? 'Meta mensal coberta'
          : 'Falta por mês'
  const numeros = [
    {
      titulo: 'Pode gastar hoje',
      icone: 'orcamento',
      campo: dados.hojePodeGastar.valor,
      rota: 'orcamento',
      secao: 'orcamento',
    },
    {
      titulo: 'Plano 2029',
      legenda: descricaoPlano + ' · com margem',
      icone: 'planejamento',
      campo: plano.estado === 'pronto' ? { ...plano, valor: Math.abs(plano.valor) } : plano,
      rota: 'planejamento',
      secao: 'plano2029',
    },
    { titulo: 'Aplicações', icone: 'guardado', campo: dados.aplicacoes.total, rota: 'guardado', secao: 'aplicacoes' },
    { titulo: 'Faturas previstas', icone: 'cartoes', campo: dados.faturas.total, rota: 'cartoes', secao: 'fatura' },
  ] as const
  return (
    <section className="f-contexto" aria-label="Contexto financeiro">
      {numeros.map(({ titulo, icone, campo, rota, secao, ...meta }, i) => (
        <a href={destinoApp({ rota, secao })} className="f-indicador" key={secao}>
          <span className="f-indicador-titulo">
            <Icone nome={icone} size={14} />
            {titulo}
          </span>
          <Valor campo={campo} className={i === 0 ? 'numero-principal' : 'numero-secundario'} />
          {'legenda' in meta && <small>{meta.legenda}</small>}
        </a>
      ))}
    </section>
  )
}

function Escritorio({ dados, sala, celular }: { dados: DadosInicio; sala?: Sala; celular: boolean }) {
  const equipe = dados.funcionarios.valor ?? []
  const trabalhando = equipe.filter(p => p.estadoHoje.valor === 'trabalhando')
  // A versão inicial da maquete ignora a variante, preservando a mesma composição.
  const dimensao = { variante: celular ? ('media' as const) : ('grande' as const), oculto: useValoresOcultos() }
  return (
    <aside className="f-escritorio" aria-label="Escritório">
      <div className="f-escritorio-topo">
        <div>
          <p className="f-sobretitulo">
            <Icone nome="escritorio" size={15} /> Equipe da família
          </p>
          <h2>Escritório</h2>
        </div>
        <a className="f-icone-botao" href="../../#/escritorio" aria-label="Abrir escritório">
          <Icone nome="abrir" size={20} />
        </a>
      </div>
      {dados.funcionarios.estado === 'pronto' && (
        <div className="f-cena" aria-hidden="true">
          <EscritorioMaquete {...dimensao} funcionarios={dados.funcionarios} salaDestacada={sala} mostrarPlaquinhas />
        </div>
      )}
      <div className="f-equipe">
        <h3>
          <span className="f-presenca" aria-hidden="true" /> Trabalhando agora
        </h3>
        {trabalhando.length > 0 ? (
          <ul>
            {trabalhando.map(p => (
              <li key={p.id} data-foco={p.sala === sala}>
                <Avatar pessoa={p} />
                {p.curto}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {dados.funcionarios.estado === 'indisponivel'
              ? 'Estado da equipe indisponível.'
              : 'Sem atividade registrada agora.'}
          </p>
        )}
      </div>
    </aside>
  )
}

type Decisao = { tarefa: Tarefa; pessoa?: Pessoa; nivel: NivelAlerta | 'desconhecido' }

function Caixa({ dados, tema = 'escuro', dispositivo }: PropsProposta) {
  const papel = dados.pessoa.papel.valor
  const casal = papel === 'casal'
  const assessor = papel === 'equipe'
  const celular = dispositivo === 'celular'
  const oculto = useValoresOcultos()
  const [pasta, setPasta] = useState<Pasta>('agora')
  const [movidas, setMovidas] = useState<Partial<Record<string, Pasta>>>({})
  const [pagina, setPagina] = useState(0)
  const [detalhe, setDetalhe] = useState<string>()
  const [foco, setFoco] = useState<string>()
  const [ultima, setUltima] = useState<{ id: string; origem: Pasta; destino: Pasta }>()
  const titulo = useRef<HTMLHeadingElement>(null)
  const lista = useRef<HTMLUListElement>(null)
  const tabs = useRef<HTMLDivElement>(null)
  const detalheId = useId()

  const pessoas = dados.funcionarios.valor ?? []
  const alertas = new Map((dados.alertas.valor ?? []).map(a => [a.id, a.nivel]))
  const listaCompleta: Decisao[] = (dados.pendencias.fila.valor ?? [])
    .filter(t => casal || (assessor && tarefasCasa.has(tipo(t))))
    .map(tarefa => ({
      tarefa,
      pessoa: pessoas.find(
        p => p.id === tarefa.funcionario || chaveSimples(p.nome) === chaveSimples(tarefa.funcionario),
      ),
      nivel: assessor ? ('operacao' as const) : (alertas.get(tarefa.id) ?? ('desconhecido' as const)),
    }))
  listaCompleta.sort((a, b) => niveis[a.nivel].ordem - niveis[b.nivel].ordem)
  const nestaPasta = listaCompleta.filter(({ tarefa }) => (movidas[tarefa.id] ?? 'agora') === pasta)
  const porPagina = celular ? 1 : 4
  const paginaAtual = Math.min(pagina, Math.max(0, Math.ceil(nestaPasta.length / porPagina) - 1))
  const visiveis = nestaPasta.slice(paginaAtual * porPagina, (paginaAtual + 1) * porPagina)
  const selecionada = visiveis.find(({ tarefa }) => tarefa.id === (detalhe ?? foco)) ?? visiveis[0]
  const aguardando = listaCompleta.find(({ tarefa }) => (movidas[tarefa.id] ?? 'agora') === 'agora')
  const haRisco = aguardando?.nivel === 'dinheiro em risco'
  const indisponivel = dados.pendencias.fila.estado === 'indisponivel'
  const incompleta =
    casal && dados.pendencias.total.estado === 'pronto' && dados.pendencias.total.valor > listaCompleta.length
  const navegacao = casal && (
    <Navegacao
      voltar={() => {
        irPara('agora')
        titulo.current?.focus()
        titulo.current?.scrollIntoView({ block: 'center' })
      }}
    />
  )

  function irPara(origem: Pasta, indice = 0) {
    setPasta(origem)
    setPagina(indice)
    setDetalhe(undefined)
    setFoco(undefined)
  }

  function focarLinhaOuAba() {
    // Espera a próxima pintura para focar um controle que permaneça na fila.
    requestAnimationFrame(() =>
      (
        lista.current?.querySelector<HTMLButtonElement>('.f-abrir') ??
        tabs.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      )?.focus(),
    )
  }

  function mover(id: string, destino: Pasta) {
    setMovidas(anteriores => ({ ...anteriores, [id]: destino }))
    setUltima({ id, origem: pasta, destino })
    setPagina(Math.min(paginaAtual, Math.max(0, Math.ceil((nestaPasta.length - 1) / porPagina) - 1)))
    setDetalhe(undefined)
    focarLinhaOuAba()
  }

  function atalhos(e: KeyboardEvent, tarefa: Tarefa, indice: number) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat || e.defaultPrevented) return
    const botoes = lista.current?.querySelectorAll<HTMLButtonElement>('.f-abrir')
    switch (e.key.toLowerCase()) {
      case 'a':
        setDetalhe(d => (d === tarefa.id ? undefined : tarefa.id))
        break
      case 'f':
        if (pasta !== 'feitas') mover(tarefa.id, 'feitas')
        break
      case 'd':
        if (pasta === 'agora') mover(tarefa.id, 'depois')
        break
      case 'escape':
        if (detalhe) {
          setDetalhe(undefined)
          botoes?.[indice]?.focus()
        } else return
        break
      case 'arrowdown':
      case 'arrowup': {
        const passo = e.key === 'ArrowDown' ? 1 : -1
        const adjacente = botoes?.[indice + passo]
        if (adjacente) adjacente.focus()
        else if (paginaAtual + passo >= 0 && (paginaAtual + passo) * porPagina < nestaPasta.length) {
          irPara(pasta, paginaAtual + passo)
          requestAnimationFrame(() => {
            const controles = lista.current?.querySelectorAll<HTMLButtonElement>('.f-abrir')
            if (controles?.length) controles[passo === 1 ? 0 : controles.length - 1].focus()
          })
        }
        break
      }
      default:
        return
    }
    e.preventDefault()
  }

  return (
    <div className="f-inicio" data-proposta="f" data-tema={tema} data-dispositivo={dispositivo}>
      <header className="f-masthead">
        <span className="f-marca">
          <Icone nome="inicio" size={18} />
          Central da Família
        </span>
        {!celular && navegacao}
        <span className="selo-exemplo">Exemplo</span>
      </header>
      {!casal && !assessor ? (
        <section className="f-restrito">
          <h1>Início</h1>
          <p>{papel === 'pessoa' ? 'A caixa de decisões é do casal.' : 'Perfil indisponível.'}</p>
          {papel === 'pessoa' && (
            <a href="../../#/orcamento">
              Meu orçamento <Icone nome="abrir" size={16} />
            </a>
          )}
        </section>
      ) : (
        <>
          {casal && <Contexto dados={dados} />}
          <div className="f-layout">
            <section className="f-caixa" aria-label="Caixa de entrada">
              <header className="f-caixa-topo">
                <p className="f-sobretitulo">
                  <Icone nome="email" size={15} /> Caixa de entrada
                </p>
                <h1 ref={titulo} tabIndex={-1}>
                  {assessor ? 'Tarefas da Casa' : 'Precisa de você'}
                </h1>
                <div className="f-saude">
                  <p data-risco={haRisco}>
                    {indisponivel ? (
                      'A fila está indisponível.'
                    ) : haRisco ? (
                      <>
                        <Icone nome="erro" size={15} /> Há dinheiro em risco.
                      </>
                    ) : aguardando ? (
                      'A equipe aguarda suas decisões.'
                    ) : (
                      'Nenhuma decisão na fila agora.'
                    )}
                  </p>
                  {haRisco && (
                    <button
                      type="button"
                      onClick={() => {
                        irPara('agora')
                        focarLinhaOuAba()
                      }}
                    >
                      Revisar prioridade
                    </button>
                  )}
                </div>
              </header>
              <div className="f-filtros" ref={tabs} role="group" aria-label="Pastas da caixa de entrada">
                {(Object.keys(pastas) as Pasta[]).map(p => (
                  <button type="button" key={p} aria-pressed={p === pasta} onClick={() => irPara(p)}>
                    <Icone nome={p === 'agora' ? 'email' : p === 'depois' ? 'pendente' : 'salvo'} size={16} />
                    {pastas[p]}
                  </button>
                ))}
              </div>
              <div className="f-fila">
                {visiveis.length > 0 ? (
                  <ul className="f-linhas" ref={lista}>
                    {visiveis.map(({ tarefa, pessoa, nivel }, i) => {
                      const aberto = detalhe === tarefa.id
                      const nome = assessor || oculto ? pessoa?.curto : pessoa?.nome
                      const pergunta = assessor
                        ? tarefasCasa.get(tipo(tarefa))
                        : oculto
                          ? (tarefasCasa.get(tipo(tarefa)) ?? 'Tarefa com detalhes ocultos')
                          : tarefa.perguntaCurta
                      const alerta = niveis[nivel]
                      const id = detalheId + '-' + i
                      return (
                        <li
                          className="f-linha"
                          key={tarefa.id}
                          data-ativa={selecionada?.tarefa.id === tarefa.id}
                          onFocus={() => setFoco(tarefa.id)}
                          onKeyDown={e => atalhos(e, tarefa, i)}
                        >
                          <div className="f-assunto">
                            <Avatar pessoa={pessoa} />
                            <div>
                              <span className="f-remetente">{nome ?? 'Remetente indisponível'}</span>
                              <h2>{pergunta}</h2>
                              <span className="f-nivel" data-risco={nivel === 'dinheiro em risco'}>
                                <Icone nome={alerta.icone} size={13} />
                                {alerta.rotulo}
                              </span>
                            </div>
                          </div>
                          {casal && (
                            <div className="f-quantia">
                              <Valor campo={tarefa.valor} className="numero-secundario" />
                            </div>
                          )}
                          <div className="f-acoes" role="group" aria-label={`Ações: ${pergunta}`}>
                            {pasta !== 'feitas' && (
                              <button type="button" onClick={() => mover(tarefa.id, 'feitas')} aria-keyshortcuts="F">
                                <Icone nome="salvo" size={17} />
                                Já fiz
                              </button>
                            )}
                            {pasta === 'agora' ? (
                              <button type="button" onClick={() => mover(tarefa.id, 'depois')} aria-keyshortcuts="D">
                                <Icone nome="pendente" size={17} />
                                Depois
                              </button>
                            ) : (
                              <button type="button" onClick={() => mover(tarefa.id, 'agora')}>
                                <Icone nome="desfazer" size={17} />
                                Retomar
                              </button>
                            )}
                            <button
                              className="f-abrir"
                              type="button"
                              onClick={() => setDetalhe(aberto ? undefined : tarefa.id)}
                              aria-expanded={aberto}
                              aria-controls={id}
                              aria-keyshortcuts="A"
                            >
                              <Icone nome={aberto ? 'fechar' : 'abrir'} size={17} />
                              {aberto ? 'Fechar' : 'Abrir'}
                            </button>
                          </div>
                          <div className="f-detalhe" id={id} hidden={!aberto}>
                            <p>{alerta.dica}</p>
                            <a
                              href={
                                assessor
                                  ? '../../#/casa'
                                  : oculto
                                    ? '../../#/escritorio'
                                    : destinoApp({ rota: 'escritorio', secao: 'tarefa', entidade: tarefa.id })
                              }
                            >
                              {assessor ? 'Abrir Casa' : oculto ? 'Abrir escritório' : 'Ver tarefa no escritório'}{' '}
                              <Icone nome="abrir" size={16} />
                            </a>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <div className="f-vazio">
                    {indisponivel ? <Erro /> : <TudoEmDia />}
                    <div>
                      <h2>
                        {indisponivel
                          ? 'Fila indisponível'
                          : pasta === 'agora'
                            ? 'Fila livre'
                            : pasta === 'depois'
                              ? 'Nada adiado'
                              : 'Nada marcado como feito'}
                      </h2>
                      <p>
                        {indisponivel
                          ? 'Tente voltar mais tarde.'
                          : pasta === 'agora'
                            ? 'Novas decisões da equipe aparecem aqui.'
                            : 'As decisões que você mover aparecem aqui.'}
                      </p>
                    </div>
                  </div>
                )}
                {nestaPasta.length > porPagina && (
                  <div className="f-paginacao" aria-label="Páginas da fila" role="group">
                    <button
                      type="button"
                      disabled={paginaAtual === 0}
                      onClick={() => {
                        irPara(pasta, paginaAtual - 1)
                        focarLinhaOuAba()
                      }}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={(paginaAtual + 1) * porPagina >= nestaPasta.length}
                      onClick={() => {
                        irPara(pasta, paginaAtual + 1)
                        focarLinhaOuAba()
                      }}
                    >
                      Próxima
                    </button>
                  </div>
                )}
                {incompleta && <p className="f-fila-nota">Há outras tarefas no escritório.</p>}
                <p className="f-sr" role="status">
                  {ultima &&
                    (ultima.destino === 'feitas'
                      ? 'Marcada como feita na prévia.'
                      : ultima.destino === 'depois'
                        ? 'Movida para Depois na prévia.'
                        : 'De volta à fila na prévia.')}
                </p>
                {ultima && (
                  <div className="f-undo">
                    <span>
                      {ultima.destino === 'feitas'
                        ? 'Marcada como feita.'
                        : ultima.destino === 'depois'
                          ? 'Guardada para depois.'
                          : 'De volta à fila.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMovidas(anteriores => ({ ...anteriores, [ultima.id]: ultima.origem }))
                        setUltima(undefined)
                        irPara(ultima.origem)
                        focarLinhaOuAba()
                      }}
                    >
                      <Icone nome="desfazer" size={16} />
                      Desfazer
                    </button>
                  </div>
                )}
              </div>
              <footer className="f-rodape">
                <span>Alterações valem nesta prévia.</span>
                {!celular && (
                  <span className="f-teclas">
                    <kbd>↑</kbd>
                    <kbd>↓</kbd> navegar <kbd>F</kbd> já fiz <kbd>D</kbd> depois <kbd>A</kbd> abrir
                  </span>
                )}
              </footer>
            </section>
            {casal ? (
              <Escritorio dados={dados} sala={selecionada?.pessoa?.sala} celular={celular} />
            ) : (
              <aside className="f-escritorio f-restrito">
                <AssessorDaCasa />
                <h2>Rotina da casa</h2>
                <a href="../../#/casa">
                  Abrir Casa <Icone nome="abrir" size={16} />
                </a>
              </aside>
            )}
          </div>
          {celular && navegacao}
        </>
      )}
    </div>
  )
}

export function Proposta(props: PropsProposta) {
  return (
    <Caixa
      key={JSON.stringify([props.dados.familia.id, props.dados.pessoa.papel.valor, props.dados.pessoa.nome.valor])}
      {...props}
    />
  )
}
