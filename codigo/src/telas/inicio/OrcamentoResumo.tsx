import { memo, useCallback, useEffect, useId, useState } from 'react'
import { useOlhoApp, useSessaoAtual } from '../../app/contexto'
import { Din } from '../../componentes/base'
import { EnvelopeCard } from '../../componentes/EnvelopeCard'
import { Icone } from '../../componentes/Icone'
import { mesLongo } from '../../lib/formato'
import { primeiroDoMesQueVem } from '../../lib/resumo/orcamento'
import type { ResumoFamilia } from '../../lib/resumo/tipos'

const desktop = '(min-width: 800px)'
const escolhas = new Map<string, boolean>()

function consultarLargura() {
  return typeof window !== 'undefined' ? window.matchMedia?.(desktop) : undefined
}

export function useOrcamentoAberto() {
  const { familia, sessao } = useSessaoAtual() ?? {}
  const chave = JSON.stringify([sessao?.userId, familia?.id, familia?.membroId, familia?.papel])
  const [largo, setLargo] = useState(() => consultarLargura()?.matches ?? false)
  const [escolha, setEscolha] = useState(() => escolhas.get(chave))
  const aberto = escolha ?? largo
  useEffect(() => {
    const media = consultarLargura()
    if (!media) return
    const atualiza = () => setLargo(media.matches)
    atualiza()
    media.addEventListener('change', atualiza)
    return () => media.removeEventListener('change', atualiza)
  }, [])
  const alternar = useCallback(() => {
    escolhas.set(chave, !aberto)
    setEscolha(!aberto)
  }, [chave, aberto])
  return { aberto, alternar }
}

export const OrcamentoResumo = memo(function OrcamentoResumo({
  campo,
  hoje,
  repetir,
  aberto,
  alternar,
}: {
  campo: ResumoFamilia['podeGastarHoje']
  hoje: string
  repetir: () => void
  aberto: boolean
  alternar: () => void
}) {
  const { familia } = useSessaoAtual() ?? {}
  const { oculto } = useOlhoApp() ?? {}
  const id = useId()
  if (campo.estado === 'restrito' || !familia || familia.papel === 'equipe') return null

  const p = campo.valor
  const meu = p?.envelope
  const outros = p?.envelopes.filter(e => e.id !== meu?.id) ?? []
  const placar = familia.papel === 'casal' ? p?.placar : null
  const proximoMes = mesLongo(primeiroDoMesQueVem(hoje))
  return (
    <section className="resumo-item resumo-orcamento" aria-labelledby={`${id}-titulo`}>
      <h3 id={`${id}-titulo`}>
        <button type="button" className="resumo-expandir" aria-expanded={aberto} aria-controls={id} onClick={alternar}>
          Seu orçamento e envelopes <Icone nome="abrir" aria-hidden="true" />
        </button>
      </h3>
      <div id={id} hidden={!aberto}>
        {aberto && (
          <div className="resumo-envelopes" aria-busy={campo.estado === 'carregando'}>
            {campo.estado === 'carregando' && (
              <p className="resumo-esqueleto" role="status">
                Conferindo envelopes...
              </p>
            )}
            {campo.estado === 'erro' && (
              <button type="button" className="lnk" onClick={repetir}>
                Tentar conferir os envelopes de novo
              </button>
            )}
            {meu && (
              <EnvelopeCard
                e={meu}
                diasRestantes={p.diasRestantes}
                resumo={{ compacto: false, principal: p.valor.valor }}
              />
            )}
            {p && outros.length > 0 && (
              <ul className="resumo-outros">
                {outros.map(e => (
                  <li key={e.id}>
                    <EnvelopeCard e={e} diasRestantes={p.diasRestantes} resumo={{ compacto: true }} />
                  </li>
                ))}
              </ul>
            )}
            {p?.placarIndisponivel && <p className="sub">Placar do casal indisponível.</p>}
            {placar && (
              <section className={`placar${oculto ? '' : placar.passam.length ? ' warn' : ' ok'}`}>
                <h4>O casal, se continuar assim</h4>
                {oculto ? (
                  <p>Valores escondidos</p>
                ) : (
                  <>
                    {placar.passam.length ? (
                      <p>O que passa sai de {proximoMes}.</p>
                    ) : (
                      <p>
                        Juntos, sobram <Din v={placar.sobra} /> no fim do mês.
                      </p>
                    )}
                    <ul className="pes">
                      {placar.pessoas.map((pessoa, i) => (
                        <li key={i}>
                          {pessoa.nome}
                          {pessoa.eu ? ' (você)' : ''} ·{' '}
                          {pessoa.passa ? (
                            <>
                              {pessoa.excessoAtual === null ? 'vai passar' : 'passou'}{' '}
                              <Din v={pessoa.excessoAtual ?? pessoa.excessoPrevisto} />
                            </>
                          ) : (
                            <>
                              fecha com <Din v={pessoa.fecha} />
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}
            {campo.estado !== 'carregando' && campo.estado !== 'erro' && !meu && outros.length === 0 && (
              <p className="sub">Ainda sem envelopes.</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
})
