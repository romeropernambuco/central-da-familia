// A regra do olho fechado mora num arquivo só: src/lib/olho.ts.
// Este teste impede que ela se espalhe de novo: nenhuma tela escreve pontinhos à mão
// e nenhum outro arquivo cria a própria cópia das funções de esconder.
import { afterEach, describe, expect, it } from 'vitest'
import {
  PONTOS,
  PONTOS_LONGOS,
  VALOR_OCULTO,
  copiarProtegido,
  esconderValores,
  mascararTexto,
  textoPrivado,
  valoresOcultos,
} from './lib/olho'
import { reais } from './lib/formato'

const fontes = import.meta.glob<string>('./{lib,api,app,componentes,telas}/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const CASA = './lib/olho.ts'
const codigoDoApp = Object.entries(fontes).filter(([p]) => p !== CASA && !/\.(test|dom-teste|fixture)\.tsx?$/.test(p))
const semComentario = (codigo: string) =>
  codigo
    .split('\n')
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n')

afterEach(() => esconderValores(false))

describe('olho fechado: a regra mora só em lib/olho.ts', () => {
  it('nenhum arquivo do app escreve os pontinhos à mão', () => {
    const tresPontos = new RegExp(`(?:${PONTOS[0]}|\\\\u2022){3,}`)
    expect(codigoDoApp.filter(([, c]) => tresPontos.test(semComentario(c))).map(([p]) => p)).toEqual([])
  })
  it('nenhum outro arquivo cria ou repassa as funções de esconder', () => {
    const nomes = 'textoPrivado|copiarProtegido|mascararTexto|valoresOcultos|esconderValores'
    const declara = new RegExp(`export\\s+(?:async\\s+)?(?:const|function|let)\\s+(?:${nomes})\\b`)
    const repassa = new RegExp(`export\\s*\\{[^}]*\\b(?:${nomes})\\b[^}]*\\}`)
    expect(codigoDoApp.filter(([, c]) => declara.test(c) || repassa.test(c)).map(([p]) => p)).toEqual([])
  })
  it('quem usa as funções de esconder importa direto de lib/olho', () => {
    const outroCaminho =
      /import\s*\{[^}]*\b(?:textoPrivado|copiarProtegido|mascararTexto|valoresOcultos|esconderValores)\b[^}]*\}\s*from\s*'(?![^']*lib\/olho'|\.\/olho'|\.\.\/olho')[^']*'/
    expect(codigoDoApp.filter(([, c]) => outroCaminho.test(c)).map(([p]) => p)).toEqual([])
  })
})

describe('olho fechado: o que a regra faz', () => {
  it('aberto: nada muda', () => {
    expect(valoresOcultos()).toBe(false)
    expect(textoPrivado('Bruno')).toBe('Bruno')
    expect(reais(1234.5)).toMatch(/1\.234,50$/)
  })
  it('fechado: dinheiro, nome e frase ficam escondidos', () => {
    esconderValores(true)
    expect(reais(1234.5)).toBe(VALOR_OCULTO)
    expect(textoPrivado('Bruno')).toBe(PONTOS)
    expect(mascararTexto('Sobrou R$ 1.234,56 hoje e passou R$ 10 ontem')).toBe(
      `Sobrou ${VALOR_OCULTO} hoje e ${VALOR_OCULTO} ontem`,
    )
  })
  it('fechado: texto vazio e o que não é texto passam sem virar pontinho', () => {
    expect(textoPrivado('', true)).toBe('')
    expect(textoPrivado(undefined, true)).toBeUndefined()
    expect(textoPrivado(7, true)).toBe(7)
  })
  it('as duas máscaras continuam com o tamanho combinado', () => {
    expect([...PONTOS]).toHaveLength(3)
    expect([...PONTOS_LONGOS]).toHaveLength(4)
    expect(VALOR_OCULTO.startsWith('R$')).toBe(true)
  })
  it('copiar com o olho fechado: sem versão segura, bloqueia e avisa', async () => {
    const avisos: string[] = []
    expect(await copiarProtegido('saldo R$ 10', undefined, s => avisos.push(s), true)).toBe(false)
    expect(avisos).toEqual(['Abra o olho para copiar este conteúdo privado.'])
  })
})
