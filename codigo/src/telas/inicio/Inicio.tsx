import { useEffect, useState } from 'react'
import { ChevronRight, ListChecks } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { Din, Vazio } from '../../componentes/base'
import { Qm } from '../../componentes/Qm'
import { EnvelopeCard } from '../../componentes/EnvelopeCard'
import { PrecisaDeVoce } from '../escritorio/Escritorio'
import { CartaoGuardado } from '../guardado/Guardado'
import type { Lancamento } from '../../api/tipos'
import { dataCurta, fimDoMes, hojeRecife, mesAnterior, reais, saudacao } from '../../lib/formato'

/** Início: 1º o número de hoje; depois o Guardado em 1 cartão, o que precisa de você e quanto cada um pode gastar. */
export function Inicio() {
  const { resumo, familia, api, versao, abrirLancar } = useApp()
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
  const nomeEnv = (id: string) => resumo.envelopes.find(e => e.id === id)?.nome || ''

  return (
    <div className="view">
      <section className="card hoje-card" aria-labelledby="hHoje">
        <p className="sub">{saudacao()}, {familia?.membroNome}</p>
        <h2 id="hHoje" className="lbl" style={{ fontSize: 16 }}>Hoje você pode gastar</h2>
        <div className="numrow"><Din v={resumo.pode_gastar_hoje} tam="hero" /></div>
        <p className="apoio">Sobram <b>{reais(sobra)}</b> até {dataCurta(fimDoMes(hoje))}, em {resumo.dias_restantes} dias. A reserva de {reais(resumo.colchao)} (o dinheiro que vocês combinaram nunca gastar) fica de fora.</p>
        <Qm texto titulo="Hoje você pode gastar" linhas={resumo.explicacao} nota="A conta é feita pelo banco da família, igual pra todo mundo da casa. Muda a cada gasto lançado." />
      </section>

      {/* logo abaixo do número do dia: quanto o dinheiro guardado rendeu hoje (só o casal) */}
      <CartaoGuardado />
      {/* o Escritório: quantas coisas precisam de você, com a 1ª pergunta respondível aqui mesmo */}
      <PrecisaDeVoce />

      <section aria-labelledby="hEnv" className="view">
        <h2 id="hEnv" className="sec-t">Quanto cada um pode gastar</h2>
        <div className="envs">
          {resumo.envelopes.map(e => <EnvelopeCard key={e.id} e={e} diasRestantes={resumo.dias_restantes} />)}
        </div>
      </section>

      <section className="card" aria-labelledby="hUlt">
        <div className="card-h"><h2 id="hUlt">Últimos lançamentos</h2><a className="lnk" href="#/lancamentos">Ver todos<ChevronRight size={16} /></a></div>
        {ult.length ? (
          <ul className="list">
            {ult.map(l => (
              <li key={l.id} className="li">
                <span className="tile">{(nomeEnv(l.envelope_id) || '?').charAt(0)}</span>
                <span className="m"><b>{l.descricao || 'Gasto'}</b><small>{nomeEnv(l.envelope_id)} · {dataCurta(l.data)}</small></span>
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
