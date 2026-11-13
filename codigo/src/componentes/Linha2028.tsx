// E7: a linha do caixa mês a mês até dez/2028 (F4), o "fica devendo até MM/AAAA" (F9) e a folga de 2029 (F5).
// No Início: 1 linha. No Planejamento: a linha desenhada, mês a mês, com o piso tracejado.
// A tela NUNCA calcula 2029: recebe a saída de futuro() (lib/futuro) e só escreve e desenha.
import { ChevronRight, Target } from 'lucide-react'
import { useFuturo } from '../app/useDados2'
import { useApp } from '../app/contexto'
import type { FuturoEntrada, FuturoSaida, LinhaMes } from '../lib/futuro'
import { mesCurto, reais } from '../lib/formato'

/** '2027-03' vira '03/2027'. */
export const mesAno = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`
const curto = (m: string) => mesCurto(m + '-01')
const r$ = (c: number) => reais(Math.abs(c) / 100)

/** Até 2 frases, só com o que o motor devolveu (nunca sinal de menos, nunca vermelho). */
export function frasesLinha(s: FuturoSaida): { caixa: string; devendo: string | null; virada: string; ajuste: string | null } {
  const ult = s.linha[s.linha.length - 1]
  const caixa = !ult ? 'Ainda não tem mês pra projetar até dezembro de 2028.'
    : ult.saldo_final >= 0 ? `Com estes números, a família chega a ${curto(ult.mes)} com ${r$(ult.saldo_final)}.`
    : `Com estes números, a família fica devendo ${r$(ult.saldo_final)} em ${curto(ult.mes)}.`
  const d = s.linha.find(l => l.fica_devendo > 0)
  const devendo = d ? `Em ${mesAno(d.mes)} o caixa fica abaixo do piso: fica devendo ${r$(d.fica_devendo)} pro caixa ${d.devendo_ate ? `até ${mesAno(d.devendo_ate)}` : 'até depois de 12/2028'}.` : null
  if (s.patrimonio_necessario === null) return { caixa, devendo, virada: 'Nesse cenário o rendimento não repõe a inflação.', ajuste: null }
  const virada = s.folga >= 0
    ? `Em 2029 o dinheiro rende ${r$(s.renda_sustentavel)} por mês, pra sempre, e sobram ${r$(s.folga)} além do necessário.`
    : `Pra viver do rendimento em 2029 faltam ${r$(s.folga)}.`
  const a = s.ajustes_falta
  const ajuste = s.folga < 0 && a ? `Fecha guardando ${r$(a.guardar_por_mes)} por mês até 12/2028 ou gastando ${r$(a.cortar_por_mes_2029)} a menos por mês em 2029.` : null
  return { caixa, devendo, virada, ajuste }
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
  // o piso é a regra que a família combinou (meses de teto); a linha desenha o que o motor já devolveu
  const piso = (l: LinhaMes) => pisoMeses * l.teto
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

/** Início: 1 linha que leva ao Planejamento. Só o casal (a filha não vê 2029). */
export function Linha2028Resumo() {
  const { familia } = useApp()
  const { saida } = useFuturo()
  if (familia?.papel !== 'casal' || !saida || !saida.linha.length) return null
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
