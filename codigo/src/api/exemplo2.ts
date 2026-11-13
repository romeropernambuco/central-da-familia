// Modo exemplo do CONTRATO2 e do CONTRATO3: Guardado, Escritório que fala como gente, Lembretes, cartões e Fiscal da Feira
// da Família Silva. Imita as funções do banco em memória. Todo número aqui é de exemplo e nada sai do aparelho.
import type { Cartao, Contagem, CustoDoGasto, EntregaEsc, EscritorioHoje, EstadoFuncionario, EstadoItem, Estoque, Fatura, FaturaBanco, Feira, GuardadoHoje, ItemEstoque, Lembrete, LinhaDiario, NovaAplicacao, NovoLembrete, OpcaoPergunta, PerguntaEsc, RelatorioEsc, ResumoHoje } from './tipos'
import { centavos, dataCurta, diaSemana, diasEntre, fimDoMes, FUSO, hojeRecife, previsaoGas, reais, reservaFolha, segundaDaSemana, somaDias } from '../lib/formato'
import { dadosTeste } from './dadosTeste'
import { CDI_DIA_PADRAO, calcularGuardado, custoDoGasto, liquido, rendeEmDias, type AplicacaoBase } from '../lib/guardado'

/** O que o exemplo antigo empresta: quem está logado e os dados da Família Silva. */
export interface Mundo {
  equipe(): boolean
  /** 1º nome de quem está logado: é assim que o funcionário chama a pessoa */
  quem(): string
  resumo(): ResumoHoje
  faturas(): Fatura[]
  cartoes(): Cartao[]
  config(): Record<string, any>
  /** data do último gasto anotado (AAAA-MM-DD) ou null */
  ultimoGasto(): string | null
  /** id do membro logado (null = equipe) */
  eu?(): string | null
  /** quanto sobrou do combinado no mês passado */
  sobraMesPassado(): number
  /** cria o lançamento da feira no limite semanal da Feira e devolve o id */
  lancarFeira(data: string, valor: number, loja: string): string
  /* rodada 2 */
  /** papel de quem olha: a pessoa da família (filha) só ouve o que é dela */
  papel?(): 'casal' | 'pessoa' | 'equipe'
  /** todos os cartões da família (cadastro); `cartoes()` é só o de quem olha */
  todosCartoes?(): Cartao[]
  /** E4: dinheiro que entrou a mais e ainda está na conta */
  entradasNaConta?(): { id: string; data: string; valor: number; de: string }[]
  guardarEntrada?(id: string): void
}

interface Entrada extends LinhaDiario { ref: string; perguntado_em: string; corrigida?: boolean }
interface FeiraEx extends Feira { valor: number }
interface Estado {
  apps: AplicacaoBase[]; lembretes: Lembrete[]; diario: Entrada[]; chaves: Set<string>; n: number
  desde: Record<string, string>; fatBanco: FaturaBanco[]; feiras: FeiraEx[]; itens: ItemEstoque[]; contagens: Contagem[]
  semFeira: Record<string, boolean>; pedidoEquipe: Record<string, boolean>
  /** E7: assunto que a pessoa disse "isso já é decidido" (cala até o valor mudar 20% ou a data mudar) */
  decididos: Record<string, { valor: number | null }>
}

const CDI = { dia: CDI_DIA_PADRAO, data: '2026-11-10', fonte: 'Banco Central (exemplo)' }
const horaRecife = (d = new Date()) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, hour: '2-digit', hour12: false }).format(d)) % 24
/** Data e hora de Recife (sem horário de verão: sempre 3 horas atrás de Greenwich). */
const emRecife = (dia: string, hora = 9) => `${dia}T${String(hora).padStart(2, '0')}:00:00-03:00`
const dow = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay()
/** R$ sem centavos quando é redondo: "R$ 1.000", "R$ 312,40". */
const rs = (v: number) => reais(v)
const dias = (n: number) => (n === 1 ? '1 dia' : `${n} dias`)
const quandoVence = (falta: number) => (falta === 0 ? 'vence hoje' : falta === 1 ? 'vence amanhã' : falta > 0 ? `vence em ${dias(falta)}` : `venceu há ${dias(-falta)}`)

function criar(): Estado {
  const hoje = hojeRecife(), seg = segundaDaSemana(hoje)
  const itens: ItemEstoque[] = [['Arroz', 'Despensa'], ['Feijão', 'Despensa'], ['Óleo', 'Despensa'], ['Café', 'Despensa'], ['Leite', 'Geladeira'], ['Ovos', 'Geladeira'], ['Sabão em pó', 'Limpeza'], ['Detergente', 'Limpeza']].map(([nome, categoria], i) => ({ id: 'it' + (i + 1), nome, categoria, ativo: true }))
  return {
    n: 0, chaves: new Set(), desde: {}, semFeira: {}, pedidoEquipe: {}, decididos: {},
    apps: dadosTeste(hoje).apps.map(x => ({ ...x, movimentos: x.movimentos.map(m => ({ ...m })) })),
    lembretes: [
      { id: 'lb1', titulo: 'Renovar o seguro do carro', detalhe: 'Pedir 3 cotações antes de fechar.', quando: emRecife(somaDias(hoje, -1)), repetir: 'ano', para: 'casal', funcionario: 'secretaria', feito_em: null },
      { id: 'lb2', titulo: 'Pagar a escola das crianças', detalhe: null, quando: emRecife(somaDias(hoje, 3)), repetir: 'mes', para: 'casal', funcionario: 'secretaria', feito_em: null },
    ],
    diario: [
      { id: 'd1', ref: 'lembrete:antigo', funcionario: 'secretaria', assunto: 'Levar o carro na revisão', pergunta: 'Você me pediu pra lembrar: levar o carro na revisão. Já fez?', resposta: 'Já fiz', quando: emRecife(somaDias(hoje, -2), 18), perguntado_em: emRecife(somaDias(hoje, -2), 9), adiado_ate: null, respondido_por: 'Andreza' },
      { id: 'd2', ref: 'gas:antigo', funcionario: 'comprador', assunto: 'Troca do gás', pergunta: 'O gás acaba em 5 dias. Já pediu?', resposta: 'Já pedi o gás', quando: emRecife(somaDias(hoje, -3), 10), perguntado_em: emRecife(somaDias(hoje, -3), 8), adiado_ate: null, respondido_por: 'Romero' },
      { id: 'd3', ref: 'feira_nota:antiga', funcionario: 'fiscal', assunto: `Nota da feira de ${dataCurta(somaDias(seg, -7))}`, pergunta: 'A feira está sem a nota.', resposta: 'Anexei a nota', quando: emRecife(somaDias(seg, -6), 11), perguntado_em: emRecife(somaDias(seg, -7), 19), adiado_ate: null, respondido_por: 'Andreza' },
    ],
    fatBanco: [],
    // a feira desta semana (se a semana já chegou na segunda à noite) está sem nota; a da semana passada está em dia
    feiras: [
      { id: 'fe0', semana: somaDias(seg, -7), data: somaDias(seg, -7), valor: 312.4, loja: 'Mercadinho', tem_nota: true, sem_nota_motivo: null, feita_por: 'Andreza' },
      ...(hoje > seg ? [{ id: 'fe1', semana: seg, data: seg, valor: 312.4, loja: 'Mercadinho', tem_nota: false, sem_nota_motivo: null, feita_por: 'Andreza' }] : []),
    ],
    itens,
    contagens: [{ id: 'ct0', semana: somaDias(seg, -7), data: somaDias(seg, -6), contado_por: 'Carla', itens: itens.map((i, k) => ({ item_id: i.id, estado: (k === 3 ? 'acabou' : k === 5 ? 'pouco' : 'tem') as EstadoItem })) }],
  }
}
let e = criar()
export function reiniciarExemplo2() { e = criar() }

/* ---------- Guardado ---------- */
/** R3: cada um vê o que está no nome dele e o que é do casal. Sem `eu` (contas internas), vê tudo. */
export function guardadoHojeEx(eu?: string | null): GuardadoHoje {
  const meus = eu === undefined ? e.apps : e.apps.filter(a => !(a as any).titular || (a as any).titular === eu)
  const g = calcularGuardado(meus, hojeRecife(), CDI)
  const nome = (id: string | null | undefined) => (id === 'm-andreza' ? 'Andreza' : id === 'm-romero' ? 'Romero' : id === 'm-bia' ? 'Bia' : id === 'm-claudia' ? 'Cláudia' : null)
  for (const ap of g.aplicacoes) { const t = (meus.find(a => a.id === ap.id) as any)?.titular ?? null; ap.titular = t; ap.titular_nome = nome(t) }
  g.seu_total = centavos(g.aplicacoes.filter(a => a.titular && a.titular === eu).reduce((s, a) => s + a.saldo, 0))
  if (eu) g.saldo_30_seu = calcularGuardado(e.apps.filter(a => (a as any).titular === eu), hojeRecife(), CDI).saldo_30
  g.casal_total = centavos(g.aplicacoes.filter(a => !a.titular).reduce((s, a) => s + a.saldo, 0))
  return g
}
export function guardadoCriarEx(a: NovaAplicacao) {
  if (!a.nome.trim()) throw new Error('Falta dizer onde o dinheiro está guardado.')
  if (!(a.valor_inicial > 0)) throw new Error('O valor tem que ser maior que zero.')
  e.apps.push({ id: 'g' + Date.now(), titular: a.titular ?? null, nome: a.nome.trim(), banco: a.banco.trim() || a.nome.trim(), tipo: a.tipo, pct_cdi: a.pct_cdi, liquidez: a.vence_em ? 'vencimento' : 'diaria', vence_em: a.vence_em || null, movimentos: [{ data: a.data, tipo: 'aporte', valor: centavos(a.valor_inicial) }] })
}
export function guardadoMovimentarEx(aplicacao: string, tipo: 'aporte' | 'resgate' | 'saldo_conferido', valor: number, data: string, chave: string, nota?: string) {
  const a = e.apps.find(x => x.id === aplicacao && !x.encerrada_em)
  if (!a) throw new Error('Essa aplicação não existe mais. Feche e abra a tela de novo.')
  if (!(valor > 0)) throw new Error('O valor tem que ser maior que zero.')
  // igual ao banco: a mesma chave do toque nunca grava 2 vezes
  if (e.chaves.has(chave)) return
  if (tipo === 'resgate') {
    const saldo = guardadoHojeEx().aplicacoes.find(x => x.id === aplicacao)?.saldo || 0
    if (valor > saldo + 0.005) throw new Error(`Só tem ${reais(saldo)} guardados aí. Tire um valor até esse.`)
  }
  e.chaves.add(chave)
  a.movimentos.push({ data, tipo, valor: centavos(valor), chave, ...(nota ? { nota } : {}) } as any)
}
/** Movimentos de 1 aplicação (pra a regra do salário: o que entrou a mais e foi guardado). */
export function movimentosEx(aplicacao: string): { data: string; tipo: string; valor: number; nota?: string }[] {
  return (e.apps.find(x => x.id === aplicacao)?.movimentos || []).map(m => ({ ...(m as any) }))
}
/** guardado_desfazer: tira o movimento gravado com essa chave (R12). */
export function guardadoDesfazerEx(aplicacao: string, chave: string) {
  const a = e.apps.find(x => x.id === aplicacao)
  const i = a ? a.movimentos.findIndex(m => (m as any).chave === chave) : -1
  if (!a || i < 0) throw new Error('Esse movimento já foi desfeito.')
  a.movimentos.splice(i, 1)
}
export function guardadoEncerrarEx(aplicacao: string) {
  const a = e.apps.find(x => x.id === aplicacao)
  if (!a) throw new Error('Essa aplicação não existe mais.')
  a.encerrada_em = hojeRecife()
}
export function custoDoGastoEx(valor: number, eu?: string | null): CustoDoGasto {
  const g = guardadoHojeEx(eu)
  if (!g.aplicacoes.length) return { ate_fim_do_mes: 0, em_12_meses: 0 }
  // usa o rendimento da aplicação que dá pra tirar na hora (é de lá que o dinheiro do gasto sairia)
  const diaria = g.aplicacoes.find(a => a.liquidez === 'diaria') || g.aplicacoes[0]
  return custoDoGasto(valor, hojeRecife(), CDI.dia, diaria.pct_cdi || 100)
}
/** Quanto um valor rende por mês (21 dias úteis) guardado onde rende todo dia, já sem o imposto. Conta aproximada. */
const rendePorMes = (v: number) => Math.round(liquido(rendeEmDias(v, CDI.dia, 100, 21), 22.5))

/* ---------- Escritório ---------- */
const FUNC: { id: string; nome: string; sala: string; turno: number }[] = [
  { id: 'contador', nome: 'Contador', sala: 'Caixa', turno: 6 },
  { id: 'colchao', nome: 'Guardião da Reserva', sala: 'Caixa', turno: 6 },
  { id: 'cartao', nome: 'Analista de Cartão', sala: 'Cartões', turno: 7 },
  { id: 'folha', nome: 'Folha da Casa', sala: 'Casa', turno: 7 },
  { id: 'comprador', nome: 'Comprador', sala: 'Casa', turno: 8 },
  { id: 'fiscal', nome: 'Fiscal da Feira', sala: 'Casa', turno: 8 },
  { id: 'guardado', nome: 'Gestor do Guardado', sala: 'Patrimônio', turno: 8 },
  { id: 'secretaria', nome: 'Secretária', sala: 'Recepção', turno: 6 },
]

/** Pergunta some depois de respondida; se foi adiada, volta na hora marcada. Resposta corrigida não cala mais. */
function calada(ref: string, agora: Date, valor?: number | null): boolean {
  // E7: "isso já é decidido" cala até o valor mudar 20% (ou virar outro assunto, com outra data no id)
  const dec = e.decididos[ref]
  if (dec && (dec.valor == null || valor == null || Math.abs(valor - dec.valor) < Math.abs(dec.valor) * 0.2)) return true
  return e.diario.some(d => d.ref === ref && !d.corrigida && (!d.adiado_ate || new Date(d.adiado_ate) > agora))
}
/** Quantas vezes a pessoa já adiou o mesmo assunto ("ainda não", "depois"). */
const adiamentos = (ref: string) => e.diario.filter(d => d.ref === ref && !!d.adiado_ate).length
/** A última resposta sobre o mesmo assunto (o funcionário lembra o que ouviu). */
function ultima(ref: string): Entrada | undefined {
  return [...e.diario].reverse().find(d => d.ref === ref && !d.corrigida && !/^Copiar/.test(d.resposta))
}

interface Fala { vi: string; importa: string; sugiro: string }
/**
 * Monta 1 pergunta no padrão das 4 partes: o que eu vi, por que importa, o que eu sugiro, botões com verbo.
 * `falas` tem 3 versões: 1ª cobrança, 2ª (1 ou 2 dias esperando) e 3ª em diante. A escolha é pelo número de dias, nunca por sorteio.
 */
function perguntar(m: Mundo, hoje: string, p: { id: string; funcionario: string; assunto: string; falas: (espera: number, lembra: string) => [Fala, Fala, Fala]; opcoes: OpcaoPergunta[]; valor?: number; vence_em?: string | null; atrasado_dias?: number; mensagem?: string; espera?: number }): PerguntaEsc {
  if (!e.desde[p.id]) e.desde[p.id] = hoje
  const espera = p.espera ?? Math.max(0, diasEntre(e.desde[p.id], hoje))
  const u = ultima(p.id)
  const lembra = u ? `Dia ${dataCurta(hojeRecife(new Date(u.quando)))} você me respondeu "${u.resposta}". ` : ''
  const f = p.falas(espera, lembra)[espera === 0 ? 0 : espera <= 2 ? 1 : 2]
  const nome = m.quem()
  const vi = `${nome}, ${f.vi}`
  // E7: na 3ª cobrança do mesmo assunto (2 adiamentos ou 3 dias esperando) aparece "isso já é decidido"
  const terceira = !m.equipe() && (adiamentos(p.id) >= 2 || espera >= 3)
  return {
    id: p.id, funcionario: p.funcionario, assunto: p.assunto, pergunta: vi, contexto: `${f.importa} ${f.sugiro}`, partes: { vi, importa: f.importa, sugiro: f.sugiro },
    opcoes: terceira ? [...p.opcoes, { id: 'decidido', rotulo: 'Isso já é decidido: não me pergunte mais' }] : p.opcoes, espera_dias: espera, vence_em: p.vence_em ?? null, atrasado_dias: p.atrasado_dias ?? 0,
    ...(p.valor != null && !m.equipe() ? { valor: p.valor } : {}), ...(p.mensagem ? { mensagem: p.mensagem } : {}),
  }
}

function feiraDaSemana(seg: string) { return e.feiras.find(f => f.semana === seg) }
function contagemDaSemana(seg: string) { return e.contagens.find(c => c.semana === seg) }

function todasAsPerguntas(m: Mundo, agora: Date): PerguntaEsc[] {
  const hoje = hojeRecife(agora), mes = hoje.slice(0, 7), dia = Number(hoje.slice(8)), hora = horaRecife(agora)
  const cfg = m.config(), out: PerguntaEsc[] = [], eq = m.equipe()
  const hd = dow(hoje), seg = segundaDaSemana(hoje)
  const P = (p: Parameters<typeof perguntar>[2]) => out.push(perguntar(m, hoje, p))

  /* Fiscal da Feira: 3 coisas, 1 por vez, nessa ordem, e só a que falta */
  const feira = feiraDaSemana(seg)
  const chegouAHora = hd !== 1 || hora >= 18
  if (!feira && !e.semFeira[seg] && chegouAHora) {
    P({ id: `feira_feita:${seg}`, funcionario: 'fiscal', assunto: `Feira da semana de ${dataCurta(seg)}`, espera: Math.max(0, diasEntre(seg, hoje)),
      falas: (n, l) => [
        { vi: 'a feira desta semana ainda não apareceu aqui. Foi feita?', importa: eq ? 'Sem esse registro o casal não sabe se a casa está abastecida.' : 'Sem a feira anotada eu não sei quanto da semana já foi gasto.', sugiro: eq ? 'Se foi, me diz o dia.' : 'Se foi, me diz o dia e o valor que eu anoto.' },
        { vi: `${l}já ${n === 1 ? 'passou 1 dia' : `passaram ${n} dias`} da segunda e a feira desta semana continua sem registro. Foi feita?`, importa: eq ? 'Sem esse registro o casal não sabe se a casa está abastecida.' : 'Enquanto ela não entra, o valor livre da semana aparece maior do que é.', sugiro: 'Se não vai ter feira esta semana, me avisa que eu paro de perguntar.' },
        { vi: `${l}a semana está acabando e a feira não foi registrada, ${dias(n)} depois da segunda. Foi feita?`, importa: eq ? 'Sem esse registro o casal não sabe se a casa está abastecida.' : 'Semana sem feira anotada fica de fora da minha conferência de preço.', sugiro: 'Me diz o que aconteceu que eu fecho a semana.' },
      ],
      opcoes: eq ? [{ id: 'foi_feita', rotulo: 'Foi feita', pede: 'data' }, { id: 'ainda_nao', rotulo: 'Ainda não foi feita' }] : [{ id: 'foi_feita', rotulo: 'Foi feita', pede: 'valor', pede2: 'data' }, { id: 'ainda_nao', rotulo: 'Ainda não foi feita' }, { id: 'sem_feira', rotulo: 'Esta semana não vai ter' }] })
  } else if (feira && !feira.tem_nota && !feira.sem_nota_motivo) {
    const qual = eq ? `A feira de ${dataCurta(feira.data)}` : `A feira de ${dataCurta(feira.data)} (${rs(feira.valor)})`
    P({ id: `feira_nota:${feira.id}`, funcionario: 'fiscal', assunto: `Nota da feira de ${dataCurta(feira.data)}`, espera: Math.max(0, diasEntre(feira.data, hoje)), ...(eq ? {} : { valor: feira.valor }),
      falas: (n, l) => [
        { vi: `${qual.charAt(0).toLowerCase() + qual.slice(1)} está sem a nota.`, importa: 'Sem nota eu não consigo conferir preço nem item.', sugiro: 'Tira uma foto dela agora que eu guardo.' },
        { vi: `${l}${qual.charAt(0).toLowerCase() + qual.slice(1)} continua sem a nota, já faz ${dias(n)}.`, importa: 'Quanto mais tempo passa, maior a chance de a nota se perder.', sugiro: 'Se não teve nota, me diz o motivo que eu anoto.' },
        { vi: `${l}faz ${dias(n)} que a feira de ${dataCurta(feira.data)} está sem nota.`, importa: 'Sem ela, essa feira fica fora da comparação de preço do mês.', sugiro: 'Anexa a foto ou me diz que não teve.' },
      ],
      opcoes: [{ id: 'anexar_nota', rotulo: 'Anexar a nota agora', abre: 'nota' }, { id: 'sem_nota', rotulo: 'Não teve nota', pede: 'texto' }, { id: 'ainda_nao', rotulo: 'Anexar depois' }] })
  } else if (!contagemDaSemana(seg) && (feira || e.semFeira[seg]) && e.itens.some(i => i.ativo) && (!e.pedidoEquipe[seg] || eq)) {
    P({ id: `estoque:${seg}`, funcionario: 'fiscal', assunto: `Contagem do estoque da semana de ${dataCurta(seg)}`, espera: Math.max(0, diasEntre(feira?.data || seg, hoje)),
      falas: (n, l) => [
        { vi: 'a contagem do estoque desta semana ainda não foi feita.', importa: 'Sem ela eu não sei o que faltou nem o que sobrou.', sugiro: `São ${e.itens.filter(i => i.ativo).length} itens: leva 2 minutos.` },
        { vi: `${l}o estoque desta semana continua sem contagem, já faz ${dias(n)}.`, importa: 'Sem contar, a próxima lista de compras sai no chute.', sugiro: eq ? 'Conta agora que leva 2 minutos.' : 'Se não der pra você, eu peço pra equipe da casa.' },
        { vi: `${l}faz ${dias(n)} que o estoque está sem contagem.`, importa: 'Item que acaba sem ninguém ver vira compra de última hora, que sai mais cara.', sugiro: 'Conta agora que leva 2 minutos.' },
      ],
      opcoes: eq ? [{ id: 'contar', rotulo: 'Contar agora', abre: 'contagem' }, { id: 'ainda_nao', rotulo: 'Contar depois' }] : [{ id: 'contar', rotulo: 'Contar agora', abre: 'contagem' }, { id: 'pedir_equipe', rotulo: 'Pedir pra equipe' }, { id: 'ainda_nao', rotulo: 'Contar depois' }] })
  }

  /* Comprador: prestador (véspera e no dia) e gás */
  for (const p of (cfg.casa_prestadores || []) as any[]) {
    const quem = `${String(p.servico).toLowerCase()} (${p.nome})`
    if (m.papel?.() === 'pessoa') continue
    if ((hd + 1) % 7 === p.dia && !eq) P({ id: `prestador_vespera:${p.id}:${hoje}`, funcionario: 'comprador', assunto: `Véspera do ${String(p.servico).toLowerCase()}`, espera: 0, mensagem: `Oi, ${p.nome}! Tudo certo pra amanhã? Pode vir no horário de sempre.`,
      falas: () => { const f = { vi: `amanhã é dia do ${quem}. Já mandou a mensagem confirmando?`, importa: `Confirmar na véspera evita ele esquecer e você perder os ${rs(p.valor)} do dia parado.`, sugiro: 'Deixei a mensagem pronta: é só copiar e colar no WhatsApp.' }; return [f, f, f] },
      opcoes: [{ id: 'copiar_mensagem', rotulo: 'Copiar mensagem' }, { id: 'ja_mandei', rotulo: 'Já mandei' }, { id: 'nao_vem', rotulo: 'Ele não vem' }] })
    if (hd === p.dia && p.ultimaVez !== hoje && (eq || hora >= 17)) P({ id: `prestador_veio:${p.id}:${hoje}`, funcionario: 'comprador', assunto: `Visita do ${String(p.servico).toLowerCase()}`, espera: 0,
      falas: () => { const f = { vi: `hoje é dia do ${quem}. Ele veio?`, importa: eq ? 'Marcando aqui, o casal fica sabendo sem precisar perguntar.' : 'Visita marcada vira histórico: dá pra ver se ele está faltando.', sugiro: 'É só 1 toque.' }; return [f, f, f] },
      opcoes: [{ id: 'veio', rotulo: 'Veio hoje' }, { id: 'nao_veio', rotulo: 'Não veio' }] })
  }
  const gas = previsaoGas(cfg.casa_gas?.trocas || [])
  if (gas.acaba && diasEntre(hoje, gas.acaba) <= 5 && diasEntre(hoje, gas.acaba) >= -10) {
    const f = diasEntre(hoje, gas.acaba)
    P({ id: `gas:${gas.acaba}`, funcionario: 'comprador', assunto: 'Troca do gás', espera: 5 - f,
      falas: (_n, l) => [
        { vi: `pela média das últimas trocas, o gás acaba em ${dias(Math.max(f, 0))}, dia ${dataCurta(gas.acaba!)}.`, importa: 'Gás que acaba no meio do almoço é o pior horário pra resolver.', sugiro: eq ? 'Se já trocou, marca aqui.' : 'Eu pediria hoje.' },
        { vi: `${l}o gás deve acabar ${f > 0 ? `em ${dias(f)}` : 'hoje'}, dia ${dataCurta(gas.acaba!)}, e eu ainda não sei se foi pedido.`, importa: 'Pedido em cima da hora costuma demorar mais pra chegar.', sugiro: eq ? 'Se já trocou, marca aqui.' : 'Eu pediria agora.' },
        { vi: `${l}pela minha conta o gás ${f >= 0 ? 'acaba hoje' : `já devia ter acabado há ${dias(-f)}`}.`, importa: 'Se ainda está durando, ótimo: eu refaço a média quando trocar.', sugiro: eq ? 'Quando trocar, marca aqui.' : 'Me diz se já pediu.' },
      ],
      opcoes: eq ? [{ id: 'troquei', rotulo: 'Troquei hoje' }, { id: 'ainda_nao', rotulo: 'Ainda não troquei' }] : [{ id: 'ja_pedi', rotulo: 'Já pedi o gás' }, { id: 'ainda_nao', rotulo: 'Peço depois' }] })
  }
  // a equipe só recebe as perguntas da Casa, sem nenhum valor
  if (eq) return out

  /* Secretária: lembretes do casal que já chegaram na hora */
  for (const l of e.lembretes.filter(x => !x.feito_em && new Date(x.quando) <= agora)) {
    const d0 = hojeRecife(new Date(l.quando)), n = Math.max(0, diasEntre(d0, hoje))
    const t = l.titulo.charAt(0).toLowerCase() + l.titulo.slice(1)
    const rep = l.repetir === 'nunca' ? '' : `, e volta ${{ dia: 'todo dia', semana: 'toda semana', mes: 'todo mês', ano: 'todo ano' }[l.repetir]}`
    P({ id: `lembrete:${l.id}`, funcionario: 'secretaria', assunto: l.titulo, espera: n, vence_em: d0, atrasado_dias: n,
      falas: (_n, lem) => [
        { vi: `você me pediu pra lembrar hoje: ${t}. Já fez?`, importa: l.detalhe || `Está marcado pra ${dataCurta(d0)}${rep}.`, sugiro: 'Se já resolveu, me diz que eu paro de cobrar.' },
        { vi: `${lem}${n === 1 ? 'ontem' : 'anteontem'} era o dia de ${t} e ficou sem resposta. Já fez?`, importa: l.detalhe || `Estava marcado pra ${dataCurta(d0)}${rep}.`, sugiro: 'Se precisar de mais tempo, eu jogo pra outro dia.' },
        { vi: `${lem}faz ${dias(n)} que "${l.titulo}" está esperando. Já fez?`, importa: l.detalhe || `Estava marcado pra ${dataCurta(d0)}${rep}.`, sugiro: 'Se não vale mais, marca como feito que eu tiro da lista.' },
      ],
      opcoes: [{ id: 'feito', rotulo: 'Já fiz' }, { id: 'adiar_1_dia', rotulo: 'Me lembra amanhã' }, { id: 'adiar_para', rotulo: 'Me lembra outro dia', pede: 'data' }] })
  }

  /* Analista de Cartão */
  const cartoes = m.cartoes().filter(c => c.ativo !== false)
  for (const f of m.faturas().filter(x => x.total > 0)) {
    const falta = diasEntre(hoje, f.vencimento)
    const fb = e.fatBanco.find(x => x.cartao_id === f.cartao_id && x.mes === f.mes)
    // nunca pergunta o que o app já sabe: fatura marcada como paga não é cobrada
    // fatura que já estava vencida quando o exemplo abriu é tratada como paga antes (não nasce cobrança velha)
    if (!fb?.paga_em && falta <= 3 && falta >= -20 && !(falta < 0 && !e.desde[`fatura:${f.cartao_id}:${f.mes}`])) {
      const total = fb?.valor_banco ?? f.total
      P({ id: `fatura:${f.cartao_id}:${f.mes}`, funcionario: 'cartao', assunto: `Fatura do ${f.cartao}`, espera: 3 - falta, valor: total, vence_em: f.vencimento, atrasado_dias: Math.max(0, -falta),
        falas: (_n, l) => [
          { vi: `a fatura do ${f.cartao} está em ${rs(total)} e vence ${diaSemana(f.vencimento)}, ${dataCurta(f.vencimento)}. Faltam ${dias(falta)}. Já pagou?`, importa: 'Pagando até o dia, não tem juros nem multa.', sugiro: 'Eu pagaria hoje pelo app do banco, pra tirar da cabeça.' },
          { vi: `${l}a fatura do ${f.cartao} (${rs(total)}) ${quandoVence(falta)} e você ainda não me disse se pagou.`, importa: 'Atrasando, o banco cobra juros e multa.', sugiro: 'Se já pagou, me diz o dia que eu anoto.' },
          { vi: `${l}a fatura do ${f.cartao} (${rs(total)}) ${quandoVence(falta)} e continua sem resposta.`, importa: falta < 0 ? `Cada dia de atraso aumenta os juros: são ${dias(-falta)} até agora.` : 'Atrasando, o banco cobra juros e multa.', sugiro: 'Paga hoje e me avisa.' },
        ],
        opcoes: [{ id: 'paguei_hoje', rotulo: 'Paguei hoje' }, { id: 'paguei_outro_dia', rotulo: 'Paguei outro dia', pede: 'data' }, { id: 'ainda_nao', rotulo: 'Ainda não paguei' }] })
    }
    if (fb?.valor_banco != null && Math.abs(fb.valor_banco - f.total) >= 1) {
      const dif = centavos(fb.valor_banco - f.total)
      P({ id: `fatura_dif:${f.cartao_id}:${f.mes}`, funcionario: 'cartao', assunto: `Diferença na fatura do ${f.cartao}`, valor: Math.abs(dif),
        falas: (n, l) => { const f1 = { vi: dif > 0 ? `o banco cobrou ${rs(fb.valor_banco!)} na fatura do ${f.cartao} e eu somei ${rs(f.total)}.` : `o banco cobrou ${rs(fb.valor_banco!)} na fatura do ${f.cartao}, menos que os ${rs(f.total)} que eu somei.`, importa: dif > 0 ? `Tem ${rs(dif)} que não foi anotado aqui.` : `Sobraram ${rs(-dif)}: pode ser compra anotada em dobro ou no cartão errado.`, sugiro: dif > 0 ? 'Eu anotaria agora, pra o mês fechar certo.' : 'Vale conferir os lançamentos desse cartão.' }
          const f2 = { ...f1, vi: `${l}a diferença de ${rs(Math.abs(dif))} na fatura do ${f.cartao} continua sem explicação, já faz ${dias(n)}.` }; return [f1, f2, f2] },
        opcoes: dif > 0 ? [{ id: 'lancar_diferenca', rotulo: 'Anotar agora', abre: 'lancar' }, { id: 'juros_tarifa', rotulo: 'É juros ou tarifa do banco' }, { id: 'ainda_nao', rotulo: 'Vejo depois' }] : [{ id: 'conferi', rotulo: 'Já conferi' }, { id: 'ainda_nao', rotulo: 'Vejo depois' }] })
    }
  }
  for (const c of cartoes) {
    if (!c.dia_fechamento) P({ id: `cartao_sem_dia:${c.id}`, funcionario: 'cartao', assunto: `Dia de fechamento do ${c.nome}`,
      falas: (n, l) => { const f1 = { vi: `o cartão ${c.nome} está sem o dia em que a fatura fecha.`, importa: 'Sem esse dia eu não sei em qual mês cada compra vai ser cobrada.', sugiro: 'O dia aparece no app do banco, na tela da fatura.' }; const f2 = { ...f1, vi: `${l}o cartão ${c.nome} continua sem o dia de fechamento, já faz ${dias(n)}.` }; return [f1, f2, f2] },
      opcoes: [{ id: 'abrir_cadastro', rotulo: 'Informar o dia', abre: 'cartao' }, { id: 'ainda_nao', rotulo: 'Informo depois' }] })
    const prox = (Number(hoje.slice(5, 7)) % 12) + 1
    if (c.taxa_valor && c.taxa_periodo === 'ano' && c.taxa_mes === prox) {
      const anoProx = Number(hoje.slice(0, 4)) + (prox === 1 ? 1 : 0), dia1 = `${anoProx}-${String(prox).padStart(2, '0')}-01`
      P({ id: `anuidade:${c.id}:${dia1.slice(0, 7)}`, funcionario: 'cartao', assunto: `Anuidade do ${c.nome}`, valor: c.taxa_valor,
        falas: (n, l) => { const f1 = { vi: `mês que vem o ${c.nome} cobra a anuidade de ${rs(c.taxa_valor!)}.`, importa: c.taxa_isenta_acima ? `Pelo cadastro, o banco não cobra de quem gasta ${rs(c.taxa_isenta_acima)} ou mais por mês.` : 'Muita gente consegue não pagar pedindo pelo chat do banco antes da cobrança.', sugiro: `Quer que eu te lembre de pedir isenção dia ${dataCurta(dia1)}?` }; const f2 = { ...f1, vi: `${l}a anuidade de ${rs(c.taxa_valor!)} do ${c.nome} chega mês que vem e ainda não combinamos nada, já faz ${dias(n)}.` }; return [f1, f2, f2] },
        opcoes: [{ id: 'lembrar_isencao', rotulo: `Me lembra dia ${dataCurta(dia1)}` }, { id: 'ja_pedi_isencao', rotulo: 'Já pedi a isenção' }, { id: 'vou_pagar', rotulo: 'Vou pagar mesmo' }] })
    }
  }

  /* Gestor do Guardado */
  const g = guardadoHojeEx(m.eu?.()), r = m.resumo()
  if (dia === 1 && g.aplicacoes.length) P({ id: `conferir_saldo:${mes}`, funcionario: 'guardado', assunto: 'Conferência do saldo guardado', valor: g.total, espera: 0,
    falas: () => { const f = { vi: `virou o mês. Pela minha conta você tem ${rs(g.total)} guardados.`, importa: 'Se o banco mostrar outro valor, eu acerto a diferença e a conta do rendimento volta a bater.', sugiro: 'Abre o app do banco e me diz quanto aparece lá.' }; return [f, f, f] },
    opcoes: [{ id: 'saldo_conferido', rotulo: 'Dizer quanto aparece no banco', pede: 'valor' }, { id: 'ainda_nao', rotulo: 'Confiro depois' }] })
  for (const a of g.aplicacoes.filter(x => x.vence_em && diasEntre(hoje, x.vence_em) <= 15 && diasEntre(hoje, x.vence_em) >= 0)) {
    const falta = diasEntre(hoje, a.vence_em!)
    P({ id: `vence:${a.id}:${a.vence_em}`, funcionario: 'guardado', assunto: `Vencimento do ${a.nome}`, valor: a.saldo, vence_em: a.vence_em, espera: 15 - falta > 12 ? 3 : undefined,
      falas: (n, l) => [
        { vi: `o ${a.nome} vence dia ${dataCurta(a.vence_em!)}, daqui a ${dias(falta)}. Tem ${rs(a.saldo)} lá.`, importa: `Se ninguém decidir, o banco devolve pra conta comum, que não rende: são mais ou menos ${rs(rendePorMes(a.saldo))} por mês que deixam de entrar.`, sugiro: 'Eu renovaria, se a taxa continuar parecida.' },
        { vi: `${l}o ${a.nome} ${quandoVence(falta)} e ainda não sei o que você quer fazer com os ${rs(a.saldo)}, já faz ${dias(n)} que perguntei.`, importa: `Parado na conta depois do vencimento, esse dinheiro deixa de render mais ou menos ${rs(rendePorMes(a.saldo))} por mês.`, sugiro: 'Eu renovaria, se a taxa continuar parecida.' },
        { vi: `${l}o ${a.nome} ${quandoVence(falta)}. São ${rs(a.saldo)} sem destino combinado.`, importa: `Parado na conta, deixa de render mais ou menos ${rs(rendePorMes(a.saldo))} por mês.`, sugiro: 'Decide hoje: renovar ou tirar.' },
      ],
      opcoes: [{ id: 'renovar', rotulo: 'Vou renovar' }, { id: 'tirar', rotulo: 'Vou tirar o dinheiro' }, { id: 'ainda_nao', rotulo: 'Decido depois' }] })
  }
  const onde = cfg.reserva_onde || 'conta'
  if (r.colchao > 0 && onde === 'conta' && g.aplicacoes.length) P({ id: `reserva_parada:${mes}`, funcionario: 'guardado', assunto: 'Reserva parada na conta', valor: r.colchao,
    falas: (n, l) => [
      { vi: `a reserva de ${rs(r.colchao)} (o dinheiro que vocês combinaram nunca gastar) está na conta comum, que não rende.`, importa: `Guardada onde rende todo dia e dá pra tirar na hora, daria mais ou menos ${rs(rendePorMes(r.colchao))} por mês.`, sugiro: 'Quer que eu mostre como guardar?' },
      { vi: `${l}a reserva de ${rs(r.colchao)} continua na conta comum, sem render, já faz ${dias(n)} que avisei.`, importa: `São mais ou menos ${rs(rendePorMes(r.colchao))} por mês que deixam de entrar.`, sugiro: 'Leva 2 minutos pra guardar.' },
      { vi: `${l}faz ${dias(n)} que a reserva de ${rs(r.colchao)} está parada na conta comum.`, importa: `Em 1 ano são mais ou menos ${rs(rendePorMes(r.colchao) * 12)} que deixam de entrar.`, sugiro: 'Se preferir deixar na conta, me diz que eu não toco mais no assunto este mês.' },
    ],
    opcoes: [{ id: 'mostrar_guardar', rotulo: 'Mostrar como guardar', abre: 'guardado' }, { id: 'deixar_na_conta', rotulo: 'Deixar na conta' }, { id: 'lembrar_dia_15', rotulo: 'Me lembra dia 15' }] })

  /* Folha da Casa: guia do governo do dia 1 ao 7 e salário no dia combinado */
  const folha = cfg.casa_folha as { pessoas: { id: string; nome: string; salario: number; diaPagamento?: number }[]; daePaga: Record<string, boolean> } | undefined
  if (folha?.pessoas?.length) {
    if (dia <= 7 && !folha.daePaga?.[mes]) P({ id: `dae:${mes}`, funcionario: 'folha', assunto: 'Guia do governo de quem trabalha na casa', vence_em: `${mes}-07`, espera: dia - 1,
      falas: (_n, l) => [
        { vi: `a guia do governo de quem trabalha na casa vence dia 07/${mes.slice(5)}. Faltam ${dias(7 - dia)}. Já pagou?`, importa: 'É o boleto mensal do registro de quem trabalha na casa. Pago em dia, não tem multa.', sugiro: 'Eu pagaria hoje pelo app do banco.' },
        { vi: `${l}a guia do governo de quem trabalha na casa ${quandoVence(7 - dia)} e ainda não sei se foi paga.`, importa: 'Com atraso, vem multa e juros em cima do valor.', sugiro: 'Paga hoje e me avisa que eu marco.' },
        { vi: `${l}a guia do governo de quem trabalha na casa ${quandoVence(7 - dia)}.`, importa: 'Depois do dia 07 o valor já vem com multa.', sugiro: 'Paga hoje e me avisa que eu marco.' },
      ],
      opcoes: [{ id: 'paguei_guia', rotulo: 'Paguei a guia' }, { id: 'ainda_nao', rotulo: 'Ainda não paguei' }] })
    for (const p of folha.pessoas) if (dia === (p.diaPagamento || 5)) P({ id: `salario:${p.id}:${mes}`, funcionario: 'folha', assunto: `Salário de ${p.nome}`, valor: p.salario, espera: 0,
      falas: () => { const f = { vi: `hoje é dia do salário de ${p.nome}: ${rs(p.salario)}. Já pagou?`, importa: 'Salário pago no dia combinado evita conversa chata e deixa a folha em ordem.', sugiro: 'Pagou, me diz que eu anoto a data.' }; return [f, f, f] },
      opcoes: [{ id: 'paguei_hoje', rotulo: 'Paguei hoje' }, { id: 'pago_outro_dia', rotulo: 'Pago outro dia', pede: 'data' }, { id: 'ainda_nao', rotulo: 'Ainda não paguei' }] })
  }

  /* Guardião da Reserva: o que está livre no mês ficou menor que a reserva */
  if (r.livre_mes < r.colchao) {
    const tem = Math.max(0, r.livre_mes), faltam = centavos(r.colchao - tem)
    P({ id: `colchao:${mes}`, funcionario: 'colchao', assunto: 'Reserva abaixo do combinado', valor: faltam,
      falas: (n, l) => [
        { vi: `a reserva da família (o dinheiro que vocês combinaram nunca gastar) está em ${rs(tem)}. O combinado é ${rs(r.colchao)}, então faltam ${rs(faltam)}.`, importa: 'Sem a reserva inteira, um imprevisto vira dívida.', sugiro: 'De onde esse dinheiro volta, e em que dia?' },
        { vi: `${l}hoje ainda faltam ${rs(faltam)} pra reserva voltar aos ${rs(r.colchao)}, ${dias(n)} depois do meu aviso.`, importa: 'Enquanto ela não volta, qualquer gasto fora do combinado sai do dinheiro de emergência.', sugiro: l ? 'O dinheiro entrou?' : 'Me diz de onde ele volta, e em que dia.' },
        { vi: `${l}faz ${dias(n)} que a reserva está ${rs(faltam)} abaixo do combinado.`, importa: 'Reserva furada por muito tempo deixa de ser reserva.', sugiro: 'Vale rever os limites do mês em Planejamento, ou me dizer de onde o dinheiro volta.' },
      ],
      opcoes: [{ id: 'repor', rotulo: 'Dizer de onde volta e quando', pede: 'texto', pede2: 'data' }, { id: 'ja_voltou', rotulo: 'Já repus o dinheiro' }, { id: 'ainda_nao', rotulo: 'Me lembra amanhã' }] })
  }

  /* E2 (rodada 2, só no exemplo): a semana da pessoa passou do combinado. 1 vez por semana; quem fala é o Contador */
  const minha = r.envelopes.find(x => !x.casa && x.regra === 'diario')
  if (minha && minha.gasto_semana_dia != null) {
    const lim = minha.limite_base ?? minha.limite_mes, teto = centavos((lim * 7) / Number(fimDoMes(hoje).slice(8)))
    const passou = centavos(minha.gasto_semana_dia - teto)
    if (passou > 0) P({ id: `semana_passou:${seg}`, funcionario: 'contador', assunto: 'A semana passou do combinado', valor: passou, espera: 0,
      falas: () => { const f = { vi: `esta semana foram ${rs(minha.gasto_semana_dia!)} e o combinado da semana era ${rs(teto)}. Passou ${rs(passou)}.`, importa: `O que passou já foi dividido pelos dias que faltam: é por isso que o número de hoje ficou menor.`, sugiro: 'Eu deixaria assim, diluído até o fim do mês.' }; return [f, f, f] },
      opcoes: [{ id: 'diluir', rotulo: 'Diluir até o fim do mês' }, { id: 'tirar_mes_que_vem', rotulo: 'Tirar do mês que vem' }, { id: 'mostrar_conta', rotulo: 'Me mostra a conta', abre: 'orcamento' }] })
  }

  /* E4 (rodada 2, só no exemplo): dinheiro que entrou a mais e ficou na conta. Quem fala é o Gestor do Guardado */
  for (const x of m.entradasNaConta?.() || []) {
    const de = x.de.charAt(0).toLowerCase() + x.de.slice(1)
    P({ id: `entrou_extra:${x.id}`, funcionario: 'guardado', assunto: 'Dinheiro que entrou a mais', valor: x.valor, espera: Math.max(0, diasEntre(x.data, hoje)),
      falas: (_n, l) => [
        { vi: `entraram ${rs(x.valor)} a mais: ${de}.`, importa: `Pelo combinado de vocês, o que entra a mais do que o salário não aumenta o gasto do mês. Guardado, rende uns ${rs(Math.max(1, rendePorMes(x.valor)))} por mês.`, sugiro: 'Eu guardaria hoje.' },
        { vi: `${l}os ${rs(x.valor)} que entraram a mais continuam parados na conta.`, importa: 'Parado na conta, esse dinheiro acaba virando gasto sem ninguém decidir.', sugiro: 'Eu guardaria hoje.' },
        { vi: `${l}faz ${dias(Math.max(0, diasEntre(x.data, hoje)))} que os ${rs(x.valor)} estão na conta.`, importa: 'Regra do salário: o que entra a mais vai pra reserva.', sugiro: 'Guarda hoje ou me diz pra que gasto ele é.' },
      ],
      opcoes: [{ id: 'guardar_entrada', rotulo: `Guardar os ${rs(x.valor)}` }, { id: 'gasto_combinado', rotulo: 'É pra um gasto combinado' }, { id: 'ainda_nao', rotulo: 'Me lembra amanhã' }] })
  }

  /* Contador: dia 1 fecha o mês; depois das 20h sem gasto anotado no dia */
  const sobrou = m.sobraMesPassado()
  if (dia === 1 && sobrou > 0 && rendePorMes(sobrou) >= 20) P({ id: `fechou_mes:${mes}`, funcionario: 'contador', assunto: 'Fechamento do mês', valor: sobrou, espera: 0,
    falas: () => { const f = { vi: `fechei o mês passado: sobraram ${rs(sobrou)} do combinado.`, importa: `Parado na conta esse dinheiro não rende. Guardado, daria mais ou menos ${rs(rendePorMes(sobrou))} por mês.`, sugiro: 'Eu mandaria pro Guardado hoje.' }; return [f, f, f] },
    opcoes: [{ id: 'mostrar_guardar', rotulo: 'Guardar agora', abre: 'guardado' }, { id: 'deixar_na_conta', rotulo: 'Deixar na conta' }, { id: 'lembrar_dia_5', rotulo: 'Me lembra dia 5' }] })
  const ug = m.ultimoGasto(), semAnotar = ug ? diasEntre(ug, hoje) : 3
  if (hora >= 20 && semAnotar > 0) P({ id: `lancou:${hoje}`, funcionario: 'contador', assunto: `Gastos de ${dataCurta(hoje)}`, espera: semAnotar - 1,
    falas: () => [
      { vi: `são ${hora}h e não tem nenhum gasto anotado hoje. Gastou alguma coisa e ficou sem anotar?`, importa: 'Gasto sem anotar faz o número de amanhã sair maior do que é de verdade.', sugiro: 'Se gastou, anota agora: leva 10 segundos.' },
      { vi: `já são ${dias(semAnotar)} sem nenhum gasto anotado. Ficou alguma coisa pra trás?`, importa: 'Quanto mais dias, mais difícil lembrar, e a conta do mês sai errada.', sugiro: 'Anota o que lembrar agora, mesmo que seja aproximado.' },
      { vi: `faz ${dias(semAnotar)} que ninguém anota um gasto aqui.`, importa: `O número de hoje (${rs(r.pode_gastar_hoje)}) está contando que nada foi gasto nesses dias.`, sugiro: 'Se gastaram, anota 1 valor só com o total: já ajuda.' },
    ],
    opcoes: [{ id: 'lancar_agora', rotulo: 'Anotar agora', abre: 'lancar' }, { id: 'hoje_nao_gastei', rotulo: 'Hoje não gastei' }, { id: 'lembrar_21h', rotulo: 'Me lembra às 21h' }] })
  // rodada 2: a pessoa da família (filha) só ouve o que é dela: o Contador falando dos gastos dela
  if (m.papel?.() === 'pessoa') return out.filter(p => p.funcionario === 'contador' && /^lancou:/.test(p.id))
  // 2 funcionários no mesmo fato: fala só o dono. A semana que passou é do Contador; o Guardião só fala quando a reserva é tocada.
  return out
}

/** 1 linha do que cada um fez hoje (quando não tem pergunta, ele mostra isso e não inventa assunto). */
function entregas(m: Mundo, agora: Date): EntregaEsc[] {
  const hoje = hojeRecife(agora), r = m.resumo(), cfg = m.config(), g = guardadoHojeEx(m.eu?.()), seg = segundaDaSemana(hoje)
  const sobra = r.livre_mes - r.colchao
  const prox = m.faturas().filter(f => f.vencimento >= hoje && f.total > 0).sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0]
  const reserva = ((cfg.casa_folha?.pessoas || []) as { salario: number }[]).reduce((s, p) => s + reservaFolha(p.salario).total, 0)
  const falta = ((cfg.casa_lista || []) as { ok: boolean }[]).filter(i => !i.ok).length
  const ativos = e.lembretes.filter(l => !l.feito_em).length
  const feira = feiraDaSemana(seg), cont = contagemDaSemana(seg)
  const env = r.envelopes.find(x => x.regra === 'semanal')
  const acabou = cont ? cont.itens.filter(i => i.estado === 'acabou').length : 0
  const fiscal = !feira ? (e.semFeira[seg] ? 'Esta semana não tem feira, como você avisou.' : 'A feira desta semana ainda não apareceu. Eu cobro a partir de segunda, 18h.')
    : `Feira de ${dataCurta(feira.data)} feita, ${rs(feira.valor)}${env?.teto_semana ? ` de ${rs(env.teto_semana)} da semana` : ''}. ${feira.tem_nota ? 'Nota anexada.' : feira.sem_nota_motivo ? `Sem nota (${feira.sem_nota_motivo}).` : 'Falta a nota.'} ${cont ? `Estoque contado: ${acabou === 0 ? 'nada acabou' : acabou === 1 ? 'acabou 1 item' : `acabaram ${acabou} itens`}.` : 'Falta contar o estoque.'}${env?.teto_semana && (env.gasto_semana || 0) > env.teto_semana ? ` A semana passou ${rs((env.gasto_semana || 0) - env.teto_semana)} do combinado.` : ''}`
  return [
    { funcionario: 'contador', resumo: sobra >= 0 ? `Conferi o mês: sobram ${rs(sobra)} até o fim${r.colchao ? ', já sem contar a reserva' : ''}.` : `Conferi o mês: faltam ${rs(-sobra)} pra não mexer na reserva.`, numero: sobra },
    (() => { const meu = r.envelopes.find(x => !x.casa && x.regra === 'diario' && x.livre < 0)
      return meu ? { funcionario: 'colchao', resumo: `A reserva de ${rs(r.colchao)} está inteira, mas ${meu.nome} passou ${rs(-meu.livre)} do combinado do mês. Isso sai do mês que vem, não da reserva.`, numero: r.colchao }
        : { funcionario: 'colchao', resumo: `A reserva de ${rs(r.colchao)} está inteira. O número de hoje já deixa esse valor de fora.`, numero: r.colchao } })(),
    { funcionario: 'cartao', resumo: prox ? `Somei as faturas: a próxima é a do ${prox.cartao}, ${rs(prox.total)}, que vence dia ${dataCurta(prox.vencimento)}.` : 'Somei as faturas: nenhuma com valor pela frente.', numero: prox ? prox.total : null },
    { funcionario: 'folha', resumo: reserva ? `Folha em dia. Pra férias e 13º, o certo é separar ${rs(reserva)} por mês.` : 'Ninguém cadastrado na folha ainda.', numero: reserva || null },
    { funcionario: 'comprador', resumo: falta ? `Olhei a lista de compras: ${falta === 1 ? 'falta 1 item' : `faltam ${falta} itens`}.` : 'Olhei a lista de compras: está em dia.', numero: null },
    { funcionario: 'fiscal', resumo: fiscal, numero: feira ? feira.valor : null },
    { funcionario: 'guardado', resumo: !g.aplicacoes.length ? 'Nada guardado ainda.' : g.motivo_zero ? g.motivo_zero : `O dinheiro guardado rendeu ${rs(g.rendeu_hoje_liquido)} hoje, já sem o imposto.`, numero: g.aplicacoes.length ? g.rendeu_hoje_liquido : null },
    { funcionario: 'secretaria', resumo: ativos ? `Estou com ${ativos === 1 ? '1 lembrete guardado' : `${ativos} lembretes guardados`}. Eu aviso quando chegar a hora.` : 'Nenhum lembrete guardado.', numero: null },
  ]
}

function resumoCadastro(m: Mundo, id: string): string {
  const cfg = m.config(), n = (v: number, um: string, mais: string) => (v === 1 ? `1 ${um}` : `${v} ${mais}`)
  if (id === 'cartao') return n(m.cartoes().filter(c => c.ativo !== false).length, 'cartão', 'cartões')
  if (id === 'fiscal') return `${n(e.feiras.length, 'feira', 'feiras')}, ${n(e.itens.filter(i => i.ativo).length, 'item', 'itens')} no estoque`
  if (id === 'folha') return n((cfg.casa_folha?.pessoas || []).length, 'pessoa', 'pessoas')
  if (id === 'comprador') return `${n((cfg.casa_prestadores || []).length, 'prestador', 'prestadores')}, ${n((cfg.casa_gas?.trocas || []).length, 'troca de gás', 'trocas de gás')}`
  if (id === 'guardado') return n(e.apps.filter(a => !a.encerrada_em).length, 'aplicação', 'aplicações')
  if (id === 'secretaria') return n(e.lembretes.filter(l => !l.feito_em).length, 'lembrete', 'lembretes')
  if (id === 'contador') return `${n((cfg.rendas || []).length, 'renda', 'rendas')}, ${n((cfg.contas_fixas || []).length, 'conta fixa', 'contas fixas')}`
  return 'a reserva da família'
}
/** Do mais novo pro mais velho; no mesmo instante, vale a ordem em que foi anotado. */
const maisNovoPrimeiro = (l: Entrada[]) => l.map((d, i) => ({ d, i })).sort((a, b) => b.d.quando.localeCompare(a.d.quando) || b.i - a.i).map(x => x.d)
const limpa = ({ perguntado_em: _p, corrigida: _c, ...d }: Entrada): LinhaDiario => d

export function escritorioHojeEx(m: Mundo, agora = new Date()): EscritorioHoje {
  const todas = todasAsPerguntas(m, agora)
  const hoje = hojeRecife(agora), hora = horaRecife(agora), eq = m.equipe()
  let abertas = todas.filter(p => !calada(p.id, agora, p.valor))
  // regras de silêncio (rodada 2, EQUIPE seção 3): das 22h às 7h ninguém fala, só o que vence hoje
  if (hora >= 22 || hora < 7) abertas = abertas.filter(p => p.vence_em === hoje)
  // ordem: o que vence hoje, depois quem espera há mais tempo, depois o valor maior
  abertas.sort((a, b) => Number(b.vence_em === hoje) - Number(a.vence_em === hoje) || (b.espera_dias || 0) - (a.espera_dias || 0) || (b.valor || 0) - (a.valor || 0))
  const pessoa = m.papel?.() === 'pessoa'
  const ent = eq ? [] : pessoa ? entregas(m, agora).filter(x => x.funcionario === 'contador') : entregas(m, agora)
  const lista = eq ? FUNC.filter(f => f.id === 'comprador' || f.id === 'fiscal') : pessoa ? FUNC.filter(f => f.id === 'contador') : FUNC
  const funcionarios = lista.map(f => {
    const minha = abertas.find(p => p.funcionario === f.id)
    const estado: EstadoFuncionario = minha ? 'precisa_de_voce' : hora < f.turno ? 'vai_comecar' : hora < f.turno + 1 ? 'trabalhando' : 'entregue'
    const frase = minha ? minha.pergunta : estado === 'vai_comecar' ? `Começo às ${f.turno}h.` : estado === 'trabalhando' ? 'Estou conferindo os números agora.' : ent.find(x => x.funcionario === f.id)?.resumo || 'Hoje não preciso de nada seu.'
    return { id: f.id, nome: f.nome, sala: f.sala, estado, frase, cadastro_resumo: eq ? undefined : resumoCadastro(m, f.id), ultimas_respostas: eq ? [] : diarioEx(m, f.id, 10) }
  })
  return {
    precisa_de_voce: abertas,
    trabalhando: funcionarios.filter(f => f.estado === 'trabalhando').map(f => ({ funcionario: f.id })),
    entregue: ent,
    funcionarios,
  }
}

export function diarioEx(m: Mundo, funcionario: string, limite: number, antes?: string): LinhaDiario[] {
  if (m.equipe()) return []
  return maisNovoPrimeiro(e.diario.filter(d => d.funcionario === funcionario && (!antes || d.quando < antes))).slice(0, limite).map(limpa)
}

export function escritorioResponderEx(m: Mundo, perguntaId: string, opcao: string, dados: Record<string, unknown> = {}, agora = new Date()) {
  const hoje = hojeRecife(agora), cfg = m.config(), eq = m.equipe()
  const p = todasAsPerguntas(m, agora).find(x => x.id === perguntaId)
  // responder de novo a mesma pergunta é corrigir: a linha antiga fica no diário e a nova passa a valer
  const velha = dados.corrige ? ultima(perguntaId) : undefined
  if (velha) velha.corrigida = true
  if (!p) throw new Error(velha ? 'Essa pergunta já foi resolvida de outro jeito. Corrija pelo cadastro, em "O que eu cuido".' : 'Essa pergunta já foi respondida. Atualizei a lista.')
  if (!velha && calada(perguntaId, agora)) throw new Error('Essa pergunta já foi respondida. Atualizei a lista.')
  const op = p.opcoes.find(o => o.id === opcao)
  if (!op) throw new Error('Essa resposta não existe mais. Feche e abra a tela de novo.')
  const [tipo, ref, ref2] = perguntaId.split(':')
  let adiado: string | null = null, extra = ''
  const amanha = emRecife(somaDias(hoje, 1), 6)
  const data = String(dados.data || '')
  const veio = (t: string) => dados[t] != null && dados[t] !== ''
  const quer = (t: string) => op.pede === t || (op.pede2 === t && veio(t))
  // a equipe nunca digita valor: pra ela o campo obrigatório da feira é só o dia
  const semValor = eq && op.pede === 'valor'
  if (quer('valor') && !eq && !(Number(dados.valor) > 0)) throw new Error('Digite o valor.')
  if (quer('data') || (semValor && veio('data'))) { if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Escolha o dia.'); extra = `, dia ${dataCurta(data)}` }
  if (quer('valor') && !eq) extra += `, ${rs(Number(dados.valor))}`
  if (quer('texto')) { const t = String(dados.texto || '').trim(); if (!t) throw new Error('Escreva a resposta.'); extra = `: ${t.slice(0, 140)}` + extra }

  if (opcao === 'copiar_mensagem') adiado = agora.toISOString() // anota que copiou, mas a pergunta continua até "Já mandei"
  else if (/^ainda_nao|^adiar_1_dia/.test(opcao)) adiado = amanha
  else if (opcao === 'lembrar_21h' || opcao === 'lembrar_22h') adiado = emRecife(hoje, 21)
  else if (opcao === 'lembrar_dia_15') adiado = emRecife(`${hoje.slice(0, 8)}15`, 6)
  else if (opcao === 'lembrar_dia_5') adiado = emRecife(`${hoje.slice(0, 8)}05`, 6)
  if (tipo === 'lembrete') {
    const l = e.lembretes.find(x => x.id === ref)
    if (l) {
      if (opcao === 'feito') concluir(l, agora)
      else if (opcao === 'adiar_1_dia') { l.quando = emRecife(somaDias(hoje, 1)); adiado = l.quando }
      else if (opcao === 'adiar_para') { l.quando = emRecife(data); adiado = l.quando }
    }
  }
  if (tipo === 'fatura' && /^paguei/.test(opcao)) informarFatura(m, ref, ref2, { paga_em: opcao === 'paguei_hoje' ? hoje : data })
  if (tipo === 'anuidade' && opcao === 'lembrar_isencao') { const c = m.cartoes().find(x => x.id === ref); e.lembretes.push({ id: 'lb' + Date.now(), titulo: `Pedir isenção da anuidade do ${c?.nome || 'cartão'}`, detalhe: 'Pelo chat ou telefone do banco, antes da cobrança.', quando: emRecife(`${ref2}-01`), repetir: 'nunca', para: 'eu', funcionario: 'secretaria', feito_em: null }) }
  if (tipo === 'dae' && opcao === 'paguei_guia') { const f = cfg.casa_folha; f.daePaga = { ...(f.daePaga || {}), [hoje.slice(0, 7)]: true } }
  if (tipo === 'prestador_veio' && opcao === 'veio') { const pr = (cfg.casa_prestadores || []).find((x: any) => x.id === ref); if (pr) pr.ultimaVez = hoje }
  if (tipo === 'gas' && opcao === 'troquei') { const g = cfg.casa_gas || { trocas: [] }; if (!g.trocas.includes(hoje)) g.trocas.push(hoje); cfg.casa_gas = g }
  if (tipo === 'reserva_parada' && opcao === 'deixar_na_conta') cfg.reserva_onde = 'conta'
  if (tipo === 'conferir_saldo' && opcao === 'saldo_conferido') {
    // o valor digitado vale pro total: a diferença entra na aplicação que dá pra tirar na hora
    const g = guardadoHojeEx(), dif = centavos(Number(dados.valor) - g.total)
    const a = e.apps.find(x => !x.encerrada_em && x.liquidez === 'diaria') || e.apps.find(x => !x.encerrada_em)
    if (a && dif) { const atual = g.aplicacoes.find(x => x.id === a.id)?.saldo || 0; a.movimentos.push({ data: hoje, tipo: 'saldo_conferido', valor: centavos(atual + dif) }) }
    extra += dif ? `. Diferença de ${rs(dif)} acertada` : '. Bateu com a minha conta'
  }
  let aviso = ''
  if (opcao === 'decidido') { e.decididos[perguntaId] = { valor: p.valor ?? null }; aviso = 'Combinado: não pergunto mais sobre isso, a não ser que o valor mude.' }
  if (tipo === 'entrou_extra') {
    const x = (m.entradasNaConta?.() || []).find(y => y.id === ref)
    if (x && opcao === 'guardar_entrada') {
      const meu = guardadoHojeEx(m.eu?.()).aplicacoes.filter(a => a.titular === m.eu?.())
      const app = meu.find(a => a.liquidez === 'diaria') || meu[0]
      if (!app) throw new Error('Você ainda não tem nada no Guardado no seu nome. Crie a aplicação no Guardado.')
      guardadoMovimentarEx(app.id, 'aporte', x.valor, hoje, 'e4-' + x.id, x.de)
      m.guardarEntrada?.(x.id)
      aviso = `${rs(x.valor)} foram pra reserva (${app.nome}). Regra do salário cumprida.`
    }
    if (x && opcao === 'gasto_combinado') { (x as any).destino = 'gasto combinado'; aviso = `Anotado: os ${rs(x.valor)} são pra um gasto combinado.` }
  }
  if (tipo === 'semana_passou' && opcao === 'tirar_mes_que_vem') aviso = 'Combinado: o que passou sai do mês que vem.'
  if (tipo === 'semana_passou' && opcao === 'diluir') aviso = 'Combinado: fica dividido pelos dias que faltam.'
  if (tipo === 'feira_feita') {
    if (opcao === 'foi_feita') feiraRegistrarEx(m, { data: data || hoje, valor: eq ? undefined : Number(dados.valor), loja: String(dados.loja || '') })
    if (opcao === 'sem_feira') e.semFeira[ref] = true
  }
  if (tipo === 'feira_nota') {
    const fe = e.feiras.find(x => x.id === ref)
    if (opcao === 'anexar_nota') { if (!dados.caminho) throw new Error('Tire a foto da nota ou escolha o arquivo.'); feiraAnexarEx(ref) ; extra = ''; aviso = `Nota da feira de ${fe ? dataCurta(fe.data) : 'hoje'} guardada.` }
    if (opcao === 'sem_nota') { feiraSemNotaEx(ref, String(dados.texto)); aviso = `Anotei: ${String(dados.texto).trim()}, sem nota.` }
  }
  if (tipo === 'estoque') {
    if (opcao === 'contar') { const itens = (dados.itens || []) as { item_id: string; estado: EstadoItem }[]; if (!itens.length) throw new Error('Marque pelo menos 1 item.'); const nalista = estoqueContarEx(m, itens); aviso = nalista.length ? `${juntar(nalista)} ${nalista.length === 1 ? 'entrou' : 'entraram'} na lista de compras.` : 'Contagem guardada. Nada acabou.'; const ac = itens.filter(i => i.estado === 'acabou').length; extra = `: ${itens.length} itens, ${ac === 1 ? '1 acabou' : `${ac} acabaram`}` }
    if (opcao === 'pedir_equipe') { e.pedidoEquipe[ref] = true; adiado = amanha }
  }
  if (velha) extra += ` (corrigiu "${velha.resposta}")`
  const mensagem = opcao === 'copiar_mensagem' ? p.mensagem : undefined
  const idLinha = 'd' + ++e.n + Date.now()
  const resposta = (opcao === 'anexar_nota' ? 'Anexei a nota' : opcao === 'contar' ? 'Contei o estoque' : op.rotulo) + extra
  e.diario.push({ id: idLinha, ref: perguntaId, funcionario: p.funcionario, assunto: p.assunto || tipo, pergunta: p.pergunta, resposta, quando: agora.toISOString(), perguntado_em: emRecife(e.desde[perguntaId] || hoje, 6), adiado_ate: adiado, respondido_por: m.quem() })
  if (!aviso && opcao === 'foi_feita') aviso = 'Anotei a feira desta semana.'
  if (!aviso && !adiado && /^(veio|troquei|paguei|feito|ja_)/.test(opcao)) aviso = 'Anotado.'
  // quanto ainda falta depois desta resposta (a equipe vê "Falta 1 coisa")
  const faltam = todasAsPerguntas(m, agora).filter(x => x.id !== perguntaId && !calada(x.id, agora, x.valor)).length
  const fim = faltam === 0 ? ' Não falta mais nada por hoje.' : faltam === 1 ? ' Falta 1 coisa.' : ` Faltam ${faltam} coisas.`
  return { ...(mensagem ? { mensagem } : {}), diario_id: idLinha, ...(aviso ? { aviso: aviso + fim } : {}) }
}
const juntar = (l: string[]) => (l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}`)

function concluir(l: Lembrete, agora: Date) {
  if (l.repetir === 'nunca') { l.feito_em = agora.toISOString(); return }
  // lembrete que repete: pula pra próxima vez
  const d = new Date(l.quando)
  do {
    if (l.repetir === 'dia') d.setUTCDate(d.getUTCDate() + 1)
    else if (l.repetir === 'semana') d.setUTCDate(d.getUTCDate() + 7)
    else if (l.repetir === 'mes') d.setUTCMonth(d.getUTCMonth() + 1)
    else d.setUTCFullYear(d.getUTCFullYear() + 1)
  } while (d <= agora)
  l.quando = d.toISOString()
}

export function relatorioEx(m: Mundo, de: string, ate: string, agora = new Date()): RelatorioEsc {
  if (m.equipe()) return { funcionarios: [], diario: [] }
  const noPeriodo = e.diario.filter(d => { const dia = hojeRecife(new Date(d.quando)); return dia >= de && dia <= ate })
  const abertas = todasAsPerguntas(m, agora).filter(p => !calada(p.id, agora))
  const funcionarios = FUNC.map(f => {
    const meus = noPeriodo.filter(d => d.funcionario === f.id)
    const pend = abertas.filter(p => p.funcionario === f.id).length
    const min = meus.length ? meus.reduce((s, d) => s + Math.max(0, (new Date(d.quando).getTime() - new Date(d.perguntado_em).getTime()) / 60000), 0) / meus.length : null
    return { funcionario: f.id, perguntas: meus.length + pend, respondidas: meus.length, pendentes: pend, tempo_medio_min: min == null ? null : Math.round(min) }
  }).filter(f => f.perguntas > 0)
  return { funcionarios, diario: maisNovoPrimeiro(noPeriodo).map(limpa) }
}

/* ---------- Lembretes ---------- */
export function lembretesEx(): Lembrete[] { return e.lembretes.filter(l => !l.feito_em).sort((a, b) => a.quando.localeCompare(b.quando)).map(l => ({ ...l })) }
export function lembreteCriarEx(l: NovoLembrete) {
  if (!l.titulo.trim()) throw new Error('Escreva o que é pra lembrar.')
  if (!l.quando || isNaN(new Date(l.quando).getTime())) throw new Error('Escolha o dia e a hora.')
  e.lembretes.push({ id: 'lb' + Date.now(), titulo: l.titulo.trim().slice(0, 120), detalhe: l.detalhe?.trim() || null, quando: new Date(l.quando).toISOString(), repetir: l.repetir, para: l.para || 'eu', funcionario: 'secretaria', feito_em: null })
}
const achar = (id: string) => { const l = e.lembretes.find(x => x.id === id); if (!l) throw new Error('Esse lembrete não existe mais.'); return l }
export function lembreteConcluirEx(id: string) { concluir(achar(id), new Date()) }
export function lembreteAdiarEx(id: string, ate: string) { achar(id).quando = new Date(ate).toISOString() }
export function lembreteApagarEx(id: string) { achar(id); e.lembretes = e.lembretes.filter(x => x.id !== id) }

/* ---------- Analista de Cartão ---------- */
export function faturasBancoEx(): FaturaBanco[] { return e.fatBanco.map(f => ({ ...f })) }
function informarFatura(m: Mundo, cartao: string, mes: string, d: { valor_banco?: number | null; paga_em?: string | null }) {
  let f = e.fatBanco.find(x => x.cartao_id === cartao && x.mes === mes)
  if (!f) { f = { cartao_id: cartao, mes, valor_banco: null, paga_em: null, paga_por: null }; e.fatBanco.push(f) }
  if (d.valor_banco !== undefined) f.valor_banco = d.valor_banco == null ? null : centavos(d.valor_banco)
  if (d.paga_em !== undefined) { f.paga_em = d.paga_em; f.paga_por = d.paga_em ? m.quem() : null }
}
export function faturaInformarEx(m: Mundo, cartao: string, mes: string, d: { valor_banco?: number | null; paga_em?: string | null }) {
  if (d.valor_banco != null && !(d.valor_banco >= 0)) throw new Error('O valor da fatura tem que ser de zero pra cima.')
  informarFatura(m, cartao, mes, d)
}
export function cartaoSalvarEx(m: Mundo, c: Partial<Cartao> & { nome: string }) {
  if (!c.nome.trim()) throw new Error('Dê um apelido pro cartão.')
  const dia = (v: unknown) => v == null || (Number(v) >= 1 && Number(v) <= 31)
  if (!dia(c.dia_fechamento) || !dia(c.dia_vencimento)) throw new Error('O dia tem que ser de 1 a 31.')
  if (c.final4 && !/^\d{4}$/.test(c.final4)) throw new Error('Os 4 últimos números do cartão são só 4 algarismos.')
  // o cadastro grava na lista de todos os cartões (m.cartoes() é só o de quem olha)
  const lista = m.todosCartoes?.() || m.cartoes(), velho = c.id ? lista.find(x => x.id === c.id) : undefined
  if (velho) Object.assign(velho, c, { nome: c.nome.trim() })
  else lista.push({ id: 'car-' + Date.now(), dia_fechamento: null, dia_vencimento: null, ativo: true, ...c, nome: c.nome.trim() })
}

/* ---------- Fiscal da Feira ---------- */
export function feirasEx(m: Mundo): Feira[] {
  return [...e.feiras].sort((a, b) => b.data.localeCompare(a.data)).map(f => (m.equipe() ? { ...f, valor: undefined } : { ...f }))
}
export function feiraRegistrarEx(m: Mundo, f: { data: string; valor?: number; loja?: string }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.data)) throw new Error('Escolha o dia da feira.')
  const seg = segundaDaSemana(f.data)
  if (e.feiras.some(x => x.semana === seg)) throw new Error(`A feira da semana de ${dataCurta(seg)} já está registrada.`)
  const valor = centavos(Number(f.valor) || 0)
  if (!m.equipe() && !(valor > 0)) throw new Error('Digite quanto deu a feira.')
  // o casal dá o valor: entra como gasto no limite semanal da Feira. A equipe só registra que foi feita.
  const lanc = valor > 0 ? m.lancarFeira(f.data, valor, f.loja?.trim() || 'Feira da semana') : null
  e.feiras.push({ id: 'fe' + Date.now(), semana: seg, data: f.data, valor, loja: f.loja?.trim() || null, tem_nota: false, sem_nota_motivo: null, feita_por: m.quem(), ...(lanc ? {} : {}) })
}
const acharFeira = (id: string) => { const f = e.feiras.find(x => x.id === id); if (!f) throw new Error('Essa feira não está mais registrada.'); return f }
export function feiraAnexarEx(id: string) { const f = acharFeira(id); f.tem_nota = true; f.sem_nota_motivo = null; return `fam-silva/${id}.jpg` }
export function feiraSemNotaEx(id: string, motivo: string) { if (!motivo.trim()) throw new Error('Escreva por que não teve nota (feira livre, açougue).'); acharFeira(id).sem_nota_motivo = motivo.trim().slice(0, 80) }
export function estoqueEx(): Estoque { return { itens: e.itens.map(i => ({ ...i })), contagens: [...e.contagens].sort((a, b) => b.data.localeCompare(a.data)).map(c => ({ ...c, itens: c.itens.map(i => ({ ...i })) })) } }
export function estoqueContarEx(m: Mundo, itens: { item_id: string; estado: EstadoItem }[]): string[] {
  const hoje = hojeRecife(), seg = segundaDaSemana(hoje)
  e.contagens = e.contagens.filter(c => c.semana !== seg)
  e.contagens.push({ id: 'ct' + Date.now(), semana: seg, data: hoje, contado_por: m.quem(), itens: itens.map(i => ({ ...i })) })
  // rodada 2 (EQUIPE ideia 2): o que acabou ou está pouco entra na lista de compras na hora
  const cfg = m.config()
  const lista: { id: string; nome: string; ok: boolean }[] = cfg.casa_lista || (cfg.casa_lista = [])
  const entrou: string[] = []
  for (const i of itens.filter(x => x.estado !== 'tem')) {
    const nome = e.itens.find(x => x.id === i.item_id)?.nome
    if (!nome) continue
    const ja = lista.find(x => x.nome.toLowerCase() === nome.toLowerCase())
    if (ja && !ja.ok) continue
    if (ja) ja.ok = false
    else lista.push({ id: 'i' + Date.now() + entrou.length, nome, ok: false })
    entrou.push(nome)
  }
  return entrou
}
export function estoqueItemSalvarEx(item: { id?: string; nome: string; categoria: string; ativo?: boolean }) {
  if (!item.nome.trim()) throw new Error('Escreva o nome do item.')
  const v = item.id ? e.itens.find(i => i.id === item.id) : undefined
  if (v) Object.assign(v, { nome: item.nome.trim(), categoria: item.categoria.trim() || 'Despensa', ativo: item.ativo !== false })
  else e.itens.push({ id: 'it' + Date.now(), nome: item.nome.trim(), categoria: item.categoria.trim() || 'Despensa', ativo: true })
}
