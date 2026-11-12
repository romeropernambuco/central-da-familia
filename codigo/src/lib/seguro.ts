// Travas pequenas contra perda e dobra de dado. Sem tela: dá pra testar sozinho.
import type { ResumoHoje } from '../api/tipos'
import { igual, mesclar3 } from './mescla'

/**
 * Deixa a função rodar 1 vez por vez: enquanto a 1ª chamada não termina, as outras são ignoradas
 * (devolvem undefined). É a trava do duplo toque no Lançar: vale no mesmo instante, antes do React redesenhar.
 */
export function umaPorVez<A extends unknown[], R>(f: (...a: A) => Promise<R>): (...a: A) => Promise<R | undefined> {
  let rodando = false
  return async (...a: A) => {
    if (rodando) return undefined
    rodando = true
    try { return await f(...a) } finally { rodando = false }
  }
}

/**
 * Guarda de uma chave de config (lista, prestadores, folha, gás): só deixa gravar depois de ter lido.
 * Sem isso, uma leitura que falhou (sem internet) mostrava a lista vazia e o 1º toque gravava o vazio por cima de tudo.
 * Antes de gravar, relê o banco: se outro celular mexeu na mesma chave, junta as 2 mudanças (mesclar3) e avisa (mudou: true).
 */
export function criarGuardaConfig<T>(ler: () => Promise<T>, gravar: (v: T) => Promise<void>) {
  let lido = false
  let escritas = 0
  let base: T | undefined
  let fila: Promise<unknown> = Promise.resolve()
  return {
    get lido() { return lido },
    /** Lê do banco. Devolve null se uma gravação começou depois desta leitura (o valor lido já ficou velho). */
    async carregar(): Promise<{ valor: T } | null> {
      const antes = escritas
      const valor = await ler()
      if (antes !== escritas) return null
      lido = true; base = valor
      return { valor }
    },
    /** Grava. `valor` é o que ficou no banco; `mudou` diz se entrou coisa de outro aparelho junto. */
    salvar(v: T): Promise<{ valor: T; mudou: boolean }> {
      if (!lido) return Promise.reject(new Error('Ainda não deu pra abrir o que já estava salvo. Confira a internet e tente de novo: nada foi mudado.'))
      escritas++
      // 1 gravação por vez nesta chave: a 2ª espera a 1ª e parte do que a 1ª deixou
      const vez = fila.catch(() => {}).then(async () => {
        const remoto = await ler()
        const final = mesclar3(base as T, v, remoto)
        await gravar(final)
        base = final
        return { valor: final, mudou: !igual(final, v) }
      })
      fila = vez
      return vez
    },
  }
}

/** uuid novo. Em página sem https (teste local) o navegador não tem randomUUID: monta com números aleatórios seguros. */
export function novoUuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto
  if (c?.randomUUID) return c.randomUUID()
  const b = new Uint8Array(16)
  if (c?.getRandomValues) c.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/**
 * Chave do toque no Lançar: 1 uuid por lançamento. Se a gravação falha (internet caiu no meio) e a pessoa toca de novo
 * no MESMO lançamento (mesmo envelope, valor, dia, texto e cartão), a chave é a mesma e o banco não grava em dobro.
 * Mudou qualquer coisa, é outro lançamento: chave nova. Depois de gravar, chame `gravou()`.
 */
export function criarChaveToque(gerar: () => string = novoUuid) {
  let chave = '', de = ''
  return {
    para(assinatura: string): string { if (!chave || de !== assinatura) { chave = gerar(); de = assinatura } return chave },
    gravou() { chave = ''; de = '' },
  }
}

/**
 * O que a equipe da casa pode ter na memória do aparelho: só o nome dos envelopes da Casa.
 * Todo número de dinheiro vira 0 e a explicação some, pra nenhum caminho (tela, aviso, rótulo) conseguir mostrar R$.
 */
export function resumoSemDinheiro(r: ResumoHoje): ResumoHoje {
  return {
    pode_gastar_hoje: 0, livre_mes: 0, colchao: 0, dias_restantes: r.dias_restantes, explicacao: [], so_nomes: true,
    envelopes: r.envelopes.filter(e => e.casa !== false).map(e => ({ id: e.id, nome: e.nome, regra: e.regra, casa: true, limite_mes: 0, gasto_mes: 0, livre: 0 })),
  }
}

/** Só repete o trabalho se já passou o intervalo: evita 3 buscas quando a tela volta (foco + visível + online). */
export function comIntervalo(ms: number, agora: () => number = Date.now) {
  let ultimo = -Infinity
  return () => { const t = agora(); if (t - ultimo < ms) return false; ultimo = t; return true }
}
