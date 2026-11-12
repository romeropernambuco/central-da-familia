import { HelpCircle } from 'lucide-react'
import { useApp } from '../app/contexto'
import type { LinhaExplicacao } from '../api/tipos'

/** Bolinha "?" ao lado de um número: abre "De onde veio esse número?". */
export function Qm({ titulo, linhas, nota, texto }: { titulo: string; linhas: LinhaExplicacao[]; nota?: string; texto?: boolean }) {
  const { explicar } = useApp()
  const abrir = () => explicar({ titulo, linhas, nota })
  if (texto)
    return (
      <button type="button" className="explica-l" onClick={abrir}>
        <HelpCircle size={18} aria-hidden="true" /> De onde veio esse número?
      </button>
    )
  return (
    <button type="button" className="qm" onClick={abrir} aria-label={`De onde veio esse número? ${titulo}`} title="De onde veio esse número?">?</button>
  )
}
