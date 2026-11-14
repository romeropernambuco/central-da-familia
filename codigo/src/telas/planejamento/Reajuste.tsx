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
export type PeReajuste = 'sem sugestao' | 'sugestao pendente' | 'tetos diferentes' | 'aprovado, vale no mes seguinte' | 'aprovado' | 'vencido'

/** O IPCA é texto decimal ("0.05" e "0.0500" são o mesmo número): compara como número (revisão E12). */
export const mesmoIpca = (a: string | null | undefined, b: string | null | undefined) => a != null && b != null && Number(a) === Number(b)

/** f_14: o prazo de aplicar é até o último dia (aplicar_ate) inclusive; null = sem prazo. */
export const prazoPassou = (aplicarAte: string | null | undefined, hoje: string) => !!aplicarAte && hoje > aplicarAte

/** Em que pé está o reajuste, pelo que o banco devolveu (reajuste_situacao). Sem conta: "já vale" é do banco (R1). */
export function situacaoReajuste(sit: ReajusteSituacao | null, hoje?: string): PeReajuste {
  if (!sit || !sit.votos.length) return 'sem sugestao'
  // f_14: depois do último dia (aplicar_ate) o voto vence; o banco também manda vencido e ja_vale falso
  if (sit.aprovado && (sit.vencido || (hoje != null && prazoPassou(sit.aplicar_ate, hoje)))) return 'vencido'
  if (sit.aprovado) return sit.ja_vale ? 'aprovado' : 'aprovado, vale no mes seguinte'
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
  // o mês em que o voto é guardado (o seguinte ao mês do reajuste). Quando vale de verdade é o banco que diz (vale_a_partir)
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
  // o voto só vale pra um mês que ainda não começou (o banco recusa depois)
  const prazo = hoje.slice(0, 7) < vigencia
  // revisão E12: aplicar tem prazo quando o banco manda aplicar_ate; depois dele o botão some e a tela avisa
  const passouAplicar = prazoPassou(sit?.aplicar_ate, hoje)
  const noMes = mesNum === mesReajuste && prazo
  if (!noMes && (pe === 'sem sugestao' || ((pe === 'aprovado' || pe === 'vencido') && !meus.length))) return null

  // a inflação do ano que passou: a que a família digitou no Objetivo de 2029; senão a do Focus (marcada pra conferir)
  const anoIpca = Number(vigencia.slice(0, 4)) - 1
  const daFamilia = obj?.parametros?.ipca_ano?.[String(anoIpca)]
  const focus = obj?.focus.find(f => f.ano === anoIpca)
  const ipca = mostra?.ipca ?? daFamilia ?? focus?.ipca ?? null
  if (!ipca) return <p className="todo warn reajuste" style={{ marginTop: 12 }}><CalendarClock size={20} aria-hidden="true" /><span>{cap(mesLongo(hoje))} é o mês do reajuste do teto, mas falta a inflação de {anoIpca}. Digite o IPCA de {anoIpca} no Objetivo de 2029, aqui embaixo.</span></p>
  const teto = mostra?.teto ?? ent.entrada.parametros.teto_mes
  // o teto em votação: o do 1º voto (os 2 votam no mesmo número); sem voto ainda, a sugestão do motor (F8)
  const sugerido = sit?.teto_aprovado ?? sit?.votos[0]?.teto ?? reajustarTeto(teto, ipca)
  const ipcaVoto = sit?.ipca_aprovado ?? sit?.votos[0]?.ipca ?? ipca
  const eu = familia.membroId || ''
  const meuVoto = sit?.votos.find(v => v.membro_id === eu)
  const adultos = (sit?.votos.length || 0) + (sit?.faltam.length || 0)
  const fonte = mostra || daFamilia ? '' : ', do Focus: confira com o IPCA fechado do ano'
  const quando = mesLongo((sit?.vale_a_partir || vigencia) + '-01')

  async function aprovar() {
    if (gravando || !familia) return
    setGravando(true)
    let nova: ReajusteSituacao | null = null
    // 1 voto por adulto, só o próprio (o banco tranca); a inflação e o teto de antes ficam na config só pra mostrar
    const ok = await tentar(async () => {
      await api.reajusteVotar!(familia.id, vigencia, sugerido, ipcaVoto)
      // R2 (revisão): relê a situação depois de votar. Os 2 votando quase juntos: cada voto devolve a situação de antes
      // do commit do outro ("Falta a outra pessoa"); a releitura mostra os 2 votos
      nova = await api.reajusteSituacao!(familia.id, vigencia)
    })
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
        // R1: o banco calcula o limite novo (limite de antes × (1 + IPCA votado)) e confere votos e mês
        await api.reajusteAplicar!(familia.id, e.id, vigencia)
        feitos[e.id] = hoje
      }
    })
    if (Object.keys(feitos).length) await salvar({ ...cfg, [vigencia]: { ...(mostra || { ipca, teto }), aplicado: { ...(mostra?.aplicado || {}), ...feitos } } })
    await recarregar()
    setGravando(false)
    if (ok) toast(`Reajuste aplicado em ${meus.map(e => e.nome).join(', ')}.${adultos > 1 ? ' O limite da outra pessoa do casal, só ela aplica.' : ''}`)
  }

  return (
    <div className={'todo reajuste ' + (pe === 'aprovado' || pe === 'aprovado, vale no mes seguinte' ? 'ok' : 'quieto')} style={{ marginTop: 12 }}>
      <CalendarClock size={20} aria-hidden="true" />
      <span>
        <b>Reajuste do teto de {vigencia.slice(0, 4)}.</b> Pela inflação de {anoIpca} ({textoDaTaxa(ipca)}%{fonte}), o teto da família passa de {reais(teto / 100)} pra <b>{reais(sugerido / 100)}</b> por mês.{' '}
        {pe === 'vencido' ? `O prazo pra aplicar acabou em ${dataCurta(sit!.aplicar_ate!)}. ${adultos === 1 ? 'Vote de novo pra valer.' : 'Votem de novo pra valer.'}`
          : pe === 'aprovado' ? `Aprovado e já vale. Toque pra aplicar nos limites que você ajusta${sit?.aplicar_ate ? `, até ${dataCurta(sit.aplicar_ate)}` : ''}.`
          : pe === 'aprovado, vale no mes seguinte' ? `${adultos === 1 ? 'Aprovado' : 'Os 2 aprovaram'}. Vale a partir de ${quando}: ${adultos === 1 ? 'aí você aplica nos seus limites' : 'aí cada um aplica no que é seu'}.`
          : pe === 'tetos diferentes' ? 'Os votos ficaram em tetos diferentes. Votem de novo no mesmo valor.'
          : `Só vale com ${adultos === 1 ? 'o seu "aprovo"' : 'os 2 aprovando'}, a partir de ${quando}.`}
        {sit && sit.votos.length > 0 && pe !== 'aprovado' && pe !== 'vencido' && <small className="reajuste-quem">{sit.votos.map(v => `${v.nome} aprovou em ${dataCurta(v.votou_em.slice(0, 10))}`).join('. ')}{sit.faltam.length ? `. Falta ${sit.faltam.map(a => a.nome).join(' e ')}.` : '.'}</small>}
        {!prazo && (pe === 'sugestao pendente' || pe === 'tetos diferentes') && <small className="reajuste-quem">O prazo pra aprovar acabou. Cada um ainda muda o próprio limite aqui em cima.</small>}
        {prazo && (pe === 'sem sugestao' || pe === 'sugestao pendente' || pe === 'tetos diferentes') && (!meuVoto || meuVoto.teto !== sugerido || !mesmoIpca(meuVoto.ipca, ipcaVoto)) && <span className="row-btns" style={{ marginTop: 8 }}><button className="btn sm primary" type="button" disabled={gravando} onClick={aprovar}><Check size={18} />Aprovo o reajuste</button></span>}
        {pe === 'aprovado' && meus.length > 0 && !passouAplicar && <span className="row-btns" style={{ marginTop: 8 }}><button className="btn sm primary" type="button" disabled={gravando} onClick={aplicar}>Aplicar em {meus.map(e => e.nome).join(', ')}</button></span>}
      </span>
    </div>
  )
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
