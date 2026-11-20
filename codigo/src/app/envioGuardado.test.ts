import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ErroRede, ErroSessao } from '../api/erros'
import { envioContinuaGuardado, EnvioInterrompido, FICOU_ESPERANDO, FilaPendentes } from './pendentes'
import { definirDonoDosPendentes, recusadosGuardados } from './pendentesGuardados'
import { avisarQuandoOEnvioTerminar, reenviarRecusado } from './envioGuardado'

const guardado = new Map<string, string>()
beforeEach(() => {
  guardado.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => guardado.get(k) ?? null,
    setItem: (k: string, v: string) => void guardado.set(k, v),
    removeItem: (k: string) => void guardado.delete(k),
  })
})
afterEach(() => {
  definirDonoDosPendentes('')
  vi.unstubAllGlobals()
})

const gasto = { familia: 'f', envelope: 'e', valor: 23, data: '2026-11-16', descricao: 'Fictício', chave: 'c1' }
const app = () => ({ toast: vi.fn(), recarregar: vi.fn(async () => {}) })
const texto = (a: ReturnType<typeof app>) =>
  String(a.toast.mock.calls[a.toast.mock.calls.length - 1]?.[0]).replace(/ /g, ' ')

it('fila: sem internet o envio fica esperando e a tela é liberada; com internet, a espera não dispara', async () => {
  const fila = new FilaPendentes()
  const semRede = fila.enviar('c1', async () => Promise.reject(new ErroRede()))
  expect(await Promise.race([semRede, fila.ficouEsperando('c1', semRede)])).toBe(FICOU_ESPERANDO)
  expect(fila.itens.has('c1')).toBe(true)

  const comRede = fila.enviar('c2', async () => 'salvo')
  expect(await Promise.race([comRede, fila.ficouEsperando('c2', comRede)])).toBe('salvo')
})

it('fila: quem esperava para liberar a tela para de escutar quando o envio termina, dando certo ou não', async () => {
  const fila = new FilaPendentes()
  const escutando = () => (fila as unknown as { ouvintes: Set<unknown> }).ouvintes.size
  const salvou = fila.enviar('c1', async () => 'salvo')
  void fila.ficouEsperando('c1', salvou)
  await salvou
  const recusou = fila.enviar('c2', async () => Promise.reject(new Error('recusado')))
  void fila.ficouEsperando('c2', recusou)
  await recusou.catch(() => {})
  await Promise.resolve()
  expect(escutando()).toBe(0)
})

it('sessão vencida no meio de um reenvio não conta como recusa: o gasto continua guardado', () => {
  expect(envioContinuaGuardado(new ErroSessao())).toBe(true)
  expect(envioContinuaGuardado(new EnvioInterrompido())).toBe(true)
  expect(envioContinuaGuardado(new Error('Sessão encerrada. Confira os dados ao entrar.'))).toBe(true)
  expect(envioContinuaGuardado(new ErroRede())).toBe(false)
  expect(envioContinuaGuardado(new Error('Esse limite não existe mais.'))).toBe(false)
})

it('"Tentar de novo" num gasto recusado: se o banco recusar outra vez, ele volta para a faixa com o motivo novo', async () => {
  definirDonoDosPendentes('sessao|f|m')
  const lancar = vi.fn(async () => Promise.reject(new Error('Valor acima do permitido.')))
  await expect(reenviarRecusado(lancar, gasto)).rejects.toThrow('Valor acima do permitido.')
  expect(recusadosGuardados('sessao|f|m')).toMatchObject([
    { erro: 'Valor acima do permitido.', dados: { chave: 'c1' } },
  ])
  // sessão vencida não vira recusa
  guardado.clear()
  await expect(reenviarRecusado(async () => Promise.reject(new ErroSessao()), gasto)).rejects.toBeInstanceOf(ErroSessao)
  expect(recusadosGuardados('sessao|f|m')).toEqual([])
})

it('fila: a repetição automática não dispara outra tentativa por cima de um envio que ainda está no ar', async () => {
  const fila = new FilaPendentes()
  let soltar!: (v: string) => void
  const executar = vi.fn(() => new Promise<string>(r => (soltar = r)))
  const envio = fila.enviar('c1', executar)
  await fila.repetir()
  await fila.repetir()
  expect(executar).toHaveBeenCalledTimes(1)
  soltar('salvo')
  expect(await envio).toBe('salvo')
})

it('envio guardado que salva depois: atualiza os números e avisa com o valor', async () => {
  const a = app()
  await avisarQuandoOEnvioTerminar(Promise.resolve('ok'), gasto, a)
  expect(a.recarregar).toHaveBeenCalledOnce()
  expect(texto(a)).toBe('O gasto guardado foi salvo: R$ 23.')
})

it('envio guardado que o banco recusa de vez: vai para a faixa de envios com o motivo, não some', async () => {
  definirDonoDosPendentes('sessao|f|m')
  const a = app()
  await avisarQuandoOEnvioTerminar(Promise.reject(new Error('Esse limite não existe mais.')), gasto, a)
  expect(recusadosGuardados('sessao|f|m')).toMatchObject([
    { erro: 'Esse limite não existe mais.', dados: { chave: 'c1' } },
  ])
  expect(texto(a)).toContain('não foi aceito')
  expect(a.recarregar).not.toHaveBeenCalled()
})

it('a sessão acabou no meio: não avisa nada e não marca como recusado (o gasto continua guardado)', async () => {
  definirDonoDosPendentes('sessao|f|m')
  const a = app()
  await avisarQuandoOEnvioTerminar(Promise.reject(new EnvioInterrompido()), gasto, a)
  expect(a.toast).not.toHaveBeenCalled()
  expect(recusadosGuardados('sessao|f|m')).toEqual([])
})

it('se a atualização dos números falhar depois de salvar, o aviso de salvo aparece do mesmo jeito', async () => {
  const a = { toast: vi.fn(), recarregar: vi.fn(async () => Promise.reject(new ErroRede())) }
  await avisarQuandoOEnvioTerminar(Promise.resolve('ok'), gasto, a)
  expect(String(a.toast.mock.calls[0][0])).toContain('foi salvo')
})
