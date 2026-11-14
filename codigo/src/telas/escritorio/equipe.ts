// A LISTA ÚNICA da equipe do Escritório (C2, 14/11). Daqui saem: o nome curto da etiqueta, a sala, a mesa (e a rota),
// a roupa do boneco 3D, o ícone e o "O que eu faço e quando" da ficha. A página publicada (paineis/escritorio3d/index.html)
// usa uma cópia desta lista (mesmos id, nome, sala e mesa); o teste fase_final_c2.test.ts reprova se as 2 se separarem.
// O banco manda 8 deles (produto._esc_func); os outros 5 entram por aqui até o banco ter o dado deles.
// Nada de nome real de pessoa: o Assistente é "de quem cuida da casa".
// Arquivo sem import de propósito: a cena 3D (carregada só no Escritório) e as telas usam a mesma lista.

export type SalaEquipe = 'caixa' | 'casa' | 'cartoes' | 'patrimonio' | 'recepcao'
/** As 3 mesas de cada sala, da esquerda pra direita (metros a partir do centro da sala). */
export type Mesa = -2 | 0 | 2
export interface Roupa { camisa: number; calca: number; pele: number; cabelo: number; estilo: 'curto' | 'longo' | 'coque'; oculos?: boolean }
export interface MembroEquipe {
  id: string
  nome: string
  /** o que aparece na etiqueta em cima da cabeça */
  curto: string
  sala: SalaEquipe
  mesa: Mesa
  /** nome do ícone (Lucide) usado nas listas e na ficha */
  icone: string
  /** papel em 1 frase: o que ele faz pela família */
  papel: string
  /** de onde vem o número dele (o dado que ele mostra) */
  dado: string
  /** "O que eu faço e quando", 3 linhas na 1ª pessoa */
  faz: [string, string, string]
  roupa: Roupa
  /** true = o banco já manda este funcionário (produto._esc_func) */
  doBanco: boolean
}

export const EQUIPE: MembroEquipe[] = [
  { id: 'contador', nome: 'Contador', curto: 'Contador', sala: 'caixa', mesa: -2, icone: 'calculator', doBanco: true,
    papel: 'Confere se o mês fecha dentro do que a família combinou.', dado: 'Lançamentos e limites do mês.',
    faz: ['Confiro todo dia se o mês fecha dentro do que a família combinou.', 'Depois das 20h, se não tiver nenhum gasto anotado no dia, eu pergunto.', 'No dia 01 eu fecho o mês e digo quanto sobrou.'],
    roupa: { camisa: 0x3F5873, calca: 0x2E3440, pele: 0xE8B796, cabelo: 0x3A2A1E, estilo: 'curto', oculos: true } },
  { id: 'colchao', nome: 'Guardião da Reserva', curto: 'Reserva', sala: 'caixa', mesa: 0, icone: 'shield', doBanco: true,
    papel: 'Vigia a reserva, o dinheiro que a família combinou nunca gastar.', dado: 'A reserva combinada e o que está livre no mês.',
    faz: ['Cuido da reserva: o dinheiro que a família combinou nunca gastar.', 'Se o que está livre no mês ficar menor que a reserva, eu aviso na hora.', 'Pergunto de onde o dinheiro volta e cobro no dia que você marcar.'],
    roupa: { camisa: 0x6B6F58, calca: 0x3A3A3A, pele: 0xD9A27E, cabelo: 0x9A9A98, estilo: 'curto', oculos: true } },
  { id: 'tesoureiro', nome: 'Tesoureiro de Receitas', curto: 'Receitas', sala: 'caixa', mesa: 2, icone: 'coins', doBanco: false,
    papel: 'Acompanha o dinheiro que tem data pra entrar.', dado: 'Recebimentos com data (tela Planejamento).',
    faz: ['Guardo cada dinheiro que tem data pra entrar: contrato, salário, investimento que volta.', 'No mês previsto eu pergunto se o dinheiro entrou.', 'Se atrasar, eu mudo o mês e aviso o Planejamento.'],
    roupa: { camisa: 0x4A6B5A, calca: 0x2E3440, pele: 0xC48E6A, cabelo: 0x2A1F18, estilo: 'curto' } },
  { id: 'folha', nome: 'Folha da Casa', curto: 'Folha', sala: 'casa', mesa: -2, icone: 'file', doBanco: true,
    papel: 'Cuida de quem trabalha na casa: salário, férias e 13º.', dado: 'Quem trabalha na casa e o salário (tela Casa).',
    faz: ['Cuido de quem trabalha na casa: salário, férias e 13º.', 'Do dia 01 ao 07 eu lembro a guia mensal do governo.', 'No dia do salário de cada pessoa eu pergunto se foi pago.'],
    roupa: { camisa: 0x9A5B4A, calca: 0x3A3A3A, pele: 0xEBC0A0, cabelo: 0x5A3320, estilo: 'coque' } },
  { id: 'comprador', nome: 'Comprador', curto: 'Comprador', sala: 'casa', mesa: 0, icone: 'basket', doBanco: true,
    papel: 'Cuida dos prestadores, do gás e da lista de compras.', dado: 'Lista de compras, prestadores e trocas de gás (tela Casa).',
    faz: ['Cuido dos prestadores (jardineiro, piscineiro) e do gás.', 'Na véspera do prestador eu deixo a mensagem pronta; no dia, às 17h, pergunto se ele veio.', 'Aviso 5 dias antes de o gás acabar, pela média das últimas trocas.'],
    roupa: { camisa: 0xB08A3E, calca: 0x4A4038, pele: 0xC99673, cabelo: 0x2A1F18, estilo: 'curto' } },
  { id: 'fiscal', nome: 'Fiscal da Feira', curto: 'Fiscal', sala: 'casa', mesa: 2, icone: 'clipboard', doBanco: true,
    papel: 'Confere a feira da semana: feita, com nota e com o estoque contado.', dado: 'Feiras, notas e contagens do estoque.',
    faz: ['Confiro 3 coisas da feira de toda semana: se foi feita, se a nota está guardada e se o estoque foi contado.', 'Começo a perguntar na segunda, às 18h, 1 coisa por vez e só a que falta.', 'Aviso quando a semana passa do valor combinado.'],
    roupa: { camisa: 0x5C6E8A, calca: 0x2E3440, pele: 0xE0AE88, cabelo: 0x4A3526, estilo: 'longo' } },
  { id: 'cartao', nome: 'Analista de Cartão', curto: 'Cartão', sala: 'cartoes', mesa: -2, icone: 'card', doBanco: true,
    papel: 'Soma as compras de cada cartão e cobra a fatura antes de vencer.', dado: 'Cartões e compras anotadas (tela Cartões).',
    faz: ['Somo as compras de cada cartão e digo quanto vem na fatura.', 'Começo a cobrar 3 dias antes do vencimento e paro quando você diz que pagou.', 'Aviso 1 mês antes da anuidade e quando o valor do banco não bate com a minha soma.'],
    roupa: { camisa: 0x7A5C8A, calca: 0x34343C, pele: 0xF0C4A4, cabelo: 0x8A5A32, estilo: 'longo' } },
  { id: 'assistente', nome: 'Assistente de quem cuida da casa', curto: 'Assistente', sala: 'cartoes', mesa: 0, icone: 'heart', doBanco: false,
    papel: 'Ajuda quem cuida da casa e das crianças a fechar o mês dentro do combinado.', dado: 'O orçamento de quem cuida da casa, quando o banco disser quem é.',
    faz: ['Acompanho o combinado do mês de quem cuida da casa e das crianças.', 'Aviso antes de uma compra parcelada apertar os próximos meses.', 'No fim do mês eu mostro o que sobrou e pra onde pode ir.'],
    roupa: { camisa: 0x8E6B7E, calca: 0x34343C, pele: 0xF0C4A4, cabelo: 0x3A2A1E, estilo: 'longo' } },
  { id: 'guardado', nome: 'Gestor do Guardado', curto: 'Guardado', sala: 'patrimonio', mesa: -2, icone: 'landmark', doBanco: true,
    papel: 'Calcula quanto o dinheiro guardado rende por dia.', dado: 'Aplicações cadastradas (tela Guardado).',
    faz: ['Faço a conta de quanto o dinheiro guardado rendeu em cada dia útil.', 'No dia 01 eu peço pra você conferir o valor no app do banco.', 'Aviso 15 dias antes de uma aplicação vencer.'],
    roupa: { camisa: 0x2F4A5E, calca: 0x26282E, pele: 0xE3B08C, cabelo: 0x4A3526, estilo: 'curto' } },
  { id: 'usina', nome: 'Gerente da Usina', curto: 'Usina', sala: 'patrimonio', mesa: 0, icone: 'sun', doBanco: false,
    papel: 'Acompanha a usina de energia: quanto gerou e quem pagou.', dado: 'Geração e pagamentos da usina, quando entrarem no banco.',
    faz: ['Acompanho quanto a usina gerou no mês.', 'Confiro quem pagou e quem está devendo.', 'Aviso quando a geração cai abaixo do normal.'],
    roupa: { camisa: 0xC77B3A, calca: 0x3A3F47, pele: 0xB98562, cabelo: 0x231A14, estilo: 'curto' } },
  { id: 'secretaria', nome: 'Secretária', curto: 'Secretária', sala: 'recepcao', mesa: -2, icone: 'bell', doBanco: true,
    papel: 'Guarda os lembretes e cobra na hora marcada.', dado: 'Lembretes guardados (aba Lembretes).',
    faz: ['Guardo os lembretes que você me passa.', 'Na hora marcada eu pergunto no Início e aqui.', 'Cobro de novo todo dia até você dizer que fez ou marcar outro dia.'],
    roupa: { camisa: 0x4F7A78, calca: 0x2E3440, pele: 0xB98562, cabelo: 0x231A14, estilo: 'longo' } },
  { id: 'presenca', nome: 'Controlador de Presença', curto: 'Presença', sala: 'recepcao', mesa: 0, icone: 'userCheck', doBanco: false,
    papel: 'Anota quem da equipe veio e cruza com o que saiu da casa.', dado: 'Quem marcou "Cheguei" na tela Casa.',
    faz: ['Anoto quem da equipe da casa veio em cada dia.', 'Cruzo quem veio com o que saiu da despensa.', 'Aviso quando alguém some sem avisar.'],
    roupa: { camisa: 0x5E7C5A, calca: 0x34343C, pele: 0x9C6B4C, cabelo: 0x1B1410, estilo: 'longo' } },
  { id: 'auditor', nome: 'Auditor de Estoque', curto: 'Estoque', sala: 'recepcao', mesa: 2, icone: 'package', doBanco: false,
    papel: 'Confere a contagem do estoque e o que acabou antes da hora.', dado: 'Contagens do estoque (tela Casa).',
    faz: ['Confiro a contagem do estoque da casa.', 'Mostro o que acabou antes da próxima feira.', 'A cada 10 dias eu presto contas do que entrou e do que saiu.'],
    roupa: { camisa: 0x6E5A44, calca: 0x3A3A3A, pele: 0xE6B48F, cabelo: 0x6A4A30, estilo: 'coque', oculos: true } },
]

export const POR_ID: Record<string, MembroEquipe> = Object.fromEntries(EQUIPE.map(m => [m.id, m]))
/** Nomes compridos que o banco usa (ou vai usar) pra cada um. */
export const APELIDO_BANCO: Record<string, string> = {
  guardiao_colchao: 'colchao', analista_cartao: 'cartao', folha_casa: 'folha', fiscal_feira: 'fiscal', gestor_guardado: 'guardado',
  tesoureiro_receitas: 'tesoureiro', assistente_casa: 'assistente', gerente_usina: 'usina', controlador_presenca: 'presenca', auditor_estoque: 'auditor',
}
export const nomeCurto = (id: string, nome: string) => POR_ID[id]?.curto || nome.split(' ')[0]
