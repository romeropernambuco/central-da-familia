import { createRef, useEffect, useId, useRef, useState } from 'react'
import '@fontsource-variable/geist'
import '@fontsource-variable/inter'
import { ArrowLeftRight, ChevronRight } from 'lucide-react'
import { Icone } from '../../componentes/Icone'
import {
  AssessorDaCasa, SemAplicacoes, SemCartoes, SemGastos, SemImoveis,
} from '../../componentes/ilustracoes/figuras'
import { EscritorioMaquete } from '../comuns/EscritorioMaquete'
import { PrivacidadePropostas, useValoresOcultos } from '../comuns/privacidade'
import type { PropsProposta } from '../Propostas'
import { Decisoes } from './Decisoes'
import { abrirFoco, Navegacao, Quantia, type Destino } from './interface'
import { diferenca, estados, salas, type Dinheiro, type Funcionario, type Sala } from './modelo'
import { Trilha } from './Trilha'
import './proposta.css'

type Props = PropsProposta & { oculto?: boolean }

function EscritorioNoCentro({ dados, dispositivo }: PropsProposta) {
  const celular = dispositivo === 'celular'
  const oculto = useValoresOcultos()
  const papel = dados.pessoa.papel.valor
  const [destino, setDestino] = useState<Destino>('inicio')
  const [sala, setSala] = useState<Sala>()
  const [posto, setPosto] = useState<string>()
  const [filaAberta, setFilaAberta] = useState(false)
  const [alvos] = useState(() => ({
    inicio: createRef<HTMLHeadingElement>(), escritorio: createRef<HTMLHeadingElement>(),
    orcamento: createRef<HTMLHeadingElement>(), faturas: createRef<HTMLHeadingElement>(),
    aplicacoes: createRef<HTMLHeadingElement>(), imoveis: createRef<HTMLHeadingElement>(),
    plano: createRef<HTMLHeadingElement>(),
  }))
  const fila = useRef<HTMLDivElement>(null)
  const ficha = useRef<HTMLDivElement>(null)
  const gatilhoPosto = useRef<HTMLElement | null>(null)
  const margem = useRef<HTMLButtonElement>(null)
  const idFicha = useId()
  const equipe = dados.funcionarios.valor ?? []
  const pessoa = equipe.find(f => f.id === posto)
  const pessoasNaSala = equipe.filter(f => f.sala === sala)
  const oficiais = diferenca(dados.plano2029.faltamPorMesComMargem, oculto)
  const navegacao = <Navegacao atual={destino} navegar={navegar} />

  useEffect(() => {
    if (posto) abrirFoco(ficha.current)
  }, [posto])

  function navegar(para: Destino) {
    setDestino(para)
    abrirFoco(alvos[para].current)
  }

  function mostrarPosto(p: Funcionario) {
    gatilhoPosto.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setPosto(p.id)
    if (sala && sala !== p.sala) setSala(p.sala)
    if (posto === p.id) abrirFoco(ficha.current)
  }

  function escolherSala(alvo?: Sala) {
    setSala(alvo)
    setPosto(undefined)
  }

  function mostrarDecisoes() {
    setFilaAberta(true)
    fila.current?.focus({ preventScroll: true })
    fila.current?.scrollIntoView({ block: celular ? 'start' : 'nearest', inline: 'nearest' })
  }

  const baloes: Partial<Record<string, Dinheiro>> = {
    contador: dados.saldoConta,
    tesoureiro: dados.recebimentos.garantido,
    imoveis: dados.imoveis.valorCadastrado,
  }
  const balao = pessoa && baloes[pessoa.id]
  // Só o posto selecionado revela um indicador próprio. Ausência não cria balão.
  const valores = pessoa && balao && balao.estado === 'pronto' ? { [pessoa.id]: balao } : undefined

  if (papel !== 'casal' && papel !== 'pessoa') return <>
    <header className="j-barra"><span className="j-marca">Central da Família</span><span className="selo-exemplo">Exemplo</span></header>
    <section className="j-restrito">
      {papel === 'equipe' && <AssessorDaCasa />}
      <h1>{papel === 'equipe' ? 'Tarefas da casa' : 'Acesso ao Início'}</h1>
      <p>{papel === 'equipe' ? 'A rotina da casa está na sua área de trabalho.' : 'Ainda sem dado sobre seu acesso.'}</p>
      {papel === 'equipe' && <a href="../../#/casa">Abrir Casa <Icone nome="abrir" size={16} /></a>}
    </section>
  </>

  const resumo = [
    { destino: 'orcamento', nome: 'Limite de hoje', campo: dados.hojePodeGastar.valor, icone: 'orcamento' },
    { destino: 'plano', nome: 'Plano 2029', legenda: oficiais.rotulo + ' · com margem', campo: oficiais.campo, icone: 'plano2029' },
    { destino: 'aplicacoes', nome: 'Total aplicado', campo: dados.aplicacoes.total, icone: 'guardado' },
    { destino: 'faturas', nome: 'Faturas previstas', campo: dados.faturas.total, icone: 'cartoes' },
  ] as const

  const faturas = dados.faturas.proximas
  const quantidadeFaturas = faturas.estado === 'pronto'
    ? { ...faturas, unidade: 'quantidade' as const, valor: faturas.valor.length }
    : { ...faturas, unidade: 'quantidade' as const }
  const cartoes = [
    { destino: 'orcamento', titulo: 'Hoje você pode gastar', legenda: 'Já gasto hoje', campo: dados.hojePodeGastar.jaSaiu,
      Figura: SemGastos, rota: 'orcamento' },
    { destino: 'aplicacoes', titulo: 'Aplicações', legenda: 'Rendimento líquido de hoje', campo: dados.aplicacoes.rendeuHoje,
      Figura: SemAplicacoes, rota: 'guardado' },
    { destino: 'faturas', titulo: 'Faturas', legenda: 'Faturas previstas na lista', campo: quantidadeFaturas,
      Figura: SemCartoes, rota: 'cartoes' },
    { destino: 'imoveis', titulo: 'Imóveis', legenda: 'Aluguel líquido estimado', campo: dados.imoveis.aluguelLiquidoEstimado,
      Figura: SemImoveis, rota: 'imoveis' },
  ] as const
  const trabalhando = equipe.some(f => f.estadoHoje.valor === 'trabalhando')
  const pedindoAtencao = equipe.some(f => f.estadoHoje.valor === 'precisa_de_voce')
  const filtros = <div className="j-salas" role="group" aria-label="Foco por sala">
    <button type="button" aria-pressed={!sala} onClick={() => escolherSala()}>Todas</button>
    {(Object.entries(salas) as [Sala, string][]).map(([id, nome]) => <button type="button" key={id}
      aria-pressed={sala === id} onClick={() => escolherSala(id)}>{nome}</button>)}
  </div>

  return <>
    <header className="j-barra">
      <span className="j-marca"><Icone nome="inicio" size={18} />Central da Família</span>
      {!celular && navegacao}
      <span className="selo-exemplo">Exemplo</span>
    </header>
    <div className="j-conteudo">
      <header className="j-abertura">
        <h1 ref={alvos.inicio} tabIndex={-1}>Escritório da família</h1>
        <div className="j-saude">
          <p>{dados.funcionarios.estado !== 'pronto' ? 'Equipe · Ainda sem dado' :
            pedindoAtencao ? 'Há postos pedindo atenção.' :
              trabalhando ? 'Tem gente trabalhando agora.' : 'Veja o estado de cada posto.'}</p>
          <button type="button" onClick={mostrarDecisoes}>Ver decisões <ChevronRight size={16} aria-hidden="true" /></button>
        </div>
      </header>

      <section className="j-cena" aria-label="Painel do escritório">
        <div className="j-resumo" aria-label="Resumo financeiro" role="group">
          {resumo.map(({ destino: para, nome, campo, icone, ...meta }) => <button key={para} type="button"
            ref={para === 'plano' ? margem : undefined} className="j-chip" onClick={() => navegar(para)}>
            <span><Icone nome={icone} size={15} />{nome}</span>
            <Quantia campo={campo} tamanho={para === 'orcamento' || para === 'plano' ? 'principal' : 'secundario'} />
            {'legenda' in meta && <small>{meta.legenda}</small>}
          </button>)}
        </div>

        <div className="j-cena-corpo">
          <div className="j-palco">
            <div className="j-palco-topo">
              <h2 ref={alvos.escritorio} tabIndex={-1}>Equipe de hoje</h2>
              {celular && <span><Icone desenho={ArrowLeftRight} size={14} /> Deslize para explorar</span>}
            </div>
            {celular && filtros}
            <EscritorioMaquete funcionarios={dados.funcionarios} variante="grande" salaDestacada={sala} mostrarPlaquinhas
              valores={valores} papel={papel} oculto={oculto} onSelecionar={mostrarPosto} />
            {!celular && filtros}
            {(pessoa || sala) && <div className="j-ficha" ref={ficha} tabIndex={-1} role="region" aria-labelledby={idFicha}>
                <div className="j-ficha-topo">
                  <h3 id={idFicha}>{pessoa ? oculto ? pessoa.curto : pessoa.nome : salas[sala!]}</h3>
                  {pessoa && <button type="button" aria-label="Fechar ficha do posto" onClick={() => {
                    setPosto(undefined)
                    abrirFoco(gatilhoPosto.current?.isConnected ? gatilhoPosto.current : alvos.escritorio.current)
                  }}><Icone nome="fechar" size={18} /></button>}
                </div>
                {pessoa ? <p>{salas[pessoa.sala]} · {pessoa.estadoHoje.valor ? estados[pessoa.estadoHoje.valor] : 'Ainda sem dado'}
                  {valores && <> · {pessoa.id === 'contador' ? 'Saldo em conta' : pessoa.id === 'tesoureiro'
                    ? 'Receita garantida' : 'Valor cadastrado dos imóveis'} na maquete</>}</p>
                  : pessoasNaSala.length ? <ul>{pessoasNaSala.map(f => <li key={f.id}>
                    {f.curto} · {f.estadoHoje.valor ? estados[f.estadoHoje.valor] : 'Ainda sem dado'}
                  </li>)}</ul> : <p>Ainda sem dado</p>}
            </div>}
          </div>
          <div className="j-folha" ref={fila} tabIndex={-1} role="group" aria-label="Decisões do escritório">
            <Decisoes dados={dados} celular={celular} aberta={filaAberta}
              alternar={() => {
                setFilaAberta(!filaAberta)
                if (!filaAberta) fila.current?.scrollIntoView({ block: 'start', inline: 'nearest' })
              }} mostrarPosto={mostrarPosto} />
          </div>
        </div>
      </section>

      <section className="j-acompanhamento" aria-labelledby={idFicha + '-rotinas'}>
        <h2 id={idFicha + '-rotinas'}>Rotinas da família</h2>
        <div className="j-bento">
          {cartoes.map(({ destino: para, titulo, legenda, campo, Figura, rota }) => <article key={para} className="j-cartao" data-cartao={para}>
            <div className="j-cartao-texto">
              <h3 ref={alvos[para]} tabIndex={-1}>{titulo}</h3>
              <p>{legenda}</p>
              <Quantia campo={campo} tamanho="secundario" />
              <a aria-label={`Abrir ${para === 'orcamento' ? 'orçamento' : titulo}`} href={`../../#/${rota}`}>Ver área <Icone nome="abrir" size={16} /></a>
            </div>
            <div className="j-arte" aria-hidden="true"><Figura /></div>
          </article>)}
        </div>
      </section>
      <section className="j-plano" aria-label="Plano 2029">
        <div className="j-plano-topo">
          <span className="j-plano-icone"><Icone nome="plano2029" /></span>
          <h2 ref={alvos.plano} tabIndex={-1}>Rumo a 2029</h2>
        </div>
        <Trilha plano={dados.plano2029} celular={celular} consultarMargem={() => abrirFoco(margem.current)} />
      </section>
    </div>
    {celular && navegacao}
  </>
}

export function Proposta({ dados, tema = 'escuro', dispositivo, oculto }: Props) {
  const olhoFechado = useValoresOcultos() || !!oculto
  return <PrivacidadePropostas.Provider value={olhoFechado}>
    <div className="j-inicio" data-tema={tema} data-dispositivo={dispositivo}>
      <EscritorioNoCentro key={JSON.stringify([dados.familia.id, dados.pessoa.papel.valor, dados.pessoa.nome.valor])}
        dados={dados} tema={tema} dispositivo={dispositivo} />
    </div>
  </PrivacidadePropostas.Provider>
}
