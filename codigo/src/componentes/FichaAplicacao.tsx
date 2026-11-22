import type { GuardadoAplicacao } from '../api/tipos'
import { dataBr } from '../lib/formato'
import { ROTULO_TIPO, pct, rendeQuanto } from '../lib/guardado'
import { textoPrivado } from '../lib/olho'
import './planilha.css'

/** A ficha de uma aplicaÃ§Ã£o em linhas curtas (taxa, imposto, vencimento, proteÃ§Ã£o); o porquÃª fica fechado. */
export function FichaAplicacao({ a, oculto }: { a: GuardadoAplicacao; oculto: boolean }) {
  const linhas: [string, string][] = [
    ['Rende', rendeQuanto(a, true)],
    ['Imposto', a.ir_faixa > 0 ? `${pct(a.ir_faixa, 1).replace(',0%', '%')} do que rende` : 'nÃ£o paga'],
    ['Tirar', a.liquidez === 'diaria' ? 'quando quiser' : a.vence_em ? `vence ${dataBr(a.vence_em)}` : 'no vencimento'],
    [
      'ProteÃ§Ã£o',
      // com o olho fechado nÃ£o diz se passou de R$ 250 mil (isso entregaria o tamanho do saldo)
      oculto
        ? 'aparece com o olho aberto'
        : !a.fgc_ok
          ? 'passou de R$ 250 mil neste banco: o que passa fica sem garantia'
          : a.tipo === 'tesouro_selic'
            ? 'garantido pelo governo federal'
            : 'atÃ© R$ 250 mil por banco',
    ],
  ]
  return (
    <>
      <p className="sub">
        <b>{ROTULO_TIPO[a.tipo]}</b> no {textoPrivado(a.banco)}
      </p>
      <ul className="exp">
        {linhas.map(([k, v]) => (
          <li key={k}>
            <span>{k}</span>
            <span>{v}</span>
          </li>
        ))}
      </ul>
      <details className="salario-porque">
        <summary>Por quÃª?</summary>
        <p className="sub">
          O imposto cai quanto mais tempo o dinheiro fica guardado. Se o banco quebrar, o fundo que protege quem guarda
          (FGC) devolve atÃ© R$ 250 mil por pessoa em cada banco.
        </p>
      </details>
    </>
  )
}
