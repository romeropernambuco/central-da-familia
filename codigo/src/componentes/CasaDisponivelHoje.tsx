import { Din } from './base'

export function CasaDisponivelHoje({ valor }: { valor: number | null }) {
  return valor === null ? null : (
    <p className="resumo-casa">
      Casa · disponível hoje: <Din v={valor} />
    </p>
  )
}
