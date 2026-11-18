import { useId, useRef, useState, type ComponentType, type ReactNode } from 'react'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/inter'
import { Icone, type NomeIcone } from '../../componentes/Icone'
import { CasaVazia, SemAplicacoes, SemCartoes, type IlustracaoProps } from '../../componentes/ilustracoes'
import { PrivacidadePropostas, useValoresOcultos } from '../comuns/privacidade'
import type { PropsProposta } from '../Propostas'
import type { DadosInicio } from '../dadosExemplo'
import { CartaoPlano, Medida, Quantia, magnitude, reservarQuantias, type CampoFinanceiro } from './Financeiro'
import { Fila, organizarFila, type Pessoa, type Respostas } from './Fila'
import { Escritorio } from './Escritorio'
import './bento.css'

type Destino = 'inicio' | 'orcamento' | 'faturas' | 'escritorio' | 'plano' | 'aplicacoes' | 'fila'
type IrPara = (destino: Destino) => void
type Props = PropsProposta & { oculto?: boolean }

const abas: [Destino, string, NomeIcone][] = [
  ['inicio', 'Início', 'inicio'],
  ['orcamento', 'Orçamento', 'orcamento'],
  ['faturas', 'Faturas', 'cartoes'],
  ['escritorio', 'Escritório', 'escritorio'],
]
const extras: [Destino, string, NomeIcone][] = [
  ['plano', 'Plano 2029', 'plano2029'],
  ['aplicacoes', 'Aplicações', 'guardado'],
]

function Navegacao({ ativo, ir, familiar, pessoal }: { ativo: Destino; ir: IrPara; familiar: boolean; pessoal: boolean }) {
  const mais = useRef<HTMLDetailsElement>(null)
  return <nav className="i-nav" aria-label="Navegação principal">
    {abas.filter(([destino]) => familiar || destino === 'inicio' || destino === (pessoal ? 'orcamento' : 'escritorio')).map(([destino, rotulo, icone]) =>
      <button key={destino} type="button" className="i-alvo" aria-current={ativo === destino ? 'location' : undefined}
        onClick={() => ir(destino)}><Icone nome={icone} size={20} />{rotulo}</button>)}
    {familiar && <details className="i-mais" ref={mais} onKeyDown={evento => {
      if (evento.key === 'Escape' && mais.current?.open) {
        mais.current.open = false
        mais.current.querySelector('summary')?.focus()
      }
    }}>
      <summary className="i-alvo" data-atual={ativo === 'plano' || ativo === 'aplicacoes'}>
        <Icone nome="mais" size={20} />Mais
      </summary>
      <div className="i-mais-opcoes">
        {extras.map(([destino, rotulo, icone]) => <button key={destino} type="button" className="i-alvo"
          aria-current={ativo === destino ? 'location' : undefined} onClick={() => {
            if (mais.current) mais.current.open = false
            ir(destino)
          }}><Icone nome={icone} size={18} />{rotulo}</button>)}
      </div>
    </details>}
  </nav>
}

function Cartao({ id, area, titulo, icone, Figura, legenda, children }: {
  id: string
  area: string
  titulo: string
  icone: NomeIcone
  Figura: ComponentType<IlustracaoProps>
  legenda: string
  children: ReactNode
}) {
  return <section className={`i-cartao i-${area} i-ilustrado`} aria-labelledby={id}>
    <div className="i-cabecalho-cartao">
      <span className="i-icone"><Icone nome={icone} size={18} /></span>
      <h2 id={id} tabIndex={-1}>{titulo}</h2>
    </div>
    <div className="i-ilustrado-corpo">
      <div><p className="i-rotulo">{legenda}</p>{children}</div>
      <div className="i-arte" aria-hidden="true"><Figura /></div>
    </div>
  </section>
}

export function Proposta({ dados, dispositivo, tema, oculto = false }: Props) {
  const olhoDaCasca = useValoresOcultos()
  const olhoFechado = olhoDaCasca || oculto
  const celular = dispositivo === 'celular'
  const papel = dados.pessoa.papel.valor
  const familiar = papel === 'casal'
  const pessoal = papel === 'pessoa'
  const [ativo, setAtivo] = useState<Destino>('inicio')
  const [selecionada, selecionar] = useState<Pessoa>()
  const [respostas, setRespostas] = useState<Respostas>({})
  const prefixo = useId()
  const id = (destino: Destino) => `${prefixo}-${destino}`
  const itens = organizarFila(dados, familiar)
  const proxima = itens.find(({ tarefa }) => (respostas[tarefa.id] ?? 'agora') === 'agora')
  const estadoDasTarefas = papel ? dados.pendencias.fila.estado : 'indisponivel'
  const estadoFila = estadoDasTarefas !== 'pronto' ? 'Ainda sem dado'
    : proxima?.nivel === 'dinheiro em risco' ? 'Uma decisão pede atenção agora.'
    : proxima ? 'A equipe tem decisões para você.' : 'Nenhuma decisão por agora.'

  const { hojePodeGastar: hoje, aplicacoes, faturas, plano2029: plano } = dados
  const saldoPlano = plano.faltamPorMesComMargem.valor
  const rotuloPlano = olhoFechado ? 'Diferença mensal com margem'
    : saldoPlano !== null && saldoPlano < 0 ? 'Sobra mensal com margem' : 'Falta mensal com margem'
  const referencias = [
    { titulo: 'Limite de hoje', destino: 'orcamento', icone: 'orcamento', campo: hoje.valor },
    { titulo: rotuloPlano, destino: 'plano', icone: 'plano2029', campo: magnitude(plano.faltamPorMesComMargem) },
    { titulo: 'Total aplicado', destino: 'aplicacoes', icone: 'guardado', campo: aplicacoes.total },
    { titulo: 'Faturas previstas', destino: 'faturas', icone: 'cartoes', campo: faturas.total },
  ] as const
  const aluguel = dados.imoveis.aluguelLiquidoEstimado
  const [limite, falta, aplicado, previsto, balao, ateDomingo, rendimento, ...filaECenario] = reservarQuantias([
    ...referencias.map(ref => ref.campo), aluguel, hoje.ateDomingo, aplicacoes.rendeuHoje,
    ...itens.map(({ tarefa }) => tarefa.valor), magnitude(plano.faltamPorMesSemMargem),
  ])
  const semMargem = filaECenario[filaECenario.length - 1]
  const medidas = filaECenario.slice(0, -1)
  const resumo = [limite, falta, aplicado, previsto]
  const [, ateDomingoPessoal] = reservarQuantias([hoje.valor, hoje.ateDomingo])
  const quantidadeFaturas: CampoFinanceiro | undefined = faturas.proximas.estado === 'pronto' ? {
    estado: 'pronto', unidade: 'quantidade', natureza: faturas.proximas.natureza, valor: faturas.proximas.valor.length,
  } : undefined
  const equipe: DadosInicio['funcionarios'] = familiar || dados.funcionarios.estado !== 'pronto' ? dados.funcionarios : {
    ...dados.funcionarios, valor: dados.funcionarios.valor.filter(pessoa => papel === 'equipe' && pessoa.sala === 'casa'),
  }

  function ir(destino: Destino) {
    const alvo = document.getElementById(id(destino))
    if (!alvo) return
    setAtivo(destino === 'fila' ? 'inicio' : destino)
    alvo.focus({ preventScroll: true })
    alvo.scrollIntoView({ block: 'start' })
  }

  function verPessoa(pessoa: Pessoa) {
    ir('escritorio')
    selecionar(pessoa)
  }

  const menu = <Navegacao ativo={ativo} ir={ir} familiar={familiar} pessoal={pessoal} />
  return <PrivacidadePropostas.Provider value={olhoFechado}>
    <div className="i-inicio" data-tema={tema} data-dispositivo={dispositivo} data-familiar={familiar}>
      {!celular && menu}
      <div className="i-conteudo">
        <header className="i-topo">
          <div>
            <div className="i-marca"><Icone nome="inicio" size={16} /> Central da Família</div>
            <h1 id={id('inicio')} tabIndex={-1}>{dados.saudacao.valor ?? 'Início'}</h1>
          </div>
          <span className="selo-exemplo i-selo">Exemplo</span>
        </header>
        {(familiar || pessoal) && <ul className="i-resumo" aria-label="Resumo financeiro" tabIndex={celular && familiar ? 0 : undefined}>
          {(pessoal ? referencias.slice(0, 1) : referencias).map(({ titulo, destino, icone }, indice) => <li key={destino}>
            <button type="button" className="i-referencia i-alvo" onClick={() => ir(destino)}>
              <span className="i-referencia-titulo"><Icone nome={icone} size={17} />{titulo}<Icone nome="abrir" size={15} /></span>
              <Quantia medida={resumo[indice]} className={indice < 2 ? 'i-primario' : 'i-secundario'} />
            </button>
          </li>)}
        </ul>}
        {!pessoal && <div className="i-saude">
          <Icone nome={proxima?.nivel === 'dinheiro em risco' ? 'erro' : proxima ? 'lancamentos' : 'salvo'} size={18} />
          <p>{estadoFila}</p>
          <button type="button" className="i-alvo i-link" onClick={() => ir('fila')}>Ver fila <Icone nome="abrir" size={16} /></button>
        </div>}
        {pessoal ? <Cartao id={id('orcamento')} area="hoje" titulo="Hoje você pode gastar" icone="orcamento" Figura={CasaVazia} legenda="Disponível até domingo">
          <Quantia medida={ateDomingoPessoal} className="i-secundario" />
        </Cartao> : <div className="i-grade">
          <Escritorio id={id('escritorio')} funcionarios={equipe} papel={papel} celular={celular} oculto={olhoFechado}
            pessoa={selecionada && equipe.valor?.find(pessoa => pessoa.id === selecionada.id)} selecionar={selecionar}
            balao={familiar && (!balao.repetida || olhoFechado) && aluguel.estado === 'pronto' ? aluguel : undefined} />
          <Fila id={id('fila')} itens={itens} estado={estadoDasTarefas}
            familiar={familiar} respostas={respostas} setRespostas={setRespostas} medidas={medidas} verPessoa={verPessoa} />
          {familiar && <>
            <CartaoPlano id={id('plano')} plano={plano} semMargem={semMargem} />
            <Cartao id={id('orcamento')} area="hoje" titulo="Hoje você pode gastar" icone="orcamento" Figura={CasaVazia} legenda="Disponível até domingo">
              <Quantia medida={ateDomingo} className="i-secundario" />
            </Cartao>
            <Cartao id={id('aplicacoes')} area="aplicacoes" titulo="Aplicações" icone="guardado" Figura={SemAplicacoes} legenda="Rendeu hoje">
              <Quantia medida={rendimento} className="i-secundario" />
            </Cartao>
            <Cartao id={id('faturas')} area="faturas" titulo="Faturas" icone="cartoes" Figura={SemCartoes} legenda="Na lista de acompanhamento">
              <Medida campo={quantidadeFaturas} className="i-secundario" />
            </Cartao>
          </>}
        </div>}
      </div>
      {celular && menu}
    </div>
  </PrivacidadePropostas.Provider>
}
