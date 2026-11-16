import { ChevronDown } from 'lucide-react'
import { textoDeAgente } from '../lib/textoAgente'
import { memo, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { useApp } from '../app/contexto'
import { useEscritorio } from '../app/useDados2'
import { useInsightsDaAba } from '../app/useInsightsDaAba'
import { lojaEscritorio } from '../app/escritorioCompartilhado'
import type { Rota } from '../app/rotas'
import { rotaPermitida } from '../app/rotas'
import { EQUIPE } from '../telas/escritorio/equipe'
import { temWebGL, tentarCarregarCena, type Cena, type EstadoAgente } from '../telas/escritorio/cenaBase'
import { Cadastro, donoDaPergunta } from '../telas/escritorio/Ficha'
import { NumerosAba } from '../telas/escritorio/NumerosAba'
import { PerguntaCard, respostasConfirmadas } from './Pergunta'
import { textoPrivado } from './privacidade'
import { Sheet } from './base'
import { reduzirFoto } from '../lib/foto'
export const AGENTE_POR_ABA: Record<string, string> = Object.fromEntries(EQUIPE.map(m => [m.rota, m.id]))
Object.assign(AGENTE_POR_ABA, { casa: 'fiscal', planejamento: 'tesoureiro', guardado: 'guardado' })
const CONVITE: Record<string, string> = {
 cartao: 'Quer conferir a fatura?',
 fiscal: 'Já fez a feira?',
 guardado: 'Quer cadastrar uma aplicação ou anotar um aporte?',
 tesoureiro: 'O recebimento previsto entrou ou mudou de mês?',
 secretaria: 'O que você quer lembrar e quando?',
}
export type ModoFuncionario = 'completo' | 'compacto' | 'desligado'
const CHAVE_MODO = 'funcionarios:modo'
const ouvintesModo = new Set<() => void>()
let modoMemoria: ModoFuncionario | undefined
function lerModo(): ModoFuncionario {
 try { const v = localStorage.getItem(CHAVE_MODO); if (v === 'completo' || v === 'desligado') return v } catch { /* sem storage */ }
 return 'compacto'
}
function snapshotModo() { return modoMemoria ?? lerModo() }
export function definirModoFuncionario(modo: ModoFuncionario) {
 modoMemoria = modo
 try { localStorage.setItem(CHAVE_MODO, modo) } catch { /* mantém na sessão */ }
 ouvintesModo.forEach(f => f())
}
function assinarModo(f: () => void) {
 ouvintesModo.add(f)
 const atualizar = () => { modoMemoria = undefined; f() }
 window.addEventListener('storage', atualizar)
 return () => { ouvintesModo.delete(f); window.removeEventListener('storage', atualizar) }
}
export function useModoFuncionario() { return useSyncExternalStore(assinarModo, snapshotModo, () => 'compacto' as const) }
export function ControleFuncionarios() {
 const modo = useModoFuncionario()
 return <div role="group" aria-label="Funcionários" className="seg compacta"><span>Funcionários:</span>{(['completo', 'compacto', 'desligado'] as const).map(v => <button key={v} type="button" aria-pressed={modo === v} onClick={() => definirModoFuncionario(v)}>{v === 'completo' ? 'Completo' : v === 'compacto' ? 'Compacto' : 'Desligado'}</button>)}</div>
}
const SOBRE: Record<string, string> = {
 inicio: 'Aqui você acompanha os números e avisos da família.', lancamentos: 'Aqui estão os gastos e entradas que vocês anotaram.',
 orcamento: 'Aqui você acompanha seu limite e suas sobras.', casa: 'Aqui você acompanha a lista e as compras da casa.',
 cartoes: 'Aqui você acompanha cartões e faturas.', guardado: 'Aqui você acompanha aplicações e imóveis.',
 planejamento: 'Aqui você define limites e planeja os próximos meses.', desejos: 'Aqui você organiza o que quer comprar.',
 escritorio: 'Aqui você vê tarefas e cadastros dos funcionários.', ajustes: 'Aqui você cuida da aparência e dos convites.',
 'primeiro-uso': 'Aqui você cria sua família e define os limites mensais.', privacidade: 'Aqui estão as opções de privacidade.', painel: 'Aqui o dono acompanha os indicadores do app.',
}
export function AjudaDaAba({ rota }: { rota: string }) {
 const [aberta, setAberta] = useState(false)
 return <><button type="button" className="btn line" onClick={() => setAberta(true)}>Preciso de ajuda</button>{aberta && <Sheet titulo="Preciso de ajuda" fechar={() => setAberta(false)}>
 <p>{SOBRE[rota] || 'Entre com seu e-mail ou com o convite da equipe.'}</p>
 <p>Para registrar uma compra, use “Anotar gasto” ou “Anotar compra”.</p>
 <p>Os números ficam no conteúdo da tela. O botão “?” explica de onde vieram.</p>
 <p>Use o olho para esconder ou mostrar valores. Ele também fica na folha de Anotar gasto.</p>
 <p>Para pedir apoio, fale com a pessoa da família que convidou você para o app.</p>
 </Sheet>}</>
}
let liberarRenderer: (() => void) | undefined
export function AgenteDaAba({ rota }: { rota: Rota }) {
 const { familia, sessao, api } = useApp()
 if (!familia || rotaPermitida(rota, familia.papel, sessao?.dono) !== rota || !AGENTE_POR_ABA[rota]) return null
 return <AgenteAutorizado key={[familia.id, rota, api.modo, familia.papel, familia.membroId, sessao?.userId].join(':')} rota={rota} />
}
function AgenteAutorizado({ rota }: { rota: Rota }) {
 const { familia, api, oculto } = useApp()
 const { e, perguntas, responder } = useEscritorio()
 const insights = useInsightsDaAba(rota)
 const loja = lojaEscritorio(api, familia!.id)
 const escritorio = useSyncExternalStore(loja.assinar, loja.snapshot)
 const painel = useId()
 const modo = useModoFuncionario()
 const [expansao, setExpansao] = useState<{ modo: ModoFuncionario; pergunta?: string; valor: boolean } | null>(null)
 useEffect(() => setExpansao(null), [modo])
 const [aberto, setAberto] = useState(false)
 const [celebrando, setCelebrando] = useState<{ funcionario: string } | null>(null)
 const pendente = perguntas.find(p => {
   const id = donoDaPergunta(p, e?.funcionarios || [])?.id || p.funcionario
   return familia?.papel === 'equipe' ? id === 'fiscal' : id === AGENTE_POR_ABA[rota] || EQUIPE.some(m => m.id === id && m.rota === rota)
 })
 const proposta = !pendente && e ? insights.pergunta : null
 const id = pendente ? donoDaPergunta(pendente, e?.funcionarios || [])?.id || pendente.funcionario : proposta?.funcionario || celebrando?.funcionario || AGENTE_POR_ABA[rota]
 const m = EQUIPE.find(m => m.id === id) || EQUIPE.find(m => m.id === AGENTE_POR_ABA[rota])!
 const f = e?.funcionarios.find(f => f.id === m.id)
 const fala = (texto: string) => f?.trechosPrivados ? textoDeAgente(texto, f.trechosPrivados, oculto) : textoPrivado(texto, oculto)
 const p = familia?.papel === 'equipe' && pendente ? {
   ...pendente, valor: undefined, contexto: '',
   pergunta: /nota/.test(pendente.id) ? 'Pode guardar a nota da feira?' : /contagem|estoque/.test(pendente.id) ? 'Pode contar o estoque?' : 'Já fez a feira?',
   opcoes: pendente.opcoes.filter(o => o.pede !== 'valor').map(o => ({ ...o, pede2: o.pede2 === 'valor' ? undefined : o.pede2,
     rotulo: /R\$|\d/.test(o.rotulo) ? 'Responder' : o.rotulo })),
 } : pendente || proposta
 const ultima = useRef<{ id: string; funcionario: string } | null>(null)
 const respostaVista = useRef(respostasConfirmadas.get(loja))
 const celebradas = useRef(new Set<string>())
 useEffect(() => {
   const celebrar = (id: string, funcionario: string) => {
     if (celebradas.current.has(id)) return
     celebradas.current.add(id); setCelebrando({ funcionario })
   }
   const anterior = ultima.current
   if (anterior && loja.travas.get(anterior.id) === 'respondida') { celebrar(anterior.id, anterior.funcionario); ultima.current = null }
   const confirmada = respostasConfirmadas.get(loja)
   if (confirmada && respostaVista.current !== confirmada) {
     respostaVista.current = confirmada
     if (confirmada.funcionario === m.id) celebrar(confirmada.id, confirmada.funcionario)
   }
   if (p && !loja.travas.has(p.id)) ultima.current = { id: p.id, funcionario: m.id }
 }, [p?.id, m.id, escritorio])
 useEffect(() => {
   if (!celebrando) return
   const timer = setTimeout(() => setCelebrando(null), 1600)
   return () => clearTimeout(timer)
 }, [celebrando])
 const marcarVista = useCallback(() => { if (proposta) insights.marcarVista(proposta.id) }, [proposta?.id, insights.marcarVista])
 const precisa = !!p && !loja.travas.has(p.id)
 const estado: EstadoAgente = celebrando?.funcionario === m.id ? 'resolvido' : precisa ? 'chamando'
   : f?.estado === 'trabalhando' || e?.trabalhando?.some(t => t.funcionario === m.id) ? 'trabalhando' : 'parado'
 const [fotoErro, setFotoErro] = useState('')
 const [guardandoFoto, setGuardandoFoto] = useState(false)
 const fotoTrava = useRef(false)
 const anexarFoto = async (arquivo: File) => {
   if (fotoTrava.current) return
   fotoTrava.current = true; setGuardandoFoto(true); setFotoErro('')
   try {
     if (await insights.anexarNota(await reduzirFoto(arquivo))) setCelebrando({ funcionario: 'fiscal' })
     else setFotoErro('Não deu certo. Tente de novo.')
   } catch { setFotoErro('Não deu certo. Tente de novo.') }
   finally { fotoTrava.current = false; setGuardandoFoto(false) }
 }
 const expandido = expansao?.modo === modo && expansao.pergunta === p?.id ? expansao.valor : null
 const completo = modo !== 'desligado' && (expandido ?? (modo === 'completo' || precisa))
 return <section className={'card agente-aba' + (!completo && !p ? ' agente-compacto' : '')} data-agente={m.id} aria-label="Funcionário desta aba">
 {completo && <MiniAgente id={m.id} sala={m.sala} estado={estado} />}<header className="agente-aba-cabecalho"><b>{m.nome}</b>
 {completo && api.modo === 'exemplo' && <small>Exemplo: nada é gravado na família real</small>}</header>
 {p ? <PerguntaCard key={p.id} p={p} quem={m.nome} responder={pendente ? responder : insights.responder} aoExibir={proposta ? marcarVista : undefined} semQuem /> : <div className="perg"><p>{CONVITE[m.id] || (f?.frase ? fala(f.frase) : m.papel)}</p></div>}
 {modo !== 'desligado' && <button type="button" className="btn line" onClick={() => setExpansao({ modo, pergunta: p?.id, valor: !completo })}>{completo ? 'Recolher' : 'Expandir'}</button>}
 <button type="button" className={p?.opcoes.length ? 'btn ghost agente-aba-divulgacao' : 'btn line'} aria-expanded={aberto} aria-controls={painel} onClick={() => setAberto(!aberto)}>{['cartao', 'fiscal', 'guardado', 'tesoureiro', 'secretaria', 'contador'].includes(m.id) ? 'Ver tarefas e cadastros' : 'Ver resumo desta tela'}<ChevronDown size={18} aria-hidden="true" /></button>
 <div id={painel} hidden={!aberto}>{aberto && (['cartao', 'fiscal', 'guardado', 'tesoureiro', 'secretaria', 'contador'].includes(m.id) ? <Cadastro id={m.id} /> : <NumerosAba id={m.id} fechar={() => setAberto(false)} />)}</div>
 {insights.notaPendente && <Sheet titulo="Guardar a nota da feira" fechar={insights.fecharNota}>
   <label className="campo"><span>Foto da nota</span><input type="file" accept="image/*" capture="environment" disabled={guardandoFoto} onChange={ev => { const arquivo = ev.target.files?.[0]; ev.target.value = ''; if (arquivo) void anexarFoto(arquivo) }} /></label>
   {guardandoFoto && <p role="status">Guardando a nota…</p>}{fotoErro && <p role="alert">{fotoErro}</p>}
 </Sheet>}
 </section>
}
export const MiniAgente = memo(function MiniAgente({ id, sala, estado = 'trabalhando' }: { id: string; sala: string; estado?: EstadoAgente }) {
 const caixa = useRef<HTMLDivElement>(null)
 const cenaAtual = useRef<Cena>()
 const estadoAtual = useRef(estado); estadoAtual.current = estado
 const [lista, setLista] = useState(false)
 useEffect(() => { cenaAtual.current?.definirEstado(id, estado) }, [id, estado])
 useEffect(() => {
 const el = caixa.current
 if (!el) return
 if (new URLSearchParams(location.search).has('sem3d') || /[?&]sem3d/.test(location.hash) || !temWebGL()) { setLista(true); return }
 const escuroAgora = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches }
 let cena: Cena | undefined
 setLista(false)
 liberarRenderer?.()
 const cancelar = tentarCarregarCena(() => Promise.all([import('../telas/escritorio/tres'), import('../telas/escritorio/cena3d')]), ([T, modulo]) => {
 cena = modulo.montarCena(T, el, { mini: true, funcionarios: [{ id, sala, estado: 'trabalhando' }], etiqueta: () => null, placa: () => null, aoTocar() {}, escuro: escuroAgora(), celular: () => true, hora: () => 12, parado: matchMedia('(prefers-reduced-motion: reduce)').matches, aoContexto: estado => { if (estado === 'falhou') setLista(true) } })
 cena.irPara(sala)
 cenaAtual.current = cena
 cena.definirEstado(id, estadoAtual.current)
 }, () => setLista(true))
 const mq = matchMedia('(prefers-color-scheme: dark)')
 const tema = () => cena?.tema(escuroAgora())
 mq.addEventListener('change', tema)
 const obs = new MutationObserver(tema); obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
 const destruir = () => { mq.removeEventListener('change', tema); obs.disconnect(); cancelar(); cena?.destruir(); cena = undefined; cenaAtual.current = undefined }
 const abrirEscritorio = () => { destruir(); setLista(true) }
 window.addEventListener('escritorio3d-abrir', abrirEscritorio)
 liberarRenderer = destruir
 return () => { window.removeEventListener('escritorio3d-abrir', abrirEscritorio); destruir(); if (liberarRenderer === destruir) liberarRenderer = undefined }
 }, [id, sala])
 return lista ? <span className="sub">Em lista · {({ chamando: 'Precisa de você', resolvido: 'Respondido', parado: 'Sem pendências', trabalhando: 'Trabalhando' })[estado]}</span> : <div className="cena3d mini-agente" ref={caixa} aria-hidden="true" />
})
