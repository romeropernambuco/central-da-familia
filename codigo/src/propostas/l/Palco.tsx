import { BellRing, Check, Clock, DoorOpen, Keyboard, MoveHorizontal, UserRound, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Escritorio3D } from '../comuns/Escritorio3D'
import type { DadosInicio } from '../dadosExemplo'

export type Pessoa = NonNullable<DadosInicio['funcionarios']['valor']>[number]
type Sala = NonNullable<ComponentProps<typeof Escritorio3D>['salaDestacada']>

const salas: Record<Sala, string> = {
  caixa: 'Caixa', casa: 'Casa', cartoes: 'Cartões', patrimonio: 'Patrimônio',
  gestao: 'Gestão', recepcao: 'Recepção', apoio: 'Apoio',
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
  return <span className="l-estado" data-estado={estado}><Icone size={14} aria-hidden="true" />{rotulo}</span>
}

export function Folha({ titulo, fechar, children }: { titulo: string; fechar: () => void; children: ReactNode }) {
  const id = useId()
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialogo = ref.current
    const origem = document.activeElement
    dialogo?.showModal()
    return () => {
      dialogo?.close()
      if (origem instanceof HTMLElement && origem.isConnected) origem.focus({ preventScroll: true })
    }
  }, [])
  return <dialog className="l-folha" ref={ref} aria-labelledby={id}
    onCancel={evento => { evento.preventDefault(); fechar() }}>
    <div className="l-puxador" aria-hidden="true" />
    <header>
      <h2 id={id}>{titulo}</h2>
      <button type="button" className="l-fechar" aria-label="Fechar ficha" onClick={fechar}><X size={20} aria-hidden="true" /></button>
    </header>
    {children}
  </dialog>
}

export function Palco({ id, funcionarios, papel, celular, oculto, selecionar }: {
  id: string; funcionarios: DadosInicio['funcionarios']; papel: DadosInicio['pessoa']['papel']['valor'];
  celular: boolean; oculto: boolean; selecionar: (pessoa: Pessoa) => void
}) {
  const [sala, setSala] = useState<Sala>()
  const pessoas = (funcionarios.valor ?? []).filter(pessoa => !sala || pessoa.sala === sala)
  const altura = celular ? undefined : 456
  return <section className="l-bloco l-escritorio" aria-labelledby={id}>
    <header className="l-secao-topo">
      <span className="l-icone"><DoorOpen size={22} aria-hidden="true" /></span>
      <div><h2 id={id} tabIndex={-1}>Escritório da família</h2><p className="l-legenda">Escolha uma sala ou toque em um posto para abrir a ficha.</p></div>
    </header>

    <div className="l-salas" role="group" aria-label="Foco por sala">
      <button type="button" aria-pressed={!sala} onClick={() => setSala(undefined)}>Todas as salas</button>
      {(Object.entries(salas) as [Sala, string][]).map(([chave, nome]) =>
        <button key={chave} type="button" aria-pressed={sala === chave} onClick={() => setSala(chave)}>{nome}</button>)}
    </div>
    <div className="l-palco" style={{ minBlockSize: altura }}>
      <Escritorio3D {...{ funcionarios, papel, oculto, altura }} salaDestacada={sala}
        variante="grande" mostrarPlaquinhas onSelecionar={selecionar} />
      <span className="l-panorama"><MoveHorizontal size={15} aria-hidden="true" />Deslize para explorar</span>
    </div>
    <div className="l-equipe">
      <h3>{sala ? `Equipe · ${salas[sala]}` : 'Equipe em cena'}</h3>
      {pessoas.length ? <ul className="l-pessoas">
        {pessoas.map(pessoa => <li key={pessoa.id}>
          <button type="button" onClick={() => selecionar(pessoa)}>
            <span className="l-avatar"><UserRound size={16} aria-hidden="true" /></span>
            <span><strong>{pessoa.curto}</strong><Estado pessoa={pessoa} /></span>
            <span className="l-sr">, {pessoa.nome}, {salas[pessoa.sala]}. Abrir ficha.</span>
          </button>
        </li>)}
      </ul> : <p className="l-legenda">{funcionarios.estado === 'indisponivel' ? 'Ainda sem dado' : 'Nenhum posto cadastrado nesta vista.'}</p>}
    </div>
  </section>
}

export function FichaPessoa({ pessoa, fechar }: { pessoa: Pessoa; fechar: () => void }) {
  return <Folha titulo={pessoa.nome} fechar={fechar}>
    <p className="l-legenda">{salas[pessoa.sala]}</p>
    <div className="l-ficha-estado">
      <span className="l-avatar"><UserRound size={16} aria-hidden="true" /></span>
      <div><strong>Estado de hoje</strong><Estado pessoa={pessoa} /></div>
    </div>
  </Folha>
}
