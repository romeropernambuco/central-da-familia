import { useDadosDoDia, useSessaoAtual } from '../../app/contexto'
import { useLeituraRemota } from '../../app/useLeituraRemota'
import { lerLancamentosMes } from '../../lib/resumo/leituras'
import { porDiaDe } from '../../lib/resumo/porDia'
import { RitmoMes } from '../../componentes/RitmoMes'
import type { Envelope } from '../../api/tipos'
import type { ValoresDoRitmo } from '../../componentes/RitmoMes'

/** Só é montado no toque: compartilha o cache de lançamentos e o gráfico da aba. */
export function RitmoOrcamento({
  envelope,
  hoje,
  valoresNoOrcamento,
}: {
  envelope: Envelope
  hoje: string
  valoresNoOrcamento?: ValoresDoRitmo
}) {
  const { api, familia } = useSessaoAtual()
  const { versao } = useDadosDoDia()
  const r = useLeituraRemota(
    'inicio-ritmo',
    familia ? () => lerLancamentosMes(api, familia.id, hoje.slice(0, 7)) : null,
    [api, versao, hoje],
    'lancamentos',
  )
  return r.erro ? (
    <p>
      Não foi possível conferir o ritmo.{' '}
      <button type="button" onClick={r.repetir}>
        Tentar de novo
      </button>
    </p>
  ) : r.carregando || !r.dado ? (
    <p className="resumo-esqueleto" role="status">
      Conferindo o ritmo...
    </p>
  ) : (
    <RitmoMes e={envelope} porDia={porDiaDe(r.dado, envelope.id, hoje)} valoresJaVisiveis={valoresNoOrcamento} />
  )
}
export default RitmoOrcamento
