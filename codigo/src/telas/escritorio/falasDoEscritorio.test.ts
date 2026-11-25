import { describe, expect, it } from 'vitest'
import type { EscritorioHoje, PerguntaEsc } from '../../api/tipos'
import { HORA_DA_NOITE, turnoDe } from '../../lib/escritorio/turno'
import { dadosIsometricos } from './dadosIsometricos'
import { falasDoEscritorio, falasDoRelogio, prazoDaTarefa } from './falasDoEscritorio'

const HOJE = '2026-11-25'
const pergunta = (id: string, funcionario: string, extra: Partial<PerguntaEsc> = {}): PerguntaEsc => ({
  id,
  funcionario,
  assunto: `Assunto de ${id}`,
  pergunta: `Você confirma ${id}?`,
  contexto: '',
  opcoes: [{ id: 'feito', rotulo: 'Confirmar' }],
  ...extra,
})
const fonte = (): EscritorioHoje => ({
  trabalhando: [{ funcionario: 'contador', resumo: 'Estou conferindo os números agora.' }],
  entregue: [{ funcionario: 'analista_cartao', resumo: 'Fatura conferida.' }],
  funcionarios: [
    {
      id: 'comprador',
      nome: 'Comprador',
      sala: 'Casa',
      estado: 'entregue',
      frase: 'Gás pedido.',
      cadastro_resumo: '2 prestadores',
      ultimas_respostas: [
        {
          id: 'd1',
          funcionario: 'comprador',
          assunto: 'Gás',
          pergunta: 'Pediu o gás?',
          resposta: 'Já pedi o gás.',
          quando: '2026-11-24T10:00:00Z',
          adiado_ate: null,
        },
      ],
    },
  ],
  precisa_de_voce: [
    pergunta('cdb', 'gestor_guardado', { valor: 20080.15, vence_em: '2026-12-07', espera_dias: 2 }),
    pergunta('cdb-2', 'gestor_guardado', { vence_em: '2026-12-20' }),
    pergunta('seguro', 'secretaria', { vence_em: '2026-11-24' }),
  ],
})
const montar = (hora: number, oculto = false, hoje = HOJE) =>
  falasDoEscritorio(dadosIsometricos(fonte(), { papel: 'casal', dono: true, oculto }), { hoje, hora }, oculto)

describe('o que cada funcionário fala no balão', () => {
  it('o prazo vira uma frase curta e data distante ou ausente não diz nada', () => {
    expect(prazoDaTarefa('2026-11-23', HOJE)).toBe('Venceu há 2 dias.')
    expect(prazoDaTarefa('2026-11-24', HOJE)).toBe('Venceu há 1 dia.')
    expect(prazoDaTarefa('2026-11-25', HOJE)).toBe('Vence hoje.')
    expect(prazoDaTarefa('2026-11-26', HOJE)).toBe('Vence amanhã.')
    expect(prazoDaTarefa('2026-12-07T03:00:00Z', HOJE)).toBe('Vence em 12 dias.')
    expect(prazoDaTarefa('2027-06-01', HOJE)).toBe('')
    expect(prazoDaTarefa(null, HOJE)).toBe('')
  })

  it('quem tem tarefa fala só dela: assunto, prazo e há quanto tempo espera', () => {
    const falas = montar(10)
    expect(falas.guardado).toEqual(['Assunto de cdb', 'Vence em 12 dias.', 'Espera sua resposta há 2 dias.'])
    expect(falas.secretaria).toEqual(['Assunto de seguro', 'Venceu há 1 dia.'])
  })

  it('quem não tem tarefa conta o que faz, o que cuida e a última resposta, sem repetir frase', () => {
    const falas = montar(10)
    expect(falas.contador).toEqual(['Estou conferindo os números agora.', 'Faltam 5 dias para o mês fechar.'])
    expect(falas.comprador).toEqual(['Gás pedido.', '2 prestadores', 'Sua última resposta: Já pedi o gás.'])
    expect(falas.zelador).toBeUndefined()
  })

  it('o relógio muda a fala: cumprimento do Anfitrião e lembretes do Contador', () => {
    expect(montar(9).anfitriao).toEqual(['Bom dia. 3 tarefas esperam você.'])
    expect(montar(15).anfitriao).toEqual(['Boa tarde. 3 tarefas esperam você.'])
    expect(montar(HORA_DA_NOITE).anfitriao).toEqual(['Boa noite. 3 tarefas esperam você.'])
    expect(falasDoRelogio('anfitriao', { hoje: HOJE, hora: 9 }, 0)).toEqual(['Bom dia. Nenhuma tarefa espera você.'])
    expect(falasDoRelogio('anfitriao', { hoje: HOJE, hora: 9 }, 1)).toEqual(['Bom dia. 1 tarefa espera você.'])
    expect(montar(21).contador).toEqual([
      'Estou conferindo os números agora.',
      'Faltou anotar algum gasto de hoje?',
      'Faltam 5 dias para o mês fechar.',
    ])
    expect(falasDoRelogio('contador', { hoje: '2026-11-30', hora: 10 }, 0)).toEqual(['O mês fecha hoje.'])
    expect(falasDoRelogio('contador', { hoje: '2026-12-02', hora: 10 }, 0)).toEqual([
      'Mês novo. Vale conferir o orçamento.',
    ])
    expect(falasDoRelogio('contador', { hoje: '2026-11-12', hora: 10 }, 0)).toEqual([])
  })

  it('com o olho fechado só sobra "Tarefa pendente": nem prazo, nem atividade, nem relógio', () => {
    expect(montar(21, true)).toEqual({ guardado: ['Tarefa pendente'], secretaria: ['Tarefa pendente'] })
  })

  it('das 20h às 6h é noite; a partir das 17h30 o dia está fechando', () => {
    expect([5.9, 6, 12, 17.4, 17.5, 19.9, 20, 23.5, 0].map(turnoDe)).toEqual([
      'noite',
      'dia',
      'dia',
      'dia',
      'fimDeTarde',
      'fimDeTarde',
      'noite',
      'noite',
      'noite',
    ])
  })
})
