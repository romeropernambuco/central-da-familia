import { valorForaPadrao } from './valorForaPadrao'
import { afterEach, expect, it, vi } from 'vitest'
import { CentralDesfazer, desfazer } from './desfazer'
import { FilaPendentes, pendentes } from './pendentes'
import { ErroRede } from '../api/erros'
import { apiExemplo, reiniciarExemplo, exemploComo } from '../api/exemplo'
import { gerarCopia, validarCopia, previaCopia } from './backup'
import { protegerApi } from '../api/protegida'
import { rascunhos, limparRascunhos } from './rascunhos'
afterEach(() => {
  reiniciarExemplo()
  desfazer.limpar()
  limparRascunhos()
  vi.useRealTimers()
})
it('guarda cinco ações, trava desfazer simultâneo e permite repetir falha', async () => {
  const c = new CentralDesfazer()
  let soltar!: (v: boolean) => void
  for (let i = 0; i < 7; i++) c.registrar({ rotulo: String(i), desfazer: async () => true })
  expect(c.ultimas).toHaveLength(5)
  expect(c.atual?.rotulo).toBe('6')
  const f = vi
    .fn()
    .mockResolvedValueOnce(false)
    .mockImplementationOnce(() => new Promise<boolean>(r => (soltar = r)))
  c.registrar({ rotulo: 'teste', desfazer: f })
  expect(await c.executar()).toBe(false)
  expect(c.erro).toBe(true)
  const p = c.executar()
  expect(await c.executar()).toBe(false)
  soltar(true)
  expect(await p).toBe(true)
  expect(f).toHaveBeenCalledTimes(2)
  expect(c.atual).toBeNull()
})
it('fila mantém ação durante queda de rede e rejeita falha de negócio', async () => {
  const fila = new FilaPendentes()
  const enviar = vi.fn().mockRejectedValueOnce(new ErroRede()).mockResolvedValueOnce({ id: 'um' })
  const p = fila.enviar('mesma-chave', enviar)
  await Promise.resolve()
  await Promise.resolve()
  expect(fila.itens.size).toBe(1)
  await fila.repetir()
  expect(await p).toEqual({ id: 'um' })
  expect(fila.itens.size).toBe(0)
  await expect(
    fila.enviar('outra', async () => {
      throw new Error('Sem permissão')
    }),
  ).rejects.toThrow('Sem permissão')
  expect(fila.itens.size).toBe(0)
})
it('backup round-trip completo com dados fictícios, versão, integridade e papel', async () => {
  reiniciarExemplo()
  const c = await gerarCopia(apiExemplo, 'fam-silva')
  validarCopia(JSON.stringify(c))
  await apiExemplo.salvarConfig('fam-silva', 'casa_lista', [])
  await apiExemplo.lancar({
    familia: 'fam-silva',
    envelope: 'env-ana',
    valor: 12,
    data: '2026-11-16',
    descricao: 'Teste fictício',
    chave: 'f23-roundtrip',
  })
  const alterado = await gerarCopia(apiExemplo, 'fam-silva')
  expect(alterado.dados).not.toEqual(c.dados)
  expect(previaCopia(alterado, c).find(p => p.colecao === 'lancamentos')?.substituir).toBe(
    (c.dados.lancamentos as unknown[]).length + 1,
  )
  await apiExemplo.backupRestaurar!('fam-silva', validarCopia(JSON.stringify(c)).dados)
  expect((await gerarCopia(apiExemplo, 'fam-silva')).dados).toEqual(c.dados)
  expect(() => validarCopia(JSON.stringify({ ...c, versaoFormato: 99 }))).toThrow()
  expect(() =>
    validarCopia(JSON.stringify({ ...c, dados: { ...c.dados, lancamentos: [{ id: 'invalido' }] } })),
  ).toThrow()
  expect(() => validarCopia(JSON.stringify({ ...c, dados: {} }))).toThrow()
  exemploComo('equipe')
  await expect(apiExemplo.backupRestaurar!('fam-silva', c.dados)).rejects.toThrow()
  await expect(apiExemplo.backupLer!('fam-silva')).rejects.toThrow()
})
it('configuração registra inverso exato e recusa sobrescrever alteração posterior', async () => {
  let config = { pessoas: [{ id: 'a', nome: 'Antes', salario: 42 }] }
  const api = protegerApi({
    ...apiExemplo,
    modo: 'real',
    config: async () => structuredClone(config) as any,
    salvarConfig: async (_f, _k, v) => {
      config = structuredClone(v) as typeof config
    },
  })
  const antes = structuredClone(config)
  await api.salvarConfig('f', 'casa_folha', { pessoas: [{ id: 'a', nome: 'Depois', salario: 42 }] })
  expect(await desfazer.executar()).toBe(true)
  expect(config).toEqual(antes)
  await api.salvarConfig('f', 'casa_folha', { pessoas: [] })
  config = antes
  expect(await desfazer.executar()).toBe(false)
  expect(config).toEqual(antes)
})
it('exemplo desfaz criação sem exclusão inventada e mantém rascunhos em memória', async () => {
  reiniciarExemplo()
  const api = protegerApi(apiExemplo)
  const antes = await apiExemplo.backupLer!('fam-silva')
  rascunhos.set('cadastro:imovel:teste', { valor: 'fictício' })
  await api.desejoCriar!('fam-silva', {
    nome: 'Teste',
    valor: 10,
    mes: '2027-01',
    volta: 0,
    volta_mes: null,
    volta_de: 'nada',
    volta_certa: false,
  } as any)
  expect(await desfazer.executar()).toBe(true)
  expect(await apiExemplo.backupLer!('fam-silva')).toEqual(antes)
  expect(rascunhos.size).toBe(1)
  limparRascunhos()
  expect(rascunhos.size).toBe(0)
})

it('alerta só acima da mediana recente ou da metade do limite; tolera falta de histórico', () => {
  expect(valorForaPadrao(51, 100, [])).toBe(true)
  expect(valorForaPadrao(50, 100, [])).toBe(false)
  expect(valorForaPadrao(101, 10000, [10, 20, 30])).toBe(true)
  expect(valorForaPadrao(100, 10000, [10, 20, 30])).toBe(false)
  expect(valorForaPadrao(200, 0, [NaN, 0])).toBe(false)
})

it('sair limpa a ação em execução e não deixa sua conclusão atingir outra sessão', async () => {
  const c = new CentralDesfazer()
  let terminar!: (v: boolean) => void
  c.registrar({ rotulo: 'anterior', desfazer: () => new Promise(r => (terminar = r)) })
  const p = c.executar()
  c.limpar()
  c.registrar({ rotulo: 'nova sessão', desfazer: async () => true })
  terminar(true)
  expect(await p).toBe(false)
  expect(c.atual?.rotulo).toBe('nova sessão')
  expect(c.ocupado).toBe(false)
})

it('resposta perdida após gravar reenvia a chave original sem duplicar lançamento', async () => {
  reiniciarExemplo()
  const antes = (await apiExemplo.backupLer!('fam-silva')).lancamentos as unknown[]
  let perder = true
  const enviar = vi.fn(async (n: Parameters<typeof apiExemplo.lancar>[0]) => {
    const r = await apiExemplo.lancar(n)
    if (perder) {
      perder = false
      throw new ErroRede()
    }
    return r
  })
  const api = protegerApi({ ...apiExemplo, lancar: enviar })
  const n = {
    familia: 'fam-silva',
    envelope: 'env-ana',
    valor: 23,
    data: '2026-11-16',
    descricao: 'Fictício',
    chave: 'f23-resposta-perdida',
  }
  const p = api.lancar(n)
  // a repetição só entra depois que a primeira tentativa terminou: não dispara outra por cima de um envio no ar
  await vi.waitFor(() => expect([...pendentes.itens.values()][0]?.emVoo).toBe(false))
  await pendentes.repetir()
  await p
  const depois = (await apiExemplo.backupLer!('fam-silva')).lancamentos as unknown[]
  expect(depois).toHaveLength(antes.length + 1)
  expect(enviar).toHaveBeenCalledTimes(2)
  expect(enviar.mock.calls.map(c => c[0].chave)).toEqual([n.chave, n.chave])
})
