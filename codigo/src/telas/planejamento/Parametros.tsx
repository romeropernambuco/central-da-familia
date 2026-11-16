import { NomeDaPessoa } from '../../componentes/NomeDaPessoa'
import { CampoDecimal, textoPrivado } from '../../componentes/privacidade'
// E6 (fase final, parte de tela): os parâmetros do objetivo 2029 dentro do Planejamento. Os 2 do casal mudam; o banco
// guarda quem mudou, quando, antes e depois; o Focus aparece ao lado de cada taxa. A tela NUNCA calcula 2029: só chama
// futuro() de lib/futuro com a entrada que api.futuroEntradas() montou e escreve o resultado.
import { useEffect, useMemo, useRef, useState } from 'react'
import { History, Save, Target } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { CampoValor } from '../../componentes/base'
import { Qm } from '../../componentes/Qm'
import { PADROES_ECONOMISTA } from '../../lib/futuro'
import { BANCO_GUARDA_ALIQ_RENDA, PARAMETROS_INICIAIS, VIRADA, taxaDoTexto, textoDaTaxa } from '../../api/futuro'
import { useFuturo } from '../../app/useDados2'
import { useAdultos } from '../../app/useMembros'
import { Linha2028, Renda2029 } from '../../componentes/Linha2028'
import type { Objetivo, ParametrosObjetivo } from '../../api/tipos'
import { dataCurta, hojeRecife, mesCurto, reais, textoParaValor, valorDigitadoValido, valorParaTexto } from '../../lib/formato'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const ROTULO: Record<string, string> = {
  gasto_2029_hoje: 'gasto por mês em 2029', renda_certa_2029: 'renda certa em 2029', margem: 'margem', taxa_real_trabalho: 'rendimento acima da inflação',
  aliq_proj: 'imposto até 2028', aliq_renda: 'imposto depois de 2029', aliq_aluguel: 'imposto do aluguel', piso_meses: 'piso do caixa', mes_reajuste: 'mês do reajuste', travado_focus: 'taxas travadas', taxa_bruta_ano: 'Selic', ipca_ano: 'IPCA',
}
/** Aviso do VERIFICADOR: aluguel de imóvel com contrato lançado também em "Renda certa em 2029" conta 2 vezes.
 *  Se o valor do campo for igual ou maior que o aluguel líquido de algum imóvel com contrato, avisa (âmbar). Só compara. */
export function avisoRendaCerta(rendaCentavos: number, imoveis: { apelido: string; aluguel_liquido_mes: number; entra_na_conta: boolean }[] | undefined): string | null {
  if (!(rendaCentavos > 0)) return null
  const i = (imoveis || []).find(x => x.entra_na_conta && x.aluguel_liquido_mes > 0 && rendaCentavos >= x.aluguel_liquido_mes)
  return i ? `Esse valor parece incluir o aluguel de ${i.apelido}. Ele já conta sozinho.` : null
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
    if (k === 'taxa_bruta_ano' || k === 'ipca_ano') { for (const ano of new Set([...Object.keys(x || {}), ...Object.keys(y || {})])) if (x?.[ano] !== y?.[ano]) out.push(`${ROTULO[k]} de ${ano} ${v(k, x?.[ano])} para ${v(k, y?.[ano])}`) }
    else if (JSON.stringify(x) !== JSON.stringify(y)) out.push(`${ROTULO[k]} ${v(k, x)} para ${v(k, y)}`)
  }
  return out.join('; ') || 'nada mudou'
}

export function Parametros() {
  const { familia } = useApp()
  return <ParametrosFamilia key={`${familia?.id}:${familia?.papel}`} />
}

function ParametrosFamilia() {
  const { api, familia, versao, tentar, toast } = useApp()
  const [obj, setObj] = useState<Objetivo | null>(null)
  const [f, setF] = useState<Record<string, string>>({})
  const [travado, setTravado] = useState(false)
  const [n, setN] = useState(0)
  const [gravando, setGravando] = useState(false)
  const editado = useRef(false)
  const edicao = useRef(0)
  const editar = (v: Record<string, string>) => { editado.current = true; edicao.current++; setF(v) }
  const editarTravado = (v: boolean) => { editado.current = true; edicao.current++; setTravado(v) }
  const [falha, setFalha] = useState('')
  const [carregando, setCarregando] = useState(true)
  const anos = useMemo(() => { const a0 = Number(hojeRecife().slice(0, 4)), a1 = Math.max(a0, Number(VIRADA.slice(0, 4)) - 1); /* depois da virada: o ano de hoje (modo renda) */ return Array.from({ length: Math.max(0, a1 - a0 + 1) }, (_, i) => String(a0 + i)) }, [])
  useEffect(() => {
    if (!familia || familia.papel !== 'casal' || !api.objetivo) return
    let vivo = true
    setCarregando(true); setFalha('')
    api.objetivo(familia.id).then(o => {
      if (!vivo) return
      setObj(o)
      if (editado.current) return
      const p = o.parametros || PARAMETROS_INICIAIS
      setTravado(p.travado_focus)
      setF({ gasto: reaisDe(p.gasto_2029_hoje), renda: reaisDe(p.renda_certa_2029 || null), margem: textoDaTaxa(p.margem), real: textoDaTaxa(p.taxa_real_trabalho), ir: textoDaTaxa(p.aliq_proj), ir2: textoDaTaxa(p.aliq_renda || PADROES_ECONOMISTA.aliq_renda), ir3: textoDaTaxa(p.aliq_aluguel || PADROES_ECONOMISTA.aliq_aluguel),
        piso: p.piso_meses == null ? '' : String(p.piso_meses), reajuste: String(p.mes_reajuste || 1),
        ...Object.fromEntries(anos.flatMap(a => [[`selic${a}`, textoDaTaxa(p.taxa_bruta_ano[a])], [`ipca${a}`, textoDaTaxa(p.ipca_ano[a])]])) })
    }).catch(() => { if (vivo) setFalha('Não foi possível buscar os parâmetros.') }).finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [api, familia?.id, versao, n])
  // E7: a única conta de 2029 é a do motor (useFuturo chama futuro()); a tela só desenha
  const { ent, saida, estado: estFuturo, motivo: motivoFuturo, atualizar } = useFuturo()
  // QA E11 (erro 7): família de 1 adulto lê "você", nunca "os 2" nem "vocês"
  const sozinho = useAdultos() === 1
  if (!familia || familia.papel !== 'casal' || !api.objetivo) return null
  const avisoLeitura = <>
    {carregando && <p role="status">Buscando o objetivo de 2029…</p>}
    {falha && <p role="alert">{falha} {obj && 'Dados desatualizados.'} <button type="button" onClick={() => setN(x => x + 1)}>Tentar novamente</button></p>}
  </>
  if (!obj) return <section className="card">{avisoLeitura}</section>
  const focus = new Map(obj.focus.map(x => [String(x.ano), x]))
  const campo = (k: string) => ({ value: f[k] ?? '', onChange: (e: { target: { value: string } }) => editar({ ...f, [k]: e.target.value.replace(/[^\d,.-]/g, '') }) })

  async function salvar() {
    if (!familia || gravando) return
    const t = (k: string) => taxaDoTexto(f[k] || '')
    const ruins = [['margem', 'margem'], ['real', 'rendimento acima da inflação'], ['ir', 'imposto até 2028'], ['ir2', 'imposto depois de 2029'], ['ir3', 'imposto do aluguel']].filter(([k]) => t(k) == null).map(([, r]) => r)
    const anoTaxa = (pre: string) => Object.fromEntries(anos.filter(a => (f[pre + a] || '').trim()).map(a => [a, taxaDoTexto(f[pre + a])]))
    const selic = anoTaxa('selic'), ipca = anoTaxa('ipca')
    if (Object.values(selic).some(x => x == null) || Object.values(ipca).some(x => x == null)) ruins.push('Selic ou IPCA de algum ano')
    if ((f.gasto && !valorDigitadoValido(f.gasto)) || (f.renda && !valorDigitadoValido(f.renda))) ruins.push('gasto ou renda de 2029')
    const piso = f.piso.trim() ? Number(f.piso) : null, mes = Number(f.reajuste)
    if (piso != null && !(Number.isInteger(piso) && piso >= 0 && piso <= 99)) ruins.push('piso do caixa (meses, de 0 a 99)')
    if (!(mes >= 1 && mes <= 12)) ruins.push('mês do reajuste (1 a 12)')
    if (ruins.length) { toast(`Confira: ${ruins.join(', ')}. Use só números, tipo 10 ou 4,5.`); return }
    const p: ParametrosObjetivo = { gasto_2029_hoje: f.gasto.trim() ? centDe(f.gasto) : null, renda_certa_2029: f.renda.trim() ? centDe(f.renda) : 0, margem: t('margem')!, taxa_real_trabalho: t('real')!, aliq_proj: t('ir')!, aliq_renda: t('ir2')!, aliq_aluguel: t('ir3')!,
      taxa_bruta_ano: selic as Record<string, string>, ipca_ano: ipca as Record<string, string>, piso_meses: piso, mes_reajuste: mes, travado_focus: travado }
    setGravando(true)
    const salvaEdicao = edicao.current
    const ok = await tentar(() => api.objetivoSalvar!(familia.id, p))
    setGravando(false)
    if (ok) { if (salvaEdicao === edicao.current) editado.current = false; setN(x => x + 1); atualizar(); toast('Objetivo salvo. Fica no histórico quem mudou e o que era antes.') }
  }

  return (
    <section className="card plan-topo" aria-labelledby="pObj">
      {avisoLeitura}
      <div className="card-h"><h2 id="pObj"><Target size={24} aria-hidden="true" />Objetivo de 2029</h2></div>
      <p className="sub" style={{ marginBottom: 10 }}>A partir de janeiro de 2029 a família vive do que o dinheiro guardado rende. Estes números decidem a conta. {sozinho ? 'Você muda quando quiser' : 'Os 2 mudam'}; o que era antes fica no histórico.</p>

      {/* E7: o resultado é do motor (futuro()); a tela só escreve e desenha a linha até dez/2028 */}
      <details><summary>Ver plano de caixa original e renda certa do objetivo</summary>
      <p className="sub">Este plano mantém a renda certa antiga, sem identificar a origem. A cobertura sem salário está no cartão Rumo a 2029.</p>
      {saida && saida.modo === 'renda' ? <Renda2029 saida={saida} />
        : saida && ent?.entrada ? <Linha2028 saida={saida} entrada={ent.entrada} />
        : ent?.motivo ? <p className="todo warn" style={{ marginBottom: 12 }}><span>{textoPrivado(ent.motivo)}</span></p>
        : estFuturo === 'erro' ? <p className="todo warn" style={{ marginBottom: 12 }}><span>Não foi possível fazer a conta de 2029 agora: {motivoFuturo}</span></p> : null}
      {ent && ent.confirmar.length > 0 && <p className="sub" style={{ margin: '10px 0 12px' }}><b>A confirmar:</b> {ent.confirmar.join('; ')}.</p>}
      </details>

      {/* C3 (sim do dono): as premissas descem pra um bloco recolhido; o gráfico e os 3 números ficam em cima */}
      <details className="numeros-conta">
        <summary><span><b>Os números da conta</b><small>gasto de 2029, margem, rendimento, impostos, piso, Selic e IPCA. Toque para ver ou mudar</small></span></summary>
      <div>
        <label className="linha-campo"><span className="n">Gasto por mês em 2029<small>a preços de hoje. Vazio = a confirmar (usa o teto de hoje)</small></span><CampoValor valor={f.gasto || ''} mudar={v => editar({ ...f, gasto: v })} rotulo="Gasto por mês em 2029" /></label>
        <label className="linha-campo"><span className="n">Renda certa em 2029<small>só com contrato assinado; abate do gasto. Não inclua aluguel de imóvel cadastrado: ele já entra sozinho.</small></span><CampoValor valor={f.renda || ''} mudar={v => editar({ ...f, renda: v })} rotulo="Renda certa em 2029" /></label>
        {(() => { const a = avisoRendaCerta(f.renda && valorDigitadoValido(f.renda) ? centDe(f.renda) : 0, saida?.imoveis); return a ? <p className="todo warn aviso-renda-certa" role="status"><span>{a}</span></p> : null })()}
        <label className="linha-campo"><span className="n">Margem de segurança (%)<small>a mais, para imprevisto</small></span><CampoDecimal className="inp" inputMode="decimal" {...campo('margem')} /></label>
        <label className="linha-campo"><span className="n">Rendimento acima da inflação (%)<small>por ano, a taxa que a conta usa para 2029</small></span><CampoDecimal className="inp" inputMode="decimal" {...campo('real')} /></label>
        {/* revisão E12: 2 impostos. Até 2028 o dinheiro gira (pior caso, 22,5%); de 2029 em diante fica aplicado mais de 2 anos (15%) */}
        <div className="linha-campo"><span className="n"><label htmlFor="pIr">Imposto até 2028 (%)</label><small>o que o banco desconta do que rende até dezembro de 2028 <Qm titulo="Imposto até 2028" linhas={[]} nota="Até 2028 o dinheiro entra e sai do caixa, então a conta usa o imposto mais alto do rendimento (22,5%), para não contar com dinheiro que não vem." /></small></span><CampoDecimal id="pIr" className="inp" inputMode="decimal" {...campo('ir')} /></div>
        <div className="linha-campo"><span className="n"><label htmlFor="pIr2">Imposto depois de 2029 (%)</label><small>{textoPrivado(api.modo === 'real' && !BANCO_GUARDA_ALIQ_RENDA ? `por enquanto vale ${textoDaTaxa(PADROES_ECONOMISTA.aliq_renda)}%: o banco ainda não guarda este número ` : 'o que o banco desconta do que rende a partir de janeiro de 2029 ')}<Qm titulo="Imposto depois de 2029" linhas={[]} nota="A partir de 2029 o dinheiro fica aplicado por mais de 2 anos, e aí o imposto do rendimento cai para 15%. É com ele que a conta diz quanto rende por mês, para sempre." /></small></span><CampoDecimal id="pIr2" className="inp" inputMode="decimal" disabled={api.modo === 'real' && !BANCO_GUARDA_ALIQ_RENDA} {...campo('ir2')} /></div>
        <div className="linha-campo"><span className="n"><label htmlFor="pIr3">Imposto do aluguel (%)</label><small>o que sai do aluguel pro imposto de renda <Qm titulo="Imposto do aluguel" linhas={[]} nota="O aluguel paga imposto de renda todo mês (carnê-leão). A conta começa com 27,5%, o mais alto, para não contar com dinheiro que não vem. Se o contador disser outro número, troque aqui." /></small></span><CampoDecimal id="pIr3" className="inp" inputMode="decimal" {...campo('ir3')} /></div>
        <label className="linha-campo"><span className="n">Piso do caixa (meses)<small>meses de teto que nunca vão para desejo. Vazio = a confirmar (usa 6)</small></span><input className="inp" inputMode="numeric" {...campo('piso')} /></label>
        <label className="linha-campo"><span className="n">Mês do reajuste do teto<small>o teto sobe pela inflação nesse mês ({MESES[(Number(f.reajuste) || 1) - 1]})</small></span><input className="inp" inputMode="numeric" {...campo('reajuste')} /></label>
      </div>

      <h3 className="dayh" style={{ marginTop: 12 }}>Selic e IPCA de cada ano (%)</h3>
      <div className="pills" role="group" aria-label="De onde vem a taxa" style={{ margin: '6px 0 8px' }}>
        <button type="button" className="pill" aria-pressed={!travado} onClick={() => editarTravado(false)}>Usar o Focus</button>
        <button type="button" className="pill" aria-pressed={travado} onClick={() => editarTravado(true)}>{sozinho ? 'Travar as minhas' : 'Travar as nossas'}</button>
      </div>
      <p className="sub" style={{ marginBottom: 6 }}>{travado ? `Vale o que ${sozinho ? 'você digitar' : 'vocês digitarem'}; o Focus fica ao lado só para comparar.` : `Vale o Focus do Banco Central; o que ${sozinho ? 'você digitar' : 'vocês digitarem'} só entra no ano que o Focus não tiver.`}</p>
      {anos.map(a => (
        <div key={a} className="linha-campo">
          <span className="n">{a}<small>Focus: {focus.get(a) ? `Selic ${textoDaTaxa(focus.get(a)!.selic_fim)}%, IPCA ${textoDaTaxa(focus.get(a)!.ipca)}% (${dataCurta(focus.get(a)!.divulgado_em)})` : 'sem número ainda'}</small></span>
          <span style={{ display: 'flex', gap: 6 }}>
            <CampoDecimal className="inp" inputMode="decimal" aria-label={`Selic de ${a}`} placeholder="Selic" style={{ width: 80 }} {...campo('selic' + a)} />
            <CampoDecimal className="inp" inputMode="decimal" aria-label={`IPCA de ${a}`} placeholder="IPCA" style={{ width: 80 }} {...campo('ipca' + a)} />
          </span>
        </div>
      ))}
      {obj.focus[0] && <p className="sub" style={{ marginTop: 4 }}>Fonte: {obj.focus[0].fonte}.</p>}
      <button className="btn primary" type="button" disabled={gravando} onClick={salvar} style={{ marginTop: 14 }}><Save size={20} />Salvar o objetivo</button>

      <h3 className="dayh" style={{ marginTop: 16 }}><History size={16} style={{ verticalAlign: '-3px' }} aria-hidden="true" /> Quem mudou</h3>
      {obj.historico.length ? <ul className="list">{obj.historico.slice(0, 6).map((h, i) => (
        <li key={i} className="li" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}><span className="m"><b><NomeDaPessoa pessoa={{ tipo: 'historico', id: String(i), nome: h.quem }} />, {dataCurta(h.quando.slice(0, 10))}</b><small>{mudancas(h.antes, h.depois)}</small></span></li>
      ))}</ul> : <p className="sub">Ninguém mudou ainda. Valem as premissas: margem 10%, 4% acima da inflação, piso de 6 meses.</p>}
      </details>
      {saida && saida.perguntas.length > 0 && <p className="sub" style={{ marginTop: 8 }}>{saida.perguntas.length === 1 ? '1 recebimento atrasado espera' : `${saida.perguntas.length} recebimentos atrasados esperam`} a resposta do dono, em Recebimentos com data.</p>}
    </section>
  )
}
