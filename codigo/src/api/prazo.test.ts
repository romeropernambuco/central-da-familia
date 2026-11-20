import { afterEach, expect, it, vi } from 'vitest'
import { traduzErro } from './erros'
import { buscarComPrazo, PRAZO_DE_FUNCAO_MS, PRAZO_PADRAO_MS, prazoPara } from './prazo'

afterEach(() => vi.useRealTimers())

/** Um servidor que nunca responde, mas obedece ao cancelamento, como o `fetch` de verdade. */
const redePresa: typeof fetch = (_entrada, opcoes) =>
  new Promise((_, rejeitar) => {
    opcoes?.signal?.addEventListener('abort', () => rejeitar(new DOMException('cancelado', 'AbortError')))
  })

it('rede presa: desiste depois do prazo e o app trata como falha de rede', async () => {
  vi.useFakeTimers()
  const pedido = buscarComPrazo(redePresa)('https://banco.exemplo/rest/v1/lancamentos')
  const falha = pedido.catch(e => e)
  await vi.advanceTimersByTimeAsync(PRAZO_PADRAO_MS - 1)
  expect(vi.getTimerCount()).toBe(1)
  await vi.advanceTimersByTimeAsync(1)
  const erro = await falha
  expect(erro).toBeInstanceOf(TypeError)
  expect(traduzErro(erro).name).toBe('ErroRede')
})

it('resposta que chega a tempo passa direto e não deixa relógio ligado', async () => {
  vi.useFakeTimers()
  const resposta = new Response('ok')
  const buscar = vi.fn<typeof fetch>(async () => resposta)
  expect(await buscarComPrazo(buscar)('https://banco.exemplo/rest/v1/cartoes', { method: 'GET' })).toBe(resposta)
  expect(buscar.mock.calls[0][1]).toMatchObject({ method: 'GET' })
  expect(vi.getTimerCount()).toBe(0)
})

it('quem chamou cancela (a tela fechou): o cancelamento passa adiante e não vira falha de rede', async () => {
  const controle = new AbortController()
  const pedido = buscarComPrazo(redePresa)('https://banco.exemplo/rest/v1/cartoes', { signal: controle.signal })
  controle.abort()
  await expect(pedido).rejects.toMatchObject({ name: 'AbortError' })
})

it('erro que não é de prazo sai como veio', async () => {
  const quebra = new Error('resposta inválida')
  await expect(buscarComPrazo(async () => Promise.reject(quebra))('https://banco.exemplo/x')).rejects.toBe(quebra)
})

it('leitura de foto pelo servidor tem prazo maior que uma leitura comum', () => {
  expect(prazoPara('https://banco.exemplo/functions/v1/ia-ler-cupom')).toBe(PRAZO_DE_FUNCAO_MS)
  expect(prazoPara('https://banco.exemplo/rest/v1/lancamentos')).toBe(PRAZO_PADRAO_MS)
  expect(PRAZO_DE_FUNCAO_MS).toBeGreaterThan(PRAZO_PADRAO_MS)
})
