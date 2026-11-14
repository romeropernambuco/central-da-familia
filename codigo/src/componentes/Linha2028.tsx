// E7: a linha do caixa mês a mês até dez/2028 (F4), o "fica devendo até MM/AAAA" (F9) e a folga de 2029 (F5).
// No Início: 1 linha. No Planejamento: a linha desenhada, mês a mês, com o piso tracejado.
// A tela NUNCA calcula 2029: recebe a saída de futuro() (lib/futuro) e só escreve e desenha.
import { ChevronRight, Target } from 'lucide-react'
import { useFuturo } from '../app/useDados2'
import { useApp } from '../app/contexto'
import type { FuturoEntrada, FuturoSaida, LinhaMes, RendaDoMes } from '../lib/futuro'
import { mesCurto, reais } from '../lib/formato'

/** '2027-03' vira '03/2027'. */
export const mesAno = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`
const curto = (m: string) => mesCurto(m + '-01')
const r$ = (c: number) => reais(Math.abs(c) / 100)

/** Até 2 frases, só com o que o motor devolveu (nunca sinal de menos, nunca vermelho). */
export function frasesLinha(s: FuturoSaida): { caixa: string; devendo: string | null; virada: string; ajuste: string | null; margem?: string | null } {
  const ult = s.linha[s.linha.length - 1]
  const caixa = !ult ? 'Dezembro de 2028 é o último mês antes da virada: a partir de janeiro, vale o que o dinheiro rende.'
    : ult.saldo_final >= 0 ? `Com estes números, a família chega a ${curto(ult.mes)} com ${r$(ult.saldo_final)}.`
    : `Com estes números, a família fica devendo ${r$(ult.saldo_final)} em ${curto(ult.mes)}.`
  const d = s.linha.find(l => l.fica_devendo > 0)
  // B4 (revisão): 1 "fica devendo" só por caixa. Se a frase de cima já diz que a família fica devendo, esta fala do piso
  const jaDevendo = !!ult && ult.saldo_final < 0
  const devendo = !d ? null : jaDevendo
    ? `Em ${mesAno(d.mes)} o caixa fica ${r$(d.fica_devendo)} abaixo do piso e ${d.devendo_ate ? `volta pra cima dele em ${mesAno(d.devendo_ate)}` : 'não volta pra cima dele até 12/2028'}.`
    : `Em ${mesAno(d.mes)} o caixa fica abaixo do piso: fica devendo ${r$(d.fica_devendo)} pro caixa ${d.devendo_ate ? `até ${mesAno(d.devendo_ate)}` : 'até depois de 12/2028'}.`
  if (s.patrimonio_necessario === null) return { caixa, devendo, virada: 'Nesse cenário o rendimento não repõe a inflação.', ajuste: null, margem: null }
  const virada = s.folga >= 0
    ? `Em 2029 o dinheiro rende ${r$(s.renda_sustentavel)} por mês, pra sempre, e sobram ${r$(s.folga)} além do necessário.`
    : `Pra viver do rendimento em 2029 faltam ${r$(s.folga)}.`
  const a = s.ajustes_falta
  // QA E11 (erro 3): com poucos meses até a virada o motor sugere cortar (sugerido 'cortar', guardar_por_mes 0): nunca "guardando R$ 0".
  // MOTOR_index: o corte vem separado em falta_por_mes (frase principal) e margem_por_mes (a folga de segurança, menor embaixo)
  const c = s.folga < 0 && a ? frasesCorte(a) : null
  const ajuste = s.folga < 0 && a && c ? (a.sugerido === 'cortar' || !a.guardar_por_mes
    ? c.principal.replace(/\.$/, ' em 2029.')
    : `Fecha guardando ${r$(a.guardar_por_mes)} por mês até 12/2028 ou cortando ${r$(c.falta)} por mês em 2029.`) : null
  const margem = c?.margem ?? null
  return { caixa, devendo, virada, ajuste, margem }
}

/** O corte, em 2 partes do motor: o que falta no mês (frase principal) e a folga de segurança (menor, "se der").
 *  Sem os campos novos (motor antigo): o total vai na frase principal. Nunca 2 números de falta brigando. */
export function frasesCorte(a: NonNullable<FuturoSaida['ajustes_falta']>): { falta: number; principal: string; margem: string | null } {
  const falta = a.falta_por_mes ?? a.cortar_por_mes_2029
  const m = a.falta_por_mes != null ? a.margem_por_mes ?? 0 : 0
  if (falta <= 0) return { falta: 0, principal: `A renda cobre o mês. Falta só a folga de segurança: ${r$(m)}.`, margem: null }
  return { falta, principal: `Fecha cortando ${r$(falta)} por mês.`, margem: m > 0 ? `Mais ${r$(m)} de folga de segurança, se der.` : null }
}

/** O desenho: saldo de cada mês (linha verde), piso tracejado e um ponto âmbar nos meses abaixo do piso. */
function Desenho({ linha, piso }: { linha: LinhaMes[]; piso: (l: LinhaMes) => number }) {
  if (linha.length < 2) return null
  const W = 300, H = 120
  const vals = [...linha.map(l => l.saldo_final), ...linha.map(piso), 0]
  const min = Math.min(...vals), max = Math.max(...vals), folga = Math.max(1, (max - min) * 0.08)
  const x = (i: number) => (i / (linha.length - 1)) * W
  const y = (v: number) => H - 6 - ((v - (min - folga)) / (max - min + 2 * folga)) * (H - 12)
  const pts = linha.map((l, i) => `${x(i).toFixed(1)},${y(l.saldo_final).toFixed(1)}`).join(' ')
  const pisoPts = linha.map((l, i) => `${x(i).toFixed(1)},${y(piso(l)).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 -4 ${W} ${H + 8}`} preserveAspectRatio="none" role="img" aria-hidden="true">
      {min < 0 && <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="zero" />}
      <polyline points={pisoPts} className="piso" />
      <polyline points={pts} className="linha" />
      {linha.map((l, i) => (l.fica_devendo > 0 ? <circle key={l.mes} cx={x(i)} cy={y(l.saldo_final)} r="3.5" className="abaixo" /> : null))}
    </svg>
  )
}

/** Planejamento: a linha mês a mês até dez/2028, as frases do motor e a lista de cada mês (aberta num toque). */
export function Linha2028({ saida, entrada }: { saida: FuturoSaida; entrada: FuturoEntrada }) {
  const f = frasesLinha(saida)
  const pisoMeses = entrada.parametros.piso_meses
  // B3 (revisão): o piso de cada mês vem pronto do motor (LinhaMes.piso); a tela só desenha
  const piso = (l: LinhaMes) => l.piso
  const l = saida.linha
  const primeiro = l[0], ultimo = l[l.length - 1]
  return (
    <div className="linha-2028">
      <figure className="linha-saldo" aria-label={primeiro && ultimo ? `Caixa da família de ${curto(primeiro.mes)} a ${curto(ultimo.mes)}: começa com ${r$(primeiro.saldo_final)} e termina com ${r$(ultimo.saldo_final)}${ultimo.saldo_final < 0 ? ' devendo' : ''}.` : 'Caixa da família até dezembro de 2028'}>
        <Desenho linha={l} piso={piso} />
        {primeiro && ultimo && <figcaption className="barras30-pe"><span>{curto(primeiro.mes)}: {ultimo === primeiro ? '' : r$(primeiro.saldo_final)}</span><span>{curto(ultimo.mes)}: {ultimo.saldo_final < 0 ? 'devendo ' : ''}{r$(ultimo.saldo_final)}</span></figcaption>}
      </figure>
      <div className="leg"><span><i className="q" />o caixa no fim de cada mês</span><span><i className="q piso" />piso: {pisoMeses} {pisoMeses === 1 ? 'mês' : 'meses'} de teto que não se mexe</span>{l.some(x => x.fica_devendo > 0) && <span><i className="q abaixo" />mês abaixo do piso</span>}</div>
      <p className={'todo ' + (saida.folga >= 0 && !f.devendo && saida.patrimonio_necessario !== null ? 'ok' : 'warn')} style={{ marginTop: 10 }}><span>{f.caixa} {f.devendo}</span></p>
      <p className="sub linha-virada">{f.virada}{f.ajuste ? ` ${f.ajuste}` : ''}</p>
      {f.margem && <p className="sub linha-margem">{f.margem}</p>}
      {l.length > 0 && (
        <details className="mes-a-mes">
          <summary>Ver mês a mês</summary>
          <ul className="list">
            {l.map(m => (
              <li key={m.mes} className="fat">
                <span>{curto(m.mes)}</span>
                <span className="sub">{m.fica_devendo > 0 ? `abaixo do piso: devendo ${r$(m.fica_devendo)}` : m.recebimentos > 0 ? `entra ${r$(m.recebimentos)}` : m.rendimento > 0 ? `rende ${r$(m.rendimento)}` : ''}</span>
                <span className={m.saldo_final < 0 ? 'din-warn' : ''}>{m.saldo_final < 0 ? 'devendo ' : ''}{r$(m.saldo_final)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

/** Modo renda (depois da virada, QA E11): o que o dinheiro rende no mês, o gasto do mês e a folga ou a falta. Sem conta aqui. */
export function frasesRenda(r: RendaDoMes): { rende: string; folga: string; taxa: string | null } {
  const mes = mesCurto(r.mes + '-01')
  return {
    rende: `Em ${mes}, o dinheiro guardado (${r$(r.patrimonio)}) rende ${r$(r.renda_sustentavel)} por mês acima da inflação, pra sempre. O mês gasta ${r$(r.gasto_do_mes)}.`,
    folga: r.folga_do_mes >= 0 ? `Sobram ${r$(r.folga_do_mes)} por mês.` : `Faltam ${r$(r.folga_do_mes)} por mês: a renda ainda não cobre o gasto.`,
    taxa: r.falta_taxa ? `Falta a Selic e o IPCA de ${r.mes.slice(0, 4)}: a conta usou o rendimento acima da inflação do objetivo. Digite os 2 aqui embaixo.` : null,
  }
}

/** Planejamento depois da virada: o bloco renda no lugar da linha até 2028. */
export function Renda2029({ saida }: { saida: FuturoSaida }) {
  const r = saida.renda
  if (!r) return null
  const f = frasesRenda(r)
  const a = saida.ajustes_falta
  return (
    <div className="renda-2029">
      <p className={'todo ' + (r.folga_do_mes >= 0 ? 'ok' : 'warn')}><span>{f.rende} <b>{f.folga}</b></span></p>
      {a && a.cortar_por_mes_2029 > 0 && (() => { const c = frasesCorte(a); return <>
        <p className="sub" style={{ marginTop: 8 }}><b>{c.principal}</b></p>
        {c.margem && <p className="sub linha-margem">{c.margem}</p>}
      </> })()}
      {f.taxa && <p className="sub" style={{ marginTop: 8 }}>{f.taxa}</p>}
    </div>
  )
}

/** Início: 1 linha que leva ao Planejamento. Só o casal (a filha não vê 2029). */
export function Linha2028Resumo() {
  const { familia } = useApp()
  const { saida } = useFuturo()
  if (familia?.papel !== 'casal' || !saida) return null
  // modo renda (depois da virada): 1 linha com a renda do mês
  if (saida.modo === 'renda' && saida.renda) {
    const f = frasesRenda(saida.renda)
    const t = `Rende ${r$(saida.renda.renda_sustentavel)} por mês, pra sempre. ${f.folga}`
    return (
      <a className="card guard-card linha-2028-resumo" href="#/planejamento" aria-label={`Renda do dinheiro guardado: ${t} Abrir o Planejamento.`}>
        <span className="tile"><Target size={20} /></span>
        <span className="m"><b>Renda do dinheiro guardado</b><small>{t}</small></span>
        <ChevronRight size={20} className="muted" aria-hidden="true" />
      </a>
    )
  }
  if (!saida.linha.length) {
    const t = frasesLinha(saida).virada
    return (
      <a className="card guard-card linha-2028-resumo" href="#/planejamento" aria-label={`Janeiro de 2029: ${t} Abrir o Planejamento.`}>
        <span className="tile"><Target size={20} /></span>
        <span className="m"><b>Janeiro de 2029</b><small>{t}</small></span>
        <ChevronRight size={20} className="muted" aria-hidden="true" />
      </a>
    )
  }
  const ult = saida.linha[saida.linha.length - 1]
  const d = saida.linha.find(x => x.fica_devendo > 0)
  const texto = d ? `Em ${mesAno(d.mes)} o caixa fica abaixo do piso. Toque pra ver.`
    : saida.patrimonio_necessario === null ? 'Nesse cenário o rendimento não repõe a inflação.'
    : saida.folga >= 0 ? `Chega a ${curto(ult.mes)} com ${r$(ult.saldo_final)}: rende ${r$(saida.renda_sustentavel)} por mês em 2029.`
    : `Pra viver do rendimento em 2029 faltam ${r$(saida.folga)}. Toque pra ver como fechar.`
  return (
    <a className="card guard-card linha-2028-resumo" href="#/planejamento" aria-label={`Até dezembro de 2028: ${texto} Abrir o Planejamento.`}>
      <span className="tile"><Target size={20} /></span>
      <span className="m"><b>Até dezembro de 2028</b><small>{texto}</small></span>
      <ChevronRight size={20} className="muted" aria-hidden="true" />
    </a>
  )
}
