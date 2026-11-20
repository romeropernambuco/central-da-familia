import { expect, it } from 'vitest'
const fontes = import.meta.glob(
  [
    './*.ts',
    '../../componentes/EnvelopeCard.tsx',
    '../../telas/inicio/Inicio.tsx',
    '../../telas/lancamentos/Lancamentos.tsx',
    '../../telas/escritorio/NumerosAba.tsx',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>
it('selectors são puros e não dependem de telas, React, relógio ou armazenamento', () => {
  for (const nome of ['orcamento', 'movimentacao', 'faturas', 'pendencias', 'guardado', 'imoveis', 'recebimentos']) {
    const texto = fontes[`./${nome}.ts`]
    expect(texto).not.toMatch(/from ['"].*(?:telas|react|contexto)/)
    expect(texto).not.toMatch(/Date\.now|new Date\(\)|hojeRecife\(|localStorage|fetch\(/)
  }
})
it('apresentação não importa instância da API nem volta a declarar os totais migrados', () => {
  for (const [nome, texto] of Object.entries(fontes).filter(([n]) => n.endsWith('.tsx'))) {
    expect(texto, nome).not.toMatch(/import\s+(?!type\b).*\bapi(?:Real|Exemplo)?\b.*from ['"].*api\//)
    expect(texto, nome).not.toMatch(/export function totaisDoMes\(|export function numeroEnvelope\(/)
  }
})
