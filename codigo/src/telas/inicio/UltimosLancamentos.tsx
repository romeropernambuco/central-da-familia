import { textoPrivado } from '../../lib/olho'
import './inicio.css'
import { lerLancamentosMes } from '../../lib/resumo/leituras'
import { useApp } from '../../app/contexto'
import { useLeituraRemota } from '../../app/useLeituraRemota'
import { Botao, Din } from '../../componentes/base'
import { EstadoVazioVisual } from '../../componentes/EstadoVazioVisual'
import { SemGastos } from '../../componentes/ilustracoes/figuras'
import { dataCurta, hojeRecife, mesAnterior } from '../../lib/formato'
export function UltimosLancamentos() {
  const { api, familia, versao, abrirLancar } = useApp()
  const r = useLeituraRemota(
    'inicio-ultimos',
    familia
      ? async () => {
          const mes = hojeRecife().slice(0, 7),
            deste = await lerLancamentosMes(api, familia.id, mes)
          if (deste.filter(x => !x.apagado_em).length >= 4) return deste
          return [...deste, ...(await lerLancamentosMes(api, familia.id, mesAnterior(mes)))]
        }
      : null,
    [api, versao],
    'lancamentos',
  )
  return (
    <section className="card inicio-lancamentos">
      <div className="card-h">
        <h2>Últimos lançamentos</h2>
        <a href="#/lancamentos">Ver todos</a>
      </div>
      {r.carregando ? (
        <p className="resumo-esqueleto" role="status">
          Conferindo...
        </p>
      ) : r.erro ? (
        <p role="alert">
          Não foi possível conferir{' '}
          <Botao type="button" onClick={r.repetir}>
            Tentar de novo
          </Botao>
        </p>
      ) : r.dado?.filter(x => !x.apagado_em).length ? (
        <ul className="list">
          {r.dado
            .filter(x => !x.apagado_em)
            .slice(0, 4)
            .map(l => (
              <li className="li" key={l.id}>
                <span className="m">
                  {textoPrivado(l.descricao)}
                  <small>{dataCurta(l.data)}</small>
                </span>
                <Din v={l.valor} />
              </li>
            ))}
        </ul>
      ) : r.dado ? (
        <SemGastosInicio anotar={() => abrirLancar()} />
      ) : null}
    </section>
  )
}
export function SemGastosInicio({ anotar }: { anotar: () => void }) {
  return (
    <EstadoVazioVisual
      ilustracao={<SemGastos />}
      titulo="Nenhum gasto ainda"
      frase="É só o valor e 1 toque."
      acao={{ texto: 'Anotar gasto', aoClicar: anotar }}
    />
  )
}
