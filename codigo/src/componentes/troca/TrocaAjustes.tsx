import { useEffect, useRef, useState } from 'react'
import { RefreshCw, SlidersHorizontal } from 'lucide-react'
import { useSessaoAtual } from '../../app/contexto'
import { useOculto } from '../../app/useOculto'
import { hojeRecife } from '../../lib/formato'
import { tetoDoReembolso } from '../../lib/troca/conta'
import { diaCurto, emMoeda, nomeDaMoeda, semZeros, simboloDaMoeda } from '../../lib/troca/formato'
import type { Troca } from '../../lib/troca/tipos'
import { Botao } from '../base'
import { Icone } from '../Icone'
import { CampoNumero, fala, type BlocoDaTroca } from './partes'

/** Busca o câmbio de hoje no Banco Central e devolve o que muda na comparação. A conta em moeda de lá não muda. */
function useCambioDeHoje(t: Troca, mudar: BlocoDaTroca['mudar']) {
  const { api } = useSessaoAtual()
  const [buscando, setBuscando] = useState(false)
  const [falha, setFalha] = useState('')
  const vivo = useRef(true)
  useEffect(() => {
    // liga de novo a cada montagem: no modo de conferência do React o efeito roda, desmonta e roda outra vez
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])
  const buscar = async () => {
    if (!api.cotacaoMoeda) return
    setBuscando(true)
    setFalha('')
    try {
      const c = await api.cotacaoMoeda(t.moeda, hojeRecife())
      if (!vivo.current) return
      mudar({
        cambio: c.reais,
        cambioData: c.data,
        cambioFiscal: c.reais,
        dolarFiscal: c.dolares,
        dolarPontos: c.dolares,
      })
    } catch (e) {
      if (vivo.current) setFalha((e as Error).message)
    } finally {
      if (vivo.current) setBuscando(false)
    }
  }
  return { buscar, buscando, falha, existe: !!api.cotacaoMoeda }
}

/** Câmbio, reembolso e alfândega: os números de base, todos à vista e editáveis. */
export function TrocaAjustes({ t, conta, mudar, restaurar }: BlocoDaTroca & { restaurar?: () => void }) {
  useOculto()
  const cambio = useCambioDeHoje(t, mudar)
  const moeda = nomeDaMoeda(t.moeda)
  const simbolo = simboloDaMoeda(t.moeda)
  const preco = t.versoes[t.versao]?.preco ?? 0
  const tabela = conta?.reembolsoTabela ?? 0
  return (
    <section className="card" aria-labelledby="trocaAjustes">
      <div className="card-h">
        <h2 id="trocaAjustes">
          <Icone desenho={SlidersHorizontal} aria-hidden="true" />
          Ajustes de câmbio e imposto
        </h2>
      </div>
      <div className="troca-campos">
        {cambio.existe && (
          <div className="troca-cambio">
            <Botao variante="secundario" carregando={cambio.buscando} onClick={cambio.buscar}>
              <Icone desenho={RefreshCw} aria-hidden="true" />
              Buscar o câmbio de hoje
            </Botao>
            <span className="sub">
              {t.cambioData ? `Câmbio de ${diaCurto(t.cambioData)}` : 'Câmbio digitado à mão'} · fonte: Banco Central
            </span>
            {cambio.falha && (
              <p className="erro" role="alert">
                {cambio.falha}
              </p>
            )}
          </div>
        )}
        <CampoNumero
          rotulo={`Câmbio de referência, sem taxas (R$ por ${moeda})`}
          valor={t.cambio}
          mudar={v => mudar({ cambio: v ?? NaN, cambioData: '' })}
          ajuda={t.textos.cambio ?? 'A conta soma o spread e o IOF do cartão escolhido.'}
        />
        <CampoNumero
          rotulo={`Reembolso (${simbolo})`}
          valor={t.reembolso}
          mudar={v => mudar({ reembolso: v })}
          opcional
          seVazio={semZeros(tabela, 2)}
          ajuda={`Vazio usa a tabela (${emMoeda(tabela, t.moeda)}). 0 simula sem reembolso. Teto: ${emMoeda(tetoDoReembolso(preco, t.ivaPct), t.moeda)}, o imposto embutido.`}
        />
        <CampoNumero
          rotulo={`Reais por ${moeda} devolvido`}
          valor={t.cambioReembolso}
          mudar={v => mudar({ cambioReembolso: v })}
          opcional
          seVazio="Igual ao de referência"
        />
        <CampoNumero
          rotulo={`Dólares por ${moeda} (para os pontos)`}
          valor={t.dolarPontos}
          mudar={v => mudar({ dolarPontos: v ?? NaN })}
        />
        {t.textos.aduana && <p className="sub">{fala(t.textos.aduana)}</p>}
        <CampoNumero rotulo="Cota disponível (US$)" valor={t.cota} mudar={v => mudar({ cota: v ?? NaN })} />
        <CampoNumero
          rotulo={`Valor do aparelho para a alfândega (${simbolo})`}
          valor={t.valorAduana}
          mudar={v => mudar({ valorAduana: v })}
          opcional
          seVazio={semZeros(preco, 2)}
          ajuda={t.textos.valorAduana ?? 'Vazio usa o preço cheio da nota.'}
        />
        <div className="troca-dupla">
          <CampoNumero
            rotulo={`US$ por ${moeda}`}
            valor={t.dolarFiscal}
            mudar={v => mudar({ dolarFiscal: v ?? NaN })}
          />
          <CampoNumero
            rotulo={`R$ por ${moeda} fiscal`}
            valor={t.cambioFiscal}
            mudar={v => mudar({ cambioFiscal: v ?? NaN })}
          />
        </div>
        {restaurar && (
          <Botao variante="secundario" onClick={restaurar}>
            Restaurar o que estava guardado
          </Botao>
        )}
      </div>
    </section>
  )
}
