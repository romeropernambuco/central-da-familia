import { textoDeAgente } from '../lib/textoAgente'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../app/contexto'
import { useEscritorio } from '../app/useDados2'
import type { Rota } from '../app/rotas'
import { rotaPermitida } from '../app/rotas'
import { EQUIPE } from '../telas/escritorio/equipe'
import { temWebGL, tentarCarregarCena, type Cena } from '../telas/escritorio/cenaBase'
import { Cadastro, donoDaPergunta } from '../telas/escritorio/Ficha'
import { NumerosAba } from '../telas/escritorio/NumerosAba'
import { PerguntaCard } from './Pergunta'
import { textoPrivado } from './privacidade'
export const AGENTE_POR_ABA: Record<string, string> = Object.fromEntries(EQUIPE.map(m => [m.rota, m.id]))
Object.assign(AGENTE_POR_ABA, { casa: 'fiscal', planejamento: 'tesoureiro', guardado: 'guardado' })
const CONVITE: Record<string, string> = {
 cartao: 'Qual valor veio no banco? Já pagou a fatura?',
 fiscal: 'Já fez a feira? Guarde a nota e conte o estoque.',
 guardado: 'Quer cadastrar uma aplicação ou anotar um aporte?',
 tesoureiro: 'O recebimento previsto entrou ou mudou de mês?',
 secretaria: 'O que você quer lembrar e quando?',
}
let liberarRenderer: (() => void) | undefined
export function AgenteDaAba({ rota }: { rota: Rota }) {
 const { familia, sessao } = useApp()
 if (!familia || rotaPermitida(rota, familia.papel, sessao?.dono) !== rota || !AGENTE_POR_ABA[rota]) return null
 return <AgenteAutorizado key={familia.id + rota} rota={rota} />
}
function AgenteAutorizado({ rota }: { rota: Rota }) {
 const { familia, api, oculto } = useApp()
 const { e, perguntas, responder } = useEscritorio()
 const [aberto, setAberto] = useState(false)
 const m = EQUIPE.find(m => m.id === AGENTE_POR_ABA[rota])!
 const f = e?.funcionarios.find(f => f.id === m.id)
 const fala = (texto: string) => f?.trechosPrivados ? textoDeAgente(texto, f.trechosPrivados, oculto) : textoPrivado(texto, oculto)
 const pendente = perguntas.find(p => p.funcionario === m.id || donoDaPergunta(p, e?.funcionarios || [])?.id === m.id)
 const p = familia?.papel === 'equipe' && pendente ? {
   ...pendente, valor: undefined, contexto: '',
   pergunta: /nota/.test(pendente.id) ? 'Pode guardar a nota da feira?' : /contagem|estoque/.test(pendente.id) ? 'Pode contar o estoque?' : 'Já fez a feira?',
   opcoes: pendente.opcoes.filter(o => o.pede !== 'valor').map(o => ({ ...o, pede2: o.pede2 === 'valor' ? undefined : o.pede2,
     rotulo: /R\$|\d/.test(o.rotulo) ? 'Responder' : o.rotulo })),
 } : pendente
 return <section className="card" data-agente={m.id} aria-label="Funcionário desta aba">
 <MiniAgente id={m.id} sala={m.sala} /><b>{m.nome}</b>
 {api.modo === 'exemplo' && <small> · Exemplo: nada é gravado na família real</small>}
 {p ? <PerguntaCard key={p.id} p={p} quem={m.nome} responder={responder} semQuem /> : <div className="perg"><p>{CONVITE[m.id] || (f?.frase ? fala(f.frase) : m.papel)}</p>{f && familia?.papel !== 'equipe' && CONVITE[m.id] && <p className="sub">{fala(f.frase)}</p>}</div>}
 <button type="button" className="btn line" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>Conversar e abrir tarefas</button>
 {aberto && (['cartao', 'fiscal', 'guardado', 'tesoureiro', 'secretaria', 'contador'].includes(m.id) ? <Cadastro id={m.id} /> : <NumerosAba id={m.id} fechar={() => setAberto(false)} />)}</section>
}
export function MiniAgente({ id, sala }: { id: string; sala: string }) {
 const caixa = useRef<HTMLDivElement>(null)
 const [lista, setLista] = useState(false)
 useEffect(() => {
 const el = caixa.current
 if (!el) return
 if (new URLSearchParams(location.search).has('sem3d') || /[?&]sem3d/.test(location.hash) || !temWebGL()) { setLista(true); return }
 let cena: Cena | undefined
 liberarRenderer?.()
 const cancelar = tentarCarregarCena(() => Promise.all([import('../telas/escritorio/tres'), import('../telas/escritorio/cena3d')]), ([T, modulo]) => {
 cena = modulo.montarCena(T, el, { mini: true, funcionarios: [{ id, sala, estado: 'trabalhando' }], etiqueta: () => null, placa: () => null, aoTocar() {}, escuro: document.documentElement.dataset.theme === 'dark', celular: () => true, hora: () => 12, parado: matchMedia('(prefers-reduced-motion: reduce)').matches, aoContexto: estado => { if (estado === 'falhou') setLista(true) } })
 cena.irPara(sala)
 }, () => setLista(true))
 const destruir = () => { cancelar(); cena?.destruir(); cena = undefined }
 const abrirEscritorio = () => { destruir(); setLista(true) }
 window.addEventListener('escritorio3d-abrir', abrirEscritorio)
 liberarRenderer = destruir
 return () => { window.removeEventListener('escritorio3d-abrir', abrirEscritorio); destruir(); if (liberarRenderer === destruir) liberarRenderer = undefined }
 }, [id, sala])
 return lista ? <span className="sub">Em lista</span> : <div className="cena3d" ref={caixa} aria-hidden="true" style={{ height: 180, aspectRatio: 'auto' }} />
}
