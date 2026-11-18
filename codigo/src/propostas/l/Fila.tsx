import { ArrowUpRight, Bell, Check, Clock, ClipboardList, ShieldAlert, Undo2, UserRound } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useValoresOcultos } from '../comuns/privacidade'
import type { DadosInicio } from '../dadosExemplo'
import { Medida, type reservarMedidas } from './Financeiro'
import type { Pessoa } from './Palco'

type Pasta = 'agora' | 'depois' | 'feitas'
const pastas = { agora: 'Agora', depois: 'Depois', feitas: 'Feitas' } as const
const niveis = {
  'dinheiro em risco': { rotulo: 'Dinheiro em risco', ordem: 0, Icone: ShieldAlert, acao: 'Confira esta decisão primeiro.' },
  operacao: { rotulo: 'Operação', ordem: 1, Icone: ClipboardList, acao: 'Confira o registro antes de concluir.' },
  lembrete: { rotulo: 'Lembrete', ordem: 2, Icone: Bell, acao: 'Você pode retomar este lembrete depois.' },
  semDado: { rotulo: 'Prioridade · Ainda sem dado', ordem: 3, Icone: ClipboardList, acao: 'Confira os detalhes da decisão.' },
}

const operacoesDaCasa = new Map([
  ['feira_feita', 'Confirmar a feira da semana'],
  ['feira_nota', 'Guardar a nota da feira'],
  ['estoque', 'Conferir o estoque'],
  ['prestador_veio', 'Confirmar a visita do prestador'],
  ['gas', 'Conferir a troca do gás'],
])

const normalizar = (nome: string) => nome.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()

export function organizarFila(dados: DadosInicio, familiar: boolean) {
  const alertas = new Map(dados.alertas.valor?.map(alerta => [alerta.id, alerta.nivel]))
  const equipe = dados.funcionarios.valor ?? []
  return (dados.pendencias.fila.valor ?? []).flatMap(tarefa => {
    const casa = operacoesDaCasa.get(tarefa.id.split(':', 1)[0])
    if (!familiar && !casa) return []
    const nivel: keyof typeof niveis = familiar ? alertas.get(tarefa.id) ?? 'semDado' : 'operacao'
    const pessoa = familiar ? equipe.find(f => f.id === tarefa.funcionario ||
      normalizar(f.nome) === normalizar(tarefa.funcionario) || normalizar(f.curto) === normalizar(tarefa.funcionario)) : undefined
    return [{ tarefa, nivel, pessoa, casa }]
  }).sort((a, b) => niveis[a.nivel].ordem - niveis[b.nivel].ordem)
}

export function Fila({ id, itens, medidas, estado, familiar, selecionar, pasta, setPasta, movidas, setMovidas }: {
  id: string; itens: ReturnType<typeof organizarFila>; medidas: ReturnType<typeof reservarMedidas>;
  estado: DadosInicio['pendencias']['fila']['estado']; familiar: boolean; selecionar: (pessoa: Pessoa) => void;
  pasta: Pasta; setPasta: (pasta: Pasta) => void; movidas: Partial<Record<string, Pasta>>;
  setMovidas: (movidas: Partial<Record<string, Pasta>>) => void;
}) {
  const oculto = useValoresOcultos()
  const prefixo = useId()
  const titulo = useRef<HTMLHeadingElement>(null)
  const [aberta, setAberta] = useState<string>()
  const [ultima, setUltima] = useState<{ id: string; origem: Pasta; mensagem: string }>()
  const atuais = itens.map((item, indice) => ({ ...item, indice })).filter(({ tarefa }) => (movidas[tarefa.id] ?? 'agora') === pasta)

  function mover(idTarefa: string, destino: Pasta) {
    const mensagem = { agora: 'Decisão retomada.', depois: 'Decisão adiada.', feitas: 'Decisão marcada como feita.' }
    setUltima({ id: idTarefa, origem: pasta, mensagem: mensagem[destino] })
    setMovidas({ ...movidas, [idTarefa]: destino })
    setAberta(undefined)
    titulo.current?.focus()
  }

  return <section className="l-bloco l-fila" aria-labelledby={id}>
    <header className="l-secao-topo">
      <h2 id={id} ref={titulo} tabIndex={-1}>Precisa de você</h2>
      <p className="l-legenda">Decisões da equipe</p>
    </header>
    <div className="l-fila-corpo">
      <div className="l-pastas" role="group" aria-label="Pastas de decisões">
        {(Object.keys(pastas) as Pasta[]).map(nome => <button key={nome} type="button" aria-pressed={nome === pasta}
          onClick={() => { setPasta(nome); setAberta(undefined) }}>{pastas[nome]}</button>)}
      </div>
      {ultima && <div className="l-desfazer">
        <span role="status">{ultima.mensagem}</span>
        <button type="button" onClick={() => {
          setMovidas({ ...movidas, [ultima.id]: ultima.origem })
          setPasta(ultima.origem)
          setUltima(undefined)
          titulo.current?.focus()
        }}><Undo2 size={16} aria-hidden="true" />Desfazer</button>
      </div>}
      {atuais.length ? <ul className="l-decisoes">{atuais.map(({ tarefa, pessoa, nivel, casa, indice }) => {
        const { Icone, rotulo, acao } = niveis[nivel]
        const assunto = !familiar || oculto ? casa ?? 'Decisão com detalhes ocultos'
          : tarefa.perguntaCurta.replace(/R\$\s*-?\s*\d[\d.,]*/gu, 'valor informado').trim() || 'Ainda sem dado'
        const detalhe = `${prefixo}-${indice}`
        const expandida = aberta === tarefa.id
        return <li key={tarefa.id} className="l-decisao">
          <div className="l-decisao-assunto">
            <span className="l-avatar"><UserRound size={16} aria-hidden="true" /></span>
            <div>
              <span className="l-legenda">{pessoa?.nome ?? (familiar ? 'Remetente · Ainda sem dado' : 'Rotina da casa')}</span>
              <h3>{assunto}</h3>
              <span className="l-nivel" data-risco={nivel === 'dinheiro em risco' || undefined}><Icone size={14} aria-hidden="true" />{rotulo}</span>
            </div>
          </div>
          {familiar && <div className="l-decisao-valor"><Medida medida={medidas[indice]} /></div>}
          <div className="l-acoes" role="group" aria-label={`Ações da decisão ${indice + 1}`}>
            {pasta !== 'feitas' && <button type="button" onClick={() => mover(tarefa.id, 'feitas')}><Check size={16} aria-hidden="true" />Já fiz</button>}
            {pasta === 'agora'
              ? <button type="button" onClick={() => mover(tarefa.id, 'depois')}><Clock size={16} aria-hidden="true" />Depois</button>
              : <button type="button" onClick={() => mover(tarefa.id, 'agora')}><Undo2 size={16} aria-hidden="true" />Retomar</button>}
            <button className="l-acao-abrir" type="button" aria-controls={detalhe} aria-expanded={expandida}
              onClick={() => setAberta(expandida ? undefined : tarefa.id)}>{expandida ? 'Recolher' : 'Abrir'}<ArrowUpRight size={16} aria-hidden="true" /></button>
          </div>
          <div className="l-decisao-detalhe" id={detalhe} hidden={!expandida}>
            {expandida && <>
              <p>{acao}</p>
              {pessoa && <button type="button" onClick={() => selecionar(pessoa)}>Ver ficha de {pessoa.nome}<ArrowUpRight size={16} aria-hidden="true" /></button>}
            </>}
          </div>
        </li>
      })}</ul> : <p className="l-fila-vazia">{estado === 'indisponivel' ? 'Ainda sem dado' : {
        agora: 'Nenhuma decisão por agora.', depois: 'Nenhuma decisão adiada.', feitas: 'Nenhuma decisão concluída.',
      }[pasta]}</p>}
    </div>
  </section>
}
