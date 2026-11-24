import { textoPrivado } from '../../lib/olho'
import './meu-orcamento.css'
import '../../componentes/planilha.css'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { Botao } from '../../componentes/base'
import { Icone } from '../../componentes/Icone'
import { useRascunho } from '../../app/useRascunho'
import { useLeituraRemota } from '../../app/useLeituraRemota'
import { Conferencia } from '../../componentes/Conferencia'
import { NomeDaPessoa } from '../../componentes/NomeDaPessoa'
import type { DesejoTela } from '../../api/tipos'
import { valorDigitadoValido } from '../../lib/formato'
import { CampoPrivado } from '../../componentes/privacidade'
import { useMemo, useState } from 'react'
import { CalendarCheck, PiggyBank, Trophy, Plus, ShoppingBag, CircleCheck, Target, Wallet } from 'lucide-react'
import { useAcoes, useDadosDoDia, useOlhoApp, useSessaoAtual } from '../../app/contexto'
import { CampoValor, Din, Sheet } from '../../componentes/base'
import { Qm } from '../../componentes/Qm'
import { GastoDoMes } from '../../componentes/GastoDoMes'
import { Rosto } from '../../componentes/Rosto'
import { MesEmBolinhas } from '../../componentes/MesEmBolinhas'
import { ComprasDoMes, OndeFoiODinheiro } from '../../componentes/ComprasDoMes'
import { AnelConquistas, Medalha, NumeroQueSobe, PoteDaSobra } from '../../componentes/VidaDoOrcamento'
import { conquistasDoMes, iniciaisDistintas } from './conquistas'
import { fraseEstouro, numeroEnvelope, tetoDoMes } from '../../componentes/EnvelopeCard'
import { CobrirEstouro } from '../../componentes/CobrirEstouro'
import { valorPrincipalEnvelope } from '../../lib/resumo/orcamento'
import { RitmoMes } from '../../componentes/RitmoMes'
import { porDiaDe } from '../../lib/resumo/porDia'
import { useConfig } from '../../app/useConfig'
import { donoDo, escreveNo } from '../../lib/dono'
import { cofrinhoDoMes, projecao } from '../../lib/plano'
import { useSecaoVisivel } from '../../app/useSecaoVisivel'
import {
  centavos,
  diasNoMes,
  diasRestantes,
  hojeRecife,
  mesAnterior,
  plural,
  reais,
  somaDias,
  textoParaValor,
} from '../../lib/formato'

/** Meu orçamento: hoje, semana, fim do mês, cofrinho e conquistas. Abre no limite de quem olha (R2). */
export function MeuOrcamento() {
  const { api, familia } = useSessaoAtual()
  const { recarregar, abrirLancar, toast } = useAcoes()
  const { resumo, erroResumo, versao } = useDadosDoDia()
  const { oculto } = useOlhoApp()
  const pessoais = (resumo?.envelopes || []).filter(e => !e.casa)
  const [envId, setEnvId] = useState<string | null>(null)
  const env = pessoais.find(e => e.id === envId) || pessoais.find(e => e.id === familia?.envelopeId) || pessoais[0]
  const leitura = useLeituraRemota(
    familia?.id || '',
    familia ? () => api.lancamentos(familia.id, hojeRecife().slice(0, 7)) : null,
    [api, versao],
  )
  const lanc = useMemo(() => leitura.dado || [], [leitura.dado])
  // 24/11: o mês passado, só para comparar os tipos em "Onde foi seu dinheiro". Só lê depois que este mês abriu;
  // se falhar, a tela segue sem comparar.
  const mesAntes = mesAnterior(hojeRecife().slice(0, 7))
  const esteMesAbriu = !!leitura.dado
  const leituraAntes = useLeituraRemota(
    (familia?.id || '') + ':antes',
    familia && esteMesAbriu ? () => api.lancamentos(familia.id, mesAntes) : null,
    [api, versao, mesAntes, esteMesAbriu],
  )
  // 24/11: a aba do topo (Hoje, Sobra anotada, Conquistas) marca a parte da tela que está à vista
  const secao = useSecaoVisivel(['oHoje', 'oCofrinho', 'oMais'], esteMesAbriu && !!resumo)
  const [semGasto, salvarSemGasto] = useConfig<string[]>('dias_sem_gasto', [])
  // FILHA ideia 1: meta no cofrinho ("Quero juntar pra: Fone R$ 150")
  const [metas, salvarMetas] = useConfig<Metas>('metas_pessoais', {})
  const [dpc, setDpc] = useState(false)
  const [metaAberta, setMetaAberta] = useState(false)

  const hoje = hojeRecife()
  const mes = hoje.slice(0, 7)
  const dados = useMemo(() => {
    const meus = lanc.filter(
      l => !l.parcela && !l.apagado_em && env && l.envelope_id === env.id && l.data.startsWith(mes),
    )
    const porDia: Record<string, number> = {}
    for (const l of meus) porDia[l.data] = centavos((porDia[l.data] || 0) + l.valor)
    const base = env ? centavos((env.limite_base ?? env.limite_mes) / diasNoMes(hoje)) : 0
    const fechados: string[] = []
    for (let d = `${mes}-01`; d < hoje; d = somaDias(d, 1)) fechados.push(d)
    // dia marcado "não gastei" conta como anotado (R9)
    const anot = new Set([...Object.keys(porDia), ...(semGasto || [])])
    // R8: o cofrinho bate com o mês: dia acima do valor come a sobra dos outros dias
    return { porDia, base, fechados, anot, cof: cofrinhoDoMes(porDia, base, fechados, anot) }
  }, [lanc, env, hoje, semGasto, mes])

  if (erroResumo)
    return (
      <div className="card" role="alert">
        <EstadoVazio
          ilustracao="Erro"
          titulo="Não foi possível atualizar o orçamento."
          frase="Seus registros continuam guardados."
          acao={{ texto: 'Tentar de novo', aoClicar: recarregar }}
        />
      </div>
    )
  if (leitura.erro)
    return (
      <div className="card" role="alert">
        <EstadoVazio
          ilustracao="Erro"
          titulo="Não foi possível conferir."
          frase="Seus registros continuam guardados. Vamos tentar de novo?"
          acao={{ texto: 'Tentar de novo', aoClicar: leitura.repetir }}
        />
      </div>
    )
  if (leitura.carregando || !leitura.dado) return <Conferencia repetir={leitura.repetir} />
  if (!resumo)
    return (
      <div className="card">
        <p className="sub">Abrindo…</p>
      </div>
    )
  if (!env)
    return (
      <div className="card">
        <EstadoVazio
          ilustracao="Plano2029"
          titulo="Seu orçamento começa aqui"
          frase="Ainda não tem limite de pessoa. Crie em Planejamento."
        />
      </div>
    )

  const n = numeroEnvelope(env, resumo.dias_restantes)
  // E2 (regra nova, 13/11): o casal abre o orçamento do outro pra ler, com o nome dele, sem nenhum botão de mexer
  const meu = escreveNo(env, familia),
    dono = donoDo(env) || ''
  const gastoHoje = dados.porDia[hoje] || 0
  const ontem = somaDias(hoje, -1)
  // R9: no lugar de "N dias em branco", 1 pergunta sobre ontem
  const perguntarOntem = meu && ontem.startsWith(mes) && !dados.anot.has(ontem)
  const ult3 = [1, 2, 3].map(i => somaDias(hoje, -i)).filter(d => d.startsWith(mes))
  const branco = ult3.filter(d => !dados.anot.has(d)).length
  const dentro = dados.fechados.filter(d => dados.anot.has(d) && (dados.porDia[d] || 0) <= dados.base).length
  const ir = (id: string) =>
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  const frase = fraseEstouro(env, n)
  const conquistas = conquistasDoMes({
    temGasto: Object.keys(dados.porDia).length > 0,
    dentro,
    sobra: dados.cof,
    seguidos: ult3.length - branco,
  })
  const iniciais = iniciaisDistintas(pessoais.map(e => e.nome))

  return (
    <div className="view orcamento-f29" data-secao="orcamento">
      {pessoais.length > 1 && (
        <div className="pills" role="group" aria-label="De quem é o orçamento">
          {pessoais.map((e, i) => (
            <button
              key={e.id}
              type="button"
              className="pill"
              aria-pressed={e.id === env.id}
              onClick={() => setEnvId(e.id)}
            >
              <Rosto envelope={e.id} nome={e.nome} tam={30} inicial={iniciais[i]} />
              <span className="pill-nome">
                {textoPrivado(e.nome)}
                {escreveNo(e, familia) ? '' : <small className="pill-dono">só ver</small>}
              </span>
            </button>
          ))}
        </div>
      )}
      <nav className="segbar" aria-label="Ir para">
        <div className="seg compacta">
          <button type="button" onClick={() => ir('oHoje')} aria-current={secao === 'oHoje' || undefined}>
            <Icone nome="inicio" />
            Hoje
          </button>
          <button type="button" onClick={() => ir('oCofrinho')} aria-current={secao === 'oCofrinho' || undefined}>
            <Icone nome="guardar" />
            Sobra anotada
          </button>
          <button type="button" onClick={() => ir('oMais')} aria-current={secao === 'oMais' || undefined}>
            <Icone nome="salvo" />
            Conquistas
          </button>
        </div>
      </nav>

      <div className="tela-larga">
        <div className="col">
          <section
            className="card aba-destaque"
            id="oHoje"
            aria-labelledby="oHojeT"
            style={{ scrollMarginTop: 72 }}
            {...(meu ? {} : { 'data-do-outro': textoPrivado(dono) })}
          >
            <div className="orc-cabeca">
              <Rosto envelope={env.id} nome={env.nome} tam={48} podeTrocar={meu || familia?.papel === 'casal'} />
              <h2 id="oHojeT" className="orc-titulo">
                {textoPrivado(env.nome)}, hoje
              </h2>
            </div>
            {!meu && (
              <p className="sub dono-linha">
                Orçamento de{' '}
                <NomeDaPessoa pessoa={{ tipo: 'membro', id: env.dono_id || `envelope:${env.id}`, nome: dono }} />: aqui
                é só para ver. Quem lança e mexe é {textoPrivado(dono)}.
              </p>
            )}
            <p className="lbl orc-rotulo" style={{ marginTop: 8 }}>
              <Wallet aria-hidden="true" />
              {oculto ? 'Valores escondidos' : n.estado === 'devendo' ? 'Este mês fica devendo' : 'Pode gastar hoje'}
            </p>
            <div className="numrow">
              <NumeroQueSobe
                v={valorPrincipalEnvelope(env, n)}
                className={!oculto && n.estado === 'devendo' ? 'din-warn' : undefined}
                tam="big"
              />
              <Qm
                titulo={oculto ? 'De onde vem o valor' : textoPrivado(`${env.nome}: ${n.rotulo}`)}
                linhas={n.linhas}
              />
            </div>
            {frase && <p className="todo warn frase-estouro">{textoPrivado(frase)}</p>}
            {meu && n.estado === 'devendo' && env.regra !== 'semanal' && <CobrirEstouro e={env} valor={n.devendo} />}
            <GastoDoMes
              hoje={gastoHoje}
              mes={env.gasto_mes}
              teto={tetoDoMes(env)}
              oculto={oculto}
              emRisco={
                Number(hoje.slice(8, 10)) >= 3 &&
                !projecao(env.gasto_mes, env.limite_base ?? env.limite_mes, hoje, env.pontual_mes || 0).dentro
              }
            />
            <details className="salario-porque">
              <summary>Por quê?</summary>
              <p className="sub">
                {!oculto && n.estado !== 'devendo' && env.regra !== 'diario'
                  ? 'Pode gastar hoje é o que sobra no mês dividido pelos dias que faltam. '
                  : ''}
                Compras anotadas hoje mostra o valor inteiro da compra, mesmo parcelada. No mês entra só a parcela de
                cada mês
                {env.parcelas_mes ? `: ${textoPrivado(reais(env.parcelas_mes))} deste mês são parcelas` : ''}.
              </p>
            </details>
            {n.estado !== 'devendo' && (
              <RitmoMes e={env} quem={meu ? undefined : dono} porDia={porDiaDe(lanc, env.id, hoje)} />
            )}
            {perguntarOntem && (
              <div className="todo ontem" style={{ marginTop: 12 }}>
                <Icone desenho={CalendarCheck} aria-hidden="true" />
                <span>
                  <b>Ontem você não gastou nada?</b> É só para conta ficar certa.
                  <span className="row-btns" style={{ marginTop: 8 }}>
                    <Botao
                      variante="secundario"
                      className="sm"
                      type="button"
                      onClick={async () => {
                        if (await salvarSemGasto([...(semGasto || []), ontem])) toast('Anotado: ontem você não gastou.')
                      }}
                    >
                      <Icone nome="salvo" />
                      Não gastei
                    </Botao>
                    <Botao
                      variante="secundario"
                      className="sm"
                      type="button"
                      onClick={() => abrirLancar({ envelope: env.id, quando: 'ontem' })}
                    >
                      <Icone nome="lancar" />
                      Esqueci de anotar
                    </Botao>
                  </span>
                </span>
              </div>
            )}
            {meu && (
              <div className="row-btns" style={{ marginTop: 14 }}>
                <Botao variante="primario" type="button" onClick={() => abrirLancar({ envelope: env.id })}>
                  <Icone desenho={Plus} />
                  Anotar em {textoPrivado(env.nome)}
                </Botao>
                {/* FILHA ideia 2: "Dá pra comprar?" sem cartão e sem fatura */}
                <Botao variante="secundario" type="button" onClick={() => setDpc(true)}>
                  <Icone desenho={ShoppingBag} />
                  Dá para comprar?
                </Botao>
              </div>
            )}
          </section>

          <section className="card" id="oCofrinho" aria-labelledby="oCofT" style={{ scrollMarginTop: 72 }}>
            <div className="card-h">
              <h2 id="oCofT">
                <Icone desenho={PiggyBank} aria-hidden="true" />
                Sobra anotada
              </h2>
              <PoteDaSobra valor={env.livre < 0 ? 0 : dados.cof} alvo={100} oculto={oculto} />
            </div>
            <div className={'numrow' + ((env.livre < 0 ? 0 : dados.cof) <= 0 ? ' cof-zero' : '')}>
              <Din v={env.livre < 0 ? 0 : dados.cof} tam="mid" />
              <Qm
                titulo="Sobra anotada"
                linhas={[
                  { linha: 'Valor diário usado para calcular sua sobra', valor: dados.base },
                  {
                    linha: `Nos ${plural(dados.fechados.filter(d => dados.anot.has(d)).length, 'dia anotado', 'dias anotados')} até ontem: o que sobrou menos o que passou`,
                    valor: dados.cof,
                  },
                ]}
                nota="O que sobra do valor diário de referência entra na sobra anotada e volta dividido pelos dias que faltam. Gastar acima do valor reduz essa sobra. Dia sem anotação não conta. Hoje só entra amanhã. Isso não significa que você guardou dinheiro."
              />
            </div>
            <p className="sub">
              {textoPrivado(
                env.livre < 0
                  ? 'Vazio este mês: o mês passou do combinado. Em 1º de cada mês ele começa de novo.'
                  : dados.cof <= 0
                    ? `Ainda não sobrou nada este mês. Dá para gastar mais ${reais(Math.max(0, env.livre))} até o fim do mês.`
                    : `Já está somada no Pode gastar hoje: ${reais(env.hoje ?? n.valor)}.`,
              )}
            </p>
            <MesEmBolinhas hoje={hoje} porDia={dados.porDia} base={dados.base} anotados={dados.anot} oculto={oculto} />
            {env.livre >= 0 && (
              <details className="salario-porque">
                <summary>Por quê?</summary>
                <p className="sub">
                  {textoPrivado(
                    dados.cof <= 0
                      ? `A sobra cresce nos dias em que ${meu ? 'você gasta' : `${dono} gasta`} menos que o valor diário de referência de ${reais(dados.base)}.`
                      : // E3 (conserto 5): o cofrinho e o número do dia na mesma base: o valor diário de referência mais o cofrinho dividido pelos dias que faltam
                        `É o que sobrou ${meu ? 'do seu combinado' : `do combinado de ${dono}`} até ontem, em cima do valor diário de referência de ${reais(dados.base)}, dividido pelos ${plural(diasRestantes(hoje), 'dia que falta', 'dias que faltam')}.`,
                  )}
                </p>
              </details>
            )}
            {(() => {
              const m = metas?.[env.id]
              if (!m)
                return meu ? (
                  <Botao
                    variante="secundario"
                    className="sm"
                    type="button"
                    style={{ marginTop: 10 }}
                    onClick={() => setMetaAberta(true)}
                  >
                    <Icone desenho={Target} />
                    Quero juntar pra…
                  </Botao>
                ) : null
              return (
                <>
                  <ProgressoMeta meta={m} editavel={meu} salvar={m => salvarMetas({ ...metas, [env.id]: m })} />
                  {meu && (
                    <Botao
                      variante="fantasma"
                      className="sm"
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            textoPrivado(
                              'Tirar a meta ' +
                                (m.nome || 'deste envelope') +
                                '? Deixa de aparecer no seu planejamento.',
                            ),
                          )
                        )
                          void salvarMetas(
                            Object.fromEntries(Object.entries(metas || {}).filter(([k]) => k !== env.id)),
                          )
                      }}
                    >
                      Tirar a meta
                    </Botao>
                  )}
                </>
              )
            })()}
          </section>
        </div>

        <div className="col">
          <OndeFoiODinheiro
            lanc={lanc}
            envelopeId={env.id}
            envelopeNome={env.nome}
            mes={mes}
            oculto={oculto}
            lancAntes={leituraAntes.dado}
            ateDia={Number(hoje.slice(8, 10))}
          />
          <ComprasDoMes lanc={lanc} envelopeId={env.id} envelopeNome={env.nome} mes={mes} />
          <section className="card" id="oMais" aria-labelledby="oMaisT" style={{ scrollMarginTop: 72 }}>
            <div className="card-h">
              <h2 id="oMaisT">
                <Icone desenho={Trophy} aria-hidden="true" />
                Conquistas
              </h2>
              <AnelConquistas feitas={conquistas.filter(c => c.ok).length} total={conquistas.length} />
            </div>
            <ul className="list">
              {conquistas.map(c => (
                <li key={c.nome} className="li" data-ok={c.ok}>
                  <Medalha nivel={c.nivel} ok={c.ok} />
                  <span className="m">
                    <b>{textoPrivado(c.nome)}</b>
                    <small>{c.ok ? 'Conseguiu' : textoPrivado(c.falta)}</small>
                  </span>
                  {c.ok ? <CircleCheck className="orc-ok" aria-hidden="true" /> : <span />}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      {dpc && <DaPraComprar livre={Math.max(0, env.livre)} fechar={() => setDpc(false)} />}
      {metaAberta && (
        <NovaMeta
          fechar={() => setMetaAberta(false)}
          salvar={async (nome, valor) => {
            const ok = await salvarMetas({ ...(metas || {}), [env.id]: { nome, valor } })
            if (ok) setMetaAberta(false)
            return ok
          }}
        />
      )}
    </div>
  )
}

/** "Dá pra comprar?": só o livre do mês de quem olha, sem cartão e sem fatura. Nada é gravado. */
function DaPraComprar({ livre, fechar }: { livre: number; fechar: () => void }) {
  const [txt, setTxt] = useState('')
  const v = textoParaValor(txt),
    depois = centavos(livre - v)
  return (
    <Sheet titulo="Dá para comprar?" fechar={fechar}>
      <p className="sub">Simulação: nada é gravado.</p>
      <div className="campo">
        <span>Quanto custa?</span>
        <CampoValor valor={txt} mudar={setTxt} rotulo="Quanto custa" />
      </div>
      {v > 0 && (
        <p className={'todo ' + (depois >= 0 ? 'ok' : 'warn')}>
          <Icone desenho={CircleCheck} aria-hidden="true" />
          <span>
            {depois >= 0 ? (
              <>
                <b>Cabe em {hojeRecife().slice(0, 7)}.</b> O que você ainda pode gastar no mês vai de {reais(livre)}{' '}
                para {reais(depois)}.
              </>
            ) : (
              <>
                <b>Não cabe neste mês.</b> Faltam {reais(-depois)}. Você pode criar uma meta e anotar quanto conseguir
                guardar.
              </>
            )}
          </span>
        </p>
      )}
    </Sheet>
  )
}

function NovaMeta({
  fechar,
  salvar,
}: {
  fechar: () => void
  salvar: (nome: string, valor: number) => Promise<boolean>
}) {
  const [nome, setNome] = useRascunho('cadastro:meta:nome', ''),
    [v, setV] = useRascunho('cadastro:meta:v', '')
  return (
    <Sheet titulo="Quero juntar pra…" fechar={fechar}>
      <form
        style={{ display: 'grid', gap: 12 }}
        onSubmit={async e => {
          e.preventDefault()
          if (nome.trim() && textoParaValor(v) > 0 && (await salvar(nome.trim(), textoParaValor(v))))
            [setNome, setV].forEach(s => s.limpar())
        }}
      >
        <label className="campo">
          <span>O que você quer comprar?</span>
          <CampoPrivado className="inp" placeholder="Ex.: Fone" value={nome} onChange={e => setNome(e.target.value)} />
        </label>
        <div className="campo">
          <span>Quanto custa?</span>
          <CampoValor valor={v} mudar={setV} rotulo="Quanto custa" />
        </div>
        <Botao variante="primario" className="full" type="submit">
          <Icone nome="desejo" />
          Guardar a meta
        </Botao>
      </form>
    </Sheet>
  )
}

export type MetaPessoal = {
  nome: string
  valor: number
  desejo?: string
  anotacoes?: { id: string; data: string; valor: number }[]
}
export type Metas = Record<string, MetaPessoal>

export function MetaDoDesejo({ desejo }: { desejo: DesejoTela }) {
  const { familia } = useSessaoAtual()
  const { toast } = useAcoes()
  const [metas, salvar, falha, leu] = useConfig<Metas>('metas_pessoais', {})
  const [ocupado, setOcupado] = useState(false)
  if (familia?.papel !== 'pessoa' || !familia.envelopeId || !desejo.meu) return null
  const id = familia.envelopeId,
    existente = metas[id]
  return (
    <>
      {falha && <span role="alert">Não foi possível abrir sua meta. Tente quando a conexão voltar.</span>}
      <Botao
        type="button"
        variante="secundario"
        disabled={!leu || ocupado || existente?.desejo === desejo.id}
        onClick={async () => {
          setOcupado(true)
          try {
            if (
              await salvar({
                ...metas,
                [id]: {
                  nome: desejo.nome,
                  valor: desejo.valor,
                  desejo: desejo.id,
                  anotacoes: existente?.anotacoes || [],
                },
              })
            )
              toast('Meta pronta em Meu orçamento. Anote lá quanto guardou.')
          } finally {
            setOcupado(false)
          }
        }}
      >
        {existente?.desejo === desejo.id
          ? 'Já é sua meta'
          : existente
            ? 'Usar como meta e manter o que anotou'
            : 'Criar meta em Meu orçamento'}
      </Botao>
    </>
  )
}

export function ProgressoMeta({
  meta,
  salvar,
  editavel,
}: {
  meta: MetaPessoal
  salvar: (meta: MetaPessoal) => Promise<boolean>
  editavel: boolean
}) {
  const { oculto } = useOlhoApp()
  const [valor, setValor] = useRascunho('cadastro:meta:valor', ''),
    [ocupado, setOcupado] = useState(false)
  const [falha, setFalha] = useState('')
  const total = centavos((meta.anotacoes || []).reduce((s, a) => s + a.valor, 0))
  return (
    <div className="meta-cofre">
      <p>
        <b>{textoPrivado(meta.nome)}</b> · <Din v={total} /> de <Din v={meta.valor} />
      </p>
      {!oculto && (
        <progress
          aria-label="Progresso da meta"
          max={meta.valor}
          value={Math.min(total, meta.valor)}
          style={{ width: '100%' }}
        />
      )}
      <p className="sub">Soma o que você anotar, mês após mês. Não mexe no saldo.</p>
      {editavel && (
        <form
          onSubmit={async e => {
            e.preventDefault()
            if (ocupado || !valorDigitadoValido(valor) || textoParaValor(valor) <= 0) return
            setOcupado(true)
            setFalha('')
            try {
              if (
                await salvar({
                  ...meta,
                  anotacoes: [
                    ...(meta.anotacoes || []),
                    { id: String(Date.now()), data: hojeRecife(), valor: textoParaValor(valor) },
                  ],
                })
              )
                setValor('')
              else setFalha('Não foi possível guardar a anotação. Seu valor continua aqui.')
            } finally {
              setOcupado(false)
            }
          }}
        >
          <label className="campo">
            <span>Quanto você guardou de verdade?</span>
            <CampoValor valor={valor} mudar={setValor} rotulo="Quanto você guardou de verdade?" />
          </label>
          <Botao
            type="submit"
            variante="secundario"
            disabled={ocupado || !valorDigitadoValido(valor) || textoParaValor(valor) <= 0}
          >
            <Icone nome="guardar" />
            Anotar valor guardado
          </Botao>
        </form>
      )}
      {falha && <p role="alert">{falha}</p>}
    </div>
  )
}
