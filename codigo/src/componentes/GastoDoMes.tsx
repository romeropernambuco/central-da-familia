import { CalendarDays, ShoppingBag } from 'lucide-react'
import { Icone } from './Icone'
import { textoPrivado } from '../lib/olho'
import { reais } from '../lib/formato'

/**
 * O resumo do dia e do mês no topo do orçamento (rodada de design de 24/11/2026: "menos texto de bloco de notas").
 * Antes era uma frase corrida; agora são dois cartões com ícone e uma barra do mês. Os números são os mesmos.
 */
export function GastoDoMes({ hoje, mes, teto, oculto }: { hoje: number; mes: number; teto: number; oculto: boolean }) {
  const pct = teto > 0 ? Math.max(0, Math.min(1, mes / teto)) : 0
  return (
    <div className="orc-resumo">
      <div className="orc-stats">
        <div className="orc-stat">
          <i className="orc-stat-ico" aria-hidden="true">
            <Icone desenho={ShoppingBag} />
          </i>
          <span className="orc-stat-t">
            <small>Compras anotadas hoje</small>
            <b>{textoPrivado(reais(hoje))}</b>
          </span>
        </div>
        <div className="orc-stat">
          <i className="orc-stat-ico" aria-hidden="true">
            <Icone desenho={CalendarDays} />
          </i>
          <span className="orc-stat-t">
            <small>No mês</small>
            <b>
              {textoPrivado(reais(mes))} <em>de {textoPrivado(reais(teto))}</em>
            </b>
          </span>
        </div>
      </div>
      {!oculto && teto > 0 && (
        <div
          className="orc-mes-barra"
          role="img"
          aria-label={`Já saiu ${Math.round(pct * 100)}% do que foi combinado para o mês`}
        >
          <i className={mes > teto ? 'acima' : ''} style={{ width: Math.max(mes > 0 ? 2 : 0, pct * 100) + '%' }} />
        </div>
      )}
    </div>
  )
}
