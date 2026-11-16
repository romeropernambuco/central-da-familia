import { textoDeAgente, rotuloDeOpcao } from '../textoAgente'
import type { Insight } from './tipos'

/** Mesmas primitivas de PerguntaCard/privacidade: nomes por trecho, rótulos públicos legíveis.
 * Não formata dinheiro: nenhuma das oito falas precisa expor valores para pedir a ação. */
export function apresentarInsight(i: Insight, oculto: boolean): Insight {
  const privados = i.trechosPrivados || []
  const fala = (s: string) => textoDeAgente(s, privados, oculto)
  return { ...i, pergunta: fala(i.pergunta), contexto: fala(i.contexto),
    opcoes: i.opcoes.map((o, n) => ({ ...o, rotulo: rotuloDeOpcao(o.rotulo, n, privados, oculto) })) }
}
