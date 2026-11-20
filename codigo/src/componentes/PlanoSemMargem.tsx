import { Din } from './base'

export function PlanoSemMargem({ centavos }: { centavos: number }) {
  return (
    <span className="sub">
      Sem a margem de segurança: {centavos > 0 ? 'faltam' : 'sobram'} <Din v={Math.abs(centavos) / 100} /> por mês.
    </span>
  )
}
