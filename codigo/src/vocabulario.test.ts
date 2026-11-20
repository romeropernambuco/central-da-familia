import { expect, it } from 'vitest'
import ts from 'typescript'
// @ts-ignore: Vitest executa em Node; o app não inclui tipos do Node.
import { readdirSync, readFileSync } from 'node:fs'
// @ts-ignore: idem
import { join } from 'node:path'

// Só texto de produto: comentários, imports, ids, rotas, chaves e papéis do banco não são rótulos.
it('vocabulário visível não reintroduz profissões ou nomes antigos do papel', () => {
  const falhas: string[] = []
  function pasta(dir: string) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        pasta(p)
        continue
      }
      if (!/\.tsx?$/.test(p) || p.endsWith('.test.ts')) continue
      const ast = ts.createSourceFile(p, readFileSync(p, 'utf8'), ts.ScriptTarget.Latest, true)
      function visitar(n: ts.Node) {
        if (ts.isPropertyAssignment(n.parent) && n.parent.name === n) return
        if (
          ts.isStringLiteral(n) ||
          ts.isJsxText(n) ||
          ts.isTemplateHead(n) ||
          ts.isTemplateMiddle(n) ||
          ts.isTemplateTail(n) ||
          ts.isNoSubstitutionTemplateLiteral(n)
        ) {
          const t = n.text
          if (/cozinheira|motorista|quem trabalha (?:na|em) casa|equipe da casa|entre por aqui|clique aqui/i.test(t))
            falhas.push(`${p}: ${t}`)
        } else ts.forEachChild(n, visitar)
      }
      ts.forEachChild(ast, visitar)
    }
  }
  pasta('src')
  expect(falhas).toEqual([])
})
