import { ArrowDownLeft, Building2, CreditCard, Flag, Landmark, PiggyBank, Wallet, WalletCards } from 'lucide-react'
import { CasaVazia, SemAplicacoes, SemCartoes, SemImoveis, SemRecebimentos } from '../../componentes/ilustracoes'
import type { DadosInicio } from '../dadosExemplo'
import { Valor } from '../comuns/privacidade'

type CampoFinanceiro = Parameters<typeof Valor>[0]['campo']

export function Medida({ campo, principal = false }: { campo: CampoFinanceiro; principal?: boolean }) {
  return campo.estado === 'pronto' ? (
    <Valor campo={campo} className={principal ? 'm-numero-principal' : 'm-numero-secundario'} />
  ) : (
    <span className="m-ausente">Ainda sem dado</span>
  )
}

const marcos = [2026, 2027, 2028, 2029]
const pontoHorizontal = (avanco: number) => ({ x: 18 + 284 * avanco, y: 92 - 65 * avanco ** 2 })
const pontoVertical = (avanco: number) => ({ x: 64 + 144 * avanco ** 2, y: 358 - 310 * avanco })

export function Rumo({
  titulo,
  cobertura,
  oculto,
  celular = false,
}: {
  titulo: string
  cobertura: DadosInicio['plano2029']['progressao']
  oculto: boolean
  celular?: boolean
}) {
  const ponto = celular ? pontoVertical : pontoHorizontal
  const fracao = !oculto && cobertura.estado === 'pronto' ? Math.max(0, Math.min(cobertura.valor / 100, 1)) : null
  const atual = fracao === null ? null : ponto(fracao)
  return (
    <section className="m-cartao m-rumo" aria-labelledby={titulo}>
      <h2 id={titulo} tabIndex={-1}>
        Rumo a 2029
      </h2>
      <figure>
        <figcaption>
          <div>
            <p className="m-contexto">{atual ? 'Você está aqui' : 'Cobertura atual'}</p>
            <Medida campo={cobertura} principal />
            <p className="m-legenda">da meta de renda</p>
          </div>
          <div className="m-chegada">
            <p className="m-contexto">
              <Flag aria-hidden="true" size={16} /> Destino
            </p>
            <strong>Viver de rendimentos</strong>
          </div>
        </figcaption>
        <svg
          className="m-trilha"
          viewBox={celular ? '0 0 300 400' : '0 0 320 110'}
          aria-hidden="true"
          focusable="false"
        >
          <path className="m-caminho" d={celular ? 'M64 358 Q64 203 208 48' : 'M18 92 Q160 92 302 27'} />
          {atual && fracao !== null && fracao > 0 && (
            <path
              className="m-avanco"
              d={
                celular
                  ? `M64 358 Q64 ${ponto(fracao / 2).y} ${atual.x} ${atual.y}`
                  : `M18 92 Q${ponto(fracao / 2).x} 92 ${atual.x} ${atual.y}`
              }
            />
          )}
          {marcos.map((ano, indice) => {
            const { x, y } = ponto(indice / (marcos.length - 1))
            if (celular)
              return (
                <g key={ano}>
                  <circle className="m-marco" cx={x} cy={y} r="5" />
                  <text className="m-ano-trilha" x={x + 22} y={y + 6}>
                    {ano}
                  </text>
                </g>
              )
            return <circle key={ano} className="m-marco" cx={x} cy={y} r="3.5" />
          })}
          <path
            className="m-bandeira"
            d={celular ? 'M208 39 V19 H184 L190 25 L184 31 H208' : 'M302 21 V6 H284 L289 11 L284 16 H302'}
          />
          {atual && <circle className="m-posicao" cx={atual.x} cy={atual.y} r="7.5" />}
        </svg>
        <ol className="m-anos" aria-label="Marcos do calendário">
          {marcos.map(ano => (
            <li key={ano}>{ano}</li>
          ))}
        </ol>
        {celular && (
          <p className="m-legenda">
            A trilha mostra a cobertura estimada da meta de renda. Os anos são marcos do plano.
          </p>
        )}
      </figure>
    </section>
  )
}

export function Referencias({ dados, titulo, oculto }: { dados: DadosInicio; titulo: string; oculto: boolean }) {
  const plano = dados.plano2029.faltamPorMesComMargem
  const descricaoPlano =
    oculto || plano.estado !== 'pronto'
      ? 'Diferença mensal com margem'
      : plano.valor < 0
        ? 'Sobra mensal com margem'
        : plano.valor === 0
          ? 'Meta mensal coberta, com margem'
          : 'Falta por mês, com margem'
  const referencias = [
    { nome: 'Saldo em conta', Icone: Landmark, campo: dados.saldoConta, legenda: 'Saldo cadastrado' },
    { nome: 'Recebimentos', Icone: ArrowDownLeft, campo: dados.recebimentos.garantido, legenda: 'Garantidos no mês' },
    { nome: 'Aplicações', Icone: PiggyBank, campo: dados.aplicacoes.total, legenda: 'Total aplicado' },
    {
      nome: 'Plano 2029',
      Icone: Flag,
      campo: plano.estado === 'pronto' ? { ...plano, valor: Math.abs(plano.valor) } : plano,
      legenda: descricaoPlano,
    },
  ]
  return (
    <section className="m-cartao m-referencias" aria-labelledby={titulo}>
      <h2 id={titulo} tabIndex={-1}>
        Referências
      </h2>
      <dl>
        {referencias.map(({ nome, Icone, campo, legenda }) => (
          <div key={nome} className="m-referencia">
            <dt>
              <Icone aria-hidden="true" size={18} />
              {nome}
            </dt>
            <dd>
              <Medida campo={campo} />
            </dd>
            <dd className="m-legenda">{legenda}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

type Motor = 'orcamento' | 'aplicacoes' | 'imoveis' | 'receitas' | 'faturas'

export function Bento({
  dados,
  alvo,
  celular = false,
}: {
  dados: DadosInicio
  alvo: (destino: Motor) => string
  celular?: boolean
}) {
  const orcamento = {
    destino: 'orcamento',
    nome: 'Hoje você pode gastar',
    Icone: Wallet,
    Figura: CasaVazia,
    campo: dados.hojePodeGastar.valor,
    legenda: 'Estimativa do seu orçamento',
  } as const
  const faturas = {
    destino: 'faturas',
    nome: 'Faturas',
    Icone: CreditCard,
    Figura: SemCartoes,
    campo: dados.faturas.total,
    legenda: 'Total previsto',
  } as const
  const cartoes = celular
    ? ([
        orcamento,
        {
          destino: 'aplicacoes',
          nome: 'Aplicações',
          Icone: PiggyBank,
          Figura: SemAplicacoes,
          campo: dados.aplicacoes.rendeuHoje,
          legenda: 'Rendimento líquido de hoje',
        },
        {
          destino: 'imoveis',
          nome: 'Imóveis',
          Icone: Building2,
          Figura: SemImoveis,
          campo: dados.imoveis.aluguelLiquidoEstimado,
          legenda: 'Aluguel líquido estimado',
        },
        {
          destino: 'receitas',
          nome: 'Receitas',
          Icone: WalletCards,
          Figura: SemRecebimentos,
          campo: dados.recebimentos.previsto,
          legenda: 'Recebimentos previstos no mês',
        },
        faturas,
      ] as const)
    : [orcamento, faturas]
  const Titulo = celular ? 'h3' : 'h2'

  return (
    <div className="m-bento">
      {cartoes.map(({ destino, nome, Icone, Figura, campo, legenda }) => (
        <article className="m-cartao m-ilustrado" key={destino}>
          <div className="m-arte" aria-hidden="true">
            <Figura />
          </div>
          <span className="m-icone">
            <Icone aria-hidden="true" size={20} />
          </span>
          <Titulo id={alvo(destino)} tabIndex={-1}>
            {nome}
          </Titulo>
          <p className="m-medida">
            <Medida campo={campo} principal />
          </p>
          <p className="m-legenda">{legenda}</p>
        </article>
      ))}
    </div>
  )
}

export function Financeiro({
  dados,
  alvo,
  oculto,
}: {
  dados: DadosInicio
  alvo: (destino: Motor | 'plano' | 'referencias') => string
  oculto: boolean
}) {
  return (
    <div className="m-financeiro">
      <Rumo titulo={alvo('plano')} cobertura={dados.plano2029.progressao} oculto={oculto} />
      <Bento dados={dados} alvo={alvo} />
      <Referencias dados={dados} titulo={alvo('referencias')} oculto={oculto} />
    </div>
  )
}
