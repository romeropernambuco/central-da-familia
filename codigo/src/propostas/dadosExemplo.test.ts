import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiExemplo as api, reiniciarExemplo } from '../api/exemplo'
import { entradaDoCenario } from '../app/useCenarioReceitas'
import { futuro } from '../lib/futuro'
import { FUSO, segundaDaSemana, somaDias } from '../lib/formato'
import { projecao } from '../lib/plano'
import { situacaoCasa } from '../lib/resumo/casa'
import { totaisDesejos } from '../lib/resumo/desejos'
import { faturasAConferir } from '../lib/resumo/faturas'
import { totaisGuardado } from '../lib/resumo/guardado'
import { totalImoveis } from '../lib/resumo/imoveis'
import { lerRecebimentos } from '../lib/resumo/leituras'
import { totaisDoMes } from '../lib/resumo/movimentacao'
import {
  destaqueOrcamento,
  disponivelHojeCasa,
  envelopesVisiveis,
  livreDaSemana,
  numeroEnvelope,
  tetoDoMes,
} from '../lib/resumo/orcamento'
import { totalPendencias } from '../lib/resumo/pendencias'
import { numerosRumo2029 } from '../lib/resumo/plano2029'
import { porDiaDe } from '../lib/resumo/porDia'
import { recebimentosDoMes } from '../lib/resumo/recebimentos'
import { saldoDasContas } from '../lib/resumo/saldos'
import { EQUIPE } from '../telas/escritorio/equipe'
import { completarEquipe } from '../telas/escritorio/useEquipe'
import { carregarDadosInicio } from '../componentes/escritorio/dadosDeExemplo'

// Descarta metadados e texto. Até valores em listas e séries precisam ter um correspondente na origem.
function numeros(x: unknown): unknown {
  if (typeof x === 'number') return x
  if (Array.isArray(x)) return x.map(numeros)
  if (!x || typeof x !== 'object') return undefined
  if ('unidade' in x && 'valor' in x) return numeros(x.valor)
  return Object.fromEntries(
    Object.entries(x)
      .map(([k, v]) => [k, numeros(v)])
      .filter(([, v]) => v !== undefined),
  )
}

describe('dados do laboratório', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-17T14:00:00Z'))
    reiniciarExemplo()
  })
  afterEach(() => {
    vi.useRealTimers()
    reiniciarExemplo()
  })

  it('espelha todos os números de seletores e payloads da família de exemplo', async () => {
    const d = await carregarDadosInicio()
    const familia = (await api.sessao())!.familias[0]
    const { id } = familia
    const hoje = d.data.valor!
    const mes = hoje.slice(0, 7)
    expect(d.pessoa.nome.valor).toBe(familia.membroNome)
    expect(d.pessoa.papel.valor).toBe(familia.papel)
    expect(d.familia.nome.valor).toBe(familia.nome)
    expect(d.saldoConta).toEqual({ estado: 'indisponivel', valor: null, unidade: 'reais', natureza: 'cadastrado' })
    const [
      resumo,
      lanc,
      fs,
      banco,
      guardado,
      r,
      futuroEntradas,
      imoveis,
      escritorio,
      feiras,
      estoque,
      entradas,
      desejos,
      avisos,
      pres,
    ] = await Promise.all([
      api.resumoHoje(id),
      api.lancamentos(id, mes),
      api.faturas(id, 14),
      api.faturasBanco(id),
      api.guardadoHoje(id),
      lerRecebimentos(api, id),
      api.futuroEntradas!(id),
      api.imoveis!(id),
      api.escritorioHoje(id),
      api.feiras(id),
      api.estoque(id),
      api.config<{ data: string; valor: number }[]>(id, 'entradas', []),
      api.desejos!(id),
      api.avisosCasa(id),
      api.config<Record<string, string[]>>(id, 'casa_presenca', {}),
    ])
    const s = destaqueOrcamento(resumo, familia.envelopeId, hoje, FUSO)
    const envs = envelopesVisiveis(resumo.envelopes, familia)
    const meu = s.meu!
    const limite = meu.limite_base ?? meu.limite_mes
    const f = faturasAConferir(fs, banco, hoje, somaDias(hoje, 30))
    const g = totaisGuardado(guardado)
    const { ocorrencias: _ocorrencias, ...recebimentos } = recebimentosDoMes(r.lista, r.fontes, r.controle, mes)
    const e = entradaDoCenario(futuroEntradas, 'garantido')!
    const p = numerosRumo2029(futuro(e), e)
    const c = situacaoCasa(escritorio, feiras, estoque, segundaDaSemana(hoje))
    const { previsto: _previsto, ...mov } = totaisDoMes(mes, hoje, lanc, r.lista, entradas)
    const datas = Array.from({ length: Number(hoje.slice(-2)) }, (_, i) => somaDias(mes + '-01', i))
    const serie = datas.flatMap(data => {
      const gastos = lanc.filter(x => x.data === data)
      const receitas = r.lista.filter(x => x.recebido_em?.slice(0, 10) === data)
      const extras = entradas.filter(x => x.data === data)
      if (!gastos.length && !receitas.length && !extras.length) return []
      const { previsto: _, ...totais } = totaisDoMes(mes, data, gastos, receitas, extras)
      return [totais]
    })
    const { pensando, combinados, primeiro } = totaisDesejos(desejos)
    const proximo = desejos.find(x => x.id === primeiro)

    expect(numeros(d)).toEqual({
      pessoa: {},
      familia: {},
      hojePodeGastar: {
        valor: s.valor,
        ateDomingo: meu.ate_domingo,
        jaSaiu: meu.gasto_hoje,
        ritmoMes: {
          serieDiaria: Object.entries(porDiaDe(lanc, meu.id, hoje))
            .sort()
            .map(([, valor]) => ({ valor })),
          projecao: projecao(meu.gasto_mes, limite, hoje, meu.pontual_mes).fecha,
          limite,
        },
      },
      faturas: { total: f.total, proximas: f.lista.length ? f.lista.map(x => ({ valor: x.total })) : undefined },
      aplicacoes: {
        total: g.total,
        rendeuHoje: g.hoje,
        serie30Dias: numeros(guardado.por_dia_30),
        serieSaldo30Dias: numeros(guardado.saldo_30),
        lista: guardado.aplicacoes.map(a => ({
          saldo: a.saldo,
          rendeuHoje: a.rendeu_hoje_liquido,
          rendeuMes: a.rendeu_mes_liquido,
        })),
      },
      imoveis: {
        valorCadastrado: totalImoveis(imoveis),
        aluguelLiquidoEstimado: futuro(futuroEntradas.entrada!).imoveis?.reduce((s, i) => s + i.aluguel_liquido_mes, 0),
      },
      recebimentos,
      plano2029: {
        faltamPorMesComMargem: p.falta_com_margem,
        faltamPorMesSemMargem: p.falta_sem_margem,
        rendaEstimada: p.renda,
        progressao: p.cobre_pct,
      },
      casa: {
        notasPendentes: c.nota,
        itensEmFalta: c.falta ?? undefined,
        livreDaSemana: envs
          .filter(x => x.casa)
          .map(x => {
            const valor = livreDaSemana(x)
            return valor == null ? {} : { valor }
          }),
        disponivelDiario: disponivelHojeCasa(envs),
      },
      movimentacaoMes: { ...mov, serie },
      desejos: { pensando, combinados, proximo: proximo && { valor: proximo.valor } },
      envelopes: envs.map(x => ({ limite: tetoDoMes(x), gasto: x.gasto_mes, livre: x.livre, podeGastarHoje: x.hoje })),
      pendencias: {
        total: totalPendencias(escritorio),
        fila: escritorio.precisa_de_voce.length
          ? escritorio.precisa_de_voce.map(q => (q.valor == null ? {} : { valor: q.valor }))
          : undefined,
      },
      funcionarios: EQUIPE.map(() => ({})),
      alertas: escritorio.precisa_de_voce.length ? escritorio.precisa_de_voce.map(() => ({})) : undefined,
    })

    expect(d.faturas.proximas.valor?.map(x => x.vencimento.valor) ?? []).toEqual(f.lista.map(x => x.vencimento))
    expect(d.desejos.proximo.valor?.id).toBe(primeiro)
    expect(d.envelopes.valor?.map(x => x.situacao.valor)).toEqual(
      envs.map(x => numeroEnvelope(x, resumo.dias_restantes, hoje, FUSO).estado),
    )
    expect(d.casa.feiraPendente.valor).toBe(c.feira)
    expect(d.casa.estoquePendente.valor).toBe(c.estoque)
    expect(d.plano2029.cenario.valor).toBe('garantido')
    expect(d.plano2029.faltamPorMesComMargem.unidade).toBe('centavos')
    expect(d.imoveis.aluguelLiquidoEstimado.natureza).toBe('estimado')
    expect(d.funcionarios.valor).toHaveLength(19)
    const equipe = completarEquipe(escritorio.funcionarios, { rec: r.lista, est: estoque, avisos, pres }, hoje)
    expect(d.funcionarios.valor?.map(x => [x.id, x.sala, x.estadoHoje.valor])).toEqual(
      EQUIPE.map(m => {
        const f = equipe.find(x => x.id === m.id)
        return [m.id, m.sala, f?.semDado ? null : f?.estado]
      }),
    )
    expect(d.pendencias.fila.valor?.map(x => [x.funcionario, x.perguntaCurta]) ?? []).toEqual(
      escritorio.precisa_de_voce.map(x => [x.funcionario, x.assunto || x.pergunta]),
    )
  })

  it('passa a mostrar o saldo de exemplo após cadastro, inclusive saldo zero', async () => {
    await carregarDadosInicio()
    const { id } = (await api.sessao())!.familias[0]
    const hoje = '2026-11-17'
    await api.salvarSaldoConta!(id, { id: 'teste', nome: 'Conta de exemplo', valor: 0, conferidoEm: hoje })
    const esperado = saldoDasContas(await api.saldosConta!(id))
    expect((await carregarDadosInicio()).saldoConta).toEqual({
      estado: 'pronto',
      valor: esperado.valor,
      unidade: 'reais',
      natureza: 'cadastrado',
    })
  })

  it('não permite números literais no adaptador', () => {
    const nome = 'src/componentes/escritorio/dadosDeExemplo.ts'
    const fonte = ts.createSourceFile(nome, ts.sys.readFile(nome)!, ts.ScriptTarget.Latest, true)
    const literais: string[] = []
    function visitar(no: ts.Node) {
      if (
        ts.isNumericLiteral(no) ||
        ts.isBigIntLiteral(no) ||
        (ts.isStringLiteralLike(no) && /^\s*(?:R\$\s*)?[+-]?\d+(?:[.,:-]\d+)*%?\s*$/.test(no.text))
      )
        literais.push(no.getText(fonte))
      ts.forEachChild(no, visitar)
    }
    visitar(fonte)
    expect(literais).toEqual([])
  })
})
