import { useEffect, useState } from 'react'
import type { Etiqueta, Lancamento } from '../../api/tipos'
import { useSessaoAtual } from '../../app/contexto'
import { useOculto } from '../../app/useOculto'
import { CampoPrivado } from '../../componentes/privacidade'
import { textoPrivado } from '../../lib/olho'
import { reais, textoParaValor, valorComCentavos } from '../../lib/formato'
import {
  MAX_ETIQUETAS,
  cambioDoGasto,
  diferencaEtiquetas,
  etiquetasDaData,
  moedaDeFora,
  simboloMoeda,
} from '../../lib/etiquetas'
import '../lancamentos/viagens.css'

/** Quantas etiquetas aparecem como botão no Anotar (as escolhidas vêm sempre). */
const A_VISTA = 6

/**
 * A linha "Etiqueta" do Anotar. Ela já vem preenchida pela data do gasto; o casal pode tirar ou trocar.
 * O banco coloca sozinho a etiqueta do período; aqui só vai a diferença (o que a pessoa tirou ou pôs a mais),
 * e o valor na moeda de fora quando a etiqueta é de viagem para fora.
 */
export function useEtiquetasNoLancar(quando: string, corr?: Lancamento) {
  const { api, familia } = useSessaoAtual()
  const casal = familia?.papel === 'casal'
  const [todas, setTodas] = useState<Etiqueta[]>([])
  /** Corrigindo: as etiquetas que o gasto tem agora. */
  const [doGasto, setDoGasto] = useState<string[]>([])
  /** null = segue a data (ou o que o gasto já tem); lista = a pessoa escolheu à mão */
  const [manual, setManual] = useState<string[] | null>(null)
  const foraInicial = corr?.valor_original ? valorComCentavos(corr.valor_original) : ''
  const [txtFora, setTxtFora] = useState(foraInicial)
  const fid = familia && familia.papel !== 'equipe' ? familia.id : ''
  const corrId = corr?.id
  useEffect(() => {
    if (!fid || !api.etiquetas) return
    let vivo = true
    // sem a lista, o Anotar funciona igual: o banco continua colocando a etiqueta do período
    api
      .etiquetas(fid)
      .then(l => {
        if (vivo) setTodas(l)
      })
      .catch(() => {})
    if (corrId && api.etiquetasDoLancamento)
      api
        .etiquetasDoLancamento(corrId)
        .then(ids => {
          if (vivo) setDoGasto(ids)
        })
        .catch(() => {})
    return () => {
      vivo = false
    }
  }, [api, fid, corrId])

  const base = corr ? doGasto : etiquetasDaData(todas, quando).map(e => e.id)
  const ids = manual ?? base
  const escolhidas = todas.filter(e => ids.includes(e.id))
  const moeda = moedaDeFora(escolhidas) || (corr?.valor_original ? corr.moeda_original || null : null)
  const valorFora = textoParaValor(txtFora)
  const alternar = (id: string) => {
    if (ids.includes(id)) setManual(ids.filter(x => x !== id))
    else if (ids.length < MAX_ETIQUETAS) setManual([...ids, id])
  }

  /** Depois de salvar o gasto: acerta as etiquetas e a moeda. Devolve '' ou a frase do que não deu certo. */
  async function aplicar(lancamento: string): Promise<string> {
    try {
      if (casal && api.etiquetar && manual) {
        const { tirar, colocar } = diferencaEtiquetas(base, manual)
        for (const id of tirar) await api.etiquetar(lancamento, id, false)
        for (const id of colocar) await api.etiquetar(lancamento, id, true)
      }
      if (!api.lancamentoMoeda) return ''
      if (moeda && valorFora > 0) {
        if (txtFora !== foraInicial || moeda !== corr?.moeda_original)
          await api.lancamentoMoeda(lancamento, valorFora, moeda)
      } else if (corr?.valor_original) await api.lancamentoMoeda(lancamento, null)
      return ''
    } catch (e) {
      return (e as Error).message
    }
  }

  return {
    casal,
    todas,
    ids,
    escolhidas,
    moeda,
    txtFora,
    setTxtFora,
    valorFora,
    alternar,
    semEtiqueta: () => setManual([]),
    /** a pessoa mudou a etiqueta que vinha ou digitou valor na moeda de fora */
    mexeu: manual !== null || txtFora !== foraInicial,
    aplicar,
  }
}

export function LinhaEtiqueta({
  e,
  valor,
}: {
  e: ReturnType<typeof useEtiquetasNoLancar>
  /** o valor em reais digitado, pra mostrar quanto saiu cada unidade da moeda de fora */
  valor: number
}) {
  const oculto = useOculto()
  if (!e.todas.length) return null
  const botoes = [...e.escolhidas, ...e.todas.filter(x => !e.ids.includes(x.id))].slice(
    0,
    Math.max(A_VISTA, e.escolhidas.length),
  )
  const cambio = e.moeda ? cambioDoGasto(valor, e.valorFora) : 0
  return (
    <div className="etiqueta-lancar">
      <div className="atrow">
        <span className="atl">Etiqueta</span>
        {e.casal ? (
          <>
            {botoes.map(x => (
              <button
                key={x.id}
                type="button"
                className="pill"
                aria-pressed={e.ids.includes(x.id)}
                disabled={!e.ids.includes(x.id) && e.ids.length >= MAX_ETIQUETAS}
                onClick={() => e.alternar(x.id)}
              >
                {textoPrivado(x.nome, oculto)}
              </button>
            ))}
            <button type="button" className="pill" aria-pressed={!e.ids.length} onClick={e.semEtiqueta}>
              Sem etiqueta
            </button>
          </>
        ) : (
          <span>{textoPrivado(e.escolhidas.map(x => x.nome).join(', ') || 'Nenhuma', oculto)}</span>
        )}
      </div>
      {e.moeda && (
        <label className="campo">
          <span>Valor em {simboloMoeda(e.moeda)} (opcional)</span>
          <CampoPrivado
            className="inp"
            inputMode="decimal"
            placeholder={`Quanto foi em ${simboloMoeda(e.moeda)}. Ex.: 48,00`}
            value={e.txtFora}
            onChange={ev => e.setTxtFora(ev.target.value.replace(/[^\d,.]/g, ''))}
            aria-label={`Valor em ${simboloMoeda(e.moeda)}`}
          />
          <small>
            {cambio && !oculto
              ? `Cada ${simboloMoeda(e.moeda)} saiu por ${reais(cambio)}. O valor em reais é o que conta no limite.`
              : 'O valor em reais lá em cima é o que conta no limite. Este fica guardado para a conta da viagem.'}
          </small>
        </label>
      )}
    </div>
  )
}
