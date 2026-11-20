import { useRef, type ComponentType, type RefObject } from 'react'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/inter'
import { Icone, type NomeIcone } from '../../componentes/Icone'
import {
  AssessorDaCasa,
  CasaVazia,
  Plano2029,
  SemAplicacoes,
  SemCartoes,
  type IlustracaoProps,
} from '../../componentes/ilustracoes'
import type { Campo } from '../dadosExemplo'
import type { PropsProposta } from '../Propostas'
import { useValoresOcultos, Valor } from '../comuns/privacidade'
import { Escritorio, EstadoDoDia, organizarFila } from './Escritorio'
import './bento.css'

type Dinheiro = Campo<number, 'reais' | 'centavos'>
type Destino = 'inicio' | 'orcamento' | 'plano' | 'aplicacoes' | 'faturas' | 'escritorio'

const abas = [
  ['inicio', 'Início', 'inicio'],
  ['orcamento', 'Orçamento', 'orcamento'],
  ['faturas', 'Faturas', 'cartoes'],
  ['escritorio', 'Escritório', 'escritorio'],
] satisfies [Destino, string, NomeIcone][]

function Navegacao({ irPara }: { irPara: (destino: Destino) => void }) {
  const mais = useRef<HTMLDetailsElement>(null)
  return (
    <nav className="bento-nav" aria-label="Áreas do início">
      {abas.map(([destino, rotulo, icone]) => (
        <button
          key={destino}
          type="button"
          className="bento-alvo"
          aria-current={destino === 'inicio' ? 'page' : undefined}
          onClick={() => irPara(destino)}
        >
          <Icone nome={icone} size={18} />
          {rotulo}
        </button>
      ))}
      <details
        className="bento-mais"
        ref={mais}
        onKeyDown={evento => {
          if (evento.key !== 'Escape' || !mais.current?.open) return
          mais.current.open = false
          mais.current.querySelector('summary')?.focus()
        }}
      >
        <summary className="bento-alvo">
          <Icone nome="mais" size={18} />
          Mais
        </summary>
        <div className="bento-mais-opcoes">
          <button
            type="button"
            className="bento-alvo"
            onClick={() => {
              mais.current!.open = false
              irPara('plano')
            }}
          >
            <Icone nome="plano2029" size={18} />
            Plano 2029
          </button>
          <button
            type="button"
            className="bento-alvo"
            onClick={() => {
              mais.current!.open = false
              irPara('aplicacoes')
            }}
          >
            <Icone nome="guardado" size={18} />
            Aplicações
          </button>
        </div>
      </details>
    </nav>
  )
}

interface CartaoProps {
  titulo: string
  destino: RefObject<HTMLHeadingElement>
  icone: NomeIcone
  variante: 'hoje' | 'plano' | 'aplicacoes' | 'faturas'
  Figura: ComponentType<IlustracaoProps>
  campo: Dinheiro
  legenda: string
  vazio: string
}

function Cartao({ titulo, destino, icone, variante, Figura, campo, legenda, vazio }: CartaoProps) {
  const principal = variante === 'hoje'
  const Titulo = principal ? 'h1' : 'h2'
  return (
    <article className={`bento-cartao bento-${variante}`}>
      <div className="bento-cartao-texto">
        <span className="bento-icone">
          <Icone nome={icone} />
        </span>
        <Titulo ref={destino} tabIndex={-1}>
          {titulo}
        </Titulo>
        {campo.estado === 'pronto' ? (
          <>
            <p className="bento-valor">
              <Valor campo={campo} className={principal ? 'numero-principal' : 'numero-secundario'} />
            </p>
            <p className="bento-legenda">{legenda}</p>
          </>
        ) : (
          <p className="bento-ausente">{campo.estado === 'vazio' ? vazio : 'Indisponível por enquanto'}</p>
        )}
      </div>
      <div className="bento-arte" aria-hidden="true">
        <Figura />
      </div>
    </article>
  )
}

export function Proposta({ dados, tema, dispositivo }: PropsProposta) {
  const valoresOcultos = useValoresOcultos()
  const inicio = useRef<HTMLDivElement>(null)
  const orcamento = useRef<HTMLHeadingElement>(null)
  const plano = useRef<HTMLHeadingElement>(null)
  const aplicacoes = useRef<HTMLHeadingElement>(null)
  const faturas = useRef<HTMLHeadingElement>(null)
  const escritorio = useRef<HTMLHeadingElement>(null)
  const fila = useRef<HTMLHeadingElement>(null)
  const destinos = { inicio, orcamento, plano, aplicacoes, faturas, escritorio }

  function focar(alvo: HTMLElement | null) {
    alvo?.focus({ preventScroll: true })
    alvo?.scrollIntoView({ block: 'start', inline: 'nearest' })
  }

  const papel = dados.pessoa.papel.valor
  const podeVer = papel === 'casal' || papel === 'pessoa'
  const tarefas = podeVer ? organizarFila(dados) : []
  const saldoDoPlano = dados.plano2029.faltamPorMesComMargem
  const sobraNoPlano = saldoDoPlano.estado === 'pronto' && saldoDoPlano.valor < 0
  const valorDoPlano = sobraNoPlano ? { ...saldoDoPlano, valor: Math.abs(saldoDoPlano.valor) } : saldoDoPlano
  const legendaDoPlano = valoresOcultos
    ? 'Projeção mensal com margem'
    : sobraNoPlano
      ? 'Sobra por mês, com margem'
      : 'Falta por mês, com margem'

  return (
    <div className="bento-inicio" data-tema={tema} data-formato={dispositivo}>
      <header className="bento-cabecalho">
        <div className="bento-marca" ref={inicio} tabIndex={-1}>
          <span className="bento-icone">
            <Icone nome="inicio" size={19} />
          </span>
          <span>Central da Família</span>
        </div>
        <span className="bento-exemplo">Exemplo</span>
        {podeVer && dispositivo === 'desktop' && <Navegacao irPara={destino => focar(destinos[destino].current)} />}
      </header>

      {podeVer ? (
        <>
          <div className="bento-conteudo">
            <EstadoDoDia
              estado={dados.pendencias.fila.estado}
              tarefa={tarefas[0]}
              abrir={() => focar(tarefas.length ? fila.current : escritorio.current)}
            />
            <div className="bento-grade">
              <Cartao
                titulo="Hoje você pode gastar"
                destino={orcamento}
                variante="hoje"
                icone="orcamento"
                Figura={CasaVazia}
                campo={dados.hojePodeGastar.valor}
                legenda="Estimativa do seu orçamento"
                vazio="Sem orçamento para hoje"
              />
              <Cartao
                titulo="Plano 2029"
                destino={plano}
                variante="plano"
                icone="plano2029"
                Figura={Plano2029}
                campo={valorDoPlano}
                legenda={legendaDoPlano}
                vazio="Projeção ainda sem registros"
              />
              <Cartao
                titulo="Aplicações"
                destino={aplicacoes}
                variante="aplicacoes"
                icone="guardado"
                Figura={SemAplicacoes}
                campo={dados.aplicacoes.total}
                legenda="Total aplicado"
                vazio="Sem aplicações registradas"
              />
              <Cartao
                titulo="Faturas"
                destino={faturas}
                variante="faturas"
                icone="cartoes"
                Figura={SemCartoes}
                campo={dados.faturas.total}
                legenda="A vencer ou conferir"
                vazio="Sem faturas para conferir"
              />
              <Escritorio dados={dados} tarefas={tarefas} titulo={escritorio} tituloFila={fila} />
            </div>
          </div>
          {dispositivo === 'celular' && <Navegacao irPara={destino => focar(destinos[destino].current)} />}
        </>
      ) : (
        <div className="bento-conteudo">
          <article className="bento-cartao bento-restrito">
            <AssessorDaCasa />
            <h1>{papel === 'equipe' ? 'Assessor da Casa' : 'Início indisponível'}</h1>
            <p>
              {papel === 'equipe'
                ? 'As tarefas da casa ficam na sua área de trabalho.'
                : 'Aguarde a confirmação do seu acesso.'}
            </p>
          </article>
        </div>
      )}
    </div>
  )
}
