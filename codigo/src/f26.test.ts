import { it, expect, vi, afterEach } from 'vitest'
import { protegerApi } from './api/protegida'
import { apiExemplo, reiniciarExemplo, exemploComo } from './api/exemplo'
import { desfazer } from './app/desfazer'
import { salvamento } from './app/salvamento'
import { FilaPendentes } from './app/pendentes'
import { rascunhos } from './app/rascunhos'
afterEach(() => {
  desfazer.limpar()
  salvamento.limpar()
  rascunhos.clear()
  reiniciarExemplo()
})
it('1 imóvel não sobrescreve mudança posterior', async () => {
  let registro: any = { id: 'i', apelido: 'Antes', valor: 10 }
  const gravar = vi.fn(async (_f: any, _id: any, d: any) => {
    registro = { ...registro, ...d }
  })
  const api = protegerApi({ ...apiExemplo, modo: 'real', imoveis: async () => [registro], imovelSalvar: gravar })
  await api.imovelSalvar!('f', 'i', { apelido: 'Depois' } as any)
  registro.valor = 50
  expect(await desfazer.executar()).toBe(false)
  expect(gravar).toHaveBeenCalledTimes(1)
})
it('2 gravação concorrente ao inverso continua protegida', async () => {
  let resolver!: () => void
  const api = protegerApi({
    ...apiExemplo,
    modo: 'real',
    salvarConfig: async () => {},
    config: async () => ({}) as any,
  })
  desfazer.registrar({
    rotulo: 'x',
    desfazer: () =>
      new Promise<boolean>(r => {
        resolver = () => r(true)
      }),
  })
  const inverso = desfazer.executar()
  await api.salvarConfig('f', 'rendas', {})
  resolver()
  await inverso
  expect(desfazer.atual).not.toBeNull()
})
it('3 duas chamadas compartilham o primeiro envio', async () => {
  const fila = new FilaPendentes()
  let liberar!: (n: number) => void
  const envio = vi.fn(
    () =>
      new Promise<number>(r => {
        liberar = r
      }),
  )
  const a = fila.enviar('x', envio),
    b = fila.enviar('x', envio)
  liberar(1)
  expect(await a).toBe(1)
  expect(await b).toBe(1)
  expect(envio).toHaveBeenCalledTimes(1)
})
it('5 salvar cadastro preserva outro rascunho', async () => {
  rascunhos.set('cadastro:imovel:outro', { a: 1 })
  const api = protegerApi({ ...apiExemplo, modo: 'real', imoveis: async () => [], imovelSalvar: async () => {} })
  await api.imovelSalvar!('f', 'i', {} as any)
  expect(rascunhos.size).toBe(1)
})
it('6 leitura posterior não rejeita gravação concluída', async () => {
  let n = 0
  const api = protegerApi({
    ...apiExemplo,
    backupLer: async () => {
      if (n++) throw Error('rede')
      return {}
    },
    salvarConfig: async () => {},
    config: async () => ({}) as any,
  })
  await expect(api.salvarConfig('f', 'rendas', {})).resolves.toBeUndefined()
  expect(desfazer.atual).toBeNull()
})
it('7 status acompanha inverso', async () => {
  let liberar!: (v: boolean) => void
  desfazer.registrar({
    rotulo: 'x',
    desfazer: () =>
      new Promise(r => {
        liberar = r
      }),
  })
  const p = desfazer.executar()
  expect(salvamento.estado).toBe('Desfazendo')
  liberar(true)
  await p
})
it('8 backup exige casal', async () => {
  exemploComo('filha')
  await expect(apiExemplo.backupLer!('fam-silva')).rejects.toThrow()
})

import { gerarCopia, validarCopia, previaCopia } from './app/backup'
import { validarNome } from './lib/nomePessoa'
it('9 rejeita estado com envelopes objeto antes de restaurar', async () => {
  const c = await gerarCopia(apiExemplo, 'fam-silva')
  ;(c.dados.estado as any).envs = {}
  expect(() => validarCopia(JSON.stringify(c))).toThrow()
  await expect(apiExemplo.backupRestaurar!('fam-silva', c.dados)).rejects.toThrow()
})
it('10 prévia conta alterados e excluídos em configurações também', () => {
  const a: any = { dados: { config: { a: 1, b: 2 }, pessoas: [{ id: 'x', nome: 'A' }] } },
    b: any = { dados: { config: { a: 2, c: 3 }, pessoas: [] } }
  const p = previaCopia(a, b).find(x => x.colecao === 'config')! as any
  expect(p.alterados).toBe(1)
  expect(p.excluidos).toBe(1)
  expect(p.novos).toBe(1)
})
it('11 restaurar preserva chaves de lançamento', async () => {
  const n = {
    familia: 'fam-silva',
    envelope: 'env-ana',
    valor: 1,
    data: '2026-11-16',
    descricao: 'teste',
    chave: 'f26-chave',
  }
  await apiExemplo.lancar(n)
  const c = await gerarCopia(apiExemplo, 'fam-silva')
  await apiExemplo.backupRestaurar!('fam-silva', c.dados)
  expect((await apiExemplo.lancar(n)).repetido).toBe(true)
})
it.each(['<b>Teste</b>', '!!!', '\u200b'])('17 rejeita nome inválido %s', n => {
  expect(() => validarNome(n)).toThrow()
})

// @ts-ignore node só no teste
import { readFileSync } from 'node:fs'
it('20 módulo inicial tem recuperação independente do bundle', () => {
  const html = readFileSync('index.html', 'utf8')
  expect(html).toContain('setTimeout')
  expect(html).toContain('Tentar de novo')
  expect(html).toContain('central:aberta')
})
it('21 navegador cobre módulo inicial e rota lazy', () => {
  const teste = readFileSync('testes/falha.cjs', 'utf8')
  expect(teste).not.toContain('Não deu pra abrir a Central agora')
  expect(teste).toContain('módulo inicial')
  expect(teste).toContain('rota lazy')
})

// @ts-ignore script de build
import { arquivosEssenciais } from '../scripts/sw.mjs'
it('19 precache exclui rotas lazy e inclui imports estáticos', () => {
  const files = ['index.html', 'assets/main.js', 'assets/base.js', 'assets/Lancar.js', 'assets/main.css', 'icone.png']
  const fontes: Record<string, string> = {
    'index.html':
      '<script type="module" src="./assets/main.js"></script><link rel="stylesheet" href="./assets/main.css">',
    'assets/main.js': 'import "./base.js"; import("./Lancar.js")',
    'assets/base.js': '',
  }
  expect(arquivosEssenciais(files, (p: string) => fontes[p] || '')).toEqual([
    'index.html',
    'assets/main.js',
    'assets/base.js',
    'assets/main.css',
  ])
})

it('1 desejo não sobrescreve mudança posterior', async () => {
  let registro: any = { id: 'd', nome: 'Antes', situacao: 'pensando' }
  const gravar = vi.fn(async (_f: any, _id: any, d: any) => {
    registro = { ...registro, ...d }
  })
  const api = protegerApi({ ...apiExemplo, modo: 'real', desejos: async () => [registro], desejoMudar: gravar })
  await api.desejoMudar!('f', 'd', { situacao: 'combinado' })
  registro.nome = 'Outra mudança'
  expect(await desfazer.executar()).toBe(false)
  expect(gravar).toHaveBeenCalledTimes(1)
})

it.each(['timeout', 'error'])('20 recuperação inline executa sem módulo: %s', tipo => {
  vi.useFakeTimers()
  const root = { innerHTML: 'Abrindo...', querySelector: () => ({ onclick: null }) }
  const ouvintes: Record<string, Function> = {}
  const win = {
    addEventListener: (k: string, f: Function) => {
      ouvintes[k] = f
    },
  }
  const script = readFileSync('index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)![1]
  new Function('window', 'document', 'location', 'setTimeout', 'clearTimeout', script)(
    win,
    { getElementById: () => root },
    { reload: vi.fn() },
    setTimeout,
    clearTimeout,
  )
  if (tipo === 'timeout') vi.advanceTimersByTime(15001)
  else ouvintes.error({ target: { tagName: 'SCRIPT', type: 'module' } })
  expect(root.innerHTML).toContain('Tentar de novo')
  vi.useRealTimers()
})

it.each(['envs', 'objetivo', 'Guardado', 'referência', 'configuração'])('9 rejeição atômica: %s', async caso => {
  const antes = await apiExemplo.backupLer!('fam-silva'),
    d: any = structuredClone(antes)
  if (caso === 'envs') d.estado.envs = {}
  if (caso === 'objetivo') d.estado.objetivo = {}
  if (caso === 'Guardado') d.estado2.itens = [{}]
  if (caso === 'referência') {
    d.estado.lanc[0].envelope_id = 'inexistente'
    d.lancamentos = d.estado.lanc
  }
  if (caso === 'configuração') {
    d.estado.config.rendas = {}
    d.config = d.estado.config
  }
  await expect(apiExemplo.backupRestaurar!('fam-silva', d)).rejects.toThrow()
  expect(await apiExemplo.backupLer!('fam-silva')).toEqual(antes)
})

it('8 sem sessão não lê nem restaura backup', async () => {
  const c = await apiExemplo.backupLer!('fam-silva')
  await apiExemplo.sair()
  await expect(apiExemplo.backupLer!('fam-silva')).rejects.toThrow()
  await expect(apiExemplo.backupRestaurar!('fam-silva', c)).rejects.toThrow()
})
