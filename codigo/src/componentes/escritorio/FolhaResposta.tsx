import { useCallback, useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import type { PerguntaEsc } from '../../api/tipos'
import { reais } from '../../lib/formato'
import { valorDaPendencia } from '../../lib/resumo/pendencias'
import { Icone } from '../Icone'
import { PerguntaCard, type Responder } from '../Pergunta'
import { Sheet } from '../base'

/**
 * A tarefa da vez e o que já foi respondido nesta folha. A pergunta fica guardada como estava ao abrir: quando a
 * resposta é gravada ela sai da fila, e sem isso a folha pularia para a próxima antes de dizer "Pronto, anotado.".
 */
function useRespostaDaFolha(tarefas: PerguntaEsc[], inicial: string | undefined, responder: Responder) {
  const [atual, setAtual] = useState<PerguntaEsc | undefined>(() => tarefas.find(t => t.id === inicial) ?? tarefas[0])
  const [total] = useState(tarefas.length)
  const [feitas, setFeitas] = useState(0)
  const [anotada, setAnotada] = useState(false)
  const [enviou, setEnviou] = useState(false)
  const anotar = useCallback(() => setAnotada(true), [])
  // copiar a mensagem não encerra a tarefa: o cartão continua na tela para mostrar o texto copiado
  const enviar = useCallback<Responder>(
    async (pergunta, opcao, dados) => {
      const encerra = !/^copiar/.test(opcao)
      if (encerra) setEnviou(true)
      const r = await responder(pergunta, opcao, dados)
      if (r === false) setEnviou(false)
      return r
    },
    [responder],
  )
  const proxima = tarefas.find(t => t.id !== atual?.id)
  const pronta = !atual || anotada || (enviou && !tarefas.some(t => t.id === atual.id))
  const seguir = () => {
    setAtual(proxima)
    setFeitas(feitas + 1)
    setAnotada(false)
    setEnviou(false)
  }
  return { atual, pronta, proxima, seguir, anotar, enviar, ordem: total > 1 ? `Tarefa ${feitas + 1} de ${total}` : '' }
}

/**
 * Responder sem passar pela ficha: abre ao tocar no balão de quem precisa de você. Mostra só a tarefa e as respostas;
 * a ficha completa continua a um toque ("Ver a ficha completa").
 */
export function FolhaResposta({
  nome,
  tarefas,
  inicial,
  emRisco,
  oculto,
  responder,
  fechar,
  verFicha,
}: {
  nome: string
  /** as tarefas deste funcionário que estão na fila agora, da mais urgente para a menos */
  tarefas: PerguntaEsc[]
  /** a tarefa que abre primeiro (quando veio da fila "Precisa de você") */
  inicial?: string
  emRisco: (p: PerguntaEsc) => boolean
  oculto: boolean
  responder: Responder
  fechar: () => void
  verFicha: () => void
}) {
  const { atual, pronta, proxima, seguir, anotar, enviar, ordem } = useRespostaDaFolha(tarefas, inicial, responder)
  const fecharRef = useRef(fechar)
  fecharRef.current = fechar
  // respondeu a última: a folha se despede sozinha
  useEffect(() => {
    if (!pronta || proxima) return
    const relogio = setTimeout(() => fecharRef.current(), 2000)
    return () => clearTimeout(relogio)
  }, [pronta, proxima])
  const valor = atual && !oculto ? valorDaPendencia(atual) : null
  return (
    <Sheet titulo={nome} rotulo={`Responder: ${nome}`} fechar={fechar}>
      <div className="j-resposta">
        {pronta || !atual ? (
          <>
            <p className="j-resposta-pronto" role="status">
              <Icone desenho={Check} size={20} />
              Pronto, anotado.
            </p>
            {proxima && (
              <div className="j-resposta-seguir">
                <button type="button" className="btn primary" onClick={seguir}>
                  Próxima tarefa
                </button>
                <button type="button" className="btn line" onClick={fechar}>
                  Fechar
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {(ordem || (!oculto && emRisco(atual))) && (
              <p className="j-resposta-topo">
                {!oculto && emRisco(atual) && <span className="chip warn">Dinheiro em risco</span>}
                {ordem && <span>{ordem}</span>}
              </p>
            )}
            {valor !== null && <strong className="j-resposta-valor">{reais(valor)}</strong>}
            <PerguntaCard
              key={atual.id}
              p={
                oculto
                  ? {
                      ...atual,
                      pergunta: 'Tarefa pendente',
                      contexto: '',
                      trechosPrivados: atual.trechosPrivados ?? [],
                    }
                  : atual
              }
              quem={nome}
              responder={enviar}
              aoResponder={anotar}
              semQuem
              contextoRecolhido
            />
          </>
        )}
        <button type="button" className="j-resposta-ficha" onClick={verFicha}>
          Ver a ficha completa <Icone nome="abrir" size={16} />
        </button>
      </div>
    </Sheet>
  )
}
