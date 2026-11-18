import type { MembroEquipe } from './equipe'
import type * as Tres from './tres'

export type PecaIsometrica = (pai: any, cor: number, dimensoes: number[], posicao: number[]) => any

const TINTA = 0x322D29
const LINHO = 0xE8DEC9

const acessorios: Partial<Record<string, 'gravata' | 'fone' | 'cracha' | 'bolso'>> = {
  contador: 'gravata', tesoureiro: 'gravata', analista: 'gravata',
  secretaria: 'fone', assistente: 'fone', cartao: 'fone',
  guardado: 'cracha', presenca: 'cracha', usina: 'cracha', protetora: 'cracha',
  fiscal: 'bolso', auditor: 'bolso', imoveis: 'bolso',
}

/** Peças de poucas faces mantêm a silhueta arredondada mesmo com o escritório inteiro aberto. */
export function personagemIsometrico(T: typeof Tres, caixa: PecaIsometrica, oval: PecaIsometrica, membro: MembroEquipe) {
  const raiz = new T.Group()
  const grupo = (pai: any, x = 0, y = 0) => {
    const g = new T.Group()
    g.position.set(x, y, 0)
    pai.add(g)
    return g
  }
  const quadril = grupo(raiz)
  const tronco = grupo(quadril)
  const cabeca = grupo(tronco, 0, .49)
  const { camisa, calca, pele, cabelo, estilo, oculos } = membro.roupa
  const acessorio = acessorios[membro.id]
  oval(tronco, camisa, [.52, .51, .34], [0, .26, 0])
  oval(tronco, pele, [.17, .17, .17], [0, .49, 0])
  caixa(tronco, LINHO, [.22, .045, .24], [0, .47, .02])
  if (acessorio === 'gravata') {
    caixa(tronco, TINTA, [.045, .066, .025], [0, .421, .151]).rotation.z = Math.PI / 4
    caixa(tronco, TINTA, [.052, .16, .026], [0, .32, .17])
  }
  if (acessorio === 'cracha' || acessorio === 'bolso') {
    caixa(tronco, LINHO, [.083, .059, .018], [.134, .33, .156]).rotation.z = -.11
    caixa(tronco, 0x666E58, [.045, .012, .02], [.132, .33, .169])
  }

  oval(cabeca, pele, [.53, .49, .45], [0, .25, .025])
  oval(cabeca, cabelo, [.55, .29, .47], [0, .423, -.018])
  oval(cabeca, cabelo, [.51, estilo === 'longo' ? .47 : .37, .24], [0, estilo === 'longo' ? .19 : .31, -.136])
  if (estilo === 'coque') {
    oval(cabeca, cabelo, [.23, .22, .22], [.035, .556, -.094])
  } else if (estilo === 'longo') {
    for (const x of [-.219, .219]) {
      oval(cabeca, cabelo, [.147, .43, .24], [x, .196, -.061]).rotation.z = -x * .7
    }
  } else {
    const risca = membro.mesa < 0 ? -1 : 1
    oval(cabeca, cabelo, [.38, .147, .18], [.049 * risca, .405, .14]).rotation.z = risca * .23
  }

  for (const x of [-.108, .108]) {
    const lado = Math.sign(x)
    oval(cabeca, pele, [.092, .111, .087], [lado * .248, .242, .014])
    caixa(cabeca, TINTA, [.045, .057, .021], [x, .272, .229])
    caixa(cabeca, LINHO, [.012, .014, .007], [x + .009, .287, .241])
    caixa(cabeca, cabelo, [.073, .015, .013], [x, .329, .225]).rotation.z = lado * -.12
    if (oculos) {
      for (const y of [.322, .225]) caixa(cabeca, TINTA, [.153, .016, .023], [x, y, .249])
      for (const canto of [-.069, .069]) caixa(cabeca, TINTA, [.017, .101, .023], [x + canto, .273, .249])
    }
    if (acessorio === 'fone') oval(cabeca, TINTA, [.092, .18, .14], [lado * .263, .245, .019])
  }
  if (oculos) caixa(cabeca, TINTA, [.07, .015, .023], [0, .28, .25])
  if (acessorio === 'fone') caixa(cabeca, TINTA, [.028, .026, .175], [.23, .191, .106]).rotation.y = -.57
  oval(cabeca, pele, [.079, .066, .074], [0, .229, .237])
  for (const lado of [-1, 1]) {
    caixa(cabeca, 0x723F36, [.047, .017, .015], [lado * .02, .161, .224]).rotation.z = lado * .25
  }

  const braco = (x: number) => {
    const ombro = grupo(tronco, x, .408)
    const cotovelo = grupo(ombro, 0, -.23)
    oval(ombro, camisa, [.176, .323, .19], [0, -.093, 0])
    oval(cotovelo, pele, [.115, .235, .131], [0, -.083, 0])
    oval(cotovelo, pele, [.137, .146, .142], [0, -.212, 0])
    return { ombro, cotovelo }
  }
  const perna = (x: number) => {
    const coxa = grupo(quadril, x)
    const joelho = grupo(coxa, 0, -.26)
    caixa(coxa, calca, [.182, .285, .197], [0, -.118, 0])
    caixa(joelho, calca, [.155, .225, .166], [0, -.095, 0])
    oval(joelho, TINTA, [.187, .103, .283], [0, -.246, .045])
    return { coxa, joelho }
  }
  return { raiz, quadril, tronco, cabeca, esquerda: braco(-.22), direita: braco(.22), pernas: [perna(-.112), perna(.112)] }
}
