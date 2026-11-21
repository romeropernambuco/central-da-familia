import { textoPrivado, PONTOS } from '../lib/olho'
import { rascunhos } from '../app/rascunhos'
import { createContext, useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { useApp } from '../app/contexto'
import { useOculto } from '../app/useOculto'
import { X } from 'lucide-react'
import { milhar, partesDinheiro, reais } from '../lib/formato'
import type { LinhaExplicacao } from '../api/tipos'
import { Icone, type NomeIcone } from './Icone'

type VarianteBotao = 'primario' | 'secundario' | 'fantasma' | 'perigo' | 'icone-so'
const variantes = {
  primario: 'primary',
  secundario: 'line',
  fantasma: 'ghost',
  perigo: 'danger',
  'icone-so': 'iconbtn',
}
export function Botao({
  variante = 'secundario',
  carregando = false,
  icone,
  children,
  className = '',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBotao; carregando?: boolean; icone?: NomeIcone }) {
  return (
    <button
      type="button"
      {...props}
      className={`btn ${variantes[variante]} ${className}`}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
    >
      {icone && <Icone nome={icone} />}
      {children}
      {carregando && <Icone nome="pendente" />}
    </button>
  )
}

export function CabecalhoTela({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string
  subtitulo?: ReactNode
  acao?: ReactNode
}) {
  return (
    <header className="top">
      <div className="tt">
        {subtitulo && <small>{subtitulo}</small>}
        <h1>{titulo}</h1>
      </div>
      {acao}
    </header>
  )
}

export function CabecalhoCartao({ titulo, icone, acao }: { titulo: ReactNode; icone: NomeIcone; acao?: ReactNode }) {
  return (
    <div className="card-h">
      <h2>
        <span className="icone-chip">
          <Icone nome={icone} />
        </span>
        {titulo}
      </h2>
      {acao}
    </div>
  )
}

/** Superfície de navegação: o conteúdo deve ser estático, sem controles aninhados. */
export function CartaoClicavel({ href, children, rotulo }: { href: string; children: ReactNode; rotulo: string }) {
  return (
    <a href={href} className="card card-clicavel" aria-label={rotulo}>
      <div>{children}</div>
      <Icone nome="abrir" />
    </a>
  )
}

export function SeloEstado({ estado, children }: { estado: 'salvo' | 'erro' | 'pendente'; children: ReactNode }) {
  return (
    <span className={`chip estado-${estado}`}>
      <Icone nome={estado} />
      {children}
    </span>
  )
}

/** Dinheiro: número em Bricolage, "R$" em Figtree cinza, ",00" some. */
export function Din({
  v,
  tam,
  className = '',
  menos,
}: {
  v: number
  tam?: 'hero' | 'big' | 'mid'
  className?: string
  /** linha que tira da conta: "menos R$ 970" (nunca o sinal de menos) */ menos?: boolean
}) {
  if (useOculto())
    return (
      <span className={`din ${tam || ''} ${className}`} aria-label="valor escondido">
        <span className="cur">R$</span>
        {PONTOS}
      </span>
    )
  const p = partesDinheiro(v)
  // nada aparece negativo: o que passou vira "passou R$ X" em âmbar (o vermelho não existe)
  const passou = !!p.sinal && !menos
  const pre = menos ? 'menos ' : passou ? 'passou ' : ''
  return (
    <span className={`din ${tam || ''} ${className}${passou ? ' neg' : ''}`} aria-label={pre + reais(Math.abs(v))}>
      {pre && <span className="pre">{pre}</span>}
      <span className="cur">R$</span>
      {p.inteiro}
      {p.cents && <span className="cents">{p.cents}</span>}
    </span>
  )
}

// Apenas a superficie do ultimo dialogo aberto pode oferecer perguntas.
export const ContextoDialogo = createContext<object | null>(null)
const dialogos = new Set<object>()
const ouvintesDialogo = new Set<() => void>()
export const superficieDialogo = {
  assinar: (ouvir: () => void) => {
    ouvintesDialogo.add(ouvir)
    return () => {
      ouvintesDialogo.delete(ouvir)
    }
  },
  snapshot: () => Array.from(dialogos).slice(-1)[0] ?? null,
}
function emitirDialogo() {
  ouvintesDialogo.forEach(ouvir => ouvir())
}

const FOCAVEL =
  'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** `lado`: no computador vira painel lateral (no celular continua subindo de baixo). */
export function Sheet({
  titulo,
  fechar,
  children,
  rotulo,
  lado,
  cabecalho,
  subtitulo,
}: {
  titulo: string
  fechar: () => void
  children: ReactNode
  rotulo?: string
  lado?: boolean
  cabecalho?: ReactNode
  subtitulo?: string
}) {
  const dialogo = useRef({})
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const id = dialogo.current
    dialogos.add(id)
    emitirDialogo()
    return () => {
      dialogos.delete(id)
      emitirDialogo()
    }
  }, [])
  // `fechar` costuma ser uma função nova a cada desenho da tela de trás. Guardada em ref, ela não refaz o efeito:
  // antes, cada letra digitada num campo da folha jogava o foco pra fora do campo (não dava pra digitar o nome da família).
  const fecharRef = useRef(fechar)
  fecharRef.current = fechar
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null
    const caixa = ref.current
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        fecharRef.current()
        return
      }
      if (e.key !== 'Tab' || !caixa) return
      // Tab fica preso dentro da folha
      const itens = [...caixa.querySelectorAll<HTMLElement>(FOCAVEL)].filter(x => x.offsetParent !== null)
      if (!itens.length) {
        e.preventDefault()
        caixa.focus()
        return
      }
      const pri = itens[0],
        ult = itens[itens.length - 1]
      const at = document.activeElement
      if (e.shiftKey && (at === pri || at === caixa || !caixa.contains(at))) {
        e.preventDefault()
        ult.focus()
      } else if (!e.shiftKey && (at === ult || !caixa.contains(at))) {
        e.preventDefault()
        pri.focus()
      }
    }
    document.addEventListener('keydown', tecla)
    caixa?.focus()
    return () => {
      document.removeEventListener('keydown', tecla)
      // devolve o foco pra onde estava (o botão que abriu), se ele ainda existir na tela
      if (antes && document.contains(antes)) antes.focus({ preventScroll: true })
    }
  }, [])
  return (
    <>
      <div className="scrim" onClick={fechar} />
      <div
        className={'sheet' + (lado ? ' lado' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={rotulo || titulo}
        ref={ref}
        tabIndex={-1}
      >
        <div className={subtitulo ? 'sheet-top aba-cabecalho' : 'sheet-top'}>
          {subtitulo ? (
            <div className="tt">
              <h2>{titulo}</h2>
              <small>{subtitulo}</small>
            </div>
          ) : (
            <h2>{titulo}</h2>
          )}
          {cabecalho}
          <button className="iconbtn" type="button" onClick={fechar} aria-label="Fechar">
            <Icone desenho={X} />
          </button>
        </div>
        <div className="sheet-body">
          {rascunhos.size > 0 && (
            <p className="sub" role="status">
              Continuar de onde parou: o rascunho fica nesta sessão ao fechar.
            </p>
          )}
          <ContextoDialogo.Provider value={dialogo.current}>{children}</ContextoDialogo.Provider>
        </div>
      </div>
    </>
  )
}

/** Conteúdo do "De onde veio esse número?": linhas do banco, a última é o resultado. */
export function Explicacao({ linhas, nota }: { linhas: LinhaExplicacao[]; nota?: string }) {
  return (
    <>
      <ul className="exp">
        {linhas.map((l, i) => (
          <li key={i} className={i === linhas.length - 1 ? 'tot' : ''}>
            <span>{textoPrivado(l.linha)}</span>
            {/* linha do meio que tira da conta: "menos R$ 970"; a última, se passou, "passou R$ 382" */}
            <Din v={l.valor} menos={l.valor < 0 && i < linhas.length - 1} />
          </li>
        ))}
      </ul>
      {nota && <p className="sub">{textoPrivado(nota)}</p>}
    </>
  )
}

/** Estado vazio: ícone num círculo, 1 frase e no máximo 1 botão. Não é legenda cinza: diz o que fazer agora. */
export function EstadoVazio({
  ico,
  children,
  acao,
  ilustracao,
}: {
  ico?: ReactNode
  children: ReactNode
  acao?: ReactNode
  ilustracao?: ReactNode
}) {
  return (
    <div className="vazio">
      {ilustracao ?? (
        <span className="vazio-ico" aria-hidden="true">
          {ico ?? <Icone nome="casa" size={32} />}
        </span>
      )}
      <p>{children}</p>
      {acao}
    </div>
  )
}

export const Vazio = EstadoVazio

/** Campo de dinheiro: "R$" cinza dentro do campo e ponto de milhar ("3.000"). O valor guardado continua sem ponto ("3000"). */
export function CampoValor({
  valor,
  mudar,
  desligado,
  rotulo,
  id,
  assinado = false,
}: {
  valor: string
  mudar: (v: string) => void
  desligado?: boolean
  rotulo?: string
  id?: string
  assinado?: boolean
}) {
  // Ocultar somente a apresentação: o estado original continua disponível ao salvar e ao abrir o olho.
  const oculto = useApp()?.oculto ?? false
  const [digitandoOculto, setDigitandoOculto] = useState(false)
  const [olhoAnterior, setOlhoAnterior] = useState(oculto)
  if (olhoAnterior !== oculto) {
    setOlhoAnterior(oculto)
    setDigitandoOculto(false)
  }
  const mascarado = oculto && valor !== '' && !digitandoOculto
  return (
    <span className={'inp-rs' + (desligado ? ' off' : '')}>
      <span aria-hidden="true">R$</span>
      <input
        id={id}
        inputMode={assinado ? 'text' : 'decimal'}
        disabled={desligado}
        aria-label={rotulo}
        readOnly={mascarado}
        placeholder={mascarado ? PONTOS : undefined}
        value={mascarado ? '' : milhar(valor, assinado)}
        onChange={e => {
          if (mascarado) return
          setDigitandoOculto(oculto)
          mudar(
            assinado
              ? e.target.value.replace(/−/g, '-').replace(/[^\d,-]/g, '')
              : e.target.value.replace(/[^\d,]/g, ''),
          )
        }}
      />
    </span>
  )
}
