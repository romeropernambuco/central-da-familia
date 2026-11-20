import './RumoA2029.css'
import { Icone } from './Icone'
import { textoPrivado } from './privacidade'
// E7: a linha do caixa mês a mês até dez/2028 (F4), o "fica devendo até MM/AAAA" (F9) e a folga de 2029 (F5).
// No Início: 1 linha. No Planejamento: a linha desenhada, mês a mês, com o piso tracejado.
// A tela NUNCA calcula 2029: recebe a saída de futuro() (lib/futuro) e só escreve e desenha.
import { ChevronRight, Target } from 'lucide-react'
import { useFuturo } from '../app/useDados2'
import { useApp } from '../app/contexto'
import type { FuturoEntrada, FuturoSaida, LinhaMes, RendaDoMes } from '../lib/futuro'
import { mesCurto, reais } from '../lib/formato'
import { GraficoCaixa, mesMaisApertado } from './Graficos'

/** '2027-03' vira '03/2027'. */
export const mesAno = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`
const curto = (m: string) => mesCurto(m + '-01')
const r$ = (c: number) => reais(Math.abs(c) / 100)

/** Até 2 frases, só com o que o motor devolveu (nunca sinal de menos, nunca vermelho). */
export function frasesLinha(s: FuturoSaida): {
  caixa: string
  devendo: string | null
  virada: string
  ajuste: string | null
  margem?: string | null
} {
  const ult = s.linha[s.linha.length - 1]
  const caixa = !ult
    ? 'Dezembro de 2028 é o último mês antes da virada: a partir de janeiro, vale o que o dinheiro rende.'
    : ult.saldo_final >= 0
      ? `Com estes números, a família chega a ${curto(ult.mes)} com ${r$(ult.saldo_final)}.`
      : `Com estes números, a família fica devendo ${r$(ult.saldo_final)} em ${curto(ult.mes)}.`
  const d = s.linha.find(l => l.fica_devendo > 0)
  // B4 (revisão): 1 "fica devendo" só por caixa. Se a frase de cima já diz que a família fica devendo, esta fala do piso
  const jaDevendo = !!ult && ult.saldo_final < 0
  const devendo = !d
    ? null
    : jaDevendo
      ? `Em ${mesAno(d.mes)} o caixa fica ${r$(d.fica_devendo)} abaixo do piso e ${d.devendo_ate ? `volta para cima dele em ${mesAno(d.devendo_ate)}` : 'não volta para cima dele até 12/2028'}.`
      : `Em ${mesAno(d.mes)} o caixa fica abaixo do piso: fica devendo ${r$(d.fica_devendo)} pro caixa ${d.devendo_ate ? `até ${mesAno(d.devendo_ate)}` : 'até depois de 12/2028'}.`
  if (s.patrimonio_necessario === null)
    return { caixa, devendo, virada: 'Nesse cenário o rendimento não repõe a inflação.', ajuste: null, margem: null }
  const virada =
    s.folga >= 0
      ? (s.aluguel_liquido_2029 || 0) > 0
        ? `Em 2029 o dinheiro rende ${r$(s.renda_sustentavel)} por mês, para sempre, o aluguel com contrato soma ${r$(s.aluguel_liquido_2029 || 0)}, e sobram ${r$(s.folga)} além do necessário.`
        : `Em 2029 o dinheiro rende ${r$(s.renda_sustentavel)} por mês, para sempre, e sobram ${r$(s.folga)} além do necessário.`
      : `Pra viver do rendimento em 2029 faltam ${r$(s.folga)}.`
  const a = s.ajustes_falta
  // QA E11 (erro 3): com poucos meses até a virada o motor sugere cortar (sugerido 'cortar', guardar_por_mes 0): nunca "guardando R$ 0".
  // MOTOR_index: o corte vem separado em falta_por_mes (frase principal) e margem_por_mes (a folga de segurança, menor embaixo)
  const c = s.folga < 0 && a ? frasesCorte(a) : null
  const ajuste =
    s.folga < 0 && a && c
      ? a.sugerido === 'cortar' || !a.guardar_por_mes
        ? c.principal.replace(/\.$/, ' em 2029.')
        : `Fecha guardando ${r$(a.guardar_por_mes)} por mês até 12/2028 ou cortando ${r$(c.falta)} por mês em 2029.`
      : null
  const margem = c?.margem ?? null
  return { caixa, devendo, virada, ajuste, margem }
}

/** O corte, em 2 partes do motor: o que falta no mês (frase principal) e a folga de segurança (menor, "se der").
 *  Sem os campos novos (motor antigo): o total vai na frase principal. Nunca 2 números de falta brigando. */
export function frasesCorte(a: NonNullable<FuturoSaida['ajustes_falta']>): {
  falta: number
  principal: string
  margem: string | null
} {
  const falta = a.falta_por_mes ?? a.cortar_por_mes_2029
  const m = a.falta_por_mes != null ? (a.margem_por_mes ?? 0) : 0
  if (falta <= 0)
    return { falta: 0, principal: `A renda cobre o mês. Falta só a folga de segurança: ${r$(m)}.`, margem: null }
  return {
    falta,
    principal: `Fecha cortando ${r$(falta)} por mês.`,
    margem: m > 0 ? `Mais ${r$(m)} de folga de segurança, se der.` : null,
  }
}

/** Planejamento: a linha mês a mês até dez/2028, as frases do motor e a lista de cada mês (aberta num toque). */
export function Linha2028({ saida, entrada }: { saida: FuturoSaida; entrada: FuturoEntrada }) {
  const { oculto } = useApp()
  if (oculto) return <p className="todo">Gráfico e valores escondidos.</p>
  const f = frasesLinha(saida)
  const pisoMeses = entrada.parametros.piso_meses
  // B3 (revisão): o piso de cada mês vem pronto do motor (LinhaMes.piso); a tela só desenha
  const l = saida.linha
  const ultimo = l[l.length - 1]
  const aperto = mesMaisApertado(l)
  // RODADA_PATRIMONIO: a renda de 2029 separa "das aplicações" e "dos aluguéis com contrato" (o motor soma em renda_total_2029)
  const aluguel = saida.aluguel_liquido_2029 || 0
  const renda = saida.patrimonio_necessario === null ? null : (saida.renda_total_2029 ?? saida.renda_sustentavel)
  return (
    <div className="linha-2028">
      {/* C3 (pacote 2, gráfico B): 3 números em cima, nada de texto entre eles e o gráfico */}
      {ultimo && (
        <dl className="plan-nums">
          <div>
            <dt>Caixa em {curto(ultimo.mes)}</dt>
            <dd className={ultimo.saldo_final < 0 ? 'din-warn' : ''}>
              {ultimo.saldo_final < 0 ? 'devendo ' : ''}
              {r$(ultimo.saldo_final)}
            </dd>
          </div>
          <div>
            <dt>Renda por mês em 2029</dt>
            <dd>{renda == null ? 'sem renda' : r$(renda)}</dd>
            {renda != null && aluguel > 0 && (
              <dd className="plan-nums-p">
                {r$(saida.renda_sustentavel)} das aplicações e {r$(aluguel)} dos aluguéis com contrato
              </dd>
            )}
          </div>
          {aperto && (
            <div>
              <dt>Mês mais apertado</dt>
              <dd className={aperto.fica_devendo > 0 ? 'din-warn' : ''}>{curto(aperto.mes)}</dd>
              <dd className="plan-nums-p">
                {aperto.saldo_final >= aperto.piso
                  ? `${r$(aperto.saldo_final - aperto.piso)} acima do piso`
                  : `${r$(aperto.piso - aperto.saldo_final)} abaixo do piso`}
              </dd>
            </div>
          )}
        </dl>
      )}
      <GraficoCaixa linha={l} renda2029={renda} />
      <p className="leg">
        <span>
          <i className="q piso-faixa" />
          faixa cinza: o piso, {pisoMeses} {pisoMeses === 1 ? 'mês' : 'meses'} de teto que não se mexe
        </span>
        {l.some(x => x.recebimentos > 0) && (
          <span>
            <i className="q receb" />
            bolinha: mês em que entra dinheiro
          </span>
        )}
        {l.some(x => x.fica_devendo > 0) && (
          <span>
            <i className="q abaixo" />
            âmbar: o caixa encosta no piso
          </span>
        )}
        <span>
          <i className="q degrau" />
          2029: o caixa para e vive do que rende
        </span>
      </p>
      <p
        className={'todo ' + (saida.folga >= 0 && !f.devendo && saida.patrimonio_necessario !== null ? 'ok' : 'warn')}
        style={{ marginTop: 10 }}
      >
        <span>
          {f.caixa} {f.devendo}
        </span>
      </p>
      <p className="sub linha-virada">
        {f.virada}
        {f.ajuste ? ` ${f.ajuste}` : ''}
      </p>
      {f.margem && <p className="sub linha-margem">{f.margem}</p>}
      {saida.folga < 0 &&
        frasesRenova(saida).map(t => (
          <p key={t} className="sub linha-renova">
            {textoPrivado(t)}
          </p>
        ))}
      <PodeEntrar saida={saida} />
      {l.length > 0 && (
        <details className="mes-a-mes">
          <summary>Ver mês a mês</summary>
          <ul className="list">
            {l.map(m => (
              <li key={m.mes} className="fat">
                <span>{curto(m.mes)}</span>
                <span className="sub">
                  {m.fica_devendo > 0
                    ? `abaixo do piso: devendo ${r$(m.fica_devendo)}`
                    : m.recebimentos > 0
                      ? `entra ${r$(m.recebimentos)}`
                      : m.rendimento > 0
                        ? `rende ${r$(m.rendimento)}`
                        : ''}
                </span>
                <span className={m.saldo_final < 0 ? 'din-warn' : ''}>
                  {m.saldo_final < 0 ? 'devendo ' : ''}
                  {r$(m.saldo_final)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

/** O que "pode entrar": aparece, mas não entra na conta (aluguel e venda sem contrato, recebimento incerto). Vem do motor (gatilhos). */
export function frasesGatilho(g: NonNullable<FuturoSaida['gatilhos']>[number]): string {
  const quando =
    g.motivo === 'renova o contrato'
      ? ''
      : g.mes
        ? g.por_mes
          ? ` a partir de ${mesAno(g.mes)}`
          : ` em ${mesAno(g.mes)}`
        : ''
  const valor = `${r$(g.valor)}${g.por_mes ? ' por mês' : ''}`
  const porque =
    g.motivo === 'renova o contrato'
      ? `contrato curto: renove até ${g.mes ? mesAno(g.mes) : 'a virada'} para contar`
      : g.motivo === 'sem contrato'
        ? 'sem contrato'
        : g.motivo === 'depois do contrato'
          ? 'depois que o contrato acaba'
          : g.motivo === 'contrato sem data de fim'
            ? 'contrato sem data de fim'
            : g.motivo === 'depois da virada'
              ? 'depois de 2028'
              : 'incerto'
  // MOTOR: o nome do recebimento vem em descricao; sem ele, "Recebimento de <dono>"
  const nome = g.origem === 'recebimento' ? (g.descricao ?? `Recebimento${g.nome ? ` de ${g.nome}` : ''}`) : g.nome
  return `${nome}: ${valor}${quando} (${porque}).`
}
/** "O aluguel para em MM/AAAA. Renove até MM/AAAA pra ele contar em 2029." (aluguel_para_em e mes do gatilho do motor) */
export function fraseRenova(g: { aluguel_para_em?: string | null; mes: string | null }): string {
  return `${g.aluguel_para_em ? `O aluguel para em ${mesAno(g.aluguel_para_em)}. ` : ''}Renove até ${g.mes ? mesAno(g.mes) : 'a virada'} para ele contar em 2029.`
}
/** MOTOR (contrato curto): a falta de 2029 inclui o aluguel que não abate porque o contrato acaba antes de 12 meses.
 *  1 frase por imóvel, embaixo da linha da falta, pra nunca ficar 2 números de falta sem explicação. Só escreve. */
export function frasesRenova(s: FuturoSaida): string[] {
  return (s.gatilhos || [])
    .filter(g => g.motivo === 'renova o contrato')
    .map(g => {
      return `Inclui ${r$(g.valor)} do aluguel de ${g.nome}. ${fraseRenova(g)}`
    })
}
export function PodeEntrar({ saida }: { saida: FuturoSaida }) {
  const gs = saida.gatilhos || []
  if (!gs.length) return null
  return (
    <div className="pode-entrar">
      <h3>
        Pode entrar <small>fica fora da conta até ter contrato ou data certa</small>
      </h3>
      <ul>
        {gs.map(g => (
          <li key={g.origem + g.id + g.tipo}>{frasesGatilho(g)}</li>
        ))}
      </ul>
    </div>
  )
}

/** Modo renda (depois da virada, QA E11): o que o dinheiro rende no mês, o gasto do mês e a folga ou a falta. Sem conta aqui. */
export function frasesRenda(r: RendaDoMes): { rende: string; folga: string; taxa: string | null } {
  const mes = mesCurto(r.mes + '-01')
  return {
    rende: `Em ${mes}, o dinheiro guardado (${r$(r.patrimonio)}) rende ${r$(r.renda_sustentavel)} por mês acima da inflação, para sempre. O mês gasta ${r$(r.gasto_do_mes)}.`,
    folga:
      r.folga_do_mes >= 0
        ? `Sobram ${r$(r.folga_do_mes)} por mês.`
        : `Faltam ${r$(r.folga_do_mes)} por mês: a renda ainda não cobre o gasto.`,
    taxa: r.falta_taxa
      ? `Falta a Selic e o IPCA de ${r.mes.slice(0, 4)}: a conta usou o rendimento acima da inflação do objetivo. Digite os 2 aqui embaixo.`
      : null,
  }
}

/** Planejamento depois da virada: o bloco renda no lugar da linha até 2028. */
export function Renda2029({ saida }: { saida: FuturoSaida }) {
  const { oculto } = useApp()
  if (oculto) return <p className="todo">Renda e valores escondidos.</p>
  const r = saida.renda
  if (!r) return null
  const f = frasesRenda(r)
  const a = saida.ajustes_falta
  return (
    <div className="renda-2029">
      <p className={'todo ' + (r.folga_do_mes >= 0 ? 'ok' : 'warn')}>
        <span>
          {f.rende} <b>{f.folga}</b>
        </span>
      </p>
      {(r.aluguel_liquido || 0) > 0 && (
        <p className="sub" style={{ marginTop: 8 }}>
          Renda do mês: <b>{r$(r.renda_total ?? r.renda_sustentavel)}</b>, sendo {r$(r.renda_sustentavel)} das
          aplicações e {r$(r.aluguel_liquido || 0)} dos aluguéis com contrato.
        </p>
      )}
      <PodeEntrar saida={saida} />
      {a &&
        a.cortar_por_mes_2029 > 0 &&
        (() => {
          const c = frasesCorte(a)
          return (
            <>
              <p className="sub" style={{ marginTop: 8 }}>
                <b>{c.principal}</b>
              </p>
              {frasesRenova(saida).map(t => (
                <p key={t} className="sub linha-renova">
                  {textoPrivado(t)}
                </p>
              ))}
              {c.margem && <p className="sub linha-margem">{c.margem}</p>}
            </>
          )
        })()}
      {f.taxa && (
        <p className="sub" style={{ marginTop: 8 }}>
          {f.taxa}
        </p>
      )}
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
    const t = `Rende ${r$(saida.renda.renda_total ?? saida.renda.renda_sustentavel)} por mês, para sempre. ${f.folga}`
    return (
      <a
        className="card guard-card linha-2028-resumo"
        href="#/planejamento"
        aria-label={textoPrivado(`Renda do dinheiro guardado: ${t} Abrir o Planejamento.`)}
      >
        <span className="tile">
          <Icone desenho={Target} />
        </span>
        <span className="m">
          <b>Renda do dinheiro guardado</b>
          <small>{textoPrivado(t)}</small>
        </span>
        <Icone desenho={ChevronRight} className="muted" aria-hidden="true" />
      </a>
    )
  }
  if (!saida.linha.length) {
    const t = frasesLinha(saida).virada
    return (
      <a
        className="card guard-card linha-2028-resumo"
        href="#/planejamento"
        aria-label={textoPrivado(`Janeiro de 2029: ${t} Abrir o Planejamento.`)}
      >
        <span className="tile">
          <Icone desenho={Target} />
        </span>
        <span className="m">
          <b>Janeiro de 2029</b>
          <small>{textoPrivado(t)}</small>
        </span>
        <Icone desenho={ChevronRight} className="muted" aria-hidden="true" />
      </a>
    )
  }
  const ult = saida.linha[saida.linha.length - 1]
  const d = saida.linha.find(x => x.fica_devendo > 0)
  const texto = d
    ? `Em ${mesAno(d.mes)} o caixa fica abaixo do piso. Toque para ver.`
    : saida.patrimonio_necessario === null
      ? 'Nesse cenário o rendimento não repõe a inflação.'
      : saida.folga >= 0
        ? `Chega a ${curto(ult.mes)} com ${r$(ult.saldo_final)}: rende ${r$(saida.renda_total_2029 ?? saida.renda_sustentavel)} por mês em 2029.`
        : `Pra viver do rendimento em 2029 faltam ${r$(saida.folga)}. Toque para ver como fechar.`
  return (
    <a
      className="card guard-card linha-2028-resumo"
      href="#/planejamento"
      aria-label={textoPrivado(`Até dezembro de 2028: ${texto} Abrir o Planejamento.`)}
    >
      <span className="tile">
        <Icone desenho={Target} />
      </span>
      <span className="m">
        <b>Até dezembro de 2028</b>
        <small>{textoPrivado(texto)}</small>
      </span>
      <Icone desenho={ChevronRight} className="muted" aria-hidden="true" />
    </a>
  )
}
