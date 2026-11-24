import { useState, type CSSProperties } from 'react'
import { Camera } from 'lucide-react'
import { useAcoes, useOlhoApp } from '../app/contexto'
import { fotoQuadrada, useFotos } from '../app/useFotos'
import { textoPrivado } from '../lib/olho'
import './rosto.css'

/**
 * O rosto de cada pessoa da família: a foto quando houver, senão a inicial.
 * Com o olho fechado, nem foto nem inicial aparecem. Quem pode trocar toca no círculo e escolhe a foto.
 */
export function Rosto({
  envelope,
  nome,
  tam = 40,
  podeTrocar = false,
}: {
  envelope: string
  nome: string
  tam?: number
  podeTrocar?: boolean
}) {
  const { oculto } = useOlhoApp()
  const { fotos, trocar } = useFotos()
  const { toast } = useAcoes()
  const [ocupado, ocupar] = useState(false)
  const url = oculto ? undefined : fotos[envelope]
  const inicial = oculto ? '' : (nome || '?').trim().charAt(0).toUpperCase()
  const estilo = { '--rosto': `${tam}px` } as CSSProperties
  const miolo = url ? (
    <img src={url} alt="" draggable={false} />
  ) : (
    <span className="rosto-inicial" data-inicial={inicial} aria-hidden="true" />
  )
  if (!podeTrocar || oculto)
    return (
      <span className="rosto" style={estilo} aria-hidden="true">
        {miolo}
      </span>
    )
  return (
    <label
      className={'rosto rosto-troca' + (ocupado ? ' rosto-ocupado' : '')}
      style={estilo}
      title={url ? 'Trocar a foto' : 'Pôr uma foto'}
    >
      <input
        type="file"
        accept="image/*"
        className="rosto-arquivo"
        aria-label={textoPrivado(`${url ? 'Trocar a foto' : 'Pôr uma foto'} de ${nome}`)}
        disabled={ocupado}
        onChange={async e => {
          const arquivo = e.target.files?.[0]
          e.target.value = ''
          if (!arquivo) return
          ocupar(true)
          try {
            await trocar(envelope, await fotoQuadrada(arquivo))
            toast('Foto trocada. Ela já aparece para a família.')
          } catch (erro) {
            toast(
              (erro as Error)?.message
                ? `Não deu para trocar a foto: ${(erro as Error).message}`
                : 'Não deu para trocar a foto. Tente de novo.',
            )
          } finally {
            ocupar(false)
          }
        }}
      />
      {miolo}
      <i className="rosto-camera" aria-hidden="true">
        <Camera />
      </i>
    </label>
  )
}
