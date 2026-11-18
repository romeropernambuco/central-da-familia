import { useId, useRef, useState } from 'react'
import { Icone, icones, type NomeIcone } from '../../componentes/Icone'
import { useValoresOcultos } from '../comuns/privacidade'
import type { DadosInicio, NivelAlerta } from '../dadosExemplo'
import { destino } from './destino'
import { Lacuna, Quantia } from './Plano'

type Tarefa = NonNullable<DadosInicio['pendencias']['fila']['valor']>[number]
type Pessoa = NonNullable<DadosInicio['funcionarios']['valor']>[number]
type Pasta = 'agora' | 'depois' | 'feitas'

const pastas = { agora: 'Agora', depois: 'Depois', feitas: 'Feitas' } as const
const niveis = {
  'dinheiro em risco': { titulo: 'Dinheiro em risco', icone: 'erro', texto: 'Confira esta pendência primeiro.', ordem: 0 },
  operacao: { titulo: 'Operação', icone: 'lancamentos', texto: 'Confira o registro antes de concluir.', ordem: 1 },
  lembrete: { titulo: 'Lembrete', icone: 'pendente', texto: 'Retome quando puder.', ordem: 2 },
  desconhecido: { titulo: 'Prioridade · Ainda sem dado', icone: 'ajuda', texto: 'Confira o registro para saber mais.', ordem: 3 },
} satisfies Record<NivelAlerta | 'desconhecido', { titulo: string; icone: NomeIcone; texto: string; ordem: number }>

function nomeNormalizado(nome: string) {
  return nome.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

function avatar(pessoa?: Pessoa): NomeIcone {
  if (!pessoa) return 'pessoa'
  if (pessoa.id === 'cartao') return 'gerente'
  if (pessoa.id === 'guardado') return 'investidor'
  return Object.prototype.hasOwnProperty.call(icones, pessoa.id) ? pessoa.id as NomeIcone : 'pessoa'
}

function assunto(tarefa: Tarefa, oculto: boolean) {
  if (oculto) return 'Decisão com detalhes ocultos'
  const texto = tarefa.perguntaCurta.replace(/\s*(?:[-–—·:]\s*)?(?:R\$\s*-?\s*\d[\d.,]*|\d[\d.,]*\s*%)/gu, '').trim()
  return texto || 'Confira esta decisão'
}

export function Hoje({ dados, celular, visivel, abrirPlano, abrirEscritorio }: {
  dados: DadosInicio; celular: boolean; visivel: boolean; abrirPlano: () => void; abrirEscritorio: () => void
}) {
  const oculto = useValoresOcultos()
  const id = useId()
  const filaTitulo = useRef<HTMLHeadingElement>(null)
  const [pasta, setPasta] = useState<Pasta>('agora')
  const [movidas, setMovidas] = useState<Partial<Record<string, Pasta>>>({})
  const [ultima, setUltima] = useState<{ id: string; origem: Pasta; destino: Pasta; pagina: number }>()
  const [pagina, setPagina] = useState(0)
  const [aberta, setAberta] = useState(false)
  if (!visivel) return null

  const { fila } = dados.pendencias
  const alertas = new Map(dados.alertas.valor?.map(({ id, nivel }) => [id, nivel]))
  const tarefas = (fila.valor ?? []).map(tarefa => {
    const nivel = alertas.get(tarefa.id) ?? 'desconhecido' as const
    const pessoa = dados.funcionarios.valor?.find(p => p.id === tarefa.funcionario ||
      nomeNormalizado(p.nome) === nomeNormalizado(tarefa.funcionario))
    return { tarefa, nivel, pessoa }
  }).sort((a, b) => niveis[a.nivel].ordem - niveis[b.nivel].ordem)

  const nestaPasta = tarefas.filter(({ tarefa }) => (movidas[tarefa.id] ?? 'agora') === pasta)
  const indice = Math.min(pagina, Math.max(nestaPasta.length - 1, 0))
  const atual = nestaPasta[indice]
  const primeira = tarefas.find(({ tarefa }) => (movidas[tarefa.id] ?? 'agora') === 'agora')
  const risco = primeira?.nivel === 'dinheiro em risco'

  function irPara(novaPasta: Pasta, indice = 0) {
    setPasta(novaPasta)
    setPagina(indice)
    setAberta(false)
  }

  function mover(id: string, proxima: Pasta) {
    setMovidas(anteriores => ({ ...anteriores, [id]: proxima }))
    setUltima({ id, origem: pasta, destino: proxima, pagina: indice })
    setPagina(Math.min(indice, Math.max(0, nestaPasta.length - 2)))
    setAberta(false)
    filaTitulo.current?.focus({ preventScroll: true })
  }

  function desfazer() {
    if (!ultima) return
    setMovidas(anteriores => ({ ...anteriores, [ultima.id]: ultima.origem }))
    irPara(ultima.origem, ultima.pagina)
    setUltima(undefined)
    filaTitulo.current?.focus({ preventScroll: true })
  }

  function revisar() {
    if (!primeira) {
      abrirEscritorio()
      return
    }
    irPara('agora')
    filaTitulo.current?.focus({ preventScroll: true })
    filaTitulo.current?.scrollIntoView?.({ block: 'nearest' })
  }

  return <>
    <header className="k-secao-cabecalho"><Icone nome="lancamentos" size={20} /><h2>Hoje</h2></header>
    <div className="k-saude" data-risco={risco}>
      <Icone nome={risco ? 'erro' : primeira ? 'email' : fila.estado === 'pronto' ? 'salvo' : 'ajuda'} size={16} />
      <span>{risco ? 'Há dinheiro em risco.' : primeira ? 'A equipe aguarda você.' :
        fila.estado !== 'pronto' ? 'Fila · Ainda sem dado' : 'Tudo em dia por aqui.'}</span>
      <button type="button" onClick={revisar}>{primeira ? 'Revisar' : 'Ver equipe'} <Icone nome="abrir" size={15} /></button>
    </div>
    <div className="k-resumo" aria-label="Resumo financeiro" role="group">
      <div className="k-gasto">
        <Icone nome="orcamento" size={22} />
        <div>
          <h3>Hoje você pode gastar</h3>
          <Quantia campo={dados.hojePodeGastar.valor} tamanho="principal" />
          <p>Disponível no orçamento</p>
        </div>
      </div>
      <div className="k-referencias">
        <div className="k-referencia k-referencia-plano">
          <button type="button" onClick={abrirPlano} aria-label="Ver Rumo a 2029"><Icone nome="plano2029" size={16} />
            Plano 2029 <Icone nome="abrir" size={14} />
          </button>
          {celular ? <Lacuna dados={dados} /> : <span className="k-referencia-legenda">Diferença mensal com margem</span>}
        </div>
        <div className="k-referencia">
          <a href={destino('guardado', 'aplicacoes')}><Icone nome="guardado" size={16} />Total aplicado</a>
          <Quantia campo={dados.aplicacoes.total} tamanho="secundario" />
        </div>
        <div className="k-referencia">
          <a href={destino('cartoes')}><Icone nome="cartoes" size={16} />Faturas previstas</a>
          <Quantia campo={dados.faturas.total} tamanho="secundario" />
        </div>
      </div>
    </div>
    <section className="k-fila" aria-labelledby={`${id}-titulo`}>
      <h3 ref={filaTitulo} tabIndex={-1} id={`${id}-titulo`}>Precisa de você</h3>
      <div className="k-pastas" role="group" aria-label="Pastas de decisões">
        {(Object.keys(pastas) as Pasta[]).map(item => <button type="button" key={item} aria-pressed={pasta === item}
          onClick={() => irPara(item)}>{pastas[item]}</button>)}
      </div>
      {atual ? <article className="k-decisao">
        <div className="k-remetente">
          <span className="k-avatar" aria-hidden="true">
            <Icone nome={avatar(atual.pessoa)} size={17} />
            {atual.pessoa && <img src={`${import.meta.env.BASE_URL}retratos-escritorio/${encodeURIComponent(atual.pessoa.id)}.webp`}
              alt="" width="32" height="32" onError={evento => { evento.currentTarget.hidden = true }} />}
          </span>
          <div>
            <span>{atual.pessoa?.nome ?? 'Remetente · Ainda sem dado'}</span>
            <h4>{assunto(atual.tarefa, oculto)}</h4>
          </div>
        </div>
        <div className="k-decisao-medida">
          <span className="k-prioridade" data-risco={atual.nivel === 'dinheiro em risco'}>
            <Icone nome={niveis[atual.nivel].icone} size={14} />{niveis[atual.nivel].titulo}
          </span>
          <Quantia campo={atual.tarefa.valor} tamanho="secundario" />
        </div>
        <div className="k-acoes" role="group" aria-label="Ações da decisão">
          {pasta !== 'feitas' && <button type="button" onClick={() => mover(atual.tarefa.id, 'feitas')}><Icone nome="salvo" size={15} />Já fiz</button>}
          {pasta === 'agora'
            ? <button type="button" onClick={() => mover(atual.tarefa.id, 'depois')}><Icone nome="pendente" size={15} />Depois</button>
            : <button type="button" onClick={() => mover(atual.tarefa.id, 'agora')}><Icone nome="desfazer" size={15} />Retomar</button>}
          <button type="button" aria-expanded={aberta} aria-controls={`${id}-decisao`} onClick={() => setAberta(!aberta)}>
            {aberta ? 'Fechar' : 'Abrir'}<Icone nome={aberta ? 'fechar' : 'abrir'} size={15} />
          </button>
        </div>
        <div className="k-decisao-detalhe" id={`${id}-decisao`} hidden={!aberta}>
          <p>{niveis[atual.nivel].texto}</p>
          <a className="k-botao" href={oculto ? destino('escritorio') : destino('escritorio', 'tarefa', atual.tarefa.id)}>
            {oculto ? 'Abrir o escritório' : 'Ver tarefa no escritório'} <Icone nome="abrir" size={16} />
          </a>
        </div>
      </article> : <p className="k-fila-vazia">{fila.estado !== 'pronto' ? 'Ainda sem dado' : pasta === 'agora'
        ? 'Nenhuma decisão por agora.' : pasta === 'depois' ? 'Nenhuma decisão adiada.' : 'Nenhuma decisão concluída.'}</p>}
      {nestaPasta.length > 1 && <div className="k-paginacao" role="group" aria-label="Percorrer decisões">
        <button type="button" aria-label="Decisão anterior" disabled={indice === 0} onClick={() => irPara(pasta, indice - 1)}>
          <Icone className="k-anterior" nome="abrir" size={17} />
        </button>
        <span aria-live="polite">{indice + 1} de {nestaPasta.length}</span>
        <button type="button" aria-label="Próxima decisão" disabled={indice === nestaPasta.length - 1} onClick={() => irPara(pasta, indice + 1)}>
          <Icone nome="abrir" size={17} />
        </button>
      </div>}
      {ultima && <div className="k-desfazer">
        <span role="status">{ultima.destino === 'feitas' ? 'Marcada como feita.' : ultima.destino === 'depois' ? 'Movida para depois.' : 'De volta à fila.'}</span>
        <button type="button" onClick={desfazer}><Icone nome="desfazer" size={15} />Desfazer</button>
      </div>}
    </section>
  </>
}
