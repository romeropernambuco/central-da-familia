import { useDadosDoDia, useOlhoApp, useSessaoAtual } from '../app/contexto'
import { useConfig } from '../app/useConfig'
import { useLeituraRemota } from '../app/useLeituraRemota'
import { entradasDoAluguel, lerCaderno } from '../lib/aluguel'
import { hojeRecife } from '../lib/formato'
import { lerLancamentosMes, lerMes } from '../lib/resumo/leituras'
import { fraseDaSeparacao, gastoDoMes, rendaDoMesCadastrada, separarDoMes } from '../lib/separacao'
import { mesMaisV, reservaDasViagens } from '../lib/viagem'
import { Din } from './base'
import { useSalarioDaGordura } from './SalarioDaGordura'
import './planilha.css'

/**
 * "Você está gastando até tanto; não pode gastar isso; está no limite": a separação entre o que entra no mês, o lucro da
 * gordura e a gordura, no mês de hoje. Só o casal vê (gastos da família inteira). Com o olho fechado, some.
 */
export function SeparacaoDoMes() {
  const { api, familia } = useSessaoAtual()
  const { versao } = useDadosDoDia()
  const { oculto } = useOlhoApp()
  // o lucro da gordura que dá para gastar é o salário da gordura: um percentual do guardado, fixo por 12 meses
  const { regra: salario } = useSalarioDaGordura()
  const [rendas] = useConfig<unknown[]>('rendas', [])
  const [entradas] = useConfig<{ data?: string; valor?: number; destino?: string }[]>('entradas', [])
  const hoje = hojeRecife(),
    mes = hoje.slice(0, 7)
  const permitido = familia?.papel === 'casal' && !!api.recebimentos
  const { dado } = useLeituraRemota(
    `${familia?.id}:${mes}`,
    permitido ? () => lerMes(api, familia.id, hoje) : null,
    [api, versao],
    'resumo-familia:movimentacaoMes',
  )
  const { dado: caderno } = useLeituraRemota(
    `${familia?.id}:aluguel`,
    permitido && typeof api.aluguelCaderno === 'function' ? () => api.aluguelCaderno!(familia.id) : null,
    [api, versao],
    'aluguel',
  )
  const [viagens] = useConfig<unknown[]>('viagens', [])
  // a compra parcelada conta a parcela do mês: lê os gastos dos últimos 12 meses (sem eles, usa o "saiu" do mês)
  const { dado: ultimos } = useLeituraRemota(
    `${familia?.id}:${mes}:12meses`,
    permitido
      ? () =>
          Promise.all(Array.from({ length: 12 }, (_, i) => lerLancamentosMes(api, familia.id, mesMaisV(mes, -i)))).then(
            l => l.flat(),
          )
      : null,
    [api, versao],
    'resumo-familia:movimentacaoMes',
  )
  if (!permitido || oculto || !dado) return null
  // o que entrou e não é salário (aluguel, dívida recuperada, dinheiro avulso) soma por cima do salário esperado
  const extras =
    (Array.isArray(entradas) ? entradas : [])
      .filter(e => e && e.destino !== 'renda' && e.data?.slice(0, 7) === mes && e.data.slice(0, 10) <= hoje)
      .reduce((s, e) => s + (Number(e.valor) || 0), 0) +
    entradasDoAluguel(lerCaderno(caderno), mes, hoje).reduce((s, e) => s + e.valor, 0)
  const s = separarDoMes({
    entrou: dado.entrou,
    previsto: dado.previsto,
    rendaCadastrada: rendaDoMesCadastrada(rendas),
    lucro: salario?.salario_mes ?? 0,
    gasto: ultimos ? gastoDoMes(ultimos, mes, hoje) : dado.saiu,
    extras,
    reservado: reservaDasViagens(viagens, mes).total,
  })
  if (!s) return null
  const { titulo, frase } = fraseDaSeparacao(s)
  // verde com folga, âmbar no limite, vermelho quando passou (o pedaço que passou sai da gordura)
  const cor = s.situacao === 'folga' ? 'ok' : s.situacao === 'limite' ? 'warn' : 'erro'
  const pct = Math.min(100, Math.round((s.gasto / s.pode) * 100))
  return (
    <section
      className="separacao-mes"
      role="status"
      aria-label="Quanto dá para gastar neste mês"
      data-situacao={s.situacao}
    >
      <div className="tres-numeros">
        <div>
          <small>Pode gastar sem tocar na gordura</small>
          <Din v={s.pode} />
        </div>
        <div>
          <small>Já foi</small>
          <Din v={s.gasto} />
        </div>
        <div className={cor}>
          <small>
            {s.situacao === 'passou'
              ? 'Passou (sai da gordura)'
              : s.situacao === 'limite'
                ? 'No limite: ainda dá'
                : 'Ainda dá'}
          </small>
          <Din v={Math.abs(s.folga)} />
        </div>
      </div>
      <div className={`meter ${cor}`} role="img" aria-label={`${pct}% do que dá para gastar sem tocar na gordura`}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <p className="sub">
        <b>{titulo}.</b> {frase}
      </p>
    </section>
  )
}
