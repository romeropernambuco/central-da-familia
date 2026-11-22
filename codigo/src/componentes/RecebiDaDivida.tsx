import { useState } from 'react'
import type { ImovelTela } from '../api/tipos'
import { useAcoes, useSessaoAtual } from '../app/contexto'
import { receberDaDivida, type CadernoImovel, type ProblemaAluguel } from '../lib/aluguel'
import { hojeRecife, textoParaValor, valorDigitadoValido } from '../lib/formato'
import { novoUuid } from '../lib/seguro'
import { CampoValor, Din, Sheet } from './base'

/** O advogado recuperou parte da dívida: o dinheiro entra no mês; os honorários, se houver, são despesa do imóvel. */
export function FolhaRecebiDivida({
  imovel,
  c,
  p,
  gravar,
  fechar,
}: {
  imovel: ImovelTela
  c: CadernoImovel
  p: ProblemaAluguel
  gravar: (c: CadernoImovel) => Promise<boolean>
  fechar: () => void
}) {
  const { api, familia } = useSessaoAtual()
  const { toast, tentar, recarregar } = useAcoes()
  const [valor, setValor] = useState('')
  const [honorarios, setHonorarios] = useState('')
  const [salvando, setSalvando] = useState(false)
  const salvar = async () => {
    if (!valorDigitadoValido(valor) || (honorarios && !valorDigitadoValido(honorarios))) {
      toast('Confira os valores: use só números e 1 vírgula.')
      return
    }
    const r = receberDaDivida(
      c,
      textoParaValor(valor),
      honorarios ? textoParaValor(honorarios) : 0,
      hojeRecife(),
      novoUuid(),
      novoUuid(),
    )
    if (!r || !familia) return
    setSalvando(true)
    const ok = await gravar(r.caderno)
    // o dinheiro recuperado entra no "Entrou" do mês (a regra do plano: o que chega engorda a sobra, não é gasto)
    const entrou =
      ok &&
      (await tentar(async () => {
        const atuais = await api.config<unknown[]>(familia.id, 'entradas', [], { fresco: true })
        await api.salvarConfig(familia.id, 'entradas', [
          ...(Array.isArray(atuais) ? atuais : []),
          { ...r.entrada, de: `Dívida do inquilino (${imovel.apelido})`.slice(0, 80) },
        ])
      }))
    setSalvando(false)
    if (ok) {
      void recarregar()
      toast(
        entrou
          ? 'Anotado: o dinheiro entrou no mês e a dívida diminuiu.'
          : 'A dívida diminuiu, mas confira o "Entrou" do mês.',
      )
      fechar()
    }
  }
  return (
    <Sheet titulo="Recebi da dívida" subtitulo={imovel.apelido} fechar={fechar}>
      <div className="aluguel-folha">
        <p className="sub">
          O inquilino deve <Din v={p.divida} />. O que chegou entra como dinheiro do mês e a dívida diminui.
        </p>
        <label className="campo">
          <span>Quanto chegou</span>
          <CampoValor valor={valor} mudar={v => setValor(v.replace(/[^\d,]/g, ''))} />
        </label>
        <label className="campo">
          <span>Honorários do advogado (se houve)</span>
          <CampoValor valor={honorarios} mudar={v => setHonorarios(v.replace(/[^\d,]/g, ''))} />
          <small>Entra como despesa do imóvel, junto do IPTU e do condomínio.</small>
        </label>
        <button className="btn primary full" type="button" disabled={salvando || !valor} onClick={salvar}>
          Anotar o que chegou
        </button>
      </div>
    </Sheet>
  )
}
