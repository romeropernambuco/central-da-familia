import { useId, useRef, type ReactNode } from 'react'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/dm-sans'
import { Icone, icones, type NomeIcone } from '../../componentes/Icone'
import { AssessorDaCasa, Bemvindo, Plano2029, SemCartoes, TudoEmDia } from '../../componentes/ilustracoes/figuras'
import { podeVerNoMenu, type Rota } from '../../app/rotas'
import { dataCurta, segundaDaSemana, somaDias } from '../../lib/formato'
import { EscritorioMaquete } from '../comuns/EscritorioMaquete'
import { NumeroFinanceiro, PrivacidadePropostas, useValoresOcultos, Valor } from '../comuns/privacidade'
import type { DadosInicio, NivelAlerta } from '../dadosExemplo'
import type { PropsProposta } from '../Propostas'
import './jornada.css'

const abas = [
  ['inicio', 'Início'], ['lancamentos', 'Gastos'], ['orcamento', 'Orçamento'], ['casa', 'Casa'],
] as const
const destinos = [
  ['escritorio', 'Escritório'], ['cartoes', 'Cartões'], ['planejamento', 'Planejamento'],
  ['guardado', 'Guardado'], ['desejos', 'Desejos'], ['ajustes', 'Ajustes'], ['privacidade', 'Privacidade'],
] as const
const alertas = {
  'dinheiro em risco': { ordem: 0, rotulo: 'Dinheiro em risco', icone: 'erro' },
  operacao: { ordem: 1, rotulo: 'Operação', icone: 'lancamentos' },
  lembrete: { ordem: 2, rotulo: 'Lembrete', icone: 'pendente' },
} as const

function href(rota: Rota) {
  return '../../#/' + rota
}

function Navegacao({ papel, posicao }: {
  papel: 'casal' | 'pessoa'; posicao: 'topo' | 'base'
}) {
  const menu = useRef<HTMLDetailsElement>(null)
  return <nav className={'jc-nav jc-nav-' + posicao} aria-label="Navegação da família"
    onKeyDown={evento => {
      if (evento.key === 'Escape' && menu.current?.open) {
        menu.current.open = false
        menu.current.querySelector('summary')?.focus()
      }
    }}>
    {abas.map(([rota, nome]) => <a key={rota} href={rota === 'inicio' ? '#/c' : href(rota)}
      aria-current={rota === 'inicio' ? 'page' : undefined}><Icone nome={rota} />{nome}</a>)}
    <details ref={menu} className="jc-mais">
      <summary><Icone nome="mais" />Mais</summary>
      <ul>{destinos.filter(([rota]) => podeVerNoMenu(rota, papel)).map(([rota, nome]) =>
        <li key={rota}><a href={href(rota)}><Icone nome={rota} size={18} />{nome}</a></li>)}</ul>
    </details>
  </nav>
}

function Acao({ rota, icone, children, primaria = false }: {
  rota: Rota; icone: NomeIcone; children: ReactNode; primaria?: boolean
}) {
  return <a className={primaria ? 'jc-acao jc-acao-primaria' : 'jc-acao'} href={href(rota)}>
    <Icone nome={icone} size={18} />{children}<Icone nome="abrir" size={16} />
  </a>
}

function Cabecalho({ papel }: { papel: DadosInicio['pessoa']['papel']['valor'] }) {
  return <header className="jc-topo">
    <div className="jc-marca"><Icone nome="inicio" size={18} /><span>Central da Família</span></div>
    {(papel === 'casal' || papel === 'pessoa') && <Navegacao papel={papel} posicao="topo" />}
    <span className="jc-exemplo selo-exemplo">Exemplo</span>
  </header>
}

const diaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' })

function Heroi({ dados, assessor }: { dados: DadosInicio; assessor: boolean }) {
  const oculto = useValoresOcultos()
  const nome = dados.pessoa.nome.valor
  const saudacao = (dados.saudacao.valor ?? 'Olá') + (nome ? ', ' + nome : '')
  const valor = dados.hojePodeGastar.valor
  return <section className="jc-heroi">
    <div className="jc-heroi-texto">
      <p className="jc-saudacao">{saudacao}{dados.data.estado === 'pronto' &&
        <span className="jc-dia"> · {diaDaSemana.format(new Date(dados.data.valor + 'T12:00:00Z'))}</span>}</p>
      {assessor ? <h1>Tarefas da casa</h1> : valor.estado !== 'pronto' ?
        <h1>Quanto posso gastar hoje?</h1> : <h1>
          {oculto ? 'Limite de hoje' : valor.valor < 0 ? 'Hoje faltam' : 'Hoje você pode gastar'}
          <Valor campo={oculto ? valor : { ...valor, valor: Math.abs(valor.valor) }} className="jc-valor-heroi" />
        </h1>}
      {!assessor && <p className="jc-saude">{valor.estado !== 'pronto' ? 'Ainda sem dado' :
        oculto ? 'Seu orçamento está em modo privado.' :
        valor.valor < 0 ? 'O gasto passou do limite de hoje.' :
        valor.valor === 0 ? 'O limite de hoje foi atingido.' : 'Este é o limite previsto para hoje.'}</p>}
      {assessor ? <Acao rota="casa" icone="casa" primaria>Abrir Casa</Acao> :
        <Acao rota="orcamento" icone="orcamento" primaria>Abrir orçamento</Acao>}
    </div>
    {assessor ? <AssessorDaCasa className="jc-arte-heroi" /> : <Bemvindo className="jc-arte-heroi" />}
  </section>
}

const tarefasDaCasa: Readonly<Record<string, string>> = {
  feira_feita: 'Confirmar a feira',
  feira_nota: 'Anexar a nota da feira',
  estoque: 'Conferir o estoque',
  prestador_veio: 'Confirmar a visita do prestador',
  gas: 'Conferir a troca do gás',
}

function Agora({ dados, assessor, casal, dispositivo }: { dados: DadosInicio; assessor: boolean; casal: boolean; dispositivo: PropsProposta['dispositivo'] }) {
  const oculto = useValoresOcultos()
  const id = useId()
  const { fila } = dados.pendencias
  const nivelPorId = new Map(dados.alertas.valor?.map(a => [a.id, a.nivel]))
  const tarefas = fila.valor?.flatMap(tarefa => {
    const tipo = tarefa.id.split(':')[0]
    const tituloCasa = Object.prototype.hasOwnProperty.call(tarefasDaCasa, tipo) ? tarefasDaCasa[tipo] : undefined
    if (!casal && !tituloCasa) return []
    const nivel = assessor ? 'operacao' : nivelPorId.get(tarefa.id)
    return [{ ...tarefa, tituloCasa, nivel }]
  }).sort((a, b) => prioridade(a.nivel) - prioridade(b.nivel)) ?? []
  return <section className="jc-capitulo jc-agora" aria-labelledby={id}>
    <div className="jc-capitulo-topo">
      <div><h2 id={id}>Agora</h2><p>{casal ? 'O que precisa de você' : 'O que precisa de atenção em casa'}</p></div>
      {tarefas.length > 0 ? <AssessorDaCasa className="jc-figura" /> : <TudoEmDia className="jc-figura" />}
    </div>
    {fila.estado !== 'pronto' || tarefas.length === 0 ? <p className="jc-vazio">
      {fila.estado === 'indisponivel' ? 'Ainda sem dado sobre as tarefas.' :
        'Ainda sem dado. Nenhuma tarefa na lista.'}
    </p> : <ul className="jc-tarefas" aria-label="Tarefas prioritárias">
      {tarefas.slice(0, dispositivo === 'celular' ? 2 : 3).map(tarefa => {
        const pessoa = !casal ? null : dados.funcionarios.valor?.find(f => f.id === tarefa.funcionario)
        const icone = Object.prototype.hasOwnProperty.call(icones, tarefa.funcionario) ? tarefa.funcionario as NomeIcone : 'pessoa'
        const nivel = tarefa.nivel && alertas[tarefa.nivel]
        const risco = !oculto && tarefa.nivel === 'dinheiro em risco'
        const titulo = !casal ? tarefa.tituloCasa : oculto ? 'Pedido para revisar' : tarefa.perguntaCurta
        return <li key={tarefa.id}>
          <span className="jc-avatar"><Icone nome={icone} size={16} /></span>
          <div className="jc-pedido"><strong>{titulo}</strong>{pessoa && <small>{pessoa.curto}</small>}</div>
          {nivel ? <span className="jc-etiqueta" data-risco={risco || undefined}><Icone nome={nivel.icone} size={13} />{nivel.rotulo}</span> :
            <small>Ainda sem dado sobre a prioridade</small>}
        </li>
      })}
    </ul>}
    {casal ? <Acao rota="escritorio" icone="lancamentos">Ver tarefas</Acao> :
      <Acao rota="casa" icone="casa">Ver tarefas da casa</Acao>}
  </section>
}

function prioridade(nivel: NivelAlerta | undefined) {
  return nivel ? alertas[nivel].ordem : Infinity
}

function Vinheta({ dados }: { dados: DadosInicio }) {
  const oculto = useValoresOcultos()
  const equipe = dados.funcionarios.valor ?? []
  const estadosConhecidos = equipe.filter(pessoa => pessoa.estadoHoje.estado === 'pronto')
  const emAndamento = estadosConhecidos.filter(p => p.estadoHoje.valor === 'trabalhando').length
  const entregaram = estadosConhecidos.filter(p => p.estadoHoje.valor === 'entregue').length
  const aguardando = estadosConhecidos.filter(p => p.estadoHoje.valor === 'precisa_de_voce').length
  return <aside className="jc-vinheta" aria-label="Sua equipe">
    <div className="jc-vinheta-texto">
      <p className="jc-editoria"><Icone nome="escritorio" size={16} />Escritório</p>
      <h2>Sua equipe</h2>
      <p>{!estadosConhecidos.length ? 'Ainda sem dado sobre a equipe.' : oculto ? 'Estados da equipe ocultos.' :
        <><strong>{emAndamento || entregaram}</strong> {emAndamento ? 'em andamento' : entregaram === 1 ? 'entregou' : 'entregaram'}
          {' '}<span aria-hidden="true">·</span>{' '}
          <strong>{aguardando}</strong> {aguardando === 1 ? 'espera' : 'esperam'} você</>}</p>
      {!oculto && estadosConhecidos.length > 0 && estadosConhecidos.length < equipe.length &&
        <p>Alguns estados ainda sem dado.</p>}
      <Acao rota="escritorio" icone="escritorio">Visitar escritório</Acao>
    </div>
    <div className="jc-maquete" aria-hidden="true"><EscritorioMaquete funcionarios={dados.funcionarios} /></div>
  </aside>
}

function FaturasDaSemana({ dados }: { dados: DadosInicio }) {
  const oculto = useValoresOcultos()
  const { proximas } = dados.faturas
  if (dados.data.estado !== 'pronto' || proximas.estado !== 'pronto' ||
      proximas.valor.some(f => f.vencimento.estado !== 'pronto')) return <>Ainda sem dado</>
  if (oculto) return <>Vencimentos ocultos</>
  const hoje = dados.data.valor
  const fim = somaDias(segundaDaSemana(hoje), 6)
  const vencimentos = proximas.valor.flatMap(f => {
    const dia = f.vencimento.valor
    return dia && dia >= hoje && dia <= fim ? [dia] : []
  }).sort()
  const ultimo = vencimentos[vencimentos.length - 1]
  if (!ultimo) return <>Nenhuma fatura a vencer nesta semana.</>
  return <><NumeroFinanceiro className="jc-numero">{vencimentos.length}</NumeroFinanceiro>{' '}
    {vencimentos.length === 1 ? 'fatura vence' : 'faturas vencem'} até {dataCurta(ultimo)}.</>
}

function Semana({ dados }: { dados: DadosInicio }) {
  const id = useId()
  const previsto = dados.recebimentos.previsto
  return <section className="jc-capitulo jc-semana" aria-labelledby={id}>
    <div className="jc-capitulo-topo">
      <div><h2 id={id}>Esta semana</h2><p>Vencimentos e o que deve entrar</p></div>
      <SemCartoes className="jc-figura" />
    </div>
    <div className="jc-semana-itens">
      <div><a className="jc-atalho" href={href('cartoes')}><Icone nome="cartao" size={17} />Faturas<Icone nome="abrir" size={15} /></a>
        <p><FaturasDaSemana dados={dados} /></p></div>
      <div><a className="jc-atalho" href={href('planejamento')}><Icone nome="entrada" size={17} />Recebimentos do mês<Icone nome="abrir" size={15} /></a>
        <p>{previsto.estado !== 'pronto' ? 'Ainda sem dado' : <>
          <Valor campo={previsto} className="jc-numero" /> previstos.</>}</p></div>
    </div>
  </section>
}

function Caminho({ plano }: { plano: DadosInicio['plano2029'] }) {
  const id = useId()
  const oculto = useValoresOcultos()
  const { progressao, faltamPorMesComMargem: falta } = plano
  return <section className="jc-capitulo jc-caminho" aria-labelledby={id}>
    <div className="jc-capitulo-topo">
      <div><h2 id={id}>O caminho até 2029</h2><p>{plano.cenario.estado === 'pronto' ?
        'Estimativa no cenário garantido' : 'Ainda sem dado sobre o cenário.'}</p></div>
      <Plano2029 className="jc-figura" />
    </div>
    <div className="jc-projecao">
      {progressao.estado !== 'pronto' ? <p>Ainda sem dado sobre a cobertura.</p> : oculto ?
        <p>Cobertura oculta</p> : <>
          <p><Valor campo={progressao} className="jc-numero" /> da meta mensal coberta.</p>
          <div className="jc-trilha" aria-hidden="true">
            <div style={{ inlineSize: Math.min(100, Math.max(0, progressao.valor)) + '%' }} />
          </div>
        </>}
      <p>{falta.estado !== 'pronto' ? 'Ainda sem dado sobre a falta mensal.' : <>
        Faltam <Valor campo={falta} className="jc-numero" /> por mês, com margem.</>}</p>
    </div>
    <Acao rota="planejamento" icone="plano2029">Abrir Planejamento</Acao>
  </section>
}

export function Proposta({ dados, tema, dispositivo, oculto }: PropsProposta & { oculto?: boolean }) {
  const ocultoNaCasca = useValoresOcultos()
  const papel = dados.pessoa.papel.valor
  const assessor = papel === 'equipe' || papel === null
  return <PrivacidadePropostas.Provider value={oculto ?? ocultoNaCasca}>
    <div className="jc" data-proposta="c" data-jc-tema={tema} data-jc-dispositivo={dispositivo}>
      <Cabecalho papel={papel} />
      <div className="jc-corpo">
        <Heroi dados={dados} assessor={assessor} />
        <div className="jc-jornada">
          <Agora dados={dados} assessor={assessor} dispositivo={dispositivo} casal={papel === 'casal'} />
          {papel === 'casal' && <>
            <Vinheta dados={dados} />
            <Semana dados={dados} />
            <Caminho plano={dados.plano2029} />
          </>}
        </div>
      </div>
      {!assessor && <Navegacao papel={papel} posicao="base" />}
    </div>
  </PrivacidadePropostas.Provider>
}
