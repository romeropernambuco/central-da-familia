import { useEffect, useMemo, useRef, useState } from 'react'
import { criarChaveToque, umaPorVez } from '../../lib/seguro'
import { ErroSessao } from '../../api/erros'
import { Delete, Camera, ArrowDownToLine, Trash2, Check } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useGuardado } from '../../app/useDados2'
import { useConfig } from '../../app/useConfig'
import { Sheet } from '../../componentes/base'
import type { Cartao, ResumoHoje } from '../../api/tipos'
import { centavos, dataBr, dataCurta, diaSemana, hojeRecife, mesLongo, reais, segundosDesde, simularCompra, somaDias, tecla, textoParaValor, valorComCentavos } from '../../lib/formato'
import { reduzirFoto } from '../../lib/foto'
import { numeroEnvelope } from '../../componentes/EnvelopeCard'
import { parcelasDe } from '../../lib/plano'
import { LerCupom } from '../../componentes/LerCupom'
import { Impacto2029 } from '../../componentes/Impacto2029'
import { acharCartao } from '../../lib/atalho'
import { aplicacaoMinha, cartaoMeu, escreveNo } from '../../app/dono'

const PARCELAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/** O que fica pra ela depois do gasto, numa frase (R9: sem segundos, sem "custou de rendimento"). */
function fraseDepois(r: ResumoHoje | undefined, envelope: string, valor: number, nome: string, parcelas: number, desc?: string): string {
  const e = r?.envelopes.find(x => x.id === envelope)
  // E4 (decisão do dono, TIME.md): cada parcela sai no dia 1 do mês da fatura dela; neste mês (o da compra) não conta nada
  if (parcelas > 1) return `${reais(valor)} em ${parcelas}x em ${nome}: ${reais(parcelasDe(valor, parcelas)[parcelas - 1])} por mês, cada parcela no dia 1 do mês da fatura dela. O que você pode gastar hoje não muda.`
  const parte = `${reais(valor)} em ${nome}.`
  if (!e) return parte
  // E1 (rodada 2): gasto grande (10% do mês e no mínimo R$ 150) ganha a conta do resto do mês, sem culpa
  const lim = e.limite_base ?? e.limite_mes, conta = valor
  if (!e.casa && lim > 0 && conta >= Math.max(150, lim * 0.1) && e.livre >= 0) {
    const pct = Math.round((conta / lim) * 100), dias = Number(hojeRecife().slice(8)) <= 0 ? 0 : Math.max(1, (r?.dias_restantes || 1))
    return `${desc ? cap(desc) : 'Esse gasto'} de ${reais(conta)} é ${pct}% do seu mês de ${reais(lim)}. Ele entra 1 vez só: os ${dias === 1 ? 'dia que falta fica' : `${dias} dias que faltam ficam`} com ${reais(centavos(e.livre / dias))} por dia, em média.`
  }
  if (e.regra === 'diario') {
    if (e.livre < 0) return `${parte} O mês passou ${reais(-e.livre)} do combinado: sai do mês que vem.`
    // E3 (conserto 5): a mesma frase do Início: quanto já saiu hoje e quanto ainda pode
    return `${parte} Hoje já saiu ${reais(e.gasto_hoje || 0)}. Ainda pode hoje ${reais(e.valor_dia || 0)}${e.amanha != null ? `; amanhã, ${reais(e.amanha)}` : ''}.`
  }
  if (e.regra === 'mensal' && !e.casa && e.livre >= 0 && e.gasto_hoje != null) return `${parte} Hoje já saiu ${reais(e.gasto_hoje)}. Ainda pode hoje ${reais(e.hoje || 0)}.`
  // E3 (conserto 10): quem passou lê "passou R$ X", nunca "livre R$ 0"
  if (e.regra === 'semanal') { const l = centavos((e.teto_semana || 0) - (e.gasto_semana || 0)); return l < 0 ? `${parte} A semana passou ${reais(-l)}. Na segunda começa uma semana nova.` : `${parte} Ainda livre nesta semana: ${reais(l)}.` }
  return e.livre < 0 ? `${parte} O mês passou ${reais(-e.livre)} do combinado: sai do mês que vem.` : `${parte} Ainda livre no mês: ${reais(e.livre)}.`
}

/** Lançar: valor + 1 toque no envelope. Também corrige um lançamento (R12) e anota dinheiro que entrou (R11). */
export function Lancar() {
  const { api, familia, resumo, fecharLancar, lancarAberto, toast, recarregar, tentar, oculto } = useApp()
  const corr = lancarAberto?.corrigir
  const inicio = useRef(performance.now())
  const [modo, setModo] = useState<'gasto' | 'entrou'>(lancarAberto?.entrou ? 'entrou' : 'gasto')
  const [txt, setTxt] = useState(corr ? valorComCentavos(corr.valor) : lancarAberto?.valor ? (lancarAberto.atalho ? valorComCentavos(lancarAberto.valor) : String(lancarAberto.valor).replace('.', ',')) : '')
  // B9: ao corrigir, o valor antigo vem selecionado: o 1º número digitado já substitui (sem apagar 4 vezes)
  const [selecionado, setSelecionado] = useState(!!corr)
  const digitar = (t: string) => { setTxt(x => tecla(selecionado ? '' : x, t === 'apagar' && selecionado ? 'apagar' : t)); setSelecionado(false) }
  const hoje = hojeRecife()
  const [quando, setQuando] = useState<string>(corr ? corr.data : lancarAberto?.quando === 'ontem' ? somaDias(hoje, -1) : hoje)
  const [cartao, setCartao] = useState<string | null>(corr ? corr.cartao_id : null)
  const [parcelas, setParcelas] = useState(corr?.parcelas || 1)
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [desc, setDesc] = useState(corr ? corr.descricao || '' : lancarAberto?.descricao || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const equipe = familia?.papel === 'equipe'
  const casal = familia?.papel === 'casal'
  const [cupom, setCupom] = useState(false)

  const atalho = !corr ? lancarAberto?.atalho : undefined
  const [cartaoAtalho, setCartaoAtalho] = useState<'achou' | 'nao achou' | null>(null)
  useEffect(() => { if (familia && !equipe) api.cartoes(familia.id).then(cs => {
    const meus = cs.filter(x => cartaoMeu(x, familia) || x.id === corr?.cartao_id)
    setCartoes(meus)
    // E9: o cartão que o iPhone mandou, se for um dos seus (o do outro nunca entra)
    if (atalho?.cartao) { const c = acharCartao(meus, atalho.cartao); if (c) setCartao(c.id); setCartaoAtalho(c ? 'achou' : 'nao achou') }
  }).catch(() => {}) }, [api, familia?.id, equipe])
  const digitarRef = useRef(digitar)
  digitarRef.current = digitar
  // teclado físico no computador
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (/^\d$/.test(e.key)) digitarRef.current(e.key)
      else if (e.key === ',' || e.key === '.') digitarRef.current(',')
      else if (e.key === 'Backspace') digitarRef.current('apagar')
    }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [])

  const valor = textoParaValor(txt)
  // E2: lança só no seu, na Casa e no sem dono; o limite do outro é só pra ler
  const envs = (resumo?.envelopes || []).filter(e => (!equipe || e.casa) && escreveNo(e, familia))
  // o limite de quem lança vem primeiro (G8); se abriu de um envelope, ele vem antes
  const primeiro = corr?.envelope_id || lancarAberto?.envelope || familia?.envelopeId
  const ordem = [...envs].sort((a, b) => (a.id === primeiro ? -1 : b.id === primeiro ? 1 : 0))
  const c = cartoes.find(x => x.id === cartao)
  // E4: o cartão precisa do dia que fecha e do dia que vence pra parcelar (igual ao banco)
  const temDias = !!(c?.dia_fechamento && c?.dia_vencimento)
  const sim = c && temDias && parcelas > 1 && valor > 0 ? simularCompra(valor, parcelas, quando, c.dia_fechamento!, c.dia_vencimento!) : []
  const venceEm = (mes: string) => { const [a, m] = mes.split('-').map(Number); return `${mes}-${String(Math.min(c?.dia_vencimento || 1, new Date(Date.UTC(a, m, 0)).getUTCDate())).padStart(2, '0')}` }
  // o que conta NESTE mês: à vista, o valor todo; parcelado, só a parcela cuja fatura é deste mês (quase sempre nada)
  const contaNoMes = (v: number) => (sim.length ? centavos(sim.filter(p => p.mes === hoje.slice(0, 7)).reduce((t, p) => t + p.valor, 0)) : v)

  const meuLim = (() => { const e = resumo?.envelopes.find(x => x.id === familia?.envelopeId); return e ? e.limite_base ?? e.limite_mes : 0 })()
  const gastoGrande = valor > 0 && valor >= Math.max(150, meuLim * 0.1)
  // trava do duplo toque: vale no mesmo instante do 1º toque, antes de a tela redesenhar o botão desligado
  const trava = useMemo(() => umaPorVez((f: () => Promise<void>) => f()), [])
  // 1 chave por lançamento: se a internet cai no meio e a pessoa toca de novo, vai a mesma chave e o banco não grava em dobro
  const toque = useMemo(() => criarChaveToque(), [])
  // E3 (conserto 10): valor maior que o mês inteiro do limite pede confirmação antes de salvar (ex.: R$ 28.650 digitado sem vírgula)
  const [confirmar, setConfirmar] = useState<{ envelope: string; nome: string; mes: number } | null>(null)
  const salvar = (envelope: string, nome: string, certeza = false) => {
    const e = resumo?.envelopes.find(x => x.id === envelope), mes = e ? e.limite_base ?? e.limite_mes : 0
    if (!certeza && !equipe && mes > 0 && valor > mes) { setConfirmar({ envelope, nome, mes }); return }
    setConfirmar(null)
    return trava(() => (corr ? corrigir(envelope, nome) : gravar(envelope, nome)))
  }
  async function gravar(envelope: string, nome: string) {
    if (!familia || valor <= 0) return
    setSalvando(true); setErro('')
    try {
      const s = segundosDesde(inicio.current, performance.now())
      const p = cartao ? parcelas : 1
      // B10: nada salva como "Gasto": sem nome vira "Gasto de quarta 18/11" (o dia ajuda a lembrar depois)
      const descricao = desc.trim() || `Gasto de ${diaSemana(quando)} ${dataCurta(quando)}`
      const chave = toque.para([envelope, valor, quando, descricao, cartao || '', p].join('|'))
      const r = await api.lancar({ familia: familia.id, envelope, valor, data: quando, descricao, cartao, parcelas: p, segundos: s, chave })
      toque.gravou()
      ;(window as any).__ultimoTempoLancar = s
      fecharLancar()
      await recarregar()
      toast(equipe ? `Compra anotada em ${nome}.` : fraseDepois(r.resumo, envelope, valor, nome, p, desc.trim()), async () => { await api.apagarLancamento(r.lancamento.id); await recarregar() })
    } catch (e) {
      setSalvando(false)
      if (e instanceof ErroSessao) { await tentar(async () => { throw e }); return }
      setErro((e as Error).message)
    }
  }
  async function corrigir(envelope: string, nome: string) {
    if (!corr || !api.corrigirLancamento || valor <= 0) return
    setSalvando(true); setErro('')
    const antes = { valor: corr.valor, descricao: corr.descricao || '', data: corr.data, envelope: corr.envelope_id, cartao: corr.cartao_id, parcelas: corr.parcelas || 1 }
    try {
      await api.corrigirLancamento(corr.id, { valor, descricao: desc.trim(), data: quando, envelope, cartao, parcelas: cartao ? parcelas : 1 })
      fecharLancar()
      await recarregar()
      toast(`Corrigido: ${reais(valor)} em ${nome}.`, async () => { await api.corrigirLancamento!(corr.id, antes); await recarregar() })
    } catch (e) { setSalvando(false); setErro((e as Error).message) }
  }

  // A1: a equipe da casa nunca vê R$: a folha dela pergunta o que comprou e pede a foto da nota
  if (equipe) return <AnotarCompra />
  if (cupom) return <LerCupom fechar={fecharLancar} envelopePadrao={lancarAberto?.envelope} />
  async function apagarEste() {
    if (!corr) return
    const ok = await tentar(() => api.apagarLancamento(corr.id))
    if (!ok) return
    fecharLancar(); await recarregar()
    toast(`${reais(corr.valor)} foi pra lixeira.`, async () => { await api.restaurarLancamento(corr.id); await recarregar() })
  }

  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'apagar']
  const [int, dec] = txt.split(',')
  const visor = (
    <>
      <div className="amount">
        <span className="lab">{modo === 'entrou' ? 'Quanto entrou?' : corr ? 'Valor certo' : 'Quanto gastou?'}</span>
        <output className={(valor ? '' : 'zero') + (selecionado ? ' selecionado' : '')} aria-live="polite" aria-label={oculto ? 'Valor escondido' : 'Valor ' + reais(valor)}>
          <span className="cur">R$</span><span className="num">{oculto && valor ? '•••' : <>{(int || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}{dec !== undefined ? ',' + dec : ''}</>}</span>
        </output>
        {selecionado && <small className="sub">Digite o valor certo: o antigo some no 1º número.</small>}
        {oculto && valor > 0 && <small className="sub">Valores escondidos. Toque no olho, lá em cima, pra ver o que digitou.</small>}
      </div>
      {/* B10: o "O que foi?" fica à vista, logo abaixo do valor */}
      {modo === 'gasto' && <input className="inp lanc-o-que" placeholder="O que foi? (ex.: Farmácia)" value={desc} onChange={e => setDesc(e.target.value)} aria-label="O que foi" />}
      <div className="keys" role="group" aria-label="Teclado">
        {teclas.map(t => (
          <button key={t} type="button" onClick={() => digitar(t)} aria-label={t === 'apagar' ? 'Apagar' : t}>
            {t === 'apagar' ? <Delete size={26} /> : t}
          </button>
        ))}
      </div>
    </>
  )
  const datas = corr && corr.data !== hoje && corr.data !== somaDias(hoje, -1) ? [corr.data, somaDias(hoje, -1), hoje] : [hoje, somaDias(hoje, -1)]
  return (
    <Sheet titulo={corr ? 'Corrigir lançamento' : modo === 'entrou' ? 'Entrou dinheiro' : 'Lançar'} fechar={fecharLancar} rotulo={corr ? 'Corrigir lançamento' : 'Lançar gasto'}>
      {casal && !corr && (
        <div className="seg compacta lancar-modo" role="group" aria-label="O que aconteceu">
          <button type="button" aria-pressed={modo === 'gasto'} onClick={() => setModo('gasto')}>Gastei</button>
          <button type="button" aria-pressed={modo === 'entrou'} onClick={() => setModo('entrou')}>Entrou dinheiro</button>
        </div>
      )}
      {/* E9: veio do Atalho do iPhone: nada foi salvo ainda */}
      {atalho && modo === 'gasto' && <p className={'todo ' + (atalho.erro ? 'warn' : 'ok') + ' atalho-aviso'} role="status"><span>{atalho.erro ? atalho.erro : 'Veio do Atalho do iPhone. Nada foi salvo: confira e toque no seu nome pra salvar.'}{cartaoAtalho === 'nao achou' ? ` O cartão "${atalho.cartao}" não é um dos seus cadastrados: ficou Pix ou dinheiro.` : ''}</span></p>}
      {modo === 'entrou' ? <EntrouDinheiro valor={valor} visor={visor} /> : (
        <>
          {/* a equipe não vê valores, então não lê cupom (o cupom mostra preços) */}
          {!equipe && !corr && <button className="btn line sm" type="button" style={{ justifySelf: 'start' }} onClick={() => setCupom(true)}><Camera size={18} />Ler cupom com foto</button>}
          {visor}
          <div className="atrow"><span className="atl">Quando</span>
            {datas.map(d => <button key={d} type="button" className="pill" aria-pressed={quando === d} onClick={() => setQuando(d)}>{d === hoje ? 'Hoje' : d === somaDias(hoje, -1) ? 'Ontem' : dataCurta(d)}</button>)}
          </div>
          {!equipe && cartoes.length > 0 && (
            <div className="atrow"><span className="atl">Pagou</span>
              <button type="button" className="pill" aria-pressed={cartao === null} onClick={() => { setCartao(null); setParcelas(1) }}>Pix ou dinheiro</button>
              {cartoes.map(x => <button key={x.id} type="button" className="pill" aria-pressed={cartao === x.id} onClick={() => setCartao(x.id)}>{x.nome}</button>)}
            </div>
          )}
          {c && (
            <div className="parcelas">
              <span className="atl">Em quantas vezes</span>
              <div className="pills parc" role="group" aria-label="Em quantas vezes">
                {PARCELAS.map(p => <button key={p} type="button" className="pill" aria-pressed={parcelas === p} disabled={p > 1 && !temDias} onClick={() => setParcelas(p)}>{p === 1 ? 'À vista' : `${p}x`}</button>)}
              </div>
              {!temDias && <p className="sub">O {c.nome} está sem o dia que a fatura fecha ou o dia que vence. Cadastre os 2 em Cartões pra parcelar.</p>}
              {/* E4 (conserto 7 com a decisão do dono): cada parcela no mês da fatura, com o dia do vencimento cadastrado */}
              {sim.length > 1 && <p className="sub parc-fatura"><b>{parcelas}x de {reais(sim[sim.length - 1].valor)}</b> nas faturas de {dataCurta(venceEm(sim[0].mes))} a {dataBr(venceEm(sim[sim.length - 1].mes)).replace(/^(\d\d\/\d\d)\/\d\d(\d\d)$/, '$1/$2')}. Cada parcela sai do seu limite no dia 1 do mês da fatura: {mesLongo(sim[0].mes + '-01')} a {mesLongo(sim[sim.length - 1].mes + '-01')}. {contaNoMes(valor) ? `Neste mês conta ${reais(contaNoMes(valor))}.` : 'Neste mês não conta nada.'}</p>}
            </div>
          )}
          {/* E7 (F6): gasto grande (10% do seu mês e no mínimo R$ 150, a mesma régua do aviso depois de salvar) mostra o custo em 2029 antes de salvar */}
          {casal && !corr && gastoGrande && <Impacto2029 valor={valor} prefixo="Gasto grande: se não estava no combinado, " className="lanc-impacto" />}
          <p className="lbl salvar-dica">{corr ? 'Toque no nome pra salvar a correção' : valor > 0 ? 'Toque no seu nome pra salvar' : 'Digite o valor e toque no seu nome pra salvar'}</p>
          <div className="envbtns">
            {ordem.map(e => {
              // equipe da casa não vê valor de dinheiro do envelope (decisão do dono)
              const n = resumo && !equipe ? numeroEnvelope(e, resumo.dias_restantes) : null
              // "depois fica" no jeito de cada limite: o dia (por dia), a semana ou o mês
              const agora = !n ? 0 : e.regra === 'diario' ? (e.hoje ?? n.valor) : n.valor
              const onde = e.regra === 'diario' ? ['hoje', 'do dia'] : e.regra === 'semanal' ? ['na semana', 'da semana'] : ['no mês', 'do mês']
              const conta = contaNoMes(valor)
              const depois = centavos(agora - conta)
              const linha = !n ? '' : valor > 0 && !corr && sim.length > 1 && !conta ? `${reais(agora)} ${n.rotulo}, não muda` : valor > 0 && !corr ? (depois >= 0 ? `depois fica ${reais(depois)} ${onde[0]}` : `passa ${reais(-depois)} ${onde[1]}`) : n.estado === 'devendo' ? (e.regra === 'semanal' ? `passou ${reais(n.devendo)} nesta semana` : `fica devendo ${reais(n.devendo)}`) : `${reais(agora)} ${n.rotulo}`
              return (
                <button key={e.id} type="button" className={'envbtn' + (e.id === familia?.envelopeId ? ' meu' : '')} disabled={valor <= 0 || salvando} onClick={() => salvar(e.id, e.nome)} aria-label={`${corr ? 'Salvar correção' : 'Salvar'} em ${e.nome}`}>
                  <b>{e.nome}</b>
                  <small className={valor > 0 && depois < 0 ? 'passa' : ''}>{linha}</small>
                </button>
              )
            })}
          </div>
          {confirmar && (
            <div className="todo warn confirmar-valor" role="alert"><span><b>{reais(valor)} é mais que o mês todo de {confirmar.nome} ({reais(confirmar.mes)}).</b> Está certo?</span>
              <span className="row-btns" style={{ marginTop: 8 }}>
                <button className="btn sm primary" type="button" disabled={salvando} onClick={() => salvar(confirmar.envelope, confirmar.nome, true)}>Sim, salvar {reais(valor)}</button>
                <button className="btn sm line" type="button" onClick={() => { setConfirmar(null); setTxt(''); setSelecionado(false) }}>Corrigir o valor</button>
              </span>
            </div>
          )}
          {!ordem.length && <p className="sub">Nenhum limite criado ainda. Crie em Planejamento.</p>}
          {/* B14: a lixeira mora só dentro do Corrigir (longe do lápis da lista) */}
          {corr && <button className="btn ghost" type="button" style={{ justifySelf: 'start' }} disabled={salvando} onClick={apagarEste}><Trash2 size={20} />Apagar este lançamento</button>}
        </>
      )}
      {erro && <p className="erro" role="alert">{erro}</p>}
    </Sheet>
  )
}

/** R11+G12: dinheiro que entrou a mais vai pro guardado (E3, conserto 4: "reserva" é só o dinheiro da Casa que nunca se gasta). Não muda o que dá pra gastar (regra do salário). */
function EntrouDinheiro({ valor, visor }: { valor: number; visor: React.ReactNode }) {
  const { api, familia, fecharLancar, toast, recarregar, tentar } = useApp()
  const { g } = useGuardado()
  const { familia: fam } = useApp()
  const [entradas, salvarEntradas] = useConfig<{ id: string; data: string; valor: number; de: string; destino: string }[]>('entradas', [])
  const [de, setDe] = useState('')
  // E2: guarda só na sua aplicação ou na do casal
  const apps = (g?.aplicacoes || []).filter(a => aplicacaoMinha(a, fam))
  const padrao = apps.find(a => a.liquidez === 'diaria' && a.titular && a.titular !== null) || apps.find(a => a.liquidez === 'diaria') || apps[0]
  const [destino, setDestino] = useState<string>('')
  const alvo = destino || padrao?.id || 'combinado'
  const [trabalho, setTrabalho] = useState(false)
  const trava = useMemo(() => umaPorVez((f: () => Promise<void>) => f()), [])
  const toque = useMemo(() => criarChaveToque(), [])
  const salvar = () => trava(async () => {
    if (!familia || valor <= 0) return
    const hoje = hojeRecife(), nota = de.trim() || (trabalho ? 'Pagamento do meu trabalho' : 'Dinheiro que entrou')
    // AUTONOMA ideia 2: o que é do trabalho conta como renda deste mês (não é "a mais")
    if (trabalho) {
      const ok = await salvarEntradas([...(entradas || []), { id: String(Date.now()), data: hoje, valor, de: nota, destino: 'renda' }])
      if (ok) { fecharLancar(); toast(`${reais(valor)} anotados como renda deste mês, do seu trabalho.`) }
      return
    }
    if (alvo === 'combinado') {
      const ok = await salvarEntradas([...(entradas || []), { id: String(Date.now()), data: hoje, valor, de: nota, destino: 'gasto combinado' }])
      if (ok) { fecharLancar(); toast(`${reais(valor)} anotados pra um gasto combinado. Não muda o que você pode gastar.`) }
      return
    }
    const app = apps.find(a => a.id === alvo)
    if (!app) return
    const chave = toque.para([app.id, valor, hoje, nota].join('|'))
    const ok = await tentar(() => api.guardadoMovimentar(app.id, 'aporte', valor, hoje, chave, nota))
    if (!ok) return
    toque.gravou(); fecharLancar(); await recarregar()
    toast(`${reais(valor)} foram pro guardado (${app.nome}) e contam pra 2029. Pela regra da casa, isso não muda o que você pode gastar.`, api.guardadoDesfazer ? async () => { await api.guardadoDesfazer!(app.id, chave); await recarregar() } : undefined)
  })
  return (
    <>
      <div className="pills" role="group" aria-label="De onde é esse dinheiro">
        <button type="button" className="pill" aria-pressed={trabalho} onClick={() => setTrabalho(true)}>É do meu trabalho</button>
        <button type="button" className="pill" aria-pressed={!trabalho} onClick={() => setTrabalho(false)}>Entrou a mais</button>
      </div>
      <p className="sub">{trabalho ? 'Pagamento de cliente, serviço, comissão: conta como renda deste mês.' : <>Presente, bônus, venda, dinheiro devolvido. Pela regra da casa, o que entra a mais do que a renda do mês vai pro guardado (fora do gasto do mês, conta pra 2029) e <b>não aumenta</b> o que dá pra gastar.</>}</p>
      {visor}
      <input className="inp" placeholder="De onde veio? Ex.: presente da madrinha" value={de} onChange={e => setDe(e.target.value)} aria-label="De onde veio" />
      {!trabalho && <div className="campo"><span id="eDest">Pra onde vai</span>
        <div className="pills" role="group" aria-labelledby="eDest">
          {apps.map(a => <button key={a.id} type="button" className="pill" aria-pressed={alvo === a.id} onClick={() => setDestino(a.id)}>{a.nome}<small className="pill-dono">{a.titular ? 'seu' : 'do casal'}</small></button>)}
          <button type="button" className="pill" aria-pressed={alvo === 'combinado'} onClick={() => setDestino('combinado')}>É pra um gasto combinado</button>
        </div>
        {!apps.length && <small>Você ainda não tem nada no Guardado. Dá pra anotar como gasto combinado ou criar a aplicação no Guardado.</small>}
      </div>}
      <button className="btn primary full" type="button" disabled={valor <= 0} onClick={salvar}><ArrowDownToLine size={20} />{trabalho || alvo === 'combinado' ? 'Anotar' : `Guardar ${valor > 0 ? reais(valor) : ''}`}</button>
    </>
  )
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/**
 * A1 (rodada 2): a folha "Anotar compra" da equipe da casa. Nenhum R$, nenhum teclado de valor, nenhum aria-label com dinheiro.
 * Ela diz o que comprou, se foi a feira da semana ou coisa da casa, e tira a foto da nota. O casal confere o valor pela foto.
 */
function AnotarCompra() {
  const { api, familia, fecharLancar, toast, recarregar, tentar } = useApp()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<'feira' | 'casa'>('feira')
  const [foto, setFoto] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [gravando, setGravando] = useState(false)
  const camera = useRef<HTMLInputElement>(null)
  const trava = useMemo(() => umaPorVez((f: () => Promise<void>) => f()), [])
  const anotar = () => trava(async () => {
    if (!familia) return
    if (!nome.trim()) { setErro('Escreva o que você comprou. Ex.: feira do mercadinho, detergente.'); return }
    if (!api.anotarCompraEquipe) { setErro('Essa parte ainda está sendo ligada no banco da família. Avise quem cuida da família.'); return }
    setGravando(true); setErro('')
    let aviso = ''
    const ok = await tentar(async () => { aviso = (await api.anotarCompraEquipe!(familia.id, { tipo, nome: nome.trim(), foto })).aviso })
    setGravando(false)
    if (!ok) return
    fecharLancar(); await recarregar(); toast(aviso)
  })
  const pegarFoto = async (arq: File | null) => { if (!arq) return; try { setFoto(await reduzirFoto(arq)) } catch { setErro('Não deu pra ler a foto. Tente de novo.') } }
  return (
    <Sheet titulo="Anotar compra" fechar={fecharLancar} rotulo="Anotar compra">
      <label className="campo"><span>O que você comprou?</span><input className="inp lanc-o-que" placeholder="Ex.: feira do mercadinho, detergente" value={nome} onChange={e => setNome(e.target.value)} /></label>
      <div className="campo"><span id="aqTipo">É da feira ou da casa?</span>
        <div className="anotar-tipo" role="group" aria-labelledby="aqTipo">
          <button type="button" className="pill" aria-pressed={tipo === 'feira'} onClick={() => setTipo('feira')}>Feira da semana</button>
          <button type="button" className="pill" aria-pressed={tipo === 'casa'} onClick={() => setTipo('casa')}>Coisa da casa</button>
        </div>
      </div>
      <div className="foto-nota">
        <input ref={camera} type="file" accept="image/*" capture="environment" onChange={ev => { const f = ev.target.files?.[0] || null; ev.target.value = ''; pegarFoto(f) }} />
        <button type="button" className={'btn full ' + (foto ? 'line' : 'line')} onClick={() => camera.current?.click()}>{foto ? <><Check size={20} />Foto da nota pronta</> : <><Camera size={20} />Tirar foto da nota</>}</button>
        {api.modo === 'exemplo' && !foto && <button type="button" className="btn ghost full" onClick={() => setFoto('exemplo')}>Usar uma nota de exemplo</button>}
      </div>
      <p className="sub">O casal confere o valor pela foto. Você não precisa digitar nenhum valor.</p>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button type="button" className="btn primary full" disabled={gravando} onClick={anotar}><Check size={20} />Anotar a compra</button>
    </Sheet>
  )
}
