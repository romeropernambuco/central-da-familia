import type { Roupa } from './equipe'
import type * as Tres from './tres'

export type CaixaIsometrica = (pai: any, cor: number, dimensoes: number[], posicao: number[]) => any

/** Rig e proporções do boneco procedural do painel original. A frente aponta para +Z. */
export function personagemIsometrico(T: typeof Tres, caixa: CaixaIsometrica, roupa: Roupa) {
  const raiz = new T.Group()
  const grupo = (pai: any, x = 0, y = 0) => {
    const g = new T.Group()
    g.position.set(x, y, 0)
    pai.add(g)
    return g
  }
  const quadril = grupo(raiz)
  const cabeca = grupo(quadril, 0, .5)
  const { camisa, calca, pele, cabelo, estilo, oculos } = roupa
  caixa(quadril, camisa, [.46, .5, .26], [0, .25, 0])
  caixa(quadril, 0xF4EFE6, [.2, .05, .27], [0, .49, .005])
  caixa(cabeca, pele, [.14, .08, .14], [0, .03, 0])
  caixa(cabeca, pele, [.44, .4, .4], [0, .26, 0])
  for (const x of [-.1, .1]) {
    caixa(cabeca, 0xF7F3EC, [.08, .06, .02], [x, .25, .204])
    caixa(cabeca, 0x2A211B, [.04, .05, .02], [x, .248, .212])
    caixa(cabeca, cabelo, [.1, .025, .02], [x, .335, .205])
    if (oculos) {
      for (const y of [.315, .185]) caixa(cabeca, 0x1E1E22, [.17, .02, .02], [x, y, .225])
      for (const lado of [-.075, .075]) caixa(cabeca, 0x1E1E22, [.02, .15, .02], [x + lado, .25, .225])
    }
  }
  caixa(cabeca, pele, [.06, .07, .05], [0, .2, .22])
  caixa(cabeca, 0x9A5A4C, [.12, .025, .02], [0, .12, .205])
  caixa(cabeca, cabelo, [.48, .13, .44], [0, .49, 0])
  caixa(cabeca, cabelo, [.48, .26, .1], [0, .36, -.19])
  caixa(cabeca, cabelo, [.48, .07, .08], [0, .43, .19])
  if (estilo === 'longo') {
    caixa(cabeca, cabelo, [.5, .5, .1], [0, .18, -.2])
    for (const x of [-.245, .245]) caixa(cabeca, cabelo, [.07, .42, .3], [x, .22, -.05])
  }
  if (estilo === 'coque') caixa(cabeca, cabelo, [.2, .18, .2], [0, .63, -.08])
  const braco = (x: number) => {
    const ombro = grupo(quadril, x, .44)
    const cotovelo = grupo(ombro, 0, -.24)
    caixa(ombro, camisa, [.13, .24, .14], [0, -.12, 0])
    caixa(cotovelo, pele, [.115, .2, .125], [0, -.1, 0])
    caixa(cotovelo, pele, [.125, .09, .135], [0, -.24, 0])
    return { ombro, cotovelo }
  }
  const perna = (x: number) => {
    const coxa = grupo(quadril, x)
    const joelho = grupo(coxa, 0, -.26)
    caixa(coxa, calca, [.18, .26, .2], [0, -.13, 0])
    caixa(joelho, calca, [.165, .22, .185], [0, -.11, 0])
    caixa(joelho, 0x2A2623, [.175, .07, .27], [0, -.255, .035])
    return { coxa, joelho }
  }
  return { raiz, quadril, cabeca, esquerda: braco(-.3), direita: braco(.3), pernas: [perna(-.12), perna(.12)] }
}
