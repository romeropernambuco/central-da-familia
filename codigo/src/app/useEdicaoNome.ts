import type { PessoaNome } from '../api/tipos'
import { useApp } from './contexto'
import { invalidarNomes } from './useMembros'
import { podeEditarNome, validarNome } from '../lib/nomePessoa'
import { lojaEscritorio } from './escritorioCompartilhado'

/** A configuração já pode ser alterada pelo casal; identidade de login exige capacidade própria. */
export function useEdicaoNome(p: PessoaNome) {
  const { api, familia, trocarSessao, recarregar, nomesMudaram } = useApp()
  const config = ['assessor', 'prestador', 'renda'].includes(p.tipo) && familia?.papel === 'casal'
  const permitido = podeEditarNome(familia, p) && (!!api.salvarNomePessoa || config)
  const salvar = async (nome: string, funcao: string) => {
    if (!permitido || !familia) throw new Error('Peça a quem administra a família para informar o nome')
    const ms = familia.papel === 'casal' ? await api.membros(familia.id) : []
    const n = validarNome(nome, ms, p.tipo === 'membro' ? p.id : undefined)
    if (api.salvarNomePessoa) await api.salvarNomePessoa(familia.id, p, n, funcao.trim())
    else {
      const chave = p.tipo === 'assessor' ? 'casa_folha' : p.tipo === 'prestador' ? 'casa_prestadores' : 'rendas'
      // Relê antes de escrever; preserva todos os campos, inclusive os não exibidos nesta folha.
      const cfg = await api.config<any>(familia.id, chave, null)
      const lista: { id: string; nome: string; dono?: string; funcao?: string }[] = p.tipo === 'assessor' ? cfg?.pessoas : cfg
      if (!lista?.some(x => x.id === p.id)) throw new Error('Cadastro não encontrado. Atualize a lista.')
      const novas = lista.map(x => x.id !== p.id ? x : p.tipo === 'renda' ? { ...x, dono: n } : { ...x, nome: n, ...(p.tipo === 'assessor' ? { funcao: funcao.trim() } : {}) })
      await api.salvarConfig(familia.id, chave, p.tipo === 'assessor' ? { ...cfg, pessoas: novas } : novas)
    }
    invalidarNomes()
    nomesMudaram?.()
    await trocarSessao()
    await Promise.all([recarregar(), lojaEscritorio(api, familia.id).ler(api, familia.id)])
  }
  return { permitido, salvar, somenteCadastro: api.modo === 'real' && config }
}
