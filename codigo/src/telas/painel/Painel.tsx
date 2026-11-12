import { useEffect, useState } from 'react'
import { CircleCheck, TriangleAlert, Lock } from 'lucide-react'
import { useApp } from '../../app/contexto'
import type { Numero } from '../../api/tipos'

/** Painel dos 4 números: só o dono do produto vê (a função do banco recusa os outros). */
export function Painel() {
  const { api, sessao } = useApp()
  const [nums, setNums] = useState<Numero[] | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => { api.numerosSemana().then(setNums).catch(e => setErro((e as Error).message)) }, [api])
  if (!sessao?.dono) return <div className="card"><p className="todo"><Lock size={20} aria-hidden="true" />Esta tela é só do dono do produto.</p></div>
  return (
    <div className="view">
      <p className="sub">Os 4 números que dizem se o app está funcionando, olhados toda segunda. Cada card explica de onde vem.</p>
      {erro && <p className="todo warn">{erro}</p>}
      <div className="nums">
        {(nums || []).map(n => (
          <section className="card" key={n.chave} aria-label={n.nome}>
            <div className="card-h"><h2>{n.nome}</h2><span className={'chip ' + (n.ok ? 'ok' : 'warn')}>{n.ok ? <CircleCheck size={14} /> : <TriangleAlert size={14} />}{n.meta}</span></div>
            <p className="din big">{n.texto}</p>
            <p className="sub" style={{ marginTop: 6 }}><b>De onde veio esse número?</b> {n.explicacao}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
