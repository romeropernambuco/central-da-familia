import { useState, type ReactNode } from 'react'
import { Icone, type NomeIcone } from './Icone'
import './inicio-novo.css'

/** Um jeito de olhar o dinheiro: hoje, este mês ou o plano. Cada um tem um número e 1 frase. */
export type HorizonteInicio = {
  chave: string
  aba: string
  rotulo: string
  numero: ReactNode
  apoio?: ReactNode
  /** quanto do combinado já foi, de 0 a 1; sem valor (ou com o olho fechado), a barra não aparece */
  barra?: number | null
  href: string
  abrir: string
}
export type AtalhoInicio = {
  chave: string
  titulo: string
  icone: NomeIcone
  href: string
  numero: ReactNode
  legenda?: ReactNode
}

function Atalhos({ atalhos }: { atalhos: AtalhoInicio[] }) {
  return (
    <div className="ini4-atalhos" role="group" aria-label="A família agora">
      <h2>A família agora</h2>
      {atalhos.map(a => (
        <a key={a.chave} className="ini4-atalho" href={a.href} data-atalho={a.chave}>
          <span className="ini4-atalho-ico" aria-hidden="true">
            <Icone nome={a.icone} size={20} />
          </span>
          <span className="ini4-atalho-t">
            <b>{a.titulo}</b>
            {a.legenda && <small>{a.legenda}</small>}
          </span>
          <span className="ini4-atalho-n">{a.numero}</span>
          <Icone nome="abrir" size={16} />
        </a>
      ))}
    </div>
  )
}

/**
 * Início reformulado (25/11): o dia no topo, com um número só que troca entre Hoje, Este mês e 2029;
 * ao lado, a família em 3 atalhos; depois o Escritório inteiro; por fim o plano, os lançamentos e o resto.
 * Este componente só arruma a tela: os números e os blocos chegam prontos de quem chama.
 */
export function InicioNovo({
  celular,
  saudacao,
  horizontes,
  atalhos,
  anotar,
  escritorio,
  plano,
  lancamentos,
  resumo,
}: {
  celular: boolean
  saudacao?: string
  horizontes: HorizonteInicio[]
  atalhos: AtalhoInicio[]
  anotar?: () => void
  escritorio: ReactNode
  plano?: ReactNode
  lancamentos: ReactNode
  resumo: ReactNode
}) {
  const [aba, setAba] = useState(horizontes[0]?.chave)
  const h = horizontes.find(x => x.chave === aba) ?? horizontes[0]
  const trocar = (passo: number) => {
    const i = horizontes.findIndex(x => x.chave === h?.chave)
    const proximo = horizontes[(i + passo + horizontes.length) % horizontes.length]
    if (!proximo) return
    setAba(proximo.chave)
    document.getElementById('ini4-aba-' + proximo.chave)?.focus()
  }
  return (
    <>
      <div className="j-inicio inicio-j ini4" data-dispositivo={celular ? 'celular' : 'desktop'}>
        <section className="ini4-dia" aria-label="Seu dia">
          <div className="ini4-foco">
            {saudacao && <p className="ini4-ola">{saudacao}</p>}
            {horizontes.length > 1 && (
              <div
                className="ini4-abas"
                role="tablist"
                aria-label="Olhar para"
                onKeyDown={e => {
                  if (e.key === 'ArrowRight') trocar(1)
                  if (e.key === 'ArrowLeft') trocar(-1)
                }}
              >
                {horizontes.map(x => (
                  <button
                    key={x.chave}
                    id={'ini4-aba-' + x.chave}
                    type="button"
                    role="tab"
                    aria-selected={x.chave === h?.chave}
                    aria-controls="ini4-painel"
                    tabIndex={x.chave === h?.chave ? 0 : -1}
                    data-referencia={x.chave}
                    onClick={() => setAba(x.chave)}
                  >
                    {x.aba}
                  </button>
                ))}
              </div>
            )}
            {h && (
              <div
                className="ini4-painel"
                id="ini4-painel"
                role="tabpanel"
                aria-labelledby={horizontes.length > 1 ? 'ini4-aba-' + h.chave : undefined}
                key={h.chave}
              >
                <p className="ini4-rotulo">{h.rotulo}</p>
                <div className="ini4-numero">{h.numero}</div>
                {h.barra != null && (
                  <div className="ini4-barra" data-passou={h.barra > 1 || undefined} aria-hidden="true">
                    <i style={{ inlineSize: Math.round(Math.max(0, Math.min(1, h.barra)) * 100) + '%' }} />
                  </div>
                )}
                {h.apoio && <div className="ini4-apoio">{h.apoio}</div>}
              </div>
            )}
            <div className="ini4-acoes">
              {anotar && (
                <button type="button" className="ini4-botao" onClick={anotar}>
                  <Icone nome="lancar" size={18} />
                  Anotar gasto
                </button>
              )}
              {h && (
                <a className="ini4-link" href={h.href}>
                  {h.abrir} <Icone nome="abrir" size={16} />
                </a>
              )}
            </div>
          </div>
          {atalhos.length > 0 && <Atalhos atalhos={atalhos} />}
        </section>
        <section className="j-cena ini4-escritorio" aria-label="Painel do escritório">
          {escritorio}
        </section>
        {plano}
      </div>
      <div className="view inicio-f29 inicio-j-detalhes ini4-detalhes">
        {lancamentos}
        {resumo}
      </div>
    </>
  )
}
