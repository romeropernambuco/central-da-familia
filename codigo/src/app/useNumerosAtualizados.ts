import { observarPosMutacao } from '../api/posMutacao'
import { aoLimparLeituras, geracaoLeitura, escopoLeitura } from '../lib/invalidacao'
import { useEffect, useSyncExternalStore } from 'react'
import type { Api, ChaveConfig } from '../api/tipos'
import { dataConferenciaValida, frescor, type GrupoNumero, type NumerosAtualizados } from '../lib/resumo/conferencia'
export { frescor } from '../lib/resumo/conferencia'
import { useSessaoAtual } from './contexto'
import { useConfig } from './useConfig'

export type { GrupoNumero, NumerosAtualizados } from '../lib/resumo/conferencia'
// Extensões JSON de config_familia: não precisam de coluna nem de mudança da API financeira.
export const CHAVE_NUMEROS: ChaveConfig = 'numeros_atualizados'
export const CHAVE_FONTES = 'fontes_receita' as ChaveConfig
const vazio = (): NumerosAtualizados => ({ aplicacoes: {}, imoveis: {}, recebimentos: {} })
const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export function lerNumeros(v: unknown): NumerosAtualizados {
  if (!objeto(v)) return vazio()
  const mapa = (x: unknown) =>
    objeto(x)
      ? (Object.fromEntries(Object.entries(x).filter(([, d]) => dataConferenciaValida(d))) as Record<string, string>)
      : {}
  return {
    aplicacoes: mapa(v.aplicacoes),
    imoveis: mapa(v.imoveis),
    recebimentos: mapa(v.recebimentos),
    ...(dataConferenciaValida(v.saldo_caixa) ? { saldo_caixa: v.saldo_caixa } : {}),
  }
}

interface Loja {
  dados: NumerosAtualizados
  erro: string
  versao: number
  ouvintes: Set<() => void>
  fila: Promise<unknown>
}
const lojas = new WeakMap<Api, Map<string, Loja>>()
function loja(api: Api, fid: string) {
  let familias = lojas.get(api)
  if (!familias) {
    familias = new Map()
    lojas.set(api, familias)
  }
  let l = familias.get(fid)
  if (!l) {
    l = { dados: vazio(), erro: '', versao: 0, ouvintes: new Set(), fila: Promise.resolve() }
    familias.set(fid, l)
  }
  return l
}
function emitir(l: Loja) {
  l.versao++
  l.ouvintes.forEach(f => f())
}
export function marcarConferencia(
  api: Api,
  fid: string,
  grupo: GrupoNumero,
  id: string,
  agora: Date,
  gravar = (familia: string, valor: unknown) => api.salvarConfig(familia, CHAVE_NUMEROS, valor),
): Promise<boolean> {
  const l = loja(api, fid)
  const geracao = geracaoLeitura(api)
  const atual = () => geracao === geracaoLeitura(api)
  const vez = l.fila
    .catch(() => {})
    .then(async () => {
      try {
        if (!atual()) return false
        // Exemplo nunca lê nem grava a conferência na família real.
        const remoto =
          api.modo === 'exemplo'
            ? l.dados
            : lerNumeros(await api.config<unknown>(fid, CHAVE_NUMEROS, {}, { fresco: true }))
        const data = agora.toISOString()
        const novo =
          grupo === 'saldo_caixa'
            ? { ...remoto, saldo_caixa: data }
            : { ...remoto, [grupo]: { ...remoto[grupo], [id]: data } }
        if (!atual()) return false
        if (api.modo !== 'exemplo') await gravar(fid, novo)
        if (!atual()) return false
        l.dados = novo
        l.erro = ''
        emitir(l)
        return true
      } catch {
        if (!atual()) return false
        l.erro = 'O item foi mantido. Não foi possível registrar a conferência; tente novamente.'
        emitir(l)
        return false
      }
    })
  l.fila = vez
  return vez
}

/** Observa só salvamentos bem-sucedidos dos fluxos existentes. Dura durante a navegação até a edição,
 * sem mudar os argumentos, o resultado ou a falha da operação original. IDs conhecidos isolam famílias.
 * Novos itens sem ID de retorno ficam para a conferência explícita na folha. */
const observadores = new WeakMap<Api, Map<string, string>>()
export function acompanharConferencias(
  api: Api,
  fid: string,
  aplicacoes: string[],
  agora: () => Date = () => new Date(),
) {
  let ids = observadores.get(api)
  if (!ids) {
    ids = new Map()
    observadores.set(api, ids)
    const donos = ids
    observarPosMutacao(api, async (nome, [a, b, dados], gravar) => {
      if (escopoLeitura(api)?.papel !== 'casal' || typeof a !== 'string' || typeof b !== 'string') return
      if (nome === 'imovelSalvar' && b) await marcarConferencia(api, a, 'imoveis', b, agora(), gravar)
      if (nome === 'recebimentoMudar' && !(dados as { apagar?: boolean }).apagar)
        await marcarConferencia(api, a, 'recebimentos', b, agora(), gravar)
      const familia = donos.get(a)
      if (nome === 'guardadoMovimentar' && familia && b === 'saldo_conferido')
        await marcarConferencia(api, familia, 'aplicacoes', a, agora(), gravar)
    })
  }
  for (const id of aplicacoes) ids.set(id, fid)
}

export function useNumerosAtualizados(agora: () => Date = () => new Date()) {
  const { api, familia } = useSessaoAtual()
  const [config, , erroLeitura, lido] = useConfig<unknown>(CHAVE_NUMEROS, {})
  const fid = familia?.id ?? '',
    l = loja(api, fid)
  useSyncExternalStore(
    f => {
      l.ouvintes.add(f)
      return () => {
        l.ouvintes.delete(f)
      }
    },
    () => l.versao,
    () => l.versao,
  )
  const remoto = lerNumeros(config)
  const dados: NumerosAtualizados = { ...remoto }
  // Confirmações locais só prevalecem quando mais novas que a leitura remota.
  for (const grupo of ['aplicacoes', 'imoveis', 'recebimentos'] as const) {
    dados[grupo] = { ...remoto[grupo] }
    for (const [id, data] of Object.entries(l.dados[grupo]))
      if (!dados[grupo][id] || data > dados[grupo][id]) dados[grupo][id] = data
  }
  if (l.dados.saldo_caixa && (!dados.saldo_caixa || l.dados.saldo_caixa > dados.saldo_caixa))
    dados.saldo_caixa = l.dados.saldo_caixa
  useEffect(() => {
    if (familia?.papel === 'casal') acompanharConferencias(api, fid, [], agora)
  }, [api, fid, familia?.papel])
  return {
    dados,
    lido,
    erro: erroLeitura || l.erro,
    marcar: (grupo: GrupoNumero, id = '') =>
      familia?.papel === 'casal' && lido ? marcarConferencia(api, fid, grupo, id, agora()) : Promise.resolve(false),
    avaliar: (grupo: GrupoNumero, id = '') =>
      frescor(grupo === 'saldo_caixa' ? dados.saldo_caixa : dados[grupo][id], agora()),
  }
}

aoLimparLeituras(api => {
  lojas.delete(api)
  observadores.get(api)?.clear()
})
