import { textoPrivado } from '../../lib/olho'
import { totalPendencias } from '../../lib/resumo/pendencias'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { Icone } from '../../componentes/Icone'
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useSessaoAtual } from '../../app/contexto'
import { useEscritorio } from '../../app/useDados2'
import { PerguntaCard } from '../../componentes/Pergunta'
import { fraseDoDia } from '../../lib/guardado'
import { donoDaPergunta } from './donoDaPergunta'
import type { PerguntaEsc, FuncionarioEsc } from '../../api/tipos'
const nomeDoDono = (p: PerguntaEsc, fs: FuncionarioEsc[]) => donoDaPergunta(p, fs)?.nome || p.funcionario

export function PrecisaDeVoce({ equipe }: { equipe?: boolean }) {
  const { e, estado, responder } = useEscritorio()
  const { familia } = useSessaoAtual()
  // QA E11 (erro 6): depois de responder (ex.: a nota da feira), a confirmação fica no próprio cartão, ao lado da contagem nova
  // (o aviso de baixo some em 4 s; aqui fica até a próxima resposta)
  const [feito, setFeito] = useState('')
  const responderComAviso: typeof responder = async (pergunta, opcao, dados) => {
    const r = await responder(pergunta, opcao, dados)
    if (r && typeof r === 'object' && r.aviso) setFeito(r.aviso)
    return r
  }
  // A2: a pessoa da família (filha) só vê o cartão quando é sobre ela, e não tem a tela do Escritório
  const pessoa = familia?.papel === 'pessoa'
  if (estado === 'desligado' || !e) return null
  const fila = e.precisa_de_voce
  // E3 (conserto 9): o título e o "1 de N" contam tudo (nota, contagem, piscineiro), não só as 3 que aparecem
  const total = totalPendencias(e)
  if ((equipe || pessoa) && !fila.length) return null
  const p = fila[0]
  return (
    <section className="card precisa" aria-labelledby="pvT" data-precisa={fila.length}>
      <div className="card-h">
        <h2 id="pvT">
          <Icone nome="salvo" />
          {equipe
            ? total === 1
              ? '1 coisa da casa precisa de você'
              : `${total} coisas da casa precisam de você`
            : fraseDoDia(total)}
        </h2>
        {!equipe && !pessoa && (
          <a className="lnk" href="#/escritorio">
            Escritório
            <Icone desenho={ChevronRight} />
          </a>
        )}
      </div>
      {p ? (
        <>
          {feito && (
            <p className="todo ok precisa-feito" role="status" style={{ marginBottom: 10 }}>
              <span>{textoPrivado(feito)}</span>
            </p>
          )}
          <PerguntaCard
            key={p.id}
            p={p}
            quem={nomeDoDono(p, e.funcionarios)}
            responder={responderComAviso}
            posicao={total > 1 ? `1 de ${total}` : undefined}
          />
          {fila.length > 1 && !equipe && (
            <p className="sub" style={{ marginTop: 10 }}>
              Depois desta:{' '}
              {textoPrivado(
                (() => {
                  const nomes = [...new Set(fila.slice(1).map(x => nomeDoDono(x, e.funcionarios)))]
                  return nomes.slice(0, 2).join(' e ') + (nomes.length > 2 ? ` e mais ${nomes.length - 2}` : '')
                })(),
              )}
              .
            </p>
          )}
        </>
      ) : (
        <>
          {feito && (
            <p className="todo ok precisa-feito" role="status" style={{ marginBottom: 10 }}>
              <span>{textoPrivado(feito)}</span>
            </p>
          )}
          <EstadoVazio
            ilustracao="TudoEmDia"
            titulo="Tudo em ordem"
            frase={`Os ${e.funcionarios.length} funcionários do Escritório conferiram os números da família. Quando um deles precisar de uma resposta sua, a pergunta aparece aqui.`}
          />
        </>
      )}
    </section>
  )
}
