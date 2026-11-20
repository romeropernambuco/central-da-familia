import type { DesejoTela } from '../../api/tipos'
export function totaisDesejos(d: DesejoTela[]) {
  if (!Array.isArray(d) || d.some(x => !x.id || !x.situacao)) throw new Error('Desejos incompletos')
  return {
    pensando: d.filter(x => x.situacao === 'pensando').length,
    combinados: d.filter(x => x.situacao === 'combinado').length,
    primeiro: d.find(x => x.situacao === 'pensando' || x.situacao === 'combinado')?.id,
  }
}
