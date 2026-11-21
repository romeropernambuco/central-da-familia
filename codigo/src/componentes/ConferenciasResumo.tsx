import { textoPrivado, PONTOS_LONGOS } from '../lib/olho'
import { rotulosCasa } from '../lib/resumo/casa'
import { useApp } from '../app/contexto'
import { useLeituraRemota } from '../app/useLeituraRemota'
import { lerCasa, lerFaturas } from '../lib/resumo/leituras'
import { hojeRecife, plural } from '../lib/formato'
import { CabecalhoCartao, Din, Botao } from './base'
export function ConferenciaFaturas() {
  const { api, familia, versao } = useApp()
  const r = useLeituraRemota(
    'faturas-conferir',
    familia?.papel === 'casal' ? () => lerFaturas(api, familia.id, hojeRecife()) : null,
    [api, versao],
    'resumo-familia:faturas',
  )
  if (familia?.papel !== 'casal') return null
  return (
    <section className="card aba-destaque" data-secao="fatura">
      <CabecalhoCartao titulo="Faturas a vencer/conferir" icone="cartoes" />
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
            <p className="sub">Próximos 30 dias · pagamento informado no banco.</p>
            <ul className="list lista-conferencia">
              {r.dado.lista.map(f => (
                <li
                  key={`${f.cartao_id}:${f.mes}`}
                  data-secao="fatura"
                  data-entidade={f.cartao_id}
                  data-periodo={f.mes}
                >
                  <p>
                    <b>{textoPrivado(f.cartao)}</b> · {f.vencimento} · <Din v={f.total} /> ·{' '}
                    <span className="sub">{f.conferir ? 'valor a conferir' : 'valor informado'}</span>
                  </p>
                  <a className="btn line sm" href="#/escritorio?f=cartao">
                    Conferir com o Analista de Cartão
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
  const { api, familia, versao, oculto } = useApp()
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
