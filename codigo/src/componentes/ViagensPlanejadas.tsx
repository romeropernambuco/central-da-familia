import { useMemo, useState } from 'react'
import { Plane } from 'lucide-react'
import { useAcoes, useOlhoApp, useSessaoAtual } from '../app/contexto'
import { useConfig } from '../app/useConfig'
import { useFuturo, useGuardado } from '../app/useDados2'
import { futuro } from '../lib/futuro'
import { hojeRecife, mesCurto } from '../lib/formato'
import type { IpcaPorAno } from '../lib/gordura'
import { rendeNoMesEstimado } from '../lib/guardado'
import { textoPrivado } from '../lib/olho'
import { analisarViagem, custosDaViagem, frasesDaViagem, lerViagens, type ViagemPlanejada } from '../lib/viagem'
import { Botao, Din } from './base'
import { FolhaViagem } from './FolhaViagem'
import { PlanilhaDoGuia } from './GuiaViagem'
import { Icone } from './Icone'
import './planilha.css'

const mmaa = (m: string) => mesCurto(m + '-01')

/**
 * Viagem planejada (regra do dono, 22/11/2026): planejar com antecedência, item por item (o guia), pagar no cartão em
 * parcelas e sair da sobra do mês, nunca da gordura. O app mostra o cronograma mês a mês, o cofrinho dos custos lá, se
 * cabe sem tocar na gordura e, se não cabe, quanto a família precisa ganhar a mais por mês. Só o casal vê.
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
  // a mesma régua da gordura do plano e do Guardado: a parte que só repõe a inflação não é sobra
  const ipca = ent?.entrada?.parametros.ipca_ano
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
          ? 'Comprada. Anote a compra no cartão, parcelada; o plano continua contando a viagem até você dizer "Já fui".'
          : 'Boa viagem! Ela sai do plano.',
    )
  return (
    <section className="card viagens-planejadas" aria-labelledby="vgTit">
      <h2 id="vgTit" className="lbl">
        <Icone desenho={Plane} aria-hidden="true" /> Viagens planejadas
      </h2>
      <p className="sub">Monte a viagem item por item. O app diz se ela cabe na sobra sem tocar na gordura.</p>
      {viagens
        .filter(v => v.situacao !== 'feita')
        .map(v => (
          <CartaoViagem key={v.id} v={v} linha={linha} taxaMes={taxaMes} ipca={ipca} oculto={oculto} mudar={mudar} />
        ))}
      <Botao variante="secundario" type="button" onClick={() => setNova(true)}>
        Planejar uma viagem
      </Botao>
      {nova && (
        <FolhaViagem
          linha={linha}
          taxaMes={taxaMes}
          ipca={ipca}
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
  ipca,
  oculto,
  mudar,
}: {
  v: ViagemPlanejada
  linha: ReturnType<typeof futuro>['linha']
  taxaMes: number
  ipca?: IpcaPorAno
  oculto: boolean
  mudar: (id: string, s: ViagemPlanejada['situacao'] | 'apagar') => void
}) {
  const a = v.situacao === 'planejando' ? analisarViagem(v, linha, taxaMes, true, ipca) : null
  const mesHoje = hojeRecife().slice(0, 7)
  return (
    <article className="viagem" aria-label={`Viagem ${v.nome}`}>
      <p className="viagem-topo">
        <b>{textoPrivado(v.nome, oculto)}</b> · {mmaa(v.mes)} · <Din v={v.pacote + v.custos_la} />{' '}
        <span className={v.situacao === 'comprada' ? 'chip ok' : a && !a.cabe ? 'chip warn' : 'chip'}>
          {v.situacao === 'comprada' ? 'Comprada' : a && !a.cabe ? 'Falta sobra' : 'Cabe na sobra'}
        </span>
      </p>
      {!oculto && a && (
        <div className={`todo pilha ${a.cabe ? 'ok' : 'warn'}`}>
          {frasesDaViagem(v, a).map(f => (
            <p key={f} className="sub">
              {f}
            </p>
          ))}
        </div>
      )}
      {!oculto && <Cronograma v={v} mesHoje={mesHoje} />}
      {!oculto && v.guia && (
        <details className="viagem-guia">
          <summary>Ver o guia item por item</summary>
          <PlanilhaDoGuia g={v.guia} mesViagem={v.mes} mesHoje={mesHoje} />
        </details>
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

/** Mês a mês, como numa planilha: a parcela, o cofrinho e se o mês já passou, é este ou ainda falta. */
function Cronograma({ v, mesHoje }: { v: ViagemPlanejada; mesHoje: string }) {
  const desde = [v.criada, v.compra].filter((m): m is string => !!m).sort()[0] || mesHoje
  const linhas = custosDaViagem(v, desde)
  if (!linhas.length) return null
  return (
    <div className="planilha-rolagem">
      <table className="planilha cronograma">
        <caption>Mês a mês até a viagem (âmbar: este mês; verde: falta; cinza: passou)</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col" className="num">
              Parcela
            </th>
            <th scope="col" className="num">
              Cofrinho
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(l => (
            <tr key={l.mes} className={l.mes < mesHoje ? 'fraco' : undefined}>
              <td>
                <span
                  className={l.mes < mesHoje ? 'chip' : l.mes === mesHoje ? 'chip warn' : 'chip ok'}
                  title={l.mes < mesHoje ? 'Passou' : l.mes === mesHoje ? 'Este mês' : 'Falta'}
                >
                  {mmaa(l.mes)}
                </span>
              </td>
              <td className="num">{l.parcela ? <Din v={l.parcela} /> : '—'}</td>
              <td className="num">{l.cofrinho ? <Din v={l.cofrinho} /> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
