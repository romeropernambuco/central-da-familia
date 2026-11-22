import { useEffect, useState } from 'react'
import { Plane, Plus } from 'lucide-react'
import type { Etiqueta } from '../../api/tipos'
import { falhaDeLeitura } from '../../app/falhasDeLeitura'
import { useDadosDoDia, useSessaoAtual } from '../../app/contexto'
import { Botao, Din } from '../../componentes/base'
import { Icone } from '../../componentes/Icone'
import { textoPrivado } from '../../lib/olho'
import { periodoDaEtiqueta, simboloMoeda } from '../../lib/etiquetas'
import { useOculto } from '../../app/useOculto'
import { NovaEtiqueta } from './NovaEtiqueta'
import { Viagem } from './Viagem'
import './viagens.css'

/**
 * Viagens e eventos: cada etiqueta junta os gastos de uma viagem sem mexer nos limites.
 * O casal cria, abre e vê os totais. A pessoa da família vê só os nomes. A equipe não vê nada.
 */
export function Viagens() {
  const { api, familia } = useSessaoAtual()
  const { versao } = useDadosDoDia()
  const oculto = useOculto()
  const [lista, setLista] = useState<Etiqueta[] | null>(null)
  const [n, setN] = useState(0)
  const [aberta, setAberta] = useState<Etiqueta | null>(null)
  const [folha, setFolha] = useState<Etiqueta | 'nova' | null>(null)
  const casal = familia?.papel === 'casal'
  const pode = !!familia && familia.papel !== 'equipe' && !!api.etiquetas
  const fid = pode ? familia.id : ''
  useEffect(() => {
    if (!fid) return
    let vivo = true
    api.etiquetas!(fid)
      .then(l => {
        if (vivo) setLista(l)
      })
      .catch(falhaDeLeitura('as etiquetas'))
    return () => {
      vivo = false
    }
  }, [api, fid, versao, n])
  // quem não é do casal só vê a seção quando existe alguma etiqueta pra ler
  if (!pode || (!casal && !lista?.length)) return null
  const detalhe = (e: Etiqueta) =>
    [
      periodoDaEtiqueta(e),
      e.lancamentos === 1 ? '1 gasto' : `${e.lancamentos} gastos`,
      e.moeda !== 'BRL' ? `em ${simboloMoeda(e.moeda)}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  return (
    <section className="card viagens" aria-labelledby="vgTitulo" data-secao="viagens">
      <div className="card-h">
        <h2 id="vgTitulo">
          <Icone desenho={Plane} />
          Viagens e eventos
        </h2>
        {casal && (
          <button className="lnk" type="button" onClick={() => setFolha('nova')}>
            <Icone desenho={Plus} />
            Nova etiqueta
          </button>
        )}
      </div>
      <p className="sub">
        {casal
          ? 'A etiqueta junta os gastos de uma viagem ou de um evento. O gasto continua contando no limite dele.'
          : 'Etiquetas que o casal criou. Os totais ficam com o casal.'}
      </p>
      {lista === null && <p className="sub">Buscando as etiquetas…</p>}
      {lista?.length === 0 && (
        <Botao variante="secundario" type="button" onClick={() => setFolha('nova')}>
          <Icone desenho={Plus} />
          Criar a primeira etiqueta
        </Botao>
      )}
      {!!lista?.length && (
        <ul className="list">
          {lista.map(e => (
            <li key={e.id}>
              {casal ? (
                <button className="li" type="button" onClick={() => setAberta(e)}>
                  <span className="tile">
                    <Icone desenho={Plane} />
                  </span>
                  <span className="m">
                    <b>{textoPrivado(e.nome, oculto)}</b>
                    <small>{textoPrivado(detalhe(e), oculto)}</small>
                  </span>
                  <span className="v viagens-valor">
                    <Din v={e.total ?? 0} />
                    <Icone nome="abrir" className="muted" />
                  </span>
                </button>
              ) : (
                <div className="li">
                  <span className="tile">
                    <Icone desenho={Plane} />
                  </span>
                  <span className="m">
                    <b>{textoPrivado(e.nome, oculto)}</b>
                    <small>{textoPrivado(periodoDaEtiqueta(e), oculto)}</small>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {aberta && (
        <Viagem
          etiqueta={aberta}
          fechar={() => setAberta(null)}
          mudar={() => {
            setFolha(aberta)
            setAberta(null)
          }}
        />
      )}
      {folha && (
        <NovaEtiqueta
          atual={folha === 'nova' ? null : folha}
          fechar={() => setFolha(null)}
          salvou={() => {
            setFolha(null)
            setN(x => x + 1)
          }}
        />
      )}
    </section>
  )
}
