// A REGRA DO OLHO FECHADO MORA AQUI, E SÓ AQUI.
// Olho fechado = ninguém ao lado (fila do mercado, criança olhando) consegue ler valor, nome ou saldo na tela.
// A escolha vale só neste aparelho. Toda tela e toda peça pergunta a este arquivo; nenhuma inventa a própria máscara.
// O teste src/olho.test.ts reprova pontinhos escritos à mão ou uma segunda cópia destas funções em outro lugar.

/** O que aparece no lugar de um texto escondido. */
export const PONTOS = '•••'
/** A variante de quatro pontos do resumo do Início e dos saldos de conta. */
export const PONTOS_LONGOS = '••••'
/** O que aparece no lugar de um valor em dinheiro. O espaço não quebra: "R$" nunca fica sozinho no fim da linha. */
export const VALOR_OCULTO = `R$\u00a0${PONTOS}`

let valoresEscondidos = false
/** Fecha ou abre o olho. Quem chama é o app (app/useOlho.ts), a cada desenho. */
export const esconderValores = (sim: boolean) => {
  valoresEscondidos = sim
}
/** O olho está fechado agora? */
export const valoresOcultos = () => valoresEscondidos

/** Troca "R$ 1.234,56" dentro de qualquer frase (fala de funcionário, aviso) por "R$ •••". */
export function mascararTexto(s: string): string {
  return s.replace(/(passou\s)?R\$[\s\u00a0]*\d(?:[\d.]*\d)?(,\d{1,2})?/g, VALOR_OCULTO)
}

/** Esconde um texto inteiro (nome, título, dica). Vale também para atributos. Nunca altera o dado de origem. */
export function textoPrivado<T>(texto: T, oculto = valoresOcultos()): T {
  return (oculto && typeof texto === 'string' && texto !== '' ? PONTOS : texto) as T
}

/** Único caminho para copiar: sem uma versão segura do texto, o olho fechado bloqueia e avisa. */
export async function copiarProtegido(
  texto: string,
  protegido?: string,
  avisar: (s: string) => void = s => {
    if (typeof window !== 'undefined') window.alert?.(s)
  },
  oculto = valoresOcultos(),
): Promise<boolean> {
  if (oculto && protegido === undefined) {
    avisar('Abra o olho para copiar este conteúdo privado.')
    return false
  }
  try {
    await navigator.clipboard.writeText(oculto ? protegido! : texto)
    return true
  } catch {
    avisar('Não foi possível copiar. Tente novamente.')
    return false
  }
}
