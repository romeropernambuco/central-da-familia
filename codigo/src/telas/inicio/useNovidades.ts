import { useEffect, useMemo, useRef, useState } from 'react'
import {
  guardarVistas,
  lerVistas,
  marcaDaTarefa,
  marcasDoEscritorio,
  marcasNovas,
  type FonteDeNovidades,
} from '../../lib/escritorio/novidades'

/**
 * A marca "Novo" do Início: o que chegou desde a última visita neste aparelho. Some quando a pessoa abre o funcionário;
 * o que ela não abriu deixa de ser novidade na visita seguinte (ao sair da tela, tudo o que estava à vista fica guardado).
 */
export function useNovidades(dados: FonteDeNovidades, familia: string, pronto: boolean) {
  const marcas = useMemo(() => marcasDoEscritorio(dados), [dados])
  // o que o aparelho tinha guardado quando esta visita começou, mais o que a pessoa já abriu nela
  const [vistas, setVistas] = useState<string[] | null | undefined>(undefined)
  useEffect(() => {
    if (pronto && vistas === undefined) setVistas(lerVistas(familia))
  }, [pronto, vistas, familia])
  const novas = useMemo(
    () => (vistas === undefined ? new Set<string>() : marcasNovas(marcas, vistas)),
    [marcas, vistas],
  )

  // só guarda depois de ter lido: senão uma saída antes da leitura apagaria as novidades desta visita
  const lido = pronto && vistas !== undefined
  const agora = useRef({ marcas, pronto: lido, familia })
  agora.current = { marcas, pronto: lido, familia }
  useEffect(() => {
    const guardar = () => {
      const a = agora.current
      if (a.pronto) guardarVistas(a.familia, Object.values(a.marcas).flat())
    }
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') guardar()
    }
    document.addEventListener('visibilitychange', aoEsconder)
    window.addEventListener('pagehide', guardar)
    return () => {
      document.removeEventListener('visibilitychange', aoEsconder)
      window.removeEventListener('pagehide', guardar)
      guardar()
    }
  }, [])

  const novos: Record<string, boolean> = {}
  for (const [id, lista] of Object.entries(marcas)) if (lista.some(m => novas.has(m))) novos[id] = true
  return {
    /** os funcionários com novidade */
    novos,
    tarefaNova: (id: string) => novas.has(marcaDaTarefa(id)),
    /** a pessoa abriu este funcionário: as novidades dele já foram vistas */
    ver: (id: string) => {
      if (!novos[id]) return
      const juntas = [...(vistas || []), ...(marcas[id] || [])]
      setVistas(juntas)
      guardarVistas(familia, juntas)
    },
  }
}
