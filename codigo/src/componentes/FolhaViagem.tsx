import { useState } from 'react'
import { useAcoes } from '../app/contexto'
import type { futuro } from '../lib/futuro'
import { hojeRecife, mesCurto, textoParaValor, valorDigitadoValido } from '../lib/formato'
import type { IpcaPorAno } from '../lib/gordura'
import { guiaPadrao, somarGuia, type GuiaViagem } from '../lib/guiaViagem'
import { novoUuid } from '../lib/seguro'
import { analisarViagem, frasesDaViagem, mesMaisV, type ViagemPlanejada } from '../lib/viagem'
import { CampoValor, Sheet } from './base'
import { EscolhasDoGuia, PlanilhaDoGuia } from './GuiaViagem'
import { CampoDecimal, CampoPrivado } from './privacidade'

const mmaa = (m: string) => mesCurto(m + '-01')
const meses = (de: string, n: number) => Array.from({ length: n }, (_, i) => mesMaisV(de, i))
/** O guia começa como um casal, 7 noites, viagem nacional, hotel, baixa temporada: a família muda o que quiser. */
const guiaInicial = () =>
  guiaPadrao({
    perfil: 'nacional',
    temporada: 'baixa',
    adultos: 2,
    criancas: 0,
    bebes: 0,
    noites: 7,
    hospedagem: 'hotel',
  })

/**
 * Planejar uma viagem: o guia item por item (o recomendado) ou só os totais. Do guia saem o pacote (pago antes,
 * parcelado) e o cofrinho (gasto lá). Enquanto a família preenche, o app já diz se cabe sem tocar na gordura.
 */
export function FolhaViagem({
  linha,
  taxaMes,
  ipca,
  fechar,
  salvar,
}: {
  linha: ReturnType<typeof futuro>['linha']
  taxaMes: number
  ipca?: IpcaPorAno
  fechar: () => void
  salvar: (v: ViagemPlanejada) => Promise<boolean>
}) {
  const { toast } = useAcoes()
  const mesHoje = hojeRecife().slice(0, 7)
  const [t, setT] = useState({ nome: '', mes: mesMaisV(mesHoje, 12), compra: mesHoje, parcelas: 12, desconto: '' })
  const [guia, setGuia] = useState<GuiaViagem | null>(guiaInicial)
  const [totais, setTotais] = useState({ pacote: '', custos: '' })
  const valido = (s: string) => !s || valorDigitadoValido(s)
  const soma = guia ? somarGuia(guia) : null
  const pacote = soma ? soma.pacote : totais.pacote && valido(totais.pacote) ? textoParaValor(totais.pacote) : 0
  const custos = soma ? soma.custosLa : totais.custos && valido(totais.custos) ? textoParaValor(totais.custos) : 0
  const desconto = Number(t.desconto.replace(',', '.'))
  const v: ViagemPlanejada | null =
    pacote + custos > 0
      ? {
          id: 'nova',
          nome: t.nome.trim() || 'Viagem',
          mes: t.mes,
          compra: t.compra <= t.mes ? t.compra : t.mes,
          pacote,
          parcelas: t.parcelas,
          custos_la: custos,
          desconto_vista: desconto > 0 && desconto < 100 ? desconto : null,
          situacao: 'planejando',
          criada: mesHoje,
          ...(guia ? { guia } : {}),
        }
      : null
  const a = v ? analisarViagem(v, linha, taxaMes, false, ipca) : null
  const ok = async () => {
    if (!v) {
      toast('Diga quanto custa a viagem: monte o guia ou ponha os totais.')
      return
    }
    if (await salvar({ ...v, id: novoUuid() })) fechar()
  }
  return (
    <Sheet titulo="Planejar uma viagem" fechar={fechar}>
      <div className="aluguel-folha">
        <label className="campo">
          <span>Para onde</span>
          <CampoPrivado
            className="inp"
            maxLength={60}
            value={t.nome}
            onChange={e => setT({ ...t, nome: e.target.value })}
          />
        </label>
        <QuandoEComoPaga t={t} setT={setT} mesHoje={mesHoje} />
        <div className="pills" role="group" aria-label="Como montar">
          <button type="button" className="pill" aria-pressed={!!guia} onClick={() => setGuia(guia || guiaInicial())}>
            Montar o guia, item por item
          </button>
          <button type="button" className="pill" aria-pressed={!guia} onClick={() => setGuia(null)}>
            Só os totais
          </button>
        </div>
        {guia ? (
          <>
            <EscolhasDoGuia g={guia} mudar={setGuia} />
            <PlanilhaDoGuia g={guia} mudar={setGuia} mesViagem={t.mes} mesHoje={mesHoje} />
          </>
        ) : (
          <>
            <label className="campo">
              <span>Passagem e hospedagem (pago antes)</span>
              <CampoValor
                valor={totais.pacote}
                mudar={x => setTotais({ ...totais, pacote: x.replace(/[^\d,]/g, '') })}
              />
            </label>
            <label className="campo">
              <span>Para gastar lá (comida, passeios, transporte)</span>
              <CampoValor
                valor={totais.custos}
                mudar={x => setTotais({ ...totais, custos: x.replace(/[^\d,]/g, '') })}
              />
              <small>Vira um cofrinho: uma parte por mês até a viagem.</small>
            </label>
          </>
        )}
        {v && a && (
          <div className={`todo pilha ${a.cabe ? 'ok' : 'warn'}`} role="status">
            {frasesDaViagem(v, a).map(f => (
              <p key={f} className="sub">
                {f}
              </p>
            ))}
          </div>
        )}
        <button className="btn primary full" type="button" onClick={ok}>
          Pôr no plano
        </button>
      </div>
    </Sheet>
  )
}

type Quando = { nome: string; mes: string; compra: string; parcelas: number; desconto: string }
/** O mês da viagem, o mês da compra, as parcelas e o desconto à vista. */
function QuandoEComoPaga({ t, setT, mesHoje }: { t: Quando; setT: (t: Quando) => void; mesHoje: string }) {
  return (
    <>
      <label className="campo">
        <span>Mês da viagem</span>
        <select className="inp" value={t.mes} onChange={e => setT({ ...t, mes: e.target.value })}>
          {meses(mesMaisV(mesHoje, 1), 36).map(m => (
            <option key={m} value={m}>
              {mmaa(m)}
            </option>
          ))}
        </select>
        <small>O bom é planejar 12 meses antes.</small>
      </label>
      <label className="campo">
        <span>Mês da compra da passagem e da hospedagem (1ª parcela)</span>
        <select className="inp" value={t.compra} onChange={e => setT({ ...t, compra: e.target.value })}>
          {meses(mesHoje, 13).map(m => (
            <option key={m} value={m}>
              {mmaa(m)}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span>Em quantas vezes no cartão</span>
        <select className="inp" value={t.parcelas} onChange={e => setT({ ...t, parcelas: Number(e.target.value) })}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>
              {n === 1 ? 'À vista' : `${n}x`}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span>Desconto se pagar à vista (%)</span>
        <CampoDecimal
          className="inp"
          value={t.desconto}
          onChange={e => setT({ ...t, desconto: e.target.value.replace(/[^\d,]/g, '') })}
        />
        <small>Em branco se não perguntou. O app compara com o que o dinheiro rende parcelando.</small>
      </label>
    </>
  )
}
