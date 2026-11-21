import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/dm-sans'
import { Icone, icones, type NomeIcone } from '../../componentes/Icone'
import { AssessorDaCasa, Plano2029, SemCartoes, TudoEmDia } from '../../componentes/ilustracoes/figuras'
import { podeVerNoMenu, type Rota } from '../../lib/rotas'
import { dataCurta, segundaDaSemana, somaDias } from '../../lib/formato'
import { EscritorioMaquete, type PropsEscritorioMaquete } from '../../componentes/escritorio/EscritorioMaquete'
import { PrivacidadePropostas, useValoresOcultos, Valor } from '../../componentes/escritorio/privacidade'
import { Manha } from './Manha'
import type { DadosInicio, NivelAlerta } from '../../componentes/escritorio/dadosDeExemplo'
import type { PropsProposta } from '../Propostas'
import './jornada.css'

const abas = [
  ['inicio', 'Início'],
  ['lancamentos', 'Gastos'],
  ['orcamento', 'Orçamento'],
  ['casa', 'Casa'],
] as const
const destinos = [
  ['escritorio', 'Escritório'],
  ['cartoes', 'Cartões'],
  ['planejamento', 'Planejamento'],
  ['guardado', 'Guardado'],
  ['desejos', 'Desejos'],
  ['ajustes', 'Ajustes'],
  ['privacidade', 'Privacidade'],
] as const
const alertas = {
  'dinheiro em risco': { ordem: 0, rotulo: 'Dinheiro em risco', icone: 'erro' },
  operacao: { ordem: 1, rotulo: 'Operação', icone: 'lancamentos' },
  lembrete: { ordem: 2, rotulo: 'Lembrete', icone: 'pendente' },
} as const

function href(rota: Rota) {
  return '../../#/' + rota
}

function Navegacao({ papel, posicao }: { papel: 'casal' | 'pessoa'; posicao: 'topo' | 'base' }) {
  const menu = useRef<HTMLDetailsElement>(null)
  return (
    <nav
      className={'jc-nav jc-nav-' + posicao}
      aria-label="Navegação da família"
      onKeyDown={evento => {
        if (evento.key === 'Escape' && menu.current?.open) {
          menu.current.open = false
          menu.current.querySelector('summary')?.focus()
        }
      }}
    >
      {abas.map(([rota, nome]) => (
        <a
          key={rota}
          href={rota === 'inicio' ? '#/c' : href(rota)}
          aria-current={rota === 'inicio' ? 'page' : undefined}
        >
          <Icone nome={rota} />
          {nome}
        </a>
      ))}
      <details ref={menu} className="jc-mais">
        <summary>
          <Icone nome="mais" />
          Mais
        </summary>
        <ul>
          {destinos
            .filter(([rota]) => podeVerNoMenu(rota, papel))
            .map(([rota, nome]) => (
              <li key={rota}>
                <a href={href(rota)}>
                  <Icone nome={rota} size={18} />
                  {nome}
                </a>
              </li>
            ))}
        </ul>
      </details>
    </nav>
  )
}

function Acao({
  rota,
  icone,
  children,
  primaria = false,
}: {
  rota: Rota
  icone: NomeIcone
  children: ReactNode
  primaria?: boolean
}) {
  return (
    <a className={primaria ? 'jc-acao jc-acao-primaria' : 'jc-acao'} href={href(rota)}>
      <Icone nome={icone} size={18} />
      {children}
      <Icone nome="abrir" size={16} />
    </a>
  )
}

function Cabecalho({ papel }: { papel: DadosInicio['pessoa']['papel']['valor'] }) {
  return (
    <header className="jc-topo">
      <div className="jc-marca">
        <Icone nome="inicio" size={18} />
        <span>Central da Família</span>
      </div>
      {(papel === 'casal' || papel === 'pessoa') && <Navegacao papel={papel} posicao="topo" />}
      <span className="jc-exemplo selo-exemplo">Exemplo</span>
    </header>
  )
}

const diaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' })

function Heroi({ dados, assessor }: { dados: DadosInicio; assessor: boolean }) {
  const oculto = useValoresOcultos()
  const nome = dados.pessoa.nome.valor
  const saudacao = (dados.saudacao.valor ?? 'Olá') + (nome ? ', ' + nome : '')
  const valor = dados.hojePodeGastar.valor
  return (
    <section className="jc-heroi">
      <p className="jc-saudacao">
        {saudacao}
        {dados.data.estado === 'pronto' && (
          <span className="jc-dia"> · {diaDaSemana.format(new Date(dados.data.valor + 'T12:00:00Z'))}</span>
        )}
      </p>
      {assessor ? (
        <h1>Tarefas da casa</h1>
      ) : valor.estado !== 'pronto' ? (
        <h1>Quanto posso gastar hoje?</h1>
      ) : (
        <h1>
          <span className="jc-frase">
            {oculto ? 'Limite de hoje' : valor.valor < 0 ? 'Hoje faltam' : 'Hoje você pode gastar'}
          </span>{' '}
          <Valor campo={{ ...valor, valor: Math.abs(valor.valor) }} className="jc-valor-heroi" />
        </h1>
      )}
      <div className="jc-heroi-rodape">
        {!assessor && (
          <p className="jc-saude">
            {valor.estado !== 'pronto'
              ? 'Ainda sem dado'
              : oculto
                ? 'Seu orçamento está em modo privado.'
                : valor.valor < 0
                  ? 'O gasto passou do limite de hoje.'
                  : valor.valor === 0
                    ? 'O limite de hoje foi atingido.'
                    : 'Limite previsto para hoje.'}
          </p>
        )}
        {assessor ? (
          <Acao rota="casa" icone="casa" primaria>
            Abrir Casa
          </Acao>
        ) : (
          <Acao rota="orcamento" icone="orcamento">
            Abrir orçamento
          </Acao>
        )}
        {assessor ? <AssessorDaCasa className="jc-arte-heroi" /> : <Manha />}
      </div>
    </section>
  )
}

const tarefasDaCasa: Readonly<Record<string, string>> = {
  feira_feita: 'Confirmar a feira',
  feira_nota: 'Anexar a nota da feira',
  estoque: 'Conferir o estoque',
  prestador_veio: 'Confirmar a visita do prestador',
  gas: 'Conferir a troca do gás',
}

type Tarefa = NonNullable<DadosInicio['pendencias']['fila']['valor']>[number] & {
  tituloCasa?: string
  nivel?: NivelAlerta
}
const mensagens = {
  feito: 'Marcado como feito neste exemplo.',
  depois: 'Deixado para depois neste exemplo.',
  desfeito: 'O pedido voltou para Agora.',
} as const

function Jornada({
  dados,
  assessor,
  casal,
  dispositivo,
}: {
  dados: DadosInicio
  assessor: boolean
  casal: boolean
  dispositivo: PropsProposta['dispositivo']
}) {
  const oculto = useValoresOcultos()
  const id = useId()
  const tituloPedido = useId()
  const status = useRef<HTMLParagraphElement>(null)
  const [sessao, setSessao] = useState<{
    respondidas: string[]
    ultimaAcao?: keyof typeof mensagens
  }>({ respondidas: [] })
  const { fila } = dados.pendencias
  const nivelPorId = new Map(dados.alertas.valor?.map(a => [a.id, a.nivel]))
  const elegiveis =
    fila.valor
      ?.flatMap<Tarefa>(tarefa => {
        const tipo = tarefa.id.split(':')[0]
        const tituloCasa = Object.prototype.hasOwnProperty.call(tarefasDaCasa, tipo) ? tarefasDaCasa[tipo] : undefined
        if (!casal && !tituloCasa) return []
        const nivel = assessor ? 'operacao' : nivelPorId.get(tarefa.id)
        return [{ ...tarefa, tituloCasa, nivel }]
      })
      .sort((a, b) => prioridade(a.nivel) - prioridade(b.nivel)) ?? []
  const tarefas = elegiveis.filter(tarefa => !sessao.respondidas.includes(tarefa.id))
  const primeira = tarefas[0]
  const sala = oculto ? undefined : dados.funcionarios.valor?.find(p => p.id === primeira?.funcionario)?.sala

  useEffect(() => {
    if (sessao.ultimaAcao) status.current?.focus({ preventScroll: true })
  }, [sessao])

  function responder(acao: 'feito' | 'depois') {
    if (!primeira) return
    setSessao(anterior =>
      anterior.respondidas.includes(primeira.id)
        ? anterior
        : {
            respondidas: [...anterior.respondidas, primeira.id],
            ultimaAcao: acao,
          },
    )
  }
  function desfazer() {
    setSessao(anterior => ({ respondidas: anterior.respondidas.slice(0, -1), ultimaAcao: 'desfeito' }))
  }

  return (
    <div className="jc-jornada">
      <section className="jc-capitulo jc-agora" aria-labelledby={id}>
        <div className="jc-capitulo-topo">
          <div>
            <h2 id={id}>Agora</h2>
            <p>{casal ? 'O que precisa de você' : 'O que precisa de atenção em casa'}</p>
          </div>
          {!primeira && fila.estado !== 'indisponivel' && <TudoEmDia className="jc-figura" />}
        </div>
        {!primeira ? (
          <p className="jc-vazio">
            {fila.estado === 'indisponivel' ? 'Ainda sem dado sobre as tarefas.' : 'Nenhum pedido para agora.'}
          </p>
        ) : (
          <ul className="jc-tarefas" aria-label="Pedidos em destaque">
            {tarefas.slice(0, dispositivo === 'celular' ? 1 : 3).map((tarefa, indice) => {
              const pessoa = !casal ? null : dados.funcionarios.valor?.find(f => f.id === tarefa.funcionario)
              const icone = Object.prototype.hasOwnProperty.call(icones, tarefa.funcionario)
                ? (tarefa.funcionario as NomeIcone)
                : 'pessoa'
              const nivel = tarefa.nivel && alertas[tarefa.nivel]
              const risco = !oculto && tarefa.nivel === 'dinheiro em risco'
              const titulo = !casal || oculto ? (tarefa.tituloCasa ?? 'Pedido do escritório') : tarefa.perguntaCurta
              return (
                <li key={tarefa.id} className={indice === 0 ? 'jc-primeiro' : undefined}>
                  <span className="jc-avatar">
                    <Icone nome={icone} size={16} />
                  </span>
                  <div className="jc-pedido">
                    <strong id={indice === 0 ? tituloPedido : undefined}>{titulo}</strong>
                    <div className="jc-pedido-meta">
                      {pessoa && <small>{pessoa.curto}</small>}
                      {nivel && (
                        <span className="jc-etiqueta" data-risco={risco || undefined}>
                          <Icone nome={nivel.icone} size={13} />
                          {nivel.rotulo}
                        </span>
                      )}
                    </div>
                  </div>
                  {indice === 0 && (
                    <div className="jc-respostas" role="group" aria-labelledby={tituloPedido}>
                      <button type="button" className="jc-acao jc-acao-primaria" onClick={() => responder('feito')}>
                        <Icone nome="salvo" size={16} />
                        Já fiz
                      </button>
                      <button type="button" className="jc-acao" onClick={() => responder('depois')}>
                        <Icone nome="pendente" size={16} />
                        Depois
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {casal ? (
          <Acao rota="escritorio" icone="lancamentos">
            Ver todos os pedidos
          </Acao>
        ) : (
          <Acao rota="casa" icone="casa">
            Ver tarefas da casa
          </Acao>
        )}
        <div className="jc-retorno">
          <p ref={status} role="status" tabIndex={-1}>
            {sessao.ultimaAcao && mensagens[sessao.ultimaAcao]}
          </p>
          {sessao.respondidas.length > 0 && (
            <button type="button" className="jc-atalho jc-desfazer" onClick={desfazer}>
              <Icone nome="desfazer" size={16} />
              Desfazer
            </button>
          )}
        </div>
      </section>
      {casal && (
        <>
          <Vinheta dados={dados} sala={sala} />
          <Semana dados={dados} />
          <Caminho plano={dados.plano2029} />
        </>
      )}
    </div>
  )
}

function prioridade(nivel: NivelAlerta | undefined) {
  return nivel ? alertas[nivel].ordem : Infinity
}

function Vinheta({ dados, sala }: { dados: DadosInicio; sala: PropsEscritorioMaquete['salaDestacada'] }) {
  const oculto = useValoresOcultos()
  const id = useId()
  return (
    <aside className="jc-vinheta" aria-labelledby={id}>
      <div className="jc-vinheta-topo">
        <h2 id={id}>Sua equipe</h2>
        <a className="jc-atalho" href={href('escritorio')}>
          Visitar escritório
          <Icone nome="abrir" size={15} />
        </a>
        <p>
          {dados.funcionarios.estado === 'indisponivel'
            ? 'Ainda sem dado sobre a equipe.'
            : dados.funcionarios.estado === 'vazio'
              ? 'Nenhum funcionário na lista.'
              : sala
                ? 'A sala destacada cuida do primeiro pedido.'
                : 'Quem cuida do dia a dia da família.'}
        </p>
      </div>
      {dados.funcionarios.estado === 'pronto' && (
        <div className="jc-maquete">
          <EscritorioMaquete
            funcionarios={dados.funcionarios}
            salaDestacada={sala}
            mostrarPlaquinhas={!oculto}
            variante="media"
          />
        </div>
      )}
    </aside>
  )
}

function FaturasDaSemana({ dados }: { dados: DadosInicio }) {
  const oculto = useValoresOcultos()
  const { proximas } = dados.faturas
  if (oculto) return <>Vencimentos ocultos</>
  if (proximas.estado === 'vazio') return <>Nenhuma fatura a vencer nesta semana.</>
  if (dados.data.estado !== 'pronto' || proximas.estado !== 'pronto') return <>Ainda sem dado</>
  const hoje = dados.data.valor
  const fim = somaDias(segundaDaSemana(hoje), 6)
  const vencimentos = proximas.valor
    .flatMap(f => {
      const dia = f.vencimento.valor
      return dia && dia >= hoje && dia <= fim ? [dia] : []
    })
    .sort()
  const primeiro = vencimentos[0]
  const parcial = proximas.valor.some(f => f.vencimento.estado !== 'pronto')
  if (primeiro)
    return (
      <>
        {parcial ? 'Vencimento informado em' : 'Próximo vencimento em'} {dataCurta(primeiro)}.
      </>
    )
  return parcial ? <>Ainda sem dado sobre vencimentos.</> : <>Nenhuma fatura a vencer nesta semana.</>
}

function Semana({ dados }: { dados: DadosInicio }) {
  const id = useId()
  const previsto = dados.recebimentos.previsto
  return (
    <section className="jc-capitulo jc-semana" aria-labelledby={id}>
      <div className="jc-capitulo-topo">
        <h2 id={id}>Esta semana</h2>
        <SemCartoes className="jc-figura" />
      </div>
      <div className="jc-semana-itens">
        <div>
          <a className="jc-atalho" href={href('cartoes')}>
            <Icone nome="cartao" size={17} />
            Faturas
            <Icone nome="abrir" size={15} />
          </a>
          <p>
            <FaturasDaSemana dados={dados} />
          </p>
        </div>
        <div>
          <a className="jc-atalho" href={href('planejamento')}>
            <Icone nome="entrada" size={17} />
            Recebimentos do mês
            <Icone nome="abrir" size={15} />
          </a>
          <p>
            {previsto.estado !== 'pronto' ? (
              'Ainda sem dado'
            ) : (
              <>
                <Valor campo={previsto} className="jc-numero" /> previstos.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  )
}

function Caminho({ plano }: { plano: DadosInicio['plano2029'] }) {
  const id = useId()
  const oculto = useValoresOcultos()
  const { progressao, faltamPorMesComMargem: falta } = plano
  return (
    <section className="jc-capitulo jc-caminho" aria-labelledby={id}>
      <div className="jc-capitulo-topo">
        <div>
          <h2 id={id}>O caminho até 2029</h2>
          <p>
            {plano.cenario.estado === 'pronto' ? 'Estimativa no cenário garantido' : 'Ainda sem dado sobre o cenário.'}
          </p>
        </div>
        <Plano2029 className="jc-figura" />
      </div>
      <div className="jc-projecao">
        {progressao.estado !== 'pronto' ? (
          <p>Ainda sem dado sobre a cobertura.</p>
        ) : oculto ? (
          <p>Cobertura oculta</p>
        ) : (
          <>
            <p>
              <Valor campo={progressao} className="jc-numero" /> <span>da meta mensal coberta</span>
            </p>
            <div className="jc-trilha" aria-hidden="true">
              <div style={{ inlineSize: Math.min(100, Math.max(0, progressao.valor)) + '%' }} />
            </div>
          </>
        )}
        <p>
          {falta.estado !== 'pronto' ? (
            'Ainda sem dado sobre a falta mensal.'
          ) : (
            <>
              <Valor campo={falta} className="jc-numero" /> <span>de diferença mensal, com margem</span>
            </>
          )}
        </p>
      </div>
      <Acao rota="planejamento" icone="plano2029">
        Abrir Planejamento
      </Acao>
    </section>
  )
}

export function Proposta({ dados, tema, dispositivo, oculto }: PropsProposta & { oculto?: boolean }) {
  const ocultoNaCasca = useValoresOcultos()
  const papel = dados.pessoa.papel.valor
  const assessor = papel === 'equipe' || papel === null
  return (
    <PrivacidadePropostas.Provider value={ocultoNaCasca || oculto === true}>
      <div className="jc" data-proposta="c" data-jc-tema={tema} data-jc-dispositivo={dispositivo}>
        <Cabecalho papel={papel} />
        <div className="jc-corpo">
          <Heroi dados={dados} assessor={assessor} />
          <Jornada
            key={JSON.stringify([dados.familia.id, dados.pessoa.nome.valor, papel, dados.data.valor])}
            dados={dados}
            assessor={assessor}
            dispositivo={dispositivo}
            casal={papel === 'casal'}
          />
        </div>
        {!assessor && <Navegacao papel={papel} posicao="base" />}
      </div>
    </PrivacidadePropostas.Provider>
  )
}
