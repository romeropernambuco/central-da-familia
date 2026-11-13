// E6 (fase final, parte de tela): os parâmetros do objetivo 2029 dentro do Planejamento. Os 2 do casal mudam; o banco
// guarda quem mudou, quando, antes e depois; o Focus aparece ao lado de cada taxa. A tela NUNCA calcula 2029: só chama
// futuro() de lib/futuro com a entrada que api.futuroEntradas() montou e escreve o resultado.
import { useEffect, useMemo, useState } from 'react'
import { History, Save, Target } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { CampoValor } from '../../componentes/base'
import { PARAMETROS_INICIAIS, VIRADA, taxaDoTexto, textoDaTaxa } from '../../api/futuro'
import { useFuturo } from '../../app/useDados2'
import { Linha2028 } from '../../componentes/Linha2028'
import type { Objetivo, ParametrosObjetivo } from '../../api/tipos'
import { dataCurta, hojeRecife, mesCurto, reais, textoParaValor, valorDigitadoValido, valorParaTexto } from '../../lib/formato'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const ROTULO: Record<string, string> = {
  gasto_2029_hoje: 'gasto por mês em 2029', renda_certa_2029: 'renda certa em 2029', margem: 'margem', taxa_real_trabalho: 'rendimento acima da inflação',
  aliq_proj: 'imposto do rendimento', piso_meses: 'piso do caixa', mes_reajuste: 'mês do reajuste', travado_focus: 'taxas travadas', taxa_bruta_ano: 'Selic', ipca_ano: 'IPCA',
}
const reaisDe = (c: number | null) => (c == null ? '' : valorParaTexto(c / 100))
const centDe = (t: string) => Math.round(textoParaValor(t) * 100)

/** O que mudou entre 2 versões, em palavras ("margem 10% pra 12%"). */
function mudancas(a: ParametrosObjetivo | null, d: ParametrosObjetivo): string {
  if (!a) return 'gravou os primeiros parâmetros'
  const out: string[] = []
  const v = (k: string, x: unknown) => (x == null ? 'a confirmar' : k === 'gasto_2029_hoje' || k === 'renda_certa_2029' ? reais(Number(x) / 100) : k === 'mes_reajuste' ? MESES[Number(x) - 1] : k === 'travado_focus' ? (x ? 'sim' : 'não') : k === 'piso_meses' ? `${x} meses` : `${textoDaTaxa(String(x))}%`)
  for (const k of Object.keys(ROTULO)) {
    const x = (a as any)[k], y = (d as any)[k]
    if (k === 'taxa_bruta_ano' || k === 'ipca_ano') { for (const ano of new Set([...Object.keys(x || {}), ...Object.keys(y || {})])) if (x?.[ano] !== y?.[ano]) out.push(`${ROTULO[k]} de ${ano} ${v(k, x?.[ano])} pra ${v(k, y?.[ano])}`) }
    else if (JSON.stringify(x) !== JSON.stringify(y)) out.push(`${ROTULO[k]} ${v(k, x)} pra ${v(k, y)}`)
  }
  return out.join('; ') || 'nada mudou'
}

export function Parametros() {
  const { api, familia, versao, tentar, toast } = useApp()
  const [obj, setObj] = useState<Objetivo | null>(null)
  const [f, setF] = useState<Record<string, string>>({})
  const [travado, setTravado] = useState(false)
  const [n, setN] = useState(0)
  const [gravando, setGravando] = useState(false)
  const anos = useMemo(() => { const a0 = Number(hojeRecife().slice(0, 4)), a1 = Number(VIRADA.slice(0, 4)) - 1; return Array.from({ length: Math.max(0, a1 - a0 + 1) }, (_, i) => String(a0 + i)) }, [])
  useEffect(() => {
    if (!familia || familia.papel !== 'casal' || !api.objetivo) return
    api.objetivo(familia.id).then(o => {
      setObj(o)
      const p = o.parametros || PARAMETROS_INICIAIS
      setTravado(p.travado_focus)
      setF({ gasto: reaisDe(p.gasto_2029_hoje), renda: reaisDe(p.renda_certa_2029 || null), margem: textoDaTaxa(p.margem), real: textoDaTaxa(p.taxa_real_trabalho), ir: textoDaTaxa(p.aliq_proj),
        piso: p.piso_meses == null ? '' : String(p.piso_meses), reajuste: String(p.mes_reajuste || 1),
        ...Object.fromEntries(anos.flatMap(a => [[`selic${a}`, textoDaTaxa(p.taxa_bruta_ano[a])], [`ipca${a}`, textoDaTaxa(p.ipca_ano[a])]])) })
    }).catch(() => setObj({ parametros: null, historico: [], focus: [] }))
  }, [api, familia?.id, versao, n])
  // E7: a única conta de 2029 é a do motor (useFuturo chama futuro()); a tela só desenha
  const { ent, saida, estado: estFuturo, motivo: motivoFuturo, atualizar } = useFuturo()
  if (!familia || familia.papel !== 'casal' || !api.objetivo) return null
  if (!obj) return <section className="card"><p className="sub">Buscando o objetivo de 2029…</p></section>
  const focus = new Map(obj.focus.map(x => [String(x.ano), x]))
  const campo = (k: string) => ({ value: f[k] ?? '', onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value.replace(/[^\d,.-]/g, '') }) })

  async function salvar() {
    if (!familia || gravando) return
    const t = (k: string) => taxaDoTexto(f[k] || '')
    const ruins = [['margem', 'margem'], ['real', 'rendimento acima da inflação'], ['ir', 'imposto do rendimento']].filter(([k]) => t(k) == null).map(([, r]) => r)
    const anoTaxa = (pre: string) => Object.fromEntries(anos.filter(a => (f[pre + a] || '').trim()).map(a => [a, taxaDoTexto(f[pre + a])]))
    const selic = anoTaxa('selic'), ipca = anoTaxa('ipca')
    if (Object.values(selic).some(x => x == null) || Object.values(ipca).some(x => x == null)) ruins.push('Selic ou IPCA de algum ano')
    if ((f.gasto && !valorDigitadoValido(f.gasto)) || (f.renda && !valorDigitadoValido(f.renda))) ruins.push('gasto ou renda de 2029')
    const piso = f.piso.trim() ? Number(f.piso) : null, mes = Number(f.reajuste)
    if (piso != null && !(Number.isInteger(piso) && piso >= 0 && piso <= 99)) ruins.push('piso do caixa (meses, de 0 a 99)')
    if (!(mes >= 1 && mes <= 12)) ruins.push('mês do reajuste (1 a 12)')
    if (ruins.length) { toast(`Confira: ${ruins.join(', ')}. Use só números, tipo 10 ou 4,5.`); return }
    const p: ParametrosObjetivo = { gasto_2029_hoje: f.gasto.trim() ? centDe(f.gasto) : null, renda_certa_2029: f.renda.trim() ? centDe(f.renda) : 0, margem: t('margem')!, taxa_real_trabalho: t('real')!, aliq_proj: t('ir')!,
      taxa_bruta_ano: selic as Record<string, string>, ipca_ano: ipca as Record<string, string>, piso_meses: piso, mes_reajuste: mes, travado_focus: travado }
    setGravando(true)
    const ok = await tentar(() => api.objetivoSalvar!(familia.id, p))
    setGravando(false)
    if (ok) { setN(x => x + 1); atualizar(); toast('Objetivo salvo. Fica no histórico quem mudou e o que era antes.') }
  }

  return (
    <section className="card" aria-labelledby="pObj">
      <div className="card-h"><h2 id="pObj"><Target size={24} aria-hidden="true" />Objetivo de 2029</h2></div>
      <p className="sub" style={{ marginBottom: 10 }}>A partir de janeiro de 2029 a família vive do que o dinheiro guardado rende. Estes números decidem a conta. Os 2 mudam; o que era antes fica no histórico.</p>

      {/* E7: o resultado é do motor (futuro()); a tela só escreve e desenha a linha até dez/2028 */}
      {saida && ent?.entrada ? <Linha2028 saida={saida} entrada={ent.entrada} />
        : ent?.motivo ? <p className="todo warn" style={{ marginBottom: 12 }}><span>{ent.motivo}</span></p>
        : estFuturo === 'erro' ? <p className="todo warn" style={{ marginBottom: 12 }}><span>Não deu pra fazer a conta de 2029 agora: {motivoFuturo}</span></p> : null}
      {ent && ent.confirmar.length > 0 && <p className="sub" style={{ margin: '10px 0 12px' }}><b>A confirmar:</b> {ent.confirmar.join('; ')}.</p>}

      <div>
        <label className="linha-campo"><span className="n">Gasto por mês em 2029<small>a preços de hoje. Vazio = a confirmar (usa o teto de hoje)</small></span><CampoValor valor={f.gasto || ''} mudar={v => setF({ ...f, gasto: v })} rotulo="Gasto por mês em 2029" /></label>
        <label className="linha-campo"><span className="n">Renda certa em 2029<small>só com contrato assinado; abate do gasto</small></span><CampoValor valor={f.renda || ''} mudar={v => setF({ ...f, renda: v })} rotulo="Renda certa em 2029" /></label>
        <label className="linha-campo"><span className="n">Margem de segurança (%)<small>a mais, pra imprevisto</small></span><input className="inp" inputMode="decimal" {...campo('margem')} /></label>
        <label className="linha-campo"><span className="n">Rendimento acima da inflação (%)<small>por ano, a taxa que a conta usa pra 2029</small></span><input className="inp" inputMode="decimal" {...campo('real')} /></label>
        <label className="linha-campo"><span className="n">Imposto do rendimento (%)<small>o que o banco desconta do que rende</small></span><input className="inp" inputMode="decimal" {...campo('ir')} /></label>
        <label className="linha-campo"><span className="n">Piso do caixa (meses)<small>meses de teto que nunca vão pra desejo. Vazio = a confirmar (usa 6)</small></span><input className="inp" inputMode="numeric" {...campo('piso')} /></label>
        <label className="linha-campo"><span className="n">Mês do reajuste do teto<small>o teto sobe pela inflação nesse mês ({MESES[(Number(f.reajuste) || 1) - 1]})</small></span><input className="inp" inputMode="numeric" {...campo('reajuste')} /></label>
      </div>

      <h3 className="dayh" style={{ marginTop: 12 }}>Selic e IPCA de cada ano (%)</h3>
      <div className="pills" role="group" aria-label="De onde vem a taxa" style={{ margin: '6px 0 8px' }}>
        <button type="button" className="pill" aria-pressed={!travado} onClick={() => setTravado(false)}>Usar o Focus</button>
        <button type="button" className="pill" aria-pressed={travado} onClick={() => setTravado(true)}>Travar as nossas</button>
      </div>
      <p className="sub" style={{ marginBottom: 6 }}>{travado ? 'Vale o que vocês digitarem; o Focus fica ao lado só pra comparar.' : 'Vale o Focus do Banco Central; o que vocês digitarem só entra no ano que o Focus não tiver.'}</p>
      {anos.map(a => (
        <div key={a} className="linha-campo">
          <span className="n">{a}<small>Focus: {focus.get(a) ? `Selic ${textoDaTaxa(focus.get(a)!.selic_fim)}%, IPCA ${textoDaTaxa(focus.get(a)!.ipca)}% (${dataCurta(focus.get(a)!.divulgado_em)})` : 'sem número ainda'}</small></span>
          <span style={{ display: 'flex', gap: 6 }}>
            <input className="inp" inputMode="decimal" aria-label={`Selic de ${a}`} placeholder="Selic" style={{ width: 80 }} {...campo('selic' + a)} />
            <input className="inp" inputMode="decimal" aria-label={`IPCA de ${a}`} placeholder="IPCA" style={{ width: 80 }} {...campo('ipca' + a)} />
          </span>
        </div>
      ))}
      {obj.focus[0] && <p className="sub" style={{ marginTop: 4 }}>Fonte: {obj.focus[0].fonte}.</p>}
      <button className="btn primary" type="button" disabled={gravando} onClick={salvar} style={{ marginTop: 14 }}><Save size={20} />Salvar o objetivo</button>

      <h3 className="dayh" style={{ marginTop: 16 }}><History size={16} style={{ verticalAlign: '-3px' }} aria-hidden="true" /> Quem mudou</h3>
      {obj.historico.length ? <ul className="list">{obj.historico.slice(0, 6).map((h, i) => (
        <li key={i} className="li" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}><span className="m"><b>{h.quem || 'Alguém do casal'}, {dataCurta(h.quando.slice(0, 10))}</b><small>{mudancas(h.antes, h.depois)}</small></span></li>
      ))}</ul> : <p className="sub">Ninguém mudou ainda. Valem as premissas: margem 10%, 4% acima da inflação, piso de 6 meses.</p>}
      {saida && saida.perguntas.length > 0 && <p className="sub" style={{ marginTop: 8 }}>{saida.perguntas.length === 1 ? '1 recebimento atrasado espera' : `${saida.perguntas.length} recebimentos atrasados esperam`} a resposta do dono, em Recebimentos com data.</p>}
    </section>
  )
}
