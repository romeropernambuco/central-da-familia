// Monta o sw.js da pasta publicada: lista todos os arquivos do build e carimba a versão (muda a cada build).
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
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

export function gravarSw(pastaBuild, modeloPath) {
  const arquivos = listar(pastaBuild).filter(a => a !== 'sw.js' && !a.endsWith('.map')).sort()
  const h = createHash('sha256')
  for (const a of arquivos) { h.update(a); h.update(readFileSync(join(pastaBuild, a))) }
  const versao = h.digest('hex').slice(0, 12)
  // o 3D do Escritório (Three.js) não entra na casca: só é baixado quando a pessoa abre essa tela, e aí o próprio sw guarda
  const casca = arquivosEssenciais(arquivos, a => readFileSync(join(pastaBuild,a),'utf8'))
  writeFileSync(join(pastaBuild, 'sw.js'), montarSw(readFileSync(modeloPath, 'utf8'), casca, versao))
  return { versao, arquivos }
}

export function arquivosEssenciais(arquivos, ler) {
 const usados = new Set()
 function incluir(p) {
 p=p.replace(/^\.\//,'');if(usados.has(p)||!arquivos.includes(p))return
 usados.add(p)
 if(p==='index.html') { const html=ler(p);for(const m of html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g))incluir(m[1]);return }
 if(p.endsWith('.js'))for(const m of ler(p).matchAll(/(?:import|export)\s*(?:[^"'();]*?\sfrom\s*)?["']([^"']+)["']/g))incluir(posix.join(posix.dirname(p),m[1]))
 }
 incluir('index.html');for(const p of arquivos)if(/^assets\/partida-.*\.(js|css)$/.test(p))incluir(p);return [...usados]
}
