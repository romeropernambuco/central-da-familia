import { useState } from 'react'
import { useAcoes } from '../app/contexto'
import { hojeRecife } from '../lib/formato'
import {
  fraseDoImpacto,
  IMPACTO_HISTORICO,
  PCT_RECOMENDADO,
  pctTexto,
  regraNova,
  salarioPelo,
  type RegraSalario,
} from '../lib/salarioDaGordura'
import { Din, Sheet } from './base'
import './planilha.css'

/**
 * Mudar o percentual do salário da gordura e ver o impacto de cada um: o salário de hoje para o guardado da família e o
 * que aconteceu com o guardado em 20 anos com os juros e a inflação de verdade (2000 a 2026).
 */
export function FolhaSalarioGordura({
  regra,
  guardado,
  salvar,
  fechar,
}: {
  regra: RegraSalario
  guardado: number
  salvar: (r: RegraSalario) => Promise<boolean>
  fechar: () => void
}) {
  const { toast } = useAcoes()
  const [pct, setPct] = useState(regra.pct)
  const escolhido = IMPACTO_HISTORICO.find(i => i.pct === pct) ?? IMPACTO_HISTORICO[0]
  const usar = async (p: number) => {
    const nova = regraNova(guardado, p, hojeRecife().slice(0, 7), p !== PCT_RECOMENDADO)
    if (await salvar(nova)) {
      toast(`Salário da gordura: ${pctTexto(p)}% ao ano, fixo por 12 meses.`)
      fechar()
    }
  }
  return (
    <Sheet titulo="Salário da gordura" subtitulo="Quanto do guardado vira salário por ano" fechar={fechar}>
      <div className="folha-salario-gordura">
        <p className="sub">
          O salário do ano é um percentual do guardado, pago em 12 meses iguais. Ele fica fixo por 12 meses e é revisto
          uma vez por ano pelo guardado daquele dia. O que o guardado render a mais fica nele: cobre a inflação e segura
          o salário quando os juros caírem.
        </p>
        <div className="planilha-rolagem">
          <table className="planilha impacto-salario">
            <caption>O que aconteceu com cada percentual, com os juros e a inflação de 2000 a 2026</caption>
            <thead>
              <tr>
                <th>% ao ano</th>
                <th className="num">Salário hoje</th>
                <th className="num">Em 20 anos (pior caso)</th>
              </tr>
            </thead>
            <tbody>
              {IMPACTO_HISTORICO.map(i => (
                <tr key={i.pct} className={i.pct === pct ? 'destaque' : undefined}>
                  <td>
                    <label>
                      <input type="radio" name="pct-salario" checked={i.pct === pct} onChange={() => setPct(i.pct)} />{' '}
                      {pctTexto(i.pct)}%
                      {i.pct === PCT_RECOMENDADO && <small className="recomendado">recomendado</small>}
                    </label>
                  </td>
                  <td className="num">
                    <Din v={salarioPelo(guardado, i.pct)} />
                  </td>
                  <td className={`num ${i.pior20 >= 99.5 ? 'ok' : i.pior20 >= 85 ? 'warn' : 'erro'}`}>
                    {i.pior20 >= 99.5 ? 'vale o mesmo' : `vale ${pctTexto(i.pior20)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sub">{fraseDoImpacto(escolhido, guardado)}</p>
        <p className="sub">
          Pior ano de salário para o guardado de hoje, com {pctTexto(escolhido.pct)}%:{' '}
          <Din v={Math.round((escolhido.piorAnoMilhao * guardado) / 1_000_000)} /> por mês, em dinheiro de hoje (quando
          os juros caíram, a revisão do ano baixou o salário).
        </p>
        <details className="viagem-guia">
          <summary>Como os especialistas chegaram nisso</summary>
          <ul>
            <li className="sub">
              Fundações como Yale e Harvard gastam de 4% a 6% ao ano do que têm e não deixam o gasto pular com os juros:
              é calculado uma vez por ano. Para durar gerações, family offices falam em perto de 3%.
            </li>
            <li className="sub">
              No Brasil, o CDI rendeu em média uns 3% a 4% ao ano acima da inflação, depois do imposto. Hoje (Selic de
              13,75%) rende bem mais, perto de 6%, mas isso não costuma durar.
            </li>
            <li className="sub">
              Na simulação com os dados do Banco Central, só 3% ao ano deixou o guardado valendo o mesmo ou mais em
              todos os períodos de 20 anos. Acima disso, a família vive melhor hoje e o guardado encolhe devagar.
            </li>
          </ul>
        </details>
        <button className="btn primary full" type="button" onClick={() => usar(pct)}>
          Usar {pctTexto(pct)}% ao ano
        </button>
        {regra.escolhido && pct !== PCT_RECOMENDADO && (
          <button className="btn full" type="button" onClick={() => usar(PCT_RECOMENDADO)}>
            Voltar ao recomendado ({pctTexto(PCT_RECOMENDADO)}%)
          </button>
        )}
      </div>
    </Sheet>
  )
}
