import { useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, ChevronRight, Droplets, HelpCircle, Plus, Landmark, PartyPopper, ShieldAlert, X } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useFuturo, useGuardado } from '../../app/useDados2'
import { TODOS_OS_BANCOS, type FuturoSaida } from '../../lib/futuro'
import { useAdultos } from '../../app/useMembros'
import { aplicacaoMinha } from '../../app/dono'
import { CampoValor, Din, Sheet, Vazio } from '../../componentes/base'
import type { GuardadoAplicacao, GuardadoHoje, TipoAplicacao } from '../../api/tipos'
import { criarChaveToque, umaPorVez } from '../../lib/seguro'
import { dataBr, dataCurta, hojeRecife, reais, textoParaValor, valorDigitadoValido } from '../../lib/formato'
import { CDI_DIA_PADRAO, ROTULO_TIPO, barras30, cdiDiaDoAno, exemploVazio, marcoGuardado, pct, rendeQuanto } from '../../lib/guardado'

const TORNEIRA = 'Pense numa torneira pingando numa caixa d\'água. O que você guardou é a água da caixa. O rendimento é o pingo de cada dia útil: pinga pouco, mas pinga todo dia, e o pingo de hoje já rende amanhã. No sábado, no domingo e no feriado a torneira fecha, por isso o dia mostra R$ 0.'
type Folha = { tipo: 'nova' } | { tipo: 'aporte' | 'resgate'; app?: GuardadoAplicacao } | { tipo: 'app'; app: GuardadoAplicacao } | null

/** Guardado (a caixinha): a resposta de "quanto rendeu hoje?" em 1 número. Só o casal abre. */
export function Guardado() {
  const { familia, explicar, resumo } = useApp()
  const { g, estado, motivo } = useGuardado()
  // E7 (F10): o aviso do FGC vem do motor (futuro().avisos_fgc); a tela só escreve
  const { saida } = useFuturo()
  const [grafico, setGrafico] = useState<'dia' | 'saldo'>('saldo')
  const [marcoVisto, setMarcoVisto] = useState(() => { try { return localStorage.getItem('marco_visto') || '' } catch { return '' } })
  const [folha, setFolha] = useState<Folha>(() => (/[?&]nova=1/.test(location.hash) ? { tipo: 'nova' } : /[?&]guardar=1/.test(location.hash) ? { tipo: 'aporte' } : /[?&]tirar=1/.test(location.hash) ? { tipo: 'resgate' } : null))

  if (familia?.papel !== 'casal') return <div className="card"><Vazio ico={<Landmark size={24} />}>O Guardado mostra o dinheiro da família. Só o casal vê esta tela.</Vazio></div>
  if (estado === 'desligado') return <div className="card"><Vazio ico={<Landmark size={24} />}>O Guardado ainda está sendo ligado no banco da família. Assim que ligar, aparece aqui quanto o dinheiro guardado rendeu hoje.</Vazio></div>
  if (estado === 'erro' && !g) return <div className="card"><p className="aviso-erro" role="alert">Não deu pra buscar o Guardado: {motivo} Seu dinheiro não mudou; é só a tela que não carregou.</p></div>
  if (!g) return <div className="card"><p className="sub">Buscando quanto rendeu hoje…</p></div>

  const abrirConta = () => explicar({ titulo: 'Rendeu hoje', linhas: g.explicacao, nota: `${taxaTexto(g)} ${TORNEIRA}` })

  if (!g.aplicacoes.length) return <><GuardadoVazio g={g} comecar={() => setFolha({ tipo: 'nova' })} />{folha?.tipo === 'nova' && <NovaAplicacao fechar={() => setFolha(null)} />}</>

  const barras = barras30(g.por_dia_30)
  const temFolga = barras.some(b => !b.util)
  // G9: a reserva contada em meses do combinado de quem olha
  const meuEnv = resumo?.envelopes.find(e => e.id === familia.envelopeId && !e.casa)
  const meuLim = meuEnv ? meuEnv.limite_base ?? meuEnv.limite_mes : 0
  const seu = g.seu_total ?? g.total
  const meses = meuLim > 0 ? Math.floor(seu / meuLim) : 0
  // E2 (regra nova, 13/11): o casal vê tudo o que está guardado, com o nome de quem é; mexe só no seu e no do casal
  const doOutro = new Map<string, number>()
  for (const a of g.aplicacoes) if (!aplicacaoMinha(a, familia)) doOutro.set(a.titular_nome || 'outra pessoa', (doOutro.get(a.titular_nome || 'outra pessoa') || 0) + a.saldo)
  const minhas = g.aplicacoes.filter(a => aplicacaoMinha(a, familia))
  // G10: 1 aviso só por marco, que some quando a pessoa fecha
  const marco = marcoGuardado(g.saldo_30_seu || g.saldo_30 || [])
  const chaveMarco = marco ? `${familia.membroNome}:${marco.valor}` : ''
  return (
    <div className="view">
      {marco && marcoVisto !== chaveMarco && (
        <p className="todo ok marco" role="status"><PartyPopper size={20} aria-hidden="true" /><span><b>{g.saldo_30_seu ? 'Seu guardado' : 'O guardado'} passou de {reais(marco.valor)}</b> no dia {dataCurta(marco.dia)}. Está crescendo.</span>
          <button className="iconbtn" type="button" aria-label="Fechar o aviso" onClick={() => { setMarcoVisto(chaveMarco); try { localStorage.setItem('marco_visto', chaveMarco) } catch { /* sem armazenamento */ } }}><X size={18} /></button></p>
      )}
      <section className="card guard-hoje" aria-labelledby="gHoje">
        <h2 id="gHoje" className="lbl">Rendeu hoje</h2>
        <div className="numrow"><Din v={g.rendeu_hoje_liquido} tam="hero" /></div>
        {g.motivo_zero
          ? <p className="guard-motivo">{g.motivo_zero}</p>
          : <p className="apoio">Já sem o imposto. É o que entrou a mais no seu dinheiro guardado hoje.</p>}
        <dl className="guard-3">
          <div><dt>Neste mês</dt><dd><Din v={g.rendeu_mes_liquido} /></dd></div>
          <div><dt>Desde o início</dt><dd><Din v={g.rendeu_desde_inicio_liquido} /></dd></div>
          <div className="tot"><dt>{doOutro.size ? 'A família tem guardado' : 'Você tem guardado'}</dt><dd><Din v={g.total} /></dd></div>
        </dl>
        {g.seu_total != null && (doOutro.size > 0 || (g.casal_total || 0) > 0) && <p className="guard-dono"><span>No seu nome <b>{reais(g.seu_total)}</b></span>{[...doOutro].map(([n, v]) => <span key={n} data-do-outro={n}>No nome de {n} <b>{reais(v)}</b></span>)}{(g.casal_total || 0) > 0 && <span>Do casal <b>{reais(g.casal_total || 0)}</b></span>}</p>}
        {meses > 0 && <p className="sub guard-meses">O que está no seu nome cobre <b>{meses === 1 ? '1 mês' : `${meses} meses`}</b> do seu combinado de {reais(meuLim)}.</p>}
        <button type="button" className="explica-l" onClick={abrirConta}><HelpCircle size={18} aria-hidden="true" /> De onde veio esse número?</button>
      </section>

      <div className="guard-acoes">
        <button className="btn primary" type="button" disabled={!minhas.length} onClick={() => setFolha({ tipo: 'aporte' })}><ArrowDownToLine size={20} />Guardar dinheiro</button>
        <button className="btn line" type="button" disabled={!minhas.length} onClick={() => setFolha({ tipo: 'resgate' })}><ArrowUpFromLine size={20} />Tirar dinheiro</button>
        <button className="btn line" type="button" onClick={() => setFolha({ tipo: 'nova' })}><Plus size={20} />Nova aplicação</button>
      </div>

      <div className="tela-larga">
        <div className="col">
          <section className="card" aria-labelledby="g30">
            <div className="card-h"><h2 id="g30">Últimos 30 dias</h2></div>
            <div className="seg compacta" role="group" aria-label="O que mostrar" style={{ marginBottom: 12 }}>
              <button type="button" aria-pressed={grafico === 'saldo'} onClick={() => setGrafico('saldo')}>Quanto tenho</button>
              <button type="button" aria-pressed={grafico === 'dia'} onClick={() => setGrafico('dia')}>Rendeu por dia</button>
            </div>
            {grafico === 'saldo' && g.saldo_30 ? <LinhaSaldo s={g.saldo_30} /> : <>
            <div className="barras30" role="img" aria-label={`Rendimento de cada um dos últimos 30 dias. O maior dia rendeu ${reais(Math.max(...g.por_dia_30.map(d => d.liquido)))}.`}>
              {barras.map(b => <i key={b.data} className={(b.util ? '' : 'folga') + (b.data === g.por_dia_30[g.por_dia_30.length - 1]?.data ? ' hoje' : '')} style={{ height: b.util ? `${Math.max(b.altura, 3)}%` : undefined }} title={`${dataCurta(b.data)}: ${b.util ? reais(b.liquido) : 'não rende'}`} />)}
            </div>
            <div className="barras30-pe"><span>{dataCurta(g.por_dia_30[0]?.data || hojeRecife())}</span><span>hoje</span></div>
            <div className="leg" style={{ marginTop: 10 }}>
              <span><i className="q" />dia útil: rendeu</span>
              <span><i className="q hoje" />hoje</span>
              {temFolga && <span><i className="q folga" />sábado, domingo e feriado: não rende</span>}
            </div></>}
          </section>
        </div>
        <div className="col">
          <section className="card" aria-labelledby="gApps">
            <div className="card-h"><h2 id="gApps">Onde está guardado</h2>
              {/* B15: as palavras do banco em 1 frase simples cada */}
              <button type="button" className="lnk" onClick={() => explicar({ cabeca: 'O que quer dizer cada palavra?', titulo: 'As palavras do banco, em 1 frase cada', linhas: [], nota: PALAVRAS })}><HelpCircle size={16} />O que é CDB, CDI, LCA?</button>
            </div>
            <ul className="list">
              {g.aplicacoes.map(a => (
                <li key={a.id} {...(aplicacaoMinha(a, familia) ? {} : { 'data-do-outro': a.titular_nome || 'outra pessoa' })}>
                  <button className="li" type="button" onClick={() => setFolha({ tipo: 'app', app: a })} aria-label={`${a.nome}${aplicacaoMinha(a, familia) ? '' : `, no nome de ${a.titular_nome || 'outra pessoa'}`}: rendeu hoje ${reais(a.rendeu_hoje_liquido)}, tem ${reais(a.saldo)}. Abrir.`}>
                    <span className="tile"><Landmark size={20} /></span>
                    <span className="m"><b>{a.nome}</b>{a.titular !== undefined && <small className="dono">{a.titular_nome ? `no nome de ${a.titular_nome}` : 'do casal'}</small>}<small>{rendeQuanto(a, true)} · {a.liquidez === 'diaria' ? 'tira quando quiser' : a.vence_em ? `vence ${dataCurta(a.vence_em)}` : 'só no vencimento'}</small><small>Tem {reais(a.saldo)}</small></span>
                    <span className="v guard-v"><small>rendeu hoje</small><Din v={a.rendeu_hoje_liquido} /></span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          {saida && saida.avisos_fgc.length > 0 && <AvisoFGC avisos={saida.avisos_fgc} />}
          <p className="sub guard-taxa"><Droplets size={18} aria-hidden="true" /><span>{taxaTexto(g)}</span></p>
        </div>
      </div>

      {folha?.tipo === 'nova' && <NovaAplicacao fechar={() => setFolha(null)} />}
      {(folha?.tipo === 'aporte' || folha?.tipo === 'resgate') && <Movimentar g={{ ...g, aplicacoes: minhas }} tipo={folha.tipo} inicial={folha.app} fechar={() => setFolha(null)} />}
      {folha?.tipo === 'app' && <Aplicacao a={folha.app} fechar={() => setFolha(null)} mover={tipo => setFolha({ tipo, app: folha.app })} />}
    </div>
  )
}

/** B15: as palavras do Guardado em 1 frase simples cada (fica no "O que é CDB, CDI, LCA?"). */
const PALAVRAS = 'CDI: a taxa que os bancos usam entre si; o que rende é medido por ela (100% do CDI = rende igual a essa taxa). CDB: você empresta dinheiro pro banco e ele te devolve com rendimento. LCA e LCI: parecido com o CDB, mas sem imposto de renda; o dinheiro vai pra agricultura ou pra imóveis. Tesouro Selic: você empresta pro governo; dá pra tirar quase quando quiser. Caixinha: o cofrinho do app do banco; rende todo dia e dá pra tirar na hora. Reserva: o dinheiro que a família combinou nunca gastar (fica de fora do número de hoje). Guardado: o que entra a mais vem pra cá, rende e conta pra 2029.'
/** "Taxa usada: CDI de 10/11, 13,65% ao ano (0,050788% por dia útil). Fonte: Banco Central." */
function taxaTexto(g: GuardadoHoje): string {
  const c = g.cdi_usado
  if (!c.pct_ano) return 'Taxa usada: ainda sem a taxa do dia.'
  const fonte = /manual/i.test(c.fonte) ? 'digitada à mão, com o valor do Banco Central' : c.fonte || 'Banco Central'
  return `Taxa usada: CDI (a taxa que os bancos usam pra pagar quem guarda dinheiro)${c.data ? ` de ${dataCurta(c.data)}` : ''}, ${pct(c.pct_ano)} ao ano (${pct(cdiDiaDoAno(c.pct_ano) * 100, 6)} por dia útil). Fonte: ${fonte}.`
}

function GuardadoVazio({ g, comecar }: { g: GuardadoHoje; comecar: () => void }) {
  const ex = exemploVazio(g.cdi_usado.pct_ano ? cdiDiaDoAno(g.cdi_usado.pct_ano) : CDI_DIA_PADRAO)
  return (
    <div className="view">
      <section className="card guard-hoje">
        <h2 className="lbl">Rendeu hoje</h2>
        <div className="numrow"><Din v={0} tam="hero" /></div>
        <p className="guard-motivo">Ainda não tem nada guardado aqui. Diga onde o dinheiro está e o app mostra, todo dia, quanto ele rendeu.</p>
        <div className="guard-ex">
          <p><b>Exemplo de conta:</b> {reais(ex.valor)} guardados numa caixinha que paga 100% do CDI (a taxa que os bancos usam pra pagar quem guarda dinheiro) rendem perto de <b>{reais(ex.porDia)} por dia útil</b> e <b>{reais(ex.porMes)} por mês</b>, já sem o imposto.</p>
          <p className="sub">{TORNEIRA}</p>
        </div>
        <button className="btn primary" type="button" onClick={comecar}><Plus size={20} />Começar a guardar</button>
      </section>
    </div>
  )
}

const TIPOS: TipoAplicacao[] = ['caixinha', 'cdb', 'lci_lca', 'tesouro_selic', 'poupanca']

/** Nova aplicação em 4 campos: onde está, que tipo é, quanto rende e quanto tem lá. */
function NovaAplicacao({ fechar }: { fechar: () => void }) {
  const { api, familia, tentar, recarregar, toast } = useApp()
  const [titular, setTitular] = useState<'eu' | 'casal'>('eu')
  // E3 (conserto 8): família de 1 adulto não tem "Do casal"
  const adultos = useAdultos()
  const sozinho = adultos === 1
  const [banco, setBanco] = useState('')
  const [tipo, setTipo] = useState<TipoAplicacao>('caixinha')
  const [rende, setRende] = useState('100')
  const [valor, setValor] = useState('')
  const [vence, setVence] = useState('')
  const [erro, setErro] = useState('')
  const [gravando, setGravando] = useState(false)
  const trava = useMemo(() => umaPorVez(async (f: () => Promise<void>) => f()), [])
  const comPrazo = tipo === 'cdb' || tipo === 'lci_lca'
  const salvar = () => trava(async () => {
    if (!familia) return
    const p = Number(rende.replace(',', '.'))
    if (!banco.trim()) { setErro('Diga em que banco ou app o dinheiro está.'); return }
    if (tipo !== 'poupanca' && !(p > 0 && p <= 300)) { setErro('Quanto rende: um número como 100 ou 110 (é o que aparece no app do banco como "% do CDI").'); return }
    if (!valorDigitadoValido(valor) || textoParaValor(valor) <= 0) { setErro('Digite quanto tem lá hoje, por exemplo 5.000.'); return }
    setErro(''); setGravando(true)
    // não repete o tipo quando a pessoa já escreveu ("Caixinha da Ana" não vira "Caixinha Caixinha da Ana")
    const nome = banco.trim().toLowerCase().startsWith(ROTULO_TIPO[tipo].toLowerCase()) ? banco.trim() : `${ROTULO_TIPO[tipo]} ${banco.trim()}`
    // C2 (revisão E0): "Do casal" vai explícito (do_casal); "no meu nome" vai sem titular e o banco usa quem está criando
    const ok = await tentar(() => api.guardadoCriar(familia.id, { nome, banco: banco.trim(), tipo, pct_cdi: tipo === 'poupanca' ? 0 : p, valor_inicial: textoParaValor(valor), data: hojeRecife(), vence_em: comPrazo && vence ? vence : null, ...(titular === 'casal' && !sozinho ? { do_casal: true } : {}) }))
    setGravando(false)
    if (ok) { fechar(); toast(`${nome} guardado. O rendimento aparece aqui todo dia útil.`); await recarregar() }
  })
  return (
    <Sheet titulo="Nova aplicação" fechar={fechar}>
      {sozinho ? <p className="sub">Fica no seu nome ({familia?.membroNome}). A garantia do fundo dos bancos (até R$ 250 mil) conta por pessoa.</p> : (
      <div className="campo"><span id="gDono">No nome de quem</span>
        <div className="pills" role="group" aria-labelledby="gDono">
          <button type="button" className="pill" aria-pressed={titular === 'eu'} onClick={() => setTitular('eu')}>No meu nome ({familia?.membroNome})</button>
          <button type="button" className="pill" aria-pressed={titular === 'casal'} onClick={() => setTitular('casal')}>Do casal</button>
        </div>
        <small>É de quem é o CPF da aplicação. A garantia do fundo dos bancos (até R$ 250 mil) conta por pessoa. No nome do outro, só ele cadastra.</small>
      </div>)}
      <label className="campo"><span>Onde o dinheiro está</span><input className="inp" value={banco} maxLength={40} placeholder="Ex.: Inter, Itaú, Banco do Brasil" onChange={e => setBanco(e.target.value)} /></label>
      <div className="campo"><span id="gTipo">Que tipo é</span>
        <div className="pills" role="group" aria-labelledby="gTipo">
          {TIPOS.map(t => <button key={t} type="button" className="pill" aria-pressed={tipo === t} onClick={() => setTipo(t)}>{ROTULO_TIPO[t]}</button>)}
        </div>
        <small>{tipo === 'caixinha' ? 'Caixinha, cofrinho ou conta que rende: tira quando quiser.' : tipo === 'cdb' ? 'CDB: você empresta pro banco e ele paga um percentual da taxa dos bancos. Tem imposto de renda, que diminui com o tempo.' : tipo === 'lci_lca' ? 'LCI ou LCA: não paga imposto de renda.' : tipo === 'tesouro_selic' ? 'Tesouro Selic: você empresta pro governo. Rende perto de 100% da taxa dos bancos.' : 'Poupança: rende 0,5% ao mês (regra atual), sem imposto. O app mostra como estimativa.'}</small>
      </div>
      {tipo !== 'poupanca' && <label className="campo"><span>Quanto rende, em % do CDI (a taxa que os bancos usam)</span><input className="inp" inputMode="decimal" value={rende} onChange={e => setRende(e.target.value.replace(/[^\d,.]/g, ''))} /><small>Está no app do banco, do lado do nome: "100% do CDI", "110% do CDI". Não sabe? Deixe 100.</small></label>}
      <div className="campo"><span>Quanto tem lá hoje</span><CampoValor valor={valor} mudar={setValor} rotulo="Quanto tem lá hoje" /></div>
      {comPrazo && <label className="campo"><span>Vence em (se tiver data)</span><input className="inp" type="date" value={vence} min={hojeRecife()} onChange={e => setVence(e.target.value)} /><small>15 dias antes, o Escritório pergunta se você quer renovar ou resgatar.</small></label>}
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button className="btn primary full" type="button" disabled={gravando} onClick={salvar}>Guardar</button>
    </Sheet>
  )
}

/** Guardar mais ou tirar dinheiro de uma aplicação que já existe. O app só anota: o dinheiro se move no app do banco. */
function Movimentar({ g, tipo, inicial, fechar }: { g: GuardadoHoje; tipo: 'aporte' | 'resgate'; inicial?: GuardadoAplicacao; fechar: () => void }) {
  const { api, tentar, recarregar, toast } = useApp()
  const [appId, setAppId] = useState(inicial?.id || g.aplicacoes[0]?.id || '')
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState('')
  const [gravando, setGravando] = useState(false)
  const trava = useMemo(() => umaPorVez(async (f: () => Promise<void>) => f()), [])
  const toque = useMemo(() => criarChaveToque(), [])
  const app = g.aplicacoes.find(a => a.id === appId)
  const salvar = () => trava(async () => {
    if (!app) return
    const v = textoParaValor(valor)
    if (!valorDigitadoValido(valor) || v <= 0) { setErro('Digite o valor, por exemplo 500.'); return }
    if (tipo === 'resgate' && v > app.saldo + 0.005) { setErro(`Só tem ${reais(app.saldo)} em ${app.nome}.`); return }
    setErro(''); setGravando(true)
    const data = hojeRecife()
    // 1 chave por toque: se a internet cair no meio e a pessoa tocar de novo, o banco não grava em dobro
    const chave = toque.para([app.id, tipo, v, data].join('|'))
    const ok = await tentar(() => api.guardadoMovimentar(app.id, tipo, v, data, chave))
    setGravando(false)
    if (ok) {
      toque.gravou(); fechar()
      // R12: errou o valor? 10 s pra desfazer (banco: guardado_desfazer)
      toast(tipo === 'aporte' ? `${reais(v)} guardados em ${app.nome}.` : `${reais(v)} tirados de ${app.nome}.`, api.guardadoDesfazer ? async () => { await api.guardadoDesfazer!(app.id, chave); await recarregar() } : undefined)
      await recarregar()
    }
  })
  return (
    <Sheet titulo={tipo === 'aporte' ? 'Guardar dinheiro' : 'Tirar dinheiro'} fechar={fechar}>
      <p className="sub">{tipo === 'aporte' ? 'Fez a transferência no app do banco? Anote aqui pra o rendimento contar certo.' : 'Tirou no app do banco? Anote aqui pra o saldo bater.'}</p>
      {g.aplicacoes.length > 1 && (
        <div className="campo"><span id="gOnde">{tipo === 'aporte' ? 'Onde guardou' : 'De onde tirou'}</span>
          <div className="pills" role="group" aria-labelledby="gOnde">{g.aplicacoes.map(a => <button key={a.id} type="button" className="pill" aria-pressed={a.id === appId} onClick={() => setAppId(a.id)}>{a.nome}</button>)}</div>
        </div>
      )}
      <div className="campo"><span>Quanto</span><CampoValor valor={valor} mudar={setValor} rotulo="Quanto" />{app && <small>Hoje tem {reais(app.saldo)} em {app.nome}.</small>}</div>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button className="btn primary full" type="button" disabled={gravando || !app} onClick={salvar}>{tipo === 'aporte' ? 'Anotar o que guardei' : 'Anotar o que tirei'}</button>
    </Sheet>
  )
}

function Aplicacao({ a, fechar, mover }: { a: GuardadoAplicacao; fechar: () => void; mover: (t: 'aporte' | 'resgate') => void }) {
  const { api, familia, tentar, recarregar, toast } = useApp()
  const minha = aplicacaoMinha(a, familia)
  const [certeza, setCerteza] = useState(false)
  const encerrar = async () => {
    if (!certeza) { setCerteza(true); return }
    const ok = await tentar(() => api.guardadoEncerrar(a.id))
    if (ok) { fechar(); toast(`${a.nome} encerrada. O histórico continua guardado.`); await recarregar() }
  }
  return (
    <Sheet titulo={a.nome} fechar={fechar}>
      <ul className="exp">
        <li><span>Tem guardado</span><Din v={a.saldo} /></li>
        <li><span>Rendeu hoje, já sem o imposto</span><Din v={a.rendeu_hoje_liquido} /></li>
        <li><span>Rendeu neste mês</span><Din v={a.rendeu_mes_liquido} /></li>
      </ul>
      <p className="sub"><b>{ROTULO_TIPO[a.tipo]}</b> no {a.banco}, {rendeQuanto(a)}. {a.ir_faixa > 0 ? `Imposto de renda de ${pct(a.ir_faixa, 1).replace(',0%', '%')} sobre o rendimento (cai quanto mais tempo fica guardado).` : 'Não paga imposto de renda.'} {a.liquidez === 'diaria' ? 'Pode tirar quando quiser.' : a.vence_em ? `Vence em ${dataBr(a.vence_em)}.` : 'Só sai no vencimento.'} {a.fgc_ok ? (a.tipo === 'tesouro_selic' ? 'Garantido pelo governo federal.' : 'Protegido pelo fundo que devolve até R$ 250 mil por banco se o banco quebrar.') : 'Atenção: passou de R$ 250 mil neste banco. Acima disso, o fundo que protege quem guarda dinheiro não cobre.'}</p>
      {/* E2: no nome do outro é só pra ler (o banco também tranca) */}
      {!minha ? <p className="todo" data-do-outro={a.titular_nome || 'outra pessoa'}><span>Está no nome de <b>{a.titular_nome || 'outra pessoa'}</b>. Guardar, tirar e encerrar aqui é só com {a.titular_nome || 'quem é o titular'}.</span></p> : <>
      <div className="row-btns">
        <button className="btn primary" type="button" onClick={() => mover('aporte')}><ArrowDownToLine size={20} />Guardar mais</button>
        <button className="btn line" type="button" onClick={() => mover('resgate')}><ArrowUpFromLine size={20} />Tirar</button>
      </div>
      <button className={'btn ghost danger' + (certeza ? ' on' : '')} type="button" onClick={encerrar}>{certeza ? 'Toque de novo pra encerrar' : 'Encerrar esta aplicação'}</button>
      {certeza && <p className="sub">Encerrar tira a aplicação da conta do Guardado. Use quando o dinheiro saiu todo de lá. Nada é apagado.</p>}</>}
    </Sheet>
  )
}

/** Cartão do Início: "Guardado R$ X · rendeu hoje R$ Y". Some se a pessoa não é do casal ou se o banco ainda não ligou. */
export function CartaoGuardado() {
  const { familia } = useApp()
  const { g, estado } = useGuardado()
  if (familia?.papel !== 'casal' || estado === 'desligado' || !g) return null
  const vazio = !g.aplicacoes.length
  return (
    <a className="card guard-card" href="#/guardado" aria-label={vazio ? 'Guardado: começar a guardar' : `Guardado: ${reais(g.total)}. Rendeu hoje ${reais(g.rendeu_hoje_liquido)}. Abrir.`}>
      <span className="tile"><Landmark size={20} /></span>
      {vazio ? (
        <span className="m"><b>Guardado</b><small>Diga onde o dinheiro está e veja quanto ele rende por dia.</small></span>
      ) : (
        <span className="m">
          <span className="guard-l"><span>Guardado</span><Din v={g.total} /></span>
          <span className="guard-l dest"><span>Rendeu hoje</span><Din v={g.rendeu_hoje_liquido} /></span>
          {g.motivo_zero && <small>{g.motivo_zero}</small>}
        </span>
      )}
      <ChevronRight size={20} className="muted" aria-hidden="true" />
    </a>
  )
}

/** G10: a linha do saldo subindo nos últimos 30 dias (SVG simples, sem biblioteca). */
function LinhaSaldo({ s }: { s: { data: string; saldo: number }[] }) {
  const v = s.filter(x => x.saldo > 0)
  if (v.length < 2) return <p className="sub">Ainda sem 30 dias de histórico.</p>
  const min = Math.min(...v.map(x => x.saldo)), max = Math.max(...v.map(x => x.saldo))
  const W = 300, H = 110, folga = Math.max(1, (max - min) * 0.15)
  const y = (x: number) => H - 8 - ((x - (min - folga)) / (max - min + 2 * folga)) * (H - 16)
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * W},${y(x.saldo).toFixed(1)}`).join(' ')
  const cresceu = v[v.length - 1].saldo - v[0].saldo
  return (
    <figure className="linha-saldo" aria-label={`Saldo foi de ${reais(v[0].saldo)} pra ${reais(v[v.length - 1].saldo)} em 30 dias`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-hidden="true">
        <polyline points={`0,${H} ${pts} ${W},${H}`} className="area" />
        <polyline points={pts} className="linha" />
      </svg>
      <figcaption className="barras30-pe"><span>{dataCurta(v[0].data)}: {reais(v[0].saldo)}</span><span>hoje: {reais(v[v.length - 1].saldo)}</span></figcaption>
      <p className="sub" style={{ marginTop: 8 }}>{cresceu > 0 ? <>Cresceu <b>{reais(cresceu)}</b> em 30 dias, somando o que rendeu e o que entrou.</> : 'Ficou parado nestes 30 dias.'}</p>
    </figure>
  )
}

/** E7 (F10): as frases do aviso do FGC, uma por banco e pessoa, a partir do que o motor devolveu (sem conta aqui). */
export function frasesFGC(avisos: FuturoSaida['avisos_fgc']): string[] {
  return avisos.map(a => {
    const quem = a.titular ? `no nome de ${a.titular}` : 'do casal'
    return a.banco === TODOS_OS_BANCOS
      ? `Somando todos os bancos, ${quem} passa ${reais(a.fora / 100)} do teto de R$ 1 milhão que o fundo garante por pessoa a cada 4 anos.`
      : `No banco ${a.banco}, ${quem}: ${reais(a.fora / 100)} ficam fora da garantia (até R$ 250 mil por pessoa e banco).`
  })
}

/** Só avisa: não muda onde o dinheiro está (premissa 5 do TIME.md). */
function AvisoFGC({ avisos }: { avisos: FuturoSaida['avisos_fgc'] }) {
  const f = frasesFGC(avisos)
  return (
    <section className="todo warn aviso-fgc" aria-labelledby="gFgc" style={{ marginBottom: 12 }}>
      <ShieldAlert size={20} aria-hidden="true" />
      <span><b id="gFgc">Aviso do fundo que protege quem guarda dinheiro (FGC).</b> Se um banco quebrar, ele devolve até R$ 250 mil por pessoa em cada banco.
        <ul className="fgc-lista">{f.map((x, i) => <li key={i}>{x}</li>)}</ul>
        É só um aviso: o dinheiro continua onde está. Repartir entre bancos deixa tudo dentro da garantia.</span>
    </section>
  )
}
