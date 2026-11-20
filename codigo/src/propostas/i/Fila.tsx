import { useId, useState } from 'react'
import { Icone, icones, type NomeIcone } from '../../componentes/Icone'
import { TudoEmDia } from '../../componentes/ilustracoes'
import { useValoresOcultos } from '../../componentes/escritorio/privacidade'
import type { DadosInicio, NivelAlerta } from '../../componentes/escritorio/dadosDeExemplo'
import { Quantia, type reservarQuantias } from './Financeiro'

type Tarefa = NonNullable<DadosInicio['pendencias']['fila']['valor']>[number]
export type Pessoa = NonNullable<DadosInicio['funcionarios']['valor']>[number]

export const niveis = {
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
} as const satisfies Record<NivelAlerta, { ordem: number; rotulo: string; icone: NomeIcone; dica: string }>

const tarefasCasa = new Map([
  ['feira_feita', 'Confirmar a feira da semana'],
  ['feira_nota', 'Guardar a nota da feira'],
  ['estoque', 'Conferir o estoque'],
  ['prestador_veio', 'Confirmar a visita do prestador'],
  ['gas', 'Conferir a troca do gás'],
])
const rotuloCasa = (tarefa: Tarefa) => tarefasCasa.get(tarefa.id.split(':', 1)[0])
const textoComMedida = /R\s*\$|\d[\d.,]*\s*%|\bra[zç][aã]o\s+\d/i

export function organizarFila(dados: DadosInicio, familiar: boolean) {
  const alertas = new Map(dados.alertas.valor?.map(alerta => [alerta.id, alerta.nivel]))
  return (dados.pendencias.fila.valor ?? [])
    .filter(tarefa => familiar || (dados.pessoa.papel.valor === 'equipe' && rotuloCasa(tarefa)))
    .map(tarefa => ({
      tarefa,
      pessoa: dados.funcionarios.valor?.find(pessoa => pessoa.id === tarefa.funcionario),
      nivel: familiar ? (alertas.get(tarefa.id) ?? 'operacao') : ('operacao' as const),
    }))
    .sort((a, b) => niveis[a.nivel].ordem - niveis[b.nivel].ordem)
}

type Pasta = 'agora' | 'depois' | 'feitas'
const pastas: Record<Pasta, string> = { agora: 'Agora', depois: 'Depois', feitas: 'Feitas' }
export type Respostas = Partial<Record<string, Pasta>>

export function Fila({
  id,
  itens,
  estado,
  familiar,
  respostas,
  setRespostas,
  medidas,
  verPessoa,
}: {
  id: string
  itens: ReturnType<typeof organizarFila>
  estado: DadosInicio['pendencias']['fila']['estado']
  familiar: boolean
  respostas: Respostas
  setRespostas: (respostas: Respostas) => void
  medidas: ReturnType<typeof reservarQuantias>
  verPessoa: (pessoa: Pessoa) => void
}) {
  const oculto = useValoresOcultos()
  const listaId = useId()
  const [expandida, setExpandida] = useState(false)
  const [pasta, setPasta] = useState<Pasta>('agora')
  const [aberta, setAberta] = useState<string>()
  const [ultima, setUltima] = useState<{ id: string; origem: Pasta; mensagem: string }>()

  function mover(idTarefa: string, destino: Pasta) {
    const mensagens = { agora: 'Tarefa retomada.', depois: 'Tarefa adiada.', feitas: 'Tarefa marcada como feita.' }
    setRespostas({ ...respostas, [idTarefa]: destino })
    setUltima({ id: idTarefa, origem: pasta, mensagem: mensagens[destino] })
    setAberta(undefined)
    document.getElementById(id)?.focus()
  }

  const nestaPasta = itens
    .map((item, indice) => ({ ...item, medida: medidas[indice], indice }))
    .filter(({ tarefa }) => (respostas[tarefa.id] ?? 'agora') === pasta)
  const visiveis = expandida ? nestaPasta : nestaPasta.slice(0, 2)
  return (
    <section className="i-cartao i-fila" aria-labelledby={id}>
      <div className="i-cabecalho-cartao">
        <span className="i-icone">
          <Icone nome="lancamentos" />
        </span>
        <h2 id={id} tabIndex={-1}>
          Precisa de você
        </h2>
      </div>
      {expandida && (
        <div className="i-pastas" role="group" aria-label="Pastas de decisões">
          {(Object.keys(pastas) as Pasta[]).map(destino => (
            <button
              key={destino}
              type="button"
              className="i-alvo"
              aria-pressed={pasta === destino}
              onClick={() => {
                setPasta(destino)
                setAberta(undefined)
              }}
            >
              {pastas[destino]}
            </button>
          ))}
        </div>
      )}
      <div id={listaId}>
        {visiveis.length ? (
          <ul className="i-lista">
            {visiveis.map(({ tarefa, pessoa, nivel, medida, indice }) => {
              const alerta = niveis[nivel]
              const pergunta =
                !familiar || oculto
                  ? (rotuloCasa(tarefa) ?? 'Tarefa com detalhes ocultos')
                  : textoComMedida.test(tarefa.perguntaCurta)
                    ? (rotuloCasa(tarefa) ?? 'Conferir pendência')
                    : tarefa.perguntaCurta || 'Ainda sem dado'
              const detalheId = `${listaId}-${indice}`
              const icone =
                pessoa?.id === 'cartao'
                  ? 'analista'
                  : pessoa?.id && Object.prototype.hasOwnProperty.call(icones, pessoa.id)
                    ? (pessoa.id as NomeIcone)
                    : 'pessoa'
              return (
                <li key={tarefa.id} className="i-decisao">
                  <div className="i-remetente">
                    <span className="i-avatar">
                      <Icone nome={icone} size={17} />
                    </span>
                    <div>
                      <p className="i-rotulo">{pessoa?.nome ?? 'Remetente indisponível'}</p>
                      <h3>{pergunta}</h3>
                    </div>
                  </div>
                  <div className="i-decisao-meta">
                    <span className="i-nivel" data-nivel={nivel}>
                      <Icone nome={alerta.icone} size={14} />
                      {alerta.rotulo}
                    </span>
                    {familiar && <Quantia medida={medida} className="i-secundario" />}
                  </div>
                  <div className="i-acoes" role="group" aria-label={`Ações para ${pergunta}`}>
                    {pasta !== 'feitas' && (
                      <button type="button" className="i-alvo" onClick={() => mover(tarefa.id, 'feitas')}>
                        Já fiz
                      </button>
                    )}
                    {pasta === 'agora' ? (
                      <button type="button" className="i-alvo" onClick={() => mover(tarefa.id, 'depois')}>
                        Depois
                      </button>
                    ) : (
                      <button type="button" className="i-alvo" onClick={() => mover(tarefa.id, 'agora')}>
                        Retomar
                      </button>
                    )}
                    <button
                      type="button"
                      className="i-alvo i-link"
                      aria-expanded={aberta === tarefa.id}
                      aria-controls={detalheId}
                      onClick={() => setAberta(aberta === tarefa.id ? undefined : tarefa.id)}
                    >
                      {aberta === tarefa.id ? 'Fechar' : 'Abrir'}{' '}
                      <Icone nome={aberta === tarefa.id ? 'fechar' : 'abrir'} size={16} />
                    </button>
                  </div>
                  <div id={detalheId} className="i-detalhe-tarefa" hidden={aberta !== tarefa.id}>
                    <p>{alerta.dica}</p>
                    {pessoa && (familiar || pessoa.sala === 'casa') && (
                      <button type="button" className="i-alvo i-link" onClick={() => verPessoa(pessoa)}>
                        Ver no escritório
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="i-fila-vazia">
            {estado === 'pronto' && <TudoEmDia />}
            <p>
              {estado !== 'pronto'
                ? 'Ainda sem dado'
                : pasta === 'agora'
                  ? 'Nenhuma decisão por agora.'
                  : 'Nenhuma tarefa nesta pasta.'}
            </p>
          </div>
        )}
      </div>
      {ultima && (
        <div className="i-desfazer">
          <p role="status">{ultima.mensagem}</p>
          <button
            type="button"
            className="i-alvo i-link"
            onClick={() => {
              setRespostas({ ...respostas, [ultima.id]: ultima.origem })
              setPasta(ultima.origem)
              setUltima(undefined)
              document.getElementById(id)?.focus()
            }}
          >
            Desfazer
          </button>
        </div>
      )}
      {itens.length > 0 && (
        <button
          type="button"
          className="i-alvo i-link i-ver-todos"
          aria-expanded={expandida}
          aria-controls={listaId}
          onClick={() => {
            setExpandida(!expandida)
            setPasta('agora')
            setAberta(undefined)
          }}
        >
          {expandida ? 'Ver resumo' : 'Ver todos'} <Icone nome="abrir" size={16} />
        </button>
      )}
    </section>
  )
}
