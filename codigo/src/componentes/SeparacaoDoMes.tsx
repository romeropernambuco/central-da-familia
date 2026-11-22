import { useDadosDoDia, useOlhoApp, useSessaoAtual } from '../app/contexto'
import { useConfig } from '../app/useConfig'
import { useGuardado } from '../app/useDados2'
import { useLeituraRemota } from '../app/useLeituraRemota'
import { entradasDoAluguel, lerCaderno } from '../lib/aluguel'
import { hojeRecife } from '../lib/formato'
import { rendeNoMesEstimado } from '../lib/guardado'
import { lerMes } from '../lib/resumo/leituras'
import { fraseDaSeparacao, rendaDoMesCadastrada, separarDoMes } from '../lib/separacao'

/**
 * "Você está gastando até tanto; não pode gastar isso; está no limite": a separação entre o que entra no mês, o lucro da
 * gordura e a gordura, no mês de hoje. Só o casal vê (gastos da família inteira). Com o olho fechado, some.
 */
export function SeparacaoDoMes() {
  const { api, familia } = useSessaoAtual()
  const { versao } = useDadosDoDia()
  const { oculto } = useOlhoApp()
  const { g } = useGuardado()
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
    lucro: g ? rendeNoMesEstimado(g) : 0,
    gasto: dado.saiu,
    extras,
  })
  if (!s) return null
  const { titulo, frase } = fraseDaSeparacao(s)
  return (
    <div
      className={`todo ${s.situacao === 'folga' ? 'ok' : 'warn'} separacao-mes`}
      role="status"
      data-situacao={s.situacao}
    >
      <p>
        <b>{titulo}</b>
      </p>
      <p className="sub">{frase}</p>
    </div>
  )
}
