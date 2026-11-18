import type { FuncionarioEsc, PerguntaEsc } from '../../api/tipos'
import { chaveSimples } from '../../api/normaliza2'

/** Pergunta de quem? Casa pelo id ou pelo nome do funcionário. */
export function donoDaPergunta(p: PerguntaEsc, fs: FuncionarioEsc[]): FuncionarioEsc | undefined {
  const k = chaveSimples(p.funcionario)
  return fs.find(f => f.id === p.funcionario) || fs.find(f => chaveSimples(f.nome) === k || chaveSimples(f.id) === k)
}
