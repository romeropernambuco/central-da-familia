import { useEffect, useMemo, useRef, useState } from 'react'
import { criarChaveToque, umaPorVez } from '../../lib/seguro'
import { ErroSessao } from '../../api/erros'
import { Delete, Camera } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { Sheet } from '../../componentes/base'
import type { Cartao } from '../../api/tipos'
import { hojeRecife, reais, segundosDesde, segundosTexto, somaDias, tecla, textoParaValor } from '../../lib/formato'
import { numeroEnvelope } from '../../componentes/EnvelopeCard'
import { LerCupom } from '../../componentes/LerCupom'

/** Lançar: valor + 1 toque no envelope. Mede os segundos do toque no botão verde até o salvo. */
export function Lancar() {
  const { api, familia, resumo, fecharLancar, lancarAberto, toast, recarregar, tentar } = useApp()
  const inicio = useRef(performance.now())
  const [txt, setTxt] = useState(lancarAberto?.valor ? String(lancarAberto.valor).replace('.', ',') : '')
  const [quando, setQuando] = useState<'hoje' | 'ontem'>('hoje')
  const [cartao, setCartao] = useState<string | null>(null)
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [desc, setDesc] = useState(lancarAberto?.descricao || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const equipe = familia?.papel === 'equipe'
  const [cupom, setCupom] = useState(false)

  useEffect(() => { if (familia && !equipe) api.cartoes(familia.id).then(setCartoes).catch(() => {}) }, [api, familia?.id, equipe])
  // teclado físico no computador
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (/^\d$/.test(e.key)) setTxt(t => tecla(t, e.key))
      else if (e.key === ',' || e.key === '.') setTxt(t => tecla(t, ','))
      else if (e.key === 'Backspace') setTxt(t => tecla(t, 'apagar'))
    }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [])

  const valor = textoParaValor(txt)
  const envs = (resumo?.envelopes || []).filter(e => !equipe || e.casa)
  const ordem = lancarAberto?.envelope ? [...envs].sort((a, b) => (a.id === lancarAberto.envelope ? -1 : b.id === lancarAberto.envelope ? 1 : 0)) : envs

  // trava do duplo toque: vale no mesmo instante do 1º toque, antes de a tela redesenhar o botão desligado
  const trava = useMemo(() => umaPorVez((f: () => Promise<void>) => f()), [])
  // 1 chave por lançamento: se a internet cai no meio e a pessoa toca de novo, vai a mesma chave e o banco não grava em dobro
  const toque = useMemo(() => criarChaveToque(), [])
  const salvar = (envelope: string, nome: string) => trava(() => gravar(envelope, nome))
  async function gravar(envelope: string, nome: string) {
    if (!familia || valor <= 0) return
    setSalvando(true); setErro('')
    try {
      const hoje = hojeRecife()
      // segundos do toque no + até o toque no envelope: vão no próprio lancar (o banco grava 1 evento só)
      const s = segundosDesde(inicio.current, performance.now())
      const data = quando === 'hoje' ? hoje : somaDias(hoje, -1)
      const chave = toque.para([envelope, valor, data, desc.trim(), cartao || ''].join('|'))
      const r = await api.lancar({ familia: familia.id, envelope, valor, data, descricao: desc.trim(), cartao, segundos: s, chave })
      toque.gravou()
      ;(window as any).__ultimoTempoLancar = s
      fecharLancar()
      await recarregar()
      // só pro casal e só se houver dinheiro guardado: quanto esse gasto deixa de render até o fim do mês
      let custo = ''
      if (familia.papel === 'casal') {
        try { const c = await api.guardadoCustoDoGasto(familia.id, valor); if (c.ate_fim_do_mes >= 0.01) custo = ` Esse gasto também custou ${reais(c.ate_fim_do_mes)} de rendimento até o fim do mês.` } catch { /* sem Guardado ou banco ainda sem a função: o lançamento já foi salvo */ }
      }
      toast(equipe ? `Compra anotada em ${nome}.` : `${reais(valor)} em ${nome}. Salvo em ${segundosTexto(s)}.${custo}`, async () => { await api.apagarLancamento(r.lancamento.id); await recarregar() })
    } catch (e) {
      setSalvando(false)
      if (e instanceof ErroSessao) { await tentar(async () => { throw e }); return }
      setErro((e as Error).message)
    }
  }

  if (cupom) return <LerCupom fechar={fecharLancar} envelopePadrao={lancarAberto?.envelope} />

  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'apagar']
  const [int, dec] = txt.split(',')
  return (
    <Sheet titulo="Lançar" fechar={fecharLancar} rotulo="Lançar gasto">
      {/* a equipe não vê valores, então não lê cupom (o cupom mostra preços) */}
      {!equipe && <button className="btn line sm" type="button" style={{ justifySelf: 'start' }} onClick={() => setCupom(true)}><Camera size={18} />Ler cupom com foto</button>}
      <div className="amount">
        <span className="lab">Quanto gastou?</span>
        <output className={valor ? '' : 'zero'} aria-live="polite" aria-label={'Valor ' + reais(valor)}>
          <span className="cur">R$</span>{(int || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}{dec !== undefined ? ',' + dec : ''}
        </output>
      </div>
      <div className="keys" role="group" aria-label="Teclado">
        {teclas.map(t => (
          <button key={t} type="button" onClick={() => setTxt(x => tecla(x, t))} aria-label={t === 'apagar' ? 'Apagar' : t}>
            {t === 'apagar' ? <Delete size={26} /> : t}
          </button>
        ))}
      </div>
      <div className="atrow"><span className="atl">Quando</span>
        {(['hoje', 'ontem'] as const).map(q => <button key={q} type="button" className="pill" aria-pressed={quando === q} onClick={() => setQuando(q)}>{q === 'hoje' ? 'Hoje' : 'Ontem'}</button>)}
      </div>
      {!equipe && cartoes.length > 0 && (
        <div className="atrow"><span className="atl">Pagou</span>
          <button type="button" className="pill" aria-pressed={cartao === null} onClick={() => setCartao(null)}>Pix ou dinheiro</button>
          {cartoes.map(c => <button key={c.id} type="button" className="pill" aria-pressed={cartao === c.id} onClick={() => setCartao(c.id)}>{c.nome}</button>)}
        </div>
      )}
      <input className="inp" placeholder="O que foi? (pode deixar em branco)" value={desc} onChange={e => setDesc(e.target.value)} aria-label="O que foi" />
      <p className="lbl">{valor > 0 ? 'Toque onde o gasto entra pra salvar:' : 'Digite o valor e depois toque em quem gastou:'}</p>
      <div className="envbtns">
        {ordem.map(e => {
          // equipe da casa não vê valor de dinheiro do envelope (decisão do dono)
          const n = resumo && !equipe ? numeroEnvelope(e, resumo.dias_restantes) : null
          return (
            <button key={e.id} type="button" className="envbtn" disabled={valor <= 0 || salvando} onClick={() => salvar(e.id, e.nome)} aria-label={`Salvar em ${e.nome}`}>
              <b>{e.nome}</b>
              <small>{n ? `${reais(n.valor)} ${n.rotulo}` : ''}</small>
            </button>
          )
        })}
      </div>
      {!ordem.length && <p className="sub">{equipe ? 'O casal ainda não criou o limite da Casa. Avise quem cuida da família.' : 'Nenhum limite criado ainda. Crie em Planejamento.'}</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
    </Sheet>
  )
}
