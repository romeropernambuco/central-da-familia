import { describe, expect, it } from 'vitest'
import { AFASTAMENTO, desviar } from './desvio'
import { avancarRotina, iniciarRotina } from './rotina'
import { EQUIPE_DA_SALA } from './sala'

const pessoa = (id: string, x: number, z: number, path: { x: number; z: number }[] | null = null) => ({
  id,
  path,
  b: { r: { position: { x, z } } },
})
const distancia = (a: any, b: any) =>
  Math.hypot(a.b.r.position.x - b.b.r.position.x, a.b.r.position.z - b.b.r.position.z)

describe('desvio entre os funcionários da sala', () => {
  it('quem está parado não é empurrado; quem anda abre caminho', () => {
    const parado = pessoa('p', 0, 0)
    const andando = pessoa('a', 0.2, 0, [{ x: -2, z: 0 }])
    for (let i = 0; i < 40; i++) desviar([parado, andando], 0.05)
    expect(parado.b.r.position).toEqual({ x: 0, z: 0 })
    expect(distancia(parado, andando)).toBeGreaterThanOrEqual(AFASTAMENTO - 1e-6)
  })

  it('dois parados não se mexem, mesmo perto', () => {
    const a = pessoa('a', 0, 0),
      b = pessoa('b', 0.1, 0)
    desviar([a, b], 0.05)
    expect(a.b.r.position).toEqual({ x: 0, z: 0 })
    expect(b.b.r.position).toEqual({ x: 0.1, z: 0 })
  })

  it('de frente um para o outro, os dois passam pelo lado e não ficam travados', () => {
    const a = pessoa('a', -1, 0, [{ x: 1, z: 0 }]),
      b = pessoa('b', 1, 0, [{ x: -1, z: 0 }])
    let minima = 9
    for (let i = 0; i < 160; i++) {
      for (const p of [a, b]) {
        const alvo = p.path![0],
          { x, z } = p.b.r.position,
          d = Math.hypot(alvo.x - x, alvo.z - z),
          passo = Math.min(d, 1.25 * 0.05)
        p.b.r.position.x += ((alvo.x - x) / (d || 1)) * passo
        p.b.r.position.z += ((alvo.z - z) / (d || 1)) * passo
      }
      desviar([a, b], 0.05)
      minima = Math.min(minima, distancia(a, b))
    }
    expect(minima).toBeGreaterThan(AFASTAMENTO * 0.8)
    expect(a.b.r.position.x).toBeGreaterThan(0.8)
    expect(b.b.r.position.x).toBeLessThan(-0.8)
  })

  it('na rotina de verdade, ninguém atravessa ninguém e todos continuam cumprindo a rota', () => {
    const junta = () => ({ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } })
    const equipe: any[] = EQUIPE_DA_SALA.map(({ rotina }, i) => {
      const ch: any = {
        id: rotina.id,
        b: {
          r: junta(),
          hips: junta(),
          head: junta(),
          bL: { o: junta(), e: junta() },
          bR: { o: junta(), e: junta() },
          pL: { o: junta(), k: junta() },
          pR: { o: junta(), k: junta() },
        },
      }
      iniciarRotina(ch, rotina, i)
      return ch
    })
    const voltas = new Map(equipe.map(c => [c.id, 0]))
    let minima = 9
    for (let t = 0; t < 300; t += 0.05) {
      equipe.forEach(c => {
        const antes = c.etapa
        avancarRotina(c, t, 0.05, false)
        if (antes === 'volta' && c.etapa === 'posto') voltas.set(c.id, (voltas.get(c.id) ?? 0) + 1)
      })
      desviar(equipe, 0.05)
      for (let i = 0; i < equipe.length; i++)
        for (let j = i + 1; j < equipe.length; j++) minima = Math.min(minima, distancia(equipe[i], equipe[j]))
    }
    expect(minima).toBeGreaterThan(0.45)
    for (const n of voltas.values()) expect(n).toBeGreaterThanOrEqual(5)
  })

  it('não empurra ninguém para fora da sala', () => {
    const encostado = pessoa('p', 3.3, 0)
    const andando = pessoa('a', 3.2, 0, [{ x: 0, z: 0 }])
    for (let i = 0; i < 20; i++) desviar([encostado, andando], 0.05)
    expect(andando.b.r.position.x).toBeLessThanOrEqual(3.3 + 1e-9)
  })
})
