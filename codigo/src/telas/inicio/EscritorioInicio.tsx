import { useMemo, useRef, useState } from 'react'
import { Hand } from 'lucide-react'
import { ir } from '../../app/rotas'
import { useApp } from '../../app/contexto'
import { useInvalidacao } from '../../app/invalidacao'
import { useEscritorio } from '../../app/useDados2'
import { useModoFuncionario } from '../../componentes/AgenteDaAba'
import { Icone } from '../../componentes/Icone'
import { FuncIco, PerguntaCard } from '../../componentes/Pergunta'
import { Sheet } from '../../componentes/base'
import { totalPendencias } from '../../lib/resumo/pendencias'
import { chaveSimples } from '../../api/normaliza2'
import { Escritorio3D } from '../../propostas/comuns/Escritorio3D'
import { destinoDoPosto, resumoDaEquipe } from '../../propostas/comuns/modeloPosto'
import { VisorEscritorio } from '../../propostas/comuns/VisorEscritorio'
import { prioridades } from '../../propostas/j/modelo'
import { useEquipeCompleta } from '../escritorio/useEquipe'
import { dadosIsometricos } from '../escritorio/dadosIsometricos'
import { APELIDO_BANCO, type SalaEquipe } from '../escritorio/equipe'
import type { PerguntaEsc } from '../../api/tipos'

const estados = {
  trabalhando: 'Trabalhando', entregue: 'Entregue', precisa_de_voce: 'Precisa de você', vai_comecar: 'Ainda vai começar',
}
const nivel = (p: PerguntaEsc, hoje: string) => p.id.startsWith('lembrete:') ? 'lembrete'
  : /^(fatura|dae):/.test(p.id) && p.vence_em && p.vence_em <= hoje ? 'dinheiro em risco' : 'operacao'

export function EscritorioInicio({ celular, hoje }: { celular: boolean; hoje: string }) {
  const modo = useModoFuncionario()
  return modo === 'desligado' ? null : <EscritorioAutorizado celular={celular} hoje={hoje} comCena={modo === 'completo'} />
}

function EscritorioAutorizado({ celular, hoje, comCena }: { celular: boolean; hoje: string; comCena: boolean }) {
  const { api, familia, sessao, oculto } = useApp()
  const papel = familia!.papel
  const dono = !!sessao?.dono
  const casal = papel === 'casal'
  const invalidacao = useInvalidacao(api, familia!.id)
  const { e, perguntas, responder, estado, atualizar } = useEscritorio()
  const equipe = useEquipeCompleta(e?.funcionarios, casal && !!e, invalidacao)
  const dados = useMemo(() => dadosIsometricos(
    e ? { ...e, funcionarios: equipe, precisa_de_voce: perguntas } : null, { papel, dono, oculto },
  ), [e, equipe, perguntas, papel, dono, oculto])
  const funcionarios = {
    estado: 'pronto', unidade: 'indicador', natureza: 'cadastrado',
    valor: dados.postos.map(({ membro, funcionario }) => ({
      id: membro.id, nome: membro.nome, curto: membro.curto, sala: membro.sala,
      estadoHoje: funcionario.semDado
        ? { estado: 'indisponivel' as const, valor: null, unidade: 'texto' as const, natureza: 'realizado' as const }
        : { estado: 'pronto' as const, valor: funcionario.estado, unidade: 'texto' as const, natureza: 'realizado' as const },
    })),
  } as const satisfies Parameters<typeof Escritorio3D>[0]['funcionarios']
  const [sala, setSala] = useState<SalaEquipe>()
  const [selecao, selecionar] = useState<{ id: string; pergunta?: string }>()
  const [filaAberta, abrirFila] = useState(false)
  const folha = useRef<HTMLElement>(null)
  const [pagina, setPagina] = useState(0)
  const fila = [...dados.fila].sort((a, b) => prioridades[nivel(a.pergunta, hoje)].ordem - prioridades[nivel(b.pergunta, hoje)].ordem)
  const porPagina = celular ? 1 : 2
  const ultimaPagina = Math.max(0, Math.ceil(fila.length / porPagina) - 1)
  const atual = Math.min(pagina, ultimaPagina)
  const total = oculto || !e ? null : casal ? totalPendencias(e) : dados.total
  const posto = dados.postos.find(({ membro }) => membro.id === selecao?.id)
  const tarefa = posto && (selecao?.pergunta
    ? fila.find(t => t.pergunta.id === selecao.pergunta)
    : fila.find(t => t.membro.id === posto.membro.id))
  const destino = posto && destinoDoPosto(posto.membro.id, papel, dono)
  const verHistorico = casal && posto && (posto.membro.id !== 'analista' || dono)
  const ultimaResposta = posto?.funcionario.ultimas_respostas?.find(r => !r.adiado_ate)?.resposta
  const entrega = posto && !posto.funcionario.semDado && casal && (posto.membro.id !== 'analista' || dono)
    ? e?.entregue.find(x => (APELIDO_BANCO[x.funcionario] || x.funcionario) === posto.membro.id ||
      chaveSimples(x.funcionario) === chaveSimples(posto.membro.nome))?.resumo
    : undefined
  const resultado = entrega || ultimaResposta
  const fechar = () => selecionar(undefined)
  const abrirPosto = (id: string, pergunta?: string) => selecionar({ id, pergunta })
  const ficha = posto && <Sheet key={posto.membro.id} titulo={posto.membro.nome} rotulo={`Ficha: ${posto.membro.nome}`} lado fechar={fechar}>
    <div className="inicio-posto" data-ficha={posto.membro.id}>
      <dl>
        <dt>Função</dt><dd>{posto.membro.papel}</dd>
        <dt>Agora</dt><dd>{posto.funcionario.semDado ? 'Ainda sem dado' : estados[posto.funcionario.estado]}</dd>
        {posto.funcionario.estado === 'trabalhando' && <dd>{oculto ? 'Atividade com detalhes ocultos' : posto.funcionario.frase}</dd>}
        <dt>Último resultado</dt><dd>{resultado ? oculto ? 'Resultado oculto' : resultado : 'Ainda sem dado'}</dd>
      </dl>
      <div className="j-acoes">
        {destino && <button type="button" aria-label={`Abrir ${destino.rotulo}`} onClick={() => { fechar(); ir(destino.rota, destino.hash.split('?')[1]) }}>Abrir {destino.rotulo} <Icone nome="abrir" size={16} /></button>}
        {verHistorico && <button type="button" onClick={() => ir('escritorio', new URLSearchParams({ f: posto.membro.id, secao: 'historico' }).toString())}>Ver histórico <Icone nome="abrir" size={16} /></button>}
      </div>
      {tarefa && <PerguntaCard key={tarefa.pergunta.id} p={oculto
        ? { ...tarefa.pergunta, pergunta: 'Tarefa com detalhes ocultos', contexto: '', trechosPrivados: tarefa.pergunta.trechosPrivados ?? [] }
        : tarefa.pergunta} quem={posto.membro.nome} responder={responder} semQuem />}
    </div>
  </Sheet>

  return <div className="j-cena-corpo">
    <div className="j-palco">
      <div className="j-palco-topo">
        <h2>Escritório da família</h2>
        <div className="j-saude">
          {!oculto && <p>{resumoDaEquipe(funcionarios)}</p>}
          <button type="button" onClick={() => {
            abrirFila(true)
            folha.current?.focus({ preventScroll: true })
            folha.current?.scrollIntoView({ block: 'nearest' })
          }}>Ver decisões <Icone nome="abrir" size={16} /></button>
        </div>
      </div>
      {comCena ? <VisorEscritorio sala={sala} aoMudarSala={setSala} celular={celular} folha={ficha}
        tarefaDaFila={selecao?.pergunta}>
        {navegacao => <Escritorio3D completo variante="grande" forcarSvg={typeof location !== 'undefined' && (new URLSearchParams(location.search).has('sem3d') || /[?&]sem3d(?:[=&]|$)/.test(location.hash))}
          {...{ funcionarios, papel, oculto, celular, navegacao }} salaDestacada={sala}
          postoSelecionado={posto?.membro.id ?? null} onSelecionar={f => abrirPosto(f.id)} />}
      </VisorEscritorio> : <><ul className="inicio-postos-texto">
        {dados.postos.map(({ membro }) => <li key={membro.id}><button type="button" onClick={() => abrirPosto(membro.id)}>{membro.nome}</button></li>)}
      </ul>{ficha}</>}
    </div>
    <aside className="j-folha" aria-label="Precisa de você" ref={folha} tabIndex={-1}>
      {celular ? <button type="button" className="j-folha-gatilho" aria-expanded={filaAberta} aria-controls="j-fila-hoje" onClick={() => abrirFila(!filaAberta)}>
        <Icone desenho={Hand} size={18} />Precisa de você{total !== null && <span className="j-contagem">{total}</span>}<Icone nome="abrir" size={16} />
      </button> : <h2 className="j-fila-titulo"><Icone desenho={Hand} size={18} />Precisa de você{total !== null && <span className="j-contagem">{total}</span>}</h2>}
      <div className="j-fila-corpo" id="j-fila-hoje" hidden={celular && !filaAberta}>
        {estado === 'erro' ? <p role="alert">Não foi possível conferir a fila. <button type="button" onClick={atualizar}>Tentar de novo</button></p>
          : !e ? <p className="j-fila-vazia" role="status">{estado === 'buscando' ? 'Conferindo…' : 'Ainda sem dado'}</p>
          : fila.length ? <ul className="j-decisoes">
            {fila.slice(atual * porPagina, (atual + 1) * porPagina).map(t => {
              const prioridade = prioridades[nivel(t.pergunta, hoje)]
              return <li key={t.pergunta.id}>
                <button className="j-remetente j-remetente-posto" type="button" onClick={() => {
                  setSala(t.membro.sala)
                  abrirPosto(t.membro.id, t.pergunta.id)
                }}><FuncIco id={t.membro.id} size={32} /><strong>{t.membro.nome}</strong></button>
                <span className="j-nivel" data-risco={!oculto && prioridade.ordem === 0 || undefined}>{oculto ? 'Tarefa' : prioridade.texto}</span>
                <p className="j-pergunta">{t.texto}</p>
                <strong>{t.valor}</strong>
                <div className="j-acoes"><button type="button" onClick={() => abrirPosto(t.membro.id, t.pergunta.id)}>Abrir tarefa <Icone nome="abrir" size={16} /></button></div>
              </li>
            })}
          </ul> : <p className="j-fila-vazia">{total ? 'Veja as tarefas no Escritório.' : 'Nenhuma tarefa pendente.'}</p>}
        {ultimaPagina > 0 && <div className="j-paginacao">
          <button type="button" disabled={atual === 0} onClick={() => setPagina(atual - 1)}>Anterior</button>
          <button type="button" disabled={atual === ultimaPagina} onClick={() => setPagina(atual + 1)}>Próxima</button>
        </div>}
        {casal && <a className="lnk" href="#/escritorio">Ver fila e relatório <Icone nome="abrir" size={16} /></a>}
      </div>
    </aside>
  </div>
}
