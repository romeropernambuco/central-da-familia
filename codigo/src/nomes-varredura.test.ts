import { describe, expect, it } from 'vitest'
const fontes = import.meta.glob<string>('./**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })
const ler = (p: string) => fontes[`./${p}`]
describe('nenhuma identidade anônima sem chamado', () => {
  it('rejeita fallbacks textuais antigos ou novos nas telas e APIs', () => {
    const problemas: string[] = []
    const fallback = /(?:\|\||\?\?)\s*['"`](?:algu[eé]m(?: do casal)?|equipe|outro adulto|outra pessoa|convidad[oa]|pessoa|respons[aá]vel n[aã]o identificado)['"`]/i
    for (const [p, fonte] of Object.entries(fontes).filter(([p]) => !p.endsWith('.test.ts'))) {
      fonte.split('\n').forEach((linha, i) => {
        if (!linha.trimStart().startsWith('//') && fallback.test(linha)) problemas.push(`${p}:${i + 1}`)
      })
    }
    expect(problemas).toEqual([])
  })
  it.each([
    'telas/casa/Casa.tsx', 'telas/ajustes/Ajustes.tsx', 'telas/escritorio/Ficha.tsx',
    'telas/lancamentos/Lancamentos.tsx', 'telas/planejamento/Parametros.tsx',
    'telas/planejamento/Recebimentos.tsx', 'telas/guardado/Guardado.tsx',
    'telas/guardado/Imoveis.tsx', 'telas/desejos/Desejos.tsx', 'telas/cartoes/Cartoes.tsx',
    'telas/meu-orcamento/MeuOrcamento.tsx',
  ])('%s usa o chamado compartilhado', arquivo => {
    expect(ler(arquivo)).toMatch(/<NomeDaPessoa\s/)
  })
  it('consulta de membros não esconde a falha e a folha permite tentar de novo', () => {
    expect(ler('app/useMembros.ts')).not.toContain('catch(() => {})')
    const componente = ler('componentes/NomeDaPessoa.tsx')
    expect(componente).toContain('Não foi possível carregar os nomes')
    expect(componente).toContain('Tentar de novo')
    expect(componente).toContain('membros.erro')
  })
})
