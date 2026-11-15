import { describe, expect, it, vi } from 'vitest'
import type { Api, FamiliaMinha } from '../../api/tipos'
import { rotaDoHash, rotaPermitida, type Rota } from '../../app/rotas'
import { EQUIPE } from './equipe'
import { numerosDaAba, numerosExemplo } from './numeros'

const familia: FamiliaMinha = { id: 'exemplo', nome: 'Exemplo', papel: 'casal', membroNome: 'Exemplo', envelopeId: 'pessoal' }

describe('funcionários das abas', () => {
  it('cobre cada tela principal com identidade e destino válidos no roteador', () => {
    const abas: Rota[] = ['inicio', 'lancamentos', 'orcamento', 'casa', 'desejos', 'guardado', 'cartoes', 'planejamento', 'escritorio', 'ajustes', 'privacidade', 'painel']
    expect(new Set(EQUIPE.map(f => f.rota))).toEqual(new Set(abas))
    expect(new Set(EQUIPE.map(f => f.id)).size).toBe(EQUIPE.length)
    for (const f of EQUIPE) {
      expect(rotaDoHash('#/' + f.rota)).toBe(f.rota)
      expect(f.objeto.length).toBeGreaterThan(2)
      expect(f.papel.endsWith('.')).toBe(true)
    }
    expect(rotaPermitida('painel', 'casal', false)).toBe('inicio')
    expect(rotaPermitida('painel', 'casal', true)).toBe('painel')
    expect(rotaPermitida('guardado', 'pessoa')).toBe('inicio')
  })

  it('usa o envelope de quem olha, mesmo se o outro vier primeiro', async () => {
    const api = { resumoHoje: vi.fn().mockResolvedValue({ envelopes: [
      { id: 'outro', limite_mes: 999, gasto_mes: 999, livre: 0 },
      { id: 'pessoal', limite_mes: 100, gasto_mes: 20, livre: 80 },
    ] }) } as unknown as Api
    const numeros = await numerosDaAba(api, familia, 'orcamento')
    expect(numeros[1].texto).toContain('20')
    expect(numeros[2].texto).toContain('80')
    expect(api.resumoHoje).toHaveBeenCalledWith('exemplo')
    await expect(numerosDaAba(api, { ...familia, envelopeId: 'ausente' }, 'orcamento')).rejects.toThrow('indisponível')
  })

  it('não conta lançamentos apagados e não transforma erro de leitura em zero', async () => {
    const lancamentos = vi.fn().mockResolvedValue([{ valor: 20, apagado_em: null }, { valor: 90, apagado_em: '2026-01-01' }])
    const api = { lancamentos } as unknown as Api
    const numeros = await numerosDaAba(api, familia, 'lancamentos')
    expect(numeros[0].texto).toBe('1')
    expect(numeros[1].texto).toContain('20')
    lancamentos.mockRejectedValue(new Error('Sem leitura'))
    await expect(numerosDaAba(api, familia, 'lancamentos')).rejects.toThrow('Sem leitura')
  })

  it('zero desejos é válido; função ausente exige exemplo, sem inventar número', async () => {
    const api = { desejos: vi.fn().mockResolvedValue([]) } as unknown as Api
    expect((await numerosDaAba(api, familia, 'desejos')).map(n => n.texto)).toEqual(['0', '0'])
    await expect(numerosDaAba({} as Api, familia, 'desejos')).rejects.toThrow('indisponíveis')
  })

  it('o provedor de exemplo existente atende todas as abas sem dados reais', async () => {
    const { reiniciarExemplo } = await import('../../api/exemplo')
    reiniciarExemplo()
    for (const rota of new Set(EQUIPE.map(f => f.rota))) {
      const numeros = await numerosExemplo(rota)
      expect(numeros.length, rota).toBeGreaterThan(0)
      for (const n of numeros) {
        expect(n.nome.length, rota).toBeGreaterThan(0)
        expect(n.texto, rota).not.toMatch(/NaN|undefined|Infinity/)
      }
    }
  })
})
