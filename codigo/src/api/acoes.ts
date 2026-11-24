import type { Api } from './tipos'

/**
 * Toda ação da API, declarada em uma de três listas.
 *
 * Antes a proteção (fila, desfazer, atualização das telas depois de gravar) decidia o que era gravação
 * adivinhando pelo começo do nome da função. Uma ação nova com outro nome passava sem proteção e ninguém percebia.
 * Agora a lista é explícita, e `acoes.test.ts` falha se existir ação que não esteja em nenhuma lista.
 *
 * Para criar uma ação nova: escreva-a na API e ponha o nome dela na lista certa. O teste cobra.
 */
type Acao = keyof Api

/** Mudam dado da família: passam pela proteção inteira. */
export const ACOES_QUE_GRAVAM = [
  'salvarSaldoConta',
  'salvarNomePessoa',
  'criarFamilia',
  'definirLimite',
  'salvarEnvelope',
  'convidar',
  'lancar',
  'apagarLancamento',
  'restaurarLancamento',
  'corrigirLancamento',
  'cobrirComCasa',
  'reenviarConvite',
  'cancelarConvite',
  'anotarCompraEquipe',
  'cobrirImprevisto',
  'criarCartao',
  'salvarConfig',
  'casaMarcar',
  'guardadoCriar',
  'guardadoMovimentar',
  'guardadoDesfazer',
  'guardadoEncerrar',
  'escritorioResponder',
  'cartaoSalvar',
  'faturaInformar',
  'feiraRegistrar',
  'feiraAnexarNota',
  'feiraSemNota',
  'estoqueContar',
  'estoqueItemSalvar',
  'lembreteCriar',
  'lembreteConcluir',
  'lembreteAdiar',
  'lembreteApagar',
  'backupRestaurar',
  'recebimentoCriar',
  'recebimentoMudar',
  'objetivoSalvar',
  'reajusteVotar',
  'reajusteAplicar',
  'desejoCriar',
  'desejoMudar',
  'imovelSalvar',
  'imovelTirar',
  'negocioGravar',
  'negocioApagar',
  'negocioVoltaGuardar',
  'aluguelGravar',
  'etiquetaSalvar',
  'etiquetar',
  'lancamentoMoeda',
  'lancamentoTipo',
  'apagarFamilia',
] as const satisfies readonly Acao[]

/** Só leem. Não mudam nada. */
export const ACOES_QUE_SO_LEEM = [
  'saldosConta',
  'resumoHoje',
  'lancamentos',
  'convites',
  'entrouAMais',
  'cartoes',
  'faturas',
  'config',
  'casaDaEquipe',
  'avisosCasa',
  'guardadoHoje',
  'guardadoCustoDoGasto',
  'escritorioHoje',
  'escritorioRelatorio',
  'escritorioDiario',
  'membros',
  'faturasBanco',
  'feiras',
  'estoque',
  'lembretes',
  'numerosSemana',
  'exportarFamilia',
  'backupLer',
  'recebimentos',
  'objetivo',
  'futuroEntradas',
  'reajusteSituacao',
  'desejos',
  'imoveis',
  'negocios',
  'aluguelCaderno',
  'etiquetas',
  'etiquetasDoLancamento',
  'etiquetaResumo',
  'etiquetaSimular',
  'exportarMeu',
  'fotosDaFamilia',
] as const satisfies readonly Acao[]

/**
 * Não leem nem gravam dado da família do jeito comum: entrar e sair, e envio de foto.
 * Passam direto, sem fila nem desfazer.
 *
 * Atenção: `notaSubir` guarda um arquivo (a foto da nota) e hoje passa sem a proteção de gravação.
 * Ficou assim para não mudar o comportamento nesta troca; é uma decisão em aberto.
 */
export const ACOES_QUE_PASSAM_DIRETO = [
  'sessao',
  'sair',
  'aoSairSessao',
  'enviarCodigo',
  'confirmarCodigo',
  'entrarEquipe',
  'lerCupom',
  'notaSubir',
  // foto do rosto (24/11/2026): só troca um arquivo no bucket privado `fotos`; não mexe em dinheiro nem tem desfazer
  'fotoSubir',
  // avisos no celular: só a inscrição deste aparelho, nenhum dado da família muda
  'celularChavePublica',
  'celularLigar',
  'celularDesligar',
] as const satisfies readonly Acao[]

const gravam: ReadonlySet<string> = new Set(ACOES_QUE_GRAVAM)

export const gravaNoBanco = (acao: string) => gravam.has(acao)
