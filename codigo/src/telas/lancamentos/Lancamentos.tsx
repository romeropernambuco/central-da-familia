import { useInvalidacao } from '../../app/invalidacao'
import { totaisDoMes } from '../../lib/resumo/movimentacao'
export { totaisDoMes } from '../../lib/resumo/movimentacao'
import { proximasPorCartao } from '../../lib/resumo/faturas'
import './lancamentos.css'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { Botao } from '../../componentes/base'
import { Icone } from '../../componentes/Icone'
import { NomeDaPessoa } from '../../componentes/NomeDaPessoa'
import { useDestino } from '../../app/destinos'
import { lerMes } from '../../lib/resumo/leituras'
import { useLeituraRemota } from '../../app/useLeituraRemota'
import type { RecebimentoTela } from '../../api/tipos'
import { mesCurto } from '../../lib/formato'
import { mesMais } from '../../lib/plano'
import { textoPrivado } from '../../componentes/privacidade'
import { useEffect, useState } from 'react'
import { Trash2, Undo2, CreditCard, History, Pencil } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useMembros } from '../../app/useMembros'
import { cartaoMeu, donoDo, mexeNoLancamento, rotuloDono } from '../../app/dono'
import { Din } from '../../componentes/base'
import type { Cartao, Envelope, FamiliaMinha, Fatura, Lancamento } from '../../api/tipos'
import { centavos, dataCurta, diaSemana, hojeRecife, mesAnterior, mesLongo, reais, somaDias } from '../../lib/formato'

/** Lançamentos do mês com lixeira: apagar não some de vez, dá pra trazer de volta. */
export function Lancamentos() {
  const { familia } = useApp()
  const [mes, setMes] = useState(() => hojeRecife().slice(0, 7))
  useEffect(() => {
    const atualizar = () => setMes(hojeRecife().slice(0, 7))
    const timer = setInterval(atualizar, 30000)
    window.addEventListener('focus', atualizar)
    return () => { clearInterval(timer); window.removeEventListener('focus', atualizar) }
  }, [])
  return <LancamentosFamilia key={`${familia?.id}:${mes}`} />
}

function LancamentosFamilia() {
  const { api, familia, resumo, versao, recarregar, toast, tentar, abrirLancar } = useApp()
  const invalidacao = useInvalidacao(api, familia?.id || '')
  const [falha, setFalha] = useState('')
  const [carregou, setCarregou] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [lixeira, setLixeira] = useState(false)
  const [n, setN] = useState(0)
  const nomeDe = useMembros()
  const casal = familia?.papel === 'casal'
  const hoje = hojeRecife()
  // recorte por mês: abre só o mês de hoje; "Ver meses anteriores" traz 1 mês de cada vez
  const [meses, setMeses] = useState<string[]>([hoje.slice(0, 7)])
  const [porMes, setPorMes] = useState<Record<string, Lancamento[]>>({})
  const [buscandoMes, setBuscandoMes] = useState(false)
  const lista = meses.flatMap(m => porMes[m] || [])
  useEffect(() => {
    if (!familia) return
    let vivo = true
    Promise.all(meses.map(m => api.lancamentos(familia.id, m).then(l => [m, l.filter(x => !x.parcela)] as const)))
      .then(rs => { if (vivo) { setPorMes(Object.fromEntries(rs)); setFalha(''); setCarregou(true) } })
      .catch(e => { if (vivo) setFalha((e as Error).message) })
      .finally(() => { if (vivo) setBuscandoMes(false) })
    api.cartoes(familia.id).then(c => { if (vivo) setCartoes(c) }).catch(() => {})
    // C5: a 2ª coluna do computador só mostra totais que o app já tem (o resumo do mês e as faturas); o casal lê
    if (familia.papel === 'casal') api.faturas(familia.id, 2).then(f => { if (vivo) setFaturas(f) }).catch(() => {})
    return () => { vivo = false }
  }, [api, familia?.id, versao, n, invalidacao, meses.join()])
  const proximo = mesAnterior(meses[meses.length - 1])
  const maisMeses = meses.length < 24

  const nomeEnv = (id: string) => resumo?.envelopes.find(e => e.id === id)?.nome || 'Limite'
  const envDe = (id: string) => resumo?.envelopes.find(e => e.id === id)
  const nomeCartao = (id: string | null) => (id ? cartoes.find(c => c.id === id)?.nome : null)
  const vis = lista.filter(l => (lixeira ? !!l.apagado_em : !l.apagado_em))
  const rot = (d: string) => (d === hoje ? 'Hoje' : d === somaDias(hoje, -1) ? 'Ontem' : `${diaSemana(d).replace(/^./, c => c.toUpperCase())}, ${dataCurta(d)}`)
  const dias = [...new Set(vis.map(l => l.data))]
  const naLixeira = lista.filter(l => l.apagado_em).length

  // 1 toque por vez em cada linha; se o banco recusar ou a internet cair, aparece o motivo (antes falhava calado)
  async function apagar(l: Lancamento) {
    if (ocupado) return
    setOcupado(l.id)
    const ok = await tentar(() => api.apagarLancamento(l.id))
    setOcupado(null)
    if (!ok) return
    setN(x => x + 1); await recarregar()
    toast(`${reais(l.valor)} foi para lixeira.`, async () => { await api.restaurarLancamento(l.id); setN(x => x + 1); await recarregar() })
  }
  async function restaurar(l: Lancamento) {
    if (ocupado) return
    setOcupado(l.id)
    const ok = await tentar(() => api.restaurarLancamento(l.id))
    setOcupado(null)
    if (!ok) return
    setN(x => x + 1); await recarregar()
    toast(`${reais(l.valor)} voltou para conta.`)
  }

  return (
    <div className="view lancamentos-f29">
      <div className="segbar">
        <div className="seg" role="group" aria-label="Mostrar">
          <button type="button" aria-pressed={!lixeira} onClick={() => setLixeira(false)}><Icone nome="lancamentos" />Gastos e entradas</button>
          <button type="button" aria-pressed={lixeira} onClick={() => setLixeira(true)}><Icone desenho={Trash2} />Lixeira{naLixeira ? ` (${naLixeira})` : ''}</button>
        </div>
      </div>
      {!lixeira && casal && <ResumoDoMes />}
      {!lixeira && api.corrigirLancamento && <p className="sub">Errou o valor ou o limite? Toque no lápis para corrigir ou apagar. O que for apagado fica na lixeira.{familia?.papel === 'casal' ? ' O gasto do outro aparece com o nome dele: só ele corrige.' : ''}</p>}
      {lixeira && <p className="todo"><Icone desenho={Trash2} aria-hidden="true" /><span>O que está aqui <b>não entra na conta</b>. Toque na setinha de voltar se apagou sem querer.</span></p>}
      <div className={casal ? 'tela-larga lanc-larga' : undefined}>
      <section className="card">
        {falha && <div className="aviso-erro" role="alert"><EstadoVazio ilustracao="Erro" titulo="Não foi possível buscar os lançamentos" frase={`${textoPrivado(falha)}. Eles continuam guardados no banco.`} acao={{ texto: 'Tentar novamente', aoClicar: () => setN(x => x + 1) }} /></div>}
        {!falha && !carregou && <p className="sub">Buscando os lançamentos…</p>}
        {!falha && carregou && !vis.length && (lixeira
          ? <EstadoVazio ilustracao="TudoEmDia" titulo="A lixeira está vazia" frase={meses.length > 1 ? 'Nenhum gasto apagado nos meses abertos.' : 'Nenhum gasto apagado neste mês.'} />
          : <EstadoVazio ilustracao="SemGastos" titulo={`Nenhum lançamento ${meses.length > 1 ? 'nos meses abertos' : `em ${mesLongo(meses[0] + '-01')}`}.`} frase="Comece pelo próximo gasto. A gente organiza com você." acao={{ texto: 'Anotar gasto', aoClicar: () => abrirLancar() }} />)}
        {dias.map(d => {
          const doDia = vis.filter(l => l.data === d)
          return (
            <div key={d}>
              <h3 className="dayh">{rot(d)} · {reais(centavos(doDia.reduce((s, l) => s + l.valor, 0)))}</h3>
              <ul className="list">
                {doDia.map(l => {
                  // E2: o casal lê o gasto do outro com o nome dele, sem lápis nem lixeira
                  const mexe = mexeNoLancamento(l, envDe(l.envelope_id), familia), dono = rotuloDono(envDe(l.envelope_id), familia)
                  return (
                  <li key={l.id} className="li" {...(dono ? { 'data-do-outro': textoPrivado((envDe(l.envelope_id) && donoDo(envDe(l.envelope_id)!)) || 'família') } : {})}>
                    <span className="tile"><Icone nome="gasto" /></span>
                    <span className="m"><b>{textoPrivado(l.descricao || 'Sem nome')}</b><small>{textoPrivado(dono ? (dono.endsWith(nomeEnv(l.envelope_id)) ? cap(dono) : `${nomeEnv(l.envelope_id)} ${dono}`) : nomeEnv(l.envelope_id))} · Anotado por <NomeDaPessoa autoria pessoa={{ tipo: 'membro', id: l.autor || `autor:${l.id}`, nome: nomeDe(l.autor) }} />{l.pago_por && <> · Pago por <NomeDaPessoa pessoa={{ tipo: 'membro', id: l.pago_por, nome: nomeDe(l.pago_por) }} /></>}{nomeCartao(l.cartao_id) ? <> · <Icone desenho={CreditCard} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> {textoPrivado(nomeCartao(l.cartao_id))}</> : null}{l.parcela ? ` · parcela ${l.parcela.n} de ${l.parcela.de} (compra de ${dataCurta(l.parcela.compra)})` : (l.parcelas || 1) > 1 ? ` · ${l.parcelas}x de ${reais(centavos(l.valor / l.parcelas!))}` : ''}</small></span>
                    <span className="v" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Din v={l.valor} />
                      {l.parcela || !mexe ? null : lixeira
                        ? <button className="iconbtn" type="button" disabled={ocupado === l.id} onClick={() => restaurar(l)} aria-label={`Trazer de volta ${textoPrivado(l.descricao || 'gasto')} de ${reais(l.valor)}`} title="Trazer de volta"><Icone desenho={Undo2} /></button>
                        // B14: só o lápis na linha; a lixeira fica dentro do Corrigir (sem o risco de apagar por engano)
                        : api.corrigirLancamento ? <button className="iconbtn" type="button" onClick={() => abrirLancar({ corrigir: l })} aria-label={`Corrigir ou apagar ${textoPrivado(l.descricao || 'gasto')} de ${reais(l.valor)}`} title="Corrigir"><Icone desenho={Pencil} /></button>
                        : <button className="iconbtn" type="button" disabled={ocupado === l.id} onClick={() => apagar(l)} aria-label={`Apagar ${textoPrivado(l.descricao || 'gasto')} de ${reais(l.valor)}`}><Icone desenho={Trash2} /></button>}
                    </span>
                  </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
        {carregou && maisMeses && (
          <div className="mais-meses">
            <p className="sub">Aparecendo: {meses.length === 1 ? mesLongo(meses[0] + '-01') : `de ${mesLongo(meses[meses.length - 1] + '-01')} a ${mesLongo(meses[0] + '-01')}`}.</p>
            <Botao variante="secundario" type="button" disabled={buscandoMes} onClick={() => { setBuscandoMes(true); setMeses([...meses, proximo]) }}><Icone desenho={History} />{buscandoMes ? 'Buscando…' : `Ver meses anteriores (${mesLongo(proximo + '-01')})`}</Botao>
          </div>
        )}
      </section>
      {casal && <TotaisDoMes envelopes={resumo?.envelopes || []} faturas={faturas} cartoes={cartoes} familia={familia} hoje={hoje} />}
      </div>
    </div>
  )
}

/**
 * C5 (decisão do dono, 14/11): no computador, ao lado da lista, os totais que já existem no app:
 * quanto cada limite já gastou no mês (o resumo do banco) e a próxima fatura de cada cartão (a soma do banco).
 * Nenhuma conta nova aqui: só mostra. No celular fica escondida (a lista ocupa a tela).
 */
function TotaisDoMes({ envelopes, faturas, cartoes, familia, hoje }: { envelopes: Envelope[]; faturas: Fatura[]; cartoes: Cartao[]; familia: FamiliaMinha | null; hoje: string }) {
  // regra do dono (E2): o casal lê tudo, com o nome do dono escrito no que é do outro adulto
  const doOutroCartao = (id: string) => { const c = cartoes.find(x => x.id === id); return c && !cartaoMeu(c, familia) ? (c.titular || '') : null }
  // a 1ª fatura com valor que ainda vai vencer, de cada cartão
  const proxPorCartao = proximasPorCartao(faturas, hoje)
  return (
    <aside className="col lanc-totais" aria-label="Totais do mês">
      <section className="card" aria-labelledby="ltMes">
        <div className="card-h"><h2 id="ltMes"><Icone nome="orcamento" />Este mês, por limite</h2></div>
        <p className="sub">Quanto já saiu de cada limite em {mesLongo(hoje.slice(0, 7) + '-01')}, do que foi combinado.</p>
        <ul className="list">
          {envelopes.map(e => (
            <li key={e.id} className="li" {...(rotuloDono(e, familia) ? { 'data-do-outro': textoPrivado(donoDo(e) || 'família') } : {})}><span className="tile"><Icone nome="orcamento" /></span><span className="m"><b>{textoPrivado(e.nome)}</b><small>{textoPrivado(rotuloDono(e, familia) ? `${cap(rotuloDono(e, familia))} · ` : '')}de <Din v={e.limite_mes} /> combinados</small></span><span className="v"><Din v={e.gasto_mes} /></span></li>
          ))}
        </ul>
      </section>
      <section className="card" aria-labelledby="ltCart">
        <div className="card-h"><h2 id="ltCart"><Icone nome="cartoes" />Próxima fatura de cada cartão</h2></div>
        {!proxPorCartao.length ? <EstadoVazio ilustracao="TudoEmDia" titulo="Nenhuma fatura com valor pela frente." frase="Você pode conferir os cartões quando precisar." /> : (
          <ul className="list">
            {proxPorCartao.map(f => (
              <li key={f.cartao_id + f.mes} className="li" {...(doOutroCartao(f.cartao_id) ? { 'data-do-outro': textoPrivado(doOutroCartao(f.cartao_id)!) } : {})}><span className="tile"><Icone desenho={CreditCard} aria-hidden="true" /></span><span className="m"><b>{textoPrivado(f.cartao)}</b><small>{cartoes.find(c => c.id === f.cartao_id)?.titular_id && <><NomeDaPessoa pessoa={{ tipo: 'membro', id: cartoes.find(c => c.id === f.cartao_id)!.titular_id!, nome: doOutroCartao(f.cartao_id) }} /> · </>}vence {dataCurta(f.vencimento)}</small></span><span className="v"><Din v={f.total} /></span></li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

export function FaixaDoMes({ totais }: { totais: ReturnType<typeof totaisDoMes> }) {
  return <><h3>Realizado</h3><div className="mes-indicadores">
    {([['Entrou', totais.entrou], ['Saiu', totais.saiu], ['Saldo do mês', totais.saldo]] as const).map(([nome, valor]) => <div key={nome} className={nome === 'Saldo do mês' ? 'indicador-principal' : undefined}><p><Icone nome={nome === 'Entrou' ? 'entrada' : nome === 'Saiu' ? 'gasto' : 'orcamento'} />{nome}</p><Din v={valor} tam="mid" /></div>)}
  </div><h3>Previsto · ainda não recebido</h3><p>Entradas certas pendentes: <Din v={totais.previsto} /></p>
  <details className="mes-como"><summary><Icone nome="ajuda" />Como ler este resumo</summary><p className="sub">Realizado: gastos anotados até hoje, entradas anotadas e recebimentos marcados como recebidos neste mês. Saldo é o que entrou menos o que saiu; não é o saldo do banco. Previsto: recebimentos marcados como certos para este mês. Incertos ficam fora. Previsto não entra no saldo realizado.</p></details></>
}

export function ResumoDoMes() {
  const { api, familia, versao } = useApp()
  const hoje = hojeRecife(), atual = hoje.slice(0, 7)
  const destino = useDestino()
  const pedido = destino.secao === 'mes' && destino.periodo ? destino.periodo : atual
  const [escolha, setMes] = useState({ pedido, mes: pedido })
  const mes = escolha.pedido === pedido ? escolha.mes : pedido
  if (escolha.pedido !== pedido) setMes({ pedido, mes: pedido })
  const [verFechamento, setVerFechamento] = useState(false)
  const permitido = familia?.papel === 'casal'
  const { dado, erro, carregando, repetir } = useLeituraRemota(`${familia?.id}:${mes}`, permitido && api.recebimentos ? () => lerMes(api, familia.id, hoje, mes) : null,
    [api, versao], 'resumo-familia:movimentacaoMes')
  if (!permitido) return null
  return <section className="card" aria-label="Resumo do mês" data-secao="mes" data-periodo={mes}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Botao type="button" variante="secundario" aria-label="Mês anterior" onClick={() => setMes({ pedido, mes: mesMais(mes, -1) })}>←</Botao>
      <h2>{mesCurto(mes + '-01')}</h2>
      <Botao type="button" variante="secundario" aria-label="Mês seguinte" disabled={mes >= atual} onClick={() => setMes({ pedido, mes: mesMais(mes, 1) })}>→</Botao>
    </div>
    {!api.recebimentos ? <p>Resumo indisponível: falta a leitura dos recebimentos.</p> : erro ? <p role="alert">Não foi possível atualizar o resumo. Os registros continuam guardados. <button type="button" onClick={repetir}>Tentar novamente</button></p>
      : carregando || !dado ? <p role="status">Buscando resumo…</p> : <><FaixaDoMes totais={dado} /><p className="sub">Fonte: registros da família, consultados nesta abertura. Confira se há valores ainda por atualizar.</p></>}
    {mes < atual && <><Botao type="button" variante="secundario" onClick={() => setVerFechamento(v => !v)}>{verFechamento ? 'Ocultar fechamento registrado' : 'Ver fechamento registrado'}</Botao>
      {verFechamento && <FechamentoRegistrado key={`${familia?.id}:${mes}`} mes={mes} />}</>}
  </section>
}

/** Consulta o texto que o fechamento existente deixou no diário; não calcula nem registra um fechamento novo. */
export function FechamentoRegistrado({ mes }: { mes: string }) {
  const { api, familia, versao } = useApp()
  const hoje = hojeRecife(), permitido = familia?.papel === 'casal' && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) && mes < hoje.slice(0, 7)
  const { dado, erro, carregando, repetir } = useLeituraRemota(`${familia?.id}:fechamento:${mes}`, permitido ? () => api.escritorioRelatorio(familia!.id, mesMais(mes, 1) + '-01', hoje) : null, [api, versao])
  if (!permitido) return null
  if (erro) return <p role="alert">Não foi possível consultar o fechamento registrado. <button type="button" onClick={repetir}>Tentar novamente</button></p>
  if (carregando || !dado) return <p role="status">Buscando fechamento…</p>
  const linhas = dado.diario.filter(l => l.funcionario === 'contador' && l.ref === `fechou_mes:${mes}`)
  return <section aria-label="Fechamento registrado"><h3>Fechamento de {mesCurto(mes + '-01')}</h3>
    <p className="sub">Texto salvo no diário do Contador. Não atualiza nem refaz as contas daquele mês.</p>
    {linhas.length ? linhas.map(l => <div key={l.id}><p>{textoPrivado(l.pergunta)}</p><p>{textoPrivado(l.resposta)}</p><small>Registrado em {dataCurta(l.quando.slice(0, 10))}</small></div>)
      : <p>Não há fechamento salvo desse mês nesta consulta. Isso não significa saldo zero. Seus gastos continuam disponíveis, mas não é possível fechar esse mês por esta tela.</p>}
  </section>
}
