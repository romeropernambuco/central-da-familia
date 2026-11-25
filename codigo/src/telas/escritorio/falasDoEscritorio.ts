// O que cada funcionário tem a dizer no balão, em ordem. O balão mostra uma fala por vez e passa para a próxima a cada
// volta: nada aqui é inventado, tudo sai do que o escritório já registra (tarefa, prazo, atividade, entrega, diário)
// ou do relógio (hora do dia e dia do mês).
import { diasEntre, diasNoMes } from '../../lib/formato'
import type { DadosIsometricos, PostoIsometrico } from './dadosIsometricos'

export interface Agora {
  /** o dia de hoje em Recife, AAAA-MM-DD */
  hoje: string
  /** a hora em Recife, de 0 a 24 */
  hora: number
}

const dias = (n: number) => (n === 1 ? '1 dia' : `${n} dias`)

/** O prazo da tarefa em uma frase curta; sem data, não diz nada. */
export function prazoDaTarefa(venceEm: string | null | undefined, hoje: string): string {
  if (!venceEm || !/^\d{4}-\d{2}-\d{2}/.test(venceEm)) return ''
  const falta = diasEntre(hoje, venceEm.slice(0, 10))
  if (falta < 0) return `Venceu há ${dias(-falta)}.`
  if (falta === 0) return 'Vence hoje.'
  if (falta === 1) return 'Vence amanhã.'
  return falta <= 45 ? `Vence em ${falta} dias.` : ''
}

/** O que só o relógio sabe: o cumprimento do Anfitrião e os lembretes de fim de dia e de virada de mês do Contador. */
export function falasDoRelogio(id: string, { hoje, hora }: Agora, pendentes: number): string[] {
  if (id === 'anfitriao') {
    const oi = hora < 5 ? 'Boa noite.' : hora < 12 ? 'Bom dia.' : hora < 18 ? 'Boa tarde.' : 'Boa noite.'
    const fila =
      pendentes === 0
        ? 'Nenhuma tarefa espera você.'
        : pendentes === 1
          ? '1 tarefa espera você.'
          : `${pendentes} tarefas esperam você.`
    return [`${oi} ${fila}`]
  }
  if (id !== 'contador') return []
  const dia = Number(hoje.slice(8, 10)),
    falta = diasNoMes(hoje) - dia
  return [
    hora >= 18 || hora < 5 ? 'Faltou anotar algum gasto de hoje?' : '',
    falta === 0 ? 'O mês fecha hoje.' : falta <= 5 ? `Faltam ${dias(falta)} para o mês fechar.` : '',
    dia <= 3 ? 'Mês novo. Vale conferir o orçamento.' : '',
  ].filter(Boolean)
}

/** O que o funcionário sem tarefa conta: o que faz agora ou entregou, o resumo do que cuida e a sua última resposta. */
function falasDoPosto({ membro, funcionario: f, atividade, entrega }: PostoIsometrico): string[] {
  if (f.semDado || f.estado === 'vai_comecar') return []
  const ultima = f.ultimas_respostas?.find(l => !l.adiado_ate && l.resposta.trim())
  return [
    f.estado === 'trabalhando' ? atividade : entrega?.resumo,
    f.frase !== membro.papel ? f.frase : '',
    f.cadastro_resumo,
    ultima ? `Sua última resposta: ${ultima.resposta.trim().replace(/\.$/, '')}.` : '',
  ].map(x => (x || '').trim())
}

/**
 * As falas de cada um, já na ordem em que o balão vai mostrar. Quem tem tarefa fala só dela (assunto, prazo e há quanto
 * tempo espera). Com o olho fechado sobra só "Tarefa pendente": nenhum texto nem prazo aparece.
 */
export function falasDoEscritorio(
  { fila, postos }: Pick<DadosIsometricos, 'fila' | 'postos'>,
  agora: Agora,
  oculto: boolean,
): Record<string, string[]> {
  const falas: Record<string, string[]> = {}
  for (const t of fila) {
    if (falas[t.membro.id]) continue
    const espera = t.pergunta.espera_dias || 0
    falas[t.membro.id] = oculto
      ? [t.texto]
      : [
          t.texto,
          prazoDaTarefa(t.pergunta.vence_em, agora.hoje),
          espera > 0 ? `Espera sua resposta há ${dias(espera)}.` : '',
        ]
  }
  if (!oculto)
    for (const posto of postos) {
      const id = posto.membro.id
      falas[id] ||= [...falasDoPosto(posto), ...falasDoRelogio(id, agora, fila.length)]
    }
  for (const id of Object.keys(falas)) {
    falas[id] = [...new Set(falas[id].filter(Boolean))]
    if (!falas[id].length) delete falas[id]
  }
  return falas
}
