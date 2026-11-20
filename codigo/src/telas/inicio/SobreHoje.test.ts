import { expect, it } from 'vitest'
import inicio from './Inicio.tsx?raw'
import sobre from './SobreHoje.tsx?raw'

// Trava de função devolvida (inventário A2.1 a A2.4): o Início novo não pode voltar a perder estas explicações.
it('o Início mostra a faixa "Sobre o número de hoje" logo abaixo das referências e antes do escritório', () => {
  const faixa = inicio.indexOf('<SobreHoje e={envelopeHoje} />')
  expect(faixa).toBeGreaterThan(inicio.indexOf('className="j-resumo"'))
  expect(faixa).toBeLessThan(inicio.indexOf('<EscritorioInicio'))
})

it('a faixa tem as quatro explicações do Início antigo', () => {
  expect(sobre).toContain('Hoje já saiu ')
  expect(sobre).toContain('Ainda pode hoje ')
  expect(sobre).toContain("chave: 'virada'")
  expect(sobre).toContain("chave: 'virada-antes'")
  expect(sobre).toContain('<Qm texto')
  expect(sobre).toContain('Por que mudou?')
  expect(sobre).toContain('fraseEstouro(e, n)')
})

it('em mês devendo o topo não chama o valor devido de "Limite de hoje"', () => {
  expect(inicio).toContain("orcamento.valor?.devendo && !oculto ? 'Devendo no mês' : 'Limite de hoje'")
})
