import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InicioNovo } from './InicioNovo'
import { montarInicioNovo } from './inicioNovoDados'

const destino = { rota: 'orcamento', secao: 'orcamento' } as const
const chips = [
  { chave: 'podeGastarHoje', titulo: 'Pode gastar hoje', destino },
  { chave: 'plano2029', titulo: 'Plano 2029', destino: { rota: 'planejamento', secao: 'plano2029' }, legenda: 'Falta' },
  { chave: 'aplicacoes', titulo: 'Total aplicado', destino: { rota: 'guardado', secao: 'aplicacoes' } },
  { chave: 'faturas', titulo: 'Faturas a pagar', destino: { rota: 'cartoes', secao: 'fatura' } },
] as const
const montar = (casal: boolean, restritos: string[] = []) =>
  montarInicioNovo({
    chips,
    lerChip: chave => 'chip:' + chave,
    lerRotina: chave => 'rotina:' + chave,
    visivel: chave => !restritos.includes(chave),
    casal,
    sobreHoje: 'recado',
    mes: null,
    destinoImoveis: { rota: 'guardado', secao: 'imoveis' },
  })

describe('Início reformulado', () => {
  it('o casal olha Hoje, Este mês e 2029; os outros, só Hoje e Este mês', () => {
    expect(montar(true).horizontes.map(h => h.aba)).toEqual(['Hoje', 'Este mês', '2029'])
    expect(montar(false).horizontes.map(h => h.aba)).toEqual(['Hoje', 'Este mês'])
  })

  it('o que a pessoa não pode ver não vira aba nem atalho', () => {
    const { horizontes, atalhos } = montar(true, ['podeGastarHoje', 'aplicacoes', 'imoveis'])
    expect(horizontes.map(h => h.chave)).toEqual(['plano2029'])
    expect(atalhos.map(a => a.chave)).toEqual(['faturas'])
  })

  it('cada atalho leva o número principal e a legenda da rotina', () => {
    const { atalhos } = montar(true)
    expect(atalhos.map(a => a.chave)).toEqual(['aplicacoes', 'faturas', 'imoveis'])
    expect(atalhos[0].numero).toBe('chip:aplicacoes')
    expect(atalhos[2].numero).toBe('rotina:imoveis')
  })

  it('abre em Hoje, com o Escritório inteiro e sem barra quando não há o que medir', () => {
    const { horizontes, atalhos } = montar(true)
    const html = renderToStaticMarkup(
      createElement(InicioNovo, {
        celular: false,
        saudacao: 'Bom dia.',
        horizontes,
        atalhos,
        anotar: () => {},
        escritorio: createElement('div', { id: 'escritorio-inteiro' }),
        lancamentos: null,
        resumo: null,
      }),
    )
    expect(html).toContain('Pode gastar hoje')
    expect(html).toContain('chip:podeGastarHoje')
    expect(html).not.toContain('Resta no mês')
    expect(html).toContain('id="escritorio-inteiro"')
    expect(html).not.toContain('ini4-barra')
    expect(html.match(/role="tab"/g)).toHaveLength(3)
  })

  it('a barra do mês nunca passa de 100% e avisa quando passou do combinado', () => {
    const html = renderToStaticMarkup(
      createElement(InicioNovo, {
        celular: true,
        horizontes: [
          { chave: 'mes', aba: 'Este mês', rotulo: 'Resta no mês', numero: '0', barra: 1.4, href: '#', abrir: 'Abrir' },
        ],
        atalhos: [],
        escritorio: null,
        lancamentos: null,
        resumo: null,
      }),
    )
    expect(html).toContain('inline-size:100%')
    expect(html).toContain('data-passou')
    expect(html).not.toContain('role="tab"')
  })
})
