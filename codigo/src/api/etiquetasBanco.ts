import type { Api, Etiqueta, EtiquetaResumo, EtiquetaSimulacao } from './tipos'
import { cru, lista } from './cru'

/**
 * Etiquetas de viagem e evento no banco real (esquema produto, 21/11/2026).
 * Toda escrita passa pelas funções do banco, que conferem o papel: só o casal cria, marca e vê os totais.
 * Os nomes dos campos abaixo foram conferidos no texto das funções etiqueta_resumo, etiqueta_simular,
 * etiquetas_da_familia, etiqueta_salvar, etiquetar e lancamento_moeda.
 */
type Rpc = <T>(nome: string, args?: Record<string, unknown>) => Promise<T>
/** Lê `etiqueta_id` das etiquetas ativas de um gasto (leitura direta, só com select). */
type LerLigacoes = (lancamento: string) => Promise<unknown>

const num = (v: unknown) => Number(v) || 0
const numOuNada = (v: unknown) => (v == null ? null : Number(v))
const dataOuNada = (v: unknown) => (v ? String(v).slice(0, 10) : null)

export function normalizaEtiqueta(bruto: unknown): Etiqueta {
  const e = cru(bruto)
  return {
    id: String(e.id),
    nome: String(e.nome || ''),
    inicio: dataOuNada(e.inicio),
    fim: dataOuNada(e.fim),
    moeda: String(e.moeda || 'BRL'),
    pessoas: numOuNada(e.pessoas),
    arquivada: !!e.arquivada,
    total: numOuNada(e.total),
    lancamentos: num(e.lancamentos),
  }
}

export function normalizaResumoEtiqueta(bruto: unknown): EtiquetaResumo {
  const r = cru(bruto)
  const { total: _total, lancamentos: _lancamentos, ...etiqueta } = normalizaEtiqueta(r.etiqueta)
  return {
    etiqueta,
    dias: numOuNada(r.dias),
    pessoas: numOuNada(r.pessoas),
    lancamentos: num(r.lancamentos),
    total: num(r.total),
    antes: num(r.antes),
    durante: num(r.durante),
    depois: num(r.depois),
    por_dia: numOuNada(r.por_dia),
    por_pessoa_dia: numOuNada(r.por_pessoa_dia),
    por_envelope: lista(r.por_envelope).map(x => ({
      envelope: String(x.envelope || 'Sem limite'),
      total: num(x.total),
      pct: num(x.pct),
    })),
    por_moeda: lista(r.por_moeda).map(x => ({
      moeda: String(x.moeda || 'BRL'),
      valor_original: num(x.valor_original),
      valor_brl: num(x.valor_brl),
      cambio_medio: num(x.cambio_medio),
    })),
    por_data: lista(r.por_data).map(x => ({
      data: String(x.data || '').slice(0, 10),
      total: num(x.total),
      lancamentos: num(x.lancamentos),
    })),
  }
}

export function normalizaSimulacao(bruto: unknown): EtiquetaSimulacao {
  const s = cru(bruto)
  return {
    dias: num(s.dias),
    pessoas: num(s.pessoas),
    gasto_durante: num(s.gasto_durante),
    pago_antes_referencia: num(s.pago_antes_referencia),
    total_estimado: num(s.total_estimado),
    aviso:
      'Estimativa com o gasto real desta viagem. Passagem e hotel mudam por destino e data: confirme o preço do dia.',
  }
}

type AcoesEtiqueta = Required<
  Pick<
    Api,
    | 'etiquetas'
    | 'etiquetaSalvar'
    | 'etiquetar'
    | 'etiquetasDoLancamento'
    | 'lancamentoMoeda'
    | 'etiquetaResumo'
    | 'etiquetaSimular'
  >
>

export function etiquetasDoBanco(rpc: Rpc, lerLigacoes: LerLigacoes): AcoesEtiqueta {
  return {
    async etiquetas(familia, incluirArquivadas = false) {
      return lista(await rpc('etiquetas_da_familia', { familia, incluir_arquivadas: incluirArquivadas })).map(
        normalizaEtiqueta,
      )
    },
    async etiquetaSalvar(familia, e, id) {
      const r = cru(
        await rpc('etiqueta_salvar', {
          familia,
          nome: e.nome.trim(),
          inicio: e.inicio,
          fim: e.fim,
          moeda: e.moeda.trim().toUpperCase() || 'BRL',
          pessoas: e.pessoas,
          etiqueta: id ?? null,
          arquivada: !!e.arquivada,
        }),
      )
      return { etiqueta: normalizaEtiqueta(r.etiqueta), aplicada_em: num(r.aplicada_em) }
    },
    async etiquetar(lancamento, etiqueta, ligar) {
      await rpc('etiquetar', { lancamento, etiqueta, ligar })
    },
    async etiquetasDoLancamento(lancamento) {
      return lista(await lerLigacoes(lancamento)).map(x => String(x.etiqueta_id))
    },
    async lancamentoMoeda(lancamento, valorOriginal, moeda) {
      await rpc('lancamento_moeda', {
        lancamento,
        valor_original: valorOriginal,
        moeda: moeda ?? null,
        cambio: null,
      })
    },
    async etiquetaResumo(etiqueta) {
      return normalizaResumoEtiqueta(await rpc('etiqueta_resumo', { etiqueta }))
    },
    async etiquetaSimular(etiqueta, dias, pessoas) {
      return normalizaSimulacao(await rpc('etiqueta_simular', { etiqueta, dias, pessoas: pessoas ?? null }))
    },
  }
}
