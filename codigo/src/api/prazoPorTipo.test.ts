import { expect, it } from 'vitest'
import { PRAZO_DE_FUNCAO_MS, PRAZO_LONGO_MS, PRAZO_PADRAO_MS, prazoPara } from './prazo'

const BANCO = 'https://banco.exemplo'

it('envio de arquivo e operações da família inteira têm folga para rede lenta de celular', () => {
  expect(prazoPara(`${BANCO}/storage/v1/object/notas/familia/nota.jpg`)).toBe(PRAZO_LONGO_MS)
  expect(prazoPara(`${BANCO}/rest/v1/rpc/exportar_familia`)).toBe(PRAZO_LONGO_MS)
  expect(prazoPara(`${BANCO}/rest/v1/rpc/exportar_meu`)).toBe(PRAZO_LONGO_MS)
  expect(prazoPara(`${BANCO}/rest/v1/rpc/apagar_familia`)).toBe(PRAZO_LONGO_MS)
})

it('leitura e gravação comuns continuam no prazo curto, para a tela não ficar presa', () => {
  expect(prazoPara(`${BANCO}/rest/v1/lancamentos?select=*`)).toBe(PRAZO_PADRAO_MS)
  expect(prazoPara(`${BANCO}/rest/v1/rpc/lancar_com_chave`)).toBe(PRAZO_PADRAO_MS)
  expect(prazoPara(`${BANCO}/auth/v1/token?grant_type=refresh_token`)).toBe(PRAZO_PADRAO_MS)
})

it('os três prazos estão em ordem: comum, leitura de foto, envio de arquivo', () => {
  expect(PRAZO_PADRAO_MS).toBeLessThan(PRAZO_DE_FUNCAO_MS)
  expect(PRAZO_DE_FUNCAO_MS).toBeLessThan(PRAZO_LONGO_MS)
  expect(prazoPara(`${BANCO}/functions/v1/ia-ler-cupom`)).toBe(PRAZO_DE_FUNCAO_MS)
})
