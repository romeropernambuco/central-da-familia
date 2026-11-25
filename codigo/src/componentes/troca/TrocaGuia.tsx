import { BookOpenCheck, PlaneTakeoff, Tag } from 'lucide-react'
import { useOculto } from '../../app/useOculto'
import { reais } from '../../lib/formato'
import { textoPrivado } from '../../lib/olho'
import { buscasDoUsado } from '../../lib/troca/nova'
import type { Troca } from '../../lib/troca/tipos'
import { Icone } from '../Icone'
import { fala, Fontes, LinkFora } from './partes'

/** Por quanto anunciar o usado e os anúncios que serviram de base. Sem anúncio guardado, mostra a busca pronta. */
export function TrocaVenda({ t }: { t: Troca }) {
  useOculto()
  const buscas = buscasDoUsado(t.usado)
  return (
    <section className="card" aria-labelledby="trocaVender">
      <div className="card-h">
        <h2 id="trocaVender">
          <Icone desenho={Tag} aria-hidden="true" />
          Por quanto vender o {textoPrivado(t.usado) || 'usado'}
          {t.para ? ` em ${t.para}` : ''}
        </h2>
        {t.anunciar > 0 && !t.textos.venda && <span className="chip">anunciar por {reais(t.anunciar)}</span>}
      </div>
      {t.textos.venda && <p className="corpo">{fala(t.textos.venda)}</p>}
      {t.referencias.length > 0 && (
        <ul className="list troca-anuncios">
          {t.referencias.map(r => (
            <li key={r.link} className="li">
              <span className="m">
                <b className="quebra">
                  <LinkFora rotulo={r.local} link={r.link} />
                </b>
                <small>{fala(r.detalhe)}</small>
              </span>
              <span className="v din">{reais(r.preco)}</span>
            </li>
          ))}
        </ul>
      )}
      {t.textos.vendaRodape && <p className="sub">{t.textos.vendaRodape}</p>}
      {buscas.length > 0 && (
        <p className="troca-links">
          {buscas.map(b => (
            <a key={b.link} className="btn line sm" href={b.link} target="_blank" rel="noopener noreferrer">
              {b.rotulo}
            </a>
          ))}
        </p>
      )}
    </section>
  )
}

/** O passo a passo na loja e no aeroporto, e a frase pronta na língua de lá. */
export function TrocaNaLoja({ t }: { t: Troca }) {
  if (!t.passos.length && !t.frase) return null
  return (
    <section className="card" aria-labelledby="trocaLoja">
      <div className="card-h">
        <h2 id="trocaLoja">
          <Icone desenho={PlaneTakeoff} aria-hidden="true" />
          Na loja e no aeroporto
        </h2>
        {t.passos.length > 0 && <span className="sub">{t.passos.length} passos</span>}
      </div>
      <ol className="troca-passos">
        {t.passos.map((p, i) => (
          <li key={i}>
            {textoPrivado(p.texto)}
            {p.link && (
              <>
                {' '}
                <LinkFora {...p.link} />
              </>
            )}
          </li>
        ))}
      </ol>
      {t.frase && (
        <div className="troca-frase">
          <span className="lbl">{t.frase.rotulo}</span>
          <p lang={t.frase.idioma || undefined}>{t.frase.texto}</p>
        </div>
      )}
    </section>
  )
}

/** As regras de cada cartão e de onde saiu cada número. */
export function TrocaRegras({ t }: { t: Troca }) {
  if (!t.regras.length && !t.fontes.length) return null
  return (
    <section className="card" aria-labelledby="trocaRegras">
      <div className="card-h">
        <h2 id="trocaRegras">
          <Icone desenho={BookOpenCheck} aria-hidden="true" />
          Regras dos cartões e fontes
        </h2>
      </div>
      <ul className="troca-regras">
        {t.regras.map(r => (
          <li key={r.titulo}>
            <b>{r.titulo}:</b> {r.texto}
            {r.fontes.length > 0 && (
              <>
                {' '}
                <Fontes fontes={r.fontes} />
              </>
            )}
          </li>
        ))}
      </ul>
      {t.fontes.length > 0 && (
        <p className="sub">
          <Fontes fontes={t.fontes} />
        </p>
      )}
      {t.textos.fontesRodape && <p className="sub">{t.textos.fontesRodape}</p>}
    </section>
  )
}
