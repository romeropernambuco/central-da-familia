import * as figuras from './figuras'
import { createElement } from 'react'
import type { IlustracaoProps } from './figuras'

export * from './figuras'
export const ilustracoes = Object.freeze({ ...figuras })
export type NomeIlustracao = keyof typeof ilustracoes

/** Prefira o import nominal em telas que usam uma só figura, para tree-shaking. */
export function Ilustracao({ nome, ...props }: IlustracaoProps & { nome: NomeIlustracao }) {
  return createElement(ilustracoes[nome], props)
}
