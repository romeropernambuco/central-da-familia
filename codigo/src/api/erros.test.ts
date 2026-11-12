import { describe, expect, it } from 'vitest'
import { ErroRede, ErroSessao, sessaoVale, traduzErro } from './erros'
import { rotaDoHash, rotaPermitida } from '../app/rotas'

describe('erros do banco e da rede', () => {
  it('sem internet no Chrome, no Firefox e no Safari/iPhone vira ErroRede', () => {
    for (const m of ['TypeError: Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed', 'fetch failed'])
      expect(traduzErro({ message: m })).toBeInstanceOf(ErroRede)
    expect(traduzErro({ message: 'Load failed' }).message).toMatch(/Nada foi salvo/)
  })
  it('token vencido vira ErroSessao; tranca do banco NÃO manda entrar de novo', () => {
    expect(traduzErro({ message: 'JWT expired', code: 'PGRST301' })).toBeInstanceOf(ErroSessao)
    expect(traduzErro({ message: 'x', status: 401 })).toBeInstanceOf(ErroSessao)
    expect(traduzErro({ message: 'Invalid Refresh Token: Refresh Token Not Found' })).toBeInstanceOf(ErroSessao)
    const tranca = traduzErro({ message: 'new row violates row-level security policy for table "config_familia"' })
    expect(tranca).not.toBeInstanceOf(ErroSessao)
    expect(tranca.message).toMatch(/permissão/)
    expect(traduzErro({ message: 'permission denied for function numeros_semana' })).not.toBeInstanceOf(ErroSessao)
  })
  it('erros do login por código saem em português', () => {
    expect(traduzErro({ message: 'Token has expired or is invalid' }).message).toMatch(/Código errado ou vencido/)
    expect(traduzErro({ message: 'For security purposes, you can only request this after 43 seconds.' }).message).toMatch(/Espere 1 minuto/)
    expect(traduzErro({ message: 'Anonymous sign-ins are disabled' }).message).toMatch(/login anônimo/)
    expect(traduzErro({ message: 'so o casal convida' }).message).toBe('Só o casal convida.')
    expect(traduzErro(null).message).toBe('Não deu certo')
  })
  it('login anônimo sem família (equipe errou o código) não é sessão', () => {
    expect(sessaoVale(true, 0)).toBe(false)
    expect(sessaoVale(true, 1)).toBe(true)
    expect(sessaoVale(false, 0)).toBe(true) // casal novo: segue pro primeiro uso
  })
})

describe('rotas por papel', () => {
  it('a equipe só abre a Casa, digite o endereço que digitar', () => {
    for (const h of ['#/inicio', '#/primeiro-uso', '#/planejamento', '#/cartoes', '#/painel', '#/privacidade', '#/qualquer', ''])
      expect(rotaPermitida(rotaDoHash(h), 'equipe')).toBe('casa')
  })
  it('endereço desconhecido abre o Início; painel só pro dono', () => {
    expect(rotaDoHash('#/nao-existe')).toBe('inicio')
    expect(rotaDoHash('#/cartoes?x=1')).toBe('cartoes')
    expect(rotaPermitida('painel', 'casal', false)).toBe('inicio')
    expect(rotaPermitida('painel', 'casal', true)).toBe('painel')
    expect(rotaPermitida('entrar', 'pessoa')).toBe('inicio')
  })
})
