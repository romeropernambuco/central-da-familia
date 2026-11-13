import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Camera, Check, ChevronRight, Pencil, Plus } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useConfig } from '../../app/useConfig'
import { perguntaDaLinha, perguntasVistas } from '../../app/useDados2'
import { CampoValor, Din, Sheet } from '../../componentes/base'
import { Contagem, FuncIco, PerguntaCard, type Responder } from '../../componentes/Pergunta'
import type { Cartao, EscritorioHoje, Estoque, Fatura, FaturaBanco, Feira, FuncionarioEsc, GuardadoHoje, Lembrete, LinhaDiario, PerguntaEsc, Repetir } from '../../api/tipos'
import { chaveSimples } from '../../api/normaliza2'
import { novoUuid } from '../../lib/seguro'
import { reduzirFoto } from '../../lib/foto'
import { dataCurta, diaSemana, FUSO, hojeRecife, mesCurto, reais, textoParaValor, valorDigitadoValido, valorParaTexto } from '../../lib/formato'
import { rendeQuanto } from '../../lib/guardado'
import type { Folha } from './ajudantes'
import { IcoEstado, ROTULO_ESTADO } from './Cena3D'

/** O que cada funcionário faz e quando cobra: 3 linhas, sempre na 1ª pessoa. */
export const FAZ: Record<string, [string, string, string]> = {
  contador: ['Confiro todo dia se o mês fecha dentro do que vocês combinaram.', 'Depois das 20h, se não tiver nenhum gasto anotado no dia, eu pergunto.', 'No dia 01 eu fecho o mês e digo quanto sobrou.'],
  colchao: ['Cuido da reserva: o dinheiro que vocês combinaram nunca gastar.', 'Se o que está livre no mês ficar menor que a reserva, eu aviso na hora.', 'Pergunto de onde o dinheiro volta e cobro no dia que você marcar.'],
  cartao: ['Somo as compras de cada cartão e digo quanto vem na fatura.', 'Começo a cobrar 3 dias antes do vencimento e paro quando você diz que pagou.', 'Aviso 1 mês antes da anuidade e quando o valor do banco não bate com a minha soma.'],
  folha: ['Cuido de quem trabalha na casa: salário, férias e 13º.', 'Do dia 01 ao 07 eu lembro a guia mensal do governo.', 'No dia do salário de cada pessoa eu pergunto se foi pago.'],
  comprador: ['Cuido dos prestadores (jardineiro, piscineiro) e do gás.', 'Na véspera do prestador eu deixo a mensagem pronta; no dia, às 17h, pergunto se ele veio.', 'Aviso 5 dias antes de o gás acabar, pela média das últimas trocas.'],
  fiscal: ['Confiro 3 coisas da feira de toda semana: se foi feita, se a nota está guardada e se o estoque foi contado.', 'Começo a perguntar na segunda, às 18h, 1 coisa por vez e só a que falta.', 'Aviso quando a semana passa do valor combinado.'],
  guardado: ['Faço a conta de quanto o dinheiro guardado rendeu em cada dia útil.', 'No dia 01 eu peço pra você conferir o valor no app do banco.', 'Aviso 15 dias antes de uma aplicação vencer.'],
  secretaria: ['Guardo os lembretes que você me passa.', 'Na hora marcada eu pergunto no Início e aqui.', 'Cobro de novo todo dia até você dizer que fez ou marcar outro dia.'],
}
const hhmm = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const diaDe = (iso: string) => hojeRecife(new Date(iso))

/**
 * A ficha do funcionário, igual pra todos, em 4 partes fixas: Agora, O que eu cuido, O que você já me respondeu, O que eu faço e quando.
 * No celular sobe de baixo; no computador é um painel do lado direito.
 */
export function FichaFuncionario({ f, e, responder, fechar }: { f: FuncionarioEsc; e: EscritorioHoje; responder: Responder; fechar: () => void }) {
  const { api, familia, versao } = useApp()
  const cad = useRef<HTMLElement>(null)
  const minhas = e.precisa_de_voce.filter(p => p.funcionario === f.id || chaveSimples(p.funcionario) === chaveSimples(f.nome))
  const entrega = e.entregue.find(x => x.funcionario === f.id || chaveSimples(x.funcionario) === chaveSimples(f.nome))
  const [tudo, setTudo] = useState<LinhaDiario[] | null>(null)
  const [buscadas, setBuscadas] = useState<LinhaDiario[] | null>(null)
  // o banco manda as 10 últimas junto com o funcionário; se não mandar, a ficha busca
  useEffect(() => {
    if (!familia || f.ultimas_respostas) return
    let vivo = true
    api.escritorioDiario(familia.id, f.id, 10).then(x => { if (vivo) setBuscadas(x) }).catch(() => { if (vivo) setBuscadas([]) })
    return () => { vivo = false }
  }, [api, familia?.id, f.id, versao, !!f.ultimas_respostas])
  const respostas = tudo || f.ultimas_respostas || buscadas
  const verTudo = async () => { if (familia) setTudo(await api.escritorioDiario(familia.id, f.id, 100).catch(() => f.ultimas_respostas || [])) }
  useEffect(() => { if (tudo && familia) api.escritorioDiario(familia.id, f.id, 100).then(setTudo).catch(() => {}) }, [versao])
  const hoje = hojeRecife()
  const [corrigindo, setCorrigindo] = useState<PerguntaEsc | null>(null)
  const topo = useRef<HTMLElement>(null)

  return (
    <Sheet titulo={f.nome} fechar={fechar} lado rotulo={`Ficha: ${f.nome}`}>
      <div className="ficha" data-ficha={f.id}>
        <p className="ficha-topo"><FuncIco id={f.id} size={44} precisa={f.estado === 'precisa_de_voce'} /><span className={'chip' + (f.estado === 'precisa_de_voce' ? ' ok' : '')}><IcoEstado e={f.estado} />{ROTULO_ESTADO[f.estado]}</span></p>

        <section aria-labelledby="fAgora" data-parte="agora" ref={topo}>
          <h3 id="fAgora">Agora</h3>
          {corrigindo ? (
            <>
              <p className="sub">Corrigindo a sua resposta. A antiga continua guardada no diário.</p>
              <PerguntaCard key={'c' + corrigindo.id} p={corrigindo} quem={f.nome} responder={responder} semQuem corrige aoResponder={() => setCorrigindo(null)} />
              <button type="button" className="btn ghost sm" onClick={() => setCorrigindo(null)}>Deixar como está</button>
            </>
          ) : minhas.length ? (
            <>
              <PerguntaCard key={minhas[0].id} p={minhas[0]} quem={f.nome} responder={responder} semQuem abrirCadastro={() => cad.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })} />
              {minhas.length > 1 && <p className="sub" style={{ marginTop: 8 }}>Depois desta eu tenho mais {minhas.length - 1 === 1 ? '1 pergunta' : `${minhas.length - 1} perguntas`}. Uma de cada vez.</p>}
            </>
          ) : (
            <>
              <p className="perg-t">Hoje não preciso de nada seu.</p>
              <p className="perg-c">{entrega?.resumo || f.frase}</p>
            </>
          )}
        </section>

        <section aria-labelledby="fCuido" data-parte="cuido" ref={cad}>
          <h3 id="fCuido">O que eu cuido</h3>
          <Cadastro id={f.id} />
        </section>

        <section aria-labelledby="fResp" data-parte="respostas">
          <h3 id="fResp">O que você já me respondeu</h3>
          {!respostas ? <p className="sub">Buscando o que eu anotei…</p> : !respostas.length ? <p className="sub">Ainda não anotei nenhuma resposta sua. Quando você responder, ela aparece aqui com dia e hora.</p> : (
            <ul className="list resp">
              {respostas.map((d, i) => {
                // id da pergunta: vem na linha (exemplo) ou foi guardado quando a resposta saiu deste aparelho. Sem id, não tem Corrigir.
                const ref = d.ref || perguntaDaLinha.get(d.id)
                return (
                <li key={d.id} data-resposta={d.resposta}>
                  <span className="q"><small>{d.quando_txt || (diaDe(d.quando) === hoje ? `anotado às ${hhmm(d.quando)}` : `${dataCurta(diaDe(d.quando))}, ${hhmm(d.quando)}`)}{d.respondido_por ? ` · ${d.respondido_por}` : ''}</small><span>{d.assunto || d.pergunta}</span><b>{d.resposta}</b></span>
                  {i < 3 && ref && perguntasVistas.has(ref) && !minhas.some(p => p.id === ref) && <button type="button" className="lnk" onClick={() => { setCorrigindo(perguntasVistas.get(ref)!); topo.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }}>Corrigir</button>}
                </li>
                )
              })}
            </ul>
          )}
          {respostas && respostas.length >= 10 && !tudo && <button type="button" className="btn line sm" style={{ marginTop: 8 }} onClick={verTudo}>Ver tudo</button>}
          <p className="sub" style={{ marginTop: 8 }}>Nada é apagado. Corrigir uma resposta guarda a antiga e passa a valer a nova.</p>
        </section>

        <section aria-labelledby="fFaz" data-parte="faz">
          <h3 id="fFaz">O que eu faço e quando</h3>
          <ul className="faz-l">{(f.faz?.length ? f.faz : FAZ[f.id] || [f.frase, 'Eu pergunto quando precisar de uma resposta sua.', 'Tudo que você responde fica anotado aqui.']).map(l => <li key={l}>{l}</li>)}</ul>
        </section>
      </div>
    </Sheet>
  )
}

/* ---------- cadastro genérico: lista com "Novo" e editar em cada linha ---------- */
interface Campo { k: string; rotulo: string; tipo?: 'texto' | 'valor' | 'num' | 'data' | 'datahora' | 'opcao'; opcoes?: [string, string][]; dica?: string; ph?: string }
type Form = Record<string, string>
interface PropsLista<T> { nome: string; itens: T[]; chave: (t: T) => string; titulo: (t: T) => ReactNode; sub: (t: T) => ReactNode; lado?: (t: T) => ReactNode; campos: Campo[]; paraForm: (t: T | null) => Form; salvar: (f: Form, original: T | null) => Promise<string | void>; novo?: string; vazio: string; semEditar?: boolean; extra?: (t: T) => ReactNode }

function Lista<T>({ nome, itens, chave, titulo, sub, lado, campos, paraForm, salvar, novo, vazio, semEditar, extra }: PropsLista<T>) {
  const { tentar, recarregar, toast } = useApp()
  const [aberto, setAberto] = useState<string | null>(null) // chave do item em edição, ou '+' pra novo
  const [form, setForm] = useState<Form>({})
  const [erro, setErro] = useState('')
  const [gravando, setGravando] = useState(false)
  const abrir = (k: string, t: T | null) => { setErro(''); if (aberto === k) { setAberto(null); return } setForm(paraForm(t)); setAberto(k) }
  const gravar = async (t: T | null) => {
    setGravando(true); setErro('')
    let falta: string | void = ''
    const ok = await tentar(async () => { falta = await salvar(form, t) })
    setGravando(false)
    if (falta) { setErro(falta); return }
    if (ok) { setAberto(null); toast('Salvo.'); await recarregar() }
  }
  const formulario = (t: T | null) => (
    <div className="cad-form">
      {campos.map(c => (
        <div className="campo" key={c.k}>
          <span id={`cf-${nome}-${c.k}`}>{c.rotulo}</span>
          {c.tipo === 'valor' ? <CampoValor valor={form[c.k] || ''} mudar={v => setForm({ ...form, [c.k]: v })} rotulo={c.rotulo} />
            : c.tipo === 'opcao' ? <div className="pills" role="group" aria-labelledby={`cf-${nome}-${c.k}`}>{c.opcoes!.map(([v, r]) => <button key={v} type="button" className="pill" aria-pressed={(form[c.k] || '') === v} onClick={() => setForm({ ...form, [c.k]: v })}>{r}</button>)}</div>
              : <input className="inp" aria-labelledby={`cf-${nome}-${c.k}`} placeholder={c.ph} type={c.tipo === 'data' ? 'date' : c.tipo === 'datahora' ? 'datetime-local' : 'text'} inputMode={c.tipo === 'num' ? 'numeric' : undefined} value={form[c.k] || ''} onChange={ev => setForm({ ...form, [c.k]: c.tipo === 'num' ? ev.target.value.replace(/\D/g, '') : ev.target.value })} />}
          {c.dica && <small>{c.dica}</small>}
        </div>
      ))}
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="row-btns"><button type="button" className="btn primary" disabled={gravando} onClick={() => gravar(t)}>Salvar</button><button type="button" className="btn ghost" onClick={() => setAberto(null)}>Cancelar</button></div>
    </div>
  )
  return (
    <div className="cad" data-cad={nome}>
      <div className="cad-h"><b>{nome}</b>{novo && <button type="button" className="btn line sm" aria-expanded={aberto === '+'} onClick={() => abrir('+', null)}><Plus size={16} />{novo}</button>}</div>
      {aberto === '+' && formulario(null)}
      {!itens.length && aberto !== '+' && <p className="sub">{vazio}</p>}
      <ul className="list">
        {itens.map(t => (
          <li key={chave(t)}>
            <div className="cad-l">
              <span className="m"><b>{titulo(t)}</b><small>{sub(t)}</small></span>
              {lado && <span className="v">{lado(t)}</span>}
              {!semEditar && <button type="button" className="iconbtn" aria-label="Editar" aria-expanded={aberto === chave(t)} onClick={() => abrir(chave(t), t)}><Pencil size={18} /></button>}
            </div>
            {extra && extra(t)}
            {aberto === chave(t) && formulario(t)}
          </li>
        ))}
      </ul>
    </div>
  )
}

const val = (txt: string | undefined) => (txt && valorDigitadoValido(txt) ? textoParaValor(txt) : null)
const num = (txt: string | undefined) => (txt && /^\d+$/.test(txt) ? Number(txt) : null)
const vt = (v: number | null | undefined) => (v ? valorParaTexto(v) : '')
const MESES: [string, string][] = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].map((m, i) => [String(i + 1), m])
const DIAS: [string, string][] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d, i) => [String(i), d])
const DIAS_L = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function Cadastro({ id }: { id: string }) {
  if (id === 'cartao') return <CadCartao />
  if (id === 'fiscal') return <CadFiscal />
  if (id === 'folha') return <CadFolha />
  if (id === 'comprador') return <CadComprador />
  if (id === 'guardado') return <CadGuardado />
  if (id === 'secretaria') return <CadSecretaria />
  if (id === 'colchao') return <CadReserva />
  if (id === 'contador') return <CadContador />
  return <p className="sub">Este funcionário ainda não tem cadastro.</p>
}

/** Busca que se refaz a cada mudança do app. */
function useBusca<T>(buscar: (familia: string) => Promise<T>): T | null {
  const { familia, versao } = useApp()
  const [v, setV] = useState<T | null>(null)
  useEffect(() => { if (!familia) return; let vivo = true; buscar(familia.id).then(x => { if (vivo) setV(x) }).catch(() => {}); return () => { vivo = false } }, [familia?.id, versao])
  return v
}

/* Analista de Cartão: cartões (com mensalidade ou anuidade) e a fatura do mês como veio no banco */
function CadCartao() {
  const { api, familia } = useApp()
  const cartoes = useBusca<Cartao[]>(f => api.cartoes(f))
  const faturas = useBusca<Fatura[]>(f => api.faturas(f, 2))
  const banco = useBusca<FaturaBanco[]>(f => api.faturasBanco(f))
  const membros = useBusca<{ id: string; nome: string }[]>(f => api.membros(f))
  const taxa = (c: Cartao) => (!c.taxa_valor ? 'sem mensalidade nem anuidade' : c.taxa_periodo === 'ano' ? `anuidade de ${reais(c.taxa_valor)}${c.taxa_mes ? `, cobrada em ${MESES[c.taxa_mes - 1][1]}` : ''}` : `mensalidade de ${reais(c.taxa_valor)}`)
  const doBanco = (f: Fatura) => banco?.find(b => b.cartao_id === f.cartao_id && b.mes === f.mes)
  return (
    <>
      <Lista<Cartao> nome="Cartões" novo="Novo cartão" itens={cartoes || []} chave={c => c.id} vazio={cartoes ? 'Nenhum cartão cadastrado. Toque em "Novo cartão".' : 'Buscando os cartões…'}
        titulo={c => `${c.nome}${c.final4 ? ` · final ${c.final4}` : ''}`}
        sub={c => <>{c.titular ? `de ${c.titular} · ` : ''}{c.dia_fechamento ? `fecha dia ${c.dia_fechamento}` : 'falta o dia que fecha'}{c.dia_vencimento ? `, vence dia ${c.dia_vencimento}` : ''} · {taxa(c)}{c.limite ? ` · limite ${reais(c.limite)}` : ''}</>}
        campos={[
          { k: 'nome', rotulo: 'Apelido do cartão', ph: 'Ex.: Inter da Helena' }, { k: 'banco', rotulo: 'Banco' }, { k: 'titular', rotulo: 'De quem é', tipo: 'opcao', opcoes: [...(membros || []).map(m => [m.id, m.nome] as [string, string]), ['', 'Não dizer']] },
          { k: 'dia_fechamento', rotulo: 'Dia que a fatura fecha', tipo: 'num', dica: 'Compra feita depois desse dia só é cobrada no mês seguinte.' }, { k: 'dia_vencimento', rotulo: 'Dia que a fatura vence', tipo: 'num' },
          { k: 'limite', rotulo: 'Limite do cartão', tipo: 'valor' },
          { k: 'taxa_valor', rotulo: 'Mensalidade ou anuidade', tipo: 'valor', dica: 'Quanto o banco cobra pra você ter o cartão. Se não cobra nada, deixe vazio.' },
          { k: 'taxa_periodo', rotulo: 'Essa cobrança é', tipo: 'opcao', opcoes: [['mes', 'Todo mês'], ['ano', '1 vez por ano']] },
          { k: 'taxa_mes', rotulo: 'Mês em que a anuidade é cobrada', tipo: 'opcao', opcoes: MESES },
          { k: 'taxa_isenta_acima', rotulo: 'O banco não cobra se você gastar por mês', tipo: 'valor', dica: 'Se o banco dá isenção acima de um valor de gasto. Se não dá, deixe vazio.' },
          { k: 'final4', rotulo: 'Os 4 últimos números (se quiser)', tipo: 'num', dica: 'Nunca o número inteiro do cartão: só pra você saber qual é.' },
          { k: 'ativo', rotulo: 'Ainda usa esse cartão?', tipo: 'opcao', opcoes: [['sim', 'Uso'], ['nao', 'Não uso mais']] },
        ]}
        paraForm={c => ({ nome: c?.nome || '', banco: c?.banco || '', titular: c?.titular_id || '', dia_fechamento: c?.dia_fechamento ? String(c.dia_fechamento) : '', dia_vencimento: c?.dia_vencimento ? String(c.dia_vencimento) : '', limite: vt(c?.limite), taxa_valor: vt(c?.taxa_valor), taxa_periodo: c?.taxa_periodo || 'ano', taxa_mes: c?.taxa_mes ? String(c.taxa_mes) : '', taxa_isenta_acima: vt(c?.taxa_isenta_acima), final4: c?.final4 || '', ativo: c?.ativo === false ? 'nao' : 'sim' })}
        salvar={async (f, c) => {
          if (!f.nome.trim()) return 'Dê um apelido pro cartão.'
          for (const k of ['dia_fechamento', 'dia_vencimento']) if (f[k] && !(Number(f[k]) >= 1 && Number(f[k]) <= 31)) return 'O dia tem que ser de 1 a 31.'
          if (f.final4 && f.final4.length !== 4) return 'São só os 4 últimos números do cartão.'
          await api.cartaoSalvar(familia!.id, { id: c?.id, nome: f.nome.trim(), banco: f.banco.trim() || null, titular_id: f.titular || null, dia_fechamento: num(f.dia_fechamento), dia_vencimento: num(f.dia_vencimento), limite: val(f.limite), taxa_valor: val(f.taxa_valor), taxa_periodo: f.taxa_periodo === 'mes' ? 'mes' : 'ano', taxa_mes: num(f.taxa_mes), taxa_isenta_acima: val(f.taxa_isenta_acima), final4: f.final4 || null, ativo: f.ativo !== 'nao' })
        }} />
      <Lista<Fatura> nome="Faturas" itens={(faturas || []).filter(f => f.total > 0 || doBanco(f))} chave={f => f.cartao_id + f.mes} vazio={faturas ? 'Nenhuma fatura com valor neste mês nem no próximo.' : 'Buscando as faturas…'}
        titulo={f => `${f.cartao} · ${mesCurto(f.mes + '-01')}`}
        sub={f => { const b = doBanco(f); const dif = b?.valor_banco != null ? b.valor_banco - f.total : 0
          return <>eu somei {reais(f.total)}{b?.valor_banco != null ? ` · o banco cobrou ${reais(b.valor_banco)}` : ' · falta dizer quanto veio no banco'}{Math.abs(dif) >= 1 ? ` · diferença de ${reais(Math.abs(dif))} ${dif > 0 ? 'que não foi anotada aqui' : 'a menos no banco'}` : ''} · vence {dataCurta(f.vencimento)}</> }}
        lado={f => { const b = doBanco(f); return b?.paga_em ? <span className="chip ok"><Check size={14} />paga {dataCurta(b.paga_em)}</span> : <span className="chip">aberta</span> }}
        campos={[{ k: 'valor_banco', rotulo: 'Valor que veio no banco', tipo: 'valor', dica: 'Olhe no app do banco. Se for diferente da minha soma, eu mostro a diferença.' }, { k: 'paga_em', rotulo: 'Paga em (deixe vazio se ainda não pagou)', tipo: 'data' }]}
        paraForm={f => { const b = f ? doBanco(f) : null; return { valor_banco: vt(b?.valor_banco), paga_em: b?.paga_em || '' } }}
        salvar={async (fm, f) => { if (fm.valor_banco && !valorDigitadoValido(fm.valor_banco)) return 'Digite o valor como aparece no banco, por exemplo 2.512,00.'; await api.faturaInformar(familia!.id, f!.cartao_id, f!.mes, { valor_banco: val(fm.valor_banco), paga_em: fm.paga_em || null }) }} />
    </>
  )
}

/* Fiscal da Feira: feiras (com a nota), contagens do estoque e itens da casa */
function CadFiscal() {
  const { api, familia, tentar, recarregar, toast } = useApp()
  const feiras = useBusca<Feira[]>(f => api.feiras(f))
  const est = useBusca<Estoque>(f => api.estoque(f))
  const [contando, setContando] = useState(false)
  const [gravando, setGravando] = useState(false)
  const arq = useRef<HTMLInputElement>(null)
  const alvo = useRef('')
  const anexar = async (file: File | null) => {
    if (!familia) return
    const ok = await tentar(async () => api.feiraAnexarNota(familia.id, alvo.current, file ? await reduzirFoto(file) : 'exemplo'))
    if (ok) { toast('Nota guardada.'); await recarregar() }
  }
  return (
    <>
      <input ref={arq} type="file" accept="image/*,application/pdf" capture="environment" hidden onChange={ev => { const f = ev.target.files?.[0]; ev.target.value = ''; if (f) anexar(f) }} />
      <Lista<Feira> nome="Feiras" novo="Nova feira" itens={feiras || []} chave={f => f.id} vazio={feiras ? 'Nenhuma feira registrada. Toque em "Nova feira".' : 'Buscando as feiras…'}
        titulo={f => `Feira de ${dataCurta(f.data)}${f.loja ? ` · ${f.loja}` : ''}`}
        sub={f => <>{f.tem_nota ? 'nota guardada' : f.sem_nota_motivo ? `sem nota: ${f.sem_nota_motivo}` : 'falta a nota'}{f.feita_por ? ` · quem fez: ${f.feita_por}` : ''}</>}
        lado={f => (f.valor != null ? <Din v={f.valor} /> : null)}
        extra={f => (!f.tem_nota ? <button type="button" className="btn line sm cad-x" onClick={() => { alvo.current = f.id; if (api.modo === 'exemplo') anexar(null); else arq.current?.click() }}><Camera size={16} />Anexar a nota</button> : null)}
        campos={[{ k: 'data', rotulo: 'Dia da feira', tipo: 'data' }, { k: 'valor', rotulo: 'Quanto deu', tipo: 'valor' }, { k: 'loja', rotulo: 'Onde foi', ph: 'Ex.: Mercadinho, feira livre' }, { k: 'motivo', rotulo: 'Se não teve nota, por quê', ph: 'Ex.: feira livre, açougue' }]}
        paraForm={f => ({ data: f?.data || hojeRecife(), valor: vt(f?.valor), loja: f?.loja || '', motivo: f?.sem_nota_motivo || '' })}
        salvar={async (fm, f) => {
          if (f) { if (!fm.motivo.trim()) return 'Feira já registrada: aqui dá pra dizer por que não teve nota, ou anexar a nota pelo botão.'; await api.feiraSemNota(familia!.id, f.id, fm.motivo.trim()); return }
          if (!fm.valor || !val(fm.valor)) return 'Digite quanto deu a feira.'
          await api.feiraRegistrar(familia!.id, { data: fm.data, valor: val(fm.valor)!, loja: fm.loja.trim() })
        }} />
      <div className="cad" data-cad="Contagens">
        <div className="cad-h"><b>Contagens do estoque</b><button type="button" className="btn line sm" aria-expanded={contando} onClick={() => setContando(!contando)}><Plus size={16} />Contar agora</button></div>
        {contando && <Contagem gravando={gravando} salvar={async itens => { setGravando(true); const ok = await tentar(() => api.estoqueContar(familia!.id, itens)); setGravando(false); if (ok) { setContando(false); toast('Contagem salva.'); await recarregar() } }} />}
        {est && !est.contagens.length && <p className="sub">Nenhuma contagem ainda.</p>}
        <ul className="list">{(est?.contagens || []).slice(0, 4).map(c => { const ac = c.itens.filter(i => i.estado === 'acabou').length, po = c.itens.filter(i => i.estado === 'pouco').length
          return <li key={c.id}><div className="cad-l"><span className="m"><b>{diaSemana(c.data)}, {dataCurta(c.data)}</b><small>{c.contado_por ? `quem contou: ${c.contado_por} · ` : ''}{c.itens.length} itens · {ac === 1 ? '1 acabou' : `${ac} acabaram`} · {po} com pouco</small></span></div></li> })}</ul>
      </div>
      <Lista<Estoque['itens'][number]> nome="Itens da casa" novo="Novo item" itens={(est?.itens || []).filter(i => i.ativo)} chave={i => i.id} vazio={est ? 'Nenhum item. Toque em "Novo item".' : 'Buscando os itens…'}
        titulo={i => i.nome} sub={i => i.categoria}
        campos={[{ k: 'nome', rotulo: 'Nome do item', ph: 'Ex.: Arroz' }, { k: 'categoria', rotulo: 'Onde fica', tipo: 'opcao', opcoes: [['Despensa', 'Despensa'], ['Geladeira', 'Geladeira'], ['Limpeza', 'Limpeza'], ['Outros', 'Outros']] }, { k: 'ativo', rotulo: 'Continua na contagem?', tipo: 'opcao', opcoes: [['sim', 'Continua'], ['nao', 'Tirar da contagem']] }]}
        paraForm={i => ({ nome: i?.nome || '', categoria: i?.categoria || 'Despensa', ativo: 'sim' })}
        salvar={async (fm, i) => { if (!fm.nome.trim()) return 'Escreva o nome do item.'; await api.estoqueItemSalvar(familia!.id, { id: i?.id, nome: fm.nome.trim(), categoria: fm.categoria, ativo: fm.ativo !== 'nao' }) }} />
    </>
  )
}

type PessoaF = Folha['pessoas'][number] & { diaPagamento?: number }
function CadFolha() {
  const [folha, salvar, , lido] = useConfig<Folha>('casa_folha', { pessoas: [], daePaga: {} })
  const mes = hojeRecife().slice(0, 7), paga = !!folha.daePaga?.[mes]
  return (
    <>
      <Lista<PessoaF> nome="Quem trabalha na casa" novo="Nova pessoa" itens={folha.pessoas as PessoaF[]} chave={p => p.id} vazio={lido ? 'Ninguém cadastrado. Toque em "Nova pessoa".' : 'Buscando…'}
        titulo={p => `${p.nome} · ${p.funcao}`} sub={p => `salário pago todo dia ${p.diaPagamento || 5}`} lado={p => <Din v={p.salario} />}
        campos={[{ k: 'nome', rotulo: 'Nome' }, { k: 'funcao', rotulo: 'Função', ph: 'Ex.: Cozinheira' }, { k: 'salario', rotulo: 'Salário do mês', tipo: 'valor' }, { k: 'dia', rotulo: 'Dia do pagamento', tipo: 'num' }]}
        paraForm={p => ({ nome: p?.nome || '', funcao: p?.funcao || '', salario: vt(p?.salario), dia: String(p?.diaPagamento || 5) })}
        salvar={async (f, p) => {
          if (!f.nome.trim()) return 'Escreva o nome.'
          if (!val(f.salario)) return 'Digite o salário do mês.'
          if (!(Number(f.dia) >= 1 && Number(f.dia) <= 31)) return 'O dia do pagamento tem que ser de 1 a 31.'
          const nova: PessoaF = { id: p?.id || novoUuid().slice(0, 8), nome: f.nome.trim(), funcao: f.funcao.trim() || 'Ajuda em casa', salario: val(f.salario)!, diaPagamento: Number(f.dia) }
          if (!(await salvar({ ...folha, pessoas: p ? folha.pessoas.map(x => (x.id === p.id ? nova : x)) : [...folha.pessoas, nova] }))) throw new Error('Não deu pra salvar. Tente de novo.')
        }} />
      <div className="cad"><div className="cad-h"><b>Guia mensal do governo</b><button type="button" className="btn line sm" onClick={() => salvar({ ...folha, daePaga: { ...folha.daePaga, [mes]: !paga } })}>{paga ? 'Desmarcar' : 'Marcar como paga'}</button></div>
        <p className="sub">{paga ? `A guia de ${mesCurto(mes + '-01')} está marcada como paga.` : `A guia de ${mesCurto(mes + '-01')} ainda não foi marcada como paga. É o boleto mensal do registro de quem trabalha na casa e vence todo dia 07.`}</p></div>
    </>
  )
}

interface Prest { id: string; nome: string; servico: string; dia: number; valor: number; ultimaVez?: string }
function CadComprador() {
  const [prest, salvarP, , lidoP] = useConfig<Prest[]>('casa_prestadores', [])
  const [gas, salvarG, , lidoG] = useConfig<{ trocas: string[] }>('casa_gas', { trocas: [] })
  const trocas = [...(gas.trocas || [])].sort().reverse()
  return (
    <>
      <Lista<Prest> nome="Prestadores" novo="Novo prestador" itens={prest} chave={p => p.id} vazio={lidoP ? 'Nenhum prestador. Toque em "Novo prestador".' : 'Buscando…'}
        titulo={p => `${p.servico} · ${p.nome}`} sub={p => `vem ${(p.dia === 0 || p.dia === 6 ? 'todo ' : 'toda ') + DIAS_L[p.dia]}${p.ultimaVez ? ` · última vez ${dataCurta(p.ultimaVez)}` : ''}`} lado={p => <Din v={p.valor} />}
        campos={[{ k: 'servico', rotulo: 'Serviço', ph: 'Ex.: Jardineiro' }, { k: 'nome', rotulo: 'Nome' }, { k: 'dia', rotulo: 'Dia da semana', tipo: 'opcao', opcoes: DIAS }, { k: 'valor', rotulo: 'Valor por visita', tipo: 'valor' }]}
        paraForm={p => ({ servico: p?.servico || '', nome: p?.nome || '', dia: String(p?.dia ?? 6), valor: vt(p?.valor) })}
        salvar={async (f, p) => {
          if (!f.servico.trim() || !f.nome.trim()) return 'Escreva o serviço e o nome.'
          const novo: Prest = { ...(p || {}), id: p?.id || novoUuid().slice(0, 8), servico: f.servico.trim(), nome: f.nome.trim(), dia: Number(f.dia), valor: val(f.valor) || 0 }
          if (!(await salvarP(p ? prest.map(x => (x.id === p.id ? novo : x)) : [...prest, novo]))) throw new Error('Não deu pra salvar. Tente de novo.')
        }} />
      <Lista<string> nome="Trocas de gás" novo="Nova troca" semEditar itens={trocas.slice(0, 4)} chave={d => d} vazio={lidoG ? 'Nenhuma troca anotada. Com 2 trocas eu já calculo quando o gás acaba.' : 'Buscando…'}
        titulo={d => `Trocado em ${dataCurta(d)}`} sub={d => diaSemana(d)}
        campos={[{ k: 'data', rotulo: 'Dia da troca', tipo: 'data' }]} paraForm={() => ({ data: hojeRecife() })}
        salvar={async f => { if (!/^\d{4}-\d{2}-\d{2}$/.test(f.data)) return 'Escolha o dia.'; if (!(await salvarG({ trocas: [...new Set([...(gas.trocas || []), f.data])].sort() }))) throw new Error('Não deu pra salvar. Tente de novo.') }} />
    </>
  )
}

function CadGuardado() {
  const { api } = useApp()
  const g = useBusca<GuardadoHoje>(f => api.guardadoHoje(f))
  return (
    <div className="cad" data-cad="Aplicações">
      <div className="cad-h"><b>Onde o dinheiro está guardado</b><a className="btn line sm" href="#/guardado?nova=1"><Plus size={16} />Nova aplicação</a></div>
      {g && !g.aplicacoes.length && <p className="sub">Nada guardado ainda. Toque em "Nova aplicação".</p>}
      <ul className="list">{(g?.aplicacoes || []).map(a => <li key={a.id}><div className="cad-l"><span className="m"><b>{a.nome}</b><small>{rendeQuanto(a, true)} · rendeu hoje {reais(a.rendeu_hoje_liquido)}</small></span><span className="v"><Din v={a.saldo} /></span></div></li>)}</ul>
      <div className="row-btns" style={{ marginTop: 8 }}><a className="btn line sm" href="#/guardado?guardar=1">Guardar dinheiro</a><a className="btn line sm" href="#/guardado?tirar=1">Tirar dinheiro</a><a className="btn ghost sm" href="#/guardado">Abrir o Guardado<ChevronRight size={16} /></a></div>
    </div>
  )
}

const REPETE: [Repetir, string][] = [['nunca', 'Não repete'], ['dia', 'Todo dia'], ['semana', 'Toda semana'], ['mes', 'Todo mês'], ['ano', 'Todo ano']]
const localDeRecife = (iso: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace(' ', 'T')
function CadSecretaria() {
  const { api, familia } = useApp()
  const lista = useBusca<Lembrete[]>(f => api.lembretes(f))
  return (
    <Lista<Lembrete> nome="Lembretes" novo="Novo lembrete" itens={lista || []} chave={l => l.id} vazio={lista ? 'Nenhum lembrete guardado. Toque em "Novo lembrete".' : 'Buscando…'}
      titulo={l => l.titulo} sub={l => `${dataCurta(diaDe(l.quando))} às ${hhmm(l.quando)} · ${REPETE.find(r => r[0] === l.repetir)?.[1].toLowerCase()} · pra ${l.para === 'casal' ? 'o casal' : l.para === 'eu' ? 'mim' : l.para}`}
      campos={[{ k: 'titulo', rotulo: 'O quê', ph: 'Ex.: Ligar pro contador' }, { k: 'quando', rotulo: 'Quando', tipo: 'datahora' }, { k: 'repetir', rotulo: 'Repetir', tipo: 'opcao', opcoes: REPETE }, { k: 'para', rotulo: 'Pra quem', tipo: 'opcao', opcoes: [['eu', 'Só eu'], ['casal', 'O casal']] }]}
      paraForm={l => ({ titulo: l?.titulo || '', quando: l ? localDeRecife(l.quando) : `${hojeRecife()}T18:00`, repetir: l?.repetir || 'nunca', para: l?.para || 'eu' })}
      salvar={async (f, l) => {
        if (!f.titulo.trim()) return 'Escreva o que é pra lembrar.'
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(f.quando)) return 'Escolha o dia e a hora.'
        // editar = guardar o novo e tirar o antigo (o banco não apaga: só marca o antigo como inativo)
        await api.lembreteCriar(familia!.id, { titulo: f.titulo.trim(), quando: new Date(f.quando + ':00-03:00').toISOString(), repetir: f.repetir as Repetir, para: f.para })
        if (l) await api.lembreteApagar(familia!.id, l.id)
      }} />
  )
}

function CadReserva() {
  const { api, familia, resumo } = useApp()
  const [ondeSalvo, salvar] = useConfig<string>('reserva_onde', 'conta')
  const env = resumo?.envelopes.find(e => e.casa && (e.colchao_meta || 0) > 0) || resumo?.envelopes.find(e => e.casa && e.regra === 'mensal') || resumo?.envelopes[0]
  const combinado = env?.colchao_meta ?? resumo?.colchao ?? 0
  const onde = ondeSalvo === 'guardada' ? 'guardada' : 'conta'
  const nomeOnde = onde === 'conta' ? 'na conta comum, que não rende' : 'guardada onde rende (veja no Guardado)'
  return (
    <Lista<number> nome="A reserva" itens={[combinado]} chave={() => 'r'} vazio=""
      titulo={() => 'Reserva combinada'} sub={() => `É o dinheiro que vocês combinaram nunca gastar. Fica ${nomeOnde}. Quando ela baixa e quando volta, eu anoto nas respostas aqui embaixo.`} lado={v => <Din v={v} />}
      campos={[{ k: 'valor', rotulo: 'Valor combinado da reserva', tipo: 'valor' }, { k: 'onde', rotulo: 'Onde ela fica', tipo: 'opcao', opcoes: [['conta', 'Na conta comum'], ['guardada', 'Guardada onde rende']] }]}
      paraForm={() => ({ valor: vt(combinado), onde })}
      salvar={async f => {
        if (!f.valor || val(f.valor) == null) return 'Digite o valor da reserva.'
        if (env && val(f.valor) !== combinado) await api.salvarEnvelope(familia!.id, env.id, { colchao: val(f.valor)! })
        if (f.onde !== onde && !(await salvar(f.onde))) throw new Error('Não deu pra salvar. Tente de novo.')
      }} />
  )
}

interface Renda { id: string; nome: string; valor: number; dia?: number; dono?: string }
function CadContador() {
  const { familia } = useApp()
  const [todas, salvarTodas, , lidoR] = useConfig<Renda[]>('rendas', [])
  // A3: cada um do casal vê e mexe só na renda dele; a do outro continua guardada
  const rendas = todas.filter(r => !r.dono || r.dono === familia?.membroNome)
  const salvarR = (v: Renda[]) => salvarTodas([...todas.filter(r => !rendas.includes(r)), ...v.map(x => ({ ...x, dono: x.dono || familia?.membroNome }))])
  const [fixas, salvarF, , lidoF] = useConfig<Renda[]>('contas_fixas', [])
  const lista = (nome: string, novo: string, itens: Renda[], salvar: (v: Renda[]) => Promise<boolean>, lido: boolean, ph: string) => (
    <Lista<Renda> nome={nome} novo={novo} itens={itens} chave={r => r.id} vazio={lido ? `Nada cadastrado. Toque em "${novo}".` : 'Buscando…'}
      titulo={r => r.nome} sub={r => (r.dia ? `todo dia ${r.dia}` : 'sem dia marcado')} lado={r => <Din v={r.valor} />}
      campos={[{ k: 'nome', rotulo: nome === 'Rendas' ? 'De quem ou de onde vem' : 'Nome da conta', ph }, { k: 'valor', rotulo: 'Valor por mês', tipo: 'valor' }, { k: 'dia', rotulo: nome === 'Rendas' ? 'Dia em que entra' : 'Dia em que vence', tipo: 'num' }]}
      paraForm={r => ({ nome: r?.nome || '', valor: vt(r?.valor), dia: r?.dia ? String(r.dia) : '' })}
      salvar={async (f, r) => {
        if (!f.nome.trim()) return 'Escreva o nome.'
        if (!val(f.valor)) return 'Digite o valor por mês.'
        if (f.dia && !(Number(f.dia) >= 1 && Number(f.dia) <= 31)) return 'O dia tem que ser de 1 a 31.'
        const n: Renda = { id: r?.id || novoUuid().slice(0, 8), nome: f.nome.trim(), valor: val(f.valor)!, ...(f.dia ? { dia: Number(f.dia) } : {}) }
        if (!(await salvar(r ? itens.map(x => (x.id === r.id ? n : x)) : [...itens, n]))) throw new Error('Não deu pra salvar. Tente de novo.')
      }} />
  )
  return <>{lista('Rendas', 'Nova renda', rendas, salvarR, lidoR, 'Ex.: Salário da Helena')}{lista('Contas fixas', 'Nova conta fixa', fixas, salvarF, lidoF, 'Ex.: Internet')}</>
}

/** Pergunta de quem? Casa pelo id ou pelo nome do funcionário. */
export function donoDaPergunta(p: PerguntaEsc, fs: FuncionarioEsc[]): FuncionarioEsc | undefined {
  const k = chaveSimples(p.funcionario)
  return fs.find(f => f.id === p.funcionario) || fs.find(f => chaveSimples(f.nome) === k || chaveSimples(f.id) === k)
}
