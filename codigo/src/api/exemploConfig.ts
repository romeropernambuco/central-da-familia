/** Formato do que a família de exemplo guarda nas configurações (o mesmo que o app grava em config_familia). */
export interface ItemListaEx {
  id: string
  nome: string
  ok: boolean
}
export interface PrestadorEx {
  id: string
  nome: string
  servico: string
  dia: number
  valor: number
  ultimaVez?: string
}
export interface EntradaEx {
  id: string
  data: string
  valor: number
  de: string
  destino: string
  dono?: string
}
export interface PessoaFolhaEx {
  id: string
  nome: string
  funcao?: string
  salario: number
  diaPagamento?: number
  celular?: string
}
export interface FolhaEx {
  pessoas: PessoaFolhaEx[]
  daePaga: Record<string, boolean>
}
export type PontoEx = Record<string, Record<string, { chegou?: string; saiu?: string }>>
/** As chaves que o exemplo lê com formato conhecido; o resto continua sem formato até alguém converter. */
export type ConfigEx = Record<string, unknown> & {
  casa_lista?: ItemListaEx[]
  casa_prestadores?: PrestadorEx[]
  casa_gas?: { trocas: string[] }
  casa_presenca?: Record<string, string[]>
  casa_ponto?: PontoEx
  casa_folha?: FolhaEx
  entradas?: EntradaEx[]
  rendas?: unknown[]
  contas_fixas?: unknown[]
  reserva_onde?: string
}
/** Cadastro com nome que o casal pode corrigir: assessor, prestador ou renda. */
export interface CadastroNome {
  id: string
  nome: string
  dono: string
  funcao?: string
}
