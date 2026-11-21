/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OpcoesCena } from '../../../lib/escritorio/cenaBase'

/**
 * Liga o toque na cena: um toque curto (sem arrastar) num boneco avisa quem montou a cena.
 * No mini também acompanha o ponteiro, para o funcionário olhar na direção dele.
 * Devolve onde o ponteiro está (de -1 a 1 em cada eixo).
 */
export function ligarToque(
  T: any,
  tela3d: HTMLCanvasElement,
  cam: any,
  chars: any[],
  o: Pick<OpcoesCena, 'mini' | 'aoTocar'>,
  limpezas: (() => void)[],
  semMovimento: () => boolean,
) {
  const ray = new T.Raycaster(),
    ndc = new T.Vector2()
  const ponteiro = { x: 0, y: 0, dentro: false }
  const acompanhar = (ev: PointerEvent) => {
    if (!o.mini || semMovimento()) return
    const r = tela3d.getBoundingClientRect()
    ponteiro.x = Math.max(-1, Math.min(1, ((ev.clientX - r.left) / r.width) * 2 - 1))
    ponteiro.y = Math.max(-1, Math.min(1, ((ev.clientY - r.top) / r.height) * 2 - 1))
    ponteiro.dentro = true
  }
  const saiu = () => {
    ponteiro.dentro = false
  }
  if (o.mini) {
    tela3d.addEventListener('pointermove', acompanhar)
    tela3d.addEventListener('pointerleave', saiu)
    limpezas.push(() => {
      tela3d.removeEventListener('pointermove', acompanhar)
      tela3d.removeEventListener('pointerleave', saiu)
    })
  }
  let down: { x: number; y: number } | null = null
  const aoDescer = (ev: PointerEvent) => {
    down = { x: ev.clientX, y: ev.clientY }
  }
  const aoSubir = (ev: PointerEvent) => {
    if (!down || Math.abs(ev.clientX - down.x) + Math.abs(ev.clientY - down.y) > 10) return
    const r = tela3d.getBoundingClientRect()
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, cam)
    const hit = ray.intersectObjects(
      chars.map(c => c.b.r),
      true,
    )
    if (hit.length) o.aoTocar(hit[0].object.userData.id)
  }
  tela3d.addEventListener('pointerdown', aoDescer)
  tela3d.addEventListener('pointerup', aoSubir)
  limpezas.push(() => {
    tela3d.removeEventListener('pointerdown', aoDescer)
    tela3d.removeEventListener('pointerup', aoSubir)
  })
  return ponteiro
}
