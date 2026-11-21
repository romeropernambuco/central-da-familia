import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { Escritorio3D } from '../motor/Escritorio3D'
import { FichaPosto } from '../FichaPosto'
import { VisorEscritorio } from '../../componentes/escritorio/VisorEscritorio'
import type { PessoaDoEscritorio, TarefaDoEscritorio } from '../../componentes/escritorio/modeloPosto'
import type { DadosInicio } from '../../componentes/escritorio/dadosDeExemplo'

export function Escritorio({
  dados,
  titulo,
  celular,
  oculto,
  pessoa,
  tarefa,
  selecionar,
  verTarefa,
  tarefaDaFila,
}: {
  dados: DadosInicio
  titulo: string
  celular: boolean
  oculto: boolean
  pessoa?: PessoaDoEscritorio
  tarefa?: TarefaDoEscritorio
  tarefaDaFila?: string
  selecionar: (pessoa?: PessoaDoEscritorio) => void
  verTarefa: (id: string) => void
}) {
  const [sala, setSala] = useState<PessoaDoEscritorio['sala']>()
  const pessoas = dados.funcionarios.valor ?? []
  const enquadramento = sala && pessoa ? pessoa.sala : sala

  return (
    <section className="m-cartao m-escritorio" aria-labelledby={titulo}>
      <header className="m-secao-topo">
        <div>
          <p className="m-contexto">Equipe da família</p>
          <h2 id={titulo} tabIndex={-1}>
            Escritório
          </h2>
        </div>
      </header>
      {pessoas.length > 0 ? (
        <>
          <div className="m-palco">
            <VisorEscritorio
              sala={enquadramento}
              aoMudarSala={setSala}
              {...{ celular, tarefaDaFila }}
              folha={
                pessoa && (
                  <FichaPosto
                    key={pessoa.id}
                    {...{ dados, pessoa, tarefa, celular, verTarefa }}
                    fechar={() => selecionar()}
                  />
                )
              }
            >
              {navegacao => (
                <Escritorio3D
                  completo
                  {...{ celular, navegacao, oculto }}
                  funcionarios={dados.funcionarios}
                  papel={dados.pessoa.papel.valor}
                  variante="grande"
                  salaDestacada={enquadramento}
                  postoSelecionado={pessoa?.id ?? null}
                  onSelecionar={selecionar}
                />
              )}
            </VisorEscritorio>
          </div>
          <div className="m-escritorio-rodape">
            <details>
              <summary className="m-alvo">Ver equipe</summary>
              <ul className="m-equipe">
                {pessoas.map(item => (
                  <li key={item.id}>
                    <button className="m-alvo" type="button" onClick={() => selecionar(item)}>
                      {item.nome}
                      <ArrowUpRight aria-hidden="true" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </>
      ) : (
        <p className="m-ausente">Ainda sem dado sobre a equipe.</p>
      )}
    </section>
  )
}
