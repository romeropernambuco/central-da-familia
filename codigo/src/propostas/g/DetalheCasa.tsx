import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icone, type NomeIcone } from '../../componentes/Icone'
import { CasaVazia, Plano2029, SemAplicacoes, SemCartoes, SemRecebimentos } from '../../componentes/ilustracoes'
import type { DadosInicio, NivelAlerta } from '../dadosExemplo'
import { DetalheFinanceiro, useValoresOcultos, Valor } from '../comuns/privacidade'
import { Cena, comodos, type Comodo } from './Cena'

export type Destino = Comodo | 'pendencias' | 'plano' | 'mais'

export const niveis = {
  'dinheiro em risco': {
    rotulo: 'Dinheiro em risco',
    saude: 'Há um pagamento que pede atenção',
    icone: 'erro',
    ordem: 0,
  },
  operacao: { rotulo: 'Operação', saude: 'A equipe precisa de você', icone: 'lancamentos', ordem: 1 },
  lembrete: { rotulo: 'Lembrete', saude: 'Há um lembrete para você', icone: 'recepcao', ordem: 2 },
} satisfies Record<NivelAlerta, { rotulo: string; saude: string; icone: NomeIcone; ordem: number }>

type Alerta = NonNullable<DadosInicio['alertas']['valor']>[number]

export function ordemAlertas(lista: readonly Alerta[]) {
  return [...lista].sort((a, b) => niveis[a.nivel].ordem - niveis[b.nivel].ordem)
}

const estados = {
  vai_comecar: 'Ainda vai começar',
  trabalhando: 'Trabalhando',
  entregue: 'Entregue',
  precisa_de_voce: 'Precisa de você',
} as const

const figuras = { caixa: SemRecebimentos, casa: CasaVazia, cartoes: SemCartoes, patrimonio: SemAplicacoes }
const tarefa = {
  caixa: 'Conferência dos recebimentos e das contas da família.',
  casa: 'Lista da feira, notas e estoque da casa.',
  cartoes: 'Conferência das compras e do vencimento das faturas.',
  patrimonio: 'Acompanhamento das aplicações e dos imóveis.',
}

function Numero({ label, campo }: { label: string; campo: Parameters<typeof Valor>[0]['campo'] }) {
  return (
    <div className="cv-indicador">
      <dt>{label}</dt>
      <dd>
        <Valor campo={campo} className="numero-secundario" />
      </dd>
    </div>
  )
}

function Sala({ dados, sala }: { dados: DadosInicio; sala: Comodo }) {
  const pessoas = dados.funcionarios.valor?.filter(p => p.sala === sala) ?? []
  const Figura = figuras[sala]
  return (
    <>
      <div className="cv-cena-detalhe">
        {pessoas.length ? <Cena dados={dados} foco={sala} plaquinhas /> : <Figura />}
      </div>
      <p className="cv-texto-suave">{tarefa[sala]}</p>
      {pessoas.length ? (
        <ul className="cv-equipe" aria-label="Equipe do cômodo">
          {pessoas.map(p => (
            <li key={p.id}>
              <span className="cv-avatar">
                <Icone nome="pessoa" size={16} />
              </span>
              <span>
                <strong>{p.nome}</strong>
                <small>{p.estadoHoje.valor ? estados[p.estadoHoje.valor] : 'Estado indisponível'}</small>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>{dados.funcionarios.estado === 'indisponivel' ? 'Equipe indisponível.' : 'Ninguém neste cômodo ainda.'}</p>
      )}

      <dl className="cv-indicadores">
        {sala === 'caixa' && <Numero label="Recebimentos previstos no mês" campo={dados.recebimentos.previsto} />}
        {sala === 'casa' && <Numero label="Notas da feira pendentes" campo={dados.casa.notasPendentes} />}
        {sala === 'patrimonio' && (
          <>
            <Numero label="Rendimento de hoje" campo={dados.aplicacoes.rendeuHoje} />
            <Numero label="Aluguel líquido estimado" campo={dados.imoveis.aluguelLiquidoEstimado} />
          </>
        )}
      </dl>
      {sala === 'cartoes' &&
        (dados.faturas.proximas.valor ? (
          <ul className="cv-faturas" aria-label="Cartões com fatura">
            {dados.faturas.proximas.valor.map(f => (
              <li key={f.id}>
                <strong>
                  <DetalheFinanceiro>{f.nome}</DetalheFinanceiro>
                </strong>{' '}
                · {f.conferir ? 'A conferir' : 'Registrada'}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {dados.faturas.proximas.estado === 'vazio' ? 'Nenhuma próxima fatura.' : 'Lista de faturas indisponível.'}
          </p>
        ))}
    </>
  )
}

function Plano({ dados }: { dados: DadosInicio }) {
  const oculto = useValoresOcultos()
  const cobertura = dados.plano2029.progressao
  return (
    <>
      <Plano2029 />
      <p className="cv-texto-suave">Quanto da renda planejada está coberta pela estimativa atual.</p>
      <dl className="cv-indicadores">
        <Numero label="Cobertura estimada" campo={cobertura} />
        <Numero label="Renda mensal estimada" campo={dados.plano2029.rendaEstimada} />
      </dl>
      {!oculto && cobertura.estado === 'pronto' && (
        <progress
          className="cv-progresso"
          max={100}
          value={Math.max(0, Math.min(100, cobertura.valor))}
          aria-hidden="true"
        />
      )}
    </>
  )
}

function Pendencias({ campo }: { campo: DadosInicio['alertas'] }) {
  if (campo.estado === 'indisponivel') return <p>A equipe ainda não conseguiu carregar os avisos.</p>
  if (!campo.valor?.length) return <p>Nenhum aviso na fila por agora.</p>
  return (
    <ul className="cv-avisos">
      {ordemAlertas(campo.valor).map(a => {
        const nivel = niveis[a.nivel]
        return (
          <li key={a.id} data-risco={a.nivel === 'dinheiro em risco'}>
            <span className="cv-pilula">
              <Icone nome={nivel.icone} size={16} />
              {nivel.rotulo}
            </span>
            <p>
              <DetalheFinanceiro>{a.texto}</DetalheFinanceiro>
            </p>
          </li>
        )
      })}
    </ul>
  )
}

export function DetalheCasa({
  dados,
  destino,
  abrir,
  fechar,
}: {
  dados: DadosInicio
  destino: Destino
  abrir: (destino: Destino) => void
  fechar: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const id = useId()
  const comodo = comodos.find(c => c.id === destino)
  const titulos = { pendencias: 'Precisa de você', plano: 'Plano 2029', mais: 'Mais da sua casa' }
  const titulo = comodo ? comodo.nome : titulos[destino as keyof typeof titulos]
  let conteudo: ReactNode
  if (comodo) conteudo = <Sala dados={dados} sala={comodo.id} />
  else if (destino === 'plano') conteudo = <Plano dados={dados} />
  else if (destino === 'pendencias') conteudo = <Pendencias campo={dados.alertas} />
  else
    conteudo = (
      <div className="cv-atalhos">
        <button type="button" className="cv-alvo cv-link" onClick={() => abrir('plano')}>
          <Icone nome="plano2029" size={18} /> Plano 2029 <Icone nome="abrir" size={16} />
        </button>
        <button type="button" className="cv-alvo cv-link" onClick={() => abrir('pendencias')}>
          <Icone nome="lancamentos" size={18} /> Pendências <Icone nome="abrir" size={16} />
        </button>
      </div>
    )

  useEffect(() => {
    const dialog = ref.current!
    const quadro = dialog.closest('.lab-quadro')
    function posicionar() {
      if (!quadro) return
      const area = quadro.getBoundingClientRect()
      const esquerda = Math.max(0, area.left)
      const direita = Math.min(window.innerWidth, area.right)
      const base = Math.min(window.innerHeight, area.bottom)
      dialog.style.setProperty('--cv-folha-centro', `${(esquerda + direita) / 2}px`)
      dialog.style.setProperty('--cv-folha-largura', `${Math.max(0, direita - esquerda - 2)}px`)
      dialog.style.setProperty('--cv-folha-altura', `${Math.max(0, base - Math.max(0, area.top) - 16)}px`)
      dialog.style.setProperty('--cv-folha-base', `${window.innerHeight - base + 1}px`)
    }
    posicionar()
    dialog.showModal()
    window.addEventListener('resize', posicionar)
    window.addEventListener('scroll', posicionar, true)
    const observador = new ResizeObserver(posicionar)
    if (quadro) observador.observe(quadro)
    return () => {
      observador.disconnect()
      window.removeEventListener('resize', posicionar)
      window.removeEventListener('scroll', posicionar, true)
      dialog.close()
    }
  }, [])

  useEffect(() => {
    ref.current!.scrollTop = 0
    tituloRef.current!.focus({ preventScroll: true })
  }, [destino])

  function encerrar() {
    ref.current?.close()
    fechar()
  }

  return (
    <dialog
      className="cv-folha"
      ref={ref}
      aria-labelledby={id}
      onCancel={evento => {
        evento.preventDefault()
        encerrar()
      }}
      onClick={evento => {
        if (evento.target !== evento.currentTarget) return
        const area = evento.currentTarget.getBoundingClientRect()
        if (
          evento.clientX < area.left ||
          evento.clientX > area.right ||
          evento.clientY < area.top ||
          evento.clientY > area.bottom
        )
          encerrar()
      }}
    >
      <div className="cv-folha-cabecalho">
        <div>
          {comodo && <p>{comodo.area}</p>}
          <h2 id={id} ref={tituloRef} tabIndex={-1}>
            {titulo}
          </h2>
        </div>
        <button type="button" className="cv-alvo cv-fechar" aria-label="Fechar detalhe" onClick={encerrar}>
          <Icone nome="fechar" />
        </button>
      </div>
      {conteudo}
    </dialog>
  )
}
