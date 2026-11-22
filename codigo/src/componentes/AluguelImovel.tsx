import { useMemo, useState } from 'react'
import { CalendarCheck, Receipt, Trash2 } from 'lucide-react'
import type { ImovelTela } from '../api/tipos'
import { useAcoes } from '../app/contexto'
import { useOculto } from '../app/useOculto'
import {
  cadernoVazio,
  contaDoAno,
  fraseDaSituacao,
  inicioDoCaderno,
  mesMais,
  resumoDoMes,
  situacaoDoMes,
  type Caderno,
  type CadernoImovel,
} from '../lib/aluguel'
import { dataCurta, hojeRecife, mesCurto, reais, textoParaValor, valorDigitadoValido } from '../lib/formato'
import { textoPrivado } from '../lib/olho'
import { novoUuid, umaPorVez } from '../lib/seguro'
import { Botao, CampoValor, Din, Sheet } from './base'
import { Icone } from './Icone'
import { CampoPrivado } from './privacidade'
import './aluguel.css'
import { ProblemaDoAluguel } from './ProblemaAluguel'

/** "Aluguéis de novembro: 5 de 7 chegaram". Só aparece com imóvel alugado. */
export function ResumoAluguel({ imoveis, caderno }: { imoveis: ImovelTela[]; caderno: Caderno }) {
  const alugados = imoveis.filter(i => i.uso === 'aluga')
  if (!alugados.length) return null
  const hoje = hojeRecife()
  const r = resumoDoMes(alugados, caderno, hoje)
  return (
    <div className={'aluguel-resumo' + (r.atrasados ? ' tem-atraso' : '')} aria-label="Aluguéis deste mês">
      <p className="lbl">
        <Icone desenho={CalendarCheck} aria-hidden="true" />
        Aluguéis de {mesCurto(hoje.slice(0, 7) + '-01')}
      </p>
      <p>
        <b>
          {r.recebidos} de {r.alugados} {r.alugados === 1 ? 'chegou' : 'chegaram'}
        </b>
        {r.atrasados ? ` · ${r.atrasados === 1 ? '1 atrasado' : `${r.atrasados} atrasados`}` : ''}
      </p>
      <p className="sub">
        Chegou <Din v={r.recebido} /> · falta <Din v={r.falta} />
      </p>
    </div>
  )
}

/** A linha do aluguel deste mês dentro do imóvel da lista. */
export function SituacaoAluguel({ imovel, caderno }: { imovel: ImovelTela; caderno: Caderno }) {
  if (imovel.uso !== 'aluga') return null
  const s = situacaoDoMes(caderno[imovel.id] || cadernoVazio(), hojeRecife().slice(0, 7), hojeRecife())
  return <small className={'aluguel-situacao ' + s.tipo}>Aluguel deste mês: {fraseDaSituacao(s)}</small>
}

/** O caderno de 1 imóvel: os 12 meses, marcar que o aluguel chegou, as despesas e o que ele rendeu de verdade. */
export function FolhaAluguel({
  imovel,
  caderno,
  salvar,
  fechar,
}: {
  imovel: ImovelTela
  caderno: Caderno
  salvar: (id: string, c: CadernoImovel) => Promise<boolean>
  fechar: () => void
}) {
  const oculto = useOculto()
  const hoje = hojeRecife()
  const c = caderno[imovel.id] || cadernoVazio()
  const ano = contaDoAno(c, imovel.valor, hoje)
  const meses = Array.from({ length: 12 }, (_, i) => mesMais(hoje.slice(0, 7), -i))
  // grava sempre o mês em que o caderno começou, para os meses antes dele não virarem "atrasado"
  const gravar = (novo: CadernoImovel) =>
    salvar(imovel.id, { ...novo, desde: inicioDoCaderno({ ...novo, desde: c.desde }, hoje.slice(0, 7)) })
  return (
    <Sheet titulo={textoPrivado(imovel.apelido, oculto)} subtitulo="Caderno do aluguel" fechar={fechar}>
      <div className="aluguel-folha">
        <section aria-labelledby="alAno">
          <h3 id="alAno" className="lbl">
            Últimos 12 meses
          </h3>
          <dl className="guard-3">
            <div>
              <dt>Chegou</dt>
              <dd>
                <Din v={ano.recebido} />
              </dd>
            </div>
            <div>
              <dt>Despesas</dt>
              <dd>
                <Din v={ano.despesas} />
              </dd>
            </div>
            <div className="tot">
              <dt>Sobrou</dt>
              <dd>
                <Din v={ano.sobrou} />
              </dd>
            </div>
          </dl>
          <p className="sub">
            {ano.recebidos} de {ano.esperados} aluguéis chegaram.
            {ano.pct_ano != null && !oculto
              ? ` O que sobrou é ${String(ano.pct_ano).replace('.', ',')}% do valor do imóvel em 1 ano.`
              : ''}
          </p>
        </section>
        <ProblemaDoAluguel imovel={imovel} c={c} gravar={gravar} />
        <MesesDoAluguel imovel={imovel} c={c} meses={meses} gravar={gravar} />
        <DespesasDoImovel c={c} gravar={gravar} />
        <DiaDoVencimento c={c} gravar={gravar} />
      </div>
    </Sheet>
  )
}

function MesesDoAluguel(p: {
  imovel: ImovelTela
  c: CadernoImovel
  meses: string[]
  gravar: (c: CadernoImovel) => Promise<boolean>
}) {
  const { toast } = useAcoes()
  const hoje = hojeRecife()
  const trava = useMemo(() => umaPorVez((f: () => Promise<void>) => f()), [])
  const marcar = (mes: string) =>
    trava(async () => {
      const ok = await p.gravar({
        ...p.c,
        recebimentos: [...p.c.recebimentos.filter(r => r.mes !== mes), { mes, data: hoje, valor: p.imovel.aluguel }],
      })
      if (ok)
        toast(`Aluguel de ${mesCurto(mes + '-01')} anotado: ${reais(p.imovel.aluguel)}.`, async () => {
          await p.gravar(p.c)
        })
    })
  const desmarcar = (mes: string) =>
    trava(async () => {
      if (await p.gravar({ ...p.c, recebimentos: p.c.recebimentos.filter(r => r.mes !== mes) }))
        toast(`Aluguel de ${mesCurto(mes + '-01')} voltou para "não chegou".`, async () => {
          await p.gravar(p.c)
        })
    })
  return (
    <section aria-labelledby="alMeses">
      <h3 id="alMeses" className="lbl">
        Mês a mês
      </h3>
      <ul className="list aluguel-meses">
        {p.meses.map(m => {
          const s = situacaoDoMes(p.c, m, hoje)
          return (
            <li key={m} className={'aluguel-mes ' + s.tipo}>
              <span className="m">
                <b>{mesCurto(m + '-01')}</b>
                <small>{fraseDaSituacao(s)}</small>
              </span>
              {s.tipo === 'recebido' ? (
                <span className="v aluguel-acao">
                  <Din v={s.valor} />
                  <button className="lnk" type="button" onClick={() => desmarcar(m)}>
                    Desfazer
                  </button>
                </span>
              ) : (
                <Botao
                  variante={s.tipo === 'atrasado' ? 'primario' : s.tipo === 'antes' ? 'fantasma' : 'secundario'}
                  type="button"
                  onClick={() => marcar(m)}
                >
                  <Icone nome="salvo" />
                  Chegou
                </Botao>
              )}
            </li>
          )
        })}
      </ul>
      <p className="sub">"Chegou" anota o aluguel combinado ({reais(p.imovel.aluguel)}) com a data de hoje.</p>
    </section>
  )
}

function DespesasDoImovel({ c, gravar }: { c: CadernoImovel; gravar: (c: CadernoImovel) => Promise<boolean> }) {
  const { toast } = useAcoes()
  const oculto = useOculto()
  const [valor, setValor] = useState('')
  const [desc, setDesc] = useState('')
  const [erro, setErro] = useState('')
  const hoje = hojeRecife()
  const trava = useMemo(() => umaPorVez((f: () => Promise<void>) => f()), [])
  const despesas = [...c.despesas].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 20)
  const anotar = () =>
    trava(async () => {
      if (!valorDigitadoValido(valor) || textoParaValor(valor) <= 0) return setErro('Digite o valor. Ex.: 350.')
      if (!desc.trim()) return setErro('Diga do que foi. Ex.: IPTU, condomínio, conserto.')
      setErro('')
      const d = { id: novoUuid(), data: hoje, valor: textoParaValor(valor), descricao: desc.trim().slice(0, 60) }
      if (await gravar({ ...c, despesas: [...c.despesas, d] })) {
        setValor('')
        setDesc('')
        toast(`Despesa anotada: ${reais(d.valor)}.`)
      }
    })
  return (
    <section aria-labelledby="alDesp" className="aluguel-despesas">
      <h3 id="alDesp" className="lbl">
        <Icone desenho={Receipt} aria-hidden="true" />
        Despesas do imóvel
      </h3>
      {!despesas.length && <p className="sub">Nenhuma despesa anotada.</p>}
      <ul className="exp">
        {despesas.map(d => (
          <li key={d.id}>
            <span>
              {textoPrivado(d.descricao, oculto)} <small className="muted">· {dataCurta(d.data)}</small>
            </span>
            <span className="aluguel-acao">
              <Din v={d.valor} />
              <button
                className="iconbtn"
                type="button"
                aria-label={`Apagar a despesa de ${dataCurta(d.data)}`}
                onClick={async () => {
                  if (await gravar({ ...c, despesas: c.despesas.filter(x => x.id !== d.id) }))
                    toast('Despesa apagada.', async () => {
                      await gravar(c)
                    })
                }}
              >
                <Icone desenho={Trash2} />
              </button>
            </span>
          </li>
        ))}
      </ul>
      <div className="aluguel-nova">
        <CampoPrivado
          className="inp"
          value={desc}
          maxLength={60}
          placeholder="Do que foi (IPTU, condomínio...)"
          aria-label="Do que foi a despesa"
          onChange={e => setDesc(e.target.value)}
        />
        <CampoValor valor={valor} mudar={setValor} rotulo="Valor da despesa" />
        <Botao variante="secundario" type="button" onClick={anotar}>
          Anotar despesa
        </Botao>
      </div>
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
    </section>
  )
}

function DiaDoVencimento({ c, gravar }: { c: CadernoImovel; gravar: (c: CadernoImovel) => Promise<boolean> }) {
  return (
    <label className="campo">
      <span>Dia em que o aluguel vence</span>
      <select
        className="inp"
        value={c.dia_vencimento}
        onChange={e => void gravar({ ...c, dia_vencimento: Number(e.target.value) })}
      >
        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
          <option key={d} value={d}>
            Dia {d}
          </option>
        ))}
      </select>
      <small>Passou desse dia sem o aluguel chegar, ele aparece como atrasado.</small>
    </label>
  )
}
