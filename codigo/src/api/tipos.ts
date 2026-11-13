// O que o app espera do banco. Os nomes seguem CONTRATO.md (schema `produto`).

export type Papel = 'casal' | 'pessoa' | 'equipe'

export interface FamiliaMinha { id: string; nome: string; papel: Papel; membroNome: string; envelopeId: string | null }

export interface Sessao { userId: string; email: string | null; familias: FamiliaMinha[]; dono: boolean }

export interface LinhaExplicacao { linha: string; valor: number }

export interface Envelope {
  id: string
  nome: string
  regra: 'mensal' | 'diario' | 'semanal'
  limite_mes: number
  gasto_mes: number
  livre: number
  valor_dia?: number
  teto_semana?: number
  gasto_semana?: number
  casa?: boolean
  /** Limite mensal digitado pelo casal (no semanal, limite_mes é o teto × segundas do mês). */
  limite_base?: number
  /** Colchão combinado deste envelope (envelopes.colchao). */
  colchao_meta?: number
  /* Vêm do banco (_resumo/_diario); o modo exemplo agora manda igual (R0). */
  /** O que ainda pode gastar hoje neste envelope (nunca menor que 0). */
  hoje?: number
  gasto_hoje?: number
  /** O dia inteiro de hoje, antes do gasto de hoje (banco: _diario.valor_dia). */
  valor_dia_inteiro?: number
  /** Saldo do mês depois do gasto de hoje (pode ser negativo: aí "fica devendo"). */
  ate_fim_mes?: number
  peso_fds?: number
  /** Quanto o mês passado passou do combinado e saiu deste mês. */
  falta_mes_anterior?: number
  /** Parcelas de compras antigas que caem neste mês (já descontadas). */
  parcelas_mes?: number
  /** Valor do dia de amanhã se nada mais for gasto hoje (só no "por dia"). */
  amanha?: number | null
  /** Quanto ainda dá pra gastar de hoje até domingo (só no "por dia"). */
  ate_domingo?: number
  /** Gasto desde segunda (só no "por dia"). */
  gasto_semana_dia?: number
  /* Rodada 2 (modo exemplo; no banco precisa de campo novo no _resumo) */
  /** Parcelas e compras grandes de 1 vez neste mês: contam 1 vez na projeção, fora do ritmo do dia. */
  pontual_mes?: number
  /** Parte de gasto_semana_dia que é compra grande ou parcela. */
  pontual_semana?: number
  /** L2 "Por que mudou?": o valor do dia de ontem e o que mexeu nele. */
  mudou?: { ontem: number; motivo: string } | null
  /** Quanto o mês passado passou (pra a frase da virada: "Dezembro começa com R$ X"). */
  mes_anterior?: { mes: string; gasto: number; limite: number } | null
}

export interface ResumoHoje {
  pode_gastar_hoje: number
  livre_mes: number
  colchao: number
  dias_restantes: number
  envelopes: Envelope[]
  explicacao: LinhaExplicacao[]
  /** Equipe da casa: o banco manda só o nome dos envelopes da Casa, sem nenhum número de dinheiro. */
  so_nomes?: boolean
  /** R1: soma dos limites dos outros (sem detalhe), pra o Planejamento fechar a conta com a renda do casal. */
  limites_outros?: number
  /** Rodada 2: placar do casal "se continuar assim" (só o que vem pela frente, sem item de ninguém). */
  placar_casal?: { nome: string; fecha: number; limite: number; eu: boolean }[]
}

export interface Lancamento {
  id: string
  envelope_id: string
  cartao_id: string | null
  valor: number
  data: string
  descricao: string | null
  apagado_em: string | null
  criado_em: string
  /** Compra no cartão em N vezes (1 = à vista). */
  parcelas?: number
  /** Linha que é só a parcela de uma compra de outro mês (não dá pra apagar sozinha). */
  parcela?: { n: number; de: number; compra: string }
  /** Membro que lançou. */
  autor?: string
}

/** Pessoa da família e como está o convite dela. */
export interface ConviteFamilia { id: string; nome: string; email: string | null; papel: Papel; situacao: 'esperando' | 'entrou' | 'cancelado'; entrou_em?: string | null; enviado_em?: string | null }

export interface Cartao {
  id: string; nome: string; dia_fechamento: number | null; dia_vencimento: number | null
  /* CONTRATO3: cadastro do Analista de Cartão. Nunca o número do cartão: só apelido e, se quiser, os 4 últimos. */
  banco?: string | null; /** nome de quem é o cartão (pra mostrar) */ titular?: string | null; /** id do membro da família (é o que vai pro banco) */ titular_id?: string | null; limite?: number | null
  taxa_valor?: number | null; taxa_periodo?: 'mes' | 'ano' | null; taxa_mes?: number | null; taxa_isenta_acima?: number | null
  final4?: string | null; ativo?: boolean
}
/** Fatura do mês como veio no banco (produto.cartao_faturas). */
export interface FaturaBanco { cartao_id: string; mes: string; valor_banco: number | null; paga_em: string | null; paga_por?: string | null }
/** Feira da semana (produto.feiras). `valor` só chega pro casal. */
export interface Feira { id: string; semana: string; data: string; valor?: number; loja: string | null; tem_nota: boolean; sem_nota_motivo: string | null; feita_por: string | null }
export type EstadoItem = 'tem' | 'pouco' | 'acabou'
export interface ItemEstoque { id: string; nome: string; categoria: string; ativo: boolean }
export interface Contagem { id: string; semana: string; data: string; contado_por: string | null; itens: { item_id: string; estado: EstadoItem }[] }
export interface Estoque { itens: ItemEstoque[]; contagens: Contagem[] }

export interface Fatura { cartao_id: string; cartao: string; mes: string; vencimento: string; fecha_em?: string; total: number; fechada: boolean; /** quanto desta fatura é gasto da Casa (quem pagou) */ da_casa?: number }

/** Equipe: `convite` é o id que vai no link e `codigo_4_digitos` o código. Casal e pessoa: `convite` vem como 'email'. */
export interface Convite { convite?: string; codigo_4_digitos?: string; expira_em?: string; email?: string; ok?: boolean }

export interface Numero { chave: string; nome: string; valor: number; texto: string; meta: string; ok: boolean; explicacao: string }

export interface NovoLancamento { familia: string; envelope: string; valor: number; data: string; descricao: string; cartao?: string | null; /** compra no cartão em N vezes */ parcelas?: number; /** segundos do toque no + até o toque no envelope; o banco grava no evento `lancamento` */ segundos?: number; /** 1 uuid por toque; a mesma chave numa nova tentativa do mesmo lançamento (o banco não grava 2 vezes) */ chave: string }

/** O que a equipe anota na Casa sem ler config_familia (a tranca não deixa): vai como evento. */
export type AvisoCasa = 'casa_gas' | 'casa_presenca'

export interface CupomLido { itens: { nome: string; valor: number; qtd?: number | null }[]; total: number; data: string | null; loja: string | null; aviso?: string; /** soma das linhas lidas e se ela bate com o total impresso (função versão 2) */ soma_dos_itens?: number; total_confere?: boolean }

/** O que a equipe (e o casal) vê da Casa por produto.casa_da_equipe: nenhum valor em dinheiro. */
export interface CasaDaEquipe {
  hoje: string
  eu: string | null
  lista: { id: string; nome: string; ok: boolean }[]
  /** compras da Casa nos últimos 7 dias: só nome e data */
  comprado: { data: string; nome: string }[]
  prestadores: { id: string; nome: string; servico: string; dia: number; proxima_visita: string; ultima_vez: string | null }[]
  gas: { trocas: string[]; media_dias: number | null; proxima_troca: string | null; avisar_em: string | null }
  presenca: { hoje: string[]; meu_ponto: { chegou?: string; saiu?: string } }
}

/** O que a equipe marca na Casa (produto.casa_marcar). Grava em config_familia, onde o casal lê. */
export type MarcaCasa = 'comprei' | 'acabou' | 'prestador_veio' | 'troquei_gas' | 'cheguei' | 'sai'

/* ---------- Guardado (a caixinha): CONTRATO2.md, seção A ---------- */
export type TipoAplicacao = 'caixinha' | 'cdb' | 'lci_lca' | 'poupanca' | 'tesouro_selic'
export interface GuardadoAplicacao {
  id: string; nome: string; banco: string; tipo: TipoAplicacao; pct_cdi: number; saldo: number
  rendeu_hoje_liquido: number; rendeu_mes_liquido: number; ir_faixa: number
  vence_em: string | null; liquidez: 'diaria' | 'vencimento'; fgc_ok: boolean
  /** No nome de quem (membro); null = do casal. */
  titular?: string | null; titular_nome?: string | null
}
/** O que produto.guardado_hoje devolve. Só o casal recebe. */
export interface GuardadoHoje {
  total: number
  rendeu_hoje_bruto: number
  rendeu_hoje_liquido: number
  rendeu_mes_liquido: number
  rendeu_desde_inicio_liquido: number
  cdi_usado: { data: string; pct_ano: number; fonte: string }
  por_dia_30: { data: string; liquido: number }[]
  aplicacoes: GuardadoAplicacao[]
  explicacao: LinhaExplicacao[]
  atualizado_em: string
  /** Por que hoje rendeu R$ 0 ("Hoje é sábado: rende de novo na segunda"). Vazio em dia útil. */
  motivo_zero?: string | null
  /** Saldo total no fim de cada um dos últimos 30 dias (linha subindo). */
  saldo_30?: { data: string; saldo: number }[]
  /** Quanto está no nome de quem olha e quanto é do casal. */
  seu_total?: number; casal_total?: number
  /** Saldo só do que está no nome de quem olha, nos últimos 30 dias (pro marco G10). */
  saldo_30_seu?: { data: string; saldo: number }[]
}
export interface NovaAplicacao { nome: string; banco: string; tipo: TipoAplicacao; pct_cdi: number; valor_inicial: number; data: string; vence_em?: string | null; /** membro dono; null = do casal */ titular?: string | null }
export interface CustoDoGasto { ate_fim_do_mes: number; em_12_meses: number }

/* ---------- Escritório que cobra e Lembretes: CONTRATO2.md, seção B ---------- */
export type EstadoFuncionario = 'vai_comecar' | 'trabalhando' | 'entregue' | 'precisa_de_voce'
/** `pede`: campo obrigatório antes de gravar; `pede2`: 2º campo, opcional; `abre`: o que o app abre (lancar, guardado, cartao, nota, contagem). Igual ao BANCO2.md. */
export type Pede = 'data' | 'valor' | 'texto'
export type Abre = 'lancar' | 'guardado' | 'cartao' | 'nota' | 'contagem' | 'orcamento'
export interface OpcaoPergunta { id: string; rotulo: string; pede?: Pede; pede2?: Pede; abre?: Abre }
export interface PerguntaEsc {
  id: string; funcionario: string; pergunta: string; contexto: string
  /** em R$; a equipe nunca recebe */
  valor?: number
  opcoes: OpcaoPergunta[]
  vence_em?: string | null; atrasado_dias?: number
  /** texto pronto pra copiar (opção "Copiar mensagem") */
  mensagem?: string
  /** nome curto do assunto, pro diário ("Fatura do cartão Inter") */
  assunto?: string
  /** há quantos dias a pergunta espera resposta */
  espera_dias?: number
  /** as partes da fala, uma a uma (o exemplo manda; serve pra conferência das falas) */
  partes?: { vi: string; importa: string; sugiro: string }
}
export interface FuncionarioEsc { id: string; nome: string; sala: string; estado: EstadoFuncionario; frase: string; /** as 3 linhas de "O que eu faço e quando", quando o banco manda */ faz?: string[]; /** 1 linha do cadastro dele ("2 cartões, 1 fatura aberta") */ cadastro_resumo?: string; /** as 10 últimas respostas do diário dele */ ultimas_respostas?: LinhaDiario[] }
export interface EntregaEsc { funcionario: string; resumo: string; numero?: number | null }
export interface EscritorioHoje { precisa_de_voce: PerguntaEsc[]; trabalhando: { funcionario: string; resumo?: string }[]; entregue: EntregaEsc[]; funcionarios: FuncionarioEsc[] }
export type Repetir = 'nunca' | 'dia' | 'semana' | 'mes' | 'ano'
export interface Lembrete { id: string; titulo: string; detalhe: string | null; quando: string; repetir: Repetir; para: string; funcionario?: string | null; feito_em: string | null }
export interface NovoLembrete { titulo: string; quando: string; repetir: Repetir; detalhe?: string; para?: string }
export interface LinhaDiario { /** id da pergunta respondida */ ref?: string; /** "anotado às 10:05" ou "12/11, 10:05", quando o banco manda o texto pronto */ quando_txt?: string; id: string; funcionario: string; assunto: string; pergunta: string; resposta: string; quando: string; adiado_ate: string | null; respondido_por?: string | null }
export interface RelatorioFuncionario { funcionario: string; perguntas: number; respondidas: number; pendentes: number; /** minutos entre a pergunta e a resposta; null = ainda sem resposta */ tempo_medio_min: number | null }
export interface RelatorioEsc { funcionarios: RelatorioFuncionario[]; diario: LinhaDiario[] }

/** Chaves guardadas em config_familia (1 linha por chave, valor jsonb). */
export type ChaveConfig = 'reserva_onde' | 'contas_fixas' | 'casa_prestadores' | 'casa_gas' | 'casa_folha' | 'casa_lista' | 'casa_presenca' | 'casa_ponto' | 'rendas' | 'metas' | 'termo_aceito' | 'entradas' | 'dias_sem_gasto' | 'metas_pessoais'

export interface Api {
  modo: 'real' | 'exemplo'
  sessao(): Promise<Sessao | null>
  enviarCodigo(email: string): Promise<void>
  /** Devolve `aviso` quando existe convite por e-mail mas o banco não deixou ligar (e-mail sem confirmar, sessão sem código). */
  confirmarCodigo(email: string, codigo: string): Promise<{ aviso?: string } | void>
  /** Equipe: convite (id que veio no link) + código de 4 números. */
  entrarEquipe(convite: string, codigo: string): Promise<void>
  sair(): Promise<void>
  /** Avisa quando o login cai sozinho (token vencido ou revogado em outro aparelho). Devolve como parar de ouvir. */
  aoSairSessao?(avisar: () => void): () => void

  criarFamilia(nome: string, nomePessoa: string): Promise<string>
  /** Limite do mês de 1 envelope (produto.definir_limite): vale do mês atual em diante, mês fechado não muda. */
  definirLimite(familia: string, envelope: string, valor: number): Promise<void>
  salvarEnvelope(familia: string, id: string, campos: { colchao?: number; nome?: string }): Promise<void>
  convidar(familia: string, papel: Papel, nome: string, email?: string): Promise<Convite>

  resumoHoje(familia: string): Promise<ResumoHoje>
  lancar(n: NovoLancamento): Promise<{ lancamento: Lancamento; resumo: ResumoHoje; repetido?: boolean }>
  /** Lançamentos de 1 mês (AAAA-MM), vivos e apagados, do mais novo pro mais velho. */
  lancamentos(familia: string, mes: string): Promise<Lancamento[]>
  apagarLancamento(id: string): Promise<void>
  restaurarLancamento(id: string): Promise<void>
  /** Corrige valor, descrição, dia, envelope ou cartão de um lançamento (banco: lanc_mudar deixa a autora mudar). */
  corrigirLancamento?(id: string, campos: { valor?: number; descricao?: string; data?: string; envelope?: string; cartao?: string | null; parcelas?: number }): Promise<void>
  /** Passou do combinado: cobre com a sobra da Casa neste mês (SÓ NO EXEMPLO: no banco precisa de função nova). Devolve como desfazer. */
  cobrirComCasa?(familia: string, envelope: string, valor: number): Promise<() => Promise<void>>
  /** Quem está na família e como está o convite de cada um. */
  convites?(familia: string): Promise<ConviteFamilia[]>
  reenviarConvite?(familia: string, id: string): Promise<void>
  cancelarConvite?(familia: string, id: string): Promise<void>

  /** Equipe: anota a compra SEM valor (o que comprou, feira ou coisa da casa, foto da nota). O casal confere pela foto. */
  anotarCompraEquipe?(familia: string, c: { tipo: 'feira' | 'casa'; nome: string; foto?: string | null }): Promise<{ aviso: string }>
  /** Regra do salário: o que entrou a mais neste mês pra quem olha e quanto disso foi pra reserva. */
  entrouAMais?(familia: string, mes: string): Promise<{ entrou: number; guardado: number; itens: { de: string; valor: number; destino: string }[] }>
  /** V3 "Foi imprevisto" (SÓ NO EXEMPLO): o que passou sai da reserva pra mês ruim. Devolve como desfazer. */
  cobrirImprevisto?(familia: string, envelope: string, valor: number): Promise<() => Promise<void>>

  cartoes(familia: string): Promise<Cartao[]>
  criarCartao(familia: string, c: Omit<Cartao, 'id'>): Promise<void>
  faturas(familia: string, meses: number): Promise<Fatura[]>

  config<T>(familia: string, chave: ChaveConfig, padrao: T): Promise<T>
  salvarConfig(familia: string, chave: ChaveConfig, valor: unknown): Promise<void>

  /** Equipe e casal: a Casa sem dinheiro (lista, compras, prestadores, gás, presença). */
  casaDaEquipe(familia: string): Promise<CasaDaEquipe>
  /** Equipe e casal: marca comprei/acabou item, prestador veio, troquei o gás, cheguei/saí. Devolve a Casa nova. */
  casaMarcar(familia: string, tipo: MarcaCasa, dados?: { id?: string; nome?: string }): Promise<CasaDaEquipe>
  /** Casal: datas dos avisos da equipe (gás e presença), com o nome de quem avisou. */
  avisosCasa(familia: string): Promise<{ tipo: AvisoCasa; data: string; nome: string }[]>
  /** IA: lê a foto do cupom (função ia-ler-cupom). Nada é lançado. */
  lerCupom(familia: string, fotoBase64Jpeg: string): Promise<CupomLido>

  /* Guardado: só o casal. */
  guardadoHoje(familia: string): Promise<GuardadoHoje>
  guardadoCriar(familia: string, a: NovaAplicacao): Promise<void>
  /** Guardar (aporte), tirar (resgate) ou conferir o saldo. `chave`: 1 uuid por toque, o banco não grava 2 vezes. */
  guardadoMovimentar(aplicacao: string, tipo: 'aporte' | 'resgate' | 'saldo_conferido', valor: number, data: string, chave: string, nota?: string): Promise<void>
  /** Desfaz o último movimento gravado com essa chave (banco: guardado_desfazer). */
  guardadoDesfazer?(aplicacao: string, chave: string): Promise<void>
  guardadoEncerrar(aplicacao: string): Promise<void>
  /** Quanto esse gasto deixa de render. */
  guardadoCustoDoGasto(familia: string, valor: number): Promise<CustoDoGasto>

  /* Escritório: perguntas de quem precisa de você, respostas no diário, relatório e lembretes. */
  escritorioHoje(familia: string): Promise<EscritorioHoje>
  /** Grava no diário e faz o efeito. Responder de novo a mesma pergunta corrige (a linha antiga fica). Devolve a mensagem pronta quando a opção é copiar. */
  escritorioResponder(familia: string, perguntaId: string, opcao: string, dados?: Record<string, unknown>): Promise<{ mensagem?: string; /** id da linha gravada no diário */ diario_id?: string; /** confirmação do que foi feito (rodada 2) */ aviso?: string } | void>
  escritorioRelatorio(familia: string, de: string, ate: string): Promise<RelatorioEsc>
  /** Diário de 1 funcionário, do mais novo pro mais velho ("ver tudo"). */
  escritorioDiario(familia: string, funcionario: string, limite: number, antes?: string): Promise<LinhaDiario[]>
  /** Quem é da família (casal e pessoas), pra escolher de quem é o cartão. */
  membros(familia: string): Promise<{ id: string; nome: string }[]>
  /* Analista de Cartão */
  cartaoSalvar(familia: string, c: Partial<Cartao> & { nome: string }): Promise<void>
  faturasBanco(familia: string): Promise<FaturaBanco[]>
  faturaInformar(familia: string, cartao: string, mes: string, d: { valor_banco?: number | null; paga_em?: string | null }): Promise<void>
  /* Fiscal da Feira */
  feiras(familia: string): Promise<Feira[]>
  feiraRegistrar(familia: string, f: { data: string; valor?: number; loja?: string }): Promise<void>
  /** Só sobe a foto da nota pro bucket privado e devolve o caminho (a resposta da pergunta leva o caminho e o banco anota). */
  notaSubir(familia: string, feira: string, fotoBase64Jpeg: string): Promise<string>
  /** Sobe a foto da nota e anota na feira (pelo cadastro). Devolve o caminho guardado. */
  feiraAnexarNota(familia: string, feira: string, fotoBase64Jpeg: string): Promise<string>
  feiraSemNota(familia: string, feira: string, motivo: string): Promise<void>
  estoque(familia: string): Promise<Estoque>
  estoqueContar(familia: string, itens: { item_id: string; estado: EstadoItem }[]): Promise<void>
  estoqueItemSalvar(familia: string, item: { id?: string; nome: string; categoria: string; ativo?: boolean }): Promise<void>
  lembretes(familia: string): Promise<Lembrete[]>
  lembreteCriar(familia: string, l: NovoLembrete): Promise<void>
  lembreteConcluir(familia: string, id: string): Promise<void>
  lembreteAdiar(familia: string, id: string, ate: string): Promise<void>
  /** Apagar = marcar inativo no banco (nada é apagado de verdade). */
  lembreteApagar(familia: string, id: string): Promise<void>

  numerosSemana(): Promise<Numero[]>
  exportarFamilia(familia: string): Promise<unknown>
  apagarFamilia(familia: string, confirmacao: string): Promise<void>
}
