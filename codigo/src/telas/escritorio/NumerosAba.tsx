import { useEffect, useState } from 'react'
import { Din } from '../../componentes/base'
import { useApp } from '../../app/contexto'
import { ir } from '../../app/App'
import { rotaPermitida } from '../../app/rotas'
import { ErroSessao } from '../../api/erros'
import { POR_ID } from './equipe'
import { numerosDaAba, numerosExemplo, type Indicador } from './numeros'

export function NumerosAba({ id, fechar }: { id: string; fechar: () => void }) {
  const { api, familia, sessao, versao, tentar } = useApp()
  const membro = POR_ID[id]
  const [resultado, setResultado] = useState<{ numeros: Indicador[]; exemplo: boolean } | null>(null)
  const [erro, setErro] = useState(false)
  const permitido = !!familia && !!membro && rotaPermitida(membro.rota, familia.papel, sessao?.dono) === membro.rota
  useEffect(() => {
    setResultado(null); setErro(false)
    if (!familia || !membro || !permitido) return
    let vivo = true
    numerosDaAba(api, familia, membro.rota)
      .then(numeros => { if (vivo) setResultado({ numeros, exemplo: api.modo === 'exemplo' }) })
      .catch(async erro => {
        if (!vivo) return
        if (erro instanceof ErroSessao) {
          setErro(true)
          await tentar(async () => { throw erro })
          return
        }
        try {
          const numeros = await numerosExemplo(membro.rota)
          if (vivo) setResultado({ numeros, exemplo: true })
        } catch { if (vivo) setErro(true) }
      })
    return () => { vivo = false }
  }, [api, familia?.id, familia?.membroId, familia?.envelopeId, sessao?.userId, id, permitido, versao])
  if (!membro) return null
  return <section aria-label="Resumo da aba">
    <p>{membro.papel}</p>
    {!permitido ? <p className="sub">Esta aba está restrita ao perfil autorizado.</p> : <>
      <p className="sub">{resultado?.exemplo ? 'Modo exemplo — estes números não são da sua família.' : 'Números da aba, nas mesmas leituras usadas pelo app.'}</p>
      {!resultado && !erro && <p role="status">Consultando os números…</p>}
      {erro && <p role="status">Não foi possível carregar os números nem o exemplo.</p>}
      {resultado && <dl className="rel-ind">{resultado.numeros.map(n => <div key={n.nome}><dt>{n.nome}</dt><dd className="txt">{n.valor !== undefined ? <Din v={n.valor} /> : n.texto}</dd></div>)}</dl>}
      <a className="btn line" href={'#/' + membro.rota} onClick={ev => { ev.preventDefault(); fechar(); ir(membro.rota) }}>Abrir aba</a>
    </>}
  </section>
}
