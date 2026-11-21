import type { CSSProperties, ReactNode } from 'react'
import type { NavegacaoIsometrica } from '../../lib/escritorio/plantaIsometrica'
import { EscritorioMaquete, type PropsEscritorioMaquete } from './EscritorioMaquete'
import './escritorio3d.css'

type Funcionario = NonNullable<PropsEscritorioMaquete['funcionarios']['valor']>[number]

export interface PropsQuadroDoEscritorio {
  altura?: number
  variante?: PropsEscritorioMaquete['variante']
  panorama?: boolean
  completo?: boolean
  celular?: boolean
  navegacao?: NavegacaoIsometrica
}

export interface PropsEscritorioDesenho<T extends Funcionario = Funcionario>
  extends PropsEscritorioMaquete<T>, Omit<PropsQuadroDoEscritorio, 'variante'> {
  postoSelecionado?: string | null
}

/** Quem não pode ver dinheiro (equipe, ou papel ainda desconhecido) não recebe os valores do escritório. */
export const valoresPermitidos = <V,>(papel: PropsEscritorioMaquete['papel'], valores: V | undefined) =>
  papel === 'equipe' || papel === null ? undefined : valores

/** A moldura do escritório: tamanho, aproximação e deslocamento chegam ao CSS por variáveis. */
export function QuadroDoEscritorio({
  altura,
  variante,
  panorama,
  completo,
  celular,
  navegacao,
  desenho,
  children,
}: PropsQuadroDoEscritorio & { desenho?: boolean; children: ReactNode }) {
  return (
    <div
      className="escritorio3d"
      data-variante={variante ?? 'media'}
      data-completo={completo || undefined}
      data-celular={celular || undefined}
      data-panorama={panorama || undefined}
      style={
        {
          '--escritorio3d-altura': altura === undefined ? undefined : `${altura}px`,
          '--escritorio3d-zoom': navegacao?.zoom,
          '--escritorio3d-x': `${(navegacao?.x ?? 0) * 100}%`,
          '--escritorio3d-y': `${(navegacao?.y ?? 0) * 100}%`,
        } as CSSProperties
      }
      data-renderizacao={desenho ? 'svg' : undefined}
    >
      {children}
    </div>
  )
}

/**
 * O escritório em desenho (SVG), sem 3D: é o que aparece onde a cena 3D não abre (aparelho sem WebGL, erro ao carregar).
 * A cena 3D do app é uma só e fica em `telas/escritorio/Cena3D.tsx`.
 */
export function EscritorioDesenho<T extends Funcionario>({
  altura,
  valores,
  panorama = false,
  completo = !panorama,
  celular,
  navegacao,
  postoSelecionado,
  ...props
}: PropsEscritorioDesenho<T>) {
  return (
    <QuadroDoEscritorio {...{ altura, panorama, completo, celular, navegacao }} variante={props.variante} desenho>
      <EscritorioMaquete
        {...props}
        salaDestacada={panorama && !completo ? undefined : props.salaDestacada}
        mostrarPlaquinhas={false}
        detalhesSobDemanda
        valores={valoresPermitidos(props.papel, valores)}
        postoSelecionado={postoSelecionado}
      />
    </QuadroDoEscritorio>
  )
}
