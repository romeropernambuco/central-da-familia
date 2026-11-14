import { useState } from 'react'
import type { Envelope, LinhaExplicacao } from '../api/tipos'
import { useApp } from '../app/contexto'
import { centavos, dataCurta, hojeRecife, mesLongo, plural, reais, somaDias, fimDoMes } from '../lib/formato'
import { pesoDia } from '../lib/plano'
import { Din } from './base'
import { Qm } from './Qm'
import { donoDo, escreveNo } from '../app/dono'
import { Impacto2029 } from './Impacto2029'
import { useAdultos } from '../app/useMembros'

const REGRA = { diario: 'por dia', semanal: 'por semana', mensal: 'no mês' }

export type EstadoEnv = 'ok' | 'dia_passou' | 'devendo'
/**
 * E3 (conserto 2): o teto deste mês, o mesmo no topo e no cartão. No "por dia", o que passou no mês passado já saiu
 * (limite_mes = combinado menos o que passou); antes o cartão dizia "de R$ 6.000" e o topo "sobram R$ 5.493".
 */
export const tetoDoMes = (e: Envelope) => (e.regra === 'diario' ? e.limite_mes : e.limite_base ?? e.limite_mes)
/** "Dezembro começa com R$ 4.583 (R$ 717 de novembro e R$ 200 de parcela)": a mesma frase no dia 30 e no dia 1. */
export function comecoDoMes(lim: number, passou: number, parcela: number, mesQuePassou: string): { valor: number; partes: string } {
  const partes = [passou ? `${reais(passou)} de ${mesQuePassou}` : '', parcela ? `${reais(parcela)} de parcela` : ''].filter(Boolean)
  return { valor: Math.max(0, centavos(lim - passou - parcela)), partes: partes.length ? ` (${partes.join(' e ')})` : '' }
}
/** 1º dia do mês seguinte (de onde sai o que passou). */
export const primeiroDoMesQueVem = (hoje = hojeRecife()) => somaDias(fimDoMes(hoje), 1)

/** O número principal de cada envelope, conforme a regra dele, e a explicação com os campos do banco. */
export function numeroEnvelope(e: Envelope, diasRestantes: number): { valor: number; rotulo: string; linhas: LinhaExplicacao[]; usado: number; estado: EstadoEnv; devendo: number; passouHoje: number } {
  const base = { estado: 'ok' as EstadoEnv, devendo: 0, passouHoje: 0 }
  const topo: LinhaExplicacao[] = [{ linha: 'Combinado pro mês', valor: e.limite_base ?? e.limite_mes }]
  if (e.falta_mes_anterior) topo.push({ linha: 'Passou no mês passado e saiu deste', valor: -e.falta_mes_anterior })
  if (e.parcelas_mes) topo.push({ linha: 'Parcelas de compras antigas que caem neste mês', valor: -e.parcelas_mes })
  const gastoSemParcela = centavos(e.gasto_mes - (e.parcelas_mes || 0))
  if (e.regra === 'diario' && e.valor_dia != null) {
    const devendo = e.livre < 0 ? centavos(-e.livre) : 0
    const inteiro = e.valor_dia_inteiro ?? centavos(e.valor_dia + (e.gasto_hoje || 0))
    const passouHoje = centavos(Math.max(0, (e.gasto_hoje || 0) - inteiro))
    const linhas: LinhaExplicacao[] = [
      ...topo,
      { linha: 'Já gasto neste mês', valor: -gastoSemParcela },
      { linha: e.livre < 0 ? 'Passou do combinado (fica devendo)' : 'Livre no mês', valor: e.livre },
      { linha: `${dividido(diasRestantes)}${temFds(diasRestantes) ? `. Sábado, domingo e feriado valem ${String(e.peso_fds ?? 1.5).replace('.', ',')} dia${pesoDia(hojeRecife()) > 1 ? ' (hoje é um deles)' : ''}` : ''}, então hoje vale`, valor: inteiro },
      { linha: 'Gasto hoje', valor: -(e.gasto_hoje || 0) },
      { linha: 'Ainda pode gastar hoje', valor: e.valor_dia },
    ]
    return { valor: devendo ? 0 : e.valor_dia, rotulo: devendo ? 'fica devendo neste mês' : 'pode gastar hoje', usado: e.limite_mes ? e.gasto_mes / (e.limite_base ?? e.limite_mes) : 0, linhas, estado: devendo ? 'devendo' : passouHoje > 0 ? 'dia_passou' : 'ok', devendo, passouHoje }
  }
  if (e.regra === 'semanal' && e.teto_semana != null) {
    const livre = centavos(e.teto_semana - (e.gasto_semana || 0))
    return {
      // rodada 2: nunca "livre" e "passou" juntos: quando passa, o rótulo vira "passou nesta semana"
      ...base, valor: Math.max(0, livre), rotulo: livre < 0 ? 'passou nesta semana' : 'livre nesta semana', usado: e.teto_semana ? (e.gasto_semana || 0) / e.teto_semana : 0, devendo: livre < 0 ? -livre : 0, estado: livre < 0 ? 'devendo' : 'ok',
      linhas: [
        { linha: 'Teto da semana (combinado do mês × 12 ÷ 52 semanas)', valor: e.teto_semana },
        { linha: 'Já gasto desde segunda', valor: -(e.gasto_semana || 0) },
        { linha: livre < 0 ? 'Passou da semana' : 'Livre nesta semana', valor: livre },
      ],
    }
  }
  const livreSemReserva = centavos(Math.max(0, e.livre - (e.colchao_meta || 0)))
  return {
    ...base, valor: Math.max(0, e.livre), rotulo: e.livre < 0 ? 'fica devendo neste mês' : 'livre no mês', usado: e.limite_mes ? e.gasto_mes / e.limite_mes : 0, devendo: e.livre < 0 ? -e.livre : 0, estado: e.livre < 0 ? 'devendo' : 'ok',
    linhas: [...topo, { linha: 'Já gasto neste mês', valor: -gastoSemParcela }, { linha: e.livre < 0 ? 'Passou do combinado (fica devendo)' : 'Livre no mês', valor: e.livre },
      // B11: a conta de verdade do número de hoje ("Dividido por 13 dias que faltam: R$ 233,08")
      ...(e.livre > 0 && e.hoje != null ? [...(e.colchao_meta ? [{ linha: 'Tirando a reserva (o dinheiro que a família combinou nunca gastar)', valor: livreSemReserva }] : []), { linha: `${dividido(diasRestantes)}: pode gastar hoje`, valor: e.hoje }] : []),
    ],
  }
}

/** "Dividido pelos 13 dias que faltam" ("1 dia que falta", nunca "1 dias"). */
const dividido = (n: number) => (n === 1 ? 'Dividido pelo 1 dia que falta' : `Dividido pelos ${n} dias que faltam`)
/** Algum dos dias que faltam é sábado, domingo ou feriado? (só aí vale falar do 1,5 dia) */
function temFds(n: number) { const h = hojeRecife(); for (let i = 0; i < n; i++) if (pesoDia(somaDias(h, i)) > 1) return true; return false }

/** A frase do estouro, sem vermelho e sem culpa: quanto passou, de onde sai e o próximo passo. */
export function fraseEstouro(e: Envelope, n: ReturnType<typeof numeroEnvelope>): string | null {
  if (n.estado === 'devendo' && e.regra === 'semanal') return `A semana passou ${reais(n.devendo)}. Na segunda começa uma semana nova.`
  if (n.estado === 'devendo') {
    const prox = primeiroDoMesQueVem(), lim = e.limite_base ?? e.limite_mes
    const ultimo = hojeRecife() === fimDoMes(hojeRecife())
    // E3 (conserto 2): a parcela que já cai no mês que vem entra na frase (antes o dia 30 dizia R$ 200 a mais que o dia 1)
    const c = comecoDoMes(lim, n.devendo, e.parcelas_mes_que_vem || 0, mesLongo(hojeRecife()))
    return `Passou ${reais(n.devendo)} do combinado. Sai do mês de ${mesLongo(prox)}: ele começa com ${reais(c.valor)} em ${dataCurta(prox)}${c.partes}.${ultimo ? '' : ` Até ${dataCurta(fimDoMes(hojeRecife()))}, o que não gastar diminui o que fica devendo.`}`
  }
  if (n.estado === 'dia_passou') return `Hoje passou ${reais(n.passouHoje)} do valor do dia.${e.amanha != null ? ` A partir de amanhã: ${reais(e.amanha)} por dia.` : ''}`
  return null
}

/** R6: passou do combinado. Padrão: sai do mês que vem (o banco já faz). Opção: cobrir com a sobra da Casa (só no exemplo). */
export function CobrirEstouro({ e, valor }: { e: Envelope; valor: number }) {
  const { api, familia, tentar, toast, recarregar } = useApp()
  const [ok, setOk] = useState(false)
  const adultos = useAdultos()
  const prox = primeiroDoMesQueVem()
  // E7 (F6): o estouro diz quanto tira da renda de 2029 (conta do motor, impacto2029)
  const impacto = <Impacto2029 valor={valor} />
  // depois de escolher, os botões somem e fica o combinado (PARCELA ideia 2)
  if (ok) return <><p className="sub">Combinado: sai de {mesLongo(prox)}.</p>{impacto}</>
  return (
    <div className="cobrir" role="group" aria-label="O que fazer com o que passou">
      {impacto}
      <button className="btn sm line" type="button" onClick={() => { setOk(true); toast(`Combinado: ${reais(valor)} saem do mês de ${mesLongo(prox)}. Ele começa com ${reais(comecoDoMes(e.limite_base ?? e.limite_mes, valor, e.parcelas_mes_que_vem || 0, mesLongo(hojeRecife())).valor)}.`) }}>Tirar de {mesLongo(prox)}</button>
      {/* V3 (só no exemplo): imprevisto sai do guardado e não derruba o dia. E3 (conserto 4): "reserva" é só o dinheiro da Casa que nunca se gasta */}
      {api.cobrirImprevisto && familia?.papel === 'casal' && (
        <button className="btn sm line" type="button" onClick={() => tentar(async () => {
          const desfazer = await api.cobrirImprevisto!(familia.id, e.id, valor)
          await recarregar()
          toast(`Foi imprevisto: ${reais(valor)} saíram do guardado e não derrubam o seu dia. Eles voltam pro guardado em 3 meses de ${reais(Math.ceil(valor / 3))}, tirados do que entrar a mais.`, async () => { await desfazer(); await recarregar() })
        })}>Foi imprevisto (saúde, carro, casa)</button>
      )}
      {api.cobrirComCasa && familia?.papel === 'casal' && (
        <button className="btn sm line" type="button" onClick={() => tentar(async () => {
          const desfazer = await api.cobrirComCasa!(familia.id, e.id, valor)
          await recarregar()
          toast(`${reais(valor)} cobertos com a sobra da Casa neste mês.${adultos === 1 ? '' : ' A outra pessoa do casal vê que a Casa ficou menor.'}`, async () => { await desfazer(); await recarregar() })
        })}>Cobrir com a sobra da Casa</button>
      )}
    </div>
  )
}

export function EnvelopeCard({ e, diasRestantes, onClick, meu }: { e: Envelope; diasRestantes: number; onClick?: () => void; meu?: boolean }) {
  const { familia } = useApp()
  const n = numeroEnvelope(e, diasRestantes)
  // E2 (regra nova, 13/11): o limite do outro aparece com o nome dele e sem nenhum botão de mexer
  const doOutro = !escreveNo(e, familia), dono = donoDo(e)
  const pct = Math.max(2, Math.min(100, n.usado * 100))
  const frase = fraseEstouro(e, n)
  return (
    <div className="card env" {...(doOutro ? { 'data-do-outro': dono || 'família' } : {})}>
      <div className="env-h">
        <b>{e.nome}{doOutro && dono && !dono.endsWith(e.nome) ? ` · de ${dono}` : ''}</b>
        {/* quem passou do mês não vê "por dia R$ 217": vê "fica devendo" */}
        <span className="regra">{n.estado === 'devendo' ? (e.regra === 'semanal' ? 'passou nesta semana' : 'fica devendo') : REGRA[e.regra]}</span>
      </div>
      <div className="numrow">
        {n.estado === 'devendo' ? <span className="din-warn"><Din v={n.devendo} tam="mid" /></span> : <Din v={n.valor} tam="mid" />}
        <Qm titulo={`${e.nome}: ${n.rotulo}`} linhas={n.linhas} />
      </div>
      <p className="sub">{n.rotulo}</p>
      {frase && <p className="todo warn frase-estouro">{frase}</p>}
      <div className={'meter ' + (n.usado > 1 ? 'warn' : 'ok')} aria-hidden="true"><i style={{ width: pct + '%' }} /></div>
      <p className="sub">Gasto no mês <b>{reais(e.gasto_mes)}</b> de {reais(tetoDoMes(e))}{e.regra === 'diario' && e.falta_mes_anterior ? ` (${reais(e.limite_base ?? e.limite_mes)} menos ${reais(e.falta_mes_anterior)} do mês passado)` : ''}</p>
      {/* C3 (revisão E2/E3): o limite da filha os pais combinam (e mudam no Planejamento); quem lança é ela */}
      {doOutro && <p className="sub dono-linha">{!dono ? 'Da família: só pra ver.' : e.dono_papel === 'pessoa' ? `Só ${dono} lança aqui. O limite é combinado com os pais.` : `Limite de ${dono}: só ${dono} lança e mexe aqui.`}</p>}
      {meu && !doOutro && n.estado === 'devendo' && e.regra !== 'semanal' && <CobrirEstouro e={e} valor={n.devendo} />}
      {onClick && !doOutro && <button className="btn sm line" type="button" onClick={onClick} style={{ justifySelf: 'start' }}>Lançar em {e.nome}</button>}
    </div>
  )
}
