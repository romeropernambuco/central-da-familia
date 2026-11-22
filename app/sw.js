// Guarda a casca pública do app. Requisições de dados ao Supabase passam direto pela rede.
const VERSAO = "f149e01990f0"
const ARQUIVOS = ["index.html","assets/index-BavLc51q.js","assets/partida-Zbg58ZYv.js","assets/partida-xWAOpgoz.css","assets/figtree-latin-wght-normal-D_ZTVpCC.woff2","assets/bricolage-grotesque-latin-wght-normal-DLoelf7F.woff2","assets/inter-cyrillic-ext-wght-normal-BOeWTOD4.woff2","assets/inter-cyrillic-wght-normal-DqGufNeO.woff2","assets/inter-greek-ext-wght-normal-DlzME5K_.woff2","assets/inter-greek-wght-normal-CkhJZR-_.woff2","assets/inter-vietnamese-wght-normal-CBcvBZtf.woff2","assets/inter-latin-ext-wght-normal-DO1Apj_S.woff2","assets/inter-latin-wght-normal-Dx4kXJAl.woff2","assets/Inicio-D-A1dzNE.js","assets/Inicio-B4v7BE_7.css","assets/escritorio-CCwUF-Zq.css","assets/RumoA2029-CyjbCzfc.css","assets/PlanoSemMargem-CFJK_38i.js","assets/useConfig-B5flI7Jk.js","assets/leituras-WKzRFIMw.js","assets/orcamento-C2a88Vew.js","assets/plano-B1ub5t-C.js","assets/recebimentos-C2vxSTtM.js","assets/guardado-BtNfjJw9.js","assets/imoveis-DS_oZd0N.js","assets/desejos-B71kTfVN.js","assets/Cena3D-DPsIGtye.js","assets/dadosIsometricos-DyrT6Or7.js","assets/dadosIsometricos-C3XWiEvD.css","assets/SaldoConta-BqLG0x1-.js","assets/SaldoConta-eeVgm1fr.css","assets/CasaDisponivelHoje-OcTw9C2Z.js","assets/EnvelopeCard-IbsY2385.js","assets/Qm-CZRk2578.js","assets/Linha2028-C6G5iaR-.js","assets/Graficos-BtnJU93q.js","assets/porDia-BCKcS7YQ.js","assets/real-BZWhh2Ix.js"]
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
