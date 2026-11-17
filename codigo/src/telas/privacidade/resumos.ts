import type { Papel } from '../../api/tipos'
export const VERSAO_PRIVACIDADE = '2026-11-16.1'
export function resumoPrivacidade(papel: Papel | null) {
 const casal = papel === 'casal', assessor = papel === 'equipe'
 return [
  ['O que você registra', assessor ? 'Compras sem valores, lista, gás e seu ponto na Casa.' : casal ? 'Gastos, entradas, limites, aplicações, imóveis e receitas da família.' : 'Seus gastos, seu orçamento e seus desejos.'],
  ['Quem pode ver', assessor ? 'Quem administra a família acompanha seus registros da Casa. Seu acesso não mostra valores em dinheiro.' : casal ? 'O casal acompanha as finanças da família. A pessoa da família acessa seu orçamento; o Assessor da Casa acessa tarefas sem valores.' : 'Você acompanha seu orçamento. O casal também acompanha os registros da família.'],
  ['O que você pode baixar', assessor ? 'Este acesso não oferece exportação de dados. Peça uma cópia dos seus registros a quem administra a família.' : casal ? 'A opção de exportar consulta os dados da família disponíveis ao seu acesso. Confira o arquivo antes de compartilhar.' : 'A opção de baixar seus dados depende da exportação individual disponível no serviço.'],
  ['Como pedir correção ou encerramento', casal ? 'Corrija os registros que seu acesso permite. Em caso de encerramento, confira a opção de apagar a família e guarde uma cópia antes. Este app não encerra acessos individuais.' : 'Peça a quem administra a família para conferir uma correção ou seu encerramento. Este app ainda não permite encerrar apenas seu acesso.'],
 ] as const
}
