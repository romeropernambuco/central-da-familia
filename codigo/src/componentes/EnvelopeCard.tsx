import './dinheiro-f29.css'
import { Icone } from './Icone'
import { textoPrivado } from './privacidade'
import { useState } from 'react'
import type { Envelope } from '../api/tipos'
import { useApp } from '../app/contexto'
import { FUSO, dataCurta, hojeRecife, mesLongo, plural, reais, somaDias, fimDoMes } from '../lib/formato'
import { Din } from './base'
import { Qm } from './Qm'
import { donoDo, escreveNo } from '../app/dono'
import { Impacto2029 } from './Impacto2029'
import { useAdultos } from '../app/useMembros'

const REGRA = { diario: 'por dia', semanal: 'por semana', mensal: 'no mês' }

// Compatibilidade das importações antigas; relógio e privacidade ficam nesta borda React.
export { tetoDoMes } from '../lib/resumo/orcamento'
import { tetoDoMes, comecoDoMes as selecionarComeco, numeroEnvelope as selecionarEnvelope, primeiroDoMesQueVem as proximoMes } from '../lib/resumo/orcamento'
export const comecoDoMes = (lim: number, passou: number, parcela: number, mes: string) => selecionarComeco(lim, passou, parcela, mes, reais)
export type { EstadoEnv } from '../lib/resumo/orcamento'
export const numeroEnvelope = (e: Envelope, dias: number) => selecionarEnvelope(e, dias, hojeRecife(), FUSO)
export const primeiroDoMesQueVem = (hoje = hojeRecife()) => proximoMes(hoje)

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
        })}><Icone nome="casa" />Cobrir com a sobra da Casa</button>
      )}
    </div>
  )
}

export function EnvelopeCard({ e, diasRestantes, onClick, meu }: { e: Envelope; diasRestantes: number; onClick?: () => void; meu?: boolean }) {
  const { familia, oculto } = useApp()
  const n = numeroEnvelope(e, diasRestantes)
  // E2 (regra nova, 13/11): o limite do outro aparece com o nome dele e sem nenhum botão de mexer
  const doOutro = !escreveNo(e, familia), dono = donoDo(e)
  const pct = Math.max(2, Math.min(100, n.usado * 100))
  const frase = fraseEstouro(e, n)
  // Superfície constante: nem a cor, nem o tamanho contam como está o limite.
  if (oculto) return <div className="card env"><div className="env-h"><span className="icone-chip"><Icone nome="orcamento" /></span><b>{textoPrivado(e.nome)}</b></div><div className="numrow"><Din v={0} tam="mid" /></div><p className="sub">Valores escondidos</p>{onClick && !doOutro && <button className="btn sm line" type="button" onClick={onClick} aria-label={`Anotar em ${textoPrivado(e.nome)}`}><Icone nome="lancar" />Anotar em {textoPrivado(e.nome)}<Icone nome="abrir" /></button>}</div>
  return (
    <div className="card env" {...(doOutro ? { 'data-do-outro': textoPrivado(dono || 'família') } : {})}>
      <div className="env-h">
        <span className="icone-chip"><Icone nome={e.casa ? 'casa' : 'orcamento'} /></span><b>{textoPrivado(e.nome)}{textoPrivado(doOutro && dono && !dono.endsWith(e.nome) ? ` · de ${dono}` : '')}</b>
        {/* quem passou do mês não vê "por dia R$ 217": vê "fica devendo" */}
        <span className="regra">{n.estado === 'devendo' ? (e.regra === 'semanal' ? 'passou nesta semana' : 'fica devendo') : REGRA[e.regra]}</span>
      </div>
      <div className="numrow">
        {n.estado === 'devendo' ? <span className={oculto ? undefined : "din-warn"}><Din v={n.devendo} tam="mid" /></span> : <Din v={n.valor} tam="mid" />}
        <Qm titulo={textoPrivado(`${e.nome}: ${n.rotulo}`)} linhas={n.linhas} />
      </div>
      <p className="sub">{textoPrivado(n.rotulo)}</p>
      {frase && <p className="todo warn frase-estouro">{textoPrivado(frase)}</p>}
      {!oculto && <div className={'meter ' + (n.usado > 1 ? 'warn' : 'ok')} aria-hidden="true"><i style={{ width: pct + '%' }} /></div>}
      <p className="sub">Gasto no mês <b>{reais(e.gasto_mes)}</b> de {reais(tetoDoMes(e))}{e.regra === 'diario' && e.falta_mes_anterior ? ` (${reais(e.limite_base ?? e.limite_mes)} menos ${reais(e.falta_mes_anterior)} do mês passado)` : ''}</p>
      {/* C3 (revisão E2/E3): o limite da filha os pais combinam (e mudam no Planejamento); quem lança é ela */}
      {doOutro && <p className="sub dono-linha">{textoPrivado(!dono ? 'Da família: só para ver.' : e.dono_papel === 'pessoa' ? `Só ${dono} lança aqui. O limite é combinado com os pais.` : `Limite de ${dono}: só ${dono} lança e mexe aqui.`)}</p>}
      {meu && !doOutro && n.estado === 'devendo' && e.regra !== 'semanal' && <CobrirEstouro e={e} valor={n.devendo} />}
      {onClick && !doOutro && <button className="btn sm line" type="button" onClick={onClick} aria-label={`Anotar em ${textoPrivado(e.nome)}`} style={{ justifySelf: 'start' }}><Icone nome="lancar" />Anotar em {textoPrivado(e.nome)}<Icone nome="abrir" /></button>}
    </div>
  )
}
