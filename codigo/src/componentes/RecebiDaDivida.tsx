import { useState } from 'react'
import type { ImovelTela } from '../api/tipos'
import { useAcoes, useSessaoAtual } from '../app/contexto'
import { receberDaDivida, type CadernoImovel, type ProblemaAluguel } from '../lib/aluguel'
import { hojeRecife, textoParaValor, valorDigitadoValido } from '../lib/formato'
import { novoUuid } from '../lib/seguro'
import { textoPrivado } from '../lib/olho'
import { useOculto } from '../app/useOculto'
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
    if (!r) {
      toast('O advogado não pode ficar com mais do que recuperou. Confira os valores.')
      return
    }
    if (!familia) return
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
          {p.divida > 0 && (
            <>
              Dívida anotada: <Din v={p.divida} />.{' '}
            </>
          )}
          Na conta entra o que o advogado repassou; a dívida e o pedido da causa descontam tudo o que ele recuperou.
        </p>
        <label className="campo">
          <span>Quanto o advogado recuperou do inquilino</span>
          <CampoValor valor={valor} mudar={v => setValor(v.replace(/[^\d,]/g, ''))} />
        </label>
        <label className="campo">
          <span>Quanto ficou com o advogado (se ficou)</span>
          <CampoValor valor={honorarios} mudar={v => setHonorarios(v.replace(/[^\d,]/g, ''))} />
          <small>Entra como despesa do imóvel. Na conta da família entra só a diferença.</small>
        </label>
        <button className="btn primary full" type="button" disabled={salvando || !valor} onClick={salvar}>
          Anotar o que chegou
        </button>
      </div>
    </Sheet>
  )
}

/** "Voltou a pagar": o aluguel volta a contar daqui em diante; o caso (meses sem receber, dívida, causa) fica guardado. */
export function FolhaVoltou({
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
  const oculto = useOculto()
  const { toast } = useAcoes()
  const hoje = hojeRecife()
  const mesHoje = hoje.slice(0, 7)
  const voltou = async () => {
    // no mesmo mês em que começou não há histórico a guardar: o caso some; depois, a volta vira o mês de hoje
    const problema =
      mesHoje > p.desde
        ? {
            ...p,
            volta: mesHoje,
            andamento: [...p.andamento, { data: hoje, texto: 'Voltou a pagar' }].slice(-30),
          }
        : null
    if (await gravar({ ...c, problema })) {
      fechar()
      toast('Anotado. O aluguel volta a contar; o caso fica guardado com a dívida.')
    }
  }
  return (
    <Sheet titulo="Voltou a pagar?" fechar={fechar}>
      <p className="corpo">
        O {textoPrivado(imovel.apelido, oculto)} volta a contar no plano a partir deste mês e o caderno volta a avisar
        atraso. Os meses sem receber, a dívida e a causa ficam guardados. Os lembretes de cobrança você conclui na
        Secretária.
      </p>
      <button className="btn primary full" type="button" onClick={voltou}>
        Sim, voltou a pagar
      </button>
      <button className="btn ghost full" type="button" onClick={fechar}>
        Ainda não
      </button>
    </Sheet>
  )
}
