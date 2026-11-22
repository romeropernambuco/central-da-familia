/** Nomes compartilhados por leituras e mutações; nenhuma regra financeira aqui. */
export function recursoDaLeitura(nome: string): string | undefined {
  if (nome === 'saldosConta') return 'saldos'
  if (nome === 'feiras') return 'feira'
  return (
    {
      resumoHoje: 'resumo',
      lancamentos: 'lancamentos',
      guardadoHoje: 'guardado',
      futuroEntradas: 'projecao',
      faturas: 'faturas',
      faturasBanco: 'faturasBanco',
      recebimentos: 'recebimentos',
      imoveis: 'imoveis',
      negocios: 'negocios',
      aluguelCaderno: 'aluguel',
      desejos: 'desejos',
      cartoes: 'cartoes',
      estoque: 'estoque',
      casaDaEquipe: 'casa',
      config: 'config',
      escritorioHoje: 'escritorio',
    } as Record<string, string>
  )[nome]
}
export function recursosDaMutacao(nome: string, args: unknown[]): string[] | undefined {
  if (nome === 'salvarSaldoConta') return ['saldos', 'projecao', 'plano2029']
  if (/Lancamento|^lancar$|definirLimite|salvarEnvelope/.test(nome))
    return ['lancamentos', 'resumo', 'faturas', 'pendencias', 'escritorio', 'projecao']
  if (nome === 'faturaInformar') return ['faturasBanco', 'pendencias', 'escritorio']
  if (/^recebimento/.test(nome))
    return ['recebimentos', 'config', 'controles', 'realizado', 'projecao', 'plano2029', 'pendencias', 'escritorio']
  if (/^guardado/.test(nome)) return ['guardado', 'projecao', 'pendencias', 'escritorio']
  if (/^(feira|estoque|casaMarcar|anotarCompraEquipe)/.test(nome))
    return [
      'feira',
      'estoque',
      'lista',
      'casa',
      'config',
      'config:casa_lista',
      'config:casa_gas',
      'config:casa_ponto',
      'config:casa_presenca',
      'config:casa_prestadores',
      'escritorio',
      'pendencias',
      'resumo',
      'lancamentos',
    ]
  if (nome === 'salvarConfig')
    return [
      'config',
      `config:${args[1]}`,
      'resumo',
      'lancamentos',
      'projecao',
      'plano2029',
      'recebimentos',
      'escritorio',
      'pendencias',
    ]
  if (/^imovel/.test(nome)) return ['imoveis', 'aluguel', 'projecao', 'pendencias', 'escritorio']
  // a volta que já entra no Guardado muda o Guardado também
  if (nome === 'negocioVoltaGuardar') return ['negocios', 'guardado', 'projecao', 'pendencias', 'escritorio']
  if (/^negocio/.test(nome)) return ['negocios', 'pendencias', 'escritorio']
  // o problema do aluguel ("não me pagou") muda a conta do plano: a projeção relê
  if (/^aluguel/.test(nome)) return ['aluguel', 'projecao', 'pendencias', 'escritorio']
  if (/^(cartao|criarCartao)/.test(nome)) return ['cartoes', 'faturas', 'faturasBanco', 'projecao', 'escritorio']
  if (/^desejo/.test(nome)) return ['desejos', 'escritorio', 'pendencias']
  if (/^lembrete/.test(nome)) return ['escritorio', 'pendencias']
  // etiqueta não muda limite nem saldo: só a lista de gastos e os totais da viagem
  if (/^(etiqueta|lancamentoMoeda$)/.test(nome)) return ['lancamentos']
  // Respostas do Escritório, restauração e mudanças de premissas podem afetar mais de uma área.
  return undefined
}
