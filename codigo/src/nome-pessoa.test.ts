import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContextoApp, type Ctx } from './app/contexto'
import { NomeDaPessoa } from './componentes/NomeDaPessoa'
import { nomeInformado, podeEditarNome, validarNome } from './lib/nomePessoa'
import { apiExemplo, reiniciarExemplo, exemploComo } from './api/exemplo'
import { invalidarNomes } from './app/useMembros'
import { lojaEscritorio } from './app/escritorioCompartilhado'
import type { FamiliaMinha } from './api/tipos'

const f: FamiliaMinha = { id: 'f', nome: 'Exemplo', papel: 'casal', membroId: 'm-ana', membroNome: 'Ana', envelopeId: null }
const antigos = ['', '   ', 'alguém', 'Alguém do casal', 'Equipe', 'outro adulto', 'convidado', 'pessoa', 'Responsável não identificado', 'Assessor da Casa']
function mostrar(nome: string, api = apiExemplo, familia = f, oculto = false) {
  const ctx = { api, familia, oculto, versao: 0 } as Ctx
  return renderToStaticMarkup(createElement(ContextoApp.Provider, { value: ctx }, createElement(NomeDaPessoa, { pessoa: { tipo: 'membro', id: 'm-bruno', nome }, editar: true })))
}
describe('identidade editável', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-16T12:00:00-03:00')); reiniciarExemplo() })
  afterEach(() => vi.useRealTimers())
  it.each(antigos)('oferece cadastro em vez de %j', nome => {
    expect(nomeInformado(nome)).toBe(false)
    const html = mostrar(nome)
    expect(html).toContain('Sem nome.')
    expect(html).toMatch(/<button[^>]+type="button"[^>]*>Informar<\/button>/)
  })
  it('oferece edição e mantém o nome privado com olho fechado', () => {
    expect(mostrar('Bruno')).toContain('Editar nome')
    expect(mostrar('Bruno', apiExemplo, f, true)).not.toContain('Bruno')
  })
  it('real sem capacidade informa a dependência sem botão enganoso', () => {
    const html = mostrar('', { ...apiExemplo, modo: 'real', salvarNomePessoa: undefined })
    expect(html).toContain('Peça a quem administra a família para informar o nome')
    expect(html).not.toContain('<button')
  })
  it('valida trim, tamanho e nomes repetidos de outros ativos', () => {
    expect(validarNome('  Maria  ')).toBe('Maria')
    expect(validarNome('A')).toBe('A')
    expect(validarNome('A'.repeat(60))).toHaveLength(60)
    for (const n of ['', '   ', 'A'.repeat(61)]) expect(() => validarNome(n)).toThrow()
    expect(() => validarNome(' ÁNA ', [{ id: '1', nome: 'Ana' }], '2')).toThrow(/ativo/)
    expect(validarNome('Ana', [{ id: '1', nome: 'Ana' }], '1')).toBe('Ana')
  })
  it.each(['casal', 'pessoa', 'equipe'] as const)('permissão por papel: %s', papel => {
    const atual = { ...f, papel }
    expect(podeEditarNome(atual, { tipo: 'membro', id: 'm-ana' })).toBe(true)
    expect(podeEditarNome(atual, { tipo: 'membro', id: 'm-bruno' })).toBe(papel === 'casal')
    expect(podeEditarNome(atual, { tipo: 'convite', id: 'm-ana' })).toBe(papel === 'casal')
    expect(podeEditarNome(atual, { tipo: 'assessor', id: 'm-bruno' })).toBe(papel === 'casal')
    expect(podeEditarNome(null, { tipo: 'membro', id: 'm-ana' })).toBe(false)
  })
  it('atualiza membro, sessão, renda textual, convites e fala do funcionário', async () => {
    const fam = (await apiExemplo.sessao())!.familias[0]
    const loja = lojaEscritorio(apiExemplo, fam.id)
    await loja.ler(apiExemplo, fam.id)
    await apiExemplo.salvarNomePessoa!(fam.id, { tipo: 'membro', id: fam.membroId! }, 'Marina')
    invalidarNomes()
    await loja.ler(apiExemplo, fam.id)
    expect((await apiExemplo.membros(fam.id)).find(m => m.id === fam.membroId)?.nome).toBe('Marina')
    expect((await apiExemplo.sessao())!.familias[0].membroNome).toBe('Marina')
    expect((await apiExemplo.convites!(fam.id)).some(c => c.nome === 'Marina')).toBe(true)
    expect(JSON.stringify(await apiExemplo.config(fam.id, 'rendas', []))).toContain('Marina')
    expect(JSON.stringify(loja.snapshot().dado)).toContain('Marina')
  })
  it('altera convite e cadastra autor antigo sem membro no exemplo', async () => {
    const fam = (await apiExemplo.sessao())!.familias[0]
    await apiExemplo.convidar(fam.id, 'pessoa', 'Nome anterior', 'anonimo@exemplo.com')
    const c = (await apiExemplo.convites!(fam.id)).find(c => c.email === 'anonimo@exemplo.com')!
    await apiExemplo.salvarNomePessoa!(fam.id, { tipo: 'convite', id: c.id }, 'Lia')
    expect((await apiExemplo.convites!(fam.id)).find(x => x.id === c.id)?.nome).toBe('Lia')
    await apiExemplo.salvarNomePessoa!(fam.id, { tipo: 'membro', id: 'autor:antigo' }, 'Rita')
    expect((await apiExemplo.membros(fam.id)).find(m => m.id === 'autor:antigo')?.nome).toBe('Rita')
  })
  it.each(['filha', 'equipe'] as const)('API exemplo impede %s de renomear outros, mas salva o próprio', async papel => {
    exemploComo(papel)
    const fam = (await apiExemplo.sessao())!.familias[0]
    await expect(apiExemplo.salvarNomePessoa!(fam.id, { tipo: 'membro', id: 'm-bruno' }, 'Outro')).rejects.toThrow('próprio')
    await expect(apiExemplo.salvarNomePessoa!(fam.id, { tipo: 'convite', id: 'cv4' }, 'Outro')).rejects.toThrow('próprio')
    await apiExemplo.salvarNomePessoa!(fam.id, { tipo: 'membro', id: fam.membroId! }, 'Lina', 'Cozinha')
    expect((await apiExemplo.sessao())!.familias[0].membroNome).toBe('Lina')
    expect((await apiExemplo.membros(fam.id)).map(m => m.nome)).toEqual(['Lina'])
    if (papel === 'equipe') expect(JSON.stringify(await apiExemplo.casaDaEquipe(fam.id))).not.toMatch(/salario|valor|saldo/)
  })
  it('renomear atualiza titular das aplicações e reiniciar limpa as duas famílias de exemplo', async () => {
    const fam = (await apiExemplo.sessao())!.familias[0]
    await apiExemplo.salvarNomePessoa!(fam.id, { tipo: 'membro', id: 'm-bruno' }, 'Benício')
    expect((await apiExemplo.guardadoHoje(fam.id)).aplicacoes.find(a => a.titular === 'm-bruno')?.titular_nome).toBe('Benício')
    exemploComo('autonoma')
    const solo = (await apiExemplo.sessao())!.familias[0]
    await apiExemplo.salvarNomePessoa!(solo.id, { tipo: 'membro', id: solo.membroId! }, 'Luzia')
    reiniciarExemplo(); exemploComo('autonoma')
    expect((await apiExemplo.sessao())!.familias[0].membroNome).toBe('Cláudia')
  })
})
