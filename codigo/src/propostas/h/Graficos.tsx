import type { ReactNode } from 'react'
import { Icone, type NomeIcone } from '../../componentes/Icone'
import type { DadosInicio } from '../dadosExemplo'
import { NumeroFinanceiro, useValoresOcultos, Valor } from '../comuns/privacidade'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const mes = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' })
const mesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
const emCentavos = (valor: number) => Math.round(valor * 100)
const arco = 'M 28 112 A 112 112 0 0 1 252 112'

function Instrumento({
  titulo,
  icone,
  tipo,
  children,
}: {
  titulo: string
  icone: NomeIcone
  tipo: string
  children: ReactNode
}) {
  return (
    <figure className="h-instrumento" data-instrumento={tipo}>
      <h3>
        <span className="h-icone">
          <Icone nome={icone} size={18} />
        </span>
        {titulo}
      </h3>
      {children}
    </figure>
  )
}

function Plot({ children, classe = '' }: { children: ReactNode; classe?: string }) {
  return (
    <svg viewBox="0 0 280 124" className={`h-plot ${classe}`} aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

function SemLeitura({ texto, privado = false }: { texto: string; privado?: boolean }) {
  return (
    <>
      <div className="h-sem-leitura" aria-hidden="true">
        <Icone nome={privado ? 'olhoFechado' : 'painel'} size={24} />
      </div>
      <figcaption>{texto}</figcaption>
    </>
  )
}

export function Aplicacoes({ dados }: { dados: DadosInicio['aplicacoes'] }) {
  const oculto = useValoresOcultos()
  const campo = dados.serieSaldo30Dias
  const serie = campo.valor ?? []
  let conteudo: ReactNode
  if (oculto) {
    conteudo = <SemLeitura texto="Leitura da carteira oculta." privado />
  } else if (serie.length < 2 || new Set(serie.map(p => p.data)).size < 2) {
    const texto =
      campo.estado === 'indisponivel'
        ? 'Histórico de aplicações indisponível.'
        : 'Histórico insuficiente para mostrar a evolução.'
    conteudo = <SemLeitura texto={texto} />
  } else {
    const ordenada = [...serie].sort((a, b) => a.data.localeCompare(b.data))
    const primeiro = ordenada[0]
    const ultimo = ordenada[ordenada.length - 1]
    const data = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
    const duracao = data(ultimo.data) - data(primeiro.data)
    const saldos = ordenada.map(p => p.saldo)
    const minimo = Math.min(...saldos)
    const amplitude = Math.max(...saldos) - minimo
    const pontos = ordenada.map(p => [
      8 + (264 * (data(p.data) - data(primeiro.data))) / duracao,
      amplitude ? 105 - (86 * (p.saldo - minimo)) / amplitude : 62,
    ])
    const linha = pontos.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
    const yFinal = pontos[pontos.length - 1][1]
    const delta = emCentavos(ultimo.saldo) - emCentavos(primeiro.saldo)
    conteudo = (
      <>
        <Plot>
          <path className="h-grade" d="M8 19H272 M8 62H272 M8 105H272" />
          <polygon className="h-area" points={`8,114 ${linha} 272,114`} />
          <polyline className="h-traço" points={linha} />
          <circle className="h-marca" cx="272" cy={yFinal} r="4" />
        </Plot>
        <div className="h-eixo" aria-hidden="true">
          <span>Início do período</span>
          <span>Último registro</span>
        </div>
        <figcaption>
          {delta === 0 ? (
            'O saldo terminou o período no mesmo valor.'
          ) : (
            <>
              O saldo {delta > 0 ? 'subiu' : 'caiu'}{' '}
              <NumeroFinanceiro className="h-secundario">{moeda.format(Math.abs(delta) / 100)}</NumeroFinanceiro> no
              período.
            </>
          )}
        </figcaption>
      </>
    )
  }
  return (
    <Instrumento tipo="carteira" titulo="Aplicações" icone="guardar">
      <p className="h-recorte">Saldo · últimos 30 dias</p>
      {conteudo}
    </Instrumento>
  )
}

export function Ritmo({ dados }: { dados: DadosInicio['hojePodeGastar']['ritmoMes'] }) {
  const oculto = useValoresOcultos()
  const serie = dados.serieDiaria.valor
  const limite = dados.limite.valor
  let conteudo: ReactNode
  if (oculto) {
    conteudo = <SemLeitura texto="Leitura do mês oculta." privado />
  } else if (serie === null || limite === null || limite <= 0 || !serie.length) {
    const texto =
      limite === 0
        ? 'Defina um limite positivo para comparar os gastos.'
        : dados.serieDiaria.estado === 'vazio' && limite !== null
          ? 'Ainda sem gastos à vista registrados neste mês.'
          : 'Gastos ou limite do envelope indisponíveis.'
    conteudo = <SemLeitura texto={texto} />
  } else {
    const gasto = serie.reduce((total, p) => total + emCentavos(p.valor), 0)
    const teto = emCentavos(limite)
    const minimo = Math.min(0, gasto)
    const amplitude = Math.max(teto, gasto) - minimo
    const x = (valor: number) => 8 + (264 * (valor - minimo)) / amplitude
    const zero = x(0)
    const fim = x(gasto)
    const leitura =
      gasto < 0
        ? 'Estornos superam os gastos à vista registrados.'
        : gasto > teto
          ? 'Os gastos à vista passaram do limite.'
          : gasto === teto
            ? 'Os gastos à vista atingiram o limite.'
            : gasto * 2 >= teto
              ? 'Os gastos à vista já chegaram à metade do limite ou mais.'
              : 'Os gastos à vista estão abaixo da metade do limite.'
    conteudo = (
      <>
        <Plot>
          <path className="h-grade" d="M8 38H272 M8 84H272" />
          <path className="h-referencia" d={`M${x(teto)} 24V98`} />
          <rect className="h-tinta" x={Math.min(zero, fim)} y="49" width={Math.abs(fim - zero)} height="24" rx="3" />
          <circle className="h-marca" cx={fim} cy="61" r="4" />
        </Plot>
        <div className="h-eixo" aria-hidden="true">
          <span>
            <i className="h-amostra" /> Gasto à vista
          </span>
          <span>
            <i className="h-amostra h-amostra-limite" /> Limite
          </span>
        </div>
        <figcaption>{leitura}</figcaption>
      </>
    )
  }
  return (
    <Instrumento tipo="ritmo" titulo="Ritmo do mês" icone="painel">
      <p className="h-recorte">Seu envelope · gastos à vista</p>
      {conteudo}
    </Instrumento>
  )
}

export function Plano({ dados }: { dados: DadosInicio['plano2029'] }) {
  const oculto = useValoresOcultos()
  const progresso = dados.progressao.valor
  const cenario = dados.cenario.valor
  return (
    <Instrumento tipo="plano" titulo="Plano 2029" icone="plano2029">
      <p className="h-recorte">Meta de renda mensal</p>
      {oculto ? (
        <SemLeitura texto="Leitura do plano oculta." privado />
      ) : progresso === null || !cenario ? (
        <SemLeitura texto="Cobertura da meta indisponível." />
      ) : (
        <>
          <Plot classe="h-plot-arco">
            <path d={arco} className="h-trilho" />
            {progresso > 0 && (
              <path
                d={arco}
                pathLength="100"
                strokeDasharray={`${Math.min(100, progresso)} 100`}
                className="h-progresso"
              />
            )}
          </Plot>
          <figcaption className="h-frase-plano">
            <Valor campo={dados.progressao} className="h-secundario" /> da meta com margem no cenário {cenario}.
          </figcaption>
        </>
      )}
    </Instrumento>
  )
}

export function Faturas({ dados }: { dados: DadosInicio['faturas'] }) {
  const oculto = useValoresOcultos()
  const campo = dados.proximas
  let conteudo: ReactNode
  if (oculto) {
    conteudo = <SemLeitura texto="Leitura das faturas oculta." privado />
  } else if (campo.estado !== 'pronto' || !campo.valor.length) {
    conteudo = (
      <SemLeitura
        texto={
          campo.estado === 'indisponivel' ? 'Próximas faturas indisponíveis.' : 'Nenhuma fatura na janela consultada.'
        }
      />
    )
  } else if (campo.valor.some(f => f.valor.estado !== 'pronto' || f.vencimento.estado !== 'pronto')) {
    conteudo = <SemLeitura texto="Há faturas sem valor ou vencimento confirmado para esta leitura." />
  } else {
    const totais = new Map<string, number>()
    for (const f of campo.valor) {
      if (f.valor.valor === null || f.vencimento.valor === null) continue
      const chave = f.vencimento.valor.slice(0, 7)
      totais.set(chave, (totais.get(chave) ?? 0) + emCentavos(f.valor.valor))
    }
    const meses = [...totais].sort(([a], [b]) => a.localeCompare(b))
    const maior = meses.reduce((a, b) => (b[1] > a[1] ? b : a))
    const minimo = Math.min(0, ...totais.values())
    const amplitude = Math.max(0, maior[1]) - minimo
    const y = (valor: number) => (amplitude ? 110 - (90 * (valor - minimo)) / amplitude : 110)
    const passo = 264 / meses.length
    const dataDoMes = (chave: string) => new Date(`${chave}-01T00:00:00Z`)
    const rotulo = (chave: string) => mes.format(dataDoMes(chave))
    const maiores = meses.filter(([, total]) => total === maior[1])
    const mesesDoEmpate = maiores.map(([chave]) => rotulo(chave))
    const ultimoMesDoEmpate = mesesDoEmpate.pop()
    conteudo = (
      <>
        <Plot>
          <path className="h-grade" d="M8 20H272 M8 65H272" />
          <path className="h-referencia" d={`M8 ${y(0)}H272`} />
          {meses.map(([chave, total], i) => (
            <rect
              key={chave}
              className={total === maior[1] ? 'h-tinta' : 'h-barra-secundaria'}
              x={8 + passo * (i + 0.22)}
              y={Math.min(y(0), y(total))}
              width={passo * 0.56}
              height={Math.abs(y(total) - y(0))}
              rx="3"
            />
          ))}
        </Plot>
        <div className="h-eixo h-eixo-meses" aria-hidden="true">
          {meses.map(([chave]) => (
            <span key={chave}>{mesCurto.format(dataDoMes(chave))}</span>
          ))}
        </div>
        <figcaption>
          {maiores.length > 1
            ? `O maior total se repete em ${mesesDoEmpate.join(', ')} e ${ultimoMesDoEmpate}, com`
            : meses.length === 1
              ? `As faturas de ${rotulo(maior[0])} somam`
              : `O maior total da janela é em ${rotulo(maior[0])}, com`}{' '}
          <NumeroFinanceiro className="h-secundario">{moeda.format(maior[1] / 100)}</NumeroFinanceiro>.
        </figcaption>
      </>
    )
  }
  return (
    <Instrumento tipo="faturas" titulo="Faturas por mês" icone="cartoes">
      <p className="h-recorte">Próximos vencimentos · valores previstos</p>
      {conteudo}
    </Instrumento>
  )
}
