import { useApp } from './contexto'
import { invalidarDados } from './invalidacao'
import { useLeituraRemota } from './useLeituraRemota'
import { useNumerosAtualizados, type NumerosAtualizados } from './useNumerosAtualizados'
import { FUSO, fimDoMes, somaDias } from '../lib/formato'
import * as leitura from '../lib/resumo/leituras'
import { recebimentosDoMes } from '../lib/resumo/recebimentos'
import type { CampoResumo, FonteResumo, ResumoFamilia } from '../lib/resumo/tipos'
import { comporResumoFamilia } from '../lib/resumo/familia'

import { recursosResumo } from '../lib/resumo/recursos'
const soCasal = new Set<keyof ResumoFamilia>(['saldoConta', 'faturas', 'aplicacoes', 'recebimentos', 'plano2029', 'imoveis', 'movimentacaoMes', 'casa', 'pendencias'])
const natureza: Record<keyof ResumoFamilia, FonteResumo['natureza']> = { saldoConta: 'cadastrado', podeGastarHoje: 'previsto', faturas: 'previsto', aplicacoes: 'cadastrado', recebimentos: 'previsto', plano2029: 'estimado', casa: 'cadastrado', imoveis: 'cadastrado', movimentacaoMes: 'realizado', desejos: 'cadastrado', pendencias: 'cadastrado' }
/** Uma fonte de apresentação por campo. Leituras da API continuam deduplicadas na borda f34. */
function useCampo<K extends keyof ResumoFamilia>(chave: K, hoje: string, conferir: NumerosAtualizados): { campo: ResumoFamilia[K]; repetir: () => void } {
  const { api, familia, versao } = useApp()
  const permitido = !!familia && familia.papel !== 'equipe' && (!soCasal.has(chave) || familia.papel === 'casal')
  const buscar = async (): Promise<unknown> => {
    const id = familia!.id
    switch (chave) {
      case 'saldoConta': return leitura.lerSaldo(api, id)
      case 'podeGastarHoje': return leitura.lerOrcamento(api, familia!, hoje)
      case 'faturas': return leitura.lerFaturas(api, id, hoje)
      case 'aplicacoes': return leitura.lerAplicacoes(api, id)
      case 'recebimentos': { const r = await leitura.lerRecebimentos(api, id); return { ...recebimentosDoMes(r.lista, r.fontes, r.controle, hoje.slice(0, 7)), idsConferencia: r.lista.map(x => x.id) } }
      case 'plano2029': return leitura.lerPlano(api, id)
      case 'casa': return leitura.lerCasa(api, id, hoje)
      case 'imoveis': return leitura.lerImoveis(api, id)
      case 'movimentacaoMes': return leitura.lerMes(api, id, hoje)
      case 'desejos': return leitura.lerDesejos(api, id)
      case 'pendencias': return leitura.lerPendencias(api, id)
    }
  }
  const r = useLeituraRemota(`resumo-familia:${chave}:${hoje}`, permitido && !(chave === 'saldoConta' && !api.saldosConta) ? buscar : null, [api, versao, hoje], `resumo-familia:${chave}`)
  const fontes = recursosResumo[chave].map(recurso => ({ recurso, natureza: natureza[chave], escopo: { familia: familia?.id || '', membro: familia?.membroId || undefined, papel: familia?.papel || '' }, periodo: { inicio: chave === 'faturas' ? hoje : hoje.slice(0, 7) + '-01', fim: chave === 'faturas' ? somaDias(hoje, 30) : chave === 'plano2029' ? '2029-01-01' : fimDoMes(hoje), fuso: FUSO } }))
  const grupo = chave === 'aplicacoes' ? conferir.aplicacoes : chave === 'imoveis' ? conferir.imoveis : chave === 'recebimentos' ? conferir.recebimentos : null
  const bruto = r.dado as { idsConferencia?: string[]; atualizadoEm?: string | null } | null
  const ids = bruto?.idsConferencia
  const datas = grupo && ids?.length && ids.every(id => grupo[id]) ? ids.map(id => grupo[id]).sort() : []
  const meta = { fonte: fontes, consultadoEm: r.consultadoEm ?? null, conferidoEm: datas[0] ?? null, atualizadoEm: bruto?.atualizadoEm ?? null }
  let campo: CampoResumo<unknown>
  if (!permitido) campo = { ...meta, estado: 'restrito', valor: null }
  else if (chave === 'saldoConta' && !api.saldosConta) campo = { ...meta, estado: 'indisponivel', valor: null, motivo: 'Ainda sem dado' }
  else if (r.carregando) campo = { ...meta, estado: 'carregando', valor: null }
  else if (r.erro) campo = { ...meta, estado: 'erro', valor: null }
  else if (!r.dado) campo = { ...meta, estado: 'indisponivel', valor: null }
  else if (chave === 'saldoConta') {
    const s = r.dado as Awaited<ReturnType<typeof leitura.lerSaldo>>
    campo = s.contas.length ? { ...meta, estado: 'pronto', valor: { unidade: 'reais', valor: s.saldo.valor }, conferidoEm: s.saldo.conferidoEm, atualizadoEm: s.saldo.conferidoEm } : { ...meta, estado: 'indisponivel', valor: null, motivo: 'Ainda sem dado' }
  } else {
    const { idsConferencia: _ids, atualizadoEm: _data, ...valor } = r.dado as Record<string, unknown>
    campo = { ...meta, estado: 'pronto', valor }
  }
  return { campo: campo as ResumoFamilia[K], repetir: () => { if (familia) invalidarDados(api, familia.id, recursosResumo[chave]); r.repetir() } }
}
export function useResumoFamilia() {
  const { api, familia } = useApp()
  // O hook só é montado pela superfície autorizada; a barreira do Assessor antecede qualquer config.
  const conferencia = useNumerosAtualizados()
  const hoje = leitura.relogioResumo()
  const saldoConta = useCampo('saldoConta', hoje, conferencia.dados), podeGastarHoje = useCampo('podeGastarHoje', hoje, conferencia.dados)
  const faturas = useCampo('faturas', hoje, conferencia.dados), aplicacoes = useCampo('aplicacoes', hoje, conferencia.dados)
  const recebimentos = useCampo('recebimentos', hoje, conferencia.dados), plano2029 = useCampo('plano2029', hoje, conferencia.dados)
  const casa = useCampo('casa', hoje, conferencia.dados), imoveis = useCampo('imoveis', hoje, conferencia.dados)
  const movimentacaoMes = useCampo('movimentacaoMes', hoje, conferencia.dados), desejos = useCampo('desejos', hoje, conferencia.dados), pendencias = useCampo('pendencias', hoje, conferencia.dados)
  const campos = { saldoConta, podeGastarHoje, faturas, aplicacoes, recebimentos, plano2029, casa, imoveis, movimentacaoMes, desejos, pendencias }
  return { resumo: comporResumoFamilia(campos),
    repetir: (k: keyof ResumoFamilia) => campos[k].repetir(), hoje, api, familia }
}
