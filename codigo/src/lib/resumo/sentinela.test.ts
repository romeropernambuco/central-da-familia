import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { Inicio } from '../../telas/inicio/Inicio'
import { MeuOrcamento } from '../../telas/meu-orcamento/MeuOrcamento'
import { Guardado } from '../../telas/guardado/Guardado'
import { CartaoGuardado } from '../../telas/guardado/CartaoGuardado'
import { ResumoDoMes } from '../../telas/lancamentos/Lancamentos'
import { numerosDaAba } from '../../telas/escritorio/numeros'
import { NumerosAba } from '../../telas/escritorio/NumerosAba'
import { DocumentoTeste, NoTeste } from '../../telas/escritorio/numeros.dom-teste'
import type { Api, FamiliaMinha, GuardadoHoje } from '../../api/tipos'
const fake = vi.hoisted(() => ({ leitura: { doMes: [], ult: [] } as unknown }))
vi.mock('../../app/useLeituraRemota', () => ({ useLeituraRemota: () => ({ dado: fake.leitura, carregando: false, erro: '' }) }))
vi.mock('../../app/useConfig', () => ({ useConfig: (_k: string, padrao: unknown) => [padrao, vi.fn(), '', true] }))
vi.mock('../../app/useMembros', () => ({ useMembros: () => () => 'Pessoa', useAdultos: () => 1 }))
vi.mock('../../componentes/RumoA2029', () => ({ RumoA2029: () => null }))
vi.mock('../../telas/escritorio/PrecisaDeVoce', () => ({ PrecisaDeVoce: () => null }))
vi.mock('../../componentes/RitmoMes', () => ({ RitmoMes: () => null }))
vi.mock('../../telas/guardado/Imoveis', () => ({ Imoveis: () => null }))
vi.mock('../../app/useDados2', () => ({ useGuardado: () => ({ estado: 'ok', g: { aplicacoes: [{ id: 'a', saldo: 1 }], por_dia_30: [], cdi_usado: { pct_ano: 10, data: '2026-11-17', fonte: 'teste' }, total: 1, rendeu_hoje_liquido: 1, explicacao: [] } }), useFuturo: () => ({ saida: null }) }))
vi.mock('./orcamento', async original => ({ ...await original<typeof import('./orcamento')>(), destaqueOrcamento: (r: any) => ({ meu: r.envelopes[0], numero: { valor: 8765, estado: 'ok', linhas: [], usado: 0, devendo: 0, passouHoje: 0 }, valor: 8765, escopo: 'pessoal', livre: 20 }), numeroEnvelope: () => ({ valor: 8765, estado: 'ok', linhas: [], usado: 0, devendo: 0, passouHoje: 0 }) }))
vi.mock('./guardado', async original => ({ ...await original<typeof import('./guardado')>(), totaisGuardado: () => ({ total: 9876, hoje: 8765, mes: 7654, desdeInicio: 6543 }) }))
vi.mock('./movimentacao', async original => ({ ...await original<typeof import('./movimentacao')>(), totaisDoMes: () => ({ saiu: 8765, entrou: 9876, saldo: 1111, previsto: 2222 }) }))
const familia = { id: 'f', papel: 'casal', envelopeId: 'eu', membroId: 'm' } as FamiliaMinha
const resumo = { dias_restantes: 10, livre_mes: 20, colchao: 0, envelopes: [{ id: 'eu', nome: 'Meu limite', regra: 'mensal', livre: 20, limite_mes: 30, gasto_mes: 10, meu: true }] }
const api = { modo: 'real', resumoHoje: async () => resumo, lancamentos: async () => [], recebimentos: async () => [], guardadoHoje: async () => ({ total: 1 } as GuardadoHoje) } as unknown as Api
function render(componente: typeof Inicio | typeof MeuOrcamento | typeof Guardado | typeof CartaoGuardado | typeof ResumoDoMes) {
  return renderToStaticMarkup(createElement(ContextoApp.Provider, { value: { api, familia, resumo, versao: 0, oculto: false } as unknown as Ctx }, createElement(componente)))
}
async function renderFuncionario(id: string) {
  const doc = new DocumentoTeste()
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }))
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const el = doc.createElement('div'); doc.body.appendChild(el)
  const root = createRoot(el as unknown as HTMLElement)
  try {
    await act(async () => root.render(createElement(ContextoApp.Provider, { value: { api, familia, sessao: null, versao: 0, oculto: false } as unknown as Ctx }, createElement(NumerosAba, { id, fechar() {} }))))
    return el.textContent
  } finally { await act(async () => root.unmount()); vi.unstubAllGlobals() }
}
it('orçamento sentinela chega à aba, Início e cálculo consumido pelo funcionário', async () => {
  fake.leitura = []
  expect(render(MeuOrcamento)).toContain('8.765')
  fake.leitura = { doMes: [], ult: [] }
  expect(render(Inicio)).toContain('8.765')
  expect((await numerosDaAba(api, familia, 'inicio'))[0].valor).toBe(8765)
  expect(await renderFuncionario('anfitriao')).toContain('8.765')
})
it('Guardado sentinela chega à aba, cartão do Início e funcionário', async () => {
  expect(render(Guardado)).toContain('9.876')
  expect(render(CartaoGuardado)).toContain('9.876')
  expect((await numerosDaAba(api, familia, 'guardado'))[0].valor).toBe(9876)
  expect(await renderFuncionario('guardado')).toContain('9.876')
})
it('movimentação sentinela chega à faixa da aba e ao funcionário', async () => {
  fake.leitura = { gastos: [], recebimentos: [] }
  expect(render(ResumoDoMes)).toContain('8.765')
  expect((await numerosDaAba(api, familia, 'lancamentos'))[1].valor).toBe(8765)
  expect(await renderFuncionario('contador')).toContain('8.765')
})
