import { useId, useRef, useState, type KeyboardEvent } from 'react'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/inter'
import { Icone, type NomeIcone } from '../../componentes/Icone'
import { PrivacidadePropostas, useValoresOcultos } from '../../componentes/escritorio/privacidade'
import type { PropsProposta } from '../Propostas'
import { Hoje } from './Hoje'
import { Escritorio } from './Escritorio'
import { Plano } from './Plano'
import { destino } from './destino'
import './central.css'

const abas = [
  { id: 'hoje', nome: 'Hoje' },
  { id: 'escritorio', nome: 'Escritório' },
  { id: 'plano', nome: 'Plano' },
] as const
type Aba = (typeof abas)[number]['id']
const chaveAba = 'central-familia:proposta-k:aba'
const formatoData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'UTC' })

function lerAba(): Aba {
  try {
    return abas.find(aba => aba.id === sessionStorage.getItem(chaveAba))?.id ?? 'hoje'
  } catch {
    return 'hoje'
  }
}

function Menu({ escritorioAtivo, ir }: { escritorioAtivo: boolean; ir: (aba: Aba) => void }) {
  const menu = useRef<HTMLDetailsElement>(null)
  const direto = (nome: string, icone: NomeIcone, href: string) => (
    <a href={href}>
      <Icone nome={icone} size={20} />
      <span>{nome}</span>
    </a>
  )

  return (
    <nav className="k-menu" aria-label="Navegação principal">
      <button type="button" aria-current={!escritorioAtivo ? 'page' : undefined} onClick={() => ir('hoje')}>
        <Icone nome="inicio" size={20} />
        <span>Início</span>
      </button>
      {direto('Orçamento', 'orcamento', destino('orcamento'))}
      {direto('Faturas', 'cartoes', destino('cartoes'))}
      <button type="button" aria-current={escritorioAtivo ? 'page' : undefined} onClick={() => ir('escritorio')}>
        <Icone nome="escritorio" size={20} />
        <span>Escritório</span>
      </button>
      <details
        ref={menu}
        onKeyDown={evento => {
          if (evento.key === 'Escape' && menu.current?.open) {
            menu.current.open = false
            menu.current.querySelector('summary')?.focus()
          }
        }}
        onBlur={evento => {
          if (evento.relatedTarget && !evento.currentTarget.contains(evento.relatedTarget))
            evento.currentTarget.open = false
        }}
      >
        <summary>
          <Icone nome="mais" size={20} />
          <span>Mais</span>
        </summary>
        <div className="k-menu-extras">
          <button
            type="button"
            onClick={() => {
              if (menu.current) menu.current.open = false
              ir('plano')
            }}
          >
            <Icone nome="plano2029" size={18} />
            Plano 2029
          </button>
          {direto('Aplicações', 'guardado', destino('guardado', 'aplicacoes'))}
          {direto('Casa', 'casa', destino('casa'))}
          {direto('Ajustes', 'ajustes', destino('ajustes'))}
        </div>
      </details>
    </nav>
  )
}

export function Proposta({ dados, tema, dispositivo, oculto = false }: PropsProposta & { oculto?: boolean }) {
  const olhoFechado = useValoresOcultos() || oculto
  const [aba, setAba] = useState(lerAba)
  const id = useId()
  const paineis = useRef<Record<Aba, HTMLElement | null>>({ hoje: null, escritorio: null, plano: null })
  const botoes = useRef<Record<Aba, HTMLButtonElement | null>>({ hoje: null, escritorio: null, plano: null })
  const area = useRef<HTMLDivElement>(null)
  const celular = dispositivo === 'celular'
  const papel = dados.pessoa.papel.valor
  const casal = papel === 'casal'
  const saudacao = dados.saudacao.valor
  const nome = dados.pessoa.nome.valor?.trim().split(/\s+/, 1)[0]

  function selecionar(destino: Aba) {
    setAba(destino)
    try {
      sessionStorage.setItem(chaveAba, destino)
    } catch {
      /* O estado do React continua disponível. */
    }
    if (area.current) area.current.scrollTop = 0
  }

  function ir(destino: Aba) {
    if (celular) selecionar(destino)
    requestAnimationFrame(() => {
      const painel = paineis.current[destino]
      painel?.focus({ preventScroll: true })
      painel?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    })
  }

  function atalhos(evento: KeyboardEvent, indice: number) {
    const destino = {
      ArrowRight: (indice + 1) % abas.length,
      ArrowLeft: (indice + abas.length - 1) % abas.length,
      Home: 0,
      End: abas.length - 1,
    }[evento.key]
    if (destino === undefined) return
    evento.preventDefault()
    selecionar(abas[destino].id)
    botoes.current[abas[destino].id]?.focus()
  }

  const conteudo = {
    hoje: (
      <Hoje
        dados={dados}
        celular={celular}
        visivel={!celular || aba === 'hoje'}
        abrirPlano={() => ir('plano')}
        abrirEscritorio={() => ir('escritorio')}
      />
    ),
    escritorio: <Escritorio dados={dados} />,
    plano: <Plano dados={dados} />,
  }

  return (
    <PrivacidadePropostas.Provider value={olhoFechado}>
      <div
        className="k-inicio"
        data-proposta="k"
        data-tema={tema}
        data-dispositivo={dispositivo}
        data-aba={celular ? aba : undefined}
      >
        <header className="k-cabecalho">
          <div className="k-marca">
            <span>
              <Icone nome="inicio" size={20} />
            </span>
            Central da Família
          </div>
          <span className="selo-exemplo">Exemplo</span>
        </header>
        <div className="k-titulo">
          <h1>
            {casal
              ? saudacao
                ? `${saudacao}${nome ? `, ${nome}` : ''}`
                : 'Seu início'
              : papel === 'equipe'
                ? 'Assessor da Casa'
                : 'Seu início'}
          </h1>
          {casal && !celular && (
            <p>
              {dados.data.valor ? (
                <time dateTime={dados.data.valor}>{formatoData.format(new Date(dados.data.valor + 'T12:00:00Z'))}</time>
              ) : (
                'Data · Ainda sem dado'
              )}
            </p>
          )}
        </div>
        {casal ? (
          <>
            {celular && (
              <div className="k-abas" role="tablist" aria-label="Vistas do início">
                {abas.map(({ id: abaId, nome: rotulo }, i) => (
                  <button
                    type="button"
                    role="tab"
                    key={abaId}
                    id={`${id}-aba-${abaId}`}
                    ref={el => {
                      botoes.current[abaId] = el
                    }}
                    aria-controls={`${id}-painel-${abaId}`}
                    aria-selected={aba === abaId}
                    tabIndex={aba === abaId ? 0 : -1}
                    onClick={() => selecionar(abaId)}
                    onKeyDown={evento => atalhos(evento, i)}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            )}
            <div className="k-paineis" ref={area}>
              {abas.map(({ id: abaId, nome: rotulo }) => (
                <section
                  key={abaId}
                  className={`k-painel k-painel-${abaId}`}
                  id={`${id}-painel-${abaId}`}
                  ref={el => {
                    paineis.current[abaId] = el
                  }}
                  role={celular ? 'tabpanel' : undefined}
                  aria-labelledby={celular ? `${id}-aba-${abaId}` : undefined}
                  aria-label={!celular ? rotulo : undefined}
                  tabIndex={-1}
                  hidden={celular && aba !== abaId}
                >
                  {(!celular || aba === abaId || abaId === 'hoje') && conteudo[abaId]}
                </section>
              ))}
            </div>
            <Menu escritorioAtivo={celular && aba === 'escritorio'} ir={ir} />
          </>
        ) : (
          <div className="k-restrito">
            <p>{papel === null ? 'Ainda sem dado sobre seu acesso.' : 'Seu espaço de trabalho está à disposição.'}</p>
            {papel !== null && (
              <a className="k-botao" href={destino(papel === 'equipe' ? 'casa' : 'orcamento')}>
                {papel === 'equipe' ? 'Abrir Casa' : 'Abrir meu orçamento'} <Icone nome="abrir" size={16} />
              </a>
            )}
          </div>
        )}
      </div>
    </PrivacidadePropostas.Provider>
  )
}
