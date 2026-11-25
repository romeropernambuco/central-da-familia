import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PerguntaEsc } from '../../api/tipos'
import { DocumentoTeste, NoTeste } from '../../telas/escritorio/numeros.dom-teste'
import type { Responder } from '../Pergunta'
import { FolhaResposta } from './FolhaResposta'

// O cartão e a folha de verdade têm os testes deles; aqui interessa o que a folha de resposta decide em volta.
vi.mock('../base', () => ({
  Sheet: ({ titulo, children }: { titulo: string; children: ReactNode }) =>
    createElement('section', { 'data-folha': titulo }, children),
}))
vi.mock('../Pergunta', () => ({
  PerguntaCard: ({
    p,
    responder,
    aoResponder,
    contextoRecolhido,
  }: {
    p: PerguntaEsc
    responder: Responder
    aoResponder: () => void
    contextoRecolhido?: boolean
  }) =>
    createElement(
      'div',
      { 'data-cartao': p.id, 'data-recolhido': String(!!contextoRecolhido) },
      p.pergunta,
      p.contexto,
      ...p.opcoes.map(o =>
        createElement(
          'button',
          {
            key: o.id,
            'data-opcao': o.id,
            onClick: () => void responder(p.id, o.id).then(r => r !== false && !/^copiar/.test(o.id) && aoResponder()),
          },
          o.rotulo,
        ),
      ),
    ),
}))

const tarefa = (id: string, valor?: number): PerguntaEsc => ({
  id,
  funcionario: 'cartao',
  valor,
  pergunta: `Você paga ${id}?`,
  contexto: `Motivo de ${id}`,
  opcoes: [
    { id: 'pagar', rotulo: 'Pagar agora' },
    { id: 'copiar_msg', rotulo: 'Copiar mensagem' },
  ],
})

function montar(inicio: PerguntaEsc[], extra: { oculto?: boolean; inicial?: string } = {}) {
  const doc = Object.assign(new DocumentoTeste(), { contains: () => false })
  vi.stubGlobal('document', doc)
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }),
  )
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let fila = inicio
  const el = doc.createElement('div')
  doc.body.appendChild(el)
  const root = createRoot(el as unknown as HTMLElement)
  const fechar = vi.fn(),
    verFicha = vi.fn()
  const desenhar = () =>
    act(async () =>
      root.render(
        createElement(FolhaResposta, {
          nome: 'Analista do Cartão',
          tarefas: fila,
          inicial: extra.inicial,
          emRisco: p => p.id === 'fatura',
          oculto: !!extra.oculto,
          responder,
          fechar,
          verFicha,
        }),
      ),
    )
  // responder tira a tarefa da fila antes de devolver, como o app faz ao reler o escritório
  const responder: Responder = async (id, opcao) => {
    if (!/^copiar/.test(opcao)) {
      fila = fila.filter(p => p.id !== id)
      await desenhar()
    }
    return true
  }
  const tocar = (attr: string, valor: string) =>
    act(async () => el.buscar(n => n.getAttribute(attr) === valor)[0].click())
  const botao = (texto: string) => el.buscar(n => n.tagName === 'BUTTON' && n.textContent.includes(texto))[0]
  return { el, fechar, verFicha, desenhar, tocar, botao, desmontar: () => act(async () => root.unmount()) }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('folha de resposta do Início novo', () => {
  it('mostra o valor, a tarefa e o contexto recolhido; responder a última diz "Pronto" e fecha sozinha', async () => {
    vi.useFakeTimers()
    const a = montar([tarefa('anuidade', 480)])
    await a.desenhar()
    expect(a.el.textContent).toContain('480')
    expect(a.el.textContent).toContain('Você paga anuidade?')
    expect(a.el.textContent).not.toContain('Tarefa 1 de')
    expect(a.el.buscar(n => n.getAttribute('data-recolhido') === 'true')).toHaveLength(1)
    await a.tocar('data-opcao', 'pagar')
    expect(a.el.buscar(n => n.getAttribute('role') === 'status')[0].textContent).toContain('Pronto, anotado.')
    expect(a.el.textContent).not.toContain('Você paga anuidade?')
    expect(a.fechar).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(2000))
    expect(a.fechar).toHaveBeenCalledOnce()
    await a.desmontar()
  })

  it('com duas tarefas avisa "1 de 2" e emenda a próxima sem fechar', async () => {
    vi.useFakeTimers()
    const a = montar([tarefa('fatura', 900), tarefa('anuidade', 480)])
    await a.desenhar()
    expect(a.el.textContent).toContain('Tarefa 1 de 2')
    expect(a.el.textContent).toContain('Dinheiro em risco')
    await a.tocar('data-opcao', 'pagar')
    expect(a.el.textContent).toContain('Pronto, anotado.')
    await act(async () => vi.advanceTimersByTime(5000))
    expect(a.fechar).not.toHaveBeenCalled()
    await act(async () => a.botao('Próxima tarefa').click())
    expect(a.el.textContent).toContain('Tarefa 2 de 2')
    expect(a.el.textContent).toContain('Você paga anuidade?')
    expect(a.el.textContent).not.toContain('Dinheiro em risco')
    await a.desmontar()
  })

  it('abre na tarefa escolhida na fila e a ficha completa continua a um toque', async () => {
    const a = montar([tarefa('fatura', 900), tarefa('anuidade', 480)], { inicial: 'anuidade' })
    await a.desenhar()
    expect(a.el.textContent).toContain('Você paga anuidade?')
    await act(async () => a.botao('Ver a ficha completa').click())
    expect(a.verFicha).toHaveBeenCalledOnce()
    await a.desmontar()
  })

  it('copiar a mensagem não encerra a tarefa', async () => {
    const a = montar([tarefa('anuidade', 480)])
    await a.desenhar()
    await a.tocar('data-opcao', 'copiar_msg')
    expect(a.el.textContent).toContain('Você paga anuidade?')
    expect(a.el.textContent).not.toContain('Pronto, anotado.')
    await a.desmontar()
  })

  it('com o olho fechado não mostra valor, pergunta, motivo nem o selo de risco', async () => {
    const a = montar([tarefa('fatura', 900), tarefa('anuidade', 480)], { oculto: true })
    await a.desenhar()
    expect(a.el.textContent).toContain('Tarefa pendente')
    for (const segredo of ['900', 'Você paga', 'Motivo de', 'Dinheiro em risco'])
      expect(a.el.textContent).not.toContain(segredo)
    await a.desmontar()
  })
})
