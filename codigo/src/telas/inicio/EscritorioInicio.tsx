import { PONTOS_LONGOS } from '../../lib/olho'
import { useMemo, useRef, useState } from 'react'
import { Hand } from 'lucide-react'
import { ir } from '../../lib/rotas'
import { useOlhoApp, useSessaoAtual } from '../../app/contexto'
import { useInvalidacao } from '../../app/useInvalidacao'
import { useEscritorio } from '../../app/useDados2'
import { useModoFuncionario } from '../escritorio/AgenteDaAba'
import { Icone } from '../../componentes/Icone'
import { FuncIco, PerguntaCard } from '../../componentes/Pergunta'
import { Sheet } from '../../componentes/base'
import { diasEntre, hojeRecife } from '../../lib/formato'
import { totalPendencias } from '../../lib/resumo/pendencias'
import { EscritorioDesenho } from '../../componentes/escritorio/EscritorioDesenho'
import { FolhaResposta } from '../../componentes/escritorio/FolhaResposta'
import { destinoDoPosto, resumoDaEquipe } from '../../componentes/escritorio/modeloPosto'
import { VisorEscritorio } from '../../componentes/escritorio/VisorEscritorio'
import { prioridades } from '../../componentes/painel-inicio/modelo'
import { useEquipeCompleta } from '../../app/useEquipe'
import '../escritorio/escritorioIsometrico.css'
// @ts-expect-error a cena é a mesma da aba Escritório
import { Cena3D, IcoEstado, ROTULO_ESTADO } from '../escritorio/Cena3D.tsx'
import { dadosIsometricos, type PostoIsometrico } from '../escritorio/dadosIsometricos'
import { falasDoEscritorio } from '../escritorio/falasDoEscritorio'
import { useNovidades } from './useNovidades'
import { HORA_DA_NOITE, horaRecife, noiteForcada } from '../../lib/escritorio/turno'
import type { SalaEquipe } from '../../lib/escritorio/equipe'
import type { PerguntaEsc } from '../../api/tipos'

const nivel = (p: PerguntaEsc, hoje: string) =>
  p.id.startsWith('lembrete:')
    ? 'lembrete'
    : /^(fatura|dae):/.test(p.id) && p.vence_em && p.vence_em <= hoje
      ? 'dinheiro em risco'
      : 'operacao'

export function EscritorioInicio({
  celular,
  hoje,
  comFalas,
}: {
  celular: boolean
  hoje: string
  /** cada funcionário mostra em balão o que tem a dizer (Início novo) */
  comFalas?: boolean
}) {
  const modo = useModoFuncionario()
  return modo === 'desligado' ? null : (
    <EscritorioAutorizado celular={celular} hoje={hoje} comCena={modo === 'completo'} comFalas={comFalas} />
  )
}

function EscritorioAutorizado({
  celular,
  hoje,
  comCena,
  comFalas,
}: {
  celular: boolean
  hoje: string
  comCena: boolean
  comFalas?: boolean
}) {
  const { api, familia, sessao } = useSessaoAtual()
  const { oculto } = useOlhoApp()
  const papel = familia!.papel
  const dono = !!sessao?.dono
  const casal = papel === 'casal'
  const invalidacao = useInvalidacao(api, familia!.id)
  const { e, perguntas, responder, estado, atualizar } = useEscritorio()
  const equipe = useEquipeCompleta(e?.funcionarios, casal && !!e, invalidacao)
  const dados = useMemo(
    () =>
      dadosIsometricos(e ? { ...e, funcionarios: equipe, precisa_de_voce: perguntas } : null, { papel, dono, oculto }),
    [e, equipe, perguntas, papel, dono, oculto],
  )
  const funcionarios = {
    estado: 'pronto',
    unidade: 'indicador',
    natureza: 'cadastrado',
    valor: dados.postos.map(({ membro, funcionario }) => ({
      id: membro.id,
      nome: membro.nome,
      curto: membro.curto,
      sala: membro.sala,
      estadoHoje: funcionario.semDado
        ? { estado: 'indisponivel' as const, valor: null, unidade: 'texto' as const, natureza: 'realizado' as const }
        : {
            estado: 'pronto' as const,
            valor: funcionario.estado,
            unidade: 'texto' as const,
            natureza: 'realizado' as const,
          },
    })),
  } as const satisfies Parameters<typeof EscritorioDesenho>[0]['funcionarios']
  // o valor da primeira pendência de cada um vai no selo dele, na cena
  const valores: Record<string, string> = {}
  for (const t of dados.fila)
    if (t.valor && t.valor !== 'Ainda sem dado' && !valores[t.membro.id]) valores[t.membro.id] = t.valor
  // o que cada um tem a dizer, em ordem: o balão mostra uma fala por vez (tarefa e prazo, o que fez, a hora do dia)
  const falas = falasDoEscritorio(dados, { hoje, hora: noiteForcada() ? HORA_DA_NOITE : horaRecife() }, oculto)
  // quem tem conta vencida fica aflito; com o olho fechado o rosto não entrega o motivo
  const humores: Record<string, 'aflito'> = {}
  if (!oculto)
    for (const t of dados.fila) if (nivel(t.pergunta, hoje) === 'dinheiro em risco') humores[t.membro.id] = 'aflito'
  // o que chegou desde a última visita neste aparelho ganha a marca "Novo" (só no Início novo)
  const novidades = useNovidades(dados, familia!.id, !!comFalas && !!e && estado === 'ok')
  const [sala, setSala] = useState<SalaEquipe>()
  const [selecao, selecionar] = useState<{ id: string; pergunta?: string; resposta?: boolean }>()
  const [filaAberta, abrirFila] = useState(false)
  const folha = useRef<HTMLElement>(null)
  const [pagina, setPagina] = useState(0)
  const fila = [...dados.fila].sort(
    (a, b) => prioridades[nivel(a.pergunta, hoje)].ordem - prioridades[nivel(b.pergunta, hoje)].ordem,
  )
  const porPagina = celular ? 1 : 2
  const ultimaPagina = Math.max(0, Math.ceil(fila.length / porPagina) - 1)
  const atual = Math.min(pagina, ultimaPagina)
  const total = !e ? null : casal ? totalPendencias(e) : dados.total
  const mostrarTotal = !oculto && total !== null
  const posto = dados.postos.find(({ membro }) => membro.id === selecao?.id)
  const tarefa =
    posto && (fila.find(t => t.pergunta.id === selecao?.pergunta) ?? fila.find(t => t.membro.id === posto.membro.id))
  const destino = posto && destinoDoPosto(posto.membro.id, papel, dono)
  const verHistorico = casal && posto && (posto.membro.id !== 'analista' || dono)
  const fechar = () => selecionar(undefined)
  const abrirPosto = (id: string, pergunta?: string) => {
    novidades.ver(id)
    selecionar({ id, pergunta })
  }
  // Início novo: quem tem tarefa abre direto a resposta; quem não tem (e o Início de sempre) abre a ficha
  const abrirResposta = (id: string, pergunta?: string) => {
    novidades.ver(id)
    selecionar({ id, pergunta, resposta: !!comFalas && fila.some(t => t.membro.id === id) })
  }
  const fecharResposta = () => {
    fechar()
    // o botão que abriu pode ter sumido junto com a tarefa: o foco fica na lista "Precisa de você"
    setTimeout(() => {
      if (document.activeElement === document.body) folha.current?.focus({ preventScroll: true })
    })
  }
  const resposta = posto && selecao?.resposta && (
    <FolhaResposta
      key={'resposta:' + posto.membro.id}
      nome={posto.membro.nome}
      tarefas={fila.filter(t => t.membro.id === posto.membro.id).map(t => t.pergunta)}
      inicial={selecao.pergunta}
      emRisco={p => nivel(p, hoje) === 'dinheiro em risco'}
      oculto={oculto}
      responder={responder}
      fechar={fecharResposta}
      verFicha={() => selecionar({ id: posto.membro.id })}
    />
  )
  const ficha = posto && !selecao?.resposta && (
    <Sheet key={posto.membro.id} titulo={posto.membro.nome} rotulo={`Ficha: ${posto.membro.nome}`} lado fechar={fechar}>
      <div className="inicio-posto" data-ficha={posto.membro.id}>
        <FichaDadosPosto
          {...{ posto, hoje, oculto }}
          temLeitura={!!e}
          filaParcial={total !== null && total > perguntas.length}
        />
        <div className="j-acoes">
          {destino && (
            <button
              type="button"
              aria-label={`Abrir ${destino.rotulo}`}
              onClick={() => {
                fechar()
                ir(destino.rota, destino.hash.split('?')[1])
              }}
            >
              Abrir {destino.rotulo} <Icone nome="abrir" size={16} />
            </button>
          )}
          {verHistorico && (
            <button
              type="button"
              onClick={() =>
                ir('escritorio', new URLSearchParams({ f: posto.membro.id, secao: 'historico' }).toString())
              }
            >
              Ver histórico <Icone nome="abrir" size={16} />
            </button>
          )}
        </div>
        {tarefa && (
          <PerguntaCard
            key={tarefa.pergunta.id}
            p={
              oculto
                ? {
                    ...tarefa.pergunta,
                    pergunta: 'Tarefa com detalhes ocultos',
                    contexto: '',
                    trechosPrivados: tarefa.pergunta.trechosPrivados ?? [],
                  }
                : tarefa.pergunta
            }
            quem={posto.membro.nome}
            responder={responder}
            semQuem
          />
        )}
      </div>
    </Sheet>
  )

  return (
    <div className="j-cena-corpo">
      <div className="j-palco">
        <div className="j-palco-topo">
          <h2>Escritório da família</h2>
          <div className="j-saude">
            {!oculto && (
              <p>
                {e && estado === 'ok'
                  ? resumoDaEquipe(funcionarios)
                  : estado === 'buscando'
                    ? 'Conferindo a equipe…'
                    : 'Equipe · Ainda sem dado'}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                abrirFila(true)
                folha.current?.focus({ preventScroll: true })
                folha.current?.scrollIntoView({ block: 'nearest' })
              }}
            >
              Ver decisões <Icone nome="abrir" size={16} />
            </button>
          </div>
        </div>
        {comCena ? (
          <>
            {/* A nossa cena 3D (nome e estado em cada um, anda até a frente e acena). Onde o 3D não abre, fica a maquete em desenho. */}
            <Cena3D
              funcionarios={dados.postos.map(p => p.funcionario)}
              selecionado={posto?.membro.id ?? null}
              aoTocar={id => abrirPosto(id)}
              valores={valores}
              falas={comFalas ? falas : undefined}
              humores={humores}
              novos={novidades.novos}
              aoResponder={comFalas ? id => abrirResposta(id) : undefined}
              expediente={comFalas}
              ampliavel
              reserva={
                <VisorEscritorio sala={sala} aoMudarSala={setSala} celular={celular} tarefaDaFila={selecao?.pergunta}>
                  {navegacao => (
                    <EscritorioDesenho
                      completo
                      variante="grande"
                      {...{ funcionarios, papel, oculto, celular, navegacao }}
                      salaDestacada={sala}
                      postoSelecionado={posto?.membro.id ?? null}
                      onSelecionar={f => abrirPosto(f.id)}
                    />
                  )}
                </VisorEscritorio>
              }
            />
            <ul className="iso-legenda" aria-label="O que cada sinal quer dizer">
              {(['vai_comecar', 'trabalhando', 'entregue', 'precisa_de_voce'] as const).map(s => (
                <li key={s}>
                  <IcoEstado e={s} />
                  {ROTULO_ESTADO[s]}
                </li>
              ))}
            </ul>
            {ficha}
            {resposta}
          </>
        ) : (
          <>
            <ul className="inicio-postos-texto">
              {dados.postos.map(({ membro }) => (
                <li key={membro.id}>
                  <button type="button" onClick={() => abrirPosto(membro.id)}>
                    {membro.nome}
                  </button>
                </li>
              ))}
            </ul>
            {ficha}
            {resposta}
          </>
        )}
      </div>
      <aside className="j-folha" aria-label="Precisa de você" ref={folha} tabIndex={-1}>
        {celular ? (
          <button
            type="button"
            className="j-folha-gatilho"
            aria-expanded={filaAberta}
            aria-controls="j-fila-hoje"
            onClick={() => abrirFila(!filaAberta)}
          >
            <Icone desenho={Hand} size={18} />
            Precisa de você{mostrarTotal && <span className="j-contagem">{total}</span>}
            <Icone nome="abrir" size={16} />
          </button>
        ) : (
          <h2 className="j-fila-titulo">
            <Icone desenho={Hand} size={18} />
            Precisa de você{mostrarTotal && <span className="j-contagem">{total}</span>}
          </h2>
        )}
        <div className="j-fila-corpo" id="j-fila-hoje" hidden={celular && !filaAberta}>
          {estado === 'erro' ? (
            <p role="alert">
              Não foi possível conferir a fila.{' '}
              <button type="button" onClick={atualizar}>
                Tentar de novo
              </button>
            </p>
          ) : !e ? (
            <p className="j-fila-vazia" role="status">
              {estado === 'buscando' ? 'Conferindo…' : 'Ainda sem dado'}
            </p>
          ) : fila.length ? (
            <ul className="j-decisoes">
              {fila.slice(atual * porPagina, (atual + 1) * porPagina).map(t => {
                const prioridade = prioridades[nivel(t.pergunta, hoje)]
                return (
                  <li key={t.pergunta.id}>
                    <button
                      className="j-remetente j-remetente-posto"
                      type="button"
                      onClick={() => {
                        setSala(t.membro.sala)
                        abrirPosto(t.membro.id, t.pergunta.id)
                      }}
                    >
                      <FuncIco id={t.membro.id} size={32} />
                      <strong>{t.membro.nome}</strong>
                      {novidades.tarefaNova(t.pergunta.id) && <em className="tag-novo">Novo</em>}
                    </button>
                    <span className="j-nivel" data-risco={(!oculto && prioridade.ordem === 0) || undefined}>
                      {oculto ? 'Tarefa' : prioridade.texto}
                    </span>
                    <p className="j-pergunta">{t.texto}</p>
                    <strong>{t.valor}</strong>
                    <div className="j-acoes">
                      <button type="button" onClick={() => abrirResposta(t.membro.id, t.pergunta.id)}>
                        Abrir tarefa <Icone nome="abrir" size={16} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="j-fila-vazia">{total ? 'Veja as tarefas no Escritório.' : 'Nenhuma tarefa pendente.'}</p>
          )}
          {ultimaPagina > 0 && (
            <div className="j-paginacao">
              <button type="button" disabled={atual === 0} onClick={() => setPagina(atual - 1)}>
                Anterior
              </button>
              <button type="button" disabled={atual === ultimaPagina} onClick={() => setPagina(atual + 1)}>
                Próxima
              </button>
            </div>
          )}
          {casal && (
            <a className="lnk" href="#/escritorio">
              Ver fila e relatório <Icone nome="abrir" size={16} />
            </a>
          )}
        </div>
      </aside>
    </div>
  )
}

const relativo = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

function dataRelativa(quando: string, hoje: string) {
  return relativo.format(diasEntre(hoje, hojeRecife(new Date(quando))), 'day')
}

function FichaDadosPosto({
  posto,
  hoje,
  oculto,
  temLeitura,
  filaParcial,
}: {
  posto: PostoIsometrico
  hoje: string
  oculto: boolean
  temLeitura: boolean
  filaParcial: boolean
}) {
  const { membro, funcionario: f, pendencias, atividade, entrega } = posto
  const diario = (f.ultimas_respostas ?? [])
    .filter(linha => Number.isFinite(Date.parse(linha.quando)))
    .sort((a, b) => Date.parse(b.quando) - Date.parse(a.quando))
  const ultimoRegistro = diario[0]
  const ultimaResposta =
    diario.find(linha => !linha.adiado_ate && linha.resposta.trim()) ??
    f.ultimas_respostas?.find(linha => !linha.adiado_ate && linha.resposta.trim())
  const resultado =
    entrega?.resumo.trim() || (f.estado === 'entregue' && f.frase !== membro.papel ? f.frase.trim() : '')
  // Só vale o último registro da tarefa. Uma resposta nova pode substituir o adiamento.
  const vistos = new Set<string>()
  const agora = Date.now()
  let proximoRetorno: string | undefined
  for (const { ref, adiado_ate } of diario) {
    if (ref && vistos.has(ref)) continue
    if (ref) vistos.add(ref)
    if (
      adiado_ate &&
      Date.parse(adiado_ate) > agora &&
      (!proximoRetorno || Date.parse(adiado_ate) < Date.parse(proximoRetorno))
    )
      proximoRetorno = adiado_ate
  }
  const proximoLembrete = membro.id === 'secretaria' ? atividade?.match(/Próximo:\s*(.+)/)?.[1] : undefined
  const frase = f.frase.trim()
  const status = pendencias
    ? 'Aguardando sua resposta.'
    : f.semDado
      ? 'Ainda sem atividade registrada.'
      : f.estado === 'trabalhando'
        ? 'Tarefa em andamento.'
        : 'Sem tarefa em andamento.'
  const detalhe =
    !pendencias &&
    !f.semDado &&
    f.estado !== 'entregue' &&
    !proximoLembrete &&
    (atividade || (frase !== membro.papel ? frase : ''))

  return (
    <dl>
      <dt>Função</dt>
      <dd>{membro.papel}</dd>
      <dt>Agora</dt>
      <dd>
        {status}
        {detalhe && !oculto ? ` ${detalhe}` : ''}
      </dd>
      <dt>Última entrega</dt>
      <dd>
        {ultimaResposta ? (
          <>
            {oculto ? 'Resposta registrada' : ultimaResposta.resposta}
            {Number.isFinite(Date.parse(ultimaResposta.quando)) && (
              <>
                {' '}
                · <time dateTime={ultimaResposta.quando}>{dataRelativa(ultimaResposta.quando, hoje)}</time>
              </>
            )}
          </>
        ) : resultado ? (
          oculto ? (
            'Resultado oculto'
          ) : (
            resultado
          )
        ) : (
          'Ainda sem entrega registrada.'
        )}
      </dd>
      {resultado && ultimaResposta && resultado !== ultimaResposta.resposta && (
        <>
          <dt>Resultado atual</dt>
          <dd>{oculto ? 'Resultado oculto' : resultado}</dd>
        </>
      )}
      {ultimoRegistro && ultimoRegistro !== ultimaResposta && (
        <>
          <dt>Último registro</dt>
          <dd>
            <time dateTime={ultimoRegistro.quando}>{dataRelativa(ultimoRegistro.quando, hoje)}</time>
          </dd>
        </>
      )}
      {(proximoRetorno || proximoLembrete) && (
        <>
          <dt>Próxima rotina</dt>
          <dd>
            {proximoRetorno ? (
              <>
                Retomar tarefa · <time dateTime={proximoRetorno}>{dataRelativa(proximoRetorno, hoje)}</time>
              </>
            ) : oculto ? (
              'Lembrete agendado'
            ) : (
              proximoLembrete
            )}
          </dd>
        </>
      )}
      {temLeitura && (
        <>
          <dt>Pendências</dt>
          <dd>
            {oculto ? (
              <span aria-label="Quantidade oculta">{PONTOS_LONGOS}</span>
            ) : filaParcial ? (
              `${pendencias} na fila visível`
            ) : (
              pendencias
            )}
          </dd>
        </>
      )}
    </dl>
  )
}
