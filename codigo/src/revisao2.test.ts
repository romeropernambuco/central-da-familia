// Rodada 2 da revisão: 1 teste (ou mais) pra cada item ligado nesta rodada.
import { beforeEach, describe, expect, it } from 'vitest'
// @ts-ignore: o projeto não tem os tipos do Node; o Vitest roda em Node
import { execSync } from 'node:child_process'
// @ts-ignore
import { existsSync, readFileSync, statSync } from 'node:fs'
import { lancarComChave, normalizaCupom, normalizaLancamento, normalizaResumo, type RpcCru } from './api/normaliza'
import { AVISOS_CONVITE, TRADUZ, funcaoNaoExiste, traduzErro } from './api/erros'
import { CONVITE_EXEMPLO, apiExemplo, exemploComoEquipe, reiniciarExemplo } from './api/exemplo'
import { conviteDoHash, ehLinkEquipe, rotaDoHash, rotaPermitida } from './app/rotas'
import { criarChaveToque, criarGuardaConfig, novoUuid, resumoSemDinheiro } from './lib/seguro'
import { canon, igual, mesclar3 } from './lib/mescla'
import { agruparFaturas, hojeRecife, linkEquipe, linkWhatsApp, mensagemConvite, mesAnterior, milhar, textoParaValor, valorDigitadoValido } from './lib/formato'
import { MSG_CUPOM, mensagemCupom } from './lib/foto'
import realTs from './api/real.ts?raw'
const css: string = readFileSync('src/estilo.css', 'utf8')

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const novo = (chave: string, extra = {}) => ({ familia: 'f', envelope: 'env-ana', valor: 10, data: hojeRecife(), descricao: 'Pão', chave, ...extra })

describe('1. lançar com a chave do toque', () => {
  it('chama lancar_com_chave com 1 uuid e todos os parâmetros do banco', async () => {
    const chamadas: [string, Record<string, unknown>][] = []
    const rpc: RpcCru = async (n, a) => { chamadas.push([n, a]); return { data: { lancamento: { id: 'x' } }, error: null } }
    const chave = novoUuid()
    await lancarComChave(rpc, { familia: 'f', envelope: 'e', valor: 12.5, data: '2026-11-11', descricao: '', cartao: null, segundos: 3.2, chave })
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0][0]).toBe('lancar_com_chave')
    expect(chamadas[0][1]).toEqual({ familia: 'f', envelope: 'e', valor: 12.5, chave, data: '2026-11-11', descricao: null, cartao: null, segundos: 3.2 })
    expect(chave).toMatch(UUID)
  })
  it('se o banco não tem lancar_com_chave, cai pro lancar COM a mesma chave (nunca sem chave)', async () => {
    const chamadas: [string, Record<string, unknown>][] = []
    const rpc: RpcCru = async (n, a) => { chamadas.push([n, a]); return n === 'lancar_com_chave' ? { data: null, error: { code: 'PGRST202', message: 'Could not find the function produto.lancar_com_chave(...) in the schema cache' } } : { data: { ok: 1 }, error: null } }
    const r = await lancarComChave(rpc, novo('k1'))
    expect(chamadas.map(c => c[0])).toEqual(['lancar_com_chave', 'lancar'])
    expect(chamadas[1][1].chave).toBe('k1')
    expect(r.error).toBeNull()
  })
  it('erro que não é "função não existe" (valor zero, sem permissão) não tenta de novo', async () => {
    let n = 0
    const rpc: RpcCru = async () => { n++; return { data: null, error: { code: '22023', message: 'o valor tem que ser maior que zero' } } }
    const r = await lancarComChave(rpc, novo('k2'))
    expect(n).toBe(1)
    expect(traduzErro(r.error).message).toBe('O valor tem que ser maior que zero.')
    expect(funcaoNaoExiste({ code: '42883', message: 'function produto.x does not exist' })).toBe(true)
    expect(funcaoNaoExiste({ message: 'permission denied' })).toBe(false)
  })
  it('a mesma tentativa repete a chave; mudou o lançamento, a chave é outra; depois de gravar, chave nova', () => {
    let i = 0
    const t = criarChaveToque(() => 'chave-' + ++i)
    expect(t.para('ana|10|hoje')).toBe('chave-1')
    expect(t.para('ana|10|hoje')).toBe('chave-1') // tocou de novo depois do erro: mesma chave
    expect(t.para('ana|12|hoje')).toBe('chave-2') // corrigiu o valor: é outro lançamento
    t.gravou()
    expect(t.para('ana|12|hoje')).toBe('chave-3')
  })
  it('no banco de exemplo, a mesma chave grava 1 vez só, mesmo muito depois', async () => {
    reiniciarExemplo()
    const mes = hojeRecife().slice(0, 7)
    const antes = (await apiExemplo.lancamentos('f', mes)).length
    const a = await apiExemplo.lancar(novo('mesma'))
    const b = await apiExemplo.lancar(novo('mesma'))
    expect(b.lancamento.id).toBe(a.lancamento.id)
    expect(b.repetido).toBe(true)
    expect((await apiExemplo.lancamentos('f', mes)).length).toBe(antes + 1)
  })
})

describe('1. equipe entra pelo link do convite + código', () => {
  beforeEach(() => reiniciarExemplo())
  it('lê o convite do link e recusa link cortado ou mexido', () => {
    const id = '3f2b8c1e-9a4d-4e7f-8b21-0c5d6e7f8a9b'
    expect(conviteDoHash('#/equipe?c=' + id)).toBe(id)
    expect(conviteDoHash('#/equipe?c=' + id.toUpperCase())).toBe(id)
    expect(conviteDoHash('#/equipe')).toBeNull()
    expect(conviteDoHash('#/equipe?c=1234')).toBeNull()
    expect(conviteDoHash('#/equipe?c=' + id + "';drop")).toBeNull()
    expect(conviteDoHash('#/inicio?c=' + id)).toBeNull()
    expect(ehLinkEquipe('#/equipe')).toBe(true)
    expect(ehLinkEquipe('#/equipes')).toBe(false)
  })
  it('o link gerado volta o mesmo convite e não leva o código', () => {
    const id = '3f2b8c1e-9a4d-4e7f-8b21-0c5d6e7f8a9b'
    const link = linkEquipe('https://romeropernambuco.github.io/central-da-familia/app/', id)
    expect(link).toBe('https://romeropernambuco.github.io/central-da-familia/app/#/equipe?c=' + id)
    expect(conviteDoHash(new URL(link).hash)).toBe(id)
    expect(linkEquipe('https://x/app/#/casa', id)).toBe('https://x/app/#/equipe?c=' + id)
    expect(link).not.toContain('2468')
  })
  it('mensagem pro WhatsApp leva link + código, sem R$', () => {
    const link = linkEquipe('https://x/app/', CONVITE_EXEMPLO)
    const m = mensagemConvite('equipe', { familia: 'Silva', quem: 'Carla', link, codigo: '2468' })
    expect(m).toContain(link); expect(m).toContain('2468'); expect(m).not.toContain('R$'); expect(m).not.toMatch(/[—–]/)
    expect(decodeURIComponent(linkWhatsApp(m).split('text=')[1])).toBe(m)
  })
  it('convidar devolve convite + código; sem o convite certo o código sozinho não entra', async () => {
    const c = await apiExemplo.convidar('f', 'equipe', 'Carla')
    expect(c.convite).toBe(CONVITE_EXEMPLO); expect(c.codigo_4_digitos).toBe('2468')
    await expect(apiExemplo.entrarEquipe('11111111-1111-4111-8111-111111111111', '2468')).rejects.toThrow(/link/)
    await expect(apiExemplo.entrarEquipe(CONVITE_EXEMPLO, '0000')).rejects.toThrow(/Código/)
    await apiExemplo.entrarEquipe(CONVITE_EXEMPLO, '2468')
    expect((await apiExemplo.sessao())?.familias[0].papel).toBe('equipe')
  })
  it('o app real chama entrar_equipe_convite e não a entrada antiga só com 4 números', () => {
    expect(realTs).toContain("'entrar_equipe_convite', { convite, codigo }")
    expect(realTs).not.toMatch(/rpc[^\n]*'entrar_equipe'/)
    expect(traduzErro({ message: 'Abra o link do convite que te mandaram e digite os 4 numeros.' }).message).toMatch(/4 números/)
    expect(rotaPermitida(rotaDoHash('#/equipe?c=' + CONVITE_EXEMPLO), 'equipe')).toBe('casa')
  })
})

describe('1. limites por definir_limite', () => {
  it('o app real grava o limite por 1 função e não escreve mais em limites_mes', () => {
    expect(realTs).toContain("rpc('definir_limite', { familia, envelope, valor })")
    expect(realTs).not.toContain("from('limites_mes')")
  })
  it('no exemplo, muda o limite e o resumo acompanha; valor inválido é recusado', async () => {
    reiniciarExemplo()
    await apiExemplo.definirLimite('f', 'env-bruno', 3100.5)
    expect((await apiExemplo.resumoHoje('f')).envelopes.find(e => e.id === 'env-bruno')?.limite_mes).toBe(3100.5)
    await expect(apiExemplo.definirLimite('f', 'env-bruno', -1)).rejects.toThrow(/zero pra cima/)
    expect(traduzErro({ message: 'so o casal muda o limite' }).message).toBe('Só o casal muda o limite.')
  })
})

describe('1. equipe: resumo só com nomes e lançamento sem valor', () => {
  const doBanco = { familia_id: 'f', data: '2026-11-11', papel: 'equipe', so_nomes: true, dias_restantes: 20, explicacao: [],
    envelopes: [{ id: 'a', nome: 'Feira semanal', regra: 'semanal', casa: true }, { id: 'b', nome: 'Casa mensal', regra: 'mensal', casa: true }] }
  it('resposta nova do banco (so_nomes) vira resumo sem NaN e sem dinheiro', () => {
    const r = normalizaResumo(doBanco)
    expect(r.so_nomes).toBe(true)
    expect(r.envelopes.map(e => e.nome)).toEqual(['Feira semanal', 'Casa mensal'])
    expect(r.envelopes.every(e => e.casa === true && e.limite_mes === 0 && e.gasto_mes === 0 && e.livre === 0 && e.teto_semana === undefined)).toBe(true)
    expect([r.pode_gastar_hoje, r.livre_mes, r.colchao]).toEqual([0, 0, 0])
    expect(JSON.stringify(resumoSemDinheiro(r))).not.toMatch(/NaN|[1-9]\d{2,}/)
    expect(normalizaResumo({ pode_gastar_hoje: 10, envelopes: [] }).so_nomes).toBeUndefined()
  })
  it('lançamento devolvido sem valor não quebra (fica 0) e mantém o id pro Desfazer', () => {
    const l = normalizaLancamento({ id: 'x1', envelope_id: 'a', data: '2026-11-11', descricao: 'Feira', criado_em: '2026-11-11T10:00:00Z' })
    expect(l).toMatchObject({ id: 'x1', valor: 0, cartao_id: null, apagado_em: null })
  })
  it('no exemplo, a equipe recebe o mesmo formato do banco: nomes e nenhum valor', async () => {
    reiniciarExemplo(); exemploComoEquipe()
    const r = await apiExemplo.resumoHoje('f')
    expect(r.so_nomes).toBe(true)
    expect(JSON.stringify(r)).not.toMatch(/[1-9]\d{2,}/)
    const l = await apiExemplo.lancar(novo('eq1', { envelope: 'env-feira', valor: 77.7 }))
    expect(l.lancamento.valor).toBe(0)
    expect(l.resumo.so_nomes).toBe(true)
    await expect(apiExemplo.lerCupom('f', '')).rejects.toThrow(/só pro casal/)
    reiniciarExemplo()
  })
})

describe('1. convite por e-mail: mensagens novas do banco', () => {
  it('os 3 motivos de recusa saem em português e viram aviso pra pessoa', () => {
    expect(AVISOS_CONVITE).toHaveLength(3)
    for (const m of AVISOS_CONVITE) { expect(TRADUZ[m]).toBeTruthy(); expect(TRADUZ[m]).not.toMatch(/codigo|numeros|familia\b/) }
    expect(traduzErro({ message: 'confirme o seu e-mail com o codigo de 6 numeros antes de entrar na familia' }).message).toMatch(/Confirme o seu e-mail/)
    expect(traduzErro({ message: 'entre com o codigo de 6 numeros enviado pro e-mail do convite' }).message).toMatch(/saia e entre de novo/)
    expect(traduzErro({ message: 'esse e-mail ja foi convidado nesta familia' }).message).toMatch(/já foi convidado/)
    expect(traduzErro({ message: 'ja existem 5 codigos abertos nesta familia; use um deles ou espere vencer' }).message).toMatch(/5 códigos/)
  })
})

describe('1. IA do cupom, função versão 2', () => {
  it('6 por minuto, teto geral, teto da família e equipe sem IA têm mensagens diferentes', () => {
    expect(mensagemCupom(429, 'Muitas fotos em 1 minuto. Espere um pouco e tente de novo.')).toBe(MSG_CUPOM.ritmo)
    expect(mensagemCupom(429, 'A leitura de cupom está pausada este mês. O dono do app já foi avisado.')).toBe(MSG_CUPOM.geral)
    expect(mensagemCupom(429, 'limite do mês')).toBe(MSG_CUPOM.limite)
    expect(mensagemCupom(403, 'Você não faz parte dessa família.')).toBe(MSG_CUPOM.equipe)
    expect(mensagemCupom(503, 'o dono precisa colocar a chave da IA')).toBe(MSG_CUPOM.chave)
    expect(mensagemCupom(503, 'A chave da IA foi recusada. O dono precisa colocar a chave de novo.')).toBe(MSG_CUPOM.chave)
    expect(mensagemCupom(503, 'A IA está ocupada. Tente de novo em 1 minuto.')).toMatch(/ocupada/)
    expect(mensagemCupom(413, 'A foto passou de 1,5 MB.')).toBe(MSG_CUPOM.grande)
    expect(new Set([MSG_CUPOM.ritmo, MSG_CUPOM.geral, MSG_CUPOM.limite, MSG_CUPOM.equipe]).size).toBe(4)
  })
  it('lê os campos novos soma_dos_itens e total_confere', () => {
    const c = normalizaCupom({ itens: [{ nome: 'Arroz', valor: '28.9' }], total: 30, soma_dos_itens: 28.9, total_confere: false })
    expect(c.total_confere).toBe(false); expect(c.soma_dos_itens).toBe(28.9)
    expect(normalizaCupom({ itens: [] }).total_confere).toBeUndefined()
  })
})

describe('2. convite pro WhatsApp sem valor em R$', () => {
  it('nenhuma das 3 mensagens leva dinheiro; a da 2ª pessoa tem o texto combinado', () => {
    const p = mensagemConvite('pessoa', { familia: 'Silva', quem: 'Bruno', link: 'https://x/app/', email: 'bruno@x.com' })
    expect(p).toContain('Entra aqui pra ver o nosso número do dia')
    expect(p).toContain('https://x/app/'); expect(p).toContain('bruno@x.com')
    for (const m of [p, mensagemConvite('amiga', { familia: '', quem: '', link: 'https://x' }), mensagemConvite('equipe', { familia: 'S', quem: 'C', link: 'https://x', codigo: '1234' })]) {
      expect(m).not.toMatch(/R\$|\d+,\d{2}/); expect(m).not.toMatch(/[—–]/)
    }
  })
})

describe('3. config: 2 celulares na mesma chave não se apagam', () => {
  const it0 = (id: string, nome: string, ok = false) => ({ id, nome, ok })
  it('lista com id: junta item novo dos 2, respeita o que cada um tirou e marcou', () => {
    const base = [it0('1', 'Arroz'), it0('2', 'Feijão'), it0('3', 'Ovos')]
    const meu = [it0('1', 'Arroz', true), it0('3', 'Ovos'), it0('9', 'Sabão')]          // marquei arroz, tirei feijão, pus sabão
    const remoto = [it0('1', 'Arroz'), it0('2', 'Feijão'), it0('3', 'Ovos', true), it0('7', 'Café')] // o outro marcou ovos e pôs café
    expect(mesclar3(base, meu, remoto)).toEqual([it0('1', 'Arroz', true), it0('3', 'Ovos', true), it0('7', 'Café'), it0('9', 'Sabão')])
  })
  it('lista simples (trocas de gás, presença) e objeto por dia', () => {
    expect(mesclar3({ trocas: ['a'] }, { trocas: ['a', 'c'] }, { trocas: ['a', 'b'] })).toEqual({ trocas: ['a', 'b', 'c'] })
    expect(mesclar3({ d1: ['Carla'] }, { d1: [] as string[] }, { d1: ['Carla', 'Zé'], d2: ['Zé'] })).toEqual({ d1: ['Zé'], d2: ['Zé'] })
    expect(mesclar3({ pessoas: [{ id: 'p', salario: 1800 }], daePaga: {} }, { pessoas: [{ id: 'p', salario: 1800 }], daePaga: { '2026-11': true } }, { pessoas: [{ id: 'p', salario: 1900 }], daePaga: {} }))
      .toEqual({ pessoas: [{ id: 'p', salario: 1900 }], daePaga: { '2026-11': true } })
  })
  it('ordem das chaves diferente (o banco reordena) não conta como mudança', () => {
    expect(igual({ a: 1, b: [{ x: 1, y: 2 }] }, { b: [{ y: 2, x: 1 }], a: 1 })).toBe(true)
    expect(canon({ b: undefined, a: 1 })).toBe('{"a":1}')
    expect(mesclar3({ a: 1, b: 2 }, { b: 3, a: 1 }, { b: 2, a: 1 })).toEqual({ b: 3, a: 1 })
  })
  it('a guarda relê antes de gravar, grava o que juntou e avisa que mudou', async () => {
    const banco = { v: [it0('1', 'Arroz')] }
    const g = criarGuardaConfig(async () => JSON.parse(JSON.stringify(banco.v)), async v => { banco.v = v })
    await g.carregar()
    banco.v = [it0('1', 'Arroz'), it0('7', 'Café')]                    // o outro celular pôs café
    const r = await g.salvar([it0('1', 'Arroz'), it0('9', 'Sabão')])   // eu pus sabão sem ter visto o café
    expect(r.mudou).toBe(true)
    expect(banco.v.map(i => i.nome)).toEqual(['Arroz', 'Café', 'Sabão'])
    const r2 = await g.salvar([...banco.v, it0('10', 'Leite')])        // ninguém mexeu no meio: grava direto, sem aviso
    expect(r2.mudou).toBe(false)
    expect(banco.v).toHaveLength(4)
  })
  it('2 toques seguidos na mesma chave gravam em fila, o 2º em cima do 1º', async () => {
    const banco = { v: [] as string[] }
    const g = criarGuardaConfig<string[]>(async () => { await new Promise(r => setTimeout(r, 5)); return [...banco.v] }, async v => { await new Promise(r => setTimeout(r, 5)); banco.v = v })
    await g.carregar()
    await Promise.all([g.salvar(['a']), g.salvar(['a', 'b'])])
    expect(banco.v).toEqual(['a', 'b'])
  })
})

describe('3. lançamentos por mês', () => {
  it('mês anterior vira o ano', () => {
    expect(mesAnterior('2026-11')).toBe('2026-10'); expect(mesAnterior('2026-01')).toBe('2025-12'); expect(mesAnterior('2026-10')).toBe('2026-09')
  })
  it('a busca traz só o mês pedido, e os meses somados dão tudo', async () => {
    reiniciarExemplo()
    const mes = hojeRecife().slice(0, 7), ant = mesAnterior(mes)
    const a = await apiExemplo.lancamentos('f', mes), b = await apiExemplo.lancamentos('f', ant)
    expect(a.length).toBeGreaterThan(0); expect(a.every(l => l.data.startsWith(mes))).toBe(true)
    expect(b.every(l => l.data.startsWith(ant))).toBe(true)
    expect(b.some(l => l.descricao === 'Pneu do carro' || l.descricao === 'Farmácia')).toBe(true)
    expect(await apiExemplo.lancamentos('f', '2020-01')).toEqual([])
  })
  it('o app real filtra por data do mês e pagina (sem o corte de 500 linhas)', () => {
    expect(realTs).toMatch(/\.gte\('data', ini\)\.lt\('data', fim\)/)
    expect(realTs).not.toContain('.limit(500)\n    if (error) erro(error)\n    return (data || []).map((l: any)')
  })
})

describe('3. manifesto, contraste e pacote', () => {
  it('manifesto tem id e não trava o tablet em pé', () => {
    const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'))
    expect(typeof m.id).toBe('string'); expect(m.id.length).toBeGreaterThan(0)
    expect(m.orientation).toBeUndefined()
    expect(m.start_url).toBe('./')
  })
  it('cinza claro (--faint) e cinza (--muted) passam no AA nos 2 temas', () => {
    const lum = (h: string) => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
    const cr = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
    const blocos = [css.slice(css.indexOf(':root{'), css.indexOf('@media (prefers-color-scheme:dark)')), css.slice(css.indexOf('@media (prefers-color-scheme:dark)'), css.indexOf(':root[data-theme="dark"]')), css.slice(css.indexOf(':root[data-theme="dark"]'))]
    const tk = (b: string, n: string) => new RegExp(`--${n}:(#[0-9A-Fa-f]{6})`).exec(b)![1]
    for (const b of blocos) {
      for (const cor of ['faint', 'muted']) {
        expect(cr(tk(b, cor), tk(b, 'surface'))).toBeGreaterThanOrEqual(4.5) // texto no card
        expect(cr(tk(b, cor), tk(b, 'ground'))).toBeGreaterThanOrEqual(4.5)  // texto no fundo
        expect(cr(tk(b, cor), tk(b, 'raised'))).toBeGreaterThanOrEqual(3)    // ícone no cinza de apoio
      }
      expect(tk(b, 'faint')).not.toBe(tk(b, 'muted'))
    }
  })
  it('central-app.zip não leva os prints nem node_modules e ficou pequeno', () => {
    if (!existsSync('central-app.zip')) return
    const lista = execSync('unzip -Z1 central-app.zip').toString()
    expect(lista).not.toMatch(/testes\/prints\/.+\.png/)
    expect(lista).not.toContain('node_modules/')
    expect(lista).toContain('dist/index.html'); expect(lista).toContain('src/app/App.tsx')
    expect(statSync('central-app.zip').size).toBeLessThan(3 * 1024 * 1024)
  })
})

describe('4. crítica de design: itens de código', () => {
  it('Cartões: meses zerados seguidos viram 1 linha; mês com valor fica sozinho', () => {
    const f = (mes: string, total: number) => ({ mes, total })
    const g = agruparFaturas([f('2026-11', 380), f('2026-12', 95), f('2027-01', 0), f('2027-02', 0), f('2027-03', 0), f('2027-04', 0)])
    expect(g).toEqual([{ tipo: 'mes', f: f('2026-11', 380) }, { tipo: 'mes', f: f('2026-12', 95) }, { tipo: 'zeros', de: '2027-01', ate: '2027-04' }])
    expect(agruparFaturas([f('2026-11', 0), f('2026-12', 50), f('2027-01', 0)]).map(x => x.tipo)).toEqual(['zeros', 'mes', 'zeros'])
    expect(agruparFaturas([])).toEqual([])
  })
  it('Planejamento: campo mostra "3.000" e continua valendo como 3000', () => {
    expect(milhar('3000')).toBe('3.000'); expect(milhar('1153,85')).toBe('1.153,85'); expect(milhar('500')).toBe('500')
    expect(milhar('1234567,5')).toBe('1.234.567,5'); expect(milhar('')).toBe(''); expect(milhar('0')).toBe('0'); expect(milhar('3000,')).toBe('3.000,')
    const digitado = milhar('3000').replace(/[^\d,]/g, '') // o que o campo guarda depois de digitar
    expect(digitado).toBe('3000'); expect(valorDigitadoValido(digitado)).toBe(true); expect(textoParaValor(milhar('1153,85'))).toBe(1153.85)
  })
  it('estilo: estado vazio, verde só na ação, campo de 220 px, cena de 320 px, coluna centralizada', () => {
    for (const trecho of ['.vazio{', '.vazio-ico{', '.todo.quieto{background:var(--raised);color:var(--ink-2)}', '.fat .bar i.aberta{background:var(--accent)}', '.fat.zeros{', 'max-width:220px', '.din.s44{font-size:44px', '.iconbtn.quieto{color:var(--faint)}', '.sec-t{font-size:16px;font-weight:700;color:var(--ink)', '.entrar{min-height:100dvh;align-content:center}', '.duas>div+div{border-left:1px solid var(--rule)'])
      expect(css).toContain(trecho)
  })
})
