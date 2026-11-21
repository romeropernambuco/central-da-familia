/* eslint-disable @typescript-eslint/no-explicit-any */
// Sol, céu e lâmpadas. O sol anda pela hora de Recife; à noite as luminárias das salas acendem.

/** Cria o céu e o sol (com sombra) e põe na cena. A sombra é mais leve no celular. */
export function criarLuzes(T: any, scene: any, limpezas: (() => void)[], celular: boolean) {
  /* B2 (pacote 4): céu mais fraco e sol mais forte, pra sombra aparecer; recorte da sombra mais justo (mais nítida) */
  const hemi = new T.HemisphereLight(0xfff8ee, 0xbfae92, 0.85)
  scene.add(hemi)
  const sol = new T.DirectionalLight(0xfff2dd, 3.0)
  sol.castShadow = true
  limpezas.push(() => sol.shadow.dispose())
  sol.shadow.mapSize.set(celular ? 1024 : 2048, celular ? 1024 : 2048)
  const sc = sol.shadow.camera
  sc.left = -10
  sc.right = 10
  sc.top = 10
  sc.bottom = -10
  sc.near = 1
  sc.far = 60
  sol.shadow.bias = -0.0006
  sol.shadow.normalBias = 0.03
  scene.add(sol)
  scene.add(sol.target)
  return { hemi, sol }
}

interface Iluminados {
  sol: any
  hemi: any
  lampadas: { m: any; l: any }[]
  vidro: any
}

/** Ajusta sol, céu, lâmpadas e janelas para a hora `h` (0 a 24). No tema escuro tudo fica um pouco mais baixo. */
export function aplicarLuzDaHora(h: number, escuro: boolean, { sol, hemi, lampadas, vidro }: Iluminados) {
  const f = (h - 5.5) / 13,
    dia = f > 0 && f < 1,
    k = dia ? Math.sin(f * Math.PI) : 0,
    te = escuro ? 0.72 : 1
  const x = dia ? 2 + 8 * f : 5
  sol.position.set(x, 7 + 9 * k, dia ? 10 - 6 * f : 6)
  sol.target.position.set(0, 0, 2)
  const quente = dia ? Math.min(1, k * 2.2) : 0
  sol.color.setRGB(1, 0.8 + 0.16 * quente, 0.62 + 0.26 * quente)
  sol.intensity = (dia ? 1.0 + 2.0 * Math.min(1, k * 1.6) : 0.35) * te
  if (!dia) sol.color.setHex(0x9fb2d6)
  /* à noite a cena fica mais quente e mais baixa, mas nunca escura a ponto de não dar pra ler quem é quem */
  hemi.intensity = (dia ? 0.55 + 0.3 * Math.min(1, k * 1.6) : 0.6) * te
  const noite = dia ? Math.max(0, 1 - k * 4) : 1
  lampadas.forEach(L => {
    L.l.intensity = noite * 14
    L.m.emissiveIntensity = noite * 1.4
  })
  vidro.emissiveIntensity = dia ? 0.25 + 0.3 * k : 0.02
  vidro.color.setHex(dia ? 0xbfd8e6 : 0x2b3a4e)
}
