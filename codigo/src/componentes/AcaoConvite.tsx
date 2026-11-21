import type { ReactNode } from 'react'
import { useAcoes } from '../app/contexto'

/** Link de WhatsApp com dado da família: com o olho fechado não abre mensagem trocada, pede para abrir o olho. */
export function AcaoConvite({
  classe,
  oculto,
  url,
  aoAbrir,
  children,
}: {
  classe: string
  oculto: boolean
  url: () => string
  aoAbrir?: () => void
  children: ReactNode
}) {
  const { toast } = useAcoes()
  return oculto ? (
    <button className={classe} type="button" onClick={() => toast('Abra o olho para compartilhar este convite.')}>
      {children}
    </button>
  ) : (
    <a className={classe} target="_blank" rel="noreferrer" href={url()} onClick={aoAbrir}>
      {children}
    </a>
  )
}
