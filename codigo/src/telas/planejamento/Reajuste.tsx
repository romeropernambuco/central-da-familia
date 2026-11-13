// E7 (F8): o reajuste do teto, sugerido no mês do reajuste (padrão janeiro) pela inflação do ano anterior. Vale só com
// os 2 do casal aprovando, a partir do mês seguinte à aprovação; aí cada um aplica no que é seu (o banco só deixa cada
// um mudar o próprio limite; Casa e filhos o casal muda). A conta é do motor (reajustarTeto e tetoVigente, lib/futuro):
// a tela só chama e escreve. O que cada um aprovou fica na config da família (chave reajuste_teto), com nome e data.
import { useEffect, useState } from 'react'
import { CalendarClock, Check } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useConfig } from '../../app/useConfig'
import { useFuturo } from '../../app/useDados2'
import { reajustarTeto, tetoVigente } from '../../lib/futuro/f8_reajuste'
import { textoDaTaxa } from '../../api/futuro'
import type { Envelope, Objetivo } from '../../api/tipos'
import { dataCurta, hojeRecife, mesLongo, reais } from '../../lib/formato'

/** O que fica gravado por ano: a sugestão que os 2 aprovaram (congelada no 1º "Aprovo") e quem já aplicou em qual limite. */
export interface ReajusteAno { ipca: string; teto: number; sugerido: number; aprovado: Record<string, { nome: string; em: string }>; aplicado?: Record<string, string> }
export type ReajusteCfg = Record<string, ReajusteAno>

/** Em que pé está o reajuste deste ano (sem conta: quem decide é tetoVigente, do motor). */
export function situacaoReajuste(rec: ReajusteAno | undefined, adultos: { id: string }[], hoje: string): 'sem sugestao' | 'sugestao pendente' | 'aprovado, vale no mes seguinte' | 'aprovado' {
  if (!rec) return 'sem sugestao'
  const votos = adultos.map(a => !!rec.aprovado[a.id])
  const ultima = Object.values(rec.aprovado).map(x => x.em).sort().pop() || null
  return tetoVigente(rec.teto, rec.sugerido, votos, votos.every(Boolean) && ultima ? ultima.slice(0, 7) : null, hoje.slice(0, 7)).situacao
}

export function Reajuste({ envelopes, mudaLimite }: { envelopes: Envelope[]; mudaLimite: (e: Envelope) => boolean }) {
  const { api, familia, tentar, toast, recarregar } = useApp()
  const { ent } = useFuturo()
  const [cfg, salvar, , lido] = useConfig<ReajusteCfg>('reajuste_teto', {})
  const [obj, setObj] = useState<Objetivo | null>(null)
  const [adultos, setAdultos] = useState<{ id: string; nome: string }[]>([])
  const [gravando, setGravando] = useState(false)
  useEffect(() => {
    if (!familia || familia.papel !== 'casal') return
    api.objetivo?.(familia.id).then(setObj).catch(() => {})
    api.membros(familia.id).then(m => setAdultos(m.filter(x => !x.papel || x.papel === 'casal'))).catch(() => {})
  }, [api, familia?.id])
  if (!familia || familia.papel !== 'casal' || !ent?.entrada || !lido || !adultos.length) return null

  const hoje = hojeRecife(), ano = Number(hoje.slice(0, 4)), mesNum = Number(hoje.slice(5, 7))
  const mesReajuste = obj?.parametros?.mes_reajuste || ent.entrada.parametros.mes_reajuste || 1
  const rec = cfg[String(ano)]
  const aplicadoTudo = !!rec?.aplicado && envelopes.every(e => rec.aplicado![e.id])
  if (!(mesNum === mesReajuste && !aplicadoTudo) && !(rec && !aplicadoTudo)) return null

  // a inflação do ano que passou: a que a família digitou no Objetivo de 2029; senão a do Focus (marcada pra conferir)
  const daFamilia = obj?.parametros?.ipca_ano?.[String(ano - 1)]
  const focus = obj?.focus.find(f => f.ano === ano - 1)
  const ipca = rec?.ipca ?? daFamilia ?? focus?.ipca ?? null
  if (!ipca) return <p className="todo warn reajuste" style={{ marginTop: 12 }}><CalendarClock size={20} aria-hidden="true" /><span>{cap(mesLongo(hoje))} é o mês do reajuste do teto, mas falta a inflação de {ano - 1}. Digite o IPCA de {ano - 1} no Objetivo de 2029, aqui embaixo.</span></p>
  const teto = rec?.teto ?? ent.entrada.parametros.teto_mes
  const sugerido = rec?.sugerido ?? reajustarTeto(teto, ipca)
  const sit = situacaoReajuste(rec, adultos, hoje)
  const eu = familia.membroId || ''
  const jaAprovei = !!rec?.aprovado[eu]
  const faltam = adultos.filter(a => !rec?.aprovado[a.id])
  const meus = envelopes.filter(e => mudaLimite(e) && !rec?.aplicado?.[e.id])
  const deOutros = envelopes.filter(e => !mudaLimite(e) && !rec?.aplicado?.[e.id])
  const fonte = rec || daFamilia ? '' : ' (do Focus; confira com o IPCA fechado do ano)'
  const proximo = mesLongo(`${ano}-${String(Math.min(12, mesNum + 1)).padStart(2, '0')}-01`)

  async function aprovar() {
    if (gravando) return
    setGravando(true)
    const base: ReajusteAno = rec ?? { ipca, teto, sugerido, aprovado: {} }
    const ok = await salvar({ ...cfg, [String(ano)]: { ...base, aprovado: { ...base.aprovado, [eu]: { nome: familia!.membroNome, em: hoje } } } })
    setGravando(false)
    if (ok) toast(faltam.length <= 1 ? `Aprovado pelos ${adultos.length === 1 ? 'seus números' : '2'}. Vale a partir de ${proximo}.` : 'Seu "aprovo" está guardado. Falta a outra pessoa do casal aprovar.')
  }
  async function aplicar() {
    if (gravando || !rec) return
    setGravando(true)
    const feitos: Record<string, string> = {}
    const ok = await tentar(async () => {
      for (const e of meus) {
        // cada limite sobe pela mesma inflação aprovada (a conta é do motor, F8)
        const novo = reajustarTeto(Math.round((e.limite_base ?? e.limite_mes) * 100), rec.ipca)
        await api.definirLimite(familia!.id, e.id, novo / 100)
        feitos[e.id] = hoje
      }
    })
    if (Object.keys(feitos).length) await salvar({ ...cfg, [String(ano)]: { ...rec, aplicado: { ...(rec.aplicado || {}), ...feitos } } })
    await recarregar()
    setGravando(false)
    if (ok) toast(`Reajuste aplicado em ${meus.map(e => e.nome).join(', ')}.${deOutros.length ? ` ${deOutros.map(e => e.nome).join(', ')}: só quem é dono aplica.` : ''}`)
  }

  return (
    <div className={'todo reajuste ' + (sit === 'aprovado' || sit === 'aprovado, vale no mes seguinte' ? 'ok' : 'quieto')} style={{ marginTop: 12 }}>
      <CalendarClock size={20} aria-hidden="true" />
      <span>
        <b>Reajuste do teto de {ano}.</b> Pela inflação de {ano - 1} ({textoDaTaxa(ipca)}%{fonte}), o teto da família passa de {reais(teto / 100)} pra <b>{reais(sugerido / 100)}</b> por mês.{' '}
        {sit === 'aprovado' ? (meus.length ? 'Os 2 aprovaram e já vale. Toque pra aplicar nos limites que você muda.' : deOutros.length ? `Você já aplicou. Falta ${deOutros.map(e => e.nome).join(', ')}: só quem é dono aplica.` : '')
          : sit === 'aprovado, vale no mes seguinte' ? `${adultos.length === 1 ? 'Aprovado' : 'Os 2 aprovaram'}. Vale a partir de ${proximo}: aí cada um aplica no que é seu.`
          : `Só vale com ${adultos.length === 1 ? 'o seu "aprovo"' : 'os 2 aprovando'}, a partir do mês seguinte.`}
        {rec && sit === 'sugestao pendente' && <small className="reajuste-quem">{Object.values(rec.aprovado).map(a => `${a.nome} aprovou em ${dataCurta(a.em)}`).join('. ')}{faltam.length ? `. Falta ${faltam.map(a => a.nome).join(' e ')}.` : '.'}</small>}
        {sit !== 'aprovado' && sit !== 'aprovado, vale no mes seguinte' && !jaAprovei && <span className="row-btns" style={{ marginTop: 8 }}><button className="btn sm primary" type="button" disabled={gravando} onClick={aprovar}><Check size={18} />Aprovo o reajuste</button></span>}
        {sit === 'aprovado' && meus.length > 0 && <span className="row-btns" style={{ marginTop: 8 }}><button className="btn sm primary" type="button" disabled={gravando} onClick={aplicar}>Aplicar em {meus.map(e => e.nome).join(', ')}</button></span>}
      </span>
    </div>
  )
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
