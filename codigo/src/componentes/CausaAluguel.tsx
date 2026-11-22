import { useState } from 'react'
import { Scale } from 'lucide-react'
import type { ImovelTela } from '../api/tipos'
import { useAcoes } from '../app/contexto'
import type { CadernoImovel, ProblemaAluguel } from '../lib/aluguel'
import { CAUSA_PADRAO, contaDaCausa, lerCausa, regrasDaCausa, type CausaAluguel } from '../lib/causaAluguel'
import { hojeRecife, textoParaValor, valorDigitadoValido, valorParaTexto } from '../lib/formato'
import { Botao, CampoValor, Din, Sheet } from './base'
import { Icone } from './Icone'
import { CampoDecimal } from './privacidade'

const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

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
      <ul className="list causa-linhas">
        {linhas.map(([nome, v]) => (
          <li key={nome} className="li">
            <span className="m">{nome}</span>
            <span className="v">
              {v < 0 ? '− ' : ''}
              <Din v={Math.abs(v)} />
            </span>
          </li>
        ))}
      </ul>
      <p className="sub">
        É da família: <Din v={k.daFamilia} />. Os honorários pedidos na causa ficam com o advogado.
      </p>
      {k.expectativa ? (
        <p className="sub">
          Se conseguir {causa.expectativa_pct}% do que é da família: chegam <Din v={k.expectativa.bruta} />
          {k.expectativa.advogado > 0 && (
            <>
              , o advogado fica com <Din v={k.expectativa.advogado} /> ({causa.advogado_pct}%)
            </>
          )}{' '}
          e sobram <Din v={k.expectativa.liquida} /> para a família. Só entra no plano quando chegar.
        </p>
      ) : (
        <p className="sub">
          Pergunte ao advogado quanto ele acha que consegue e quanto ele cobra do que recuperar. Anote em “Ajustar a
          causa” para o app mostrar o que sobra para a família.
        </p>
      )}
      {k.atualizar && (
        <div className="todo warn" role="status">
          <p>
            {causa.passado_em ? (
              <>
                O pedido subiu <Din v={k.subiu} /> desde {dm(causa.passado_em)}, quando você passou ao advogado.
              </>
            ) : (
              'Você ainda não passou este pedido ao advogado.'
            )}{' '}
            Mande o valor atualizado para ele incluir na causa.
          </p>
          <Botao variante="secundario" type="button" onClick={passei}>
            Passei ao advogado
          </Botao>
        </div>
      )}
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
  })
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
      (t.encargos && !valorDigitadoValido(t.encargos))
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
        {campo('juros', 'Juros por mês (%)', 'Do contrato. O comum é 1% ao mês.')}
        {campo(
          'honorarios',
          'Honorários pedidos na causa (%)',
          'A lei do inquilinato fixa 10% se o contrato não disser outro valor.',
        )}
        <label className="campo">
          <span>Condomínio, IPTU e contas que eram dele, por mês</span>
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
