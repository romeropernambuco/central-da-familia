import { ArrowUpRight, BriefcaseBusiness, X } from 'lucide-react'
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
  const [selecionada, selecionar] = useState<string>()
  const ficha = useRef<HTMLHeadingElement>(null)
  const cabecalho = useRef<HTMLHeadingElement>(null)
  const pessoas = dados.funcionarios.valor ?? []
  const pessoa = pessoas.find(item => item.id === selecionada)
  const emAtividade = pessoas.filter(item => item.estadoHoje.valor === 'trabalhando')
  const altura = celular ? 448 : 500
  useEffect(() => {
    if (pessoa) ficha.current?.focus()
  }, [pessoa])

  return <section className="m-cartao m-escritorio" aria-labelledby={titulo}>
    <header className="m-secao-topo">
      <div>
        <p className="m-contexto">Equipe da família</p>
        <h2 id={titulo} ref={cabecalho} tabIndex={-1}>Escritório</h2>
      </div>
      {pessoas.length > 0 && <label className="m-salas">
        <span className="m-so-leitor">Sala do escritório</span>
        <select className="m-alvo" value={sala ?? ''} onChange={evento => {
          setSala((evento.currentTarget.value || undefined) as Sala | undefined)
          selecionar(undefined)
        }}>
          <option value="">Todas as salas</option>
          {(Object.keys(salas) as Sala[]).filter(item => pessoas.some(f => f.sala === item))
            .map(item => <option key={item} value={item}>{salas[item]}</option>)}
        </select>
      </label>}
    </header>
    {pessoas.length > 0 ? <>
      <div className="m-palco">
        <Escritorio3D funcionarios={dados.funcionarios} papel={dados.pessoa.papel.valor}
          altura={altura} variante="grande" salaDestacada={sala} mostrarPlaquinhas oculto={oculto}
          onSelecionar={item => selecionar(item.id)} />
      </div>
      {pessoa && <div className="m-ficha">
        <div>
          <h3 tabIndex={-1} ref={ficha}>{pessoa.nome}</h3>
          <p>{salas[pessoa.sala]} · {pessoa.estadoHoje.valor ? estados[pessoa.estadoHoje.valor] : 'Ainda sem dado'}</p>
        </div>
        <button className="m-alvo" type="button" aria-label="Fechar ficha" onClick={() => {
          selecionar(undefined)
          cabecalho.current?.focus()
        }}><X aria-hidden="true" size={20} /></button>
      </div>}
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
