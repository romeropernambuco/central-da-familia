import type { NovoLancamento } from '../../api/tipos'
import { EnvioInterrompido } from '../../app/pendentes'
import { donoDosPendentes, marcarRecusado } from '../../app/pendentesGuardados'
import { reais } from '../../lib/formato'

interface Avisos {
  toast: (mensagem: string) => void
  recarregar: () => Promise<unknown>
}

const sessaoAcabou = (falha: unknown) =>
  falha instanceof EnvioInterrompido || (falha instanceof Error && falha.message.startsWith('Sessão encerrada'))

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
    if (sessaoAcabou(falha)) return
    const motivo = falha instanceof Error ? falha.message : 'O banco não aceitou este gasto.'
    const dono = donoDosPendentes()
    if (dono) {
      marcarRecusado(dono, gasto, motivo)
      app.toast('Um gasto guardado não foi aceito. Veja o aviso no alto da tela.')
    } else {
      app.toast(`O gasto de ${reais(gasto.valor)} não foi aceito. ${motivo}`)
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
