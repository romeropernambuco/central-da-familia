import { describe, expect, it } from 'vitest'
import { chavesDaMensagem, cifrar, deB64u, gerarChavesVapid, jwkP256, paraB64u, vapid } from './webpush'

const td = new TextDecoder()
const ecdhAlg = { name: 'ECDH', namedCurve: 'P-256' }

/** O que o celular faz ao receber: decifra com a chave dele (RFC 8291). Só para o teste conferir a ida e volta. */
async function decifrarComoCelular(msg: Uint8Array, uaPub: Uint8Array, uaPriv: CryptoKey, segredo: Uint8Array) {
  const sal = msg.slice(0, 16)
  const idlen = msg[20]
  const asPub = msg.slice(21, 21 + idlen)
  const asChave = await crypto.subtle.importKey('raw', asPub, ecdhAlg, false, [])
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asChave }, uaPriv, 256))
  const { cek, nonce } = await chavesDaMensagem(ecdh, segredo, uaPub, asPub, sal)
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt'])
  const claro = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aes, msg.slice(21 + idlen)))
  expect(claro.at(-1)).toBe(2)
  return td.decode(claro.slice(0, -1))
}

describe('aviso no celular (Web Push)', () => {
  it('o exemplo oficial da norma (RFC 8291, apêndice A) sai igual, byte a byte', async () => {
    const msg = await cifrar(
      'When I grow up, I want to be a watermelon',
      {
        p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
        auth: 'BTBZMqHH6r4Tts7J_aSIgg',
      },
      {
        sal: deB64u('DGv6ra1nlYgDCS1FRnbzlw'),
        publica: deB64u('BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8'),
        privada: deB64u('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw'),
      },
    )
    expect(paraB64u(msg)).toBe(
      'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
    )
  })

  it('o celular decifra o aviso que o servidor cifrou (chaves novas a cada vez)', async () => {
    const ua = (await crypto.subtle.generateKey(ecdhAlg, true, ['deriveBits'])) as CryptoKeyPair
    const uaPub = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey))
    const segredo = crypto.getRandomValues(new Uint8Array(16))
    const texto = 'Hoje é o prazo de um dinheiro na rua.'
    const msg = await cifrar(texto, { p256dh: paraB64u(uaPub), auth: paraB64u(segredo) })
    expect(await decifrarComoCelular(msg, uaPub, ua.privateKey, segredo)).toBe(texto)
    // 2 avisos iguais nunca saem iguais (sal e chave novos)
    const outra = await cifrar(texto, { p256dh: paraB64u(uaPub), auth: paraB64u(segredo) })
    expect(paraB64u(outra)).not.toBe(paraB64u(msg))
  })

  it('o VAPID é um JWT ES256 válido, para a origem do serviço, que vence em 12 horas', async () => {
    const chaves = await gerarChavesVapid()
    const agora = Date.UTC(2026, 10, 22, 22, 0, 0)
    const h = await vapid(
      'https://fcm.googleapis.com/fcm/send/abc',
      chaves.publica,
      chaves.privada,
      'https://exemplo.app',
      agora,
    )
    const [, jwt, k] = /^vapid t=([^,]+), k=(.+)$/.exec(h)!
    expect(k).toBe(chaves.publica)
    const [cab, corpo, assinatura] = jwt.split('.')
    expect(JSON.parse(td.decode(deB64u(cab)))).toEqual({ typ: 'JWT', alg: 'ES256' })
    expect(JSON.parse(td.decode(deB64u(corpo)))).toEqual({
      aud: 'https://fcm.googleapis.com',
      exp: agora / 1000 + 12 * 3600,
      sub: 'https://exemplo.app',
    })
    const pub = await crypto.subtle.importKey(
      'jwk',
      jwkP256(deB64u(chaves.publica)),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    )
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pub,
      deB64u(assinatura),
      new TextEncoder().encode(`${cab}.${corpo}`),
    )
    expect(ok).toBe(true)
    expect(deB64u(chaves.publica)).toHaveLength(65)
    expect(deB64u(chaves.privada)).toHaveLength(32)
  })
})
