import { ArrowUpRight, X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { SALAS_NOME } from '../telas/escritorio/cenaBase'
import { POR_ID } from '../telas/escritorio/equipe'
import type { DadosInicio } from '../componentes/escritorio/dadosDeExemplo'
import { destinoDoPosto, type PessoaDoEscritorio, type TarefaDoEscritorio } from '../componentes/escritorio/modeloPosto'
import { useValoresOcultos, Valor } from '../componentes/escritorio/privacidade'

const estados = {
  vai_comecar: 'Ainda vai começar',
  trabalhando: 'Trabalhando',
  entregue: 'Entregue',
  precisa_de_voce: 'Precisa de você',
}

export function FichaPosto({
  dados,
  pessoa,
  tarefa,
  celular,
  fechar,
  verTarefa,
}: {
  dados: DadosInicio
  pessoa: PessoaDoEscritorio
  tarefa?: TarefaDoEscritorio
  celular: boolean
  fechar: () => void
  verTarefa: (id: string) => void
}) {
  const titulo = useId()
  const dialogo = useRef<HTMLDialogElement>(null)
  const nome = useRef<HTMLHeadingElement>(null)
  const indoParaFila = useRef(false)
  const oculto = useValoresOcultos()
  const papel = dados.pessoa.papel.valor
  const autorizado = papel === 'casal' || papel === 'pessoa'
  const estado = pessoa.estadoHoje.valor
  const membro = POR_ID[pessoa.id]
  const destino = destinoDoPosto(pessoa.id, papel)
  const medida =
    pessoa.id === 'contador'
      ? dados.saldoConta
      : pessoa.id === 'tesoureiro'
        ? dados.recebimentos.garantido
        : pessoa.id === 'imoveis'
          ? dados.imoveis.valorCadastrado
          : undefined
  const ultimo = pessoa.ultimoResultado?.valor

  useEffect(() => {
    if (!autorizado) return
    const folha = dialogo.current
    const origem = folha?.ownerDocument.activeElement
    folha?.showModal()
    nome.current?.focus({ preventScroll: true })
    return () => {
      folha?.close()
      if (!indoParaFila.current && origem instanceof HTMLElement && origem.isConnected)
        origem.focus({ preventScroll: true })
    }
  }, [autorizado])

  if (!autorizado) return null
  return (
    <dialog
      className="escritorio3d-ficha"
      ref={dialogo}
      aria-labelledby={titulo}
      data-celular={celular || undefined}
      onCancel={e => {
        e.preventDefault()
        fechar()
      }}
    >
      <header>
        <div>
          <p>
            {SALAS_NOME[pessoa.sala]} · {estado ? estados[estado] : 'Ainda sem dado'}
          </p>
          <h3 id={titulo} ref={nome} tabIndex={-1}>
            {pessoa.nome}
          </h3>
        </div>
        <button type="button" aria-label="Fechar ficha" onClick={fechar}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <dl>
        <dt>Função</dt>
        <dd>{membro?.papel ?? 'Ainda sem dado'}</dd>
        <dt>Agora</dt>
        <dd>
          {tarefa
            ? oculto
              ? 'Tarefa com detalhes ocultos'
              : tarefa.perguntaCurta || 'Aguardando uma decisão.'
            : pessoa.atividadeAtual?.valor
              ? oculto
                ? 'Atividade com detalhes ocultos'
                : pessoa.atividadeAtual.valor
              : estado === 'vai_comecar'
                ? 'Aguardando o início da atividade.'
                : 'Sem atividade detalhada no registro.'}
        </dd>
        <dt>Último resultado</dt>
        <dd>{ultimo ? (oculto ? 'Resultado oculto' : ultimo) : 'Ainda sem dado'}</dd>
        {papel === 'casal' && medida?.estado === 'pronto' && (
          <>
            <dt>
              {pessoa.id === 'contador'
                ? 'Saldo em conta'
                : pessoa.id === 'tesoureiro'
                  ? 'Receita garantida'
                  : 'Valor cadastrado dos imóveis'}
            </dt>
            <dd>{oculto ? <span aria-label="Valor oculto">•••</span> : <Valor campo={medida} />}</dd>
          </>
        )}
      </dl>
      <div className="escritorio3d-ficha-acoes">
        {destino && (
          <a href={destino.url}>
            Abrir {destino.rotulo} <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        )}
        {tarefa && (
          <button
            type="button"
            onClick={() => {
              indoParaFila.current = true
              fechar()
              verTarefa(tarefa.id)
            }}
          >
            Ver tarefa na fila
          </button>
        )}
        {papel === 'casal' && membro && (
          <a href={`../../#/escritorio?f=${encodeURIComponent(pessoa.id)}`}>Ver histórico</a>
        )}
      </div>
    </dialog>
  )
}
