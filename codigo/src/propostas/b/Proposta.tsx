import { ChevronUp } from 'lucide-react'
import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { Icone, icones, type NomeIcone } from '../../componentes/Icone'
import { AssessorDaCasa, Erro, Plano2029, SemAplicacoes, SemCartoes, SemDesejos, SemGastos, SemImoveis, TudoEmDia } from '../../componentes/ilustracoes'
import { enderecoDestino, type DestinoResumo } from '../../app/destinos'
import { podeVerNoMenu, type Rota } from '../../app/rotas'
import type { Campo, DadosInicio, NivelAlerta } from '../dadosExemplo'
import type { PropsProposta } from '../Propostas'
import { EscritorioMaquete } from '../comuns/EscritorioMaquete'
import { PrivacidadePropostas, useValoresOcultos, Valor } from '../comuns/privacidade'
import '@fontsource-variable/geist'
import '@fontsource-variable/inter'
import './proposta.css'

type Dinheiro = Campo<number, 'reais' | 'centavos'>
type Financeiro = Dinheiro | Campo<number, 'percentual' | 'quantidade'>
type Tarefa = NonNullable<DadosInicio['pendencias']['fila']['valor']>[number]
type Funcionario = NonNullable<DadosInicio['funcionarios']['valor']>[number]
type Papel = DadosInicio['pessoa']['papel']['valor']

const salas = [
  { id: 'caixa', nome: 'Caixa', icone: 'orcamento' },
  { id: 'casa', nome: 'Casa', icone: 'casa' },
  { id: 'cartoes', nome: 'Cartões', icone: 'cartoes' },
  { id: 'patrimonio', nome: 'Patrimônio', icone: 'guardado' },
] as const
type Sala = typeof salas[number]['id']

const estados = {
  vai_comecar: 'Ainda vai começar',
  trabalhando: 'Trabalhando',
  entregue: 'Entregue',
  precisa_de_voce: 'Precisa de você',
}

const niveis = {
  'dinheiro em risco': { rotulo: 'Dinheiro em risco', icone: 'erro', prioridade: 0, texto: 'Revise esta pendência primeiro.' },
  operacao: { rotulo: 'Operação', icone: 'lancamentos', prioridade: 1, texto: 'Confira o registro.' },
  lembrete: { rotulo: 'Lembrete', icone: 'recepcao', prioridade: 2, texto: 'Retome quando puder.' },
  desconhecido: { rotulo: 'Ainda sem dado', icone: 'ajuda', prioridade: 3, texto: 'Consulte os detalhes.' },
} as const

const abas = [
  { rota: 'casa', nome: 'Casa', icone: 'casa' },
  { rota: 'cartoes', nome: 'Cartões', icone: 'cartoes' },
  { rota: 'planejamento', nome: 'Planejamento', icone: 'planejamento' },
] as const

const extras = [
  { rota: 'escritorio', nome: 'Escritório', icone: 'escritorio' },
  { rota: 'lancamentos', nome: 'Lançamentos', icone: 'lancamentos' },
  { rota: 'orcamento', nome: 'Orçamento', icone: 'orcamento' },
  { rota: 'guardado', nome: 'Guardado', icone: 'guardado' },
  { rota: 'desejos', nome: 'Desejos', icone: 'desejos' },
  { rota: 'ajustes', nome: 'Ajustes', icone: 'ajustes' },
] as const

const rotaApp = (rota: Rota) => '../../#/' + rota
const destinoApp = (destino: DestinoResumo) => '../../' + enderecoDestino(destino)

function focar(ref: RefObject<HTMLElement>) {
  ref.current?.focus({ preventScroll: true })
  ref.current?.scrollIntoView({ block: 'start' })
}

function Navegacao({ inicio, papel }: { inicio: RefObject<HTMLElement>; papel: Papel }) {
  const [mais, setMais] = useState(false)
  const botao = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const visiveis = papel === 'casal' ? abas : [abas[0], extras[1], extras[2]]
  return <nav className="b-nav" aria-label="Navegação principal" onKeyDown={e => {
    if (e.key === 'Escape' && mais) { setMais(false); botao.current?.focus() }
  }}>
    <button className="b-controle" type="button" aria-current="page" onClick={() => { setMais(false); focar(inicio) }}>
      <Icone nome="inicio" size={18} />Início
    </button>
    {visiveis.map(aba => <a className="b-controle" key={aba.rota} href={rotaApp(aba.rota)}>
      <Icone nome={aba.icone} size={18} />{aba.nome}
    </a>)}
    <div className="b-mais">
      <button className="b-controle" ref={botao} type="button" aria-expanded={mais} aria-controls={menuId} onClick={() => setMais(!mais)}>
        <Icone nome={mais ? 'fechar' : 'mais'} size={18} />Mais
      </button>
      <div className="b-menu" id={menuId} hidden={!mais}>
        {extras.filter(aba => podeVerNoMenu(aba.rota, papel) && !visiveis.some(v => v.rota === aba.rota)).map(aba =>
          <a className="b-controle" href={rotaApp(aba.rota)} key={aba.rota}><Icone nome={aba.icone} size={18} />{aba.nome}</a>)}
      </div>
    </div>
  </nav>
}

function Quantia({ campo, principal }: { campo: Financeiro; principal?: boolean }) {
  return campo.estado === 'pronto'
    ? <Valor campo={campo} className={principal ? 'numero-principal' : 'numero-secundario'} />
    : <span className="b-sem-dado">{campo.estado === 'vazio' ? 'Sem registros' : 'Ainda sem dado'}</span>
}

const indicadores = [
  { id: 'hoje', titulo: 'Pode gastar hoje', sala: 'caixa', icone: 'orcamento', figura: SemGastos },
  { id: 'plano', titulo: 'Plano 2029', sala: 'caixa', icone: 'planejamento', figura: Plano2029 },
  { id: 'faturas', titulo: 'Faturas previstas', sala: 'cartoes', icone: 'cartoes', figura: SemCartoes },
  { id: 'aplicacoes', titulo: 'Em aplicações', sala: 'patrimonio', icone: 'guardado', figura: SemAplicacoes },
] as const

function Maquete({ dados, casal, dispositivo }: Pick<PropsProposta, 'dados' | 'dispositivo'> & { casal: boolean }) {
  const [sala, setSala] = useState<Sala>()
  const oculto = useValoresOcultos()
  const cenaId = useId()
  const variante = dispositivo === 'celular' ? 'media' as const : 'grande' as const
  // A versão anterior da maquete ignora as props adicionais.
  const desenho = { funcionarios: dados.funcionarios, salaDestacada: sala, mostrarPlaquinhas: true, variante, oculto }
  const campos = {
    hoje: dados.hojePodeGastar.valor,
    plano: dados.plano2029.faltamPorMesComMargem,
    faturas: dados.faturas.total,
    aplicacoes: dados.aplicacoes.total,
  }
  const membros = dados.funcionarios.valor
  const salaAtual = salas.find(s => s.id === sala)
  const equipe = membros?.filter(m => m.sala === sala) ?? []
  return <section className="b-maquete b-painel" aria-label="Salas do escritório">
    <div className="b-cena" data-layout={variante}>
      {indicadores.filter(i => casal || i.id === 'hoje').map(i => {
        const campo = campos[i.id]
        return <div className="b-indicador" key={i.id} data-posicao={i.id} data-focado={sala === i.sala || undefined}>
          <span className="b-rotulo"><Icone nome={i.icone} size={15} />{i.titulo}</span>
          {campo.estado !== 'pronto' && <i.figura className="b-figura-indicador" />}
          <Quantia campo={campo} principal={i.id === 'hoje'} />
          {i.id === 'plano' && <small>Falta por mês, com margem</small>}
        </div>
      })}
      <div className="b-desenho" id={cenaId}>
        <EscritorioMaquete {...desenho} />
      </div>
    </div>
    <div className="b-salas" role="group" aria-label="Focar uma sala">
      {salas.map(s => <button key={s.id} className="b-controle" type="button" aria-controls={cenaId}
        aria-pressed={sala === s.id} onClick={() => setSala(sala === s.id ? undefined : s.id)}>
        <Icone nome={s.icone} size={15} />{s.nome}
      </button>)}
    </div>
    <div className="b-legenda" aria-live="polite">
      <span><Icone nome="pessoa" size={15} />{salaAtual?.nome ?? 'Visão geral da equipe'}</span>
      {dados.funcionarios.estado !== 'pronto' ? <small>Ainda sem dado</small> : salaAtual && (
        equipe.length ? <ul>{equipe.map(m => <li key={m.id}>{m.curto} · {m.estadoHoje.valor ? estados[m.estadoHoje.valor] : 'Ainda sem dado'}</li>)}</ul>
          : <small>Ainda sem dado</small>
      )}
    </div>
  </section>
}

const tarefasDaCasa: Readonly<Record<string, string>> = {
  feira_feita: 'Registrar a feira',
  feira_nota: 'Guardar a nota da feira',
  prestador_veio: 'Confirmar visita do prestador',
  gas: 'Conferir a troca do gás',
  estoque: 'Conferir o estoque',
}

function Fila({ lista, campo, equipe, casal, soTarefas, tituloRef, id, recolhida }: {
  lista: { tarefa: Tarefa; nivel: NivelAlerta | 'desconhecido' }[]
  campo: DadosInicio['pendencias']['fila']
  equipe: Funcionario[]
  casal: boolean
  soTarefas: boolean
  tituloRef: RefObject<HTMLHeadingElement>
  id: string
  recolhida?: boolean
}) {
  const oculto = useValoresOcultos()
  const tituloId = useId()
  const destino = casal ? 'escritorio' : soTarefas ? 'casa' : 'lancamentos'
  return <section className="b-fila b-painel" id={id} aria-labelledby={tituloId} hidden={recolhida}>
    <header className="b-fila-topo">
      <span className="b-quadrado"><Icone nome="recepcao" size={18} /></span>
      <h2 ref={tituloRef} id={tituloId} tabIndex={-1}>{recolhida === undefined ? 'Precisa de você' : 'Tarefas da equipe'}</h2>
    </header>
    {lista.length ? <ul className="b-tarefas">{lista.slice(0, 3).map(({ tarefa, nivel }) => {
      const estilo = niveis[nivel]
      const membro = equipe.find(m => m.id === tarefa.funcionario)
      const nome = membro?.curto ?? 'Escritório'
      const icone = Object.prototype.hasOwnProperty.call(icones, tarefa.funcionario) ? tarefa.funcionario as NomeIcone : 'pessoa'
      const assunto = soTarefas ? tarefasDaCasa[tarefa.id.split(':')[0]] : oculto ? estilo.texto : tarefa.perguntaCurta
      const href = casal && !oculto ? destinoApp({ rota: 'escritorio', secao: 'tarefa', entidade: tarefa.id }) : rotaApp(destino)
      return <li key={tarefa.id}>
        <a className="b-controle b-tarefa" href={href}>
          <span className="b-avatar"><Icone nome={icone} size={16} /></span>
          <span className="b-tarefa-corpo">
            <span className="b-tarefa-meta">{nome}</span>
            <strong>{assunto}</strong>
            <span className="b-tarefa-detalhe">
              <span className="b-nivel" data-risco={nivel === 'dinheiro em risco' || undefined}>
                <Icone nome={estilo.icone} size={13} />{estilo.rotulo}
              </span>
              {!soTarefas && tarefa.valor.estado === 'pronto' && <Quantia campo={tarefa.valor} />}
            </span>
          </span>
          <Icone nome="abrir" size={16} className="b-seta" />
        </a>
      </li>
    })}</ul> : <div className="b-fila-vazia">
      {campo.estado === 'indisponivel' ? <Erro /> : soTarefas ? <AssessorDaCasa /> : <TudoEmDia />}
      <strong>{campo.estado === 'indisponivel' ? 'Ainda sem dado' : soTarefas ? 'Nenhuma tarefa de casa na fila' : 'Nenhuma tarefa na fila'}</strong>
      <p>{campo.estado === 'indisponivel' ? 'A fila de tarefas está indisponível.' : 'Quando houver algo para você, aparece aqui.'}</p>
    </div>}
    <a className="b-controle b-fila-link" href={rotaApp(destino)}>
      {casal ? 'Ver fila no escritório' : soTarefas ? 'Abrir tarefas da Casa' : 'Abrir lançamentos'}<Icone nome="abrir" size={16} />
    </a>
  </section>
}

function Acompanhamento({ dados, papel }: { dados: DadosInicio; papel: Papel }) {
  const cards = [
    { titulo: 'Cobertura da meta', legenda: 'estimativa do Plano 2029', icone: 'planejamento', figura: Plano2029,
      destino: { rota: 'planejamento', secao: 'plano2029' }, campo: dados.plano2029.progressao },
    { titulo: 'Gastos do mês', legenda: 'saídas registradas', icone: 'gasto', figura: SemGastos,
      destino: { rota: 'lancamentos', secao: 'mes' }, campo: dados.movimentacaoMes.saiu },
    { titulo: 'Imóveis', legenda: 'aluguel líquido mensal estimado', icone: 'imovel', figura: SemImoveis,
      destino: { rota: 'guardado', secao: 'imoveis' }, campo: dados.imoveis.aluguelLiquidoEstimado },
    { titulo: 'Desejos', legenda: 'desejos combinados', icone: 'desejos', figura: SemDesejos,
      destino: { rota: 'desejos', secao: 'desejo' }, campo: dados.desejos.combinados },
  ] as const
  return <section className="b-acompanhamento" aria-label="Em acompanhamento">
    <h2>Em acompanhamento</h2>
    <ul className="b-cartoes">
      {cards.filter(c => podeVerNoMenu(c.destino.rota, papel)).map(c => <li key={c.titulo}>
        <a className="b-controle b-painel b-cartao" href={destinoApp(c.destino)}>
          <span className="b-cartao-topo"><Icone nome={c.icone} size={17} />{c.titulo}<Icone nome="abrir" size={16} /></span>
          {c.campo.estado !== 'pronto' && <c.figura className="b-figura-indicador" />}
          <Quantia campo={c.campo} />
          <small>{c.legenda}</small>
        </a>
      </li>)}
    </ul>
  </section>
}

function InicioB({ dados, tema, dispositivo }: PropsProposta) {
  const inicio = useRef<HTMLHeadingElement>(null)
  const fila = useRef<HTMLHeadingElement>(null)
  const botaoFaixa = useRef<HTMLButtonElement>(null)
  const origemFolha = useRef<HTMLButtonElement | null>(null)
  const filaId = useId()
  const [folhaAberta, setFolhaAberta] = useState(false)
  const papel = dados.pessoa.papel.valor
  const casal = papel === 'casal'
  const soTarefas = papel == null || papel === 'equipe'
  const temFolha = dispositivo === 'celular' && !soTarefas
  useEffect(() => {
    if (!temFolha) setFolhaAberta(false)
    else if (folhaAberta) fila.current?.focus({ preventScroll: true })
  }, [temFolha, folhaAberta])

  function abrirFolha(origem: HTMLButtonElement) {
    origemFolha.current = origem
    setFolhaAberta(true)
  }

  function fecharFolha(destino: HTMLButtonElement | null) {
    setFolhaAberta(false)
    destino?.focus({ preventScroll: true })
  }

  const campo = dados.pendencias.fila
  const equipe = dados.funcionarios.valor ?? []
  const alertas = new Map(dados.alertas.valor?.map(a => [a.id, a.nivel]))
  const lista = (campo.valor ?? []).filter(t => !soTarefas || Object.prototype.hasOwnProperty.call(tarefasDaCasa, t.id.split(':')[0]))
    .map(tarefa => ({ tarefa, nivel: soTarefas ? 'operacao' as const : alertas.get(tarefa.id) ?? 'desconhecido' as const }))
    .sort((a, b) => niveis[a.nivel].prioridade - niveis[b.nivel].prioridade)
  const risco = lista[0]?.nivel === 'dinheiro em risco'
  const estado = risco ? 'Há dinheiro em risco.' : lista.length ? 'A equipe aguarda você.'
    : campo.estado === 'indisponivel' ? 'A fila está indisponível.' : 'A fila está em dia.'
  const painel = <Fila lista={lista} campo={campo} equipe={equipe} casal={casal} soTarefas={soTarefas}
    tituloRef={fila} id={filaId} recolhida={temFolha ? !folhaAberta : undefined} />
  return <div className="b-inicio" data-tema={tema} data-dispositivo={dispositivo}>
    <header className="b-topo">
      <div className="b-marca">
        <span className="b-quadrado"><Icone nome={soTarefas ? 'casa' : 'escritorio'} size={17} /></span>
        <h1 ref={inicio} tabIndex={-1}>{soTarefas ? 'Tarefas da Casa' : 'Escritório da família'}</h1>
      </div>
      <span className="selo-exemplo">Exemplo</span>
    </header>
    <div className="b-conteudo">
      <div className="b-saude">
        <span data-risco={risco || undefined}><Icone nome={risco ? 'erro' : lista.length ? 'pendente' : campo.estado === 'indisponivel' ? 'ajuda' : 'salvo'} size={18} />{estado}</span>
        <button className="b-controle b-acao" type="button" aria-controls={filaId} ref={botaoFaixa}
          aria-expanded={temFolha ? folhaAberta : undefined} onClick={e => {
            if (!temFolha) focar(fila)
            else if (folhaAberta) fila.current?.focus({ preventScroll: true })
            else abrirFolha(e.currentTarget)
          }}>
          Ver tarefas<Icone nome="abrir" size={15} />
        </button>
      </div>
      <div className="b-principal" data-so-tarefas={soTarefas || undefined}>
        {!soTarefas && <Maquete dados={dados} casal={casal} dispositivo={dispositivo} />}
        {!temFolha && painel}
      </div>
      {!soTarefas && <Acompanhamento dados={dados} papel={papel} />}
    </div>
    {!soTarefas && <div className="b-dock">
      {temFolha && <div className="b-reserva">
        <div className="b-folha" data-aberta={folhaAberta}
          onBlur={e => {
            if (folhaAberta && e.relatedTarget && e.relatedTarget !== botaoFaixa.current && !e.currentTarget.contains(e.relatedTarget)) {
              setFolhaAberta(false)
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Escape' && folhaAberta) {
              e.stopPropagation()
              fecharFolha(origemFolha.current)
            }
          }}>
          <button className="b-controle b-abrir-fila" type="button" aria-expanded={folhaAberta}
            aria-controls={filaId} onClick={e => folhaAberta ? fecharFolha(e.currentTarget) : abrirFolha(e.currentTarget)}>
            <Icone nome="recepcao" size={17} />
            <span>Precisa de você</span>
            {lista.length > 0 && <span className="b-total-tarefas" aria-label={`${lista.length} ${lista.length === 1 ? 'tarefa' : 'tarefas'}`}>{lista.length}</span>}
            <Icone desenho={ChevronUp} className="b-folha-seta" size={18} />
          </button>
          {painel}
        </div>
      </div>}
      <Navegacao inicio={inicio} papel={papel} />
    </div>}
  </div>
}

export function Proposta({ oculto, ...props }: PropsProposta & { oculto?: boolean }) {
  const ocultoNaCasca = useValoresOcultos()
  return <PrivacidadePropostas.Provider value={ocultoNaCasca || !!oculto}>
    <InicioB {...props} />
  </PrivacidadePropostas.Provider>
}
