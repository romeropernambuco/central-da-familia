import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { DocumentoTeste, NoTeste } from '../telas/escritorio/numeros.dom-teste'
import { ContextoApp, type Ctx } from '../app/contexto'
import { apiExemplo, reiniciarExemplo } from '../api/exemplo'
import { Backup } from './Backup'
import { BarraDesfazer } from './BarraDesfazer'
import { desfazer } from '../api/desfazer'
import { gerarCopia } from '../app/backup'
import { CadastroAssessor } from '../telas/casa/CadastroAssessor'
import { rascunhos } from '../app/rascunhos'
const roots: Root[] = []
afterEach(async () => {
  for (const r of roots.splice(0)) await act(async () => r.unmount())
  desfazer.limpar()
  rascunhos.clear()
  reiniciarExemplo()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
const props = (n: NoTeste) => Object.entries(n).find(([k]) => k.startsWith('__reactProps'))![1] as any
async function montar(el: ReactElement, extra: Partial<Ctx> = {}) {
  const doc = new DocumentoTeste()
  Object.assign(NoTeste.prototype, {
    focus() {},
    querySelectorAll() {
      return []
    },
  })
  vi.stubGlobal('document', doc)
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), {
      document: doc,
      HTMLElement: NoTeste,
      HTMLIFrameElement: class {},
      confirm: vi.fn().mockReturnValue(false),
    }),
  )
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const sessao = (await apiExemplo.sessao())!
  const ctx = {
    api: apiExemplo,
    sessao,
    familia: sessao.familias[0],
    versao: 0,
    oculto: true,
    toast: vi.fn(),
    tentar: async (f: () => Promise<unknown>) => {
      try {
        await f()
        return true
      } catch {
        return false
      }
    },
    recarregar: vi.fn(),
    trocarSessao: vi.fn(),
    ...extra,
  } as unknown as Ctx
  const box = doc.createElement('div')
  doc.body.appendChild(box)
  const root = createRoot(box as unknown as HTMLElement)
  roots.push(root)
  await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, el)))
  return {
    box,
    ctx,
    root,
    button: (texto: string) => box.buscar(n => n.tagName === 'BUTTON' && n.textContent === texto)[0],
  }
}
it('barra anuncia sem focar, pausa no mouse parado e permite repetir desfazer rejeitado', async () => {
  const a = await montar(createElement(BarraDesfazer))
  vi.useFakeTimers()
  const inverso = vi.fn().mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(true)
  await act(async () => desfazer.registrar({ rotulo: 'Teste', desfazer: inverso }))
  const barra = a.box.buscar(n => n.getAttribute('role') === 'status')[0]
  expect(barra).toBeDefined()
  await act(async () => props(barra).onMouseEnter())
  await act(async () => vi.advanceTimersByTime(30000))
  expect(a.button('Desfazer')).toBeDefined()
  await act(async () => a.button('Desfazer').click())
  expect(a.box.textContent).toContain('Não foi possível desfazer')
  await act(async () => a.button('Tentar de novo').click())
  expect(desfazer.atual).toBeNull()
  expect(inverso).toHaveBeenCalledTimes(2)
  await act(async () => desfazer.registrar({ rotulo: 'Outra ação', desfazer: async () => true }))
  await act(async () => props(a.box.buscar(n => n.getAttribute('role') === 'status')[0]).onMouseLeave())
  await act(async () => vi.advanceTimersByTime(10001))
  expect(desfazer.atual).toBeNull()
})
it('backup pede confirmação explícita para baixar e restauração real fica desabilitada após prévia', async () => {
  const copia = await gerarCopia(apiExemplo, 'fam-silva')
  const restaurar = vi.fn()
  const a = await montar(createElement(Backup), { api: { ...apiExemplo, modo: 'real', backupRestaurar: restaurar } })
  await act(async () => a.button('Baixar cópia de segurança').click())
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('mesmo com o olho fechado'))
  const entrada = a.box.buscar(n => n.tagName === 'INPUT' && n.getAttribute('type') === 'file')[0]
  await act(async () =>
    props(entrada).onChange({
      target: { files: [{ size: 100, text: async () => JSON.stringify(copia) }], value: 'arquivo' },
    }),
  )
  expect(a.box.textContent).toContain('Vai substituir')
  expect(a.box.textContent).toContain('Valores escondidos')
  const conf = a.box.buscar(n => n.tagName === 'INPUT' && n.getAttribute('class') === 'inp')[0]
  await act(async () => props(conf).onChange({ target: { value: 'RESTAURAR' } }))
  expect(props(a.button('Restaurar e substituir dados')).disabled).toBe(true)
  expect(restaurar).not.toHaveBeenCalled()
})
it('Assessor da Casa não monta backup nem solicita dados financeiros', async () => {
  const ler = vi.fn()
  const a = await montar(createElement(Backup), {
    familia: { id: 'f', papel: 'equipe', nome: 'Teste', membroNome: 'Teste', envelopeId: null },
    api: { ...apiExemplo, backupLer: ler },
  })
  expect(a.box.textContent).toBe('')
  expect(ler).not.toHaveBeenCalled()
})
it('cadastro conserva digitado após fechar e após falha, sem escrever no disco', async () => {
  const gravar = vi.fn().mockRejectedValue(new Error('Sem rede')),
    fechar = vi.fn(),
    disco = vi.fn()
  vi.stubGlobal('sessionStorage', { setItem: disco, getItem: disco })
  vi.stubGlobal('localStorage', { setItem: disco, getItem: disco })
  const extra = {
    oculto: false,
    api: { ...apiExemplo, config: async () => ({ pessoas: [], daePaga: {} }) as any, salvarConfig: gravar },
  }
  const a = await montar(createElement(CadastroAssessor, { fechar }), extra)
  const entrada = a.box.buscar(n => n.getAttribute('aria-label') === 'Nome do Assessor da Casa')[0]
  await act(async () => props(entrada).onChange({ target: { value: 'Nome fictício' } }))
  await act(async () => a.root.unmount())
  roots.splice(roots.indexOf(a.root), 1)
  const b = await montar(createElement(CadastroAssessor, { fechar }), extra)
  const recuperado = b.box.buscar(n => n.getAttribute('aria-label') === 'Nome do Assessor da Casa')[0]
  expect((recuperado as any).value).toBe('Nome fictício')
  const form = b.box.buscar(n => n.tagName === 'FORM')[0]
  await act(async () => props(form).onSubmit({ preventDefault() {} }))
  expect(gravar).toHaveBeenCalledTimes(1)
  expect(fechar).not.toHaveBeenCalled()
  expect((recuperado as any).value).toBe('Nome fictício')
  expect(disco).not.toHaveBeenCalled()
})
