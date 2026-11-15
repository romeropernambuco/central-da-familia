import { mascararTexto, valoresOcultos } from './formato'

/** Fragmentos vêm dos dados estruturados, nunca de adivinhação de nomes pela capitalização. */
export function nomesPrivados(dados: unknown): string[] {
  const nomes: string[] = []
  function visitar(v: unknown, chave = '') {
    if (typeof v === 'string' && /^(nome|membroNome|titular|titular_nome|dono_nome|apelido|descricao|servico|titulo|detalhe)$/.test(chave) && v.trim()) nomes.push(v)
    else if (Array.isArray(v)) v.forEach(x => visitar(x, chave))
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => visitar(x, k))
  }
  visitar(dados)
  return [...new Set(nomes)].sort((a, b) => b.length - a.length)
}

export function textoDeAgente(texto: string, privados: readonly string[], oculto = valoresOcultos()): string {
  if (!oculto) return texto
  // Uma única substituição evita que um nome curto altere a máscara de outro.
  const nomes = privados.filter(Boolean).sort((a, b) => b.length - a.length)
  const escapados = nomes.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return mascararTexto(escapados.length ? texto.replace(new RegExp('(?<![\\p{L}\\p{N}])(?:' + escapados.join('|') + ')(?![\\p{L}\\p{N}])', 'giu'), '•••') : texto)
}

/** A resposta da API só leva nomes que já aparecem nos textos autorizados. */
export function privadosNoTexto(textos: string[], dados: unknown, extras: string[] = []): string[] {
  return [...new Set([...extras, ...nomesPrivados(dados)])].filter(nome =>
    textos.some(texto => textoDeAgente(texto, [nome], true) !== mascararTexto(texto)))
}

export function rotuloDeOpcao(texto: string, indice: number, privados: readonly string[], oculto = valoresOcultos()) {
  const seguro = textoDeAgente(texto, privados, oculto)
  return oculto && !seguro.replace(/•••|R\$|[\s\p{P}\p{S}]/gu, '') ? `Opção ${indice + 1}` : seguro
}
