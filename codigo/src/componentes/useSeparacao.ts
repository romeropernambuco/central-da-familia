import { useDadosDoDia, useSessaoAtual } from '../app/contexto'
import { useConfig } from '../app/useConfig'
import { useLeituraRemota } from '../app/useLeituraRemota'
import { entradasDoAluguel, lerCaderno } from '../lib/aluguel'
import { hojeRecife } from '../lib/formato'
import { lerLancamentosMes, lerMes } from '../lib/resumo/leituras'
import { gastoDoMes, rendaDoMesCadastrada, separarDoMes, type SeparacaoDoMes } from '../lib/separacao'
import { mesMaisV, reservaDasViagens } from '../lib/viagem'
import { useSalarioDaGordura } from './SalarioDaGordura'

/**
 * A separação do mês de hoje e a do mês passado, com as mesmas leituras: a tela do Guardado ("pode gastar sem tocar na
 * gordura") e a seta do Início (entra mais do que sai?) usam esta conta, para os números nunca brigarem.
 * Só o casal (gastos da família inteira); sem permissão ou sem dados, devolve nulo.
 */
export function useSeparacao(): { agora: SeparacaoDoMes | null; antes: SeparacaoDoMes | null } | null {
  const { api, familia } = useSessaoAtual()
  const { versao } = useDadosDoDia()
  // o lucro da gordura que dá para gastar é o salário da gordura: um percentual do guardado, fixo por 12 meses
  const { regra: salario, aliqAluguel } = useSalarioDaGordura()
  const [rendas] = useConfig<unknown[]>('rendas', [])
  const [entradas] = useConfig<{ data?: string; valor?: number; destino?: string }[]>('entradas', [])
  const [viagens] = useConfig<unknown[]>('viagens', [])
  const hoje = hojeRecife(),
    mes = hoje.slice(0, 7),
    mesAnt = mesMaisV(mes, -1)
  const permitido = familia?.papel === 'casal' && !!api.recebimentos
  const { dado } = useLeituraRemota(
    `${familia?.id}:${mes}`,
    permitido ? () => lerMes(api, familia.id, hoje) : null,
    [api, versao],
    'resumo-familia:movimentacaoMes',
  )
  // os outros meses só depois que o mês de hoje leu certo: se a leitura falhou, a tela não insiste (pede "Tentar de novo")
  const ok = permitido && !!dado
  const { dado: dadoAnt } = useLeituraRemota(
    `${familia?.id}:${mesAnt}`,
    ok ? () => lerMes(api, familia.id, hoje, mesAnt) : null,
    [api, versao, ok],
    'resumo-familia:movimentacaoMes',
  )
  const { dado: caderno } = useLeituraRemota(
    `${familia?.id}:aluguel`,
    permitido && typeof api.aluguelCaderno === 'function' ? () => api.aluguelCaderno!(familia.id) : null,
    [api, versao],
    'aluguel',
  )
  // a compra parcelada conta a parcela do mês: lê os gastos dos últimos 12 meses (sem eles, usa o "saiu" do mês)
  const { dado: ultimos } = useLeituraRemota(
    `${familia?.id}:${mes}:12meses`,
    ok
      ? () =>
          Promise.all(Array.from({ length: 12 }, (_, i) => lerLancamentosMes(api, familia.id, mesMaisV(mes, -i)))).then(
            l => l.flat(),
          )
      : null,
    [api, versao, ok],
    'resumo-familia:movimentacaoMes',
  )
  if (!permitido) return null
  const rendaCadastrada = rendaDoMesCadastrada(rendas)
  const doMes = (
    m: string,
    d: { entrou: number; previsto: number; saiu: number } | null | undefined,
    passado: boolean,
  ) => {
    if (!d) return null
    // o que entrou e não é salário (aluguel, dívida recuperada, dinheiro avulso) soma por cima do salário esperado
    const aluguel = entradasDoAluguel(lerCaderno(caderno), m, hoje).reduce((s, e) => s + e.valor, 0)
    const extras =
      (Array.isArray(entradas) ? entradas : [])
        .filter(e => e && e.destino !== 'renda' && e.data?.slice(0, 7) === m && e.data.slice(0, 10) <= hoje)
        .reduce((s, e) => s + (Number(e.valor) || 0), 0) + aluguel
    return separarDoMes({
      // o aluguel conta líquido, como no plano: o imposto dele sai deste dinheiro
      imposto: aluguel * aliqAluguel,
      entrou: d.entrou,
      // mês fechado: o que não chegou não entra mais
      previsto: passado ? 0 : d.previsto,
      rendaCadastrada,
      lucro: salario?.salario_mes ?? 0,
      gasto: ultimos ? gastoDoMes(ultimos, m, hoje) : d.saiu,
      extras,
      reservado: reservaDasViagens(viagens, m).total,
    })
  }
  return { agora: doMes(mes, dado, false), antes: doMes(mesAnt, dadoAnt, true) }
}
