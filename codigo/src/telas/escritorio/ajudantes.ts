// Tipos da Folha da Casa (usados na tela Casa). Os ajudantes agora vêm do banco, por produto.escritorio_hoje.
export interface PessoaFolha { id: string; nome: string; funcao: string; salario: number }
export interface Folha { pessoas: PessoaFolha[]; daePaga: Record<string, boolean> }
