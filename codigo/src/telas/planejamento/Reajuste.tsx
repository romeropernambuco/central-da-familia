// E7 (F8): o reajuste do teto, sugerido no mês do reajuste (padrão janeiro) pela inflação do ano anterior. Vale só com
// os 2 do casal aprovando no mesmo teto, a partir do mês de vigência; aí cada um aplica no que ajusta. Com a f_12 quem
// decide é o banco: reajuste_situacao, reajuste_votar (1 voto por adulto, só o próprio) e reajuste_aplicar (recusa sem
// todos os votos, antes do mês e no limite do outro adulto). A conta do teto novo é do motor (reajustarTeto); a config
// reajuste_teto guarda só o que é pra mostrar (inflação, teto de antes, onde já aplicou).
import { useEffect, useState } from 'react'
import { CalendarClock, Check } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useConfig } from '../../app/useConfig'
import { useFuturo } from '../../app/useDados2'
import { reajustarTeto } from '../../lib/futuro'
import { textoDaTaxa } from '../../api/futuro'
import type { Envelope, Objetivo, ReajusteSituacao } from '../../api/tipos'
import { dataCurta, hojeRecife, mesLongo, reais } from '../../lib/formato'
import { mesMais } from '../../lib/plano'

/** Só pra mostrar (f_12: quem decide o "aprovado" é o banco): a inflação e o teto de antes, gravados no 1º voto,
 *  e em quais limites o reajuste já foi aplicado. Chave: o mês de vigência 'AAAA-MM'. */
export interface ReajusteMostra { ipca: string; teto: number; aplicado?: Record<string, string> }
export type ReajusteCfg = Record<string, ReajusteMostra>
export type PeReajuste = 'sem sugestao' | 'sugestao pendente' | 'tetos diferentes' | 'aprovado, vale no mes seguinte' | 'aprovado'

/** Em que pé está o reajuste, pelo que o banco devolveu (reajuste_situacao). Sem conta. */
export function situacaoReajuste(sit: ReajusteSituacao | null, hoje: string): PeReajuste {
  if (!sit || !sit.votos.length) return 'sem sugestao'
  if (sit.aprovado) return hoje.slice(0, 7) < sit.mes_vigencia ? 'aprovado, vale no mes seguinte' : 'aprovado'
  if (!sit.faltam.length) return 'tetos diferentes'
  return 'sugestao pendente'
}

export function Reajuste({ envelopes, mudaLimite }: { envelopes: Envelope[]; mudaLimite: (e: Envelope) => boolean }) {
  const { api, familia, tentar, toast, recarregar } = useApp()
  const { ent } = useFuturo()
  const [cfg, salvar, , lido] = useConfig<ReajusteCfg>('reajuste_teto', {})
  const [obj, setObj] = useState<Objetivo | null>(null)
  const [sit, setSit] = useState<ReajusteSituacao | null>(null)
  const [lidoSit, setLidoSit] = useState(false)
  const [gravando, setGravando] = useState(false)
  const hoje = hojeRecife(), ano = Number(hoje.slice(0, 4)), mesNum = Number(hoje.slice(5, 7))
  const mesReajuste = obj?.parametros?.mes_reajuste || ent?.entrada?.parametros.mes_reajuste || 1
  // o teto novo vale a partir do mês seguinte ao mês do reajuste (dezembro vale em janeiro do ano que vem)
  const vigencia = mesMais(`${ano}-${String(mesReajuste).padStart(2, '0')}`, 1)
  useEffect(() => {
    if (!familia || familia.papel !== 'casal') return
    api.objetivo?.(familia.id).then(setObj).catch(() => {})
  }, [api, familia?.id])
  useEffect(() => {
    if (!familia || familia.papel !== 'casal' || !api.reajusteSituacao) return
    api.reajusteSituacao(familia.id, vigencia).then(x => { setSit(x); setLidoSit(true) }).catch(() => setLidoSit(true))
  }, [api, familia?.id, vigencia])
  if (!familia || familia.papel !== 'casal' || !ent?.entrada || !lido || !lidoSit || !api.reajusteVotar) return null

  const mostra = cfg[vigencia]
  const meus = envelopes.filter(e => mudaLimite(e) && !mostra?.aplicado?.[e.id])
  const pe = situacaoReajuste(sit, hoje)
  const noMes = mesNum === mesReajuste && hoje.slice(0, 7) < vigencia
  if (!noMes && (pe === 'sem sugestao' || (pe === 'aprovado' && !meus.length))) return null

  // a inflação do ano que passou: a que a família digitou no Objetivo de 2029; senão a do Focus (marcada pra conferir)
  const anoIpca = Number(vigencia.slice(0, 4)) - 1
  const daFamilia = obj?.parametros?.ipca_ano?.[String(anoIpca)]
  const focus = obj?.focus.find(f => f.ano === anoIpca)
  const ipca = mostra?.ipca ?? daFamilia ?? focus?.ipca ?? null
  if (!ipca) return <p className="todo warn reajuste" style={{ marginTop: 12 }}><CalendarClock size={20} aria-hidden="true" /><span>{cap(mesLongo(hoje))} é o mês do reajuste do teto, mas falta a inflação de {anoIpca}. Digite o IPCA de {anoIpca} no Objetivo de 2029, aqui embaixo.</span></p>
  const teto = mostra?.teto ?? ent.entrada.parametros.teto_mes
  // o teto em votação: o do 1º voto (os 2 votam no mesmo número); sem voto ainda, a sugestão do motor (F8)
  const sugerido = sit?.teto_aprovado ?? sit?.votos[0]?.teto ?? reajustarTeto(teto, ipca)
  const eu = familia.membroId || ''
  const meuVoto = sit?.votos.find(v => v.membro_id === eu)
  const adultos = (sit?.votos.length || 0) + (sit?.faltam.length || 0)
  const fonte = mostra || daFamilia ? '' : ', do Focus: confira com o IPCA fechado do ano'
  const quando = mesLongo(vigencia + '-01')

  async function aprovar() {
    if (gravando || !familia) return
    setGravando(true)
    let nova: ReajusteSituacao | null = null
    // 1 voto por adulto, só o próprio (o banco tranca); a inflação e o teto de antes ficam na config só pra mostrar
    const ok = await tentar(async () => { nova = await api.reajusteVotar!(familia.id, vigencia, sugerido) })
    if (ok && !mostra) await salvar({ ...cfg, [vigencia]: { ipca, teto } })
    setGravando(false)
    if (ok && nova) { setSit(nova); toast((nova as ReajusteSituacao).aprovado ? `${adultos === 1 ? 'Aprovado' : 'Aprovado pelos 2'}. Vale a partir de ${quando}.` : 'Seu "aprovo" está guardado. Falta a outra pessoa do casal aprovar.') }
  }
  async function aplicar() {
    if (gravando || !familia) return
    setGravando(true)
    const feitos: Record<string, string> = {}
    const ok = await tentar(async () => {
      for (const e of meus) {
        // cada limite sobe pela mesma inflação aprovada (a conta é do motor, F8); o banco confere votos e mês
        const novo = reajustarTeto(Math.round((e.limite_base ?? e.limite_mes) * 100), ipca)
        await api.reajusteAplicar!(familia.id, e.id, vigencia, novo / 100)
        feitos[e.id] = hoje
      }
    })
    if (Object.keys(feitos).length) await salvar({ ...cfg, [vigencia]: { ...(mostra || { ipca, teto }), aplicado: { ...(mostra?.aplicado || {}), ...feitos } } })
    await recarregar()
    setGravando(false)
    if (ok) toast(`Reajuste aplicado em ${meus.map(e => e.nome).join(', ')}. O limite da outra pessoa do casal, só ela aplica.`)
  }

  return (
    <div className={'todo reajuste ' + (pe === 'aprovado' || pe === 'aprovado, vale no mes seguinte' ? 'ok' : 'quieto')} style={{ marginTop: 12 }}>
      <CalendarClock size={20} aria-hidden="true" />
      <span>
        <b>Reajuste do teto de {vigencia.slice(0, 4)}.</b> Pela inflação de {anoIpca} ({textoDaTaxa(ipca)}%{fonte}), o teto da família passa de {reais(teto / 100)} pra <b>{reais(sugerido / 100)}</b> por mês.{' '}
        {pe === 'aprovado' ? 'Aprovado e já vale. Toque pra aplicar nos limites que você ajusta.'
          : pe === 'aprovado, vale no mes seguinte' ? `${adultos === 1 ? 'Aprovado' : 'Os 2 aprovaram'}. Vale a partir de ${quando}: aí cada um aplica no que é seu.`
          : pe === 'tetos diferentes' ? 'Os votos ficaram em tetos diferentes. Votem de novo no mesmo valor.'
          : `Só vale com ${adultos === 1 ? 'o seu "aprovo"' : 'os 2 aprovando'}, a partir de ${quando}.`}
        {sit && sit.votos.length > 0 && pe !== 'aprovado' && <small className="reajuste-quem">{sit.votos.map(v => `${v.nome} aprovou em ${dataCurta(v.votou_em.slice(0, 10))}`).join('. ')}{sit.faltam.length ? `. Falta ${sit.faltam.map(a => a.nome).join(' e ')}.` : '.'}</small>}
        {(pe === 'sem sugestao' || pe === 'sugestao pendente' || pe === 'tetos diferentes') && (!meuVoto || meuVoto.teto !== sugerido) && <span className="row-btns" style={{ marginTop: 8 }}><button className="btn sm primary" type="button" disabled={gravando} onClick={aprovar}><Check size={18} />Aprovo o reajuste</button></span>}
        {pe === 'aprovado' && meus.length > 0 && <span className="row-btns" style={{ marginTop: 8 }}><button className="btn sm primary" type="button" disabled={gravando} onClick={aplicar}>Aplicar em {meus.map(e => e.nome).join(', ')}</button></span>}
      </span>
    </div>
  )
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
