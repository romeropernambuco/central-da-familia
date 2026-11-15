import { textoPrivado } from './privacidade'
// C3 e pacote 2 do design (REFERENCIAS.md, padrões A, B e C): 3 gráficos em SVG feito à mão, sem biblioteca.
// A: o gasto do mês acumulado, pontilhado até o fim do mês, combinado tracejado, âmbar só se passar (Início e Meu orçamento).
// B: o caixa mês a mês até 12/2028 com a faixa do piso, bolinhas nos recebimentos e o degrau de 2029 (Planejamento).
// C: o desejo, plano atual em cinza e com o desejo na cor de destaque (Desejos).
// Nenhuma conta de 2029 aqui: os números chegam prontos (futuro() de lib/futuro, projecao() de lib/plano). Só desenho.
// O desenho usa a largura medida (px de verdade), pra letra e bolinha não esticarem. Sem vermelho, sem sinal de menos.
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import type { LinhaMes } from '../lib/futuro'
import { mesCurto, reais } from '../lib/formato'

const r$ = (c: number) => reais(Math.abs(c) / 100)
const curto = (m: string) => mesCurto(m + '-01')

/** Largura do quadro em px (começa em 320 pra o 1º desenho não sair vazio). */
function useLargura(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(320)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => { const x = Math.round(el.clientWidth); if (x > 0) setW(x) }
    medir()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])
  return [ref, w]
}

/** Escala simples: domínio [a, b] para [p, q]. */
const escala = (a: number, b: number, p: number, q: number) => (v: number) => (b === a ? (p + q) / 2 : p + ((v - a) / (b - a)) * (q - p))

/** O quadro comum: SVG + a linha de leitura embaixo (o que o dedo ou o mouse aponta), com setas do teclado. */
function Quadro({ rotulo, altura, n, leitura, desenho, classe, indice }: {
  rotulo: string; altura: (w: number) => number; n: number; classe: string
  /** px dentro do quadro para o índice do ponto (padrão: pontos espalhados por igual) */
  indice?: (px: number, w: number) => number
  leitura: (i: number | null) => ReactNode
  desenho: (w: number, h: number, ativo: number | null, xDe: (px: number) => number) => ReactNode
}) {
  const [ref, w] = useLargura()
  const [ativo, setAtivo] = useState<number | null>(null)
  const xDe = (px: number) => Math.max(0, Math.min(n - 1, indice ? indice(px, w) : Math.round((px / Math.max(1, w)) * (n - 1))))
  const h = altura(w)
  const mover = (e: PointerEvent<SVGSVGElement>) => { const r = e.currentTarget.getBoundingClientRect(); setAtivo(xDe(e.clientX - r.left)) }
  const tecla = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setAtivo(a => Math.min(n - 1, (a ?? -1) + 1)) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setAtivo(a => Math.max(0, (a ?? n) - 1)) }
    else if (e.key === 'Escape') setAtivo(null)
  }
  return (
    <figure className={'graf ' + classe}>
      <div ref={ref} className="graf-area" tabIndex={0} role="group" aria-label={`${textoPrivado(rotulo)} Use as setas pra ver cada ponto.`} onKeyDown={tecla} onBlur={() => setAtivo(null)}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" onPointerMove={mover} onPointerDown={mover} onPointerLeave={e => { if (e.pointerType === 'mouse') setAtivo(null) }}>
          {desenho(w, h, ativo, xDe)}
        </svg>
      </div>
      <figcaption className="graf-leitura" aria-live="polite">{leitura(ativo)}</figcaption>
    </figure>
  )
}

// ---------------------------------------------------------------- A. o mês

/** Pontos do gasto acumulado, dia 1 até hoje (em reais). Parcela e compra grande (o que não está em porDia) entram no dia 1,
 *  igual à regra do dono ("abatida no dia 1"); a ponta de hoje bate com o gasto do mês do banco. Sem porDia: reta até hoje. */
export function acumuladoDoMes(gasto: number, dia: number, mes: string, porDia?: Record<string, number> | null): number[] {
  const d = Math.max(1, dia)
  if (!porDia) return Array.from({ length: d }, (_, i) => (gasto * (i + 1)) / d)
  const doDia = (k: number) => porDia[`${mes}-${String(k).padStart(2, '0')}`] || 0
  let soma = 0
  for (let k = 1; k <= d; k++) soma += doDia(k)
  const fora = Math.max(0, gasto - soma)
  const out: number[] = []
  let acc = fora
  for (let k = 1; k <= d; k++) { acc += doDia(k); out.push(k === d ? Math.max(acc, gasto) : acc) }
  return out
}

export function GraficoMes({ gasto, limite, fecha, hoje, dias, porDia }: { gasto: number; limite: number; fecha: number; hoje: string; dias: number; porDia?: Record<string, number> | null }) {
  const dia = Math.min(dias, Number(hoje.slice(8)))
  const mes = hoje.slice(0, 7)
  const acc = acumuladoDoMes(gasto, dia, mes, porDia)
  const passa = fecha > limite + 0.005
  const naProjecao = (k: number) => (k <= dia ? acc[k - 1] : gasto + ((fecha - gasto) * (k - dia)) / Math.max(1, dias - dia))
  return (
    <Quadro classe="graf-mes" n={dias} altura={w => (w >= 600 ? 160 : 120)} rotulo={`Gasto do mês até hoje: ${reais(gasto)} de ${reais(limite)}. Se continuar assim, fecha em ${reais(fecha)}${passa ? `, passa ${reais(fecha - limite)}` : ''}.`}
      leitura={i => i == null ? <span className="graf-dica">Toque na linha pra ver cada dia</span>
        : i + 1 <= dia ? <span>Dia {i + 1}: já saíram <b>{reais(naProjecao(i + 1))}</b></span>
        : <span>Dia {i + 1}: se continuar assim, <b>{reais(naProjecao(i + 1))}</b></span>}
      desenho={(w, h, ativo) => {
        const topo = Math.max(limite, fecha, gasto) * 1.12 || 1
        const x = escala(1, dias, 6, w - 6), y = escala(0, topo, h - 22, 8)
        const cheia = acc.map((v, i) => `${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
        const xh = x(dia), yh = y(gasto), xf = x(dias), yf = y(fecha), yt = y(limite)
        // onde o pontilhado cruza o combinado (só se passar)
        const t = passa && fecha !== gasto ? Math.max(0, Math.min(1, (limite - gasto) / (fecha - gasto))) : 1
        const xc = xh + (xf - xh) * t, yc = yh + (yf - yh) * t
        return <>
          <line x1={x(1)} x2={xf} y1={yt} y2={yt} className="g-teto" />
          <text x={x(1)} y={yt - 6} className="g-rot">combinado {reais(limite)}</text>
          <polyline points={cheia} className="g-cheia" />
          {dia < dias && <line x1={xh} y1={yh} x2={xc} y2={yc} className="g-pont" />}
          {passa && <line x1={xc} y1={yc} x2={xf} y2={yf} className="g-pont acima" />}
          {dia < dias && <circle cx={xf} cy={yf} r={4} className={'g-fim' + (passa ? ' acima' : '')} />}
          <circle cx={xh} cy={yh} r={4} className="g-hoje" />
          {dia < dias && <text x={xf - 8} y={passa ? yf - 8 : yf + 16} textAnchor="end" className={'g-rot' + (passa ? ' acima' : '')}>{reais(fecha)}</text>}
          {ativo != null && <line x1={x(ativo + 1)} x2={x(ativo + 1)} y1={6} y2={h - 22} className="g-mira" />}
          {ativo != null && <circle cx={x(ativo + 1)} cy={y(naProjecao(ativo + 1))} r={4} className="g-ponto" />}
          <text x={x(1)} y={h - 4} className="g-eixo">1</text>
          <text x={xh} y={h - 4} textAnchor={dia < 4 ? 'start' : dia > dias - 4 ? 'end' : 'middle'} className="g-eixo">{dia > 2 && dia < dias - 2 ? 'hoje' : ''}</text>
          <text x={xf} y={h - 4} textAnchor="end" className="g-eixo">{dias}</text>
        </>
      }} />
  )
}

// ---------------------------------------------------------------- B. o caixa até 12/2028

export interface Recebido { mes: string; valor: number /* centavos */ }

/** O mês mais apertado: o de menor distância entre o caixa e o piso (só escolhe; não faz conta de 2029). */
export function mesMaisApertado(linha: LinhaMes[]): LinhaMes | null {
  let m: LinhaMes | null = null
  for (const l of linha) if (!m || l.saldo_final - l.piso < m.saldo_final - m.piso) m = l
  return m
}

function eixoAnos(linha: { mes: string }[]): { i: number; ano: string }[] {
  return linha.map((l, i) => ({ i, ano: l.mes.slice(0, 4), jan: l.mes.endsWith('-01') })).filter(x => x.jan && x.i > 0).map(({ i, ano }) => ({ i, ano }))
}

export function GraficoCaixa({ linha, renda2029, rendaRotulo }: { linha: LinhaMes[]; renda2029: number | null; rendaRotulo?: string }) {
  const n = linha.length
  if (n < 2) return null
  const ult = linha[n - 1]
  const toca = linha.map((l, i) => l.fica_devendo > 0 && !(i > 0 && linha[i - 1].fica_devendo > 0))
  return (
    <Quadro classe="graf-caixa linha-saldo" n={n + 1} altura={w => (w >= 600 ? 180 : 150)}
      indice={(px, w) => { const degrau = Math.max(92, Math.round(w * 0.14)); const fim = w - degrau - 10; return px > fim + 5 ? n : Math.round(((px - 6) / Math.max(1, fim - 6)) * (n - 1)) }}
      rotulo={`Caixa da família de ${curto(linha[0].mes)} a ${curto(ult.mes)}: começa com ${r$(linha[0].saldo_final)} e termina com ${ult.saldo_final < 0 ? 'devendo ' : ''}${r$(ult.saldo_final)}. A faixa cinza é o piso.${renda2029 != null ? ` Em 2029 rende ${r$(renda2029)} por mês.` : ''}`}
      leitura={i => {
        if (i == null) return <span className="graf-dica">Toque na linha pra ver cada mês</span>
        if (i >= n) return <span>2029: {renda2029 != null ? <>o dinheiro rende <b>{r$(renda2029)}</b> por mês, pra sempre</> : 'o rendimento não repõe a inflação'}</span>
        const l = linha[i]
        return <span>{curto(l.mes)}: caixa <b>{l.saldo_final < 0 ? 'devendo ' : ''}{r$(l.saldo_final)}</b>, piso {r$(l.piso)}{l.recebimentos > 0 ? <>. Entra {textoPrivado(l.marcos?.length ? l.marcos.map(m => `${m.descricao ?? `Recebimento de ${m.dono}`} ${r$(m.valor)}`).join(', ') : r$(l.recebimentos))}</> : null}{l.fica_devendo > 0 ? '. Abaixo do piso' : ''}</span>
      }}
      desenho={(w, h, ativo) => {
        const vals = [...linha.map(l => l.saldo_final), ...linha.map(l => l.piso)]
        const lo = Math.min(0, ...vals), hi = Math.max(...vals) * 1.1 || 1
        const degrau = Math.max(92, Math.round(w * 0.14))
        const x = escala(0, n - 1, 6, w - degrau - 10), y = escala(lo, hi, h - 22, 12)
        const pts = linha.map((l, i) => `${x(i).toFixed(1)},${y(l.saldo_final).toFixed(1)}`).join(' ')
        const topoPiso = linha.map((l, i) => `${x(i).toFixed(1)},${y(l.piso).toFixed(1)}`).join(' ')
        const faixa = `${x(0).toFixed(1)},${y(0).toFixed(1)} ${topoPiso} ${x(n - 1).toFixed(1)},${y(0).toFixed(1)}`
        const x29a = x(n - 1) + 10, x29b = w - 4, y29 = y(ult.saldo_final)
        const xa = ativo == null ? null : ativo >= n ? (x29a + x29b) / 2 : x(ativo)
        return <>
          <polygon points={faixa} className="g-faixa" />
          {lo < 0 && <line x1={x(0)} x2={x29b} y1={y(0)} y2={y(0)} className="g-zero" />}
          <polyline points={topoPiso} className="piso" />
          <polyline points={pts} className="linha" />
          {/* o degrau de 2029: o caixa para de mexer e vive do que rende */}
          <line x1={x(n - 1)} y1={y29} x2={x29b} y2={y29} className="g-degrau" />
          {/* o rótulo do degrau em 2 linhas, dentro da coluna de 2029 (não passa por cima da linha) */}
          <text x={x29b} y={y29 > h / 2 ? y29 - 26 : y29 + 18} textAnchor="end" className="g-rot forte">{renda2029 != null ? rendaRotulo ?? r$(renda2029) : 'sem renda'}</text>
          {renda2029 != null && !rendaRotulo && <text x={x29b} y={y29 > h / 2 ? y29 - 10 : y29 + 34} textAnchor="end" className="g-rot">por mês</text>}
          {linha.map((l, i) => l.recebimentos > 0 && !toca[i] ? <circle key={'r' + l.mes} cx={x(i)} cy={y(l.saldo_final)} r={4} className="g-receb" /> : null)}
          {linha.map((l, i) => toca[i] ? <circle key={'a' + l.mes} cx={x(i)} cy={y(l.saldo_final)} r={4} className="abaixo" /> : null)}
          {xa != null && <line x1={xa} x2={xa} y1={8} y2={h - 22} className="g-mira" />}
          {ativo != null && ativo < n && <circle cx={x(ativo)} cy={y(linha[ativo].saldo_final)} r={4} className="g-ponto" />}
          {eixoAnos(linha).map(a => <text key={a.ano} x={x(a.i)} y={h - 4} textAnchor="middle" className="g-eixo">{a.ano}</text>)}
          <text x={(x29a + x29b) / 2} y={h - 4} textAnchor="middle" className="g-eixo forte">2029</text>
        </>
      }} />
  )
}

// ---------------------------------------------------------------- C. o desejo

export function GraficoDesejo({ sem, com, rendaSem, rendaCom }: { sem: LinhaMes[]; com: LinhaMes[]; rendaSem: number | null; rendaCom: number | null }) {
  const n = Math.min(sem.length, com.length)
  if (n < 2) return null
  const toca = com.findIndex(l => l.fica_devendo > 0)
  return (
    <div className="graf-desejo-b">
      <Quadro classe="graf-desejo" n={n} altura={w => (w >= 600 ? 150 : 120)}
        rotulo={`O caixa até ${curto(com[n - 1].mes)}: sem o desejo termina com ${r$(sem[n - 1].saldo_final)}, com o desejo ${r$(com[n - 1].saldo_final)}.`}
        leitura={i => i == null ? <span className="graf-dica">Toque na linha pra ver cada mês</span>
          : <span>{curto(com[i].mes)}: hoje <b>{r$(sem[i].saldo_final)}</b>, com o desejo <b>{com[i].saldo_final < 0 ? 'devendo ' : ''}{r$(com[i].saldo_final)}</b></span>}
        desenho={(w, h, ativo) => {
          const vals = [...sem.slice(0, n).map(l => l.saldo_final), ...com.slice(0, n).map(l => l.saldo_final), ...com.slice(0, n).map(l => l.piso)]
          const lo = Math.min(0, ...vals), hi = Math.max(...vals) * 1.08 || 1
          const x = escala(0, n - 1, 6, w - 6), y = escala(lo, hi, h - 22, 10)
          const p = (ls: LinhaMes[]) => ls.slice(0, n).map((l, i) => `${x(i).toFixed(1)},${y(l.saldo_final).toFixed(1)}`)
          const a = p(sem), b = p(com)
          return <>
            <polygon points={[...a, ...[...b].reverse()].join(' ')} className="g-entre" />
            <polyline points={a.join(' ')} className="g-sem" />
            <polyline points={b.join(' ')} className="g-com" />
            {toca >= 0 && toca < n && <circle cx={x(toca)} cy={y(com[toca].saldo_final)} r={4} className="abaixo" />}
            {ativo != null && <line x1={x(ativo)} x2={x(ativo)} y1={8} y2={h - 22} className="g-mira" />}
            {eixoAnos(com.slice(0, n)).map(e => <text key={e.ano} x={x(e.i)} y={h - 4} textAnchor="middle" className="g-eixo">{e.ano}</text>)}
          </>
        }} />
      <ul className="graf-leg" aria-label="O que cada linha é">
        <li><i className="q sem" aria-hidden="true" /><span>hoje</span><b>{rendaSem != null ? `${r$(rendaSem)} por mês em 2029` : 'sem renda em 2029'}</b></li>
        <li><i className="q com" aria-hidden="true" /><span>com o desejo</span><b>{rendaCom != null ? `${r$(rendaCom)} por mês em 2029` : 'sem renda em 2029'}</b></li>
      </ul>
    </div>
  )
}
