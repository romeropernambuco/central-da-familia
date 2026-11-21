// As pastas do app formam degraus. Cada degrau só pode usar o que está abaixo dele:
//   lib (contas e regras puras) < api (conversa com o banco) < app (estado do app) < componentes (peças) < telas
// Sem isso, uma conta de dinheiro acaba dependendo de uma tela, e mexer na tela quebra a conta.
// Este teste lê todas as importações e reprova qualquer uma que suba um degrau.
import { describe, expect, it } from 'vitest'

const fontes = import.meta.glob<string>('./{lib,api,app,componentes,telas}/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const DEGRAUS = ['lib', 'api', 'app', 'componentes', 'telas']
const degrau = (caminho: string) => DEGRAUS.indexOf(caminho.split('/')[0])

/** Arquivos que só existem para testar podem importar de qualquer lugar. */
const deTeste = (p: string) => /\.(test|dom-teste|fixture)\.tsx?$/.test(p)

/**
 * A casca do app: os dois únicos arquivos que juntam tudo. Lista fechada: só pode diminuir.
 * - app/App.tsx escolhe qual tela aparece, então precisa conhecer as telas.
 * - app/contexto.tsx desenha a moldura que fica por cima de qualquer tela (aviso de baixo, desfazer, fila de envios).
 */
const CASCA = ['app/App.tsx', 'app/contexto.tsx']

/** O vocabulário (formato dos dados) é de todos: as contas de lib precisam saber o que é um lançamento. */
const VOCABULARIO = 'api/tipos'

function resolver(de: string, alvo: string) {
  const partes = de.split('/').slice(0, -1)
  for (const p of alvo.split('/')) {
    if (p === '.') continue
    if (p === '..') partes.pop()
    else partes.push(p)
  }
  return partes.join('/')
}

function subidas() {
  const achadas: string[] = []
  const importacao = /(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"\n]+)['"]/g
  for (const [chave, codigo] of Object.entries(fontes)) {
    const arquivo = chave.slice(2)
    if (deTeste(arquivo) || CASCA.includes(arquivo)) continue
    for (const m of codigo.matchAll(importacao)) {
      // estilo e dados soltos não são código: não entram na regra
      if (/\.(css|json|md|svg|png|webp)(\?.*)?$/.test(m[1])) continue
      const alvo = resolver(arquivo, m[1])
      if (degrau(alvo) < 0 || degrau(alvo) <= degrau(arquivo)) continue
      if (alvo === VOCABULARIO) continue
      achadas.push(`${arquivo} usa ${alvo}`)
    }
  }
  return achadas.sort()
}

/**
 * A família de exemplo (dados inventados para demonstração) não pode entrar no app de verdade.
 * Quem não é teste só pode pegar dela o FORMATO (import type), nunca o conteúdo.
 * Lista fechada de quem pode carregar o conteúdo: só pode diminuir.
 */
const PODE_CARREGAR_EXEMPLO = [
  'api/index.ts', // escolhe o banco e só carrega o exemplo nos builds de exemplo e demo
  'api/exemplo.ts',
  'api/exemplo2.ts',
  'componentes/escritorio/dadosDeExemplo.ts', // monta os dados das prévias
  'telas/entrar/Entrar.tsx', // só o código de convite de demonstração (api/conviteExemplo)
  'telas/escritorio/numeros.ts', // numerosExemplo: carrega só quando chamado, e hoje só um teste chama
]
function exemploNoApp() {
  const achadas: string[] = []
  const comConteudo = /(?:^|\n)\s*import\s+(?!type\b)[^'"]*?from\s*['"](\.[^'"]*[Ee]xemplo[^'"]*)['"]/g
  const tardio = /import\(\s*['"](\.[^'"]*[Ee]xemplo[^'"]*)['"]\s*\)/g
  for (const [chave, codigo] of Object.entries(fontes)) {
    const arquivo = chave.slice(2)
    if (deTeste(arquivo) || PODE_CARREGAR_EXEMPLO.includes(arquivo)) continue
    for (const m of [...codigo.matchAll(comConteudo), ...codigo.matchAll(tardio)])
      achadas.push(`${arquivo} carrega ${m[1]}`)
  }
  return achadas.sort()
}

describe('camadas: cada pasta só usa o que está abaixo dela', () => {
  it('nenhuma importação sobe um degrau', () => {
    expect(subidas()).toEqual([])
  })
  it('a casca continua sendo só os dois arquivos combinados', () => {
    expect(CASCA).toEqual(['app/App.tsx', 'app/contexto.tsx'])
    for (const arquivo of CASCA) expect(fontes[`./${arquivo}`], arquivo).toBeTruthy()
  })
  it('a família de exemplo não entra no app de verdade: fora da lista, só o formato', () => {
    expect(exemploNoApp()).toEqual([])
    for (const arquivo of PODE_CARREGAR_EXEMPLO) expect(fontes[`./${arquivo}`], arquivo).toBeTruthy()
  })
  it('o vocabulário não carrega código que roda: só formatos', () => {
    const tipos = fontes[`./${VOCABULARIO}.ts`]
    expect(tipos).toBeTruthy()
    // importar valor de outro arquivo faria lib depender de api por tabela
    expect(tipos.match(/^import\s+(?!type\b)[^\n]*from\s+['"]\.[^'"]*['"]/gm) || []).toEqual([])
  })
})
