import { textoPrivado } from '../lib/olho'
import './apoio-f32.css'
import { Icone } from './Icone'
import { useRef, useState } from 'react'
import type { PessoaNome } from '../api/tipos'
import { useApp } from '../app/contexto'
import { useMembros } from '../app/useMembros'
import { nomeInformado } from '../lib/nomePessoa'
import { useEdicaoNome } from '../app/useEdicaoNome'
import { Sheet } from './base'
import { CampoPrivado } from './privacidade'

/** Folha de identidade compartilhada: nunca contém valores. */
export function NomeDaPessoa({
  pessoa,
  editar = false,
  mudou,
  autoria = false,
}: {
  pessoa: PessoaNome
  autoria?: boolean
  editar?: boolean
  mudou?: () => void
}) {
  const { oculto, familia } = useApp()
  const membros = useMembros()
  const atual = pessoa.tipo === 'membro' ? (membros(pessoa.id) ?? pessoa.nome) : pessoa.nome
  const tem = nomeInformado(atual)
  const [aberto, abrir] = useState(false),
    [nome, setNome] = useState(''),
    [funcao, setFuncao] = useState('')
  const [erro, setErro] = useState(''),
    [ocupado, ocupar] = useState(false)
  const trava = useRef(false)
  const { permitido, salvar, somenteCadastro } = useEdicaoNome(pessoa)
  if (pessoa.tipo === 'membro' && !tem && membros.carregando) return <span role="status">Carregando identificação</span>
  if (pessoa.tipo === 'membro' && membros.erro)
    return (
      <span role="status">
        Não foi possível carregar os nomes.{' '}
        <button className="lnk" type="button" onClick={membros.repetir}>
          Tentar de novo
        </button>
      </span>
    )
  if (autoria && !tem) return <span>{textoPrivado('alguém da família', oculto)}</span>
  return (
    <>
      <span>{tem ? textoPrivado(atual, oculto) : 'Sem nome.'}</span>{' '}
      {(!tem || editar) &&
        (permitido ? (
          <button
            className="lnk nome-pessoa"
            type="button"
            onClick={() => {
              setNome(tem ? atual!.trim() : '')
              setFuncao(pessoa.funcao || '')
              setErro('')
              abrir(true)
            }}
          >
            <Icone nome="pessoa" size={16} />
            {tem ? 'Editar nome' : 'Informar'}
          </button>
        ) : (
          <small>Peça a quem administra a família para informar o nome</small>
        ))}
      {aberto && (
        <Sheet
          titulo={tem ? 'Editar nome' : 'Informar nome'}
          fechar={() => {
            if (!ocupado) abrir(false)
          }}
        >
          {oculto ? (
            <p>Abra o olho para informar o nome.</p>
          ) : (
            <form
              onSubmit={async e => {
                e.preventDefault()
                if (trava.current || !permitido) return
                trava.current = true
                ocupar(true)
                setErro('')
                try {
                  await salvar(nome, funcao)
                  mudou?.()
                  abrir(false)
                } catch (e) {
                  setErro((e as Error).message)
                } finally {
                  trava.current = false
                  ocupar(false)
                }
              }}
            >
              {somenteCadastro && (
                <p className="sub">
                  Altera este cadastro. O nome da conta de acesso depende de quem administra a família.
                </p>
              )}
              <label className="campo">
                <span>Nome</span>
                <CampoPrivado
                  className="inp"
                  autoFocus
                  required
                  maxLength={60}
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                />
              </label>
              {(pessoa.tipo === 'assessor' || familia?.papel === 'equipe') && (
                <label className="campo">
                  <span>Função na casa</span>
                  <CampoPrivado
                    className="inp"
                    maxLength={60}
                    value={funcao}
                    onChange={e => setFuncao(e.target.value)}
                  />
                </label>
              )}
              {erro && <p role="alert">{textoPrivado(erro)}</p>}
              <button className="btn line" type="submit" disabled={ocupado}>
                <Icone nome="salvo" />
                {ocupado ? 'Salvando…' : 'Salvar nome'}
              </button>
            </form>
          )}
        </Sheet>
      )}
    </>
  )
}
