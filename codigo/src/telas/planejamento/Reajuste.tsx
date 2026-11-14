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
import { taxaDoTexto, textoDaTaxa } from '../../api/futuro'
import { CampoValor } from '../../componentes/base'
import type { Envelope, Objetivo, ReajusteSituacao } from '../../api/tipos'
import { dataCurta, hojeRecife, mesLongo, reais, textoParaValor, valorDigitadoValido, valorParaTexto } from '../../lib/formato'
import { mesMais } from '../../lib/plano'

/** Só pra mostrar (f_12: quem decide o "aprovado" é o banco): a inflação e o teto de antes, gravados no 1º voto,
 *  e em quais limites o reajuste já foi aplicado. Chave: o mês de vigência 'AAAA-MM'. */
export interface ReajusteMostra { ipca: string; teto: number; aplicado?: Record<string, string>; /** voto vencido refeito: a vigência nova ('AAAA-MM') */ revoto?: string }

/** A vigência em votação: a do mês do reajuste, ou a do voto refeito depois que o anterior venceu (segue a corrente). */
export function vigenciaAtiva(cfg: ReajusteCfg, base: string): string {
  let v = base
  for (let i = 0; i < 36 && cfg[v]?.revoto; i++) v = cfg[v]!.revoto!
  return v
}
/** Votar de novo: o 1º mês que ainda não começou. */
export const vigenciaDoRevoto = (hoje: string) => mesMais(hoje.slice(0, 7), 1)
export type ReajusteCfg = Record<string, ReajusteMostra>

/** Acha o voto em andamento. Fonte principal: o banco (voto_aberto da reajuste_situacao, f_14), que aponta o voto refeito
 *  mesmo sem a config gravada. Se o mês pedido não tem voto ou venceu: usa o voto_aberto; sem ele (banco antes do ajuste),
 *  pergunta pelo mês do voto refeito (o seguinte ao de hoje). A config (a vigência pedida) fica só como apoio. */
export async function achaVigencia(ler: (f: string, mes: string) => Promise<ReajusteSituacao>, familia: string, pedida: string, hoje: string): Promise<[string, ReajusteSituacao]> {
  const s = await ler(familia, pedida)
  if (s.votos.length && !s.vencido) return [pedida, s]
  let alvo = s.voto_aberto?.mes_vigencia || null
  if (!alvo) {
    const r = vigenciaDoRevoto(hoje)
    if (r === pedida) return [pedida, s]
    const s2 = await ler(familia, r)
    if (s2.votos.length && !s2.vencido) return [r, s2]
    alvo = s2.voto_aberto?.mes_vigencia || null
  }
  if (!alvo || alvo === pedida) return [pedida, s]
  return [alvo, await ler(familia, alvo)]
}
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
  const vigenciaBase = mesMais(`${ano}-${String(mesReajuste).padStart(2, '0')}`, 1)
  // decisão do coordenador: voto vencido se refaz com a vigência no mês que vem; a config guarda o caminho (só pra achar)
  const vigencia = vigenciaAtiva(cfg, vigenciaBase)
  const [refazer, setRefazer] = useState<{ teto: string; ipca: string } | null>(null)
  // a vigência de verdade: a que o banco aponta (voto_aberto); a da config fica só de apoio
  const [ativa, setAtiva] = useState<string | null>(null)
  useEffect(() => {
    if (!familia || familia.papel !== 'casal') return
    api.objetivo?.(familia.id).then(setObj).catch(() => {})
  }, [api, familia?.id])
  useEffect(() => {
    if (!familia || familia.papel !== 'casal' || !api.reajusteSituacao) return
    let vivo = true
    achaVigencia(api.reajusteSituacao.bind(api), familia.id, vigencia, hoje)
      .then(([v, x]) => { if (vivo) { setAtiva(v); setSit(x); setLidoSit(true) } })
      .catch(() => { if (vivo) setLidoSit(true) })
    return () => { vivo = false }
  }, [api, familia?.id, vigencia])
  if (!familia || familia.papel !== 'casal' || !ent?.entrada || !lido || !lidoSit || !api.reajusteVotar) return null

  const vig = ativa ?? vigencia
  const mostra = cfg[vig]
  const meus = envelopes.filter(e => mudaLimite(e) && !mostra?.aplicado?.[e.id])
  const pe = situacaoReajuste(sit, hoje)
  // o voto só vale pra um mês que ainda não começou (o banco recusa depois)
  const prazo = hoje.slice(0, 7) < vig
  // revisão E12: aplicar tem prazo quando o banco manda aplicar_ate; depois dele o botão some e a tela avisa
  const passouAplicar = prazoPassou(sit?.aplicar_ate, hoje)
  const noMes = mesNum === mesReajuste && hoje.slice(0, 7) < vigenciaBase
  if (!noMes && (pe === 'sem sugestao' || ((pe === 'aprovado' || pe === 'vencido') && !meus.length))) return null

  // a inflação do ano que passou: a que a família digitou no Objetivo de 2029; senão a do Focus (marcada pra conferir)
  const anoIpca = Number(vig.slice(0, 4)) - 1
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
  const quando = mesLongo((sit?.vale_a_partir || vig) + '-01')

  async function aprovar() {
    if (gravando || !familia) return
    setGravando(true)
    let nova: ReajusteSituacao | null = null
    // 1 voto por adulto, só o próprio (o banco tranca); a inflação e o teto de antes ficam na config só pra mostrar
    const ok = await tentar(async () => {
      await api.reajusteVotar!(familia.id, vig, sugerido, ipcaVoto)
      // R2 (revisão): relê a situação depois de votar. Os 2 votando quase juntos: cada voto devolve a situação de antes
      // do commit do outro ("Falta a outra pessoa"); a releitura mostra os 2 votos
      nova = await api.reajusteSituacao!(familia.id, vig)
    })
    // a config é só apoio: guarda o que mostrar e, se o voto veio do voto_aberto, o caminho a partir da vigência de antes
    if (ok && (!mostra || (vig !== vigencia && cfg[vigencia]?.revoto !== vig))) await salvar({ ...cfg, ...(vig !== vigencia ? { [vigencia]: { ...(cfg[vigencia] || { ipca, teto }), revoto: vig } } : {}), [vig]: mostra || { ipca, teto } })
    setGravando(false)
    if (ok && nova) { setSit(nova); toast((nova as ReajusteSituacao).aprovado ? `${adultos === 1 ? 'Aprovado' : 'Aprovado pelos 2'}. Vale a partir de ${quando}.` : 'Seu "aprovo" está guardado. Falta a outra pessoa do casal aprovar.') }
  }
  // decisão do coordenador: depois que vence, "Votar de novo" abre o voto já com teto e IPCA do voto vencido (editáveis)
  async function votarDeNovo() {
    if (gravando || !familia || !refazer) return
    const nova = vigenciaDoRevoto(hoje)
    const ipcaNovo = taxaDoTexto(refazer.ipca)
    if (!valorDigitadoValido(refazer.teto) || !(textoParaValor(refazer.teto) > 0) || !ipcaNovo || !(Number(ipcaNovo) >= 0 && Number(ipcaNovo) < 1)) { toast('Confira o teto (tipo 14.943,50) e o IPCA (tipo 4,5).'); return }
    const tetoNovo = Math.round(textoParaValor(refazer.teto) * 100)
    setGravando(true)
    let lida: ReajusteSituacao | null = null
    const ok = await tentar(async () => { await api.reajusteVotar!(familia.id, nova, tetoNovo, ipcaNovo); lida = await api.reajusteSituacao!(familia.id, nova) })
    // a tela passa pro voto novo na hora; a config guarda o caminho só de apoio (o outro adulto acha pelo voto_aberto)
    if (ok && lida) { setAtiva(nova); setSit(lida) }
    if (ok) await salvar({ ...cfg, [vig]: { ...(mostra || { ipca: ipcaNovo, teto }), revoto: nova }, [nova]: { ipca: ipcaNovo, teto: mostra?.teto ?? teto } })
    setGravando(false)
    if (ok) { setRefazer(null); toast(adultos === 1 ? `Voto novo guardado. Vale a partir de ${mesLongo(mesMais(nova, 0) + '-01')}.` : 'Voto novo guardado. Falta a outra pessoa do casal aprovar.') }
  }
  async function aplicar() {
    if (gravando || !familia) return
    setGravando(true)
    const feitos: Record<string, string> = {}
    const ok = await tentar(async () => {
      for (const e of meus) {
        // R1: o banco calcula o limite novo (limite de antes × (1 + IPCA votado)) e confere votos e mês
        await api.reajusteAplicar!(familia.id, e.id, vig)
        feitos[e.id] = hoje
      }
    })
    if (Object.keys(feitos).length) await salvar({ ...cfg, [vig]: { ...(mostra || { ipca, teto }), aplicado: { ...(mostra?.aplicado || {}), ...feitos } } })
    await recarregar()
    setGravando(false)
    if (ok) toast(`Reajuste aplicado em ${meus.map(e => e.nome).join(', ')}.${adultos > 1 ? ' O limite da outra pessoa do casal, só ela aplica.' : ''}`)
  }

  return (
    <div className={'todo reajuste ' + (pe === 'aprovado' || pe === 'aprovado, vale no mes seguinte' ? 'ok' : 'quieto')} style={{ marginTop: 12 }}>
      <CalendarClock size={20} aria-hidden="true" />
      <span>
        <b>Reajuste do teto de {vig.slice(0, 4)}.</b> Pela inflação de {anoIpca} ({textoDaTaxa(ipca)}%{fonte}), o teto da família passa de {reais(teto / 100)} pra <b>{reais(sugerido / 100)}</b> por mês.{' '}
        {pe === 'vencido' ? `O prazo pra aplicar acabou em ${dataCurta(sit!.aplicar_ate!)}.`
          : pe === 'aprovado' ? `Aprovado e já vale. Toque pra aplicar nos limites que você ajusta${sit?.aplicar_ate ? `, até ${dataCurta(sit.aplicar_ate)}` : ''}.`
          : pe === 'aprovado, vale no mes seguinte' ? `${adultos === 1 ? 'Aprovado' : 'Os 2 aprovaram'}. Vale a partir de ${quando}: ${adultos === 1 ? 'aí você aplica nos seus limites' : 'aí cada um aplica no que é seu'}.`
          : pe === 'tetos diferentes' ? 'Os votos ficaram em tetos diferentes. Votem de novo no mesmo valor.'
          : `Só vale com ${adultos === 1 ? 'o seu "aprovo"' : 'os 2 aprovando'}, a partir de ${quando}.`}
        {sit && sit.votos.length > 0 && pe !== 'aprovado' && pe !== 'vencido' && <small className="reajuste-quem">{sit.votos.map(v => `${v.nome} aprovou em ${dataCurta(v.votou_em.slice(0, 10))}`).join('. ')}{sit.faltam.length ? `. Falta ${sit.faltam.map(a => a.nome).join(' e ')}.` : '.'}</small>}
        {!prazo && (pe === 'sugestao pendente' || pe === 'tetos diferentes') && <small className="reajuste-quem">O prazo pra aprovar acabou. Cada um ainda muda o próprio limite aqui em cima.</small>}
        {prazo && (pe === 'sem sugestao' || pe === 'sugestao pendente' || pe === 'tetos diferentes') && (!meuVoto || meuVoto.teto !== sugerido || !mesmoIpca(meuVoto.ipca, ipcaVoto)) && <span className="row-btns" style={{ marginTop: 8 }}><button className="btn sm primary" type="button" disabled={gravando} onClick={aprovar}><Check size={18} />Aprovo o reajuste</button></span>}
        {pe === 'vencido' && !refazer && <span className="row-btns" style={{ marginTop: 8 }}><button className="btn sm primary" type="button" onClick={() => setRefazer({ teto: valorParaTexto((sit?.teto_aprovado ?? sugerido) / 100), ipca: textoDaTaxa(sit?.ipca_aprovado ?? ipcaVoto) })}>Votar de novo</button></span>}
        {pe === 'vencido' && refazer && (
          <span className="reajuste-refazer" style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            <span className="campo"><span>Teto da família por mês</span><CampoValor valor={refazer.teto} mudar={v => setRefazer({ ...refazer, teto: v })} rotulo="Teto da família por mês" /></span>
            <label className="campo"><span>IPCA (%)</span><input className="inp" inputMode="decimal" value={refazer.ipca} onChange={e => setRefazer({ ...refazer, ipca: e.target.value.replace(/[^\d,.]/g, '') })} /></label>
            <small>Vale a partir de {mesLongo(vigenciaDoRevoto(hoje) + '-01')}, {adultos === 1 ? 'com o seu voto' : 'se os 2 aprovarem os mesmos números'}.</small>
            <span className="row-btns"><button className="btn sm primary" type="button" disabled={gravando} onClick={votarDeNovo}><Check size={18} />Aprovo com estes números</button><button className="btn sm line" type="button" onClick={() => setRefazer(null)}>Deixar como está</button></span>
          </span>
        )}
        {pe === 'aprovado' && meus.length > 0 && !passouAplicar && <span className="row-btns" style={{ marginTop: 8 }}><button className="btn sm primary" type="button" disabled={gravando} onClick={aplicar}>Aplicar em {meus.map(e => e.nome).join(', ')}</button></span>}
      </span>
    </div>
  )
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
