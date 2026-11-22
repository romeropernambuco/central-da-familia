// O aviso da causa do aluguel (pedido do dono, 22/11/2026): o pedido subiu, passe ao advogado.
import { describe, expect, it } from 'vitest'
import type { FamiliaMinha, ImovelTela } from '../../api/tipos'
import { candidatosInsights } from './motor'
import { montarSnapshot } from './snapshot'

const agora = '2026-11-22T12:00:00-03:00'
const familia = { id: 'f', papel: 'casal', membroId: 'm', envelopeId: 'e', nome: 'F' } as unknown as FamiliaMinha
const imovel = { id: 'im1', apelido: 'NomeSentinelaPrivado', uso: 'aluga', aluguel: 2000 } as unknown as ImovelTela
const caderno = (causa?: object) => ({
  im1: {
    dia_vencimento: 10,
    recebimentos: [],
    despesas: [],
    desde: '2026-01',
    problema: {
      etapa: 'advogado',
      desde: '2026-09',
      volta: null,
      advogado: 'Dra. Paula',
      divida: 6000,
      andamento: [],
      ...(causa ? { causa } : {}),
    },
  },
})
const aviso = (aluguel: unknown) =>
  candidatosInsights(montarSnapshot(familia, 'real', { imoveis: [imovel], aluguel }, agora), agora).find(i =>
    i.chave.includes('causa'),
  )

describe('a causa do aluguel avisa para atualizar o pedido', () => {
  it('nunca passou ao advogado: o Ajudante dos Imóveis pergunta, na aba Guardado, com o pedido de hoje', () => {
    const i = aviso(caderno())!
    expect(i.funcionario).toBe('imoveis')
    expect(i.rota).toBe('guardado')
    expect(i.pergunta).toBe('O pedido da causa do aluguel ainda não foi passado ao advogado. Vamos mandar?')
    expect(i.contexto).toMatch(/^Imóvel: NomeSentinelaPrivado\. Pedido de hoje: R\$ [\d.]+,\d\d/)
    expect(i.trechosPrivados).toEqual(['NomeSentinelaPrivado'])
  })

  it('já passou neste mês: não pergunta; o pedido subiu num mês seguinte: pergunta de novo', () => {
    expect(aviso(caderno({ passado_em: '2026-11-20', pedido_passado: 99999 }))).toBeUndefined()
    const i = aviso(caderno({ passado_em: '2026-10-15', pedido_passado: 1000 }))!
    expect(i.pergunta).toBe('O pedido da causa do aluguel subiu este mês. Vamos passar o valor novo ao advogado?')
  })

  it('imóvel vazio ou só cobrando o inquilino: sem aviso de causa', () => {
    const c = caderno()
    c.im1.problema.etapa = 'cobrando'
    expect(aviso(c)).toBeUndefined()
  })
})
