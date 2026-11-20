import { BellRing, Check, Clock, DoorOpen, Keyboard, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Escritorio3D } from '../comuns/Escritorio3D'
import { FichaPosto } from '../comuns/FichaPosto'
import { VisorEscritorio } from '../comuns/VisorEscritorio'
import type { PessoaDoEscritorio, TarefaDoEscritorio } from '../comuns/modeloPosto'
import type { DadosInicio } from '../dadosExemplo'

export type Pessoa = PessoaDoEscritorio
type Sala = Pessoa['sala']

const salas: Record<Sala, string> = {
  caixa: 'Caixa',
  casa: 'Casa',
  cartoes: 'Cartões',
  patrimonio: 'Patrimônio',
  gestao: 'Gestão',
  recepcao: 'Recepção',
  apoio: 'Apoio',
}

const estados = {
  vai_comecar: { rotulo: 'Ainda vai começar', Icone: Clock },
  precisa_de_voce: { rotulo: 'Precisa de você', Icone: BellRing },
  trabalhando: { rotulo: 'Trabalhando', Icone: Keyboard },
  entregue: { rotulo: 'Entregue', Icone: Check },
  semDado: { rotulo: 'Ainda sem dado', Icone: Clock },
}

function Estado({ pessoa }: { pessoa: Pessoa }) {
  const estado = pessoa.estadoHoje.valor ?? 'semDado'
  const { Icone, rotulo } = estados[estado]
  return (
    <span className="l-estado" data-estado={estado}>
      <Icone size={14} aria-hidden="true" />
      {rotulo}
    </span>
  )
}

export function Palco({
  id,
  dados,
  celular,
  oculto,
  pessoa,
  tarefa,
  selecionar,
  verTarefa,
  tarefaDaFila,
}: {
  id: string
  dados: DadosInicio
  celular: boolean
  oculto: boolean
  pessoa?: Pessoa
  tarefa?: TarefaDoEscritorio
  tarefaDaFila?: string
  selecionar: (pessoa?: Pessoa) => void
  verTarefa: (id: string) => void
}) {
  const [sala, setSala] = useState<Sala>()
  const enquadramento = sala && pessoa ? pessoa.sala : sala
  const funcionarios = dados.funcionarios
  const pessoas = (funcionarios.valor ?? []).filter(pessoa => !sala || pessoa.sala === sala)
  return (
    <section className="l-bloco l-escritorio" aria-labelledby={id}>
      <header className="l-secao-topo">
        <span className="l-icone">
          <DoorOpen size={22} aria-hidden="true" />
        </span>
        <div>
          <h2 id={id} tabIndex={-1}>
            Equipe da família
          </h2>
        </div>
      </header>

      <div className="l-palco">
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
              {...{ funcionarios, celular, navegacao, oculto }}
              papel={dados.pessoa.papel.valor}
              salaDestacada={enquadramento}
              variante="grande"
              postoSelecionado={pessoa?.id ?? null}
              onSelecionar={selecionar}
            />
          )}
        </VisorEscritorio>
      </div>
      <div className="l-equipe">
        <h3>{sala ? `Equipe · ${salas[sala]}` : 'Equipe em cena'}</h3>
        {pessoas.length ? (
          <ul className="l-pessoas">
            {pessoas.map(pessoa => (
              <li key={pessoa.id}>
                <button type="button" onClick={() => selecionar(pessoa)}>
                  <span className="l-avatar">
                    <UserRound size={16} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{pessoa.curto}</strong>
                    <Estado pessoa={pessoa} />
                  </span>
                  <span className="l-sr">
                    , {pessoa.nome}, {salas[pessoa.sala]}. Abrir ficha.
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="l-legenda">
            {funcionarios.estado === 'indisponivel' ? 'Ainda sem dado' : 'Nenhum posto cadastrado nesta vista.'}
          </p>
        )}
      </div>
    </section>
  )
}
