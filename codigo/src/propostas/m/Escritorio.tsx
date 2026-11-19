import { ArrowUpRight, BriefcaseBusiness, ChevronLeft, ChevronRight, Grid2X2, MoveHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Escritorio3D } from '../comuns/Escritorio3D'
import type { DadosInicio } from '../dadosExemplo'

const salas = {
  caixa: 'Caixa', casa: 'Casa', cartoes: 'Cartões', patrimonio: 'Patrimônio',
  recepcao: 'Recepção', gestao: 'Gestão', apoio: 'Apoio',
}
const estados = {
  vai_comecar: 'Ainda vai começar',
  trabalhando: 'Trabalhando',
  entregue: 'Entregue',
  precisa_de_voce: 'Precisa de você',
}
type Pessoa = NonNullable<DadosInicio['funcionarios']['valor']>[number]
type Sala = Pessoa['sala']

export function Escritorio({ dados, titulo, celular, oculto }: {
  dados: DadosInicio
  titulo: string
  celular: boolean
  oculto: boolean
}) {
  const [sala, setSala] = useState<Sala>()
  const [panorama, setPanorama] = useState(false)
  const [selecionada, selecionar] = useState<string>()
  const ficha = useRef<HTMLHeadingElement>(null)
  const dialogo = useRef<HTMLDialogElement>(null)
  const cabecalho = useRef<HTMLHeadingElement>(null)
  const pessoas = dados.funcionarios.valor ?? []
  const pessoa = pessoas.find(item => item.id === selecionada)
  const emAtividade = pessoas.filter(item => item.estadoHoje.valor === 'trabalhando')
  const salasVisiveis = (Object.keys(salas) as Sala[]).filter(item => pessoas.some(f => f.sala === item))
  const salaMovel = sala && salasVisiveis.includes(sala) ? sala : salasVisiveis[0]
  const indice = salasVisiveis.indexOf(salaMovel)
  const salaVisivel = celular ? salaMovel : sala
  const geral = celular && panorama
  const altura = celular ? undefined : 440

  useEffect(() => {
    if (!pessoa) return
    const folha = dialogo.current
    const origem = folha?.ownerDocument.activeElement
    if (folha && !folha.open) folha.showModal()
    ficha.current?.focus({ preventScroll: celular })
    return () => {
      folha?.close()
      if (origem instanceof HTMLElement && origem.isConnected) origem.focus({ preventScroll: true })
    }
  }, [pessoa, celular])

  function mudarSala(direcao: number) {
    setPanorama(false)
    setSala(salasVisiveis[(indice + direcao + salasVisiveis.length) % salasVisiveis.length])
  }

  function fecharFicha() {
    selecionar(undefined)
    if (!celular) cabecalho.current?.focus()
  }

  const conteudoFicha = pessoa && <>
    <div>
      <h3 id={celular ? titulo + '-ficha' : undefined} tabIndex={-1} ref={ficha}>{pessoa.nome}</h3>
      <p>{salas[pessoa.sala]} · {pessoa.estadoHoje.valor ? estados[pessoa.estadoHoje.valor] : 'Ainda sem dado'}</p>
    </div>
    <button className="m-alvo" type="button" aria-label="Fechar ficha" onClick={fecharFicha}>
      <X aria-hidden="true" size={20} />
    </button>
  </>

  return <section className="m-cartao m-escritorio" aria-labelledby={titulo}>
    <header className="m-secao-topo">
      <div>
        <p className="m-contexto">Equipe da família</p>
        <h2 id={titulo} ref={cabecalho} tabIndex={-1}>Escritório</h2>
      </div>
      {!celular && pessoas.length > 0 && <label className="m-salas">
        <span className="m-so-leitor">Sala do escritório</span>
        <select className="m-alvo" value={sala ?? ''} onChange={evento => {
          setSala((evento.currentTarget.value || undefined) as Sala | undefined)
          selecionar(undefined)
        }}>
          <option value="">Todas as salas</option>
          {salasVisiveis.map(item => <option key={item} value={item}>{salas[item]}</option>)}
        </select>
      </label>}
    </header>
    {pessoas.length > 0 ? <>
      {celular && <div className="m-controles-sala" role="group" aria-label="Salas do escritório">
        <button className="m-alvo" type="button" aria-label="Sala anterior" onClick={() => mudarSala(-1)}>
          <ChevronLeft aria-hidden="true" size={20} />
        </button>
        <span aria-live="polite">{geral ? 'Todas as salas' : salas[salaMovel]}</span>
        <button className="m-alvo" type="button" aria-label="Próxima sala" onClick={() => mudarSala(1)}>
          <ChevronRight aria-hidden="true" size={20} />
        </button>
        <button className="m-alvo m-ver-todos" type="button" aria-pressed={geral} onClick={() => setPanorama(!geral)}>
          <Grid2X2 aria-hidden="true" size={16} />Ver todos
        </button>
      </div>}
      {geral && <p className="m-legenda m-dica-cena"><MoveHorizontal aria-hidden="true" size={18} />Deslize para explorar o escritório.</p>}
      <div className="m-palco">
        <Escritorio3D funcionarios={dados.funcionarios} papel={dados.pessoa.papel.valor}
          altura={altura} variante="grande" panorama={geral} salaDestacada={salaVisivel}
          mostrarPlaquinhas oculto={oculto}
          onSelecionar={item => selecionar(item.id)} />
      </div>
      {pessoa && (celular
        ? <dialog className="m-ficha m-folha" ref={dialogo} aria-labelledby={titulo + '-ficha'}
          onCancel={evento => { evento.preventDefault(); fecharFicha() }}><div>{conteudoFicha}</div></dialog>
        : <div className="m-ficha">{conteudoFicha}</div>)}
      <div className="m-escritorio-rodape">
        <p><BriefcaseBusiness aria-hidden="true" size={16} />
          {emAtividade.length ? <span><strong>Trabalhando agora</strong> · {emAtividade.map(item => item.curto).join(', ')}</span>
            : pessoas.some(item => item.estadoHoje.estado === 'pronto') ? 'Sem atividade registrada agora' : 'Ainda sem dado sobre a atividade'}</p>
        <details>
          <summary className="m-alvo">Ver equipe</summary>
          <ul className="m-equipe">
            {pessoas.map(item => <li key={item.id}>
              <button className="m-alvo" type="button" onClick={() => selecionar(item.id)}>
                {item.nome}<ArrowUpRight aria-hidden="true" size={16} />
              </button>
            </li>)}
          </ul>
        </details>
      </div>
    </> : <p className="m-ausente">Ainda sem dado sobre a equipe.</p>}
  </section>
}
