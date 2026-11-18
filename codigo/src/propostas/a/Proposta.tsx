import { useId, useRef, useState, type ReactNode, type Ref } from 'react'
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
const semRegistros = 'Sem registros'
const ausencia = (campo: { estado: string }) => campo.estado === 'vazio' ? semRegistros : semDado
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
function Linha({ pontos, rotulo, mes = false, limite }: { pontos: Ponto[]; rotulo: string; mes?: boolean; limite?: number | null }) {
  // Escala o eixo horizontal pelos dias decorridos e inclui a origem zero no vertical.
  const dia = (data: string) => Date.parse(data + 'T00:00:00Z')
  const primeiro = dia(pontos[0].data)
  const duracao = dia(pontos[pontos.length - 1].data) - primeiro
  const maior = Math.max(0, limite ?? 0, ...pontos.map(p => p.valor))
  const menor = Math.min(0, limite ?? 0, ...pontos.map(p => p.valor))
  const largura = mes ? 400 : 92
  const altura = mes ? 72 : 26
  const yDe = (valor: number) => maior === menor ? altura / 2 : 5 + (altura - 10) * (maior - valor) / (maior - menor)
  const coords = pontos.map(p => [
    duracao ? 5 + (largura - 10) * (dia(p.data) - primeiro) / duracao : largura / 2,
    yDe(p.valor),
  ] as const)
  const [x, y] = coords[coords.length - 1]
  return <svg className={mes ? 'calmo-linha-mes' : 'calmo-mini-linha'} viewBox={`0 0 ${largura} ${altura}`}
    preserveAspectRatio="none" role="img" aria-label={rotulo} focusable="false">
    {mes && <line className="calmo-guia" x1="0" x2={largura} y1={yDe(0)} y2={yDe(0)} />}
    {limite != null && <line className="calmo-limite" x1="0" x2={largura} y1={yDe(limite)} y2={yDe(limite)} />}
    <polyline points={coords.map(par => par.join(',')).join(' ')} />
    <circle cx={x} cy={y} r={mes ? 3.5 : 2.5} />
  </svg>
}

function Ritmo({ ritmo, celular }: { ritmo: DadosInicio['hojePodeGastar']['ritmoMes']; celular: boolean }) {
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
  const ultimo = pontos[pontos.length - 1]
  const limite = ritmo.limite.valor
  const legenda = <dl className="calmo-legenda-ritmo">
    <div><dt className={ultimo ? 'calmo-chave-gasto' : undefined}>À vista no mês</dt><dd>{ultimo ? <Valor campo={{ estado: 'pronto', valor: ultimo.valor, unidade: 'reais', natureza: 'realizado' }} /> : ausencia(ritmo.serieDiaria)}</dd></div>
    <div><dt className={ultimo && limite != null ? 'calmo-chave-limite' : undefined}>Limite do envelope</dt><dd>{limite == null ? ausencia(ritmo.limite) : <Valor campo={ritmo.limite} />}</dd></div>
  </dl>
  return <div className="calmo-ritmo">
    <figure>
      <figcaption>Ritmo do mês</figcaption>
      {oculto ? <div className="calmo-ritmo-vazio"><PrivacidadeOlho />Valores ocultos</div>
        : ultimo ? <>
          <Linha pontos={pontos} rotulo="Gastos à vista acumulados por dia de registro" limite={limite} mes />
          <div className="calmo-eixo">
            <span className="calmo-chave-gasto">Gastos à vista</span>{limite != null && <span className="calmo-chave-limite">Limite do envelope</span>}
          </div>
        </> : <div className="calmo-ritmo-vazio"><SemGastos />{ausencia(ritmo.serieDiaria)}</div>}
    </figure>
    {!oculto && (celular
      ? <details className="calmo-ritmo-detalhe"><summary className="calmo-alvo" aria-label="Ver valores do ritmo">Ver valores <Icone nome="abrir" size={14} /></summary>{legenda}</details>
      : legenda)}
  </div>
}

function Resumo({ titulo, descricao, icone, href, campo, indicador, Figura, variante }: {
  titulo: string; descricao: string; icone: NomeIcone; href: string; campo: Dinheiro;
  indicador: ReactNode; Figura: typeof SemGastos; variante: 'plano' | 'aplicacoes' | 'faturas' | 'recebimentos';
}) {
  const plano = variante === 'plano'
  return <article className={`calmo-resumo calmo-resumo-${variante}`}>
    <a className="calmo-cartao-alvo calmo-alvo" href={href} aria-label={`Abrir ${titulo}`}>
      <span className="calmo-icone-quadro"><Icone nome={icone} size={19} /></span>
      <h3>{titulo}</h3>
      <Icone nome="abrir" size={17} />
    </a>
    {campo.estado === 'pronto'
      ? <div className="calmo-resumo-leitura"><Valor campo={campo} className={plano ? 'numero-principal' : 'numero-secundario'} /><p>{descricao}</p></div>
      : <div className="calmo-ausente"><Figura /><span>{ausencia(campo)}</span></div>}
    <div className="calmo-indicador">{indicador}</div>
  </article>
}

function Barra({ valor, rotulo }: { valor: number; rotulo?: string }) {
  const percentual = valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return <span className="calmo-barra" role={rotulo ? 'img' : undefined}
    aria-label={rotulo ? `${rotulo} · ${percentual}%` : undefined} aria-hidden={!rotulo || undefined}>
    <span style={{ inlineSize: `${Math.max(0, Math.min(100, valor))}%` }} />
  </span>
}

const indicadorOculto = <span><Icone nome="olhoFechado" size={14} />Indicador oculto</span>

function Plano({ plano, celular }: { plano: DadosInicio['plano2029']; celular: boolean }) {
  const oculto = useValoresOcultos()
  const faltam = plano.faltamPorMesComMargem.valor
  const cobertura = plano.progressao.valor
  const descricao = oculto || faltam == null || faltam > 0 ? 'Falta por mês, com margem'
    : faltam < 0 ? 'Folga por mês, com margem' : 'Meta mensal com margem coberta'
  return <Resumo variante="plano" titulo="Plano 2029" descricao={descricao}
    icone="plano2029" href={secoes.plano} campo={plano.faltamPorMesComMargem} Figura={Plano2029}
    indicador={oculto ? indicadorOculto : cobertura == null ? <span>Cobertura indisponível</span>
      : <><span>Cobertura estimada da meta</span>{!celular && <Valor campo={plano.progressao} />}
        <Barra valor={cobertura} rotulo={celular ? 'Cobertura estimada da meta' : undefined} /></>} />
}

function Anel({ garantido, previsto }: { garantido: number; previsto: number }) {
  const parcela = 100 * garantido / previsto
  return <svg className="calmo-anel" viewBox="0 0 28 28" role="img"
    aria-label={`${parcela.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% da previsão garantida`}>
    <circle cx="14" cy="14" r="10" />
    <circle cx="14" cy="14" r="10" pathLength="100" strokeDasharray={`${Math.max(0, Math.min(100, parcela))} 100`} transform="rotate(-90 14 14)" />
  </svg>
}

const diaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })

function Financeiro({ dados }: { dados: DadosInicio }) {
  const oculto = useValoresOcultos()
  const { aplicacoes, faturas, recebimentos } = dados
  const previsto = recebimentos.previsto.valor
  const garantido = recebimentos.garantido.valor
  const rendimentos = aplicacoes.serie30Dias.valor
  const faturasNaFila = faturas.proximas.valor ?? []
  const vencimentos = faturasNaFila.flatMap(f => f.vencimento.valor ? [f.vencimento.valor] : []).sort()
  const proximo = vencimentos[0]
  return <div className="calmo-grade">
      <Resumo variante="aplicacoes" titulo="Aplicações" descricao="Rendimento líquido hoje" icone="guardado" href={secoes.aplicacoes}
        campo={aplicacoes.rendeuHoje} Figura={SemAplicacoes}
        indicador={oculto ? indicadorOculto : rendimentos?.length
          ? <><Linha pontos={rendimentos.map(({ data, liquido }) => ({ data, valor: liquido }))} rotulo="Histórico do rendimento líquido das aplicações" /><span>Histórico diário</span></>
          : <span>Histórico indisponível</span>} />
      <Resumo variante="faturas" titulo="Faturas a vencer" descricao="Total em aberto" icone="cartoes" href={secoes.faturas}
        campo={faturas.total} Figura={SemCartoes}
        indicador={oculto ? indicadorOculto : faturas.proximas.estado === 'indisponivel' ? <span>Agenda indisponível</span>
          : faturas.proximas.estado === 'vazio' ? <span><Icone nome="salvo" size={14} />Sem faturas na lista</span>
            : <span className="calmo-vencimento"><Icone nome="pendente" size={14} />
              {proximo ? <>Vence <time dateTime={proximo}>{diaMes.format(new Date(proximo + 'T00:00:00Z'))}</time></> : 'Sem data de vencimento'}
              {faturasNaFila.some(f => f.conferir) && <span className="calmo-conferencia">A conferir</span>}
            </span>} />
      <Resumo variante="recebimentos" titulo="Recebimentos" descricao="Previstos até este mês" icone="entrada" href={secoes.recebimentos}
        campo={recebimentos.previsto} Figura={SemRecebimentos}
        indicador={oculto ? indicadorOculto : garantido == null || previsto == null ? <span>Garantia indisponível</span> : previsto > 0
          ? <><Anel garantido={garantido} previsto={previsto} /><span>Parte garantida</span></>
          : <span>Sem previsão em aberto</span>} />
  </div>
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

function Escritorio({ dados, celular, children }: { dados: DadosInicio; celular: boolean; children: ReactNode }) {
  const { funcionarios, aplicacoes } = dados
  const oculto = useValoresOcultos()
  const [mostrarTotal, setMostrarTotal] = useState(false)
  const equipe = [...(funcionarios.valor ?? [])]
    .sort((a, b) => (a.estadoHoje.valor ? estados[a.estadoHoje.valor].prioridade : Infinity)
      - (b.estadoHoje.valor ? estados[b.estadoHoje.valor].prioridade : Infinity))
  const destaque = equipe.find(f => f.estadoHoje.valor === 'precisa_de_voce'
    && ['caixa', 'casa', 'cartoes', 'patrimonio'].includes(f.sala))
  const podeMostrarTotal = !oculto && aplicacoes.total.estado === 'pronto' && equipe.some(f => f.id === 'guardado')
  // A frente compartilhada adiciona variante. A prop extra é ignorada pela versão atual.
  const visual = { variante: celular ? 'media' : 'grande' } as const
  return <section className="calmo-escritorio" aria-label="Escritório da família">
    <div className="calmo-escritorio-topo">
      <h2><Icone nome="escritorio" size={21} /> Escritório da família</h2>
    </div>
    <div className="calmo-escritorio-corpo">
      <div className="calmo-equipe-painel">
        {funcionarios.estado === 'pronto' ? <>
          <div className="calmo-maquete" data-calmo-maquete={visual.variante}>
            <EscritorioMaquete {...visual} funcionarios={funcionarios} salaDestacada={destaque?.sala} mostrarPlaquinhas
              valores={podeMostrarTotal && mostrarTotal ? { guardado: aplicacoes.total } : undefined} />
          </div>
          <div className="calmo-equipe-controles">
            <details>
              <summary className="calmo-alvo"><Icone nome="assessor" size={16} /> Equipe e estados</summary>
              <ul className="calmo-equipe">
                {equipe.map(f => {
                  const estado = f.estadoHoje.valor && estados[f.estadoHoje.valor]
                  const icone = Object.prototype.hasOwnProperty.call(icones, f.id) ? f.id as NomeIcone : 'pessoa'
                  return <li key={f.id}>
                    <span className="calmo-avatar"><Icone nome={icone} size={17} /></span>
                    <div><strong>{f.curto}</strong><span>{estado ? estado.texto : semDado}</span></div>
                  </li>
                })}
              </ul>
            </details>
            {podeMostrarTotal && <button type="button" className="calmo-alvo" aria-pressed={mostrarTotal}
              onClick={() => setMostrarTotal(!mostrarTotal)}><Icone nome="guardado" size={16} /> Total investido</button>}
          </div>
        </> : <div className="calmo-estado"><CasaVazia /><p>{ausencia(funcionarios)}</p></div>}
      </div>
      {children}
    </div>
  </section>
}

function Fila({ dados, assessor, casal, alvo }: {
  dados: DadosInicio; assessor: boolean; casal: boolean; alvo: Ref<HTMLElement>;
}) {
  const titulo = useId()
  return <section className="calmo-alertas" ref={alvo} tabIndex={-1} aria-labelledby={titulo}>
    {casal ? <h3 id={titulo}>Precisa de você</h3> : <h2 id={titulo}>Precisa de você</h2>}
    <Alertas alertas={dados.alertas} assessor={assessor} />
    {(casal || assessor) && <a className="calmo-texto-link calmo-alvo" href={assessor ? secoes.casa : secoes.escritorio}>
      {assessor ? 'Abrir Casa' : 'Abrir fila completa'} <Icone nome="abrir" size={17} />
    </a>}
  </section>
}

export function Proposta({ dados, tema, dispositivo, oculto = false }: PropsProposta & { oculto?: boolean }) {
  const ocultoNaCasca = useValoresOcultos()
  const inicio = useRef<HTMLHeadingElement>(null)
  const alvo = useRef<HTMLElement>(null)
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
  const fila = <Fila dados={dados} assessor={assessor} casal={casal} alvo={alvo} />

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

        {!assessor && <section className="calmo-bloco-resumo" aria-label="Seu dinheiro">
          <h2>Seu dinheiro</h2>
          <div className={`calmo-primeira ${casal ? 'calmo-com-plano' : ''}`}>
            <section className="calmo-heroi" aria-label="Orçamento de hoje">
              <div className="calmo-orcamento">
                <h3>Hoje você pode gastar</h3>
                {dados.hojePodeGastar.valor.estado === 'pronto'
                  ? <Valor campo={dados.hojePodeGastar.valor} className="numero-principal" />
                  : <p className="calmo-sem-valor">{ausencia(dados.hojePodeGastar.valor)}</p>}
                <a className="calmo-texto-link calmo-alvo" href={secoes.orcamento}>Meu orçamento <Icone nome="abrir" size={16} /></a>
              </div>
              <Ritmo ritmo={dados.hojePodeGastar.ritmoMes} celular={celular} />
            </section>
            {casal && <Plano plano={dados.plano2029} celular={celular} />}
          </div>
          {casal && <Financeiro dados={dados} />}
        </section>}

        {casal ? <Escritorio dados={dados} celular={celular}>{fila}</Escritorio> : fila}
      </div>
      {celular && !assessor && navegacao}
    </div>
  </PrivacidadePropostas.Provider>
}
