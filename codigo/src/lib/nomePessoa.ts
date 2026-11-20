import type { FamiliaMinha, PessoaNome } from '../api/tipos'
export function nomeInformado(nome?: string | null): boolean {
  return (
    !!nome?.trim() &&
    !/^(null|undefined|algu[eé]m( do casal)?|equipe|outro adulto|outra pessoa|convidad[oa]|pessoa|respons[aá]vel n[aã]o identificado|assessor( da casa)?)$/i.test(
      nome.trim(),
    )
  )
}
export function validarNome(nome: string, membros: { id: string; nome: string }[] = [], id?: string): string {
  if (/[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}<>]/u.test(nome) || !/[\p{L}\p{N}]/u.test(nome))
    throw new Error('Informe um nome válido, sem marcação ou caracteres invisíveis.')
  const n = nome.trim()
  if (!n || [...n].length > 60) throw new Error('Informe um nome de 1 a 60 caracteres, sem só espaços.')
  if (!nomeInformado(n)) throw new Error('Informe o nome da pessoa.')
  if (membros.some(m => m.id !== id && m.nome.trim().localeCompare(n, 'pt-BR', { sensitivity: 'base' }) === 0))
    throw new Error('Já existe um membro ativo com esse nome nesta família. Use um nome que diferencie as pessoas.')
  return n
}
export function podeEditarNome(f: FamiliaMinha | null, p: PessoaNome): boolean {
  return !!f && (f.papel === 'casal' || (p.tipo === 'membro' && !!f.membroId && p.id === f.membroId))
}
