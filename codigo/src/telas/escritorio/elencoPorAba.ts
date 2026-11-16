import type { Papel } from '../../api/tipos'
import { SO_CASAL, type Rota } from '../../app/rotas'
import { APELIDO_BANCO, POR_ID, type SalaEquipe } from './equipe'

export const SALA_POR_ABA: Record<string, SalaEquipe> = {
 inicio: 'gestao', lancamentos: 'caixa', orcamento: 'cartoes', desejos: 'gestao', cartoes: 'cartoes',
 guardado: 'patrimonio', planejamento: 'caixa', casa: 'casa', escritorio: 'recepcao', ajustes: 'apoio', privacidade: 'apoio', painel: 'gestao',
}
export const PRINCIPAL_POR_ABA: Record<string, string> = {
 inicio: 'anfitriao', lancamentos: 'contador', orcamento: 'assistente', desejos: 'sonhadora', cartoes: 'cartao',
 guardado: 'guardado', planejamento: 'tesoureiro', casa: 'fiscal', escritorio: 'secretaria', ajustes: 'zelador', privacidade: 'protetora', painel: 'analista',
}
type Pergunta = { funcionario: string }
export function funcionarioAutorizado(id: string, papel: Papel, ehDono = false): boolean {
 const m = POR_ID[APELIDO_BANCO[id] || id]
 if (!m) return false
 if (papel === 'equipe') return ['fiscal', 'comprador', 'presenca', 'auditor'].includes(m.id)
 if (papel === 'pessoa') return !SO_CASAL.includes(m.rota) && !['fiscal', 'folha', 'presenca', 'auditor'].includes(m.id) && (m.id !== 'analista' || ehDono)
 return m.id !== 'analista' || ehDono
}
/** Só escolhe pessoas; não lê dados, relógio, storage nem cria perguntas. */
export function elencoDaAba({ rota, papel, ehDono, perguntaPendente, subaba, filaGeral = [] }: {
 rota: string; papel: Papel; ehDono: boolean; perguntaPendente?: Pergunta | null; subaba?: string; filaGeral?: readonly Pergunta[]
}): { principal: string; secundarios: string[]; sala: SalaEquipe } {
 // Defesa para chamadas diretas fora do menu: não devolver especialistas financeiros proibidos.
 if (papel === 'equipe') rota = 'casa'
 if (papel === 'pessoa' && (SO_CASAL.includes(rota as Rota) || rota === 'painel' && !ehDono)) rota = 'inicio'
 let principal = PRINCIPAL_POR_ABA[rota] || 'anfitriao'
 const secundarios: string[] = []
 const autorizado = (p: Pergunta) => funcionarioAutorizado(p.funcionario, papel, ehDono)
 const idDe = (p: Pergunta) => APELIDO_BANCO[p.funcionario] || p.funcionario
 if (rota === 'inicio') {
  const primeira = filaGeral.find(p => autorizado(p) && idDe(p) !== principal)
  secundarios.push(primeira ? idDe(primeira) : papel === 'casal' ? 'guardado' : 'contador')
 }
 if (rota === 'guardado' && papel === 'casal') secundarios.push('imoveis')
 if (rota === 'planejamento' && papel === 'casal') secundarios.push('colchao')
 if (rota === 'casa') {
  const aba = (subaba || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const porSubaba: Record<string, string> = { lista: 'comprador', servicos: 'comprador', prestadores: 'comprador', gas: 'comprador', folha: 'folha', presenca: 'presenca', estoque: 'auditor' }
  if (papel === 'pessoa') principal = 'comprador'
  else {
   const dono = perguntaPendente && autorizado(perguntaPendente) && POR_ID[idDe(perguntaPendente)]?.rota === 'casa' ? idDe(perguntaPendente) : undefined
   const auxiliar = dono || porSubaba[aba]
   if (auxiliar && auxiliar !== principal && funcionarioAutorizado(auxiliar, papel, ehDono)) secundarios.push(auxiliar)
  }
 }
 return { principal, secundarios, sala: SALA_POR_ABA[rota] || 'gestao' }
}
