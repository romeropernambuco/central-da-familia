import { useEffect, useState } from 'react'
import { Plus, Save, Target, Wallet, Shield, Banknote } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { CampoValor, Din, Sheet, Vazio } from '../../componentes/base'
import { useConfig } from '../../app/useConfig'
import { novoUuid } from '../../lib/seguro'
import { Qm } from '../../componentes/Qm'
import type { Fatura } from '../../api/tipos'
import { centavos, mesCurto, reais, textoParaValor, valorDigitadoValido, valorParaTexto } from '../../lib/formato'

interface Renda { id: string; nome: string; valor: number }
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
  const { api, familia, resumo, recarregar, toast, versao, tentar } = useApp()
  const [salvando, setSalvando] = useState(false)
  const [lim, setLim] = useState<Record<string, string>>({})
  const [colchao, setColchao] = useState('')
  // rendas e metas: só gravam depois de lidas e juntam com o que outro celular mudou (useConfig)
  const [rendasCfg, salvarRendas, , rendasLidas] = useConfig<unknown>('rendas', [])
  const [metasCfg, salvarMetas, , metasLidas] = useConfig<unknown>('metas', [])
  const rendas: Renda[] = lista(rendasCfg).map(x => ({ id: x.id, nome: String(x.nome ?? x.fonte ?? 'Renda'), valor: Number(x.valor) || 0 }))
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
  const renda = centavos(rendas.reduce((s, r) => s + r.valor, 0))
  const limites = centavos(resumo.envelopes.reduce((s, e) => s + base(e), 0))
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
          <div className="card-h"><h2 id="pRen">Rendas do mês</h2>{casal && <button className="lnk" type="button" onClick={() => setForm('renda')}><Plus size={16} />Renda</button>}</div>
          <p className="lbl">Sobra prevista no mês</p>
          <div className="numrow" style={{ marginBottom: 12 }}>
            <Din v={centavos(renda - limites)} className="s44" />
            <Qm titulo="Sobra prevista no mês" linhas={[{ linha: 'Rendas do mês', valor: renda }, { linha: 'Limites de todo mundo', valor: -limites }, { linha: 'Sobra se todo mundo gastar o combinado', valor: centavos(renda - limites) }]} nota="Previsão: considera que cada envelope gasta tudo o que foi combinado." />
          </div>
          <ul className="list">{rendas.map(r => <li key={r.id} className="li" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}><span className="m"><b>{r.nome}</b></span><span className="v"><Din v={r.valor} /></span></li>)}</ul>
          {!rendas.length && rendasLidas && <Vazio ico={<Banknote size={24} />} acao={casal ? <button className="btn line" type="button" onClick={() => setForm('renda')}><Plus size={20} />Anotar renda</button> : undefined}>Nenhuma renda anotada. Sem ela a sobra do mês aparece negativa.</Vazio>}
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
            <p className="sub" style={{ marginBottom: 8 }}>Renda menos limites menos o que já está nas faturas de cartão.</p>
            {meses.map(m => {
              const fat = centavos(faturas.filter(f => f.mes === m).reduce((s, f) => s + f.total, 0))
              const s = centavos(renda - limites - fat)
              return (
                <div key={m} className="fat"><span>{mesCurto(m)}</span><span className="sub">faturas {reais(fat)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Din v={s} /><Qm titulo={`Previsão de ${mesCurto(m)}`} linhas={[{ linha: 'Rendas', valor: renda }, { linha: 'Limites', valor: -limites }, { linha: 'Já comprometido em faturas', valor: -fat }, { linha: 'Sobra prevista', valor: s }]} /></span>
                </div>
              )
            })}
          </section>
        )}
      </div>
      {form && (
        <Sheet titulo={form === 'renda' ? 'Nova renda' : 'Nova meta'} fechar={() => setForm(null)}>
          <FormSimples tipo={form} salvar={async (nome, valor) => {
            // só some da tela se gravou; se falhar, o aviso aparece e a lista volta como estava
            const ok = form === 'renda' ? await salvarRendas([...rendas, { id: novoId(), nome, valor }]) : await salvarMetas([...metas, { id: novoId(), nome, valor, guardado: 0 }])
            if (ok) setForm(null)
          }} />
        </Sheet>
      )}
    </div>
  )
}

function FormSimples({ tipo, salvar }: { tipo: 'renda' | 'meta'; salvar: (nome: string, valor: number) => void }) {
  const [nome, setNome] = useState(''), [v, setV] = useState('')
  return (
    <form style={{ display: 'grid', gap: 12 }} onSubmit={e => { e.preventDefault(); if (nome && v) salvar(nome, textoParaValor(v)) }}>
      <label className="campo"><span>Nome</span><input className="inp" placeholder={tipo === 'renda' ? 'Ex.: Salário' : 'Ex.: Viagem de julho'} value={nome} onChange={e => setNome(e.target.value)} /></label>
      <label className="campo"><span>{tipo === 'renda' ? 'Valor por mês' : 'Quanto precisa juntar'}</span><input className="inp" inputMode="decimal" value={v} onChange={e => setV(e.target.value.replace(/[^\d,]/g, ''))} /></label>
      <button className="btn primary full" type="submit">Salvar</button>
    </form>
  )
}
