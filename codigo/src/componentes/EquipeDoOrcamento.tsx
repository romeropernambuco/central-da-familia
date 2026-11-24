import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

/** Um agente 3D do palco: quem é, do que cuida, o que fala agora e o que o botão dele faz. */
export type Estacao = {
  id: string
  nome: string
  /** do que cuida, em 1 ou 2 palavras ("Semana e mês") */
  cuida: string
  img: string
  /** a frase de agora, já com o olho respeitado por quem monta */
  fala: string
  /** o cartão da aba que é dele (acende quando ele fala) */
  alvo: string
  acao: { rotulo: string; fazer: () => void }
}

/** Acende o cartão do agente por um instante, sem rolar a tela. */
function acender(id: string) {
  const alvo = document.getElementById(id)
  if (!alvo) return
  alvo.classList.remove('orc-v3-foco')
  void alvo.offsetWidth // recomeça a animação se a pessoa tocar de novo
  alvo.classList.add('orc-v3-foco')
}

/**
 * O palco da 3ª versão do Meu orçamento (24/11/2026): os agentes 3D trabalhando lado a lado.
 * Tocar num agente faz ele falar (número + 1 frase) e acende o cartão dele; o botão do balão leva até lá.
 * As figuras são imagens (public/orcamento-3d); o movimento é CSS e para com "reduzir movimento".
 */
export function EquipeDoOrcamento({ estacoes }: { estacoes: Estacao[] }) {
  const [ativo, setAtivo] = useState(0)
  const atual = estacoes[ativo] || estacoes[0]
  if (!atual) return null
  return (
    <div className="orc-palco" style={{ ['--agente' as string]: ativo, ['--agentes' as string]: estacoes.length }}>
      <div className="orc-palco-balao" aria-live="polite">
        <p>
          <b>{atual.nome}</b>
          {atual.fala}
        </p>
        <button type="button" className="orc-palco-ir" onClick={atual.acao.fazer}>
          {atual.acao.rotulo}
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
      <div className="orc-palco-chao" role="group" aria-label="Equipe do seu orçamento">
        {estacoes.map((e, i) => (
          <button
            key={e.id}
            type="button"
            className="orc-agente"
            aria-pressed={i === ativo}
            onClick={() => {
              setAtivo(i)
              acender(e.alvo)
            }}
          >
            <img src={e.img} alt="" width={440} height={440} loading="lazy" />
            <span className="orc-agente-nome">
              {e.nome}
              <small>{e.cuida}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
