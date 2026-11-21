import { act, createElement } from 'react'
import { esconderValores } from './lib/olho'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, it, expect, vi } from 'vitest'
import { DocumentoTeste, NoTeste } from './telas/escritorio/numeros.dom-teste'
import { ContextoApp, type Ctx } from './app/contexto'
import { apiExemplo } from './api/exemplo'
import { Guardado } from './telas/guardado/Guardado'
import { Inicio } from './telas/inicio/Inicio'
import { MeuOrcamento } from './telas/meu-orcamento/MeuOrcamento'
import { Casa } from './telas/casa/Casa'
import { NumerosAba } from './telas/escritorio/NumerosAba'
import { Escritorio } from './telas/escritorio/Escritorio'
import { Privacidade } from './telas/privacidade/Privacidade'
import { definirModoFuncionario } from './telas/escritorio/AgenteDaAba'
const h = vi.hoisted(() => ({ g: null as any, estado: 'ok', motivo: 'segredo', e: null as any, atualizar: vi.fn() }))
vi.mock('./app/useDados2', () => ({
  useGuardado: () => ({ ...h, motivo: 'segredo' }),
  useFuturo: () => ({ saida: null }),
  useEscritorio: () => ({ ...h, perguntas: [], responder: vi.fn() }),
}))
let ctx: Ctx, doc: DocumentoTeste, box: NoTeste, root: ReturnType<typeof createRoot>
beforeEach(async () => {
  doc = new DocumentoTeste()
  Object.assign(NoTeste.prototype, {
    focus() {},
    closest() {
      return null
    },
    querySelectorAll() {
      return []
    },
    getBoundingClientRect() {
      return { width: 800, height: 400 }
    },
  })
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('Element', NoTeste)
  vi.stubGlobal('window', {
    document: doc,
    HTMLElement: NoTeste,
    HTMLIFrameElement: class {},
    innerWidth: 1200,
    addEventListener() {},
    removeEventListener() {},
  })
  vi.stubGlobal('location', { hash: '#/escritorio?aba=hoje&sem3d=1', search: '', pathname: '/' })
  vi.stubGlobal('localStorage', {
    getItem() {
      return null
    },
    setItem() {},
  })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => {}) } })
  const sessao = (await apiExemplo.sessao())!,
    familia = sessao.familias[0]
  ctx = {
    api: { ...apiExemplo, membros: async () => [] },
    sessao: { ...sessao, dono: false },
    familia,
    resumo: await apiExemplo.resumoHoje(familia.id),
    versao: 0,
    oculto: false,
    tentar: async (f: any) => {
      await f()
      return true
    },
    toast() {},
    explicar() {},
    recarregar: async () => {},
    abrirLancar() {},
  } as unknown as Ctx
  h.g = await apiExemplo.guardadoHoje(familia.id)
  h.e = await apiExemplo.escritorioHoje(familia.id)
  h.estado = 'ok'
  definirModoFuncionario('compacto')
  box = doc.createElement('div')
  doc.body.appendChild(box)
  root = createRoot(box as unknown as HTMLElement)
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})
async function render(T: any, props = {}) {
  await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, createElement(T, props))))
}
const button = (s: string) => box.buscar(n => n.tagName === 'BUTTON' && n.textContent === s)[0]
it('2: cache com falha avisa e permite repetir', async () => {
  h.estado = 'erro'
  await render(Guardado)
  expect(box.textContent).toMatch(/dados desatualizados/i)
  await act(async () => button('Tentar de novo').click())
  expect(h.atualizar).toHaveBeenCalled()
})
it.each([Inicio, MeuOrcamento, Casa])('3: distingue erro e permite repetir', async T => {
  ctx.api = {
    ...ctx.api,
    lancamentos: vi.fn(async () => {
      throw Error('segredo')
    }),
  }
  await render(T)
  expect(box.textContent).toContain('Não foi possível conferir')
  expect(button('Tentar de novo')).toBeDefined()
  expect(box.textContent).not.toMatch(/Nenhum gasto ainda|nenhuma compra hoje|Já saiu hoje|Você gastou ontem/)
  await act(async () => button('Tentar de novo').click())
  expect(ctx.api.lancamentos).toHaveBeenCalledTimes(2)
})
it('3: números não usam exemplo após erro real', async () => {
  ctx.sessao = { ...ctx.sessao!, dono: true }
  ctx.api = {
    ...ctx.api,
    modo: 'real',
    numerosSemana: async () => {
      throw Error('falha')
    },
  }
  await render(NumerosAba, { id: 'analista', fechar() {} })
  await act(async () => {
    await vi.dynamicImportSettled()
  })
  expect(box.textContent).toContain('Não foi possível conferir')
  expect(box.textContent).not.toContain('Modo exemplo')
  expect(button('Tentar de novo')).toBeDefined()
})
it('6: imóvel explica venda com contrato', async () => {
  await render(Guardado)
  await act(async () => {
    await new Promise(r => setTimeout(r, 100))
  })
  expect(box.textContent).toContain('venda com contrato')
  expect(box.textContent).not.toContain('nunca vira saque')
})
it('7: queda do saldo não aparece como parado', async () => {
  h.g.saldo_30 = [
    { data: '2026-11-01', saldo: 300 },
    { data: '2026-11-15', saldo: 200 },
  ]
  await render(Guardado)
  expect(box.textContent).toContain('Caiu')
  expect(box.textContent).not.toContain('Ficou parado')
})
it('8: só texto não oferece abrir cena', async () => {
  await render(Escritorio)
  expect(box.textContent).not.toContain('Ver o escritório completo em 3D')
})
it('12: erro do escritório não mostra motivo cru', async () => {
  h.e = null
  h.estado = 'erro'
  await render(Escritorio)
  expect(box.textContent).not.toContain('segredo')
  expect(box.textContent).toContain('Não foi possível conferir')
})
it.each(['pessoa', 'equipe'])('13: termo respeita papel %s', async papel => {
  ctx.familia = { ...ctx.familia!, papel: papel as any }
  await render(Privacidade)
  expect(box.textContent).not.toContain('Você vê tudo')
  expect(box.textContent).not.toContain('Você pode baixar tudo a qualquer hora e apagar a família inteira')
})
it('14: rendimento diário tem lista acessível', async () => {
  await render(Guardado)
  await act(async () => button('Rendeu por dia').click())
  expect(box.buscar(n => n.tagName === 'UL' && n.getAttribute('aria-label') === 'Rendimento por dia')).toHaveLength(1)
})
it('10 e 11: cópia respeita dono, período e retorno do clipboard', async () => {
  const rel = {
    funcionarios: [{ funcionario: 'secretaria', perguntas: 1, respondidas: 1, pendentes: 0, tempo_medio_min: 20 }],
    diario: [
      { id: 'd', quando: '2026-11-01T12:00:00-03:00', funcionario: 'secretaria', pergunta: 'Teste', resposta: 'Feito' },
    ],
  }
  let falhar = false
  ctx.api = {
    ...ctx.api,
    escritorioRelatorio: vi.fn(async () => {
      if (falhar) throw Error('segredo')
      return rel as any
    }),
  }
  await render(Escritorio)
  await act(async () => button('Relatório').click())
  await act(async () => button('Copiar relatório').click())
  expect(vi.mocked(navigator.clipboard.writeText).mock.calls[0][0]).not.toContain('Demora pra responder')
  falhar = true
  await act(async () => button('Últimos 30 dias').click())
  expect(box.textContent).toContain('Não foi possível conferir')
  expect(button('Copiar relatório')).toBeUndefined()
})
it('11: clipboard indisponível não confirma cópia', async () => {
  ctx.api = {
    ...ctx.api,
    escritorioRelatorio: async () =>
      ({
        funcionarios: [],
        diario: [
          {
            id: 'd',
            quando: '2026-11-01T12:00:00-03:00',
            funcionario: 'secretaria',
            pergunta: 'Teste',
            resposta: 'Feito',
          },
        ],
      }) as any,
  }
  vi.mocked(navigator.clipboard.writeText).mockRejectedValue(Error('indisponível'))
  await render(Escritorio)
  await act(async () => button('Relatório').click())
  await act(async () => button('Copiar relatório').click())
  expect(box.textContent).not.toContain('Relatório copiado')
  expect(box.textContent).toContain('Não foi possível copiar')
})
it('11: período pendente não recebe título novo em resultado antigo', async () => {
  let completar!: (v: any) => void
  ctx.api = {
    ...ctx.api,
    escritorioRelatorio: vi
      .fn()
      .mockResolvedValueOnce({ funcionarios: [], diario: [] })
      .mockImplementationOnce(() => new Promise(r => (completar = r))),
  }
  await render(Escritorio)
  await act(async () => button('Relatório').click())
  await act(async () => button('Últimos 30 dias').click())
  expect(box.textContent).toContain('Abrindo o diário')
  expect(box.textContent).not.toContain('Perguntas feitas')
  expect(button('Últimos 7 dias')).toBeDefined()
  await act(async () => completar({ funcionarios: [], diario: [] }))
  expect(box.textContent).toContain('Perguntas feitas')
})
it('4: guardado oculto protege meses, curva, barras e lista diária', async () => {
  ctx.oculto = true
  esconderValores(true)
  try {
    await render(Guardado)
    expect(box.textContent).not.toContain('do seu combinado')
    expect(box.buscar(n => n.tagName === 'POLYLINE')).toHaveLength(0)
    await act(async () => button('Rendeu por dia').click())
    expect(box.buscar(n => n.getAttribute('class') === 'barras30')).toHaveLength(0)
    const lista = box.buscar(n => n.tagName === 'UL' && n.getAttribute('aria-label') === 'Rendimento por dia')[0]
    expect(lista.childNodes).toHaveLength(h.g.por_dia_30.length)
    expect(lista.textContent).toContain('•••')
    expect(lista.textContent).not.toMatch(/R\$/)
  } finally {
    esconderValores(false)
  }
})
import { Lancamentos } from './telas/lancamentos/Lancamentos'
import { hojeRecife } from './lib/formato'
it('parcelas: leitura da lista mostra somente a compra original', async () => {
  const data = hojeRecife(),
    base = {
      id: 'compra',
      cartao_id: null,
      envelope_id: ctx.resumo!.envelopes[0].id,
      data,
      valor: 300,
      parcelas: 3,
      descricao: 'Compra teste única',
      criado_em: data + 'T12:00:00-03:00',
      apagado_em: null,
    }
  ctx.api = {
    ...ctx.api,
    lancamentos: async () => [
      base,
      { ...base, id: 'compra#1', valor: 100, parcelas: 1, parcela: { n: 1, de: 3, compra: data } },
    ],
  }
  await render(Lancamentos)
  expect(box.textContent.split('Compra teste única')).toHaveLength(2)
})
