import { useEffect, useState } from 'react'
import { CreditCard, Plus, ShoppingBag, CircleCheck, TriangleAlert } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { Din, Sheet, Vazio } from '../../componentes/base'
import { FuncIco } from '../../componentes/Pergunta'
import { Qm } from '../../componentes/Qm'
import type { Cartao, Fatura } from '../../api/tipos'
import { agruparFaturas, centavos, dataCurta, hojeRecife, mesCurto, reais, simularCompra, textoParaValor } from '../../lib/formato'

const MESES = 6

/** Cartões: faturas dos próximos 6 meses e "E se eu comprar?" ligado ao colchão. */
export function Cartoes() {
  const { api, familia, resumo, versao, recarregar, toast } = useApp()
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [sim, setSim] = useState(false)
  const [novo, setNovo] = useState(false)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!familia) return
    api.cartoes(familia.id).then(setCartoes).catch(() => {})
    api.faturas(familia.id, MESES).then(setFaturas).catch(() => {})
  }, [api, familia?.id, versao, n])
  const hoje = hojeRecife()
  const casal = familia?.papel === 'casal'

  return (
    <div className="view">
      {cartoes.length > 0 && <p className="lbl"><FuncIco id="cartao" size={24} />Analista de Cartão: acompanha as faturas, não paga nada sozinho</p>}
      <div className="row-btns">
        <button className="btn primary" type="button" onClick={() => setSim(true)} disabled={!cartoes.length}><ShoppingBag size={20} />E se eu comprar?</button>
        {casal && <button className="btn line" type="button" onClick={() => setNovo(true)}><Plus size={20} />Novo cartão</button>}
      </div>
      {!cartoes.length && <div className="card"><Vazio ico={<CreditCard size={24} />} acao={casal ? <button className="btn line" type="button" onClick={() => setNovo(true)}><Plus size={20} />Cadastrar cartão</button> : undefined}>Nenhum cartão cadastrado. Com o dia que a fatura fecha e o dia que vence, a compra cai na fatura certa sozinha.</Vazio></div>}
      <div className="envs">
        {cartoes.map(c => {
          const fs = faturas.filter(f => f.cartao_id === c.id).sort((a, b) => a.mes.localeCompare(b.mes))
          const atual = fs.find(f => f.vencimento >= hoje) || fs[0]
          const max = Math.max(1, ...fs.map(f => f.total))
          return (
            <section className="card" key={c.id} aria-label={`Cartão ${c.nome}`}>
              <div className="card-h">
                <h2><CreditCard size={24} aria-hidden="true" />{c.nome}</h2>
                <span className="sub">fecha dia {c.dia_fechamento} · vence dia {c.dia_vencimento}</span>
              </div>
              {atual && (
                <>
                  <p className="lbl">Fatura que vence {dataCurta(atual.vencimento)} <span className={'chip' + (atual.fechada ? '' : ' ok')}>{atual.fechada ? 'fechada' : 'aberta'}</span></p>
                  <div className="numrow"><Din v={atual.total} tam="big" />
                    <Qm titulo={`Fatura ${c.nome} de ${mesCurto(atual.mes)}`} linhas={[{ linha: `Compras no ${c.nome} que caem na fatura que vence ${dataCurta(atual.vencimento)}`, valor: atual.total }]}
                      nota={`A compra conta no "pode gastar" pelo dia em que foi feita, e na fatura pelo mês em que vence. Compra feita depois do dia ${c.dia_fechamento} vai pra fatura seguinte.`} />
                  </div>
                  <p className="sub" style={{ margin: '6px 0 14px' }}>{atual.fechada ? 'Pague no app do banco. Aqui é só pra acompanhar: o app não paga nada sozinho.' : 'Ainda entra compra nesta fatura até o dia do fechamento.'}</p>
                </>
              )}
              <h3 className="dayh">Próximas {fs.length} faturas</h3>
              {/* mês zerado não ganha linha com barra vazia: meses zerados seguidos viram 1 linha só */}
              {agruparFaturas(fs).map(g => g.tipo === 'zeros' ? (
                <p key={g.de} className="fat zeros">{g.de === g.ate ? mesCurto(g.de) : `${mesCurto(g.de)} a ${mesCurto(g.ate)}`}: R$ 0</p>
              ) : (
                <div key={g.f.mes} className={'fat' + (g.f === atual ? ' cur' : '')}>
                  <span>{mesCurto(g.f.mes)}</span>
                  <span className="bar" aria-hidden="true"><i className={g.f.fechada ? '' : 'aberta'} style={{ width: (g.f.total / max) * 100 + '%' }} /></span>
                  <Din v={g.f.total} />
                </div>
              ))}
              {fs.some(f => f.total > 0) && <p className="leg" style={{ marginTop: 8 }}><span><i className="q" style={{ background: 'var(--ink-2)' }} />fechada (é pagar)</span><span><i className="q" style={{ background: 'var(--accent)' }} />aberta (ainda entra compra)</span></p>}
            </section>
          )
        })}
      </div>
      {sim && resumo && <Simulador cartoes={cartoes} faturas={faturas} livre={resumo.livre_mes} colchao={resumo.colchao} fechar={() => setSim(false)} />}
      {novo && familia && <NovoCartao fechar={() => setNovo(false)} salvar={async c => { await api.criarCartao(familia.id, c); setNovo(false); setN(x => x + 1); await recarregar(); toast(`Cartão ${c.nome} cadastrado.`) }} />}
    </div>
  )
}

function Simulador({ cartoes, faturas, livre, colchao, fechar }: { cartoes: Cartao[]; faturas: Fatura[]; livre: number; colchao: number; fechar: () => void }) {
  const [txt, setTxt] = useState('')
  const [parc, setParc] = useState(1)
  const [cid, setCid] = useState(cartoes[0]?.id)
  const c = cartoes.find(x => x.id === cid) || cartoes[0]
  const valor = textoParaValor(txt)
  const hoje = hojeRecife()
  const ps = valor > 0 && c ? simularCompra(valor, parc, hoje, c.dia_fechamento || 1, c.dia_vencimento || 10) : []
  const fs = faturas.filter(f => f.cartao_id === c?.id).sort((a, b) => a.mes.localeCompare(b.mes))
  const meses = [...new Set([...fs.map(f => f.mes), ...ps.map(p => p.mes)])].sort().slice(0, 8)
  const linha = meses.map(m => ({ mes: m, antes: fs.find(f => f.mes === m)?.total || 0, mais: ps.find(p => p.mes === m)?.valor || 0 }))
  const max = Math.max(1, ...linha.map(l => l.antes + l.mais))
  const depois = centavos(livre - valor)
  const cabe = depois >= colchao
  return (
    <Sheet titulo="E se eu comprar?" fechar={fechar}>
      <p className="sub">Simulação: nada é gravado. Mostra como ficam as faturas e se a compra mexe na reserva (o dinheiro que vocês combinaram nunca gastar).</p>
      <label className="campo"><span>Valor da compra</span><input className="inp" inputMode="decimal" placeholder="R$" value={txt} onChange={e => setTxt(e.target.value.replace(/[^\d,]/g, ''))} /></label>
      <div className="atrow"><span className="atl">Cartão</span>{cartoes.map(x => <button key={x.id} type="button" className="pill" aria-pressed={x.id === c?.id} onClick={() => setCid(x.id)}>{x.nome}</button>)}</div>
      <div className="atrow"><span className="atl">Parcelas</span>{[1, 2, 3, 6, 10, 12].map(p => <button key={p} type="button" className="pill" aria-pressed={p === parc} onClick={() => setParc(p)}>{p}x</button>)}</div>
      {valor > 0 && (
        <>
          <p className={'todo ' + (cabe ? 'ok' : 'warn')}>{cabe ? <CircleCheck size={20} aria-hidden="true" /> : <TriangleAlert size={20} aria-hidden="true" />}
            <span>{cabe ? <><b>Cabe sem mexer na reserva.</b> O livre do mês vai de {reais(livre)} pra {reais(depois)}.</> : <><b>Mexe na reserva em {reais(colchao - depois)}.</b> Vale esperar ou parcelar mais?</>}</span></p>
          <ul className="exp">
            <li><span>Livre no mês hoje</span><Din v={livre} /></li>
            <li><span>Compra (conta inteira no dia da compra)</span><Din v={-valor} /></li>
            <li><span>Reserva: o dinheiro que vocês combinaram nunca gastar</span><Din v={-colchao} /></li>
            <li className="tot"><span>Sobra depois da compra</span><Din v={centavos(depois - colchao)} /></li>
          </ul>
          <h3 className="dayh">Faturas do {c?.nome} com a compra ({parc}x de {reais(ps[ps.length - 1]?.valor || 0)})</h3>
          {linha.map(l => (
            <div key={l.mes} className="fat">
              <span>{mesCurto(l.mes)}</span>
              <span className="bar" aria-hidden="true"><i style={{ width: (l.antes / max) * 100 + '%' }} /><i className="sim" style={{ width: (l.mais / max) * 100 + '%' }} /></span>
              <Din v={centavos(l.antes + l.mais)} />
            </div>
          ))}
          <p className="leg"><span><i style={{ width: 12, height: 8, borderRadius: 4, background: 'var(--ink-2)', display: 'inline-block' }} />o que já tem</span><span><i style={{ width: 12, height: 8, borderRadius: 4, background: 'var(--accent)', display: 'inline-block' }} />a compra nova</span></p>
        </>
      )}
    </Sheet>
  )
}

function NovoCartao({ fechar, salvar }: { fechar: () => void; salvar: (c: Omit<Cartao, 'id'>) => Promise<void> }) {
  const [nome, setNome] = useState('')
  const [fe, setFe] = useState('')
  const [ve, setVe] = useState('')
  const [erro, setErro] = useState('')
  return (
    <Sheet titulo="Novo cartão" fechar={fechar}>
      <form style={{ display: 'grid', gap: 12 }} onSubmit={async e => {
        e.preventDefault()
        const f = Number(fe), v = Number(ve)
        if (!nome.trim() || !(f >= 1 && f <= 31) || !(v >= 1 && v <= 31)) { setErro('Preencha o nome e os 2 dias, de 1 a 31.'); return }
        try { await salvar({ nome: nome.trim(), dia_fechamento: f, dia_vencimento: v }) } catch (x) { setErro((x as Error).message) }
      }}>
        <label className="campo"><span>Nome do cartão</span><input className="inp" placeholder="Ex.: Nubank" value={nome} onChange={e => setNome(e.target.value)} /></label>
        <label className="campo"><span>Dia que a fatura fecha</span><input className="inp" inputMode="numeric" value={fe} onChange={e => setFe(e.target.value.replace(/\D/g, '').slice(0, 2))} /><small>Está no app do banco, como "melhor dia de compra" menos 1.</small></label>
        <label className="campo"><span>Dia que vence</span><input className="inp" inputMode="numeric" value={ve} onChange={e => setVe(e.target.value.replace(/\D/g, '').slice(0, 2))} /></label>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="btn primary full" type="submit">Salvar cartão</button>
      </form>
    </Sheet>
  )
}
