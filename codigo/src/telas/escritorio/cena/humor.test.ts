import { describe, expect, it } from 'vitest'
import { expressar, humorDe } from './humor'

const HUMORES = ['calmo', 'focado', 'feliz', 'preocupado', 'aflito'] as const
const funcionario = (st: string, extra: object = {}) => ({
  st,
  fase: 0,
  anim: true,
  festa: 0,
  path: null,
  b: {
    olhos: { visible: true, scale: { y: 1 } },
    rostos: Object.fromEntries(HUMORES.map(h => [h, { visible: false }])),
  },
  ...extra,
})
const aVista = (ch: ReturnType<typeof funcionario>) => HUMORES.filter(h => ch.b.rostos[h].visible)

describe('semblante dos funcionários', () => {
  it('cada estado tem a sua emoção', () => {
    expect(humorDe(funcionario('fila'))).toBe('calmo')
    expect(humorDe(funcionario('trabalhando'))).toBe('focado')
    expect(humorDe(funcionario('entregue'))).toBe('feliz')
    expect(humorDe(funcionario('precisa'))).toBe('preocupado')
  })

  it('conta vencida deixa aflito; comemorar e voltar para a mesa com a tarefa resolvida deixam feliz', () => {
    expect(humorDe(funcionario('precisa', { humor: 'aflito' }))).toBe('aflito')
    expect(humorDe(funcionario('precisa', { humor: 'aflito', festa: 1 }))).toBe('feliz')
    expect(humorDe(funcionario('trabalhando', { path: [{}] }))).toBe('feliz')
    expect(humorDe(funcionario('precisa', { path: [{}] }))).toBe('preocupado')
  })

  it('só um rosto aparece por vez; o feliz troca os olhos abertos pelos dele, em arco', () => {
    const ch = funcionario('precisa')
    expressar(ch, 0, false)
    expect(aVista(ch)).toEqual(['preocupado'])
    expect(ch.b.olhos.visible).toBe(true)
    expect(ch.b.olhos.scale.y).toBeGreaterThan(1)
    ch.st = 'entregue'
    expressar(ch, 0, false)
    expect(aVista(ch)).toEqual(['feliz'])
    expect(ch.b.olhos.visible).toBe(false)
  })

  it('pisca de vez em quando, mas nunca com movimento reduzido', () => {
    const instante = Math.PI / 2 / 1.07
    const ch = funcionario('fila')
    expressar(ch, instante, false)
    expect(ch.b.olhos.scale.y).toBeLessThan(0.5)
    expressar(ch, instante, true)
    expect(ch.b.olhos.scale.y).toBe(1)
  })

  it('o boneco do mini, que não tem rostos, fica como está', () => {
    const ch = { st: 'fila', b: { olhos: { scale: { y: 1 } } } }
    expect(() => expressar(ch, 0, false)).not.toThrow()
  })
})
