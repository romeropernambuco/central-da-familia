import { useMemo, useState } from 'react'
import { Plane } from 'lucide-react'
import { useAcoes, useOlhoApp, useSessaoAtual } from '../app/contexto'
import { useConfig } from '../app/useConfig'
import { useFuturo, useGuardado } from '../app/useDados2'
import { futuro } from '../lib/futuro'
import { hojeRecife, mesCurto, textoParaValor, valorDigitadoValido } from '../lib/formato'
import { rendeNoMesEstimado } from '../lib/guardado'
import { textoPrivado } from '../lib/olho'
import { novoUuid } from '../lib/seguro'
import {
  analisarViagem,
  custosDaViagem,
  frasesDaViagem,
  lerViagens,
  mesMaisV,
  type ViagemPlanejada,
} from '../lib/viagem'
import { Botao, CampoValor, Din, Sheet } from './base'
import { Icone } from './Icone'
import { CampoDecimal, CampoPrivado } from './privacidade'

const mmaa = (m: string) => mesCurto(m + '-01')

/**
 * Viagem planejada (regra do dono, 22/11/2026): planejar com antecedência, pagar no cartão em parcelas e sair da sobra
 * do mês, nunca da gordura. O app mostra o mês mais pesado, o cofrinho dos custos lá, se cabe sem tocar na gordura e,
 * se não cabe, quanto a família precisa ganhar a mais por mês. Só o casal vê.
 */
export function ViagensPlanejadas() {
  const { familia } = useSessaoAtual()
  const { recarregar, toast } = useAcoes()
  const { oculto } = useOlhoApp()
  const [cru, salvar] = useConfig<unknown[]>('viagens', [])
  const { ent } = useFuturo()
  const { g } = useGuardado()
  const [nova, setNova] = useState(false)
  const viagens = useMemo(() => lerViagens(cru), [cru])
  const linha = useMemo(() => {
    try {
      return ent?.entrada ? futuro(ent.entrada).linha : []
    } catch {
      return []
    }
  }, [ent])
  const taxaMes = g && g.total > 0 ? rendeNoMesEstimado(g) / g.total : 0.008
  if (familia?.papel !== 'casal') return null
  const gravar = async (lista: ViagemPlanejada[], msg: string) => {
    if (await salvar(lista)) {
      toast(msg)
      void recarregar()
      return true
    }
    return false
  }
  const mudar = (id: string, situacao: ViagemPlanejada['situacao'] | 'apagar') =>
    gravar(
      situacao === 'apagar'
        ? viagens.filter(v => v.id !== id)
        : viagens.map(v => (v.id === id ? { ...v, situacao } : v)),
      situacao === 'apagar'
        ? 'Viagem apagada.'
        : situacao === 'comprada'
          ? 'Comprada: anote a compra no cartão, parcelada. O plano conta as parcelas por lá.'
          : 'Boa viagem! Ela sai do plano.',
    )
  return (
    <section className="card viagens-planejadas" aria-labelledby="vgTit">
      <h2 id="vgTit" className="lbl">
        <Icone desenho={Plane} aria-hidden="true" /> Viagens planejadas
      </h2>
      <p className="sub">
        Planeje com antecedência: o app soma as parcelas e os custos lá, diz se cabe na sobra sem tocar na gordura e, se
        não cabe, quanto a família precisa ganhar a mais por mês.
      </p>
      {viagens
        .filter(v => v.situacao !== 'feita')
        .map(v => (
          <CartaoViagem key={v.id} v={v} linha={linha} taxaMes={taxaMes} oculto={oculto} mudar={mudar} />
        ))}
      <Botao variante="secundario" type="button" onClick={() => setNova(true)}>
        Planejar uma viagem
      </Botao>
      {nova && (
        <FolhaViagem
          linha={linha}
          taxaMes={taxaMes}
          fechar={() => setNova(false)}
          salvar={v => gravar([...viagens, v], 'Viagem no plano. As parcelas e os custos lá já contam.')}
        />
      )}
    </section>
  )
}

function CartaoViagem({
  v,
  linha,
  taxaMes,
  oculto,
  mudar,
}: {
  v: ViagemPlanejada
  linha: ReturnType<typeof futuro>['linha']
  taxaMes: number
  oculto: boolean
  mudar: (id: string, s: ViagemPlanejada['situacao'] | 'apagar') => void
}) {
  const a = v.situacao === 'planejando' ? analisarViagem(v, linha, taxaMes, true) : null
  const cofrinho = custosDaViagem(v, hojeRecife().slice(0, 7)).find(x => x.cofrinho > 0)
  return (
    <article className={`todo ${a && !a.cabe ? 'warn' : 'ok'} viagem`}>
      <p>
        <b>{textoPrivado(v.nome, oculto)}</b> · {mmaa(v.mes)} · <Din v={v.pacote + v.custos_la} />
        {v.situacao === 'comprada' && ' · comprada'}
      </p>
      {oculto ? null : a ? (
        frasesDaViagem(v, a).map(f => (
          <p key={f} className="sub">
            {f}
          </p>
        ))
      ) : (
        <p className="sub">
          As parcelas estão no cartão.{' '}
          {cofrinho ? (
            <>
              Cofrinho dos custos lá: <Din v={cofrinho.cofrinho} /> por mês até {mmaa(v.mes)}.
            </>
          ) : (
            'Os custos lá já estão no mês da viagem.'
          )}
        </p>
      )}
      <span className="row-btns">
        {v.situacao === 'planejando' && (
          <Botao variante="fantasma" type="button" onClick={() => mudar(v.id, 'comprada')}>
            Comprei
          </Botao>
        )}
        <Botao variante="fantasma" type="button" onClick={() => mudar(v.id, 'feita')}>
          Já fui
        </Botao>
        <Botao variante="fantasma" type="button" onClick={() => mudar(v.id, 'apagar')}>
          Apagar
        </Botao>
      </span>
    </article>
  )
}

/** O que o app fala da viagem enquanto a família preenche. */
function ResultadoViagem({ v, a }: { v: ViagemPlanejada; a: NonNullable<ReturnType<typeof analisarViagem>> }) {
  return (
    <div className={`todo ${a.cabe ? 'ok' : 'warn'}`} role="status">
      {frasesDaViagem(v, a).map(f => (
        <p key={f} className="sub">
          {f}
        </p>
      ))}
    </div>
  )
}

function FolhaViagem({
  linha,
  taxaMes,
  fechar,
  salvar,
}: {
  linha: ReturnType<typeof futuro>['linha']
  taxaMes: number
  fechar: () => void
  salvar: (v: ViagemPlanejada) => Promise<boolean>
}) {
  const { toast } = useAcoes()
  const mesHoje = hojeRecife().slice(0, 7)
  const [t, setT] = useState({
    nome: '',
    mes: mesMaisV(mesHoje, 12),
    compra: mesHoje,
    pacote: '',
    parcelas: 12,
    custos: '',
    desconto: '',
  })
  const valido = (s: string) => !s || valorDigitadoValido(s)
  const v: ViagemPlanejada | null =
    (t.pacote || t.custos) && valido(t.pacote) && valido(t.custos)
      ? {
          id: 'nova',
          nome: t.nome.trim() || 'Viagem',
          mes: t.mes,
          compra: t.compra <= t.mes ? t.compra : t.mes,
          pacote: t.pacote ? textoParaValor(t.pacote) : 0,
          parcelas: t.parcelas,
          custos_la: t.custos ? textoParaValor(t.custos) : 0,
          desconto_vista: Number(t.desconto.replace(',', '.')) > 0 ? Number(t.desconto.replace(',', '.')) : null,
          situacao: 'planejando',
        }
      : null
  const a = v ? analisarViagem(v, linha, taxaMes, false) : null
  const meses = (de: string, n: number) => Array.from({ length: n }, (_, i) => mesMaisV(de, i))
  const ok = async () => {
    if (!v) {
      toast('Diga quanto custa a passagem e a hospedagem ou os custos lá.')
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
          <span>Passagem e hospedagem</span>
          <CampoValor valor={t.pacote} mudar={x => setT({ ...t, pacote: x.replace(/[^\d,]/g, '') })} />
        </label>
        <label className="campo">
          <span>Mês da compra (1ª parcela)</span>
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
          <span>Para gastar lá (comida, passeios, transporte)</span>
          <CampoValor valor={t.custos} mudar={x => setT({ ...t, custos: x.replace(/[^\d,]/g, '') })} />
          <small>Vira um cofrinho: uma parte por mês até a viagem.</small>
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
        {v && a && <ResultadoViagem v={v} a={a} />}
        <button className="btn primary full" type="button" onClick={ok}>
          Pôr no plano
        </button>
      </div>
    </Sheet>
  )
}
