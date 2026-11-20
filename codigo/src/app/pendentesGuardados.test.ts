import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { pendentes } from './pendentes'
import { desfazer } from './desfazer'
import { ErroRede } from '../api/erros'
import { apiExemplo, reiniciarExemplo } from '../api/exemplo'
import { protegerApi } from '../api/protegida'
import { guardarPendente, pendentesGuardados, recusadosGuardados, tirarPendente } from './pendentesGuardados'

const guardado = new Map<string, string>()
beforeEach(() => {
  guardado.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => guardado.get(k) ?? null,
    setItem: (k: string, v: string) => {
      guardado.set(k, v)
    },
    removeItem: (k: string) => {
      guardado.delete(k)
    },
  })
})
afterEach(() => {
  pendentes.limpar()
  reiniciarExemplo()
  desfazer.limpar()
  vi.unstubAllGlobals()
})

const gasto = (chave: string) => ({
  familia: 'fam-silva',
  envelope: 'env-ana',
  valor: 23,
  data: '2026-11-16',
  descricao: 'Fictício',
  chave,
})
const chaves = () => JSON.parse(guardado.get('envios_pendentes') || '[]').map((x: any) => x.dados.chave)
/** Mesma API do exemplo, tratada como banco real (é só no real que a fila vai para o aparelho). */
const real = (lancar: typeof apiExemplo.lancar) => protegerApi({ ...apiExemplo, modo: 'real', lancar })

it('gasto anotado sem internet sobrevive a fechar o app e é reenviado, uma vez só, ao abrir de novo', async () => {
  const semRede = vi.fn(async () => {
    throw new ErroRede()
  })
  const antes = real(semRede)
  await antes.sessao()
  void antes.lancar(gasto('fila-1')).catch(() => {})
  await vi.waitFor(() => expect(pendentes.itens.size).toBe(1))
  expect(chaves()).toEqual(['fila-1'])

  // o app fecha: a memória some, o aparelho continua com o gasto
  pendentes.itens.clear()
  const comRede = vi.fn(apiExemplo.lancar)
  const depois = real(comRede)
  await depois.sessao()
  await vi.waitFor(() => expect(chaves()).toEqual([]))
  expect(comRede).toHaveBeenCalledTimes(1)
  expect(comRede.mock.calls[0][0]).toMatchObject({ chave: 'fila-1', valor: 23, data: '2026-11-16' })
  // abrir outra vez não reenvia nada
  await depois.sessao()
  expect(comRede).toHaveBeenCalledTimes(1)
})

it('gasto salvo na hora, ou recusado de vez, não fica guardado no aparelho', async () => {
  const ok = real(vi.fn(apiExemplo.lancar))
  await ok.sessao()
  await ok.lancar(gasto('fila-2'))
  expect(chaves()).toEqual([])
  const recusa = real(
    vi.fn(async () => {
      throw new Error('Valor inválido')
    }),
  )
  await recusa.sessao()
  await expect(recusa.lancar(gasto('fila-3'))).rejects.toThrow('Valor inválido')
  expect(chaves()).toEqual([])
})

it('não reenvia o que é de outra pessoa no mesmo aparelho, e o modo exemplo não guarda nada', async () => {
  guardarPendente('outra-sessao|fam-silva|x', gasto('de-outra'))
  const lancar = vi.fn(apiExemplo.lancar)
  const api = real(lancar)
  await api.sessao()
  await new Promise(r => setTimeout(r, 20))
  expect(lancar).not.toHaveBeenCalled()
  expect(pendentesGuardados('outra-sessao|fam-silva|x')).toHaveLength(1)

  guardado.clear()
  const exemplo = protegerApi({
    ...apiExemplo,
    lancar: vi.fn(async () => {
      throw new ErroRede()
    }),
  })
  await exemplo.sessao()
  void exemplo.lancar(gasto('fila-4')).catch(() => {})
  await vi.waitFor(() => expect(pendentes.itens.size).toBe(1))
  expect(chaves()).toEqual([])
})

const donoDaSessao = async () => {
  const s = (await apiExemplo.sessao())!
  return `${s.userId}|${s.familias[0].id}|${s.familias[0].membroId || ''}`
}

it('sair da conta, ou a sessão cair, com gasto pendente NÃO apaga o gasto: ele volta a ser enviado ao entrar de novo', async () => {
  const antes = real(
    vi.fn(async () => {
      throw new ErroRede()
    }),
  )
  await antes.sessao()
  void antes.lancar(gasto('fila-sair')).catch(() => {})
  await vi.waitFor(() => expect(pendentes.itens.size).toBe(1))
  pendentes.limpar() // é o que o app faz ao sair e quando a sessão acaba
  await new Promise(r => setTimeout(r, 20))
  expect(chaves()).toEqual(['fila-sair'])

  const comRede = vi.fn(apiExemplo.lancar)
  await real(comRede).sessao()
  await vi.waitFor(() => expect(chaves()).toEqual([]))
  expect(comRede.mock.calls.map(c => c[0].chave)).toEqual(['fila-sair'])
})

it('reenvio que o banco recusa de vez não some: fica marcado com o motivo e o app não insiste sozinho', async () => {
  const dono = await donoDaSessao()
  guardarPendente(dono, gasto('fila-recusa'))
  const recusa = vi.fn(async () => {
    throw new Error('Esse limite não existe mais.')
  })
  const api = real(recusa)
  await api.sessao()
  await vi.waitFor(() => expect(recusadosGuardados(dono)).toHaveLength(1))
  expect(recusadosGuardados(dono)[0]).toMatchObject({
    erro: 'Esse limite não existe mais.',
    dados: { chave: 'fila-recusa', valor: 23 },
  })
  expect(pendentesGuardados(dono)).toEqual([])
  await api.sessao()
  await new Promise(r => setTimeout(r, 20))
  expect(recusa).toHaveBeenCalledTimes(1)
  // a pessoa decide: descartar tira do aparelho
  tirarPendente('fila-recusa')
  expect(recusadosGuardados(dono)).toEqual([])
})
