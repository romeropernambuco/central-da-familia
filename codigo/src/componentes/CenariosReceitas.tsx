import { textoPrivado } from '../lib/olho'
import { Icone } from './Icone'
import { useDadosDoDia, useOlhoApp, useSessaoAtual } from '../app/contexto'
import { useLeituraRemota } from '../app/useLeituraRemota'
import { CENARIOS_RECEITAS, useCenarioReceitas } from '../app/useCenarioReceitas'
import { textoDaTaxa } from '../lib/futuroReceitas'
import type { CenarioReceitas, ControleReceitas, FontesReceita } from '../api/tipos'
import { Din } from './base'
import { dataBr } from '../lib/formato'
import { numerosRumo2029 } from '../lib/rumo2029'

export function CenariosReceitas({
  fontes,
  controle,
  revisao,
}: {
  fontes: FontesReceita
  controle: ControleReceitas
  revisao: number
}) {
  const { api, familia } = useSessaoAtual()
  const { versao } = useDadosDoDia()
  const { oculto } = useOlhoApp()
  const leitura = useLeituraRemota(
    `receitas:${api.modo}:${familia!.id}`,
    api.futuroEntradas ? () => api.futuroEntradas!(familia!.id) : null,
    [api, versao, revisao],
  )
  const { cenario, escolher, resultados, resultado, erro } = useCenarioReceitas(leitura.dado, fontes, controle)
  const e = leitura.dado?.entrada
  return (
    <div className="card f30-cenarios" style={{ marginBlock: 12 }}>
      <h3>
        <Icone nome="plano2029" />
        Receitas e a renda de 2029
      </h3>
      <div className="pills" role="group" aria-label="Comparar cenários de receitas">
        {Object.entries(CENARIOS_RECEITAS).map(([c, t]) => (
          <button
            type="button"
            className="pill"
            key={c}
            aria-pressed={cenario === c}
            onClick={() => escolher(c as CenarioReceitas)}
          >
            {t}
          </button>
        ))}
      </div>
      <p className="sub">
        Garantido é o número oficial. Com previstos soma o provável; Com tudo, também o incerto. Vale só neste aparelho.
      </p>
      {leitura.erro && (
        <p role="alert">
          Não foi possível atualizar os cenários.{' '}
          {leitura.dado ? 'Dados desatualizados.' : 'A comparação está indisponível.'}{' '}
          <button type="button" onClick={leitura.repetir}>
            <Icone nome="desfazer" />
            Tentar de novo
          </button>
        </p>
      )}
      {oculto && <p className="todo">Comparação escondida. Abra o olho para conferir os cenários.</p>}
      {leitura.carregando && <p role="status">Atualizando a comparação…</p>}
      {erro && <p role="alert">{erro}</p>}
      {!oculto &&
        resultados &&
        e &&
        (Object.keys(CENARIOS_RECEITAS) as CenarioReceitas[]).map(c => {
          const r = resultados[c]
          const n = numerosRumo2029(r, e)
          const saldo = (v: number) => (
            <>
              {v > 0 ? 'faltam' : 'sobram'} <Din v={Math.abs(v) / 100} /> por mês
            </>
          )
          return (
            <div key={c} aria-current={cenario === c ? 'true' : undefined}>
              <p>
                {CENARIOS_RECEITAS[c]}:{' '}
                {n.cobre_pct === null || n.falta_com_margem === null ? (
                  'Informe o gasto necessário ou confira a taxa do Objetivo.'
                ) : (
                  <>{saldo(n.falta_com_margem)}, com margem de segurança.</>
                )}
              </p>
              {n.cobre_pct !== null && <p className="sub">Sem a margem de segurança: {saldo(n.falta_sem_margem)}.</p>}
            </div>
          )
        })}
      {!oculto && resultado && e && (
        <div aria-label="Detalhes do cenário selecionado">
          <p>
            Do que rende: <Din v={resultado.renda_sustentavel / 100} /> por mês. Aluguéis:{' '}
            <Din v={(resultado.aluguel_liquido_2029 ?? 0) / 100} /> por mês.
          </p>
          <p>
            {resultado.patrimonio_necessario === null ? (
              'Com esta taxa não dá para calcular quanto falta.'
            ) : resultado.folga < 0 ? (
              <>
                Faltam <Din v={Math.abs(resultado.folga) / 100} /> de guardado para a meta de jan/2029.
              </>
            ) : (
              <>
                O guardado já passa da meta de jan/2029 em <Din v={resultado.folga / 100} />.
              </>
            )}
          </p>
          <details>
            <summary>Como a conta é feita</summary>
            <p className="sub">
              Rendimento de {textoPrivado(textoDaTaxa(e.parametros.taxa_real_trabalho), oculto)}% ao ano acima da
              inflação e margem de {textoPrivado(textoDaTaxa(e.parametros.margem), oculto)}%, com os números de{' '}
              {textoPrivado(dataBr(e.hoje), oculto)}. É estimativa, não promessa.
            </p>
            <p className="sub">
              Entradas contam até 12/2028. Depois, salário e receitas ficam fora: a família vive do que rende.
            </p>
            {Object.entries(e.parametros.taxa_bruta_ano).map(([ano, t]) => (
              <p key={ano}>
                {ano}: juros {textoPrivado(textoDaTaxa(t), oculto)}%; inflação{' '}
                {textoPrivado(textoDaTaxa(e.parametros.ipca_ano[Number(ano)]), oculto)}%; imposto{' '}
                {textoPrivado(textoDaTaxa(e.parametros.aliq_proj), oculto)}%.
              </p>
            ))}
          </details>
        </div>
      )}
      {!leitura.carregando && !leitura.erro && !e && (
        <p>A comparação precisa dos dados do Objetivo. {leitura.dado?.motivo}</p>
      )}
      {!!leitura.dado?.confirmar.length && (
        <p className="sub">A confirmar: {textoPrivado(leitura.dado.confirmar.join('; '), oculto)}.</p>
      )}
    </div>
  )
}
