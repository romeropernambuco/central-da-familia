import { useEffect, useSyncExternalStore } from 'react'
import type { Api, ChaveConfig } from '../api/tipos'
import { hojeRecife } from '../lib/formato'
import { useApp } from './contexto'
import { useConfig } from './useConfig'

export type GrupoNumero = 'aplicacoes' | 'imoveis' | 'recebimentos' | 'saldo_caixa'
export interface NumerosAtualizados { aplicacoes: Record<string, string>; imoveis: Record<string, string>; recebimentos: Record<string, string>; saldo_caixa?: string }
// Extensões JSON de config_familia: não precisam de coluna nem de mudança da API financeira.
export const CHAVE_NUMEROS = 'numeros_atualizados' as ChaveConfig
export const CHAVE_FONTES = 'fontes_receita' as ChaveConfig
const vazio = (): NumerosAtualizados => ({ aplicacoes: {}, imoveis: {}, recebimentos: {} })
const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const iso = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}(T|$)/.test(v) || !Number.isFinite(Date.parse(v))) return false
  return new Date(`${v.slice(0, 10)}T12:00:00Z`).toISOString().slice(0, 10) === v.slice(0, 10)
}
export function lerNumeros(v: unknown): NumerosAtualizados {
  if (!objeto(v)) return vazio()
  const mapa = (x: unknown) => objeto(x) ? Object.fromEntries(Object.entries(x).filter(([, d]) => iso(d))) as Record<string, string> : {}
  return { aplicacoes: mapa(v.aplicacoes), imoveis: mapa(v.imoveis), recebimentos: mapa(v.recebimentos), ...(iso(v.saldo_caixa) ? { saldo_caixa: v.saldo_caixa } : {}) }
}
export function frescor(data: string | undefined, agora: Date): { dias: number | null; cor: 'verde' | 'ambar' | 'vermelho'; texto: string } {
  if (!iso(data) || Date.parse(data) > agora.getTime()) return { dias: null, cor: 'vermelho', texto: 'Sem conferência registrada' }
  // Dias de calendário no fuso da família; não muda de cor no meio da tarde.
  const dia = data.includes('T') ? hojeRecife(new Date(data)) : data
  const dias = Math.round((Date.parse(hojeRecife(agora)) - Date.parse(dia)) / 86400000)
  return { dias, cor: dias <= 30 ? 'verde' : dias <= 60 ? 'ambar' : 'vermelho', texto: dias === 0 ? 'Conferido hoje' : `Conferido há ${dias} dias` }
}

interface Loja { dados: NumerosAtualizados; erro: string; versao: number; ouvintes: Set<() => void>; fila: Promise<unknown> }
const lojas = new WeakMap<Api, Map<string, Loja>>()
function loja(api: Api, fid: string) {
  let familias = lojas.get(api)
  if (!familias) { familias = new Map(); lojas.set(api, familias) }
  let l = familias.get(fid)
  if (!l) { l = { dados: vazio(), erro: '', versao: 0, ouvintes: new Set(), fila: Promise.resolve() }; familias.set(fid, l) }
  return l
}
function emitir(l: Loja) { l.versao++; l.ouvintes.forEach(f => f()) }
export function marcarConferencia(api: Api, fid: string, grupo: GrupoNumero, id: string, agora: Date): Promise<boolean> {
  const l = loja(api, fid)
  const vez = l.fila.catch(() => {}).then(async () => {
    try {
      // Exemplo nunca lê nem grava a conferência na família real.
      const remoto = api.modo === 'exemplo' ? l.dados : lerNumeros(await api.config<unknown>(fid, CHAVE_NUMEROS, {}))
      const data = agora.toISOString()
      const novo = grupo === 'saldo_caixa' ? { ...remoto, saldo_caixa: data } : { ...remoto, [grupo]: { ...remoto[grupo], [id]: data } }
      if (api.modo !== 'exemplo') await api.salvarConfig(fid, CHAVE_NUMEROS, novo)
      l.dados = novo; l.erro = ''; emitir(l); return true
    } catch { l.erro = 'O item foi mantido. Não foi possível registrar a conferência; tente novamente.'; emitir(l); return false }
  })
  l.fila = vez
  return vez
}

/** Observa só salvamentos bem-sucedidos dos fluxos existentes. Dura durante a navegação até a edição,
 * sem mudar os argumentos, o resultado ou a falha da operação original. IDs conhecidos isolam famílias.
 * Novos itens sem ID de retorno ficam para a conferência explícita na folha. */
const observadores = new WeakMap<Api, Map<string, string>>()
export function acompanharConferencias(api: Api, fid: string, aplicacoes: string[], agora: () => Date = () => new Date()) {
  let ids = observadores.get(api)
  if (!ids) {
    ids = new Map(); observadores.set(api, ids)
    const donos = ids
    const mover = api.guardadoMovimentar
    api.guardadoMovimentar = async (...args) => {
      const resultado = await mover.apply(api, args)
      const familia = donos.get(args[0])
      if (familia && args[1] === 'saldo_conferido') await marcarConferencia(api, familia, 'aplicacoes', args[0], agora())
      return resultado
    }
    const imovel = api.imovelSalvar
    if (imovel) api.imovelSalvar = async (...args) => {
      const resultado = await imovel.apply(api, args)
      if (args[1]) await marcarConferencia(api, args[0], 'imoveis', args[1], agora())
      return resultado
    }
    const recebimento = api.recebimentoMudar
    if (recebimento) api.recebimentoMudar = async (...args) => {
      const resultado = await recebimento.apply(api, args)
      if (!args[2].apagar) await marcarConferencia(api, args[0], 'recebimentos', args[1], agora())
      return resultado
    }
  }
  for (const id of aplicacoes) ids.set(id, fid)
}

export function useNumerosAtualizados(agora: () => Date = () => new Date()) {
  const { api, familia } = useApp()
  const [config, , erroLeitura, lido] = useConfig<unknown>(CHAVE_NUMEROS, {})
  const fid = familia?.id ?? '', l = loja(api, fid)
  useSyncExternalStore(f => { l.ouvintes.add(f); return () => { l.ouvintes.delete(f) } }, () => l.versao)
  const remoto = lerNumeros(config)
  const dados: NumerosAtualizados = { ...remoto }
  // Confirmações locais só prevalecem quando mais novas que a leitura remota.
  for (const grupo of ['aplicacoes', 'imoveis', 'recebimentos'] as const) {
    dados[grupo] = { ...remoto[grupo] }
    for (const [id, data] of Object.entries(l.dados[grupo])) if (!dados[grupo][id] || data > dados[grupo][id]) dados[grupo][id] = data
  }
  if (l.dados.saldo_caixa && (!dados.saldo_caixa || l.dados.saldo_caixa > dados.saldo_caixa)) dados.saldo_caixa = l.dados.saldo_caixa
  useEffect(() => { if (familia?.papel === 'casal') acompanharConferencias(api, fid, [], agora) }, [api, fid, familia?.papel])
  return { dados, lido, erro: erroLeitura || l.erro,
    marcar: (grupo: GrupoNumero, id = '') => familia?.papel === 'casal' && lido ? marcarConferencia(api, fid, grupo, id, agora()) : Promise.resolve(false),
    avaliar: (grupo: GrupoNumero, id = '') => frescor(grupo === 'saldo_caixa' ? dados.saldo_caixa : dados[grupo][id], agora()) }
}
