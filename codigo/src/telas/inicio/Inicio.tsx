import { useEffect, useState } from 'react'
import { enderecoDestino, type DestinoResumo } from '../../app/destinos'
import { useApp } from '../../app/contexto'
import { useResumoFamilia } from '../../app/useResumoFamilia'
import { Icone, type NomeIcone } from '../../componentes/Icone'
import { SemAplicacoes, SemCartoes, SemGastos, SemImoveis } from '../../componentes/ilustracoes/figuras'
import type { CampoResumo, ResumoFamilia } from '../../lib/resumo/tipos'
import { PrivacidadePropostas } from '../../propostas/comuns/privacidade'
import { Quantia } from '../../propostas/j/interface'
import { diferenca } from '../../propostas/j/modelo'
import { Trilha } from '../../propostas/j/Trilha'
import { EscritorioInicio } from './EscritorioInicio'
import { InformarSaldo } from '../planejamento/SaldoConta'
import { ResumoApresentacao } from './ResumoFamilia'
import { UltimosLancamentos } from './UltimosLancamentos'
import '../../propostas/j/proposta.css'
import './inicio-j.css'

export { porDiaDe } from '../../lib/resumo/porDia'
export { SemGastosInicio } from './UltimosLancamentos'

function medida<U extends 'reais' | 'centavos' | 'percentual' | 'quantidade'>(
  fonte: CampoResumo<unknown>, valor: number | null | undefined, unidade: U,
) {
  const meta = { unidade, natureza: fonte.fonte[0]?.natureza ?? 'cadastrado' as const }
  return valor != null && Number.isFinite(valor)
    ? { ...meta, estado: 'pronto' as const, valor }
    : { ...meta, estado: 'indisponivel' as const, valor: null }
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
  const destinoFaturas = { rota: 'cartoes', secao: 'fatura', entidade: primeira?.cartao_id, periodo: primeira?.mes } as const
  return {
    cobertura, destinoPlano,
    chips: [
      { chave: 'podeGastarHoje', titulo: 'Limite de hoje', icone: 'orcamento', destino: destinoOrcamento, campo: medida(orcamento, orcamento.valor?.valor.valor, 'reais'), tamanho: 'principal' },
      { chave: 'plano2029', titulo: 'Plano 2029', icone: 'plano2029', destino: destinoPlano, campo: oficial.campo, legenda: oficial.rotulo + ' · com margem', tamanho: 'principal' },
      { chave: 'aplicacoes', titulo: 'Total aplicado', icone: 'guardado', destino: destinoAplicacoes, campo: medida(aplicacoes, aplicacoes.valor?.total, 'reais'), tamanho: 'secundario' },
      { chave: 'faturas', titulo: 'Faturas previstas', icone: 'cartoes', destino: destinoFaturas, campo: medida(faturas, faturas.valor?.total, 'reais'), tamanho: 'secundario' },
    ] as const satisfies readonly { chave: keyof ResumoFamilia; titulo: string; icone: NomeIcone; destino: DestinoResumo; campo: Parameters<typeof Quantia>[0]['campo']; tamanho: 'principal' | 'secundario'; legenda?: string }[],
    cartoes: [
      { chave: 'podeGastarHoje', titulo: 'Meu orçamento', legenda: 'Já gasto hoje', destino: destinoOrcamento, campo: medida(orcamento, orcamento.valor?.envelope?.gasto_hoje, 'reais'), Figura: SemGastos },
      { chave: 'aplicacoes', titulo: 'Aplicações', legenda: 'Rendimento líquido de hoje', destino: destinoAplicacoes, campo: medida(aplicacoes, aplicacoes.valor?.hoje, 'reais'), Figura: SemAplicacoes },
      { chave: 'faturas', titulo: 'Faturas', legenda: 'Faturas a vencer ou conferir', destino: destinoFaturas, campo: medida(faturas, faturas.valor?.lista.length, 'quantidade'), Figura: SemCartoes },
      { chave: 'imoveis', titulo: 'Imóveis', legenda: 'Aluguel líquido estimado', destino: { rota: 'guardado', secao: 'imoveis' }, campo: medida(imoveis, aluguel?.valor, aluguel?.unidade ?? 'reais'), Figura: SemImoveis },
    ] as const,
  }
}

function Leitura({ estado, campo, tamanho }: { estado: CampoResumo<unknown>['estado'] } & Parameters<typeof Quantia>[0]) {
  if (estado === 'carregando') return <span className="j-sem-dado" role="status">Conferindo…</span>
  if (estado === 'erro') return <span className="j-sem-dado">Não foi possível conferir</span>
  return <Quantia {...{ campo, tamanho }} />
}

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

export function Inicio() {
  const { familia, sessao } = useApp()
  if (!familia || familia.papel === 'equipe') return null
  return <InicioFamilia key={JSON.stringify([sessao?.userId, familia.id, familia.membroId, familia.papel])} />
}

function InicioFamilia() {
  const { resumo, repetir, hoje, api, familia } = useResumoFamilia()
  const { oculto } = useApp()
  const celular = useCelular()
  const [saldo, setSaldo] = useState(false)
  const { chips, cartoes, cobertura, destinoPlano } = referencias(resumo, oculto)
  const casal = familia?.papel === 'casal'
  return <>
    <PrivacidadePropostas.Provider value={oculto}>
      <div className="j-inicio inicio-j" data-dispositivo={celular ? 'celular' : 'desktop'}>
        <section className="j-cena" aria-label="Painel do escritório">
          <div className="j-resumo" aria-label="Referências do dia" role="group">
            {chips.filter(({ chave }) => resumo[chave].estado !== 'restrito').map(chip => (
              <a key={chip.chave} href={enderecoDestino(chip.destino)} className="j-chip" data-referencia={chip.chave}>
                <span><Icone nome={chip.icone} size={15} />{chip.titulo}</span>
                <Leitura estado={resumo[chip.chave].estado} campo={chip.campo} tamanho={chip.tamanho} />
                {'legenda' in chip && <small>{chip.legenda}</small>}
              </a>
            ))}
          </div>
          <EscritorioInicio {...{ celular, hoje }} />
        </section>
        <section className="j-acompanhamento" aria-labelledby="j-rotinas">
          <h2 id="j-rotinas">Rotinas da família</h2>
          <div className="j-bento">
            {cartoes.filter(({ chave }) => resumo[chave].estado !== 'restrito').map(({ chave, titulo, legenda, destino, campo, Figura }) => (
              <article key={chave} className="j-cartao" data-rotina={chave}>
                <div className="j-cartao-texto">
                  <h3>{titulo}</h3><p>{legenda}</p>
                  <Leitura estado={resumo[chave].estado} campo={campo} tamanho="secundario" />
                  <a href={enderecoDestino(destino)} aria-label={`Abrir ${titulo}`}>Ver área <Icone nome="abrir" size={16} /></a>
                </div>
                <div className="j-arte" aria-hidden="true"><Figura /></div>
              </article>
            ))}
          </div>
        </section>
        {casal && <section className="j-plano" aria-labelledby="j-rumo" data-trilha="plano2029">
          <div className="j-plano-topo"><span className="j-plano-icone"><Icone nome="plano2029" /></span><h2 id="j-rumo">Rumo a 2029</h2></div>
          <Trilha plano={cobertura} celular={celular} consultarMargem={() => document.querySelector<HTMLAnchorElement>('[data-referencia="plano2029"]')?.focus()} />
          <a className="lnk" href={enderecoDestino(destinoPlano)}>Abrir Plano 2029 <Icone nome="abrir" size={16} /></a>
        </section>}
      </div>
    </PrivacidadePropostas.Provider>
    <div className="view inicio-f29 inicio-j-detalhes">
      <ResumoApresentacao {...{ resumo, repetir, hoje, oculto }} informarSaldo={casal && api.salvarSaldoConta ? () => setSaldo(true) : undefined} />
      <UltimosLancamentos />
    </div>
    {saldo && <InformarSaldo fechar={() => setSaldo(false)} />}
  </>
}
