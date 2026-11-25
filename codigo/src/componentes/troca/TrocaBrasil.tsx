import { useEffect, useState } from 'react'
import { Scale } from 'lucide-react'
import { useSessaoAtual } from '../../app/contexto'
import { useOculto } from '../../app/useOculto'
import { hojeRecife } from '../../lib/formato'
import { textoPrivado } from '../../lib/olho'
import { compararComBrasil, compraSugerida, economiaConfirmada, type ComparacaoComBrasil } from '../../lib/troca/brasil'
import { diaCurto, reaisComCentavos, semZeros } from '../../lib/troca/formato'
import type { CompraFeita, CompraNoBrasil, Troca } from '../../lib/troca/tipos'
import { Botao, Din } from '../base'
import { Icone } from '../Icone'
import { CampoPrivado } from '../privacidade'
import { CampoNumero, fala, Linha, useVivo, type BlocoDaTroca } from './partes'

const ONDE = { fora: 'lá fora', brasil: 'no Brasil' } as const

/** A taxa que o Guardado usa hoje, para sugerir quanto o dinheiro rende. Se não vier, o campo fica para a pessoa. */
function useTaxaDoGuardado(): number | null {
  const { api, familia } = useSessaoAtual()
  const [taxa, setTaxa] = useState<number | null>(null)
  const vivo = useVivo()
  const id = familia?.id
  useEffect(() => {
    if (!id) return
    api
      .guardadoHoje(id)
      .then(g => {
        const pct = Number(g?.cdi_usado?.pct_ano)
        if (vivo.current && pct > 0) setTaxa(pct)
      })
      // é só uma sugestão de preenchimento: sem ela, a pessoa digita a taxa
      .catch(() => {})
  }, [api, id, vivo])
  return taxa
}

/** Quem ganha e por quanto, e a conta de cada caminho. */
function Veredito({ t, c }: { t: Troca; c: ComparacaoComBrasil }) {
  const vezes = Math.trunc(t.brasil?.parcelas ?? 1)
  const versao = t.versoes[t.versao]?.rotulo ?? ''
  return (
    <>
      <p className="lbl">Economia prevista comprando {ONDE[c.melhor]}</p>
      <div className="numrow">
        <Din v={c.economia} tam="mid" />
      </div>
      <ul className="exp troca-linhas">
        <Linha
          nome={`Lá fora, ${versao}, depois do reembolso${t.comImposto ? ' e com o imposto do Brasil' : ', sem o imposto do Brasil'}`}
          valor={reaisComCentavos(c.fora)}
        />
        <Linha
          nome={`No Brasil, à vista${t.brasil?.loja ? ` (${fala(t.brasil.loja)})` : ''}`}
          valor={reaisComCentavos(c.brasil)}
        />
        {vezes > 1 && (
          <>
            <Linha
              nome={`Ganho de pagar em ${vezes}x sem juros com o dinheiro rendendo`}
              valor={'− ' + reaisComCentavos(c.ganhoDeParcelar)}
              tom="volta"
            />
            <Linha nome={`No Brasil em ${vezes}x, em valor de hoje`} valor={reaisComCentavos(c.brasilParcelado)} />
          </>
        )}
      </ul>
      <p className="sub">
        O usado é vendido nos dois casos, então não entra nesta comparação. A chave "Incluir o imposto do Brasil", lá em
        cima, muda o lado de fora.
      </p>
    </>
  )
}

/** Preço no Brasil desta versão, loja, parcelas e quanto o dinheiro rende. */
function CamposDoBrasil({ t, mudar }: Pick<BlocoDaTroca, 't' | 'mudar'>) {
  const taxa = useTaxaDoGuardado()
  const versao = t.versoes[t.versao]
  const base: CompraNoBrasil = t.brasil ?? { loja: '', parcelas: 10, rendeAnoPct: taxa ?? 0, nota: '' }
  const noBrasil = (parte: Partial<CompraNoBrasil>) => mudar({ brasil: { ...base, ...parte } })
  const mudarPreco = (v: number | null) =>
    mudar({
      brasil: base,
      versoes: t.versoes.map((x, i) => {
        if (i !== t.versao) return x
        const { precoBrasil: _antes, ...resto } = x
        return v != null && v > 0 ? { ...resto, precoBrasil: v } : resto
      }),
    })
  return (
    <div className="troca-ajustes">
      <CampoNumero
        key={t.versao}
        rotulo={`Preço no Brasil do ${versao?.rotulo ?? 'aparelho'} (R$)`}
        valor={versao?.precoBrasil ?? null}
        mudar={mudarPreco}
        opcional
        milhar
      />
      <label className="campo">
        <span>Loja no Brasil</span>
        <CampoPrivado
          className="inp"
          value={base.loja}
          maxLength={80}
          onChange={e => noBrasil({ loja: e.target.value })}
        />
      </label>
      <div className="troca-dupla">
        <CampoNumero
          rotulo="Parcelas sem juros"
          valor={base.parcelas}
          mudar={v => noBrasil({ parcelas: v != null && v >= 1 ? Math.trunc(v) : 1 })}
        />
        <CampoNumero
          rotulo="Seu dinheiro rende por ano (%)"
          valor={base.rendeAnoPct}
          mudar={v => noBrasil({ rendeAnoPct: v ?? 0 })}
        />
      </div>
      <p className="sub">
        Use o rendimento que sobra depois do imposto de renda.
        {taxa != null && ` O Guardado usa ${semZeros(taxa, 2)}% ao ano hoje, antes do imposto.`}
      </p>
      {base.nota && <p className="sub">{fala(base.nota)}</p>}
    </div>
  )
}

/** A compra aconteceu: onde, como pagou e quanto custou no fim. A economia prevista vira confirmada. */
function Confirmar({ t, c, mudar }: { t: Troca; c: ComparacaoComBrasil; mudar: BlocoDaTroca['mudar'] }) {
  const [compra, setCompra] = useState<CompraFeita | null>(null)
  if (!compra)
    return (
      <Botao variante="secundario" onClick={() => setCompra(compraSugerida(t, c, c.melhor, hojeRecife()))}>
        Já comprei: confirmar a economia
      </Botao>
    )
  const pronto = Number.isFinite(compra.pago) && compra.pago > 0 && compra.forma.trim() !== ''
  return (
    <div className="troca-ajustes">
      <h3>Como foi a compra</h3>
      <div className="seg" role="group" aria-label="Onde comprou">
        {(['fora', 'brasil'] as const).map(onde => (
          <button
            key={onde}
            type="button"
            aria-pressed={compra.onde === onde}
            onClick={() => setCompra(compraSugerida(t, c, onde, compra.data))}
          >
            Comprei {ONDE[onde]}
          </button>
        ))}
      </div>
      <label className="campo">
        <span>Como pagou</span>
        <CampoPrivado
          className="inp"
          value={compra.forma}
          maxLength={80}
          onChange={e => setCompra({ ...compra, forma: e.target.value })}
        />
      </label>
      <CampoNumero
        key={compra.onde}
        rotulo="Quanto o aparelho custou no fim (R$)"
        valor={compra.pago}
        mudar={v => setCompra({ ...compra, pago: v ?? NaN })}
        milhar
        ajuda={
          compra.onde === 'fora'
            ? 'Fatura menos o reembolso que voltou, mais o imposto que você pagou na volta.'
            : 'O total das parcelas.'
        }
      />
      <div className="row-btns">
        <Botao variante="primario" disabled={!pronto} onClick={() => mudar({ compra })}>
          Confirmar a compra
        </Botao>
        <Botao variante="fantasma" onClick={() => setCompra(null)}>
          Ainda não comprei
        </Botao>
      </div>
    </div>
  )
}

/** A economia que aconteceu, com a forma. Negativa quando a escolha saiu mais cara que a outra opção. */
function Confirmada({ compra, desfazer }: { compra: CompraFeita; desfazer: () => void }) {
  const economia = economiaConfirmada(compra)
  return (
    <>
      <p className="lbl">
        <span className="chip ok">confirmada</span>
        {economia >= 0 ? 'Economia que aconteceu' : 'Saiu mais caro que a outra opção em'}
      </p>
      <div className="numrow">
        <Din v={Math.abs(economia)} tam="mid" />
      </div>
      <p className="corpo">
        Comprou {ONDE[compra.onde]} em {diaCurto(compra.data)}, com {textoPrivado(compra.forma)}. Custou{' '}
        {reaisComCentavos(compra.pago)}; a outra opção sairia por {reaisComCentavos(compra.outraOpcao)}.
      </p>
      <Botao variante="secundario" onClick={desfazer}>
        Desfazer a confirmação
      </Botao>
    </>
  )
}

/** Lá fora ou no Brasil: quanto se economiza no caminho mais barato, antes e depois de a compra acontecer. */
export function TrocaBrasil({ t, conta, mudar }: BlocoDaTroca) {
  useOculto()
  const c = conta ? compararComBrasil(t, conta) : null
  const comPreco = t.versoes.filter(v => (v.precoBrasil ?? 0) > 0).map(v => v.rotulo)
  return (
    <section className="card troca-brasil" aria-labelledby="trocaBrasil">
      <div className="card-h">
        <h2 id="trocaBrasil">
          <Icone desenho={Scale} aria-hidden="true" />
          Comprar lá fora ou no Brasil
        </h2>
      </div>
      {t.compra && <Confirmada compra={t.compra} desfazer={() => mudar({ compra: null })} />}
      {!t.compra && c && <Veredito t={t} c={c} />}
      {!t.compra && !c && (
        <p className="todo quieto">
          {comPreco.length
            ? `Esta versão ainda não tem preço no Brasil. Já tem: ${comPreco.join(', ')}. Escolha uma delas lá em cima ou informe o preço abaixo.`
            : 'Informe o preço do mesmo aparelho numa loja do Brasil para ver quanto você economiza.'}
        </p>
      )}
      <CamposDoBrasil t={t} mudar={mudar} />
      {!t.compra && c && <Confirmar key={t.id + ':' + t.versao} t={t} c={c} mudar={mudar} />}
    </section>
  )
}
