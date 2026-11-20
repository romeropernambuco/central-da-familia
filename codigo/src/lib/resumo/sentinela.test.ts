import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { Inicio } from '../../telas/inicio/Inicio'
import { ResumoFamilia } from '../../telas/inicio/ResumoFamilia'
import { Cartoes } from '../../telas/cartoes/Cartoes'
import { MeuOrcamento } from '../../telas/meu-orcamento/MeuOrcamento'
import { Guardado } from '../../telas/guardado/Guardado'
import { CartaoGuardado } from '../../telas/guardado/CartaoGuardado'
import { ResumoDoMes } from '../../telas/lancamentos/Lancamentos'
import { NumerosAba } from '../../telas/escritorio/NumerosAba'
import { DocumentoTeste, NoTeste } from '../../telas/escritorio/numeros.dom-teste'
import { protegerApi } from '../../api/protegida'
import { definirEscopoLeitura } from '../../app/invalidacao'
import { normalizaGuardado } from '../../api/normaliza2'
import type { Api, FamiliaMinha, ResumoHoje } from '../../api/tipos'

const familia = { id: 'f', papel: 'casal', envelopeId: 'eu', membroId: 'm' } as FamiliaMinha
const hoje = '2026-11-17'
const resumo: ResumoHoje = {
  dias_restantes: 1,
  livre_mes: 8765,
  pode_gastar_hoje: 99,
  colchao: 0,
  explicacao: [],
  envelopes: [
    {
      id: 'eu',
      nome: 'Meu limite',
      regra: 'mensal',
      livre: 8765,
      limite_mes: 9999,
      gasto_mes: 1234,
      gasto_hoje: 678.91,
    },
  ],
}
function fonte() {
  const lancamento = {
    id: 'g',
    envelope_id: 'eu',
    data: hoje,
    criado_em: hoje,
    descricao: 'Compra',
    valor: 5432,
    cartao_id: null,
  }
  const interna = {
    modo: 'real',
    resumoHoje: vi.fn(async () => resumo),
    lancamentos: async () => [lancamento],
    recebimentos: async () => [],
    config: async (_f: string, k: string, padrao: unknown) =>
      k === 'entradas' ? [{ data: hoje, valor: 7654 }] : padrao,
    cartoes: async () => [
      { id: 'cartao-teste', nome: 'Cartão de teste', dia_fechamento: 12, dia_vencimento: 19, ativo: true },
    ],
    faturas: async () => [
      {
        cartao_id: 'cartao-teste',
        cartao: 'Cartão de teste',
        mes: '2026-11',
        vencimento: '2026-11-19',
        total: 3456.78,
        fechada: true,
      },
    ],
    faturasBanco: async () => [],
    guardadoHoje: async () =>
      normalizaGuardado({
        total: 9876,
        aplicacoes: [{ id: 'a', saldo: 9876 }],
        rendeu_hoje_liquido: 8765,
        rendeu_mes_liquido: 7654,
        rendeu_desde_inicio_liquido: 6543,
        por_dia_30: [],
        cdi_usado: { pct_ano: 10, data: hoje, fonte: 'teste' },
      }),
    escritorioHoje: async () => ({ funcionarios: [], entregue: [], trabalhando: [], precisa_de_voce: [] }),
    membros: async () => [],
  } as unknown as Api
  const api = protegerApi(interna)
  definirEscopoLeitura(api, 'sessao', familia)
  return { api, interna }
}
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function lerTela(
  el: ReturnType<typeof createElement>,
  api: Api,
  bloco?: string,
  atributo = 'data-bloco',
  oculto = false,
) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(hoje + 'T12:00:00Z'))
  const doc = new DocumentoTeste()
  Object.assign(NoTeste.prototype, {
    focus() {},
    closest() {
      return null
    },
    querySelectorAll() {
      return []
    },
  })
  vi.stubGlobal('document', doc)
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }),
  )
  vi.stubGlobal('location', { hash: '#/inicio?sem3d', search: '?sem3d' })
  vi.stubGlobal('localStorage', {
    getItem() {
      return null
    },
    removeItem() {},
  })
  vi.stubGlobal('Element', NoTeste)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const elRaiz = doc.createElement('div')
  doc.body.appendChild(elRaiz)
  const root = createRoot(elRaiz as unknown as HTMLElement)
  try {
    await act(async () =>
      root.render(
        createElement(
          ContextoApp.Provider,
          {
            value: { api, familia, resumo, sessao: null, versao: 0, oculto } as unknown as Ctx,
          },
          el,
        ),
      ),
    )
    if (el.type === NumerosAba)
      await act(async () => {
        await vi.dynamicImportSettled()
      })
    return bloco ? elRaiz.buscar(n => n.getAttribute(atributo) === bloco)[0].textContent : elRaiz.textContent
  } finally {
    await act(async () => root.unmount())
  }
}

it('orçamento sentinela percorre a aba, a leitura real do Início e a ficha do funcionário', async () => {
  const { api, interna } = fonte()
  expect(await lerTela(createElement(MeuOrcamento), api)).toContain('8.765')
  expect(interna.resumoHoje).not.toHaveBeenCalled()
  expect(await lerTela(createElement(ResumoFamilia), api, 'podeGastarHoje')).toContain('8.765')
  // no Início o número fica só no topo: o cartão do Resumo não repete
  expect(await lerTela(createElement(Inicio), api, 'podeGastarHoje')).not.toContain('8.765')
  expect(await lerTela(createElement(Inicio), api, 'podeGastarHoje', 'data-referencia')).toContain('8.765')
  expect(await lerTela(createElement(Inicio), api, 'podeGastarHoje', 'data-rotina')).toContain('8.765')
  expect(await lerTela(createElement(Inicio), api, 'saiu', 'data-frase')).toContain('678,91')
  expect(interna.resumoHoje).toHaveBeenCalledWith(familia.id)
  expect(await lerTela(createElement(NumerosAba, { id: 'anfitriao', fechar() {} }), api)).toContain('8.765')
})

it('Guardado sentinela chega à aba, cartão e funcionário pela leitura real', async () => {
  const { api } = fonte()
  expect(await lerTela(createElement(Guardado), api)).toContain('9.876')
  expect(await lerTela(createElement(CartaoGuardado), api)).toContain('9.876')
  expect(await lerTela(createElement(Inicio), api, 'aplicacoes', 'data-referencia')).toContain('9.876')
  expect(await lerTela(createElement(Inicio), api, 'aplicacoes', 'data-rotina')).toContain('8.765')
  expect(await lerTela(createElement(NumerosAba, { id: 'guardado', fechar() {} }), api)).toContain('9.876')
})

it('faturas sentinela chegam à aba, referência e rotina, com valores e contagem protegidos pelo olho', async () => {
  const { api } = fonte()
  expect(await lerTela(createElement(Cartoes), api)).toContain('3.456,78')
  expect(await lerTela(createElement(Inicio), api, 'faturas', 'data-referencia')).toContain('3.456,78')
  expect(await lerTela(createElement(Inicio), api, 'faturas', 'data-rotina')).toContain('conferir1')
  for (const superficie of ['data-referencia', 'data-rotina']) {
    const texto = await lerTela(createElement(Inicio), api, 'faturas', superficie, true)
    expect(texto).toContain('•••')
    expect(texto).not.toMatch(/3\.456,78|conferir1/)
  }
})

it('movimentação sentinela chega ao Início, à faixa da aba e ao funcionário', async () => {
  const { api } = fonte()
  expect(await lerTela(createElement(Inicio), api, 'movimentacaoMes')).toContain('2.222')
  expect(await lerTela(createElement(ResumoDoMes), api)).toContain('5.432')
  expect(await lerTela(createElement(NumerosAba, { id: 'contador', fechar() {} }), api)).toContain('5.432')
})
