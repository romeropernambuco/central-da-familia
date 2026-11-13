// Portões de qualidade da Central da Família (PLANO_TECNICO item 4). Rodar: npm run portoes
// Nada vai pro ar sem passar em todos. Este script cobre os portões 1, 2, 6 e 7 e mostra o 3 (casos do motor 2029).
//   1. tsc sem erro
//   2. npm test (Vitest): todos os testes do app passam (os casos do motor ficam no portão 3)
//   3. casos do ECONOMISTA (src/lib/futuro/casos.test.ts): mostra quantos de 39 passam.
//      Só reprova o conjunto com --exigir-3 (vira obrigatório quando o MOTOR entregar a E1b).
//   6. build de produção sem nenhum dado de exemplo; build de exemplo continua saindo com o exemplo
//   7. nenhuma chave secreta no build nem no código (só a publicável pode existir)
// Opções: --so=1,2  (roda só esses)   --exigir-3   (casos do motor passam a reprovar)
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const args = process.argv.slice(2)
const so = (args.find(a => a.startsWith('--so=')) || '').slice(5).split(',').filter(Boolean)
const exigir3 = args.includes('--exigir-3')
const roda = n => so.length === 0 || so.includes(String(n))

const resultado = []
const anota = (n, nome, ok, detalhe, obrigatorio = true) => {
  resultado.push({ n, nome, ok, detalhe, obrigatorio })
  console.log(`${ok ? 'PASSOU' : obrigatorio ? 'FALHOU' : 'AVISO '} portão ${n}: ${nome}. ${detalhe}`)
}
const rodar = (cmd, a, extra = {}) => spawnSync(cmd, a, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...extra })

function listar(pasta) {
  if (!existsSync(pasta)) return []
  const out = []
  for (const n of readdirSync(pasta)) {
    const p = join(pasta, n)
    if (statSync(p).isDirectory()) out.push(...listar(p))
    else out.push(p)
  }
  return out
}
/** Procura o padrão em cada arquivo e devolve "arquivo: trecho" de cada achado. */
function procurar(arquivos, padrao) {
  const achados = []
  for (const f of arquivos) {
    let txt
    try { txt = readFileSync(f, 'utf8') } catch { continue }
    const re = new RegExp(padrao.source, 'g')
    let m
    while ((m = re.exec(txt))) {
      achados.push(`${relative(RAIZ, f).split(sep).join('/')}: ...${txt.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/\s+/g, ' ')}...`)
      if (achados.length > 20) return achados
    }
  }
  return achados
}

// ---------- 1. tsc ----------
if (roda(1)) {
  const r = rodar('npx', ['tsc', '-p', '.', '--noEmit'])
  const erros = ((r.stdout || '') + (r.stderr || '')).split('\n').filter(l => /error TS\d+/.test(l))
  anota(1, 'tsc sem erro', r.status === 0, r.status === 0 ? '0 erro.' : `${erros.length} erro(s):\n  ${erros.slice(0, 15).join('\n  ')}`)
}

// ---------- 2 e 3. Vitest ----------
if (roda(2) || roda(3)) {
  const pasta = mkdtempSync(join(tmpdir(), 'portoes-'))
  const saida = join(pasta, 'vitest.json')
  const r = rodar('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${saida}`])
  let json = null
  try { json = JSON.parse(readFileSync(saida, 'utf8')) } catch { /* sem json: o Vitest nem rodou */ }
  rmSync(pasta, { recursive: true, force: true })
  if (!json) {
    anota(2, 'testes do app', false, `o Vitest não rodou (saída ${r.status}).\n${(r.stderr || '').slice(-1500)}`)
  } else {
    const ehCaso = arq => /src[\\/]lib[\\/]futuro[\\/]casos\.test\.ts$/.test(arq)
    const app = { ok: 0, falha: [], total: 0, pulado: 0 }
    const casos = { ok: 0, falha: [], total: 0, pulado: 0, existe: false, nomesOk: [] }
    for (const arq of json.testResults || []) {
      const alvo = ehCaso(arq.name) ? casos : app
      if (alvo === casos) casos.existe = true
      // arquivo que nem carregou (import quebrado) conta como falha
      if ((arq.assertionResults || []).length === 0 && arq.status === 'failed') alvo.falha.push(`${relative(RAIZ, arq.name)}: não carregou (${(arq.message || '').split('\n')[0].slice(0, 160)})`)
      for (const t of arq.assertionResults || []) {
        alvo.total++
        if (t.status === 'passed') { alvo.ok++; if (alvo === casos) casos.nomesOk.push(t.title) }
        else if (t.status === 'skipped' || t.status === 'pending' || t.status === 'todo') alvo.pulado++
        else alvo.falha.push(`${relative(RAIZ, arq.name)} > ${t.fullName || t.title}`)
      }
    }
    if (roda(2)) {
      const ok = app.falha.length === 0 && app.pulado === 0 && app.total > 0
      anota(2, 'testes do app', ok, `${app.ok} de ${app.total} passam${app.pulado ? `, ${app.pulado} pulado(s) (proibido)` : ''}${app.falha.length ? `. Falharam:\n  ${app.falha.slice(0, 20).join('\n  ')}` : '.'}`)
    }
    if (roda(3)) {
      // cada id de casos_teste.json precisa de 1 teste que passou com o id no nome
      let ids = []
      try { ids = JSON.parse(readFileSync(join(RAIZ, 'src', 'lib', 'futuro', 'casos_teste.json'), 'utf8')).casos.map(x => x.id) } catch { /* sem o arquivo */ }
      const passaram = new Set(casos.nomesOk)
      const faltam = ids.filter(id => ![...passaram].some(n => n === id || n.split(/[\s:>(]+/).includes(id)))
      const ok = casos.existe && ids.length === 39 && faltam.length === 0 && casos.pulado === 0 && casos.falha.length === 0
      const det = !casos.existe ? 'src/lib/futuro/casos.test.ts ainda não existe.'
        : `${ids.length - faltam.length} de ${ids.length} casos passam (${casos.ok} de ${casos.total} testes do arquivo${casos.pulado ? `, ${casos.pulado} pulado(s) (proibido)` : ''}).${ids.length !== 39 ? ' casos_teste.json tem que ter 39.' : ''}${faltam.length ? ` Faltam: ${faltam.join(', ')}.` : ''}${casos.falha.length ? ` Falharam:\n  ${casos.falha.slice(0, 20).join('\n  ')}` : ''}${exigir3 ? '' : ' Obrigatório só a partir da entrega do MOTOR (use --exigir-3).'}`
      anota(3, 'os 39 casos do ECONOMISTA', ok, det, exigir3)
    }
  }
}

// ---------- 6. build de produção sem exemplo ----------
if (roda(6)) {
  const PROIBIDO = /Silva|Souza|dadosTeste|Nubank|como=/
  rmSync(join(RAIZ, 'dist'), { recursive: true, force: true })
  const b = rodar('npx', ['vite', 'build'])
  if (b.status !== 0) anota(6, 'build de produção sem exemplo', false, `o build de produção quebrou:\n${(b.stdout + b.stderr).slice(-1500)}`)
  else {
    const js = listar(join(RAIZ, 'dist', 'assets')).filter(f => f.endsWith('.js'))
    const achados = procurar(js, PROIBIDO)
    // o build de exemplo tem que continuar saindo e com a família de exemplo dentro (prova que a troca é pelo modo)
    rmSync(join(RAIZ, 'dist-exemplo'), { recursive: true, force: true })
    const e = rodar('npx', ['vite', 'build', '--mode', 'exemplo'])
    const exJs = e.status === 0 ? listar(join(RAIZ, 'dist-exemplo', 'assets')).filter(f => f.endsWith('.js')) : []
    const exemploTemFamilia = procurar(exJs, /dadosTeste|Família Silva|fam-silva/).length > 0
    const ok = js.length > 0 && achados.length === 0 && e.status === 0 && exemploTemFamilia
    anota(6, 'build de produção sem exemplo', ok,
      `${js.length} arquivo(s) js em dist/assets, ${achados.length} achado(s) de ${PROIBIDO.source}${achados.length ? `:\n  ${achados.join('\n  ')}` : ''}. Build de exemplo: ${e.status === 0 ? (exemploTemFamilia ? 'saiu, com a família de exemplo' : 'saiu SEM a família de exemplo (a troca quebrou)') : 'quebrou'}.`)
  }
}

// ---------- 7. nenhuma chave secreta ----------
if (roda(7)) {
  const SEGREDO = /service_role|sb_secret|eyJ/
  if (!existsSync(join(RAIZ, 'dist'))) rodar('npx', ['vite', 'build'])
  const envs = readdirSync(RAIZ).filter(n => n.startsWith('.env')).map(n => join(RAIZ, n))
  const arquivos = [...listar(join(RAIZ, 'dist')), ...listar(join(RAIZ, 'src')), ...envs]
  const achados = procurar(arquivos, SEGREDO)
  anota(7, 'nenhuma chave secreta', existsSync(join(RAIZ, 'dist')) && achados.length === 0,
    `${arquivos.length} arquivo(s) olhados (dist, src e .env*), ${achados.length} achado(s) de ${SEGREDO.source}${achados.length ? `:\n  ${achados.join('\n  ')}` : '.'}`)
}

// ---------- placar ----------
const obrig = resultado.filter(r => r.obrigatorio)
const reprovados = obrig.filter(r => !r.ok)
console.log(`\nPlacar: ${obrig.length - reprovados.length} de ${obrig.length} portões obrigatórios passaram${reprovados.length ? ` (reprovou: ${reprovados.map(r => r.n).join(', ')})` : ''}.`)
process.exit(reprovados.length ? 1 : 0)
