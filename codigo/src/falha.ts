// C6 (revisão E0): o app nunca fica com a tela branca. Se um pedaço do app não baixar (internet caiu no 1º acesso,
// ou saiu versão nova e o pedaço velho sumiu) ou se faltar o endereço do banco, a tela diz o que houve em português
// e tem o botão "Tentar de novo". Sem React: tem que funcionar mesmo quando o React nem chegou a baixar.

/** Falta o endereço do banco ou a chave publicável no build (configuração de quem publica, não da família). */
export class ErroConfig extends Error {
  constructor() { super('Falta o endereço do banco neste app.'); this.name = 'ErroConfig' }
}

export interface Falha { titulo: string; texto: string }

export function textoDaFalha(e: unknown): Falha {
  if (e instanceof ErroConfig || (e as Error)?.name === 'ErroConfig')
    return { titulo: 'O app está sem o endereço do banco', texto: 'Isso é um ajuste de quem publica o app, não é nada no seu celular. Avise quem cuida da Central e tente de novo daqui a pouco.' }
  return { titulo: 'Não deu pra abrir a Central agora', texto: 'Parte do app não chegou ao seu celular. Confira a internet e toque em Tentar de novo.' }
}

/** O mínimo de elemento que a tela de falha usa (o #root de verdade, ou um falso no teste). */
export interface RaizFalha { innerHTML: string; querySelector(s: string): { addEventListener(t: 'click', f: () => void): void } | null }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/** Escreve a falha no #root com o botão "Tentar de novo" (recarrega a página). */
export function mostrarFalha(raiz: RaizFalha | null, e: unknown, recarregar: () => void = () => location.reload()): Falha {
  const f = textoDaFalha(e)
  try { console.error('Central da Família não abriu:', e) } catch { /* sem console */ }
  if (!raiz) return f
  raiz.innerHTML =
    '<main role="alert" style="max-width:420px;margin:0 auto;padding:48px 16px;font:16px/1.5 system-ui,-apple-system,sans-serif;color:inherit">' +
    `<h1 style="font-size:22px;line-height:1.25;margin:0 0 12px">${esc(f.titulo)}</h1>` +
    `<p style="margin:0 0 24px">${esc(f.texto)}</p>` +
    '<button type="button" data-falha="tentar" style="min-height:48px;width:100%;border-radius:12px;border:1px solid currentColor;background:transparent;color:inherit;font:inherit;font-weight:600;cursor:pointer">Tentar de novo</button>' +
    '</main>'
  raiz.querySelector('[data-falha="tentar"]')?.addEventListener('click', recarregar)
  return f
}
