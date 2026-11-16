import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.doUnmock('@supabase/supabase-js'); vi.resetModules() })

it.each(['constraint secret_table valor=123', 'constructor'])('K: tradução da recusa da equipe protege motivo desconhecido: %s', async motivo => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://teste.invalid')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'teste-sem-acesso')
  vi.doMock('@supabase/supabase-js', () => ({ createClient: () => ({
    auth: { getSession: async () => ({ data: { session: {} } }) },
    rpc: async () => ({ data: { ok: false, motivo }, error: null }),
  }) }))
  const { apiReal } = await import('./real')
  await expect(apiReal.entrarEquipe('convite-ficticio', '0000')).rejects.toThrow(/Diagnóstico: [a-z0-9]{7}/)
})

it.each(['P0001', '22023', '42501', '54000'])('RPC preserva explicação de negócio com SQLSTATE %s', async code => {
  const message = code === '54000' ? 'a familia ja tem 30 aplicacoes abertas' : 'so o casal apaga a familia'
  vi.stubEnv('VITE_SUPABASE_URL', 'https://teste.invalid')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'teste-sem-acesso')
  vi.doMock('@supabase/supabase-js', () => ({ createClient: () => ({
    rpc: async () => ({ data: null, error: { code, message } }),
  }) }))
  const { apiReal } = await import('./real')
  await expect(apiReal.criarFamilia('Fictícia', 'Pessoa')).rejects.toThrow(message === 'a familia ja tem 30 aplicacoes abertas' ? 'A família já tem 30 aplicações abertas.' : message)
})
