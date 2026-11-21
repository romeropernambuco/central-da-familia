import { ErroRede, ErroSessao } from './erros'
/** A sessão acabou com o envio ainda em aberto. O item continua guardado no aparelho para o mesmo dono. */
export class EnvioInterrompido extends Error {
  constructor() {
    super('Sessão encerrada. Confira os lançamentos ao entrar.')
    this.name = 'EnvioInterrompido'
  }
}
/**
 * A falha quer dizer que a sessão acabou (ou a leitura foi trocada), e não que o banco recusou o gasto.
 * Nesses casos o gasto continua guardado no aparelho e é reenviado quando o mesmo dono entrar de novo.
 */
export function envioContinuaGuardado(falha: unknown): boolean {
  if (falha instanceof EnvioInterrompido || falha instanceof ErroSessao) return true
  if (!(falha instanceof Error)) return false
  return falha.name === 'LeituraSubstituida' || falha.message.startsWith('Sessão encerrada')
}

/** Sinal de que o envio não terminou: ficou guardado, esperando a rede. */
export const FICOU_ESPERANDO = Symbol('ficou esperando a rede')

interface Pendente {
  executar: () => Promise<unknown>
  /** Uma tentativa deste envio está no ar agora: a repetição automática não dispara outra por cima. */
  emVoo: boolean
  resolver: (r: any) => void
  rejeitar: (e: unknown) => void
  promessa: Promise<any>
}
export class FilaPendentes {
  itens = new Map<string, Pendente>()
  ocupado = false
  geracao = 0
  private ouvintes = new Set<() => void>()
  ouvir = (f: () => void) => {
    this.ouvintes.add(f)
    return () => {
      this.ouvintes.delete(f)
    }
  }
  private avisar() {
    this.ouvintes.forEach(f => f())
  }
  async enviar<T>(chave: string, executar: () => Promise<T>): Promise<T> {
    const geracao = this.geracao
    const antigo = this.itens.get(chave)
    if (antigo) return antigo.promessa
    let resolver!: (r: T) => void, rejeitar!: (e: unknown) => void
    const promessa = new Promise<T>((sim, nao) => {
      resolver = sim
      rejeitar = nao
    })
    const item: Pendente = { executar, resolver, rejeitar, promessa, emVoo: true }
    this.itens.set(chave, item)
    void (async () => {
      try {
        const r = await executar()
        if (geracao !== this.geracao) return
        this.itens.delete(chave)
        resolver(r)
      } catch (e) {
        if (geracao !== this.geracao) return
        if (!(e instanceof ErroRede)) {
          this.itens.delete(chave)
          rejeitar(e)
        }
      } finally {
        item.emVoo = false
        this.avisar()
      }
    })()
    return promessa
  }

  /**
   * Resolve quando a primeira tentativa deste envio falhou por rede e ele ficou esperando na fila.
   * A tela usa isso para liberar a pessoa ("guardado, envio depois") em vez de ficar presa em "Salvando".
   * Se o envio terminar antes (salvou ou foi recusado), nunca resolve: quem decide é a promessa do próprio envio.
   * `ateTerminar` é essa promessa: quando ela termina, de qualquer jeito, o ouvinte é desligado.
   */
  ficouEsperando(chave: string, ateTerminar: Promise<unknown>): Promise<typeof FICOU_ESPERANDO> {
    return new Promise(resolver => {
      const conferir = () => {
        const item = this.itens.get(chave)
        if (!item || item.emVoo) return false
        parar()
        resolver(FICOU_ESPERANDO)
        return true
      }
      const parar = this.ouvir(() => void conferir())
      void ateTerminar.then(parar, parar)
      conferir()
    })
  }

  async repetir() {
    if (this.ocupado) return
    this.ocupado = true
    try {
      for (const [chave, item] of this.itens) {
        if (item.emVoo) continue
        item.emVoo = true
        try {
          const r = await item.executar()
          if (this.itens.get(chave) !== item) continue
          this.itens.delete(chave)
          item.resolver(r)
        } catch (e) {
          // se a sessão caiu e outro envio com a mesma chave entrou na fila, esta tentativa velha não mexe nele
          if (!(e instanceof ErroRede) && this.itens.get(chave) === item) {
            this.itens.delete(chave)
            item.rejeitar(e)
          }
        } finally {
          item.emVoo = false
        }
        this.avisar()
      }
    } finally {
      this.ocupado = false
    }
  }
  limpar() {
    this.geracao++
    for (const i of this.itens.values()) i.rejeitar(new EnvioInterrompido())
    this.itens.clear()
    this.avisar()
  }
}
export const pendentes = new FilaPendentes()
