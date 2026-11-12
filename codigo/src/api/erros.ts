// Erro do banco ou da rede em português simples, com o tipo certo pra o app saber o que fazer.

/** A sessão venceu ou foi encerrada: o app volta pra tela de entrar. */
export class ErroSessao extends Error { constructor(m = 'Sua sessão acabou. Entre de novo.') { super(m); this.name = 'ErroSessao' } }
/** Sem internet (ou o servidor não respondeu): nada foi gravado. */
export class ErroRede extends Error { constructor(m = 'Sem internet agora. Nada foi salvo: tente de novo em instantes.') { super(m); this.name = 'ErroRede' } }

/** O banco escreve sem acento; o app mostra com acento. */
export const TRADUZ: Record<string, string> = {
  'Codigo errado ou vencido.': 'Código errado ou vencido.',
  'Muitas tentativas. Peca um codigo novo a quem te convidou.': 'Muitas tentativas. Peça um código novo a quem te convidou.',
  'Entrada da equipe pausada por 1 hora. Tente mais tarde.': 'Entrada da equipe pausada por 1 hora. Tente mais tarde.',
  'Voce ja esta nessa familia.': 'Você já está nessa família.',
  'Esse convite ja foi usado.': 'Esse convite já foi usado.',
  'so o casal convida': 'Só o casal convida.',
  'falta um e-mail valido': 'Falta um e-mail válido de quem você está convidando.',
  'limite de 3 familias por pessoa': 'Cada pessoa cria no máximo 3 famílias.',
  'login da equipe nao cria familia': 'O login da equipe não cria família. Entre com o seu e-mail.',
  'o valor tem que ser maior que zero': 'O valor tem que ser maior que zero.',
  'so o casal e a equipe da casa veem esta tela': 'Só o casal e a equipe da casa veem esta tela.',
  'so o casal e a equipe da casa marcam a casa': 'Só o casal e a equipe da casa marcam a casa.',
  'item nao encontrado na lista': 'Esse item não está mais na lista.',
  'prestador nao encontrado': 'Esse serviço não está mais cadastrado.',
  // entrada da equipe pelo link do convite
  'Abra o link do convite que te mandaram e digite os 4 numeros.': 'Abra o link do convite que te mandaram e digite os 4 números.',
  'abra a sessao antes (login anonimo)': 'Não deu pra abrir a entrada da equipe. Feche e abra o link de novo.',
  'ja existem 5 codigos abertos nesta familia; use um deles ou espere vencer': 'Já existem 5 códigos abertos nesta família. Use um deles ou espere vencer (24 horas).',
  'muitos convites abertos agora; tente de novo em alguns minutos': 'Muitos convites abertos agora. Tente de novo em alguns minutos.',
  // convite por e-mail (casal e pessoa)
  'entre com o e-mail do convite': 'Entre com o mesmo e-mail que recebeu o convite.',
  'confirme o seu e-mail com o codigo de 6 numeros antes de entrar na familia': 'Confirme o seu e-mail com o código de 6 números antes de entrar na família.',
  'entre com o codigo de 6 numeros enviado pro e-mail do convite': 'Pra entrar na família, saia e entre de novo com o código de 6 números que chega no e-mail do convite.',
  'esse e-mail ja foi convidado nesta familia': 'Esse e-mail já foi convidado nesta família. A pessoa só precisa entrar com ele.',
  'a familia ja tem 50 pessoas': 'A família já tem 50 pessoas.',
  'falta o nome (ate 80 letras)': 'Falta o nome (até 80 letras).',
  'papel tem que ser casal, pessoa ou equipe': 'O convite tem que ser pra casal, pessoa ou equipe.',
  // limite e lançamento
  'so o casal muda o limite': 'Só o casal muda o limite.',
  'o limite tem que ser um valor de zero pra cima': 'O limite tem que ser um valor de zero pra cima.',
  'envelope nao encontrado': 'Esse limite não existe mais. Feche e abra a tela de novo.',
  'falta a chave do toque': 'Não deu pra marcar o toque. Feche o Lançar e abra de novo.',
  'esse lancamento ja foi gravado (mesma chave)': 'Esse lançamento já foi gravado. Confira em Lançamentos.',
  'o valor passou de 1 milhao; confira os numeros': 'O valor passou de 1 milhão. Confira os números.',
  'a data esta fora do calendario do app': 'A data está fora do calendário do app.',
  'precisa entrar no app antes de lancar': 'Entre no app antes de lançar.',
  'sem acesso a esta familia': 'Você não faz parte dessa família.',
}

/** Erros do convite por e-mail que a pessoa precisa ler (os outros são só "não tinha convite"). */
export const AVISOS_CONVITE = ['entre com o e-mail do convite', 'confirme o seu e-mail com o codigo de 6 numeros antes de entrar na familia', 'entre com o codigo de 6 numeros enviado pro e-mail do convite']

/** O banco não tem essa função (ou não com esses parâmetros): PostgREST PGRST202 ou Postgres 42883. */
export function funcaoNaoExiste(e: { message?: string; code?: string } | null | undefined): boolean {
  return e?.code === 'PGRST202' || e?.code === '42883' || /could not find the function|function .* does not exist|schema cache/i.test(e?.message || '')
}

export function traduzErro(e: { message?: string; code?: string; status?: number } | null | undefined): Error {
  const m = e?.message || 'Não deu certo'
  // rede primeiro: Chrome "Failed to fetch", Firefox "NetworkError", Safari e iPhone "Load failed"
  if (/Failed to fetch|NetworkError|Load failed|network request failed|fetch failed|network connection was lost|timed? ?out/i.test(m)) return new ErroRede()
  if (e?.status === 401 || e?.code === 'PGRST301' || /JWT|not authenticated|session.?(not.?found|missing|expired)|refresh token|invalid claim/i.test(m)) return new ErroSessao()
  // tranca do banco recusou: NÃO é sessão vencida (antes o app mandava entrar de novo à toa)
  if (/permission denied|row-level security/i.test(m)) return new Error('Você não tem permissão pra fazer isso nesta família.')
  if (/apagar_familia/i.test(m) && /not find|does not exist|schema cache/i.test(m)) return new Error('Apagar a família ainda não está ligado no banco (falta o dono rodar 1 passo). Seus dados continuam guardados.')
  if (funcaoNaoExiste(e)) return new Error('O banco ainda não tem essa função ligada. Avise o dono do app: nada foi gravado.')
  // login por código (Supabase Auth responde em inglês)
  if (/token has expired or is invalid|otp.*(expired|invalid)|invalid.*otp/i.test(m)) return new Error('Código errado ou vencido. Confira os 6 números ou peça outro código.')
  if (/rate limit|only request this after|too many requests/i.test(m) || e?.status === 429) return new Error('Muitos pedidos seguidos. Espere 1 minuto e tente de novo.')
  if (/signups? not allowed|signup is disabled/i.test(m)) return new Error('A entrada de gente nova está desligada no banco. Fale com quem te convidou.')
  if (/anonymous sign-?ins are disabled/i.test(m)) return new Error('A entrada da equipe ainda não está ligada no banco. Peça pro casal ligar o "login anônimo" no Supabase.')
  return new Error(TRADUZ[m] || m)
}

/** Login anônimo (equipe) que não entrou em nenhuma família não é sessão: volta pra tela de entrar, nunca pro "criar família". */
export function sessaoVale(anonimo: boolean, familias: number): boolean {
  return !(anonimo && familias === 0)
}
