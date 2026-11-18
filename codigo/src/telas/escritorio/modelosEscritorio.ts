/** Este módulo só é importado pelo chunk tardio da cena. Nada usa rede externa. */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-ignore: Three r160 sem declarações de tipos no projeto.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

type Entrada = { usuarios: number; controller: AbortController; promessa: Promise<any>; modelo?: any }
function liberarModelo(raiz: any) {
  const recursos = new Set<any>()
  raiz.traverse((m: any) => { if (m.geometry) recursos.add(m.geometry); if (m.material) for (const mat of [m.material].flat()) { recursos.add(mat); for (const v of Object.values(mat)) if ((v as any)?.isTexture) recursos.add(v) } })
  recursos.forEach(r => r.dispose())
}
/** Injeção permite testar cache/abort/parse sem sequer criar uma requisição real. */
export function criarCacheModelos(
  buscar: (url: string, opcoes: { signal: AbortSignal }) => Promise<{ ok: boolean; arrayBuffer(): Promise<ArrayBuffer> }> = (url, opcoes) => fetch(url, opcoes),
  decodificar: (bytes: ArrayBuffer) => Promise<any> = async bytes => (await new GLTFLoader().parseAsync(bytes, '')).scene,
  base = import.meta.env.BASE_URL,
) {
  const cache = new Map<string, Entrada>()
  // Somente bytes de assets locais imutáveis (41 nomes no inventário), nunca dados da família.
  // CPU/GPU decodificadas continuam limitadas aos leases ativos.
  const bytesProntos = new Map<string, ArrayBuffer>()
  return {
    adquirir(nomes: string[], sinal: AbortSignal) {
      if (sinal.aborted) return { pronto: Promise.resolve(null), liberar() {} }
      let liberado = false
      if (nomes.some(nome => !/^[a-zA-Z][a-zA-Z0-9]*$/.test(nome))) throw Error('nome de modelo inválido')
      const entradas = [...new Set(nomes)].map(nome => {
        let e = cache.get(nome)
        if (!e) {
          const controller = new AbortController()
          e = { usuarios: 0, controller, promessa: Promise.resolve() }
          const entrada = e
          e.promessa = (bytesProntos.has(nome) ? Promise.resolve(bytesProntos.get(nome)!) : buscar(base + 'modelos/escritorio/' + nome + '.glb', { signal: controller.signal })
            .then(r => { if (!r.ok) throw Error('modelo indisponível'); return r.arrayBuffer() })
            .then(bytes => { if (cache.get(nome) === entrada) bytesProntos.set(nome, bytes); return bytes }))
            .then(decodificar).then(modelo => {
              if (!entrada.usuarios) { liberarModelo(modelo); throw Error('carga cancelada') }
              entrada.modelo = modelo; return modelo
            }).catch(erro => { if (cache.get(nome) === entrada) bytesProntos.delete(nome); throw erro })
          cache.set(nome, e)
        }
        e.usuarios++
        return { nome, entrada: e }
      })
      const liberar = () => {
        if (liberado) return
        liberado = true; sinal.removeEventListener('abort', liberar)
        for (const { nome, entrada } of entradas) if (--entrada.usuarios === 0) {
          if (cache.get(nome) === entrada) cache.delete(nome)
          entrada.controller.abort()
          if (entrada.modelo) liberarModelo(entrada.modelo)
        }
      }
      sinal.addEventListener('abort', liberar, { once: true })
      if (sinal.aborted) liberar()
      // Falha de UMA peça mantém o fallback inteiro; as outras cargas também são soltas.
      const pronto = Promise.all(entradas.map(async ({ nome, entrada }) => [nome, await entrada.promessa] as const))
        .then(pares => liberado ? null : Object.fromEntries(pares)).catch(() => { liberar(); return null })
      return { pronto, liberar }
    },
    tamanho: () => cache.size,
    /** Limpeza explícita de bytes sem tocar em cenas ativas; útil também para testes isolados. */
    esquecerBytes() { if (cache.size) throw Error('modelos ainda em uso'); bytesProntos.clear() },
  }
}
export const modelosEscritorio = criarCacheModelos()
