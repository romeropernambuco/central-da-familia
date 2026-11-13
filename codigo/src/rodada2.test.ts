// Rodada 2 (13/11): os itens A (privacidade, olho, nada negativo) e as contas novas. Família de EXEMPLO, todo número inventado.
// A varredura das telas e folhas abertas no navegador está em testes/varredura2.cjs (Playwright, 390 px).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiExemplo, exemploComo, reiniciarExemplo } from './api/exemplo'
import { projecao } from './lib/plano'
import { esconderValores, mascararTexto, reais, todoDia } from './lib/formato'
import { numeroEnvelope, fraseEstouro } from './componentes/EnvelopeCard'
import { podeVerNoMenu, rotaPermitida } from './app/rotas'

const F = 'fam-silva'
const em = (dia: string, hora = 10) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(`${dia}T${String(hora).padStart(2, '0')}:00:00-03:00`)); reiniciarExemplo() }
afterEach(() => { vi.useRealTimers(); esconderValores(false) })
const tudo = (x: unknown) => JSON.stringify(x)
const TEM_DINHEIRO = /R\$|"valor":[1-9]|"total":[1-9]|"salario"|"limite_mes":[1-9]/

describe('A1: a equipe nunca vê R$', () => {
  it('resumo, Casa, Escritório, feiras e lançamento da equipe sem nenhum valor', async () => {
    for (const dia of ['2026-11-12', '2026-11-16', '2026-11-18', '2026-11-21']) for (const hora of [9, 21]) {
      em(dia, hora); exemploComo('equipe')
      const r = await apiExemplo.resumoHoje(F)
      expect(r.envelopes.every(e => e.limite_mes === 0 && e.gasto_mes === 0 && e.livre === 0)).toBe(true)
      expect(tudo(await apiExemplo.casaDaEquipe(F))).not.toMatch(TEM_DINHEIRO)
      const esc = await apiExemplo.escritorioHoje(F)
      expect(tudo(esc)).not.toMatch(/R\$/)
      expect(esc.precisa_de_voce.every(p => p.valor == null)).toBe(true)
      expect(tudo(await apiExemplo.feiras(F))).not.toMatch(/"valor":[1-9]/)
    }
  })
  it('"Anotar compra" sem valor: o que comprou, feira ou casa, foto da nota; aparece em "Comprado hoje" e a feira fica registrada', async () => {
    em('2026-11-18'); exemploComo('equipe')
    const { aviso } = await apiExemplo.anotarCompraEquipe!(F, { tipo: 'feira', nome: 'Feira do mercadinho', foto: 'exemplo' })
    expect(aviso).not.toMatch(/R\$/)
    expect(aviso).toMatch(/O casal confere o valor/)
    expect((await apiExemplo.casaDaEquipe(F)).comprado.some(c => c.nome === 'Feira do mercadinho')).toBe(true)
    await expect(apiExemplo.anotarCompraEquipe!(F, { tipo: 'casa', nome: '  ' })).rejects.toThrow(/Escreva o que você comprou/)
  })
  it('contagem com "Acabou"/"Pouco" entra na lista de compras na hora e a confirmação diz quanto falta', async () => {
    em('2026-11-18', 10); exemploComo('equipe')
    const fila = (await apiExemplo.escritorioHoje(F)).precisa_de_voce
    const nota = fila.find(p => p.id.startsWith('feira_nota:'))!
    const r1 = await apiExemplo.escritorioResponder(F, nota.id, 'anexar_nota', { caminho: 'x.jpg' })
    expect(r1 && r1.aviso).toMatch(/^Nota da feira de 16\/11 guardada\. (Falta|Faltam|Não falta)/)
    const cont = (await apiExemplo.escritorioHoje(F)).precisa_de_voce.find(p => p.id.startsWith('estoque:'))!
    const itens = (await apiExemplo.estoque(F)).itens.filter(i => i.ativo)
    const cafe = itens.find(i => i.nome === 'Café')!
    const r2 = await apiExemplo.escritorioResponder(F, cont.id, 'contar', { itens: itens.map(i => ({ item_id: i.id, estado: i.id === cafe.id ? 'acabou' : 'tem' })) })
    expect(r2 && r2.aviso).toMatch(/^Café entrou na lista de compras\./)
    expect((await apiExemplo.casaDaEquipe(F)).lista.some(i => i.nome === 'Café' && !i.ok)).toBe(true)
  })
  it('"todo sábado" e "toda segunda"', () => {
    expect(todoDia(6)).toBe('todo sábado'); expect(todoDia(0)).toBe('todo domingo'); expect(todoDia(1)).toBe('toda segunda')
  })
})

describe('A2: a filha (papel pessoa) só vê o dela', () => {
  it('menu e endereço: sem Cartões, Planejamento, Escritório, Guardado e primeiro uso', () => {
    for (const r of ['cartoes', 'planejamento', 'escritorio', 'guardado', 'primeiro-uso'] as const) {
      if (r !== 'primeiro-uso') expect(podeVerNoMenu(r, 'pessoa')).toBe(false)
      expect(rotaPermitida(r, 'pessoa')).toBe('inicio')
      expect(rotaPermitida(r, 'casal')).toBe(r)
    }
    expect(podeVerNoMenu('casa', 'pessoa')).toBe(true)
  })
  it('resumo, lançamentos, cartões, faturas, config e Escritório: nada dos pais nem da Casa', async () => {
    for (const dia of ['2026-11-01', '2026-11-12', '2026-11-18', '2026-11-30']) for (const hora of [10, 21]) {
      em(dia, hora); exemploComo('filha')
      const r = await apiExemplo.resumoHoje(F)
      expect(r.envelopes.map(e => e.id)).toEqual(['env-bia'])
      expect(r.placar_casal).toBeUndefined()
      expect(r.limites_outros).toBeUndefined()
      expect((await apiExemplo.lancamentos(F, dia.slice(0, 7))).every(l => l.envelope_id === 'env-bia')).toBe(true)
      expect(await apiExemplo.cartoes(F)).toEqual([])
      expect(await apiExemplo.faturas(F, 6)).toEqual([])
      for (const k of ['rendas', 'metas', 'casa_folha', 'casa_prestadores', 'entradas'] as const) expect(await apiExemplo.config(F, k, null)).toBeNull()
      const esc = await apiExemplo.escritorioHoje(F)
      const txt = tudo(esc)
      expect(txt).not.toMatch(/Ana|Bruno|Nubank|Itaú|anuidade|feira|seguro|reserva|Carla|guardado/i)
      expect(esc.precisa_de_voce.every(p => p.funcionario === 'contador')).toBe(true)
      expect(esc.funcionarios.map(f => f.id)).toEqual(['contador'])
      const vals = [...txt.matchAll(/R\$[\s ]*([\d.]+)/g)].map(m => Number(m[1].replace(/\./g, '')))
      expect(vals.every(v => v <= 300)).toBe(true)
    }
  })
  it('lançar no limite dos pais é recusado', async () => {
    em('2026-11-18'); exemploComo('filha')
    // E2: a mensagem agora diz de quem é o limite (era /não é seu/); a filha continua sem ver nada dos pais
    await expect(apiExemplo.lancar({ familia: F, envelope: 'env-ana', valor: 10, data: '2026-11-18', descricao: 'x', chave: 'k-f' })).rejects.toThrow(/é de Ana/)
  })
})

describe('A3 (E2): o casal lê os 2 cartões com o dono; o Analista de Cartão fala só do seu', () => {
  it('Ana e Bruno leem Nubank e Itaú com o titular; o Analista de Cartão de cada um só fala do dele', async () => {
    for (const dia of ['2026-11-07', '2026-11-12', '2026-11-18']) {
      em(dia, 21); exemploComo('ana')
      // E2 (regra nova, 13/11): era só ['Nubank']; agora ela lê o Itaú do Bruno com o nome dele
      expect((await apiExemplo.cartoes(F)).map(c => [c.nome, c.titular])).toEqual([['Nubank', 'Ana'], ['Itaú', 'Bruno']])
      expect([...new Set((await apiExemplo.faturas(F, 6)).map(f => f.cartao))]).toEqual(['Nubank', 'Itaú'])
      // o Analista pergunta e mexe: continua só com o cartão dela
      expect(tudo(await apiExemplo.escritorioHoje(F))).not.toMatch(/Itaú/)
      await expect(apiExemplo.faturaInformar(F, 'car-itau', '2026-12', { valor_banco: 1 })).rejects.toThrow(/é de Bruno/)
      exemploComo('bruno')
      expect((await apiExemplo.cartoes(F)).map(c => c.nome)).toEqual(['Nubank', 'Itaú'])
      expect([...new Set((await apiExemplo.faturas(F, 6)).map(f => f.cartao))]).toEqual(['Nubank', 'Itaú'])
      const esc = tudo(await apiExemplo.escritorioHoje(F))
      expect(esc).not.toMatch(/Nubank|anuidade de R\$/)
    }
  })
  it('quem pagou: a luz da Casa paga pelo Bruno no Itaú aparece como "Da Casa" na fatura dele', async () => {
    em('2026-11-18'); exemploComo('bruno')
    // E2: as faturas trazem os 2 cartões; a do Itaú (dele) é a que tem a luz da Casa
    const dez = (await apiExemplo.faturas(F, 3)).find(f => f.mes === '2026-12' && f.cartao_id === 'car-itau')!
    expect(dez.da_casa).toBe(286.5)
    expect((await apiExemplo.lancamentos(F, '2026-11')).find(l => l.descricao === 'Conta de luz')!.autor).toBe('m-bruno')
  })
  it('regra do salário: o Bruno tem R$ 300 na conta; o Gestor pergunta, ele guarda e a regra fica cumprida', async () => {
    em('2026-11-18'); exemploComo('bruno')
    expect(await apiExemplo.entrouAMais!(F, '2026-11')).toMatchObject({ entrou: 300, guardado: 0 })
    const p = (await apiExemplo.escritorioHoje(F)).precisa_de_voce.find(x => x.id.startsWith('entrou_extra:'))!
    const r = await apiExemplo.escritorioResponder(F, p.id, 'guardar_entrada')
    expect(r && r.aviso).toMatch(/Regra do salário cumprida/)
    expect(await apiExemplo.entrouAMais!(F, '2026-11')).toMatchObject({ entrou: 300, guardado: 300 })
    exemploComo('ana')
    expect(await apiExemplo.entrouAMais!(F, '2026-11')).toMatchObject({ entrou: 500, guardado: 500 })
  })
})

describe('A4 e A5: olho e nada negativo', () => {
  it('o olho troca todo R$ dentro de frase (fala do funcionário, aviso) por R$ •••', () => {
    expect(mascararTexto('Ana, tem R$ 20.035,34 lá e rende R$ 166 por mês. Passou R$ 1.420.')).toBe('Ana, tem R$ ••• lá e rende R$ ••• por mês. Passou R$ •••.')
    esconderValores(true); expect(reais(1234)).toBe('R$ •••')
  })
  it('nenhum "-R$": reais negativo vira "passou", e as falas e explicações do exemplo não têm sinal de menos', async () => {
    expect(reais(-32.3)).toBe('passou R$ 32,30')
    for (const dia of ['2026-11-13', '2026-11-18', '2026-11-30', '2026-12-01']) for (const como of ['ana', 'bruno', 'filha', 'autonoma'] as const) {
      em(dia, 21); exemploComo(como)
      const r = await apiExemplo.resumoHoje(F)
      const textos = [tudo(await apiExemplo.escritorioHoje(F)), ...r.envelopes.map(e => { const n = numeroEnvelope(e, r.dias_restantes); return (fraseEstouro(e, n) || '') + n.linhas.map(l => l.linha).join(' ') })].join(' ')
      expect(textos).not.toMatch(/-R\$|−R\$|R\$\s?-/)
    }
  })
})

describe('B e C: contas novas', () => {
  it('B7: parcela e compra grande contam 1 vez na projeção (não viram ritmo)', () => {
    // 10 dias, R$ 1.000 no dia a dia + R$ 900 de material: antes 1.900/10×30 = 5.700; agora 900 + 1.000/10×30 = 3.900
    expect(projecao(1900, 5500, '2026-11-10').fecha).toBe(5700) // C1: teto do exemplo 6.000 -> 5.500 (o fecha não depende do teto)
    expect(projecao(1900, 5500, '2026-11-10', 900).fecha).toBe(3900)
  })
  it('B7: Ana no dia 18 fecha bem menos do que o ritmo antigo (material e parcela contados 1 vez)', async () => {
    em('2026-11-18'); exemploComo('ana')
    const a = (await apiExemplo.resumoHoje(F)).envelopes.find(e => e.id === 'env-ana')!
    expect(a.pontual_mes).toBe(1710) // material R$ 900 + 1ª parcela R$ 200 + Uber de R$ 610 (10% do mês)
    expect(projecao(a.gasto_mes, 5500, '2026-11-18', a.pontual_mes).fecha).toBeLessThan(projecao(a.gasto_mes, 5500, '2026-11-18').fecha)
  })
  it('B11: o "?" do limite do mês tem a divisão de verdade ("Dividido pelos 13 dias que faltam")', async () => {
    em('2026-11-18'); exemploComo('bruno')
    const r = await apiExemplo.resumoHoje(F); const e = r.envelopes.find(x => x.id === 'env-bruno')!
    const l = numeroEnvelope(e, r.dias_restantes).linhas
    expect(l[l.length - 1]).toEqual({ linha: 'Dividido pelos 13 dias que faltam: pode gastar hoje', valor: e.hoje })
  })
  it('B12: no dia 1 de dezembro o exemplo lembra de novembro (R$ 717 que passaram e a 2ª parcela)', async () => {
    em('2026-12-01'); exemploComo('ana')
    const a = (await apiExemplo.resumoHoje(F)).envelopes.find(e => e.id === 'env-ana')!
    expect(a.falta_mes_anterior).toBeGreaterThan(0)
    expect(a.mes_anterior?.mes).toBe('2026-11')
    expect(a.parcelas_mes).toBe(200)
  })
  it('C16: placar do casal com os 2, sem item', async () => {
    em('2026-11-18'); exemploComo('ana')
    const p = (await apiExemplo.resumoHoje(F)).placar_casal!
    expect(p.map(x => x.nome)).toEqual(['Ana', 'Bruno'])
    expect(tudo(p)).not.toMatch(/descricao|Uber|Padaria/)
  })
  it('C18: o limite do mês do Bruno tem "até domingo"', async () => {
    em('2026-11-18'); exemploComo('bruno')
    const e = (await apiExemplo.resumoHoje(F)).envelopes.find(x => x.id === 'env-bruno')!
    expect(e.ate_domingo).toBeCloseTo((e.hoje || 0) * 5, 1) // quarta a domingo
  })
  it('V3 "Foi imprevisto": o que passou sai da reserva pra mês ruim e o mês dela volta a ficar dentro; Desfazer volta', async () => {
    em('2026-11-30', 21); exemploComo('ana')
    const antes = (await apiExemplo.resumoHoje(F)).envelopes.find(e => e.id === 'env-ana')!
    const desfazer = await apiExemplo.cobrirImprevisto!(F, 'env-ana', -antes.livre)
    expect((await apiExemplo.resumoHoje(F)).envelopes.find(e => e.id === 'env-ana')!.livre).toBeGreaterThanOrEqual(0)
    await desfazer()
    expect((await apiExemplo.resumoHoje(F)).envelopes.find(e => e.id === 'env-ana')!.livre).toBe(antes.livre)
  })
  it('E7: na 3ª cobrança aparece "isso já é decidido" e ele cala o assunto', async () => {
    em('2026-11-18', 21); exemploComo('bruno')
    const p = (await apiExemplo.escritorioHoje(F)).precisa_de_voce.find(x => x.opcoes.some(o => o.id === 'decidido'))!
    await apiExemplo.escritorioResponder(F, p.id, 'decidido')
    expect((await apiExemplo.escritorioHoje(F)).precisa_de_voce.some(x => x.id === p.id)).toBe(false)
  })
  it('silêncio: das 22h às 7h ninguém fala, só o que vence hoje', async () => {
    em('2026-11-18', 23); exemploComo('ana')
    const hoje = '2026-11-18'
    expect((await apiExemplo.escritorioHoje(F)).precisa_de_voce.every(p => p.vence_em === hoje)).toBe(true)
  })
  it('Família Souza (?como=autonoma): só a Cláudia, renda que muda, sem casal', async () => {
    em('2026-11-18'); exemploComo('autonoma')
    const r = await apiExemplo.resumoHoje(F)
    expect(r.envelopes.map(e => e.nome)).toEqual(['Cláudia', 'Feira semanal', 'Casa mensal'])
    expect(r.placar_casal).toBeUndefined()
    expect((await apiExemplo.sessao())!.familias[0].nome).toBe('Família Souza')
    expect(await apiExemplo.config(F, 'rendas', [])).toMatchObject([{ tipo: 'variavel', fraco: 3200, bom: 5800 }])
  })
})
