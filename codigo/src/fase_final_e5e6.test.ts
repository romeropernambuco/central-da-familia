// E5 e E6 (TELAS, 13/11). Família de EXEMPLO, todo número inventado.
// E5: recebimentos com data; o casal lê todos, só o dono lança e muda; atrasado vai pro mês seguinte e vira pergunta (F4).
// E6: parâmetros do objetivo (os 2 mudam, com histórico), Focus ao lado, e a entrada do motor igual no exemplo e no banco.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiExemplo, exemploComo, reiniciarExemplo } from './api/exemplo'
import { entradaDoBanco, taxaDoTexto, textoDaTaxa, type FuturoBanco } from './api/futuro'
import { normalizaRecebimento } from './api/normaliza'
import { situacaoRecebimento } from './telas/planejamento/Recebimentos'
import { futuro } from './lib/futuro'

const F = 'fam-silva'
const em = (dia: string, hora = 10) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(`${dia}T${String(hora).padStart(2, '0')}:00:00-03:00`)); reiniciarExemplo() }
afterEach(() => { vi.useRealTimers() })

describe('E5: recebimentos com data', () => {
  it('o casal lê os de todos com o nome do dono; filha e equipe não veem nada', async () => {
    em('2026-11-18'); exemploComo('ana')
    const r = await apiExemplo.recebimentos!(F)
    expect(r.map(x => [x.descricao, x.dono_nome, x.meu])).toEqual([
      ['Contrato de consultoria (exemplo)', 'Ana', true], ['Bônus do fim do ano (exemplo)', 'Ana', true], ['Venda do carro antigo (exemplo)', 'Bruno', false]])
    exemploComo('filha'); expect(await apiExemplo.recebimentos!(F)).toEqual([])
    exemploComo('equipe'); expect(await apiExemplo.recebimentos!(F)).toEqual([])
  })
  it('só o dono muda (igual a recebimentos_mudar da f_05); o novo nasce no nome de quem lança', async () => {
    em('2026-11-18'); exemploComo('bruno')
    await expect(apiExemplo.recebimentoMudar!(F, 'rc1', { recebido_em: '2026-11-18' })).rejects.toThrow(/é de Ana: só Ana muda/)
    await apiExemplo.recebimentoCriar!(F, { descricao: 'Comissão (exemplo)', valor: 2500, mes_previsto: '2027-02', tipo: 'contrato', certo: true })
    exemploComo('ana')
    const c = (await apiExemplo.recebimentos!(F)).find(x => x.descricao === 'Comissão (exemplo)')!
    expect([c.dono_nome, c.meu]).toEqual(['Bruno', false])
  })
  it('F4 na tela: o contrato de outubro que não chegou conta em dezembro e vira pergunta; com o mês novo, a pergunta sai', async () => {
    em('2026-11-18'); exemploComo('ana')
    const rc1 = (await apiExemplo.recebimentos!(F)).find(x => x.id === 'rc1')!
    expect(situacaoRecebimento(rc1, '2026-11-18')).toEqual({ conta_em: '2026-12', pergunta: true, atrasado: true })
    await apiExemplo.recebimentoMudar!(F, 'rc1', { mes_novo: '2027-01' })
    const depois = (await apiExemplo.recebimentos!(F)).find(x => x.id === 'rc1')!
    expect(situacaoRecebimento(depois, '2026-11-18')).toEqual({ conta_em: '2027-01', pergunta: false, atrasado: true })
    await expect(apiExemplo.recebimentoMudar!(F, 'rc1', { mes_novo: '2026-09' })).rejects.toThrow(/depois do mês previsto/)
    // incerto não entra na conta
    const bonus = (await apiExemplo.recebimentos!(F)).find(x => x.id === 'rc2')!
    expect(situacaoRecebimento(bonus, '2026-11-18').conta_em).toBeNull()
  })
  it('o formato do banco (centavos, data do dia 1) vira o da tela', () => {
    expect(normalizaRecebimento({ id: 'x', dono_membro: 'm1', descricao: 'Y', valor_centavos: 1234567, mes_previsto: '2027-03-01', mes_novo: null, tipo: 'retorno', certo: true, recebido_em: null }, [{ id: 'm1', nome: 'Ana' }], 'm1'))
      .toMatchObject({ valor: 12345.67, mes_previsto: '2027-03', dono_nome: 'Ana', meu: true, tipo: 'retorno' })
  })
})

describe('E6: objetivo 2029, histórico e Focus', () => {
  it('os 2 mudam e o histórico guarda quem, antes e depois; filha não vê', async () => {
    em('2026-11-18'); exemploComo('ana')
    const o = await apiExemplo.objetivo!(F)
    expect(o.parametros).toBeNull()
    expect(o.focus.map(x => x.ano)).toEqual([2026, 2027, 2028])
    const p = { gasto_2029_hoje: 3000000, renda_certa_2029: 0, margem: '0.1', taxa_real_trabalho: '0.04', aliq_proj: '0.15', taxa_bruta_ano: {}, ipca_ano: {}, piso_meses: 6, mes_reajuste: 1, travado_focus: false }
    await apiExemplo.objetivoSalvar!(F, p)
    exemploComo('bruno')
    await apiExemplo.objetivoSalvar!(F, { ...p, margem: '0.12' })
    const h = (await apiExemplo.objetivo!(F)).historico
    expect(h.map(x => x.quem)).toEqual(['Bruno', 'Ana'])
    expect([h[0].antes!.margem, h[0].depois.margem]).toEqual(['0.1', '0.12'])
    await expect(apiExemplo.objetivoSalvar!(F, { ...p, margem: 'dez' })).rejects.toThrow(/Confira as taxas/)
    exemploComo('filha'); await expect(apiExemplo.objetivo!(F)).rejects.toThrow(/Só o casal/)
    await expect(apiExemplo.futuroEntradas!(F)).rejects.toThrow(/Só o casal/)
  })
  it('taxa digitada em % vira texto decimal e volta igual', () => {
    expect(taxaDoTexto('10,5')).toBe('0.105'); expect(taxaDoTexto('4')).toBe('0.04'); expect(taxaDoTexto('abc')).toBeNull()
    expect(textoDaTaxa('0.1375')).toBe('13,75')
  })
  it('exemplo: a entrada do motor sai pronta e futuro() roda até dez/2028, com o recebimento atrasado virando pergunta', async () => {
    em('2026-11-18'); exemploComo('ana')
    const e = await apiExemplo.futuroEntradas!(F)
    expect(e.entrada).not.toBeNull()
    expect(e.confirmar.join(' ')).toMatch(/gasto por mês em 2029/)
    const s = futuro(e.entrada!)
    expect(s.linha[0].mes).toBe('2026-12'); expect(s.linha[s.linha.length - 1].mes).toBe('2028-12')
    expect(s.perguntas).toEqual([{ recebimento_atrasado: 'rc1' }])
    // a parcela do tênis (Nubank) entra como compromisso nos meses das faturas
    expect(e.entrada!.compromissos.filter(c => c.tipo === 'parcela').map(c => c.mes)).toEqual(['2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05'])
    expect(e.entrada!.aplicacoes.every(a => Number.isSafeInteger(a.saldo))).toBe(true)
  })
  it('o mesmo entradaDoBanco serve o banco: um retorno no formato da f_08 sai igual', () => {
    const j: FuturoBanco = {
      hoje: '2026-11-18', mes_base: '2026-11', cdi_hoje: { pct_ano: '14.9' },
      aplicacoes: [{ id: 'a', titular_membro: null, titular_nome: null, titulares: [{ membro_id: '1', nome: 'X' }, { membro_id: '2', nome: 'Y' }], banco: 'B', tipo: 'cdb', saldo_centavos: 1000000, pct_cdi: '110', isenta: false, aplicada_em: '2026-01-02', resgate_previsto: null }],
      recebimentos: [{ id: 'r', dono_nome: 'X', valor_centavos: 500000, mes_previsto: '2027-02', mes_novo: null, certo: true, recebido_em: null }],
      limites_mes: [{ envelope_id: 'e1', limite_centavos: 300000 }, { envelope_id: 'e2', limite_centavos: 200000 }],
      config: { casa_folha: { pessoas: [{ salario: 1800 }] } }, parcelas_futuras: [{ parcelas_lista: [{ mes_fatura: '2026-12', valor_centavos: 20000 }] }], desejos: [],
      parametros: null, focus: [{ ano: 2026, selic_fim: '0.15', ipca: '0.045', divulgado_em: '2026-11-09', fonte: 'teste' }, { ano: 2028, selic_fim: '0.105', ipca: '0.038', divulgado_em: '2026-11-09', fonte: 'teste' }],
    }
    const e = entradaDoBanco(j)
    expect(e.entrada!.parametros.teto_mes).toBe(500000)
    expect(e.entrada!.parametros.gasto_2029_hoje).toBe(500000)
    expect(e.entrada!.parametros.taxa_bruta_ano[2027]).toBeDefined()
    expect(e.confirmar.join(' ')).toMatch(/Selic de 2027/)
    expect(e.entrada!.aplicacoes[0]).toMatchObject({ taxa_bruta_anual: '0.1639', titulares: ['X', 'Y'], titular: null })
    expect(e.entrada!.compromissos).toEqual([{ mes: '2026-12', valor: 20000, tipo: 'parcela' }, { mes: '2026-12', valor: 180000, tipo: 'folha_13' }, { mes: '2027-12', valor: 180000, tipo: 'folha_13' }, { mes: '2028-12', valor: 180000, tipo: 'folha_13' }])
    expect(() => futuro(e.entrada!)).not.toThrow()
    expect(entradaDoBanco({ ...j, focus: [] }).entrada).toBeNull()
  })
})
