import { useApp } from '../app/contexto'
import { useLeituraRemota } from '../app/useLeituraRemota'
import { lerCasa, lerFaturas } from '../lib/resumo/leituras'
import { hojeRecife, plural } from '../lib/formato'
import { Din } from './base'
import { textoPrivado } from './privacidade'
export function ConferenciaFaturas() {
  const { api, familia, versao } = useApp()
  const r = useLeituraRemota('faturas-conferir', familia?.papel === 'casal' ? () => lerFaturas(api, familia.id, hojeRecife()) : null, [api, versao], 'resumo-familia:faturas')
  if (familia?.papel !== 'casal') return null
  return <section className="card" data-secao="fatura"><h2>Faturas a vencer/conferir</h2>{r.carregando ? <p>Conferindo...</p> : r.erro ? <p>Não foi possível conferir <button onClick={r.repetir}>Tentar de novo</button></p> : r.dado && <><Din v={r.dado.total} /><p>Próximos 30 dias · pagamento informado no banco.</p>{r.dado.lista.map(f => <p key={`${f.cartao_id}:${f.mes}`} data-secao="fatura" data-entidade={f.cartao_id} data-periodo={f.mes}>{textoPrivado(f.cartao)} · {f.vencimento} · <Din v={f.total} /> · {f.conferir ? 'valor a conferir' : 'valor informado'} <a href="#/escritorio?f=cartao">Conferir com o Analista de Cartão</a></p>)}</>}</section>
}
export function ConferenciaCasa() {
  const { api, familia, versao, oculto } = useApp()
  const r = useLeituraRemota('casa-conferir', familia?.papel === 'casal' ? () => lerCasa(api, familia.id, hojeRecife()) : null, [api, versao], 'resumo-familia:casa')
  if (familia?.papel !== 'casal') return null
  return <section className="card"><h2>Conferência da Casa</h2>{r.carregando ? <p>Conferindo...</p> : r.erro ? <p>Não foi possível conferir <button onClick={r.repetir}>Tentar de novo</button></p> : r.dado && <p>{oculto ? '••••' : `${r.dado.feira ? 'Feira ainda sem confirmação' : 'Feira em dia'} · ${plural(r.dado.nota, 'nota pendente', 'notas pendentes')} · ${r.dado.estoque ? 'Estoque: contagem pendente' : 'Estoque conferido'}${r.dado.falta === null ? '' : ` · ${plural(r.dado.falta, 'item em falta', 'itens em falta')}`}`}</p>}</section>
}
