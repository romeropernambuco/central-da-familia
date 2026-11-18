import { ArrowDownLeft, CreditCard, Flag, Landmark, PiggyBank, Wallet } from 'lucide-react'
import { CasaVazia, SemCartoes } from '../../componentes/ilustracoes'
import type { DadosInicio } from '../dadosExemplo'
import { Valor } from '../comuns/privacidade'

type CampoFinanceiro = Parameters<typeof Valor>[0]['campo']

export function Medida({ campo, principal = false }: { campo: CampoFinanceiro; principal?: boolean }) {
  return campo.estado === 'pronto'
    ? <Valor campo={campo} className={principal ? 'm-numero-principal' : 'm-numero-secundario'} />
    : <span className="m-ausente">Ainda sem dado</span>
}

const marcos = [2026, 2027, 2028, 2029]
const ponto = (avanco: number) => ({ x: 18 + 284 * avanco, y: 92 - 65 * avanco ** 2 })

function Rumo({ titulo, cobertura, oculto }: {
  titulo: string
  cobertura: DadosInicio['plano2029']['progressao']
  oculto: boolean
}) {
  const fracao = !oculto && cobertura.estado === 'pronto' ? Math.max(0, Math.min(cobertura.valor / 100, 1)) : null
  const atual = fracao === null ? null : ponto(fracao)
  return <section className="m-cartao m-rumo" aria-labelledby={titulo}>
    <h2 id={titulo} tabIndex={-1}>Rumo a 2029</h2>
    <figure>
      <figcaption>
        <div>
          <p className="m-contexto">{atual ? 'Você está aqui' : 'Cobertura atual'}</p>
          <Medida campo={cobertura} principal />
          <p className="m-legenda">da meta de renda</p>
        </div>
        <div className="m-chegada">
          <p className="m-contexto"><Flag aria-hidden="true" size={16} /> Destino</p>
          <strong>Viver de rendimentos</strong>
        </div>
      </figcaption>
      <svg className="m-trilha" viewBox="0 0 320 110" aria-hidden="true" focusable="false">
        <path className="m-caminho" d="M18 92 Q160 92 302 27" />
        {atual && fracao !== null && fracao > 0 && <path className="m-avanco"
          d={`M18 92 Q${ponto(fracao / 2).x} 92 ${atual.x} ${atual.y}`} />}
        {marcos.map((ano, indice) => {
          const { x, y } = ponto(indice / (marcos.length - 1))
          return <circle key={ano} className="m-marco" cx={x} cy={y} r="3.5" />
        })}
        <path className="m-bandeira" d="M302 21 V6 H284 L289 11 L284 16 H302" />
        {atual && <circle className="m-posicao" cx={atual.x} cy={atual.y} r="7.5" />}
      </svg>
      <ol className="m-anos" aria-label="Marcos do calendário">
        {marcos.map(ano => <li key={ano}>{ano}</li>)}
      </ol>
    </figure>
  </section>
}

export function Financeiro({ dados, alvo, oculto }: {
  dados: DadosInicio
  alvo: (destino: 'orcamento' | 'faturas' | 'plano' | 'referencias') => string
  oculto: boolean
}) {
  const plano = dados.plano2029.faltamPorMesComMargem
  const descricaoPlano = oculto || plano.estado !== 'pronto' ? 'Diferença mensal com margem'
    : plano.valor < 0 ? 'Sobra mensal com margem' : plano.valor === 0 ? 'Meta mensal coberta, com margem' : 'Falta por mês, com margem'
  const referencias = [
    { nome: 'Saldo em conta', Icone: Landmark, campo: dados.saldoConta, legenda: 'Saldo cadastrado' },
    { nome: 'Recebimentos', Icone: ArrowDownLeft, campo: dados.recebimentos.garantido, legenda: 'Garantidos no mês' },
    { nome: 'Aplicações', Icone: PiggyBank, campo: dados.aplicacoes.total, legenda: 'Total aplicado' },
    { nome: 'Plano 2029', Icone: Flag, campo: plano.estado === 'pronto' ? { ...plano, valor: Math.abs(plano.valor) } : plano,
      legenda: descricaoPlano },
  ]
  const cartoes = [
    { destino: 'orcamento', nome: 'Hoje você pode gastar', Icone: Wallet, Figura: CasaVazia,
      campo: dados.hojePodeGastar.valor, legenda: 'Estimativa do seu orçamento' },
    { destino: 'faturas', nome: 'Faturas', Icone: CreditCard, Figura: SemCartoes,
      campo: dados.faturas.total, legenda: 'Total previsto' },
  ] as const

  return <div className="m-financeiro">
    <Rumo titulo={alvo('plano')} cobertura={dados.plano2029.progressao} oculto={oculto} />
    <div className="m-bento">
      {cartoes.map(({ destino, nome, Icone, Figura, campo, legenda }) => <article className="m-cartao m-ilustrado" key={destino}>
        <div className="m-arte" aria-hidden="true"><Figura /></div>
        <span className="m-icone"><Icone aria-hidden="true" size={20} /></span>
        <h2 id={alvo(destino)} tabIndex={-1}>{nome}</h2>
        <p className="m-medida"><Medida campo={campo} principal /></p>
        <p className="m-legenda">{legenda}</p>
      </article>)}
    </div>
    <section className="m-cartao m-referencias" aria-labelledby={alvo('referencias')}>
      <h2 id={alvo('referencias')} tabIndex={-1}>Referências</h2>
      <dl>
        {referencias.map(({ nome, Icone, campo, legenda }) => <div key={nome} className="m-referencia">
          <dt><Icone aria-hidden="true" size={18} />{nome}</dt>
          <dd><Medida campo={campo} /></dd>
          <dd className="m-legenda">{legenda}</dd>
        </div>)}
      </dl>
    </section>
  </div>
}
