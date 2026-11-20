import type { Envelope } from '../../api/tipos'
import { useApp } from '../../app/contexto'
import { comecoDoMes, fraseEstouro, numeroEnvelope, primeiroDoMesQueVem } from '../../componentes/EnvelopeCard'
import { Qm } from '../../componentes/Qm'
import { textoPrivado } from '../../componentes/privacidade'
import { fimDoMes, hojeRecife, mesLongo, reais, saudacao, somaDias } from '../../lib/formato'
import type { projecaoCasal } from '../../lib/resumo/orcamento'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Faixa logo abaixo das referências do dia: o que dá confiança no número de hoje.
 * Voltou do Início antigo para dentro do layout novo: "Hoje já saiu", a frase da virada do mês,
 * "De onde veio esse número?" e "Por que mudou?". Só mostra a frase que tem o que dizer.
 */
export function SobreHoje({ e: escolhido, placar }: { e?: Envelope; placar?: ReturnType<typeof projecaoCasal> }) {
  const { resumo, explicar, familia } = useApp()
  // sem envelope escolhido pela tela: o da própria pessoa, como no Início antigo
  const e = escolhido ?? resumo?.envelopes.find(x => x.id === familia?.envelopeId && !x.casa)
  if (!resumo || !e) return null
  const n = numeroEnvelope(e, resumo.dias_restantes), hoje = hojeRecife()
  const devendo = n.estado === 'devendo'
  const frases: { chave: string; texto: string }[] = []
  const estouro = fraseEstouro(e, n)
  if (estouro) frases.push({ chave: 'estouro', texto: estouro })
  if (!devendo && (e.gasto_hoje || 0) > 0) frases.push({ chave: 'saiu', texto: `Hoje já saiu ${reais(e.gasto_hoje || 0)}. Ainda pode hoje ${reais(e.hoje ?? n.valor)}.` })
  // dias 1 a 3: como o mês passado fechou e com quanto este começa
  const ant = e.mes_anterior
  if (!devendo && ant && Number(hoje.slice(8)) <= 3) {
    const falta = e.falta_mes_anterior || 0, mesAnt = mesLongo(ant.mes + '-01')
    const c = comecoDoMes(e.limite_base ?? e.limite_mes, falta, e.parcelas_mes || 0, mesAnt)
    frases.push({ chave: 'virada', texto: `${cap(mesAnt)}: ${reais(ant.gasto)} de ${reais(ant.limite)}${falta ? `, passou ${reais(falta)}` : ', dentro'}. ${cap(mesLongo(hoje))} começa com ${reais(c.valor)}${c.partes}.` })
  }
  // 2 últimos dias: com quanto o mês que vem começa, já com a parcela que cai nele
  const parcela = e.parcelas_mes_que_vem || 0
  if (!devendo && parcela && fimDoMes(hoje) <= somaDias(hoje, 1)) {
    const c = comecoDoMes(e.limite_base ?? e.limite_mes, 0, parcela, mesLongo(hoje))
    frases.push({ chave: 'virada-antes', texto: `${cap(mesLongo(primeiroDoMesQueVem()))} começa com ${reais(c.valor)}${c.partes}.` })
  }
  // o casal, se continuar assim: à vista também no celular (antes ficava dentro de "Seu orçamento e envelopes")
  if (placar) {
    const passam = placar.pessoas.filter(p => p.passa)
    // tem nome de pessoa: com o olho fechado a frase inteira some
    frases.push({ chave: 'casal', texto: textoPrivado(passam.length
      ? `O casal, se continuar assim: ${passam.map(p => `${p.nome}${p.eu ? ' (você)' : ''} ${p.excessoAtual === null ? 'vai passar' : 'passou'} ${reais(p.excessoAtual ?? p.excessoPrevisto)}`).join(' e ')}. O que passa sai de ${mesLongo(primeiroDoMesQueVem())}.`
      : `O casal, se continuar assim: juntos, sobram ${reais(placar.sobra)} no fim do mês.`) })
  }
  const mudou = e.mudou
  return (
    <div className="j-sobre-hoje" role="group" aria-label="Sobre o número de hoje">
      {familia?.membroNome && <p className="j-saudacao">{saudacao()}, {textoPrivado(familia.membroNome)}.</p>}
      {frases.map(f => <p key={f.chave} data-frase={f.chave}>{f.texto}</p>)}
      <div className="j-sobre-acoes">
        <Qm texto titulo={devendo ? 'Seu mês' : 'Hoje você pode gastar'} linhas={n.linhas} nota={`A mesma conta do banco da família.${e.regra === 'diario' ? ' Sábado, domingo e feriado valem 1,5 dia.' : ''} Muda a cada gasto lançado.`} />
        {mudou && <button type="button" className="explica-l" onClick={() => explicar({ cabeca: 'Por que mudou?', titulo: textoPrivado(mudou.motivo), linhas: [{ linha: 'Ontem o dia tinha', valor: mudou.ontem }, { linha: 'Hoje o dia tem', valor: e.valor_dia_inteiro ?? e.hoje ?? 0 }] })}>Por que mudou?</button>}
      </div>
    </div>
  )
}
