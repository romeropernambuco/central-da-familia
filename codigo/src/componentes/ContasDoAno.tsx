import { useState } from 'react'
import { CalendarClock, Plus } from 'lucide-react'
import { useAcoes, useOlhoApp, useSessaoAtual } from '../app/contexto'
import { useConfig } from '../app/useConfig'
import {
  fraseDasContas,
  lerContasDoAno,
  linhaDaConta,
  quandoVence,
  resumoDasContas,
  SUGESTOES,
  AVISO_DIAS,
  type ContaDoAno,
} from '../lib/contasDoAno'
import { hojeRecife, textoParaValor, valorDigitadoValido } from '../lib/formato'
import { textoPrivado } from '../lib/olho'
import { novoUuid } from '../lib/seguro'
import { CampoValor, Din, Sheet } from './base'
import { Icone } from './Icone'
import { CampoPrivado } from './privacidade'
import './planilha.css'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/**
 * Contas do ano (IPTU, IPVA, matrícula...): a família diz o nome, o valor e quando vence; o app diz quanto separar por
 * mês e o Contador lembra 30 dias antes. Só o casal vê.
 */
export function ContasDoAno() {
  const { familia } = useSessaoAtual()
  const { oculto } = useOlhoApp()
  const [cru, salvar, , lido] = useConfig<unknown[]>('contas_ano', [])
  const [nova, setNova] = useState<string | null>(null)
  if (familia?.papel !== 'casal') return null
  const contas = lerContasDoAno(cru)
  const r = resumoDasContas(contas, hojeRecife())
  const f = fraseDasContas(r)
  const mudar = (lista: ContaDoAno[]) => salvar(lista)
  return (
    <section className="card contas-ano" aria-labelledby="pAno">
      <div className="card-h">
        <h2 id="pAno">
          <Icone desenho={CalendarClock} aria-hidden="true" />
          Contas do ano
        </h2>
        <button className="lnk" type="button" onClick={() => setNova('')}>
          <Icone desenho={Plus} />
          Conta
        </button>
      </div>
      {f ? (
        <>
          <p>
            <b>
              Separe <Din v={r.porMes} /> por mês para pagar as contas do ano em dia.
            </b>
          </p>
          <details className="salario-porque">
            <summary>Por quê?</summary>
            <p className="sub">{f.porque}</p>
          </details>
          <ul className="contas-ano-lista">
            {r.lista.map(p => (
              <li key={p.conta.id}>
                <span>
                  <b>{textoPrivado(p.conta.nome)}</b>
                  <small className="sub">{oculto ? quandoVence(p) : linhaDaConta(p)}</small>
                </span>
                <span className="contas-ano-acoes">
                  {p.dias <= AVISO_DIAS && (
                    <button
                      type="button"
                      className="btn line"
                      onClick={() =>
                        mudar(
                          contas.map(c =>
                            c.id === p.conta.id ? { ...c, pagas: [...c.pagas, p.vence.slice(0, 4)] } : c,
                          ),
                        )
                      }
                    >
                      Já paguei
                    </button>
                  )}
                  <button
                    type="button"
                    className="lnk"
                    aria-label={`Tirar ${p.conta.nome}`}
                    onClick={() => mudar(contas.filter(c => c.id !== p.conta.id))}
                  >
                    Tirar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        lido && (
          <>
            <p className="sub">Contas que vêm uma vez por ano. Toque numa para pôr o valor:</p>
            <div className="pills" role="group" aria-label="Sugestões de contas do ano">
              {SUGESTOES.map(s => (
                <button key={s} type="button" className="pill" onClick={() => setNova(s)}>
                  {s}
                </button>
              ))}
            </div>
          </>
        )
      )}
      {nova !== null && <FolhaConta nome={nova} fechar={() => setNova(null)} salvar={c => mudar([...contas, c])} />}
    </section>
  )
}

function FolhaConta({
  nome: nome0,
  fechar,
  salvar,
}: {
  nome: string
  fechar: () => void
  salvar: (c: ContaDoAno) => Promise<boolean>
}) {
  const { toast } = useAcoes()
  const [t, setT] = useState({ nome: nome0, valor: '', mes: 2, dia: '10', parcelas: 1 })
  const ok = async () => {
    const valor = t.valor && valorDigitadoValido(t.valor) ? textoParaValor(t.valor) : 0
    const dia = Number(t.dia)
    if (!t.nome.trim()) return toast('Diga o nome da conta. Ex.: IPTU.')
    if (!(valor > 0)) return toast('Diga quanto é a conta no ano.')
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) return toast('O dia do vencimento vai de 1 a 31.')
    const c: ContaDoAno = {
      id: novoUuid(),
      nome: t.nome.trim(),
      valor,
      mes: t.mes,
      dia,
      parcelas: t.parcelas,
      pagas: [],
    }
    if (await salvar(c)) fechar()
  }
  return (
    <Sheet titulo="Conta do ano" fechar={fechar}>
      <div className="aluguel-folha">
        <label className="campo">
          <span>Nome</span>
          <CampoPrivado
            className="inp"
            maxLength={60}
            value={t.nome}
            placeholder="Ex.: IPTU da casa"
            onChange={e => setT({ ...t, nome: e.target.value })}
          />
        </label>
        <label className="campo">
          <span>Valor no ano</span>
          <CampoValor valor={t.valor} mudar={x => setT({ ...t, valor: x.replace(/[^\d,]/g, '') })} />
        </label>
        <div className="contas-ano-quando">
          <label className="campo">
            <span>Mês que vence</span>
            <select className="inp" value={t.mes} onChange={e => setT({ ...t, mes: Number(e.target.value) })}>
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Dia</span>
            <input
              className="inp"
              inputMode="numeric"
              maxLength={2}
              value={t.dia}
              onChange={e => setT({ ...t, dia: e.target.value.replace(/\D/g, '') })}
            />
          </label>
          <label className="campo">
            <span>Como paga</span>
            <select className="inp" value={t.parcelas} onChange={e => setT({ ...t, parcelas: Number(e.target.value) })}>
              <option value={1}>Cota única</option>
              {Array.from({ length: 11 }, (_, i) => i + 2).map(n => (
                <option key={n} value={n}>
                  {n} parcelas
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="sub">IPTU de imóvel alugado já entra nos custos do imóvel, na tela Guardado.</p>
        <button className="btn primary full" type="button" onClick={ok}>
          Guardar
        </button>
      </div>
    </Sheet>
  )
}
