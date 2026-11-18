import { useSyncExternalStore } from 'react'
import type { Api, FamiliaMinha } from '../api/tipos'
import { recursosResumo } from '../lib/resumo/recursos'

export interface EscopoLeitura { sessao: string; familia: string; membro: string; papel: string }
type Registro = { recurso: string; familia: string; promessa?: Promise<any>; dado?: any; pronto: boolean; pedido: number; estado: 'carregando' | 'pronto' | 'erro'; erro?: Error; consultadoEm: string | null }
type Memoria = { geracao: number; escopo: EscopoLeitura | null; registros: Map<string, Registro>; donos: Map<string, string>; apis: Set<Api> }
const memorias = new WeakMap<Api, Memoria>()
function memoria(api: Api) {
  let m = memorias.get(api)
  if (!m) { m = { geracao: 0, escopo: null, registros: new Map(), donos: new Map(), apis: new Set([api]) }; memorias.set(api, m) }
  return m
}
export function vincularMemoria(interna: Api, publica: Api) {
  memorias.set(publica, memoria(interna))
  memoria(interna).apis.add(publica)
  let familias = lojas.get(interna)
  if (!familias) { familias = new Map(); lojas.set(interna, familias) }
  lojas.set(publica, familias)
}
export function limparLeituras(api: Api) {
  const m = memoria(api); m.geracao++; m.registros.clear(); m.donos.clear(); m.escopo = null
  for (const a of m.apis) limpezas.forEach(f => f(a))
}
const limpezas = new Set<(api: Api) => void>()
export function aoLimparLeituras(f: (api: Api) => void) { limpezas.add(f) }
export function definirEscopoLeitura(api: Api, sessao: string, f: FamiliaMinha | null) {
  const m = memoria(api)
  const novo = f ? { sessao, familia: f.id, membro: f.membroId || '', papel: f.papel } : null
  if (JSON.stringify(novo) !== JSON.stringify(m.escopo)) { limparLeituras(api); m.escopo = novo }
}
export const geracaoLeitura = (api: Api) => memoria(api).geracao
export class LeituraSubstituida extends Error {
  constructor() { super('Leitura substituída; consulte novamente') }
}
export function escopoLeitura(api: Api) { return memoria(api).escopo }
export function registrarDono(api: Api, id: string, familia: string) { memoria(api).donos.set(id, familia) }
export function familiaDoId(api: Api, id: string) { const m = memoria(api); return m.donos.get(id) || m.escopo?.familia }
/** Metadados de transporte para a f35; não inventam data de atualização do cadastro. */
export function metadadosLeitura(api: Api, familia: string, recurso: string, parametros: unknown[] = []) {
  const m = memoria(api)
  const chave = JSON.stringify([api.modo, m.geracao, m.escopo, familia, recurso, parametros])
  const r = m.registros.get(chave)
  return r ? { estado: r.estado, consultadoEm: r.consultadoEm, erro: r.erro?.message || null } : null
}
/** Cache só em memória. Foco/reconexão/virada do dia relêem; não há push entre aparelhos. */
export function lerCompartilhado<T>(api: Api, familia: string, recurso: string, parametros: unknown[], buscar: () => Promise<T>, opcoes?: { fresco?: boolean }): Promise<T> {
  const m = memoria(api), e = m.escopo
  // A equipe não consulta nem conserva recursos financeiros, mesmo por uma chamada acidental.
  const configDaCasa = (recurso === 'config' || recurso.startsWith('config:')) && ['casa_lista', 'casa_presenca', 'casa_ponto', 'casa_gas'].includes(String(parametros[0]))
  if (e?.papel === 'equipe' && !configDaCasa && !['casa', 'feira', 'estoque', 'lista', 'escritorio', 'membros'].includes(recurso)) return Promise.reject(new Error('Leitura restrita ao perfil autorizado'))
  const chave = JSON.stringify([api.modo, m.geracao, e, familia, recurso, parametros])
  let r = m.registros.get(chave)
  if (!opcoes?.fresco) {
    if (r?.promessa) return r.promessa
    if (r?.pronto) return Promise.resolve(r.dado)
  }
  r = { familia, recurso, pronto: false, pedido: 0, estado: 'carregando', consultadoEm: null }; m.registros.set(chave, r)
  const registro = r, geracao = m.geracao, pedido = ++r.pedido
  const atual = () => m.geracao === geracao && m.registros.get(chave) === registro && pedido === registro.pedido
  const promessa = Promise.resolve().then(() => {
    if (!atual()) throw new LeituraSubstituida()
    return buscar()
  }).then(dado => {
    if (!atual()) throw new LeituraSubstituida()
    registro.dado = dado; registro.pronto = true; registro.estado = 'pronto'; registro.consultadoEm = new Date().toISOString(); return dado
  }).catch(erro => {
    if (!atual()) throw new LeituraSubstituida()
    registro.estado = 'erro'; registro.erro = erro; registro.consultadoEm = new Date().toISOString()
    throw erro
  }).finally(() => { if (atual()) registro.promessa = undefined })
  registro.promessa = promessa
  return promessa
}

const lojas = new WeakMap<Api, Map<string, { versao: number; recursos: Map<string, number>; ouvintes: Set<() => void> }>>()
function loja(api: Api, familia: string) {
  let familias = lojas.get(api)
  if (!familias) { familias = new Map(); lojas.set(api, familias) }
  let l = familias.get(familia)
  if (!l) { l = { versao: 0, recursos: new Map(), ouvintes: new Set() }; familias.set(familia, l) }
  return l
}
export function invalidarDados(api: Api, familia: string, recursos?: readonly string[]) {
  if (recursos) recursos = [...recursos, ...Object.entries(recursosResumo).filter(([, rs]) => rs.some(r => recursos!.includes(r))).map(([k]) => `resumo-familia:${k}`)]
  const m = memoria(api)
  for (const [chave, r] of m.registros) if (r.familia === familia && (!recursos || recursos.includes(r.recurso))) { r.pedido++; m.registros.delete(chave) }
  const l = loja(api, familia); l.versao++
  if (recursos) for (const r of recursos) l.recursos.set(r, (l.recursos.get(r) || 0) + 1)
  else for (const r of l.recursos.keys()) l.recursos.set(r, (l.recursos.get(r) || 0) + 1)
  l.ouvintes.forEach(f => f())
}
export function useInvalidacao(api: Api, familia: string, recurso?: string) {
  const l = loja(api, familia)
  if (recurso && !l.recursos.has(recurso)) l.recursos.set(recurso, 0)
  const snapshot = () => recurso ? l.recursos.get(recurso) || 0 : l.versao
  return useSyncExternalStore(f => { l.ouvintes.add(f); return () => l.ouvintes.delete(f) }, snapshot, snapshot)
}
