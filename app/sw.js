// Guarda a casca pública do app. Requisições de dados ao Supabase passam direto pela rede.
const VERSAO = "9f86c202298a"
const ARQUIVOS = ["index.html","assets/index-1mBDM0HS.js","assets/partida-B7Zj3aXc.js","assets/partida-WE33CKzH.css","assets/figtree-latin-wght-normal-D_ZTVpCC.woff2","assets/bricolage-grotesque-latin-wght-normal-DLoelf7F.woff2","assets/inter-cyrillic-ext-wght-normal-BOeWTOD4.woff2","assets/inter-cyrillic-wght-normal-DqGufNeO.woff2","assets/inter-greek-ext-wght-normal-DlzME5K_.woff2","assets/inter-greek-wght-normal-CkhJZR-_.woff2","assets/inter-vietnamese-wght-normal-CBcvBZtf.woff2","assets/inter-latin-ext-wght-normal-DO1Apj_S.woff2","assets/inter-latin-wght-normal-Dx4kXJAl.woff2","assets/Inicio-BxRwwXGl.js","assets/Inicio-DtKgSSLz.css","assets/RumoA2029-V9yWqIU5.css","assets/escritorio-CCwUF-Zq.css","assets/PlanoSemMargem-BtqUeRuL.js","assets/useConfig-COauJlt_.js","assets/leituras-BVt6jyZv.js","assets/orcamento-DgnPFhlN.js","assets/plano-C2YgJtd_.js","assets/recebimentos-s-ceQo4W.js","assets/imoveis-DwPBMQw9.js","assets/desejos-B71kTfVN.js","assets/Cena3D-CQJKCHYQ.js","assets/minus-S443XID8.js","assets/dadosIsometricos-CnDQNuxg.js","assets/dadosIsometricos-C3XWiEvD.css","assets/SaldoConta-By4xVm6i.js","assets/SaldoConta-eeVgm1fr.css","assets/CasaDisponivelHoje-oa7oc1hK.js","assets/EnvelopeCard-DNNMjYsF.js","assets/Qm-mIpqPaSr.js","assets/Linha2028-Uy80kg0O.js","assets/Graficos-g5RNsQrK.js","assets/useSeparacao-CpFX0rIO.js","assets/porDia-CXMOnxDh.js","assets/real-DEBrVRy9.js"]
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
