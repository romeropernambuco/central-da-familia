import { textoPrivado } from '../../lib/olho'
import { useInvalidacao } from '../../app/useInvalidacao'
import { ConferenciaFaturas } from '../../componentes/ConferenciasResumo'
import { proximaFatura } from '../../lib/resumo/faturas'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import './cartoes.css'
import { Botao } from '../../componentes/base'
import { Icone } from '../../componentes/Icone'
import { useRascunho } from '../../app/useRascunho'
import { NomeDaPessoa } from '../../componentes/NomeDaPessoa'
import { CampoValor, CampoPrivado } from '../../componentes/privacidade'
import { compromissoNesteMes, fraseParcelamento, mesesDaSimulacao } from './simulacao'
import { useEffect, useState } from 'react'
import {
  CalendarDays,
  CalendarRange,
  CreditCard,
  House,
  Landmark,
  Plus,
  ShoppingBag,
  CircleCheck,
  TriangleAlert,
} from 'lucide-react'
import { useAcoes, useDadosDoDia, useOlhoApp, useSessaoAtual } from '../../app/contexto'
import { Din, Sheet } from '../../componentes/base'
import { FuncIco } from '../../componentes/Pergunta'
import { Qm } from '../../componentes/Qm'
import { cartaoMeu } from '../../lib/dono'
import type { Cartao, Fatura } from '../../api/tipos'
import {
  agruparFaturas,
  centavos,
  dataCurta,
  hojeRecife,
  mesCurto,
  reais,
  simularCompra,
  textoParaValor,
} from '../../lib/formato'

const MESES = 6
// Até 12 parcelas, começando até dois meses após a compra (inclui o mês atual).
const MESES_SIMULACAO = 14

/** A frase embaixo do total da fatura: fechada, só acompanhar; aberta, até quando aceita compra. */
function avisoDaFatura(fechada: boolean, diaFechamento: number | null | undefined): string {
  if (fechada) return 'Pague no app do banco: aqui é só para acompanhar.'
  return diaFechamento ? `Aceita compras até o dia ${diaFechamento}, quando fecha.` : 'Aceita compras até o fechamento.'
}

/** Cartões: faturas dos próximos 6 meses e "E se eu comprar?" ligado ao colchão. */
export function Cartoes() {
  const { api, familia } = useSessaoAtual()
  const { recarregar, toast } = useAcoes()
  const { resumo, versao } = useDadosDoDia()
  const { oculto } = useOlhoApp()
  const invalidacao = useInvalidacao(api, familia?.id || '')
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [sim, setSim] = useState(false)
  const [novo, setNovo] = useState(false)
  // E4: o dono do cartão muda o dia que fecha e o dia que vence (a parcela cai no mês da fatura por eles)
  const [dias, setDias] = useState<Cartao | null>(null)
  const [n, setN] = useState(0)
  const [leitura, setLeitura] = useState({ chave: '', carregando: true, falha: '', temDado: false })
  const chave = JSON.stringify([familia?.id, familia?.membroId, familia?.papel])
  const atual = leitura.chave === chave
  const carregando = !atual || leitura.carregando,
    falha = atual ? leitura.falha : ''
  const dado = atual && leitura.temDado
  const repetir = () => setN(x => x + 1)
  useEffect(() => {
    if (!familia) return
    let vivo = true
    setLeitura(l => ({ chave, carregando: true, falha: '', temDado: l.chave === chave && l.temDado }))
    Promise.all([api.cartoes(familia.id), api.faturas(familia.id, MESES_SIMULACAO)])
      .then(([cs, fs]) => {
        if (!vivo) return
        setCartoes([...cs].sort((a, b) => Number(!cartaoMeu(a, familia)) - Number(!cartaoMeu(b, familia))))
        setFaturas(fs)
        setLeitura({ chave, carregando: false, falha: '', temDado: true })
      })
      .catch(() => {
        if (vivo) setLeitura(l => ({ ...l, carregando: false, falha: 'Falha na leitura' }))
      })
    return () => {
      vivo = false
    }
  }, [api, chave, versao, n, invalidacao, familia])
  const hoje = hojeRecife()
  const casal = familia?.papel === 'casal'
  // "E se eu comprar?" é com o seu cartão: o do outro só aparece pra ler
  const meus = cartoes.filter(c => cartaoMeu(c, familia))

  return (
    <div className="view cartoes-visual">
      <ConferenciaFaturas />
      {carregando && <p role="status">Buscando cartões e faturas…</p>}
      {falha && (
        <div role="alert">
          <EstadoVazio
            ilustracao="Erro"
            titulo="Não foi possível buscar cartões e faturas."
            frase={dado ? 'Dados desatualizados.' : 'Tente novamente para conferir suas faturas.'}
            acao={{ texto: 'Tentar novamente', aoClicar: repetir }}
          />
        </div>
      )}
      {cartoes.length > 0 && (
        <p className="lbl">
          <FuncIco id="cartao" size={24} />
          Analista de Cartão: acompanha as faturas
        </p>
      )}
      <div className="row-btns">
        <Botao variante="primario" type="button" onClick={() => setSim(true)} disabled={!meus.length}>
          <Icone desenho={ShoppingBag} />E se eu comprar?
        </Botao>
        {casal && (
          <Botao variante="secundario" type="button" onClick={() => setNovo(true)}>
            <Icone desenho={Plus} />
            Novo cartão
          </Botao>
        )}
      </div>
      {!falha && !carregando && dado && !cartoes.length && (
        <div className="card">
          <EstadoVazio
            ilustracao="SemCartoes"
            titulo="Nenhum cartão cadastrado"
            frase="Com o dia que a fatura fecha e o dia que vence, a compra cai na fatura certa sozinha."
            acao={casal ? { texto: 'Cadastrar cartão', aoClicar: () => setNovo(true) } : undefined}
          />
        </div>
      )}
      <div className="envs">
        {(dado ? cartoes : []).map(c => {
          const fs = faturas
            .filter(f => f.cartao_id === c.id)
            .sort((a, b) => a.mes.localeCompare(b.mes))
            .slice(0, MESES)
          const atual = proximaFatura(fs, hoje, { exigirTotalPositivo: false, ordem: 'mes', usarPrimeiraVencida: true })
          const max = Math.max(1, ...fs.map(f => f.total))
          const meu = cartaoMeu(c, familia)
          return (
            <section
              className="card"
              key={c.id}
              aria-label={textoPrivado(`Cartão ${c.nome}${meu ? '' : ` de ${c.titular}`}`)}
              {...(meu ? {} : { 'data-do-outro': textoPrivado(c.titular || '') })}
            >
              <div className="card-h">
                <h2>
                  <Icone desenho={CreditCard} aria-hidden="true" />
                  {textoPrivado(c.nome)}
                  {!meu && (
                    <small className="dono">
                      {' '}
                      de{' '}
                      <NomeDaPessoa
                        pessoa={{ tipo: 'membro', id: c.titular_id || `cartao:${c.id}`, nome: c.titular }}
                      />
                    </small>
                  )}
                </h2>
                <span className="sub cartao-linha">
                  <CalendarDays aria-hidden="true" />
                  {c.dia_fechamento && c.dia_vencimento
                    ? `Fecha dia ${c.dia_fechamento} · Vence dia ${c.dia_vencimento}`
                    : 'Falta o dia que fecha ou o que vence'}
                </span>
              </div>
              {meu && casal && (
                <Botao
                  variante="secundario"
                  className="sm"
                  type="button"
                  style={{ justifySelf: 'start', marginBottom: 10 }}
                  onClick={() => setDias(c)}
                >
                  <Icone nome="ajustes" />
                  {c.dia_fechamento && c.dia_vencimento
                    ? 'Mudar o dia que fecha e o que vence'
                    : 'Pôr o dia que fecha e o que vence'}
                </Botao>
              )}
              {atual && (
                <>
                  <p className="lbl">
                    Fatura que vence {dataCurta(atual.vencimento)}{' '}
                    <span className={'chip' + (atual.fechada ? '' : ' ok')}>
                      <Icone nome={atual.fechada ? 'salvo' : 'pendente'} />
                      {atual.fechada ? 'fechada' : 'aberta'}
                    </span>
                  </p>
                  <div className="numrow">
                    <Din v={atual.total} tam="big" />
                    <Qm
                      titulo={textoPrivado(`Fatura ${c.nome} de ${mesCurto(atual.mes)}`)}
                      linhas={[
                        {
                          linha: `Compras no ${c.nome} que caem na fatura que vence ${dataCurta(atual.vencimento)}`,
                          valor: atual.total,
                        },
                      ]}
                      nota={`À vista, a compra conta no orçamento na data da compra. Parcelada, cada parcela conta no dia 1 do mês da sua fatura. Compra feita a partir do dia ${c.dia_fechamento} vai para fatura seguinte.`}
                    />
                  </div>
                  {/* quem pagou (CASAL): a parte da Casa que está na fatura de quem pagou */}
                  {!oculto && atual.da_casa ? (
                    <p className="todo ok" style={{ margin: '6px 0 0' }}>
                      <span className="cartao-linha">
                        <House aria-hidden="true" />
                        <span>
                          Da Casa nesta fatura: <b>{reais(atual.da_casa)}</b>.{' '}
                          {textoPrivado(
                            meu
                              ? 'Foi você quem pagou pela Casa.'
                              : `Foi ${c.titular || 'quem é dono do cartão'} quem pagou pela Casa.`,
                          )}
                        </span>
                      </span>
                    </p>
                  ) : null}
                  <p className="sub cartao-linha" style={{ margin: '6px 0 14px' }}>
                    {atual.fechada ? <Landmark aria-hidden="true" /> : <ShoppingBag aria-hidden="true" />}
                    {avisoDaFatura(atual.fechada, c.dia_fechamento)}
                  </p>
                </>
              )}
              {fs.length ? (
                <h3 className="dayh cartao-linha">
                  <CalendarRange aria-hidden="true" />
                  Próximas {fs.length} faturas
                </h3>
              ) : (
                <p className="sub">Nenhuma fatura neste cartão ainda.</p>
              )}
              {/* mês zerado não ganha linha com barra vazia: meses zerados seguidos viram 1 linha só */}
              {(oculto ? fs.map(f => ({ tipo: 'fatura' as const, f })) : agruparFaturas(fs)).map(g =>
                g.tipo === 'zeros' ? (
                  <p key={g.de} className="fat zeros">
                    {g.de === g.ate ? mesCurto(g.de) : `${mesCurto(g.de)} a ${mesCurto(g.ate)}`}: <Din v={0} />
                  </p>
                ) : (
                  <div key={g.f.mes} className={'fat' + (g.f === atual ? ' cur' : '')}>
                    <span>{mesCurto(g.f.mes)}</span>
                    <span className="bar" aria-hidden="true">
                      <i
                        className={oculto ? 'neutra' : g.f.fechada ? '' : 'aberta'}
                        style={{ width: oculto ? '50%' : (g.f.total / max) * 100 + '%' }}
                      />
                    </span>
                    <Din v={g.f.total} />
                  </div>
                ),
              )}
              {!oculto && fs.some(f => f.total > 0) && (
                <p className="leg" style={{ marginTop: 8 }}>
                  <span>
                    <i className="q" style={{ background: 'var(--ink-2)' }} />
                    fechada, a pagar
                  </span>
                  <span>
                    <i className="q" style={{ background: 'var(--accent)' }} />
                    aberta, ainda recebe compras
                  </span>
                </p>
              )}
            </section>
          )
        })}
      </div>
      {sim &&
        resumo &&
        (() => {
          // R8: "E se eu comprar?" responde com o limite de quem compra, não com o da família
          const meu = resumo.envelopes.find(e => e.id === familia?.envelopeId && !e.casa)
          return (
            <Simulador
              cartoes={meus}
              faturas={faturas}
              livre={meu ? meu.livre : resumo.livre_mes}
              colchao={meu ? 0 : resumo.colchao}
              dono={meu?.nome}
              fechar={() => setSim(false)}
            />
          )
        })()}
      {dias && familia && (
        <DiasDoCartao
          c={dias}
          fechar={() => setDias(null)}
          salvar={async (fe, ve) => {
            await api.cartaoSalvar(familia.id, { ...dias, dia_fechamento: fe, dia_vencimento: ve })
            setDias(null)
            setN(x => x + 1)
            await recarregar()
            toast(`${dias.nome}: fecha dia ${fe}, vence dia ${ve}. As parcelas seguem as faturas novas.`)
          }}
        />
      )}
      {novo && familia && (
        <NovoCartao
          fechar={() => setNovo(false)}
          salvar={async c => {
            await api.criarCartao(familia.id, c)
            setNovo(false)
            setN(x => x + 1)
            await recarregar()
            toast(`Cartão ${c.nome} cadastrado.`)
          }}
        />
      )}
    </div>
  )
}

function Simulador({
  cartoes,
  faturas,
  livre,
  colchao,
  fechar,
  dono,
}: {
  cartoes: Cartao[]
  faturas: Fatura[]
  livre: number
  colchao: number
  fechar: () => void
  dono?: string
}) {
  const { oculto } = useOlhoApp()
  const [txt, setTxt] = useState('')
  const [parc, setParc] = useState(1)
  const [cid, setCid] = useState(cartoes[0]?.id)
  const c = cartoes.find(x => x.id === cid) || cartoes[0]
  const valor = textoParaValor(txt)
  const hoje = hojeRecife()
  const ps = valor > 0 && c ? simularCompra(valor, parc, hoje, c.dia_fechamento || 1, c.dia_vencimento || 10) : []
  const fs = faturas.filter(f => f.cartao_id === c?.id).sort((a, b) => a.mes.localeCompare(b.mes))
  const meses = mesesDaSimulacao(fs, ps)
  const linha = meses.map(m => ({
    mes: m,
    antes: fs.find(f => f.mes === m)?.total || 0,
    mais: ps.find(p => p.mes === m)?.valor || 0,
  }))
  const max = Math.max(1, ...linha.map(l => l.antes + l.mais))
  // conta no mês só a 1ª parcela (as outras saem dos meses delas)
  const noMes = compromissoNesteMes(valor, parc, hoje, ps)
  const depois = centavos(livre - noMes)
  const cabe = depois >= colchao
  return (
    <Sheet titulo="E se eu comprar?" fechar={fechar}>
      <p className="sub">
        Simulação: nada é gravado. Mostra se a compra cabe {dono ? 'no seu combinado do mês' : 'sem mexer na reserva'}.
      </p>
      <label className="campo">
        <span>Valor da compra</span>
        <CampoValor valor={txt} mudar={v => setTxt(v.replace(/[^\d,]/g, ''))} />
      </label>
      <div className="atrow">
        <span className="atl">Cartão</span>
        {cartoes.map(x => (
          <button key={x.id} type="button" className="pill" aria-pressed={x.id === c?.id} onClick={() => setCid(x.id)}>
            {textoPrivado(x.nome)}
          </button>
        ))}
      </div>
      <div className="atrow">
        <span className="atl">Parcelas</span>
        {[1, 2, 3, 4, 5, 6, 10, 12].map(p => (
          <button key={p} type="button" className="pill" aria-pressed={p === parc} onClick={() => setParc(p)}>
            {p}x
          </button>
        ))}
      </div>
      {valor > 0 && (
        <>
          <p className={'todo ' + (cabe ? 'ok' : 'warn')}>
            {cabe ? (
              <Icone desenho={CircleCheck} aria-hidden="true" />
            ) : (
              <Icone desenho={TriangleAlert} aria-hidden="true" />
            )}
            <span>
              {dono ? (
                cabe ? (
                  <>
                    <b>As parcelas deste mês cabem no seu limite.</b> O que você ainda pode gastar no mês vai de{' '}
                    {reais(livre)} para {reais(depois)}.
                  </>
                ) : (
                  <>
                    <b>Passa {reais(colchao - depois)} do seu combinado.</b> Vale esperar, parcelar mais ou combinar com
                    a Casa?
                  </>
                )
              ) : cabe ? (
                <>
                  <b>Cabe sem mexer na reserva.</b> O que ainda pode gastar no mês vai de {reais(livre)} para{' '}
                  {reais(depois)}.
                </>
              ) : (
                <>
                  <b>Mexe na reserva em {reais(colchao - depois)}.</b> Vale esperar ou parcelar mais?
                </>
              )}
            </span>
          </p>
          <p className="sub">
            Essa conta vale só para {mesCurto(hoje)}. Os outros meses mostram as faturas, sem dizer se cabem.
          </p>
          {parc > 1 && <p className="sub parc-fatura">{textoPrivado(fraseParcelamento(valor, ps))}</p>}
          <ul className="exp">
            <li>
              <span>{textoPrivado(dono ? `Ainda pode gastar no mês (${dono})` : 'Ainda pode gastar no mês')}</span>
              <Din v={livre} />
            </li>
            <li>
              <span>{parc > 1 ? `Parcelas que contam neste mês` : 'Compra'}</span>
              <Din v={-noMes} menos />
            </li>
            {!dono && (
              <li>
                <span>Reserva: o dinheiro que a família combinou nunca gastar</span>
                <Din v={-colchao} menos />
              </li>
            )}
            <li className="tot">
              <span>{depois - colchao >= 0 ? 'Sobra depois da compra' : 'Depois da compra, passa'}</span>
              <Din v={Math.abs(centavos(depois - colchao))} />
            </li>
          </ul>
          <h3 className="dayh">
            Faturas do {textoPrivado(c?.nome)} com a compra ({parc}x de {reais(ps[ps.length - 1]?.valor || 0)})
          </h3>
          {linha.map(l => (
            <div key={l.mes} className="fat">
              <span>{mesCurto(l.mes)}</span>
              <span className="bar" aria-hidden="true">
                <i className={oculto ? 'neutra' : ''} style={{ width: oculto ? '50%' : (l.antes / max) * 100 + '%' }} />
                <i
                  className={oculto ? 'neutra' : 'sim'}
                  style={{ width: oculto ? '0%' : (l.mais / max) * 100 + '%' }}
                />
              </span>
              <Din v={centavos(l.antes + l.mais)} />
            </div>
          ))}
          <p className="leg">
            <span>
              <i
                style={{ width: 12, height: 8, borderRadius: 4, background: 'var(--ink-2)', display: 'inline-block' }}
              />
              o que já tem
            </span>
            <span>
              <i
                style={{ width: 12, height: 8, borderRadius: 4, background: 'var(--accent)', display: 'inline-block' }}
              />
              a compra nova
            </span>
          </p>
        </>
      )}
    </Sheet>
  )
}

function NovoCartao({ fechar, salvar }: { fechar: () => void; salvar: (c: Omit<Cartao, 'id'>) => Promise<void> }) {
  const [nome, setNome] = useRascunho('cadastro:cartao:nome', '')
  const [fe, setFe] = useRascunho('cadastro:cartao:fe', '')
  const [ve, setVe] = useRascunho('cadastro:cartao:ve', '')
  const [erro, setErro] = useState('')
  return (
    <Sheet titulo="Novo cartão" fechar={fechar}>
      <form
        style={{ display: 'grid', gap: 12 }}
        onSubmit={async e => {
          e.preventDefault()
          const f = Number(fe),
            v = Number(ve)
          if (!nome.trim() || !(f >= 1 && f <= 31) || !(v >= 1 && v <= 31)) {
            setErro('Preencha o nome e os 2 dias, de 1 a 31.')
            return
          }
          try {
            await salvar({ nome: nome.trim(), dia_fechamento: f, dia_vencimento: v })
            ;[setNome, setFe, setVe].forEach(s => s.limpar())
          } catch (x) {
            setErro((x as Error).message)
          }
        }}
      >
        <label className="campo">
          <span>Nome do cartão</span>
          <CampoPrivado className="inp" placeholder="Ex.: Inter" value={nome} onChange={e => setNome(e.target.value)} />
        </label>
        <label className="campo">
          <span>Dia que a fatura fecha</span>
          <CampoPrivado
            className="inp"
            inputMode="numeric"
            value={fe}
            onChange={e => setFe(e.target.value.replace(/\D/g, '').slice(0, 2))}
          />
          <small>Está no app do banco, como "melhor dia de compra" menos 1.</small>
        </label>
        <label className="campo">
          <span>Dia que vence</span>
          <CampoPrivado
            className="inp"
            inputMode="numeric"
            value={ve}
            onChange={e => setVe(e.target.value.replace(/\D/g, '').slice(0, 2))}
          />
        </label>
        {erro && (
          <p className="erro" role="alert">
            {textoPrivado(erro)}
          </p>
        )}
        <Botao variante="primario" className="full" type="submit">
          <Icone nome="salvo" />
          Salvar cartão
        </Botao>
      </form>
    </Sheet>
  )
}

/** E4: o dia que a fatura fecha e o dia que vence de um cartão que já existe (só o dono do cartão). */
function DiasDoCartao({
  c,
  fechar,
  salvar,
}: {
  c: Cartao
  fechar: () => void
  salvar: (fe: number, ve: number) => Promise<void>
}) {
  const [fe, setFe] = useState(c.dia_fechamento ? String(c.dia_fechamento) : '')
  const [ve, setVe] = useState(c.dia_vencimento ? String(c.dia_vencimento) : '')
  const [erro, setErro] = useState('')
  return (
    <Sheet titulo={textoPrivado(`Dias do ${c.nome}`)} fechar={fechar}>
      <form
        style={{ display: 'grid', gap: 12 }}
        onSubmit={async e => {
          e.preventDefault()
          const f = Number(fe),
            v = Number(ve)
          if (!(f >= 1 && f <= 31) || !(v >= 1 && v <= 31)) {
            setErro('Os 2 dias vão de 1 a 31.')
            return
          }
          try {
            await salvar(f, v)
          } catch (x) {
            setErro((x as Error).message)
          }
        }}
      >
        <label className="campo">
          <span>Dia que a fatura fecha</span>
          <CampoPrivado
            className="inp"
            inputMode="numeric"
            value={fe}
            onChange={e => setFe(e.target.value.replace(/\D/g, '').slice(0, 2))}
          />
          <small>Compra feita nesse dia ou depois vai para fatura seguinte.</small>
        </label>
        <label className="campo">
          <span>Dia que a fatura vence</span>
          <CampoPrivado
            className="inp"
            inputMode="numeric"
            value={ve}
            onChange={e => setVe(e.target.value.replace(/\D/g, '').slice(0, 2))}
          />
          <small>Cada parcela sai do seu limite no dia 1 do mês em que a fatura vence.</small>
        </label>
        {erro && (
          <p className="erro" role="alert">
            {textoPrivado(erro)}
          </p>
        )}
        <Botao variante="primario" className="full" type="submit">
          <Icone nome="salvo" />
          Salvar os dias
        </Botao>
      </form>
    </Sheet>
  )
}
