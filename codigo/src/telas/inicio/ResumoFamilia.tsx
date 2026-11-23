import { PONTOS_LONGOS } from '../../lib/olho'
import { useResumoFamilia } from '../../app/useResumoFamilia'
import { useOlhoApp, useSessaoAtual } from '../../app/contexto'
import { enderecoDestino, type DestinoResumo } from '../../app/destinos'
import { Icone, type NomeIcone } from '../../componentes/Icone'
import { dataConferencia, plural } from '../../lib/formato'
import type { CampoResumo, Dinheiro, FonteResumo, ResumoFamilia as Resumo } from '../../lib/resumo/tipos'
import { InformarSaldo } from '../planejamento/SaldoConta'
import { CasaDisponivelHoje } from '../../componentes/CasaDisponivelHoje'
import { PlanoSemMargem } from '../../componentes/PlanoSemMargem'
import { OrcamentoResumo, useOrcamentoAberto } from './OrcamentoResumo'
import { rotulosCasa } from '../../lib/resumo/casa'
import { tetoDoMes } from '../../lib/resumo/orcamento'
import { lazy, memo, Suspense, useCallback, useState } from 'react'
import './resumo.css'

const RitmoOrcamento = lazy(() => import('./RitmoOrcamento'))

const dinheiro = (v: number, oculto: boolean) =>
  oculto ? PONTOS_LONGOS : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const valor = (d: Dinheiro, oculto: boolean) => dinheiro(d.unidade === 'centavos' ? d.valor / 100 : d.valor, oculto)
/** a natureza do número na língua da família (o tipo interno não aparece na tela) */
const NATUREZA: Record<FonteResumo['natureza'], string> = {
  cadastrado: '', // o normal não ganha selo: só ficam "Já aconteceu", "Pode mudar" e "Estimativa"
  realizado: 'Já aconteceu',
  previsto: 'Pode mudar',
  estimado: 'Estimativa',
}
interface Item {
  chave: keyof Resumo
  titulo: string
  icone: NomeIcone
  destino: DestinoResumo
  numero: string
  frase: string
  acao?: string
}
const cartoes: { [K in keyof Resumo]: (campo: Resumo[K], hoje: string, oculto: boolean) => Item } = {
  saldoConta: (campo, _hoje, oculto) => ({
    chave: 'saldoConta',
    titulo: 'Saldo em conta',
    icone: 'orcamento',
    numero: campo.valor ? valor(campo.valor, oculto) : '',
    frase: 'Contas correntes cadastradas.',
    destino: { rota: 'planejamento', secao: 'saldo' },
  }),
  podeGastarHoje: (campo, _hoje, oculto) => {
    const p = campo.valor
    const privado = (t: string) => (oculto ? PONTOS_LONGOS : t)
    return {
      chave: 'podeGastarHoje',
      titulo: !oculto && p?.devendo ? 'Este mês fica devendo' : 'Hoje você pode gastar',
      icone: 'inicio',
      numero: p ? valor(p.valor, oculto) : '',
      frase: p ? privado(p.escopo === 'pessoal' ? 'Seu orçamento' : 'Orçamento familiar') : '',
      destino: { rota: 'orcamento', secao: 'orcamento' },
    }
  },
  faturas: (campo, _hoje, oculto) => {
    const f = campo.valor
    const privado = (t: string) => (oculto ? PONTOS_LONGOS : t)
    return {
      chave: 'faturas',
      titulo: 'Faturas a vencer/conferir',
      icone: 'cartoes',
      numero: f ? dinheiro(f.total, oculto) : '',
      frase: f
        ? privado(
            f.lista.length
              ? `${f.lista.length} a vencer ou conferir nos próximos 30 dias.`
              : 'Nenhuma fatura a conferir nos próximos 30 dias.',
          )
        : '',
      destino: { rota: 'cartoes', secao: 'fatura', entidade: f?.lista[0]?.cartao_id, periodo: f?.lista[0]?.mes },
    }
  },
  aplicacoes: (campo, _hoje, oculto) => ({
    chave: 'aplicacoes',
    titulo: 'Aplicações',
    icone: 'guardado',
    numero: campo.valor ? dinheiro(campo.valor.total, oculto) : '',
    frase: campo.valor ? `Rendeu hoje ${dinheiro(campo.valor.hoje, oculto)} líquido.` : '',
    destino: { rota: 'guardado', secao: 'aplicacoes' },
  }),
  recebimentos: (campo, hoje, oculto) => {
    const rec = campo.valor
    const privado = (t: string) => (oculto ? PONTOS_LONGOS : t)
    return {
      chave: 'recebimentos',
      titulo: 'Recebimentos previstos',
      icone: 'lancamentos',
      numero: rec ? dinheiro(rec.previsto, oculto) : '',
      frase: rec
        ? privado(
            [
              rec.garantido
                ? rec.garantido === rec.previsto
                  ? 'Tudo garantido'
                  : `Garantido ${dinheiro(rec.garantido, false)}`
                : '',
              rec.provavel ? `Provável ${dinheiro(rec.provavel, false)}` : '',
              rec.incerto ? `Incerto ${dinheiro(rec.incerto, false)}` : '',
              plural(rec.atrasados, 'atrasado', 'atrasados'),
            ]
              .filter(Boolean)
              .join(' · ') + '.',
          )
        : '',
      destino: { rota: 'planejamento', secao: 'recebimentos', periodo: hoje.slice(0, 7) },
    }
  },
  plano2029: (campo, _hoje, oculto) => {
    const plano = campo.valor
    const privado = (t: string) => (oculto ? PONTOS_LONGOS : t)
    return {
      chave: 'plano2029',
      titulo: 'Plano 2029',
      icone: 'plano2029',
      numero: plano
        ? privado(
            plano.falta_com_margem === null || plano.cobre_pct === null
              ? 'Informe o gasto necessário no objetivo'
              : `${plano.falta_com_margem > 0 ? 'Faltam' : 'Sobram'} ${dinheiro(Math.abs(plano.falta_com_margem) / 100, false)} por mês`,
          )
        : '',
      frase: [
        'Para viver de rendimentos em 2029, com margem de segurança e só com o que é garantido.',
        plano?.confirmar?.length ? `A confirmar: ${privado(plano.confirmar.join(';\n'))}.` : '',
        plano?.conferenciaAntiga ? 'Há números com mais de 60 dias.' : '',
      ]
        .filter(Boolean)
        .join('\n'),
      destino: { rota: 'planejamento', secao: 'plano2029' },
    }
  },
  casa: (campo, _hoje, oculto) => {
    const c = campo.valor
    const rotulos = c && rotulosCasa(c)
    const privado = (t: string) => (oculto ? PONTOS_LONGOS : t)
    return {
      chave: 'casa',
      titulo: 'Casa',
      icone: 'casa',
      numero: rotulos ? privado(rotulos.feira) : '',
      frase:
        c && rotulos
          ? privado(
              [
                plural(c.nota, 'nota pendente', 'notas pendentes'),
                rotulos.estoque,
                c.falta === null ? '' : plural(c.falta, 'item em falta', 'itens em falta'),
              ]
                .filter(Boolean)
                .join('\n'),
            )
          : '',
      destino: c?.tarefa
        ? { rota: 'escritorio', secao: 'tarefa', entidade: c.tarefa }
        : { rota: 'casa', secao: 'feira' },
    }
  },
  imoveis: (campo, _hoje, oculto) => {
    const privado = (t: string) => (oculto ? PONTOS_LONGOS : t)
    return {
      chave: 'imoveis',
      titulo: 'Imóveis',
      icone: 'imoveis',
      numero: campo.valor ? valor(campo.valor.valor, oculto) : '',
      frase: campo.valor
        ? privado(
            `Aluguel do mês, sem imposto: ${campo.valor.aluguel ? valor(campo.valor.aluguel, oculto) : 'não foi possível conferir'}.`,
          )
        : '',
      destino: { rota: 'guardado', secao: 'imoveis' },
    }
  },
  movimentacaoMes: (campo, hoje, oculto) => {
    const m = campo.valor
    const privado = (t: string) => (oculto ? PONTOS_LONGOS : t)
    return {
      chave: 'movimentacaoMes',
      titulo: 'Gastos e entradas do mês',
      icone: 'lancamentos',
      numero: m ? dinheiro(m.saldo, oculto) : '',
      frase: m ? privado(`Entrou ${dinheiro(m.entrou, false)} e saiu ${dinheiro(m.saiu, false)} até hoje.`) : '',
      destino: { rota: 'lancamentos', secao: 'mes', periodo: hoje.slice(0, 7) },
    }
  },
  desejos: (campo, _hoje, oculto) => {
    const d = campo.valor
    const privado = (t: string) => (oculto ? PONTOS_LONGOS : t)
    return {
      chave: 'desejos',
      titulo: 'Desejos',
      icone: 'desejos',
      numero: d ? privado(`${d.pensando} pensando · ${plural(d.combinados, 'combinado', 'combinados')}`) : '',
      frase: '',
      destino: { rota: 'desejos', secao: 'desejo', entidade: d?.primeiro },
    }
  },
  pendencias: (campo, _hoje, oculto) => {
    const fila = campo.valor
    const privado = (t: string) => (oculto ? PONTOS_LONGOS : t)
    return {
      chave: 'pendencias',
      titulo: 'Precisa de você',
      icone: 'escritorio',
      numero: fila ? privado(`${fila.total} na fila`) : '',
      frase: fila ? privado(fila.primeira?.assunto || 'Nenhuma tarefa pendente.') : '',
      destino: { rota: 'escritorio', secao: 'tarefa', entidade: fila?.primeira?.id },
    }
  },
}
const principais = ['podeGastarHoje', 'saldoConta', 'faturas', 'aplicacoes', 'recebimentos', 'plano2029'] as const
const complementares = ['casa', 'imoveis', 'movimentacaoMes', 'desejos', 'pendencias'] as const

function montarItem<K extends keyof Resumo>(chave: K, campo: Resumo[K], hoje: string, oculto: boolean) {
  return cartoes[chave](campo, hoje, oculto)
}
export function itensResumo(r: Resumo, hoje: string, oculto: boolean): Item[] {
  const [orcamento, saldo, ...outros] = principais
  return [saldo, orcamento, ...outros, ...complementares].map(chave => montarItem(chave, r[chave], hoje, oculto))
}
/** A linha pequena do cartão: o selo da natureza (só quando há o que dizer) e a conferência. */
function legendaDoCartao(campo: CampoResumo<unknown>, chave: keyof Resumo, oculto?: boolean) {
  const natureza = NATUREZA[campo.fonte[0]?.natureza ?? 'cadastrado']
  const conferencia = campo.conferidoEm
    ? `Conferido em ${oculto ? PONTOS_LONGOS : dataConferencia(campo.conferidoEm)}`
    : chave === 'saldoConta'
      ? 'Sem conferência registrada'
      : ''
  return { natureza, conferencia }
}
export function CartaoResumo({
  item,
  campo,
  repetir,
  extra,
  detalhes,
  oculto,
  semNumero,
}: {
  item: Item
  campo: CampoResumo<unknown>
  repetir: () => void
  extra?: React.ReactNode
  detalhes?: React.ReactNode
  oculto?: boolean
  /** o número já está no topo da tela: o cartão fica só com a frase, a conferência e os detalhes */ semNumero?: boolean
}) {
  const [aberto, setAberto] = useState(false)
  if (campo.estado === 'restrito') return null
  const pronto = campo.estado === 'pronto',
    erro = campo.estado === 'erro'
  const { natureza, conferencia } = pronto
    ? legendaDoCartao(campo, item.chave, oculto)
    : { natureza: '', conferencia: '' }
  return (
    <article className="resumo-item" data-bloco={item.chave} data-estado={campo.estado}>
      <a href={enderecoDestino(item.destino)} className="resumo-link">
        <span className="resumo-icone">
          <Icone nome={item.icone} size={20} aria-hidden="true" />
        </span>
        <span className="resumo-corpo">
          <span className="resumo-rotulo">{item.titulo}</span>
          {!(semNumero && pronto) && (
            <strong className="resumo-numero">
              {pronto ? (
                item.numero
              ) : campo.estado === 'carregando' ? (
                <span className="resumo-esqueleto" role="status">
                  Conferindo...
                </span>
              ) : erro ? (
                'Não foi possível conferir'
              ) : (
                campo.motivo || 'Dado indisponível'
              )}
            </strong>
          )}
          {pronto && <span className="resumo-frase">{item.frase}</span>}
          {pronto && (natureza || conferencia) && (
            <small className="resumo-meta">
              {natureza && <span className="resumo-natureza">{natureza}</span>}
              {natureza && conferencia ? ' · ' : ''}
              {conferencia}
            </small>
          )}
        </span>
        {!detalhes && <Icone nome="abrir" aria-hidden="true" />}
      </a>
      {erro && (
        <button className="lnk resumo-repetir" type="button" onClick={repetir}>
          Tentar de novo
        </button>
      )}
      {extra}
      {pronto && detalhes && (
        <>
          <button
            type="button"
            className="resumo-expandir"
            aria-expanded={aberto}
            aria-controls={`detalhes-${item.chave}`}
            onClick={() => setAberto(!aberto)}
          >
            {aberto ? 'Recolher detalhes' : 'Ver detalhes'}
            <Icone nome="abrir" aria-hidden="true" />
          </button>
          <div className="resumo-detalhes" id={`detalhes-${item.chave}`} hidden={!aberto}>
            {aberto && detalhes}
          </div>
        </>
      )}
    </article>
  )
}
const BlocoResumo = memo(function BlocoResumo({
  chave,
  campo,
  hoje,
  oculto,
  repetir,
  informarSaldo,
  orcamentoAberto,
  semNumero,
}: {
  chave: keyof Resumo
  campo: Resumo[keyof Resumo]
  hoje: string
  oculto: boolean
  repetir: (k: keyof Resumo) => void
  informarSaldo?: () => void
  orcamentoAberto?: boolean
  semNumero?: boolean
}) {
  const completo = montarItem(chave, campo, hoje, oculto)
  // sem o número repetido, o título diz o que o cartão ainda tem a mostrar
  const item =
    semNumero && chave === 'podeGastarHoje'
      ? { ...completo, titulo: 'Seu mês em detalhe' }
      : semNumero && chave === 'plano2029'
        ? { ...completo, titulo: 'Plano 2029: como a conta foi feita' }
        : completo
  const p = chave === 'podeGastarHoje' ? (campo as Resumo['podeGastarHoje']).valor : null
  const plano = chave === 'plano2029' ? (campo as Resumo['plano2029']).valor : null
  const meu = p?.envelope
  const minhaProjecao = p?.placar?.pessoas.find(pessoa => pessoa.eu)
  const valoresNoOrcamento =
    orcamentoAberto && meu
      ? {
          gasto: meu.gasto_mes,
          limite: tetoDoMes(meu),
          fecha: minhaProjecao && !minhaProjecao.passa ? minhaProjecao.fecha : undefined,
          excesso: minhaProjecao?.passa ? (minhaProjecao.excessoAtual ?? minhaProjecao.excessoPrevisto) : undefined,
        }
      : undefined
  const detalhesOrcamento = p ? (
    <>
      {p.envelope ? (
        <>
          <p>
            Hoje já saiu do limite:{' '}
            {p.envelope.gasto_hoje == null ? 'Ainda sem dado' : dinheiro(p.envelope.gasto_hoje, oculto)}
          </p>
          <h3>Ritmo do mês</h3>
          {oculto ? (
            <p>Gráfico e valores escondidos.</p>
          ) : (
            <div className="resumo-ritmo">
              <Suspense
                fallback={
                  <p className="resumo-esqueleto" role="status">
                    Conferindo o ritmo...
                  </p>
                }
              >
                <RitmoOrcamento envelope={p.envelope} hoje={hoje} valoresNoOrcamento={valoresNoOrcamento} />
              </Suspense>
            </div>
          )}
        </>
      ) : (
        <p>Detalhes do orçamento pessoal ainda sem dado.</p>
      )}
      <CasaDisponivelHoje valor={p.casa} />
      <a className="lnk" href={enderecoDestino(item.destino)}>
        Abrir meu orçamento
      </a>
    </>
  ) : undefined
  const detalhesPlano =
    plano && plano.cobre_pct !== null ? (
      oculto ? (
        <p>Valores escondidos</p>
      ) : (
        <p>
          <PlanoSemMargem centavos={plano.falta_sem_margem} />
        </p>
      )
    ) : undefined
  return (
    <CartaoResumo
      item={item}
      campo={campo}
      oculto={oculto}
      semNumero={semNumero}
      repetir={() => repetir(chave)}
      extra={
        informarSaldo ? (
          <button type="button" className="btn primary resumo-informar" onClick={informarSaldo}>
            Informar saldo
          </button>
        ) : chave === 'pendencias' ? (
          <a className="resumo-fila lnk" href="#/escritorio">
            Ver fila no Escritório
          </a>
        ) : undefined
      }
      detalhes={detalhesOrcamento ?? (semNumero ? undefined : detalhesPlano)}
    />
  )
})

/** Cartões que só repetem o que a tela já mostra em cima (número e frase): saem inteiros quando vêm em `jaMostrados`. */
const SO_REPETEM: readonly (keyof Resumo)[] = ['faturas', 'aplicacoes', 'pendencias']

/**
 * `jaMostrados`: blocos cujo número a tela já mostra acima (o Início novo tem as referências no topo, as rotinas e a fila).
 * Quem só repete some; quem tem mais a dizer (ritmo do mês, o que falta confirmar no plano) fica sem o número repetido.
 */
export function ResumoApresentacao({
  resumo,
  hoje,
  oculto,
  repetir,
  informarSaldo,
  jaMostrados = [],
}: {
  resumo: Resumo
  hoje: string
  oculto: boolean
  repetir: (k: keyof Resumo) => void
  informarSaldo?: () => void
  jaMostrados?: readonly (keyof Resumo)[]
}) {
  const orcamento = useOrcamentoAberto()
  const repetirOrcamento = useCallback(() => repetir('podeGastarHoje'), [repetir])
  const datas = Object.values(resumo)
    .flatMap(c => (c.estado === 'pronto' && c.conferidoEm ? [c.conferidoEm] : []))
    .sort()
  const bloco = (chave: keyof Resumo) =>
    jaMostrados.includes(chave) && SO_REPETEM.includes(chave) ? null : (
      <BlocoResumo
        key={chave}
        semNumero={jaMostrados.includes(chave)}
        chave={chave}
        campo={resumo[chave]}
        hoje={hoje}
        oculto={oculto}
        repetir={repetir}
        informarSaldo={chave === 'saldoConta' ? informarSaldo : undefined}
        orcamentoAberto={chave === 'podeGastarHoje' ? orcamento.aberto : undefined}
      />
    )
  return (
    <section className="resumo-familia" aria-label="Resumo da família">
      <header>
        <h2 className="sec-t">Resumo da família</h2>
        <p className="resumo-conferencia">
          {datas.length
            ? `Conferido em ${oculto ? PONTOS_LONGOS : dataConferencia(datas[0], hoje)}`
            : 'Nenhum número conferido manualmente ainda'}
        </p>
      </header>
      <div className="resumo-grade">{principais.map(bloco)}</div>
      <div className="resumo-complemento">{complementares.map(bloco)}</div>
      {resumo.plano2029.estado !== 'restrito' && <p className="sub">Dívidas ainda não entram neste resumo.</p>}
      <OrcamentoResumo campo={resumo.podeGastarHoje} hoje={hoje} repetir={repetirOrcamento} {...orcamento} />
    </section>
  )
}
function ResumoAutorizado() {
  const { resumo, repetir, hoje, api, familia } = useResumoFamilia()
  const { oculto } = useOlhoApp()
  const [saldo, setSaldo] = useState(false)
  const abrirSaldo = useCallback(() => setSaldo(true), [])
  return (
    <>
      <ResumoApresentacao
        resumo={resumo}
        repetir={repetir}
        hoje={hoje}
        oculto={oculto}
        informarSaldo={familia?.papel === 'casal' && api.salvarSaldoConta ? abrirSaldo : undefined}
      />
      {saldo && <InformarSaldo fechar={() => setSaldo(false)} />}
    </>
  )
}
export function ResumoFamilia() {
  const { familia } = useSessaoAtual()
  return familia && familia.papel !== 'equipe' ? (
    <ResumoAutorizado key={`${familia.id}:${familia.membroId}:${familia.papel}`} />
  ) : null
}
