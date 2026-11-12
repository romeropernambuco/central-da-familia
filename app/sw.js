// Service worker da Central: guarda só a casca do app (HTML, JS, CSS, fontes, ícones).
// Dado de família nunca fica no cache: tudo que vai pro supabase.co passa direto pela rede.
// Este arquivo é um modelo: o build troca VERSAO e ARQUIVOS (ver vite.config.ts) e grava sw.js na pasta publicada.
const VERSAO = "67722c955442"
const ARQUIVOS = ["assets/bricolage-grotesque-latin-wght-normal-DLoelf7F.woff2","assets/figtree-latin-wght-normal-D_ZTVpCC.woff2","assets/index-C5Vp1VSJ.css","assets/index-hxyL6wbU.js","assets/real-Da8zdygV.js","icone-180.png","icone-192.png","icone-512-maskable.png","icone-512.png","index.html","manifest.webmanifest"]
const PREFIXO = 'central-'
const CACHE = PREFIXO + VERSAO
// pasta onde o app mora (ex.: /central-da-familia/app/). Nada fora dela entra no cache.
const PASTA = new URL('./', self.location.href).href
const INDEX = PASTA + 'index.html'

self.addEventListener('install', e => {
  // casca inteira já na 1ª visita: abre sem internet mesmo sem ter passado pela 2ª visita
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS.map(a => new Request(PASTA + a, { cache: 'reload' })))).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => {
  // versão nova: apaga a casca das versões antigas (cada build tem o seu cache)
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIXO) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET' || !req.url.startsWith(PASTA)) return
  // página: rede primeiro (versão nova); cache se estiver sem internet ou se o servidor devolver erro
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const r = await fetch(req)
        // só resposta boa entra no cache: página de erro (404 do GitHub, portal do wi-fi) nunca vira a casca
        if (r.ok && !r.redirected) { const c = await caches.open(CACHE); await c.put(INDEX, r.clone()); return r }
        return (await caches.match(INDEX)) || r
      } catch (x) {
        const m = await caches.match(INDEX)
        if (m) return m
        throw x
      }
    })())
    return
  }
  // arquivos com nome versionado: cache primeiro
  e.respondWith((async () => {
    const m = await caches.match(req)
    if (m) return m
    const r = await fetch(req)
    if (r.ok && r.type === 'basic') { const c = await caches.open(CACHE); await c.put(req, r.clone()) }
    return r
  })())
})
