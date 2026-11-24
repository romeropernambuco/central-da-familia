import { plural, reais } from '../../lib/formato'
import type { Estacao } from '../../componentes/EquipeDoOrcamento'

const IMG = (nome: string) => `/orcamento-3d/agente-${nome}.webp`

/**
 * O que cada agente do palco fala agora (3ª versão do Meu orçamento, 24/11/2026). Regra do painel: número + 1 frase.
 * Com o olho fechado, nenhuma frase leva valor. Sem tela: dá para testar sozinho.
 */
export function estacoesDoOrcamento(d: {
  oculto: boolean
  /** quem olha pode anotar neste orçamento */
  meu: boolean
  gastoHoje: number
  /** dia do mês (antes do dia 3 ainda não dá para prever) */
  dia: number
  /** a previsão do fim do mês */
  dentro: boolean
  passa: number
  /** sobra anotada; null quando o mês já passou do combinado */
  sobra: number | null
  comprasNoMes: number
  repetidas: number
  somaRepetidas: number
  anotar: () => void
  irPara: (id: string) => void
}): Estacao[] {
  const v = (comValor: string, semValor: string) => (d.oculto ? semValor : comValor)
  return [
    {
      id: 'assistente',
      nome: 'Assistente',
      cuida: 'Hoje',
      img: IMG('mesa'),
      alvo: 'oHoje',
      fala:
        d.gastoHoje > 0
          ? v(`Hoje você já anotou ${reais(d.gastoHoje)}.`, 'Hoje você já anotou compra.')
          : 'Hoje você ainda não anotou nenhuma compra.',
      acao: d.meu
        ? { rotulo: 'Anotar compra', fazer: d.anotar }
        : { rotulo: 'Ver hoje', fazer: () => d.irPara('oHoje') },
    },
    {
      id: 'analista',
      nome: 'Analista',
      cuida: 'Semana e mês',
      img: IMG('analista'),
      alvo: 'oRitmo',
      fala:
        d.dia < 3
          ? 'Ainda é cedo para prever como o mês fecha.'
          : d.dentro
            ? 'Neste ritmo, o mês fecha dentro do combinado.'
            : v(
                `Se continuar assim, passa ${reais(d.passa)} no fim do mês.`,
                'Se continuar assim, o mês passa do combinado.',
              ),
      acao: { rotulo: 'Ver semana e mês', fazer: () => d.irPara('oRitmo') },
    },
    {
      id: 'tesoureira',
      nome: 'Tesoureira',
      cuida: 'Sobra',
      img: IMG('tesoureira'),
      alvo: 'oCofrinho',
      fala:
        d.sobra == null
          ? 'O pote está vazio: o mês passou do combinado.'
          : d.sobra > 0
            ? v(`Sua sobra anotada está em ${reais(d.sobra)}.`, 'Você tem sobra anotada este mês.')
            : 'Ainda não sobrou nada este mês.',
      acao: { rotulo: 'Ver a sobra', fazer: () => d.irPara('oCofrinho') },
    },
    {
      id: 'comprador',
      nome: 'Comprador',
      cuida: 'Compras',
      img: IMG('comprador'),
      alvo: d.repetidas > 0 ? 'oRepete' : 'oCompras',
      fala:
        d.repetidas > 0
          ? v(
              `${plural(d.repetidas, 'compra se repete', 'compras se repetem')} e já somam ${reais(d.somaRepetidas)}.`,
              `${plural(d.repetidas, 'compra se repete', 'compras se repetem')} este mês.`,
            )
          : d.comprasNoMes > 0
            ? `Você anotou ${plural(d.comprasNoMes, 'compra', 'compras')} este mês.`
            : 'Nenhuma compra anotada este mês.',
      acao: { rotulo: 'Ver as compras', fazer: () => d.irPara(d.repetidas > 0 ? 'oRepete' : 'oCompras') },
    },
  ]
}
