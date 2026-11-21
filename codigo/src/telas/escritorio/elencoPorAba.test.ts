import { expect, it } from 'vitest'
import { elencoDaAba, PRINCIPAL_POR_ABA, SALA_POR_ABA } from './elencoPorAba'
import { POR_ID } from '../../lib/escritorio/equipe'

const papeis = ['casal', 'pessoa', 'equipe'] as const
for (const rota of Object.keys(SALA_POR_ABA))
  for (const papel of papeis)
    for (const ehDono of [false, true]) {
      it(`${rota}: elenco autorizado para ${papel}, dono=${ehDono}`, () => {
        const entrada = { rota, papel, ehDono }
        const r = elencoDaAba(entrada),
          ids = [r.principal, ...r.secundarios]
        expect(r).toEqual(elencoDaAba(entrada))
        expect(new Set(ids).size).toBe(ids.length)
        expect(ids.length).toBeLessThanOrEqual(2)
        if (papel === 'equipe') {
          expect(r.principal).toBe('fiscal')
          expect(r.sala).toBe('casa')
          expect(ids.every(id => ['fiscal', 'comprador', 'presenca', 'auditor'].includes(id))).toBe(true)
        } else if (papel === 'pessoa') {
          expect(
            ids.some(id =>
              [
                'folha',
                'fiscal',
                'presenca',
                'auditor',
                'guardado',
                'imoveis',
                'tesoureiro',
                'colchao',
                'cartao',
                'secretaria',
              ].includes(id),
            ),
          ).toBe(false)
        } else {
          expect(r.principal).toBe(PRINCIPAL_POR_ABA[rota])
          expect(r.sala).toBe(SALA_POR_ABA[rota])
          expect(r.secundarios).toEqual(
            rota === 'inicio'
              ? ['guardado']
              : rota === 'guardado'
                ? ['imoveis']
                : rota === 'planejamento'
                  ? ['colchao']
                  : [],
          )
        }
      })
    }
it.each(['Lista', 'Serviços', 'Gás', 'Folha', 'Presença', 'Estoque'])('Casa acompanha %s sem relógio', subaba => {
  const esperado: Record<string, string> = {
    Lista: 'comprador',
    Serviços: 'comprador',
    Gás: 'comprador',
    Folha: 'folha',
    Presença: 'presenca',
    Estoque: 'auditor',
  }
  expect(elencoDaAba({ rota: 'casa', papel: 'casal', ehDono: false, subaba }).secundarios).toEqual([esperado[subaba]])
  for (const papel of ['pessoa', 'equipe'] as const) {
    const r = elencoDaAba({ rota: 'casa', papel, ehDono: false, subaba, perguntaPendente: { funcionario: 'folha' } })
    expect([r.principal, ...r.secundarios]).not.toContain('folha')
    if (papel === 'pessoa') expect(r).toEqual({ principal: 'comprador', secundarios: [], sala: 'casa' })
  }
})
it('Casa dá prioridade ao dono autorizado; Início usa a primeira pergunta autorizada', () => {
  expect(
    elencoDaAba({
      rota: 'casa',
      papel: 'casal',
      ehDono: false,
      subaba: 'Gás',
      perguntaPendente: { funcionario: 'folha' },
    }).secundarios,
  ).toEqual(['folha'])
  const filaGeral = [{ funcionario: 'folha' }, { funcionario: 'contador' }]
  expect(elencoDaAba({ rota: 'inicio', papel: 'pessoa', ehDono: false, filaGeral }).secundarios).toEqual(['contador'])
  expect(elencoDaAba({ rota: 'inicio', papel: 'casal', ehDono: false, filaGeral }).secundarios).toEqual(['folha'])
})
it('identidades e promessas descrevem funções existentes', () => {
  expect(POR_ID.assistente.nome).toBe('Assistente do Orçamento')
  expect(POR_ID.imoveis.nome).toBe('Ajudante dos Imóveis')
  expect(POR_ID.imoveis).toMatchObject({
    rota: 'guardado',
    objeto: 'pasta',
    sala: 'patrimonio',
    mesa: 2,
    doBanco: false,
  })
  expect(POR_ID.imoveis.faz).toHaveLength(3)
  expect(POR_ID.presenca.faz.join(' ')).not.toMatch(/Cruzo|despensa/)
  expect(POR_ID.auditor.faz.join(' ')).not.toMatch(/antes da|10 dias/)
})
