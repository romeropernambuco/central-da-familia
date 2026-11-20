import { useEffect, useRef, useState } from 'react'
import { Icone } from '../../componentes/Icone'
import { EscritorioMaquete } from '../comuns/EscritorioMaquete'
import type { DadosInicio } from '../dadosExemplo'
import { Medida, type Dinheiro } from './Financeiro'
import type { Pessoa } from './Fila'

type Sala = Pessoa['sala']
const salas: Record<Sala, string> = {
  caixa: 'Caixa',
  casa: 'Casa',
  gestao: 'Gestão',
  apoio: 'Apoio',
  patrimonio: 'Patrimônio',
  recepcao: 'Recepção',
  cartoes: 'Cartões',
}
const estados = {
  vai_comecar: 'Ainda vai começar',
  trabalhando: 'Trabalhando',
  entregue: 'Entregue',
  precisa_de_voce: 'Precisa de você',
}

export function Escritorio({
  id,
  funcionarios,
  papel,
  celular,
  oculto,
  pessoa,
  selecionar,
  balao,
}: {
  id: string
  funcionarios: DadosInicio['funcionarios']
  papel: DadosInicio['pessoa']['papel']['valor']
  celular: boolean
  oculto: boolean
  pessoa?: Pessoa
  selecionar: (pessoa?: Pessoa) => void
  balao?: Dinheiro
}) {
  const [foco, setFoco] = useState<Sala>()
  const [plantaInteira, setPlantaInteira] = useState(false)
  const ficha = useRef<HTMLHeadingElement>(null)
  const filtros = useRef<HTMLDivElement>(null)
  const sala = pessoa?.sala ?? foco
  const equipe = funcionarios.valor ?? []
  const salasDaEquipe = (Object.keys(salas) as Sala[]).filter(sala => equipe.some(item => item.sala === sala))
  const panorama = celular && plantaInteira && !sala
  const fichaDosImoveis = pessoa?.id === 'imoveis'

  useEffect(() => {
    if (pessoa) ficha.current?.focus()
  }, [pessoa])

  function trocarSala(destino?: Sala) {
    selecionar(undefined)
    setFoco(destino)
    setPlantaInteira(false)
  }

  return (
    <section className="i-cartao i-escritorio" aria-labelledby={id}>
      <div className="i-escritorio-topo">
        <div>
          <h2 id={id} tabIndex={-1}>
            Escritório da família
          </h2>
          <p className="i-rotulo">Escolha uma pessoa ou explore por sala.</p>
        </div>
        {celular && equipe.length > 0 && (
          <button
            type="button"
            className="i-alvo i-link"
            aria-pressed={panorama}
            onClick={() => {
              trocarSala()
              setPlantaInteira(!panorama)
            }}
          >
            {panorama ? 'Explorar postos' : 'Ver planta inteira'}
          </button>
        )}
      </div>
      {equipe.length > 0 && (
        <div className="i-salas" role="group" aria-label="Foco por sala" ref={filtros}>
          <button type="button" className="i-alvo" aria-pressed={!sala} onClick={() => trocarSala()}>
            Todas as salas
          </button>
          {salasDaEquipe.map(destino => (
            <button
              key={destino}
              type="button"
              className="i-alvo"
              aria-pressed={sala === destino}
              onClick={() => trocarSala(destino)}
            >
              {salas[destino]}
            </button>
          ))}
        </div>
      )}
      {(pessoa || sala) && (
        <div className="i-ficha">
          {pessoa ? (
            <>
              <div>
                <h3 ref={ficha} tabIndex={-1}>
                  {pessoa.nome}
                </h3>
                <p>
                  {salas[pessoa.sala]} · {pessoa.estadoHoje.valor ? estados[pessoa.estadoHoje.valor] : 'Ainda sem dado'}
                </p>
                {fichaDosImoveis && balao && (
                  <div>
                    <p className="i-rotulo">Aluguel líquido estimado</p>
                    <Medida campo={balao} className="i-secundario" />
                  </div>
                )}
              </div>
              <button
                type="button"
                className="i-alvo"
                aria-label="Fechar ficha"
                onClick={() => {
                  trocarSala(sala)
                  filtros.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus()
                }}
              >
                <Icone nome="fechar" />
              </button>
            </>
          ) : (
            sala && (
              <>
                <h3>{salas[sala]}</h3>
                <ul aria-label="Pessoas na sala">
                  {equipe
                    .filter(item => item.sala === sala)
                    .map(item => (
                      <li key={item.id}>
                        <button type="button" className="i-alvo i-link" onClick={() => selecionar(item)}>
                          {item.nome}
                        </button>
                      </li>
                    ))}
                </ul>
              </>
            )
          )}
        </div>
      )}
      <div className="i-palco">
        <EscritorioMaquete
          funcionarios={funcionarios}
          papel={papel}
          oculto={oculto}
          variante={celular ? 'media' : 'grande'}
          mostrarPlaquinhas
          salaDestacada={sala}
          valores={balao && !fichaDosImoveis ? { imoveis: balao } : undefined}
          onSelecionar={panorama ? undefined : selecionar}
        />
      </div>
      {equipe.length === 0 && <p className="i-escritorio-nota">Ainda sem dado</p>}
      {celular && equipe.length > 0 && !panorama && <p className="i-escritorio-nota">Deslize para ver mais postos.</p>}
    </section>
  )
}
