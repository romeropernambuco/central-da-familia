import { Ilustracao, type NomeIlustracao } from './ilustracoes'
import { EstadoVazioVisual, type PropsEstadoVazio } from './EstadoVazioVisual'

export interface EstadoVazioProps extends PropsEstadoVazio {
  ilustracao: NomeIlustracao
}

export function EstadoVazio({ ilustracao, ...props }: EstadoVazioProps) {
  return <EstadoVazioVisual {...props} ilustracao={<Ilustracao nome={ilustracao} />} />
}
