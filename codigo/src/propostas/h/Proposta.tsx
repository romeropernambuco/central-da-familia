import { useId, useRef, useState, type RefObject } from 'react'
import '@fontsource-variable/inter'
import '@fontsource-variable/manrope'
import { Icone, type NomeIcone } from '../../componentes/Icone'
import { AssessorDaCasa, Bemvindo, TudoEmDia } from '../../componentes/ilustracoes'
import { EscritorioMaquete } from '../comuns/EscritorioMaquete'
import { useValoresOcultos, Valor } from '../comuns/privacidade'
import type { EstadoFuncionario } from '../../api/tipos'
import type { DadosInicio, NivelAlerta } from '../dadosExemplo'
import type { PropsProposta } from '../Propostas'
import { Aplicacoes, Faturas, Plano, Ritmo } from './Graficos'
import './instrumentos.css'

const salas = [
  { id: 'caixa', nome: 'Caixa', icone: 'orcamento' },
  { id: 'casa', nome: 'Casa', icone: 'casa' },
  { id: 'cartoes', nome: 'Cartões', icone: 'cartoes' },
  { id: 'patrimonio', nome: 'Patrimônio', icone: 'guardado' },
] as const
type Sala = (typeof salas)[number]['id']

const estados = {
  precisa_de_voce: 'Precisa de você',
  trabalhando: 'Trabalhando',
  entregue: 'Entregue',
  vai_comecar: 'Vai começar',
} satisfies Record<EstadoFuncionario, string>

const niveis = [
  {
    id: 'dinheiro em risco',
    titulo: 'Dinheiro em risco',
    icone: 'erro',
    texto: 'Confira os pagamentos com vencimento que pede atenção.',
  },
  {
    id: 'operacao',
    titulo: 'Operação',
    icone: 'lancamentos',
    texto: 'Há tarefas da equipe esperando sua confirmação.',
  },
  { id: 'lembrete', titulo: 'Lembrete', icone: 'secretaria', texto: 'Há lembretes agendados para revisar.' },
] as const satisfies readonly { id: NivelAlerta; titulo: string; icone: NomeIcone; texto: string }[]

function irPara(ref: RefObject<HTMLElement>) {
  ref.current?.focus({ preventScroll: true })
  ref.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
}

function Identidade() {
  return (
    <div className="h-identidade">
      <Icone nome="inicio" size={23} />
      <strong>Central da Família</strong>
      <span className="selo-exemplo">Exemplo</span>
    </div>
  )
}

function Casa({ dados, semPapel }: { dados: DadosInicio['casa']; semPapel: boolean }) {
  const tarefas = [
    dados.feiraPendente.valor && 'Confirmar a feira da semana',
    (dados.notasPendentes.valor ?? 0) > 0 && 'Registrar a nota da feira',
    dados.estoquePendente.valor && 'Conferir o estoque da casa',
  ].filter((tarefa): tarefa is string => typeof tarefa === 'string')
  const incompleta = [dados.feiraPendente, dados.notasPendentes, dados.estoquePendente].some(
    campo => campo.estado === 'indisponivel',
  )
  return (
    <>
      <div className="h-heroi h-heroi-casa">
        <div>
          <p className="h-sobretitulo">Casa</p>
          <h1>Tarefas da casa</h1>
        </div>
        <AssessorDaCasa className="h-arte-heroi" />
      </div>
      <section className="h-corpo h-fila">
        <h2>Para conferir</h2>
        {semPapel ? (
          <p>O perfil de acesso está indisponível.</p>
        ) : (
          <>
            {tarefas.length > 0 && (
              <ul>
                {tarefas.map(tarefa => (
                  <li key={tarefa}>
                    <Icone nome="lancamentos" size={18} />
                    {tarefa}
                  </li>
                ))}
              </ul>
            )}
            {incompleta ? (
              <p>Parte da lista da Casa está indisponível.</p>
            ) : (
              !tarefas.length && <p>Nenhuma tarefa da Casa para conferir.</p>
            )}
          </>
        )}
      </section>
    </>
  )
}

function Fila({ dados, alvo }: { dados: DadosInicio['alertas']; alvo: RefObject<HTMLElement> }) {
  const oculto = useValoresOcultos()
  const lista = dados.valor ?? []
  return (
    <section className="h-fila" ref={alvo} tabIndex={-1} aria-label="Pendências">
      <h2>Pendências</h2>
      {lista.length ? (
        <ul>
          {niveis.map(({ id, titulo, icone, texto }) => {
            const item = lista.find(a => a.nivel === id)
            return (
              item && (
                <li key={id}>
                  <span className="h-nivel" data-nivel={id}>
                    <Icone nome={icone} size={15} />
                    {titulo}
                  </span>
                  <p>{oculto ? texto : item.texto || texto}</p>
                </li>
              )
            )
          })}
        </ul>
      ) : dados.estado === 'indisponivel' ? (
        <p>Fila de avisos indisponível.</p>
      ) : (
        <div className="h-fila-vazia">
          <TudoEmDia />
          <p>Nenhum aviso na fila recente.</p>
        </div>
      )}
    </section>
  )
}

function Equipe({ dados, alvo, casal }: { dados: DadosInicio; alvo: RefObject<HTMLElement>; casal: boolean }) {
  const [sala, escolherSala] = useState<Sala>('caixa')
  const [interagiu, setInteragiu] = useState(false)
  const oculto = useValoresOcultos()
  const listaId = useId()
  const funcionarios = dados.funcionarios.valor?.filter(f => f.sala === sala) ?? []
  const balao =
    sala === 'caixa'
      ? { id: 'contador', rotulo: 'Contador · saldo em conta', campo: dados.saldoConta }
      : sala === 'patrimonio'
        ? { id: 'guardado', rotulo: 'Guardado · rendimento de hoje', campo: dados.aplicacoes.rendeuHoje }
        : null
  const valorBalao =
    !oculto && casal && interagiu && balao?.campo.estado === 'pronto' && funcionarios.some(f => f.id === balao.id)
      ? balao.campo
      : null
  const maquete = {
    funcionarios: dados.funcionarios,
    salaDestacada: sala,
    mostrarPlaquinhas: true,
    valores: balao && valorBalao ? { [balao.id]: valorBalao } : undefined,
    variante: 'media' as const,
    oculto,
    papel: dados.pessoa.papel.valor,
  }

  return (
    <section className="h-equipe" ref={alvo} tabIndex={-1} aria-label="Escritório">
      <div className="h-equipe-info">
        <div className="h-sobretitulo">
          <Icone nome="escritorio" size={17} /> Escritório
        </div>
        <h2>Equipe trabalhando</h2>
        {dados.funcionarios.estado === 'pronto' ? (
          <>
            <div className="h-salas" role="group" aria-label="Escolher sala do escritório">
              {salas.map(({ id, nome, icone }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={sala === id}
                  aria-controls={listaId}
                  onClick={() => {
                    escolherSala(id)
                    setInteragiu(true)
                  }}
                >
                  <Icone nome={icone} size={16} />
                  {nome}
                </button>
              ))}
            </div>
            <div id={listaId} aria-live="polite">
              {funcionarios.length ? (
                <ul className="h-funcionarios">
                  {funcionarios.map(f => (
                    <li key={f.id}>
                      <span className="h-avatar" aria-hidden="true">
                        <Icone nome="pessoa" size={16} />
                      </span>
                      <span>
                        <strong>{f.nome}</strong>
                        <small>{f.estadoHoje.valor ? estados[f.estadoHoje.valor] : 'Estado indisponível'}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhum funcionário registrado nesta sala.</p>
              )}
            </div>
          </>
        ) : (
          <p>
            {dados.funcionarios.estado === 'vazio'
              ? 'Nenhum funcionário registrado.'
              : 'O estado da equipe está indisponível.'}
          </p>
        )}
      </div>
      {dados.funcionarios.estado === 'pronto' && (
        <div className="h-maquete">
          <div aria-hidden="true">
            <EscritorioMaquete {...maquete} />
          </div>
          <p aria-live="polite">
            {balao && valorBalao && (
              <span
                role="img"
                aria-label={`${balao.rotulo}, ${valorBalao.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
              >
                {balao.rotulo}
              </span>
            )}
          </p>
        </div>
      )}
    </section>
  )
}

export function Proposta({ dados, tema, dispositivo }: PropsProposta) {
  const inicio = useRef<HTMLDivElement>(null)
  const mes = useRef<HTMLElement>(null)
  const plano = useRef<HTMLElement>(null)
  const faturas = useRef<HTMLElement>(null)
  const equipe = useRef<HTMLElement>(null)
  const fila = useRef<HTMLElement>(null)
  const papel = dados.pessoa.papel.valor
  const oculto = useValoresOcultos()
  const casal = papel === 'casal'
  const disponivel = dados.hojePodeGastar.valor
  const risco = dados.alertas.valor?.some(a => a.nivel === 'dinheiro em risco')
  const saude = risco
    ? 'Um pagamento pede atenção.'
    : dados.alertas.valor?.length
      ? 'Há avisos para você conferir.'
      : dados.alertas.estado === 'indisponivel'
        ? 'Os avisos estão indisponíveis.'
        : 'Nenhum aviso na fila recente.'
  const abas = [
    { titulo: 'Início', icone: 'inicio', alvo: inicio },
    { titulo: 'Mês', icone: 'painel', alvo: mes },
    { titulo: 'Plano', icone: 'plano2029', alvo: plano },
    { titulo: 'Faturas', icone: 'cartoes', alvo: faturas },
    { titulo: 'Mais', rotulo: 'Mais sobre a equipe', icone: 'mais', alvo: equipe },
  ] as const
  const navegacao = (
    <nav className="h-nav" aria-label="Navegação do Início">
      {abas
        .filter(aba => casal || (aba.alvo !== plano && aba.alvo !== faturas))
        .map(aba => (
          <button
            key={aba.titulo}
            type="button"
            aria-current={aba.alvo === inicio ? 'page' : undefined}
            aria-label={'rotulo' in aba ? aba.rotulo : undefined}
            onClick={() => irPara(aba.alvo)}
          >
            <Icone nome={aba.icone} size={19} />
            {aba.titulo}
          </button>
        ))}
    </nav>
  )

  return (
    <article className="h-inicio" data-proposta="h" data-h-tema={tema} data-h-dispositivo={dispositivo}>
      <header className="h-topo">
        <Identidade />
      </header>
      {!papel || papel === 'equipe' ? (
        <Casa dados={dados.casa} semPapel={!papel} />
      ) : (
        <>
          {dispositivo === 'desktop' && navegacao}
          <div className="h-heroi" ref={inicio} tabIndex={-1}>
            <div className="h-heroi-editorial">
              <div className="h-abertura">
                <p className="h-sobretitulo">Início</p>
                <h1>Instrumentos</h1>
                <p>Seu dinheiro hoje e os planos da família.</p>
              </div>
              <Bemvindo className="h-arte-heroi" />
            </div>
            <div className="h-saude">
              <div className="h-disponivel">
                <span>Disponível para gastar hoje</span>
                {oculto ? (
                  <strong>Valor oculto</strong>
                ) : disponivel.estado === 'pronto' ? (
                  <Valor campo={disponivel} className="h-principal" />
                ) : (
                  <strong>{disponivel.estado === 'vazio' ? 'Sem registros' : 'Indisponível'}</strong>
                )}
              </div>
              <div className="h-avisos">
                <p>
                  <Icone nome={risco ? 'erro' : 'recepcao'} size={17} />
                  {saude}
                </p>
                <button type="button" onClick={() => irPara(fila)}>
                  Ver avisos <Icone nome="abrir" size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className="h-corpo">
            <section className="h-caderno" ref={mes} tabIndex={-1} aria-label="Leituras do dinheiro">
              <h2>Leituras do dinheiro</h2>
              <div className="h-grade-instrumentos">
                {casal && (
                  <div className="h-painel h-painel-carteira">
                    <Aplicacoes dados={dados.aplicacoes} />
                  </div>
                )}
                <div className="h-painel">
                  <Ritmo dados={dados.hojePodeGastar.ritmoMes} />
                </div>
                {casal && (
                  <>
                    <section ref={plano} tabIndex={-1} aria-label="Plano 2029" className="h-painel">
                      <Plano dados={dados.plano2029} />
                    </section>
                    <section ref={faturas} tabIndex={-1} aria-label="Faturas por mês" className="h-painel">
                      <Faturas dados={dados.faturas} />
                    </section>
                  </>
                )}
              </div>
            </section>
            <Equipe dados={dados} alvo={equipe} casal={casal} />
            <Fila dados={dados.alertas} alvo={fila} />
          </div>
          {dispositivo === 'celular' && navegacao}
        </>
      )}
    </article>
  )
}
