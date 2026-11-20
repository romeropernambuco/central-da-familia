import { useEffect, useId, useRef, useState } from 'react'
import { Icone } from '../../componentes/Icone'
import { EscritorioMaquete, type PropsEscritorioMaquete } from '../../componentes/escritorio/EscritorioMaquete'
import type { DadosInicio } from '../../componentes/escritorio/dadosDeExemplo'
import { destino } from './destino'

type Pessoa = NonNullable<DadosInicio['funcionarios']['valor']>[number]
type Sala = Pessoa['sala']

const salas = {
  caixa: 'Caixa',
  casa: 'Casa',
  cartoes: 'Cartões',
  patrimonio: 'Patrimônio',
  gestao: 'Gestão',
  recepcao: 'Recepção',
  apoio: 'Apoio',
} satisfies Record<Sala, string>

const estados = {
  vai_comecar: 'Ainda vai começar',
  trabalhando: 'Trabalhando',
  entregue: 'Entregue',
  precisa_de_voce: 'Precisa de você',
}

function Ficha({ pessoa, fechar }: { pessoa: Pessoa; fechar: () => void }) {
  const id = useId()
  const folha = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const modal = folha.current
    if (modal && !modal.open) modal.showModal()
  }, [])

  function encerrar() {
    folha.current?.close()
    fechar()
  }

  return (
    <dialog
      className="k-ficha"
      ref={folha}
      aria-labelledby={`${id}-nome`}
      onCancel={evento => {
        evento.preventDefault()
        encerrar()
      }}
      onClick={evento => {
        if (evento.target === evento.currentTarget) encerrar()
      }}
    >
      <div>
        <button type="button" className="k-fechar" aria-label="Fechar ficha" autoFocus onClick={encerrar}>
          <Icone nome="fechar" size={20} />
        </button>
        <p>
          <Icone nome="escritorio" size={16} />
          {salas[pessoa.sala]}
        </p>
        <h3 id={`${id}-nome`}>{pessoa.nome}</h3>
        <dl>
          <dt>Estado de hoje</dt>
          <dd>{pessoa.estadoHoje.estado === 'pronto' ? estados[pessoa.estadoHoje.valor] : 'Ainda sem dado'}</dd>
        </dl>
        <a className="k-botao" href={destino('escritorio') + '?f=' + encodeURIComponent(pessoa.id)}>
          Ver ficha no escritório <Icone nome="abrir" size={16} />
        </a>
      </div>
    </dialog>
  )
}

function baloes(dados: DadosInicio, sala?: Sala): PropsEscritorioMaquete['valores'] {
  if (sala === 'caixa' && dados.saldoConta.estado === 'pronto') return { contador: dados.saldoConta }
  if (sala === 'patrimonio' && dados.imoveis.valorCadastrado.estado === 'pronto')
    return { imoveis: dados.imoveis.valorCadastrado }
}

export function Escritorio({ dados }: { dados: DadosInicio }) {
  const [sala, setSala] = useState<Sala>()
  const [ampliada, setAmpliada] = useState(false)
  const [pessoa, setPessoa] = useState<Pessoa>()
  const origem = useRef<HTMLElement | null>(null)
  const cena = useRef<HTMLDivElement>(null)
  const titulo = useId()
  const equipe = dados.funcionarios.valor
  const estadosConhecidos = equipe?.filter(funcionario => funcionario.estadoHoje.estado === 'pronto')
  const trabalhando = estadosConhecidos?.length
    ? estadosConhecidos.filter(funcionario => funcionario.estadoHoje.valor === 'trabalhando').length
    : null
  const valores = baloes(dados, sala)

  function abrir(funcionario: Pessoa, acionador: HTMLElement | null) {
    origem.current = acionador
    setPessoa(funcionario)
  }

  function fechar() {
    setPessoa(undefined)
    origem.current?.focus({ preventScroll: true })
  }

  function alternarEscala() {
    setAmpliada(!ampliada)
    if (cena.current) cena.current.querySelector('.maquete-rolagem')?.scrollTo({ left: 0 })
  }

  return (
    <>
      <header className="k-secao-cabecalho">
        <Icone nome="escritorio" size={20} />
        <h2 id={titulo}>Escritório</h2>
      </header>
      <div className="k-escritorio-corpo" aria-labelledby={titulo} role="group">
        <div className="k-equipe-cabecalho">
          <div>
            <span className="k-presenca">
              <span aria-hidden="true" />
              Equipe da família
            </span>
            <p>
              {trabalhando == null
                ? 'Ainda sem dado'
                : trabalhando === 1
                  ? '1 pessoa trabalhando'
                  : `${trabalhando} pessoas trabalhando`}
            </p>
          </div>
          <button
            type="button"
            className="k-ampliar"
            aria-label="Ampliar maquete"
            aria-pressed={ampliada}
            onClick={alternarEscala}
          >
            <Icone nome={ampliada ? 'fechar' : 'abrir'} size={16} />
            {ampliada ? 'Reduzir' : 'Ampliar'}
          </button>
        </div>
        <div className="k-salas" aria-label="Filtrar por sala" role="group">
          <button type="button" onClick={() => setSala(undefined)} aria-pressed={!sala}>
            Todas
          </button>
          {(Object.keys(salas) as Sala[]).map(item => (
            <button type="button" key={item} aria-pressed={sala === item} onClick={() => setSala(item)}>
              {salas[item]}
            </button>
          ))}
        </div>
        <div
          className="k-cena"
          ref={cena}
          data-ampliada={ampliada}
          onClick={evento => {
            const id = (evento.target as Element).closest<SVGElement>('[data-sala]')?.dataset.sala
            const selecionada = (Object.keys(salas) as Sala[]).find(item => item === id)
            if (selecionada) setSala(selecionada)
          }}
        >
          <EscritorioMaquete
            funcionarios={dados.funcionarios}
            papel={dados.pessoa.papel.valor}
            variante="grande"
            salaDestacada={sala}
            mostrarPlaquinhas
            valores={valores}
            onSelecionar={funcionario =>
              abrir(funcionario, cena.current?.querySelector<HTMLElement>('.maquete-posto:focus') ?? null)
            }
          />
        </div>
        <p className="k-cena-dica">
          {ampliada ? 'Deslize a maquete para percorrer a planta.' : 'Escolha uma sala para chegar mais perto.'} Abra um
          posto para ver a ficha.
        </p>
        {valores && (
          <p className="k-cena-dica k-balao-legenda">
            {sala === 'caixa' ? 'Balão do Contador · saldo em conta' : 'Balão do posto Imóveis · valor cadastrado'}
          </p>
        )}
        {sala && equipe && (
          <div className="k-postos" role="group" aria-label={`Equipe de ${salas[sala]}`}>
            {equipe
              .filter(funcionario => funcionario.sala === sala)
              .map(funcionario => (
                <button
                  key={funcionario.id}
                  type="button"
                  onClick={evento => abrir(funcionario, evento.currentTarget)}
                  aria-label={`Abrir ficha de ${funcionario.nome}`}
                >
                  <Icone nome="pessoa" size={16} />
                  {funcionario.curto}
                  <Icone nome="abrir" size={14} />
                </button>
              ))}
          </div>
        )}
      </div>
      {pessoa && <Ficha pessoa={pessoa} fechar={fechar} />}
    </>
  )
}
