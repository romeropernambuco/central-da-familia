import type { Papel } from '../../api/tipos'

const DIREITOS: Record<Exclude<Papel, 'equipe'>, string> = {
  casal: 'Você pode baixar tudo a qualquer hora e apagar a família inteira. Apagar é de vez e não tem volta.',
  pessoa: 'Você pode baixar os seus dados a qualquer hora. Apagar a família inteira é com o casal.',
}

/**
 * Os três textos do termo que dão confiança: o que o app não guarda, o que a IA faz e não faz,
 * e os direitos de quem usa. Quem ajuda na casa não tem dados próprios a baixar, então não vê a parte de direitos.
 */
export function TextosDeConfianca({ papel }: { papel: Papel | null }) {
  const direitos = papel && papel !== 'equipe' ? DIREITOS[papel] : null
  return (
    <>
      <h3>O que não guardamos</h3>
      <p>
        Não guardamos senha de banco nem o número do cartão. Do cartão ficam só o apelido, os dias de fechar e de vencer
        e, se você quiser, os 4 últimos números.
      </p>
      <h3>Inteligência artificial</h3>
      <p>
        A IA só lê a foto do cupom quando você manda, e mostra o resultado para você conferir antes de salvar. As contas
        de dinheiro são feitas pelo app e pelo banco de dados, nunca pela IA. Se o cupom tiver CPF, a IA não devolve o
        CPF.
      </p>
      {direitos && (
        <>
          <h3>Seus direitos (LGPD)</h3>
          <p>{direitos}</p>
        </>
      )}
    </>
  )
}
