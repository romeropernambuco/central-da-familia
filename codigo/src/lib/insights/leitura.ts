import type { Api, FamiliaMinha } from '../../api/tipos'
import type { Rota } from '../rotas'
import { futuro } from '../futuro'
import { entradaDoCenario } from '../futuroReceitas'
import { diasEntre, mesAnterior } from '../formato'
import { tempoRecife } from './tempo'
import { emCentavos, type LeiturasInsights } from './snapshot'

/** Mesmos endpoints já usados nas telas. Falha fica ausente, nunca recebe dados fictícios.
 * Leituras são restritas à aba e ao papel antes de qualquer chamada. */
export async function lerDadosInsights(api: Api, familia: FamiliaMinha, rota: Rota, agora: unknown) {
  const dados: LeiturasInsights = {}
  const erros: unknown[] = []
  const ler = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn()
    } catch (e) {
      erros.push(e)
      return undefined
    }
  }
  if (rota === 'casa' && (familia.papel === 'casal' || familia.papel === 'equipe'))
    dados.feiras = await ler(() => api.feiras(familia.id))
  if (familia.papel !== 'casal') return { dados, erros }
  if (rota === 'guardado') dados.guardado = await ler(() => api.guardadoHoje(familia.id))
  if (rota === 'planejamento' || rota === 'guardado') {
    const [rec, f] = await Promise.all([
      rota === 'planejamento' && api.recebimentos ? ler(() => api.recebimentos!(familia.id)) : undefined,
      api.futuroEntradas ? ler(() => api.futuroEntradas!(familia.id)) : undefined,
    ])
    if (rec) {
      const controle = await ler(() => api.config(familia.id, 'receitas_controle', {}))
      if (controle !== undefined) {
        dados.recebimentos = rec
        dados.controleReceitas = controle
      }
    }
    if (f?.entrada) {
      try {
        const oficial = entradaDoCenario(f, 'garantido')!
        dados.futuro = futuro(oficial)
        dados.entradaObjetivo = oficial
        dados.mesObjetivo = oficial.parametros.virada
      } catch (e) {
        erros.push(e)
      }
    }
  }
  if (rota === 'cartoes') {
    const [cs, fs, bs] = await Promise.all([
      ler(() => api.cartoes(familia.id)),
      ler(() => api.faturas(familia.id, 2)),
      ler(() => api.faturasBanco(familia.id)),
    ])
    dados.cartoes = cs
    dados.faturas = fs
    dados.banco = bs
    const t = tempoRecife(agora)
    if (
      t &&
      cs &&
      fs &&
      bs &&
      fs.some(f => {
        const b = bs.find(b => b.cartao_id === f.cartao_id && b.mes.slice(0, 7) === f.mes)
        const dias = diasEntre(t.dia, f.vencimento)
        return (
          (!b?.paga_em && dias >= 0 && dias <= 3) ||
          (b?.valor_banco != null && emCentavos(b.valor_banco) !== emCentavos(f.total))
        )
      })
    ) {
      // Até 24 parcelas (limite de simularCompra), com até 2 meses de deslocamento de fechamento.
      // O endpoint real é por mês da COMPRA, não retorna as parcelas sintéticas do exemplo.
      const meses = [t.dia.slice(0, 7)]
      while (meses.length < 26) meses.push(mesAnterior(meses[meses.length - 1]))
      const linhas = []
      // Grupos pequenos para não disparar 26 requisições simultâneas.
      for (let n = 0; n < meses.length; n += 4) {
        const grupo = await Promise.all(meses.slice(n, n + 4).map(m => ler(() => api.lancamentos(familia.id, m))))
        linhas.push(...grupo)
      }
      // Composição incompleta não é apresentada como completa nem gera aviso de parcela.
      if (linhas.every(x => x !== undefined)) dados.lancamentos = linhas.flatMap(x => x || [])
    }
  }
  return { dados, erros }
}
