import { enderecoDestino, type DestinoResumo } from '../../app/destinos'

export function destino(rota: DestinoResumo['rota'], secao?: string, entidade?: string) {
  return '../../' + (secao ? enderecoDestino({ rota, secao, entidade }) : '#/' + rota)
}
