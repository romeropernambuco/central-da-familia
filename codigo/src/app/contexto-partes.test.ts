// O contexto é entregue em partes para o app não redesenhar inteiro a cada mudança.
// Este teste conta os desenhos de verdade: quem assina só "quem está dentro" ou só "as ações"
// não pode ser desenhado de novo quando aparece um aviso, abre a folha de anotar ou fecha o olho.
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { protegerApi } from '../api/protegida'
import type { Api } from '../api/tipos'
import { DocumentoTeste, NoTeste } from '../telas/escritorio/numeros.dom-teste'
import {
  ContextoApp,
  Provedor,
  useAcoes,
  useApp,
  useDadosDoDia,
  useFolhaLancar,
  useOlhoApp,
  useSessaoAtual,
  type Ctx,
  type ParteAcoes,
} from './contexto'

const desenhos = { sessao: 0, acoes: 0, dados: 0, olho: 0, lancar: 0, inteiro: 0 }
let acoes: ParteAcoes
let inteiro: Ctx

function SoSessao() {
  useSessaoAtual()
  desenhos.sessao++
  return null
}
function SoAcoes() {
  acoes = useAcoes()
  desenhos.acoes++
  return null
}
function SoDados() {
  useDadosDoDia()
  desenhos.dados++
  return null
}
function SoOlho() {
  useOlhoApp()
  desenhos.olho++
  return null
}
function SoLancar() {
  useFolhaLancar()
  desenhos.lancar++
  return null
}
function Inteiro() {
  inteiro = useApp()
  desenhos.inteiro++
  return null
}

let raiz: Root | undefined
let caixa: InstanceType<typeof NoTeste>
const zerar = () => Object.keys(desenhos).forEach(k => (desenhos[k as keyof typeof desenhos] = 0))
const assentar = () =>
  act(async () => {
    await new Promise(r => setTimeout(r, 20))
  })

async function montar(filhos: ReactNode) {
  caixa = (document as unknown as DocumentoTeste).createElement('div')
  ;(document as unknown as DocumentoTeste).body.appendChild(caixa)
  raiz = createRoot(caixa as unknown as HTMLElement)
  const nova = raiz
  await act(async () => nova.render(filhos))
  await assentar()
  await assentar()
  zerar()
}

function apiDeTeste() {
  const familia = { id: 'f', membroId: 'm', membroNome: 'Teste', papel: 'casal', envelopeId: null }
  return protegerApi({
    modo: 'real',
    sessao: async () => ({ userId: 's', familias: [familia], dono: false }),
    resumoHoje: async () => ({ envelopes: [], livre_mes: 0, dias_restantes: 14 }),
    membros: async () => [],
  } as unknown as Api)
}

beforeEach(() => {
  const doc = new DocumentoTeste(),
    eventos = new EventTarget(),
    guardado = new Map<string, string>()
  Object.assign(doc.body, { classList: { toggle() {}, remove() {} } })
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', Object.assign(eventos, { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }))
  vi.stubGlobal('addEventListener', eventos.addEventListener.bind(eventos))
  vi.stubGlobal('removeEventListener', eventos.removeEventListener.bind(eventos))
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => guardado.get(k) ?? null,
    setItem: (k: string, v: string) => void guardado.set(k, v),
    removeItem: (k: string) => void guardado.delete(k),
  })
  vi.stubGlobal('location', { hash: '#/inicio', search: '', pathname: '/' })
  vi.stubGlobal('navigator', { onLine: true })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
})
afterEach(async () => {
  const montada = raiz
  raiz = undefined
  if (montada) await act(async () => montada.unmount())
  vi.unstubAllGlobals()
})

const fontes = import.meta.glob<string>('../{app,componentes,telas}/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})
it('nenhuma tela ou peça do app pega o contexto inteiro: cada uma assina a parte que usa', () => {
  // useApp() faz a tela ser desenhada de novo a qualquer mudança. Hoje ninguém precisa dele; que continue assim.
  const quemPega = Object.entries(fontes)
    .filter(([p]) => !/\.(test|dom-teste|fixture)\.tsx?$/.test(p) && p !== './contexto.tsx')
    .filter(([, codigo]) => /\buseApp\s*\(/.test(codigo))
    .map(([p]) => p)
  expect(Object.keys(fontes).length).toBeGreaterThan(100)
  expect(quemPega).toEqual([])
})

describe('contexto em partes: só é desenhado de novo quem assina a parte que mudou', () => {
  const todos = [SoSessao, SoAcoes, SoDados, SoOlho, SoLancar, Inteiro].map((C, i) => createElement(C, { key: i }))
  const app = () => createElement(Provedor, { api: apiDeTeste(), children: todos })

  it('aviso na tela: nenhuma tela é desenhada de novo', async () => {
    await montar(app())
    await act(async () => acoes.toast('Salvo'))
    expect(caixa.textContent).toContain('Salvo')
    expect(desenhos).toEqual({ sessao: 0, acoes: 0, dados: 0, olho: 0, lancar: 0, inteiro: 0 })
  })
  it('abrir a folha de anotar: só quem assina a folha (e quem pega tudo)', async () => {
    await montar(app())
    await act(async () => acoes.abrirLancar({ valor: 10 }))
    expect(desenhos).toEqual({ sessao: 0, acoes: 0, dados: 0, olho: 0, lancar: 1, inteiro: 1 })
  })
  it('fechar o olho: só quem assina o olho (e quem pega tudo)', async () => {
    await montar(app())
    await act(async () => acoes.alternarOculto())
    expect(desenhos).toEqual({ sessao: 0, acoes: 0, dados: 0, olho: 1, lancar: 0, inteiro: 1 })
    await act(async () => acoes.alternarOculto())
  })
  it('recarregar: as ações continuam as mesmas funções e quem só quer a sessão fica quieto', async () => {
    await montar(app())
    const antes = { ...acoes }
    await act(async () => {
      await acoes.recarregar()
    })
    await assentar()
    expect(desenhos.acoes).toBe(0)
    expect(desenhos.sessao).toBe(0)
    expect(desenhos.dados).toBeGreaterThan(0)
    for (const k of Object.keys(antes) as (keyof ParteAcoes)[]) expect(acoes[k], k).toBe(antes[k])
  })
  it('conferir a sessao de novo e ela vir igual: a familia continua o mesmo objeto e ninguem e redesenhado', async () => {
    // varias telas refazem a busca quando a familia muda; se ela virasse objeto novo a cada conferencia, buscariam a toa
    await montar(app())
    const antes = inteiro.familia
    await act(async () => {
      await acoes.trocarSessao()
    })
    await assentar()
    expect(inteiro.familia).toBe(antes)
    expect(desenhos.sessao).toBe(0)
  })
  it('quem pega tudo recebe os mesmos campos de antes', async () => {
    await montar(app())
    expect(Object.keys(inteiro).sort()).toEqual(
      [
        'abrirLancar',
        'alternarOculto',
        'api',
        'erro',
        'erroResumo',
        'explicar',
        'familia',
        'fecharLancar',
        'lancarAberto',
        'nomesMudaram',
        'oculto',
        'recarregar',
        'resumo',
        'sair',
        'semRede',
        'sessao',
        'tentar',
        'toast',
        'trocarSessao',
        'versao',
      ].sort(),
    )
    expect(inteiro.familia?.id).toBe('f')
    expect(inteiro.resumo).toBeTruthy()
  })
  it('tela montada sozinha com o contexto inteiro (teste, prévia) continua recebendo cada parte', async () => {
    const falso = { oculto: true, familia: { id: 'f' }, versao: 7, lancarAberto: null } as unknown as Ctx
    let visto: unknown[] = []
    function Le() {
      visto = [useOlhoApp().oculto, useSessaoAtual().familia?.id, useDadosDoDia().versao, useFolhaLancar().lancarAberto]
      return null
    }
    await montar(createElement(ContextoApp.Provider, { value: falso }, createElement(Le)))
    expect(visto).toEqual([true, 'f', 7, null])
  })
})
