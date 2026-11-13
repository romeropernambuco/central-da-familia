import { useEffect, useState } from 'react'
import { Plus, Save, Target, Wallet, Shield, Banknote, CircleCheck } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { CampoValor, Din, Sheet, Vazio } from '../../componentes/base'
import { useConfig } from '../../app/useConfig'
import { novoUuid } from '../../lib/seguro'
import { Qm } from '../../componentes/Qm'
import type { Fatura } from '../../api/tipos'
import { centavos, hojeRecife, mesCurto, reais, textoParaValor, valorDigitadoValido, valorParaTexto } from '../../lib/formato'

interface Renda { id: string; nome: string; valor: number; /** salário entra na sobra; extra vai pra reserva (regra do salário); variável = muda todo mês (conta o mês fraco) */ tipo?: 'salario' | 'extra' | 'variavel'; fraco?: number; bom?: number; /** de quem é (cada um vê a sua) */ dono?: string }
interface Meta { id: string; nome: string; valor: number; guardado: number }
const novoId = () => novoUuid().slice(0, 8)
/** config_familia guarda lista (app novo) ou objeto por id (importado do app antigo: {r1:{fonte, valor}}). */
function lista(v: unknown): any[] {
  if (Array.isArray(v)) return v
  if (v && typeof v === 'object') return Object.entries(v as Record<string, any>).map(([id, x]) => ({ id, ...x }))
  return []
}

/** Planejamento: limites dos envelopes, colchão, rendas, metas e previsão dos próximos meses. */
export function Planejamento() {
  const { api, familia, resumo, recarregar, toast, versao, tentar, abrirLancar } = useApp()
  const [salvando, setSalvando] = useState(false)
  const [lim, setLim] = useState<Record<string, string>>({})
  const [colchao, setColchao] = useState('')
  // rendas e metas: só gravam depois de lidas e juntam com o que outro celular mudou (useConfig)
  const [rendasCfg, salvarRendas, , rendasLidas] = useConfig<unknown>('rendas', [])
  const [metasCfg, salvarMetas, , metasLidas] = useConfig<unknown>('metas', [])
  const todasRendas: Renda[] = lista(rendasCfg).map(x => ({ id: x.id, nome: String(x.nome ?? x.fonte ?? 'Renda'), valor: Number(x.valor) || 0, tipo: x.tipo === 'extra' ? 'extra' : x.tipo === 'variavel' ? 'variavel' : 'salario', ...(x.fraco ? { fraco: Number(x.fraco), bom: Number(x.bom) || undefined } : {}), ...(x.dono ? { dono: String(x.dono) } : {}) }))
  // A3: cada um do casal vê só a renda dele (a do outro fica guardada, mas não aparece)
  const rendas = todasRendas.filter(r => !r.dono || r.dono === familia?.membroNome)
  const [adultos, setAdultos] = useState(2)
  const [extra, setExtra] = useState<{ entrou: number; guardado: number; itens: { de: string; valor: number; destino: string }[] } | null>(null)
  const [entradas] = useConfig<{ data: string; valor: number; destino: string }[]>('entradas', [])
  const metas: Meta[] = lista(metasCfg).map(x => ({ id: x.id, nome: String(x.nome ?? 'Meta'), valor: Number(x.valor) || 0, guardado: Number(x.guardado) || 0 }))
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [form, setForm] = useState<'renda' | 'meta' | null>(null)
  const casal = familia?.papel === 'casal'
  const envColchao = resumo?.envelopes.find(e => e.casa && e.regra === 'mensal') || resumo?.envelopes[resumo.envelopes.length - 1]

  // O que o casal digita é o limite do mês (limite_base no banco); no semanal, limite_mes já é teto × segundas.
  const base = (e: { limite_mes: number; limite_base?: number }) => e.limite_base ?? e.limite_mes
  // Colchão combinado = envelopes.colchao do envelope da Casa (colchao_meta); resumo.colchao é o que está guardado hoje.
  const colchaoMeta = envColchao?.colchao_meta ?? resumo?.colchao ?? 0
  useEffect(() => {
    if (!resumo) return
    setLim(Object.fromEntries(resumo.envelopes.map(e => [e.id, valorParaTexto(base(e))])))
    setColchao(valorParaTexto(colchaoMeta))
  }, [resumo?.envelopes.map(e => base(e)).join(), colchaoMeta])
  useEffect(() => {
    if (!familia) return
    api.faturas(familia.id, 6).then(setFaturas).catch(() => {})
    api.membros(familia.id).then(m => setAdultos(Math.max(1, m.length))).catch(() => {})
    api.entrouAMais?.(familia.id, hojeRecife().slice(0, 7)).then(setExtra).catch(() => {})
  }, [api, familia?.id, versao])

  if (!resumo || !familia) return <div className="card"><p className="sub">Abrindo…</p></div>
  const salvarLimites = async () => {
    if (salvando) return
    // campo com 2 vírgulas ou vazio não vira zero calado: barra antes de gravar
    const ruim = resumo.envelopes.find(e => !valorDigitadoValido(lim[e.id] || ''))
    if (ruim || !valorDigitadoValido(colchao)) { toast(`Confira o valor de ${ruim ? ruim.nome : 'Reserva'}: use só números e 1 vírgula, tipo 1500,00.`); return }
    setSalvando(true)
    const ok = await tentar(async () => {
      for (const e of resumo.envelopes) {
        const v = textoParaValor(lim[e.id])
        // 1 função no banco (definir_limite): vale deste mês em diante e não mexe em mês fechado
        if (v !== centavos(base(e))) await api.definirLimite(familia.id, e.id, v)
      }
      if (envColchao && textoParaValor(colchao) !== centavos(colchaoMeta)) await api.salvarEnvelope(familia.id, envColchao.id, { colchao: textoParaValor(colchao) })
    })
    await recarregar()
    setSalvando(false)
    if (ok) toast('Limites salvos. O número de hoje já mudou.')
  }
  // regra do salário: só salário entra na sobra; o que entra a mais vai pra reserva. Renda que muda conta o mês fraco.
  const renda = centavos(rendas.filter(r => r.tipo !== 'extra').reduce((s, r) => s + (r.tipo === 'variavel' ? r.fraco || r.valor : r.valor), 0))
  const sozinho = adultos <= 1
  // com 2 adultos, cada um vê a SUA conta: a sua renda menos o seu limite. A Casa e os filhos são da família e ficam fora.
  const outros = sozinho ? resumo.limites_outros || 0 : 0
  const meusLimites = resumo.envelopes.filter(e => sozinho || !e.casa)
  const casaTotal = centavos(resumo.envelopes.filter(e => e.casa).reduce((s, e) => s + base(e), 0))
  const limites = centavos(meusLimites.reduce((s, e) => s + base(e), 0) + outros)
  const sobra = centavos(renda - limites)
  const doTrabalho = centavos((entradas || []).filter(x => x.destino === 'renda' && x.data?.startsWith(hojeRecife().slice(0, 7))).reduce((s, x) => s + x.valor, 0))
  const meses = [...new Set(faturas.map(f => f.mes))].sort().slice(1, 6)

  return (
    <div className="tela-larga">
      <div className="col">
        <section className="card" aria-labelledby="pLim">
          <div className="card-h"><h2 id="pLim"><Wallet size={24} aria-hidden="true" />Limites do mês</h2></div>
          <p className="sub" style={{ marginBottom: 12 }}>Quanto cada um pode gastar por mês. Mudou aqui, muda o número de hoje.</p>
          <div>
            {resumo.envelopes.map(e => (
              <label className="linha-campo" key={e.id}>
                <span className="n">{e.nome}<small>{e.regra === 'diario' ? 'vira valor por dia' : e.regra === 'semanal' ? 'vira teto por semana' : 'vale pro mês'}</small></span>
                <CampoValor valor={lim[e.id] || ''} desligado={!casal} mudar={v => setLim({ ...lim, [e.id]: v })} />
              </label>
            ))}
            <label className="linha-campo">
              <span className="n"><span><Shield size={16} style={{ verticalAlign: '-3px' }} aria-hidden="true" /> Reserva</span><small>o dinheiro que vocês combinaram nunca gastar</small></span>
              <CampoValor valor={colchao} desligado={!casal} mudar={setColchao} />
            </label>
          </div>
          {casal && <button className="btn primary" type="button" disabled={salvando} onClick={salvarLimites} style={{ marginTop: 14 }}><Save size={20} />Salvar limites</button>}
        </section>
      </div>
      <div className="col">
        <section className="card" aria-labelledby="pRen">
          <div className="card-h"><h2 id="pRen">{sozinho ? 'Rendas do mês' : 'Sua renda do mês'}</h2>{casal && <button className="lnk" type="button" onClick={() => setForm('renda')}><Plus size={16} />Renda</button>}</div>
          <p className="lbl">{sobra >= 0 ? (sozinho ? 'Sobra prevista no mês' : 'Sua sobra prevista no mês') : 'Os limites passam da renda'}</p>
          <div className="numrow" style={{ marginBottom: 12 }}>
            {sobra >= 0 ? <Din v={sobra} className="s44" /> : <span className="din-warn"><Din v={-sobra} className="s44" /></span>}
            <Qm titulo={sozinho ? 'Sobra prevista no mês' : 'Sua sobra prevista no mês'} linhas={[{ linha: rendas.some(r => r.tipo === 'variavel') ? 'Sua renda (a do mês fraco, quando muda)' : sozinho ? 'Rendas do mês' : 'Sua renda do mês', valor: renda }, { linha: sozinho ? 'Seu limite e os da Casa' : 'Seu limite', valor: -(limites - outros) }, ...(outros ? [{ linha: 'Limites dos outros da família (só o total)', valor: -outros }] : []), { linha: 'Sobra se o combinado for gasto todo', valor: sobra }]} nota={`Previsão: considera que cada limite gasta tudo o que foi combinado. Dinheiro que entra a mais não entra aqui: vai pra reserva.${sozinho ? '' : ' A Casa e os limites dos filhos são da família: ficam fora da sua conta.'}`} />
          </div>
          {sobra < 0 && <p className="todo warn" style={{ marginBottom: 12 }}>Os limites passam {reais(-sobra)} da renda do mês. Baixe um limite ou anote uma renda que falta.</p>}
          {!sozinho && casaTotal > 0 && <p className="sub" style={{ marginBottom: 8 }}>A Casa (feira e contas) tem {reais(casaTotal)} por mês, da família toda.</p>}
          <ul className="list">{rendas.map(r => <li key={r.id} className="li" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}><span className="m"><b>{r.nome}</b><small>{r.tipo === 'extra' ? 'entrou a mais: vai pra reserva' : r.tipo === 'variavel' ? `muda todo mês: de ${reais(r.fraco || r.valor)} a ${reais(r.bom || r.valor)}. A conta usa o mês fraco.` : 'salário'}</small></span><span className="v"><Din v={r.tipo === 'variavel' ? r.fraco || r.valor : r.valor} /></span></li>)}</ul>
          {doTrabalho > 0 && <p className="sub" style={{ marginTop: 8 }}>Este mês já entrou do seu trabalho: <b>{reais(doTrabalho)}</b>.</p>}
          {/* C17 (BRUNO ideia 2): a regra do salário cumprida, em 1 linha */}
          {extra && (extra.entrou > 0
            ? <p className={'todo ' + (extra.guardado >= extra.entrou ? 'ok' : 'warn')} style={{ marginTop: 10 }}>{extra.guardado >= extra.entrou ? <CircleCheck size={20} aria-hidden="true" /> : null}<span>Entrou a mais este mês: <b>{reais(extra.entrou)}</b>. Foi pra reserva: <b>{reais(extra.guardado)}</b>. {extra.guardado >= extra.entrou ? 'Regra cumprida.' : `Falta guardar ${reais(centavos(extra.entrou - extra.guardado))}.`}</span></p>
            : <p className="sub" style={{ marginTop: 10 }}>Este mês não entrou dinheiro a mais. Quando entrar, ele vai pra reserva (fica guardado, fora do gasto do mês).</p>)}
          {casal && <button className="btn line sm" type="button" style={{ marginTop: 10 }} onClick={() => abrirLancar({ entrou: true })}>+ Entrou dinheiro a mais (vai pra reserva)</button>}
          {!rendas.length && rendasLidas && <Vazio ico={<Banknote size={24} />} acao={casal ? <button className="btn line" type="button" onClick={() => setForm('renda')}><Plus size={20} />Anotar renda</button> : undefined}>Nenhum salário anotado ainda. Com ele, o app mostra quanto sobra no mês.</Vazio>}
        </section>

        <section className="card" aria-labelledby="pMet">
          <div className="card-h"><h2 id="pMet"><Target size={24} aria-hidden="true" />Metas</h2>{casal && <button className="lnk" type="button" onClick={() => setForm('meta')}><Plus size={16} />Meta</button>}</div>
          {metas.map(m => (
            <div key={m.id} style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{m.nome}</b><span className="sub"><Din v={m.guardado} /> de {reais(m.valor)}</span></div>
              <div className="meter ok" style={{ marginTop: 6 }} aria-hidden="true"><i style={{ width: Math.min(100, (m.guardado / (m.valor || 1)) * 100) + '%' }} /></div>
            </div>
          ))}
          {!metas.length && metasLidas && <Vazio ico={<Target size={24} />}>Nenhuma meta. Ex.: viagem de julho, material escolar.</Vazio>}
        </section>

        {meses.length > 0 && (
          <section className="card" aria-labelledby="pPrev">
            <div className="card-h"><h2 id="pPrev">Próximos meses</h2></div>
            <p className="sub" style={{ marginBottom: 8 }}>Salário menos limites menos o que já está nas faturas de cartão.</p>
            {meses.map(m => {
              // as faturas que aparecem aqui já são só as suas (cada um vê o seu cartão)
              const fat = centavos(faturas.filter(f => f.mes === m).reduce((s, f) => s + f.total, 0))
              const s = centavos(renda - limites - fat)
              return (
                <div key={m} className="fat"><span>{mesCurto(m)}</span><span className="sub">faturas {reais(fat)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{s >= 0 ? <Din v={s} /> : <span className="din-warn" title="passa da renda">passa <Din v={-s} /></span>}<Qm titulo={`Previsão de ${mesCurto(m)}`} linhas={[{ linha: sozinho ? 'Rendas' : 'Sua renda', valor: renda }, { linha: sozinho ? 'Limites' : 'Seu limite', valor: -limites }, { linha: 'Já comprometido nas suas faturas', valor: -fat }, { linha: 'Sobra prevista', valor: s }]} /></span>
                </div>
              )
            })}
          </section>
        )}
      </div>
      {form && (
        <Sheet titulo={form === 'renda' ? 'Nova renda' : 'Nova meta'} fechar={() => setForm(null)}>
          <FormSimples tipo={form} salvar={async (nome, valor, muda) => {
            // só some da tela se gravou; se falhar, o aviso aparece e a lista volta como estava (a renda do outro continua guardada)
            const nova: Renda = muda ? { id: novoId(), nome, valor: muda.fraco, tipo: 'variavel', fraco: muda.fraco, bom: muda.bom, dono: familia.membroNome } : { id: novoId(), nome, valor, tipo: 'salario', dono: familia.membroNome }
            const ok = form === 'renda' ? await salvarRendas([...todasRendas, nova]) : await salvarMetas([...metas, { id: novoId(), nome, valor, guardado: 0 }])
            if (ok) setForm(null)
          }} />
        </Sheet>
      )}
    </div>
  )
}

/** Nova renda (rodada 2, AUTONOMA ideia 1): "Valor fixo" ou "Muda todo mês" (mês fraco e mês bom; o teto sai do mês fraco). */
function FormSimples({ tipo, salvar }: { tipo: 'renda' | 'meta'; salvar: (nome: string, valor: number, muda?: { fraco: number; bom: number }) => void }) {
  const [nome, setNome] = useState(''), [v, setV] = useState('')
  const [muda, setMuda] = useState(false), [fraco, setFraco] = useState(''), [bom, setBom] = useState('')
  const f = textoParaValor(fraco), b = textoParaValor(bom)
  return (
    <form style={{ display: 'grid', gap: 12 }} onSubmit={e => { e.preventDefault(); if (!nome) return; if (tipo === 'renda' && muda) { if (f > 0) salvar(nome, f, { fraco: f, bom: Math.max(b, f) }) } else if (v) salvar(nome, textoParaValor(v)) }}>
      <label className="campo"><span>Nome</span><input className="inp" placeholder={tipo === 'renda' ? 'Ex.: Salário, meu trabalho' : 'Ex.: Viagem de julho'} value={nome} onChange={e => setNome(e.target.value)} /></label>
      {tipo === 'renda' && (
        <div className="pills" role="group" aria-label="Como é essa renda">
          <button type="button" className="pill" aria-pressed={!muda} onClick={() => setMuda(false)}>Valor fixo</button>
          <button type="button" className="pill" aria-pressed={muda} onClick={() => setMuda(true)}>Muda todo mês</button>
        </div>
      )}
      {tipo === 'renda' && muda ? (
        <>
          <div className="campo"><span>No mês fraco entra uns</span><CampoValor valor={fraco} mudar={setFraco} rotulo="Mês fraco" /></div>
          <div className="campo"><span>No mês bom entra uns</span><CampoValor valor={bom} mudar={setBom} rotulo="Mês bom" /></div>
          {f > 0 && <p className="todo ok"><span>Seu combinado sugerido: <b>{reais(f)}</b> (o mês fraco). O que vier a mais vai pra reserva{b > f ? `: até ${reais(centavos(b - f))} no mês bom` : ''}.</span></p>}
        </>
      ) : (
        <label className="campo"><span>{tipo === 'renda' ? 'Valor por mês' : 'Quanto precisa juntar'}</span><input className="inp" inputMode="decimal" value={v} onChange={e => setV(e.target.value.replace(/[^\d,]/g, ''))} /></label>
      )}
      <button className="btn primary full" type="submit">Salvar</button>
    </form>
  )
}
