import { useState, type ReactNode } from 'react'
import { lerDecimal, semZeros } from '../../lib/troca/formato'
import { mascararTexto, valoresOcultos } from '../../lib/olho'
import type { ContaDaTroca } from '../../lib/troca/conta'
import type { LinkTroca, Troca } from '../../lib/troca/tipos'
import { CampoDecimal } from '../privacidade'

/** O que cada bloco da tela recebe: a comparação, a conta pronta (ou nada, se há erro) e como mudar um campo. */
export interface BlocoDaTroca {
  t: Troca
  conta: ContaDaTroca | null
  mudar: (parte: Partial<Troca>) => void
}

/** Texto de apoio que cita valores ("contar com R$ 8.000"): com o olho fechado, os valores somem. */
export const fala = (txt: string) => (valoresOcultos() ? mascararTexto(txt) : txt)

const escrito = (v: number | null) => (v == null || !Number.isFinite(v) ? '' : semZeros(v))

/**
 * Campo de câmbio, taxa ou porcentagem. Guarda o texto enquanto a pessoa digita e avisa o número a cada tecla.
 * Campo obrigatório vazio ou com letra avisa "sem número" (NaN), e a conta mostra o erro em vez de um valor errado.
 */
export function CampoNumero({
  rotulo,
  valor,
  mudar,
  ajuda,
  opcional = false,
  seVazio,
}: {
  rotulo: string
  valor: number | null
  mudar: (v: number | null) => void
  ajuda?: ReactNode
  opcional?: boolean
  /** O que aparece no campo opcional vazio (o valor que a conta usa nesse caso). */
  seVazio?: string
}) {
  const [txt, setTxt] = useState(escrito(valor))
  const [visto, setVisto] = useState(valor)
  if (!Object.is(visto, valor)) {
    setVisto(valor)
    // mudou por fora (restaurar, câmbio buscado): o campo acompanha; se foi a própria digitação, fica como está
    const digitado = txt.trim() === '' ? null : lerDecimal(txt)
    if (!Object.is(digitado ?? (opcional ? null : NaN), valor)) setTxt(escrito(valor))
  }
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <CampoDecimal
        className="inp"
        value={txt}
        placeholder={seVazio}
        aria-label={rotulo}
        onChange={e => {
          const novo = e.target.value
          setTxt(novo)
          if (novo.trim() === '') mudar(opcional ? null : NaN)
          else mudar(lerDecimal(novo) ?? NaN)
        }}
      />
      {ajuda && <small>{ajuda}</small>}
    </label>
  )
}

/** Uma linha de conta: o que é, à esquerda; quanto, à direita. */
export function Linha({ nome, valor, tom }: { nome: ReactNode; valor: ReactNode; tom?: 'volta' | 'custa' }) {
  return (
    <li className={tom ? 'troca-' + tom : undefined}>
      <span>{nome}</span>
      <b>{valor}</b>
    </li>
  )
}

/** Link para fora do app. Sempre em outra aba e sem contar de onde veio. */
export function LinkFora({ rotulo, link }: LinkTroca) {
  return (
    <a href={link} target="_blank" rel="noopener noreferrer">
      {rotulo}
    </a>
  )
}

/** Fontes numa linha só, separadas por ponto. */
export function Fontes({ fontes }: { fontes: LinkTroca[] }) {
  return (
    <>
      {fontes.map((f, i) => (
        <span key={f.link + i}>
          {i > 0 && ' · '}
          <LinkFora {...f} />
        </span>
      ))}
    </>
  )
}
