import { textoPrivado } from '../lib/olho'
import { EstadoVazio } from './EstadoVazio'
import { Icone } from './Icone'
import { useEffect, useId, useMemo, useState } from 'react'
import { Target } from 'lucide-react'
import { useAcoes, useOlhoApp, useSessaoAtual } from '../app/contexto'
import { useFuturo } from '../app/useDados2'
import { CENARIOS_RECEITAS, useCenarioReceitas } from '../app/useCenarioReceitas'
import { entradaDoCenario } from '../lib/futuroReceitas'
import type { CenarioReceitas } from '../api/tipos'
import { useConfig } from '../app/useConfig'
import { rumoDoCenario, type RumoCalculado } from '../lib/resumo/plano2029'
import { acompanharConferencias, CHAVE_FONTES, useNumerosAtualizados } from '../app/useNumerosAtualizados'
import { AtualizarNumeros, numerosParaConferir } from './AtualizarNumeros'
import { Din } from './base'
import { PlanoSemMargem } from './PlanoSemMargem'
import { analisarGordura, fraseDaGordura } from '../lib/gordura'
import { fraseViverDeRenda, quandoViveDeRenda } from '../lib/viverDeRenda'
import './RumoA2029.css'

const mesNome = (m: string) =>
  `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m.slice(5)) - 1]}/${m.slice(0, 4)}`
const percentual = (n: number) => `${Math.floor(n).toLocaleString('pt-BR')}%`

/** A barreira vem antes dos hooks de leitura: pessoa/equipe nem buscam config ou valores do casal. */
export function RumoA2029({ compacto = false, oficial = false }: { compacto?: boolean; oficial?: boolean }) {
  const { familia } = useSessaoAtual()
  return familia?.papel === 'casal' ? (
    <RumoDaFamilia key={familia.id} compacto={compacto} oficial={oficial || compacto} />
  ) : null
}

function RumoDaFamilia({ compacto, oficial }: { compacto: boolean; oficial: boolean }) {
  const { api, familia } = useSessaoAtual()
  const { recarregar } = useAcoes()
  const { oculto } = useOlhoApp()
  const { ent, estado, atualizar } = useFuturo()
  const [fontes, , erroFontes, fontesLidas] = useConfig<unknown>(CHAVE_FONTES, {})
  const cenarios = useCenarioReceitas(ent)
  const cenario = oficial ? 'garantido' : cenarios.cenario
  const conferencia = useNumerosAtualizados()
  const [folha, setFolha] = useState(false)
  const entrada = ent?.entrada
  const calculo = useMemo(() => {
    if (!entrada || !fontesLidas) return null
    try {
      const s = cenarios.resultados?.[cenario]
      const e = ent && entradaDoCenario(ent, cenario)
      if (!s || !e) return null
      const c = rumoDoCenario(e, s, ent.fontesReceita ?? fontes, !compacto)
      if (ent.confirmar.length) c.premissas.push(`A confirmar: ${ent.confirmar.join('; ')}.`)
      return c
    } catch {
      return null
    }
  }, [entrada, fontes, fontesLidas, compacto, cenarios.resultados, cenario, ent])
  // família sem meta (sem o gasto do objetivo): o sistema identifica sozinho quando daria para viver do que rende
  const semMeta = useMemo(() => {
    // sem o gasto do objetivo, o plano usa o teto do mês de hoje e pede para confirmar (futuroReceitas)
    if (!entrada || !calculo || !ent?.confirmar.some(t => t.startsWith('gasto por mês em 2029'))) return null
    const v = quandoViveDeRenda(calculo.saida.linha, {
      gasto: entrada.parametros.gasto_2029_hoje,
      taxaRealAnual: Number(entrada.parametros.taxa_real_trabalho),
      margem: Number(entrada.parametros.margem),
      alugueis: calculo.alugueis,
    })
    return v ? fraseViverDeRenda(v) : null
  }, [entrada, calculo, ent])
  const itens = useMemo(() => (entrada ? numerosParaConferir(entrada) : []), [entrada])
  useEffect(() => {
    if (entrada)
      acompanharConferencias(
        api,
        familia!.id,
        entrada.aplicacoes.map(a => a.id),
      )
  }, [api, entrada, familia])
  useEffect(() => {
    if (
      !compacto &&
      typeof location !== 'undefined' &&
      new URLSearchParams(location.hash.split('?')[1]).get('numeros') === 'recebimentos'
    )
      document.getElementById?.('pRec')?.scrollIntoView?.({ block: 'start' })
  }, [compacto, entrada])
  const velhos =
    api.modo !== 'exemplo' && conferencia.lido && itens.some(i => (conferencia.avaliar(i.grupo, i.id).dias ?? 0) > 60)
  const semConferencia =
    api.modo !== 'exemplo' && conferencia.lido && itens.some(i => conferencia.avaliar(i.grupo, i.id).dias === null)
  const falhou =
    estado === 'erro' || estado === 'desligado' || !!erroFontes || (estado === 'ok' && fontesLidas && !calculo)
  const mensagem = falhou
    ? ent?.motivo || 'Não foi possível calcular agora. Confira os dados do objetivo e tente novamente.'
    : 'Buscando os números de 2029…'
  return (
    <>
      <RumoHero
        cenario={cenario}
        compacto={compacto}
        calculo={erroFontes || estado === 'erro' ? null : calculo}
        exemplo={api.modo === 'exemplo'}
        velhos={velhos}
        semConferencia={semConferencia}
        mensagem={mensagem}
        erro={falhou}
        semMeta={semMeta}
        atualizar={() => {
          atualizar()
          void recarregarConfig()
        }}
        abrir={() => setFolha(true)}
      />
      {folha && (
        <AtualizarNumeros
          itens={itens}
          conferencia={conferencia}
          fechar={() => {
            setFolha(false)
            atualizar()
          }}
        />
      )}
      {!compacto && conferencia.erro && <p className="sub">{textoPrivado(conferencia.erro, oculto)}</p>}
    </>
  )
  async function recarregarConfig() {
    await recarregar()
  }
}

/** "A gordura de hoje fica inteira até dez/2028" ou "a partir de mm/aaaa os gastos passam a comer a gordura". */
function FraseGordura({ linha }: { linha: RumoCalculado['saida']['linha'] }) {
  const a = analisarGordura(linha)
  if (!a) return null
  return (
    <p className={a.comeEm ? 'sub rumo-gordura come' : 'sub rumo-gordura'} role="note">
      {fraseDaGordura(a, linha[linha.length - 1].mes)}
    </p>
  )
}

export function RumoHero({
  calculo: c,
  cenario = 'garantido',
  compacto = false,
  exemplo = false,
  velhos = false,
  semConferencia = false,
  mensagem = 'Informe o gasto necessário e confira os saldos para começar.',
  erro = false,
  semMeta = null,
  abrir,
  atualizar,
}: {
  calculo: RumoCalculado | null
  cenario?: CenarioReceitas
  compacto?: boolean
  exemplo?: boolean
  velhos?: boolean
  semConferencia?: boolean
  mensagem?: string
  erro?: boolean
  /** a frase de quando daria para viver do que rende, para a família que ainda não escolheu a meta */
  semMeta?: string | null
  abrir: () => void
  atualizar?: () => void
}) {
  const { oculto } = useOlhoApp()
  const id = useId(),
    privado = (s: string) => textoPrivado(s, oculto)
  if (oculto)
    return compacto ? (
      <a className="card rumo-resumo" href="#/planejamento">
        <Icone nome="plano2029" />
        <b>Rumo a 2029</b>
        <span>Gráfico e valores escondidos.</span>
        <Icone nome="abrir" />
        <span className="sub">Tesoureiro de Receitas: confira as premissas antes de contar com essa renda.</span>
      </a>
    ) : (
      <section className="card rumo-hero" aria-labelledby={id}>
        <h2 id={id}>
          <Icone nome="plano2029" />
          Rumo a 2029
        </h2>
        <p>Gráfico e valores escondidos.</p>
        <div className="rumo-barra" role="img" aria-label="Cobertura escondida">
          <i style={{ width: '0%' }} />
        </div>
        <button className="btn primary" type="button" onClick={abrir}>
          <Icone nome="contador" />
          Atualizar meus números
        </button>
        <p className="sub">Tesoureiro de Receitas: confira as premissas antes de contar com essa renda.</p>
      </section>
    )
  const n = c?.numeros
  const saldo = (v: number) => (
    <>
      {v > 0 ? 'faltam' : 'sobram'} <Din v={Math.abs(v) / 100} /> por mês
    </>
  )
  const resposta = oculto ? (
    'Abra o olho para conferir a cobertura e os valores.'
  ) : !c || !n || n.cobre_pct === null || n.falta_com_margem === null ? null : (
    <>
      Em {mesNome(c.referencia)} {saldo(n.falta_com_margem)}, com margem de segurança.
    </>
  )
  const semMargem = !oculto && n && n.cobre_pct !== null ? <PlanoSemMargem centavos={n.falta_sem_margem} /> : null
  if (compacto)
    return (
      <a className="card rumo-resumo" href="#/planejamento">
        <b>Rumo a 2029</b>
        <Icone nome="abrir" />
        <span className="chip">Garantido</span>
        {exemplo && <span>Exemplo</span>}
        <span>{resposta || (c ? 'Informe o gasto necessário no objetivo.' : mensagem)}</span>
        {semMeta && <span className="sub rumo-sem-meta">{semMeta}</span>}
        {semMargem}
        {!exemplo && velhos && <span className="sub">Há números com mais de 60 dias.</span>}
        <span className="sub">Tesoureiro de Receitas: confira as premissas antes de contar com essa renda.</span>
      </a>
    )
  return (
    <section className="card rumo-hero" aria-labelledby={id}>
      <div className="card-h">
        <h2 id={id}>
          <Icone desenho={Target} aria-hidden="true" />
          Rumo a 2029
        </h2>
        {exemplo && <span className="chip">Modo exemplo</span>}
      </div>
      <span className="chip">{CENARIOS_RECEITAS[cenario]}</span>
      {cenario !== 'garantido' && <p className="sub">Número oficial: Garantido</p>}
      <p className="rumo-pergunta">Já dá para viver só de rendimentos?</p>
      {exemplo && <p className="sub">Simulação de exemplo. Não decide alertas nem grava na família real.</p>}
      {resposta ? (
        <p className="rumo-resposta">{resposta}</p>
      ) : (
        <div role={erro ? 'alert' : 'status'}>
          <EstadoVazio
            ilustracao={erro ? 'Erro' : 'Plano2029'}
            titulo={erro ? 'Vamos conferir o plano' : 'Seu plano começa pelos números'}
            frase={
              c
                ? 'Informe o gasto necessário no objetivo. Gasto zero não permite avaliar a cobertura.'
                : privado(mensagem)
            }
          />
        </div>
      )}
      {semMeta && <p className="sub rumo-sem-meta">{semMeta}</p>}
      {semMargem}
      {!c && atualizar && (
        <button className="btn line" type="button" onClick={atualizar}>
          <Icone nome="desfazer" />
          Tentar novamente
        </button>
      )}
      {c && (
        <>
          <div
            className="rumo-barra"
            role="img"
            aria-label={
              oculto
                ? 'Cobertura escondida'
                : c.cobertura === null
                  ? 'Gasto necessário não informado'
                  : `Cobertura estimada de ${percentual(c.cobertura)}`
            }
          >
            <i style={{ width: `${oculto || c.cobertura === null ? 0 : Math.min(100, Math.max(0, c.cobertura))}%` }} />
          </div>
          <div className="rumo-entre">
            <span>
              Renda mensal <Din v={c.total / 100} />
            </span>
            <span>
              Gasto necessário <Din v={c.gasto / 100} />
            </span>
          </div>
          <p className="sub">
            Até dez/2028 o salário de Rendas entra todo mês e a sobra vai para o guardado; de 2029 em diante, só o que
            rende. Aplicações são estimativas; a cobertura depende das premissas abaixo.
          </p>
          {/* gordura x lucro da gordura (regra do dono, 22/11): gastar o que rende não come o guardado */}
          {!oculto && <FraseGordura linha={c.saida.linha} />}
          <div className="rumo-fontes">
            <div>
              <Icone nome="guardado" />
              <span>Aplicações e caixa projetado</span>
              <Din v={c.aplicacoes / 100} />
              <small>Previsto · rendimento estimado</small>
            </div>
            <div>
              <Icone nome="imovel" />
              <span>Aluguéis líquidos dos imóveis</span>
              <Din v={c.alugueis / 100} />
              <small>Garantido no cadastro · contrato de pelo menos 12 meses</small>
            </div>
            <div>
              <Icone nome="entrada" />
              <span>Receitas recorrentes na renda mensal</span>
              <Din v={c.recorrentes.filter(r => r.entra).reduce((s, r) => s + r.valor, 0) / 100} />
              <small>Entradas até 2028 já compõem as aplicações; não somam renda permanente.</small>
            </div>
            {!!c.rendaCerta && (
              <div>
                <span>Renda certa do Objetivo</span>
                <Din v={c.rendaCerta / 100} />
                <small>Origem a confirmar no cadastro; já incluída pelo motor.</small>
              </div>
            )}
          </div>
          <p className="sub">
            Garantido: consta como certo no cadastro. Previsto: depende de estimativa. Incerto: só entra em Com tudo.
            Entradas acumuladas já estão nas aplicações.
          </p>
          {(c.saida.gatilhos ?? [])
            .filter(g => g.tipo === 'aluguel')
            .map(g => (
              <p className="sub" key={`${g.id}:${g.motivo}`}>
                {privado(g.nome)} · {privado(g.motivo === 'sem contrato' ? 'Incerto' : 'Previsto')} ·{' '}
                <Din v={g.valor / 100} /> por mês fora da cobertura: {privado(g.motivo)}.
              </p>
            ))}
          {c.recorrentes.length ? (
            <ul className="rumo-receitas">
              {c.recorrentes.map(r => (
                <li key={r.id}>
                  <b>{privado(r.nome)}</b> · {privado(r.grupo)} · <Din v={r.valor / 100} />
                  <small>{privado(r.nota)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sub">
              Nenhuma receita recorrente de empresa ou negócio identificada para {mesNome(c.referencia)}. Sem origem e
              frequência informadas, nenhuma receita é presumida como recorrente.
            </p>
          )}
          <h3>O que mais move o ponteiro</h3>
          <p className="sub">
            Até três hipóteses independentes, calculadas pelo motor. Não se somam nem prometem resultado.
          </p>
          {c.alavancas.length ? (
            <ol className="rumo-alavancas">
              {c.alavancas.map(a => (
                <li key={a.id}>
                  <b>{privado(a.texto)}</b>
                  {a.valor > 0 && (
                    <span>
                      <Din v={a.valor / 100} />
                    </span>
                  )}
                  <span>
                    Melhora estimada de <Din v={a.efeito / 100} /> por mês em 2029
                  </span>
                  <small>{privado(a.premissa)}</small>
                </li>
              ))}
            </ol>
          ) : (
            <p className="sub">
              Não há alavanca positiva calculável com os dados atuais. Você pode conferir os números sem mudar o plano.
            </p>
          )}
          <h3>Quando cobre</h3>
          <p>
            {oculto
              ? 'Projeção de cobertura escondida.'
              : privado(
                  c.cobertura === null
                    ? 'Informe o gasto necessário para projetar quando cobre.'
                    : c.cobreEm
                      ? `Cobertura projetada em ${mesNome(c.cobreEm)}.`
                      : c.referencia > '2031-12'
                        ? 'A data atual já passou da janela até dez/2031. A cobertura acima é a do mês atual.'
                        : 'Não cobre até dez/2031 com estas premissas.',
                )}
          </p>
          <p className="sub">
            Cada ponto simula começar a viver de rendimentos naquele mês; não garante os meses seguintes.
          </p>
          {oculto ? (
            <p className="sub">Gráfico e valores escondidos.</p>
          ) : (
            c.linha.length > 0 && (
              <figure className="rumo-grafico">
                <svg
                  viewBox="0 0 360 100"
                  role="img"
                  aria-label={`Cenário ${CENARIOS_RECEITAS[cenario]}: cobertura mensal estimada com margem de segurança; valores completos na descrição abaixo`}
                >
                  <line x1="0" y1="50" x2="360" y2="50" stroke="currentColor" strokeDasharray="4 4" />
                  <polyline
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    points={c.linha
                      .map(
                        (m, i) =>
                          `${(i * 360) / Math.max(1, c.linha.length - 1)},${100 - Math.min(200, Math.max(0, m.cobertura ?? 0)) / 2}`,
                      )
                      .join(' ')}
                  />
                </svg>
                <figcaption>
                  Linha pontilhada: 100% do gasto com margem de segurança. {mesNome(c.linha[0].mes)} a{' '}
                  {mesNome(c.linha[c.linha.length - 1].mes)}.
                </figcaption>
              </figure>
            )
          )}
          <details>
            <summary>Ver cobertura mês a mês em texto</summary>
            <ul className="rumo-meses">
              {c.linha.map(m => (
                <li key={m.mes}>
                  {mesNome(m.mes)}: {privado(m.cobertura === null ? 'gasto não informado' : percentual(m.cobertura))} ·
                  renda <Din v={m.renda / 100} /> · gasto <Din v={m.gasto / 100} />
                </li>
              ))}
            </ul>
          </details>
          <details className="rumo-premissas">
            <summary>
              <Icone nome="folha" />
              Premissas da conta
            </summary>
            {c.premissas.map((p, i) => (
              <p className="sub" key={i}>
                {privado(p)}
              </p>
            ))}
          </details>
        </>
      )}
      {!exemplo && velhos && <p className="sub">{privado('Há números com mais de 60 dias.')}</p>}
      {!exemplo && semConferencia && <p className="sub">{privado('Há números sem data de conferência.')}</p>}
      <button className="btn primary" type="button" onClick={abrir}>
        <Icone nome="desfazer" />
        Atualizar meus números
      </button>
      <p className="sub rumo-fala">Tesoureiro de Receitas: confira as premissas antes de contar com essa renda.</p>
    </section>
  )
}
