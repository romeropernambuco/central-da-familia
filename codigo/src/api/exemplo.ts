// Banco de exemplo em memória: Família Silva. Imita as funções do CONTRATO.md
// pra o app rodar sem rede (?exemplo=1 ou VITE_MODO=exemplo). Nada sai do aparelho.
import type { Api, AvisoCasa, Cartao, CasaDaEquipe, ChaveConfig, Envelope, Fatura, Lancamento, NovoLancamento, ResumoHoje, Sessao } from './tipos'
import * as ex2 from './exemplo2'
import { centavos, dataCurta, previsaoGas, diasNoMes, diasRestantes, fimDoMes, hojeRecife, mesDaFatura, segundaDaSemana, somaDias } from '../lib/formato'

interface EnvBase { id: string; nome: string; regra: Envelope['regra']; limite_mes: number; colchao: number; casa: boolean }

const FAM = 'fam-silva'
/** Convite de exemplo da equipe: o link do exemplo é #/equipe?c=<este id> e o código é 2468. */
export const CONVITE_EXEMPLO = '00000000-0000-4000-8000-000000002468'
const espera = (ms = 60) => new Promise(r => setTimeout(r, ms))

function criarDados() {
  const hoje = hojeRecife()
  const [a, m, d] = hoje.split('-').map(Number)
  const ini = `${a}-${String(m).padStart(2, '0')}-01`
  const envs: EnvBase[] = [
    { id: 'env-ana', nome: 'Ana', regra: 'diario', limite_mes: 3000, colchao: 0, casa: false },
    { id: 'env-bruno', nome: 'Bruno', regra: 'mensal', limite_mes: 2500, colchao: 0, casa: false },
    { id: 'env-feira', nome: 'Feira semanal', regra: 'semanal', limite_mes: 2000, colchao: 0, casa: true },
    { id: 'env-casa', nome: 'Casa mensal', regra: 'mensal', limite_mes: 1500, colchao: 1000, casa: true },
  ]
  const cartoes: Cartao[] = [
    { id: 'car-nu', nome: 'Nubank', dia_fechamento: 3, dia_vencimento: 10, banco: 'Nubank', titular: 'Ana', titular_id: 'm-ana', limite: 8000, taxa_valor: 480, taxa_periodo: 'ano', taxa_mes: (m % 12) + 1, taxa_isenta_acima: null, final4: '4321', ativo: true },
    { id: 'car-itau', nome: 'Itaú', dia_fechamento: 25, dia_vencimento: 5, banco: 'Itaú', titular: 'Bruno', titular_id: 'm-bruno', limite: 5000, taxa_valor: 0, taxa_periodo: 'mes', taxa_mes: null, taxa_isenta_acima: null, final4: null, ativo: true },
  ]
  const lanc: Lancamento[] = []
  let n = 0
  const add = (env: string, valor: number, data: string, descricao: string, cartao: string | null = null) =>
    lanc.push({ id: 'l' + ++n, envelope_id: env, cartao_id: cartao, valor, data, descricao, apagado_em: null, criado_em: data + 'T12:00:00-03:00' })
  // mês passado, no cartão (entra nas faturas de agora)
  const passado = somaDias(ini, -10)
  add('env-bruno', 620, passado, 'Pneu do carro', 'car-itau')
  add('env-ana', 380, somaDias(ini, -5), 'Farmácia', 'car-nu')
  const ana = [72, 0, 95, 64, 0, 110, 58, 88, 0, 76, 103, 66, 0, 90, 70, 84, 61, 0, 99, 73, 80, 65, 0, 92, 68, 77, 0, 85, 60, 71, 0]
  const anaDesc = ['Padaria', 'Uber', 'Almoço', 'Farmácia', 'Lanche das crianças', 'Salão']
  for (let i = 1; i < d; i++) {
    const dia = `${a}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    if (ana[i - 1]) add('env-ana', ana[i - 1], dia, anaDesc[i % anaDesc.length], i % 4 === 0 ? 'car-nu' : null)
    if (i % 3 === 1) add('env-bruno', [150, 89, 210, 64][i % 4], dia, ['Combustível', 'Barbeiro', 'Restaurante', 'Livro'][i % 4], i % 2 ? 'car-itau' : null)
    const dow = new Date(Date.UTC(a, m - 1, i)).getUTCDay()
    if (dow === 1 || dow === 4) add('env-feira', dow === 1 ? 312.4 : 186.9, dia, dow === 1 ? 'Feira da semana' : 'Hortifruti')
  }
  if (d > 5) add('env-casa', 286.5, `${a}-${String(m).padStart(2, '0')}-05`, 'Conta de luz')
  if (d > 8) add('env-casa', 118.2, `${a}-${String(m).padStart(2, '0')}-08`, 'Conta de água')
  if (d > 2) add('env-casa', 120, `${a}-${String(m).padStart(2, '0')}-02`, 'Gás de cozinha')
  // hoje: 1 gasto da Ana
  add('env-ana', 34.5, hoje, 'Café')
  // 1 apagado na lixeira
  add('env-bruno', 45, somaDias(hoje, -1 < d ? 0 : 0), 'Lançado em dobro')
  lanc[lanc.length - 1].apagado_em = new Date().toISOString()

  const config: Record<string, unknown> = {
    casa_prestadores: [
      { id: 'p1', nome: 'Seu Zé', servico: 'Jardineiro', dia: 6, valor: 150, ultimaVez: somaDias(hoje, -12) },
      { id: 'p2', nome: 'Marcos', servico: 'Piscineiro', dia: new Date(hoje + 'T12:00:00Z').getUTCDay(), valor: 120, ultimaVez: somaDias(hoje, -6) },
    ],
    casa_gas: { trocas: [somaDias(hoje, -64), somaDias(hoje, -33), somaDias(hoje, -2)] },
    casa_folha: {
      pessoas: [{ id: 'f1', nome: 'Carla', funcao: 'Cozinheira', salario: 1800 }],
      daePaga: {},
    },
    casa_lista: [
      { id: 'i1', nome: 'Arroz 5 kg', ok: false }, { id: 'i2', nome: 'Feijão', ok: true }, { id: 'i3', nome: 'Ovos (2 dúzias)', ok: false },
      { id: 'i4', nome: 'Banana', ok: false }, { id: 'i5', nome: 'Detergente', ok: true },
    ],
    casa_presenca: { [hoje]: ['Carla'] },
    rendas: [{ id: 'r1', nome: 'Salário Ana', valor: 6500 }, { id: 'r2', nome: 'Salário Bruno', valor: 5200 }],
    metas: [{ id: 'm1', nome: 'Viagem de julho', valor: 6000, guardado: 1800 }, { id: 'm2', nome: 'Material escolar', valor: 1200, guardado: 900 }],
  }
  return { envs, cartoes, lanc, config, hoje }
}

let db = criarDados()
let logado: 'ana' | 'carla' | null = 'ana'
let familiaNova: { id: string; nome: string; pessoa: string } | null = null
const tempos: number[] = [6.8, 8.1, 5.9, 9.4, 7.2]
const avisos: { tipo: AvisoCasa; data: string; nome: string }[] = []

function vivos() { return db.lanc.filter(l => !l.apagado_em) }

export function calcularResumo(): ResumoHoje {
  const hoje = hojeRecife()
  const mes = hoje.slice(0, 7)
  const seg = segundaDaSemana(hoje)
  const dr = diasRestantes(hoje)
  const dm = diasNoMes(hoje)
  const doMes = vivos().filter(l => l.data.startsWith(mes))
  const envelopes: Envelope[] = db.envs.map(e => {
    const meus = doMes.filter(l => l.envelope_id === e.id)
    const gasto = centavos(meus.reduce((s, l) => s + l.valor, 0))
    const env: Envelope = { id: e.id, nome: e.nome, regra: e.regra, limite_mes: e.limite_mes, gasto_mes: gasto, livre: centavos(e.limite_mes - gasto), casa: e.casa }
    if (e.regra === 'diario') {
      const antes = meus.filter(l => l.data < hoje).reduce((s, l) => s + l.valor, 0)
      const hojeG = meus.filter(l => l.data === hoje).reduce((s, l) => s + l.valor, 0)
      env.valor_dia = Math.max(0, Math.floor((e.limite_mes - antes) / dr - hojeG))
    }
    if (e.regra === 'semanal') {
      env.teto_semana = Math.round((e.limite_mes * 7) / dm)
      env.gasto_semana = centavos(meus.filter(l => l.data >= seg).reduce((s, l) => s + l.valor, 0))
    }
    return env
  })
  const limite = envelopes.reduce((s, e) => s + e.limite_mes, 0)
  const gasto = centavos(envelopes.reduce((s, e) => s + e.gasto_mes, 0))
  const colchao = db.envs.reduce((s, e) => s + e.colchao, 0)
  const livre = centavos(limite - gasto)
  const sobra = Math.max(0, livre - colchao)
  const pode = Math.floor(sobra / dr)
  return {
    pode_gastar_hoje: pode,
    livre_mes: livre,
    colchao,
    dias_restantes: dr,
    envelopes,
    explicacao: [
      { linha: 'Combinado pro mês, somando todos os limites', valor: limite },
      { linha: 'Já gasto neste mês', valor: -gasto },
      { linha: 'Reserva (o dinheiro que vocês combinaram nunca gastar), que não entra', valor: -colchao },
      { linha: `Sobra até ${dataCurta(fimDoMes(hoje))}`, valor: centavos(sobra) },
      { linha: `Dividido por ${dr} dias que faltam, contando hoje`, valor: pode },
    ],
  }
}

function faturasCalc(meses: number): Fatura[] {
  const hoje = hojeRecife()
  const [a, m] = hoje.split('-').map(Number)
  const out: Fatura[] = []
  for (const c of db.cartoes) {
    const fe = c.dia_fechamento || 1, ve = c.dia_vencimento || 10
    const porMes: Record<string, number> = {}
    for (const l of vivos().filter(l => l.cartao_id === c.id)) {
      const [la, lm, ld] = l.data.split('-').map(Number)
      let mm = mesDaFatura(lm, ld, fe, ve), aa = la
      while (mm > 12) { mm -= 12; aa++ }
      const k = `${aa}-${String(mm).padStart(2, '0')}`
      porMes[k] = centavos((porMes[k] || 0) + l.valor)
    }
    for (let i = 0; i < meses; i++) {
      let mm = m + i, aa = a
      while (mm > 12) { mm -= 12; aa++ }
      const k = `${aa}-${String(mm).padStart(2, '0')}`
      const venc = `${k}-${String(Math.min(ve, 28)).padStart(2, '0')}`
      const fechaMes = ve <= fe ? somaDias(`${k}-01`, -1).slice(0, 7) : k
      const fecha = `${fechaMes}-${String(Math.min(fe, 28)).padStart(2, '0')}`
      out.push({ cartao_id: c.id, cartao: c.nome, mes: k, vencimento: venc, total: porMes[k] || 0, fechada: hoje >= fecha })
    }
  }
  return out
}

const DIAS_SEM = 7
/** Imita produto.casa_da_equipe: copia só os campos sem dinheiro (sem valor, salário ou preço). */
function casaSemDinheiro(): CasaDaEquipe {
  const hoje = hojeRecife()
  const cfg = db.config as Record<string, any>
  const casaIds = new Set(db.envs.filter(e => e.casa).map(e => e.id))
  const dow = new Date(hoje + 'T12:00:00').getDay()
  const g = previsaoGas(cfg.casa_gas?.trocas || [])
  const eu = logado === 'carla' ? 'Carla' : 'Ana'
  return {
    hoje, eu,
    lista: (cfg.casa_lista || []).map((i: any) => ({ id: i.id, nome: i.nome, ok: !!i.ok })),
    comprado: vivos().filter(l => casaIds.has(l.envelope_id) && l.data <= hoje && l.data > somaDias(hoje, -DIAS_SEM))
      .sort((a, b) => (b.data + b.criado_em).localeCompare(a.data + a.criado_em)).map(l => ({ data: l.data, nome: l.descricao || 'Compra sem nome' })),
    prestadores: (cfg.casa_prestadores || []).map((p: any) => ({ id: p.id, nome: p.nome, servico: p.servico, dia: p.dia, proxima_visita: somaDias(hoje, (p.dia - dow + 7) % 7), ultima_vez: p.ultimaVez || null })),
    gas: { trocas: [...(cfg.casa_gas?.trocas || [])].sort(), media_dias: g.media, proxima_troca: g.acaba, avisar_em: g.avisar },
    presenca: { hoje: cfg.casa_presenca?.[hoje] || [], meu_ponto: cfg.casa_ponto?.[hoje]?.[eu] || {} },
  }
}

const porChave = new Map<string, Lancamento>()
/** Igual ao banco: pra equipe o resumo vem só com nomes (so_nomes) e o lançamento volta sem valor. */
export function resumoDaEquipe(): ResumoHoje {
  return { pode_gastar_hoje: 0, livre_mes: 0, colchao: 0, dias_restantes: diasRestantes(hojeRecife()), explicacao: [], so_nomes: true,
    envelopes: db.envs.filter(e => e.casa).map(e => ({ id: e.id, nome: e.nome, regra: e.regra, casa: true, limite_mes: 0, gasto_mes: 0, livre: 0 })) }
}
const resumoDeQuemEsta = () => (logado === 'carla' ? resumoDaEquipe() : calcularResumo())
const semValorPraEquipe = (l: Lancamento): Lancamento => (logado === 'carla' ? { ...l, valor: 0, cartao_id: null } : l)

/** O que o Escritório e o Guardado de exemplo leem da Família Silva. */
const mundo: ex2.Mundo = {
  equipe: () => logado === 'carla',
  quem: () => (logado === 'carla' ? 'Carla' : (familiaNova?.pessoa || 'Ana').split(' ')[0]),
  resumo: () => calcularResumo(),
  faturas: () => faturasCalc(3),
  cartoes: () => db.cartoes,
  config: () => db.config as Record<string, any>,
  ultimoGasto: () => vivos().map(l => l.data).filter(d => d <= hojeRecife()).sort().pop() || null,
  // exemplo: no mês passado sobraram 4% do combinado
  sobraMesPassado: () => centavos(db.envs.reduce((t, x) => t + x.limite_mes, 0) * 0.04),
  lancarFeira: (data, valor, loja) => { const l: Lancamento = { id: 'l' + Date.now(), envelope_id: 'env-feira', cartao_id: null, valor: centavos(valor), data, descricao: loja, apagado_em: null, criado_em: new Date().toISOString() }; db.lanc.push(l); return l.id },
}
const MEMBROS_EXEMPLO = [{ id: 'm-ana', nome: 'Ana' }, { id: 'm-bruno', nome: 'Bruno' }]
const soCasal = () => { if (logado === 'carla') throw new Error('Só o casal vê o dinheiro guardado.') }

export const apiExemplo: Api = {
  modo: 'exemplo',
  async sessao(): Promise<Sessao | null> {
    await espera(30)
    if (!logado) return null
    if (logado === 'carla') return { userId: 'u-carla', email: null, dono: false, familias: [{ id: FAM, nome: 'Família Silva', papel: 'equipe', membroNome: 'Carla', envelopeId: 'env-feira' }] }
    const fams = [{ id: FAM, nome: 'Família Silva', papel: 'casal' as const, membroNome: 'Ana', envelopeId: 'env-ana' }]
    if (familiaNova) fams.unshift({ id: FAM, nome: familiaNova.nome, papel: 'casal', membroNome: familiaNova.pessoa, envelopeId: 'env-ana' })
    return { userId: 'u-ana', email: 'ana@exemplo.com', dono: true, familias: fams }
  },
  async enviarCodigo(email) { await espera(); if (!email.includes('@')) throw new Error('E-mail inválido') },
  async confirmarCodigo(_email, codigo) { await espera(); if (codigo !== '123456') throw new Error('Código não confere. No exemplo, use 123456.'); logado = 'ana' },
  async entrarEquipe(convite, codigo) { await espera(); if (convite !== CONVITE_EXEMPLO) throw new Error('Esse link não é o do exemplo. Peça o link pra quem cuida da família.'); if (codigo !== '2468') throw new Error('Código não confere. No exemplo, use 2468.'); logado = 'carla' },
  async sair() { logado = null; familiaNova = null },

  async criarFamilia(nome, nomePessoa) {
    await espera()
    familiaNova = { id: FAM, nome, pessoa: nomePessoa }
    db.envs[0].nome = nomePessoa
    return FAM
  },
  async salvarEnvelope(_f, id, campos) {
    const e = db.envs.find(x => x.id === id)
    if (!e) throw new Error('Envelope não encontrado')
    Object.assign(e, campos)
  },
  async definirLimite(_f, id, valor) {
    const e = db.envs.find(x => x.id === id)
    if (!e) throw new Error('Esse limite não existe mais. Feche e abra a tela de novo.')
    if (!(valor >= 0)) throw new Error('O limite tem que ser um valor de zero pra cima.')
    e.limite_mes = centavos(valor)
  },
  async convidar(_f, papel) {
    await espera()
    if (papel === 'equipe') return { convite: CONVITE_EXEMPLO, codigo_4_digitos: '2468', expira_em: new Date(Date.now() + 864e5).toISOString() }
    return { ok: true, convite: 'email' }
  },

  async resumoHoje() { await espera(40); return resumoDeQuemEsta() },
  async lancar(nv: NovoLancamento) {
    await espera(80)
    // igual ao banco: a mesma chave do toque nunca grava 2 vezes
    const ja = porChave.get(nv.chave)
    if (ja) return { lancamento: semValorPraEquipe(ja), resumo: resumoDeQuemEsta(), repetido: true }
    const l: Lancamento = { id: 'l' + Date.now(), envelope_id: nv.envelope, cartao_id: nv.cartao || null, valor: centavos(nv.valor), data: nv.data, descricao: nv.descricao, apagado_em: null, criado_em: new Date().toISOString() }
    db.lanc.push(l)
    porChave.set(nv.chave, l)
    if (nv.segundos != null) tempos.push(nv.segundos)
    return { lancamento: semValorPraEquipe(l), resumo: resumoDeQuemEsta() }
  },
  async lancamentos(_f, mes) { await espera(40); return db.lanc.filter(l => l.data.startsWith(mes)).sort((x, y) => (y.data + y.criado_em).localeCompare(x.data + x.criado_em)) },
  async apagarLancamento(id) { const l = db.lanc.find(x => x.id === id); if (l) l.apagado_em = new Date().toISOString() },
  async restaurarLancamento(id) { const l = db.lanc.find(x => x.id === id); if (l) l.apagado_em = null },

  async cartoes() { await espera(30); return db.cartoes.filter(c => c.ativo !== false) },
  async criarCartao(_f, c) { db.cartoes.push({ id: 'car-' + Date.now(), ...c }) },
  async faturas(_f, meses) { await espera(40); return faturasCalc(meses) },

  async config<T>(_f: string, chave: ChaveConfig, padrao: T): Promise<T> { return (chave in db.config ? db.config[chave] : padrao) as T },
  async salvarConfig(_f, chave, valor) { db.config[chave] = JSON.parse(JSON.stringify(valor)) },

  async casaDaEquipe() { await espera(30); return casaSemDinheiro() },
  async casaMarcar(_f, tipo, dados = {}) {
    await espera(40)
    const hoje = hojeRecife()
    const eu = logado === 'carla' ? 'Carla' : 'Ana'
    const cfg = db.config as Record<string, any>
    if (tipo === 'comprei' || tipo === 'acabou') {
      const lista: { id: string; nome: string; ok: boolean }[] = cfg.casa_lista || []
      const nome = (dados.nome || '').trim()
      const i = lista.find(x => x.id === dados.id || (!dados.id && x.nome.toLowerCase() === nome.toLowerCase()))
      if (i) i.ok = tipo === 'comprei'
      else if (tipo === 'acabou' && nome) lista.push({ id: 'i' + Date.now(), nome, ok: false })
      else throw new Error('Esse item não está mais na lista.')
      cfg.casa_lista = lista
    } else if (tipo === 'prestador_veio') {
      const p = (cfg.casa_prestadores || []).find((x: any) => x.id === dados.id)
      if (!p) throw new Error('Esse serviço não está mais cadastrado.')
      p.ultimaVez = hoje
    } else if (tipo === 'troquei_gas') {
      const g = cfg.casa_gas || { trocas: [] }
      if (!g.trocas.includes(hoje)) g.trocas.push(hoje)
      cfg.casa_gas = g
      avisos.push({ tipo: 'casa_gas', data: hoje, nome: eu })
    } else {
      const pres = cfg.casa_presenca || {}
      if (!(pres[hoje] || []).includes(eu)) pres[hoje] = [...(pres[hoje] || []), eu]
      cfg.casa_presenca = pres
      const ponto = cfg.casa_ponto || {}
      const hora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit' })
      ponto[hoje] = { ...(ponto[hoje] || {}), [eu]: { ...(ponto[hoje]?.[eu] || {}), [tipo === 'cheguei' ? 'chegou' : 'saiu']: hora } }
      cfg.casa_ponto = ponto
      avisos.push({ tipo: 'casa_presenca', data: hoje, nome: eu })
    }
    return casaSemDinheiro()
  },
  async avisosCasa() { return [...avisos] },
  async lerCupom() {
    await espera(300)
    // resultado fixo de exemplo: nenhuma foto sai do aparelho
    if (logado === 'carla') throw new Error('A leitura de cupom é só pro casal e pras pessoas da família. A equipe anota a compra digitando o valor.')
    return { itens: [{ nome: 'Arroz 5 kg', valor: 28.9, qtd: 1 }, { nome: 'Feijão 1 kg', valor: 8.49, qtd: 1 }, { nome: 'Banana prata', valor: 7.98, qtd: 1.2 }, { nome: 'Detergente', valor: 2.79, qtd: 1 }], total: 48.16, soma_dos_itens: 48.16, total_confere: true, data: hojeRecife(), loja: 'Mercadinho', aviso: 'Confira antes de salvar. Nada foi lançado.' }
  },

  async guardadoHoje() { await espera(30); soCasal(); return ex2.guardadoHojeEx() },
  async guardadoCriar(_f, a) { await espera(60); soCasal(); ex2.guardadoCriarEx(a) },
  async guardadoMovimentar(aplicacao, tipo, valor, data, chave) { await espera(60); soCasal(); ex2.guardadoMovimentarEx(aplicacao, tipo, valor, data, chave) },
  async guardadoEncerrar(aplicacao) { await espera(40); soCasal(); ex2.guardadoEncerrarEx(aplicacao) },
  async guardadoCustoDoGasto(_f, valor) { await espera(20); soCasal(); return ex2.custoDoGastoEx(valor) },

  async escritorioHoje() { await espera(30); return ex2.escritorioHojeEx(mundo) },
  async escritorioResponder(_f, pergunta, opcao, dados) { await espera(60); return ex2.escritorioResponderEx(mundo, pergunta, opcao, dados) },
  async escritorioRelatorio(_f, de, ate) { await espera(30); return ex2.relatorioEx(mundo, de, ate) },
  async escritorioDiario(_f, funcionario, limite, antes) { await espera(20); return ex2.diarioEx(mundo, funcionario, limite, antes) },
  async membros() { await espera(20); return MEMBROS_EXEMPLO },
  async cartaoSalvar(_f, c) { await espera(40); soCasal(); ex2.cartaoSalvarEx(mundo, { ...c, titular: MEMBROS_EXEMPLO.find(m => m.id === c.titular_id)?.nome || null }) },
  async faturasBanco() { await espera(20); soCasal(); return ex2.faturasBancoEx() },
  async faturaInformar(_f, cartao, mes, d) { await espera(40); soCasal(); ex2.faturaInformarEx(mundo, cartao, mes, d) },
  async feiras() { await espera(20); return ex2.feirasEx(mundo) },
  async feiraRegistrar(_f, f) { await espera(40); ex2.feiraRegistrarEx(mundo, f) },
  async notaSubir(_f, feira) { await espera(80); return `fam-silva/${feira}.jpg` },
  async feiraAnexarNota(_f, feira) { await espera(80); return ex2.feiraAnexarEx(feira) },
  async feiraSemNota(_f, feira, motivo) { await espera(40); ex2.feiraSemNotaEx(feira, motivo) },
  async estoque() { await espera(20); return ex2.estoqueEx() },
  async estoqueContar(_f, itens) { await espera(40); ex2.estoqueContarEx(mundo, itens) },
  async estoqueItemSalvar(_f, item) { await espera(40); soCasal(); ex2.estoqueItemSalvarEx(item) },
  async lembretes() { await espera(20); soCasal(); return ex2.lembretesEx() },
  async lembreteCriar(_f, l) { await espera(40); soCasal(); ex2.lembreteCriarEx(l) },
  async lembreteConcluir(_f, id) { await espera(40); soCasal(); ex2.lembreteConcluirEx(id) },
  async lembreteAdiar(_f, id, ate) { await espera(40); soCasal(); ex2.lembreteAdiarEx(id, ate) },
  async lembreteApagar(_f, id) { await espera(40); soCasal(); ex2.lembreteApagarEx(id) },

  async numerosSemana() {
    await espera(40)
    const media = tempos.reduce((s, t) => s + t, 0) / tempos.length
    return [
      { chave: 'ativacao', nome: 'Ativação', valor: 80, texto: '4 de 5', meta: 'meta 80%', ok: true, explicacao: 'Famílias que lançaram 10 gastos na 1ª semana: 4 das 5 que entraram nas últimas 4 semanas.' },
      { chave: 'retencao', nome: 'Retenção no dia 30', valor: 60, texto: '3 de 5', meta: 'meta 60%', ok: true, explicacao: 'Famílias que ainda abriram o app no 30º dia depois de entrar: 3 de 5.' },
      { chave: 'tempo', nome: 'Tempo por lançamento', valor: Math.round(media * 10) / 10, texto: String(Math.round(media * 10) / 10).replace('.', ',') + ' s', meta: 'meta abaixo de 10 s', ok: media < 10, explicacao: `Média dos últimos ${tempos.length} lançamentos, do toque no botão verde até o salvo.` },
      { chave: 'erros', nome: 'Erros de conta', valor: 0, texto: '0', meta: 'meta 0', ok: true, explicacao: 'Testes da noite que falharam: a soma bate, nenhum mês abaixo da reserva, nenhum lançamento repetido.' },
    ]
  },
  async exportarFamilia() {
    return { familia: 'Família Silva', exportado_em: new Date().toISOString(), envelopes: db.envs, cartoes: db.cartoes, lancamentos: db.lanc, config: db.config }
  },
  async apagarFamilia(_f, confirmacao) {
    await espera()
    if (confirmacao.trim() !== 'Família Silva') throw new Error('Digite o nome da família igualzinho: Família Silva')
    db = criarDados(); ex2.reiniciarExemplo2()
    logado = null
  },
}

export function reiniciarExemplo() { ex2.reiniciarExemplo2(); db = criarDados(); logado = 'ana'; familiaNova = null; porChave.clear() }
/** Só pros testes: entra como a equipe (Carla) sem passar pela tela. */
export function exemploComoEquipe() { logado = 'carla' }
