import { textoDeAgente, rotuloDeOpcao } from '../textoAgente'
import type { Insight } from './tipos'

/** Mesmas primitivas de PerguntaCard/privacidade: nomes por trecho, rótulos públicos legíveis.
 * Não formata dinheiro: nenhuma das oito falas precisa expor valores para pedir a ação. */
export function apresentarInsight(i: Insight, oculto: boolean): Insight {
  const privados = i.trechosPrivados || []
  const textos: Record<string, string> = {"Sua fatura vence em breve. Já pagou?":"Já pagou a fatura que vence em breve?","A fatura não bate com as compras anotadas. Vamos conferir?":"Quer conferir a diferença entre a fatura e as compras anotadas?","Sua aplicação está vencendo. Quer revisar o destino?":"Quer revisar o destino da aplicação que está vencendo?","O livre ficou abaixo da reserva. Como vamos recompor?":"O dinheiro livre ficou abaixo da reserva. Quer revisar o plano?","O plano está abaixo do necessário para o objetivo. Quer revisar aportes ou premissas?":"O plano ainda não alcança seu objetivo. Quer revisar quanto pretende guardar?","Revisar aportes ou premissas":"Revisar quanto guardar"}
  const fala = (s: string) => textoDeAgente(s, privados, oculto)
  return { ...i, pergunta: fala(textos[i.pergunta] || i.pergunta), contexto: fala(i.contexto.replace('. Há parcelas', '; há parcelas')),
    opcoes: i.opcoes.map((o, n) => ({ ...o, rotulo: rotuloDeOpcao(textos[o.rotulo] || o.rotulo, n, privados, oculto) })) }
}
