import { useEffect, useSyncExternalStore } from 'react'
import { useSessaoAtual } from './contexto'

/**
 * Fotos de rosto da família (pedido do dono, 24/11/2026): uma lista só para o app inteiro.
 * Quando alguém troca a foto, todos os círculos com aquele rosto mudam na hora.
 */
let fotos: Record<string, string> = {}
let carregadaDe = ''
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach(f => f())
const assinar = (f: () => void) => {
  ouvintes.add(f)
  return () => {
    ouvintes.delete(f)
  }
}
const ler = () => fotos

export function useFotos() {
  const { api, familia } = useSessaoAtual()
  const atual = useSyncExternalStore(assinar, ler, ler)
  const id = familia?.id
  useEffect(() => {
    if (!id || carregadaDe === id || typeof api.fotosDaFamilia !== 'function') return
    carregadaDe = id
    api
      .fotosDaFamilia(id)
      .then(f => {
        fotos = { ...f, ...fotos }
        avisar()
      })
      .catch(() => {
        carregadaDe = ''
      })
  }, [api, id])
  return {
    fotos: atual,
    async trocar(envelope: string, base64Jpeg: string) {
      if (!id) throw new Error('Entre na família para trocar a foto.')
      await api.fotoSubir(id, envelope, base64Jpeg)
      fotos = { ...fotos, [envelope]: `data:image/jpeg;base64,${base64Jpeg}` }
      avisar()
    },
  }
}

/** Recorta a foto no meio, em quadrado de 320 px, e devolve em JPEG (base64, sem o prefixo). Fica com uns 20 a 40 KB. */
export async function fotoQuadrada(arquivo: File): Promise<string> {
  const imagem = await createImageBitmap(arquivo)
  const lado = Math.min(imagem.width, imagem.height)
  const tela = document.createElement('canvas')
  tela.width = 320
  tela.height = 320
  const ctx = tela.getContext('2d')
  if (!ctx) throw new Error('Este celular não conseguiu preparar a foto.')
  ctx.drawImage(imagem, (imagem.width - lado) / 2, (imagem.height - lado) / 2, lado, lado, 0, 0, 320, 320)
  imagem.close?.()
  return tela.toDataURL('image/jpeg', 0.85).split(',')[1] || ''
}
