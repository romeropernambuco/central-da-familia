import type { Api } from '../../api/tipos'
import { centavos } from '../../lib/formato'

export interface MudancaLimite {
  envelope: string
  antes: number
  depois: number
}

/**
 * Grava vários limites do mês (e a reserva combinada) e devolve UM desfazer que volta todos juntos.
 * Se a gravação parar no meio, o desfazer cobre só o que chegou a ser gravado e o erro vem junto.
 * Ao desfazer, confere o resumo: se algum limite já não está como esta gravação deixou, não mexe em nenhum.
 * Limite conhecido: a leitura passa pelo mesmo cache das telas, então uma mudança feita em OUTRO aparelho nos
 * últimos segundos pode não ser percebida.
 */
export async function gravarLimites(
  api: Api,
  familia: string,
  limites: MudancaLimite[],
  reserva: MudancaLimite | null,
) {
  const feitos: MudancaLimite[] = []
  let reservaFeita = false,
    erro: unknown
  try {
    for (const m of limites) {
      await api.definirLimite(familia, m.envelope, m.depois)
      feitos.push(m)
    }
    if (reserva) {
      await api.salvarEnvelope(familia, reserva.envelope, { colchao: reserva.depois })
      reservaFeita = true
    }
  } catch (e) {
    erro = e
  }
  const voltar = async () => {
    const envelopes = (await api.resumoHoje(familia)).envelopes
    const igual = (id: string, valor: number, campo: 'limite' | 'reserva') => {
      const e = envelopes.find(x => x.id === id)
      return (
        !!e &&
        centavos(campo === 'limite' ? (e.limite_base ?? e.limite_mes) : (e.colchao_meta ?? 0)) === centavos(valor)
      )
    }
    if (
      feitos.some(m => !igual(m.envelope, m.depois, 'limite')) ||
      (reservaFeita && !igual(reserva!.envelope, reserva!.depois, 'reserva'))
    )
      throw new Error('Isso mudou depois; confira antes de desfazer')
    for (const m of feitos) await api.definirLimite(familia, m.envelope, m.antes)
    if (reservaFeita) await api.salvarEnvelope(familia, reserva!.envelope, { colchao: reserva!.antes })
  }
  return { voltar: feitos.length || reservaFeita ? voltar : undefined, erro }
}
