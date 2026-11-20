import { totalPendencias } from '../lib/resumo/pendencias'
import { aoLimparLeituras, escopoLeitura, LeituraSubstituida } from './invalidacao'
import type { Api } from '../api'
import type { EscritorioHoje } from '../api/tipos'
import type { Leitura } from './useDados2'

const lojas = new WeakMap<Api, Map<string, ReturnType<typeof criarLoja>>>()
const apiAusente = {} as Api
function criarLoja() {
  let estado: { dado: EscritorioHoje | null; estado: Leitura; motivo: string } = {
    dado: null,
    estado: 'buscando',
    motivo: '',
  }
  const ouvintes = new Set<() => void>()
  let pedido = 0,
    descartada = false
  const erros = new Set<(erro: Error) => void>()
  let versaoVista: number | undefined
  const loja = {
    equipe: false,
    aoErro: (f: (erro: Error) => void) => {
      erros.add(f)
      return () => {
        erros.delete(f)
      }
    },
    descartar() {
      descartada = true
      pedido++
      estado = { dado: null, estado: 'buscando', motivo: '' }
      erros.clear()
      ouvintes.clear()
      loja.travas.clear()
      loja.donos.clear()
    },
    travas: new Map<string, 'enviando' | 'respondida'>(),
    donos: new Map<string, Set<object>>(),
    snapshot: () => estado,
    assinar: (f: () => void) => {
      ouvintes.add(f)
      return () => {
        ouvintes.delete(f)
      }
    },
    emitir: () => {
      estado = { ...estado }
      ouvintes.forEach(f => f())
    },
    async ler(api: Api, familia: string, versao?: number) {
      if (descartada || (versao !== undefined && versao === versaoVista)) return
      versaoVista = versao
      const meu = ++pedido
      // Só leituras posteriores à resposta podem confirmar a saída da pergunta.
      const respondidas = [...loja.travas].filter(([, s]) => s === 'respondida').map(([id]) => id)
      try {
        const bruto = await api.escritorioHoje(familia)
        if (meu !== pedido) return
        const dado = {
          ...bruto,
          precisa_total: totalPendencias(bruto),
          ...(loja.equipe
            ? { entregue: [], precisa_de_voce: bruto.precisa_de_voce.map(({ valor: _v, ...p }) => p) }
            : {}),
        }
        for (const id of respondidas) if (!dado.precisa_de_voce.some(p => p.id === id)) loja.travas.delete(id)
        estado = { dado, estado: 'ok', motivo: '' }
      } catch (e) {
        if (meu !== pedido || e instanceof LeituraSubstituida) return
        const erro = e as Error
        erros.forEach(f => f(erro))
        if (meu !== pedido) return
        estado = {
          ...estado,
          estado: /ainda não tem essa função/i.test(erro.message) ? 'desligado' : 'erro',
          motivo: erro.message,
        }
      }
      loja.emitir()
    },
  }
  return loja
}
export function lojaEscritorio(api: Api, familia: string) {
  api = api || apiAusente
  familia = JSON.stringify([familia, escopoLeitura(api)])
  let familias = lojas.get(api)
  if (!familias) {
    familias = new Map()
    lojas.set(api, familias)
  }
  let loja = familias.get(familia)
  if (!loja) {
    loja = criarLoja()
    familias.set(familia, loja)
  }
  return loja
}

aoLimparLeituras(api => {
  lojas.get(api)?.forEach(loja => loja.descartar())
  lojas.delete(api)
})
