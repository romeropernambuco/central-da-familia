import { Icone } from './Icone'
import { useRef, useState } from 'react'
import { useApp } from '../app/contexto'
import type { FonteReceita, RecebimentoTela } from '../api/tipos'
import { mesReceitaValido } from '../lib/futuroReceitas'
import { CampoPrivado, textoPrivado } from './privacidade'
import { CampoValor, Din, Sheet } from './base'
import { hojeRecife, mesCurto, textoParaValor, valorDigitadoValido } from '../lib/formato'

export const ORIGENS_RECEITA = {
  empresa: 'Empresa que já tenho',
  negocio_novo: 'Novo negócio',
  aluguel: 'Aluguel',
  salario: 'Salário',
  outro: 'Outro',
} as const
export const CERTEZAS_RECEITA = { garantido: 'Garantido', provavel: 'Provável', incerto: 'Ainda incerto' } as const
export const fonteInicial = (certo: boolean): FonteReceita => ({
  origem: 'outro',
  certeza: certo ? 'garantido' : 'incerto',
  recorrencia: 'unica',
})
export function CamposFonteReceita({
  fonte,
  mudar,
  inicio,
}: {
  fonte: FonteReceita
  mudar: (f: FonteReceita) => void
  inicio: string
}) {
  return (
    <>
      <div className="campo">
        <span id="rfOrigem">
          <Icone nome="entrada" />
          De onde vem?
        </span>
        <div className="pills" role="group" aria-labelledby="rfOrigem">
          {Object.entries(ORIGENS_RECEITA).map(([v, t]) => (
            <button
              key={v}
              className="pill"
              type="button"
              aria-pressed={fonte.origem === v}
              onClick={() => mudar({ ...fonte, origem: v as FonteReceita['origem'] })}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <label className="campo">
        <span>Nome da fonte (opcional)</span>
        <CampoPrivado
          className="inp"
          value={fonte.rotulo || ''}
          maxLength={80}
          onChange={e => mudar({ ...fonte, rotulo: e.target.value })}
        />
      </label>
      <div className="campo">
        <span id="rfCerteza">Qual a certeza?</span>
        <div className="pills" role="group" aria-labelledby="rfCerteza">
          {Object.entries(CERTEZAS_RECEITA).map(([v, t]) => (
            <button
              key={v}
              className="pill"
              type="button"
              aria-pressed={fonte.certeza === v}
              onClick={() => mudar({ ...fonte, certeza: v as FonteReceita['certeza'] })}
            >
              {t}
            </button>
          ))}
        </div>
        <small>Só Garantido entra no número oficial. Previsto não é promessa.</small>
      </div>
      <div className="campo">
        <span id="rfRepete">
          <Icone nome="pendente" />
          Se repete?
        </span>
        <div className="pills" role="group" aria-labelledby="rfRepete">
          {Object.entries({ unica: 'Só uma vez', mensal: 'Todo mês', anual: 'Todo ano' }).map(([v, t]) => (
            <button
              key={v}
              className="pill"
              type="button"
              aria-pressed={fonte.recorrencia === v}
              onClick={() => mudar({ ...fonte, recorrencia: v as FonteReceita['recorrencia'] })}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {fonte.recorrencia !== 'unica' && (
        <label className="campo">
          <span>Até quando</span>
          <CampoPrivado
            className="inp"
            type="month"
            min={inicio}
            max="2031-12"
            value={fonte.fim || ''}
            onChange={e => mudar({ ...fonte, fim: e.target.value || undefined })}
          />
          <small>
            Sem fim informado: até dezembro de 2031. Valor igual em cada ocorrência, sem reajuste automático.
          </small>
        </label>
      )}
    </>
  )
}

export function ConfirmarReceita({
  r,
  meses,
  confirmar,
  fechar,
}: {
  r: RecebimentoTela
  meses: string[]
  confirmar: (m: string, valor: number, data: string) => Promise<boolean>
  fechar: () => void
}) {
  const { oculto } = useApp()
  const [mes, setMes] = useState(meses[0] || r.mes_previsto)
  const [valor, setValor] = useState(String(r.valor).replace('.', ','))
  // Não preencher com hoje: exige a data que o dono conferiu.
  const [data, setData] = useState(''),
    [erro, setErro] = useState(''),
    [ocupado, setOcupado] = useState(false)
  const trava = useRef(false)
  return (
    <Sheet
      titulo="Conferir recebimento"
      fechar={() => {
        if (!ocupado) fechar()
      }}
    >
      <p>{textoPrivado(r.descricao)}</p>
      <p>
        Valor previsto: <Din v={r.valor} /> · Mês previsto: {textoPrivado(mesCurto(mes))} (dia não informado).
      </p>
      <form
        style={{ display: 'grid', gap: 12 }}
        onSubmit={async e => {
          e.preventDefault()
          if (trava.current) return
          const d = new Date(`${data}T12:00:00Z`)
          if (!valorDigitadoValido(valor) || textoParaValor(valor) < 0) {
            setErro('Confira quanto realmente chegou.')
            return
          }
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
            !Number.isFinite(d.getTime()) ||
            d.toISOString().slice(0, 10) !== data ||
            data > hojeRecife()
          ) {
            setErro('Informe a data em que chegou, até hoje.')
            return
          }
          if (!mesReceitaValido(mes) || !meses.includes(mes)) {
            setErro('Escolha a ocorrência que chegou.')
            return
          }
          trava.current = true
          setOcupado(true)
          setErro('')
          try {
            if (await confirmar(mes, textoParaValor(valor), data)) fechar()
            else setErro('Não foi possível confirmar. Seus campos continuam aqui; tente novamente.')
          } catch {
            setErro('Não foi possível confirmar. Seus campos continuam aqui; tente novamente.')
          } finally {
            trava.current = false
            setOcupado(false)
          }
        }}
      >
        {meses.length > 1 &&
          (oculto ? (
            <p className="sub">Abra o olho para escolher outra ocorrência.</p>
          ) : (
            <label className="campo">
              <span>Qual ocorrência chegou?</span>
              <select
                className="inp"
                aria-label="Qual ocorrência chegou?"
                value={mes}
                onChange={e => setMes(e.target.value)}
              >
                {meses.map(m => (
                  <option key={m} value={m}>
                    {textoPrivado(mesCurto(m))}
                  </option>
                ))}
              </select>
            </label>
          ))}
        <div className="campo">
          <span>Quanto realmente chegou</span>
          <CampoValor valor={valor} mudar={setValor} rotulo="Quanto realmente chegou" />
        </div>
        <label className="campo">
          <span>Data em que chegou</span>
          <CampoPrivado
            className="inp"
            aria-label="Data em que chegou"
            type="date"
            max={hojeRecife()}
            value={data}
            onChange={e => setData(e.target.value)}
          />
        </label>
        {erro && <p role="alert">{erro}</p>}
        <button className="btn primary full" type="submit" disabled={ocupado}>
          <Icone nome="salvo" />
          Confirmar recebimento
        </button>
      </form>
    </Sheet>
  )
}
