import { useApp } from '../../app/contexto'
import { useLeituraRemota } from '../../app/useLeituraRemota'
import { lerLancamentosMes } from '../../lib/resumo/leituras'
import { porDiaDe } from '../../lib/resumo/porDia'
import { RitmoMes } from '../../componentes/RitmoMes'
import type { Envelope } from '../../api/tipos'

/** Só é montado no toque: compartilha o cache de lançamentos e o gráfico da aba. */
export function RitmoOrcamento({ envelope, hoje }: { envelope: Envelope; hoje: string }) {
  const { api, familia, versao } = useApp()
  const r = useLeituraRemota('inicio-ritmo', familia ? () => lerLancamentosMes(api, familia.id, hoje.slice(0, 7)) : null, [api, versao, hoje], 'lancamentos')
  return r.erro ? <p>Não foi possível conferir o ritmo. <button type="button" onClick={r.repetir}>Tentar de novo</button></p> : r.carregando || !r.dado ? <p>Conferindo o ritmo...</p> : <RitmoMes e={envelope} porDia={porDiaDe(r.dado, envelope.id, hoje)} />
}
export default RitmoOrcamento
