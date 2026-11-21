import { useConfig } from './useConfig'
import { useSessaoAtual } from './contexto'
import { lerControleReceitas, lerFontesReceita } from '../lib/futuroReceitas'
import type { ControleReceitas, FonteReceita, FontesReceita } from '../api/tipos'

const VAZIO = {}
/** Montar somente na superfície do casal. useConfig conserva a mescla entre aparelhos. */
export function useFontesReceita() {
  const { familia } = useSessaoAtual()
  const [bruto, gravar, erro, lido] = useConfig<unknown>('fontes_receita', VAZIO)
  const [brutoControle, gravarControle, erroControle, leuControle] = useConfig<unknown>('receitas_controle', VAZIO)
  const { fontes, corrompida } = lerFontesReceita(bruto)
  const controle = lerControleReceitas(brutoControle)
  const pronto = lido && leuControle && !corrompida && !controle.corrompida && familia?.papel === 'casal'
  const salvarFonte = async (id: string, fonte: FonteReceita) => {
    if (!pronto) return false
    const ok = await gravar({ ...fontes, [id]: fonte } satisfies FontesReceita)
    return ok
  }
  const salvarControle = async (id: string, valor: ControleReceitas[string]) => {
    if (!pronto) return false
    const ok = await gravarControle({ ...controle.controle, [id]: valor })
    return ok
  }
  return {
    fontes,
    controle: controle.controle,
    salvarFonte,
    salvarControle,
    pronto,
    erro:
      erro ||
      erroControle ||
      (corrompida || controle.corrompida
        ? 'Há dados inválidos no cadastro de receitas. Nada será sobrescrito. Peça ajuda para conferir o cadastro.'
        : ''),
  }
}
