// Aviso no celular (Web Push) só com WebCrypto, sem biblioteca: RFC 8291 (mensagem cifrada aes128gcm) e RFC 8292 (VAPID).
// Roda no Deno (a função do servidor avisos-celular leva uma CÓPIA deste arquivo: banco/funcoes/avisos-celular/webpush.ts)
// e no Node (testes). Nada aqui sabe de família: recebe o texto pronto (sem valor e sem nome) e a inscrição do aparelho.

const te = new TextEncoder()

export function deB64u(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
  return Uint8Array.from(b, c => c.charCodeAt(0))
}
export function paraB64u(b: Uint8Array): string {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export const juntar = (...partes: Uint8Array[]) => {
  const r = new Uint8Array(partes.reduce((n, p) => n + p.length, 0))
  let i = 0
  for (const p of partes) {
    r.set(p, i)
    i += p.length
  }
  return r
}

export async function hkdf(sal: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: sal, info }, k, bytes * 8),
  )
}

/** Chave P-256 no formato JWK a partir da pública "crua" (65 bytes) e, se houver, da privada (32 bytes). */
export const jwkP256 = (publica: Uint8Array, privada?: Uint8Array): JsonWebKey => ({
  kty: 'EC',
  crv: 'P-256',
  x: paraB64u(publica.slice(1, 33)),
  y: paraB64u(publica.slice(33, 65)),
  ...(privada ? { d: paraB64u(privada) } : {}),
  ext: true,
})

export interface Inscricao {
  endpoint: string
  /** chave pública do aparelho (base64url) */
  p256dh: string
  /** segredo do aparelho (base64url) */
  auth: string
}

/** O que o servidor e o aparelho calculam igual (RFC 8291, seção 3.4, e RFC 8188). */
export async function chavesDaMensagem(
  ecdh: Uint8Array,
  segredo: Uint8Array,
  uaPub: Uint8Array,
  asPub: Uint8Array,
  sal: Uint8Array,
) {
  const ikm = await hkdf(segredo, ecdh, juntar(te.encode('WebPush: info\u0000'), uaPub, asPub), 32)
  return {
    cek: await hkdf(sal, ikm, te.encode('Content-Encoding: aes128gcm\u0000'), 16),
    nonce: await hkdf(sal, ikm, te.encode('Content-Encoding: nonce\u0000'), 12),
  }
}

/** Cifra a mensagem para 1 aparelho (RFC 8291). `teste` fixa o sal e a chave do servidor: só nos testes. */
export async function cifrar(
  texto: string,
  i: Pick<Inscricao, 'p256dh' | 'auth'>,
  teste?: { sal: Uint8Array; publica: Uint8Array; privada: Uint8Array },
) {
  const uaPub = deB64u(i.p256dh)
  const ecdhAlg = { name: 'ECDH', namedCurve: 'P-256' }
  let asPub: Uint8Array, asPriv: CryptoKey
  if (teste) {
    asPub = teste.publica
    asPriv = await crypto.subtle.importKey('jwk', jwkP256(teste.publica, teste.privada), ecdhAlg, false, ['deriveBits'])
  } else {
    const par = (await crypto.subtle.generateKey(ecdhAlg, true, ['deriveBits'])) as CryptoKeyPair
    asPub = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey))
    asPriv = par.privateKey
  }
  const sal = teste?.sal ?? crypto.getRandomValues(new Uint8Array(16))
  const uaChave = await crypto.subtle.importKey('raw', uaPub, ecdhAlg, false, [])
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaChave }, asPriv, 256))
  const { cek, nonce } = await chavesDaMensagem(ecdh, deB64u(i.auth), uaPub, asPub, sal)
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  // 1 registro só: o texto e o delimitador 0x02 (último registro), sem enchimento
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, juntar(te.encode(texto), new Uint8Array([2]))),
  )
  // cabeçalho: sal (16) + tamanho do registro 4096 (4) + tamanho da chave (1) + chave pública do servidor (65)
  return juntar(sal, new Uint8Array([0, 0, 0x10, 0]), new Uint8Array([asPub.length]), asPub, cifrado)
}

/** Cabeçalho Authorization do VAPID (RFC 8292): diz ao serviço do Google/Apple/Mozilla quem manda o aviso. */
export async function vapid(endpoint: string, publica: string, privada: string, contato: string, agora = Date.now()) {
  const chave = await crypto.subtle.importKey(
    'jwk',
    jwkP256(deB64u(publica), deB64u(privada)),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const parte = (o: object) => paraB64u(te.encode(JSON.stringify(o)))
  const corpo = `${parte({ typ: 'JWT', alg: 'ES256' })}.${parte({
    aud: new URL(endpoint).origin,
    exp: Math.floor(agora / 1000) + 12 * 3600,
    sub: contato,
  })}`
  const assinatura = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chave, te.encode(corpo)),
  )
  return `vapid t=${corpo}.${paraB64u(assinatura)}, k=${publica}`
}

/** Par de chaves VAPID novo (gerado no servidor; a privada nunca sai de lá). */
export async function gerarChavesVapid() {
  const par = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair
  const jwk = await crypto.subtle.exportKey('jwk', par.privateKey)
  return { publica: paraB64u(new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey))), privada: jwk.d! }
}

/** Manda 1 aviso. Devolve o código: 201 entregue; 404 e 410 = o aparelho saiu (apagar a inscrição). */
export async function enviarAviso(
  i: Inscricao,
  texto: string,
  chaves: { publica: string; privada: string },
  contato: string,
  buscar: typeof fetch = fetch,
) {
  const r = await buscar(i.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapid(i.endpoint, chaves.publica, chaves.privada, contato),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '43200',
      Urgency: 'normal',
    },
    body: await cifrar(texto, i),
  })
  return r.status
}
