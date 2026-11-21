import { textoPrivado } from '../../lib/olho'
import { Icone } from '../../componentes/Icone'
import './casa.css'
import { useRascunho } from '../../app/useRascunho'
import { validarNome } from '../../lib/nomePessoa'
import { useState } from 'react'
import { useAcoes } from '../../app/contexto'
import { useConfig } from '../../app/useConfig'
import { CampoPrivado } from '../../componentes/privacidade'
import { Sheet } from '../../componentes/base'
import { novoUuid } from '../../lib/seguro'
import type { Folha } from '../escritorio/ajudantes'

export function CadastroAssessor({ fechar }: { fechar: () => void }) {
  const { toast } = useAcoes()
  const [folha, salvar, falha, lido] = useConfig<Folha>('casa_folha', { pessoas: [], daePaga: {} })
  const [nome, setNome] = useRascunho('cadastro:assessor:nome', ''),
    [funcao, setFuncao] = useRascunho('cadastro:assessor:funcao', ''),
    [celular, setCelular] = useRascunho('cadastro:assessor:celular', '')
  const [erro, setErro] = useState(''),
    [ocupado, setOcupado] = useState(false)
  return (
    <Sheet titulo="Cadastrar Assessor da Casa" fechar={fechar}>
      <form
        className="casa-cadastro"
        style={{ display: 'grid', gap: 12 }}
        onSubmit={async e => {
          e.preventDefault()
          if (ocupado) return
          if (!nome.trim()) {
            setErro('Informe o nome do Assessor da Casa.')
            return
          }
          try {
            validarNome(nome, folha.pessoas)
          } catch (e) {
            setErro((e as Error).message)
            return
          }
          setErro('')
          setOcupado(true)
          const ok = await salvar({
            ...folha,
            pessoas: [
              ...folha.pessoas,
              { id: novoUuid(), nome: nome.trim(), funcao: funcao.trim(), celular: celular.trim(), salario: 0 },
            ],
          })
          setOcupado(false)
          if (ok) {
            ;[setNome, setFuncao, setCelular].forEach(s => s.limpar())
            toast('Assessor da Casa cadastrado. Você já pode gerar o convite.')
            fechar()
          }
        }}
      >
        <p className="todo">
          <Icone nome="privacidade" />
          <span>Acesso para cuidar da Casa, sem ver valores.</span>
        </p>
        <label className="campo">
          <span>Nome obrigatório</span>
          <CampoPrivado
            className="inp"
            aria-label="Nome do Assessor da Casa"
            required
            maxLength={60}
            value={nome}
            onChange={e => setNome(e.target.value)}
          />
        </label>
        <label className="campo">
          <span>Função na casa · opcional</span>
          <CampoPrivado
            className="inp"
            maxLength={60}
            placeholder="Cozinha, transporte ou limpeza"
            value={funcao}
            onChange={e => setFuncao(e.target.value)}
          />
        </label>
        <label className="campo">
          <span>Celular · opcional</span>
          <CampoPrivado
            className="inp"
            type="tel"
            maxLength={25}
            autoComplete="tel"
            value={celular}
            onChange={e => setCelular(e.target.value)}
          />
        </label>
        <p className="sub">
          O cadastro identifica a pessoa. O acesso é criado ao gerar o convite. O salário pode ser informado depois, na
          aba Folha.
        </p>
        {(erro || falha) && (
          <p role="alert" className="erro">
            {textoPrivado(erro || falha)}
          </p>
        )}
        <button className="btn primary full" type="submit" disabled={ocupado || !!falha || !lido}>
          <Icone nome="assessor" />
          Cadastrar Assessor da Casa
        </button>
      </form>
    </Sheet>
  )
}
