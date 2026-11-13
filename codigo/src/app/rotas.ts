// Rotas do app e quem pode abrir cada uma. Sem tela: dá pra testar sozinho.
export type Rota = 'inicio' | 'lancamentos' | 'orcamento' | 'casa' | 'guardado' | 'cartoes' | 'planejamento' | 'escritorio' | 'ajustes' | 'privacidade' | 'painel' | 'primeiro-uso' | 'entrar'


/** Telas que mostram dinheiro do casal: a pessoa da família (filha) não abre nem pelo endereço. */
export const SO_CASAL: Rota[] = ['guardado', 'cartoes', 'planejamento', 'escritorio']
/** O menu de cada papel. */
export const podeVerNoMenu = (r: Rota, papel: 'casal' | 'pessoa' | 'equipe' | null) => (papel === 'equipe' ? r === 'casa' : papel === 'casal' || !SO_CASAL.includes(r))

const ROTAS: Rota[] = ['inicio', 'lancamentos', 'orcamento', 'casa', 'guardado', 'cartoes', 'planejamento', 'escritorio', 'ajustes', 'privacidade', 'painel', 'primeiro-uso', 'entrar']
/** Endereço desconhecido (link velho, digitado errado) abre o Início em vez de uma tela em branco. */
export function rotaDoHash(hash: string): Rota {
  const h = hash.replace(/^#\/?/, '').split('?')[0] as Rota
  return ROTAS.includes(h) ? h : 'inicio'
}
/** Tela que cada papel pode abrir. A equipe só tem a Casa: nenhum endereço digitado leva a outra tela. */
export function rotaPermitida(rota: Rota, papel: 'casal' | 'pessoa' | 'equipe' | null, dono = false): Rota {
  if (papel === 'equipe') return 'casa'
  if (rota === 'entrar') return 'inicio'
  if (rota === 'primeiro-uso' && papel !== 'casal') return 'inicio'
  if (rota === 'painel' && !dono) return 'inicio'
  // o dinheiro guardado é só do casal
  if (rota === 'guardado' && papel !== 'casal') return 'inicio'
  // pessoa da família (ex.: a filha) vê só o dela: cartões, planejamento e escritório são do casal (rodada 2)
  if (papel === 'pessoa' && SO_CASAL.includes(rota)) return 'inicio'
  return rota
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Convite da equipe que vem no link (#/equipe?c=<id>). Só aceita id no formato certo; qualquer outra coisa é "sem convite". */
export function conviteDoHash(hash: string): string | null {
  const m = /^#\/?equipe\?(.*)$/.exec(hash || '')
  if (!m) return null
  const c = new URLSearchParams(m[1]).get('c') || ''
  return UUID.test(c) ? c.toLowerCase() : null
}
/** O endereço é o da entrada da equipe (com ou sem convite)? */
export const ehLinkEquipe = (hash: string) => /^#\/?equipe(\?|$)/.test(hash || '')
