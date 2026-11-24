import { useState } from 'react'
import { grupoDoGasto, TIPOS_DO_GASTO } from '../lib/iconeDoGasto'
import { textoPrivado } from '../lib/olho'
import { Icone } from './Icone'
import './escolher-tipo.css'

/**
 * O tipo do gasto na hora de anotar (24/11/2026). Fechado, mostra o tipo que o app adivinhou pelo nome
 * ("Mercado, pelo nome") e um "Trocar". Aberto, mostra todos os tipos para 1 toque.
 * `tipo` vazio = deixar o app adivinhar pelo nome (nada é gravado).
 */
export function EscolherTipo({
  descricao,
  tipo,
  mudar,
}: {
  descricao: string
  tipo: string
  mudar: (tipo: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  const g = grupoDoGasto(descricao, null, tipo || null)
  const semNada = !tipo && !descricao.trim()
  return (
    <div className="tipo-gasto">
      <p className="tipo-linha">
        <span className="atl">Tipo</span>
        <span className="tipo-atual">
          {semNada ? (
            <span className="tipo-vazio">Escolha, se quiser</span>
          ) : (
            <>
              {g.icone ? <Icone desenho={g.icone} aria-hidden="true" /> : <Icone nome="gasto" />}
              <b>{textoPrivado(g.nome)}</b>
              {!tipo && <small>pelo nome</small>}
            </>
          )}
        </span>
        <button type="button" className="lnk tipo-trocar" aria-expanded={aberto} onClick={() => setAberto(a => !a)}>
          {aberto ? 'Fechar' : semNada ? 'Escolher' : 'Trocar'}
        </button>
      </p>
      {aberto && (
        <div className="tipo-opcoes" role="group" aria-label="Tipo do gasto">
          {TIPOS_DO_GASTO.map(t => (
            <button
              key={t.nome}
              type="button"
              className="pill"
              aria-pressed={tipo === t.nome}
              onClick={() => {
                mudar(t.nome)
                setAberto(false)
              }}
            >
              {t.icone ? <Icone desenho={t.icone} aria-hidden="true" /> : <Icone nome="gasto" />}
              {t.nome}
            </button>
          ))}
          {tipo && (
            <button
              type="button"
              className="pill tipo-pelo-nome"
              onClick={() => {
                mudar('')
                setAberto(false)
              }}
            >
              Deixar o app adivinhar pelo nome
            </button>
          )}
        </div>
      )}
    </div>
  )
}
