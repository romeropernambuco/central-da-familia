import { describe, expect, it } from 'vitest'
import { jaAnotado, lerData, lerExtrato, lerValor, sugerirLimite } from './extrato'

const HOJE = '2026-11-22'

describe('valores e datas do jeito que os bancos escrevem', () => {
  it('valor brasileiro, americano, com R$, com sinal e entre parênteses', () => {
    expect(lerValor('1.234,56')).toBe(1234.56)
    expect(lerValor('1,234.56')).toBe(1234.56)
    expect(lerValor('-45,90')).toBe(-45.9)
    expect(lerValor('R$ 45,90')).toBe(45.9)
    expect(lerValor('- R$ 12,00')).toBe(-12)
    expect(lerValor('(30,00)')).toBe(-30)
    expect(lerValor('45.9')).toBe(45.9)
    expect(lerValor('120')).toBe(120)
    expect(lerValor('Padaria')).toBeNull()
    expect(lerValor('12/11')).toBeNull()
  })
  it('data com e sem ano, por extenso e no formato do banco', () => {
    expect(lerData('20/11/2026', HOJE)).toBe('2026-11-20')
    expect(lerData('20/11/26', HOJE)).toBe('2026-11-20')
    expect(lerData('2026-11-20', HOJE)).toBe('2026-11-20')
    expect(lerData('20 nov', HOJE)).toBe('2026-11-20')
    expect(lerData('20 de novembro de 2026', HOJE)).toBe('2026-11-20')
    // sem ano e no futuro: é do ano passado (extrato de dezembro colado em janeiro)
    expect(lerData('28/12', '2027-01-05')).toBe('2026-12-28')
    expect(lerData('31/02/2026', HOJE)).toBeNull()
    expect(lerData('Padaria', HOJE)).toBeNull()
  })
})

describe('os 3 jeitos de extrato', () => {
  it('texto copiado da tela do app, uma linha por movimento', () => {
    const texto = `Saldo do dia 1.500,00
20/11 Padaria Pão Quente -12,50
20/11 Pix recebido Maria 300,00
21/11 Posto Shell R$ 210,00 D
21/11 Uber 23,90 D
Saldo final 1.000,00`
    expect(lerExtrato(texto, HOJE)).toEqual([
      { data: '2026-11-20', descricao: 'Padaria Pão Quente', valor: 12.5, entrada: false },
      { data: '2026-11-20', descricao: 'Pix recebido Maria', valor: 300, entrada: true },
      { data: '2026-11-21', descricao: 'Posto Shell', valor: 210, entrada: false },
      { data: '2026-11-21', descricao: 'Uber', valor: 23.9, entrada: false },
    ])
  })
  it('texto com a data numa linha sozinha e os movimentos embaixo', () => {
    const texto = `19 NOV 2026
Mercado Bom Preço - R$ 145,30
Farmácia - R$ 32,00
18 NOV 2026
Salário 5.000,00 C`
    expect(lerExtrato(texto, HOJE)).toEqual([
      { data: '2026-11-19', descricao: 'Mercado Bom Preço', valor: 145.3, entrada: false },
      { data: '2026-11-19', descricao: 'Farmácia', valor: 32, entrada: false },
      { data: '2026-11-18', descricao: 'Salário', valor: 5000, entrada: true },
    ])
  })
  it('planilha da conta (ponto e vírgula, saída negativa)', () => {
    const texto = `Data Lançamento;Histórico;Descrição;Valor;Saldo
20/11/2026;Compra no débito;Padaria;-12,50;987,50
19/11/2026;Pix recebido;Fulano;300,00;1000,00`
    expect(lerExtrato(texto, HOJE)).toEqual([
      { data: '2026-11-20', descricao: 'Padaria', valor: 12.5, entrada: false },
      { data: '2026-11-19', descricao: 'Fulano', valor: 300, entrada: true },
    ])
  })
  it('planilha da fatura do cartão (compra positiva, pagamento negativo)', () => {
    const texto = `date,title,amount
2026-11-10,Restaurante Mar,"89.90"
2026-11-12,Pagamento recebido,-1500.00`
    expect(lerExtrato(texto, HOJE)).toEqual([
      { data: '2026-11-10', descricao: 'Restaurante Mar', valor: 89.9, entrada: false },
      { data: '2026-11-12', descricao: 'Pagamento recebido', valor: 1500, entrada: true },
    ])
  })
  it('OFX aberto como texto', () => {
    const texto = `<OFX><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261120120000[-3:BRT]<TRNAMT>-45.90<MEMO>FARMACIA SAO JOAO</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261121<TRNAMT>100.00<MEMO>PIX RECEBIDO</STMTTRN>
</BANKTRANLIST></OFX>`
    expect(lerExtrato(texto, HOJE)).toEqual([
      { data: '2026-11-20', descricao: 'FARMACIA SAO JOAO', valor: 45.9, entrada: false },
      { data: '2026-11-21', descricao: 'PIX RECEBIDO', valor: 100, entrada: true },
    ])
  })
  it('texto vazio ou sem movimento não quebra', () => {
    expect(lerExtrato('', HOJE)).toEqual([])
    expect(lerExtrato('Olá, seu extrato está pronto', HOJE)).toEqual([])
  })
})

describe('ajuda para salvar', () => {
  const anteriores = [
    { descricao: 'Padaria Pão Quente', envelope_id: 'casa' },
    { descricao: 'Posto Shell BR', envelope_id: 'ana' },
    { descricao: 'Presente', envelope_id: 'bruno' },
  ]
  it('o limite sugerido é o do gasto parecido; sem parecido, o padrão; nunca um limite em que a pessoa não lança', () => {
    expect(sugerirLimite('PADARIA PAO QUENTE LTDA', anteriores, ['casa', 'ana'], 'ana')).toBe('casa')
    expect(sugerirLimite('Shell Boa Viagem', anteriores, ['casa', 'ana'], 'casa')).toBe('ana')
    expect(sugerirLimite('Loja nova', anteriores, ['casa', 'ana'], 'ana')).toBe('ana')
    expect(sugerirLimite('Presente', anteriores, ['casa', 'ana'], 'ana')).toBe('ana')
  })
  it('já anotado: mesmo valor e até 2 dias de diferença; o que está na lixeira não conta', () => {
    const l = { data: '2026-11-20', descricao: 'Padaria', valor: 12.5, entrada: false }
    expect(jaAnotado(l, [{ data: '2026-11-21', valor: 12.5 }])).toBe(true)
    expect(jaAnotado(l, [{ data: '2026-11-25', valor: 12.5 }])).toBe(false)
    expect(jaAnotado(l, [{ data: '2026-11-20', valor: 12.6 }])).toBe(false)
    expect(jaAnotado(l, [{ data: '2026-11-20', valor: 12.5, apagado_em: '2026-11-21' }])).toBe(false)
  })
})

describe('casos que o Codex achou', () => {
  it('conta em inglês (amount negativo = saída) não vira fatura', () => {
    const conta =
      'date,description,amount\n2026-11-10,Mercado,-19.90\n2026-11-11,Padaria,-8.00\n2026-11-12,Salario,100.00'
    const l = lerExtrato(conta, '2026-11-22')
    expect(l.find(x => x.descricao === 'Mercado')).toMatchObject({ valor: 19.9, entrada: false })
    expect(l.find(x => x.descricao === 'Salario')).toMatchObject({ valor: 100, entrada: true })
    const fatura = 'date,title,amount\n2026-11-10,Mercado,19.90\n2026-11-11,Pagamento recebido,-500.00'
    expect(lerExtrato(fatura, '2026-11-22').find(x => x.descricao === 'Mercado')).toMatchObject({ entrada: false })
  })
  it('linha com data que não existe é ignorada, não herda a data de cima', () => {
    const l = lerExtrato('20/11 Padaria -12,50\n31/02 Posto -100,00', '2026-11-22')
    expect(l).toHaveLength(1)
    expect(l[0].descricao).toBe('Padaria')
  })
})
