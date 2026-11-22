// Dinheiro na rua: dinheiro que saiu da conta para um negócio e que tem que voltar (carro para revender, baia de porcos,
// reforma para vender, empréstimo a alguém). Não é gasto do mês nem aplicação de banco.
// A pergunta é sempre a mesma: quanto pus, quanto já voltou, quanto falta, até quando, e se valeu mais que deixar no banco.
// Aqui ficam só as contas. Quem guarda é a configuração da família (chave `dinheiro_na_rua`), que só o casal lê e grava.

export const TIPOS_NEGOCIO = ['veiculo', 'criacao', 'imovel', 'empresa', 'emprestimo', 'outro'] as const
export type TipoNegocio = (typeof TIPOS_NEGOCIO)[number]
export const NOME_DO_TIPO: Record<TipoNegocio, string> = {
  veiculo: 'Veículo',
  criacao: 'Criação ou plantio',
  imovel: 'Imóvel ou obra',
  empresa: 'Empresa',
  emprestimo: 'Empréstimo a alguém',
  outro: 'Outro',
}

export interface MovimentoNegocio {
  id: string
  data: string
  /** `pus` = saiu da conta para o negócio; `voltou` = entrou de volta */
  tipo: 'pus' | 'voltou'
  valor: number
  nota?: string
}
export interface Negocio {
  id: string
  nome: string
  tipo: TipoNegocio
  /** sócio ou quem está tocando o negócio */
  com_quem?: string
  /** a sua parte no lucro, em % (50 = meio a meio) */
  minha_parte: number
  /** o que foi combinado, com as suas palavras */
  combinado?: string
  /** até quando o dinheiro tem que ter voltado (AAAA-MM-DD) */
  prazo: string
  /** quanto você espera receber de volta no total; null = ainda não sabe */
  volta_prevista: number | null
  /** id em membros de quem pôs o dinheiro */
  dono?: string | null
  movimentos: MovimentoNegocio[]
  /** AAAA-MM-DD em que o negócio acabou; null = ainda está na rua */
  encerrado_em: string | null
  criado_em: string
}

const c2 = (v: number) => Math.round(v * 100) / 100
const dia = (d: string) => Date.parse(d + 'T12:00:00Z')
/** Dias corridos de `a` até `b` (negativo se `b` vem antes). */
export const diasEntre = (a: string, b: string) => Math.round((dia(b) - dia(a)) / 86400000)

export interface ContaNegocio {
  posto: number
  voltado: number
  /** o que ainda falta voltar do que você pôs (0 quando encerrou ou já voltou tudo) */
  na_rua: number
  /** voltado − posto. Com o negócio aberto, só é lucro quando passa de zero. */
  resultado: number
  /** dias desde o primeiro dinheiro posto até hoje (ou até encerrar) */
  dias: number
  /** dias que faltam para o prazo; negativo = dias de atraso; null quando encerrou */
  dias_para_prazo: number | null
  situacao: 'encerrado' | 'atrasado' | 'vence_logo' | 'no_prazo'
  /** quanto os mesmos valores, nas mesmas datas, teriam rendido no banco (antes do imposto) */
  no_banco: number
  /** lucro esperado, se a volta prevista foi informada */
  lucro_previsto: number | null
  /** resultado (ou lucro previsto, se aberto) sobre o que foi posto, em % */
  pct: number | null
}

/** Rendimento dos mesmos valores no banco: cada dinheiro posto rende até voltar, à taxa do ano informada. */
function rendimentoNoBanco(movs: MovimentoNegocio[], ate: string, taxaAno: number) {
  const porDia = Math.pow(1 + taxaAno / 100, 1 / 365)
  let saldo = 0,
    rendeu = 0,
    ultimo = ''
  for (const m of [...movs].filter(x => x.data <= ate).sort((a, b) => a.data.localeCompare(b.data))) {
    if (ultimo && saldo > 0) {
      const novo = saldo * Math.pow(porDia, Math.max(0, diasEntre(ultimo, m.data)))
      rendeu += novo - saldo
      saldo = novo
    }
    saldo = Math.max(0, saldo + (m.tipo === 'pus' ? m.valor : -m.valor))
    ultimo = m.data
  }
  if (ultimo && saldo > 0) rendeu += saldo * Math.pow(porDia, Math.max(0, diasEntre(ultimo, ate))) - saldo
  return c2(rendeu)
}

/** Dias de aviso antes do prazo: a partir daqui o negócio aparece como "vence logo". */
export const AVISO_PRAZO_DIAS = 15

export function contaDoNegocio(n: Negocio, hoje: string, taxaAno: number): ContaNegocio {
  const soma = (tipo: 'pus' | 'voltou') =>
    c2(n.movimentos.filter(m => m.tipo === tipo).reduce((s, m) => s + m.valor, 0))
  const posto = soma('pus'),
    voltado = soma('voltou')
  const fim = n.encerrado_em || hoje
  const primeiro = n.movimentos.map(m => m.data).sort()[0] || n.criado_em.slice(0, 10)
  const dias_para_prazo = n.encerrado_em ? null : diasEntre(hoje, n.prazo)
  const resultado = c2(voltado - posto)
  const lucro_previsto = n.volta_prevista == null ? null : c2(n.volta_prevista - posto)
  const base = n.encerrado_em ? resultado : lucro_previsto
  return {
    posto,
    voltado,
    na_rua: n.encerrado_em ? 0 : Math.max(0, c2(posto - voltado)),
    resultado,
    dias: Math.max(0, diasEntre(primeiro, fim)),
    dias_para_prazo,
    situacao: n.encerrado_em
      ? 'encerrado'
      : dias_para_prazo! < 0
        ? 'atrasado'
        : dias_para_prazo! <= AVISO_PRAZO_DIAS
          ? 'vence_logo'
          : 'no_prazo',
    no_banco: rendimentoNoBanco(n.movimentos, fim, taxaAno),
    lucro_previsto,
    pct: base == null || !posto ? null : Math.round((1000 * base) / posto) / 10,
  }
}

/** "faltam 12 dias", "vence hoje", "atrasado há 3 dias". */
export function fraseDoPrazo(c: Pick<ContaNegocio, 'dias_para_prazo'>) {
  const d = c.dias_para_prazo
  if (d == null) return 'encerrado'
  if (d === 0) return 'vence hoje'
  if (d < 0) return `atrasado há ${d === -1 ? '1 dia' : `${-d} dias`}`
  return d === 1 ? 'falta 1 dia' : `faltam ${d} dias`
}

export interface TotaisNaRua {
  na_rua: number
  abertos: number
  atrasados: number
  /** o que você espera receber de volta dos abertos que têm previsão */
  volta_prevista: number
  lucro_encerrados: number
}
export function totaisNaRua(negocios: Negocio[], hoje: string, taxaAno: number): TotaisNaRua {
  const contas = negocios.map(n => ({ n, c: contaDoNegocio(n, hoje, taxaAno) }))
  const abertos = contas.filter(x => !x.n.encerrado_em)
  return {
    na_rua: c2(abertos.reduce((s, x) => s + x.c.na_rua, 0)),
    abertos: abertos.length,
    atrasados: abertos.filter(x => x.c.situacao === 'atrasado').length,
    volta_prevista: c2(abertos.reduce((s, x) => s + Math.max(0, (x.n.volta_prevista ?? 0) - x.c.voltado), 0)),
    lucro_encerrados: c2(contas.filter(x => x.n.encerrado_em).reduce((s, x) => s + x.c.resultado, 0)),
  }
}

/** Abertos primeiro, do prazo mais perto para o mais longe; encerrados no fim, do mais recente para o mais antigo. */
export function ordenarNegocios(negocios: Negocio[]) {
  return [...negocios].sort((a, b) =>
    !a.encerrado_em !== !b.encerrado_em
      ? a.encerrado_em
        ? 1
        : -1
      : a.encerrado_em
        ? b.encerrado_em!.localeCompare(a.encerrado_em)
        : a.prazo.localeCompare(b.prazo),
  )
}

/** A lista que veio do banco pode estar velha ou estragada: só passa o que tem formato de negócio. */
export function lerNegocios(v: unknown): Negocio[] {
  if (!Array.isArray(v)) return []
  return (v as Partial<Negocio>[]).filter(
    (n): n is Negocio =>
      !!n &&
      typeof n.id === 'string' &&
      typeof n.nome === 'string' &&
      typeof n.prazo === 'string' &&
      Array.isArray(n.movimentos),
  )
}

/** Confere a folha de criar ou mudar negócio; devolve a frase do erro ou ''. */
export function erroDoNegocio(n: {
  nome: string
  prazo: string
  valor: number
  minha_parte: string
  hoje: string
  novo: boolean
}) {
  if (!n.nome.trim() || n.nome.trim().length > 60) return 'Dê um nome de até 60 letras. Ex.: Carro para revender.'
  if (n.novo && !(n.valor > 0)) return 'Digite quanto você pôs. Ex.: 30000.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n.prazo))
    return 'Diga até quando o dinheiro tem que voltar. Sem prazo, ninguém cobra.'
  if (n.novo && n.prazo < n.hoje) return 'O prazo já passou. Escolha uma data de hoje em diante.'
  const parte = Number(n.minha_parte.replace(',', '.'))
  if (!(parte > 0 && parte <= 100)) return 'A sua parte no lucro vai de 1 a 100. Meio a meio é 50.'
  return ''
}
