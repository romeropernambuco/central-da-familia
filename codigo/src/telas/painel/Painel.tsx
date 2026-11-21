import { textoPrivado } from '../../lib/olho'
import './painel.css'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { Icone } from '../../componentes/Icone'
import { useEffect, useState } from 'react'
import { CircleCheck, TriangleAlert, Lock } from 'lucide-react'
import { useSessaoAtual } from '../../app/contexto'
import type { Numero } from '../../api/tipos'
import { RumoA2029 } from '../../componentes/RumoA2029'

/** Painel dos 4 números: só o dono do produto vê (a função do banco recusa os outros). */
export function Painel() {
  const { api, sessao } = useSessaoAtual()
  const [nums, setNums] = useState<Numero[] | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => {
    api
      .numerosSemana()
      .then(setNums)
      .catch(e => setErro((e as Error).message))
  }, [api])
  if (!sessao?.dono)
    return (
      <div className="card">
        <p className="todo">
          <Icone desenho={Lock} aria-hidden="true" />
          Esta tela é só do dono do produto.
        </p>
      </div>
    )
  return (
    <div className="view painel-f29">
      <RumoA2029 oficial />
      <p className="sub">
        Os 4 números que dizem se o app está funcionando, olhados toda segunda. Cada card explica de onde vem.
      </p>
      {erro && (
        <div role="alert">
          <EstadoVazio ilustracao="Erro" titulo="Não foi possível abrir os números" frase={textoPrivado(erro)} />
        </div>
      )}
      {!erro && !nums && (
        <div role="status">
          <EstadoVazio ilustracao="Carregando" titulo="Abrindo o painel" frase="Buscando os números da semana…" />
        </div>
      )}
      {!erro && nums?.length === 0 && (
        <EstadoVazio
          ilustracao="TudoEmDia"
          titulo="Nenhum número nesta consulta"
          frase="Os indicadores aparecem quando estiverem disponíveis."
        />
      )}
      <div className="nums">
        {(nums || []).map(n => (
          <section className="card" key={n.chave} aria-label={textoPrivado(n.nome)}>
            <div className="card-h">
              <h2>{textoPrivado(n.nome)}</h2>
              <span className={'chip ' + (n.ok ? 'ok' : 'warn')}>
                {n.ok ? <Icone desenho={CircleCheck} /> : <Icone desenho={TriangleAlert} />}
                {n.meta}
              </span>
            </div>
            <p className="din big">{textoPrivado(n.texto)}</p>
            <p className="sub" style={{ marginTop: 6 }}>
              <b>De onde veio esse número?</b> {textoPrivado(n.explicacao)}
            </p>
          </section>
        ))}
      </div>
    </div>
  )
}
