import { afterEach, expect, it } from 'vitest'
import { desfazer } from '../app/desfazer'
import { pendentes } from '../app/pendentes'
import { apiExemplo, reiniciarExemplo } from './exemplo'
import { protegerApi } from './protegida'

const F = 'fam-silva'
afterEach(() => { pendentes.limpar(); desfazer.limpar(); reiniciarExemplo() })
/** A API do exemplo tratada como banco real: sem o retrato completo, só valem os inversos por ação. */
const real = () => protegerApi({ ...apiExemplo, modo: 'real' })

it('recebimento: marcar como certo tem desfazer que volta o valor anterior e não gera outro desfazer', async () => {
  const api = real(), r = (await apiExemplo.recebimentos!(F))[0]
  await api.recebimentoMudar!(F, r.id, { certo: !r.certo })
  expect((await apiExemplo.recebimentos!(F)).find(x => x.id === r.id)!.certo).toBe(!r.certo)
  expect(desfazer.atual).not.toBeNull()
  expect(await desfazer.executar()).toBe(true)
  expect((await apiExemplo.recebimentos!(F)).find(x => x.id === r.id)!.certo).toBe(r.certo)
  expect(desfazer.atual).toBeNull()
})

it('recebimento: se o dado mudou depois, o desfazer recusa e avisa; apagar não oferece desfazer', async () => {
  const api = real(), r = (await apiExemplo.recebimentos!(F))[0]
  await api.recebimentoMudar!(F, r.id, { certo: !r.certo })
  const acao = desfazer.atual
  await apiExemplo.recebimentoMudar!(F, r.id, { certo: r.certo })
  expect(await desfazer.executar()).toBe(false)
  expect(desfazer.atual).toBe(acao)
  expect(desfazer.mensagem).toContain('confira antes de desfazer')
  desfazer.limpar()
  await api.recebimentoMudar!(F, r.id, { apagar: true })
  expect(desfazer.atual).toBeNull()
})

it('lembrete adiado volta para a hora de antes', async () => {
  const api = real()
  await apiExemplo.lembreteCriar(F, { titulo: 'Fictício', quando: '2026-12-01T12:00:00.000Z', repetir: 'nunca' })
  const l = (await apiExemplo.lembretes(F)).find(x => x.titulo === 'Fictício')!
  await api.lembreteAdiar(F, l.id, '2026-12-02T12:00:00.000Z')
  expect(new Date((await apiExemplo.lembretes(F)).find(x => x.id === l.id)!.quando).toISOString()).toBe('2026-12-02T12:00:00.000Z')
  expect(await desfazer.executar()).toBe(true)
  expect(new Date((await apiExemplo.lembretes(F)).find(x => x.id === l.id)!.quando).toISOString()).toBe('2026-12-01T12:00:00.000Z')
})

it('cartão: mudar os dias volta o cadastro inteiro de antes', async () => {
  const api = real(), c = (await apiExemplo.cartoes(F))[0]
  await api.cartaoSalvar(F, { ...c, dia_fechamento: 3, dia_vencimento: 11 })
  expect((await apiExemplo.cartoes(F)).find(x => x.id === c.id)).toMatchObject({ dia_fechamento: 3, dia_vencimento: 11 })
  expect(await desfazer.executar()).toBe(true)
  expect((await apiExemplo.cartoes(F)).find(x => x.id === c.id)).toEqual(c)
})

it('fatura: valor informado pela primeira vez não tem volta (o banco não sabe tirar); pagamento marcado tem', async () => {
  const api = real(), c = (await apiExemplo.cartoes(F))[0]
  const livre = '2031-05'
  expect((await apiExemplo.faturasBanco(F)).find(x => x.cartao_id === c.id && x.mes.startsWith(livre))?.valor_banco ?? null).toBeNull()
  await api.faturaInformar(F, c.id, livre, { valor_banco: 123.45 })
  expect(desfazer.atual).toBeNull()
  await api.faturaInformar(F, c.id, livre, { paga_em: '2031-05-10' })
  expect(desfazer.atual).not.toBeNull()
  expect(await desfazer.executar()).toBe(true)
  const f = (await apiExemplo.faturasBanco(F)).find(x => x.cartao_id === c.id && x.mes.startsWith(livre))!
  expect(f.paga_em).toBeNull(); expect(f.valor_banco).toBe(123.45)
})

it('lançamento tirado da lixeira pode voltar para ela', async () => {
  const api = real(), mes = '2026-11'
  const l = (await apiExemplo.lancamentos(F, mes)).find(x => !x.apagado_em && !x.parcela)!
  await apiExemplo.apagarLancamento(l.id)
  await api.restaurarLancamento(l.id)
  expect(await desfazer.executar()).toBe(true)
  expect((await apiExemplo.lancamentos(F, mes)).find(x => x.id === l.id)!.apagado_em).not.toBeNull()
})

it('modo exemplo continua no retrato completo: os inversos por ação não entram', async () => {
  const api = protegerApi(apiExemplo), r = (await apiExemplo.recebimentos!(F))[0]
  await api.recebimentoMudar!(F, r.id, { apagar: true })
  expect(desfazer.atual).not.toBeNull()
})
