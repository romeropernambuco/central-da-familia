import { expect, it } from 'vitest'
import ts from 'typescript'
// @ts-expect-error: testes executados em Node; o projeto não inclui @types/node.
import { readFileSync, readdirSync } from 'node:fs'
const ler = (p: string): string => readFileSync(p, 'utf8')
function arquivos(p: string): string[] {
  return readdirSync(p, { withFileTypes: true }).flatMap((e: { name: string; isDirectory(): boolean }) =>
    e.isDirectory() ? arquivos(p + '/' + e.name) : [p + '/' + e.name],
  )
}
const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
it.each([
  'Conversar e abrir tarefas',
  'Abrir composição',
  'Envelope não encontrado',
  'Cada caixinha é um limite',
  'Isso já é decidido',
  'Quando o dado entrar no banco da família',
  'Salvo no banco da família',
  'o que entrou na conta',
])('guarda textos: expressão antiga ausente em todo src: %s', texto => {
  const achados = arquivos('src')
    .filter(p => !/\.test\.tsx?$/.test(p))
    .filter(p => semAcento(ler(p)).includes(semAcento(texto)))
  expect(achados).toEqual([])
})
it.each([
  ['src/telas/escritorio/AgenteDaAba.tsx', ['Preciso de ajuda', 'Ver tarefas', 'Completo', 'Só texto', 'Desligado']],
  ['src/lib/insights/motor.ts', ['Ver compras desta fatura']],
  ['src/telas/lancar/Lancar.tsx', ['Rascunho recuperado', 'Descartar']],
  ['src/api/exemplo2.ts', ['Não perguntar de novo sobre isso']],
  ['src/telas/lancamentos/Lancamentos.tsx', ['Gastos e entradas']],
] as const)('guarda textos: novos textos presentes em %s', (p, textos) => {
  for (const texto of textos) expect(ler(p)).toContain(texto)
})
// O parser visita também templates com interpolações e expressões dentro deles.
// Cada literal é verificado separadamente; números decimais não contam como frases.
it.each([
  'src/api/exemplo.ts',
  'src/api/exemplo2.ts',
  ...arquivos('src/lib/insights').filter(p => !/\.test\.|dom-teste/.test(p)),
  'src/lib/escritorio/equipe.ts',
])('guarda falas: até duas frases e sem pressão em %s', p => {
  const fonte = ts.createSourceFile(p, ler(p), ts.ScriptTarget.Latest, true)
  const violacoes: string[] = []
  let total = 0
  function visitar(n: ts.Node) {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n)) {
      const texto = ts.isTemplateExpression(n)
        ? n.head.text + n.templateSpans.map(t => ' dado ' + t.literal.text).join('')
        : n.text
      total++
      const frases = texto.split(/[.!?]+(?:\s+|$)/).filter(s => s.trim()).length
      if (frases > 2 || /leva 2 minutos|paga hoje e me avisa|conta agora/.test(semAcento(texto))) violacoes.push(texto)
    }
    ts.forEachChild(n, visitar)
  }
  visitar(fonte)
  expect(total).toBeGreaterThan(0)
  expect(violacoes).toEqual([])
})
function regra(selector: string): Record<string, string> {
  const css = ler('src/estilo.css').replace(/\/\*[\s\S]*?\*\//g, '')
  const declaracoes: Record<string, string> = {}
  for (const bloco of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (
      !bloco[1]
        .split(',')
        .map(s => s.trim())
        .includes(selector)
    )
      continue
    for (const d of bloco[2].split(';')) {
      const [nome, valor] = d.split(':')
      if (nome && valor) declaracoes[nome.trim()] = valor.trim()
    }
  }
  return declaracoes
}
it('guarda acessibilidade: estoque tem alvo real de pelo menos 44 por 44, sem depender de pseudo-elemento', () => {
  expect(ler('src/componentes/Pergunta.tsx')).toContain('contagem')
  const alvo = regra('.contagem .seg.tres button')
  for (const prop of ['min-height', 'min-width']) {
    expect(alvo[prop]).toMatch(/^\d+(?:\.\d+)?px$/)
    expect(parseFloat(alvo[prop])).toBeGreaterThanOrEqual(44)
  }
})
it.each(['.rail a', '.tabbar a', '.seg button', '.env-h b', '.brand b', '.brand small'])(
  'guarda acessibilidade: %s quebra nomes longos e não trunca',
  seletor => {
    const r = regra(seletor)
    expect(r['white-space']).toBe('normal')
    expect(['anywhere', 'break-word']).toContain(r['overflow-wrap'])
    expect(r['text-overflow']).not.toBe('ellipsis')
    expect(r.overflow).not.toBe('hidden')
  },
)
