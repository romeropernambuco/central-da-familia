// Roda o service worker de verdade (o modelo carimbado) com cache e rede de mentira.
import { describe, expect, it } from 'vitest'
import modelo from './sw.modelo.js?raw'
// @ts-ignore: script de build em JS puro
import { montarSw, cascaDoManifesto } from '../scripts/sw.mjs'

const PASTA = 'https://exemplo.github.io/central-da-familia/app/'
const central = (versao: string) => 'central-' + encodeURIComponent(PASTA) + ':' + versao
type Resp = { ok: boolean; type: string; redirected: boolean; corpo: string; clone(): Resp }
const resp = (corpo: string, ok = true): Resp => ({
  ok,
  type: 'basic',
  redirected: false,
  corpo,
  clone() {
    return resp(corpo, ok)
  },
})

function ligar(
  versao: string,
  rede: (url: string) => Resp | Error,
  cachesAntigos: Record<string, Map<string, Resp>> = {},
  quota = false,
) {
  const fonte = montarSw(modelo, ['index.html', 'assets/index-abc.js', 'assets/index-abc.css'], versao)
  const guardados = new Map<string, Map<string, Resp>>(Object.entries(cachesAntigos))
  const url = (r: any) => (typeof r === 'string' ? r : r.url)
  const caches = {
    async open(n: string) {
      if (!guardados.has(n)) guardados.set(n, new Map())
      const m = guardados.get(n)!
      return {
        async match(r: any) {
          return m.get(url(r))
        },
        async put(r: any, v: Resp) {
          if (quota) throw new Error('QuotaExceededError')
          m.set(url(r), v)
        },
        async addAll(rs: any[]) {
          for (const r of rs) {
            const x = rede(url(r))
            if (x instanceof Error || !x.ok) throw new Error('falhou ' + url(r))
            m.set(url(r), x)
          }
        },
      }
    },
    async keys() {
      return [...guardados.keys()]
    },
    async delete(n: string) {
      return guardados.delete(n)
    },
    async match(r: any) {
      for (const m of guardados.values()) {
        const v = m.get(url(r))
        if (v) return v
      }
      return undefined
    },
  }
  const ouvintes: Record<string, (e: any) => void> = {}
  const self = {
    location: { href: PASTA + 'sw.js' },
    addEventListener: (t: string, f: (e: any) => void) => {
      ouvintes[t] = f
    },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  }
  const fetch = async (r: any) => {
    const x = rede(url(r))
    if (x instanceof Error) throw x
    return x
  }
  class Request {
    url: string
    constructor(u: string) {
      this.url = u
    }
  }
  new Function('self', 'caches', 'fetch', 'Request', 'URL', fonte)(self, caches, fetch, Request, URL)
  const dispara = async (tipo: string, extra: any = {}) => {
    let espera: Promise<unknown> | undefined, resposta: Promise<Resp> | undefined
    ouvintes[tipo]({
      ...extra,
      waitUntil: (p: Promise<unknown>) => {
        espera = p
      },
      respondWith: (p: Promise<Resp>) => {
        resposta = p
      },
    })
    await espera
    return resposta
  }
  const pede = (caminho: string, mode = 'no-cors') =>
    dispara('fetch', { request: { method: 'GET', url: caminho.startsWith('http') ? caminho : PASTA + caminho, mode } })
  return { guardados, dispara, pede }
}

describe('service worker', () => {
  it('preserva a casca em uso até a ativação e lê somente da versão ativa', async () => {
    let offline = false
    const glb = 'modelos/escritorio/desk.glb?v=2'
    const legado = 'central-0123456789ab'
    const sw = ligar('v2', u => (offline ? new Error('Offline') : resp('v2 ' + u)), {
      [central('v1')]: new Map([[PASTA + glb, resp('GLB v1')]]),
      [legado]: new Map([[PASTA + 'index.html', resp('HTML v1')]]),
      'outro-site': new Map(),
    })
    await sw.dispara('install')
    expect(sw.guardados.has(central('v1'))).toBe(true)
    expect((await sw.pede(glb))!.corpo).toBe('v2 ' + PASTA + glb)
    offline = true
    expect((await sw.pede('', 'navigate'))!.corpo).toBe('v2 ' + PASTA + 'index.html')
    await sw.dispara('activate')
    expect([...sw.guardados.keys()].sort()).toEqual([central('v2'), 'outro-site'])
    expect((await sw.pede(glb))!.corpo).toBe('v2 ' + PASTA + glb)
    expect([...sw.guardados.get(central('v2'))!.keys()]).toEqual([
      PASTA + 'index.html',
      PASTA + 'assets/index-abc.js',
      PASTA + 'assets/index-abc.css',
      PASTA + glb,
    ])
  })
  it('entrega a resposta válida mesmo se cache.put falhar por quota', async () => {
    const sw = ligar('v2', u => resp('rede ' + u), {}, true)
    await sw.dispara('install')
    expect((await sw.pede('assets/tardio.js'))!.corpo).toBe('rede ' + PASTA + 'assets/tardio.js')
    expect((await sw.pede('', 'navigate'))!.corpo).toBe('rede ' + PASTA)
    expect(sw.guardados.get(central('v2'))!.has(PASTA + 'assets/tardio.js')).toBe(false)
  })
  it('página de erro (404, portal do wi-fi) nunca substitui a casca guardada', async () => {
    let fora = false
    const sw = ligar('v2', u => (fora ? resp('<h1>404 do GitHub</h1>', false) : resp('casca boa ' + u)))
    await sw.dispara('install')
    fora = true
    const r = await (await sw.pede('', 'navigate'))!
    expect(r.corpo).toContain('casca boa')
    expect(sw.guardados.get(central('v2'))!.get(PASTA + 'index.html')!.corpo).toContain('casca boa')
  })
  it('sem internet: a página e os arquivos saem do cache; com internet entrega a página nova sem misturar as duas cascas', async () => {
    let modo: 'ok' | 'fora' | 'novo' = 'ok'
    const sw = ligar('v2', u =>
      modo === 'fora' ? new Error('Failed to fetch') : resp((modo === 'novo' ? 'casca nova ' : 'casca ') + u),
    )
    await sw.dispara('install')
    modo = 'fora'
    expect((await (await sw.pede('', 'navigate'))!).corpo).toContain('casca ')
    expect((await (await sw.pede('assets/index-abc.js'))!).corpo).toContain('index-abc.js')
    modo = 'novo'
    expect((await (await sw.pede('', 'navigate'))!).corpo).toContain('casca nova')
    expect(sw.guardados.get(central('v2'))!.get(PASTA + 'index.html')!.corpo).toBe('casca ' + PASTA + 'index.html')
  })
  it('não mexe no que está fora da pasta do app (o painel antigo na mesma conta do GitHub) nem em gravação', async () => {
    const sw = ligar('v2', u => resp(u))
    expect(await sw.pede('https://exemplo.github.io/central-da-familia/index.html', 'navigate')).toBeUndefined()
    expect(await sw.pede('https://kcwaxvvivdckebjmjbkb.supabase.co/rest/v1/lancamentos')).toBeUndefined()
    expect(await sw.dispara('fetch', { request: { method: 'POST', url: PASTA + 'x', mode: 'cors' } })).toBeUndefined()
  })
})

it('precache segue imports estáticos de Inicio e do backend, sem as arestas das rotas pesadas', () => {
  const manifesto = {
    'index.html': { file: 'assets/index.js', dynamicImports: ['partida'] },
    partida: {
      file: 'assets/partida.js',
      css: ['assets/partida.css'],
      dynamicImports: ['Inicio', 'real', 'Escritorio'],
    },
    real: { file: 'assets/real.js', imports: ['comum'] },
    Inicio: { file: 'assets/Inicio.js', css: ['assets/Inicio.css'], imports: ['comum'], dynamicImports: ['Three'] },
    comum: { file: 'assets/comum.js', assets: ['assets/fonte.woff2'] },
  }
  expect(cascaDoManifesto(manifesto, ['index.html', 'partida', 'real', 'Inicio'])).toEqual([
    'index.html',
    'assets/index.js',
    'assets/partida.js',
    'assets/partida.css',
    'assets/real.js',
    'assets/comum.js',
    'assets/fonte.woff2',
    'assets/Inicio.js',
    'assets/Inicio.css',
  ])
})
