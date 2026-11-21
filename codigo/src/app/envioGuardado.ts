import type { NovoLancamento } from '../api/tipos'
import { reais } from '../lib/formato'
import { envioContinuaGuardado, FICOU_ESPERANDO, pendentes } from '../api/pendentes'
import { donoDosPendentes, marcarRecusado } from '../api/pendentesGuardados'

interface Avisos {
  toast: (mensagem: string) => void
  recarregar: () => Promise<unknown>
}

const motivoDe = (falha: unknown) => (falha instanceof Error ? falha.message : 'O banco não aceitou este gasto.')

/**
 * Espera o envio de um gasto, mas não prende a tela se a rede caiu: devolve `FICOU_ESPERANDO` assim que a primeira
 * tentativa falha por rede (o gasto já está guardado no aparelho e a fila reenvia sozinha).
 * Toda tela que anota gasto usa esta função, para o comportamento sem internet ser o mesmo em todas.
 */
export function enviarSemPrenderATela<T>(envio: Promise<T>, chave: string): Promise<T | typeof FICOU_ESPERANDO> {
  return Promise.race([envio, pendentes.ficouEsperando(chave, envio)])
}

/**
 * A tela de anotar já fechou (o gasto ficou guardado, sem internet). Esta função acompanha o envio até o fim
 * e conta o desfecho para a pessoa, onde quer que ela esteja no app:
 * - salvou: atualiza os números e avisa;
 * - a sessão acabou: nada a dizer, o gasto continua guardado e volta a ser enviado ao entrar;
 * - o banco recusou de vez: o gasto fica na faixa de envios, com o motivo, para ela tentar de novo ou descartar.
 */
export async function avisarQuandoOEnvioTerminar(envio: Promise<unknown>, gasto: NovoLancamento, app: Avisos) {
  try {
    await envio
  } catch (falha) {
    if (envioContinuaGuardado(falha)) return
    const dono = donoDosPendentes()
    if (dono) {
      marcarRecusado(dono, gasto, motivoDe(falha))
      app.toast('Um gasto guardado não foi aceito. Veja o aviso no alto da tela.')
    } else {
      app.toast(`O gasto de ${reais(gasto.valor)} não foi aceito. ${motivoDe(falha)}`)
    }
    return
  }
  try {
    await app.recarregar()
  } catch {
    // o gasto já está salvo; se a atualização dos números falhar agora, a próxima leitura traz o valor certo
  }
  app.toast(`O gasto guardado foi salvo: ${reais(gasto.valor)}.`)
}

/**
 * "Tentar de novo" num gasto que o banco tinha recusado. Se for recusado outra vez, ele volta para a faixa com o
 * motivo novo: nunca some do aparelho sem a pessoa mandar descartar.
 */
export async function reenviarRecusado(lancar: (gasto: NovoLancamento) => Promise<unknown>, gasto: NovoLancamento) {
  const dono = donoDosPendentes()
  try {
    await lancar(gasto)
  } catch (falha) {
    if (dono && !envioContinuaGuardado(falha)) marcarRecusado(dono, gasto, motivoDe(falha))
    throw falha
  }
}
