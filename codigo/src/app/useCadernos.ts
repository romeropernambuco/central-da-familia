import { useAcoes, useSessaoAtual } from './contexto'
import { useLeituraRemota } from './useLeituraRemota'
import { lerNegocios, type MovimentoNegocio, type Negocio } from '../lib/dinheiroNaRua'
import { cadernoVazio, lerCaderno, type CadernoImovel } from '../lib/aluguel'

/**
 * O que a tela tirou, comparando o que ela tinha com o que quer gravar. Só isso é apagado no banco:
 * o que outro celular pôs depois que esta tela leu continua lá.
 */
export function tirados<T>(antes: readonly T[], depois: readonly T[], chave: (x: T) => string): string[] {
  const ficam = new Set(depois.map(chave))
  return antes.map(chave).filter(k => !ficam.has(k))
}

/** Dinheiro na rua (tabelas do banco desde 22/11/2026). Cada gravação muda só o negócio e os movimentos que mudaram. */
export function useNegocios() {
  const { api, familia } = useSessaoAtual()
  const { tentar } = useAcoes()
  const fid = familia?.id
  const r = useLeituraRemota('negocios', fid && api.negocios ? () => api.negocios!(fid) : null, [api, fid], 'negocios')
  const negocios = lerNegocios(r.dado)
  const salvar = (n: Negocio) =>
    tentar(async () => {
      const antes = negocios.find(x => x.id === n.id)
      await api.negocioGravar!(
        fid!,
        n,
        tirados(antes?.movimentos || [], n.movimentos, m => m.id),
      )
    })
  const apagar = (n: Negocio) => tentar(() => api.negocioApagar!(fid!, n.id))
  /** A volta e o aporte no Guardado vão juntos: ou os 2 entram, ou nenhum. */
  const voltaGuardar = (n: Pick<Negocio, 'id' | 'nome'>, m: MovimentoNegocio, aplicacao: string) =>
    tentar(() => api.negocioVoltaGuardar!(fid!, n.id, { ...m, tipo: 'voltou' }, aplicacao, `Voltou de ${n.nome}`))
  return { negocios, salvar, apagar, voltaGuardar, falha: r.erro, lido: r.dado !== null }
}

/** O caderno do aluguel da família inteira (tabelas do banco desde 22/11/2026): grava só o imóvel e o que mudou nele. */
export function useCadernoAluguel() {
  const { api, familia } = useSessaoAtual()
  const { tentar } = useAcoes()
  const fid = familia?.id
  const r = useLeituraRemota(
    'aluguel',
    fid && api.aluguelCaderno ? () => api.aluguelCaderno!(fid) : null,
    [api, fid],
    'aluguel',
  )
  const caderno = lerCaderno(r.dado)
  const salvar = (id: string, c: CadernoImovel) =>
    tentar(async () => {
      const antes = caderno[id] || cadernoVazio()
      await api.aluguelGravar!(
        fid!,
        id,
        c,
        tirados(antes.recebimentos, c.recebimentos, x => x.mes),
        tirados(antes.despesas, c.despesas, x => x.id),
      )
    })
  return { caderno, salvar, falha: r.erro, lido: r.dado !== null }
}
