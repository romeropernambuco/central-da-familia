import { useEffect, useRef, useState } from 'react'
import { Check, Clock, Hand, Info, Keyboard, Maximize2 } from 'lucide-react'
import type { EstadoFuncionario, FuncionarioEsc } from '../../api/tipos'
import { chaveSimples } from '../../api/normaliza2'
import { FUSO } from '../../lib/formato'
import { SALAS_NOME as SALAS, temWebGL, type Cena, type EstadoCena, type FuncCena } from './cenaBase'

const ESTADO: Record<EstadoFuncionario, EstadoCena> = { vai_comecar: 'fila', trabalhando: 'trabalhando', entregue: 'entregue', precisa_de_voce: 'precisa' }
export const ROTULO_ESTADO: Record<EstadoFuncionario, string> = { vai_comecar: 'ainda vai começar', trabalhando: 'trabalhando', entregue: 'entregue', precisa_de_voce: 'precisa de você' }
export function IcoEstado({ e, size = 14 }: { e: EstadoFuncionario; size?: number }) {
  return e === 'precisa_de_voce' ? <Hand size={size} /> : e === 'entregue' ? <Check size={size} /> : e === 'trabalhando' ? <Keyboard size={size} /> : <Clock size={size} />
}
/** Sala que vem do banco ("Cartões", "Patrimônio") vira a chave da cena ("cartoes", "patrimonio"). Sala desconhecida fica na Recepção. */
export const salaDe = (s: string) => { const k = chaveSimples(s); return SALAS[k] ? k : 'recepcao' }
const NOME_CURTO: Record<string, string> = { contador: 'Contador', colchao: 'Reserva', cartao: 'Cartão', folha: 'Folha', comprador: 'Comprador', guardado: 'Guardado', secretaria: 'Secretária' }
const curto = (f: FuncionarioEsc) => NOME_CURTO[f.id] || f.nome.split(' ')[0]
const horaRecife = () => { const p = new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()); return (Number(p[0].value) % 24) + Number(p[2].value) / 60 }
const escuroAgora = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches }
const celular = () => window.innerWidth < 900

/**
 * A cena 3D dentro do app. O Three.js só é buscado aqui (import dinâmico): as outras telas não carregam nada de 3D.
 * Sem WebGL, com erro ou depois de 8 s sem abrir, a cena some e fica a lista (que está sempre na tela).
 * Cada boneco tem uma etiqueta em HTML presa à cabeça: é ela o alvo de toque (44 px) e o que o leitor de tela lê.
 */
export function Cena3D({ funcionarios, selecionado, aoTocar }: { funcionarios: FuncionarioEsc[]; selecionado: string | null; aoTocar: (id: string) => void }) {
  const caixa = useRef<HTMLDivElement>(null)
  const cena = useRef<Cena | null>(null)
  const tags = useRef<Record<string, HTMLElement | null>>({})
  const placas = useRef<Record<string, HTMLElement | null>>({})
  const tocar = useRef(aoTocar); tocar.current = aoTocar
  const [modo, setModo] = useState<'abrindo' | '3d' | 'lista'>('abrindo')
  const [leve, setLeve] = useState<{ fps: number; degrau: number } | null>(null)
  const [vista, setVista] = useState('tudo')
  const paraCena = (fs: FuncionarioEsc[]): FuncCena[] => fs.map(f => ({ id: f.id, sala: salaDe(f.sala), estado: ESTADO[f.estado] }))
  // a cena é montada 1 vez por equipe (mesmos ids); mudança de estado entra por `atualizar`, sem remontar
  const ids = funcionarios.map(f => f.id + '@' + salaDe(f.sala)).join(',')
  const atuais = useRef(funcionarios); atuais.current = funcionarios

  useEffect(() => {
    const el = caixa.current
    if (!el || !ids) return
    const sem3d = new URLSearchParams(location.search).has('sem3d') || /[?&]sem3d/.test(location.hash)
    if (sem3d || !temWebGL()) { setModo('lista'); return }
    let vivo = true
    const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches
    const desiste = setTimeout(() => { if (vivo && !cena.current) setModo('lista') }, 8000)
    // o Three.js e o código da cena chegam juntos, só agora: nenhuma outra tela carrega 3D
    Promise.all([import('./tres'), import('./cena3d')]).then(([T, m]) => {
      if (!vivo) return
      try {
        const c = m.montarCena(T, el, {
          funcionarios: paraCena(atuais.current), etiqueta: id => tags.current[id] || null, placa: s => placas.current[s] || null,
          aoTocar: id => tocar.current(id), escuro: escuroAgora(), celular, hora: horaRecife, parado: reduz,
          aoMedir: (fps, degrau) => setLeve(a => (degrau > 0 ? (a && a.degrau === degrau ? a : { fps, degrau }) : null)),
        })
        cena.current = c
        ;(window as any).__escritorio = c.medir
        setModo('3d')
      } catch (e) { console.warn('Cena 3D não abriu:', e); setModo('lista') }
    }).catch(() => { if (vivo) setModo('lista') })
    // tema: claro e escuro trocam a cor do chão da cena
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const tema = () => cena.current?.tema(escuroAgora())
    mq.addEventListener('change', tema)
    const obs = new MutationObserver(tema); obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { vivo = false; clearTimeout(desiste); mq.removeEventListener('change', tema); obs.disconnect(); cena.current?.destruir(); cena.current = null; delete (window as any).__escritorio }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])

  useEffect(() => { cena.current?.atualizar(paraCena(funcionarios)) })
  useEffect(() => { cena.current?.selecionar(selecionado); if (selecionado && celular()) { const f = atuais.current.find(x => x.id === selecionado); if (f) setVista(salaDe(f.sala)) } }, [selecionado, modo])
  const ir = (v: string) => { setVista(v); cena.current?.irPara(v) }
  const salasUsadas = Object.keys(SALAS).filter(k => funcionarios.some(f => salaDe(f.sala) === k))
  const curta = vista === 'tudo'

  return (
    <div className="cena3d-bloco">
      {modo === 'lista' && <p className="todo quieto" role="status"><Info size={20} aria-hidden="true" /><span>A cena 3D não abriu neste aparelho. Tudo funciona pela lista da equipe, logo abaixo.</span></p>}
      <div className={'cena3d' + (modo === 'lista' ? ' fora' : '')} ref={caixa} data-modo={modo}>
        {modo === 'abrindo' && <p className="cena3d-espera">Abrindo o escritório…</p>}
        <div className="cena3d-tags" hidden={modo !== '3d'}>
          {Object.keys(SALAS).map(k => <span key={k} className="placa" ref={el => { placas.current[k] = el }}>{SALAS[k]}</span>)}
          {funcionarios.map(f => {
            const precisa = f.estado === 'precisa_de_voce', sel = f.id === selecionado
            const soIcone = curta && !precisa && !sel
            return (
              <button key={f.id} type="button" ref={el => { tags.current[f.id] = el }} data-k={`${f.estado}|${sel}|${soIcone}`} data-func={f.id}
                className={'tag' + (precisa ? ' precisa' : '') + (sel ? ' sel' : '') + (soIcone ? ' curta' : '')}
                aria-label={`${f.nome}: ${ROTULO_ESTADO[f.estado]}. Abrir.`} aria-pressed={sel} onClick={() => aoTocar(f.id)}>
                <IcoEstado e={f.estado} /><span>{curto(f)}</span>
              </button>
            )
          })}
        </div>
      </div>
      {modo === '3d' && (
        <div className="pills cena3d-salas" role="group" aria-label="Aproximar de uma sala">
          <button type="button" className="pill" aria-pressed={vista === 'tudo'} onClick={() => ir('tudo')}><Maximize2 size={16} />Ver tudo</button>
          {salasUsadas.map(k => <button key={k} type="button" className="pill" aria-pressed={vista === k} onClick={() => ir(k)}>{SALAS[k]}</button>)}
        </div>
      )}
      {modo === '3d' && leve && <p className="sub" role="status">Modo leve ligado: este aparelho estava mostrando {leve.fps} imagens por segundo (o mínimo pra ficar suave é 24). A cena ficou mais simples pra não travar.</p>}
    </div>
  )
}

