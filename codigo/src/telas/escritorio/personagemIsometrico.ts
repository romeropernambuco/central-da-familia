import type { MembroEquipe } from './equipe'
import type * as Tres from './tres'

export type PecaIsometrica = (pai: any, cor: number, dimensoes: number[], posicao: number[]) => any

const TINTA = 0x322d29
const LINHO = 0xe8dec9

const acessorios: Partial<Record<string, 'gravata' | 'fone' | 'cracha' | 'bolso'>> = {
  contador: 'gravata',
  tesoureiro: 'gravata',
  analista: 'gravata',
  secretaria: 'fone',
  assistente: 'fone',
  cartao: 'fone',
  guardado: 'cracha',
  presenca: 'cracha',
  usina: 'cracha',
  protetora: 'cracha',
  fiscal: 'bolso',
  auditor: 'bolso',
  imoveis: 'bolso',
}

/** Peças de poucas faces mantêm a silhueta arredondada mesmo com o escritório inteiro aberto. */
export function personagemIsometrico(
  T: typeof Tres,
  caixa: PecaIsometrica,
  oval: PecaIsometrica,
  membro: MembroEquipe,
  detalhe = false,
) {
  const raiz = new T.Group()
  const grupo = (pai: any, x = 0, y = 0) => {
    const g = new T.Group()
    g.position.set(x, y, 0)
    pai.add(g)
    return g
  }
  const quadril = grupo(raiz)
  const tronco = grupo(quadril)
  const cabeca = grupo(tronco, 0, 0.49)
  const { camisa, calca, pele, cabelo, estilo, oculos } = membro.roupa
  const acessorio = acessorios[membro.id]
  oval(tronco, camisa, [0.52, 0.51, 0.34], [0, 0.26, 0])
  oval(tronco, pele, [0.17, 0.17, 0.17], [0, 0.49, 0])
  caixa(tronco, LINHO, [0.22, 0.045, 0.24], [0, 0.47, 0.02])
  if (acessorio === 'gravata') {
    caixa(tronco, TINTA, [0.045, 0.066, 0.025], [0, 0.421, 0.151]).rotation.z = Math.PI / 4
    caixa(tronco, TINTA, [0.052, 0.16, 0.026], [0, 0.32, 0.17])
  }
  if (acessorio === 'cracha' || acessorio === 'bolso') {
    const largura = detalhe ? 0.11 : 0.083
    caixa(tronco, LINHO, [largura, 0.069, 0.018], [0.124, 0.35, 0.161]).rotation.z = -0.11
    caixa(tronco, 0x536950, [0.051, 0.014, 0.02], [0.122, 0.35, 0.172])
    if (detalhe && acessorio === 'cracha')
      caixa(tronco, LINHO, [0.027, 0.074, 0.023], [0.118, 0.417, 0.142]).rotation.z = 0.18
  }

  oval(cabeca, pele, [0.53, 0.49, 0.45], [0, 0.25, 0.025])
  oval(cabeca, cabelo, [0.55, 0.29, 0.47], [0, 0.423, -0.018])
  oval(cabeca, cabelo, [0.51, estilo === 'longo' ? 0.47 : 0.37, 0.24], [0, estilo === 'longo' ? 0.19 : 0.31, -0.136])
  if (estilo === 'coque') {
    oval(cabeca, cabelo, [0.23, 0.22, 0.22], [0.035, 0.556, -0.094])
  } else if (estilo === 'longo') {
    for (const x of [-0.219, 0.219]) {
      oval(cabeca, cabelo, [0.147, 0.43, 0.24], [x, 0.196, -0.061]).rotation.z = -x * 0.7
    }
  } else {
    const risca = membro.mesa < 0 ? -1 : 1
    oval(cabeca, cabelo, [0.38, 0.147, 0.18], [0.049 * risca, 0.405, 0.14]).rotation.z = risca * 0.23
  }

  for (const x of [-0.108, 0.108]) {
    const lado = Math.sign(x)
    oval(cabeca, pele, [0.092, 0.111, 0.087], [lado * 0.248, 0.242, 0.014])
    const olho = detalhe ? oval : caixa
    olho(cabeca, TINTA, [detalhe ? 0.058 : 0.045, 0.063, 0.024], [x, 0.272, 0.232])
    olho(cabeca, LINHO, [0.017, 0.018, 0.008], [x + 0.009, 0.284, 0.244])
    caixa(cabeca, cabelo, [0.073, 0.015, 0.013], [x, 0.329, 0.225]).rotation.z = lado * -0.12
    if (oculos) {
      for (const y of [0.322, 0.225]) caixa(cabeca, TINTA, [0.153, 0.016, 0.023], [x, y, 0.249])
      for (const canto of [-0.069, 0.069]) caixa(cabeca, TINTA, [0.017, 0.101, 0.023], [x + canto, 0.273, 0.249])
      if (detalhe) caixa(cabeca, TINTA, [0.022, 0.015, 0.167], [lado * 0.199, 0.285, 0.169]).rotation.y = lado * -0.4
    }
    if (acessorio === 'fone') {
      oval(cabeca, TINTA, [0.104, 0.18, 0.154], [lado * 0.263, 0.245, 0.019])
      if (detalhe) oval(cabeca, 0x80a693, [0.026, 0.11, 0.093], [lado * 0.31, 0.248, 0.022])
    }
  }
  if (oculos) caixa(cabeca, TINTA, [0.07, 0.015, 0.023], [0, 0.28, 0.25])
  if (acessorio === 'fone') {
    caixa(cabeca, TINTA, [0.028, 0.026, 0.212], [0.233, 0.191, 0.136]).rotation.y = -0.57
    if (detalhe) oval(cabeca, TINTA, [0.062, 0.05, 0.045], [0.177, 0.191, 0.22])
  }
  oval(cabeca, pele, [0.079, 0.066, 0.074], [0, 0.229, 0.237])
  for (const lado of [-1, 1]) {
    const boca = detalhe ? oval : caixa
    boca(cabeca, 0x723f36, [0.064, 0.026, 0.017], [lado * 0.023, 0.159, 0.227]).rotation.z = lado * 0.24
  }

  const braco = (x: number) => {
    const ombro = grupo(tronco, x, 0.408)
    const cotovelo = grupo(ombro, 0, -0.23)
    oval(ombro, camisa, [0.176, 0.323, 0.19], [0, -0.093, 0])
    oval(cotovelo, pele, [0.115, 0.235, 0.131], [0, -0.083, 0])
    oval(cotovelo, pele, [0.137, 0.146, 0.142], [0, -0.212, 0])
    return { ombro, cotovelo }
  }
  const perna = (x: number) => {
    const coxa = grupo(quadril, x)
    const joelho = grupo(coxa, 0, -0.26)
    caixa(coxa, calca, [0.182, 0.285, 0.197], [0, -0.118, 0])
    caixa(joelho, calca, [0.155, 0.225, 0.166], [0, -0.095, 0])
    oval(joelho, TINTA, [0.187, 0.103, 0.283], [0, -0.246, 0.045])
    return { coxa, joelho }
  }
  return {
    raiz,
    quadril,
    tronco,
    cabeca,
    esquerda: braco(-0.22),
    direita: braco(0.22),
    pernas: [perna(-0.112), perna(0.112)],
  }
}
