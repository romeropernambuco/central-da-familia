import { useState, type ComponentProps, type RefObject } from 'react'
import { Icone, type NomeIcone } from '../../componentes/Icone'
import { Bemvindo } from '../../componentes/ilustracoes'
import { EscritorioMaquete } from '../comuns/EscritorioMaquete'
import { useValoresOcultos } from '../comuns/privacidade'
import type { DadosInicio, NivelAlerta } from '../dadosExemplo'

type Pergunta = NonNullable<DadosInicio['pendencias']['fila']['valor']>[number]
type Tarefa = Pergunta & { nivel: NivelAlerta }
type SalaMaquete = NonNullable<ComponentProps<typeof EscritorioMaquete>['salaDestacada']>

const niveis = {
  'dinheiro em risco': { ordem: 0, icone: 'erro', rotulo: 'Dinheiro em risco', acao: 'Confira um vencimento.' },
  operacao: { ordem: 1, icone: 'lancamentos', rotulo: 'Operação', acao: 'A equipe precisa de você.' },
  lembrete: { ordem: 2, icone: 'pendente', rotulo: 'Lembrete', acao: 'Há um lembrete para hoje.' },
} satisfies Record<NivelAlerta, { ordem: number; icone: NomeIcone; rotulo: string; acao: string }>

const salas = {
  caixa: 'Caixa',
  casa: 'Casa',
  cartoes: 'Cartões',
  patrimonio: 'Patrimônio',
} satisfies Partial<Record<SalaMaquete, string>>
type Sala = keyof typeof salas

const estados = {
  vai_comecar: 'Ainda vai começar',
  trabalhando: 'Trabalhando',
  entregue: 'Entregue',
  precisa_de_voce: 'Precisa de você',
}

// Postos presentes na maquete compartilhada. A fila pode incluir colegas de fora da cena.
const postos = new Set(['contador', 'tesoureiro', 'folha', 'comprador', 'cartao', 'assistente', 'guardado', 'imoveis'])
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function organizarFila(dados: DadosInicio): Tarefa[] {
  const alertas = new Map(dados.alertas.valor?.map(alerta => [alerta.id, alerta.nivel]))
  return (dados.pendencias.fila.valor ?? [])
    .map(tarefa => ({ ...tarefa, nivel: alertas.get(tarefa.id) ?? 'operacao' }))
    .sort((a, b) => niveis[a.nivel].ordem - niveis[b.nivel].ordem)
}

function Nivel({ nivel }: { nivel: NivelAlerta }) {
  const tipo = niveis[nivel]
  return <span className="bento-nivel" data-nivel={nivel}><Icone nome={tipo.icone} size={14} />{tipo.rotulo}</span>
}

export function EstadoDoDia({ estado, tarefa, abrir }: {
  estado: DadosInicio['pendencias']['fila']['estado']
  tarefa?: Tarefa
  abrir: () => void
}) {
  return <section className="bento-estado" aria-label="Estado do dia">
    <div className="bento-estado-texto">
      {tarefa
        ? <><Nivel nivel={tarefa.nivel} /><span>{niveis[tarefa.nivel].acao}</span></>
        : <><Icone nome={estado === 'vazio' ? 'salvo' : 'ajuda'} size={18} />
          <span>{estado === 'vazio' ? 'Tudo em dia no escritório.' : 'A fila está indisponível.'}</span></>}
    </div>
    <button type="button" className="bento-alvo bento-acao" onClick={abrir}>
      {tarefa ? 'Ver fila' : 'Ver escritório'}<Icone nome="abrir" size={16} />
    </button>
  </section>
}

function ItensDaFila({ dados, tarefas, oculto }: { dados: DadosInicio; tarefas: Tarefa[]; oculto: boolean }) {
  return <ul className="bento-itens">
    {tarefas.map(tarefa => {
      const pessoa = dados.funcionarios.valor?.find(f => f.id === tarefa.funcionario || f.nome === tarefa.funcionario)
      return <li key={tarefa.id}>
        <span className="bento-avatar"><Icone nome="pessoa" size={17} /></span>
        <div>
          <Nivel nivel={tarefa.nivel} />
          <p>{oculto ? niveis[tarefa.nivel].acao : tarefa.perguntaCurta}</p>
          {pessoa && <span className="bento-legenda">{pessoa.nome}</span>}
        </div>
      </li>
    })}
  </ul>
}

const normalizarEspacos = (texto: string) => texto.replace(/\s+/g, ' ')

function valorDaMaquete(dados: DadosInicio, tarefas: Tarefa[]) {
  const plano = dados.plano2029.faltamPorMesComMargem
  const valoresDosCartoes = new Set([
    dados.hojePodeGastar.valor, dados.aplicacoes.total, dados.faturas.total,
  ].flatMap(campo => campo.estado === 'pronto'
    ? [moeda.format(campo.valor)]
    : []))
  if (plano.estado === 'pronto') valoresDosCartoes.add(moeda.format(Math.abs(plano.valor) / 100))
  const tarefasEmTexto = tarefas.map(t => normalizarEspacos(t.perguntaCurta))
  const tarefa = tarefas.slice(0, 3).find(item => {
    if (item.valor.estado !== 'pronto' || !postos.has(item.funcionario)) return false
    if (!dados.funcionarios.valor?.some(f => f.id === item.funcionario)) return false
    const valor = moeda.format(item.valor.valor)
    return !valoresDosCartoes.has(valor) && !tarefasEmTexto.some(texto => texto.includes(normalizarEspacos(valor)))
  })
  return tarefa ? { [tarefa.funcionario]: tarefa.valor } : undefined
}

export function Escritorio({ dados, tarefas, titulo, tituloFila }: {
  dados: DadosInicio
  tarefas: Tarefa[]
  titulo: RefObject<HTMLHeadingElement>
  tituloFila: RefObject<HTMLHeadingElement>
}) {
  const [sala, selecionar] = useState<Sala>()
  const oculto = useValoresOcultos()
  const valores = oculto ? undefined : valorDaMaquete(dados, tarefas)
  const equipeDaSala = (dados.funcionarios.valor ?? []).filter(f => f.sala === sala)
  return <section className="bento-cartao bento-escritorio">
    <header className="bento-escritorio-titulo">
      <span className="bento-icone"><Icone nome="escritorio" /></span>
      <h2 ref={titulo} tabIndex={-1}>Escritório</h2>
    </header>
    <div className="bento-escritorio-corpo">
      <div className="bento-cena">
        <div className="bento-palco" data-maquete="media">
          <EscritorioMaquete funcionarios={dados.funcionarios} salaDestacada={sala} mostrarPlaquinhas valores={valores} />
        </div>
        <div className="bento-salas" role="group" aria-label="Destacar sala">
          {Object.entries(salas).map(([id, nome]) => <button type="button" className="bento-alvo" key={id} aria-pressed={id === sala}
            onClick={() => selecionar(id === sala ? undefined : id as Sala)}>{nome}</button>)}
        </div>
        {sala && (equipeDaSala.length ? <ul className="bento-equipe" aria-label={`Equipe · ${salas[sala]}`}>
          {equipeDaSala.map(f => <li key={f.id}>
            <strong>{f.nome}</strong><span>{f.estadoHoje.valor ? estados[f.estadoHoje.valor] : 'Estado indisponível'}</span>
          </li>)}
        </ul> : <p className="bento-legenda">{dados.funcionarios.estado === 'indisponivel'
          ? 'Equipe indisponível por enquanto.' : 'Sem funcionários cadastrados nesta sala.'}</p>)}
      </div>
      <div className="bento-fila">
        <header className="bento-fila-titulo">
          <h3 ref={tituloFila} tabIndex={-1}>Precisa de você</h3>
          <Bemvindo />
        </header>
        {tarefas.length ? <>
          <ItensDaFila dados={dados} tarefas={tarefas.slice(0, 3)} oculto={oculto} />
          {tarefas.length > 3 && <details className="bento-fila-restante">
            <summary className="bento-alvo"><Icone nome="abrir" size={16} />Mais tarefas</summary>
            <ItensDaFila dados={dados} tarefas={tarefas.slice(3)} oculto={oculto} />
          </details>}
        </> : <p className="bento-legenda">{dados.pendencias.fila.estado === 'vazio'
          ? 'Nenhuma tarefa aguardando você.' : 'A fila ainda não está disponível.'}</p>}
      </div>
    </div>
  </section>
}
