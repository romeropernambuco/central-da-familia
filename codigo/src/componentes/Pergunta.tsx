import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BellRing, Calculator, Camera, Check, ClipboardCheck, Copy, CreditCard, FileText, ShieldCheck, ShoppingBasket, UserRound, Landmark } from 'lucide-react'
import type { EstadoItem, ItemEstoque, OpcaoPergunta, Pede, PerguntaEsc } from '../api/tipos'
import { useApp } from '../app/contexto'
import { CampoValor } from './base'
import { umaPorVez } from '../lib/seguro'
import { reduzirFoto } from '../lib/foto'
import { hojeRecife, textoParaValor, valorDigitadoValido } from '../lib/formato'

const ICO: Record<string, (s: number) => ReactNode> = {
  contador: s => <Calculator size={s} />, colchao: s => <ShieldCheck size={s} />, cartao: s => <CreditCard size={s} />, folha: s => <FileText size={s} />,
  comprador: s => <ShoppingBasket size={s} />, fiscal: s => <ClipboardCheck size={s} />, guardado: s => <Landmark size={s} />, secretaria: s => <BellRing size={s} />,
}
/** Rosto do funcionário nas listas: ícone num círculo (o boneco 3D só existe na tela Escritório). */
export function FuncIco({ id, size = 40, precisa }: { id: string; size?: number; precisa?: boolean }) {
  return <span className={'tile func' + (precisa ? ' precisa' : '')} style={{ width: size, height: size }} aria-hidden="true">{(ICO[id] || (s => <UserRound size={s} />))(Math.round(size * 0.5))}</span>
}

/** Devolve false se não gravou; a mensagem pronta quando a opção é copiar. */
export type Responder = (pergunta: string, opcao: string, dados?: Record<string, unknown>) => Promise<boolean | { mensagem?: string }>
const ESTADOS: [EstadoItem, string][] = [['tem', 'Tem'], ['pouco', 'Pouco'], ['acabou', 'Acabou']]

/** Lista dos itens da casa pra marcar tem, pouco ou acabou. */
export function Contagem({ salvar, gravando }: { salvar: (itens: { item_id: string; estado: EstadoItem }[]) => void; gravando: boolean }) {
  const { api, familia } = useApp()
  const [itens, setItens] = useState<ItemEstoque[] | null>(null)
  const [marca, setMarca] = useState<Record<string, EstadoItem>>({})
  const [erro, setErro] = useState('')
  useEffect(() => { if (familia) api.estoque(familia.id).then(x => setItens(x.itens.filter(i => i.ativo))).catch((x: Error) => setErro(x.message)) }, [api, familia?.id])
  if (erro) return <p className="aviso-erro" role="alert">Não deu pra buscar os itens: {erro}</p>
  if (!itens) return <p className="sub">Buscando os itens da casa…</p>
  if (!itens.length) return <p className="sub">Ainda não tem item cadastrado. O casal cadastra na ficha do Fiscal da Feira, em "O que eu cuido".</p>
  return (
    <div className="contagem">
      <ul className="list">
        {itens.map(i => (
          <li key={i.id} className="cont-l">
            <span className="n"><b>{i.nome}</b><small>{i.categoria}</small></span>
            <span className="seg tres" role="group" aria-label={`${i.nome}: como está`}>
              {ESTADOS.map(([e, r]) => <button key={e} type="button" aria-pressed={(marca[i.id] || 'tem') === e} onClick={() => setMarca({ ...marca, [i.id]: e })}>{r}</button>)}
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="btn primary full" disabled={gravando} onClick={() => salvar(itens.map(i => ({ item_id: i.id, estado: marca[i.id] || 'tem' })))}>Salvar a contagem</button>
    </div>
  )
}

/**
 * 1 pergunta de 1 funcionário, com os botões de resposta. 1 passo por vez (padrão do Cobrador do app do Michel):
 * resposta simples grava com 1 toque; resposta que pede dia, valor, texto, foto ou contagem abre só esse passo.
 */
export function PerguntaCard({ p, quem, responder, posicao, abrirCadastro, semQuem, corrige, aoResponder }: { p: PerguntaEsc; quem: string; responder: Responder; posicao?: string; abrirCadastro?: () => void; semQuem?: boolean; corrige?: boolean; aoResponder?: () => void }) {
  const { abrirLancar, familia, api, tentar } = useApp()
  const equipe = familia?.papel === 'equipe'
  const [aberta, setAberta] = useState<OpcaoPergunta | null>(null)
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [gravando, setGravando] = useState(false)
  const [copiado, setCopiado] = useState('')
  const [erro, setErro] = useState('')
  const camera = useRef<HTMLInputElement>(null)
  // trava do toque duplo: vale no mesmo instante do 1º toque
  const trava = useMemo(() => umaPorVez(async (opcao: string, dados?: Record<string, unknown>) => { setGravando(true); try { const r = await responder(p.id, opcao, dados); if (r !== false) aoResponder?.() } finally { setGravando(false) } }), [responder, p.id])
  // corrigindo uma resposta antiga: vai junto pra o diário guardar a antiga e valer a nova
  const extra = corrige ? { corrige: true } : undefined

  const tocar = async (o: OpcaoPergunta) => {
    setErro('')
    // atalhos (`abre`): levam pra onde a coisa se resolve. Lançar e cadastro não gravam resposta: a pergunta some quando o dado entrar.
    if (o.abre === 'lancar' || /^lancar/.test(o.id)) { abrirLancar(/dif/.test(p.id) && p.valor ? { valor: p.valor, descricao: 'Diferença da fatura' } : undefined); return }
    if (o.abre === 'cartao') { if (abrirCadastro) abrirCadastro(); else location.hash = '#/escritorio?f=' + p.funcionario; return }
    if (o.abre === 'guardado') { await trava(o.id, extra); location.hash = '#/guardado'; return }
    if (o.abre === 'orcamento') { await trava(o.id, extra); location.hash = '#/orcamento'; return }
    if (/^copiar/.test(o.id)) {
      // a mensagem pronta vem na resposta do banco (efeito.mensagem)
      setGravando(true)
      const r = await responder(p.id, o.id, extra)
      setGravando(false)
      const texto = (typeof r === 'object' && r.mensagem) || p.mensagem || ''
      if (texto) { try { await navigator.clipboard.writeText(texto) } catch { /* sem permissão: o texto aparece logo abaixo pra copiar à mão */ } setCopiado(texto) }
      return
    }
    if (o.pede || o.abre === 'nota' || o.abre === 'contagem') { setAberta(aberta?.id === o.id ? null : o); setCampos({ data: hojeRecife() }); return }
    trava(o.id, extra)
  }
  const tipos = aberta ? ([aberta.pede, aberta.pede2].filter(Boolean) as Pede[]).filter(t => !(equipe && t === 'valor')) : []
  const salvar = () => {
    if (!aberta) return
    const dados: Record<string, unknown> = { ...extra }
    for (const t of tipos) {
      const obrig = t === aberta.pede, v = (campos[t] || '').trim()
      if (t === 'valor') { if (!v && !obrig) continue; if (!valorDigitadoValido(v) || textoParaValor(v) <= 0) { setErro('Digite o valor, por exemplo 312,40.'); return } dados.valor = textoParaValor(v) }
      if (t === 'data') { if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { if (!obrig) continue; setErro('Escolha o dia.'); return } dados.data = v }
      if (t === 'texto') { if (!v) { if (!obrig) continue; setErro('Escreva a resposta.'); return } dados.texto = v }
    }
    trava(aberta.id, dados)
  }
  const foto = async (arq: File | null) => {
    if (!aberta || !familia) return
    setGravando(true); setErro('')
    let caminho = ''
    const ok = await tentar(async () => {
      // a nota é guardada como foto reduzida; no exemplo nenhuma foto sai do aparelho
      const b64 = arq ? await reduzirFoto(arq) : 'exemplo'
      caminho = await api.notaSubir(familia.id, p.id.split(':')[1] || '', b64)
    })
    setGravando(false)
    if (ok) trava(aberta.id, { ...extra, caminho })
  }
  const rotuloTexto = /nota/.test(aberta?.id || '') ? 'Por que não teve nota? (feira livre, açougue)' : 'Escreva aqui'

  return (
    <div className="perg" data-pergunta={p.id}>
      {!semQuem && <p className="perg-quem"><FuncIco id={p.funcionario} size={32} precisa /><span><b>{quem}</b>{posicao ? ` · ${posicao}` : ''}</span>{(p.espera_dias || 0) > 0 && <span className="chip warn">{p.espera_dias === 1 ? 'esperando há 1 dia' : `esperando há ${p.espera_dias} dias`}</span>}</p>}
      <p className="perg-t">{p.pergunta}</p>
      {p.contexto && <p className="perg-c">{p.contexto}</p>}
      <div className="perg-ops" role="group" aria-label="Respostas">
        {p.opcoes.map((o, i) => (
          <button key={o.id} type="button" className={'btn' + (i === 0 ? ' primary' : ' line')} disabled={gravando} aria-expanded={o.pede ? aberta?.id === o.id : undefined} onClick={() => tocar(o)}>
            {/^copiar/.test(o.id) && <Copy size={18} />}{o.abre === 'nota' && <Camera size={18} />}{o.rotulo}
          </button>
        ))}
      </div>
      {copiado && <p className="perg-msg" role="status"><Check size={18} aria-hidden="true" /><span>Copiado. Cole no WhatsApp: "{copiado}"</span></p>}
      {aberta?.abre === 'nota' && (
        <div className="perg-campo col">
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={ev => { const f = ev.target.files?.[0]; ev.target.value = ''; if (f) foto(f) }} />
          <button type="button" className="btn primary" disabled={gravando} onClick={() => camera.current?.click()}><Camera size={20} />{gravando ? 'Guardando a nota…' : 'Tirar foto da nota'}</button>
          {api.modo === 'exemplo' && <button type="button" className="btn line" disabled={gravando} onClick={() => foto(null)}>Usar uma nota de exemplo</button>}
          <p className="sub">{equipe ? 'A foto vai pro casal. Você não precisa digitar nenhum valor.' : 'A foto fica guardada junto da feira, só pra família.'}</p>
        </div>
      )}
      {aberta?.abre === 'contagem' && <div className="perg-campo col"><Contagem gravando={gravando} salvar={itens => trava(aberta.id, { ...extra, itens })} /></div>}
      {aberta && !aberta.abre && (
        <div className="perg-campo">
          {tipos.map(t => {
            const opc = t !== aberta.pede ? ' (se quiser)' : ''
            return t === 'data' ? <label className="campo" key={t}><span>Em que dia?{opc}</span><input className="inp" type="date" value={campos.data || ''} onChange={ev => setCampos({ ...campos, data: ev.target.value })} /></label>
              : t === 'valor' ? <div className="campo" key={t}><span>{/feira/.test(p.id) ? 'Quanto deu?' : 'Qual é o valor?'}{opc}</span><CampoValor valor={campos.valor || ''} mudar={v => setCampos({ ...campos, valor: v })} rotulo="Valor" /></div>
                : <label className="campo" key={t}><span>{rotuloTexto}{opc}</span><input className="inp" value={campos.texto || ''} maxLength={140} onChange={ev => setCampos({ ...campos, texto: ev.target.value })} /></label>
          })}
          {!tipos.length && <p className="sub">É só confirmar.</p>}
          <button type="button" className="btn primary" disabled={gravando} onClick={salvar}>Salvar resposta</button>
        </div>
      )}
      {erro && <p className="erro" role="alert">{erro}</p>}
    </div>
  )
}
