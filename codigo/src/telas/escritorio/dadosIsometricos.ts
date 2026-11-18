import type { EscritorioHoje, EstadoFuncionario, FuncionarioEsc, Papel, PerguntaEsc } from '../../api/tipos'
import { chaveSimples } from '../../api/normaliza2'
import { reais } from '../../lib/formato'
import { valorDaPendencia } from '../../lib/resumo/pendencias'
import { textoDeAgente } from '../../lib/textoAgente'
import { APELIDO_BANCO, EQUIPE, type MembroEquipe } from './equipe'
import { funcionarioAutorizado } from './elencoPorAba'
import { SALAS_NOME } from './cenaBase'

export interface PostoIsometrico {
  membro: MembroEquipe
  funcionario: FuncionarioEsc
}

export function dadosIsometricos(dado: EscritorioHoje | null, perfil: { papel: Papel; oculto: boolean; dono?: boolean }) {
  const { papel, oculto, dono } = perfil
  const permitidos = EQUIPE.filter(m => papel === 'casal' || funcionarioAutorizado(m.id, papel, dono))
  const banco = new Map(dado?.funcionarios?.map(f => [APELIDO_BANCO[f.id] || f.id, f]))
  const idDe = (id: string) => APELIDO_BANCO[id] || id
  const pertence = (referencia: string, m: MembroEquipe) =>
    idDe(referencia) === m.id || chaveSimples(referencia) === chaveSimples(banco.get(m.id)?.nome || m.nome)

  // O RPC devolve a fila já limitada ao usuário autenticado. O cadastro limita as ações por papel.
  const fila = (dado?.precisa_de_voce || []).flatMap(p => {
    const membro = permitidos.find(m => pertence(p.funcionario, m))
    if (!membro) return []
    const { valor: _valor, ...semValor } = p
    const valor = papel === 'equipe' ? null : valorDaPendencia(p)
    return [{
      membro,
      pergunta: { ...(papel === 'equipe' ? semValor : p), funcionario: membro.id },
      texto: oculto ? 'Tarefa pendente' : textoDeAgente(p.assunto || p.pergunta, p.trechosPrivados || [], papel === 'equipe'),
      valor: papel === 'equipe' ? null : oculto ? '••••' : valor === null ? 'Ainda sem dado' : reais(valor),
    }]
  })
  const porFuncionario = new Map<string, typeof fila[number]>()
  for (const p of fila) if (!porFuncionario.has(p.membro.id)) porFuncionario.set(p.membro.id, p)
  const postos: PostoIsometrico[] = permitidos.map(membro => {
    const f = banco.get(membro.id)
    const pendencia = porFuncionario.get(membro.id)
    const observavel = papel !== 'equipe' && (papel !== 'casal' || membro.id !== 'analista' || dono)
    const estadoDoBanco = f?.estado === 'trabalhando' || f?.estado === 'entregue' ? f.estado : 'vai_comecar'
    const estado: EstadoFuncionario = pendencia ? 'precisa_de_voce'
      : !observavel ? 'vai_comecar'
      : dado?.trabalhando?.some(t => pertence(t.funcionario, membro)) ? 'trabalhando'
      : dado?.entregue?.some(t => pertence(t.funcionario, membro)) ? 'entregue'
      : estadoDoBanco
    const semDado = !pendencia && estado === 'vai_comecar' && (!f || !!f.semDado || !observavel)
    return {
      membro,
      funcionario: {
        ...(papel === 'casal' && observavel ? f : undefined),
        id: membro.id, nome: membro.nome, sala: SALAS_NOME[membro.sala], estado, semDado,
        frase: (papel === 'casal' && observavel ? f?.frase : undefined) || (semDado ? `Ainda sem dado. ${membro.papel}` : membro.papel),
        faz: membro.faz,
      },
    }
  })
  const perguntas: PerguntaEsc[] = fila.map(p => p.pergunta)
  return { fila, postos, perguntas, total: fila.length }
}

export type DadosIsometricos = ReturnType<typeof dadosIsometricos>
