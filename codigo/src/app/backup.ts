import { validarEstado } from '../lib/validarEstado'
import pacote from '../../package.json'
import type { Api } from '../api/tipos'
export const FORMATO = 1
export interface Copia {
  formato: 'central-da-familia'
  versaoFormato: 1
  versaoApp: string
  data: string
  dados: Record<string, unknown>
}
export const colecoes = [
  'lancamentos',
  'cartoes',
  'aplicacoes',
  'imoveis',
  'receitas',
  'desejos',
  'pessoas',
  'assessores',
] as const
export async function gerarCopia(api: Api, familia: string): Promise<Copia> {
  const exportado = api.backupLer ? null : ((await api.exportarFamilia(familia)) as any)
  const dados = api.backupLer
    ? await api.backupLer(familia)
    : {
        ...exportado,
        lancamentos: exportado.lancamentos,
        cartoes: await api.cartoes(familia),
        aplicacoes: (await api.guardadoHoje(familia)).aplicacoes,
        imoveis: await exigir(api.imoveis, 'imóveis')(familia),
        receitas: await exigir(api.recebimentos, 'receitas')(familia),
        desejos: await exigir(api.desejos, 'desejos')(familia),
        pessoas: await api.membros(familia),
        assessores: (await api.config<{ pessoas: unknown[] }>(familia, 'casa_folha', { pessoas: [] })).pessoas,
        parametros: await exigir(api.objetivo, 'parâmetros')(familia),
      }
  return {
    formato: 'central-da-familia',
    versaoFormato: FORMATO,
    versaoApp: pacote.version,
    data: new Date().toISOString(),
    dados,
  }
}
function exigir<T>(f: T | undefined, nome: string): T {
  if (!f) throw new Error('O banco ainda não exporta ' + nome + '. Cópia cancelada.')
  return f
}
function seguro(v: unknown, nivel = 0): boolean {
  if (nivel > 60) return false
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return true
  if (typeof v === 'number') return Number.isFinite(v)
  if (Array.isArray(v)) return v.length < 100000 && v.every(x => seguro(x, nivel + 1))
  return (
    typeof v === 'object' &&
    Object.entries(v as object).every(
      ([k, x]) => !['__proto__', 'constructor', 'prototype'].includes(k) && seguro(x, nivel + 1),
    )
  )
}
export function validarCopia(texto: string): Copia {
  if (texto.length > 20000000) throw new Error('Arquivo muito grande.')
  const c = JSON.parse(texto)
  if (
    !c ||
    c.formato !== 'central-da-familia' ||
    c.versaoFormato !== FORMATO ||
    typeof c.versaoApp !== 'string' ||
    typeof c.data !== 'string' ||
    !Number.isFinite(Date.parse(c.data)) ||
    !c.dados ||
    !seguro(c.dados)
  )
    throw new Error('Formato ou versão da cópia não compatível.')
  for (const k of colecoes) {
    if (!Array.isArray(c.dados[k])) throw new Error('Cópia incompleta: ' + k)
    const ids = new Set<string>()
    for (const item of c.dados[k]) {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id || ids.has(item.id))
        throw new Error('Item inválido ou repetido em ' + k)
      ids.add(item.id)
    }
  }
  const campos: Record<string, Record<string, string>> = {
    lancamentos: { valor: 'number', envelope_id: 'string', data: 'string' },
    cartoes: { nome: 'string' },
    aplicacoes: { nome: 'string' },
    imoveis: { apelido: 'string', valor: 'number' },
    receitas: { descricao: 'string', valor: 'number' },
    desejos: { nome: 'string', valor: 'number' },
    pessoas: { nome: 'string' },
    assessores: { nome: 'string' },
  }
  for (const [k, tipos] of Object.entries(campos))
    for (const item of c.dados[k])
      for (const [campo, tipo] of Object.entries(tipos))
        if (typeof item[campo] !== tipo) throw new Error('Campo inválido em ' + k + ': ' + campo)
  if (!c.dados.parametros || !c.dados.config) throw new Error('Cópia sem parâmetros ou configurações.')
  validarEstado(c.dados)
  return c
}
export function previaCopia(antes: Copia, depois: Copia) {
  const entradas = (v: any): Map<string, unknown> =>
    new Map(
      Array.isArray(v)
        ? v.map((x, i) => [String(x?.id ?? i), x])
        : v && typeof v === 'object'
          ? Object.entries(v)
          : v === undefined
            ? []
            : [['valor', v]],
    )
  return [...new Set([...Object.keys(antes.dados), ...Object.keys(depois.dados)])].map(colecao => {
    const a = entradas(antes.dados[colecao]),
      b = entradas(depois.dados[colecao])
    const diferencas = [...new Set([...a.keys(), ...b.keys()])]
      .filter(id => JSON.stringify(a.get(id)) !== JSON.stringify(b.get(id)))
      .map(id => ({
        id,
        antes: a.get(id),
        depois: b.get(id),
        tipo: !a.has(id) ? 'Incluído' : !b.has(id) ? 'Excluído' : 'Alterado',
      }))
    return {
      colecao,
      substituir: a.size,
      total: b.size,
      novos: diferencas.filter(x => x.tipo === 'Incluído').length,
      excluidos: diferencas.filter(x => x.tipo === 'Excluído').length,
      alterados: diferencas.filter(x => x.tipo === 'Alterado').length,
      diferencas,
    }
  })
}
