// Comparações da família de exemplo para a tela "Trocar lá fora". Preços de loja, regras de cartão e anúncios são
// públicos e têm a fonte ao lado; o valor de venda do drone é inventado. Nenhum nome real.
import type { LinkTroca, PagamentoTroca, RegraTroca, Troca } from '../lib/troca/tipos'

const RECEITA =
  'https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/viagens-internacionais/guia-do-viajante/'

const pagamentos: PagamentoTroca[] = [
  {
    id: 'sicoob',
    nome: 'Sicoob Black',
    nota: 'Spread zero · IOF 3,5% · 2,2 pontos',
    tipo: 'cartao',
    spreadPct: 0,
    iofPct: 3.5,
    pontosPorDolar: 2.2,
    cashbackPct: 0,
  },
  {
    id: 'uvp',
    nome: 'Ultravioleta · pontos',
    nota: 'Só se o seu Nubank for Ultravioleta · 2,2 pontos',
    tipo: 'cartao',
    spreadPct: 3.5,
    iofPct: 0,
    pontosPorDolar: 2.2,
    cashbackPct: 0,
  },
  {
    id: 'uvc',
    nome: 'Ultravioleta · cashback',
    nota: 'Só se o seu Nubank for Ultravioleta · 1,25% de volta',
    tipo: 'cartao',
    spreadPct: 3.5,
    iofPct: 0,
    pontosPorDolar: 0,
    cashbackPct: 1.25,
  },
  {
    id: 'epic',
    nome: 'PicPay Epic Black',
    nota: 'IOF 3,5% · 4% de volta',
    tipo: 'cartao',
    spreadPct: 5,
    iofPct: 3.5,
    pontosPorDolar: 0,
    cashbackPct: 4,
    spreadIncerto:
      '5% é o informado por guia de cartões, não pelo PicPay. Confira no app. Com spread abaixo de 2,3%, o Epic passa o Sicoob.',
  },
  {
    id: 'c6',
    nome: 'C6 Conta Global Euro',
    nota: 'Euro da cotação do app · sem pontos',
    tipo: 'conta',
    spreadPct: 0,
    iofPct: 0,
    pontosPorDolar: 0,
    cashbackPct: 0,
  },
  {
    id: 'nu',
    nome: 'Nubank roxinho',
    nota: 'Spread 4% · IOF 3,5% · sem pontos',
    tipo: 'cartao',
    spreadPct: 4,
    iofPct: 3.5,
    pontosPorDolar: 0,
    cashbackPct: 0,
  },
  {
    id: 'ref',
    nome: 'Euro de referência',
    nota: 'Sem taxas · só para comparar',
    tipo: 'referencia',
    spreadPct: 0,
    iofPct: 0,
    pontosPorDolar: 0,
    cashbackPct: 0,
  },
]

const regrasDosCartoes: RegraTroca[] = [
  {
    titulo: 'Sicoob Black',
    texto: 'Spread zero, IOF de 3,5%, 2,2 pontos Coopera por dólar. Converte pelo dólar PTAX do dia da compra.',
    fontes: [
      {
        rotulo: 'Sicoob',
        link: 'https://www.sicoob.com.br/web/sicoob/noticias/-/asset_publisher/xAioIawpOI5S/content/id/307547791',
      },
    ],
  },
  {
    titulo: 'Nubank Ultravioleta',
    texto:
      'Spread de 3,5%, IOF devolvido na fatura em até 7 dias, 2,2 pontos por dólar ou 1,25% de cashback (dinheiro de volta).',
    fontes: [
      { rotulo: 'Nubank', link: 'https://nubank.com.br/ultravioleta/cartao-black/iof-zero' },
      {
        rotulo: 'Blog Nubank',
        link: 'https://blog.nubank.com.br/cartao-black-nubank-ultravioleta-compras-internacionais/',
      },
    ],
  },
  {
    titulo: 'Nubank roxinho',
    texto: 'Spread de 4% (confirmar no app) e IOF de 3,5%, sem pontos.',
    fontes: [{ rotulo: 'Contratos Nubank', link: 'https://nubank.com.br/contratos' }],
  },
  {
    titulo: 'PicPay Epic Black',
    texto:
      '4% de cashback nas compras internacionais, IOF de 3,5%. Sem cashback no parcelado em 3x. Spread de 5% segundo guia de cartões (confirmar).',
    fontes: [
      { rotulo: 'Melhores Cartões', link: 'https://www.melhorescartoes.com.br/picpay-card-epic-black-vale-pena.html' },
      { rotulo: 'Cartões de Crédito', link: 'https://www.cartoesdecredito.me/?p=71104' },
      {
        rotulo: 'Regras do cashback',
        link: 'https://altarendablog.com.br/2026/09/20/picpay-epic-black-ate-4-de-cashback-no-exterior-salas-vip-e-compras-internacionais-em-3x-sem-juros/',
      },
    ],
  },
  {
    titulo: 'C6 Conta Global Euro',
    texto: 'Usa o euro final da cotação do app, com spread e IOF dentro. Débito em euro não gera pontos.',
    fontes: [],
  },
  {
    titulo: 'Milhas',
    texto:
      '1 ponto Coopera = 1 Livelo = 1 Azul. O bônus de 120% depende de campanha. A Azul já fez até 120% direto do Coopera em 06/2026.',
    fontes: [
      { rotulo: 'Livelo e Azul', link: 'https://www.livelo.com.br/livelo-para-parceiros/azul/AZLTransfer' },
      {
        rotulo: 'Campanhas Coopera e Azul',
        link: 'https://pontospravoar.com/category/programas-de-fidelidade/coopera-programas-de-fidelidade/',
      },
    ],
  },
]

const fontesDaEspanha: LinkTroca[] = [
  { rotulo: 'Tabela espanhola de reembolso', link: 'https://www.boe.es/buscar/act.php?id=BOE-A-2012-15104' },
  {
    rotulo: 'Global Blue',
    link: 'https://www.globalblue.com/en/shoppers/how-to-shop-tax-free/destinations/spain',
  },
  {
    rotulo: 'DIVA e residência',
    link: 'https://sede.agenciatributaria.gob.es/Sede/viajeros-trabajadores-desplazados-fronterizos/devoluciones-iva-compras-viajeros/informacion-general-sobre-devolucion-iva-viajeros.html',
  },
  { rotulo: 'Câmbio de referência', link: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-24785' },
  { rotulo: 'Receita Federal', link: RECEITA + 'perguntas-e-respostas' },
]

/** O que as duas comparações têm igual: mesma viagem, mesmos cartões, mesmo câmbio. */
const viagem = {
  de: 'Madrid',
  para: 'Recife',
  moeda: 'EUR',
  ivaPct: 21,
  reembolso: null,
  cambio: 6.4349,
  cambioData: '2026-11-24',
  cambioReembolso: null,
  dolarPontos: 1.0963,
  dolarFiscal: 1.0963,
  cambioFiscal: 6.4349,
  cota: 1000,
  valorAduana: null,
  comImposto: true,
  pagamentos,
  pagamento: 'sicoob',
  bonusPct: 120,
  milheiro: 14.13,
  programa: 'Azul',
  contaCambio: 6.6663,
  frase: {
    rotulo: 'Frase para a loja',
    idioma: 'es',
    texto: '¿Me pueden emitir el formulario DIVA y decirme cuánto me devolverá Global Blue en euros?',
  },
} satisfies Partial<Troca>

const textosDaViagem = {
  milhas:
    'R$ 14,13 é quanto custava comprar mil pontos Azul numa promoção de 90% de bônus. Serve só para dar preço às milhas: esse valor não entra na sua conta.',
  conta: 'Cotação do app em 25/11 às 18h50 (valor final para € 2.600). Refaça a cotação no app no dia.',
  pagamentos:
    'PicPay Epic: os 4% de volta somem se parcelar em 3x sem juros. Dá para trocar o cashback por pontos LATAM Pass (até 7,5 por dólar), não Azul. Cashback é dinheiro na conta; pontos LATAM não.',
  detalhe:
    'Paga o preço cheio no caixa. Reembolso, venda e cashback entram depois em dinheiro. Milhas não entram na conta.',
  contaComprar: 'O tax free e a venda do antigo só entram depois. O euro que sobrar fica na conta.',
  cambio: 'Referência de 24/11. A conta soma o spread e o IOF do cartão escolhido.',
  valorAduana: 'Usa o preço cheio da fatura. Ajuste ao valor declarado.',
  fontesRodape:
    'Preços com IVA de 21% (embutido: 21/121 da fatura). Reembolso pela tabela: 14,5% até € 3.000; 14,9% acima. O valor creditado depende do formulário e da forma de recebimento.',
}

const celular: Troca = {
  ...viagem,
  id: 'troca-celular',
  nome: 'iPhone Duo',
  usado: '17 Pro Max',
  versoes: [
    { rotulo: '256 GB', preco: 2339, reembolsoPct: 14.5 },
    { rotulo: '512 GB', preco: 2589, reembolsoPct: 14.5 },
    { rotulo: '1 TB', preco: 3089, reembolsoPct: 14.9 },
    { rotulo: '2 TB', preco: 3839, reembolsoPct: 14.9 },
  ],
  versao: 2,
  venda: 8000,
  vendaMin: 6500,
  vendaMax: 9500,
  anunciar: 8300,
  contaComprar: 3300,
  textos: {
    ...textosDaViagem,
    versoes: 'Armazenamento do Duo',
    vendaMeio: 'Contar com R$ 8.000',
    venda: 'Anunciar por R$ 8.300 e contar com R$ 8.000. Bateria, marcas e taxas mudam o valor.',
    vendaRodape: 'Preço pedido no anúncio, não o de venda fechada.',
    aduana:
      'O 17 Pro Max fica fora do imposto porque a nota fiscal prova que saiu do Brasil. O Duo entra na cota de quem declara, salvo exceção (como defeito comprovado no antigo). Paga 50% do que passar da cota.',
  },
  referencias: [
    {
      local: 'Casa Amarela, Recife',
      detalhe: '18/10 · R$ 7.900 no Pix',
      preco: 8000,
      link: 'https://pe.olx.com.br/grande-recife/celulares/iphone-17-pro-max-1tb-o-mais-novo-1544110221',
    },
    {
      local: 'Ilha do Leite, Recife',
      detalhe: '22/10 · estado a confirmar',
      preco: 8650,
      link: 'https://www.olx.com.br/celulares/estado-pe/recife/ilha-do-leite',
    },
    {
      local: 'Loja, Fortaleza',
      detalhe: '22/11 · bateria 100%',
      preco: 7990,
      link: 'https://www.facabomnegocio.com.br/anuncio.php?id=94735',
    },
    {
      local: 'Grageru, Aracaju',
      detalhe: 'Bateria 80% a 94%',
      preco: 8600,
      link: 'https://se.olx.com.br/sergipe/celulares/iphone-17-pro-max-1tb-seminovo-1550259046',
    },
  ],
  passos: [
    {
      texto: 'Na Apple Puerta del Sol, leve passaporte e comprovante de residência no Brasil.',
      link: { rotulo: 'Ver a loja', link: 'https://www.apple.com/es/retail/puertadelsol/' },
    },
    { texto: 'Peça fatura e formulário DIVA no nome de quem vai declarar o aparelho.' },
    { texto: 'Duo sem uso, na bagagem de mão.' },
    { texto: 'Valide o DIVA no último aeroporto da União Europeia. Em Madrid, nos terminais DIVA.' },
  ],
  regras: regrasDosCartoes,
  fontes: [
    { rotulo: 'Preços Apple Espanha', link: 'https://www.apple.com/es/shop/buy-iphone/iphone-duo' },
    {
      rotulo: 'Tax free na loja',
      link: 'https://www.apple.com/legal/sales-support/sales-policies/retail_es.html',
    },
    ...fontesDaEspanha,
  ],
}

const drone: Troca = {
  ...viagem,
  id: 'troca-drone',
  nome: 'DJI Mavic 4 Pro',
  usado: 'Drone antigo',
  versoes: [
    { rotulo: 'Com RC 2', preco: 2099, reembolsoPct: 14.5 },
    { rotulo: 'Kit Voe Mais', preco: 2699, reembolsoPct: 14.5 },
    { rotulo: 'Kit Criadores', preco: 3539, reembolsoPct: 14.9 },
  ],
  versao: 0,
  venda: 4500,
  vendaMin: 3000,
  vendaMax: 6000,
  anunciar: 0,
  contaComprar: 2300,
  textos: {
    ...textosDaViagem,
    versoes: 'Kit do Mavic 4 Pro',
    venda: 'Valor de venda de exemplo. Troque pelo modelo que você tem e veja os anúncios de hoje.',
    aduana:
      'Drone de uso recreativo entra como bagagem: usa a cota de US$ 1.000 de quem declara e paga 50% do que passar.',
  },
  referencias: [],
  passos: [
    { texto: 'Na loja, leve passaporte e peça fatura e formulário DIVA no nome de quem vai declarar.' },
    { texto: 'Drone sem uso, na bagagem de mão. Baterias sempre na cabine.' },
    { texto: 'Valide o DIVA no último aeroporto da União Europeia. Em Madrid, nos terminais DIVA.' },
    {
      texto: 'No Brasil, antes de voar: homologação na Anatel e cadastro na Anac (acima de 250 g).',
      link: { rotulo: 'Cadastro na Anac', link: 'https://www.gov.br/anac/pt-br/sistemas/sisant' },
    },
  ],
  regras: [
    {
      titulo: 'Drone na alfândega',
      texto:
        'Uso só recreativo entra como bagagem, com a cota de US$ 1.000 e 50% no que passar. Uso profissional vai para a importação comum.',
      fontes: [{ rotulo: 'Receita Federal, pergunta 1.18', link: RECEITA + 'perguntas-e-respostas' }],
    },
    {
      titulo: 'Anatel e Anac',
      texto:
        'Drone trazido de fora precisa de homologação na Anatel antes do uso (vale para aquela unidade). Acima de 250 g, cadastro na Anac.',
      fontes: [
        {
          rotulo: 'Anatel',
          link: 'https://www.gov.br/anatel/pt-br/regulado/certificacao-de-produtos/declaracao-de-conformidade',
        },
        { rotulo: 'Anac', link: 'https://www.gov.br/anac/pt-br/sistemas/sisant' },
      ],
    },
    ...regrasDosCartoes,
  ],
  fontes: [
    { rotulo: 'Preços DJI Espanha', link: 'https://store.dji.com/es/product/dji-mavic-4-pro' },
    ...fontesDaEspanha,
  ],
}

export const trocasDeExemplo: Troca[] = [celular, drone]
