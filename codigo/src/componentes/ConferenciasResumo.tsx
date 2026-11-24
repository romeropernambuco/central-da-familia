import { textoPrivado, PONTOS_LONGOS } from '../lib/olho'
import { rotulosCasa } from '../lib/resumo/casa'
import { useDadosDoDia, useOlhoApp, useSessaoAtual } from '../app/contexto'
import { useLeituraRemota } from '../app/useLeituraRemota'
import { lerCasa, lerFaturas } from '../lib/resumo/leituras'
import { dataCurta, hojeRecife, plural } from '../lib/formato'
import { CabecalhoCartao, Din, Botao } from './base'
import './conferencias.css'

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export function ConferenciaFaturas() {
  const { api, familia } = useSessaoAtual()
  const { versao } = useDadosDoDia()
  const r = useLeituraRemota(
    'faturas-conferir',
    familia?.papel === 'casal' ? () => lerFaturas(api, familia.id, hojeRecife()) : null,
    [api, versao],
    'resumo-familia:faturas',
  )
  if (familia?.papel !== 'casal') return null
  return (
    <section className="card aba-destaque" data-secao="fatura">
      <CabecalhoCartao titulo="Faturas a pagar" icone="cartoes" />
      {r.carregando ? (
        <p className="sub">Conferindo...</p>
      ) : r.erro ? (
        <p className="todo warn">
          Não foi possível conferir <Botao onClick={r.repetir}>Tentar de novo</Botao>
        </p>
      ) : (
        r.dado && (
          <>
            <Din v={r.dado.total} tam="big" />
            <p className="sub">Vencem nos próximos 30 dias e ainda não foram pagas.</p>
            <ul className="list lista-conferencia">
              {r.dado.lista.map(f => (
                <li
                  key={`${f.cartao_id}:${f.mes}`}
                  data-secao="fatura"
                  data-entidade={f.cartao_id}
                  data-periodo={f.mes}
                >
                  <span className="fat-data" aria-hidden="true">
                    <b>{Number(f.vencimento.slice(8, 10))}</b>
                    <small>{MESES_CURTOS[Number(f.vencimento.slice(5, 7)) - 1]}</small>
                  </span>
                  <p className="fat-corpo">
                    <b>{textoPrivado(f.cartao)}</b>
                    <span className="sub">
                      <span className="fat-sr">vence {dataCurta(f.vencimento)} · </span>
                      {f.conferir ? 'falta conferir com o banco' : 'já conferida'}
                    </span>
                  </p>
                  <Din v={f.total} />
                  <a className="btn line sm" href="#/escritorio?f=cartao">
                    Conferir a fatura
                  </a>
                </li>
              ))}
            </ul>
          </>
        )
      )}
    </section>
  )
}
export function ConferenciaCasa() {
  const { api, familia } = useSessaoAtual()
  const { versao } = useDadosDoDia()
  const { oculto } = useOlhoApp()
  const r = useLeituraRemota(
    'casa-conferir',
    familia?.papel === 'casal' ? () => lerCasa(api, familia.id, hojeRecife()) : null,
    [api, versao],
    'resumo-familia:casa',
  )
  if (familia?.papel !== 'casal') return null
  return (
    <section className="card">
      <CabecalhoCartao titulo="Conferência da Casa" icone="casa" />
      {r.carregando ? (
        <p className="sub">Conferindo...</p>
      ) : r.erro ? (
        <p className="todo warn">
          Não foi possível conferir <Botao onClick={r.repetir}>Tentar de novo</Botao>
        </p>
      ) : (
        r.dado && (
          <p className="sub">
            {oculto
              ? PONTOS_LONGOS
              : `${rotulosCasa(r.dado).feira} · ${plural(r.dado.nota, 'nota pendente', 'notas pendentes')} · ${rotulosCasa(r.dado).estoque}${r.dado.falta === null ? '' : ` · ${plural(r.dado.falta, 'item em falta', 'itens em falta')}`}`}
          </p>
        )
      )}
    </section>
  )
}
