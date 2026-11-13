// C6 (revisão E0): nunca tela branca. Pedaço que não baixou ou banco sem endereço viram mensagem em português com "Tentar de novo".
import { describe, expect, it } from 'vitest'
import { ErroConfig, mostrarFalha, textoDaFalha, type RaizFalha } from './falha'
import { carregarApi } from './api'

function raizFalsa() {
  let clique: (() => void) | null = null
  const raiz: RaizFalha & { clicar(): void } = {
    innerHTML: '',
    querySelector: s => (s === '[data-falha="tentar"]' && raiz.innerHTML.includes('data-falha="tentar"') ? { addEventListener: (_t, f) => { clique = f } } : null),
    clicar: () => clique?.(),
  }
  return raiz
}

describe('C6: tela de falha em vez de tela branca', () => {
  it('pedaço do app que não baixou: mensagem de internet e botão Tentar de novo que recarrega', () => {
    const raiz = raizFalsa(); let recarregou = 0
    const f = mostrarFalha(raiz, new TypeError('Failed to fetch dynamically imported module: https://x/assets/partida-abc.js'), () => { recarregou++ })
    expect(f.titulo).toBe('Não deu pra abrir a Central agora')
    expect(raiz.innerHTML).toContain('Confira a internet')
    expect(raiz.innerHTML).toContain('>Tentar de novo</button>')
    expect(raiz.innerHTML).toContain('role="alert"')
    raiz.clicar(); expect(recarregou).toBe(1)
  })
  it('banco sem endereço: carregarApi falha com ErroConfig e a tela explica, sem inglês nem detalhe técnico', async () => {
    // no Vitest não existe .env: é o mesmo caso do build publicado sem VITE_SUPABASE_URL
    const e = await carregarApi().then(() => null, x => x)
    expect(e).toBeInstanceOf(ErroConfig)
    const raiz = raizFalsa()
    mostrarFalha(raiz, e, () => {})
    expect(raiz.innerHTML).toContain('O app está sem o endereço do banco')
    expect(raiz.innerHTML).toContain('Tentar de novo')
    expect(raiz.innerHTML).not.toMatch(/VITE_|Supabase|undefined|Error|fetch/)
  })
  it('sem #root ainda devolve o texto e não quebra; texto sem travessão', () => {
    expect(mostrarFalha(null, new Error('x'), () => {}).titulo).toBe('Não deu pra abrir a Central agora')
    for (const f of [textoDaFalha(new ErroConfig()), textoDaFalha(new Error('x'))]) expect(f.titulo + f.texto).not.toMatch(/[–—]/)
  })
})
