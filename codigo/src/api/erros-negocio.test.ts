import { expect, it } from 'vitest'
import { ErroRede, ErroSessao, TRADUZ, traduzErro } from './erros'

const negocios = [
  'a familia ja tem 30 aplicacoes abertas',
  'a data tem que ser de hoje pra tras, ate 10 anos',
  'cada um muda so o proprio limite, o da Casa e o da filha',
  'esse lancamento ja foi gravado (mesma chave)',
  'entre com o e-mail do convite',
  'so o casal apaga a familia',
]
const tecnicas = [
  'duplicate key value violates unique constraint x_pkey Key (id)=(...)',
  'relation produto.lancamentos does not exist',
  'new row violates row-level security policy',
  'violates regra interna', 'constraint interna', 'relation ausente', 'column ausente',
  'schema indisponivel', 'duplicate key', 'null value encontrado', 'syntax incorreta',
  'permission denied', 'function interna', 'uuid invalido', 'pg_catalog interno',
  'produto.lancamentos indisponivel', 'public.membros indisponivel',
  'a tabela "membros" esta bloqueada', 'tabela “membros” indisponivel',
  'nao deu certo Key (valor)=(10)', 'DETAIL: valor privado', 'HINT: comando interno',
  'CONTEXT: chamada interna', 'email pessoa@exemplo.invalid ja tem conta',
  'membro 12345678-1234-4234-8234-123456789abc nao encontrado',
]
const generica = /^Não foi possível concluir\. Diagnóstico: [a-z0-9]{7}\.$/

// Cada linha cobre tanto a liberação de negócio quanto a barreira técnica e de dados privados.
it.each(['P0001', '22023', '42501'])('negócios reais com %s; mensagens técnicas, vazias e códigos desconhecidos protegidos', code => {
  for (const message of negocios) expect(traduzErro({ code, message }).message).toBe(TRADUZ[message] || message)
  for (const message of tecnicas) {
    const entrada = { code, message }
    const primeira = traduzErro(entrada).message
    expect(primeira, message).toMatch(generica)
    expect(traduzErro({ ...entrada }).message).toBe(primeira)
  }
  for (const outro of ['XXXXX', '23505', '23514', 'P0002', '54000', undefined]) {
    expect(traduzErro({ code: outro, message: negocios[1] }).message).toMatch(generica)
  }
  for (const message of ['', '   ', undefined]) {
    const entrada = { code, message }
    expect(traduzErro(entrada).message).toMatch(generica)
    expect(traduzErro(entrada).message).toBe(traduzErro({ ...entrada }).message)
  }
  expect(traduzErro(null).message).toMatch(generica)
  expect(traduzErro(undefined).message).toMatch(generica)
  // TRADUZ prevalece mesmo com SQLSTATE técnico; rede e sessão conservam o tratamento próprio.
  expect(traduzErro({ code: '23505', message: negocios[3] }).message).toBe(TRADUZ[negocios[3]])
  expect(traduzErro({ message: 'Failed to fetch' })).toBeInstanceOf(ErroRede)
  expect(traduzErro({ code: 'PGRST301', message: 'JWT expired' })).toBeInstanceOf(ErroSessao)
})

it('mensagem real de limite de aplicações usa TRADUZ com o SQLSTATE 54000 da migração', () => {
  const entrada = { code: '54000', message: negocios[0] }
  expect(traduzErro(entrada).message).toBe('A família já tem 30 aplicações abertas.')
})
