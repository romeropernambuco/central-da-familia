import { useEffect, useState } from 'react'
import { ChevronRight, ListChecks } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useMembros } from '../../app/useMembros'
import { Din, Vazio } from '../../componentes/base'
import { Qm } from '../../componentes/Qm'
import { EnvelopeCard, comecoDoMes, fraseEstouro, numeroEnvelope, primeiroDoMesQueVem, tetoDoMes } from '../../componentes/EnvelopeCard'
import { escreveNo, rotuloDono } from '../../app/dono'
import { RitmoMes } from '../../componentes/RitmoMes'
import { PrecisaDeVoce } from '../escritorio/Escritorio'
import { CartaoGuardado } from '../guardado/Guardado'
import { Linha2028Resumo } from '../../componentes/Linha2028'
import type { Envelope, Lancamento, ResumoHoje } from '../../api/tipos'
import { centavos, dataCurta, fimDoMes, hojeRecife, mesAnterior, mesLongo, plural, reais, saudacao, somaDias } from '../../lib/formato'

/** Início: 1º o número de hoje (o seu, quando você tem limite próprio); depois o Guardado em 1 cartão, o que precisa de você e quanto cada um pode gastar. */
export function Inicio() {
  const { resumo, familia, api, versao, abrirLancar, explicar } = useApp()
  const nomeDe = useMembros()
  const [ult, setUlt] = useState<Lancamento[]>([])
  useEffect(() => {
    if (!familia) return
    let vivo = true
    // só o mês de hoje; no começo do mês, se vier menos de 4, completa com o mês passado
    const mes = hojeRecife().slice(0, 7)
    ;(async () => {
      let l = (await api.lancamentos(familia.id, mes)).filter(x => !x.apagado_em)
      if (l.length < 4) l = [...l, ...(await api.lancamentos(familia.id, mesAnterior(mes))).filter(x => !x.apagado_em)]
      if (vivo) setUlt(l.slice(0, 4))
    })().catch(() => {})
    return () => { vivo = false }
  }, [api, familia?.id, versao])

  if (!resumo) return <div className="card"><p className="sub">Buscando o número de hoje…</p></div>
  const hoje = hojeRecife()
  const sobra = Math.max(0, resumo.livre_mes - resumo.colchao)
  const env = (id: string) => resumo.envelopes.find(e => e.id === id)
  const nomeEnv = (id: string) => env(id)?.nome || ''
  // R5: quem tem limite próprio vê o número DELE em cima; a Casa vira uma linha menor
  const meu = resumo.envelopes.find(e => e.id === familia?.envelopeId && !e.casa)
  const temCasa = resumo.envelopes.some(e => e.casa)
  // E2: o casal vê o limite de cada um, com o nome; o seu vem 1º e o do outro sem botão de mexer
  const temOutros = resumo.envelopes.some(e => !escreveNo(e, familia))
  const casaHoje = centavos(resumo.envelopes.filter(e => e.casa).reduce((s, e) => s + (e.hoje || 0), 0))
  const n = meu ? numeroEnvelope(meu, resumo.dias_restantes) : null
  // L2: tocar no número grande diz por que ele mudou desde ontem
  const porQue = meu?.mudou ? () => explicar({ cabeca: 'Por que mudou?', titulo: meu.mudou!.motivo, linhas: [{ linha: 'Ontem o dia tinha', valor: meu.mudou!.ontem }, { linha: 'Hoje o dia tem', valor: meu.valor_dia_inteiro ?? meu.hoje ?? 0 }] }) : undefined

  return (
    <div className="view">
      {meu && n ? (
        <section className="card hoje-card" aria-labelledby="hHoje">
          <p className="sub">{saudacao()}, {familia?.membroNome}</p>
          <h2 id="hHoje" className="lbl" style={{ fontSize: 16 }}>{n.estado === 'devendo' ? 'Seu mês passou do combinado' : 'Hoje você pode gastar'}</h2>
          <div className="numrow">{n.estado === 'devendo' ? <span className="din-warn"><Din v={n.devendo} tam="hero" /></span>
            : porQue ? <button type="button" className="mudou" onClick={porQue} aria-label="Por que mudou? Toque pra ver o que mexeu no número de hoje"><Din v={meu.hoje ?? n.valor} tam="hero" /></button>
            : <Din v={meu.hoje ?? n.valor} tam="hero" />}</div>
          {n.estado === 'devendo' && <p className="apoio"><b>fica devendo</b> neste mês</p>}
          {/* E3 (conserto 5): depois de gastar, o número do dia diz quanto já saiu e quanto ainda pode */}
          {n.estado !== 'devendo' && (meu.gasto_hoje || 0) > 0 && <p className="apoio hoje-saiu">Hoje já saiu <b>{reais(meu.gasto_hoje || 0)}</b>. Ainda pode hoje <b>{reais(meu.hoje ?? n.valor)}</b>.</p>}
          <Virada e={meu} />
          {n.estado !== 'devendo' && <ViradaAntes e={meu} />}
          {fraseEstouro(meu, n) && <p className="todo warn frase-estouro">{fraseEstouro(meu, n)}</p>}
          {n.estado !== 'devendo' && <RitmoMes e={meu} />}
          {n.estado !== 'devendo' && <p className="apoio">{meu.livre < 0 ? <>Do seu combinado de <b>{reais(tetoDoMes(meu))}</b>, passou <b>{reais(-meu.livre)}</b>.</> : <>Do seu combinado de <b>{reais(tetoDoMes(meu))}</b>, sobram <b>{reais(meu.livre)}</b> até {dataCurta(fimDoMes(hoje))}.</>}</p>}
          {temCasa && <p className="apoio casa-linha">A Casa (feira e contas) pode gastar hoje <b>{reais(casaHoje)}</b>.{resumo.colchao ? <> A reserva de {reais(resumo.colchao)} (o dinheiro que a família combinou nunca gastar) fica de fora.</> : null}</p>}
          <div className="row-btns">
            <Qm texto titulo={n.estado === 'devendo' ? 'Seu mês' : 'Hoje você pode gastar'} linhas={n.linhas} nota={`A mesma conta do banco da família.${meu.regra === 'diario' ? ' Sábado, domingo e feriado valem 1,5 dia.' : ''} Muda a cada gasto lançado.`} />
            {porQue && <button type="button" className="explica-l" onClick={porQue}>Por que mudou?</button>}
          </div>
        </section>
      ) : (
        <section className="card hoje-card" aria-labelledby="hHoje">
          <p className="sub">{saudacao()}, {familia?.membroNome}</p>
          <h2 id="hHoje" className="lbl" style={{ fontSize: 16 }}>Hoje você pode gastar</h2>
          <div className="numrow"><Din v={resumo.pode_gastar_hoje} tam="hero" /></div>
          <p className="apoio">Sobram <b>{reais(sobra)}</b> até {dataCurta(fimDoMes(hoje))}, em {plural(resumo.dias_restantes, 'dia', 'dias')}.{resumo.colchao ? <> A reserva de {reais(resumo.colchao)} (o dinheiro que a família combinou nunca gastar) fica de fora.</> : null}</p>
          <Qm texto titulo="Hoje você pode gastar" linhas={resumo.explicacao} nota="A conta é feita pelo banco da família, igual pra todo mundo da casa. Muda a cada gasto lançado." />
        </section>
      )}

      {/* rodada 2 (BRUNO ideia 1): o placar do casal, só o que vem pela frente, sem item de ninguém */}
      <Placar r={resumo} />
      {/* logo abaixo do número do dia: quanto o dinheiro guardado rendeu hoje (só o casal) */}
      <CartaoGuardado />
      {/* E7: a linha até dez/2028 em 1 linha (só o casal); o desenho fica no Planejamento */}
      <Linha2028Resumo />
      {/* o Escritório: quantas coisas precisam de você, com a 1ª pergunta respondível aqui mesmo (a pessoa só ouve o que é dela) */}
      <PrecisaDeVoce />

      <section aria-labelledby="hEnv" className="view">
        <h2 id="hEnv" className="sec-t">{meu && !temOutros ? (temCasa ? 'O seu e o da Casa' : 'O seu') : 'Quanto cada um pode gastar'}</h2>
        <div className="envs">
          {resumo.envelopes.map(e => <EnvelopeCard key={e.id} e={e} diasRestantes={resumo.dias_restantes} meu={e.id === meu?.id} />)}
        </div>
      </section>

      <section className="card" aria-labelledby="hUlt">
        <div className="card-h"><h2 id="hUlt">Últimos lançamentos</h2><a className="lnk" href="#/lancamentos">Ver todos<ChevronRight size={16} /></a></div>
        {ult.length ? (
          <ul className="list">
            {ult.map(l => (
              <li key={l.id} className="li">
                <span className="tile">{(nomeEnv(l.envelope_id) || '?').charAt(0)}</span>
                <span className="m"><b>{l.descricao || 'Sem nome'}</b><small>{nomeEnv(l.envelope_id)}{rotuloDono(env(l.envelope_id), familia) && !rotuloDono(env(l.envelope_id), familia).endsWith(nomeEnv(l.envelope_id)) ? ` ${rotuloDono(env(l.envelope_id), familia)}` : ''}{env(l.envelope_id)?.casa && nomeDe(l.autor) ? ` · pago por ${nomeDe(l.autor)}` : ''} · {dataCurta(l.data)}{l.parcela ? ` · parcela ${l.parcela.n} de ${l.parcela.de}` : (l.parcelas || 1) > 1 ? ` · ${l.parcelas}x` : ''}</small></span>
                <span className="v"><Din v={l.valor} /></span>
              </li>
            ))}
          </ul>
        ) : (
          <Vazio ico={<ListChecks size={24} />} acao={<button className="btn primary" type="button" onClick={() => abrirLancar()}>Lançar um gasto</button>}>Nenhum gasto ainda. É só o valor e 1 toque.</Vazio>
        )}
        {ult.length > 0 && <button className="btn primary" type="button" style={{ marginTop: 12 }} onClick={() => abrirLancar()}>Lançar um gasto</button>}
      </section>
    </div>
  )
}

/** B12 + L3: virada do mês em 1 frase, sem precisar tocar (dias 1 a 3). */
function Virada({ e }: { e: Envelope }) {
  const hoje = hojeRecife()
  const ant = e.mes_anterior
  if (Number(hoje.slice(8)) > 3 || !ant) return null
  const falta = e.falta_mes_anterior || 0, parc = e.parcelas_mes || 0
  const mesAnt = mesLongo(ant.mes + '-01'), esteMes = mesLongo(hoje)
  // E3 (conserto 2): a mesma conta e a mesma frase do dia 30 (comecoDoMes)
  const c = comecoDoMes(e.limite_base ?? e.limite_mes, falta, parc, mesAnt)
  return (
    <p className={'todo virada ' + (falta ? 'warn' : 'ok')}><span>
      {cap(mesAnt)}: {reais(ant.gasto)} de {reais(ant.limite)}{falta ? `, passou ${reais(falta)}` : ', dentro'}. {cap(esteMes)} começa com <b>{reais(c.valor)}</b>{c.partes}.
    </span></p>
  )
}

/** E3 (conserto 2): nos 2 últimos dias do mês, o aviso de como o mês que vem começa (com a parcela que já cai nele). */
function ViradaAntes({ e }: { e: Envelope }) {
  const hoje = hojeRecife()
  const parc = e.parcelas_mes_que_vem || 0
  if (fimDoMes(hoje) > somaDias(hoje, 1) || !parc) return null
  const prox = primeiroDoMesQueVem()
  const c = comecoDoMes(e.limite_base ?? e.limite_mes, 0, parc, mesLongo(hoje))
  return <p className="todo virada ok"><span>{cap(mesLongo(prox))} começa com <b>{reais(c.valor)}</b>{c.partes}.</span></p>
}

/**
 * C16 + E3 (conserto 3): o placar do casal, visto pelos 2, com cada um pelo nome e o valor. Quem passa aparece em âmbar
 * ("Ana: passou R$ 717, sai de dezembro"). "Juntos, sobram" só quando os 2 fecham dentro: antes a caixa ficava verde com alguém estourado.
 */
function Placar({ r }: { r: ResumoHoje }) {
  const p = r.placar_casal
  if (!p || p.length < 2 || Number(hojeRecife().slice(8)) < 3) return null
  const passa = (x: { fecha: number; limite: number }) => x.fecha > x.limite + 0.005
  const passam = p.filter(passa)
  const sobra = centavos(p.reduce((s, x) => s + x.limite - x.fecha, 0))
  const prox = mesLongo(primeiroDoMesQueVem())
  const linha = (x: (typeof p)[number]) => {
    const nome = `${x.nome}${x.eu ? ' (você)' : ''}`
    if (!passa(x)) return `${nome}: fecha com ${reais(x.fecha)} de ${reais(x.limite)}`
    const ja = (x.gasto ?? 0) > x.limite + 0.005
    return `${nome}: ${ja ? `passou ${reais(centavos((x.gasto ?? 0) - x.limite))}` : `vai passar ${reais(centavos(x.fecha - x.limite))}`}, sai de ${prox}`
  }
  return (
    <section className={'card placar ' + (passam.length ? 'warn' : 'ok')} aria-labelledby="hPlacar">
      <h2 id="hPlacar" style={{ fontSize: 16 }}>O casal, se continuar assim</h2>
      <p>{passam.length ? <>{passam.length === p.length ? 'Os 2 passam do combinado neste mês.' : `${passam[0].eu ? 'Você passa' : `${passam[0].nome} passa`} do combinado neste mês.`} O que passa sai de {prox}.</> : <>Juntos, sobram <b>{reais(sobra)}</b> no fim do mês.</>}</p>
      <p className="pes">{p.map(x => <span key={x.nome} className={passa(x) ? 'placar-passa' : ''}>{linha(x)}</span>)}</p>
      <p className="sub" style={{ color: 'inherit', opacity: .85 }}>Só a conta do fim do mês. Os gastos de cada um estão em Lançamentos, com o nome de quem gastou.</p>
    </section>
  )
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
