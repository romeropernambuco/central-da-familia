// Monta o sw.js da pasta publicada, com a casca inicial e a versão do build.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, relative, sep, posix } from 'node:path'

function listar(pasta, raiz = pasta) {
  const out = []
  for (const n of readdirSync(pasta)) {
    const p = join(pasta, n)
    if (statSync(p).isDirectory()) out.push(...listar(p, raiz))
    else out.push(relative(raiz, p).split(sep).join('/'))
  }
  return out
}

/** Troca os 2 marcadores do modelo. Função pura, testada em src/sw.test.ts. */
export function montarSw(modelo, arquivos, versao) {
  if (!modelo.includes("'__VERSAO__'") || !modelo.includes('__ARQUIVOS__')) throw new Error('modelo do sw sem os marcadores')
  return modelo.replace("'__VERSAO__'", JSON.stringify(versao)).replace('__ARQUIVOS__', JSON.stringify(arquivos))
}

export function versaoDosModelos(pasta) {
  const hash = createHash('sha256')
  for (const arquivo of listar(pasta).filter(a => a.endsWith('.glb')).sort()) {
    hash.update(arquivo).update(readFileSync(join(pasta, arquivo)))
  }
  return hash.digest('hex').slice(0, 12)
}

export function cascaDoManifesto(manifesto, entradas) {
  const casca = new Set(['index.html'])
  const visitados = new Set()
  function incluir(chave) {
    if (visitados.has(chave)) return
    visitados.add(chave)
    const item = manifesto[chave]
    if (!item) throw new Error('Entrada ausente no manifesto: ' + chave)
    casca.add(item.file)
    for (const arquivo of [...(item.css || []), ...(item.assets || [])]) casca.add(arquivo)
    for (const importado of item.imports || []) incluir(importado)
  }
  for (const entrada of entradas) incluir(entrada)
  return [...casca]
}

export function gravarSw(pastaBuild, modeloPath, entradasDinamicas) {
  let casca
  if (entradasDinamicas) {
    const caminho = join(pastaBuild, '.vite/manifest.json')
    const manifesto = JSON.parse(readFileSync(caminho, 'utf8'))
    // Vite pode dar ao chunk de uma entrada dinâmica uma chave baseada no arquivo emitido.
    const entradas = ['index.html']
    for (const nome of entradasDinamicas) {
      const entrada = Object.entries(manifesto).find(([, item]) => item.isDynamicEntry && item.name === nome)
      if (entrada) entradas.push(entrada[0])
      // Builds sem configuração do Supabase eliminam o backend real.
      else if (nome !== 'real') throw new Error('Entrada dinâmica ausente no manifesto: ' + nome)
    }
    casca = cascaDoManifesto(manifesto, entradas)
    unlinkSync(caminho)
  }
  const arquivos = listar(pastaBuild).filter(a => a !== 'sw.js' && !a.endsWith('.map')).sort()
  casca ??= arquivosEssenciais(arquivos, a => readFileSync(join(pastaBuild, a), 'utf8'))
  const h = createHash('sha256')
  for (const a of arquivos) { h.update(a); h.update(readFileSync(join(pastaBuild, a))) }
  const modelo = readFileSync(modeloPath, 'utf8')
  h.update(modelo).update(JSON.stringify(casca))
  const versao = h.digest('hex').slice(0, 12)
  writeFileSync(join(pastaBuild, 'sw.js'), montarSw(modelo, casca, versao))
  return { versao, arquivos, casca }
}

export function arquivosEssenciais(arquivos, ler) {
 const usados = new Set()
 function incluir(p) {
 p=p.replace(/^\.\//,'');if(usados.has(p)||!arquivos.includes(p)||/^(assets\/cenaIsometrica-|retratos-escritorio\/)/.test(p))return
 usados.add(p)
 if(p==='index.html') { const html=ler(p);for(const m of html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g))incluir(m[1]);return }
 if(p.endsWith('.js'))for(const m of ler(p).matchAll(/(?:import|export)\s*(?:[^"'();]*?\sfrom\s*)?["']([^"']+)["']/g))incluir(posix.join(posix.dirname(p),m[1]))
 }
 incluir('index.html');for(const p of arquivos)if(/^assets\/partida-.*\.(js|css)$/.test(p))incluir(p);return [...usados]
}
