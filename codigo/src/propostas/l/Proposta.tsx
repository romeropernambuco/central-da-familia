import { ArrowDown, Building2, ClipboardList, CreditCard, Ellipsis, Flag, House, Landmark, ShieldAlert, Wallet, WalletCards, type LucideIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/inter'
import type { PropsProposta } from '../Propostas'
import { useValoresOcultos } from '../comuns/privacidade'
import { Bento, medidasDosMotores, Referencia, reservarMedidas, Rumo, type Motor } from './Financeiro'
import { Fila, organizarFila } from './Fila'
import { FichaPessoa, Palco, type Pessoa } from './Palco'
import './proposta.css'

type Destino = Motor | 'inicio' | 'escritorio' | 'fila' | 'plano'
type Pasta = 'agora' | 'depois' | 'feitas'
const abas = [
  ['inicio', 'Início', House],
  ['orcamento', 'Orçamento', Wallet],
  ['faturas', 'Faturas', CreditCard],
  ['escritorio', 'Escritório', Building2],
] satisfies [Destino, string, LucideIcon][]
const extras = [
  ['plano', 'Rumo a 2029', Flag],
  ['aplicacoes', 'Aplicações', Landmark],
  ['imoveis', 'Imóveis', Building2],
  ['receitas', 'Receitas', WalletCards],
  ['fila', 'Precisa de você', ClipboardList],
] satisfies [Destino, string, LucideIcon][]

function Menu({ ativo, familiar, pessoal, casa, ir }: {
  ativo: Destino; familiar: boolean; pessoal: boolean; casa: boolean; ir: (destino: Destino) => void
}) {
  const mais = useRef<HTMLDetailsElement>(null)
  const opcoes = familiar ? abas : abas.filter(([destino]) => destino === 'inicio' || (pessoal && destino === 'orcamento'))
  const destinos = casa ? [...opcoes, extras[4]] : opcoes
  return <nav className="l-menu" aria-label="Navegação principal">
    <div className="l-menu-itens">
      {destinos.map(([destino, rotulo, Icone]) => <button key={destino} type="button"
        aria-current={ativo === destino ? 'location' : undefined} onClick={() => {
          if (mais.current) mais.current.open = false
          ir(destino)
        }}><Icone size={19} aria-hidden="true" /><span>{rotulo}</span></button>)}
      {familiar && <details className="l-mais" ref={mais} onKeyDown={evento => {
        if (evento.key !== 'Escape' || !mais.current?.open) return
        mais.current.open = false
        mais.current.querySelector('summary')?.focus()
      }}>
        <summary data-atual={extras.some(([destino]) => destino === ativo) || undefined}>
          <Ellipsis size={19} aria-hidden="true" /><span>Mais</span>
        </summary>
        <div className="l-mais-opcoes">
          {extras.map(([destino, rotulo, Icone]) => <button key={destino} type="button"
            aria-current={ativo === destino ? 'location' : undefined} onClick={() => {
              if (mais.current) mais.current.open = false
              ir(destino)
            }}><Icone size={18} aria-hidden="true" />{rotulo}</button>)}
        </div>
      </details>}
    </div>
  </nav>
}

export function Proposta({ dados, tema = 'escuro', dispositivo }: PropsProposta) {
  const oculto = useValoresOcultos()
  const prefixo = useId()
  const [ativo, setAtivo] = useState<Destino>('inicio')
  const [selecionada, selecionar] = useState<Pessoa>()
  const [pasta, setPasta] = useState<Pasta>('agora')
  const [movidas, setMovidas] = useState<Partial<Record<string, Pasta>>>({})
  const papel = dados.pessoa.papel.valor
  const familiar = papel === 'casal'
  const pessoal = papel === 'pessoa'
  const casa = papel === 'equipe'
  const itens = familiar || casa ? organizarFila(dados, familiar) : []
  const proxima = itens.find(({ tarefa }) => (movidas[tarefa.id] ?? 'agora') === 'agora')
  const risco = proxima?.nivel === 'dinheiro em risco'
  const estado = dados.pendencias.fila.estado
  const frase = risco ? 'Há dinheiro em risco.' : proxima ? 'A equipe aguarda sua decisão.'
    : estado === 'indisponivel' ? 'Fila · Ainda sem dado' : 'Nenhuma decisão por agora.'

  const plano = dados.plano2029.faltamPorMesComMargem
  const direcao = oculto || plano.estado !== 'pronto' ? 'Diferença mensal'
    : plano.valor < 0 ? 'Sobra mensal' : 'Falta mensal'
  const referencias = [
    { titulo: 'Pode gastar hoje', legenda: 'Limite diário', destino: 'orcamento', Icone: Wallet, campo: dados.hojePodeGastar.valor },
    { titulo: 'Plano 2029', legenda: `${direcao} com margem`, destino: 'plano', Icone: Flag,
      campo: plano.estado === 'pronto' ? { ...plano, valor: Math.abs(plano.valor) } : plano },
    { titulo: 'Aplicações', legenda: 'Total aplicado', destino: 'aplicacoes', Icone: Landmark, campo: dados.aplicacoes.total },
    { titulo: 'Faturas previstas', legenda: 'Total da previsão', destino: 'faturas', Icone: CreditCard, campo: dados.faturas.total },
  ] as const
  const visiveis = familiar ? referencias : pessoal ? referencias.slice(0, 1) : []
  const camposMotores = familiar ? medidasDosMotores(dados) : pessoal ? [dados.hojePodeGastar.ateDomingo] : []
  const camposDaPasta = familiar ? itens.map(({ tarefa }) =>
    (movidas[tarefa.id] ?? 'agora') === pasta ? tarefa.valor : { ...tarefa.valor, estado: 'vazio' as const, valor: null }) : []
  const inicioMotores = visiveis.length + camposDaPasta.length
  const medidas = reservarMedidas([...visiveis.map(ref => ref.campo), ...camposDaPasta, ...camposMotores])

  const id = (destino: Destino) => `${prefixo}-${destino}`
  function ir(destino: Destino) {
    const alvo = document.getElementById(id(destino))
    if (!alvo) return
    setAtivo(destino)
    alvo.focus({ preventScroll: true })
    alvo.scrollIntoView({ block: 'start', inline: 'nearest' })
  }

  const abertura = <>
      <header className="l-topo">
        <div className="l-marca"><House size={16} aria-hidden="true" />Central da Família</div>
        <span className="selo-exemplo l-exemplo">Exemplo</span>
        <h1 id={id('inicio')} tabIndex={-1}>{dados.saudacao.valor || 'Início'}</h1>
      </header>

      {visiveis.length > 0 && <section className="l-resumo" aria-label="Referências financeiras">
        {visiveis.map(({ titulo, legenda, destino, Icone }, indice) => <Referencia key={destino}
          {...{ titulo, legenda, Icone }} medida={medidas[indice]} principal={indice === 0} abrir={() => ir(destino)} />)}
      </section>}

      {(familiar || casa) && <section className="l-saude" aria-label="Estado do dia">
        <p data-risco={risco || undefined}>{risco ? <ShieldAlert size={17} aria-hidden="true" /> : <ClipboardList size={17} aria-hidden="true" />}{frase}</p>
        <button type="button" onClick={() => { setPasta('agora'); ir('fila') }}>Ver fila <ArrowDown size={16} aria-hidden="true" /></button>
      </section>}
  </>

  return <div className="l-inicio" data-tema={tema} data-dispositivo={dispositivo}>
    <div className="l-conteudo">
      {dispositivo === 'celular' && familiar ? <div className="l-abertura">{abertura}</div> : abertura}
      {familiar && <Palco id={id('escritorio')} funcionarios={dados.funcionarios} celular={dispositivo === 'celular'}
        papel={papel} oculto={oculto} selecionar={selecionar} />}
      {(familiar || casa) && <Fila id={id('fila')} {...{ itens, estado, familiar, pasta, setPasta, movidas, setMovidas }}
        medidas={medidas.slice(visiveis.length, inicioMotores)} selecionar={selecionar} />}
      {familiar && <Rumo id={id('plano')} progressao={dados.plano2029.progressao} />}
      {(familiar || pessoal) && <Bento id={id} medidas={medidas.slice(inicioMotores)} pessoal={pessoal} />}
      {!papel && <p className="l-legenda">Perfil · Ainda sem dado</p>}
    </div>
    <Menu {...{ ativo, familiar, pessoal, casa, ir }} />
    {familiar && selecionada && <FichaPessoa pessoa={selecionada} fechar={() => selecionar(undefined)} />}
  </div>
}
