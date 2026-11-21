import { rotaPermitida, type Rota } from '../../lib/rotas'
import { APELIDO_BANCO, DESTINO_SECRETARIA, POR_ID } from '../../lib/escritorio/equipe'
import type { DadosInicio } from './dadosDeExemplo'

export type PessoaDoEscritorio = NonNullable<DadosInicio['funcionarios']['valor']>[number]
export type TarefaDoEscritorio = NonNullable<DadosInicio['pendencias']['fila']['valor']>[number]

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()

export function responsavelDaTarefa(dados: DadosInicio, tarefa: TarefaDoEscritorio) {
  const nome = normalizar(tarefa.funcionario)
  const id = Object.prototype.hasOwnProperty.call(APELIDO_BANCO, nome) ? APELIDO_BANCO[nome] : nome
  return dados.funcionarios.valor?.find(f => f.id === id || normalizar(f.nome) === nome || normalizar(f.curto) === nome)
}

export function resumoDaEquipe(equipe: import('./EscritorioMaquete').PropsEscritorioMaquete['funcionarios']) {
  if (equipe.estado !== 'pronto' || !equipe.valor.length) return 'Equipe · Ainda sem dado'
  const naEquipe = `${equipe.valor.length} na equipe`
  const trabalhando = equipe.valor.filter(f => f.estadoHoje.valor === 'trabalhando').length
  if (trabalhando) return trabalhando === 1 ? '1 pessoa trabalhando' : `${trabalhando} pessoas trabalhando`
  const esperando = equipe.valor.filter(f => f.estadoHoje.valor === 'precisa_de_voce').length
  return esperando ? `${naEquipe}, ${esperando} aguardando resposta` : `${naEquipe}, nenhuma tarefa em andamento`
}

const rotulos: Partial<Record<Rota, string>> = {
  inicio: 'Início',
  lancamentos: 'Lançamentos',
  planejamento: 'Planejamento',
  casa: 'Casa',
  cartoes: 'Cartões',
  orcamento: 'Orçamento',
  guardado: 'Guardado',
  escritorio: 'Escritório',
  desejos: 'Desejos',
  ajustes: 'Ajustes',
  privacidade: 'Privacidade',
  painel: 'Painel',
}
const secoes: Partial<Record<string, string>> = {
  imoveis: 'imoveis',
  guardado: 'aplicacoes',
  tesoureiro: 'recebimentos',
  folha: 'folha',
  comprador: 'feira',
  fiscal: 'feira',
}

export function destinoDoPosto(id: string, papel: DadosInicio['pessoa']['papel']['valor'], dono = false) {
  const membro = Object.prototype.hasOwnProperty.call(POR_ID, id) ? POR_ID[id] : undefined
  if (!membro || !papel || rotaPermitida(membro.rota, papel, dono) !== membro.rota) return
  const secao = secoes[id]
  const hash =
    id === 'secretaria' ? DESTINO_SECRETARIA : '#/' + membro.rota + (secao ? '?' + new URLSearchParams({ secao }) : '')
  return { url: '../../' + hash, hash, rota: membro.rota, rotulo: id === 'imoveis' ? 'Imóveis' : rotulos[membro.rota] }
}
