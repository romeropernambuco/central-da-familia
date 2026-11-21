import { textoPrivado } from '../../lib/olho'
import '../../componentes/agente-cartao.css'
import { Icone, desenhoFuncionario } from '../../componentes/Icone'
import { nomeInformado } from '../../lib/nomePessoa'
import { Conferencia } from '../../componentes/Conferencia'
import { ChevronDown } from 'lucide-react'
import { nomesPrivados, textoDeAgente } from '../../lib/textoAgente'
import { lazy, Suspense, memo, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { useApp } from '../../app/contexto'
import { useEscritorio } from '../../app/useDados2'
import { useInsightsDaAba } from '../../app/useInsightsDaAba'
import { lojaEscritorio } from '../../app/escritorioCompartilhado'
import type { Rota } from '../../lib/rotas'
import { rotaPermitida } from '../../lib/rotas'
import { composicaoMini, elencoDaAba, funcionarioAutorizado, PRINCIPAL_POR_ABA } from './elencoPorAba'
import { APELIDO_BANCO, EQUIPE, type SalaEquipe } from '../../lib/escritorio/equipe'
import { temWebGL, tentarCarregarCena, type Cena, type EstadoAgente } from '../../lib/escritorio/cenaBase'
import { donoDaPergunta } from './donoDaPergunta'
import { PerguntaCard, respostasConfirmadas } from '../../componentes/Pergunta'
import { Sheet } from '../../componentes/base'
import { Carregando } from '../../componentes/Carregando'
import { reduzirFoto } from '../../lib/foto'
const Cadastro = lazy(() => import('./Ficha').then(m => ({ default: m.Cadastro })))
const NumerosAba = lazy(() => import('./NumerosAba').then(m => ({ default: m.NumerosAba })))

export const AGENTE_POR_ABA = PRINCIPAL_POR_ABA
const CONVITE: Record<string, string> = {
  cartao: 'Quer conferir a fatura?',
  fiscal: 'Já fez a feira?',
  guardado: 'Quer cadastrar uma aplicação ou anotar um aporte?',
  tesoureiro: 'O recebimento previsto entrou ou mudou de mês?',
  secretaria: 'O que você quer lembrar e quando?',
}
export type ModoFuncionario = 'completo' | 'compacto' | 'desligado'
const CHAVE_MODO = 'funcionarios:modo'
const CHAVE_ESQUEMA = 'funcionarios:modo:esquema'
export function migrarModoFuncionario(valor: string | null, esquema: string | null): ModoFuncionario {
  return esquema === '2' && (valor === 'completo' || valor === 'compacto' || valor === 'desligado') ? valor : 'completo'
}
const ouvintesModo = new Set<() => void>()
let modoMemoria: ModoFuncionario | undefined
function lerModo(): ModoFuncionario {
  try {
    const modo = migrarModoFuncionario(localStorage.getItem(CHAVE_MODO), localStorage.getItem(CHAVE_ESQUEMA))
    localStorage.setItem(CHAVE_MODO, modo)
    localStorage.setItem(CHAVE_ESQUEMA, '2')
    return modo
  } catch {
    return 'completo'
  }
}
function snapshotModo() {
  return modoMemoria ?? lerModo()
}
export function definirModoFuncionario(modo: ModoFuncionario) {
  modoMemoria = modo
  try {
    localStorage.setItem(CHAVE_MODO, modo)
    localStorage.setItem(CHAVE_ESQUEMA, '2')
  } catch {
    /* mantém na sessão */
  }
  ouvintesModo.forEach(f => f())
}
function assinarModo(f: () => void) {
  ouvintesModo.add(f)
  const atualizar = () => {
    modoMemoria = undefined
    f()
  }
  window.addEventListener('storage', atualizar)
  return () => {
    ouvintesModo.delete(f)
    window.removeEventListener('storage', atualizar)
  }
}
export function useModoFuncionario() {
  return useSyncExternalStore(assinarModo, snapshotModo, () => 'completo' as const)
}
export function ControleFuncionarios() {
  const modo = useModoFuncionario()
  return (
    <div role="group" aria-label="Funcionários" className="seg compacta">
      <span>Funcionários:</span>
      {(['completo', 'compacto', 'desligado'] as const).map(v => (
        <button key={v} type="button" aria-pressed={modo === v} onClick={() => definirModoFuncionario(v)}>
          {v === 'completo' ? 'Completo' : v === 'compacto' ? 'Só texto' : 'Desligado'}
        </button>
      ))}
    </div>
  )
}
const SOBRE: Record<string, string> = {
  inicio: 'Aqui você acompanha os números e avisos da família.',
  lancamentos: 'Aqui estão os gastos e entradas que vocês anotaram.',
  orcamento: 'Aqui você acompanha seu limite e suas sobras.',
  casa: 'Aqui você acompanha a lista e as compras da casa.',
  cartoes: 'Aqui você acompanha cartões e faturas.',
  guardado: 'Aqui você acompanha aplicações e imóveis.',
  planejamento: 'Aqui você define limites e planeja os próximos meses.',
  desejos: 'Aqui você organiza o que quer comprar.',
  escritorio: 'Aqui você vê tarefas e cadastros dos funcionários.',
  ajustes: 'Aqui você cuida da aparência e dos convites.',
  'primeiro-uso': 'Aqui você cria sua família e define os limites mensais.',
  privacidade: 'Aqui estão as opções de privacidade.',
  painel: 'Aqui o dono acompanha os indicadores do app.',
}
export function AjudaDaAba({ rota }: { rota: string }) {
  const { familia } = useApp()
  const [aberta, setAberta] = useState(false)
  return (
    <>
      <button type="button" className="btn ghost" onClick={() => setAberta(true)}>
        <Icone nome="ajuda" />
        Preciso de ajuda
      </button>
      {aberta && (
        <Sheet titulo="Preciso de ajuda" fechar={() => setAberta(false)}>
          <p>
            {familia?.papel === 'pessoa' && rota === 'inicio'
              ? 'Aqui você acompanha seu orçamento e seus avisos.'
              : SOBRE[rota] || 'Entre com seu e-mail ou com o convite do Assessor da Casa.'}
          </p>
          <p>Para registrar uma compra, use “Anotar gasto” ou “Anotar compra”.</p>
          {familia?.papel === 'equipe' ? (
            <p>
              Na Casa você acompanha tarefas e anota compras sem valores. Consulte seu resumo em Mais → Privacidade.
            </p>
          ) : (
            familia && (
              <>
                <p>Os números ficam no conteúdo da tela. O botão “?” explica de onde vieram.</p>
                <p>Use o olho para esconder ou mostrar valores. Ele também fica na folha de Anotar gasto.</p>
              </>
            )
          )}
          <p>
            {!familia
              ? 'Confira o e-mail ou o link do convite para entrar.'
              : familia.papel === 'casal'
                ? 'Você pode conferir os cadastros em Família e ajustes. Se divide a gestão, combine as correções com o outro adulto.'
                : 'Para pedir apoio, fale com quem administra a família.'}
          </p>
        </Sheet>
      )}
    </>
  )
}
let liberarRenderer: (() => void) | undefined
export function AgenteDaAba({ rota, semCena }: { rota: Rota; semCena?: boolean }) {
  const { familia, sessao, api } = useApp()
  if (familia?.papel === 'equipe' && rota === 'privacidade') return null
  if (!familia || rotaPermitida(rota, familia.papel, sessao?.dono) !== rota || !AGENTE_POR_ABA[rota]) return null
  return (
    <AgenteAutorizado
      key={[familia.id, rota, api.modo, familia.papel, familia.membroId, sessao?.userId].join(':')}
      rota={rota}
      semCena={semCena}
    />
  )
}
function AgenteAutorizado({ rota, semCena }: { rota: Rota; semCena?: boolean }) {
  const { familia, api, oculto, sessao } = useApp()
  const [subaba, setSubaba] = useState<string>()
  useEffect(() => {
    if (rota !== 'casa') return
    const acompanhar = (ev: MouseEvent) => {
      const alvo = typeof Element !== 'undefined' && ev.target instanceof Element ? ev.target.closest('button') : null
      if (alvo?.closest('[aria-label="Parte da casa"]')) setSubaba(alvo.textContent || undefined)
    }
    document.addEventListener('click', acompanhar)
    return () => document.removeEventListener('click', acompanhar)
  }, [rota])
  const { e, perguntas, responder, estado: leitura, atualizar } = useEscritorio()
  const insights = useInsightsDaAba(rota)
  const loja = lojaEscritorio(api, familia!.id)
  const escritorio = useSyncExternalStore(loja.assinar, loja.snapshot)
  const painel = useId()
  const modo = useModoFuncionario()
  const [expansao, setExpansao] = useState<{ modo: ModoFuncionario; pergunta?: string; valor: boolean } | null>(null)
  useEffect(() => setExpansao(null), [modo])
  const chaveVisita = ['agente:f33', api.modo, familia!.id, familia!.membroId, sessao?.userId, rota].join(':')
  const [visitaAnterior] = useState<{ perguntas: string[]; saudou: boolean } | null>(() => {
    try {
      const vista = JSON.parse(sessionStorage.getItem(chaveVisita) || 'null')
      return vista && Array.isArray(vista.perguntas) ? vista : null
    } catch {
      return null
    }
  })
  const [celular, setCelular] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 600px)').matches,
  )
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return
    const mq = matchMedia('(max-width: 600px)')
    const atualizar = () => setCelular(mq.matches)
    mq.addEventListener('change', atualizar)
    return () => mq.removeEventListener('change', atualizar)
  }, [])
  const [aberto, setAberto] = useState(false)
  const [celebrando, setCelebrando] = useState<{ funcionario: string } | null>(null)
  const elencoBase = elencoDaAba({ rota, papel: familia!.papel, ehDono: !!sessao?.dono, subaba })
  const idCanonico = (id: string) => APELIDO_BANCO[id] || id
  const primeira = insights.primeiraPerguntaInicio
  const primeiraAutorizada =
    primeira && funcionarioAutorizado(primeira.dono, familia!.papel, !!sessao?.dono) ? primeira : null
  const pendente =
    rota === 'inicio'
      ? primeiraAutorizada?.pergunta
      : perguntas.find(p => {
          const id = idCanonico(donoDaPergunta(p, e?.funcionarios || [])?.id || p.funcionario)
          if (celebrando && rota === 'casa' && id !== celebrando.funcionario) return false
          return (
            funcionarioAutorizado(id, familia!.papel, !!sessao?.dono) &&
            (rota === 'casa'
              ? EQUIPE.some(m => m.id === id && m.rota === rota)
              : [elencoBase.principal, ...elencoBase.secundarios].includes(id))
          )
        })
  const conferindo = leitura === 'buscando' || insights.estado === 'buscando'
  const falhou = leitura === 'erro' || insights.estado === 'erro'
  const proposta =
    !falhou && !conferindo && !pendente && e && !(celebrando && (rota === 'inicio' || rota === 'casa'))
      ? insights.pergunta
      : null
  const elenco = elencoDaAba({
    rota,
    papel: familia!.papel,
    ehDono: !!sessao?.dono,
    subaba,
    perguntaPendente: pendente || proposta || (celebrando ? { funcionario: celebrando.funcionario } : null),
    filaGeral: [
      ...(celebrando ? [{ funcionario: celebrando.funcionario }] : []),
      ...(primeiraAutorizada ? [{ funcionario: primeiraAutorizada.dono }] : []),
    ],
  })
  const ids = composicaoMini(elenco.sala, [elenco.principal, ...elenco.secundarios]).ids
  const id = pendente
    ? idCanonico(
        rota === 'inicio'
          ? primeiraAutorizada!.dono
          : donoDaPergunta(pendente, e?.funcionarios || [])?.id || pendente.funcionario,
      )
    : proposta?.funcionario || celebrando?.funcionario || elenco.principal
  const m = EQUIPE.find(m => m.id === id) || EQUIPE.find(m => m.id === AGENTE_POR_ABA[rota])!
  const f = e?.funcionarios.find(f => f.id === m.id)
  const fala = (texto: string) =>
    f?.trechosPrivados ? textoDeAgente(texto, f.trechosPrivados, oculto) : textoPrivado(texto, oculto)
  const p =
    familia?.papel !== 'casal' && rota === 'casa' && pendente
      ? {
          ...pendente,
          valor: undefined,
          contexto: '',
          pergunta:
            m.id === 'comprador'
              ? 'Pode conferir a tarefa da casa?'
              : /nota/.test(pendente.id)
                ? 'Pode guardar a nota da feira?'
                : /contagem|estoque/.test(pendente.id)
                  ? 'Pode contar o estoque?'
                  : 'Já fez a feira?',
          opcoes: pendente.opcoes
            .filter(o => o.pede !== 'valor')
            .map(o => ({
              ...o,
              pede2: o.pede2 === 'valor' ? undefined : o.pede2,
              rotulo: /R\$|\d/.test(o.rotulo) ? 'Responder' : o.rotulo,
            })),
        }
      : pendente || proposta
  const ultima = useRef<{ id: string; funcionario: string } | null>(null)
  const respostaVista = useRef(respostasConfirmadas.get(loja))
  const celebradas = useRef(new Set<string>())
  useEffect(() => {
    const celebrar = (id: string, funcionario: string) => {
      if (celebradas.current.has(id)) return
      celebradas.current.add(id)
      setCelebrando({ funcionario })
    }
    const anterior = ultima.current
    if (anterior && loja.travas.get(anterior.id) === 'respondida') {
      celebrar(anterior.id, anterior.funcionario)
      ultima.current = null
    }
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
  const marcarVista = useCallback(() => {
    if (proposta) insights.marcarVista(proposta.id)
  }, [proposta?.id, insights.marcarVista])
  const precisa = !!p && !loja.travas.has(p.id)
  const estado: EstadoAgente =
    celebrando?.funcionario === m.id
      ? 'resolvido'
      : precisa
        ? 'chamando'
        : f?.estado === 'trabalhando' || e?.trabalhando?.some(t => t.funcionario === m.id)
          ? 'trabalhando'
          : 'parado'
  const [fotoErro, setFotoErro] = useState('')
  const [guardandoFoto, setGuardandoFoto] = useState(false)
  const fotoTrava = useRef(false)
  const anexarFoto = async (arquivo: File) => {
    if (fotoTrava.current) return
    fotoTrava.current = true
    setGuardandoFoto(true)
    setFotoErro('')
    try {
      if (await insights.anexarNota(await reduzirFoto(arquivo))) setCelebrando({ funcionario: 'fiscal' })
      else setFotoErro('Não deu certo. Tente de novo.')
    } catch {
      setFotoErro('Não deu certo. Tente de novo.')
    } finally {
      fotoTrava.current = false
      setGuardandoFoto(false)
    }
  }
  const expandido = expansao?.modo === modo && expansao.pergunta === p?.id ? expansao.valor : null
  const falaPergunta = (texto: string) =>
    textoDeAgente(texto, [...(p?.trechosPrivados || []), ...nomesPrivados([familia, sessao])], oculto)
  const completo = modo === 'completo' && !semCena
  const conversa =
    expandido ??
    Boolean(
      falhou ||
      conferindo ||
      celebrando ||
      !(celular && visitaAnterior && (!p || visitaAnterior.perguntas.includes(p.id))),
    )
  const mostraConferencia = (falhou || conferindo) && !(p && loja.travas.get(p.id) === 'respondida')
  const areaConversa = useRef<HTMLDivElement>(null)
  const botaoConversa = useRef<HTMLButtonElement>(null)
  const moverFoco = useRef<{ expandir: boolean; pergunta?: string } | null>(null)
  const focarResposta = useCallback(
    (botao: HTMLButtonElement | null) => {
      if (!botao || botao.disabled || !moverFoco.current?.expandir || moverFoco.current.pergunta !== p?.id) return
      moverFoco.current = null
      botao.focus()
    },
    [p?.id],
  )
  useEffect(() => {
    if (moverFoco.current?.expandir !== conversa) return
    if (!conversa || mostraConferencia || !p?.opcoes.length) {
      moverFoco.current = null
      const alvo = conversa ? areaConversa.current : botaoConversa.current
      alvo?.focus()
    }
  }, [conversa, mostraConferencia, p?.id, p?.opcoes.length])
  const alternarConversa = () => {
    moverFoco.current = { expandir: !conversa, pergunta: p?.id }
    setExpansao({ modo, pergunta: p?.id, valor: !conversa })
  }
  const saudar =
    !visitaAnterior?.saudou &&
    !f?.frase?.includes(familia!.membroNome) &&
    nomeInformado(familia?.membroNome) &&
    !/R\$|[0-9]/.test(familia!.membroNome)
  useEffect(() => {
    if (conferindo || falhou) return
    try {
      const anterior = JSON.parse(sessionStorage.getItem(chaveVisita) || 'null')
      sessionStorage.setItem(
        chaveVisita,
        JSON.stringify({
          saudou: true,
          perguntas: [...new Set([...(anterior?.perguntas || []), ...(p ? [p.id] : [])])],
        }),
      )
    } catch {
      /* storage indisponível: mantém a conversa aberta */
    }
  }, [chaveVisita, p?.id, conferindo, falhou])
  const funcionarios = ids.map(id => ({
    id,
    estado: (id === m.id
      ? estado
      : celebrando?.funcionario === id
        ? 'resolvido'
        : e?.funcionarios.find(f => f.id === id)?.estado === 'trabalhando' ||
            e?.trabalhando?.some(t => t.funcionario === id)
          ? 'trabalhando'
          : 'parado') as EstadoAgente,
  }))
  const descricao =
    'Escritório ilustrativo com ' +
    ids.map(id => EQUIPE.find(m => m.id === id)!.nome).join(' e ') +
    '. Objetos sem dados pessoais.'
  const restrito = familia!.papel !== 'casal'
  const papel =
    restrito && rota === 'casa'
      ? m.id === 'presenca'
        ? 'Acompanha seu próprio ponto.'
        : 'Acompanha as tarefas da casa, sem valores em dinheiro.'
      : m.papel
  return (
    <section
      className={
        'card agente-aba' + (!completo && !p ? ' agente-compacto' : '') + (!conversa ? ' agente-recolhido' : '')
      }
      data-agente={m.id}
      data-principal={elenco.principal}
      aria-label={descricao}
    >
      <div className={'agente-identidade' + (completo ? ' com-cena' : '')}>
        {completo && (
          <MiniAgente
            conferencia={celebrando ? undefined : falhou ? 'erro' : conferindo ? 'buscando' : undefined}
            id={elenco.principal}
            sala={elenco.sala}
            estado={estado}
            funcionarios={funcionarios}
          />
        )}
        <header className="agente-aba-cabecalho">
          <b>{m.nome}</b>
          <small className="agente-papel">
            <Icone desenho={desenhoFuncionario(m.id)} />
            {papel}
          </small>
          {ids.filter(id => id !== m.id).length > 0 && (
            <small className="agente-com">
              Com{' '}
              {ids
                .filter(id => id !== m.id)
                .map(id => EQUIPE.find(m => m.id === id)!.nome)
                .join(', ')}
            </small>
          )}
          {api.modo === 'exemplo' && (
            <small className="agente-exemplo" title="Nada é gravado na família real">
              Exemplo<span className="sr">: nada é gravado na família real</span>
            </small>
          )}
        </header>
      </div>
      {!conversa && p && <p className="agente-pergunta-resumo">{falaPergunta(p.pergunta)}</p>}
      <div ref={areaConversa} tabIndex={-1} id={painel + '-conversa'} hidden={!conversa} className="agente-conversa">
        {conversa &&
          (mostraConferencia ? (
            <Conferencia
              erro={falhou}
              repetir={() => {
                atualizar()
                insights.atualizar()
              }}
            />
          ) : p ? (
            <PerguntaCard
              key={p.id}
              p={p}
              quem={m.nome}
              responder={pendente ? responder : insights.responder}
              aoExibir={proposta ? marcarVista : undefined}
              primeiraResposta={focarResposta}
              compacto
              semQuem
            />
          ) : (
            <div className="perg">
              <p>
                {saudar && <>Olá, {textoPrivado(familia!.membroNome, oculto)}. </>}
                {(m.id === 'analista' ? insights.falaDoAnalista : null) ||
                  CONVITE[m.id] ||
                  (!restrito && f?.frase && f.frase !== papel
                    ? fala(f.frase)
                    : 'Confira os avisos e escolha por onde começar.')}
              </p>
            </div>
          ))}
      </div>
      <div className="agente-acoes">
        {p?.contexto && (
          <details className="agente-contexto">
            <summary>Detalhes</summary>
            <p className="perg-c">{falaPergunta(p.contexto)}</p>
          </details>
        )}
        {(modo !== 'desligado' || p) && (
          <button
            ref={botaoConversa}
            type="button"
            className="btn ghost agente-recolher"
            aria-expanded={conversa}
            aria-controls={painel + '-conversa'}
            onClick={alternarConversa}
          >
            <Icone desenho={ChevronDown} />
            {conversa ? 'Recolher' : p ? 'Responder' : 'Expandir'}
          </button>
        )}
        <button
          type="button"
          className={'btn ghost agente-aba-divulgacao'}
          aria-expanded={aberto}
          aria-controls={painel}
          onClick={() => setAberto(!aberto)}
        >
          <Icone nome="escritorio" />
          {['cartao', 'fiscal', 'guardado', 'tesoureiro', 'secretaria', 'contador'].includes(m.id)
            ? 'Ver tarefas'
            : 'Ver resumo'}
          <Icone desenho={ChevronDown} aria-hidden="true" />
        </button>
      </div>
      <div id={painel} hidden={!aberto}>
        {aberto && (
          <Suspense fallback={<Carregando />}>
            {restrito && rota === 'casa' && m.id !== 'fiscal' ? (
              <p>Consulte suas tarefas na Casa. A lista e o gás ficam nas opções desta tela.</p>
            ) : ['cartao', 'fiscal', 'guardado', 'tesoureiro', 'secretaria', 'contador'].includes(m.id) ? (
              <Cadastro id={m.id} />
            ) : (
              <NumerosAba id={m.id} fechar={() => setAberto(false)} />
            )}
          </Suspense>
        )}
      </div>
      {insights.notaPendente && (
        <Sheet titulo="Guardar a nota da feira" fechar={insights.fecharNota}>
          <label className="campo">
            <span>Foto da nota</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={guardandoFoto}
              onChange={ev => {
                const arquivo = ev.target.files?.[0]
                ev.target.value = ''
                if (arquivo) void anexarFoto(arquivo)
              }}
            />
          </label>
          {guardandoFoto && <p role="status">Guardando a nota…</p>}
          {fotoErro && <p role="alert">{fotoErro}</p>}
        </Sheet>
      )}
    </section>
  )
}
export const MiniAgente = memo(function MiniAgente({
  id,
  sala,
  estado = 'trabalhando',
  funcionarios,
  conferencia,
}: {
  conferencia?: 'erro' | 'buscando'
  id: string
  sala: SalaEquipe
  estado?: EstadoAgente
  funcionarios?: { id: string; estado: EstadoAgente }[]
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const cenaAtual = useRef<Cena>()
  const pessoas = funcionarios || [{ id, estado }]
  const chave = pessoas.map(p => p.id).join(':')
  const estados = JSON.stringify(pessoas)
  const estadoAtual = useRef(pessoas)
  estadoAtual.current = pessoas
  const [lista, setLista] = useState(false)
  const [visivel, setVisivel] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    if (visivel || lista || !caixa.current) return
    const observer = new IntersectionObserver(entradas => {
      if (entradas.some(e => e.isIntersecting)) setVisivel(true)
    })
    observer.observe(caixa.current)
    return () => observer.disconnect()
  }, [visivel, lista])
  useEffect(() => {
    estadoAtual.current.forEach(p => cenaAtual.current?.definirEstado(p.id, p.estado))
  }, [estados])
  useEffect(() => {
    const el = caixa.current
    if (!el) return
    if (new URLSearchParams(location.search).has('sem3d') || /[?&]sem3d/.test(location.hash)) {
      setLista(true)
      return
    }
    if (!visivel) return
    if (!temWebGL()) {
      setLista(true)
      return
    }
    const escuroAgora = () => {
      const t = document.documentElement.dataset.theme
      return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    }
    let cena: Cena | undefined
    const falhar = () => {
      cena?.destruir()
      cena = undefined
      cenaAtual.current = undefined
      setLista(true)
    }
    setLista(false)
    liberarRenderer?.()
    const cancelar = tentarCarregarCena(
      () => Promise.all([import('./tres'), import('./cena3d')]),
      ([T, modulo]) => {
        const opcoes = {
          mini: true,
          sala,
          funcionarios: estadoAtual.current.map(p => ({ id: p.id, sala, estado: 'trabalhando' as const })),
          etiqueta: () => null,
          placa: () => null,
          aoTocar() {},
          escuro: escuroAgora(),
          celular: () => true,
          hora: () => 12,
          parado: matchMedia('(prefers-reduced-motion: reduce)').matches,
          aoContexto: (estado: 'perdido' | 'restaurado' | 'falhou') => {
            if (estado === 'falhou') falhar()
          },
        }
        cena = modulo.montarCena(T, el, opcoes)
        cena.irPara(sala)
        cenaAtual.current = cena
        estadoAtual.current.forEach(p => cena!.definirEstado(p.id, p.estado))
      },
      falhar,
    )
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const tema = () => cena?.tema(escuroAgora())
    mq.addEventListener('change', tema)
    const obs = new MutationObserver(tema)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const destruir = () => {
      mq.removeEventListener('change', tema)
      obs.disconnect()
      cancelar()
      cena?.destruir()
      cena = undefined
      cenaAtual.current = undefined
    }
    const abrirEscritorio = () => {
      destruir()
      setLista(true)
    }
    window.addEventListener('escritorio3d-abrir', abrirEscritorio)
    liberarRenderer = destruir
    return () => {
      window.removeEventListener('escritorio3d-abrir', abrirEscritorio)
      destruir()
      if (liberarRenderer === destruir) liberarRenderer = undefined
    }
  }, [chave, sala, visivel])
  return lista ? (
    <span className="sub">
      Em lista ·{' '}
      {conferencia
        ? conferencia === 'erro'
          ? 'Não foi possível conferir'
          : 'Conferindo…'
        : {
            chamando: 'Precisa de você',
            resolvido: 'Respondido',
            parado: 'Sem pendências',
            trabalhando: 'Trabalhando',
          }[estado]}
    </span>
  ) : (
    <div className="cena3d mini-agente" ref={caixa} aria-hidden="true">
      {!visivel && (
        <span className="cena3d-espera">
          <Icone nome="escritorio" />
        </span>
      )}
    </div>
  )
})
