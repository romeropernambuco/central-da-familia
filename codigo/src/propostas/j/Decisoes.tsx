import { useEffect, useId, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { BellRing, ChevronDown } from 'lucide-react'
import { Icone } from '../../componentes/Icone'
import { useValoresOcultos } from '../comuns/privacidade'
import type { DadosInicio } from '../dadosExemplo'
import { organizarFila, prioridades, type Funcionario } from './modelo'
import { Quantia, abrirFoco } from './interface'

const pastas = { agora: 'Agora', depois: 'Depois', feitas: 'Feitas' } as const
type Pasta = keyof typeof pastas
type Tarefa = ReturnType<typeof organizarFila>[number]

export function Decisoes({
  dados,
  celular,
  aberta,
  alternar,
  mostrarPosto,
  tarefaAlvo,
  movidas,
  setMovidas,
}: {
  dados: DadosInicio
  celular: boolean
  aberta: boolean
  alternar: () => void
  mostrarPosto: (pessoa: Funcionario, tarefa: string) => void
  tarefaAlvo?: { id: string }
  movidas: Partial<Record<string, Pasta>>
  setMovidas: Dispatch<SetStateAction<Partial<Record<string, Pasta>>>>
}) {
  const oculto = useValoresOcultos()
  const painel = useId()
  const titulo = useId()
  const foco = useRef<HTMLButtonElement>(null)
  const [pasta, setPasta] = useState<Pasta>('agora')
  const [ultima, setUltima] = useState<{ id: string; origem: Pasta; destino: Pasta }>()
  const [detalhe, setDetalhe] = useState<string>()
  const [pagina, setPagina] = useState(0)
  const tarefas = organizarFila(dados)
  const lista = tarefas.filter(t => (movidas[t.id] ?? 'agora') === pasta)
  const porPagina = celular ? 1 : 2
  const ultimaPagina = Math.max(0, Math.ceil(lista.length / porPagina) - 1)
  const atual = Math.min(pagina, ultimaPagina)
  const botaoAlvo = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!tarefaAlvo) return
    const destino = movidas[tarefaAlvo.id] ?? 'agora'
    const indice = tarefas.filter(t => (movidas[t.id] ?? 'agora') === destino).findIndex(t => t.id === tarefaAlvo.id)
    if (indice < 0) return
    setPasta(destino)
    setPagina(Math.floor(indice / porPagina))
    setDetalhe(tarefaAlvo.id)
    // Uma solicitação de ficha navega à tarefa uma vez.
  }, [tarefaAlvo])
  useEffect(() => {
    if (tarefaAlvo && detalhe === tarefaAlvo.id) abrirFoco(botaoAlvo.current)
  }, [tarefaAlvo, detalhe, atual, pasta])

  function irPara(destino: Pasta, indice = 0) {
    setPasta(destino)
    setPagina(indice)
    setDetalhe(undefined)
  }

  function mover(tarefa: Tarefa, destino: Pasta) {
    foco.current?.focus({ preventScroll: true })
    setMovidas(m => ({ ...m, [tarefa.id]: destino }))
    setUltima({ id: tarefa.id, origem: pasta, destino })
    setPagina(Math.min(atual, Math.max(0, Math.ceil((lista.length - 1) / porPagina) - 1)))
    setDetalhe(undefined)
  }

  const mensagem =
    ultima?.destino === 'feitas'
      ? 'Marcada como feita na prévia.'
      : ultima?.destino === 'depois'
        ? 'Guardada para depois na prévia.'
        : 'De volta à fila da prévia.'

  return (
    <aside className="j-fila" aria-labelledby={titulo}>
      <h2 className="j-fila-titulo" id={titulo}>
        {celular ? (
          <button
            type="button"
            ref={foco}
            aria-controls={painel}
            aria-expanded={aberta}
            className="j-folha-gatilho"
            onClick={alternar}
          >
            <Icone desenho={BellRing} size={19} /> Precisa de você <Icone desenho={ChevronDown} size={18} />
          </button>
        ) : (
          <>
            <Icone desenho={BellRing} size={19} /> Precisa de você
          </>
        )}
      </h2>
      <div
        id={painel}
        className="j-fila-corpo"
        hidden={celular && !aberta}
        onKeyDown={evento => {
          if (evento.key === 'Escape' && celular) {
            alternar()
            abrirFoco(foco.current)
          }
        }}
      >
        <div className="j-fila-abas" role="group" aria-label="Pastas das decisões">
          {(Object.keys(pastas) as Pasta[]).map(p => (
            <button
              type="button"
              key={p}
              ref={!celular && p === pasta ? foco : undefined}
              aria-pressed={p === pasta}
              onClick={() => irPara(p)}
            >
              {pastas[p]}
            </button>
          ))}
        </div>
        {lista.length > 0 ? (
          <ul className="j-decisoes">
            {lista.slice(atual * porPagina, (atual + 1) * porPagina).map((tarefa, i) => {
              const aberto = detalhe === tarefa.id
              const idDetalhe = `${painel}-${i}`
              const prioridade = prioridades[tarefa.nivel]
              return (
                <li key={tarefa.id}>
                  <div className="j-remetente">
                    <span className="j-avatar" aria-hidden="true">
                      {tarefa.responsavel ? (
                        tarefa.responsavel.curto.trim().slice(0, 2).toUpperCase()
                      ) : (
                        <Icone nome="pessoa" size={16} />
                      )}
                    </span>
                    <div>
                      {tarefa.responsavel ? (
                        <button
                          type="button"
                          className="j-remetente-posto"
                          onClick={() => mostrarPosto(tarefa.responsavel!, tarefa.id)}
                        >
                          {tarefa.responsavel.nome}
                        </button>
                      ) : (
                        <span>Equipe do escritório</span>
                      )}
                      <span className="j-nivel" data-risco={tarefa.nivel === 'dinheiro em risco'}>
                        <Icone nome={prioridade.icone} size={13} />
                        {prioridade.texto}
                      </span>
                    </div>
                  </div>
                  <p className="j-pergunta">
                    {oculto ? 'Decisão com detalhes ocultos' : tarefa.perguntaCurta || 'Ainda sem dado'}
                  </p>
                  <Quantia campo={tarefa.valor} tamanho="secundario" />
                  <div className="j-acoes" role="group" aria-label="Ações da decisão">
                    {pasta !== 'feitas' && (
                      <button type="button" onClick={() => mover(tarefa, 'feitas')}>
                        Já fiz
                      </button>
                    )}
                    {pasta === 'agora' ? (
                      <button type="button" onClick={() => mover(tarefa, 'depois')}>
                        Depois
                      </button>
                    ) : (
                      <button type="button" onClick={() => mover(tarefa, 'agora')}>
                        Retomar
                      </button>
                    )}
                    <button
                      type="button"
                      ref={tarefaAlvo?.id === tarefa.id ? botaoAlvo : undefined}
                      aria-expanded={aberto}
                      aria-controls={idDetalhe}
                      onClick={() => setDetalhe(aberto ? undefined : tarefa.id)}
                    >
                      {aberto ? 'Fechar' : 'Abrir'}
                    </button>
                  </div>
                  <div className="j-decisao-detalhe" id={idDetalhe} hidden={!aberto}>
                    {aberto && (
                      <>
                        {tarefa.responsavel && (
                          <button type="button" onClick={() => mostrarPosto(tarefa.responsavel!, tarefa.id)}>
                            Ver posto <Icone nome="escritorio" size={16} />
                          </button>
                        )}
                        <a
                          href={
                            oculto
                              ? '../../#/escritorio'
                              : `../../#/escritorio?secao=tarefa&entidade=${encodeURIComponent(tarefa.id)}`
                          }
                        >
                          Abrir no escritório <Icone nome="abrir" size={16} />
                        </a>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="j-fila-vazia">
            {dados.pendencias.fila.estado !== 'pronto'
              ? 'Ainda sem dado'
              : pasta === 'agora'
                ? 'Nenhuma decisão para agora.'
                : pasta === 'depois'
                  ? 'Nenhuma decisão adiada.'
                  : 'Nenhuma decisão concluída.'}
          </p>
        )}
        {ultimaPagina > 0 && (
          <div className="j-paginacao" role="group" aria-label="Páginas das decisões">
            <button type="button" disabled={atual === 0} onClick={() => irPara(pasta, atual - 1)}>
              Anterior
            </button>
            <button type="button" disabled={atual === ultimaPagina} onClick={() => irPara(pasta, atual + 1)}>
              Próxima
            </button>
          </div>
        )}
        <div className="j-retorno">
          <span role="status">{ultima && mensagem}</span>
          {ultima && (
            <button
              type="button"
              onClick={() => {
                foco.current?.focus({ preventScroll: true })
                setMovidas(m => ({ ...m, [ultima.id]: ultima.origem }))
                irPara(ultima.origem)
                setUltima(undefined)
              }}
            >
              Desfazer <Icone nome="desfazer" size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
