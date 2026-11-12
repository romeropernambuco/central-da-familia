import { useMemo, useRef, useState } from 'react'
import { criarChaveToque, umaPorVez } from '../lib/seguro'
import { Camera, ImageUp, Receipt, Check, TriangleAlert } from 'lucide-react'
import { useApp } from '../app/contexto'
import { Sheet } from './base'
import type { CupomLido } from '../api/tipos'
import { centavos, dataCurta, reais } from '../lib/formato'
import { dataDoCupom, reduzirFoto } from '../lib/foto'

/** Ler cupom com foto: reduz a foto, a IA lê, a pessoa confere e só então lança (1 lançamento com a soma). */
export function LerCupom({ fechar, envelopePadrao }: { fechar: () => void; envelopePadrao?: string }) {
  const { api, familia, resumo, recarregar, toast } = useApp()
  const camera = useRef<HTMLInputElement>(null)
  const galeria = useRef<HTMLInputElement>(null)
  const [etapa, setEtapa] = useState<'foto' | 'lendo' | 'conferir'>('foto')
  const [erro, setErro] = useState('')
  const [lido, setLido] = useState<CupomLido | null>(null)
  const [marcados, setMarcados] = useState<boolean[]>([])
  const envs = (resumo?.envelopes || [])
  const padrao = envelopePadrao || envs.find(e => e.casa && e.regra === 'semanal')?.id || envs.find(e => e.casa)?.id || envs[0]?.id
  const [env, setEnv] = useState<string | undefined>(padrao)
  const [salvando, setSalvando] = useState(false)

  async function ler(arq: Blob | null) {
    if (!familia) return
    setErro(''); setEtapa('lendo')
    try {
      const foto = arq ? await reduzirFoto(arq) : ''
      const r = await api.lerCupom(familia.id, foto)
      if (!r.itens.length) throw new Error('A IA não achou itens nesse cupom. Tire outra foto com o cupom inteiro.')
      setLido(r); setMarcados(r.itens.map(() => true)); setEtapa('conferir')
    } catch (e) { setErro((e as Error).message); setEtapa('foto') }
  }

  const total = lido ? centavos(lido.itens.reduce((s, it, i) => s + (marcados[i] ? it.valor : 0), 0)) : 0
  const data = dataDoCupom(lido?.data || null)
  const nomeEnv = envs.find(e => e.id === env)?.nome || ''

  const trava = useMemo(() => umaPorVez((f: () => Promise<void>) => f()), [])
  const toque = useMemo(() => criarChaveToque(), [])
  const lancar = () => trava(gravar)
  async function gravar() {
    if (!familia || !lido || !env || total <= 0) return
    setSalvando(true); setErro('')
    try {
      // descrição curta pra caber na lista: "Cupom <loja>" (a loja vem cortada em 20 letras)
      const descricao = lido.loja ? `Cupom ${lido.loja.trim().slice(0, 20)}` : 'Cupom'
      const r = await api.lancar({ familia: familia.id, envelope: env, valor: total, data, descricao, chave: toque.para([env, total, data, descricao].join('|')) })
      toque.gravou()
      fechar()
      await recarregar()
      toast(`${reais(total)} do cupom em ${nomeEnv}.`, async () => { await api.apagarLancamento(r.lancamento.id); await recarregar() })
    } catch (e) { setErro((e as Error).message); setSalvando(false) }
  }

  return (
    <Sheet titulo="Ler cupom com foto" fechar={fechar}>
      {etapa !== 'conferir' && (
        <>
          <p className="corpo">Tire uma foto do cupom inteiro, reto e com luz. A IA lê os itens e você confere antes de qualquer lançamento.</p>
          <p className="sub">A foto é reduzida no celular antes de sair. Se o cupom tiver CPF, a IA não devolve o CPF.</p>
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) ler(f) }} />
          <input ref={galeria} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) ler(f) }} />
          <button className="btn primary full" type="button" disabled={etapa === 'lendo'} onClick={() => camera.current?.click()}><Camera size={20} />{etapa === 'lendo' ? 'Lendo o cupom...' : 'Tirar foto'}</button>
          <button className="btn line full" type="button" disabled={etapa === 'lendo'} onClick={() => galeria.current?.click()}><ImageUp size={20} />Escolher da galeria</button>
          {api.modo === 'exemplo' && <button className="btn ghost full" type="button" disabled={etapa === 'lendo'} onClick={() => ler(null)}><Receipt size={20} />Ver com um cupom de exemplo</button>}
          {erro && <p className="erro" role="alert">{erro}</p>}
        </>
      )}
      {etapa === 'conferir' && lido && (
        <>
          <p className="todo"><Check size={20} aria-hidden="true" /><span>Confira os itens. Nada foi lançado ainda.</span></p>
          {lido.total_confere === false && lido.total > 0 && <p className="todo warn"><TriangleAlert size={20} aria-hidden="true" /><span>A soma dos itens lidos ({reais(lido.soma_dos_itens ?? total)}) não bate com o total impresso no cupom ({reais(lido.total)}). Pode ter faltado item ou desconto: confira antes de lançar.</span></p>}
          <p className="sub">{lido.loja || 'Loja sem nome no cupom'} · {dataCurta(data)}{lido.data && lido.data !== data ? ' (data do cupom fora do prazo, ficou hoje)' : ''}</p>
          <ul className="list" aria-label="Itens lidos do cupom">
            {lido.itens.map((it, i) => (
              <li key={i} className="li" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                <label className="check"><input type="checkbox" checked={!!marcados[i]} onChange={() => setMarcados(marcados.map((m, j) => j === i ? !m : m))} /><span>{it.nome}</span></label>
                <span className="v">{reais(it.valor)}</span>
              </li>
            ))}
          </ul>
          <p className="lbl">Total marcado: <b>{reais(total)}</b>{lido.total && Math.abs(lido.total - total) > 0.009 && marcados.every(Boolean) ? ` (o cupom diz ${reais(lido.total)})` : ''}</p>
          <div className="atrow"><span className="atl">Entra em</span>
            {envs.map(e => <button key={e.id} type="button" className="pill" aria-pressed={env === e.id} onClick={() => setEnv(e.id)}>{e.nome}</button>)}
          </div>
          {erro && <p className="erro" role="alert">{erro}</p>}
          <button className="btn primary full" type="button" disabled={total <= 0 || !env || salvando} onClick={lancar}><Check size={20} />Lançar {reais(total)}{nomeEnv ? ` em ${nomeEnv}` : ''}</button>
          <button className="btn ghost full" type="button" onClick={() => { setLido(null); setEtapa('foto') }}>Ler outra foto</button>
        </>
      )}
    </Sheet>
  )
}
