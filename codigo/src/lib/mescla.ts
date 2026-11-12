// Junta 2 mudanças feitas ao mesmo tempo na mesma chave de config (2 celulares), sem uma apagar a outra.
// base = o que este aparelho tinha lido; meu = o que este aparelho quer gravar; remoto = o que está no banco agora.

/** Texto igual pra valores iguais, não importa a ordem das chaves (o banco devolve as chaves em outra ordem). */
export function canon(v: unknown): string {
  if (v === undefined) return 'null'
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']'
  const o = v as Record<string, unknown>
  return '{' + Object.keys(o).filter(k => o[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(o[k])).join(',') + '}'
}
export const igual = (a: unknown, b: unknown) => canon(a) === canon(b)

const ehObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const temId = (v: unknown): v is { id: string } => ehObj(v) && (typeof v.id === 'string' || typeof v.id === 'number')
const listaComId = (v: unknown): v is { id: string }[] => Array.isArray(v) && v.every(temId)

/**
 * Regra: o que EU mudei vale; o que eu não toquei fica como está no banco.
 * Lista com id (compras, serviços, rendas): junta item por item. Lista simples (datas, nomes): junta sem repetir.
 */
export function mesclar3<T>(base: T, meu: T, remoto: T): T {
  if (igual(base, remoto)) return meu
  if (igual(base, meu)) return remoto
  if (igual(meu, remoto)) return meu
  if (Array.isArray(meu) && Array.isArray(remoto)) {
    const b = Array.isArray(base) ? (base as unknown[]) : []
    if (listaComId(meu) && listaComId(remoto) && listaComId(b)) {
      const idb = new Map(b.map(x => [String(x.id), x])), idm = new Map(meu.map(x => [String(x.id), x]))
      const out: unknown[] = []
      for (const r of remoto) {
        const id = String(r.id), antes = idb.get(id), m = idm.get(id)
        if (m) out.push(mesclar3(antes ?? r, m, r))          // os 2 têm: campo por campo
        else if (!antes) out.push(r)                         // o outro celular acrescentou
        // senão: estava na base e eu tirei, fica fora
      }
      const idr = new Set(remoto.map(x => String(x.id)))
      for (const m of meu) {
        const id = String(m.id)
        if (idr.has(id)) continue
        if (!idb.has(id) || !igual(idb.get(id), m)) out.push(m) // eu acrescentei (ou mudei um que o outro tirou)
      }
      return out as T
    }
    const cb = new Set(b.map(canon)), cm = new Set((meu as unknown[]).map(canon)), cr = new Set((remoto as unknown[]).map(canon))
    const out = (remoto as unknown[]).filter(x => !(cb.has(canon(x)) && !cm.has(canon(x))))  // tira o que eu tirei
    for (const x of meu as unknown[]) if (!cr.has(canon(x)) && !cb.has(canon(x))) out.push(x) // põe o que eu pus
    return out as T
  }
  if (ehObj(meu) && ehObj(remoto)) {
    const b: Record<string, unknown> = ehObj(base) ? base : {}
    const out: Record<string, unknown> = {}
    for (const k of new Set([...Object.keys(remoto), ...Object.keys(meu)])) {
      const emB = k in b, emM = k in meu, emR = k in remoto
      if (emM && emR) out[k] = mesclar3(b[k], meu[k], remoto[k])
      else if (emM) { if (!emB || !igual(b[k], meu[k])) out[k] = meu[k] }   // eu criei (ou mudei o que o outro tirou)
      else if (emR) { if (!emB) out[k] = remoto[k] }                         // o outro criou; se estava na base, eu tirei
    }
    return out as T
  }
  return meu
}
