import { useEffect, useState } from 'react'
import { enderecoDestino, type DestinoResumo } from '../../app/destinos'
import { useAcoes, useOlhoApp, useSessaoAtual } from '../../app/contexto'
import { InicioNovo } from '../../componentes/InicioNovo'
import { montarInicioNovo } from '../../componentes/inicioNovoDados'
import { saudacao } from '../../lib/formato'
import { textoPrivado } from '../../lib/olho'
import { useResumoFamilia } from '../../app/useResumoFamilia'
import { Icone, type NomeIcone } from '../../componentes/Icone'
import { SemAplicacoes, SemCartoes, SemGastos, SemImoveis } from '../../componentes/ilustracoes/figuras'
import type { CampoResumo, ResumoFamilia } from '../../lib/resumo/tipos'
import { PrivacidadePropostas } from '../../componentes/escritorio/privacidade'
import { Quantia } from '../../componentes/painel-inicio/interface'
import { diferenca } from '../../componentes/painel-inicio/modelo'
import { Trilha } from '../../componentes/painel-inicio/Trilha'
import { EscritorioInicio } from './EscritorioInicio'
import { InformarSaldo } from '../planejamento/SaldoConta'
import { ResumoApresentacao } from './ResumoFamilia'
import { UltimosLancamentos } from './UltimosLancamentos'
import { SobreHoje } from './SobreHoje'
import { Linha2028Resumo } from '../../componentes/Linha2028'
import { SetaDoMes } from '../../componentes/SetaDoMes'
import '../../componentes/painel-inicio/painel.css'
import './inicio-j.css'

export { porDiaDe } from '../../lib/resumo/porDia'
export { SemGastosInicio } from './UltimosLancamentos'

function medida<U extends 'reais' | 'centavos' | 'percentual' | 'quantidade'>(
  fonte: CampoResumo<unknown>,
  valor: number | null | undefined,
  unidade: U,
) {
  const meta = { unidade, natureza: fonte.fonte[0]?.natureza ?? ('cadastrado' as const) }
  return valor != null && Number.isFinite(valor)
    ? { ...meta, estado: 'pronto' as const, valor }
    : { ...meta, estado: 'indisponivel' as const, valor: null }
}

/** Quem entrou pelo convite (a filha) chega com limite zero até o casal combinar: o R$ 0 vem explicado (simulação de 22/11). */
function legendaSemLimite(env: { limite_mes: number; limite_base?: number } | null | undefined) {
  return env && (env.limite_base ?? env.limite_mes) === 0 ? { legenda: 'Limite do mês ainda não combinado' } : {}
}

function referencias(r: ResumoFamilia, oculto: boolean) {
  const { podeGastarHoje: orcamento, plano2029: plano, aplicacoes, faturas, imoveis } = r
  const aluguel = imoveis.valor?.aluguel
  const planoCompleto = plano.valor?.cobre_pct != null ? plano.valor : null
  const cobertura = {
    progressao: medida(plano, planoCompleto?.cobre_pct, 'percentual'),
    faltamPorMesComMargem: medida(plano, planoCompleto?.falta_com_margem, 'centavos'),
    faltamPorMesSemMargem: medida(plano, planoCompleto?.falta_sem_margem, 'centavos'),
  }
  const oficial = diferenca(cobertura.faltamPorMesComMargem, oculto)
  const destinoOrcamento = { rota: 'orcamento', secao: 'orcamento' } as const
  const destinoAplicacoes = { rota: 'guardado', secao: 'aplicacoes' } as const
  const destinoPlano = { rota: 'planejamento', secao: 'plano2029' } as const
  const primeira = faturas.valor?.lista[0]
  const destinoFaturas = {
    rota: 'cartoes',
    secao: 'fatura',
    entidade: primeira?.cartao_id,
    periodo: primeira?.mes,
  } as const
  return {
    cobertura,
    destinoPlano,
    chips: [
      {
        chave: 'podeGastarHoje',
        titulo: orcamento.valor?.devendo && !oculto ? 'Devendo no mês' : 'Pode gastar hoje',
        icone: 'orcamento',
        destino: destinoOrcamento,
        campo: medida(orcamento, orcamento.valor?.valor.valor, 'reais'),
        ...legendaSemLimite(orcamento.valor?.envelope),
        tamanho: 'principal',
      },
      {
        chave: 'plano2029',
        titulo: 'Plano 2029',
        icone: 'plano2029',
        destino: destinoPlano,
        campo: oficial.campo,
        legenda: oficial.rotulo + ' · com margem',
        tamanho: 'principal',
      },
      {
        chave: 'aplicacoes',
        titulo: 'Total aplicado',
        icone: 'guardado',
        destino: destinoAplicacoes,
        campo: medida(aplicacoes, aplicacoes.valor?.total, 'reais'),
        tamanho: 'secundario',
      },
      {
        chave: 'faturas',
        titulo: 'Faturas a pagar',
        icone: 'cartoes',
        destino: destinoFaturas,
        campo: medida(faturas, faturas.valor?.total, 'reais'),
        tamanho: 'secundario',
      },
    ] as const satisfies readonly {
      chave: keyof ResumoFamilia
      titulo: string
      icone: NomeIcone
      destino: DestinoResumo
      campo: Parameters<typeof Quantia>[0]['campo']
      tamanho: 'principal' | 'secundario'
      legenda?: string
    }[],
    cartoes: [
      {
        chave: 'podeGastarHoje',
        titulo: 'Meu orçamento',
        legenda: 'Resta no mês',
        destino: destinoOrcamento,
        campo: medida(orcamento, orcamento.valor?.envelope?.livre, 'reais'),
        Figura: SemGastos,
      },
      {
        chave: 'aplicacoes',
        titulo: 'Aplicações',
        legenda: 'Rendeu hoje',
        destino: destinoAplicacoes,
        campo: medida(aplicacoes, aplicacoes.valor?.hoje, 'reais'),
        Figura: SemAplicacoes,
      },
      {
        chave: 'faturas',
        titulo: 'Faturas',
        legenda: 'Para pagar ou conferir',
        destino: destinoFaturas,
        campo: medida(faturas, faturas.valor?.lista.length, 'quantidade'),
        Figura: SemCartoes,
      },
      {
        chave: 'imoveis',
        titulo: 'Imóveis',
        legenda: 'Aluguel do mês, sem imposto',
        destino: { rota: 'guardado', secao: 'imoveis' },
        campo: medida(imoveis, aluguel?.valor, aluguel?.unidade ?? 'reais'),
        Figura: SemImoveis,
      },
    ] as const,
  }
}

function Leitura({
  estado,
  campo,
  tamanho,
}: { estado: CampoResumo<unknown>['estado'] } & Parameters<typeof Quantia>[0]) {
  if (estado === 'carregando')
    return (
      <span className="j-sem-dado" role="status">
        Conferindo…
      </span>
    )
  if (estado === 'erro') return <span className="j-sem-dado">Não foi possível conferir</span>
  return <Quantia {...{ campo, tamanho }} />
}

/** O que as referências do topo, as rotinas, a trilha e a fila "Precisa de você" já mostram: o Resumo da família não repete. */
const JA_NO_TOPO = ['podeGastarHoje', 'plano2029', 'faturas', 'aplicacoes', 'pendencias'] as const
const consulta = '(max-width: 899px)'
function useCelular() {
  const [celular, setCelular] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(consulta).matches)
  useEffect(() => {
    const media = window.matchMedia?.(consulta)
    const atualizar = () => setCelular(!!media?.matches)
    media?.addEventListener('change', atualizar)
    return () => media?.removeEventListener('change', atualizar)
  }, [])
  return celular
}

/** `desenho="v3"`: o Início reformulado (25/11), para comparar com o de sempre antes de trocar. */
export function Inicio({ desenho }: { desenho?: 'v3'; [outra: string]: unknown } = {}) {
  const { familia, sessao } = useSessaoAtual()
  if (!familia || familia.papel === 'equipe') return null
  const Tela = desenho === 'v3' ? InicioReformulado : InicioFamilia
  return <Tela key={JSON.stringify([sessao?.userId, familia.id, familia.membroId, familia.papel])} />
}

/** O Início reformulado: mesmos números e o mesmo Escritório, em outra arrumação (ver componentes/InicioNovo). */
function InicioReformulado() {
  const { resumo, repetir, hoje, api, familia } = useResumoFamilia()
  const { oculto } = useOlhoApp()
  const { abrirLancar } = useAcoes()
  const celular = useCelular()
  const [saldo, setSaldo] = useState(false)
  const { chips, cartoes, cobertura, destinoPlano } = referencias(resumo, oculto)
  const casal = familia?.papel === 'casal'
  const orc = resumo.podeGastarHoje
  const env = orc.estado === 'restrito' ? null : orc.valor?.envelope
  const ler =
    (lista: readonly { chave: keyof ResumoFamilia; campo: Parameters<typeof Quantia>[0]['campo'] }[]) =>
    (chave: string, tamanho?: 'principal' | 'secundario') => {
      const item = lista.find(x => x.chave === chave)
      return item ? <Leitura estado={resumo[item.chave].estado} campo={item.campo} tamanho={tamanho} /> : null
    }
  const teto = env ? (env.limite_base ?? env.limite_mes) : 0
  const { horizontes, atalhos } = montarInicioNovo({
    chips,
    lerChip: ler(chips),
    lerRotina: ler(cartoes),
    visivel: chave => resumo[chave as keyof ResumoFamilia].estado !== 'restrito',
    casal,
    sobreHoje: env ? <SobreHoje e={env} placar={casal ? orc.valor?.placar : null} /> : null,
    mes:
      env && teto > 0 && !oculto
        ? {
            gasto: <Quantia campo={medida(orc, env.gasto_mes, 'reais')} />,
            teto: <Quantia campo={medida(orc, teto, 'reais')} />,
            fracao: env.gasto_mes / teto,
          }
        : null,
    destinoImoveis: { rota: 'guardado', secao: 'imoveis' },
  })
  return (
    <PrivacidadePropostas.Provider value={oculto}>
      <InicioNovo
        celular={celular}
        saudacao={familia?.membroNome ? `${saudacao()}, ${textoPrivado(familia.membroNome)}.` : undefined}
        horizontes={horizontes}
        atalhos={atalhos}
        anotar={env ? () => abrirLancar({ envelope: env.id }) : undefined}
        escritorio={<EscritorioInicio {...{ celular, hoje }} />}
        plano={
          casal && (
            <section className="j-plano" aria-labelledby="j-rumo" data-trilha="plano2029">
              <div className="j-plano-topo">
                <span className="j-plano-icone">
                  <Icone nome="plano2029" />
                </span>
                <h2 id="j-rumo">Rumo a 2029</h2>
              </div>
              <Trilha
                plano={cobertura}
                celular={celular}
                consultarMargem={() =>
                  document.querySelector<HTMLButtonElement>('[data-referencia="plano2029"]')?.click()
                }
              />
              <Linha2028Resumo />
              <a className="lnk" href={enderecoDestino(destinoPlano)}>
                Abrir Plano 2029 <Icone nome="abrir" size={16} />
              </a>
            </section>
          )
        }
        lancamentos={<UltimosLancamentos />}
        resumo={
          <ResumoApresentacao
            {...{ resumo, repetir, hoje, oculto }}
            jaMostrados={JA_NO_TOPO}
            informarSaldo={casal && api.salvarSaldoConta ? () => setSaldo(true) : undefined}
          />
        }
      />
      {saldo && <InformarSaldo fechar={() => setSaldo(false)} />}
    </PrivacidadePropostas.Provider>
  )
}

function InicioFamilia() {
  const { resumo, repetir, hoje, api, familia } = useResumoFamilia()
  const { oculto } = useOlhoApp()
  const celular = useCelular()
  const [saldo, setSaldo] = useState(false)
  const { chips, cartoes, cobertura, destinoPlano } = referencias(resumo, oculto)
  const casal = familia?.papel === 'casal'
  const envelopeHoje = resumo.podeGastarHoje.estado === 'restrito' ? null : resumo.podeGastarHoje.valor?.envelope
  return (
    <>
      <PrivacidadePropostas.Provider value={oculto}>
        <div className="j-inicio inicio-j" data-dispositivo={celular ? 'celular' : 'desktop'}>
          <section className="j-cena" aria-label="Painel do escritório">
            <div className="j-resumo" aria-label="Referências do dia" role="group">
              {chips
                .filter(({ chave }) => resumo[chave].estado !== 'restrito')
                .map(chip => (
                  <a
                    key={chip.chave}
                    href={enderecoDestino(chip.destino)}
                    className="j-chip"
                    data-referencia={chip.chave}
                  >
                    <span>
                      <Icone nome={chip.icone} size={15} />
                      {chip.titulo}
                    </span>
                    <Leitura estado={resumo[chip.chave].estado} campo={chip.campo} tamanho={chip.tamanho} />
                    {'legenda' in chip && <small>{chip.legenda}</small>}
                  </a>
                ))}
            </div>
            {envelopeHoje && <SobreHoje e={envelopeHoje} placar={casal ? resumo.podeGastarHoje.valor?.placar : null} />}
            {casal && <SetaDoMes />}
            <EscritorioInicio {...{ celular, hoje }} />
          </section>
          <section className="j-acompanhamento" aria-labelledby="j-rotinas">
            <h2 id="j-rotinas">Rotinas da família</h2>
            <div className="j-bento">
              {cartoes
                .filter(({ chave }) => resumo[chave].estado !== 'restrito')
                .map(({ chave, titulo, legenda, destino, campo, Figura }) => (
                  <article key={chave} className="j-cartao" data-rotina={chave}>
                    <div className="j-cartao-texto">
                      <h3>{titulo}</h3>
                      <p>{legenda}</p>
                      <Leitura estado={resumo[chave].estado} campo={campo} tamanho="secundario" />
                      <a href={enderecoDestino(destino)} aria-label={`Abrir ${titulo}`}>
                        Abrir <Icone nome="abrir" size={16} />
                      </a>
                    </div>
                    <div className="j-arte" aria-hidden="true">
                      <Figura />
                    </div>
                  </article>
                ))}
            </div>
          </section>
          {casal && (
            <section className="j-plano" aria-labelledby="j-rumo" data-trilha="plano2029">
              <div className="j-plano-topo">
                <span className="j-plano-icone">
                  <Icone nome="plano2029" />
                </span>
                <h2 id="j-rumo">Rumo a 2029</h2>
              </div>
              <Trilha
                plano={cobertura}
                celular={celular}
                consultarMargem={() =>
                  document.querySelector<HTMLAnchorElement>('[data-referencia="plano2029"]')?.focus()
                }
              />
              <Linha2028Resumo />
              <a className="lnk" href={enderecoDestino(destinoPlano)}>
                Abrir Plano 2029 <Icone nome="abrir" size={16} />
              </a>
            </section>
          )}
        </div>
      </PrivacidadePropostas.Provider>
      <div className="view inicio-f29 inicio-j-detalhes">
        <ResumoApresentacao
          {...{ resumo, repetir, hoje, oculto }}
          jaMostrados={JA_NO_TOPO}
          informarSaldo={casal && api.salvarSaldoConta ? () => setSaldo(true) : undefined}
        />
        <UltimosLancamentos />
      </div>
      {saldo && <InformarSaldo fechar={() => setSaldo(false)} />}
    </>
  )
}
