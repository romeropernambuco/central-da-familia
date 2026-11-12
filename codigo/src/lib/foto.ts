// Reduz a foto do cupom antes de mandar pra IA: lado maior até 1.200 px, JPEG, até 1,4 MB.
// A função ia-ler-cupom recusa acima de 1.200 px ou 1,5 MB.
import { hojeRecife, somaDias } from './formato'

export const LADO_MAX = 1200
const BYTES_MAX = 1.4 * 1024 * 1024

/** Tamanho final mantendo a proporção, com o lado maior no máximo `max`. */
export function medidaReduzida(w: number, h: number, max = LADO_MAX): { w: number; h: number } {
  const maior = Math.max(w, h)
  if (maior <= max) return { w: Math.round(w), h: Math.round(h) }
  const k = max / maior
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }
}

/** Bytes de um texto base64 (sem o prefixo data:). */
export const bytesBase64 = (b64: string) => Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0)

async function abrirImagem(arq: Blob): Promise<{ img: CanvasImageSource; w: number; h: number; soltar: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const b = await createImageBitmap(arq, { imageOrientation: 'from-image' } as ImageBitmapOptions)
      return { img: b, w: b.width, h: b.height, soltar: () => b.close() }
    } catch { /* cai pro <img> */ }
  }
  const url = URL.createObjectURL(arq)
  const img = new Image()
  await new Promise<void>((ok, falha) => { img.onload = () => ok(); img.onerror = () => falha(new Error('Não deu pra abrir essa foto. Tente outra.')); img.src = url })
  return { img, w: img.naturalWidth, h: img.naturalHeight, soltar: () => URL.revokeObjectURL(url) }
}

/** Devolve o JPEG reduzido em base64 (sem o prefixo data:). */
export async function reduzirFoto(arq: Blob): Promise<string> {
  const { img, w, h, soltar } = await abrirImagem(arq)
  try {
    const m = medidaReduzida(w, h)
    const c = document.createElement('canvas')
    c.width = m.w; c.height = m.h
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('Este aparelho não conseguiu preparar a foto.')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, m.w, m.h)
    ctx.drawImage(img, 0, 0, m.w, m.h)
    for (const q of [0.82, 0.7, 0.55, 0.4]) {
      const b64 = c.toDataURL('image/jpeg', q).split(',')[1] || ''
      if (b64 && bytesBase64(b64) <= BYTES_MAX) return b64
    }
    throw new Error('A foto ficou grande demais mesmo reduzida. Tire outra mais perto do cupom.')
  } finally { soltar() }
}

/** Data do cupom vale se for de hoje pra trás, até 60 dias. Senão, hoje. */
export function dataDoCupom(d: string | null, hoje = hojeRecife()): string {
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= hoje && d >= somaDias(hoje, -60) ? d : hoje
}

/** Erros da leitura de cupom em português simples (status da função ia-ler-cupom). */
export const MSG_CUPOM = {
  rede: 'Sem internet agora. Confira a conexão e tente de novo, ou lance digitando o valor.',
  limite: 'A família chegou no limite de leituras de cupom deste mês. Volta no dia 1. Até lá, lance digitando o valor.',
  chave: 'A leitura de cupom ainda não está ligada: o dono precisa colocar a chave da IA no Supabase.',
  ritmo: 'Muitas fotos em 1 minuto (o limite é 6). Espere 1 minuto e tente de novo.',
  geral: 'A leitura de cupom está pausada este mês pra todas as famílias. Até voltar, lance digitando o valor.',
  equipe: 'A leitura de cupom é só pro casal e pras pessoas da família. A equipe anota a compra digitando o valor.',
  grande: 'A foto ficou grande demais. Tire outra mais perto do cupom.',
}
/** Respostas da função ia-ler-cupom (versão 2): 6 por minuto, teto da família, teto geral, equipe sem IA. */
export function mensagemCupom(status: number, erro?: string): string {
  const e = erro || ''
  if (status === 401) return 'Sua sessão acabou. Entre de novo pra ler o cupom.'
  if (status === 403) return MSG_CUPOM.equipe
  if (status === 404) return 'A leitura de cupom não está publicada no servidor ainda.'
  if (status === 413) return MSG_CUPOM.grande
  if (e === 'o dono precisa colocar a chave da IA' || /chave da IA/i.test(e)) return MSG_CUPOM.chave
  if (status === 429) {
    if (/1 minuto|muitas fotos/i.test(e)) return MSG_CUPOM.ritmo
    if (/pausada/i.test(e)) return MSG_CUPOM.geral
    return MSG_CUPOM.limite
  }
  if (e === 'limite do mês') return MSG_CUPOM.limite
  return e || 'Não deu pra ler o cupom agora. Tente de novo ou lance digitando o valor.'
}
