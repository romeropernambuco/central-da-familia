import './dinheiro-f29.css'
import { Icone } from './Icone'
import { textoPrivado } from './privacidade'
import type { Envelope } from '../api/tipos'
import { useApp } from '../app/contexto'
import { FUSO, dataCurta, hojeRecife, mesLongo, reais, fimDoMes } from '../lib/formato'
import { Din } from './base'
import { Qm } from './Qm'
import { donoDo, escreveNo } from '../lib/dono'

const REGRA = { diario: 'por dia', semanal: 'por semana', mensal: 'no mês' }

// Compatibilidade das importações antigas; relógio e privacidade ficam nesta borda React.
export { tetoDoMes } from '../lib/resumo/orcamento'
import {
  tetoDoMes,
  comecoDoMes as selecionarComeco,
  numeroEnvelope as selecionarEnvelope,
  primeiroDoMesQueVem as proximoMes,
  valorPrincipalEnvelope,
} from '../lib/resumo/orcamento'
export const comecoDoMes = (lim: number, passou: number, parcela: number, mes: string) =>
  selecionarComeco(lim, passou, parcela, mes, reais)
export type { EstadoEnv } from '../lib/resumo/orcamento'
export const numeroEnvelope = (e: Envelope, dias: number) => selecionarEnvelope(e, dias, hojeRecife(), FUSO)
export const primeiroDoMesQueVem = (hoje = hojeRecife()) => proximoMes(hoje)

/** A frase do estouro, sem vermelho e sem culpa: quanto passou, de onde sai e o próximo passo. */
export function fraseEstouro(e: Envelope, n: ReturnType<typeof numeroEnvelope>): string | null {
  if (n.estado === 'devendo' && e.regra === 'semanal')
    return `A semana passou ${reais(n.devendo)}. Na segunda começa uma semana nova.`
  if (n.estado === 'devendo') {
    const prox = primeiroDoMesQueVem(),
      lim = e.limite_base ?? e.limite_mes
    const ultimo = hojeRecife() === fimDoMes(hojeRecife())
    // E3 (conserto 2): a parcela que já cai no mês que vem entra na frase (antes o dia 30 dizia R$ 200 a mais que o dia 1)
    const c = comecoDoMes(lim, n.devendo, e.parcelas_mes_que_vem || 0, mesLongo(hojeRecife()))
    return `Passou ${reais(n.devendo)} do combinado. Sai do mês de ${mesLongo(prox)}: ele começa com ${reais(c.valor)} em ${dataCurta(prox)}${c.partes}.${ultimo ? '' : ` Até ${dataCurta(fimDoMes(hojeRecife()))}, o que não gastar diminui o que fica devendo.`}`
  }
  if (n.estado === 'dia_passou')
    return `Hoje passou ${reais(n.passouHoje)} do valor do dia.${e.amanha != null ? ` A partir de amanhã: ${reais(e.amanha)} por dia.` : ''}`
  return null
}

export function EnvelopeCard({
  e,
  diasRestantes,
  onClick,
  resumo,
}: {
  e: Envelope
  diasRestantes: number
  onClick?: () => void
  resumo?: { compacto: boolean; principal?: number }
}) {
  const { familia, oculto } = useApp()
  const classe = resumo ? `card env ${resumo.compacto ? 'env-compacto' : 'env-destaque'}` : 'card env'
  // E2 (regra nova, 13/11): o limite do outro aparece com o nome dele e sem nenhum botão de mexer
  const doOutro = !escreveNo(e, familia),
    dono = donoDo(e)
  // Superfície constante: nem a cor, nem o tamanho contam como está o limite.
  if (oculto)
    return (
      <div className={classe}>
        <div className="env-h">
          <span className="icone-chip">
            <Icone nome="orcamento" />
          </span>
          <b>{textoPrivado(e.nome, true)}</b>
        </div>
        <div className="numrow">
          <Din v={0} tam="mid" />
        </div>
        <p className="sub">Valores escondidos</p>
        {onClick && !doOutro && (
          <button
            className="btn sm line"
            type="button"
            onClick={onClick}
            aria-label={`Anotar em ${textoPrivado(e.nome, true)}`}
          >
            <Icone nome="lancar" />
            Anotar em {textoPrivado(e.nome, true)}
            <Icone nome="abrir" />
          </button>
        )}
      </div>
    )
  const n = numeroEnvelope(e, diasRestantes)
  const pct = Math.max(2, Math.min(100, n.usado * 100))
  const principal = resumo ? valorPrincipalEnvelope(e, n) : n.estado === 'devendo' ? n.devendo : n.valor
  const mostrarPrincipal = resumo?.principal !== principal
  const rotulo = resumo && !e.casa && e.hoje != null && n.estado !== 'devendo' ? 'pode gastar hoje' : n.rotulo
  const frase =
    resumo && n.estado === 'devendo'
      ? e.regra === 'semanal'
        ? 'Na segunda começa uma semana nova.'
        : 'O que passar sai do mês que vem.'
      : fraseEstouro(e, n)
  return (
    <div className={classe} {...(doOutro ? { 'data-do-outro': textoPrivado(dono || 'família') } : {})}>
      <div className="env-h">
        <span className="icone-chip">
          <Icone nome={e.casa ? 'casa' : 'orcamento'} />
        </span>
        <b>
          {textoPrivado(e.nome)}
          {textoPrivado(doOutro && dono && !dono.endsWith(e.nome) ? ` · de ${dono}` : '')}
        </b>
        {/* quem passou do mês não vê "por dia R$ 217": vê "fica devendo" */}
        <span className="regra">
          {n.estado === 'devendo' ? (e.regra === 'semanal' ? 'passou nesta semana' : 'fica devendo') : REGRA[e.regra]}
        </span>
      </div>
      {mostrarPrincipal && (
        <div className="numrow">
          <Din
            v={principal}
            tam={resumo?.compacto ? undefined : 'mid'}
            className={n.estado === 'devendo' ? 'din-warn' : undefined}
          />
          <Qm titulo={textoPrivado(`${e.nome}: ${n.rotulo}`)} linhas={n.linhas} />
        </div>
      )}
      {mostrarPrincipal && <p className="sub">{textoPrivado(rotulo)}</p>}
      {frase && <p className="todo warn frase-estouro">{textoPrivado(frase)}</p>}
      {!oculto && (
        <div className={'meter ' + (n.usado > 1 ? 'warn' : 'ok')} aria-hidden="true">
          <i style={{ width: pct + '%' }} />
        </div>
      )}
      <p className="sub">
        Gasto no mês <b>{reais(e.gasto_mes)}</b> de {reais(tetoDoMes(e))}
        {e.regra === 'diario' && e.falta_mes_anterior
          ? ` (${reais(e.limite_base ?? e.limite_mes)} menos ${reais(e.falta_mes_anterior)} do mês passado)`
          : ''}
      </p>
      {resumo && e.livre >= 0 && e.livre !== principal && (
        <p className="sub">
          Livre no mês <Din v={e.livre} />
        </p>
      )}
      {/* C3 (revisão E2/E3): o limite da filha os pais combinam (e mudam no Planejamento); quem lança é ela */}
      {doOutro && (
        <p className="sub dono-linha">
          {textoPrivado(
            !dono
              ? 'Da família: só para ver.'
              : e.dono_papel === 'pessoa'
                ? `Só ${dono} lança aqui. O limite é combinado com os pais.`
                : `Limite de ${dono}: só ${dono} lança e mexe aqui.`,
          )}
        </p>
      )}
      {onClick && !doOutro && (
        <button
          className="btn sm line"
          type="button"
          onClick={onClick}
          aria-label={`Anotar em ${textoPrivado(e.nome)}`}
          style={{ justifySelf: 'start' }}
        >
          <Icone nome="lancar" />
          Anotar em {textoPrivado(e.nome)}
          <Icone nome="abrir" />
        </button>
      )}
    </div>
  )
}
