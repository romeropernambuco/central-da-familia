import { ArrowUpRight, Bell, Check, Clock, TriangleAlert, UserRound, Wrench } from 'lucide-react'
import { useRef, useState } from 'react'
import { TudoEmDia } from '../../componentes/ilustracoes'
import type { DadosInicio } from '../dadosExemplo'
import { Medida } from './Financeiro'

const niveis = {
  'dinheiro em risco': { nome: 'Dinheiro em risco', Icone: TriangleAlert, ordem: 0 },
  operacao: { nome: 'Operação', Icone: Wrench, ordem: 1 },
  lembrete: { nome: 'Lembrete', Icone: Bell, ordem: 2 },
} as const

export function organizarFila(dados: DadosInicio) {
  const alertas = new Map(dados.alertas.valor?.map(item => [item.id, item.nivel]))
  return (dados.pendencias.fila.valor ?? [])
    .map(tarefa => ({ ...tarefa, nivel: alertas.get(tarefa.id) ?? 'operacao' as const }))
    .sort((a, b) => niveis[a.nivel].ordem - niveis[b.nivel].ordem)
}

type Tarefa = ReturnType<typeof organizarFila>[number]
export type Resposta = 'feita' | 'adiada'

export function Fila({ dados, tarefas, titulo, oculto, respostas, completa, responder }: {
  dados: DadosInicio
  tarefas: Tarefa[]
  titulo: string
  oculto: boolean
  respostas: Partial<Record<string, Resposta>>
  completa: boolean
  responder: (id: string, resposta: Resposta | undefined) => void
}) {
  const [alteracao, setAlteracao] = useState<{ id: string; texto: string; desfazer: boolean }>()
  const [aba, setAba] = useState<'agora' | 'depois'>('agora')
  const [verTudo, setVerTudo] = useState(false)
  const [aberta, abrir] = useState<string>()
  const cabecalho = useRef<HTMLHeadingElement>(null)
  const existemAdiadas = tarefas.some(tarefa => respostas[tarefa.id] === 'adiada')
  const lista = tarefas.filter(tarefa => aba === 'depois' ? respostas[tarefa.id] === 'adiada' : !respostas[tarefa.id])
  const filaIndisponivel = dados.pendencias.fila.estado === 'indisponivel'

  function mover(id: string, resposta: Resposta | undefined, texto: string) {
    responder(id, resposta)
    setAlteracao({ id, texto, desfazer: !!resposta })
    if (aberta === id) abrir(undefined)
    cabecalho.current?.focus()
    if (!resposta) setAba('agora')
  }

  // Se o valor do item já é uma das referências, o total fica na sua área de origem.
  const camposDoPainel = [dados.hojePodeGastar.valor, dados.faturas.total, dados.aplicacoes.total,
    dados.saldoConta, dados.recebimentos.garantido]
  const plano = dados.plano2029.faltamPorMesComMargem

  return <section className="m-cartao m-fila" aria-labelledby={titulo}>
    <header className="m-secao-topo">
      <h2 id={titulo} ref={cabecalho} tabIndex={-1}>Precisa de você</h2>
      {(existemAdiadas || aba === 'depois') && <div className="m-filtros" role="group" aria-label="Estado das tarefas">
        <button type="button" className="m-alvo" aria-pressed={aba === 'agora'} onClick={() => setAba('agora')}>Agora</button>
        <button type="button" className="m-alvo" aria-pressed={aba === 'depois'} onClick={() => setAba('depois')}>Adiadas</button>
      </div>}
    </header>
    {lista.length ? <ul className="m-tarefas">
      {(completa || verTudo ? lista : lista.slice(0, 3)).map(tarefa => {
        const nivel = niveis[tarefa.nivel]
        const pessoa = dados.funcionarios.valor?.find(item => item.id === tarefa.funcionario || item.nome === tarefa.funcionario)
        const expandida = aberta === tarefa.id
        const valor = tarefa.valor.valor
        const repetido = valor !== null && (camposDoPainel.some(campo => campo.valor === valor) ||
          (plano.valor !== null && Math.abs(plano.valor) === Math.round(valor * 100)))
        return <li className="m-tarefa" key={tarefa.id}>
          <span className="m-avatar"><UserRound aria-hidden="true" size={16} /></span>
          <div className="m-conteudo-tarefa">
            <span className="m-nivel" data-nivel={tarefa.nivel}><nivel.Icone aria-hidden="true" size={14} />{nivel.nome}</span>
            <h3>{oculto ? 'Tarefa pendente' : tarefa.perguntaCurta}</h3>
            {pessoa && <p className="m-legenda">{pessoa.nome}</p>}
            <div className="m-acoes">
              {aba === 'agora' ? <>
                <button className="m-alvo" type="button" onClick={() => mover(tarefa.id, 'feita', 'Marcada como feita nesta prévia.')}>
                  <Check aria-hidden="true" size={16} />Já fiz
                </button>
                <button className="m-alvo" type="button" onClick={() => mover(tarefa.id, 'adiada', 'Movida para Adiadas nesta prévia.')}>
                  <Clock aria-hidden="true" size={16} />Depois
                </button>
              </> : <button className="m-alvo" type="button" onClick={() => mover(tarefa.id, undefined, 'Tarefa retomada.')}>Retomar</button>}
              <button className="m-alvo m-abrir" type="button" aria-expanded={expandida}
                onClick={() => abrir(expandida ? undefined : tarefa.id)}>
                <ArrowUpRight aria-hidden="true" size={16} />{expandida ? 'Fechar' : 'Abrir'}
              </button>
            </div>
            {expandida && <div className="m-detalhe">
              {oculto ? <p>Detalhes financeiros ocultos</p> : <>
                <p className="m-legenda">{repetido ? 'Consulte o valor no painel financeiro.' : 'Valor informado na tarefa'}</p>
                {!repetido && <Medida campo={tarefa.valor} />}
              </>}
            </div>}
          </div>
        </li>
      })}
    </ul> : <p className="m-ausente">{filaIndisponivel ? 'Ainda sem dado'
      : aba === 'depois' ? 'Nenhuma tarefa adiada.' : 'Nenhuma decisão aguardando você.'}</p>}
    {completa && !filaIndisponivel && !lista.length && <div className="m-fila-vazia" aria-hidden="true"><TudoEmDia /></div>}
    {!completa && lista.length > 3 && <button className="m-alvo m-ver-fila" type="button" aria-expanded={verTudo}
      onClick={() => setVerTudo(!verTudo)}>{verTudo ? 'Ver menos' : 'Ver fila completa'}</button>}
    {alteracao && <div className="m-retorno">
      <p role="status">{alteracao.texto}</p>
      {alteracao.desfazer && <button className="m-alvo" type="button" onClick={() => mover(alteracao.id, undefined, 'Alteração desfeita.')}>Desfazer</button>}
    </div>}
  </section>
}
