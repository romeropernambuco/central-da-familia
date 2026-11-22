import type { PessoaNome } from '../api/tipos'
import type { CadastroNome } from '../api/exemploConfig'
import { useAcoes, useSessaoAtual } from './contexto'
import { invalidarNomes } from './useMembros'
import { podeEditarNome, validarNome } from '../lib/nomePessoa'
import { lojaEscritorio } from './escritorioCompartilhado'

type Colecao = { pessoas?: CadastroNome[] } | CadastroNome[] | null
/** Assessores ficam dentro da folha (`pessoas`); prestadores e rendas são a própria lista. */
const cadastros = (c: Colecao, assessor: boolean) =>
  assessor ? (c as { pessoas?: CadastroNome[] } | null)?.pessoas : (c as CadastroNome[] | null)

/** A configuração já pode ser alterada pelo casal; identidade de login exige capacidade própria. */
export function useEdicaoNome(p: PessoaNome) {
  const { api, familia } = useSessaoAtual()
  const { trocarSessao, recarregar, nomesMudaram } = useAcoes()
  const config = ['assessor', 'prestador', 'renda'].includes(p.tipo) && familia?.papel === 'casal'
  const permitido = podeEditarNome(familia, p) && (!!api.salvarNomePessoa || config)
  const salvar = async (nome: string, funcao: string) => {
    if (!permitido || !familia) throw new Error('Peça a quem administra a família para informar o nome')
    const ms = familia.papel === 'casal' ? await api.membros(familia.id) : []
    const listaNomes: { id: string; nome: string; dono?: string }[] =
      p.tipo === 'membro'
        ? ms
        : cadastros(
            await api.config<Colecao>(
              familia.id,
              p.tipo === 'assessor' ? 'casa_folha' : p.tipo === 'prestador' ? 'casa_prestadores' : 'rendas',
              null,
            ),
            p.tipo === 'assessor',
          ) || []
    const n = validarNome(
      nome,
      listaNomes.map(x => ({ id: x.id, nome: (p.tipo === 'renda' ? x.dono : x.nome) as string })),
      p.id,
    )
    if (api.salvarNomePessoa) await api.salvarNomePessoa(familia.id, p, n, funcao.trim())
    else {
      const chave = p.tipo === 'assessor' ? 'casa_folha' : p.tipo === 'prestador' ? 'casa_prestadores' : 'rendas'
      // Relê antes de escrever; preserva todos os campos, inclusive os não exibidos nesta folha.
      const cfg = await api.config<Colecao>(familia.id, chave, null)
      const lista = cadastros(cfg, p.tipo === 'assessor')
      if (!lista?.some(x => x.id === p.id)) throw new Error('Cadastro não encontrado. Atualize a lista.')
      const novas = lista.map(x =>
        x.id !== p.id
          ? x
          : p.tipo === 'renda'
            ? { ...x, dono: n }
            : { ...x, nome: n, ...(p.tipo === 'assessor' ? { funcao: funcao.trim() } : {}) },
      )
      await api.salvarConfig(familia.id, chave, p.tipo === 'assessor' ? { ...(cfg as object), pessoas: novas } : novas)
    }
    invalidarNomes()
    nomesMudaram?.()
    await trocarSessao()
    await Promise.all([recarregar(), lojaEscritorio(api, familia.id).ler(api, familia.id)])
  }
  return { permitido, salvar, somenteCadastro: api.modo === 'real' && config }
}
