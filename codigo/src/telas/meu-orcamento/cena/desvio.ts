/* eslint-disable @typescript-eslint/no-explicit-any */
// Ninguém atravessa ninguém: quem está andando abre caminho de quem está no caminho, como gente faz num corredor.
// Só afasta o corpo; o trajeto da rotina continua o mesmo e puxa a pessoa de volta assim que a passagem fica livre.
import { SALA } from './sala'

/** A distância de conforto entre dois funcionários, em metros (do centro de um ao centro do outro). */
export const AFASTAMENTO = 0.62
/** O quanto alguém pode ser empurrado por segundo, em metros. Menos que andar, para o desvio parecer natural. */
const EMPURRAO_POR_SEGUNDO = 1.7

/** Quanto do empurrão vai para o lado (em relação ao que vai para trás): o suficiente para vencer o trajeto que puxa de volta. */
const LATERAL = 1.8

const anda = (ch: any) => !!ch.path
/**
 * Para que lado deslizar em volta do outro: o que segue na direção em que a pessoa está indo, para contornar e seguir
 * em frente (e não voltar). (ox, oz) aponta do outro para ela.
 */
function tangente(ch: any, ox: number, oz: number) {
  const alvo = ch.path?.[0]
  let tx = -oz,
    tz = ox
  if (alvo && tx * (alvo.x - ch.b.r.position.x) + tz * (alvo.z - ch.b.r.position.z) < 0) {
    tx = -tx
    tz = -tz
  }
  return { tx, tz }
}

function empurrar(ch: any, dx: number, dz: number) {
  const p = ch.b.r.position
  p.x = Math.max(-SALA.x + 0.3, Math.min(SALA.x - 0.3, p.x + dx))
  p.z = Math.max(-SALA.z + 0.25, Math.min(SALA.z - 0.25, p.z + dz))
}

/** Afasta um do outro quem está perto demais, deslocando só quem anda (os dois, se ambos andam). */
export function desviar(chars: any[], dt: number) {
  const maximo = EMPURRAO_POR_SEGUNDO * dt
  for (let i = 0; i < chars.length; i++)
    for (let j = i + 1; j < chars.length; j++) {
      const a = chars[i],
        b = chars[j]
      if (!anda(a) && !anda(b)) continue
      const dx = a.b.r.position.x - b.b.r.position.x,
        dz = a.b.r.position.z - b.b.r.position.z,
        d = Math.hypot(dx, dz)
      if (d >= AFASTAMENTO) continue
      // de frente um para o outro (d = 0) não há direção: escolhe uma qualquer
      const ux = d > 1e-6 ? dx / d : 1,
        uz = d > 1e-6 ? dz / d : 0,
        passo = Math.min(AFASTAMENTO - d, maximo)
      // empurra para fora e um pouco para o lado, para quem vem de frente passar pelo lado e não parar
      for (const [ch, sinal] of [
        [a, 1],
        [b, -1],
      ] as [any, number][]) {
        if (!anda(ch)) continue
        const ox = ux * sinal,
          oz = uz * sinal,
          { tx, tz } = tangente(ch, ox, oz)
        empurrar(ch, (ox + tx * LATERAL) * passo, (oz + tz * LATERAL) * passo)
      }
    }
}
