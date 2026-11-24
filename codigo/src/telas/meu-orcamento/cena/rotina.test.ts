import { describe, expect, it } from 'vitest'
import { avancarRotina, iniciarRotina, TEMPO_ACENO, type Rotina } from './rotina'
import { EQUIPE_DA_SALA, SALA } from './sala'

// Boneco de mentira: só as juntas que o motor mexe. Dá para testar a rotina sem desenhar nada.
const junta = () => ({ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } })
function funcionario(id: string) {
  const indice = EQUIPE_DA_SALA.findIndex(e => e.rotina.id === id)
  const ch: any = {
    id,
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
  iniciarRotina(ch, EQUIPE_DA_SALA[indice].rotina, indice)
  return ch
}
const DT = 0.05
const longe = (ch: any, p: { x: number; z: number }) => Math.hypot(ch.b.r.position.x - p.x, ch.b.r.position.z - p.z)
/** Roda a rotina por `segundos` e devolve as etapas por onde passou, na ordem. */
function rodar(ch: any, segundos: number, aCadaQuadro?: (t: number) => void) {
  const etapas: string[] = [ch.etapa]
  for (let t = 0; t < segundos; t += DT) {
    avancarRotina(ch, t, DT, false)
    if (etapas[etapas.length - 1] !== ch.etapa) etapas.push(ch.etapa)
    aCadaQuadro?.(t)
  }
  return etapas
}

describe('rotina da sala do Meu orçamento', () => {
  it('tem um funcionário por estação do palco, todos dentro da sala', () => {
    expect(EQUIPE_DA_SALA.map(e => e.rotina.id)).toEqual(['assistente', 'analista', 'tesoureira', 'comprador'])
    for (const { rotina } of EQUIPE_DA_SALA)
      for (const p of [rotina.posto, rotina.visita, rotina.frente, ...rotina.saida]) {
        expect(Math.abs(p.x), rotina.id).toBeLessThan(SALA.x - 0.3)
        expect(Math.abs(p.z), rotina.id).toBeLessThan(SALA.z - 0.25)
      }
  })

  it.each(EQUIPE_DA_SALA.map(e => e.rotina))('$id trabalha no posto, vai até o outro ponto e volta', (r: Rotina) => {
    const ch = funcionario(r.id)
    expect(longe(ch, r.posto)).toBe(0)
    let chegouNaVisita = false
    const etapas = rodar(ch, 60, () => {
      if (ch.etapa === 'visita' && longe(ch, r.visita) < 0.001) chegouNaVisita = true
    })
    expect(chegouNaVisita).toBe(true)
    expect(etapas.slice(0, 5)).toEqual(['posto', 'ida', 'visita', 'volta', 'posto'])
  })

  it('anda em velocidade de gente: nunca mais de 1,25 metro por segundo', () => {
    const ch = funcionario('comprador')
    let antes = { ...ch.b.r.position }
    rodar(ch, 30, () => {
      const passo = Math.hypot(ch.b.r.position.x - antes.x, ch.b.r.position.z - antes.z)
      expect(passo).toBeLessThanOrEqual(1.25 * DT + 1e-9)
      antes = { ...ch.b.r.position }
    })
  })

  it('quem trabalha sentado fica na altura da cadeira; quem anda fica de pé', () => {
    const ch = funcionario('assistente')
    avancarRotina(ch, 0, DT, false)
    expect(ch.b.hips.position.y).toBeCloseTo(0.325, 2)
    rodar(ch, 60, () => {
      if (ch.etapa === 'visita' && ch.relogio < 1) expect(ch.b.hips.position.y).toBeGreaterThan(0.5)
    })
  })

  it('o comprador leva a caixa na ida e deixa lá; na saída seguinte a caixa entregue some', () => {
    const ch = funcionario('comprador')
    const visto = { levando: false, entregue: false, voltouSemCaixa: false }
    rodar(ch, 25, () => {
      if (ch.etapa === 'ida' && ch.levando) visto.levando = true
      if (ch.etapa === 'volta' && ch.entregue && !ch.levando) visto.voltouSemCaixa = true
      if (ch.entregue) visto.entregue = true
    })
    expect(visto).toEqual({ levando: true, entregue: true, voltouSemCaixa: true })
  })

  it('chamado no posto: dá um passo à frente, acena e volta ao posto', () => {
    const ch = funcionario('tesoureira')
    ch.pedido = true
    let acenou = false
    const etapas = rodar(ch, 8, () => {
      if (ch.etapa === 'acenando') {
        expect(longe(ch, ch.rotina.frente)).toBeLessThan(0.001)
        if (ch.b.bR.o.rotation.z > 2) acenou = true // braço direito levantado
      }
    })
    expect(acenou).toBe(true)
    expect(etapas.slice(0, 4)).toEqual(['posto', 'frente', 'acenando', 'retorno'])
    expect(ch.etapa).toBe('posto')
    expect(longe(ch, ch.rotina.posto)).toBeLessThan(0.001)
  })

  it('chamado no meio do caminho: acena onde está e depois termina a rota', () => {
    const ch = funcionario('comprador')
    rodar(ch, 60, () => {
      if (ch.etapa === 'ida' && !ch.jaChamei && longe(ch, ch.rotina.posto) > 0.8) {
        ch.jaChamei = true
        ch.pedido = true
        ch.onde = { ...ch.b.r.position }
      }
      if (ch.etapa === 'acenando' && ch.onde) expect(longe(ch, ch.onde)).toBeLessThan(0.1)
    })
    expect(ch.jaChamei).toBe(true)
    expect(ch.antes).toBeNull()
    expect(TEMPO_ACENO).toBeGreaterThan(1)
  })

  it('com "reduzir movimento" ninguém sai do posto, mesmo chamado', () => {
    for (const { rotina } of EQUIPE_DA_SALA) {
      const ch = funcionario(rotina.id)
      ch.pedido = true
      for (let t = 0; t < 40; t += DT) avancarRotina(ch, t, DT, true)
      expect(longe(ch, rotina.posto)).toBe(0)
      expect(ch.etapa).toBe('posto')
    }
  })
})
