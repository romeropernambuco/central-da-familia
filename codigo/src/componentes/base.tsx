import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { milhar, partesDinheiro, reais } from '../lib/formato'
import type { LinhaExplicacao } from '../api/tipos'

/** Dinheiro: número em Bricolage, "R$" em Figtree cinza, ",00" some. */
export function Din({ v, tam, className = '' }: { v: number; tam?: 'hero' | 'big' | 'mid'; className?: string }) {
  const p = partesDinheiro(v)
  return (
    <span className={`din ${tam || ''} ${v < 0 ? 'neg' : ''} ${className}`} aria-label={reais(v)}>
      {p.sinal}<span className="cur">R$</span>{p.inteiro}{p.cents && <span className="cents">{p.cents}</span>}
    </span>
  )
}

const FOCAVEL = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** `lado`: no computador vira painel lateral (no celular continua subindo de baixo). */
export function Sheet({ titulo, fechar, children, rotulo, lado }: { titulo: string; fechar: () => void; children: ReactNode; rotulo?: string; lado?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  // `fechar` costuma ser uma função nova a cada desenho da tela de trás. Guardada em ref, ela não refaz o efeito:
  // antes, cada letra digitada num campo da folha jogava o foco pra fora do campo (não dava pra digitar o nome da família).
  const fecharRef = useRef(fechar)
  fecharRef.current = fechar
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null
    const caixa = ref.current
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { fecharRef.current(); return }
      if (e.key !== 'Tab' || !caixa) return
      // Tab fica preso dentro da folha
      const itens = [...caixa.querySelectorAll<HTMLElement>(FOCAVEL)].filter(x => x.offsetParent !== null)
      if (!itens.length) { e.preventDefault(); caixa.focus(); return }
      const pri = itens[0], ult = itens[itens.length - 1]
      const at = document.activeElement
      if (e.shiftKey && (at === pri || at === caixa || !caixa.contains(at))) { e.preventDefault(); ult.focus() }
      else if (!e.shiftKey && (at === ult || !caixa.contains(at))) { e.preventDefault(); pri.focus() }
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
      <div className={'sheet' + (lado ? ' lado' : '')} role="dialog" aria-modal="true" aria-label={rotulo || titulo} ref={ref} tabIndex={-1}>
        <div className="sheet-top">
          <h2>{titulo}</h2>
          <button className="iconbtn" type="button" onClick={fechar} aria-label="Fechar"><X size={22} /></button>
        </div>
        <div className="sheet-body">{children}</div>
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
            <span>{l.linha}</span>
            <Din v={l.valor} />
          </li>
        ))}
      </ul>
      {nota && <p className="sub">{nota}</p>}
    </>
  )
}

/** Estado vazio: ícone num círculo, 1 frase e no máximo 1 botão. Não é legenda cinza: diz o que fazer agora. */
export function Vazio({ ico, children, acao }: { ico: ReactNode; children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="vazio">
      <span className="vazio-ico" aria-hidden="true">{ico}</span>
      <p>{children}</p>
      {acao}
    </div>
  )
}

/** Campo de dinheiro: "R$" cinza dentro do campo e ponto de milhar ("3.000"). O valor guardado continua sem ponto ("3000"). */
export function CampoValor({ valor, mudar, desligado, rotulo, id }: { valor: string; mudar: (v: string) => void; desligado?: boolean; rotulo?: string; id?: string }) {
  return (
    <span className={'inp-rs' + (desligado ? ' off' : '')}>
      <span aria-hidden="true">R$</span>
      <input id={id} inputMode="decimal" disabled={desligado} aria-label={rotulo} value={milhar(valor)} onChange={e => mudar(e.target.value.replace(/[^\d,]/g, ''))} />
    </span>
  )
}
