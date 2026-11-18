import { useId, useRef, type ReactNode } from 'react'
import '@fontsource-variable/geist'
import '@fontsource-variable/inter'
import { enderecoDestino } from '../../app/destinos'
import type { EstadoFuncionario } from '../../api/tipos'
import { Icone, icones, type NomeIcone } from '../../componentes/Icone'
import { AssessorDaCasa, CasaVazia, Plano2029, PrivacidadeOlho, SemAplicacoes, SemCartoes, SemGastos, SemRecebimentos, TudoEmDia } from '../../componentes/ilustracoes/figuras'
import { EscritorioMaquete } from '../comuns/EscritorioMaquete'
import { PrivacidadePropostas, useValoresOcultos, Valor } from '../comuns/privacidade'
import type { Campo, DadosInicio, NivelAlerta } from '../dadosExemplo'
import type { PropsProposta } from '../Propostas'
import './painel-calmo.css'

type Dinheiro = Campo<number, 'reais' | 'centavos'>
const semDado = 'Ainda sem dado'
const app = '../../'
const secoes = {
  orcamento: app + enderecoDestino({ rota: 'orcamento', secao: 'orcamento' }),
  aplicacoes: app + enderecoDestino({ rota: 'guardado', secao: 'aplicacoes' }),
  faturas: app + '#/cartoes',
  recebimentos: app + enderecoDestino({ rota: 'planejamento', secao: 'recebimentos' }),
  plano: app + enderecoDestino({ rota: 'planejamento', secao: 'plano2029' }),
  escritorio: app + '#/escritorio',
  casa: app + '#/casa',
}

const abas: { rotulo: string; curto: string; icone: NomeIcone; href?: string }[] = [
  { rotulo: 'Início', curto: 'Início', icone: 'inicio' },
  { rotulo: 'Gastos e entradas', curto: 'Gastos', icone: 'lancamentos', href: app + '#/lancamentos' },
  { rotulo: 'Meu orçamento', curto: 'Orçamento', icone: 'orcamento', href: secoes.orcamento },
  { rotulo: 'Casa', curto: 'Casa', icone: 'casa', href: secoes.casa },
]

function Navegacao({ celular, casal, voltar }: { celular: boolean; casal: boolean; voltar: () => void }) {
  return <nav className={celular ? 'calmo-nav calmo-nav-inferior' : 'calmo-nav'} aria-label="Navegação da família">
    {abas.map(({ rotulo, curto, icone, href }) => href
      ? <a className="calmo-alvo" key={rotulo} href={href}><Icone nome={icone} size={17} /><span>{celular ? curto : rotulo}</span></a>
      : <button className="calmo-alvo" key={rotulo} type="button" aria-current="page" onClick={voltar}><Icone nome={icone} size={17} />{rotulo}</button>)}
    <details className="calmo-mais">
      <summary className="calmo-alvo"><Icone nome="mais" size={17} />Mais</summary>
      <div className="calmo-menu">
        <a className="calmo-alvo" href={app + '#/desejos'}><Icone nome="desejos" size={17} />Desejos</a>
        {casal && <>
          <a className="calmo-alvo" href={secoes.aplicacoes}><Icone nome="guardado" size={17} />Aplicações</a>
          <a className="calmo-alvo" href={secoes.faturas}><Icone nome="cartoes" size={17} />Cartões</a>
          <a className="calmo-alvo" href={secoes.plano}><Icone nome="planejamento" size={17} />Planejamento</a>
          <a className="calmo-alvo" href={secoes.escritorio}><Icone nome="escritorio" size={17} />Escritório</a>
        </>}
        <a className="calmo-alvo" href={app + '#/ajustes'}><Icone nome="ajustes" size={17} />Ajustes</a>
      </div>
    </details>
  </nav>
}

type Ponto = { data: string; valor: number }
function Linha({ pontos, rotulo, mes = false }: { pontos: Ponto[]; rotulo: string; mes?: boolean }) {
  // Escala o eixo horizontal pelos dias decorridos e inclui a origem zero no vertical.
  const dia = (data: string) => Date.parse(data + 'T00:00:00Z')
  const primeiro = dia(pontos[0].data)
  const duracao = dia(pontos[pontos.length - 1].data) - primeiro
  const maior = Math.max(0, ...pontos.map(p => p.valor))
  const menor = Math.min(0, ...pontos.map(p => p.valor))
  const largura = mes ? 400 : 92
  const altura = mes ? 72 : 26
  const coords = pontos.map(p => {
    const x = duracao ? 4 + (largura - 8) * (dia(p.data) - primeiro) / duracao : largura / 2
    const y = maior === menor ? altura / 2 : 4 + (altura - 8) * (maior - p.valor) / (maior - menor)
    return [x, y] as const
  })
  const [x, y] = coords[coords.length - 1]
  return <svg className={mes ? 'calmo-linha-mes' : 'calmo-mini-linha'} viewBox={`0 0 ${largura} ${altura}`}
    preserveAspectRatio="none" role="img" aria-label={rotulo} focusable="false">
    {mes && [12, 36, 60].map(guia => <line key={guia} className="calmo-guia" x1="0" x2={largura} y1={guia} y2={guia} />)}
    <polyline points={coords.map(par => par.join(',')).join(' ')} />
    <circle cx={x} cy={y} r={mes ? 3.5 : 2.5} />
  </svg>
}

function Ritmo({ ritmo }: { ritmo: DadosInicio['hojePodeGastar']['ritmoMes'] }) {
  const oculto = useValoresOcultos()
  const serie = ritmo.serieDiaria.valor ?? []
  const pontos: Ponto[] = []
  if (!oculto) {
    let acumulado = 0
    for (const ponto of serie) {
      acumulado += ponto.valor
      pontos.push({ data: ponto.data, valor: acumulado })
    }
  }
  return <figure className="calmo-ritmo">
    <figcaption>Ritmo do mês <span>Gastos à vista acumulados</span></figcaption>
    {oculto ? <div className="calmo-ritmo-vazio"><PrivacidadeOlho />Valores ocultos</div>
      : pontos.length ? <>
        <Linha pontos={pontos} rotulo="Gastos à vista acumulados por dia de registro" mes />
        {pontos.length > 1 && <div className="calmo-eixo" aria-hidden="true"><span>Primeiro registro</span><span>Mais recente</span></div>}
      </> : <div className="calmo-ritmo-vazio"><SemGastos />{semDado}</div>}
  </figure>
}

function Resumo({ titulo, descricao, icone, href, campo, indicador, Figura }: {
  titulo: string; descricao: string; icone: NomeIcone; href: string; campo: Dinheiro;
  indicador: ReactNode; Figura: typeof SemGastos;
}) {
  return <article className="calmo-resumo">
    <a className="calmo-cartao-alvo calmo-alvo" href={href} aria-label={`Abrir ${titulo}`}>
      <span className="calmo-icone-quadro"><Icone nome={icone} size={19} /></span>
      <Icone nome="abrir" size={17} />
    </a>
    <h3>{titulo}</h3>
    {campo.estado === 'pronto'
      ? <><Valor campo={campo} className="numero-secundario" /><p>{descricao}</p><div className="calmo-indicador">{indicador}</div></>
      : <div className="calmo-ausente"><Figura /><span>{semDado}</span></div>}
  </article>
}

function Barra({ valor, rotulo }: { valor: number; rotulo: string }) {
  const percentual = valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return <span className="calmo-barra" role="img" aria-label={`${rotulo} · ${percentual}%`}>
    <span style={{ inlineSize: `${Math.max(0, Math.min(100, valor))}%` }} />
  </span>
}

function Financeiro({ dados, celular }: { dados: DadosInicio; celular: boolean }) {
  const oculto = useValoresOcultos()
  const { aplicacoes, faturas, recebimentos, plano2029 } = dados
  const previsto = recebimentos.previsto.valor
  const garantido = recebimentos.garantido.valor
  const cobertura = plano2029.progressao.valor
  const rendimentos = aplicacoes.serie30Dias.valor
  const indicadorOculto = <span><Icone nome="olhoFechado" size={14} />Indicador oculto</span>
  const faltam = plano2029.faltamPorMesComMargem.valor
  const descricaoPlano = oculto || faltam == null || faltam > 0 ? 'Falta mensal com margem'
    : faltam < 0 ? 'Folga mensal com margem' : 'Meta mensal com margem coberta'
  const cartaoPlano = <Resumo titulo="Plano 2029" descricao={descricaoPlano}
    icone="plano2029" href={secoes.plano} campo={plano2029.faltamPorMesComMargem} Figura={Plano2029}
    indicador={oculto ? indicadorOculto : cobertura == null ? semDado
      : <><Barra valor={cobertura} rotulo="Cobertura estimada da meta" /><span>Cobertura da meta</span></>} />

  return <section className="calmo-bloco-resumo" aria-label="Resumo financeiro">
    <h2>Seu dinheiro</h2>
    <div className="calmo-grade">
      {celular && cartaoPlano}
      <Resumo titulo="Aplicações" descricao="Rendeu hoje, líquido" icone="guardado" href={secoes.aplicacoes}
        campo={aplicacoes.rendeuHoje} Figura={SemAplicacoes}
        indicador={oculto ? indicadorOculto : rendimentos?.length
          ? <><Linha pontos={rendimentos.map(({ data, liquido }) => ({ data, valor: liquido }))} rotulo="Histórico do rendimento líquido das aplicações" /><span>Histórico diário</span></>
          : semDado} />
      <Resumo titulo="Faturas a vencer" descricao="Total em aberto" icone="cartoes" href={secoes.faturas}
        campo={faturas.total} Figura={SemCartoes}
        indicador={oculto ? indicadorOculto : faturas.proximas.estado === 'indisponivel' ? semDado
          : faturas.proximas.estado === 'vazio' ? <span><Icone nome="salvo" size={14} />Sem faturas na lista</span>
            : faturas.proximas.valor?.some(f => f.conferir) ? <span><Icone nome="pendente" size={14} />A conferir</span>
              : <span><Icone nome="salvo" size={14} />Valores conferidos</span>} />
      <Resumo titulo="Recebimentos" descricao="Previstos até este mês" icone="entrada" href={secoes.recebimentos}
        campo={recebimentos.previsto} Figura={SemRecebimentos}
        indicador={oculto ? indicadorOculto : garantido == null || previsto == null ? semDado : previsto > 0
          ? <><Barra valor={100 * garantido / previsto} rotulo="Parcela garantida da previsão" /><span>Parte garantida</span></>
          : <span>Sem previsão em aberto</span>} />
      {!celular && cartaoPlano}
    </div>
  </section>
}

const niveis = [
  { nivel: 'dinheiro em risco', titulo: 'Dinheiro em risco', icone: 'erro', vazio: 'Nenhum risco na fila recente.' },
  { nivel: 'operacao', titulo: 'Operação', icone: 'lancamentos', vazio: 'Nenhuma tarefa na fila recente.' },
  { nivel: 'lembrete', titulo: 'Lembrete', icone: 'secretaria', vazio: 'Nenhum lembrete na fila recente.' },
] as const satisfies readonly { nivel: NivelAlerta; titulo: string; icone: NomeIcone; vazio: string }[]

const tarefasCasa = new Map([
  ['feira_feita', 'Confirmar a feira da semana'],
  ['feira_nota', 'Registrar a nota da feira'],
  ['estoque', 'Contar o estoque'],
  ['prestador_veio', 'Confirmar a visita do prestador'],
  ['gas', 'Conferir a troca do gás'],
])

function tarefaDaCasa(id: string) {
  return tarefasCasa.get(id.split(':')[0])
}

function Alertas({ alertas, assessor }: { alertas: DadosInicio['alertas']; assessor: boolean }) {
  const oculto = useValoresOcultos()
  const lista = alertas.valor ?? []
  if (alertas.estado === 'indisponivel') return <div className="calmo-estado"><CasaVazia /><p>{semDado}</p></div>
  if (assessor) {
    const tarefas = lista.flatMap(a => {
      const tarefa = tarefaDaCasa(a.id)
      return tarefa ? [tarefa] : []
    })
    return tarefas.length ? <ul className="calmo-fila">
      {Array.from(new Set(tarefas)).map(tarefa => <li key={tarefa}><Icone nome="lancamentos" size={19} /><p>{tarefa}</p></li>)}
    </ul> : <div className="calmo-estado"><AssessorDaCasa /><p>Nenhuma tarefa da casa na fila recente.</p></div>
  }
  if (!lista.length) return <div className="calmo-estado"><TudoEmDia /><p>Nenhum aviso por aqui.</p></div>
  return <ul className="calmo-fila">
    {niveis.map(({ nivel, titulo, icone, vazio }) => {
      const alerta = lista.find(a => a.nivel === nivel)
      return <li key={nivel} className={nivel === 'dinheiro em risco' && alerta ? 'calmo-risco' : undefined}>
        <span className="calmo-nivel"><Icone nome={icone} size={15} />{titulo}</span>
        <p>{alerta ? oculto ? tarefaDaCasa(alerta.id) ?? 'Abra a fila para ver o detalhe.' : alerta.texto : vazio}</p>
      </li>
    })}
  </ul>
}

const estados: Record<EstadoFuncionario, { texto: string; icone: NomeIcone; prioridade: number }> = {
  precisa_de_voce: { texto: 'Precisa de você', icone: 'recepcao', prioridade: 0 },
  trabalhando: { texto: 'Trabalhando', icone: 'pendente', prioridade: 1 },
  entregue: { texto: 'Entregue', icone: 'salvo', prioridade: 2 },
  vai_comecar: { texto: 'Vai começar', icone: 'pendente', prioridade: 3 },
}

function Escritorio({ funcionarios }: { funcionarios: DadosInicio['funcionarios'] }) {
  const destaque = [...(funcionarios.valor ?? [])]
    .filter(f => ['caixa', 'casa', 'cartoes', 'patrimonio'].includes(f.sala))
    .sort((a, b) => (a.estadoHoje.valor ? estados[a.estadoHoje.valor].prioridade : Infinity)
      - (b.estadoHoje.valor ? estados[b.estadoHoje.valor].prioridade : Infinity))
    .slice(0, 2)
  return <section className="calmo-escritorio" aria-label="Escritório">
    <div className="calmo-escritorio-topo">
      <div><h2>Escritório</h2><p>Equipe de hoje</p></div>
      <a className="calmo-seta calmo-alvo" href={secoes.escritorio} aria-label="Abrir escritório"><Icone nome="abrir" size={19} /></a>
    </div>
    {funcionarios.estado === 'pronto' ? <div className="calmo-escritorio-corpo">
      <ul className="calmo-equipe">
        {destaque.map(f => {
          const estado = f.estadoHoje.valor && estados[f.estadoHoje.valor]
          const icone = Object.prototype.hasOwnProperty.call(icones, f.id) ? f.id as NomeIcone : 'pessoa'
          return <li key={f.id}>
            <span className="calmo-avatar"><Icone nome={icone} size={17} /></span>
            <div><strong>{f.curto}</strong><span>{estado ? estado.texto : semDado}</span></div>
          </li>
        })}
      </ul>
      <div className="calmo-maquete" aria-hidden="true"><EscritorioMaquete funcionarios={funcionarios} salaDestacada={destaque[0]?.sala} /></div>
    </div> : <div className="calmo-estado"><CasaVazia /><p>{semDado}</p></div>}
  </section>
}

export function Proposta({ dados, tema, dispositivo, oculto = false }: PropsProposta & { oculto?: boolean }) {
  const ocultoNaCasca = useValoresOcultos()
  const inicio = useRef<HTMLHeadingElement>(null)
  const alvo = useRef<HTMLElement>(null)
  const tituloFila = useId()
  const celular = dispositivo === 'celular'
  const papel = dados.pessoa.papel.valor
  const assessor = papel === 'equipe'
  const casal = papel === 'casal'
  const alertas = dados.alertas.valor ?? []
  const haTarefas = assessor ? alertas.some(a => tarefaDaCasa(a.id)) : alertas.length > 0
  const risco = !assessor && alertas.some(a => a.nivel === 'dinheiro em risco')
  const status = risco ? 'Há pagamentos que pedem atenção.' : haTarefas ? 'Há tarefas esperando por você.'
    : dados.alertas.estado === 'indisponivel' ? 'Ainda sem dado sobre a fila.' : 'Nenhum aviso na fila recente.'
  const saudacao = dados.saudacao.valor ?? 'Olá'
  const nome = dados.pessoa.nome.valor?.trim().split(/\s+/)[0]
  const navegacao = <Navegacao celular={celular} casal={casal} voltar={() => inicio.current?.focus()} />

  return <PrivacidadePropostas.Provider value={ocultoNaCasca || oculto}>
    <div className="calmo" data-proposta="a" data-calmo-tema={tema} data-calmo-dispositivo={dispositivo}>
      <header className="calmo-topo">
        <div className="calmo-topo-interior">
          <span className="calmo-marca"><span><Icone nome="inicio" size={18} /></span>Central da Família</span>
          {!celular && !assessor && navegacao}
          <span className="calmo-selo">Exemplo</span>
        </div>
      </header>

      <div className="calmo-conteudo">
        <div className={`calmo-saude ${risco ? 'calmo-risco' : ''}`}>
          <p><Icone nome={risco ? 'erro' : haTarefas ? 'recepcao' : 'privacidade'} size={18} /><span>{status}</span></p>
          <button className="calmo-acao calmo-alvo" type="button" onClick={() => alvo.current?.focus()}>
            Ver fila <Icone nome="abrir" size={15} />
          </button>
        </div>
        <div className="calmo-intro">
          <h1 ref={inicio} tabIndex={-1}>{assessor ? 'Tarefas da casa' : 'Início'}</h1>
          <p>{saudacao}{nome ? `, ${nome}` : ''}.</p>
        </div>

        {!assessor && <div className={`calmo-primeira ${casal ? 'calmo-com-escritorio' : ''}`}>
          <section className="calmo-heroi" aria-label="Orçamento de hoje">
            <div>
              <span className="calmo-icone-quadro"><Icone nome="orcamento" size={20} /></span>
              <h2>Hoje você pode gastar</h2>
              {dados.hojePodeGastar.valor.estado === 'pronto'
                ? <Valor campo={dados.hojePodeGastar.valor} className="numero-principal" />
                : <p className="calmo-sem-valor">{semDado}</p>}
              <a className="calmo-texto-link calmo-alvo" href={secoes.orcamento}>Meu orçamento <Icone nome="abrir" size={16} /></a>
            </div>
            <Ritmo ritmo={dados.hojePodeGastar.ritmoMes} />
          </section>
          {casal && <Escritorio funcionarios={dados.funcionarios} />}
        </div>}

        {casal && <Financeiro dados={dados} celular={celular} />}

        <section className="calmo-alertas" ref={alvo} tabIndex={-1} aria-labelledby={tituloFila}>
          <div className="calmo-alertas-topo">
            <h2 id={tituloFila}>Precisa de você</h2>
            {(casal || assessor) && <a className="calmo-texto-link calmo-alvo" href={assessor ? secoes.casa : secoes.escritorio}>
              {assessor ? 'Abrir Casa' : 'Abrir fila no escritório'} <Icone nome="abrir" size={17} />
            </a>}
          </div>
          <Alertas alertas={dados.alertas} assessor={assessor} />
        </section>
      </div>
      {celular && !assessor && navegacao}
    </div>
  </PrivacidadePropostas.Provider>
}
