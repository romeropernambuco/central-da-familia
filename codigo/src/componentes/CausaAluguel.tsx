import { useState } from 'react'
import { Scale } from 'lucide-react'
import type { ImovelTela } from '../api/tipos'
import { useAcoes } from '../app/contexto'
import type { CadernoImovel, ProblemaAluguel } from '../lib/aluguel'
import {
  avisosDaCausa,
  CAUSA_PADRAO,
  contaDaCausa,
  GARANTIAS,
  lerCausa,
  regrasDaCausa,
  type CausaAluguel,
  type Garantia,
} from '../lib/causaAluguel'
import { hojeRecife, textoParaValor, valorDigitadoValido, valorParaTexto } from '../lib/formato'
import { Botao, CampoValor, Din, Sheet } from './base'
import { Icone } from './Icone'
import { CampoDecimal } from './privacidade'
import './planilha.css'

const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
const mmaa = (m: string) => `${m.slice(5, 7)}/${m.slice(2, 4)}`

/**
 * A causa na justiça: o que pedir hoje (cada mês sem pagar entra sozinho), a regra de cada parte, o que é da família e o
 * que é do advogado, a expectativa e o aviso de passar o pedido atualizado ao advogado.
 */
export function CausaDoAluguel({
  imovel,
  c,
  p,
  gravar,
}: {
  imovel: ImovelTela
  c: CadernoImovel
  p: ProblemaAluguel
  gravar: (c: CadernoImovel) => Promise<boolean>
}) {
  const { toast } = useAcoes()
  const [ajustar, setAjustar] = useState(false)
  const hoje = hojeRecife()
  const causa = lerCausa(p.causa) || CAUSA_PADRAO
  const k = contaDaCausa(c, imovel.aluguel, causa, hoje)
  if (!k) return null
  const salvarCausa = (nova: CausaAluguel) => gravar({ ...c, problema: { ...p, causa: nova } })
  const passei = async () => {
    if (await salvarCausa({ ...causa, passado_em: hoje, pedido_passado: k.pedido }))
      toast('Anotado: o advogado tem o pedido de hoje. O app avisa quando subir de novo.')
  }
  const linhas: [string, number][] = [
    ['Aluguéis atrasados', k.alugueis],
    ...(k.encargos > 0 ? ([['Condomínio, IPTU e contas', k.encargos]] as [string, number][]) : []),
    [`Multa do contrato (${causa.multa_pct}%)`, k.multa],
    [`Juros (${causa.juros_pct}% ao mês)`, k.juros],
    ...(k.custas > 0 ? ([['Custas que a família adiantou', k.custas]] as [string, number][]) : []),
    [`Honorários na causa (${causa.honorarios_pct}%), do advogado`, k.honorarios],
    ...(causa.recuperado > 0 ? ([['Já voltou', -causa.recuperado]] as [string, number][]) : []),
  ]
  return (
    <section className="causa-aluguel" aria-label="A causa">
      <p className="lbl">
        <Icone desenho={Scale} aria-hidden="true" /> O que pedir na causa hoje
      </p>
      <p className="causa-total">
        <Din v={k.pedido} tam="mid" />
      </p>
      <table className="planilha">
        <caption>
          {k.meses.length === 1 ? '1 mês sem pagar' : `${k.meses.length} meses sem pagar`}, de{' '}
          {k.meses[0] ? mmaa(k.meses[0].mes) : '—'} até hoje
        </caption>
        <tbody>
          {linhas.map(([nome, v]) => (
            <tr key={nome} className={nome.startsWith('Honorários') ? 'fraco' : undefined}>
              <td>{nome}</td>
              <td className="num">
                {v < 0 ? '− ' : ''}
                <Din v={Math.abs(v)} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Pedido de hoje</td>
            <td className="num">
              <Din v={k.pedido} />
            </td>
          </tr>
          <tr className="destaque">
            <td>É da família (sem os honorários)</td>
            <td className="num">
              <Din v={k.daFamilia} />
            </td>
          </tr>
        </tfoot>
      </table>
      {k.expectativa ? (
        <FraseExpectativa e={k.expectativa} causa={causa} />
      ) : (
        <p className="sub">
          Pergunte ao advogado quanto ele acha que consegue e quanto cobra. Anote em “Ajustar a causa”.
        </p>
      )}
      {k.atualizar && (
        <div className="todo warn pilha" role="status">
          <p>
            {causa.passado_em ? (
              <>
                O pedido subiu <Din v={k.subiu} /> desde {dm(causa.passado_em)}. Mande o valor novo ao advogado.
              </>
            ) : (
              'Mande este pedido ao advogado.'
            )}
          </p>
          <Botao variante="secundario" type="button" onClick={passei}>
            Passei ao advogado
          </Botao>
        </div>
      )}
      {avisosDaCausa(k, causa, hoje).map(a => (
        <p key={a} className="todo pilha" role="note">
          {a}
        </p>
      ))}
      <details className="causa-regras">
        <summary>Por que cada parte (as regras)</summary>
        <ul>
          {regrasDaCausa(k, causa).map(r => (
            <li key={r} className="sub">
              {r}
            </li>
          ))}
        </ul>
      </details>
      <Botao variante="fantasma" type="button" onClick={() => setAjustar(true)}>
        Ajustar a causa
      </Botao>
      {ajustar && (
        <FolhaCausa causa={causa} apelido={imovel.apelido} salvar={salvarCausa} fechar={() => setAjustar(false)} />
      )}
    </section>
  )
}

/** "Se conseguir X%: chegam R$ A, o advogado fica com R$ B e sobram R$ C para a família." */
function FraseExpectativa({
  e,
  causa,
}: {
  e: { bruta: number; advogado: number; liquida: number }
  causa: CausaAluguel
}) {
  return (
    <p className="sub">
      Se o advogado conseguir {causa.expectativa_pct}%: sobram <Din v={e.liquida} /> para a família
      {e.advogado > 0 && (
        <>
          {' '}
          (chegam <Din v={e.bruta} />, ele fica com <Din v={e.advogado} />)
        </>
      )}
      .
    </p>
  )
}

const pctTexto = (v: number | null) => (v === null ? '' : String(v).replace('.', ','))
const lerPct = (t: string, max: number): number | null | undefined => {
  if (!t.trim()) return null
  const v = Number(t.replace(',', '.'))
  return Number.isFinite(v) && v >= 0 && v <= max ? v : undefined
}

function FolhaCausa({
  causa,
  apelido,
  salvar,
  fechar,
}: {
  causa: CausaAluguel
  apelido: string
  salvar: (c: CausaAluguel) => Promise<boolean>
  fechar: () => void
}) {
  const { toast } = useAcoes()
  const [t, setT] = useState({
    multa: pctTexto(causa.multa_pct),
    juros: pctTexto(causa.juros_pct),
    honorarios: pctTexto(causa.honorarios_pct),
    encargos: causa.encargos_mes ? valorParaTexto(causa.encargos_mes) : '',
    expectativa: pctTexto(causa.expectativa_pct),
    advogado: pctTexto(causa.advogado_pct),
    custas: causa.custas ? valorParaTexto(causa.custas) : '',
  })
  const [garantia, setGarantia] = useState<Garantia | ''>(causa.garantia || '')
  const campo = (chave: keyof typeof t, rotulo: string, ajuda: string) => (
    <label className="campo">
      <span>{rotulo}</span>
      <CampoDecimal
        className="inp"
        value={t[chave]}
        onChange={e => setT({ ...t, [chave]: e.target.value.replace(/[^\d,.]/g, '') })}
      />
      <small>{ajuda}</small>
    </label>
  )
  const ok = async () => {
    const multa = lerPct(t.multa, 100),
      juros = lerPct(t.juros, 10),
      honorarios = lerPct(t.honorarios, 30),
      expectativa = lerPct(t.expectativa, 100),
      advogado = lerPct(t.advogado, 100)
    if (
      [multa, juros, honorarios, expectativa, advogado].includes(undefined) ||
      (t.encargos && !valorDigitadoValido(t.encargos)) ||
      (t.custas && !valorDigitadoValido(t.custas))
    ) {
      toast('Confira os números: use só números e 1 vírgula.')
      return
    }
    if (
      await salvar({
        ...causa,
        multa_pct: multa ?? 0,
        juros_pct: juros ?? 0,
        honorarios_pct: honorarios ?? 0,
        encargos_mes: t.encargos ? textoParaValor(t.encargos) : 0,
        expectativa_pct: expectativa ?? null,
        advogado_pct: advogado ?? null,
        custas: t.custas ? textoParaValor(t.custas) : 0,
        garantia: garantia || null,
      })
    ) {
      toast('Causa ajustada.')
      fechar()
    }
  }
  return (
    <Sheet titulo="Ajustar a causa" subtitulo={apelido} fechar={fechar}>
      <div className="aluguel-folha">
        {campo('multa', 'Multa do contrato (%)', 'Está na cláusula de atraso do contrato. O comum é 10%.')}
        {campo(
          'juros',
          'Juros por mês (%)',
          'Do contrato (o comum é 1%). Se o contrato não fala em juros, use a taxa legal: perto de 0,8% a 1% em 2026.',
        )}
        <label className="campo">
          <span>Garantia do contrato de aluguel</span>
          <select className="inp" value={garantia} onChange={e => setGarantia(e.target.value as Garantia | '')}>
            <option value="">Não sei ainda</option>
            {Object.entries(GARANTIAS).map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
          <small>Com fiador ou seguro-fiança, outra pessoa também responde pela dívida.</small>
        </label>
        <label className="campo">
          <span>Custas que você já pagou (justiça, notificação, oficial)</span>
          <CampoValor valor={t.custas} mudar={v => setT({ ...t, custas: v.replace(/[^\d,]/g, '') })} />
          <small>Voltam para a família no fim do processo.</small>
        </label>
        {campo(
          'honorarios',
          'Honorários pedidos na causa (%)',
          'A lei do inquilinato fixa 10% se o contrato não disser outro valor.',
        )}
        <label className="campo">
          <span>Condomínio e IPTU que eram dele (pelo contrato), por mês</span>
          <CampoValor valor={t.encargos} mudar={v => setT({ ...t, encargos: v.replace(/[^\d,]/g, '') })} />
          <small>O que você pagou no lugar do inquilino. Entra no pedido a cada mês.</small>
        </label>
        {campo(
          'expectativa',
          'Quanto o advogado acha que consegue (%)',
          'Do que é da família. Em branco: ainda não perguntou.',
        )}
        {campo(
          'advogado',
          'Quanto o advogado cobra do que recuperar (%)',
          'O contrato com ele. Em branco: não combinado.',
        )}
        <button className="btn primary full" type="button" onClick={ok}>
          Salvar
        </button>
      </div>
    </Sheet>
  )
}
