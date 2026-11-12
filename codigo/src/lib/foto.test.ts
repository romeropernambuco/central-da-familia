import { describe, expect, it } from 'vitest'
import { bytesBase64, dataDoCupom, medidaReduzida, mensagemCupom, MSG_CUPOM } from './foto'

describe('foto do cupom', () => {
  it('reduz o lado maior pra 1.200 px mantendo a proporção', () => {
    expect(medidaReduzida(3000, 4000)).toEqual({ w: 900, h: 1200 })
    expect(medidaReduzida(4032, 3024)).toEqual({ w: 1200, h: 900 })
    expect(medidaReduzida(800, 600)).toEqual({ w: 800, h: 600 })
  })
  it('conta os bytes do base64', () => { expect(bytesBase64('YWJj')).toBe(3); expect(bytesBase64('YWI=')).toBe(2) })
  it('data do cupom: fora do prazo ou no futuro vira hoje', () => {
    expect(dataDoCupom('2026-11-09', '2026-11-11')).toBe('2026-11-09')
    expect(dataDoCupom('2026-11-20', '2026-11-11')).toBe('2026-11-11')
    expect(dataDoCupom('2025-01-01', '2026-11-11')).toBe('2026-11-11')
    expect(dataDoCupom(null, '2026-11-11')).toBe('2026-11-11')
  })
  it('erros honestos: limite, chave e o resto com a frase do servidor', () => {
    expect(mensagemCupom(429, 'limite do mês')).toBe(MSG_CUPOM.limite)
    expect(mensagemCupom(503, 'o dono precisa colocar a chave da IA')).toBe(MSG_CUPOM.chave)
    expect(mensagemCupom(503, 'Sem conexão com a IA agora. Tente de novo em 1 minuto.')).toMatch(/Sem conexão/)
  })
})
