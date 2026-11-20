import './agente-cartao.css'
import { EstadoVazioVisual } from './EstadoVazioVisual'
import { CasaVazia, Erro } from './ilustracoes/figuras'
import { Icone, desenhoFuncionario } from './Icone'
import { EQUIPE } from '../telas/escritorio/equipe'
import { nomesPrivados, textoDeAgente, rotuloDeOpcao } from '../lib/textoAgente'
import { lojaEscritorio } from '../app/escritorioCompartilhado'
import { copiarProtegido } from './privacidade'
import { textoPrivado, CampoPrivado } from './privacidade'
import { useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from 'react'
import { Camera, Check, Copy } from 'lucide-react'
import type { EstadoItem, ItemEstoque, OpcaoPergunta, Pede, PerguntaEsc } from '../api/tipos'
import { useApp } from '../app/contexto'
import { CampoValor, ContextoDialogo, superficieDialogo } from './base'
import { umaPorVez } from '../lib/seguro'
import { reduzirFoto } from '../lib/foto'
import { hojeRecife, textoParaValor, valorDigitadoValido } from '../lib/formato'

/** Rosto do funcionário nas listas: ícone num círculo (o boneco 3D só existe na tela Escritório). */
function rotuloCurto(texto: string) {
  const curtos: Record<string, string> = {
    'Anexar a nota agora': 'Anexar nota',
    'Anexar depois': 'Depois',
    'Não teve nota': 'Sem nota',
    'Vou tirar o dinheiro': 'Retirar',
    'Decido depois': 'Depois',
    'Informar outro dia de pagamento': 'Outro dia',
    'Ver compras desta fatura': 'Ver compras',
    'Confirmar recebimento': 'Recebi',
    'Reagendar previsão': 'Reagendar',
    'Explicar por que não houve nota': 'Sem nota',
    'Revisar aportes ou premissas': 'Revisar plano',
  }
  return curtos[texto] || texto
}

export function FuncIco({ id, size = 40, precisa }: { id: string; size?: number; precisa?: boolean }) {
  return (
    <span
      className={'tile func' + (precisa ? ' precisa' : '')}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {<Icone desenho={desenhoFuncionario(id)} />}
    </span>
  )
}

/** Devolve false se não gravou; a mensagem pronta quando a opção é copiar. */
export type Responder = (
  pergunta: string,
  opcao: string,
  dados?: Record<string, unknown>,
) => Promise<boolean | { mensagem?: string }>
// A confirmação também chega ao mini quando a releitura já retirou a trava/pergunta
// antes de o React pintar. Apenas metadados transitórios, na mesma loja da família.
export const respostasConfirmadas = new WeakMap<object, { id: string; funcionario: string }>()
const ESTADOS: [EstadoItem, string][] = [
  ['tem', 'Tem'],
  ['pouco', 'Pouco'],
  ['acabou', 'Acabou'],
]

/** Lista dos itens da casa pra marcar tem, pouco ou acabou. */
export function Contagem({
  salvar,
  gravando,
}: {
  salvar: (itens: { item_id: string; estado: EstadoItem }[]) => void
  gravando: boolean
}) {
  const { api, familia } = useApp()
  const [itens, setItens] = useState<ItemEstoque[] | null>(null)
  const [marca, setMarca] = useState<Record<string, EstadoItem>>({})
  const [erro, setErro] = useState('')
  useEffect(() => {
    if (familia)
      api
        .estoque(familia.id)
        .then(x => setItens(x.itens.filter(i => i.ativo)))
        .catch((x: Error) => setErro(x.message))
  }, [api, familia?.id])
  if (erro)
    return (
      <div role="alert">
        <EstadoVazioVisual ilustracao={<Erro />} titulo="Não foi possível buscar os itens" frase={textoPrivado(erro)} />
      </div>
    )
  if (!itens) return <p className="sub">Buscando os itens da casa…</p>
  if (!itens.length)
    return (
      <EstadoVazioVisual
        ilustracao={<CasaVazia />}
        titulo="Ainda não tem item cadastrado."
        frase={'O casal cadastra na ficha do Ajudante da Feira, em "O que eu cuido".'}
      />
    )
  return (
    <div className="contagem">
      <ul className="list">
        {itens.map(i => (
          <li key={i.id} className="cont-l">
            <span className="tile">
              <Icone nome="casa" />
            </span>
            <span className="n">
              <b>{textoPrivado(i.nome)}</b>
              <small>{textoPrivado(i.categoria)}</small>
            </span>
            <span className="seg tres" role="group" aria-label={textoPrivado(`${i.nome}: como está`)}>
              {ESTADOS.map(([e, r]) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={(marca[i.id] || 'tem') === e}
                  onClick={() => setMarca({ ...marca, [i.id]: e })}
                >
                  {r}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn primary full"
        disabled={gravando}
        onClick={() => salvar(itens.map(i => ({ item_id: i.id, estado: marca[i.id] || 'tem' })))}
      >
        Salvar a contagem
      </button>
    </div>
  )
}

/**
 * 1 pergunta de 1 funcionário, com os botões de resposta. 1 passo por vez (padrão do Cobrador do app do Michel):
 * resposta simples grava com 1 toque; resposta que pede dia, valor, texto, foto ou contagem abre só esse passo.
 */
export function PerguntaCard({
  p,
  quem,
  responder,
  posicao,
  abrirCadastro,
  semQuem,
  corrige,
  aoResponder,
  aoExibir,
  compacto,
  primeiraResposta,
}: {
  p: PerguntaEsc
  quem: string
  responder: Responder
  posicao?: string
  abrirCadastro?: () => void
  semQuem?: boolean
  compacto?: boolean
  corrige?: boolean
  aoResponder?: () => void
  aoExibir?: () => void
  primeiraResposta?: Ref<HTMLButtonElement>
}) {
  const { abrirLancar, familia, api, tentar, oculto, sessao, resumo } = useApp()
  const privados = [...(p.trechosPrivados || []), ...nomesPrivados([familia, sessao, resumo])]
  const fala = (texto: string) =>
    p.trechosPrivados ? textoDeAgente(texto, privados, oculto) : textoPrivado(texto, oculto)
  const loja = lojaEscritorio(api, familia?.id || '')
  useSyncExternalStore(loja.assinar, loja.snapshot)
  const dialogo = useContext(ContextoDialogo)
  const dialogoAtivo = useSyncExternalStore(superficieDialogo.assinar, superficieDialogo.snapshot, () => null)
  const instancia = useRef({ dialogo })
  useEffect(() => {
    const donos = loja.donos.get(p.id) || new Set<object>()
    loja.donos.set(p.id, donos)
    donos.add(instancia.current)
    loja.emitir()
    const dono = instancia.current
    return () => {
      donos.delete(dono)
      loja.emitir()
    }
  }, [loja, p.id])
  const dono = [...(loja.donos.get(p.id) || [])].find(
    candidato => (candidato as { dialogo: object | null }).dialogo === dialogoAtivo,
  )
  const bloqueio = loja.travas.get(p.id)
  useEffect(() => {
    if (dono === instancia.current && !bloqueio) aoExibir?.()
  }, [dono, bloqueio, aoExibir])
  const equipe = familia?.papel === 'equipe'
  const [aberta, setAberta] = useState<OpcaoPergunta | null>(null)
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [gravando, setGravando] = useState(false)
  const [copiado, setCopiado] = useState('')
  const [erro, setErro] = useState('')
  const camera = useRef<HTMLInputElement>(null)
  // trava do toque duplo: vale no mesmo instante do 1º toque
  const trava = useMemo(
    () =>
      umaPorVez(async (opcao: string, dados?: Record<string, unknown>) => {
        setGravando(true)
        try {
          const r = await responder(p.id, opcao, dados)
          if (r !== false) {
            respostasConfirmadas.set(loja, {
              id: p.id,
              funcionario: EQUIPE.find(m => m.nome === quem)?.id || p.funcionario,
            })
            loja.emitir()
            aoResponder?.()
          } else setErro('Não deu certo. Tente de novo.')
        } catch {
          setErro('Não deu certo. Tente de novo.')
        } finally {
          setGravando(false)
        }
      }),
    [responder, p.id, aoResponder, loja, quem],
  )
  // corrigindo uma resposta antiga: vai junto pra o diário guardar a antiga e valer a nova
  const extra = corrige ? { corrige: true } : undefined

  const tocar = async (o: OpcaoPergunta) => {
    setErro('')
    // atalhos (`abre`): levam pra onde a coisa se resolve. Lançar e cadastro não gravam resposta: a pergunta some quando o dado entrar.
    if (o.abre === 'lancar' || /^lancar/.test(o.id)) {
      abrirLancar(/dif/.test(p.id) && p.valor ? { valor: p.valor, descricao: 'Diferença da fatura' } : undefined)
      return
    }
    if (o.abre === 'cartao') {
      if (abrirCadastro) abrirCadastro()
      else location.hash = '#/escritorio?f=' + p.funcionario
      return
    }
    if (o.abre === 'guardado') {
      await trava(o.id, extra)
      location.hash = '#/guardado'
      return
    }
    if (o.abre === 'orcamento') {
      await trava(o.id, extra)
      location.hash = '#/orcamento'
      return
    }
    if (/^copiar/.test(o.id)) {
      // a mensagem pronta vem na resposta do banco (efeito.mensagem)
      setGravando(true)
      const r = await responder(p.id, o.id, extra)
      if (r !== false) {
        respostasConfirmadas.set(loja, {
          id: p.id,
          funcionario: EQUIPE.find(m => m.nome === quem)?.id || p.funcionario,
        })
        loja.emitir()
      }
      setGravando(false)
      const texto = (typeof r === 'object' && r.mensagem) || p.mensagem || ''
      if (texto) {
        try {
          await copiarProtegido(texto, 'Conteúdo oculto.')
        } catch {
          /* sem permissão: o texto aparece logo abaixo pra copiar à mão */
        }
        setCopiado(texto)
      }
      return
    }
    if (o.pede || o.abre === 'nota' || o.abre === 'contagem') {
      setAberta(aberta?.id === o.id ? null : o)
      setCampos({ data: hojeRecife() })
      return
    }
    trava(o.id, extra)
  }
  const tipos = aberta
    ? ([aberta.pede, aberta.pede2].filter(Boolean) as Pede[]).filter(t => !(equipe && t === 'valor'))
    : []
  const salvar = () => {
    if (!aberta) return
    const dados: Record<string, unknown> = { ...extra }
    for (const t of tipos) {
      const obrig = t === aberta.pede,
        v = (campos[t] || '').trim()
      if (t === 'valor') {
        if (!v && !obrig) continue
        if (!valorDigitadoValido(v) || textoParaValor(v) <= 0) {
          setErro('Digite o valor, por exemplo 312,40.')
          return
        }
        dados.valor = textoParaValor(v)
      }
      if (t === 'data') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
          if (!obrig) continue
          setErro('Escolha o dia.')
          return
        }
        dados.data = v
      }
      if (t === 'texto') {
        if (!v) {
          if (!obrig) continue
          setErro('Escreva a resposta.')
          return
        }
        dados.texto = v
      }
    }
    trava(aberta.id, dados)
  }
  const foto = async (arq: File | null) => {
    if (!aberta || !familia) return
    setGravando(true)
    setErro('')
    let caminho = ''
    const ok = await tentar(async () => {
      // a nota é guardada como foto reduzida; no exemplo nenhuma foto sai do aparelho
      const b64 = arq ? await reduzirFoto(arq) : 'exemplo'
      caminho = await api.notaSubir(familia.id, p.id.split(':')[1] || '', b64)
    })
    setGravando(false)
    if (ok) trava(aberta.id, { ...extra, caminho })
  }
  const rotuloTexto = /nota/.test(aberta?.id || '') ? 'Por que não teve nota? (feira livre, açougue)' : 'Escreva aqui'

  if (dono !== instancia.current) return null
  if (bloqueio)
    return (
      <div className="perg" data-pergunta={p.id} role="status">
        {bloqueio === 'enviando' ? 'Enviando resposta...' : 'Respondida, atualizando...'}
        {bloqueio === 'respondida' && (
          <>
            <p role="alert">Resposta enviada. Recarregue para confirmar.</p>
            <button
              type="button"
              onClick={() => {
                if (familia) void loja.ler(api, familia.id)
              }}
            >
              Recarregar
            </button>
          </>
        )}
      </div>
    )
  return (
    <div className="perg" data-pergunta={p.id}>
      {!semQuem && (
        <p className="perg-quem">
          <FuncIco id={p.funcionario} size={32} precisa />
          <span>
            <b>{EQUIPE.some(m => m.nome === quem) ? quem : textoPrivado(quem)}</b>
            {posicao ? ` · ${posicao}` : ''}
          </span>
          {(p.espera_dias || 0) > 0 && (
            <span className="chip warn">
              {p.espera_dias === 1 ? 'esperando há 1 dia' : `esperando há ${p.espera_dias} dias`}
            </span>
          )}
        </p>
      )}
      <p className="perg-t">{fala(p.pergunta)}</p>
      {p.contexto && !compacto && <p className="perg-c">{fala(p.contexto)}</p>}
      <div className="perg-ops" role="group" aria-label="Respostas">
        {p.opcoes.map((o, i) => {
          const rotulo = rotuloDeOpcao(o.rotulo, i, privados, oculto)
          const visivel = compacto ? rotuloCurto(rotulo) : rotulo
          return (
            <button
              key={o.id}
              ref={i === 0 ? primeiraResposta : undefined}
              type="button"
              className={'btn' + (i === 0 ? ' primary' : ' line')}
              title={compacto ? rotulo : undefined}
              disabled={gravando}
              aria-label={visivel}
              aria-expanded={o.pede ? aberta?.id === o.id : undefined}
              onClick={() => tocar(o)}
            >
              {/^copiar/.test(o.id) && <Icone desenho={Copy} />}
              {o.abre === 'nota' && <Icone desenho={Camera} />}
              {!/^copiar/.test(o.id) && o.abre !== 'nota' && <Icone nome="abrir" />}
              {visivel}
            </button>
          )
        })}
      </div>
      {copiado && (
        <p className="perg-msg" role="status">
          <Icone desenho={Check} aria-hidden="true" />
          <span>Copiado. Cole no WhatsApp: "{textoPrivado(copiado)}"</span>
        </p>
      )}
      {aberta?.abre === 'nota' && (
        <div className="perg-campo col">
          <input
            ref={camera}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={ev => {
              const f = ev.target.files?.[0]
              ev.target.value = ''
              if (f) foto(f)
            }}
          />
          <button type="button" className="btn primary" disabled={gravando} onClick={() => camera.current?.click()}>
            <Icone desenho={Camera} />
            {gravando ? 'Guardando a nota…' : 'Tirar foto da nota'}
          </button>
          {api.modo === 'exemplo' && (
            <button type="button" className="btn line" disabled={gravando} onClick={() => foto(null)}>
              Usar uma nota de exemplo
            </button>
          )}
          <p className="sub">
            {equipe
              ? 'A foto vai para o casal. Você não precisa digitar nenhum valor.'
              : 'A foto fica guardada junto da feira, só para família.'}
          </p>
        </div>
      )}
      {aberta?.abre === 'contagem' && (
        <div className="perg-campo col">
          <Contagem gravando={gravando} salvar={itens => trava(aberta.id, { ...extra, itens })} />
        </div>
      )}
      {aberta && !aberta.abre && (
        <div className="perg-campo">
          {tipos.map(t => {
            const opc = t !== aberta.pede ? ' (se quiser)' : ''
            return t === 'data' ? (
              <label className="campo" key={t}>
                <span>Em que dia?{opc}</span>
                <input
                  className="inp"
                  type="date"
                  value={campos.data || ''}
                  onChange={ev => setCampos({ ...campos, data: ev.target.value })}
                />
              </label>
            ) : t === 'valor' ? (
              <div className="campo" key={t}>
                <span>
                  {/feira/.test(p.id) ? 'Quanto deu?' : 'Qual é o valor?'}
                  {opc}
                </span>
                <CampoValor valor={campos.valor || ''} mudar={v => setCampos({ ...campos, valor: v })} rotulo="Valor" />
              </div>
            ) : (
              <label className="campo" key={t}>
                <span>
                  {rotuloTexto}
                  {opc}
                </span>
                <CampoPrivado
                  className="inp"
                  value={campos.texto || ''}
                  maxLength={140}
                  onChange={ev => setCampos({ ...campos, texto: ev.target.value })}
                />
              </label>
            )
          })}
          {!tipos.length && <p className="sub">É só confirmar.</p>}
          <button type="button" className="btn primary" disabled={gravando} onClick={salvar}>
            <Icone nome="salvo" />
            Salvar resposta
          </button>
        </div>
      )}
      {erro && (
        <div role="alert">
          <EstadoVazioVisual ilustracao={<Erro />} titulo="Não foi possível responder" frase={textoPrivado(erro)} />
        </div>
      )}
    </div>
  )
}
