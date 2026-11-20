import { useState } from 'react'
import type { Envelope } from '../api/tipos'
import { useApp } from '../app/contexto'
import { useAdultos } from '../app/useMembros'
import { hojeRecife, mesLongo, reais } from '../lib/formato'
import { comecoDoMes, primeiroDoMesQueVem } from './EnvelopeCard'
import { Icone } from './Icone'
import { Impacto2029 } from './Impacto2029'

/** R6: passou do combinado. Padrão: sai do mês que vem (o banco já faz). Opção: cobrir com a sobra da Casa (só no exemplo). */
export function CobrirEstouro({ e, valor }: { e: Envelope; valor: number }) {
  const { api, familia, tentar, toast, recarregar } = useApp()
  const [ok, setOk] = useState(false)
  const adultos = useAdultos()
  const prox = primeiroDoMesQueVem()
  // E7 (F6): o estouro diz quanto tira da renda de 2029 (conta do motor, impacto2029)
  const impacto = <Impacto2029 valor={valor} />
  // depois de escolher, os botões somem e fica o combinado (PARCELA ideia 2)
  if (ok)
    return (
      <>
        <p className="sub">Combinado: sai de {mesLongo(prox)}.</p>
        {impacto}
      </>
    )
  return (
    <div className="cobrir" role="group" aria-label="O que fazer com o que passou">
      {impacto}
      <button
        className="btn sm line"
        type="button"
        onClick={() => {
          setOk(true)
          toast(
            `Combinado: ${reais(valor)} saem do mês de ${mesLongo(prox)}. Ele começa com ${reais(comecoDoMes(e.limite_base ?? e.limite_mes, valor, e.parcelas_mes_que_vem || 0, mesLongo(hojeRecife())).valor)}.`,
          )
        }}
      >
        Tirar de {mesLongo(prox)}
      </button>
      {/* V3 (só no exemplo): imprevisto sai do guardado e não derruba o dia. E3 (conserto 4): "reserva" é só o dinheiro da Casa que nunca se gasta */}
      {api.cobrirImprevisto && familia?.papel === 'casal' && (
        <button
          className="btn sm line"
          type="button"
          onClick={() =>
            tentar(async () => {
              const desfazer = await api.cobrirImprevisto!(familia.id, e.id, valor)
              await recarregar()
              toast(
                `Foi imprevisto: ${reais(valor)} saíram do guardado e não derrubam o seu dia. Eles voltam pro guardado em 3 meses de ${reais(Math.ceil(valor / 3))}, tirados do que entrar a mais.`,
                async () => {
                  await desfazer()
                  await recarregar()
                },
              )
            })
          }
        >
          Foi imprevisto (saúde, carro, casa)
        </button>
      )}
      {api.cobrirComCasa && familia?.papel === 'casal' && (
        <button
          className="btn sm line"
          type="button"
          onClick={() =>
            tentar(async () => {
              const desfazer = await api.cobrirComCasa!(familia.id, e.id, valor)
              await recarregar()
              toast(
                `${reais(valor)} cobertos com a sobra da Casa neste mês.${adultos === 1 ? '' : ' A outra pessoa do casal vê que a Casa ficou menor.'}`,
                async () => {
                  await desfazer()
                  await recarregar()
                },
              )
            })
          }
        >
          <Icone nome="casa" />
          Cobrir com a sobra da Casa
        </button>
      )}
    </div>
  )
}
