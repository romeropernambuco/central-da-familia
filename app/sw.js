// Guarda a casca pública do app. Requisições de dados ao Supabase passam direto pela rede.
const VERSAO = "e7d8f292e693"
const ARQUIVOS = ["index.html","assets/index-DHZmPOb5.js","assets/partida-D0KOk0pW.js","assets/partida-WE33CKzH.css","assets/figtree-latin-wght-normal-D_ZTVpCC.woff2","assets/bricolage-grotesque-latin-wght-normal-DLoelf7F.woff2","assets/inter-cyrillic-ext-wght-normal-BOeWTOD4.woff2","assets/inter-cyrillic-wght-normal-DqGufNeO.woff2","assets/inter-greek-ext-wght-normal-DlzME5K_.woff2","assets/inter-greek-wght-normal-CkhJZR-_.woff2","assets/inter-vietnamese-wght-normal-CBcvBZtf.woff2","assets/inter-latin-ext-wght-normal-DO1Apj_S.woff2","assets/inter-latin-wght-normal-Dx4kXJAl.woff2","assets/Inicio-e-VfwkF-.js","assets/Inicio-DtKgSSLz.css","assets/RumoA2029-CICPD1Li.css","assets/escritorio-CCwUF-Zq.css","assets/PlanoSemMargem-bMVs7RkQ.js","assets/useConfig-CQiC8BkQ.js","assets/leituras-Dd4ZuWF4.js","assets/orcamento-C7fPumtT.js","assets/plano-DfHmsbPq.js","assets/recebimentos-BZNAPk_Q.js","assets/imoveis-Co6pPwcI.js","assets/desejos-B71kTfVN.js","assets/Cena3D-CDbM80f8.js","assets/info-CLvmo8Cj.js","assets/dadosIsometricos-BSfFqaWn.js","assets/dadosIsometricos-C3XWiEvD.css","assets/SaldoConta-vTLAHAVN.js","assets/SaldoConta-eeVgm1fr.css","assets/CasaDisponivelHoje-BScBF0Nc.js","assets/EnvelopeCard-B5lyUF09.js","assets/Qm-BpWlj4r-.js","assets/Linha2028-CQUKz99X.js","assets/Graficos-BzY2frWl.js","assets/useSeparacao-BD3O19HU.js","assets/porDia-Bci5DiK3.js","assets/real-Bs16gmfv.js"]
const PASTA = new URL('./', self.location.href).href
const INDEX = PASTA + 'index.html'
const PREFIXO = 'central-' + encodeURIComponent(PASTA) + ':'
const CACHE = PREFIXO + VERSAO

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS.map(a => new Request(PASTA + a, { cache: 'reload' })))))
})

// Sem skipWaiting: só remove a casca anterior quando essa versão fica ativa.
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const nome of await caches.keys()) {
      if (nome === CACHE) continue
      const legado = /^central-[a-f0-9]{12}$/.test(nome) && await (await caches.open(nome)).match(INDEX)
      if (nome.startsWith(PREFIXO) || legado) await caches.delete(nome)
    }
  })())
})

async function lerCache(req) {
  try { return await (await caches.open(CACHE)).match(req) }
  catch { return undefined }
}

async function guardar(req, resposta) {
  try { await (await caches.open(CACHE)).put(req, resposta.clone()) }
  catch { /* quota ou cache indisponível: a resposta da rede continua válida */ }
}

// Avisos no celular: o servidor manda só o assunto (sem valor e sem nome). Tocar abre a Central.
self.addEventListener('push', e => {
  const d = (() => {
    try { return (e.data && e.data.json()) || {} } catch { return {} }
  })()
  e.waitUntil(self.registration.showNotification(d.titulo || 'Central da Família', {
    body: d.texto || 'A Central tem avisos para você.',
    icon: PASTA + 'icone-192.png',
    badge: PASTA + 'icone-192.png',
    tag: 'central-avisos',
    data: { abrir: new URL(d.abrir || './', PASTA).href },
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const alvo = (e.notification.data && e.notification.data.abrir) || PASTA
  e.waitUntil((async () => {
    for (const c of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
      if (c.url.startsWith(PASTA) && 'focus' in c) {
        if ('navigate' in c) await c.navigate(alvo).catch(() => {})
        return c.focus()
      }
    }
    return self.clients.openWindow(alvo)
  })())
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET' || !req.url.startsWith(PASTA)) return
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      let resposta
      try { resposta = await fetch(req) }
      catch (erro) {
        const casca = await lerCache(INDEX)
        if (casca) return casca
        throw erro
      }
      if (resposta.ok && !resposta.redirected) return resposta
      return (await lerCache(INDEX)) || resposta
    })())
    return
  }
  e.respondWith((async () => {
    const guardado = await lerCache(req)
    if (guardado) return guardado
    const r = await fetch(req)
    if (r.ok && r.type === 'basic' && !r.redirected) await guardar(req, r)
    return r
  })())
})
